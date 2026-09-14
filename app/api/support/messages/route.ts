import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET: Fetch messages for a specific ticket
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ticketId = searchParams.get('ticketId') || searchParams.get('ticket_id');

    if (!ticketId) {
      return NextResponse.json({ success: false, error: 'معرف التذكرة مطلوب' }, { status: 400 });
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

    // Also get ticket to know student & assistant names
    const { data: ticket } = await supabaseAdmin
      .from('support_tickets')
      .select(`
        student:profiles!support_tickets_student_id_fkey(full_name),
        assigned_assistant:profiles!support_tickets_assigned_to_assistant_id_fkey(full_name)
      `)
      .eq('id', ticketId)
      .maybeSingle();

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

// POST: Add a new message to a ticket
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      ticketId,
      ticket_id,
      senderId,
      sender_id,
      senderRole,
      sender_role,
      senderName,
      message,
      attachmentUrl,
      attachment_url,
    } = body;

    const targetTicketId = ticketId || ticket_id;
    const rawSenderId = senderId || sender_id;
    const finalRole = senderRole || sender_role || 'student';
    const cleanMsg = (message || '').trim();

    if (!targetTicketId || !cleanMsg) {
      return NextResponse.json({ success: false, error: 'معرف التذكرة والرسالة مطلوبان' }, { status: 400 });
    }

    // 1. Resolve sender_id to a valid UUID in profiles
    let resolvedSenderId = rawSenderId;
    if (finalRole === 'teacher' || finalRole === 'super_admin') {
      resolvedSenderId = 'a0000000-0000-4000-8000-000000000001';
    } else if (finalRole === 'assistant') {
      if (!resolvedSenderId || resolvedSenderId === 'asst-1') {
        resolvedSenderId = 'a1000000-0000-4000-8000-000000000001';
      } else {
        const { data: pCheck } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('id', resolvedSenderId)
          .maybeSingle();
        if (!pCheck) {
          resolvedSenderId = 'a1000000-0000-4000-8000-000000000001';
        }
      }
    } else {
      // Student sender
      const { data: pCheck } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('id', resolvedSenderId)
        .maybeSingle();
      if (!pCheck) {
        // Fallback to the ticket's student_id
        const { data: t } = await supabaseAdmin
          .from('support_tickets')
          .select('student_id')
          .eq('id', targetTicketId)
          .maybeSingle();
        if (t?.student_id) {
          resolvedSenderId = t.student_id;
        }
      }
    }

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

    // 2. Update ticket updated_at and status if needed
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
      senderName: senderName || (finalRole === 'teacher' ? 'مستر / محمد رضوان' : finalRole === 'assistant' ? 'فريق المساعدين' : 'الطالب'),
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
