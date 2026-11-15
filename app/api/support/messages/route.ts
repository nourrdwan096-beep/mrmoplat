import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getServerSession } from '@/lib/serverAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET: Fetch messages for a specific ticket (owner or staff only)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized', messages: [] }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const ticketId = searchParams.get('ticketId') || searchParams.get('ticket_id');

    if (!ticketId) {
      return NextResponse.json({ success: false, error: 'معرف التذكرة مطلوب' }, { status: 400 });
    }

    // Check ticket ownership / info
    const { data: ticket } = await supabaseAdmin
      .from('support_tickets')
      .select(`
        student_id,
        student:profiles!support_tickets_student_id_fkey(full_name),
        assigned_assistant:profiles!support_tickets_assigned_to_assistant_id_fkey(full_name)
      `)
      .eq('id', ticketId)
      .maybeSingle();

    if (!ticket) {
      return NextResponse.json({ success: false, error: 'التذكرة غير موجودة', messages: [] }, { status: 404 });
    }

    if (!session.isStaff && ticket.student_id !== session.id) {
      return NextResponse.json({ success: false, error: 'غير مصرح بعرض هذه المحادثة', messages: [] }, { status: 403 });
    }

    const { data: messages, error } = await supabaseAdmin
      .from('ticket_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('API /api/support/messages GET error:', error);
      return NextResponse.json({ success: false, error: error.message, messages: [] }, { status: 500 });
    }

    const studentObj = Array.isArray((ticket as any)?.student) ? (ticket as any).student[0] : (ticket as any)?.student;
    const asstObj = Array.isArray((ticket as any)?.assigned_assistant) ? (ticket as any).assigned_assistant[0] : (ticket as any)?.assigned_assistant;
    const studentName = studentObj?.full_name || 'الطالب';
    const assistantName = asstObj?.full_name || 'فريق المساعدين';

    const formatted = (messages || []).map((m: any) => {
      let senderName = 'فريق الدعم';
      if (m.sender_role === 'student') {
        senderName = studentName;
      } else if (m.sender_role === 'teacher' || m.sender_role === 'super_admin') {
        senderName = 'مستر / محمد رضوان';
      } else if (m.sender_role === 'assistant') {
        senderName = assistantName;
      }

      return {
        id: m.id,
        ticketId: m.ticket_id,
        ticket_id: m.ticket_id,
        senderId: m.sender_id,
        sender_id: m.sender_id,
        senderRole: m.sender_role,
        sender_role: m.sender_role,
        senderName,
        message: m.message,
        attachmentUrl: m.attachment_url,
        attachment_url: m.attachment_url,
        createdAt: m.created_at,
        created_at: m.created_at,
      };
    });

    return NextResponse.json({ success: true, messages: formatted });
  } catch (err: any) {
    console.error('API /api/support/messages GET fatal error:', err);
    return NextResponse.json({ success: false, error: err?.message, messages: [] }, { status: 500 });
  }
}

// POST: Add a new message to a ticket (verified role and ownership)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      ticketId,
      ticket_id,
      message,
      attachmentUrl,
      attachment_url,
    } = body;

    const targetTicketId = ticketId || ticket_id;
    const cleanMsg = (message || '').trim();

    if (!targetTicketId || !cleanMsg) {
      return NextResponse.json({ success: false, error: 'معرف التذكرة والرسالة مطلوبان' }, { status: 400 });
    }

    const { data: ticket } = await supabaseAdmin
      .from('support_tickets')
      .select('student_id')
      .eq('id', targetTicketId)
      .maybeSingle();

    if (!ticket) {
      return NextResponse.json({ success: false, error: 'التذكرة غير موجودة' }, { status: 404 });
    }

    if (!session.isStaff && ticket.student_id !== session.id) {
      return NextResponse.json({ success: false, error: 'غير مصرح بالرد على هذه التذكرة' }, { status: 403 });
    }

    const finalRole = session.isTeacher ? 'teacher' : session.isStaff ? 'assistant' : 'student';
    const resolvedSenderId = session.id;

    const newMsgId = crypto.randomUUID();
    const { data: insertedMsg, error: insertError } = await supabaseAdmin
      .from('ticket_messages')
      .insert([{
        id: newMsgId,
        ticket_id: targetTicketId,
        sender_id: resolvedSenderId,
        sender_role: finalRole,
        message: cleanMsg,
        attachment_url: attachmentUrl || attachment_url || null,
      }])
      .select()
      .single();

    if (insertError) {
      console.error('API /api/support/messages POST error:', insertError);
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
    }

    // 2. Update ticket updated_at
    await supabaseAdmin
      .from('support_tickets')
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetTicketId);

    const formatted = {
      id: insertedMsg.id,
      ticketId: insertedMsg.ticket_id,
      ticket_id: insertedMsg.ticket_id,
      senderId: insertedMsg.sender_id,
      sender_id: insertedMsg.sender_id,
      senderRole: insertedMsg.sender_role,
      sender_role: insertedMsg.sender_role,
      senderName: session.fullName || (finalRole === 'teacher' ? 'مستر / محمد رضوان' : finalRole === 'assistant' ? 'فريق المساعدين' : 'الطالب'),
      message: insertedMsg.message,
      attachmentUrl: insertedMsg.attachment_url,
      attachment_url: insertedMsg.attachment_url,
      createdAt: insertedMsg.created_at,
      created_at: insertedMsg.created_at,
    };

    return NextResponse.json({ success: true, message: formatted });
  } catch (err: any) {
    console.error('API /api/support/messages POST fatal error:', err);
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
