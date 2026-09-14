import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function formatTicket(ticket: any) {
  const student = Array.isArray(ticket?.student) ? ticket.student[0] || {} : ticket?.student || {};
  const course = Array.isArray(ticket?.course) ? ticket.course[0] || {} : ticket?.course || {};
  const assignedAssistant = Array.isArray(ticket?.assigned_assistant) ? ticket.assigned_assistant[0] || {} : ticket?.assigned_assistant || {};

  const messages = (ticket.messages || [])
    .sort((a: any, b: any) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime())
    .map((m: any) => {
      let senderName = 'فريق الدعم';
      if (m.sender_role === 'student') {
        senderName = student.full_name || 'الطالب';
      } else if (m.sender_role === 'teacher' || m.sender_role === 'super_admin') {
        senderName = 'مستر / محمد رضوان';
      } else if (m.sender_role === 'assistant') {
        senderName = assignedAssistant.full_name || 'فريق المساعدين';
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

  return {
    id: ticket.id,
    ticketNumber: ticket.ticket_number,
    ticket_number: ticket.ticket_number,
    studentId: ticket.student_id,
    student_id: ticket.student_id,
    studentName: student.full_name || 'طالب المنصة',
    studentPhone: student.phone || '',
    studentStage: student.stage || 'high',
    studentGrade: student.grade || 3,
    courseId: ticket.course_id,
    course_id: ticket.course_id,
    courseTitle: course.title || 'دعم عام للمنصة',
    ticketType: ticket.ticket_type || 'technical',
    ticket_type: ticket.ticket_type || 'technical',
    subject: ticket.subject,
    description: ticket.description,
    status: ticket.status || 'open',
    priority: ticket.priority || 'normal',
    assignedToAssistantId: ticket.assigned_to_assistant_id,
    assigned_to_assistant_id: ticket.assigned_to_assistant_id,
    assignedAssistantName: assignedAssistant.full_name || null,
    createdAt: ticket.created_at,
    created_at: ticket.created_at,
    updatedAt: ticket.updated_at,
    updated_at: ticket.updated_at,
    student: {
      id: student.id || ticket.student_id,
      fullName: student.full_name || 'طالب المنصة',
      full_name: student.full_name || 'طالب المنصة',
      phone: student.phone || '',
      stage: student.stage,
      grade: student.grade,
      educationType: student.education_type,
    },
    course: ticket.course_id ? {
      id: course.id || ticket.course_id,
      title: course.title || 'عام',
    } : null,
    assigned_assistant: ticket.assigned_to_assistant_id ? {
      id: assignedAssistant.id || ticket.assigned_to_assistant_id,
      fullName: assignedAssistant.full_name || 'مساعد',
      full_name: assignedAssistant.full_name || 'مساعد',
    } : null,
    messages,
  };
}

// GET: Fetch tickets with complete relationships (Teacher, Assistant, or Student)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role');
    const studentId = searchParams.get('studentId') || searchParams.get('student_id');
    const assistantId = searchParams.get('assistantId') || searchParams.get('assistant_id');
    const status = searchParams.get('status');
    const ticketType = searchParams.get('type') || searchParams.get('ticket_type');
    const courseId = searchParams.get('courseId') || searchParams.get('course_id');
    const ticketId = searchParams.get('ticketId') || searchParams.get('id');

    let query = supabaseAdmin
      .from('support_tickets')
      .select(`
        *,
        student:profiles!support_tickets_student_id_fkey(id, full_name, phone, stage, grade, education_type),
        course:courses(id, title),
        assigned_assistant:profiles!support_tickets_assigned_to_assistant_id_fkey(id, full_name),
        messages:ticket_messages(*)
      `)
      .order('created_at', { ascending: false });

    if (ticketId) {
      query = query.eq('id', ticketId);
    }

    if (studentId) {
      query = query.eq('student_id', studentId);
    }

    if (courseId && courseId !== 'all') {
      query = query.eq('course_id', courseId);
    }

    if (ticketType && ticketType !== 'all') {
      query = query.eq('ticket_type', ticketType);
    }

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    // Assistant role filtering
    if (role === 'assistant' && assistantId) {
      // If specific assistant is assigned or open
      query = query.or(`assigned_to_assistant_id.eq.${assistantId},assigned_to_assistant_id.is.null`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('API /api/support/tickets GET error:', error);
      return NextResponse.json({ success: false, error: error.message, tickets: [] }, { status: 500 });
    }

    const tickets = (data || []).map(formatTicket);
    return NextResponse.json({ success: true, tickets });
  } catch (err: any) {
    console.error('API /api/support/tickets GET fatal error:', err);
    return NextResponse.json({ success: false, error: err?.message, tickets: [] }, { status: 500 });
  }
}

// POST: Create a new support ticket
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      studentId,
      student_id,
      studentName,
      studentPhone,
      courseId,
      course_id,
      ticketType,
      ticket_type,
      subject,
      description,
      priority,
    } = body;

    const rawStudentId = studentId || student_id;
    const rawCourseId = courseId || course_id;
    const finalType = ticketType || ticket_type || 'technical';
    const cleanSubject = (subject || '').trim();
    const cleanDesc = (description || '').trim();

    if (!cleanSubject || !cleanDesc) {
      return NextResponse.json({ success: false, error: 'عنوان ووصف التذكرة مطلوبان' }, { status: 400 });
    }

    // 1. Resolve / Ensure student exists in profiles table
    let resolvedStudentId = rawStudentId;
    if (resolvedStudentId) {
      const { data: pCheck } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('id', resolvedStudentId)
        .maybeSingle();

      if (!pCheck) {
        // Look up by phone if available
        if (studentPhone) {
          const { data: byPhone } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('phone', studentPhone.trim())
            .maybeSingle();
          if (byPhone) {
            resolvedStudentId = byPhone.id;
          }
        }
      }

      // If still not in profiles, upsert minimal profile for this student
      if (!pCheck && resolvedStudentId) {
        try {
          await supabaseAdmin.from('profiles').upsert([{
            id: resolvedStudentId,
            role: 'student',
            full_name: studentName || 'طالب المنصة',
            phone: studentPhone || '01000000000',
            password_hash: '00000000',
            status: 'active',
          }]);
        } catch (profErr) {
          console.warn('Could not upsert profile for student:', profErr);
        }
      }
    }

    // If still no valid student id, find any real student or fallback
    if (!resolvedStudentId) {
      const { data: sampleStudent } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('role', 'student')
        .limit(1)
        .maybeSingle();
      resolvedStudentId = sampleStudent?.id || '4931c2b4-c324-4bd1-9500-e29ef6830a9c';
    }

    // 2. Validate course_id
    let validCourseId: string | null = null;
    if (rawCourseId && rawCourseId !== 'all') {
      const { data: cCheck } = await supabaseAdmin
        .from('courses')
        .select('id')
        .eq('id', rawCourseId)
        .maybeSingle();
      if (cCheck) {
        validCourseId = cCheck.id;
      }
    }

    // 3. Create Ticket in support_tickets table
    const newTicketId = crypto.randomUUID();
    const ticketNumber = Math.floor(1000 + Math.random() * 9000);

    const { data: insertedTicket, error: ticketError } = await supabaseAdmin
      .from('support_tickets')
      .insert([{
        id: newTicketId,
        ticket_number: ticketNumber,
        student_id: resolvedStudentId,
        course_id: validCourseId,
        ticket_type: finalType,
        subject: cleanSubject,
        description: cleanDesc,
        status: 'open',
        priority: priority || 'normal',
        assigned_to_assistant_id: null,
      }])
      .select(`
        *,
        student:profiles!support_tickets_student_id_fkey(id, full_name, phone, stage, grade, education_type),
        course:courses(id, title),
        assigned_assistant:profiles!support_tickets_assigned_to_assistant_id_fkey(id, full_name)
      `)
      .single();

    if (ticketError) {
      console.error('API /api/support/tickets POST insert error:', ticketError);
      return NextResponse.json({ success: false, error: ticketError.message }, { status: 500 });
    }

    // 4. Create Initial message in ticket_messages table
    const initialMsgId = crypto.randomUUID();
    await supabaseAdmin.from('ticket_messages').insert([{
      id: initialMsgId,
      ticket_id: newTicketId,
      sender_id: resolvedStudentId,
      sender_role: 'student',
      message: cleanDesc,
      attachment_url: null,
    }]);

    // Format response
    const formatted = formatTicket({
      ...insertedTicket,
      messages: [{
        id: initialMsgId,
        ticket_id: newTicketId,
        sender_id: resolvedStudentId,
        sender_role: 'student',
        message: cleanDesc,
        attachment_url: null,
        created_at: new Date().toISOString(),
      }],
    });

    return NextResponse.json({ success: true, ticket: formatted });
  } catch (err: any) {
    console.error('API /api/support/tickets POST fatal error:', err);
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}

// PATCH: Update ticket status, priority, or assigned assistant
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      ticketId,
      id,
      status,
      assignedToAssistantId,
      assigned_to_assistant_id,
      priority,
    } = body;

    const targetId = ticketId || id;
    if (!targetId) {
      return NextResponse.json({ success: false, error: 'معرف التذكرة مطلوب' }, { status: 400 });
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (status) {
      updates.status = status;
    }

    if (priority) {
      updates.priority = priority;
    }

    const asstId = assignedToAssistantId !== undefined ? assignedToAssistantId : assigned_to_assistant_id;
    if (asstId !== undefined) {
      if (asstId === null || asstId === '') {
        updates.assigned_to_assistant_id = null;
      } else {
        // Validate assistant in profiles
        const { data: asstProfile } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('id', asstId)
          .maybeSingle();

        if (asstProfile) {
          updates.assigned_to_assistant_id = asstProfile.id;
        } else {
          // If default assistant asst-1, map to standard assistant UUID
          updates.assigned_to_assistant_id = 'a1000000-0000-4000-8000-000000000001';
        }
      }
    }

    const { data: updated, error } = await supabaseAdmin
      .from('support_tickets')
      .update(updates)
      .eq('id', targetId)
      .select(`
        *,
        student:profiles!support_tickets_student_id_fkey(id, full_name, phone, stage, grade, education_type),
        course:courses(id, title),
        assigned_assistant:profiles!support_tickets_assigned_to_assistant_id_fkey(id, full_name),
        messages:ticket_messages(*)
      `)
      .single();

    if (error) {
      console.error('API /api/support/tickets PATCH error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, ticket: formatTicket(updated) });
  } catch (err: any) {
    console.error('API /api/support/tickets PATCH fatal error:', err);
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
