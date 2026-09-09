'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CalendarDays,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Clock,
  Video,
  Lightbulb,
  FileText,
  AlertCircle,
  Sparkles,
  X
} from 'lucide-react';
import {
  fetchTeacherNotes,
  createTeacherNote,
  toggleTeacherNoteComplete,
  deleteTeacherNote,
  restoreTeacherNote,
  TeacherNoteData
} from '@/lib/teacherService';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';
import UndoDeleteToast from '@/components/UndoDeleteToast';
import RichTextEditor from '@/components/RichTextEditor';
import RichContentViewer from '@/components/RichContentViewer';

export default function TeacherNotesPage() {
  const [notes, setNotes] = useState<TeacherNoteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'schedule' | 'lecture' | 'note'>('all');

  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [itemType, setItemType] = useState<'schedule' | 'note' | 'lecture'>('schedule');
  const [scheduledDatetime, setScheduledDatetime] = useState('');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Deletion & 5-Second Undo State
  const [itemToDelete, setItemToDelete] = useState<TeacherNoteData | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [pendingDeletedItem, setPendingDeletedItem] = useState<TeacherNoteData | null>(null);
  const [isUndoToastOpen, setIsUndoToastOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchTeacherNotes();
        setNotes(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    setIsSubmitting(true);
    try {
      const created = await createTeacherNote({
        title,
        content,
        itemType,
        scheduledDatetime: scheduledDatetime || undefined,
        priority,
      });

      setNotes([created, ...notes]);
      setIsModalOpen(false);
      setTitle('');
      setContent('');
      setScheduledDatetime('');
      setPriority('normal');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (note: TeacherNoteData) => {
    const updatedStatus = !note.isCompleted;
    await toggleTeacherNoteComplete(note.id, updatedStatus);
    setNotes(notes.map((n) => (n.id === note.id ? { ...n, isCompleted: updatedStatus } : n)));
  };

  // Step 1: Open Confirmation Modal
  const handleRequestDelete = (note: TeacherNoteData) => {
    setItemToDelete(note);
    setIsDeleteModalOpen(true);
  };

  // Step 2: Confirm Delete -> Trigger 5-Second Undo Toast
  const handleConfirmDelete = () => {
    if (!itemToDelete) return;
    const target = itemToDelete;
    setIsDeleteModalOpen(false);
    setItemToDelete(null);

    setNotes((prev) => prev.filter((n) => n.id !== target.id));
    setPendingDeletedItem(target);
    setIsUndoToastOpen(true);
  };

  // Step 3: Undo deletion within 5 seconds
  const handleUndoDelete = () => {
    if (!pendingDeletedItem) return;
    const restored = pendingDeletedItem;
    setNotes((prev) => [restored, ...prev]);
    restoreTeacherNote(restored);
    setPendingDeletedItem(null);
    setIsUndoToastOpen(false);
    setSuccessMsg('تم التراجع عن الحذف بنجاح ↩️');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // Step 4: Permanent deletion once 5s expires
  const handlePermanentDeleteExpire = async () => {
    if (!pendingDeletedItem) return;
    const target = pendingDeletedItem;
    setIsUndoToastOpen(false);
    setPendingDeletedItem(null);

    try {
      await deleteTeacherNote(target.id);
      setSuccessMsg('تم حذف الملاحظة نهائياً');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredNotes = notes.filter((n) => (filterType === 'all' ? true : n.itemType === filterType));

  return (
    <div className="space-y-8 pb-10">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 dark:border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 dark:bg-amber-500/20 blur-3xl rounded-full -translate-y-1/2 translate-x-1/3"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-bold text-xs mb-3">
              <CalendarDays className="w-4 h-4" />
              المفكرة الخاصة وجدول المواعيد
            </div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
              جدول المواعيد والملاحظات الخاصة 📝
            </h1>
            <p className="text-slate-600 dark:text-slate-400 font-bold text-sm md:text-base">
              تدوين الأفكار وجدولة تصوير المحاضرات ومواعيد الامتحانات بتوقيت القاهرة.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-lg shadow-amber-600/20 transition-all hover:scale-105"
          >
            <Plus className="w-5 h-5" />
            إضافة موعد أو فكرة
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        {[
          { id: 'all', label: 'الكل', icon: Sparkles },
          { id: 'lecture', label: 'تسجيل محاضرات', icon: Video },
          { id: 'schedule', label: 'مواعيد ومهام', icon: CalendarDays },
          { id: 'note', label: 'أفكار وملاحظات', icon: Lightbulb },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterType(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs transition-all ${
              filterType === tab.id
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notes Grid */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 font-bold">جاري تحميل الملاحظات...</div>
      ) : filteredNotes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              className={`bg-white dark:bg-slate-900 rounded-3xl p-6 border shadow-sm transition-all flex flex-col justify-between ${
                note.isCompleted
                  ? 'border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/10 dark:bg-emerald-950/10 opacity-75'
                  : 'border-slate-200 dark:border-slate-800 hover:shadow-lg'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span
                    className={`text-xs font-black px-2.5 py-1 rounded-full flex items-center gap-1 ${
                      note.priority === 'urgent'
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400'
                        : note.priority === 'high'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                    }`}
                  >
                    {note.itemType === 'lecture' && <Video className="w-3 h-3" />}
                    {note.itemType === 'schedule' && <CalendarDays className="w-3 h-3" />}
                    {note.itemType === 'note' && <Lightbulb className="w-3 h-3" />}
                    {note.priority === 'urgent'
                      ? 'عاجل جداً'
                      : note.priority === 'high'
                      ? 'أولوية عالية'
                      : 'عادي'}
                  </span>

                  <button
                    onClick={() => handleToggle(note)}
                    className={`text-xs font-black flex items-center gap-1 transition-colors ${
                      note.isCompleted ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {note.isCompleted ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" /> تم الإنجاز
                      </>
                    ) : (
                      <>
                        <Circle className="w-4 h-4" /> قيد التنفيذ
                      </>
                    )}
                  </button>
                </div>

                <h4
                  className={`text-base font-black mb-2 ${
                    note.isCompleted
                      ? 'line-through text-slate-400 dark:text-slate-500'
                      : 'text-slate-900 dark:text-white'
                  }`}
                >
                  {note.title}
                </h4>

                {note.content && (
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                    <RichContentViewer content={note.content} />
                  </div>
                )}

                {note.scheduledDatetime && (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 mb-2">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {new Date(note.scheduledDatetime).toLocaleDateString('ar-EG', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  onClick={() => handleRequestDelete(note)}
                  className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                  title="حذف"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-bold">لا توجد ملاحظات مسجلة في هذا القسم</p>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl my-8"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">
                    إضافة موعد أو فكرة للمفكرة
                  </h3>
                  <p className="text-xs text-slate-500 font-bold mt-1">
                    خاصة بالمعلم فقط لإدارة الأفكار والمواعيد
                  </p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    العنوان أو المهمة *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="مثال: تسجيل فيديو مراجعة قاعدة Unit 3"
                    className="w-full h-11 px-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-semibold focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      نوع العنصر
                    </label>
                    <select
                      value={itemType}
                      onChange={(e) => setItemType(e.target.value as any)}
                      className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="schedule">موعد ومهمة</option>
                      <option value="lecture">تسجيل محاضرة</option>
                      <option value="note">فكرة وتدوين</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      الأولوية
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                      className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="normal">عادية</option>
                      <option value="high">عالية</option>
                      <option value="urgent">عاجلة جداً 🔥</option>
                      <option value="low">منخفضة</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    موعد التذكير (بتوقيت مصر)
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledDatetime}
                    onChange={(e) => setScheduledDatetime(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-semibold focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    تفاصيل وملاحظات إضافية
                  </label>
                  <RichTextEditor
                    value={content}
                    onChange={setContent}
                    placeholder="اكتب ملاحظات حول المحتوى، ورق المفاهيم المطلوب..."
                    minHeight="120px"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-lg shadow-amber-600/20 disabled:opacity-50"
                  >
                    {isSubmitting ? 'جاري الحفظ...' : 'حفظ الموعد'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setItemToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="تأكيد حذف الفكرة/الملاحظة"
        itemType="الملاحظة"
        itemName={itemToDelete?.title || ''}
        warningNote="سيتم إزالة الملاحظة من النظام، وسيكون بإمكانك التراجع خلال 5 ثوانٍ قبل تأكيد الحذف النهائي."
      />

      {/* 5-Second Undo Toast */}
      <UndoDeleteToast
        isOpen={isUndoToastOpen}
        itemName={pendingDeletedItem?.title || 'الملاحظة'}
        durationSeconds={5}
        onUndo={handleUndoDelete}
        onExpire={handlePermanentDeleteExpire}
        onDismiss={handlePermanentDeleteExpire}
      />
    </div>
  );
}
