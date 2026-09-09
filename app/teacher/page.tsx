'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { 
  Users, 
  BookOpen, 
  Wallet, 
  UserPlus, 
  CalendarDays,
  Megaphone,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  KeyRound,
  Plus
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchStudents, StudentProfile } from '@/lib/studentService';
import { fetchAllCourses, CourseData } from '@/lib/academicService';
import { fetchCourseCodes, fetchTeacherNotes, TeacherNoteData, ActivationCodeData } from '@/lib/teacherService';

const DASHBOARD_CARDS = [
  {
    title: 'المحتوى الأكاديمي',
    description: 'إضافة وإدارة الكورسات، الوحدات، الفيديوهات، الواجبات، والامتحانات.',
    icon: BookOpen,
    href: '/teacher/courses',
    color: 'from-blue-500 to-indigo-600',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    iconColor: 'text-blue-600 dark:text-blue-400'
  },
  {
    title: 'إدارة الطلاب',
    description: 'مراجعة طلبات الانضمام، الطلاب المقيدين، والدعم الفني والأكاديمي.',
    icon: Users,
    href: '/teacher/students',
    color: 'from-violet-500 to-purple-600',
    bg: 'bg-violet-50 dark:bg-violet-900/20',
    iconColor: 'text-violet-600 dark:text-violet-400'
  },
  {
    title: 'المساعدين',
    description: 'إضافة مساعدين جدد، وتحديد الصلاحيات المخصصة لكل منهم.',
    icon: UserPlus,
    href: '/teacher/assistants',
    color: 'from-emerald-500 to-teal-600',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    iconColor: 'text-emerald-600 dark:text-emerald-400'
  },
  {
    title: 'الإعلانات',
    description: 'نشر إعلانات تظهر في الصفحة الرئيسية لجميع الطلاب.',
    icon: Megaphone,
    href: '/teacher/announcements',
    color: 'from-orange-500 to-red-600',
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    iconColor: 'text-orange-600 dark:text-orange-400'
  },
  {
    title: 'الملاحظات والجدول',
    description: 'إدارة أفكارك وجدول مواعيدك والمحاضرات بشكل منظم.',
    icon: CalendarDays,
    href: '/teacher/notes',
    color: 'from-amber-500 to-orange-500',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    iconColor: 'text-amber-600 dark:text-amber-400'
  },
  {
    title: 'الإيرادات والأكواد',
    description: 'متابعة الأرباح الحقيقية، الأكواد المباعة، وتوليد أكواد التفعيل.',
    icon: Wallet,
    href: '/teacher/revenue',
    color: 'from-rose-500 to-pink-600',
    bg: 'bg-rose-50 dark:bg-rose-900/20',
    iconColor: 'text-rose-600 dark:text-rose-400'
  }
];

export default function TeacherDashboard() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [codes, setCodes] = useState<ActivationCodeData[]>([]);
  const [notes, setNotes] = useState<TeacherNoteData[]>([]);

  useEffect(() => {
    async function loadDashboardRealData() {
      setLoading(true);
      try {
        const [studentsData, coursesData, codesData, notesData] = await Promise.all([
          fetchStudents(),
          fetchAllCourses(),
          fetchCourseCodes(),
          fetchTeacherNotes()
        ]);
        setStudents(studentsData || []);
        setCourses(coursesData || []);
        setCodes(codesData || []);
        setNotes(notesData || []);
      } catch (err) {
        console.error('Error loading real dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardRealData();
  }, []);

  // Real Calculated Metrics
  const activeStudentsCount = students.filter(s => s.status === 'active').length;
  const pendingStudentsCount = students.filter(s => s.status === 'pending_review').length;
  const publishedCoursesCount = courses.filter(c => c.isPublished).length;
  
  // Calculate real revenue from used codes multiplied by corresponding course price
  const usedCodes = codes.filter(c => c.isUsed);
  const realEarnedRevenue = usedCodes.reduce((sum, c) => {
    const matchedCourse = courses.find(crs => crs.id === c.courseId);
    return sum + (matchedCourse ? Number(matchedCourse.price || 0) : 0);
  }, 0);

  return (
    <div className="space-y-8 pb-10">
      {/* Welcome Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 dark:border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/10 dark:bg-violet-500/20 blur-3xl rounded-full -translate-y-1/2 translate-x-1/3"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 font-bold text-xs mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              لوحة التحكم الرئيسية للمستر
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-2">
              أهلاً بك، مستر محمد رضوان 👋
            </h1>
            <p className="text-slate-600 dark:text-slate-400 font-bold text-sm md:text-base">
              بيانات وإحصائيات حية متصلة بقاعدة البيانات الخاصة بمنصتك التعليمية.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700">
            <Clock className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            <span className="font-bold text-slate-700 dark:text-slate-300 text-xs md:text-sm">
              {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      {/* Pending Students Notification Banner */}
      {pendingStudentsCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 rounded-2xl shrink-0">
              <AlertCircle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h4 className="font-black text-slate-900 dark:text-white text-base">
                يوجد {pendingStudentsCount} طالب في انتظار المراجعة والتفعيل!
              </h4>
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mt-0.5">
                يمكنك مراجعة الهوية وتوليد كلمة السر / OTP وتأكيد انضمامهم للمنصة.
              </p>
            </div>
          </div>
          <Link
            href="/teacher/students"
            className="px-5 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-600/20 transition-all shrink-0"
          >
            <span>مراجعة الطلبات الآن</span>
            <ArrowRight className="w-4 h-4 rotate-180" />
          </Link>
        </motion.div>
      )}

      {/* Quick Stats (100% Real Live Data) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[
          { 
            label: 'إجمالي الطلاب المقيدين (النشطين)', 
            value: loading ? '...' : activeStudentsCount.toLocaleString('en-US'), 
            trend: `${students.length} إجمالي المسجلين`, 
            icon: Users, 
            color: 'text-blue-600',
            bg: 'bg-blue-50 dark:bg-blue-900/20',
            badgeBg: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
          },
          { 
            label: 'طلبات الانضمام قيد المراجعة', 
            value: loading ? '...' : pendingStudentsCount.toString(), 
            trend: pendingStudentsCount > 0 ? 'بحاجة لموافقتك' : 'محدث بالكامل', 
            icon: AlertCircle, 
            color: 'text-orange-600',
            bg: 'bg-orange-50 dark:bg-orange-900/20',
            badgeBg: pendingStudentsCount > 0 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
          },
          { 
            label: 'إجمالي الإيرادات المحققة (الأكواد)', 
            value: loading ? '...' : `EGP ${realEarnedRevenue.toLocaleString('en-US')}`, 
            trend: `${usedCodes.length} كود مستخدم`, 
            icon: Wallet, 
            color: 'text-emerald-600',
            bg: 'bg-emerald-50 dark:bg-emerald-900/20',
            badgeBg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
          },
          { 
            label: 'الكورسات المنشورة والنشطة', 
            value: loading ? '...' : publishedCoursesCount.toString(), 
            trend: `${courses.length} إجمالي الكورسات`, 
            icon: CheckCircle2, 
            color: 'text-violet-600',
            bg: 'bg-violet-50 dark:bg-violet-900/20',
            badgeBg: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'
          },
        ].map((stat, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            key={i} 
            className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <span className={`text-xs font-black px-2.5 py-1 rounded-full ${stat.badgeBg} flex items-center gap-1`}>
                  {stat.trend}
                </span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 font-bold text-xs mb-1">{stat.label}</p>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white" dir="ltr">{stat.value}</h3>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 className="text-sm font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-600" />
          <span>إجراءات سريعة للمعلم</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            href="/teacher/courses"
            className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center gap-2 border border-blue-200/60 dark:border-blue-800/40 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>إنشاء كورس جديد</span>
          </Link>
          <Link
            href="/teacher/revenue"
            className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 text-rose-700 dark:text-rose-300 font-bold text-xs flex items-center justify-center gap-2 border border-rose-200/60 dark:border-rose-800/40 transition-all"
          >
            <KeyRound className="w-4 h-4" />
            <span>توليد أكواد كورس</span>
          </Link>
          <Link
            href="/teacher/students"
            className="p-3.5 rounded-2xl bg-violet-50 dark:bg-violet-950/30 hover:bg-violet-100 text-violet-700 dark:text-violet-300 font-bold text-xs flex items-center justify-center gap-2 border border-violet-200/60 dark:border-violet-800/40 transition-all"
          >
            <Users className="w-4 h-4" />
            <span>مراجعة الطلاب ({pendingStudentsCount})</span>
          </Link>
          <Link
            href="/teacher/notes"
            className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 text-amber-700 dark:text-amber-300 font-bold text-xs flex items-center justify-center gap-2 border border-amber-200/60 dark:border-amber-800/40 transition-all"
          >
            <CalendarDays className="w-4 h-4" />
            <span>الملاحظات والمواعيد</span>
          </Link>
        </div>
      </div>

      {/* Main Modules Grid */}
      <div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">
          أقسام الإدارة الرئيسية
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {DASHBOARD_CARDS.map((card, idx) => (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: idx * 0.05 }}
              key={card.title}
            >
              <Link 
                href={card.href}
                className="group block h-full bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 ${card.bg}`}>
                  <card.icon className={`w-7 h-7 ${card.iconColor}`} />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-3 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                  {card.title}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed font-semibold text-sm">
                  {card.description}
                </p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

