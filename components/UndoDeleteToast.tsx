'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RotateCcw, Trash2, X, AlertCircle } from 'lucide-react';

interface UndoDeleteToastProps {
  isOpen: boolean;
  itemName: string;
  durationSeconds?: number;
  onUndo: () => void;
  onExpire: () => void;
  onDismiss?: () => void;
}

export default function UndoDeleteToast({
  isOpen,
  itemName,
  durationSeconds = 5,
  onUndo,
  onExpire,
  onDismiss,
}: UndoDeleteToastProps) {
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (!isOpen) {
      setTimeLeft(durationSeconds);
      return;
    }

    setTimeLeft(durationSeconds);
    const startTime = Date.now();
    const totalMs = durationSeconds * 1000;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remainingMs = Math.max(0, totalMs - elapsed);
      const remainingSec = Math.ceil(remainingMs / 1000);
      setTimeLeft(remainingSec);

      if (remainingMs <= 0) {
        clearInterval(interval);
        onExpireRef.current();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isOpen, durationSeconds]);

  if (!isOpen) return null;

  const progressPercent = Math.max(0, Math.min(100, (timeLeft / durationSeconds) * 100));

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[110] w-[92vw] max-w-md"
        dir="rtl"
      >
        <div className="relative overflow-hidden bg-slate-900/95 dark:bg-slate-950/95 text-white p-4 sm:p-5 rounded-3xl shadow-2xl border-2 border-rose-500/40 backdrop-blur-xl">
          {/* Subtle glow */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-rose-500/20 rounded-full blur-2xl pointer-events-none" />

          {/* Progress bar line at top */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-slate-800">
            <motion.div
              className="h-full bg-gradient-to-r from-amber-400 via-rose-500 to-rose-600"
              style={{ width: `${progressPercent}%` }}
              transition={{ ease: 'linear', duration: 0.1 }}
            />
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-rose-400">تم الحذف مؤقتاً</span>
                  <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-slate-800 text-amber-300">
                    {timeLeft} ث
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-200 truncate max-w-[200px] sm:max-w-[240px]">
                  {itemName || 'العنصر'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                id="undo-action-btn"
                type="button"
                onClick={onUndo}
                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-xs sm:text-sm font-black rounded-xl shadow-md shadow-emerald-950/40 flex items-center gap-1.5 transition-transform hover:scale-105 active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                تراجع
              </button>

              {onDismiss && (
                <button
                  type="button"
                  onClick={onDismiss}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                  title="حذف نهائي الآن وإغلاق"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
