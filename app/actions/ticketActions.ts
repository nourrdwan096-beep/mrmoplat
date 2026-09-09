'use server';

import { supabaseAdmin } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';

// Fetch all tickets for a specific student with messages & course info
export async function getStudentTickets(studentId: string) {
  try {
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
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('getStudentTickets database error, falling back to simple query:', error);
      const { data: simpleData } = await supabaseAdmin
        .from('support_tickets')
        .select('*, course:courses(id, title)')
        .eq('student_id', studentId)
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
    // 1. Fetch all tickets with student info and course
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
      const { data: perm } = await supabaseAdmin
        .from('assistant_permissions')
        .select('can_handle_academic_support, can_handle_technical_support, can_manage_all_courses, assigned_course_ids')
        .eq('assistant_id', userId)
        .single();

      const canTech = perm ? perm.can_handle_technical_support ?? true : true;
      const canAcademic = perm ? perm.can_handle_academic_support ?? true : true;
      const canAllCourses = perm ? perm.can_manage_all_courses ?? false : false;
      const assignedIds: string[] = perm?.assigned_course_ids || [];

      return allTickets.filter((ticket: any) => {
        // 1. Explicitly assigned to this assistant
        if (ticket.assigned_to_assistant_id === userId) return true;

        // 2. Technical Support
        if (ticket.ticket_type === 'technical') {
          return canTech;
        }

        // 3. Academic Support (routed to assistants assigned to this course)
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

  try {
    const { data: newTicket, error } = await supabaseAdmin
      .from('support_tickets')
      .insert([{
        id: ticketId,
        ticket_number: ticketNumber,
        student_id: data.student_id,
        course_id: data.course_id || null,
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
      throw error;
    }

    // Create initial message in ticket_messages
    const messageId = crypto.randomUUID();
    await supabaseAdmin
      .from('ticket_messages')
      .insert([{
        id: messageId,
        ticket_id: ticketId,
        sender_id: data.student_id,
        sender_role: 'student',
        message: data.description,
        created_at: new Date().toISOString(),
      }]);

    revalidatePath('/student/support');
    revalidatePath('/teacher/support');
    revalidatePath('/assistant/support');

    return newTicket;
  } catch (err) {
    console.error('createTicket server action error:', err);
    throw err;
  }
}

// Update ticket status (with audit logging)
export async function updateTicketStatus(
  ticketId: string,
  status: 'open' | 'in_progress' | 'resolved' | 'closed',
  actor?: { id?: string; name?: string; role?: string }
) {
  try {
    const { data, error } = await supabaseAdmin
      .from('support_tickets')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', ticketId)
      .select()
      .single();

    if (error) throw error;

    // Log in audit_logs
    if (actor?.id) {
      try {
        await supabaseAdmin.from('audit_logs').insert([{
          id: crypto.randomUUID(),
          actor_id: actor.id,
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

    revalidatePath('/student/support');
    revalidatePath('/teacher/support');
    revalidatePath('/assistant/support');

    return data;
  } catch (err) {
    console.error('updateTicketStatus error:', err);
    throw err;
  }
}

// Assign ticket to assistant (prevents collisions between staff)
export async function assignTicketToAssistant(
  ticketId: string,
  assistantId: string,
  assistantName: string,
  actor?: { id?: string; name?: string; role?: string }
) {
  try {
    const { data, error } = await supabaseAdmin
      .from('support_tickets')
      .update({
        assigned_to_assistant_id: assistantId,
        status: 'in_progress',
        updated_at: new Date().toISOString()
      })
      .eq('id', ticketId)
      .select()
      .single();

    if (error) throw error;

    // Audit log
    try {
      await supabaseAdmin.from('audit_logs').insert([{
        id: crypto.randomUUID(),
        actor_id: actor?.id || assistantId,
        actor_name: actor?.name || assistantName,
        actor_role: (actor?.role as any) || 'assistant',
        action_type: 'ASSIGN_TICKET',
        target_entity: 'support_tickets',
        target_id: ticketId,
        details: { assistantId, assistantName },
        created_at: new Date().toISOString(),
      }]);
    } catch (logErr) {
      console.warn('Failed to insert audit log for assignTicketToAssistant:', logErr);
    }

    revalidatePath('/teacher/support');
    revalidatePath('/assistant/support');

    return data;
  } catch (err) {
    console.error('assignTicketToAssistant error:', err);
    throw err;
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
    // 1. If staff replies and ticket is open, auto update to in_progress
    const isStaff = senderRole === 'teacher' || senderRole === 'assistant' || senderRole === 'super_admin';
    const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() };
    if (isStaff) {
      updatePayload.status = 'in_progress';
    }

    await supabaseAdmin
      .from('support_tickets')
      .update(updatePayload)
      .eq('id', ticketId);

    // 2. Insert message
    const msgId = crypto.randomUUID();
    const { data, error } = await supabaseAdmin
      .from('ticket_messages')
      .insert([{
        id: msgId,
        ticket_id: ticketId,
        sender_id: senderId,
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
      console.warn('Insert ticket_messages with join error, retrying plain insert:', error);
      const { data: plainData } = await supabaseAdmin
        .from('ticket_messages')
        .insert([{
          id: msgId,
          ticket_id: ticketId,
          sender_id: senderId,
          sender_role: senderRole,
          message: message,
          created_at: new Date().toISOString(),
        }])
        .select()
        .single();
      return plainData;
    }

    // 3. If staff, log in audit_logs
    if (isStaff) {
      try {
        await supabaseAdmin.from('audit_logs').insert([{
          id: crypto.randomUUID(),
          actor_id: senderId,
          actor_name: senderName || 'Staff',
          actor_role: senderRole as any,
          action_type: 'REPLY_SUPPORT_TICKET',
          target_entity: 'support_tickets',
          target_id: ticketId,
          details: { messageSnippet: message.substring(0, 80) },
          created_at: new Date().toISOString(),
        }]);
      } catch (logErr) {
        // silent
      }
    }

    return data;
  } catch (err) {
    console.error('addTicketMessage error:', err);
    throw err;
  }
}

