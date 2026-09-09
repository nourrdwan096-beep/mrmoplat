import { supabase } from './supabaseClient';

export interface StudentMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'teacher' | 'assistant' | 'super_admin';
  recipientStudentId?: string | null; // null if broadcast
  recipientStudentName?: string | null;
  isBroadcast: boolean;
  title: string;
  content: string;
  isRead: boolean;
  whatsappReplyEnabled: boolean;
  createdAt: string;
  replyContent?: string;
  repliedAt?: string;
}

const STORAGE_KEY = 'mr_radwan_student_messages';

function getLocalMessages(): StudentMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Error reading local messages:', e);
    return [];
  }
}

function saveLocalMessages(messages: StudentMessage[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    window.dispatchEvent(new Event('storage'));
  } catch (e) {
    console.error('Error saving local messages:', e);
  }
}

/**
 * Fetch messages for a specific student (broadcasts + personal messages sent to them)
 */
export async function fetchMessagesForStudent(studentId: string): Promise<StudentMessage[]> {
  try {
    const local = getLocalMessages();
    const relevantLocal = local.filter(
      (m) => m.isBroadcast || m.recipientStudentId === studentId
    );

    if (supabase) {
      const { data, error } = await supabase
        .from('student_messages')
        .select('*')
        .or(`is_broadcast.eq.true,recipient_student_id.eq.${studentId}`)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        const mapped: StudentMessage[] = data.map((d: any) => ({
          id: d.id,
          senderId: d.sender_id,
          senderName: 'مستر محمد رضوان',
          senderRole: 'teacher',
          recipientStudentId: d.recipient_student_id,
          isBroadcast: d.is_broadcast,
          title: d.title,
          content: d.content,
          isRead: d.is_read || false,
          whatsappReplyEnabled: d.whatsapp_reply_enabled ?? true,
          createdAt: d.created_at,
          replyContent: d.reply_content,
          repliedAt: d.replied_at,
        }));

        // Merge unique
        const mapById = new Map<string, StudentMessage>();
        [...mapped, ...relevantLocal].forEach((m) => mapById.set(m.id, m));
        return Array.from(mapById.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
    }

    return relevantLocal.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (err) {
    console.error('Error in fetchMessagesForStudent:', err);
    return getLocalMessages().filter(
      (m) => m.isBroadcast || m.recipientStudentId === studentId
    );
  }
}

/**
 * Fetch all messages sent by the teacher (for Teacher Dashboard)
 */
export async function fetchAllTeacherMessages(): Promise<StudentMessage[]> {
  try {
    const local = getLocalMessages();

    if (supabase) {
      const { data, error } = await supabase
        .from('student_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        const mapped: StudentMessage[] = data.map((d: any) => ({
          id: d.id,
          senderId: d.sender_id,
          senderName: 'مستر محمد رضوان',
          senderRole: 'teacher',
          recipientStudentId: d.recipient_student_id,
          recipientStudentName: d.recipient_student_name,
          isBroadcast: d.is_broadcast,
          title: d.title,
          content: d.content,
          isRead: d.is_read || false,
          whatsappReplyEnabled: d.whatsapp_reply_enabled ?? true,
          createdAt: d.created_at,
          replyContent: d.reply_content,
          repliedAt: d.replied_at,
        }));

        const mapById = new Map<string, StudentMessage>();
        [...mapped, ...local].forEach((m) => mapById.set(m.id, m));
        return Array.from(mapById.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
    }

    return local.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (err) {
    console.error('Error in fetchAllTeacherMessages:', err);
    return getLocalMessages();
  }
}

/**
 * Send a message (broadcast or personal)
 */
export async function sendMessage(payload: {
  senderId: string;
  senderName: string;
  senderRole: 'teacher' | 'assistant' | 'super_admin';
  recipientStudentId?: string | null;
  recipientStudentName?: string | null;
  isBroadcast: boolean;
  title: string;
  content: string;
}): Promise<StudentMessage> {
  const newMsg: StudentMessage = {
    id: crypto.randomUUID(),
    senderId: payload.senderId,
    senderName: payload.senderName || 'مستر محمد رضوان',
    senderRole: payload.senderRole || 'teacher',
    recipientStudentId: payload.recipientStudentId || null,
    recipientStudentName: payload.recipientStudentName || null,
    isBroadcast: payload.isBroadcast,
    title: payload.title,
    content: payload.content,
    isRead: false,
    whatsappReplyEnabled: true,
    createdAt: new Date().toISOString(),
  };

  const local = getLocalMessages();
  local.unshift(newMsg);
  saveLocalMessages(local);

  if (supabase) {
    try {
      await supabase.from('student_messages').insert([
        {
          id: newMsg.id.startsWith('msg_') ? undefined : newMsg.id,
          sender_id: payload.senderId,
          recipient_student_id: payload.recipientStudentId || null,
          is_broadcast: payload.isBroadcast,
          title: payload.title,
          content: payload.content,
          is_read: false,
          whatsapp_reply_enabled: true,
        },
      ]);
    } catch (e) {
      console.warn('Supabase insert message failed, stored locally:', e);
    }
  }

  return newMsg;
}

/**
 * Mark a message as read
 */
export async function markMessageAsRead(messageId: string): Promise<void> {
  const local = getLocalMessages();
  const idx = local.findIndex((m) => m.id === messageId);
  if (idx !== -1) {
    local[idx].isRead = true;
    saveLocalMessages(local);
  }

  if (supabase) {
    try {
      await supabase
        .from('student_messages')
        .update({ is_read: true })
        .eq('id', messageId);
    } catch (e) {
      console.error(e);
    }
  }
}

/**
 * Student replies to a message
 */
export async function replyToMessage(
  messageId: string,
  replyText: string
): Promise<void> {
  const now = new Date().toISOString();
  const local = getLocalMessages();
  const idx = local.findIndex((m) => m.id === messageId);
  if (idx !== -1) {
    local[idx].replyContent = replyText;
    local[idx].repliedAt = now;
    saveLocalMessages(local);
  }

  if (supabase) {
    try {
      await supabase
        .from('student_messages')
        .update({ reply_content: replyText, replied_at: now })
        .eq('id', messageId);
    } catch (e) {
      console.warn('Supabase reply update failed, stored locally:', e);
    }
  }
}
