'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Sparkles, X, CheckCircle2, Volume2, ShieldCheck } from 'lucide-react';
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

  // 1. One-time prompt check (Enforces asking user exactly ONCE per account)
  useEffect(() => {
    if (!currentUser?.id) return;
    if (!isDeviceNotificationSupported()) return;

    // If user already made their choice previously, do NOT ask again
    if (hasAnsweredNotificationPrompt(currentUser.id)) return;

    // Check browser notification permission
    const perm = getDeviceNotificationPermission();
    if (perm !== 'default') {
      // Browser already has explicit grant or deny, record as answered
      setNotificationPromptAnswered(currentUser.id);
      return;
    }

    // Show after a subtle 2.5 second delay so the page loads smoothly
    const timer = setTimeout(() => {
      setShowPrompt(true);
    }, 2500);

    return () => clearTimeout(timer);
  }, [currentUser?.id]);

  // 2. Global background watcher for real-time device notification delivery
  useEffect(() => {
    if (!currentUser?.id) return;

    const checkAndDispatch = async () => {
      try {
        const notifs = await fetchUserNotifications(currentUser);
        dispatchNewNotificationsToDevice(currentUser.id, notifs);
      } catch (err) {
        // Silent background fallback
      }
    };

    // Initial check after 3 seconds
    const initTimer = setTimeout(checkAndDispatch, 3000);

    // Poll every 35 seconds across the whole app
    pollerRef.current = setInterval(checkAndDispatch, 35000);

    return () => {
      clearTimeout(initTimer);
      if (pollerRef.current) clearInterval(pollerRef.current);
    };
  }, [currentUser]);

  const handleGrant = async () => {
    if (!currentUser?.id) return;
    setIsLoading(true);
    try {
      const granted = await requestDeviceNotificationPermission(currentUser.id);
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
    if (currentUser?.id) {
      // Mark permanently answered so user is NEVER prompted again
      setNotificationPromptAnswered(currentUser.id);
      setDeviceNotificationEnabled(currentUser.id, false);
    }
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-5 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-[9980] font-sans"
        style={{ direction: 'rtl' }}
      >
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border-2 border-emerald-500/30 shadow-2xl shadow-emerald-500/10 backdrop-blur-md relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

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
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
                    <Bell className="w-5 h-5 animate-bounce" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-sm font-black text-slate-900 dark:text-white">
                        تفعيل إشعارات المنصة الفورية
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
                  className="p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 font-bold leading-relaxed">
                هل تسمح للمنصة بإرسال تنبيهات فورية لجهازك عند نشر دروس أو امتحانات جديدة، أو الرد على استفساراتك ومهامك الأكاديمية؟
              </p>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleGrant}
                  disabled={isLoading}
                  className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>{isLoading ? 'جاري التفعيل...' : 'السماح بالإشعارات الآن 🔔'}</span>
                </button>
                <button
                  onClick={handleDismiss}
                  className="py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs font-black transition-all"
                >
                  لاحقاً
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
