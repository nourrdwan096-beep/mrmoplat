import { supabase } from './supabaseClient';
import { fetchAssistants } from './teacherService';

export interface TicketSender {
  id: string;
  full_name: string;
  role: string;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  ticketId?: string;
  sender_id: string;
  senderId?: string;
  sender_role: 'student' | 'teacher' | 'assistant' | 'super_admin';
  senderRole?: 'student' | 'teacher' | 'assistant' | 'super_admin';
  message: string;
  attachment_url?: string | null;
  attachmentUrl?: string | null;
  created_at: string;
  createdAt?: string;
  sender?: TicketSender | null;
  senderName?: string;
}


export interface SupportTicket {
  id: string;
  ticket_number: number;
  ticketNumber?: number;
  student_id: string;
  studentId?: string;
  student_name?: string;
  studentName?: string;
  student_phone?: string;
  studentPhone?: string;
  course_id?: string | null;
  courseId?: string | null;
  course_title?: string | null;
  courseTitle?: string | null;
  ticket_type: 'technical' | 'academic';
  ticketType?: 'technical' | 'academic';
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  assigned_to_assistant_id?: string | null;
  assignedToAssistantId?: string | null;
  assigned_assistant_name?: string | null;
  assignedAssistantName?: string | null;
  created_at: string;
  createdAt?: string;
  updated_at: string;
  updatedAt?: string;
  course?: { id: string; title: string } | null;
  student?: {
    id: string;
    full_name: string;
    phone?: string;
    stage?: string;
    grade?: number;
    education_type?: string;
  } | null;
  assigned_assistant?: { id: string; full_name: string } | null;
  messages?: TicketMessage[];
}

const LOCAL_TICKETS_KEY = 'mr_radwan_support_tickets_cache';
const LOCAL_MESSAGES_KEY = 'mr_radwan_ticket_messages_cache';

// Helper for local storage
function getLocalTickets(): SupportTicket[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_TICKETS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalTickets(tickets: SupportTicket[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_TICKETS_KEY, JSON.stringify(tickets));
    window.dispatchEvent(new CustomEvent('mr_radwan_tickets_updated'));
  } catch (e) {
    console.warn('saveLocalTickets error:', e);
  }
}

function getLocalMessages(): TicketMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_MESSAGES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalMessages(msgs: TicketMessage[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_MESSAGES_KEY, JSON.stringify(msgs));
    window.dispatchEvent(new CustomEvent('mr_radwan_tickets_updated'));
  } catch (e) {
    console.warn('saveLocalMessages error:', e);
  }
}

/**
 * Fetch all tickets for a specific student
 */
export async function getStudentTickets(studentId: string): Promise<SupportTicket[]> {
  const local = getLocalTickets().filter((t) => t.student_id === studentId);

  if (!supabase) {
    return local.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  try {
    const { data, error } = await supabase
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

    if (!error && data && data.length > 0) {
      // Merge remote with any newly added local tickets
      const remoteIds = new Set(data.map((d: any) => d.id));
      const localOnly = local.filter((l) => !remoteIds.has(l.id));
      const merged = [...data, ...localOnly];
      saveLocalTickets(merged);
      return merged;
    }

    // Try basic select if join fails
    const { data: basicData, error: basicError } = await supabase
      .from('support_tickets')
      .select('*, course:courses(id, title)')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (!basicError && basicData && basicData.length > 0) {
      const remoteIds = new Set(basicData.map((d: any) => d.id));
      const localOnly = local.filter((l) => !remoteIds.has(l.id));
      const merged = [...basicData, ...localOnly];
      saveLocalTickets(merged);
      return merged;
    }
  } catch (err) {
    console.warn('getStudentTickets remote error, using local fallback:', err);
  }

  return local.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

/**
 * Fetch tickets for staff with smart dispatching
 */
export async function getStaffTickets(
  userId: string = '',
  role: string = 'teacher',
  assignedCourseIds: string[] = []
): Promise<SupportTicket[]> {
  const local = getLocalTickets();

  let allTickets: SupportTicket[] = local;

  if (supabase) {
    try {
      const { data, error } = await supabase
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

      if (!error && data) {
        const remoteIds = new Set(data.map((d: any) => d.id));
        const localOnly = local.filter((l) => !remoteIds.has(l.id));
        allTickets = [...data, ...localOnly];
        saveLocalTickets(allTickets);
      } else {
        const { data: basicData } = await supabase
          .from('support_tickets')
          .select('*')
          .order('created_at', { ascending: false });
        if (basicData) {
          const remoteIds = new Set(basicData.map((d: any) => d.id));
          const localOnly = local.filter((l) => !remoteIds.has(l.id));
          allTickets = [...basicData, ...localOnly];
        }
      }
    } catch (err) {
      console.warn('getStaffTickets remote error:', err);
    }
  }

  // Sort descending
  allTickets.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Super Admin & Teacher see everything
  if (role === 'super_admin' || role === 'teacher') {
    return allTickets;
  }

  // Assistant: Smart Dispatching filter
  if (role === 'assistant') {
    try {
      const assistants = await fetchAssistants();
      const myProfile = assistants.find((a) => a.id === userId);
      const perm = myProfile?.permissions;

      const canTech = perm ? perm.canHandleTechnicalSupport ?? true : true;
      const canAcademic = perm ? perm.canHandleAcademicSupport ?? true : true;
      const canAllCourses = perm ? perm.canManageAllCourses ?? false : false;
      const assignedIds: string[] = perm?.assignedCourseIds || [];

      return allTickets.filter((ticket: any) => {
        // 1. Explicitly assigned to this assistant
        if (ticket.assigned_to_assistant_id === userId) return true;

        // 2. Technical Support
        if (ticket.ticket_type === 'technical') {
          return canTech;
        }

        // 3. Academic Support
        if (ticket.ticket_type === 'academic') {
          if (!canAcademic) return false;
          if (canAllCourses) return true;
          if (!ticket.course_id) return true;
          return assignedIds.includes(ticket.course_id);
        }

        return true;
      });
    } catch {
      return allTickets;
    }
  }

  return allTickets;
}

/**
 * Create a new support ticket
 */
export async function createTicket(data: {
  student_id: string;
  course_id?: string;
  ticket_type: 'technical' | 'academic';
  subject: string;
  description: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  student_name?: string;
  course_title?: string;
}): Promise<SupportTicket> {
  const ticketId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'ticket-' + Date.now();
  const ticketNumber = Math.floor(1000 + Math.random() * 9000);
  const now = new Date().toISOString();

  const newTicket: SupportTicket = {
    id: ticketId,
    ticket_number: ticketNumber,
    student_id: data.student_id,
    course_id: data.course_id || null,
    ticket_type: data.ticket_type,
    subject: data.subject,
    description: data.description,
    status: 'open',
    priority: data.priority || 'normal',
    created_at: now,
    updated_at: now,
    course: data.course_id ? { id: data.course_id, title: data.course_title || 'الكورس' } : null,
    student: {
      id: data.student_id,
      full_name: data.student_name || 'طالب',
    },
    messages: [
      {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'msg-' + Date.now(),
        ticket_id: ticketId,
        sender_id: data.student_id,
        sender_role: 'student',
        message: data.description,
        created_at: now,
        sender: {
          id: data.student_id,
          full_name: data.student_name || 'طالب',
          role: 'student',
        },
      },
    ],
  };

  // Always save locally immediately
  const existingTickets = getLocalTickets();
  saveLocalTickets([newTicket, ...existingTickets]);

  const existingMsgs = getLocalMessages();
  if (newTicket.messages && newTicket.messages[0]) {
    saveLocalMessages([...existingMsgs, newTicket.messages[0]]);
  }

  // Attempt Supabase insert in background / sync
  if (supabase) {
    try {
      const { error: ticketError } = await supabase.from('support_tickets').insert([
        {
          id: ticketId,
          ticket_number: ticketNumber,
          student_id: data.student_id,
          course_id: data.course_id || null,
          ticket_type: data.ticket_type,
          subject: data.subject,
          description: data.description,
          status: 'open',
          priority: data.priority || 'normal',
          created_at: now,
          updated_at: now,
        },
      ]);

      if (!ticketError) {
        // Insert message
        const msgId = newTicket.messages?.[0]?.id || crypto.randomUUID();
        await supabase.from('ticket_messages').insert([
          {
            id: msgId,
            ticket_id: ticketId,
            sender_id: data.student_id,
            sender_role: 'student',
            message: data.description,
            created_at: now,
          },
        ]);
      } else {
        console.warn('Supabase createTicket warning:', ticketError);
      }
    } catch (err) {
      console.warn('createTicket Supabase sync error:', err);
    }
  }

  return newTicket;
}

/**
 * Get messages for a ticket
 */
export async function getTicketMessages(ticketId: string): Promise<TicketMessage[]> {
  const localMsgs = getLocalMessages().filter((m) => m.ticket_id === ticketId);

  if (!supabase) {
    return localMsgs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  try {
    const { data, error } = await supabase
      .from('ticket_messages')
      .select(`
        *,
        sender:profiles!ticket_messages_sender_id_fkey(id, full_name, role)
      `)
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (!error && data && data.length > 0) {
      const remoteIds = new Set(data.map((d: any) => d.id));
      const localOnly = localMsgs.filter((l) => !remoteIds.has(l.id));
      const merged = [...data, ...localOnly];
      return merged.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }

    // Basic select fallback
    const { data: basicData } = await supabase
      .from('ticket_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (basicData && basicData.length > 0) {
      const remoteIds = new Set(basicData.map((d: any) => d.id));
      const localOnly = localMsgs.filter((l) => !remoteIds.has(l.id));
      const merged = [...basicData, ...localOnly];
      return merged.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }
  } catch (err) {
    console.warn('getTicketMessages error:', err);
  }

  return localMsgs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

/**
 * Add a message to a ticket (supports both argument styles)
 */
export async function addTicketMessage(
  ticketId: string,
  arg2: string | { id?: string; name?: string; role?: string; fullName?: string },
  arg3?: string,
  arg4?: string,
  arg5?: string
): Promise<TicketMessage> {
  let senderId = 'anonymous';
  let senderRole = 'student';
  let senderName = 'مستخدم';
  let message = '';

  if (typeof arg2 === 'object' && arg2 !== null) {
    senderId = arg2.id || 'anonymous';
    senderRole = (arg2.role as any) || 'student';
    senderName = arg2.name || arg2.fullName || (senderRole === 'teacher' ? 'مستر محمد رضوان' : senderRole === 'assistant' ? 'فريق المساعدين' : 'طالب');
    message = arg3 || '';
  } else {
    senderId = arg2 || 'anonymous';
    senderRole = (arg3 as any) || 'student';
    message = arg4 || '';
    senderName = arg5 || (senderRole === 'teacher' ? 'مستر محمد رضوان' : senderRole === 'assistant' ? 'فريق المساعدين' : 'طالب');
  }

  const msgId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'msg-' + Date.now();
  const now = new Date().toISOString();

  const newMsg: TicketMessage = {
    id: msgId,
    ticket_id: ticketId,
    sender_id: senderId,
    sender_role: senderRole as any,
    message: message,
    created_at: now,
    sender: {
      id: senderId,
      full_name: senderName,
      role: senderRole,
    },
  };

  // 1. Update local storage
  const allMsgs = getLocalMessages();
  saveLocalMessages([...allMsgs, newMsg]);

  // Update local ticket status
  const allTickets = getLocalTickets();
  const isStaff = senderRole === 'teacher' || senderRole === 'assistant' || senderRole === 'super_admin';
  const updatedTickets = allTickets.map((t) => {
    if (t.id === ticketId) {
      return {
        ...t,
        status: isStaff && t.status === 'open' ? ('in_progress' as const) : t.status,
        updated_at: now,
      };
    }
    return t;
  });
  saveLocalTickets(updatedTickets);

  // Dispatch events for real-time reactivity
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mr_radwan_support_updated'));
    window.dispatchEvent(new CustomEvent('mr_radwan_notifications_updated'));
  }

  // 2. Sync to Supabase
  if (supabase) {
    try {
      // Auto update ticket status if open
      if (isStaff) {
        await supabase
          .from('support_tickets')
          .update({ status: 'in_progress', updated_at: now })
          .eq('id', ticketId);
      } else {
        await supabase
          .from('support_tickets')
          .update({ updated_at: now })
          .eq('id', ticketId);
      }

      // Check valid UUID for senderId
      let safeSenderId = senderId;
      if (
        (!safeSenderId || safeSenderId === 'teacher-radwan-01' || safeSenderId === 'staff-master') &&
        (senderRole === 'teacher' || senderRole === 'super_admin')
      ) {
        safeSenderId = 'a0000000-0000-4000-8000-000000000001';
      }

      await supabase.from('ticket_messages').insert([
        {
          id: msgId,
          ticket_id: ticketId,
          sender_id: safeSenderId,
          sender_role: senderRole,
          message: message,
          created_at: now,
        },
      ]);
    } catch (err) {
      console.warn('addTicketMessage Supabase sync error:', err);
    }
  }

  return newMsg;
}


/**
 * Update ticket status
 */
export async function updateTicketStatus(
  ticketId: string,
  status: 'open' | 'in_progress' | 'resolved' | 'closed',
  assignedToOrActor?: { id?: string; name?: string; role?: string } | { id: string; name: string } | null,
  actor?: { id?: string; name?: string; role?: string }
): Promise<SupportTicket | null> {
  const now = new Date().toISOString();
  let assignedTo: { id: string; name: string } | null = null;
  let finalActor: { id?: string; name?: string; role?: string } | undefined = actor;

  if (assignedToOrActor && 'role' in assignedToOrActor) {
    finalActor = assignedToOrActor as { id?: string; name?: string; role?: string };
  } else if (assignedToOrActor && 'id' in assignedToOrActor) {
    assignedTo = assignedToOrActor as { id: string; name: string };
  }

  // Update local
  const allTickets = getLocalTickets();
  let updatedTicket: SupportTicket | null = null;
  const updatedList = allTickets.map((t) => {
    if (t.id === ticketId) {
      updatedTicket = {
        ...t,
        status,
        assigned_to_assistant_id: assignedTo ? assignedTo.id : t.assigned_to_assistant_id,
        assignedToAssistantId: assignedTo ? assignedTo.id : t.assignedToAssistantId,
        assigned_assistant_name: assignedTo ? assignedTo.name : t.assigned_assistant_name,
        assignedAssistantName: assignedTo ? assignedTo.name : t.assignedAssistantName,
        updated_at: now,
        updatedAt: now,
      };
      return updatedTicket;
    }
    return t;
  });
  saveLocalTickets(updatedList);

  // Update Supabase
  if (supabase) {
    try {
      const updateData: Record<string, any> = { status, updated_at: now };
      if (assignedTo?.id) {
        updateData.assigned_to_assistant_id = assignedTo.id;
      }
      await supabase
        .from('support_tickets')
        .update(updateData)
        .eq('id', ticketId);
    } catch (err) {
      console.warn('updateTicketStatus Supabase error:', err);
    }
  }

  return updatedTicket;
}

/**
 * Assign ticket to assistant
 */
export async function assignTicketToAssistant(
  ticketId: string,
  assistantId: string,
  assistantName: string,
  actor?: { id?: string; name?: string; role?: string }
): Promise<SupportTicket | null> {
  const now = new Date().toISOString();

  // Update local
  const allTickets = getLocalTickets();
  let updatedTicket: SupportTicket | null = null;
  const updatedList = allTickets.map((t) => {
    if (t.id === ticketId) {
      updatedTicket = {
        ...t,
        assigned_to_assistant_id: assistantId,
        assigned_assistant: { id: assistantId, full_name: assistantName },
        status: 'in_progress',
        updated_at: now,
      };
      return updatedTicket;
    }
    return t;
  });
  saveLocalTickets(updatedList);

  // Update Supabase
  if (supabase) {
    try {
      await supabase
        .from('support_tickets')
        .update({
          assigned_to_assistant_id: assistantId,
          status: 'in_progress',
          updated_at: now,
        })
        .eq('id', ticketId);
    } catch (err) {
      console.warn('assignTicketToAssistant Supabase error:', err);
    }
  }

  return updatedTicket;
}

// Aliases and Compatibility Exports
export type SupportTicketData = SupportTicket;
export type TicketData = SupportTicket;
export const fetchStudentTickets = getStudentTickets;
export const fetchStaffTickets = getStaffTickets;
export const fetchSupportTickets = getStaffTickets;
export const fetchTicketMessages = getTicketMessages;
export const sendTicketMessage = addTicketMessage;
export const changeTicketStatus = updateTicketStatus;
export const assignTicket = assignTicketToAssistant;

export async function createSupportTicket(data: {
  studentId?: string;
  student_id?: string;
  courseId?: string;
  course_id?: string;
  ticketType?: 'technical' | 'academic';
  ticket_type?: 'technical' | 'academic';
  subject: string;
  description: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  studentName?: string;
  student_name?: string;
  studentPhone?: string;
  courseTitle?: string;
  course_title?: string;
}): Promise<SupportTicket> {
  return createTicket({
    student_id: (data.studentId || data.student_id || '') as string,
    course_id: data.courseId || data.course_id || undefined,
    ticket_type: (data.ticketType || data.ticket_type || 'technical') as 'technical' | 'academic',
    subject: data.subject,
    description: data.description,
    priority: data.priority,
    student_name: data.studentName || data.student_name,
    course_title: data.courseTitle || data.course_title,
  });
}

