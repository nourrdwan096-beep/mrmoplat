'use client';

import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  Plus,
  Clock,
  CheckCircle2,
  Circle,
  Trash2,
  Edit3,
  Save,
  X,
  Sparkles,
  BookOpen,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';
import UndoDeleteToast from '@/components/UndoDeleteToast';
import RichContentViewer from '@/components/RichContentViewer';
import RichTextEditor from '@/components/RichTextEditor';

interface Task {
  id: string;
  title: string;
  time: string;
  duration: number;
  completed: boolean;
  day: number; // 0-6 (Sun-Sat)
  notes?: string;
}

const DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const LOCAL_STORAGE_KEY = 'mr_radwan_student_schedule';

export default function StudentSchedulePage() {
  // ZERO-STATE ENFORCED: starts with zero tasks, strictly no fake mock data!
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeDay, setActiveDay] = useState<number>(new Date().getDay());

  // Adding/Editing modal state
  const [isAdding, setIsAdding] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskTime, setTaskTime] = useState('08:00');
  const [taskDuration, setTaskDuration] = useState('60');
  const [taskNotes, setTaskNotes] = useState('');

  // Deletion & 5-Second Undo State
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [pendingDeletedTask, setPendingDeletedTask] = useState<{ task: Task; index: number } | null>(null);
  const [isUndoToastOpen, setIsUndoToastOpen] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState('');

  // Load from local storage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setTasks(parsed);
        }
      }
    } catch (e) {
      console.warn('Could not read stored tasks:', e);
    }
  }, []);

  // Persist to local storage
  const persistTasks = (newTasks: Task[]) => {
    setTasks(newTasks);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newTasks));
    } catch (e) {
      console.warn('Could not save tasks:', e);
    }
  };

  const activeDayTasks = tasks
    .filter((t) => t.day === activeDay)
    .sort((a, b) => a.time.localeCompare(b.time));

  const completedTasksCount = activeDayTasks.filter((t) => t.completed).length;
  const progressPercentage =
    activeDayTasks.length > 0
      ? Math.round((completedTasksCount / activeDayTasks.length) * 100)
      : 0;

  const handleToggleComplete = (id: string) => {
    const updated = tasks.map((t) =>
      t.id === id ? { ...t, completed: !t.completed } : t
    );
    persistTasks(updated);
  };

  const openAddModal = () => {
    setEditingTask(null);
    setTaskTitle('');
    setTaskTime('08:00');
    setTaskDuration('60');
    setTaskNotes('');
    setIsAdding(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setTaskTitle(task.title);
    setTaskTime(task.time);
    setTaskDuration(task.duration.toString());
    setTaskNotes(task.notes || '');
    setIsAdding(true);
  };

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    if (editingTask) {
      // Update existing task
      const updated = tasks.map((t) =>
        t.id === editingTask.id
          ? {
              ...t,
              title: taskTitle.trim(),
              time: taskTime,
              duration: parseInt(taskDuration) || 60,
              notes: taskNotes.trim() || undefined,
            }
          : t
      );
      persistTasks(updated);
      setNotificationMsg('تم تحديث بيانات المهمة بنجاح ✨');
    } else {
      // Create new task
      const newTask: Task = {
        id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        title: taskTitle.trim(),
        time: taskTime,
        duration: parseInt(taskDuration) || 60,
        completed: false,
        day: activeDay,
        notes: taskNotes.trim() || undefined,
      };
      persistTasks([...tasks, newTask]);
      setNotificationMsg('تمت إضافة المهمة إلى جدول المذاكرة بنجاح ⏰');
    }

    setTimeout(() => setNotificationMsg(''), 3000);
    setIsAdding(false);
    setEditingTask(null);
  };

  // Step 1: Open Delete Confirmation Modal
  const requestDeleteTask = (task: Task) => {
    setTaskToDelete(task);
    setIsDeleteModalOpen(true);
  };

  // Step 2: Confirm Delete -> Trigger 5-Second Undo Toast
  const handleConfirmDelete = () => {
    if (!taskToDelete) return;
    const target = taskToDelete;
    const originalIndex = tasks.findIndex((t) => t.id === target.id);
    setIsDeleteModalOpen(false);
    setTaskToDelete(null);

    // Remove from UI
    const updated = tasks.filter((t) => t.id !== target.id);
    persistTasks(updated);

    setPendingDeletedTask({ task: target, index: originalIndex });
    setIsUndoToastOpen(true);
  };

  // Step 3: Undo deletion within 5 seconds
  const handleUndoDelete = () => {
    if (!pendingDeletedTask) return;
    const { task, index } = pendingDeletedTask;

    const restored = [...tasks];
    restored.splice(Math.min(index, restored.length), 0, task);
    persistTasks(restored);

    setPendingDeletedTask(null);
    setIsUndoToastOpen(false);
    setNotificationMsg('تم التراجع عن حذف المهمة بنجاح ↩️');
    setTimeout(() => setNotificationMsg(''), 3000);
  };

  // Step 4: Permanent deletion once 5s expires
  const handlePermanentDeleteExpire = () => {
    setPendingDeletedTask(null);
    setIsUndoToastOpen(false);
    setNotificationMsg('تم حذف المهمة نهائياً من جدولك');
    setTimeout(() => setNotificationMsg(''), 3000);
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-2 flex items-center gap-2">
            جدول المذاكرة الذكي <CalendarDays className="w-6 h-6 text-violet-500" />
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm md:text-base">
            صمم جدولك اليومي ونظم أوقاتك لزيادة إنتاجيتك وتحقيق التفوق باللغة الإنجليزية.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="py-3 px-5 bg-violet-600 hover:bg-violet-700 text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg shadow-violet-600/20 text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة مهمة جديدة</span>
        </button>
      </div>

      {/* Notification Toast */}
      {notificationMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-sm font-black flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>{notificationMsg}</span>
        </motion.div>
      )}

      {/* Days Selector */}
      <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide snap-x">
        {DAYS.map((dayName, index) => {
          const isToday = index === new Date().getDay();
          const isActive = index === activeDay;
          const dayTasksCount = tasks.filter((t) => t.day === index).length;

          return (
            <button
              key={index}
              onClick={() => setActiveDay(index)}
              className={`
                shrink-0 px-6 py-4 rounded-2xl font-black text-sm transition-all snap-center flex flex-col items-center gap-1 min-w-[95px]
                ${
                  isActive
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30 ring-2 ring-violet-400'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }
              `}
            >
              <span>{dayName}</span>
              <div className="flex items-center gap-1 text-[11px]">
                {isToday && (
                  <span className={isActive ? 'text-violet-200 font-bold' : 'text-emerald-600 font-bold'}>
                    اليوم
                  </span>
                )}
                {dayTasksCount > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    {dayTasksCount}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Progress Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-center gap-8">
        <div className="flex-1 w-full">
          <div className="flex justify-between items-end mb-4">
            <div>
              <h3 className="font-black text-slate-900 dark:text-white mb-1">
                إنجاز يوم {DAYS[activeDay]}
              </h3>
              <p className="text-sm font-bold text-slate-500">
                تم إنجاز {completedTasksCount} من {activeDayTasks.length} مهام
              </p>
            </div>
            <span className="text-3xl font-black text-violet-600 dark:text-violet-400">
              {progressPercentage}%
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="bg-violet-600 h-full rounded-full"
            />
          </div>
        </div>

        <button
          onClick={openAddModal}
          className="w-full md:w-auto shrink-0 py-3.5 px-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black rounded-2xl flex items-center justify-center gap-2 hover:-translate-y-0.5 transition-transform shadow-md text-sm"
        >
          <Plus className="w-4 h-4" /> إضافة مهمة لهذا اليوم
        </button>
      </div>

      {/* Add / Edit Task Modal / Inline Form */}
      <AnimatePresence>
        {isAdding && (
          <motion.form
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -20 }}
            onSubmit={handleSaveTask}
            className="bg-violet-50/70 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800/40 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm"
          >
            <div className="flex items-center justify-between pb-2 border-b border-violet-200 dark:border-violet-800/40">
              <h3 className="font-black text-violet-950 dark:text-violet-100 text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-violet-500" />
                <span>{editingTask ? 'تعديل مهمة المذاكرة' : `إضافة مهمة جديدة ليوم ${DAYS[activeDay]}`}</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setEditingTask(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                  ماذا ستذاكر؟ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  placeholder="مثال: مراجعة كلمات الوحدة الأولى + حل تمرين القواعد..."
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-violet-500 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                    وقت البدء
                  </label>
                  <input
                    type="time"
                    required
                    value={taskTime}
                    onChange={(e) => setTaskTime(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-3 text-sm font-bold focus:ring-2 focus:ring-violet-500 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                    المدة
                  </label>
                  <select
                    value={taskDuration}
                    onChange={(e) => setTaskDuration(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-3 text-sm font-bold focus:ring-2 focus:ring-violet-500 text-slate-900 dark:text-white"
                  >
                    <option value="15">15 دقيقة</option>
                    <option value="30">30 دقيقة</option>
                    <option value="45">45 دقيقة</option>
                    <option value="60">1 ساعة</option>
                    <option value="90">1.5 ساعة</option>
                    <option value="120">2 ساعة</option>
                    <option value="180">3 ساعات</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Optional notes / tips with full rich text & live animations */}
            <div>
              <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                ملاحظات أو نصائح إضافية لهذه المهمة (اختياري - يدعم التلوين والأنميشن والستيكرات)
              </label>
              <RichTextEditor
                value={taskNotes}
                onChange={setTaskNotes}
                placeholder="مثال: التركيز على حروف الجر مع أفعال Phrasal Verbs، حل تدريبات صفحة 45..."
                minHeight="min-h-[100px]"
                showStickers={true}
                showAnimations={true}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setEditingTask(null);
                }}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-black text-xs rounded-xl shadow-md transition-colors flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{editingTask ? 'حفظ التعديلات' : 'حفظ المهمة في الجدول'}</span>
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Tasks List */}
      <div className="space-y-4">
        {/* ZERO-STATE: When active day has no tasks */}
        {activeDayTasks.length === 0 ? (
          <div className="text-center py-16 px-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-4 shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-violet-500/10 text-violet-500 flex items-center justify-center mx-auto">
              <CalendarDays className="w-8 h-8" />
            </div>
            <div>
              <p className="text-slate-800 dark:text-slate-200 font-black text-base">
                لا توجد مهام مذاكرة مسجلة ليوم {DAYS[activeDay]}
              </p>
              <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto">
                ابدأ بتنظيم وقتك وإضافة جلسات المذاكرة وحل الواجبات لتتبع تقدمك يومياً.
              </p>
            </div>
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-black text-xs shadow-md transition-transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة أول مهمة لهذا اليوم</span>
            </button>
          </div>
        ) : (
          <AnimatePresence>
            {activeDayTasks.map((task) => (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`
                  p-5 sm:p-6 rounded-3xl flex items-center justify-between gap-4 border transition-all duration-300
                  ${
                    task.completed
                      ? 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-violet-500/50 shadow-xs'
                  }
                `}
              >
                <div className="flex items-center gap-4 flex-1">
                  <button
                    onClick={() => handleToggleComplete(task.id)}
                    title={task.completed ? 'إلغاء الإنجاز' : 'تحديد كمكتمل'}
                    className={`shrink-0 transition-colors ${
                      task.completed
                        ? 'text-emerald-500'
                        : 'text-slate-300 dark:text-slate-600 hover:text-violet-500'
                    }`}
                  >
                    {task.completed ? (
                      <CheckCircle2 className="w-7 h-7" />
                    ) : (
                      <Circle className="w-7 h-7" />
                    )}
                  </button>

                  <div className="space-y-1">
                    <h3
                      className={`font-black text-sm sm:text-base leading-snug ${
                        task.completed
                          ? 'text-slate-500 line-through decoration-2 decoration-slate-400'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {task.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-violet-500" />
                        <span>{task.time}</span>
                      </span>
                      <span>•</span>
                      <span>{task.duration} دقيقة</span>
                    </div>

                    {task.notes && (
                      <div className="mt-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs leading-relaxed text-slate-600 dark:text-slate-300 max-w-xl">
                        <RichContentViewer content={task.notes} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions: Edit & Delete */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => openEditModal(task)}
                    title="تعديل المهمة"
                    className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => requestDeleteTask(task)}
                    title="حذف المهمة"
                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setTaskToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="تأكيد حذف مهمة المذاكرة"
        itemType="مهمة المذاكرة"
        itemName={taskToDelete?.title || ''}
        warningNote="سيتم إزالة المهمة من جدولك، ويمكنك التراجع خلال 5 ثوانٍ قبل تأكيد الحذف النهائي."
      />

      {/* 5-Second Undo Toast */}
      <UndoDeleteToast
        isOpen={isUndoToastOpen}
        itemName={pendingDeletedTask?.task.title || 'مهمة المذاكرة'}
        durationSeconds={5}
        onUndo={handleUndoDelete}
        onExpire={handlePermanentDeleteExpire}
        onDismiss={handlePermanentDeleteExpire}
      />
    </div>
  );
}
