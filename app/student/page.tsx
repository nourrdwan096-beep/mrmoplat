'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { fetchAllCourses, CourseData, fetchStudentEnrolledCourseIds } from '@/lib/academicService';
import { supabase } from '@/lib/supabaseClient';
import CourseCard from '@/components/CourseCard';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  TrendingUp, 
  Wallet, 
  CalendarDays,
  ArrowLeft,
  Video,
  Award,
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Clock,
  Flame,
  CheckCircle2,
  KeyRound,
  FileEdit,
  Headphones,
  Bell,
  ChevronLeft,
  Quote,
  Target,
  Zap
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface StudentStats {
  completedLectures: number;
  completedExams: number;
  todayTasksCount: number;
  averageScore: number;
}

interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

const MR_RADWAN_TIPS = [
  'حفظ الكلمات داخل سياق وجمل (Collocations) يضمن لك الدرجة النهائية في سؤال الترجمة والمقال.',
  'الممارسة اليومية لقواعد الأزمنة (Tenses) تجعل الحل في الامتحان تلقائياً وبدون أي تردد.',
  'اقرأ قطعة الفهم (Comprehension) قراءة سريعة أولاً، ثم اقرأ الأسئلة، ثم ارجع وابحث عن الإجابة بدقة.',
  'دائماً راجع مفردات المشتقات (Prefixes & Suffixes)، فهي مفتاح حل الأسئلة المتقدمة للمتفوقين.',
  'التفوق مش صدفة، الاستمرار في حل الواجب والامتحان بوقته هو اللي هيوصلك لأعلى كلية بإذن الله.'
];

export default function StudentDashboardPage() {
  const { currentUser } = useAuth();
  const [greeting, setGreeting] = useState('');
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StudentStats>({
    completedLectures: 0,
    completedExams: 0,
    todayTasksCount: 0,
    averageScore: 0,
  });
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [tipOfTheDay, setTipOfTheDay] = useState('');

  // -------------------------------------------------------------------
  // Focus Pomodoro 2030 State & Audio Synthesizer
  // -------------------------------------------------------------------
  const [focusSeconds, setFocusSeconds] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isAmbientSoundOn, setIsAmbientSoundOn] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const ambientOscRef = useRef<OscillatorNode | null>(null);
  const ambientGainRef = useRef<GainNode | null>(null);

  // Greeting & Tip calculation
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('صباح الخير والهمة');
    else if (hour < 17) setGreeting('مساء الخير والتفوق');
    else setGreeting('مساء الإنجاز والتركيز');

    // Pick tip of the day based on day of month
    const day = new Date().getDate();
    setTipOfTheDay(MR_RADWAN_TIPS[day % MR_RADWAN_TIPS.length]);
  }, []);

  // Load Enrolled Courses, Real Progress Stats & Announcements
  useEffect(() => {
    async function loadDashboardData() {
      if (!currentUser?.id) return;
      try {
        setLoading(true);

        // 1. Enrolled Courses
        const enrolledIds = await fetchStudentEnrolledCourseIds(currentUser.id, currentUser.email);
        const allCourses = await fetchAllCourses();
        const myCourses = allCourses.filter((c) => enrolledIds.includes(c.id));
        setCourses(myCourses);

        // 2. Real Student Progress Stats
        try {
          const { data: progressList } = await supabase
            .from('student_item_progress')
            .select('id, status, highest_score, is_passed, unit_items(item_type)')
            .eq('student_id', currentUser.id);

          if (progressList && progressList.length > 0) {
            let lectures = 0;
            let exams = 0;
            let totalScores = 0;
            let scoreCount = 0;

            progressList.forEach((p: any) => {
              const itemType = p.unit_items?.item_type;
              if (itemType === 'video' && (p.status === 'completed' || p.is_passed)) {
                lectures++;
              } else if ((itemType === 'exam' || itemType === 'homework') && (p.status === 'completed' || p.is_passed || p.highest_score > 0)) {
                exams++;
              }

              if (p.highest_score !== null && p.highest_score !== undefined && Number(p.highest_score) > 0) {
                totalScores += Number(p.highest_score);
                scoreCount++;
              }
            });

            const avg = scoreCount > 0 ? Math.round(totalScores / scoreCount) : 0;
            setStats(prev => ({
              ...prev,
              completedLectures: lectures,
              completedExams: exams,
              averageScore: avg
            }));
          }
        } catch (progErr) {
          console.warn('Failed to load item progress:', progErr);
        }

        // 3. Today's Study Tasks
        try {
          const currentDayOfWeek = new Date().getDay(); // 0 = Sunday, 6 = Saturday
          const { data: tasks } = await supabase
            .from('student_study_schedules')
            .select('id')
            .eq('student_id', currentUser.id)
            .eq('day_of_week', currentDayOfWeek);

          if (tasks) {
            setStats(prev => ({ ...prev, todayTasksCount: tasks.length }));
          }
        } catch (taskErr) {
          console.warn('Failed to load today schedule:', taskErr);
        }

        // 4. Live Announcements
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
  }, [currentUser?.id, currentUser?.email]);

  // -------------------------------------------------------------------
  // Timer Countdown Logic
  // -------------------------------------------------------------------
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
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isTimerRunning, focusSeconds]);

  // Audio effects for Pomodoro
  const playCompletionAlert = () => {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.15); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.3); // G5
      osc.frequency.setValueAtTime(1046.50, now + 0.45); // C6
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.9);
    } catch {}
  };

  const toggleAmbientSound = () => {
    if (isAmbientSoundOn) {
      stopAmbientSound();
    } else {
      startAmbientSound();
    }
  };

  const startAmbientSound = () => {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(196, ctx.currentTime); // Relaxing G3 Alpha ambient tone
      gain.gain.setValueAtTime(0.02, ctx.currentTime);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      ambientOscRef.current = osc;
      ambientGainRef.current = gain;
      setIsAmbientSoundOn(true);
    } catch {}
  };

  const stopAmbientSound = () => {
    try {
      if (ambientOscRef.current) {
        ambientOscRef.current.stop();
        ambientOscRef.current.disconnect();
        ambientOscRef.current = null;
      }
      setIsAmbientSoundOn(false);
    } catch {}
  };

  const handleResetTimer = () => {
    setIsTimerRunning(false);
    stopAmbientSound();
    setFocusSeconds(25 * 60);
  };

  const formatTimerTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Day streak data for current week
  const weekDays = [
    { name: 'السبت', short: 'سبت', index: 6 },
    { name: 'الأحد', short: 'أحد', index: 0 },
    { name: 'الإثنين', short: 'إثن', index: 1 },
    { name: 'الثلاثاء', short: 'ثلا', index: 2 },
    { name: 'الأربعاء', short: 'أرب', index: 3 },
    { name: 'الخميس', short: 'خمي', index: 4 },
    { name: 'الجمعة', short: 'جمع', index: 5 },
  ];
  const todayDayIndex = new Date().getDay();

  const mostRecentCourse = courses.length > 0 ? courses[0] : null;

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto selection:bg-emerald-500 selection:text-white font-sans" style={{ direction: 'rtl' }}>
      
      {/* 1. Live Announcements Ticker Banner */}
      {announcements.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white p-3 sm:p-3.5 shadow-lg shadow-emerald-500/15 border border-emerald-400/30 flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2.5 shrink-0">
            <span className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white font-black text-xs shadow-inner">
              <Zap className="w-4 h-4 text-amber-300 animate-pulse" />
            </span>
            <span className="text-xs font-black bg-white/10 px-2 py-0.5 rounded-md hidden sm:inline-block">
              تنبيه وإعلان هام
            </span>
          </div>

          <div className="min-w-0 flex-1 text-xs sm:text-sm font-bold truncate">
            <span className="text-amber-200 ml-1.5 font-black">[{announcements[0].title}]:</span>
            <span>{announcements[0].content}</span>
          </div>

          <Link
            href="/student/messages"
            className="text-[11px] font-black shrink-0 px-3 py-1 rounded-xl bg-white/15 hover:bg-white/25 transition-all text-white flex items-center gap-1 active:scale-95"
          >
            التفاصيل <ChevronLeft className="w-3.5 h-3.5" />
          </Link>
        </motion.div>
      )}

      {/* 2. Welcome Header with Wallet & Profile Badge */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 text-xs font-black flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-500" />
              دفعة المتفوقين 2026
            </span>
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
              {currentUser?.stage || 'المرحلة الثانوية'} {currentUser?.grade ? `- الصف ${currentUser.grade} ثانوي` : ''}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">
            {greeting}، {currentUser?.fullName?.split(' ')[0]} 👋
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-xs sm:text-sm mt-1">
            رحلتك للتفوق والدرجة النهائية في اللغة الإنجليزية مع مستر محمد رضوان تبدأ هنا.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 px-5 py-3 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 font-bold mb-0.5">رصيد المحفظة</p>
              <p className="text-lg font-black text-emerald-700 dark:text-emerald-300 leading-none">
                {currentUser?.walletBalance || '0.00'} <span className="text-xs font-bold">ج.م</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Futuristic 2030 Smart Resume Learning Hero Banner */}
      {mostRecentCourse && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 text-white p-6 sm:p-8 border border-emerald-500/30 shadow-2xl shadow-emerald-950/30"
        >
          {/* Subtle Ambient Background Orbs */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-black">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>محطة المذاكرة الذكية | جاهز للاستكمال</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
                {mostRecentCourse.title}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
                {mostRecentCourse.description ? mostRecentCourse.description.slice(0, 120) + '...' : 'تابع دروسك وشروحاتك المسجلة وحل الاختبارات الدورية لتحقيق أعلى المستويات.'}
              </p>

              {/* Course Progress Bar */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs font-black text-emerald-400">
                  <span>نسبة الإنجاز في الكورس</span>
                  <span>{stats.completedLectures > 0 ? `${Math.min(stats.completedLectures * 15, 100)}%` : 'قيد التقدم 🚀'}</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-800 border border-slate-700 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-700"
                    style={{ width: `${Math.max(stats.completedLectures * 15, 20)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
              <Link 
                href={`/student/study/${mostRecentCourse.id}`}
                className="px-7 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm shadow-xl shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all flex items-center justify-center gap-2 active:scale-95 group"
              >
                <Play className="w-4 h-4 fill-white group-hover:scale-110 transition-transform" />
                <span>استكمال المذاكرة الآن 🚀</span>
              </Link>
              <Link 
                href="/student/schedule"
                className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10 font-bold text-xs transition-all text-center"
              >
                مراجعة خطة المذاكرة
              </Link>
            </div>
          </div>
        </motion.div>
      )}

      {/* 4. Live Stats Grid (Connected to Real Progress) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="group bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-blue-500/30 transition-all flex flex-col justify-between">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-500 mb-4 group-hover:scale-110 transition-transform">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-3xl font-black text-slate-900 dark:text-white mb-1">{courses.length}</p>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">كورساتي المشترك بها</p>
          </div>
        </div>

        <div className="group bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-emerald-500/30 transition-all flex flex-col justify-between">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-4 group-hover:scale-110 transition-transform">
            <Video className="w-6 h-6" />
          </div>
          <div>
            <p className="text-3xl font-black text-slate-900 dark:text-white mb-1">{stats.completedLectures}</p>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">محاضرات وشروحات مكتملة</p>
          </div>
        </div>

        <div className="group bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-amber-500/30 transition-all flex flex-col justify-between">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-500 mb-4 group-hover:scale-110 transition-transform">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-3xl font-black text-slate-900 dark:text-white mb-1">{stats.completedExams}</p>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">امتحانات تم اجتيازها</p>
          </div>
        </div>

        <div className="group bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-violet-500/30 transition-all flex flex-col justify-between">
          <div className="w-12 h-12 rounded-2xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center text-violet-500 mb-4 group-hover:scale-110 transition-transform">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <p className="text-3xl font-black text-slate-900 dark:text-white mb-1">{stats.todayTasksCount}</p>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">مهام جدول اليوم</p>
          </div>
        </div>
      </div>

      {/* 5. Quick Actions Hub (مصفوفة الخدمات السريعة) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <Link 
          href="/student/courses" 
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/40 hover:shadow-md transition-all flex items-center gap-3 group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <KeyRound className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">تفعيل كود كورس</h4>
            <p className="text-[11px] text-slate-400 truncate">شحن وشراء فوري</p>
          </div>
        </Link>

        <Link 
          href="/student/schedule" 
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-violet-500/40 hover:shadow-md transition-all flex items-center gap-3 group"
        >
          <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">جدول المذاكرة</h4>
            <p className="text-[11px] text-slate-400 truncate">تنظيم حصصك ومهامك</p>
          </div>
        </Link>

        <Link 
          href="/student/notes" 
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-500/40 hover:shadow-md transition-all flex items-center gap-3 group"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <FileEdit className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">كشكول الملاحظات</h4>
            <p className="text-[11px] text-slate-400 truncate">الاسكتش والتسجيل الذكي</p>
          </div>
        </Link>

        <Link 
          href="/student/support" 
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-rose-500/40 hover:shadow-md transition-all flex items-center gap-3 group"
        >
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <Headphones className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">اسأل مستر رضوان</h4>
            <p className="text-[11px] text-slate-400 truncate">دعم أكاديمي وفني فوري</p>
          </div>
        </Link>
      </div>

      {/* 6. Main Content Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column (Courses & Learning Stream) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Quick Access Courses */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                </div>
                الكورسات والمناهج المسجلة لك
              </h2>
              <Link 
                href="/student/courses" 
                className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 px-4 py-2 rounded-xl transition-colors"
              >
                تصفح الكل <ArrowLeft className="w-4 h-4" />
              </Link>
            </div>
            
            {loading ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-12 text-center flex justify-center items-center">
                 <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : courses.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-12 text-center shadow-sm">
                <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-400">
                  <BookOpen className="w-10 h-10" />
                </div>
                <h3 className="text-xl text-slate-900 dark:text-white font-black mb-3">لا توجد كورسات مفعلة حالياً</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm mx-auto leading-relaxed text-sm">
                  لم تقم بتفعيل أي كورس حتى الآن. يمكنك استعراض الكورسات وشحن الأكواد لتنطلق فوراً في رحلة التميز.
                </p>
                <Link 
                  href="/student/courses" 
                  className="inline-flex items-center justify-center px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white text-base font-black rounded-2xl shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all hover:-translate-y-1"
                >
                  تصفح وشراء الكورسات المتاحة
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {courses.map(c => (
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

          {/* Mr. Radwan's Tip of the Day Box */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-slate-100 dark:to-slate-900 border border-emerald-500/20 relative overflow-hidden">
            <Quote className="w-16 h-16 text-emerald-500/10 absolute -left-2 -bottom-2 pointer-events-none" />
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-black text-emerald-700 dark:text-emerald-400">
                  توجيهات ووصايا مستر محمد رضوان للمتفوقين 💡
                </h4>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-relaxed">
                  &ldquo;{tipOfTheDay}&rdquo;
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column (Widgets, Focus Pomodoro & 7-Day Activity) */}
        <div className="space-y-6">
          
          {/* Widget 1: Focus Study Pomodoro 2030 */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">مؤقت المذاكرة والتركيز</h3>
                  <p className="text-[10px] text-slate-400 font-bold">جلسة 25 دقيقة (بومودورو)</p>
                </div>
              </div>

              <button
                onClick={toggleAmbientSound}
                title={isAmbientSoundOn ? 'كتم الصوت الذهني' : 'تشغيل ترددات التركيز'}
                className={`p-2 rounded-xl text-xs font-black transition-all ${
                  isAmbientSoundOn 
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600'
                }`}
              >
                {isAmbientSoundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
            </div>

            {/* Timer Display */}
            <div className="my-6 text-center">
              <div className="inline-block relative">
                <span className="text-5xl font-black tracking-tight text-slate-900 dark:text-white font-mono">
                  {formatTimerTime(focusSeconds)}
                </span>
                {isTimerRunning && (
                  <span className="absolute -top-1 -right-3 w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold mt-2">
                {isTimerRunning ? 'الجلسة جارية، ركز على هدفك 🎯' : 'جاهز لبدء جلسة مذاكرة نقية؟'}
              </p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className={`flex-1 py-3 px-4 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 shadow-md active:scale-95 ${
                  isTimerRunning
                    ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
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
                    <span>بدء التركيز</span>
                  </>
                )}
              </button>

              <button
                onClick={handleResetTimer}
                title="إعادة التعيين"
                className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </section>

          {/* Widget 2: Weekly Streak & Discipline Radar */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">نشاط الأسبوع الدراسي</h3>
                  <p className="text-[10px] text-slate-400 font-bold">الالتزام هو سر التفوق</p>
                </div>
              </div>
              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md">
                مستمر 🔥
              </span>
            </div>

            {/* Days of the week row */}
            <div className="grid grid-cols-7 gap-1.5 py-3">
              {weekDays.map((day) => {
                const isToday = day.index === todayDayIndex;
                const isPassed = day.index <= todayDayIndex;
                return (
                  <div key={day.name} className="flex flex-col items-center gap-1.5">
                    <div 
                      className={`
                        w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black transition-all
                        ${isToday 
                          ? 'bg-emerald-500 text-white ring-2 ring-emerald-500/30 shadow-md shadow-emerald-500/30' 
                          : isPassed 
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' 
                          : 'bg-slate-100 dark:bg-slate-800/60 text-slate-400'}
                      `}
                    >
                      {isPassed ? <CheckCircle2 className="w-4 h-4" /> : '•'}
                    </div>
                    <span className={`text-[10px] font-bold ${isToday ? 'text-emerald-600 dark:text-emerald-400 font-black' : 'text-slate-400'}`}>
                      {day.short}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Widget 3: Today's Schedule Snapshot */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-violet-500 to-fuchsia-500" />
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500">
                  <CalendarDays className="w-4 h-4" />
                </div>
                <span>جدول مذاكرة اليوم</span>
              </h3>
              <Link 
                href="/student/schedule"
                className="text-[11px] font-black text-violet-600 dark:text-violet-400 hover:underline"
              >
                إدارة الجدول
              </Link>
            </div>
            
            <div className="text-center py-6 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-3">
                {stats.todayTasksCount > 0 
                  ? `لديك ${stats.todayTasksCount} مهام مجدولة اليوم في خطتك.` 
                  : 'ليس لديك أي مهام مجدولة لليوم.'}
              </p>
              <Link 
                href="/student/schedule"
                className="inline-flex items-center justify-center px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-black text-violet-600 dark:text-violet-400 hover:border-violet-500/50 hover:bg-violet-50 dark:hover:bg-violet-500/10 rounded-xl transition-all shadow-sm"
              >
                + إضافة مهمة للجدول
              </Link>
            </div>
          </section>

        </div>
      </div>

    </div>
  );
}
