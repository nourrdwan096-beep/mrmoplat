'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { fetchAllCourses, CourseData, fetchStudentEnrolledCourseIds } from '@/lib/academicService';
import { supabase } from '@/lib/supabaseClient';
import CourseCard from '@/components/CourseCard';
import { MindMapDocument } from '@/components/student/mindMapCatalog';
import { motion } from 'motion/react';
import {
  BookOpen,
  TrendingUp,
  Wallet,
  CalendarDays,
  ArrowLeft,
  Video,
  Award,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Clock,
  Flame,
  CheckCircle2,
  Circle,
  KeyRound,
  FileEdit,
  Headphones,
  ChevronLeft,
  Quote,
  PenTool,
  Bell,
  Layers,
} from 'lucide-react';
import Link from 'next/link';

interface StudentStats {
  completedLectures: number;
  completedExams: number;
  averageScore: number;
}

interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

interface ScheduleTaskItem {
  id: string;
  title: string;
  time: string;
  duration: number;
  completed: boolean;
  day: number;
}

const MR_RADWAN_TIPS = [
  'حفظ الكلمات داخل سياق وجمل (Collocations) يضمن لك الدرجة النهائية في سؤال الترجمة والمقال.',
  'الممارسة اليومية لقواعد الأزمنة (Tenses) تجعل الحل في الامتحان تلقائياً وبدون أي تردد.',
  'اقرأ قطعة الفهم (Comprehension) قراءة سريعة أولاً، ثم اقرأ الأسئلة، ثم ارجع وابحث عن الإجابة بدقة.',
  'دائماً راجع مفردات المشتقات (Prefixes & Suffixes)، فهي مفتاح حل الأسئلة المتقدمة للمتفوقين.',
  'التفوق مش صدفة، الاستمرار في حل الواجب والامتحان بوقته هو اللي هيوصلك لأعلى كلية بإذن الله.',
];

const ARABIC_DAYS_SHORT: Record<number, string> = {
  0: 'أحد',
  1: 'إثن',
  2: 'ثلا',
  3: 'أرب',
  4: 'خمي',
  5: 'جمع',
  6: 'سبت',
};

export default function StudentDashboardPage() {
  const { currentUser } = useAuth();
  const userId = currentUser?.id || '';

  const [greeting, setGreeting] = useState('أهلاً بك');
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StudentStats>({
    completedLectures: 0,
    completedExams: 0,
    averageScore: 0,
  });
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [tipOfTheDay, setTipOfTheDay] = useState('');

  // Local student workspace state (Mind Maps, Today's Schedule, Study Activity Streak)
  const [savedMaps, setSavedMaps] = useState<MindMapDocument[]>([]);
  const [todayTasks, setTodayTasks] = useState<ScheduleTaskItem[]>([]);
  const [activityDates, setActivityDates] = useState<string[]>([]);
  const [completedFocusSessions, setCompletedFocusSessions] = useState<number>(0);

  // Focus Pomodoro State & Audio Synthesizer
  const [focusPresetMinutes, setFocusPresetMinutes] = useState<number>(25);
  const [focusSeconds, setFocusSeconds] = useState<number>(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isAmbientSoundOn, setIsAmbientSoundOn] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const ambientOscRef = useRef<OscillatorNode | null>(null);
  const ambientGainRef = useRef<GainNode | null>(null);

  const stopAmbientSound = useCallback(() => {
    try {
      if (ambientOscRef.current) {
        ambientOscRef.current.stop();
        ambientOscRef.current.disconnect();
        ambientOscRef.current = null;
      }
      if (ambientGainRef.current) {
        ambientGainRef.current.disconnect();
        ambientGainRef.current = null;
      }
      setIsAmbientSoundOn(false);
    } catch {}
  }, []);

  // Cleanup Web Audio on unmount to prevent lingering hum
  useEffect(() => {
    return () => {
      stopAmbientSound();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [stopAmbientSound]);

  // Greeting & Tip calculation
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('صباح الخير والهمة');
    else if (hour < 17) setGreeting('مساء الخير والتفوق');
    else setGreeting('مساء الإنجاز والتركيز');

    const day = new Date().getDate();
    setTipOfTheDay(MR_RADWAN_TIPS[day % MR_RADWAN_TIPS.length]);
  }, []);

  const recordTodayActivity = useCallback(() => {
    if (!userId) return;
    try {
      const actKey = `mr_radwan_study_activity_${userId}`;
      const raw = localStorage.getItem(actKey);
      const parsed: string[] = raw ? JSON.parse(raw) : [];
      const todayIso = new Date().toISOString().slice(0, 10);
      if (Array.isArray(parsed) && !parsed.includes(todayIso)) {
        const next = [...parsed, todayIso].slice(-60);
        localStorage.setItem(actKey, JSON.stringify(next));
        setActivityDates(next);
      }
    } catch {}
  }, [userId]);

  // Load Local Student Data (Mind Maps, Today's Tasks, Streak Activity, Pomodoro Count)
  useEffect(() => {
    if (!userId) return;
    try {
      // 1. Mind Maps
      const mmRaw = localStorage.getItem(`mr_radwan_mind_maps_v2_${userId}`);
      if (mmRaw) {
        const parsedMaps = JSON.parse(mmRaw);
        if (Array.isArray(parsedMaps)) setSavedMaps(parsedMaps);
      }

      // 2. Today's Schedule Tasks
      const schedRaw = localStorage.getItem(`mr_radwan_student_schedule_${userId}`);
      if (schedRaw) {
        const parsedTasks: ScheduleTaskItem[] = JSON.parse(schedRaw);
        const todayIdx = new Date().getDay();
        if (Array.isArray(parsedTasks)) {
          setTodayTasks(
            parsedTasks
              .filter((t) => t.day === todayIdx)
              .sort((a, b) => a.time.localeCompare(b.time))
          );
        }
      }

      // 3. Activity dates
      const actRaw = localStorage.getItem(`mr_radwan_study_activity_${userId}`);
      if (actRaw) {
        const parsedAct = JSON.parse(actRaw);
        if (Array.isArray(parsedAct)) setActivityDates(parsedAct);
      }

      // 4. Focus Sessions Count
      const pomoRaw = localStorage.getItem(`mr_radwan_pomodoro_count_${userId}`);
      if (pomoRaw) {
        setCompletedFocusSessions(Number(pomoRaw) || 0);
      }
    } catch (e) {
      console.warn('Error hydrating local student workspace:', e);
    }
  }, [userId]);

  // Load Remote Courses, Real Progress Stats & Announcements
  useEffect(() => {
    async function loadDashboardData() {
      if (!userId) return;
      try {
        setLoading(true);

        const enrolledIds = await fetchStudentEnrolledCourseIds(userId, currentUser?.email);
        const allCourses = await fetchAllCourses();
        const myCourses = allCourses.filter((c) => enrolledIds.includes(c.id));
        setCourses(myCourses);

        try {
          const { data: progressList } = await supabase
            .from('student_item_progress')
            .select('id, status, highest_score, is_passed, unit_items(item_type)')
            .eq('student_id', userId);

          if (progressList && progressList.length > 0) {
            let lectures = 0;
            let exams = 0;
            let totalScores = 0;
            let scoreCount = 0;

            progressList.forEach((p: any) => {
              const itemType = p.unit_items?.item_type;
              if (itemType === 'video' && (p.status === 'completed' || p.is_passed)) {
                lectures++;
              } else if (
                (itemType === 'exam' || itemType === 'homework') &&
                (p.status === 'completed' || p.is_passed || p.highest_score > 0)
              ) {
                exams++;
              }

              if (p.highest_score !== null && p.highest_score !== undefined && Number(p.highest_score) > 0) {
                totalScores += Number(p.highest_score);
                scoreCount++;
              }
            });

            const avg = scoreCount > 0 ? Math.round(totalScores / scoreCount) : 0;
            setStats({
              completedLectures: lectures,
              completedExams: exams,
              averageScore: avg,
            });
          }
        } catch (progErr) {
          console.warn('Failed to load item progress:', progErr);
        }

        try {
          const { data: anns } = await supabase
            .from('announcements')
            .select('id, title, content, created_at')
            .eq('is_published', true)
            .order('created_at', { ascending: false })
            .limit(3);

          if (anns) {
            setAnnouncements(anns);
          }
        } catch (annErr) {
          console.warn('Failed to load announcements:', annErr);
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [userId, currentUser?.email]);

  const playCompletionAlert = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.15);
      osc.frequency.setValueAtTime(783.99, now + 0.3);
      osc.frequency.setValueAtTime(1046.5, now + 0.45);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.9);
    } catch {}
  }, []);

  // Timer Countdown Logic
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isTimerRunning && focusSeconds > 0) {
      timer = setInterval(() => {
        setFocusSeconds((prev) => prev - 1);
      }, 1000);
    } else if (focusSeconds === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      stopAmbientSound();
      playCompletionAlert();
      if (userId && focusPresetMinutes >= 15) {
        const nextCount = completedFocusSessions + 1;
        setCompletedFocusSessions(nextCount);
        try {
          localStorage.setItem(`mr_radwan_pomodoro_count_${userId}`, String(nextCount));
        } catch {}
        recordTodayActivity();
      }
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [
    isTimerRunning,
    focusSeconds,
    stopAmbientSound,
    playCompletionAlert,
    userId,
    focusPresetMinutes,
    completedFocusSessions,
    recordTodayActivity,
  ]);

  const toggleAmbientSound = () => {
    if (isAmbientSoundOn) {
      stopAmbientSound();
      return;
    }
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(196, ctx.currentTime);
      gain.gain.setValueAtTime(0.02, ctx.currentTime);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      ambientOscRef.current = osc;
      ambientGainRef.current = gain;
      setIsAmbientSoundOn(true);
    } catch {}
  };

  const selectTimerPreset = (minutes: number) => {
    setIsTimerRunning(false);
    stopAmbientSound();
    setFocusPresetMinutes(minutes);
    setFocusSeconds(minutes * 60);
  };

  const handleResetTimer = () => {
    setIsTimerRunning(false);
    stopAmbientSound();
    setFocusSeconds(focusPresetMinutes * 60);
  };

  const formatTimerTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleTodayTask = (taskId: string) => {
    if (!userId) return;
    try {
      const schedKey = `mr_radwan_student_schedule_${userId}`;
      const raw = localStorage.getItem(schedKey);
      if (!raw) return;
      const allTasks: ScheduleTaskItem[] = JSON.parse(raw);
      const updated = allTasks.map((t) =>
        t.id === taskId ? { ...t, completed: !t.completed } : t
      );
      localStorage.setItem(schedKey, JSON.stringify(updated));
      const todayIdx = new Date().getDay();
      setTodayTasks(
        updated
          .filter((t) => t.day === todayIdx)
          .sort((a, b) => a.time.localeCompare(b.time))
      );
      recordTodayActivity();
    } catch {}
  };

  // Real last 7 calendar days for activity strip
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const iso = d.toISOString().slice(0, 10);
    return {
      iso,
      shortName: ARABIC_DAYS_SHORT[d.getDay()],
      isToday: i === 6,
      isActive: activityDates.includes(iso),
    };
  });

  const stageLabel =
    currentUser?.stage === 'high'
      ? 'المرحلة الثانوية'
      : currentUser?.stage === 'middle'
      ? 'المرحلة الإعدادية'
      : 'المرحلة الدراسية';

  const mostRecentCourse = courses.length > 0 ? courses[0] : null;
  const primaryMindMap = savedMaps.length > 0 ? savedMaps[0] : null;
  const mindMapSubjectsCount = primaryMindMap ? primaryMindMap.subjects.length : 0;
  const mindMapTotalItems = primaryMindMap
    ? primaryMindMap.subjects.reduce((acc, s) => acc + s.items.length, 0)
    : 0;
  const mindMapDoneItems = primaryMindMap
    ? primaryMindMap.subjects.reduce(
        (acc, s) => acc + s.items.filter((i) => i.completed).length,
        0
      )
    : 0;

  return (
    <div
      className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto selection:bg-emerald-500 selection:text-white"
      dir="rtl"
    >
      {/* 1. Live Announcements Bar */}
      {announcements.length > 0 && (
        <div className="rounded-2xl bg-slate-900 dark:bg-slate-800 text-white px-4 py-3 border border-slate-800 dark:border-slate-700 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Bell className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="text-xs sm:text-sm font-bold truncate">
              <span className="text-emerald-400 font-black ml-2">{announcements[0].title}:</span>
              <span className="text-slate-200">{announcements[0].content}</span>
            </div>
          </div>
          <Link
            href="/student/messages"
            className="text-xs font-black shrink-0 text-emerald-400 hover:text-emerald-300 flex items-center gap-1 whitespace-nowrap"
          >
            <span>التفاصيل</span>
            <ChevronLeft className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* 2. Editorial Welcome Header (Clean, Zero-Pill Metadata) */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
            <span>{stageLabel}</span>
            {currentUser?.grade && (
              <>
                <span aria-hidden="true">·</span>
                <span>الصف {currentUser.grade === 1 ? 'الأول' : currentUser.grade === 2 ? 'الثاني' : 'الثالث'}</span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span className="text-emerald-600 dark:text-emerald-400">Easy English مع مستر محمد رضوان</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">
            {greeting}، {currentUser?.fullName?.split(' ')[0] || 'يا بطل'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-1">
            مساحتك المتكاملة لمتابعة دروس اللغة الإنجليزية، رسم خرائطك الذهنية، وتنظيم وقت مذاكرتك.
          </p>
        </div>

        <Link
          href="/student/wallet"
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 px-5 py-3 rounded-2xl flex items-center gap-3 transition-colors self-start md:self-auto shrink-0"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">رصيد المحفظة</p>
            <p className="text-lg font-black text-slate-900 dark:text-white tabular-nums leading-tight">
              {currentUser?.walletBalance || '0.00'}{' '}
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">ج.م</span>
            </p>
          </div>
        </Link>
      </div>

      {/* 3. Single Dominant Focal Hero Anchor */}
      {mostRecentCourse ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl bg-slate-900 text-white p-6 sm:p-8 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6"
        >
          <div className="space-y-3 max-w-xl">
            <div className="text-xs font-bold text-emerald-400">
              الكورس النشط حالياً · استكمال التعلم
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white leading-snug">
              {mostRecentCourse.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {mostRecentCourse.description
                ? mostRecentCourse.description.slice(0, 140) + '...'
                : 'تابع محاضرات الشرح، حل الواجبات الدورية، وتقدم في امتحانات التقييم مع مستر محمد رضوان.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 shrink-0">
            <Link
              href={`/student/study/${mostRecentCourse.id}`}
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>استكمال المذاكرة الآن</span>
            </Link>
            <Link
              href="/student/schedule"
              className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 font-bold text-xs transition-colors text-center whitespace-nowrap"
            >
              فتح الخريطة الذهنية
            </Link>
          </div>
        </motion.div>
      ) : (
        <div className="rounded-3xl bg-slate-900 text-white p-6 sm:p-8 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="text-xs font-bold text-emerald-400">ابدأ رحلتك الدراسية</div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              انضم إلى كورسات مستر محمد رضوان أو خطط أسبوعك من الصفر
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              يمكنك تصفح الكورسات المتاحة وتفعيل الأكواد، أو البدء فوراً بتصميم خريطتك الذهنية لجميع موادك الدراسية.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5 shrink-0">
            <Link
              href="/student/courses"
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm transition-colors whitespace-nowrap"
            >
              تصفح الكورسات
            </Link>
            <Link
              href="/student/schedule"
              className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-colors whitespace-nowrap"
            >
              رسم خريطة ذهنية
            </Link>
          </div>
        </div>
      )}

      {/* 4. Live Tabular Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-3">
            <span className="text-xs font-bold">كورساتي</span>
            <BookOpen className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">
            {courses.length}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-3">
            <span className="text-xs font-bold">محاضرات مكتملة</span>
            <Video className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">
            {stats.completedLectures}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-3">
            <span className="text-xs font-bold">امتحانات مجتازة</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">
            {stats.completedExams}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-3">
            <span className="text-xs font-bold">متوسط الدرجات</span>
            <TrendingUp className="w-4 h-4 text-violet-500" />
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">
            {stats.averageScore}%
          </p>
        </div>
      </div>

      {/* 5. Quick Navigation Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <Link
          href="/student/schedule"
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 transition-colors flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <PenTool className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
              الخرائط الذهنية
            </h4>
            <p className="text-[11px] text-slate-500 truncate">تخطيط وتلوين وطباعة</p>
          </div>
        </Link>

        <Link
          href="/student/courses"
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 transition-colors flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
              تفعيل كود كورس
            </h4>
            <p className="text-[11px] text-slate-500 truncate">فتح محتوى الكورسات</p>
          </div>
        </Link>

        <Link
          href="/student/notes"
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-500/50 transition-colors flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <FileEdit className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
              كشكول الملاحظات
            </h4>
            <p className="text-[11px] text-slate-500 truncate">تدوين القواعد والكلمات</p>
          </div>
        </Link>

        <Link
          href="/student/support"
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-rose-500/50 transition-colors flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <Headphones className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
              اسأل مستر رضوان
            </h4>
            <p className="text-[11px] text-slate-500 truncate">دعم أكاديمي وفني</p>
          </div>
        </Link>
      </div>

      {/* 6. Main Workspace Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Mind Map Overview + Enrolled Courses + Teacher Tip */}
        <div className="lg:col-span-2 space-y-8">
          {/* Active Mind Map Workspace Card */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">
                    استوديو الخرائط الذهنية الخاصة بك
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    ارسم خطة موادك من الصفر بخط اليد أو الخط الرسمي ولوّن كلماتك للطباعة
                  </p>
                </div>
              </div>

              <Link
                href="/student/schedule"
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black flex items-center justify-center gap-1.5 whitespace-nowrap self-start sm:self-center"
              >
                <span>فتح الاستوديو</span>
                <ArrowLeft className="w-3.5 h-3.5" />
              </Link>
            </div>

            {primaryMindMap && mindMapSubjectsCount > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                  <span>
                    الخريطة النشطة: <strong className="text-slate-900 dark:text-white">{primaryMindMap.title}</strong>
                  </span>
                  <span className="tabular-nums">
                    {mindMapSubjectsCount} مواد · {mindMapDoneItems}/{mindMapTotalItems} بند مكتمل
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {primaryMindMap.subjects.map((sub) => (
                    <span
                      key={sub.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200"
                    >
                      <span>{sub.emoji}</span>
                      <span>{sub.name}</span>
                      <span className="text-[11px] text-slate-400 tabular-nums">
                        ({sub.items.length})
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl p-4 border border-dashed border-slate-200 dark:border-slate-800">
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  لم تضف مواداً إلى خريطتك الذهنية بعد. اختر مواد شعبتك وابدأ التخطيط بطريقتك الخاصة.
                </div>
                <Link
                  href="/student/schedule"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black whitespace-nowrap self-start sm:self-center"
                >
                  + ابدأ خريطتك من الصفر
                </Link>
              </div>
            )}
          </section>

          {/* Quick Access Courses */}
          <section>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                الكورسات والمناهج المسجلة لك
              </h2>
              <Link
                href="/student/courses"
                className="text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 hover:underline whitespace-nowrap"
              >
                <span>تصفح الكل</span>
                <ArrowLeft className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 flex justify-center items-center">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : courses.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center space-y-4">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
                  <BookOpen className="w-8 h-8" />
                </div>
                <h3 className="text-lg text-slate-900 dark:text-white font-black">
                  لا توجد كورسات مفعلة حالياً
                </h3>
                <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto text-xs sm:text-sm leading-relaxed">
                  يمكنك استعراض الكورسات المتاحة وتفعيل الأكواد المجانية للبدء فوراً في المذاكرة.
                </p>
                <Link
                  href="/student/courses"
                  className="inline-flex items-center justify-center px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-black rounded-xl transition-colors"
                >
                  استعراض الكورسات المتاحة
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {courses.map((c) => (
                  <CourseCard
                    key={c.id}
                    course={c}
                    isEnrolled={true}
                    actionType="student_dashboard"
                  />
                ))}
              </div>
            )}
          </section>

          {/* Mr. Radwan's Tip of the Day */}
          <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 relative overflow-hidden">
            <Quote className="w-12 h-12 text-slate-200 dark:text-slate-800 absolute left-4 bottom-4 pointer-events-none" />
            <div className="relative z-10 space-y-1.5">
              <div className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                توجيه مستر محمد رضوان اليوم
              </div>
              <p className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 leading-relaxed">
                &ldquo;{tipOfTheDay}&rdquo;
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Focus Timer, Real 7-Day Activity & Interactive Today's Tasks */}
        <div className="space-y-6">
          {/* Widget 1: Focus Study Timer with Presets & Session Counter */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    مؤقت التركيز للمذاكرة
                  </h3>
                  <p className="text-[11px] text-slate-500 tabular-nums">
                    جلسات مكتملة: {completedFocusSessions}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={toggleAmbientSound}
                title={isAmbientSoundOn ? 'كتم نغمة التركيز' : 'تشغيل نغمة هدوء للتركيز'}
                className={`p-2 rounded-xl text-xs transition-colors ${
                  isAmbientSoundOn
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                {isAmbientSoundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
            </div>

            {/* Duration Presets */}
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 mb-4">
              {[
                { label: '25 د', mins: 25 },
                { label: '45 د', mins: 45 },
                { label: '5 د راحة', mins: 5 },
              ].map((p) => (
                <button
                  key={p.mins}
                  type="button"
                  onClick={() => selectTimerPreset(p.mins)}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    focusPresetMinutes === p.mins
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Timer Display */}
            <div className="my-5 text-center">
              <span className="text-5xl font-black tracking-tight text-slate-900 dark:text-white font-mono tabular-nums">
                {formatTimerTime(focusSeconds)}
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-2">
                {isTimerRunning ? 'جلسة التركيز قيد التشغيل' : 'اختر المدة واضغط ابدأ'}
              </p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className={`flex-1 py-2.5 px-4 rounded-xl font-black text-xs transition-colors flex items-center justify-center gap-2 ${
                  isTimerRunning
                    ? 'bg-amber-500 hover:bg-amber-600 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {isTimerRunning ? (
                  <>
                    <Pause className="w-4 h-4 fill-white" />
                    <span>إيقاف مؤقت</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>بدء الجلسة</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleResetTimer}
                title="إعادة الضبط"
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </section>

          {/* Widget 2: Real 7-Day Study Activity */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">سجل الالتزام الأسبوعي</h3>
                  <p className="text-[11px] text-slate-500">الأيام التي أنجزت فيها مهامك</p>
                </div>
              </div>
              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                {last7Days.filter((d) => d.isActive).length}/7 أيام
              </span>
            </div>

            <div className="grid grid-cols-7 gap-1.5 pt-2">
              {last7Days.map((day) => (
                <div key={day.iso} className="flex flex-col items-center gap-1.5">
                  <div
                    title={day.iso}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black transition-colors ${
                      day.isActive
                        ? 'bg-emerald-600 text-white'
                        : day.isToday
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-400/50'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                    }`}
                  >
                    {day.isActive ? <CheckCircle2 className="w-4 h-4" /> : '·'}
                  </div>
                  <span
                    className={`text-[10px] font-bold ${
                      day.isToday
                        ? 'text-slate-900 dark:text-white font-black'
                        : 'text-slate-400'
                    }`}
                  >
                    {day.shortName}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Widget 3: Real Interactive Today's Schedule Snapshot */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-400">
                  <CalendarDays className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">مهام جدول اليوم</h3>
              </div>
              <Link
                href="/student/schedule?tab=timetable"
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                إدارة الجدول
              </Link>
            </div>

            {todayTasks.length === 0 ? (
              <div className="text-center py-6 px-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-3">
                  لا توجد مهام مسجلة ليوم اليوم في جدولك الأسبوعي.
                </p>
                <Link
                  href="/student/schedule?tab=timetable"
                  className="inline-flex items-center justify-center px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-900 dark:text-white hover:border-emerald-500 rounded-xl transition-colors"
                >
                  + إضافة مهمة لليوم
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {todayTasks.slice(0, 4).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleToggleTodayTask(t.id)}
                    className="w-full text-right p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between gap-2 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {t.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                      <span
                        className={`text-xs font-bold truncate ${
                          t.completed
                            ? 'line-through text-slate-400'
                            : 'text-slate-800 dark:text-slate-100'
                        }`}
                      >
                        {t.title}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400 tabular-nums shrink-0">
                      {t.time}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
