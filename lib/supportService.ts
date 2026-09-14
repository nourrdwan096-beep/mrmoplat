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
  studentStage?: string;
  studentGrade?: number;
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
    window.dispatchEvent(new CustomEvent('mr_radwan_support_updated'));
    window.dispatchEvent(new CustomEvent('mr_radwan_notifications_updated'));
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
    window.dispatchEvent(new CustomEvent('mr_radwan_support_updated'));
    window.dispatchEvent(new CustomEvent('mr_radwan_notifications_updated'));
  } catch (e) {
    console.warn('saveLocalMessages error:', e);
  }
}

/**
 * Fetch all tickets for a specific student (Global API -> Supabase Admin)
 */
export async function getStudentTickets(studentId: string): Promise<SupportTicket[]> {
  const local = getLocalTickets().filter((t) => t.student_id === studentId || t.studentId === studentId);

  try {
    const res = await fetch(`/api/support/tickets?studentId=${encodeURIComponent(studentId)}`, {
      cache: 'no-store',
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.tickets)) {
        // Merge with cache
        const remoteIds = new Set(data.tickets.map((t: any) => t.id));
        const localOnly = local.filter((l) => !remoteIds.has(l.id));
        const merged = [...data.tickets, ...localOnly];
        saveLocalTickets(merged);
        return merged;
      }
    }
  } catch (err) {
    console.warn('getStudentTickets API error, using local fallback:', err);
  }

  return local.sort((a, b) => new Date(b.createdAt || b.created_at || 0).getTime() - new Date(a.createdAt || a.created_at || 0).getTime());
}

/**
 * Fetch tickets for staff with smart dispatching (Global API -> Supabase Admin)
 */
export async function getStaffTickets(
  userId: string = '',
  role: string = 'teacher',
  assignedCourseIds: string[] = []
): Promise<SupportTicket[]> {
  const local = getLocalTickets();

  try {
    const params = new URLSearchParams({
      role: role || 'teacher',
      assistantId: userId || '',
    });

    const res = await fetch(`/api/support/tickets?${params.toString()}`, {
      cache: 'no-store',
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.tickets)) {
        let remoteTickets = data.tickets;

        // Assistant smart dispatching filter if applicable
        if (role === 'assistant' && userId) {
          try {
            const assistants = await fetchAssistants();
            const myProfile = assistants.find((a) => a.id === userId);
            const perm = myProfile?.permissions;

            const canTech = perm ? perm.canHandleTechnicalSupport ?? true : true;
            const canAcademic = perm ? perm.canHandleAcademicSupport ?? true : true;
            const canAllCourses = perm ? perm.canManageAllCourses ?? false : false;
            const assignedIds: string[] = perm?.assignedCourseIds || assignedCourseIds || [];

            remoteTickets = remoteTickets.filter((ticket: any) => {
              if (ticket.assignedToAssistantId === userId || ticket.assigned_to_assistant_id === userId) return true;
              if (ticket.ticketType === 'technical' || ticket.ticket_type === 'technical') return canTech;
              if (ticket.ticketType === 'academic' || ticket.ticket_type === 'academic') {
                if (!canAcademic) return false;
                if (canAllCourses) return true;
                const cId = ticket.courseId || ticket.course_id;
                if (!cId) return true;
                return assignedIds.includes(cId);
              }
              return true;
            });
          } catch {
            // Keep remoteTickets as is
          }
        }

        saveLocalTickets(remoteTickets);
        return remoteTickets;
      }
    }
  } catch (err) {
    console.warn('getStaffTickets API error, using local fallback:', err);
  }

  // Fallback to local tickets
  return local.sort((a, b) => new Date(b.createdAt || b.created_at || 0).getTime() - new Date(a.createdAt || a.created_at || 0).getTime());
}

/**
 * Create a new support ticket (Global API -> Supabase Admin)
 */
export async function createTicket(data: {
  student_id: string;
  course_id?: string;
  ticket_type: 'technical' | 'academic';
  subject: string;
  description: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  student_name?: string;
  student_phone?: string;
  course_title?: string;
}): Promise<SupportTicket> {
  const ticketId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'ticket-' + Date.now();
  const ticketNumber = Math.floor(1000 + Math.random() * 9000);
  const now = new Date().toISOString();

  // 1. Optimistic local ticket
  const optimisticTicket: SupportTicket = {
    id: ticketId,
    ticket_number: ticketNumber,
    ticketNumber: ticketNumber,
    student_id: data.student_id,
    studentId: data.student_id,
    student_name: data.student_name || 'طالب المنصة',
    studentName: data.student_name || 'طالب المنصة',
    student_phone: data.student_phone || '',
    studentPhone: data.student_phone || '',
    course_id: data.course_id || null,
    courseId: data.course_id || null,
    course_title: data.course_title || 'عام',
    courseTitle: data.course_title || 'عام',
    ticket_type: data.ticket_type,
    ticketType: data.ticket_type,
    subject: data.subject,
    description: data.description,
    status: 'open',
    priority: data.priority || 'normal',
    created_at: now,
    createdAt: now,
    updated_at: now,
    updatedAt: now,
    course: data.course_id ? { id: data.course_id, title: data.course_title || 'الكورس' } : null,
    student: {
      id: data.student_id,
      full_name: data.student_name || 'طالب',
      phone: data.student_phone || '',
    },
    messages: [
      {
        id: 'msg-' + Date.now(),
        ticket_id: ticketId,
        ticketId: ticketId,
        sender_id: data.student_id,
        senderId: data.student_id,
        sender_role: 'student',
        senderRole: 'student',
        senderName: data.student_name || 'طالب',
        message: data.description,
        created_at: now,
        createdAt: now,
      },
    ],
  };

  const existingTickets = getLocalTickets();
  saveLocalTickets([optimisticTicket, ...existingTickets]);

  // 2. Global Sync via API Route
  try {
    const res = await fetch('/api/support/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: data.student_id,
        studentName: data.student_name,
        studentPhone: data.student_phone,
        courseId: data.course_id,
        ticketType: data.ticket_type,
        subject: data.subject,
        description: data.description,
        priority: data.priority,
      }),
    });

    if (res.ok) {
      const resData = await res.json();
      if (resData.success && resData.ticket) {
        const serverTicket = resData.ticket;
        const current = getLocalTickets().filter((t) => t.id !== ticketId && t.id !== serverTicket.id);
        saveLocalTickets([serverTicket, ...current]);
        return serverTicket;
      }
    }
  } catch (apiErr) {
    console.warn('createTicket API sync error, keeping optimistic ticket:', apiErr);
  }

  return optimisticTicket;
}

/**
 * Get messages for a ticket (Global API -> Supabase Admin)
 */
export async function getTicketMessages(ticketId: string): Promise<TicketMessage[]> {
  const localMsgs = getLocalMessages().filter((m) => m.ticket_id === ticketId || m.ticketId === ticketId);

  try {
    const res = await fetch(`/api/support/messages?ticketId=${encodeURIComponent(ticketId)}`, {
      cache: 'no-store',
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.messages)) {
        return data.messages;
      }
    }
  } catch (err) {
    console.warn('getTicketMessages API error, using local fallback:', err);
  }

  return localMsgs.sort((a, b) => new Date(a.createdAt || a.created_at || 0).getTime() - new Date(b.createdAt || b.created_at || 0).getTime());
}

/**
 * Add a message to a ticket (Global API -> Supabase Admin)
 */
export async function addTicketMessage(
  ticketId: string,
  arg2: string | { id?: string; name?: string; role?: string; fullName?: string },
  arg3?: string,
  arg4?: string,
  arg5?: string
): Promise<TicketMessage> {
  let senderId = 'anonymous';
  let senderRole: TicketMessage['sender_role'] = 'student';
  let senderName = 'مستخدم';
  let message = '';
  let attachmentUrl: string | undefined = undefined;

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

  // 1. Optimistic message
  const optimisticMsg: TicketMessage = {
    id: msgId,
    ticket_id: ticketId,
    ticketId: ticketId,
    sender_id: senderId,
    senderId: senderId,
    sender_role: senderRole,
    senderRole: senderRole,
    senderName: senderName,
    message: message,
    created_at: now,
    createdAt: now,
    sender: {
      id: senderId,
      full_name: senderName,
      role: senderRole,
    },
  };

  const allMsgs = getLocalMessages();
  saveLocalMessages([...allMsgs, optimisticMsg]);

  // Update local ticket status
  const allTickets = getLocalTickets();
  const isStaff = senderRole === 'teacher' || senderRole === 'assistant' || senderRole === 'super_admin';
  const updatedTickets = allTickets.map((t) => {
    if (t.id === ticketId) {
      return {
        ...t,
        status: isStaff && t.status === 'open' ? ('in_progress' as const) : t.status,
        updated_at: now,
        updatedAt: now,
      };
    }
    return t;
  });
  saveLocalTickets(updatedTickets);

  // 2. Global API sync
  try {
    const res = await fetch('/api/support/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticketId,
        senderId,
        senderRole,
        senderName,
        message,
        attachmentUrl,
      }),
    });

    if (res.ok) {
      const resData = await res.json();
      if (resData.success && resData.message) {
        return resData.message;
      }
    }
  } catch (apiErr) {
    console.warn('addTicketMessage API sync error:', apiErr);
  }

  return optimisticMsg;
}

/**
 * Update ticket status (Global API -> Supabase Admin)
 */
export async function updateTicketStatus(
  ticketId: string,
  status: 'open' | 'in_progress' | 'resolved' | 'closed',
  assignedToOrActor?: { id?: string; name?: string; role?: string } | { id: string; name: string } | null,
  actor?: { id?: string; name?: string; role?: string }
): Promise<SupportTicket | null> {
  const now = new Date().toISOString();
  let assignedTo: { id: string; name: string } | null = null;

  if (assignedToOrActor && 'id' in assignedToOrActor && 'name' in assignedToOrActor) {
    assignedTo = assignedToOrActor as { id: string; name: string };
  }

  // 1. Optimistic update
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

  // 2. Global API update
  try {
    const res = await fetch('/api/support/tickets', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticketId,
        status,
        assignedToAssistantId: assignedTo ? assignedTo.id : undefined,
      }),
    });

    if (res.ok) {
      const resData = await res.json();
      if (resData.success && resData.ticket) {
        return resData.ticket;
      }
    }
  } catch (apiErr) {
    console.warn('updateTicketStatus API sync error:', apiErr);
  }

  return updatedTicket;
}

/**
 * Assign ticket to assistant (Global API -> Supabase Admin)
 */
export async function assignTicketToAssistant(
  ticketId: string,
  assistantId: string,
  assistantName: string,
  actor?: { id?: string; name?: string; role?: string }
): Promise<SupportTicket | null> {
  const now = new Date().toISOString();

  // 1. Optimistic update
  const allTickets = getLocalTickets();
  let updatedTicket: SupportTicket | null = null;
  const updatedList = allTickets.map((t) => {
    if (t.id === ticketId) {
      updatedTicket = {
        ...t,
        assigned_to_assistant_id: assistantId,
        assignedToAssistantId: assistantId,
        assignedAssistantName: assistantName,
        assigned_assistant: { id: assistantId, full_name: assistantName },
        status: 'in_progress',
        updated_at: now,
        updatedAt: now,
      };
      return updatedTicket;
    }
    return t;
  });
  saveLocalTickets(updatedList);

  // 2. Global API sync
  try {
    const res = await fetch('/api/support/tickets', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticketId,
        status: 'in_progress',
        assignedToAssistantId: assistantId,
      }),
    });

    if (res.ok) {
      const resData = await res.json();
      if (resData.success && resData.ticket) {
        return resData.ticket;
      }
    }
  } catch (apiErr) {
    console.warn('assignTicketToAssistant API sync error:', apiErr);
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
    student_phone: data.studentPhone,
    course_title: data.courseTitle || data.course_title,
  });
}
