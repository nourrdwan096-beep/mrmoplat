'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Sparkles, X, CheckCircle2, ShieldCheck, Volume2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  isDeviceNotificationSupported,
  getDeviceNotificationPermission,
  requestDeviceNotificationPermission,
  hasAnsweredNotificationPrompt,
  setNotificationPromptAnswered,
  setDeviceNotificationEnabled,
  fetchUserNotifications,
  dispatchNewNotificationsToDevice,
} from '@/lib/notificationsService';

export default function GlobalNotificationPermissionPrompt() {
  const { currentUser } = useAuth();
  const [showPrompt, setShowPrompt] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successGranted, setSuccessGranted] = useState(false);
  const pollerRef = useRef<NodeJS.Timeout | null>(null);
  const originalTitleRef = useRef<string>('');

  // 1. One-time prompt check on entrance (Enforces asking user exactly ONCE)
  useEffect(() => {
    if (!isDeviceNotificationSupported()) return;

    // Check if user or guest has already answered previously
    if (hasAnsweredNotificationPrompt(currentUser?.id)) {
      return;
    }

    // Check actual browser notification permission
    const perm = getDeviceNotificationPermission();
    if (perm !== 'default') {
      // Browser already has explicit grant or deny, record as answered
      setNotificationPromptAnswered(currentUser?.id);
      return;
    }

    // Show prompt after a gentle 2-second delay so page loads smoothly
    const timer = setTimeout(() => {
      setShowPrompt(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, [currentUser?.id]);

  // 2. Global background watcher for real-time device notification delivery (Even when tab is in background)
  useEffect(() => {
    if (typeof document !== 'undefined') {
      originalTitleRef.current = document.title;
    }

    const checkAndDispatch = async () => {
      try {
        if (!currentUser?.id) return;
        const notifs = await fetchUserNotifications(currentUser);
        dispatchNewNotificationsToDevice(currentUser.id, notifs);

        // If tab is in background and there are unread notifications, pulse document title
        const unreadCount = notifs.filter(n => !n.isRead).length;
        if (typeof document !== 'undefined' && document.hidden && unreadCount > 0) {
          document.title = `(🔔 ${unreadCount} جديد) ${originalTitleRef.current || 'منصة مستر محمد رضوان'}`;
        }
      } catch (err) {
        // Silent background fallback
      }
    };

    // When visibility changes (tab minimized or switched), check immediately and restore title when active
    const handleVisibilityChange = () => {
      if (document.hidden) {
        checkAndDispatch();
      } else {
        if (originalTitleRef.current) {
          document.title = originalTitleRef.current;
        }
        checkAndDispatch();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initial check after 3 seconds
    const initTimer = setTimeout(checkAndDispatch, 3000);

    // Poll every 30 seconds across the whole app
    pollerRef.current = setInterval(checkAndDispatch, 30000);

    return () => {
      clearTimeout(initTimer);
      if (pollerRef.current) clearInterval(pollerRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (originalTitleRef.current && typeof document !== 'undefined') {
        document.title = originalTitleRef.current;
      }
    };
  }, [currentUser]);

  const handleGrant = async () => {
    setIsLoading(true);
    try {
      const granted = await requestDeviceNotificationPermission(currentUser?.id);
      if (granted) {
        setSuccessGranted(true);
        setTimeout(() => {
          setShowPrompt(false);
        }, 2200);
      } else {
        setShowPrompt(false);
      }
    } catch {
      setShowPrompt(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    // Mark permanently answered as "declined" so user is NEVER prompted again
    setNotificationPromptAnswered(currentUser?.id);
    setDeviceNotificationEnabled(currentUser?.id, false);
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 60, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.94 }}
        transition={{ type: 'spring', damping: 25, stiffness: 320 }}
        className="fixed bottom-5 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-[9980] font-sans"
        style={{ direction: 'rtl' }}
      >
        <div className="p-5 rounded-3xl bg-white/95 dark:bg-slate-900/95 border-2 border-emerald-500/40 shadow-2xl shadow-emerald-500/15 backdrop-blur-xl relative overflow-hidden text-right">
          
          {/* Ambient high-tech background glow */}
          <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-br from-sky-500/15 to-emerald-500/15 rounded-full blur-2xl pointer-events-none" />

          {successGranted ? (
            <div className="flex items-center gap-3 py-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-8 h-8 shrink-0" />
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                  تم تفعيل إشعارات المنصة بنجاح! 🔔
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-0.5">
                  ستصلك التنبيهات الفورية على هذا الجهاز بانتظام.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3.5">
              
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/25">
                    <Bell className="w-5 h-5 animate-bounce" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-sm font-black text-slate-900 dark:text-white">
                        هل تريد السماح بالإشعارات؟
                      </h4>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 text-[10px] font-black">
                        تنبيهات حية
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">
                      منصة مستر محمد رضوان التعليمية
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleDismiss}
                  aria-label="إغلاق التنبيه"
                  className="p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body explanation */}
              <p className="text-xs text-slate-600 dark:text-slate-300 font-bold leading-relaxed">
                هل تسمح للمنصة بإرسال تنبيهات فورية إلى جهازك عند نشر محاضرات جديدة، امتحانات، واجبات، أو إعلانات وتحديثات هامة من المعلم؟
              </p>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleGrant}
                  disabled={isLoading}
                  className="flex-1 py-2.5 px-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>{isLoading ? 'جاري التفعيل...' : 'نعم، السماح بالإشعارات 🔔'}</span>
                </button>

                <button
                  onClick={handleDismiss}
                  className="py-2.5 px-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs font-black transition-all active:scale-95"
                >
                  لا، لا أريد
                </button>
              </div>

            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
