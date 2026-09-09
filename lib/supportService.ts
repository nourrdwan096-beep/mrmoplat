import { supabase } from './supabaseClient';
import { logAuditEvent } from './teacherService';

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderName: string;
  senderRole: 'student' | 'teacher' | 'assistant' | 'super_admin';
  message: string;
  createdAt: string;
}

export interface SupportTicketData {
  id: string;
  ticketNumber: number;
  studentId: string;
  studentName: string;
  studentPhone?: string;
  courseId?: string;
  courseTitle?: string;
  ticketType: 'technical' | 'academic';
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  assignedToAssistantId?: string;
  assignedAssistantName?: string;
  createdAt: string;
  updatedAt: string;
  messages?: TicketMessage[];
}

const LOCAL_TICKETS_KEY = 'mr_radwan_support_tickets';

function getLocal<T>(key: string, defaultVal: T): T {
  if (typeof window === 'undefined') return defaultVal;
  const stored = localStorage.getItem(key);
  if (!stored) {
    localStorage.setItem(key, JSON.stringify(defaultVal));
    return defaultVal;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return defaultVal;
  }
}

function setLocal<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err: any) {
    console.warn(`localStorage Quota Exceeded or Error for key ${key}:`, err);
    if (Array.isArray(data) && data.length > 5) {
      try {
        localStorage.setItem(key, JSON.stringify(data.slice(0, 5)));
        console.log(`Saved truncated version for key ${key}`);
      } catch (e) {
        console.error(`Truncation also failed for key ${key}`);
      }
    }
  }
}

export async function fetchSupportTickets(filters?: {
  studentId?: string;
  courseId?: string;
  assistantId?: string;
  assignedCourseIds?: string[];
  role?: string;
}): Promise<SupportTicketData[]> {
  try {
    let query = supabase
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.studentId) {
      query = query.eq('student_id', filters.studentId);
    }

    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      return data.map((t) => ({
        id: t.id,
        ticketNumber: t.ticket_number || 1001,
        studentId: t.student_id,
        studentName: t.student_name || 'طالب',
        studentPhone: t.student_phone,
        courseId: t.course_id,
        courseTitle: t.course_title,
        ticketType: t.ticket_type,
        subject: t.subject,
        description: t.description,
        status: t.status || 'open',
        priority: t.priority || 'normal',
        assignedToAssistantId: t.assigned_to_assistant_id,
        assignedAssistantName: t.assigned_assistant_name,
        createdAt: t.created_at,
        updatedAt: t.updated_at || t.created_at,
      }));
    }
  } catch (err) {
    console.warn('Supabase fetchSupportTickets fallback to local:', err);
  }

  let tickets = getLocal<SupportTicketData[]>(LOCAL_TICKETS_KEY, [
    {
      id: 't-101',
      ticketNumber: 1042,
      studentId: 'std-demo-1',
      studentName: 'محمود عبد الرازق',
      studentPhone: '01098765432',
      courseId: 'c1',
      courseTitle: 'كورس العمالقة - الثانوية العامة (الصف الثالث)',
      ticketType: 'academic',
      subject: 'استفسار عن قاعدة Past Perfect في الوحدة الثانية',
      description: 'يا مستر هل قاعدة Had + V3 بتستخدم دايماً مع Before ولا ممكن تيجي مع Until كمان؟',
      status: 'open',
      priority: 'high',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      updatedAt: new Date(Date.now() - 3600000).toISOString(),
      messages: [
        {
          id: 'm-1',
          ticketId: 't-101',
          senderId: 'std-demo-1',
          senderName: 'محمود عبد الرازق',
          senderRole: 'student',
          message: 'يا مستر هل قاعدة Had + V3 بتستخدم دايماً مع Before ولا ممكن تيجي مع Until كمان؟',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
      ],
    },
    {
      id: 't-102',
      ticketNumber: 1043,
      studentId: 'std-demo-2',
      studentName: 'نور الدين علي',
      studentPhone: '01123456789',
      courseId: 'c2',
      courseTitle: 'كورس التميز في اللغة الإنجليزية - 1 ثانوي',
      ticketType: 'technical',
      subject: 'الفيديو توقف عند الدقيقة 14',
      description: 'الفيديو رقم 2 في الوحدة الأولى توقف ولا يكتمل، هل المشكلة من سرعة النت عندي ولا السيرفر؟',
      status: 'in_progress',
      priority: 'normal',
      assignedToAssistantId: 'asst-1',
      assignedAssistantName: 'أحمد محمود',
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      updatedAt: new Date(Date.now() - 7200000).toISOString(),
      messages: [
        {
          id: 'm-2',
          ticketId: 't-102',
          senderId: 'std-demo-2',
          senderName: 'نور الدين علي',
          senderRole: 'student',
          message: 'الفيديو رقم 2 في الوحدة الأولى توقف ولا يكتمل، هل المشكلة من سرعة النت عندي ولا السيرفر؟',
          createdAt: new Date(Date.now() - 7200000).toISOString(),
        },
        {
          id: 'm-3',
          ticketId: 't-102',
          senderId: 'asst-1',
          senderName: 'أحمد محمود (مساعد)',
          senderRole: 'assistant',
          message: 'أهلاً بك يا نور، قمنا بفحص المشغل وهو يعمل بجودة ممتازة. جرب تقليل الجودة لـ 480p وتحديث الصفحة.',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
      ],
    },
  ]);

  if (filters?.studentId) {
    tickets = tickets.filter((t) => t.studentId === filters.studentId);
  }

  // Filter for Assistant Smart Dispatch:
  // If assistant has assignedCourseIds, show:
  // 1. Technical tickets
  // 2. Academic tickets only for their assigned courses (or assigned directly to them)
  if (filters?.role === 'assistant') {
    if (filters.assignedCourseIds && filters.assignedCourseIds.length > 0) {
      tickets = tickets.filter(
        (t) =>
          t.ticketType === 'technical' ||
          (t.courseId && filters.assignedCourseIds?.includes(t.courseId)) ||
          t.assignedToAssistantId === filters.assistantId
      );
    }
  }

  return tickets;
}

export async function createSupportTicket(payload: {
  studentId: string;
  studentName: string;
  studentPhone?: string;
  courseId?: string;
  courseTitle?: string;
  ticketType: 'technical' | 'academic';
  subject: string;
  description: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}): Promise<SupportTicketData> {
  const newId = crypto.randomUUID();
  const ticketNumber = Math.floor(1000 + Math.random() * 9000);

  const newTicket: SupportTicketData = {
    id: newId,
    ticketNumber,
    studentId: payload.studentId,
    studentName: payload.studentName,
    studentPhone: payload.studentPhone,
    courseId: payload.courseId,
    courseTitle: payload.courseTitle,
    ticketType: payload.ticketType,
    subject: payload.subject,
    description: payload.description,
    status: 'open',
    priority: payload.priority || 'normal',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [
      {
        id: crypto.randomUUID(),
        ticketId: newId,
        senderId: payload.studentId,
        senderName: payload.studentName,
        senderRole: 'student',
        message: payload.description,
        createdAt: new Date().toISOString(),
      },
    ],
  };

  try {
    await supabase.from('support_tickets').insert([
      {
        id: newId,
        ticket_number: ticketNumber,
        student_id: payload.studentId,
        course_id: payload.courseId,
        ticket_type: payload.ticketType,
        subject: payload.subject,
        description: payload.description,
        status: 'open',
        priority: payload.priority || 'normal',
      },
    ]);
  } catch (err) {
    console.warn('Supabase createSupportTicket error:', err);
  }

  const current = getLocal<SupportTicketData[]>(LOCAL_TICKETS_KEY, []);
  setLocal(LOCAL_TICKETS_KEY, [newTicket, ...current]);
  return newTicket;
}

export async function updateTicketStatus(
  ticketId: string,
  status: SupportTicketData['status'],
  assignedTo?: { id: string; name: string },
  actor?: { name: string; role: string; id?: string }
): Promise<void> {
  try {
    const updateObj: Record<string, any> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (assignedTo) {
      updateObj.assigned_to_assistant_id = assignedTo.id;
    }
    await supabase.from('support_tickets').update(updateObj).eq('id', ticketId);
  } catch (err) {
    console.warn('Supabase updateTicketStatus error:', err);
  }

  const current = getLocal<SupportTicketData[]>(LOCAL_TICKETS_KEY, []);
  setLocal(
    LOCAL_TICKETS_KEY,
    current.map((t) => {
      if (t.id === ticketId) {
        return {
          ...t,
          status,
          assignedToAssistantId: assignedTo ? assignedTo.id : t.assignedToAssistantId,
          assignedAssistantName: assignedTo ? assignedTo.name : t.assignedAssistantName,
          updatedAt: new Date().toISOString(),
        };
      }
      return t;
    })
  );

  if (actor) {
    await logAuditEvent({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      actionType: `UPDATE_TICKET_STATUS (${status})`,
      targetEntity: 'support_ticket',
      targetId: ticketId,
      details: { status, assignedTo: assignedTo?.name },
    });
  }
}

export async function addTicketMessage(
  ticketId: string,
  sender: { id: string; name: string; role: TicketMessage['senderRole'] },
  message: string
): Promise<TicketMessage> {
  const newMsg: TicketMessage = {
    id: crypto.randomUUID(),
    ticketId,
    senderId: sender.id,
    senderName: sender.name,
    senderRole: sender.role,
    message,
    createdAt: new Date().toISOString(),
  };

  try {
    await supabase.from('ticket_messages').insert([
      {
        id: newMsg.id,
        ticket_id: ticketId,
        sender_id: sender.id,
        sender_role: sender.role,
        message,
      },
    ]);
  } catch (err) {
    console.warn('Supabase addTicketMessage error:', err);
  }

  const current = getLocal<SupportTicketData[]>(LOCAL_TICKETS_KEY, []);
  setLocal(
    LOCAL_TICKETS_KEY,
    current.map((t) => {
      if (t.id === ticketId) {
        return {
          ...t,
          updatedAt: new Date().toISOString(),
          messages: [...(t.messages || []), newMsg],
        };
      }
      return t;
    })
  );

  return newMsg;
}

export type TicketData = SupportTicketData;


export async function fetchTicketMessages(ticketId: string): Promise<TicketMessage[]> {
  const tickets = await fetchSupportTickets();
  const ticket = tickets.find((t) => t.id === ticketId);
  return ticket?.messages || [];
}

export async function sendTicketMessage(
  ticketId: string,
  senderId: string,
  senderRole: TicketMessage['senderRole'],
  senderName: string,
  message: string
): Promise<TicketMessage> {
  return addTicketMessage(ticketId, { id: senderId, name: senderName, role: senderRole }, message);
}

export async function assignTicketToAssistant(
  ticketId: string,
  assistantId: string,
  assistantName: string,
  actor?: { name: string; role: string; id?: string }
): Promise<void> {
  const tickets = await fetchSupportTickets();
  const ticket = tickets.find((t) => t.id === ticketId);
  const status = ticket?.status || 'in_progress';
  await updateTicketStatus(ticketId, status, { id: assistantId, name: assistantName }, actor);
}

