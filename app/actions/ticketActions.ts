'use server';

import { supabaseAdmin } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';

function isUuid(str: string): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

function toValidUuid(seed: string): string {
  if (isUuid(seed)) return seed;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `00000000-0000-4000-8000-${hex.padStart(12, '0').slice(-12)}`;
}

// Fetch all tickets for a specific student with messages & course info
export async function getStudentTickets(studentId: string) {
  try {
    const studentUuid = toValidUuid(studentId);
    const { data, error } = await supabaseAdmin
      .from('support_tickets')
      .select(`
        *,
        course:courses(id, title),
        assigned_assistant:profiles!support_tickets_assigned_to_assistant_id_fkey(id, full_name),
        messages:ticket_messages(
          id,
          ticket_id,
          sender_id,
          sender_role,
          message,
          attachment_url,
          created_at,
          sender:profiles!ticket_messages_sender_id_fkey(id, full_name, role)
        )
      `)
      .eq('student_id', studentUuid)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('getStudentTickets database error, falling back to simple query:', error);
      const { data: simpleData } = await supabaseAdmin
        .from('support_tickets')
        .select('*, course:courses(id, title)')
        .eq('student_id', studentUuid)
        .order('created_at', { ascending: false });
      return simpleData || [];
    }
    return data || [];
  } catch (err) {
    console.error('getStudentTickets error:', err);
    return [];
  }
}

// Fetch tickets for staff based on role and Smart Dispatching
export async function getStaffTickets(userId: string, role: string) {
  try {
    const { data: allTickets, error } = await supabaseAdmin
      .from('support_tickets')
      .select(`
        *,
        course:courses(id, title),
        student:profiles!support_tickets_student_id_fkey(id, full_name, phone, stage, grade, education_type),
        assigned_assistant:profiles!support_tickets_assigned_to_assistant_id_fkey(id, full_name),
        messages:ticket_messages(
          id,
          ticket_id,
          sender_id,
          sender_role,
          message,
          attachment_url,
          created_at,
          sender:profiles!ticket_messages_sender_id_fkey(id, full_name, role)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('getStaffTickets join error, attempting basic select:', error);
      const { data: fallbackTickets } = await supabaseAdmin
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });
      return fallbackTickets || [];
    }

    if (!allTickets) return [];

    // Super Admin & Teacher see everything
    if (role === 'super_admin' || role === 'teacher') {
      return allTickets;
    }

    // Assistant: Smart Ticket Dispatching
    if (role === 'assistant') {
      const assistantUuid = toValidUuid(userId);
      const { data: perm } = await supabaseAdmin
        .from('assistant_permissions')
        .select('can_handle_academic_support, can_handle_technical_support, can_manage_all_courses, assigned_course_ids')
        .eq('assistant_id', assistantUuid)
        .single();

      const canTech = perm ? perm.can_handle_technical_support ?? true : true;
      const canAcademic = perm ? perm.can_handle_academic_support ?? true : true;
      const canAllCourses = perm ? perm.can_manage_all_courses ?? false : false;
      const assignedIds: string[] = perm?.assigned_course_ids || [];

      return allTickets.filter((ticket: any) => {
        if (ticket.assigned_to_assistant_id === assistantUuid || ticket.assigned_to_assistant_id === userId) return true;

        if (ticket.ticket_type === 'technical') {
          return canTech;
        }

        if (ticket.ticket_type === 'academic') {
          if (!canAcademic) return false;
          if (canAllCourses) return true;
          if (!ticket.course_id) return true;
          return assignedIds.includes(ticket.course_id);
        }

        return true;
      });
    }

    return allTickets;
  } catch (err) {
    console.error('getStaffTickets error:', err);
    return [];
  }
}

// Create a new ticket (with initial message and auto-generated UUID)
export async function createTicket(data: {
  student_id: string;
  course_id?: string;
  ticket_type: 'technical' | 'academic';
  subject: string;
  description: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}) {
  const ticketId = crypto.randomUUID();
  const ticketNumber = Math.floor(1000 + Math.random() * 9000);
  const studentUuid = toValidUuid(data.student_id);
  const courseUuid = data.course_id && isUuid(data.course_id) ? data.course_id : null;

  try {
    const { data: newTicket, error } = await supabaseAdmin
      .from('support_tickets')
      .insert([{
        id: ticketId,
        ticket_number: ticketNumber,
        student_id: studentUuid,
        course_id: courseUuid,
        ticket_type: data.ticket_type,
        subject: data.subject,
        description: data.description,
        status: 'open',
        priority: data.priority || 'normal',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) {
      console.error('createTicket error inserting ticket:', error);
    }

    // Create initial message in ticket_messages
    const messageId = crypto.randomUUID();
    await supabaseAdmin
      .from('ticket_messages')
      .insert([{
        id: messageId,
        ticket_id: ticketId,
        sender_id: studentUuid,
        sender_role: 'student',
        message: data.description,
        created_at: new Date().toISOString(),
      }]);

    try {
      revalidatePath('/student/support');
      revalidatePath('/teacher/support');
      revalidatePath('/assistant/support');
    } catch {}

    return newTicket || {
      id: ticketId,
      ticket_number: ticketNumber,
      student_id: data.student_id,
      course_id: data.course_id,
      ticket_type: data.ticket_type,
      subject: data.subject,
      description: data.description,
      status: 'open',
      priority: data.priority || 'normal',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  } catch (err) {
    console.error('createTicket server action error:', err);
    return {
      id: ticketId,
      ticket_number: ticketNumber,
      student_id: data.student_id,
      course_id: data.course_id,
      ticket_type: data.ticket_type,
      subject: data.subject,
      description: data.description,
      status: 'open',
      priority: data.priority || 'normal',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
}

// Update ticket status
export async function updateTicketStatus(
  ticketId: string,
  status: 'open' | 'in_progress' | 'resolved' | 'closed',
  actor?: { id?: string; name?: string; role?: string }
) {
  try {
    const { data } = await supabaseAdmin
      .from('support_tickets')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', ticketId)
      .select()
      .single();

    if (actor?.id) {
      try {
        await supabaseAdmin.from('audit_logs').insert([{
          id: crypto.randomUUID(),
          actor_id: toValidUuid(actor.id),
          actor_name: actor.name || 'Staff',
          actor_role: (actor.role as any) || 'teacher',
          action_type: `UPDATE_TICKET_STATUS (${status})`,
          target_entity: 'support_tickets',
          target_id: ticketId,
          details: { newStatus: status },
          created_at: new Date().toISOString(),
        }]);
      } catch (logErr) {
        console.warn('Failed to insert audit log for updateTicketStatus:', logErr);
      }
    }

    try {
      revalidatePath('/student/support');
      revalidatePath('/teacher/support');
      revalidatePath('/assistant/support');
    } catch {}

    return data;
  } catch (err) {
    console.error('updateTicketStatus error:', err);
    return null;
  }
}

// Assign ticket to assistant
export async function assignTicketToAssistant(
  ticketId: string,
  assistantId: string,
  assistantName: string,
  actor?: { id?: string; name?: string; role?: string }
) {
  try {
    const assistantUuid = toValidUuid(assistantId);
    const { data } = await supabaseAdmin
      .from('support_tickets')
      .update({
        assigned_to_assistant_id: assistantUuid,
        status: 'in_progress',
        updated_at: new Date().toISOString()
      })
      .eq('id', ticketId)
      .select()
      .single();

    try {
      await supabaseAdmin.from('audit_logs').insert([{
        id: crypto.randomUUID(),
        actor_id: toValidUuid(actor?.id || assistantId),
        actor_name: actor?.name || assistantName,
        actor_role: (actor?.role as any) || 'assistant',
        action_type: 'ASSIGN_TICKET',
        target_entity: 'support_tickets',
        target_id: ticketId,
        details: { assistantId, assistantName },
        created_at: new Date().toISOString(),
      }]);
    } catch (logErr) {}

    try {
      revalidatePath('/teacher/support');
      revalidatePath('/assistant/support');
    } catch {}

    return data;
  } catch (err) {
    console.error('assignTicketToAssistant error:', err);
    return null;
  }
}

// Get messages for a ticket
export async function getTicketMessages(ticketId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('ticket_messages')
      .select(`
        *,
        sender:profiles!ticket_messages_sender_id_fkey(id, full_name, role)
      `)
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('getTicketMessages error, attempting fallback select:', error);
      const { data: fallbackData } = await supabaseAdmin
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });
      return fallbackData || [];
    }
    return data || [];
  } catch (err) {
    console.error('getTicketMessages error:', err);
    return [];
  }
}

// Add a message to a ticket
export async function addTicketMessage(
  ticketId: string,
  senderId: string,
  senderRole: string,
  message: string,
  senderName?: string
) {
  try {
    const isStaff = senderRole === 'teacher' || senderRole === 'assistant' || senderRole === 'super_admin';
    const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() };
    if (isStaff) {
      updatePayload.status = 'in_progress';
    }

    await supabaseAdmin
      .from('support_tickets')
      .update(updatePayload)
      .eq('id', ticketId);

    const resolvedSenderId = toValidUuid(senderId);

    const msgId = crypto.randomUUID();
    const { data, error } = await supabaseAdmin
      .from('ticket_messages')
      .insert([{
        id: msgId,
        ticket_id: ticketId,
        sender_id: resolvedSenderId,
        sender_role: senderRole,
        message: message,
        created_at: new Date().toISOString(),
      }])
      .select(`
        *,
        sender:profiles!ticket_messages_sender_id_fkey(id, full_name, role)
      `)
      .single();

    if (error) {
      const { data: plainData } = await supabaseAdmin
        .from('ticket_messages')
        .insert([{
          id: msgId,
          ticket_id: ticketId,
          sender_id: resolvedSenderId,
          sender_role: senderRole,
          message: message,
          created_at: new Date().toISOString(),
        }])
        .select()
        .single();
      return plainData;
    }

    if (isStaff) {
      try {
        await supabaseAdmin.from('audit_logs').insert([{
          id: crypto.randomUUID(),
          actor_id: resolvedSenderId,
          actor_name: senderName || 'Staff',
          actor_role: senderRole as any,
          action_type: 'REPLY_SUPPORT_TICKET',
          target_entity: 'support_tickets',
          target_id: ticketId,
          details: { messageSnippet: message.substring(0, 80) },
          created_at: new Date().toISOString(),
        }]);
      } catch (logErr) {}
    }

    return data;
  } catch (err) {
    console.error('addTicketMessage error:', err);
    return null;
  }
}
