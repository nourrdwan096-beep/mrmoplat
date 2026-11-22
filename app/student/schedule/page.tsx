'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  AlertCircle,
  PenTool,
  Play,
  Pause,
  RotateCcw,
  Printer,
  Copy,
  Flag,
  LayoutGrid,
  ListChecks,
  ArrowLeftRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';
import UndoDeleteToast from '@/components/UndoDeleteToast';
import RichContentViewer from '@/components/RichContentViewer';
import RichTextEditor from '@/components/RichTextEditor';
import MindMapCreator from '@/components/student/MindMapCreator';
import { useAuth } from '@/context/AuthContext';

type TaskCategory = 'study' | 'practice' | 'review' | 'exam';

interface Task {
  id: string;
  title: string;
  time: string;
  duration: number;
  completed: boolean;
  day: number; // 0-6 (Sun-Sat)
  subject?: string;
  category?: TaskCategory;
  priority?: 'normal' | 'high';
  notes?: string;
}

const DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

const SUBJECT_PRESETS = [
  'اللغة الإنجليزية',
  'الفيزياء',
  'الكيمياء',
  'الأحياء',
  'الرياضيات',
  'اللغة العربية',
  'مادة أخرى',
];

const TASK_CATEGORIES: { id: TaskCategory; label: string }[] = [
  { id: 'study', label: 'مذاكرة درس' },
  { id: 'practice', label: 'حل تمارين' },
  { id: 'review', label: 'مراجعة' },
  { id: 'exam', label: 'امتحان تجريبي' },
];

function timeToMinutes(t: string): number {
  const [h, m] = (t || '00:00').split(':').map((n) => parseInt(n, 10) || 0);
  return h * 60 + m;
}

function minutesToTime(total: number): string {
  const normalized = ((total % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatCountdown(seconds: number): string {
  const s = Math.max(0, seconds);
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function playGentleChime() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.62);
  } catch {
    // Graceful no-op if audio is blocked
  }
}

export default function StudentSchedulePage() {
  const { currentUser } = useAuth();
  const storageKey = `mr_radwan_student_schedule_${currentUser?.id || 'guest'}`;

  const [scheduleTab, setScheduleTab] = useState<'mindmap' | 'timetable'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('tab') === 'timetable') return 'timetable';
    }
    return 'mindmap';
  });

  // ZERO-STATE ENFORCED: starts with zero tasks, strictly no fake mock data!
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeDay, setActiveDay] = useState<number>(new Date().getDay());
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');

  // Adding/Editing modal state
  const [isAdding, setIsAdding] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDay, setTaskDay] = useState<number>(new Date().getDay());
  const [taskTime, setTaskTime] = useState('08:00');
  const [taskDuration, setTaskDuration] = useState('60');
  const [taskSubject, setTaskSubject] = useState('اللغة الإنجليزية');
  const [taskCategory, setTaskCategory] = useState<TaskCategory>('study');
  const [taskPriority, setTaskPriority] = useState<'normal' | 'high'>('normal');
  const [taskNotes, setTaskNotes] = useState('');

  // Day Copy & Week Reset
  const [copyTargetDay, setCopyTargetDay] = useState<number | ''>('');
  const [isResetWeekModalOpen, setIsResetWeekModalOpen] = useState(false);
  const [movingTaskId, setMovingTaskId] = useState<string | null>(null);

  // Live Task Focus Timer
  const [focusTask, setFocusTask] = useState<Task | null>(null);
  const [focusSecondsLeft, setFocusSecondsLeft] = useState(0);
  const [isFocusRunning, setIsFocusRunning] = useState(false);

  // Deletion & 5-Second Undo State
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [pendingDeletedTask, setPendingDeletedTask] = useState<{ task: Task; index: number } | null>(null);
  const [isUndoToastOpen, setIsUndoToastOpen] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState('');

  const showNotice = (msg: string) => {
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(''), 3200);
  };

  // Load from user-scoped local storage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setTasks(parsed);
          return;
        }
      }
      setTasks([]);
    } catch (e) {
      console.warn('Could not read stored tasks:', e);
    }
  }, [storageKey]);

  // Persist to user-scoped local storage
  const persistTasks = (newTasks: Task[]) => {
    setTasks(newTasks);
    try {
      localStorage.setItem(storageKey, JSON.stringify(newTasks));
    } catch (e) {
      console.warn('Could not save tasks:', e);
    }
  };

  const logActivityToday = () => {
    if (!currentUser?.id) return;
    try {
      const actKey = `mr_radwan_study_activity_${currentUser.id}`;
      const existing = JSON.parse(localStorage.getItem(actKey) || '[]');
      const todayIso = new Date().toISOString().slice(0, 10);
      if (Array.isArray(existing) && !existing.includes(todayIso)) {
        existing.push(todayIso);
        localStorage.setItem(actKey, JSON.stringify(existing.slice(-60)));
      }
    } catch {}
  };

  // Focus Timer Effect
  useEffect(() => {
    if (!focusTask || !isFocusRunning) return;
    const timer = setInterval(() => {
      setFocusSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsFocusRunning(false);
          playGentleChime();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [focusTask, isFocusRunning]);

  const startFocusForTask = (task: Task) => {
    setFocusTask(task);
    setFocusSecondsLeft((task.duration || 30) * 60);
    setIsFocusRunning(true);
  };

  const finishFocusAndComplete = () => {
    if (!focusTask) return;
    const updated = tasks.map((t) =>
      t.id === focusTask.id ? { ...t, completed: true } : t
    );
    persistTasks(updated);
    logActivityToday();
    showNotice(`أحسنت! تم إتمام مهمة "${focusTask.title}"`);
    setFocusTask(null);
    setIsFocusRunning(false);
    setFocusSecondsLeft(0);
  };

  // Weekly metrics
  const weeklyStats = useMemo(() => {
    const totalCount = tasks.length;
    const completedCount = tasks.filter((t) => t.completed).length;
    const totalMinutes = tasks.reduce((sum, t) => sum + (Number(t.duration) || 0), 0);
    const todayIdx = new Date().getDay();
    const todayRemainingMinutes = tasks
      .filter((t) => t.day === todayIdx && !t.completed)
      .reduce((sum, t) => sum + (Number(t.duration) || 0), 0);
    const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    return {
      totalCount,
      completedCount,
      totalHours: (totalMinutes / 60).toFixed(1),
      todayRemainingMinutes,
      pct,
    };
  }, [tasks]);

  const activeDayTasks = useMemo(() => {
    return tasks
      .filter((t) => t.day === activeDay)
      .filter((t) => {
        if (statusFilter === 'pending') return !t.completed;
        if (statusFilter === 'completed') return t.completed;
        return true;
      })
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [tasks, activeDay, statusFilter]);

  const activeDayAllTasks = useMemo(
    () => tasks.filter((t) => t.day === activeDay),
    [tasks, activeDay]
  );

  const completedTasksCount = activeDayAllTasks.filter((t) => t.completed).length;
  const activeDayTotalMinutes = activeDayAllTasks.reduce(
    (sum, t) => sum + (Number(t.duration) || 0),
    0
  );
  const progressPercentage =
    activeDayAllTasks.length > 0
      ? Math.round((completedTasksCount / activeDayAllTasks.length) * 100)
      : 0;

  // Time conflict check while adding/editing
  const overlappingTask = useMemo(() => {
    if (!isAdding) return null;
    const startA = timeToMinutes(taskTime);
    const endA = startA + (parseInt(taskDuration, 10) || 60);
    return (
      tasks.find((t) => {
        if (t.day !== taskDay) return false;
        if (editingTask && t.id === editingTask.id) return false;
        const startB = timeToMinutes(t.time);
        const endB = startB + (Number(t.duration) || 60);
        return startA < endB && endA > startB;
      }) || null
    );
  }, [isAdding, taskDay, taskTime, taskDuration, tasks, editingTask]);

  const handleToggleComplete = (id: string) => {
    const updated = tasks.map((t) =>
      t.id === id ? { ...t, completed: !t.completed } : t
    );
    persistTasks(updated);
    logActivityToday();
  };

  const openAddModal = (dayOverride?: number) => {
    const targetDay = typeof dayOverride === 'number' ? dayOverride : activeDay;
    setEditingTask(null);
    setTaskDay(targetDay);
    setActiveDay(targetDay);
    setTaskTitle('');
    setTaskTime('16:00');
    setTaskDuration('45');
    setTaskSubject('اللغة الإنجليزية');
    setTaskCategory('study');
    setTaskPriority('normal');
    setTaskNotes('');
    setIsAdding(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setTaskDay(task.day);
    setTaskTitle(task.title);
    setTaskTime(task.time);
    setTaskDuration(task.duration.toString());
    setTaskSubject(task.subject || 'اللغة الإنجليزية');
    setTaskCategory(task.category || 'study');
    setTaskPriority(task.priority || 'normal');
    setTaskNotes(task.notes || '');
    setIsAdding(true);
  };

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    if (editingTask) {
      const updated = tasks.map((t) =>
        t.id === editingTask.id
          ? {
              ...t,
              title: taskTitle.trim(),
              day: taskDay,
              time: taskTime,
              duration: parseInt(taskDuration, 10) || 45,
              subject: taskSubject,
              category: taskCategory,
              priority: taskPriority,
              notes: taskNotes.trim() || undefined,
            }
          : t
      );
      persistTasks(updated);
      setActiveDay(taskDay);
      showNotice('تم تحديث بيانات المهمة بنجاح');
    } else {
      const newTask: Task = {
        id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        title: taskTitle.trim(),
        time: taskTime,
        duration: parseInt(taskDuration, 10) || 45,
        completed: false,
        day: taskDay,
        subject: taskSubject,
        category: taskCategory,
        priority: taskPriority,
        notes: taskNotes.trim() || undefined,
      };
      persistTasks([...tasks, newTask]);
      setActiveDay(taskDay);
      showNotice(`تمت إضافة المهمة إلى يوم ${DAYS[taskDay]}`);
    }

    setIsAdding(false);
    setEditingTask(null);
  };

  const handleMoveTaskToDay = (taskId: string, newDay: number) => {
    const updated = tasks.map((t) => (t.id === taskId ? { ...t, day: newDay } : t));
    persistTasks(updated);
    setMovingTaskId(null);
    showNotice(`تم نقل المهمة إلى يوم ${DAYS[newDay]}`);
  };

  const handleCopyDayTasks = (targetDay: number) => {
    if (targetDay === activeDay || activeDayAllTasks.length === 0) return;
    const cloned = activeDayAllTasks.map((t, i) => ({
      ...t,
      id: `task_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 5)}`,
      day: targetDay,
      completed: false,
    }));
    persistTasks([...tasks, ...cloned]);
    setCopyTargetDay('');
    showNotice(`تم نسخ ${cloned.length} مهام من ${DAYS[activeDay]} إلى ${DAYS[targetDay]}`);
  };

  const handleResetWeekProgress = () => {
    const updated = tasks.map((t) => ({ ...t, completed: false }));
    persistTasks(updated);
    setIsResetWeekModalOpen(false);
    showNotice('تم تصفير علامات الإنجاز لبدء أسبوع مذاكرة جديد');
  };

  // Deletion handlers
  const requestDeleteTask = (task: Task) => {
    setTaskToDelete(task);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!taskToDelete) return;
    const target = taskToDelete;
    const originalIndex = tasks.findIndex((t) => t.id === target.id);
    setIsDeleteModalOpen(false);
    setTaskToDelete(null);

    const updated = tasks.filter((t) => t.id !== target.id);
    persistTasks(updated);

    setPendingDeletedTask({ task: target, index: originalIndex });
    setIsUndoToastOpen(true);
  };

  const handleUndoDelete = () => {
    if (!pendingDeletedTask) return;
    const { task, index } = pendingDeletedTask;

    const restored = [...tasks];
    restored.splice(Math.min(index, restored.length), 0, task);
    persistTasks(restored);

    setPendingDeletedTask(null);
    setIsUndoToastOpen(false);
    showNotice('تم التراجع عن حذف المهمة بنجاح');
  };

  const handlePermanentDeleteExpire = () => {
    setPendingDeletedTask(null);
    setIsUndoToastOpen(false);
    showNotice('تم حذف المهمة نهائياً من جدولك');
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6" dir="rtl">
      {/* Top Main Workspace Switcher */}
      <div className="no-print bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 shadow-xs flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setScheduleTab('mindmap')}
          className={`flex-1 py-2.5 px-4 rounded-xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
            scheduleTab === 'mindmap'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <PenTool className="w-4 h-4" />
          <span>الخرائط الذهنية</span>
        </button>

        <button
          type="button"
          onClick={() => setScheduleTab('timetable')}
          className={`flex-1 py-2.5 px-4 rounded-xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
            scheduleTab === 'timetable'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span>جدول المذاكرة الأسبوعي</span>
        </button>
      </div>

      {scheduleTab === 'mindmap' ? (
        <MindMapCreator />
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <div className="no-print flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
                <span>جدول المذاكرة الأسبوعي</span>
                <CalendarDays className="w-6 h-6 text-violet-500" />
              </h1>
              <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">
                نظّم ساعات مذاكرتك، تابع تعارضات الأوقات، وابدأ جلسات التركيز مباشرة من جدولك.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {tasks.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => setIsResetWeekModalOpen(true)}
                    className="px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-500 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
                    <span>تصفير إنجاز الأسبوع</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-400 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-500" />
                    <span>طباعة الجدول</span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => openAddModal()}
                className="py-2.5 px-5 bg-violet-600 hover:bg-violet-700 text-white font-black rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95 text-xs sm:text-sm whitespace-nowrap shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة مهمة جديدة</span>
              </button>
            </div>
          </div>

          {/* Notification Toast */}
          {notificationMsg && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="no-print p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm font-black flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{notificationMsg}</span>
            </motion.div>
          )}

          {/* Active Live Focus Timer Banner (When Started from Any Task) */}
          <AnimatePresence>
            {focusTask && (
              <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="no-print p-5 rounded-3xl bg-slate-900 text-white border border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg"
              >
                <div className="space-y-1 min-w-0">
                  <div className="text-[11px] font-black text-emerald-400">
                    جلسة تركيز جارية · {focusTask.subject || 'مذاكرة'}
                  </div>
                  <h3 className="text-base sm:text-lg font-black truncate">
                    {focusTask.title}
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-3xl font-black font-mono tabular-nums text-amber-400 px-3">
                    {formatCountdown(focusSecondsLeft)}
                  </span>

                  <button
                    type="button"
                    onClick={() => setIsFocusRunning((r) => !r)}
                    className="px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-black flex items-center gap-1.5"
                  >
                    {isFocusRunning ? (
                      <>
                        <Pause className="w-3.5 h-3.5" />
                        <span>إيقاف مؤقت</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        <span>استئناف</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setFocusSecondsLeft((s) => s + 300)}
                    className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold tabular-nums"
                  >
                    +5 د
                  </button>

                  <button
                    type="button"
                    onClick={finishFocusAndComplete}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-black flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>إنهاء وإتمام المهمة</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFocusTask(null);
                      setIsFocusRunning(false);
                    }}
                    title="إلغاء الجلسة"
                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Weekly Tabular Metrics Strip */}
          <div className="no-print grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1.5">
                ساعات الأسبوع المخططة
              </span>
              <span className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
                {weeklyStats.totalHours} ساعة
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1.5">
                المهام المنجزة أسبوعياً
              </span>
              <span className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
                {weeklyStats.completedCount} / {weeklyStats.totalCount}
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1.5">
                معدل الإنجاز الأسبوعي
              </span>
              <span className="text-2xl font-black text-violet-600 dark:text-violet-400 tabular-nums">
                {weeklyStats.pct}%
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1.5">
                متبقي اليوم ({DAYS[new Date().getDay()]})
              </span>
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                {weeklyStats.todayRemainingMinutes} دقيقة
              </span>
            </div>
          </div>

          {/* View Switcher & Status Filter Bar */}
          <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3">
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setViewMode('day')}
                className={`px-3.5 py-2 rounded-lg text-xs font-black flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  viewMode === 'day'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <ListChecks className="w-3.5 h-3.5 text-violet-500" />
                <span>عرض اليوم المفصل</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('week')}
                className={`px-3.5 py-2 rounded-lg text-xs font-black flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  viewMode === 'week'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5 text-violet-500" />
                <span>الشبكة الأسبوعية (7 أيام)</span>
              </button>
            </div>

            {viewMode === 'day' && (
              <div className="flex items-center gap-1.5">
                {(
                  [
                    { id: 'all', label: 'الكل' },
                    { id: 'pending', label: 'المتبقية' },
                    { id: 'completed', label: 'المكتملة' },
                  ] as const
                ).map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setStatusFilter(st.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                      statusFilter === st.id
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Add / Edit Task Inline Form */}
          <AnimatePresence>
            {isAdding && (
              <motion.form
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                onSubmit={handleSaveTask}
                className="no-print bg-white dark:bg-slate-900 border border-violet-300 dark:border-violet-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-sm"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="font-black text-slate-900 dark:text-white text-lg">
                    {editingTask ? 'تعديل مهمة المذاكرة' : `إضافة مهمة ليوم ${DAYS[taskDay]}`}
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

                {overlappingTask && (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>
                      تنبيه تعارض وقت: هذه الفترة تتداخل مع مهمة «{overlappingTask.title}» ({overlappingTask.time}).
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-5">
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                      ماذا ستذاكر؟ <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      autoFocus
                      required
                      placeholder="مثال: مراجعة كلمات الوحدة الأولى + حل تمارين..."
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-violet-500 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                      اليوم
                    </label>
                    <select
                      value={taskDay}
                      onChange={(e) => setTaskDay(Number(e.target.value))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold focus:outline-none focus:border-violet-500 text-slate-900 dark:text-white"
                    >
                      {DAYS.map((d, i) => (
                        <option key={d} value={i}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                      وقت البدء
                    </label>
                    <input
                      type="time"
                      required
                      value={taskTime}
                      onChange={(e) => setTaskTime(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold focus:outline-none focus:border-violet-500 text-slate-900 dark:text-white tabular-nums"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                      المدة
                    </label>
                    <select
                      value={taskDuration}
                      onChange={(e) => setTaskDuration(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold focus:outline-none focus:border-violet-500 text-slate-900 dark:text-white"
                    >
                      <option value="15">15 دقيقة</option>
                      <option value="25">25 دقيقة (بومودورو)</option>
                      <option value="30">30 دقيقة</option>
                      <option value="45">45 دقيقة</option>
                      <option value="60">1 ساعة</option>
                      <option value="90">1.5 ساعة</option>
                      <option value="120">2 ساعة</option>
                      <option value="180">3 ساعات</option>
                    </select>
                  </div>
                </div>

                {/* Subject, Type, Priority */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                      المادة
                    </label>
                    <select
                      value={taskSubject}
                      onChange={(e) => setTaskSubject(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900 dark:text-white"
                    >
                      {SUBJECT_PRESETS.map((sub) => (
                        <option key={sub} value={sub}>
                          {sub}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                      نوع الجلسة
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {TASK_CATEGORIES.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setTaskCategory(cat.id)}
                          className={`py-2 px-2 rounded-lg text-[11px] font-bold border transition-colors ${
                            taskCategory === cat.id
                              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        setTaskPriority((p) => (p === 'high' ? 'normal' : 'high'))
                      }
                      className={`py-2.5 px-4 rounded-xl border text-xs font-black flex items-center justify-center gap-2 transition-colors ${
                        taskPriority === 'high'
                          ? 'bg-rose-600 text-white border-rose-600'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <Flag className="w-3.5 h-3.5" />
                      <span>{taskPriority === 'high' ? 'أولوية عالية: مفعل' : 'تحديد كأولوية عالية'}</span>
                    </button>
                  </div>
                </div>

                {/* Optional notes */}
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                    ملاحظات إضافية لهذه المهمة (اختياري)
                  </label>
                  <RichTextEditor
                    value={taskNotes}
                    onChange={setTaskNotes}
                    placeholder="مثال: التركيز على حروف الجر، حل تدريبات صفحة 45..."
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
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-black text-xs rounded-xl transition-colors flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{editingTask ? 'حفظ التعديلات' : 'حفظ في الجدول'}</span>
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {viewMode === 'week' ? (
            /* 7-DAY OVERVIEW GRID */
            <div id="student-schedule-printable" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {DAYS.map((dayName, dayIdx) => {
                const dayTasks = tasks
                  .filter((t) => t.day === dayIdx)
                  .sort((a, b) => a.time.localeCompare(b.time));
                const dayDone = dayTasks.filter((t) => t.completed).length;
                const dayMins = dayTasks.reduce((s, t) => s + (Number(t.duration) || 0), 0);
                const isToday = dayIdx === new Date().getDay();

                return (
                  <div
                    key={dayName}
                    className={`rounded-3xl border p-4 flex flex-col justify-between gap-4 ${
                      isToday
                        ? 'bg-violet-50/50 dark:bg-violet-950/15 border-violet-300 dark:border-violet-800'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-black text-base text-slate-900 dark:text-white">
                              {dayName}
                            </h3>
                            {isToday && (
                              <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400">
                                اليوم
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 tabular-nums">
                            {dayDone}/{dayTasks.length} مهام · {dayMins} دقيقة
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => openAddModal(dayIdx)}
                          title={`إضافة مهمة ليوم ${dayName}`}
                          className="no-print p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-violet-600 hover:text-white text-slate-600 dark:text-slate-300 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      {dayTasks.length === 0 ? (
                        <button
                          type="button"
                          onClick={() => openAddModal(dayIdx)}
                          className="w-full py-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-400 hover:border-violet-500 hover:text-violet-500 transition-colors"
                        >
                          + أضف مهمة
                        </button>
                      ) : (
                        <div className="space-y-2">
                          {dayTasks.map((t) => (
                            <div
                              key={t.id}
                              className={`p-2.5 rounded-xl border text-xs space-y-1 transition-colors ${
                                t.completed
                                  ? 'bg-slate-50 dark:bg-slate-950/40 border-slate-200/70 dark:border-slate-800 opacity-60'
                                  : 'bg-slate-50/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleToggleComplete(t.id)}
                                  className="mt-0.5 shrink-0"
                                >
                                  {t.completed ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                  ) : (
                                    <Circle className="w-4 h-4 text-slate-400 hover:text-violet-500" />
                                  )}
                                </button>
                                <div className="min-w-0 flex-1">
                                  <div
                                    className={`font-black leading-snug break-words ${
                                      t.completed
                                        ? 'line-through text-slate-500'
                                        : 'text-slate-900 dark:text-white'
                                    }`}
                                  >
                                    {t.title}
                                  </div>
                                  <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                                    {t.time} · {t.duration} د
                                    {t.subject ? ` · ${t.subject}` : ''}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveDay(dayIdx);
                        setViewMode('day');
                      }}
                      className="no-print w-full py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] font-black text-slate-700 dark:text-slate-200 transition-colors"
                    >
                      عرض تفاصيل {dayName}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            /* DETAILED SINGLE DAY VIEW */
            <div id="student-schedule-printable" className="space-y-6">
              {/* Days Selector */}
              <div className="no-print flex overflow-x-auto gap-2 pb-2 scrollbar-hide snap-x">
                {DAYS.map((dayName, index) => {
                  const isToday = index === new Date().getDay();
                  const isActive = index === activeDay;
                  const dayTasksCount = tasks.filter((t) => t.day === index).length;

                  return (
                    <button
                      key={dayName}
                      type="button"
                      onClick={() => setActiveDay(index)}
                      className={`shrink-0 px-5 py-3.5 rounded-2xl font-black text-sm transition-all snap-center flex flex-col items-center gap-1 min-w-[96px] ${
                        isActive
                          ? 'bg-violet-600 text-white shadow-md'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-violet-400'
                      }`}
                    >
                      <span>{dayName}</span>
                      <div className="flex items-center gap-1.5 text-[11px] tabular-nums">
                        {isToday && (
                          <span className={isActive ? 'text-violet-200' : 'text-emerald-600'}>
                            اليوم
                          </span>
                        )}
                        {dayTasksCount > 0 && (
                          <span className={isActive ? 'text-white/80' : 'text-slate-400'}>
                            {isToday ? `· ${dayTasksCount}` : `${dayTasksCount} مهام`}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Day Progress Card + Copy Day Plan */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col lg:flex-row lg:items-center gap-6">
                <div className="flex-1 w-full space-y-3">
                  <div className="flex flex-wrap justify-between items-end gap-2">
                    <div>
                      <h3 className="font-black text-lg text-slate-900 dark:text-white">
                        خطة يوم {DAYS[activeDay]}
                      </h3>
                      <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 tabular-nums">
                        تم إنجاز {completedTasksCount} من {activeDayAllTasks.length} مهام · إجمالي الوقت {activeDayTotalMinutes} دقيقة
                      </p>
                    </div>
                    <span className="text-3xl font-black text-violet-600 dark:text-violet-400 tabular-nums">
                      {progressPercentage}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercentage}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className="bg-violet-600 h-full rounded-full"
                    />
                  </div>
                </div>

                <div className="no-print flex flex-wrap items-center gap-2 shrink-0">
                  {activeDayAllTasks.length > 0 && (
                    <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2">
                      <Copy className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <select
                        value={copyTargetDay}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val !== '') handleCopyDayTasks(Number(val));
                        }}
                        aria-label="نسخ مهام اليوم إلى يوم آخر"
                        className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none"
                      >
                        <option value="">نسخ اليوم إلى...</option>
                        {DAYS.map(
                          (d, idx) =>
                            idx !== activeDay && (
                              <option key={d} value={idx}>
                                {d}
                              </option>
                            )
                        )}
                      </select>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => openAddModal(activeDay)}
                    className="py-2.5 px-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity text-xs whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة ليوم {DAYS[activeDay]}</span>
                  </button>
                </div>
              </div>

              {/* Tasks List */}
              <div className="space-y-3.5">
                {activeDayTasks.length === 0 ? (
                  <div className="text-center py-14 px-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-violet-500/10 text-violet-500 flex items-center justify-center mx-auto">
                      <CalendarDays className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-slate-900 dark:text-white font-black text-base">
                        {activeDayAllTasks.length === 0
                          ? `لا توجد مهام مسجلة ليوم ${DAYS[activeDay]}`
                          : 'لا توجد مهام تطابق الفلتر المحدد'}
                      </p>
                      <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 max-w-sm mx-auto">
                        أضف جلسات المذاكرة وحدد وقتها لتبدأ التركيز وتتبع إنجازك اليومي.
                      </p>
                    </div>
                    {activeDayAllTasks.length === 0 && (
                      <button
                        type="button"
                        onClick={() => openAddModal(activeDay)}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-black text-xs transition-transform active:scale-95"
                      >
                        <Plus className="w-4 h-4" />
                        <span>إضافة أول مهمة لهذا اليوم</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <AnimatePresence>
                    {activeDayTasks.map((task) => {
                      const endTime = minutesToTime(
                        timeToMinutes(task.time) + (Number(task.duration) || 45)
                      );
                      const catLabel =
                        TASK_CATEGORIES.find((c) => c.id === task.category)?.label ||
                        'مذاكرة درس';

                      return (
                        <motion.div
                          key={task.id}
                          layout
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.96 }}
                          className={`p-5 rounded-3xl border transition-all duration-200 space-y-3 ${
                            task.completed
                              ? 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-65'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-violet-400/70'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-start gap-3.5 flex-1 min-w-0">
                              <button
                                type="button"
                                onClick={() => handleToggleComplete(task.id)}
                                title={task.completed ? 'إلغاء الإنجاز' : 'تحديد كمكتمل'}
                                className={`mt-0.5 shrink-0 transition-colors ${
                                  task.completed
                                    ? 'text-emerald-500'
                                    : 'text-slate-300 dark:text-slate-600 hover:text-violet-500'
                                }`}
                              >
                                {task.completed ? (
                                  <CheckCircle2 className="w-6 h-6" />
                                ) : (
                                  <Circle className="w-6 h-6" />
                                )}
                              </button>

                              <div className="space-y-1.5 min-w-0 flex-1">
                                <h3
                                  className={`font-black text-sm sm:text-base leading-snug break-words ${
                                    task.completed
                                      ? 'text-slate-500 line-through'
                                      : 'text-slate-900 dark:text-white'
                                  }`}
                                >
                                  {task.title}
                                </h3>

                                {/* Unboxed Tabular Metadata */}
                                <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 tabular-nums">
                                  <span className="inline-flex items-center gap-1 text-violet-600 dark:text-violet-400">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>
                                      {task.time} – {endTime}
                                    </span>
                                  </span>
                                  <span aria-hidden="true">·</span>
                                  <span>{task.duration} دقيقة</span>
                                  {task.subject && (
                                    <>
                                      <span aria-hidden="true">·</span>
                                      <span>{task.subject}</span>
                                    </>
                                  )}
                                  <span aria-hidden="true">·</span>
                                  <span>{catLabel}</span>
                                  {task.priority === 'high' && (
                                    <>
                                      <span aria-hidden="true">·</span>
                                      <span className="text-rose-600 dark:text-rose-400">
                                        أولوية عالية
                                      </span>
                                    </>
                                  )}
                                </div>

                                {task.notes && (
                                  <div className="mt-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs leading-relaxed text-slate-600 dark:text-slate-300 max-w-2xl">
                                    <RichContentViewer content={task.notes} />
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="no-print flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                              {!task.completed && (
                                <button
                                  type="button"
                                  onClick={() => startFocusForTask(task)}
                                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 transition-colors whitespace-nowrap"
                                >
                                  <Play className="w-3 h-3" />
                                  <span>ابدأ</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() =>
                                  setMovingTaskId((prev) =>
                                    prev === task.id ? null : task.id
                                  )
                                }
                                title="نقل ليوم آخر"
                                className="p-2 text-slate-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-950/40 rounded-xl transition-colors"
                              >
                                <ArrowLeftRight className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => openEditModal(task)}
                                title="تعديل المهمة"
                                className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl transition-colors"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => requestDeleteTask(task)}
                                title="حذف المهمة"
                                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Inline Move Task Day Picker */}
                          {movingTaskId === task.id && (
                            <div className="no-print pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-1.5">
                              <span className="text-[11px] font-bold text-slate-500 ml-1">
                                نقل المهمة إلى يوم:
                              </span>
                              {DAYS.map(
                                (d, i) =>
                                  i !== task.day && (
                                    <button
                                      key={d}
                                      type="button"
                                      onClick={() => handleMoveTaskToDay(task.id, i)}
                                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-violet-600 hover:text-white text-[11px] font-bold text-slate-700 dark:text-slate-200 transition-colors"
                                    >
                                      {d}
                                    </button>
                                  )
                              )}
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                )}
              </div>
            </div>
          )}

          {/* Reset Week Progress Confirmation Modal */}
          {isResetWeekModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
              <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  تصفير علامات الإنجاز للأسبوع الجديد
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  سيتم الاحتفاظ بجميع مهامك ومواعيدها كما هي، مع إعادة تعيين حالتها إلى «غير مكتملة» لتبدأ أسبوعاً جديداً بجدولك الجاهز.
                </p>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsResetWeekModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={handleResetWeekProgress}
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black"
                  >
                    نعم، بدء أسبوع جديد
                  </button>
                </div>
              </div>
            </div>
          )}

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
      )}
    </div>
  );
}
