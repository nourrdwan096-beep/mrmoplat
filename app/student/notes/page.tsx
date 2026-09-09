'use client';

import React, { useState, useEffect } from 'react';
import {
  PenTool,
  Plus,
  Edit3,
  Book,
  ChevronRight,
  ChevronLeft,
  Bookmark,
  Palette,
  Save,
  Trash2,
  Sparkles,
  BookOpen,
  Smile,
  X,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import RichTextEditor from '@/components/RichTextEditor';
import RichContentViewer from '@/components/RichContentViewer';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';
import UndoDeleteToast from '@/components/UndoDeleteToast';
import { supabase } from '@/lib/supabaseClient';

interface NotePage {
  id: string;
  title: string;
  content: string;
  color: string;
  icon: string;
  date: string;
}

const COLORS = [
  'bg-amber-100 dark:bg-amber-950/40 text-amber-950 dark:text-amber-100 border-amber-300 dark:border-amber-800/60',
  'bg-blue-100 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 border-blue-300 dark:border-blue-800/60',
  'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 border-emerald-300 dark:border-emerald-800/60',
  'bg-rose-100 dark:bg-rose-950/40 text-rose-950 dark:text-rose-100 border-rose-300 dark:border-rose-800/60',
  'bg-violet-100 dark:bg-violet-950/40 text-violet-950 dark:text-violet-100 border-violet-300 dark:border-violet-800/60',
  'bg-slate-100 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700',
];

const NOTE_ICONS = ['📝', '💡', '🇬🇧', '⭐', '🎯', '📚', '🧠', '✨', '🔥', '📌'];

const LOCAL_STORAGE_KEY = 'mr_radwan_student_notes';

export default function StudentNotesPage() {
  // ZERO-STATE ENFORCED: starts completely empty, no fake mock notes!
  const [pages, setPages] = useState<NotePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editColor, setEditColor] = useState(COLORS[0]);
  const [editIcon, setEditIcon] = useState('📝');

  // Deletion & 5-Second Undo State
  const [itemToDelete, setItemToDelete] = useState<NotePage | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [pendingDeletedItem, setPendingDeletedItem] = useState<{ item: NotePage; index: number } | null>(null);
  const [isUndoToastOpen, setIsUndoToastOpen] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState('');

  // Load notes from local storage or Supabase
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setPages(parsed);
        }
      }
    } catch (e) {
      console.warn('Could not read stored notes:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save notes to localStorage
  const persistPages = (newPages: NotePage[]) => {
    setPages(newPages);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newPages));
    } catch (e) {
      console.warn('Could not persist notes:', e);
    }
  };

  const currentPage = pages[currentPageIndex] || null;

  const handleNext = () => {
    if (currentPageIndex < pages.length - 1) setCurrentPageIndex((prev) => prev + 1);
  };

  const handlePrev = () => {
    if (currentPageIndex > 0) setCurrentPageIndex((prev) => prev - 1);
  };

  const startNewPage = () => {
    setEditTitle('');
    setEditContent('');
    setEditColor(COLORS[0]);
    setEditIcon('📝');
    setIsCreatingNew(true);
    setIsEditing(true);
  };

  const editCurrentPage = () => {
    if (!currentPage) return;
    setEditTitle(currentPage.title);
    setEditContent(currentPage.content);
    setEditColor(currentPage.color);
    setEditIcon(currentPage.icon || '📝');
    setIsCreatingNew(false);
    setIsEditing(true);
  };

  const savePage = () => {
    if (!editTitle.trim()) {
      alert('يرجى كتابة عنوان للملاحظة أولاً');
      return;
    }

    if (!isCreatingNew && currentPage) {
      // Update existing page
      const updated = pages.map((p, idx) =>
        idx === currentPageIndex
          ? {
              ...p,
              title: editTitle.trim(),
              content: editContent,
              color: editColor,
              icon: editIcon,
            }
          : p
      );
      persistPages(updated);
      setNotificationMsg('تم حفظ تعديلات الملاحظة بنجاح ✨');
    } else {
      // Create new page
      const newPage: NotePage = {
        id: 'note_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        title: editTitle.trim(),
        content: editContent,
        color: editColor,
        icon: editIcon,
        date: new Date().toLocaleDateString('ar-EG', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }),
      };
      const updated = [...pages, newPage];
      persistPages(updated);
      setCurrentPageIndex(updated.length - 1);
      setNotificationMsg('تمت إضافة الصفحة الجديدة إلى مفكرتك بنجاح 📝');
    }

    setTimeout(() => setNotificationMsg(''), 3000);
    setIsEditing(false);
    setIsCreatingNew(false);
  };

  // Step 1: Open Confirmation Modal
  const requestDeletePage = () => {
    if (!currentPage) return;
    setItemToDelete(currentPage);
    setIsDeleteModalOpen(true);
  };

  // Step 2: Confirm Delete -> Trigger 5-Second Undo Toast
  const handleConfirmDelete = () => {
    if (!itemToDelete) return;
    const target = itemToDelete;
    const targetIdx = currentPageIndex;
    setIsDeleteModalOpen(false);
    setItemToDelete(null);

    // Temporarily remove from UI
    const updated = pages.filter((p) => p.id !== target.id);
    persistPages(updated);

    // Adjust page index
    if (targetIdx >= updated.length) {
      setCurrentPageIndex(Math.max(0, updated.length - 1));
    }

    setPendingDeletedItem({ item: target, index: targetIdx });
    setIsUndoToastOpen(true);
  };

  // Step 3: Undo deletion within 5 seconds
  const handleUndoDelete = () => {
    if (!pendingDeletedItem) return;
    const { item, index } = pendingDeletedItem;

    const restored = [...pages];
    restored.splice(Math.min(index, restored.length), 0, item);
    persistPages(restored);
    setCurrentPageIndex(index);

    setPendingDeletedItem(null);
    setIsUndoToastOpen(false);
    setNotificationMsg('تم التراجع عن حذف الملاحظة بنجاح ↩️');
    setTimeout(() => setNotificationMsg(''), 3000);
  };

  // Step 4: Permanent deletion once 5s expires
  const handlePermanentDeleteExpire = () => {
    setPendingDeletedItem(null);
    setIsUndoToastOpen(false);
    setNotificationMsg('تم حذف الملاحظة نهائياً من دفترك');
    setTimeout(() => setNotificationMsg(''), 3000);
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-2 flex items-center gap-2">
            مفكرة ملاحظاتي الذكية <PenTool className="w-6 h-6 text-amber-500" />
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm md:text-base">
            سجّل قواعد اللغة الإنجليزية، الأفكار الذهبية، وتلخيصات مستر محمد رضوان مع تنسيق وورد متطور.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isEditing && (
            <button
              onClick={startNewPage}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-5 py-3 rounded-2xl font-black flex items-center gap-2 transition-all shadow-md shadow-amber-500/20 active:scale-95"
            >
              <Plus className="w-5 h-5" />
              <span>صفحة جديدة</span>
            </button>
          )}
        </div>
      </div>

      {/* Notification Banner */}
      {notificationMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-sm font-black flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>{notificationMsg}</span>
        </motion.div>
      )}

      {/* Notebook UI Container */}
      <div className="flex-1 w-full bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-4 md:p-8 flex items-center justify-center relative shadow-inner min-h-[500px]">
        {/* ZERO-STATE: When notebook has no pages */}
        {pages.length === 0 && !isEditing ? (
          <div className="text-center py-12 px-6 max-w-md mx-auto space-y-5">
            <div className="w-24 h-24 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto shadow-sm">
              <Book className="w-12 h-12" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
                دفتر ملاحظاتك فارغ حالياً 📖
              </h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium text-sm leading-relaxed">
                لم تقم بتدوين أي ملاحظات بعد. ابدأ بكتابة أولى أفكارك، ملخصات القواعد، أو الكلمات الصعبة واستفد من خيارات التنسيق والألوان والملصقات!
              </p>
            </div>
            <button
              onClick={startNewPage}
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 px-6 py-3.5 rounded-2xl font-black text-sm transition-transform active:scale-95 shadow-lg shadow-amber-500/20"
            >
              <Plus className="w-5 h-5" />
              <span>إضافة أول صفحة ملاحظات الآن</span>
            </button>
          </div>
        ) : (
          <div className="relative w-full max-w-4xl min-h-[480px]">
            {/* The Notebook Page Frame */}
            <div
              className={`w-full h-full rounded-r-3xl rounded-l-md shadow-2xl relative overflow-hidden transition-colors duration-500 ${
                isEditing ? editColor : currentPage?.color || COLORS[0]
              } border-2 border-r-8`}
            >
              {/* Binder Rings (Notebook look) */}
              <div className="absolute left-0 top-0 h-full w-8 border-r border-black/10 dark:border-white/10 flex flex-col justify-evenly py-8 z-20 pointer-events-none">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="w-6 h-4 bg-slate-300 dark:bg-slate-700 rounded-r-full shadow-inner border-y border-r border-slate-400 dark:border-slate-900 ml-[-2px]"
                  />
                ))}
              </div>

              {/* Inner Page Content */}
              <div className="ml-8 p-6 md:p-10 flex flex-col bg-white/70 dark:bg-slate-950/70 backdrop-blur-md z-10 min-h-[460px]">
                {isEditing ? (
                  /* EDITING MODE WITH RICH TEXT EDITOR */
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-current/15">
                      <div className="flex items-center gap-2 flex-1">
                        {/* Icon selector */}
                        <div className="flex gap-1 overflow-x-auto py-1">
                          {NOTE_ICONS.map((ic) => (
                            <button
                              key={ic}
                              type="button"
                              onClick={() => setEditIcon(ic)}
                              className={`w-8 h-8 rounded-xl text-lg flex items-center justify-center transition-transform ${
                                editIcon === ic
                                  ? 'bg-amber-500/20 ring-2 ring-amber-500 scale-110'
                                  : 'hover:bg-black/5 dark:hover:bg-white/5'
                              }`}
                            >
                              {ic}
                            </button>
                          ))}
                        </div>

                        <input
                          type="text"
                          required
                          placeholder="عنوان الملاحظة (مثال: قاعدة زمن الماضي البسيط)..."
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="text-xl md:text-2xl font-black bg-transparent border-b-2 border-current/20 focus:border-amber-500 outline-none pb-1 w-full placeholder:text-current/40"
                        />
                      </div>
                    </div>

                    {/* Color Theme Selector */}
                    <div className="flex items-center gap-2 py-1">
                      <span className="text-xs font-bold opacity-60 flex items-center gap-1">
                        <Palette className="w-3.5 h-3.5" /> لون الصفحة:
                      </span>
                      <div className="flex gap-2">
                        {COLORS.map((c, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setEditColor(c)}
                            className={`w-6 h-6 rounded-full border-2 transition-transform ${
                              c.split(' ')[0]
                            } ${editColor === c ? 'scale-125 border-amber-500 shadow-md ring-2 ring-amber-500/50' : 'border-transparent'}`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Rich Text Editor for Note Content */}
                    <div className="pt-2">
                      <RichTextEditor
                        value={editContent}
                        onChange={setEditContent}
                        placeholder="ابدأ بكتابة الملاحظة هنا... نسق الكلمات (عريض، مائل، تظليل)، غيّر حجم الخط ولونه، أضف ملصقات تشجيعية واستيكرز!"
                        minHeight="200px"
                        showStickers={true}
                        showAnimations={true}
                      />
                    </div>

                    {/* Edit Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-current/15">
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditing(false);
                          setIsCreatingNew(false);
                        }}
                        className="px-5 py-2.5 rounded-xl font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 text-sm transition-colors"
                      >
                        إلغاء
                      </button>
                      <button
                        type="button"
                        onClick={savePage}
                        className="px-6 py-2.5 rounded-xl font-black bg-amber-500 hover:bg-amber-600 text-slate-950 transition-all flex items-center gap-2 text-sm shadow-md shadow-amber-500/20 active:scale-95"
                      >
                        <Save className="w-4 h-4" />
                        <span>حفظ الصفحة في المفكرة</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* VIEW MODE */
                  currentPage && (
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentPage.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="flex flex-col h-full justify-between"
                      >
                        <div>
                          {/* Note Header */}
                          <div className="flex items-start justify-between gap-4 pb-4 border-b border-current/15 mb-6">
                            <div>
                              <h2 className="text-2xl md:text-3xl font-black mb-2 flex items-center gap-3">
                                <span className="text-3xl">{currentPage.icon || '📝'}</span>
                                <span>{currentPage.title}</span>
                              </h2>
                              <p className="text-xs font-bold opacity-60 flex items-center gap-1.5">
                                <Bookmark className="w-3.5 h-3.5" />
                                <span>{currentPage.date}</span>
                              </p>
                            </div>

                            {/* Actions: Edit & Delete */}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={editCurrentPage}
                                title="تعديل الملاحظة"
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/70 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold text-xs shadow-xs transition-colors"
                              >
                                <Edit3 className="w-4 h-4 text-blue-500" />
                                <span>تعديل</span>
                              </button>
                              <button
                                onClick={requestDeletePage}
                                title="حذف الملاحظة"
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 font-bold text-xs shadow-xs transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span>حذف</span>
                              </button>
                            </div>
                          </div>

                          {/* Rich Content View */}
                          <div className="leading-relaxed text-base md:text-lg">
                            <RichContentViewer content={currentPage.content} />
                          </div>
                        </div>

                        {/* Page Footer Counter */}
                        <div className="pt-6 mt-6 border-t border-current/15 flex items-center justify-between text-xs font-bold opacity-60">
                          <span>دفتر ملاحظات مستر محمد رضوان</span>
                          <span>
                            الصفحة {currentPageIndex + 1} من {pages.length}
                          </span>
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  )
                )}
              </div>
            </div>

            {/* Book Pagination Navigation Arrows */}
            {!isEditing && pages.length > 1 && (
              <>
                <button
                  onClick={handlePrev}
                  disabled={currentPageIndex === 0}
                  className="absolute top-1/2 -right-6 md:-right-8 -translate-y-1/2 w-11 h-11 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-center shadow-lg disabled:opacity-30 hover:scale-110 transition-all text-slate-900 dark:text-white z-30"
                  title="الصفحة السابقة"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
                <button
                  onClick={handleNext}
                  disabled={currentPageIndex === pages.length - 1}
                  className="absolute top-1/2 -left-6 md:-left-8 -translate-y-1/2 w-11 h-11 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-center shadow-lg disabled:opacity-30 hover:scale-110 transition-all text-slate-900 dark:text-white z-30"
                  title="الصفحة التالية"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setItemToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="تأكيد حذف صفحة الملاحظات"
        itemType="الملاحظة"
        itemName={itemToDelete?.title || ''}
        warningNote="سيتم إزالة الصفحة من دفترك، وسيكون بإمكانك التراجع عن الحذف خلال 5 ثوانٍ قبل مسحها نهائياً."
      />

      {/* 5-Second Undo Toast */}
      <UndoDeleteToast
        isOpen={isUndoToastOpen}
        itemName={pendingDeletedItem?.item.title || 'صفحة الملاحظات'}
        durationSeconds={5}
        onUndo={handleUndoDelete}
        onExpire={handlePermanentDeleteExpire}
        onDismiss={handlePermanentDeleteExpire}
      />
    </div>
  );
}
