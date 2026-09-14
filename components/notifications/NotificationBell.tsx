'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell,
  CheckCheck,
  Smartphone,
  Sparkles,
  BookOpen,
  Headphones,
  Video,
  FileCheck2,
  Mail,
  UserPlus,
  X,
  Volume2,
  CheckCircle2,
  ExternalLink,
  ChevronLeft
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  AppNotification,
  fetchUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  requestDeviceNotificationPermission,
  isDeviceNotificationSupported,
  isDeviceNotificationEnabled,
  getDeviceNotificationPermission,
  sendNativeDeviceNotification,
  playNotificationChime,
} from '@/lib/notificationsService';

function formatRelativeTime(dateString: string): string {
  try {
    const diff = (Date.now() - new Date(dateString).getTime()) / 1000;
    if (diff < 60) return 'الآن';
    if (diff < 3600) {
      const mins = Math.floor(diff / 60);
      return `منذ ${mins} ${mins === 1 ? 'دقيقة' : mins === 2 ? 'دقيقتين' : 'دقائق'}`;
    }
    if (diff < 86400) {
      const hrs = Math.floor(diff / 3600);
      return `منذ ${hrs} ${hrs === 1 ? 'ساعة' : hrs === 2 ? 'ساعتين' : 'ساعات'}`;
    }
    const days = Math.floor(diff / 86400);
    if (days === 1) return 'أمس';
    if (days < 7) return `منذ ${days} أيام`;
    return new Date(dateString).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

function getNotificationIcon(type: AppNotification['type']) {
  switch (type) {
    case 'new_exam':
      return {
        icon: FileCheck2,
        bg: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400',
        border: 'border-amber-200 dark:border-amber-800/60',
      };
    case 'new_video':
      return {
        icon: Video,
        bg: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400',
        border: 'border-blue-200 dark:border-blue-800/60',
      };
    case 'support_reply':
    case 'support_ticket_new':
      return {
        icon: Headphones,
        bg: 'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400',
        border: 'border-violet-200 dark:border-violet-800/60',
      };
    case 'new_course':
    case 'course_enrollment':
      return {
        icon: BookOpen,
        bg: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400',
        border: 'border-emerald-200 dark:border-emerald-800/60',
      };
    case 'new_student_pending':
      return {
        icon: UserPlus,
        bg: 'bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400',
        border: 'border-teal-200 dark:border-teal-800/60',
      };
    case 'student_message':
    default:
      return {
        icon: Mail,
        bg: 'bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400',
        border: 'border-rose-200 dark:border-rose-800/60',
      };
  }
}

export default function NotificationBell() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [devicePermission, setDevicePermission] = useState<NotificationPermission | 'unsupported'>('unsupported');
  const [deviceEnabled, setDeviceEnabled] = useState(false);
  const [isActivatingDevice, setIsActivatingDevice] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Check device notification support & permission
  useEffect(() => {
    if (typeof window !== 'undefined' && currentUser?.id) {
      setDevicePermission(getDeviceNotificationPermission());
      setDeviceEnabled(isDeviceNotificationEnabled(currentUser.id));
    }
  }, [currentUser?.id]);

  // Load Notifications
  const loadNotifications = useCallback(async (silent = false) => {
    if (!currentUser) return;
    if (!silent) setLoading(true);
    try {
      const data = await fetchUserNotifications(currentUser);
      setNotifications(data);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadNotifications();

    // Listen to custom local storage sync updates
    const handleUpdate = () => loadNotifications(true);
    window.addEventListener('mr_radwan_notifications_updated', handleUpdate);
    window.addEventListener('mr_radwan_support_updated', handleUpdate);
    window.addEventListener('focus', handleUpdate);

    // Periodic poll every 10 seconds for live global notifications
    const interval = setInterval(() => {
      loadNotifications(true);
    }, 10000);

    return () => {
      window.removeEventListener('mr_radwan_notifications_updated', handleUpdate);
      window.removeEventListener('mr_radwan_support_updated', handleUpdate);
      window.removeEventListener('focus', handleUpdate);
      clearInterval(interval);
    };
  }, [loadNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
    if (!isOpen) {
      loadNotifications(true);
    }
  };

  const handleMarkAllAsRead = () => {
    if (!currentUser?.id) return;
    const allIds = notifications.map((n) => n.id);
    markAllNotificationsAsRead(currentUser.id, allIds);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setToastMessage('تم تحديد جميع الإشعارات كمقروءة ✨');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleNotificationClick = (notif: AppNotification) => {
    if (currentUser?.id && !notif.isRead) {
      markNotificationAsRead(currentUser.id, notif.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
      );
    }
    setIsOpen(false);
    if (notif.link) {
      router.push(notif.link);
    }
  };

  const handleEnableDeviceNotifications = async () => {
    if (!currentUser?.id) return;
    setIsActivatingDevice(true);
    try {
      const granted = await requestDeviceNotificationPermission(currentUser.id);
      setDevicePermission(getDeviceNotificationPermission());
      setDeviceEnabled(granted);
      if (granted) {
        setToastMessage('تم تفعيل إشعارات جهازك بنجاح! 🔔');
      } else {
        setToastMessage('يرجى السماح بالإشعارات من إعدادات المتصفح');
      }
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setIsActivatingDevice(false);
    }
  };

  const filteredNotifications = notifications.filter((n) =>
    activeTab === 'unread' ? !n.isRead : true
  );

  return (
    <div className="relative font-sans" ref={containerRef} dir="rtl">
      {/* Bell Trigger Button */}
      <button
        onClick={handleToggle}
        id="notification-bell-btn"
        aria-label="الإشعارات"
        className="relative p-2.5 sm:p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-300 dark:hover:border-emerald-600/50 shadow-sm transition-all duration-200 group flex items-center justify-center cursor-pointer"
        title="الإشعارات والتنبيهات"
      >
        <Bell className="w-5 h-5 transition-transform duration-200 group-hover:rotate-12 group-hover:scale-110" />

        {/* Dynamic Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white shadow-md shadow-rose-500/30 ring-2 ring-white dark:ring-slate-950 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Flyout / Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="fixed inset-x-3 top-20 sm:top-auto sm:inset-x-auto sm:absolute sm:left-0 sm:right-auto md:left-auto md:right-0 sm:mt-3 w-auto sm:w-[420px] max-w-[96vw] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl border border-slate-200/90 dark:border-slate-800/90 shadow-2xl z-50 overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[620px]"
          >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      الإشعارات والتنبيهات
                      {unreadCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-black">
                          {unreadCount} غير مقروء
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-semibold">
                      أحدث المستجدات الخاصة بك أولاً بأول
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="p-1.5 text-xs font-bold text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-1"
                      title="تحديد الكل كمقروء وتصفير العداد"
                    >
                      <CheckCheck className="w-4 h-4" />
                      <span className="hidden sm:inline text-[11px]">تحديد الكل كمقروء</span>
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Device Notification Activation Banner */}
              {isDeviceNotificationSupported() && (
                <div className="p-3 rounded-2xl bg-gradient-to-l from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200/70 dark:border-emerald-800/50 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-black text-slate-800 dark:text-slate-200 truncate">
                        إشعارات الجهاز (موبايل / لابتوب)
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {devicePermission === 'granted'
                          ? 'الإشعارات مفعلة على جهازك بنجاح ✓'
                          : 'استقبل تنبيهات الامتحانات والدروس فوراً'}
                      </p>
                    </div>
                  </div>

                  {devicePermission !== 'granted' ? (
                    <button
                      onClick={handleEnableDeviceNotifications}
                      disabled={isActivatingDevice}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black shadow-sm shrink-0 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {isActivatingDevice ? 'جاري التفعيل...' : 'تفعيل الإشعارات 🔔'}
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        playNotificationChime();
                        sendNativeDeviceNotification(
                          'منصة مستر محمد رضوان',
                          'تم اختبار إشعار الجهاز بنجاح! أنت متصل وتصلك أحدث المستجدات فوراً.',
                          '/'
                        );
                      }}
                      className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-[10px] font-black shrink-0 hover:bg-emerald-200 transition-colors"
                      title="إرسال إشعار تجريبي للجهاز"
                    >
                      تجربة الإشعار 🔔
                    </button>
                  )}
                </div>
              )}

              {/* Filter Tabs */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`flex-1 py-1.5 text-xs font-black rounded-xl transition-all ${
                    activeTab === 'all'
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  الكل ({notifications.length})
                </button>
                <button
                  onClick={() => setActiveTab('unread')}
                  className={`flex-1 py-1.5 text-xs font-black rounded-xl transition-all ${
                    activeTab === 'unread'
                      ? 'bg-rose-500 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  غير المقروءة ({unreadCount})
                </button>
              </div>
            </div>

            {/* Toast Feedback */}
            {toastMessage && (
              <div className="px-4 py-2 bg-emerald-500 text-white text-xs font-bold text-center animate-fade-in flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{toastMessage}</span>
              </div>
            )}

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5">
              {loading ? (
                <div className="py-12 text-center space-y-2">
                  <div className="w-7 h-7 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-slate-400 font-bold">جاري تحميل الإشعارات...</p>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="py-12 text-center space-y-3 px-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 flex items-center justify-center mx-auto text-xl font-bold">
                    <Sparkles className="w-7 h-7 text-emerald-500" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-800 dark:text-slate-200">
                      {activeTab === 'unread' ? 'لا توجد إشعارات غير مقروءة' : 'لا توجد إشعارات جديدة حالياً'}
                    </h4>
                    <p className="text-xs text-slate-400 font-semibold mt-1">
                      أنت على اطلاع بكل جديد في المنصة ومتابعة مستمرة!
                    </p>
                  </div>
                </div>
              ) : (
                filteredNotifications.map((notif) => {
                  const iconConfig = getNotificationIcon(notif.type);
                  const IconComp = iconConfig.icon;

                  return (
                    <motion.div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className={`
                        group relative p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer flex items-start gap-3
                        ${
                          !notif.isRead
                            ? 'bg-slate-50 dark:bg-slate-800/70 border-emerald-300/80 dark:border-emerald-600/40 shadow-sm'
                            : 'bg-white dark:bg-slate-900/50 border-slate-100 dark:border-slate-800/60 opacity-80 hover:opacity-100'
                        }
                      `}
                    >
                      {/* Unread indicator dot */}
                      {!notif.isRead && (
                        <span className="absolute top-3.5 left-3.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
                      )}

                      {/* Icon */}
                      <div
                        className={`w-10 h-10 rounded-2xl ${iconConfig.bg} border ${iconConfig.border} flex items-center justify-center shrink-0 mt-0.5 shadow-sm`}
                      >
                        <IconComp className="w-5 h-5" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pr-1">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h4
                            className={`text-xs font-black truncate max-w-[210px] sm:max-w-[240px] ${
                              !notif.isRead
                                ? 'text-slate-900 dark:text-white'
                                : 'text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {notif.title}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-bold shrink-0">
                            {formatRelativeTime(notif.timestamp)}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold line-clamp-2 leading-relaxed">
                          {notif.message}
                        </p>

                        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/50">
                          {notif.badgeLabel && (
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {notif.badgeLabel}
                            </span>
                          )}
                          <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 group-hover:translate-x-[-2px] transition-transform flex items-center gap-0.5 mr-auto">
                            عرض التفاصيل
                            <ChevronLeft className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 text-center">
              <span className="text-[10px] text-slate-400 font-bold">
                منصة مستر محمد رضوان التعليمية • تحديث فوري
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
