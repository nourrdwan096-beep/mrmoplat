'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, AlertTriangle, X, ShieldAlert } from 'lucide-react';

export interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title?: string;
  itemType?: string; // e.g. "فيديو", "امتحان", "واجب", "وحدة", "سؤال", "كورس"
  itemName: string;
  warningNote?: string;
  isLoading?: boolean;
}

export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'تأكيد حذف المحتوى',
  itemType = 'عنصر',
  itemName,
  warningNote = 'هذا الإجراء سيقوم بحذف هذا العنصر نهائياً من قاعدة البيانات.',
  isLoading = false,
}: DeleteModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        id="delete-confirmation-overlay"
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto"
        dir="rtl"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative bg-white dark:bg-slate-900 border-2 border-rose-500/30 dark:border-rose-500/40 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl shadow-rose-950/30 overflow-hidden text-center space-y-6"
        >
          {/* Top glowing ambient effect */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* Close button */}
          <button
            id="close-delete-modal-btn"
            onClick={onClose}
            disabled={isLoading}
            className="absolute top-5 left-5 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Danger icon badge */}
          <div className="mx-auto w-20 h-20 bg-rose-100 dark:bg-rose-500/20 border border-rose-300 dark:border-rose-500/40 rounded-3xl flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-inner">
            <Trash2 className="w-10 h-10 animate-bounce" />
          </div>

          {/* Titles */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 rounded-full text-xs font-black border border-rose-200 dark:border-rose-800/50">
              <ShieldAlert className="w-3.5 h-3.5" />
              تنبيه حماية وحذف المحتوى
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">
              {title}
            </h3>
            <p className="text-slate-600 dark:text-slate-300 font-bold text-sm">
              هل أنت متأكد تماماً من رغبتك في حذف هذا {itemType}؟
            </p>
          </div>

          {/* Item details box */}
          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-right space-y-2">
            <div className="text-xs font-black text-slate-400">
              اسم {itemType} المراد حذفه:
            </div>
            <div className="text-base font-black text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/30 p-3 rounded-xl border border-rose-200 dark:border-rose-900/50 break-words">
              {itemName || '(بدون اسم)'}
            </div>
            {warningNote && (
              <div className="flex items-start gap-2 text-xs font-bold text-amber-600 dark:text-amber-400 pt-1">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{warningNote}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              id="confirm-delete-btn"
              type="button"
              disabled={isLoading}
              onClick={onConfirm}
              className="w-full py-3.5 px-6 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-black text-sm rounded-2xl shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  نعم، تأكيد الحذف نهائياً
                </>
              )}
            </button>

            <button
              id="cancel-delete-btn"
              type="button"
              disabled={isLoading}
              onClick={onClose}
              className="w-full py-3.5 px-6 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-black text-sm rounded-2xl transition-all"
            >
              تراجع وإلغاء
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
