import { supabase } from './supabaseClient';
import { UserProfile } from '@/lib/types';
import { fetchAssistants } from './teacherService';

export type NotificationType =
  | 'new_course'
  | 'new_exam'
  | 'new_video'
  | 'support_reply'
  | 'support_ticket_new'
  | 'new_student_pending'
  | 'course_enrollment'
  | 'student_message';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  link: string;
  courseId?: string;
  ticketId?: string;
  itemId?: string;
  isRead: boolean;
  category: 'academic' | 'support' | 'admin' | 'course' | 'message';
  badgeLabel?: string;
}

const READ_STORAGE_PREFIX = 'mr_radwan_read_notifs_';
const DEVICE_NOTIF_PREFIX = 'mr_radwan_device_notifs_enabled_';

/**
 * Get IDs of notifications marked as read by this user
 */
export function getStoredReadIds(userId: string): Set<string> {
  if (typeof window === 'undefined' || !userId) return new Set();
  try {
    const raw = localStorage.getItem(READ_STORAGE_PREFIX + userId);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

/**
 * Mark a single notification as read
 */
export function markNotificationAsRead(userId: string, notifId: string): void {
  if (typeof window === 'undefined' || !userId) return;
  try {
    const readIds = getStoredReadIds(userId);
    readIds.add(notifId);
    // Keep max 500 read ids to avoid memory bloat
    const arr = Array.from(readIds).slice(-500);
    localStorage.setItem(READ_STORAGE_PREFIX + userId, JSON.stringify(arr));
    window.dispatchEvent(new CustomEvent('mr_radwan_notifications_updated'));
  } catch (e) {
    console.error('Error saving read notification:', e);
  }
}

/**
 * Mark all given notifications as read
 */
export function markAllNotificationsAsRead(userId: string, notifIds: string[]): void {
  if (typeof window === 'undefined' || !userId) return;
  try {
    const readIds = getStoredReadIds(userId);
    notifIds.forEach((id) => readIds.add(id));
    const arr = Array.from(readIds).slice(-500);
    localStorage.setItem(READ_STORAGE_PREFIX + userId, JSON.stringify(arr));
    window.dispatchEvent(new CustomEvent('mr_radwan_notifications_updated'));
  } catch (e) {
    console.error('Error saving read notifications:', e);
  }
}

/**
 * Check if browser supports Device Push / Web Notifications
 */
export function isDeviceNotificationSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'Notification' in window;
}

/**
 * Get device notification permission state
 */
export function getDeviceNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isDeviceNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Check if user has opted into device notifications
 */
export function isDeviceNotificationEnabled(userId: string): boolean {
  if (typeof window === 'undefined' || !userId) return false;
  try {
    return localStorage.getItem(DEVICE_NOTIF_PREFIX + userId) === 'true';
  } catch {
    return false;
  }
}

/**
 * Toggle or enable device notifications and request permission if needed
 */
export async function requestDeviceNotificationPermission(userId: string): Promise<boolean> {
  if (!isDeviceNotificationSupported()) return false;

  try {
    let perm = Notification.permission;
    if (perm !== 'granted') {
      perm = await Notification.requestPermission();
    }

    if (perm === 'granted') {
      localStorage.setItem(DEVICE_NOTIF_PREFIX + userId, 'true');
      playNotificationChime();
      sendNativeDeviceNotification(
        'منصة مستر محمد رضوان 🌟',
        'تم تفعيل إشعارات وتنبيهات المنصة بنجاح على هذا الجهاز! ستصلك أحدث المستجدات أولاً بأول.',
        '/'
      );
      return true;
    } else {
      localStorage.setItem(DEVICE_NOTIF_PREFIX + userId, 'false');
      return false;
    }
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return false;
  }
}

/**
 * Send native OS / device notification
 */
export function sendNativeDeviceNotification(title: string, body: string, url?: string): void {
  if (!isDeviceNotificationSupported() || Notification.permission !== 'granted') return;

  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([100, 60, 120]);
    }

    const n = new Notification(title, {
      body,
      icon: '/logo.png',
      badge: '/logo.png',
      dir: 'rtl',
      lang: 'ar',
      tag: 'mr_radwan_' + Date.now(),
    });

    if (url) {
      n.onclick = () => {
        window.focus();
        window.location.href = url;
        n.close();
      };
    }
  } catch (e) {
    console.warn('Native notification failed:', e);
  }
}

/**
 * Synthesizes a futuristic, subtle, pleasant chime sound
 */
export function playNotificationChime(): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // First tone (E5 - 659.25Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.32);

    // Second tone (B5 - 987.77Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(987.77, now + 0.1);
    gain2.gain.setValueAtTime(0.15, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.5);
  } catch {
    // AudioContext user gesture policy
  }
}

/**
 * Fetch and aggregate personalized notifications for any user (Student, Teacher, Assistant)
 */
export async function fetchUserNotifications(user: UserProfile): Promise<AppNotification[]> {
  if (!user || !user.id) return [];

  const readIds = getStoredReadIds(user.id);
  const notifs: AppNotification[] = [];

  try {
    const role = user.role;

    // ==========================================
    // 1. STUDENT NOTIFICATIONS
    // ==========================================
    if (role === 'student') {
      // 1.1 Find which courses the student is enrolled in
      let enrolledCourseIds: string[] = [];
      try {
        const { data: enrolls } = await supabase
          .from('course_enrollments')
          .select('course_id')
          .eq('student_id', user.id)
          .eq('is_active', true);

        if (enrolls && enrolls.length > 0) {
          enrolledCourseIds = enrolls.map((e: any) => e.course_id);
        }
      } catch (err) {
        console.warn('Failed to load enrollments:', err);
      }

      // 1.2 Fetch all published courses (Show new course announcement to everyone!)
      const courseMap: Record<string, string> = {};
      try {
        const { data: courses } = await supabase
          .from('courses')
          .select('id, title, created_at, is_published')
          .eq('is_published', true)
          .order('created_at', { ascending: false });

        if (courses && courses.length > 0) {
          courses.forEach((c: any) => {
            courseMap[c.id] = c.title;

            // Course creation notification
            const notifId = `notif_course_${c.id}`;
            const isEnrolled = enrolledCourseIds.includes(c.id);
            notifs.push({
              id: notifId,
              type: 'new_course',
              title: 'كورس جديد متاح الآن 🎓',
              message: isEnrolled
                ? `كورس "${c.title}" متاح في قائمة مقرراتك الدراسية.`
                : `تم إطلاق كورس جديد: "${c.title}". تصفح تفاصيل المنهج واشترك الآن!`,
              timestamp: c.created_at || new Date().toISOString(),
              link: `/student/courses`,
              courseId: c.id,
              isRead: readIds.has(notifId),
              category: 'course',
              badgeLabel: isEnrolled ? 'مشترك' : 'جديد',
            });
          });
        }
      } catch (err) {
        console.warn('Failed to load courses for student:', err);
      }

      // 1.3 EXAMS & VIDEOS - STRICT USER RULE:
      // ONLY show exams and videos for courses the student IS enrolled in!
      if (enrolledCourseIds.length > 0) {
        try {
          const { data: items } = await supabase
            .from('unit_items')
            .select('id, course_id, unit_id, title, item_type, created_at')
            .in('course_id', enrolledCourseIds)
            .order('created_at', { ascending: false })
            .limit(40);

          if (items && items.length > 0) {
            items.forEach((item: any) => {
              const courseTitle = courseMap[item.course_id] || 'المقرر الدراسي';

              if (item.item_type === 'exam' || item.item_type === 'homework') {
                const notifId = `notif_item_exam_${item.id}`;
                notifs.push({
                  id: notifId,
                  type: 'new_exam',
                  title: item.item_type === 'exam' ? 'امتحان جديد متاح للحل 📝' : 'واجب جديد مطلوب حله ✍️',
                  message: `تمت إضافة ${item.item_type === 'exam' ? 'امتحان جديد' : 'واجب جديد'}: "${item.title}" في (${courseTitle}). ادخل للاختبار وتقييم مستواك.`,
                  timestamp: item.created_at || new Date().toISOString(),
                  link: `/student/study/${item.course_id}?itemId=${item.id}`,
                  courseId: item.course_id,
                  itemId: item.id,
                  isRead: readIds.has(notifId),
                  category: 'academic',
                  badgeLabel: item.item_type === 'exam' ? 'امتحان' : 'واجب',
                });
              } else if (item.item_type === 'video') {
                const notifId = `notif_item_video_${item.id}`;
                notifs.push({
                  id: notifId,
                  type: 'new_video',
                  title: 'فيديو وشرح جديد متاح 🎬',
                  message: `تم رفع درس فيديو جديد: "${item.title}" في (${courseTitle}). تابع الشرح الآن.`,
                  timestamp: item.created_at || new Date().toISOString(),
                  link: `/watch/${item.course_id}/${item.id}`,
                  courseId: item.course_id,
                  itemId: item.id,
                  isRead: readIds.has(notifId),
                  category: 'academic',
                  badgeLabel: 'شرح',
                });
              }
            });
          }
        } catch (err) {
          console.warn('Failed to load enrolled course items:', err);
        }
      }

      // 1.4 Support Ticket Replies from Staff to Student
      try {
        const { data: tickets } = await supabase
          .from('support_tickets')
          .select('id, subject, status, created_at, updated_at')
          .eq('student_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(10);

        if (tickets && tickets.length > 0) {
          const ticketIds = tickets.map((t: any) => t.id);
          const { data: messages } = await supabase
            .from('ticket_messages')
            .select('id, ticket_id, sender_role, message, created_at')
            .in('ticket_id', ticketIds)
            .in('sender_role', ['teacher', 'assistant', 'super_admin'])
            .order('created_at', { ascending: false })
            .limit(20);

          if (messages && messages.length > 0) {
            messages.forEach((msg: any) => {
              const matchedTicket = tickets.find((t: any) => t.id === msg.ticket_id);
              const notifId = `notif_ticket_reply_${msg.id}`;
              const responder = msg.sender_role === 'teacher' || msg.sender_role === 'super_admin' ? 'مستر محمد رضوان' : 'فريق المساعدين';
              notifs.push({
                id: notifId,
                type: 'support_reply',
                title: 'رد جديد من الدعم 💬',
                message: `قام ${responder} بالرد على تذكرتك "${matchedTicket?.subject || 'طلب الدعم'}": "${msg.message.slice(0, 80)}"`,
                timestamp: msg.created_at || new Date().toISOString(),
                link: `/student/support?ticketId=${msg.ticket_id}`,
                ticketId: msg.ticket_id,
                isRead: readIds.has(notifId),
                category: 'support',
                badgeLabel: 'الدعم',
              });
            });
          }
        }
      } catch (err) {
        console.warn('Failed to load student ticket replies:', err);
      }

      // 1.5 Messages & Broadcasts from Teacher/Assistant
      try {
        const { data: msgs } = await supabase
          .from('student_messages')
          .select('id, title, content, is_broadcast, created_at')
          .or(`is_broadcast.eq.true,recipient_student_id.eq.${user.id}`)
          .order('created_at', { ascending: false })
          .limit(15);

        if (msgs && msgs.length > 0) {
          msgs.forEach((m: any) => {
            const notifId = `notif_msg_${m.id}`;
            notifs.push({
              id: notifId,
              type: 'student_message',
              title: m.is_broadcast ? 'تنبيه عام لجميع الطلاب 📢' : 'رسالة خاصة من الإدارة ✉️',
              message: `${m.title}: ${m.content.slice(0, 90)}...`,
              timestamp: m.created_at || new Date().toISOString(),
              link: `/student/messages`,
              isRead: readIds.has(notifId),
              category: 'message',
              badgeLabel: m.is_broadcast ? 'تنبيه عام' : 'رسالة خاصة',
            });
          });
        }
      } catch (err) {
        console.warn('Failed to load student messages:', err);
      }
    }

    // ==========================================
    // 2. TEACHER (SUPER ADMIN) NOTIFICATIONS
    // ==========================================
    else if (role === 'teacher' || role === 'super_admin') {
      // 2.1 New Support Tickets from Students
      try {
        const { data: tickets } = await supabase
          .from('support_tickets')
          .select('id, ticket_number, student_id, student_name, subject, description, ticket_type, status, created_at')
          .order('created_at', { ascending: false })
          .limit(20);

        if (tickets && tickets.length > 0) {
          tickets.forEach((ticket: any) => {
            const notifId = `notif_teacher_ticket_${ticket.id}`;
            const sType = ticket.ticket_type === 'academic' ? 'أكاديمي' : 'فني';
            notifs.push({
              id: notifId,
              type: 'support_ticket_new',
              title: `تذكرة دعم جديدة (${sType}) 🎫`,
              message: `استفسار جديد من الطالب (${ticket.student_name || 'طالب'}): "${ticket.subject}"`,
              timestamp: ticket.created_at || new Date().toISOString(),
              link: `/teacher/support?ticketId=${ticket.id}`,
              ticketId: ticket.id,
              isRead: readIds.has(notifId),
              category: 'support',
              badgeLabel: sType,
            });
          });
        }
      } catch (err) {
        console.warn('Failed to load tickets for teacher:', err);
      }

      // 2.2 Pending Student Review Requests
      try {
        const { data: pendings } = await supabase
          .from('profiles')
          .select('id, full_name, phone, grade, created_at')
          .eq('role', 'student')
          .eq('status', 'pending_review')
          .order('created_at', { ascending: false })
          .limit(20);

        if (pendings && pendings.length > 0) {
          pendings.forEach((p: any) => {
            const notifId = `notif_teacher_pending_${p.id}`;
            notifs.push({
              id: notifId,
              type: 'new_student_pending',
              title: 'طلب انضمام طالب جديد 👤',
              message: `سجل الطالب "${p.full_name}" (${p.phone || 'بدون هاتف'}) - الصف ${p.grade || 'غير محدد'} وبانتظار الاعتماد.`,
              timestamp: p.created_at || new Date().toISOString(),
              link: `/teacher/students`,
              isRead: readIds.has(notifId),
              category: 'admin',
              badgeLabel: 'قيد المراجعة',
            });
          });
        }
      } catch (err) {
        console.warn('Failed to load pending students for teacher:', err);
      }

      // 2.3 Course Enrollments
      try {
        const { data: enrolls } = await supabase
          .from('course_enrollments')
          .select('id, student_id, course_id, enrolled_at')
          .order('enrolled_at', { ascending: false })
          .limit(15);

        if (enrolls && enrolls.length > 0) {
          enrolls.forEach((e: any) => {
            const notifId = `notif_teacher_enroll_${e.id}`;
            notifs.push({
              id: notifId,
              type: 'course_enrollment',
              title: 'اشتراك جديد في كورس 🎓',
              message: `طالب قام بتفعيل والاشتراك في أحد الكورسات الدراسية بنجاح.`,
              timestamp: e.enrolled_at || new Date().toISOString(),
              link: `/teacher/courses`,
              courseId: e.course_id,
              isRead: readIds.has(notifId),
              category: 'course',
              badgeLabel: 'اشتراك',
            });
          });
        }
      } catch (err) {
        console.warn('Failed to load enrollments for teacher:', err);
      }
    }

    // ==========================================
    // 3. ASSISTANT NOTIFICATIONS
    // ==========================================
    else if (role === 'assistant') {
      let assistantPermissions: any = null;
      try {
        const allAssistants = await fetchAssistants();
        const found = allAssistants.find((a) => a.id === user.id || a.email === user.email);
        assistantPermissions = found?.permissions || null;
      } catch (err) {
        console.warn('Failed to fetch assistant data:', err);
      }

      // 3.1 Support Tickets tailored to Assistant
      const canHandleSupport =
        !assistantPermissions ||
        assistantPermissions.canHandleAcademicSupport ||
        assistantPermissions.canHandleTechnicalSupport;

      if (canHandleSupport) {
        try {
          const { data: tickets } = await supabase
            .from('support_tickets')
            .select('id, ticket_number, student_id, student_name, subject, description, ticket_type, status, created_at')
            .order('created_at', { ascending: false })
            .limit(20);

          if (tickets && tickets.length > 0) {
            tickets.forEach((ticket: any) => {
              // Filter by academic/technical permissions if restricted
              if (assistantPermissions) {
                if (ticket.ticket_type === 'academic' && !assistantPermissions.canHandleAcademicSupport) {
                  return;
                }
                if (ticket.ticket_type === 'technical' && !assistantPermissions.canHandleTechnicalSupport) {
                  return;
                }
              }

              const notifId = `notif_asst_ticket_${ticket.id}`;
              const sType = ticket.ticket_type === 'academic' ? 'أكاديمي' : 'فني';
              notifs.push({
                id: notifId,
                type: 'support_ticket_new',
                title: `تذكرة دعم موجهة لك (${sType}) 🎫`,
                message: `استفسار جديد من الطالب (${ticket.student_name || 'طالب'}): "${ticket.subject}"`,
                timestamp: ticket.created_at || new Date().toISOString(),
                link: `/assistant/support?ticketId=${ticket.id}`,
                ticketId: ticket.id,
                isRead: readIds.has(notifId),
                category: 'support',
                badgeLabel: sType,
              });
            });
          }
        } catch (err) {
          console.warn('Failed to load tickets for assistant:', err);
        }
      }

      // 3.2 Pending Students (If assistant has student management permission)
      if (assistantPermissions?.canManageStudents) {
        try {
          const { data: pendings } = await supabase
            .from('profiles')
            .select('id, full_name, phone, grade, created_at')
            .eq('role', 'student')
            .eq('status', 'pending_review')
            .order('created_at', { ascending: false })
            .limit(15);

          if (pendings && pendings.length > 0) {
            pendings.forEach((p: any) => {
              const notifId = `notif_asst_pending_${p.id}`;
              notifs.push({
                id: notifId,
                type: 'new_student_pending',
                title: 'طلب انضمام طالب بانتظار المراجعة 👤',
                message: `سجل الطالب "${p.full_name}" (${p.phone || ''}) وبانتظار الاعتماد.`,
                timestamp: p.created_at || new Date().toISOString(),
                link: `/assistant/students`,
                isRead: readIds.has(notifId),
                category: 'admin',
                badgeLabel: 'مراجعة',
              });
            });
          }
        } catch (err) {
          console.warn('Failed to load pending students for assistant:', err);
        }
      }
    }

    // Sort all notifications newest first
    return notifs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (globalErr) {
    console.error('Error in fetchUserNotifications:', globalErr);
    return [];
  }
}
