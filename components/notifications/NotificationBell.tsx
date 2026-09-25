'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  ChevronLeft,
  ZoomIn,
  ZoomOut,
  Copy,
  Maximize2,
  Search,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertTriangle,
  Award
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
  dispatchNewNotificationsToDevice,
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
    return new Date(dateString).toLocaleDateString('ar-EG', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function getNotificationIcon(type: AppNotification['type']) {
  switch (type) {
    case 'new_exam':
      return {
        icon: FileCheck2,
        bg: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400',
        border: 'border-indigo-200 dark:border-indigo-800',
      };
    case 'new_video':
      return {
        icon: Video,
        bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400',
        border: 'border-emerald-200 dark:border-emerald-800',
      };
    case 'new_material':
      return {
        icon: Sparkles,
        bg: 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400',
        border: 'border-cyan-200 dark:border-cyan-800',
      };
    case 'announcement':
      return {
        icon: Sparkles,
        bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400',
        border: 'border-amber-200 dark:border-amber-800',
      };
    case 'support_reply':
    case 'support_ticket_new':
      return {
        icon: Headphones,
        bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400',
        border: 'border-amber-200 dark:border-amber-800',
      };
    case 'new_student_pending':
      return {
        icon: UserPlus,
        bg: 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400',
        border: 'border-purple-200 dark:border-purple-800',
      };
    case 'exam_submission':
      return {
        icon: Award,
        bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400',
        border: 'border-emerald-200 dark:border-emerald-800',
      };
    case 'security_alert':
      return {
        icon: AlertTriangle,
        bg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400',
        border: 'border-rose-200 dark:border-rose-800',
      };
    case 'student_message':
      return {
        icon: Mail,
        bg: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400',
        border: 'border-blue-200 dark:border-blue-800',
      };
    case 'course_enrollment':
    case 'new_course':
    default:
      return {
        icon: BookOpen,
        bg: 'bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400',
        border: 'border-teal-200 dark:border-teal-800',
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
  const [searchQuery, setSearchQuery] = useState('');
  const [isActivatingDevice, setIsActivatingDevice] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Full Screen / Dedicated Message Modal state
  const [selectedNotifForModal, setSelectedNotifForModal] = useState<AppNotification | null>(null);
  const [modalFontSize, setModalFontSize] = useState<'normal' | 'large' | 'xlarge'>('normal');
  const [copiedText, setCopiedText] = useState(false);

  const [devicePermission, setDevicePermission] = useState<NotificationPermission | 'unsupported'>('default');

  const bellButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
    if (isDeviceNotificationSupported()) {
      setDevicePermission(getDeviceNotificationPermission());
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const list = await fetchUserNotifications(currentUser);
      setNotifications(list);
      dispatchNewNotificationsToDevice(currentUser.id, list);
    } catch (err) {
      console.warn('Failed to refresh notifications:', err);
    }
  }, [currentUser]);

  // Initial load and periodic refresh
  useEffect(() => {
    if (!currentUser?.id) return;

    loadNotifications();

    const interval = setInterval(() => {
      loadNotifications();
    }, 45000); // 45 seconds refresh

    const handleUpdate = () => loadNotifications();
    window.addEventListener('mr_radwan_notifications_updated', handleUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('mr_radwan_notifications_updated', handleUpdate);
    };
  }, [currentUser?.id, loadNotifications]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleOpenDropdown = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      loadNotifications();
    }
  };

  const handleMarkAllRead = async () => {
    if (!currentUser?.id) return;
    const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);
    if (unreadIds.length === 0) return;

    // Optimistic UI
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    await markAllNotificationsAsRead(currentUser.id, unreadIds);

    showToast('تم تحديد جميع الإشعارات كمقروءة وحفظها عالمياً ✓');
  };

  const handleNotificationClick = async (notif: AppNotification) => {
    if (!currentUser?.id) return;

    // Mark as read globally
    if (!notif.isRead) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
      );
      await markNotificationAsRead(currentUser.id, notif.id);
    }

    // Open the full dedicated message modal requested by the user
    setSelectedNotifForModal(notif);
  };

  const handleNavigateFromModal = (notif: AppNotification) => {
    setSelectedNotifForModal(null);
    setIsOpen(false);
    if (notif.link) {
      router.push(notif.link);
    }
  };

  const handleToggleReadStatus = async (notif: AppNotification, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!currentUser?.id) return;

    const nextRead = !notif.isRead;
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, isRead: nextRead } : n))
    );

    if (selectedNotifForModal && selectedNotifForModal.id === notif.id) {
      setSelectedNotifForModal({ ...selectedNotifForModal, isRead: nextRead });
    }

    if (nextRead) {
      await markNotificationAsRead(currentUser.id, notif.id);
      showToast('تم التحديد كمقروء ✓');
    } else {
      try {
        await fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'mark_unread', userId: currentUser.id, notifId: notif.id }),
        });
      } catch {}
      showToast('تم التحديد كغير مقروء');
    }
  };

  const handleCopyMessage = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleEnableDeviceNotifications = async () => {
    if (!currentUser?.id) return;
    setIsActivatingDevice(true);
    try {
      const granted = await requestDeviceNotificationPermission(currentUser.id);
      setDevicePermission(getDeviceNotificationPermission());
      if (granted) {
        showToast('تم تفعيل إشعارات جهازك بنجاح! 🔔');
      } else {
        showToast('لم يتم منح الإذن من المتصفح');
      }
    } finally {
      setIsActivatingDevice(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'unread' && n.isRead) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = n.title.toLowerCase().includes(q);
      const matchMsg = n.message.toLowerCase().includes(q);
      const matchBadge = (n.badgeLabel || '').toLowerCase().includes(q);
      return matchTitle || matchMsg || matchBadge;
    }
    return true;
  });

  return (
    <>
      {/* Bell Trigger Button */}
      <div className="relative inline-flex items-center">
        <button
          ref={bellButtonRef}
          id="global-notification-bell-btn"
          onClick={handleOpenDropdown}
          aria-label="عرض التنبيهات والإشعارات"
          className={`
            relative p-2.5 rounded-2xl transition-all duration-200 flex items-center justify-center
            ${
              isOpen
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 ring-2 ring-emerald-500/30'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
            }
          `}
        >
          <Bell className="w-5 h-5" />

          {unreadCount > 0 && (
            <span
              id="unread-notifications-badge"
              className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center shadow-md animate-pulse ring-2 ring-white dark:ring-slate-900"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* PORTAL: Render Notification Drawer Outside Any Sidebar Overflow */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <>
                {/* Backdrop Click Outside */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsOpen(false)}
                  className="fixed inset-0 z-[9990] bg-slate-950/40 backdrop-blur-[2px]"
                />

                {/* Floating Notification Panel: Centered on Mobile, Clean Floating Drawer on Desktop */}
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.96 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                  className="fixed z-[9995] top-16 right-3 left-3 sm:left-auto sm:right-6 sm:top-20 sm:w-[460px] max-h-[85vh] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col font-sans"
                  style={{ direction: 'rtl' }}
                >
                  {/* Header */}
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                          <Bell className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <span>مركز التنبيهات</span>
                            {unreadCount > 0 && (
                              <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-black">
                                {unreadCount} جديد
                              </span>
                            )}
                          </h3>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">
                            تحديث فوري ومزامنة كاملة عبر جميع أجهزتك
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {unreadCount > 0 && (
                          <button
                            onClick={handleMarkAllRead}
                            title="تحديد كل التنبيهات كمقروءة"
                            className="p-1.5 text-xs font-black text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl transition-all flex items-center gap-1"
                          >
                            <CheckCheck className="w-4 h-4" />
                            <span className="hidden sm:inline text-[11px]">تحديد الكل</span>
                          </button>
                        )}
                        <button
                          onClick={() => setIsOpen(false)}
                          aria-label="إغلاق نافذة التنبيهات"
                          className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {/* System / Device Notification Card */}
                    {isDeviceNotificationSupported() && (
                      <div className="p-3 rounded-2xl bg-gradient-to-l from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[11px] font-black text-slate-800 dark:text-slate-200 truncate">
                              إشعارات الجهاز (الموبايل والكمبيوتر)
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                              {devicePermission === 'granted'
                                ? 'الإشعارات مفعلة ومربوطة بجهازك بنجاح ✓'
                                : devicePermission === 'denied'
                                ? 'محظورة في إعدادات المتصفح (افتح القفل 🔒)'
                                : 'تفعيل الإذن لاستقبال تنبيهات الدروس والردود فوراً'}
                            </p>
                          </div>
                        </div>

                        {devicePermission === 'granted' ? (
                          <button
                            onClick={() => {
                              playNotificationChime();
                              sendNativeDeviceNotification(
                                'منصة مستر محمد رضوان 🌟',
                                'تم اختبار إشعار الجهاز بنجاح! أنت متصل وتصلك أحدث المستجدات فوراً.',
                                '/'
                              );
                              showToast('تم إرسال إشعار تجريبي للجهاز 🔔');
                            }}
                            className="px-2.5 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-black shrink-0 hover:bg-emerald-200 transition-all flex items-center gap-1 active:scale-95"
                            title="إرسال إشعار تجريبي للجهاز"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>تجربة 🔔</span>
                          </button>
                        ) : devicePermission === 'denied' ? (
                          <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 shrink-0">
                            مغلق
                          </span>
                        ) : (
                          <button
                            onClick={handleEnableDeviceNotifications}
                            disabled={isActivatingDevice}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black shadow-sm shrink-0 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1"
                          >
                            <Bell className="w-3.5 h-3.5" />
                            <span>{isActivatingDevice ? 'تفعيل...' : 'سماح 🔔'}</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Search & Tabs */}
                    <div className="space-y-2">
                      <div className="relative">
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="بحث في الإشعارات..."
                          className="w-full pl-3 pr-9 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                        />
                        <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        {searchQuery && (
                          <button
                            onClick={() => setSearchQuery('')}
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

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
                  </div>

                  {/* Toast Alert */}
                  {toastMessage && (
                    <div className="px-4 py-2 bg-emerald-500 text-white text-xs font-bold text-center animate-fade-in flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{toastMessage}</span>
                    </div>
                  )}

                  {/* Notifications List Body */}
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
                            {activeTab === 'unread'
                              ? 'لا توجد إشعارات غير مقروءة'
                              : searchQuery
                              ? 'لا توجد نتائج تطابق بحثك'
                              : 'لا توجد إشعارات حالياً'}
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
                            whileHover={{ scale: 1.008 }}
                            whileTap={{ scale: 0.99 }}
                            className={`
                              group relative p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer flex items-start gap-3
                              ${
                                !notif.isRead
                                  ? 'bg-emerald-50/40 dark:bg-slate-800/90 border-emerald-300 dark:border-emerald-700/60 shadow-sm'
                                  : 'bg-white dark:bg-slate-900/50 border-slate-100 dark:border-slate-800/70 opacity-80 hover:opacity-100'
                              }
                            `}
                          >
                            {/* Unread indicator dot */}
                            {!notif.isRead && (
                              <span
                                title="إشعار جديد غير مقروء"
                                className="absolute top-3.5 left-3.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20"
                              />
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
                                  className={`text-xs font-black truncate max-w-[210px] sm:max-w-[260px] ${
                                    !notif.isRead
                                      ? 'text-slate-900 dark:text-white'
                                      : 'text-slate-700 dark:text-slate-300'
                                  }`}
                                >
                                  {notif.title}
                                </h4>
                                <span className="text-[10px] text-slate-400 font-bold shrink-0">
                                  {formatRelativeTime(notif.timestamp)}
                                </span>
                              </div>

                              {/* Message text snippet */}
                              <p className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold line-clamp-2 leading-relaxed">
                                {notif.message}
                              </p>

                              {/* Action row */}
                              <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/60">
                                {notif.badgeLabel && (
                                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                    {notif.badgeLabel}
                                  </span>
                                )}

                                <div className="flex items-center gap-2 mr-auto">
                                  <button
                                    onClick={(e) => handleToggleReadStatus(notif, e)}
                                    title={notif.isRead ? 'تحديد كغير مقروء' : 'تحديد كمقروء'}
                                    className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                                  >
                                    {notif.isRead ? (
                                      <EyeOff className="w-3.5 h-3.5" />
                                    ) : (
                                      <Eye className="w-3.5 h-3.5 text-emerald-600" />
                                    )}
                                  </button>

                                  <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 group-hover:translate-x-[-2px] transition-transform flex items-center gap-0.5">
                                    <span>قراءة وتكبير</span>
                                    <Maximize2 className="w-3 h-3" />
                                  </span>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })
                    )}
                  </div>

                  {/* Footer */}
                  <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex items-center justify-between text-[10px] text-slate-400 font-bold px-4">
                    <span>منصة مستر محمد رضوان التعليمية 🌟</span>
                    <span>مزامنة سحابية عبر جميع الأجهزة ✓</span>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body
        )}

      {/* PORTAL: DEDICATED FULL MESSAGE MODAL ("مربع الرسالة على الشاشة كاملة") */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {selectedNotifForModal && (
              <div className="fixed inset-0 z-[10005] flex items-center justify-center p-3 sm:p-6 font-sans">
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSelectedNotifForModal(null)}
                  className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
                />

                {/* Modal Container */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.94, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.94, y: 15 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                  className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border-2 border-emerald-500/20 dark:border-emerald-500/30 shadow-2xl overflow-hidden flex flex-col z-[10010]"
                  style={{ direction: 'rtl', maxHeight: '90vh' }}
                >
                  {/* Modal Header */}
                  <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      {(() => {
                        const iconConf = getNotificationIcon(selectedNotifForModal.type);
                        const Icon = iconConf.icon;
                        return (
                          <div
                            className={`w-11 h-11 rounded-2xl ${iconConf.bg} border ${iconConf.border} flex items-center justify-center shrink-0 shadow-sm`}
                          >
                            <Icon className="w-6 h-6" />
                          </div>
                        );
                      })()}

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 text-[11px] font-black">
                            {selectedNotifForModal.badgeLabel || 'تنبيه'}
                          </span>
                          <span className="text-[11px] font-bold text-slate-400">
                            {new Date(selectedNotifForModal.timestamp).toLocaleString('ar-EG', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </span>
                        </div>
                        <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white mt-1 truncate">
                          {selectedNotifForModal.title}
                        </h3>
                      </div>
                    </div>

                    {/* Font Scaling & Close Controls */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() =>
                          setModalFontSize((prev) =>
                            prev === 'normal' ? 'large' : prev === 'large' ? 'xlarge' : 'normal'
                          )
                        }
                        title="تكبير / تصغير حجم الخط"
                        className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 text-slate-700 dark:text-slate-300 text-xs font-black transition-colors flex items-center gap-1"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                        <span>خط {modalFontSize === 'normal' ? '1x' : modalFontSize === 'large' ? '2x' : '3x'}</span>
                      </button>

                      <button
                        onClick={() => setSelectedNotifForModal(null)}
                        aria-label="إغلاق مربع الرسالة"
                        className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950/50 text-slate-500 hover:text-rose-600 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Modal Body: Full unclipped text */}
                  <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
                    <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                      <p
                        className={`font-semibold text-slate-800 dark:text-slate-100 whitespace-pre-wrap leading-relaxed select-text ${
                          modalFontSize === 'xlarge'
                            ? 'text-lg sm:text-xl leading-loose'
                            : modalFontSize === 'large'
                            ? 'text-base sm:text-lg leading-relaxed'
                            : 'text-sm sm:text-base leading-relaxed'
                        }`}
                      >
                        {selectedNotifForModal.fullMessage || selectedNotifForModal.message}
                      </p>
                    </div>

                    {/* Copy text action */}
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() =>
                          handleCopyMessage(
                            selectedNotifForModal.fullMessage || selectedNotifForModal.message
                          )
                        }
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95"
                      >
                        {copiedText ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span className="text-emerald-600 dark:text-emerald-400 font-black">
                              تم نسخ النص بنجاح!
                            </span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 text-slate-500" />
                            <span>نسخ نص الرسالة</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={(e) => handleToggleReadStatus(selectedNotifForModal, e)}
                        className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1"
                      >
                        {selectedNotifForModal.isRead ? (
                          <>
                            <EyeOff className="w-4 h-4" />
                            <span>تحديد كغير مقروء</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-4 h-4 text-emerald-600" />
                            <span className="text-emerald-600 font-bold">تحديد كمقروء</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between gap-3">
                    <button
                      onClick={() => setSelectedNotifForModal(null)}
                      className="px-4 py-2.5 rounded-2xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-black transition-all"
                    >
                      إخفاء الرسالة
                    </button>

                    {selectedNotifForModal.link && (
                      <button
                        onClick={() => handleNavigateFromModal(selectedNotifForModal)}
                        className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 active:scale-95"
                      >
                        <span>الانتقال إلى المحتوى / الطلب</span>
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
