import { supabase } from './supabaseClient';
import { UserProfile } from '@/lib/types';
import { fetchAssistants } from './teacherService';

export type NotificationType =
  | 'new_course'
  | 'new_exam'
  | 'new_video'
  | 'new_material'
  | 'announcement'
  | 'support_reply'
  | 'support_ticket_new'
  | 'new_student_pending'
  | 'course_enrollment'
  | 'exam_submission'
  | 'security_alert'
  | 'student_message';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  fullMessage?: string;
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
const PROMPT_ANSWERED_PREFIX = 'mr_radwan_notif_prompt_answered_';
const SEEN_NOTIF_PREFIX = 'mr_radwan_seen_notifs_';

// Register Service Worker for cross-device web notifications (Android, iOS Safari, Desktop)
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        // Service worker active
      })
      .catch((err) => {
        console.warn('SW registration info:', err);
      });
  });
}

/**
 * Check if user has already answered the one-time notification prompt
 */
export function hasAnsweredNotificationPrompt(userId: string): boolean {
  if (typeof window === 'undefined' || !userId) return true;
  try {
    return localStorage.getItem(PROMPT_ANSWERED_PREFIX + userId) === 'true';
  } catch {
    return false;
  }
}

/**
 * Mark notification prompt as answered (asked ONCE per user)
 */
export function setNotificationPromptAnswered(userId: string): void {
  if (typeof window === 'undefined' || !userId) return;
  try {
    localStorage.setItem(PROMPT_ANSWERED_PREFIX + userId, 'true');
  } catch {}
}

/**
 * Explicitly set device notifications enabled or disabled
 */
export function setDeviceNotificationEnabled(userId: string, enabled: boolean): void {
  if (typeof window === 'undefined' || !userId) return;
  try {
    localStorage.setItem(DEVICE_NOTIF_PREFIX + userId, enabled ? 'true' : 'false');
    window.dispatchEvent(new CustomEvent('mr_radwan_notifications_updated'));
  } catch {}
}

/**
 * Get IDs of notifications marked as read by this user locally
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
 * Merge and store read IDs in local storage
 */
export function storeReadIdsLocally(userId: string, ids: string[]): void {
  if (typeof window === 'undefined' || !userId) return;
  try {
    const current = getStoredReadIds(userId);
    ids.forEach((id) => current.add(id));
    const arr = Array.from(current).slice(-800);
    localStorage.setItem(READ_STORAGE_PREFIX + userId, JSON.stringify(arr));
  } catch (err) {
    console.error('Error saving local read IDs:', err);
  }
}

/**
 * Mark a single notification as read globally across all devices
 */
export async function markNotificationAsRead(userId: string, notifId: string): Promise<void> {
  if (!userId || !notifId) return;

  // 1. Immediate optimistic update in local storage for 0ms UI reaction
  if (typeof window !== 'undefined') {
    storeReadIdsLocally(userId, [notifId]);
    window.dispatchEvent(new CustomEvent('mr_radwan_notifications_updated'));
  }

  // 2. Global server-side persistence in database
  try {
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'mark_read',
        userId,
        notifId,
      }),
    });
  } catch (err) {
    console.warn('Failed to sync notification read status with server:', err);
  }
}

/**
 * Mark all given notifications as read globally across all devices
 */
export async function markAllNotificationsAsRead(userId: string, notifIds: string[]): Promise<void> {
  if (!userId || !notifIds || notifIds.length === 0) return;

  // 1. Immediate optimistic update in local storage
  if (typeof window !== 'undefined') {
    storeReadIdsLocally(userId, notifIds);
    window.dispatchEvent(new CustomEvent('mr_radwan_notifications_updated'));
  }

  // 2. Global server-side persistence in database
  try {
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'mark_all_read',
        userId,
        notifIds,
      }),
    });
  } catch (err) {
    console.warn('Failed to sync all notifications read status with server:', err);
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
    const rawVal = localStorage.getItem(DEVICE_NOTIF_PREFIX + userId);
    if (rawVal === 'false') return false;
    if (rawVal === 'true' && isDeviceNotificationSupported() && Notification.permission === 'granted') {
      return true;
    }
    // If not set yet, but user already granted permission to the domain
    if (rawVal === null && isDeviceNotificationSupported() && Notification.permission === 'granted') {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Toggle or enable device notifications and request browser permission
 * Also permanently records that user has answered the prompt
 */
export async function requestDeviceNotificationPermission(userId: string): Promise<boolean> {
  if (!isDeviceNotificationSupported()) return false;

  // Mark that user has answered the one-time prompt
  setNotificationPromptAnswered(userId);

  try {
    let perm = Notification.permission;
    if (perm !== 'granted') {
      perm = await Notification.requestPermission();
    }

    if (perm === 'granted') {
      localStorage.setItem(DEVICE_NOTIF_PREFIX + userId, 'true');
      playNotificationChime();
      await sendNativeDeviceNotification(
        'منصة مستر محمد رضوان 🌟',
        'تم تفعيل إشعارات وتنبيهات المنصة بنجاح على هذا الجهاز! ستصلك التنبيهات الفورية بانتظام.',
        '/'
      );
      window.dispatchEvent(new CustomEvent('mr_radwan_notifications_updated'));
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
 * Send native OS / device notification with full Mobile & Desktop Service Worker support
 */
export async function sendNativeDeviceNotification(
  title: string, 
  body: string, 
  url?: string,
  tag?: string
): Promise<void> {
  if (!isDeviceNotificationSupported() || Notification.permission !== 'granted') return;

  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([160, 80, 160]);
      } catch {}
    }

    const options: any = {
      body,
      icon: '/logo.png',
      badge: '/logo.png',
      dir: 'rtl',
      lang: 'ar',
      tag: tag || 'mr_radwan_' + Date.now(),
      renotify: true,
      data: {
        url: url || '/',
        timestamp: Date.now()
      }
    };

    // 1. Mobile (Android/Chrome/Edge/Samsung) and Modern Browsers: Try Service Worker registration
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const reg = await Promise.race([
          navigator.serviceWorker.getRegistration().then(r => r || navigator.serviceWorker.ready),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 1200))
        ]);
        if (reg && typeof reg.showNotification === 'function') {
          await reg.showNotification(title, options);
          return;
        }
      } catch (swErr) {
        console.warn('SW notification fallback to Notification API:', swErr);
      }
    }

    // 2. Desktop Browser Fallback (Windows, macOS, Linux, Chrome/Safari/Firefox)
    try {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        const n = new Notification(title, options);
        if (url) {
          n.onclick = () => {
            window.focus();
            window.location.href = url;
            n.close();
          };
        }
      }
    } catch (nErr) {
      console.warn('Desktop Notification constructor error:', nErr);
    }
  } catch (e) {
    console.warn('Native notification failed:', e);
  }
}

/**
 * Automatically inspects fetched notifications and sends native device alerts
 * for any newly arrived unread notifications if enabled.
 * Accurately seeds existing notifications on first load to prevent noise.
 */
export function dispatchNewNotificationsToDevice(userId: string, notifs: AppNotification[]): void {
  if (typeof window === 'undefined' || !userId || !notifs || notifs.length === 0) return;

  try {
    const isEnabled = isDeviceNotificationEnabled(userId);
    const seenRaw = localStorage.getItem(SEEN_NOTIF_PREFIX + userId);
    
    // First run on this browser session: seed existing notifications without spamming
    if (seenRaw === null) {
      const initialSeen = notifs.map(n => n.id);
      localStorage.setItem(SEEN_NOTIF_PREFIX + userId, JSON.stringify(initialSeen.slice(-800)));
      return;
    }

    let seenSet = new Set<string>();
    try {
      seenSet = new Set(JSON.parse(seenRaw));
    } catch {}

    const unreadNewList = notifs.filter((n) => !n.isRead && !seenSet.has(n.id));

    // Update seen set with all current notifications
    notifs.forEach((n) => seenSet.add(n.id));
    const trimmedSeen = Array.from(seenSet).slice(-800);
    localStorage.setItem(SEEN_NOTIF_PREFIX + userId, JSON.stringify(trimmedSeen));

    // If notifications enabled and brand new unread notifications arrived
    if (isEnabled && unreadNewList.length > 0) {
      // Play pleasant futuristic audio chime once for the new batch
      playNotificationChime();

      // Send native alert for up to 2 newest items to be informative without spamming the OS tray
      const latestToNotify = unreadNewList.slice(0, 2);
      latestToNotify.forEach((notif) => {
        sendNativeDeviceNotification(notif.title, notif.message, notif.link, notif.id);
      });
    }
  } catch (err) {
    console.warn('Error in dispatchNewNotificationsToDevice:', err);
  }
}

/**
 * Synthesizes a futuristic, pleasant chime sound using Web Audio API
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
 * Fetch and aggregate global real-time notifications for any user (Student, Teacher, Assistant)
 */
export async function fetchUserNotifications(user: UserProfile): Promise<AppNotification[]> {
  if (!user || !user.id) return [];

  const localReadIds = getStoredReadIds(user.id);

  // 1. Primary Global Source: Server API with Database Read Tracking
  try {
    const params = new URLSearchParams({
      userId: user.id,
      role: user.role,
      stage: user.stage || '',
      grade: String(user.grade || ''),
    });

    const res = await fetch(`/api/notifications?${params.toString()}`, {
      cache: 'no-store',
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.notifications)) {
        // Sync database readIds to local storage cache
        if (Array.isArray(data.readIds) && data.readIds.length > 0) {
          storeReadIdsLocally(user.id, data.readIds);
        }

        const serverReadIdsSet = new Set(data.readIds || []);

        return data.notifications.map((n: AppNotification) => ({
          ...n,
          fullMessage: n.fullMessage || n.message,
          // If marked read either in DB or locally, mark as read
          isRead: Boolean(n.isRead || serverReadIdsSet.has(n.id) || localReadIds.has(n.id)),
        }));
      }
    }
  } catch (apiErr) {
    console.warn('API /api/notifications failed, falling back to client queries:', apiErr);
  }

  // 2. Fallback Direct Supabase Client Aggregator
  const notifs: AppNotification[] = [];

  try {
    const role = user.role;

    if (role === 'student') {
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
          });
        }
      } catch (err) {
        console.warn('Failed to load courses:', err);
      }

      if (enrolledCourseIds.length > 0) {
        try {
          const { data: items } = await supabase
            .from('unit_items')
            .select('id, course_id, unit_id, title, item_type, description, created_at')
            .in('course_id', enrolledCourseIds)
            .order('created_at', { ascending: false })
            .limit(30);

          if (items && items.length > 0) {
            items.forEach((item: any) => {
              const courseTitle = courseMap[item.course_id] || 'المقرر الدراسي';
              if (item.item_type === 'exam' || item.item_type === 'homework') {
                const notifId = `notif_item_exam_${item.id}`;
                const isExam = item.item_type === 'exam';
                notifs.push({
                  id: notifId,
                  type: 'new_exam',
                  title: isExam ? 'امتحان جديد متاح للحل 📝' : 'واجب جديد مطلوب حله 📚',
                  message: `تمت إضافة ${isExam ? 'امتحان جديد' : 'واجب جديد'}: "${item.title}" في (${courseTitle}).`,
                  fullMessage: `تمت إضافة ${isExam ? 'امتحان جديد' : 'واجب جديد'}: "${item.title}" في (${courseTitle}).\n${item.description ? '\nملاحظات: ' + item.description : ''}\n\nادخل الآن للحل في الوقت المحدد.`,
                  timestamp: item.created_at || new Date().toISOString(),
                  link: `/student/study/${item.course_id}?itemId=${item.id}`,
                  courseId: item.course_id,
                  itemId: item.id,
                  isRead: localReadIds.has(notifId),
                  category: 'academic',
                  badgeLabel: isExam ? 'امتحان' : 'واجب',
                });
              } else if (item.item_type === 'video') {
                const notifId = `notif_item_video_${item.id}`;
                notifs.push({
                  id: notifId,
                  type: 'new_video',
                  title: 'فيديو وشرح جديد متاح 🎬',
                  message: `تم رفع درس فيديو جديد: "${item.title}" في (${courseTitle}).`,
                  fullMessage: `تم رفع درس فيديو جديد: "${item.title}" في (${courseTitle}).\n${item.description ? '\nالتفاصيل: ' + item.description : ''}\n\nتابع الشرح الآن.`,
                  timestamp: item.created_at || new Date().toISOString(),
                  link: `/watch/${item.course_id}/${item.id}`,
                  courseId: item.course_id,
                  itemId: item.id,
                  isRead: localReadIds.has(notifId),
                  category: 'academic',
                  badgeLabel: 'شرح',
                });
              } else if (item.item_type === 'concept_sheet' || item.item_type === 'summary_pdf') {
                const notifId = `notif_item_mat_${item.id}`;
                notifs.push({
                  id: notifId,
                  type: 'new_material',
                  title: 'ملخص ومذكرة جديدة متاحة 📄',
                  message: `تمت إضافة مذكرة جديدة: "${item.title}" في (${courseTitle}).`,
                  fullMessage: `تمت إضافة ملف ومذكرة جديدة بعنوان: "${item.title}" في مقرر (${courseTitle}).\n\nقم بتحميلها لمتابعة المذاكرة.`,
                  timestamp: item.created_at || new Date().toISOString(),
                  link: `/student/study/${item.course_id}?itemId=${item.id}`,
                  courseId: item.course_id,
                  itemId: item.id,
                  isRead: localReadIds.has(notifId),
                  category: 'academic',
                  badgeLabel: 'مذكرة وملخص',
                });
              }
            });
          }
        } catch (err) {
          console.warn('Failed to load course items:', err);
        }
      }
    }

    return notifs.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  } catch (err) {
    console.error('Error aggregating notifications:', err);
    return notifs;
  }
}
