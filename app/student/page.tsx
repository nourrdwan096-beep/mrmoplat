'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { fetchAllCourses, CourseData, fetchStudentEnrolledCourseIds } from '@/lib/academicService';
import CourseCard from '@/components/CourseCard';
import { 
  BookOpen, 
  TrendingUp, 
  Wallet, 
  CalendarDays,
  ArrowLeft,
  Video,
  Award,
  Sparkles,
  HeartHandshake
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function StudentDashboardPage() {
  const { currentUser } = useAuth();
  const [greeting, setGreeting] = useState('');
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      const hour = new Date().getHours();
      if (hour < 12) setGreeting('صباح الخير');
      else if (hour < 18) setGreeting('مساء الخير');
      else setGreeting('مساء الخير');
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    async function loadEnrolledCourses() {
      if (!currentUser?.id) return;
      try {
        const enrolledIds = await fetchStudentEnrolledCourseIds(currentUser.id, currentUser.email);
        const allCourses = await fetchAllCourses();
        const myCourses = allCourses.filter((c) => enrolledIds.includes(c.id));
        setCourses(myCourses);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    loadEnrolledCourses();
  }, [currentUser?.id, currentUser?.email]);

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-2">
            {greeting}، {currentUser?.fullName?.split(' ')[0]} 👋
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm md:text-base">
            مرحباً بك في لوحة التحكم الخاصة بك. إليك نظرة عامة على تقدمك.
          </p>
        </div>
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

      {/* Special Apology & Welcome Notice for Mariam / Affected Students */}
      {currentUser?.email?.toLowerCase().trim() === 'mariamezzeiden74@gmail.com' && (
        <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-emerald-500/15 border-2 border-emerald-500/30 rounded-3xl relative overflow-hidden shadow-lg shadow-emerald-500/5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  تم تسجيل دخولك واعتماد حسابك بنجاح!
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-black">
                  استثناء خاص معتمد
                </span>
              </div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                نأسف جداً للمشاكل والتعطيل السابق، هذا الاعتذار برعاية منصة مستر محمد رضوان 💚 حسابك مفعل ودائم بجميع الكورسات بدون أي تقييد على الأجهزة.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="group bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-blue-500/30 transition-all flex flex-col justify-between">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-500 mb-6 group-hover:scale-110 transition-transform">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-3xl font-black text-slate-900 dark:text-white mb-1">{courses.length}</p>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">كورساتي</p>
          </div>
        </div>
        <div className="group bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-rose-500/30 transition-all flex flex-col justify-between">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-500 mb-6 group-hover:scale-110 transition-transform">
            <Video className="w-6 h-6" />
          </div>
          <div>
            <p className="text-3xl font-black text-slate-900 dark:text-white mb-1">٠</p>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">محاضرات مكتملة</p>
          </div>
        </div>
        <div className="group bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-amber-500/30 transition-all flex flex-col justify-between">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-500 mb-6 group-hover:scale-110 transition-transform">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-3xl font-black text-slate-900 dark:text-white mb-1">٠</p>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">امتحانات تم حلها</p>
          </div>
        </div>
        <div className="group bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-violet-500/30 transition-all flex flex-col justify-between">
          <div className="w-12 h-12 rounded-2xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center text-violet-500 mb-6 group-hover:scale-110 transition-transform">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <p className="text-3xl font-black text-slate-900 dark:text-white mb-1">٠</p>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">مهام المذاكرة</p>
          </div>
        </div>
      </div>

      {/* Main Content Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col (Main content) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Quick Access Courses */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                </div>
                آخر الكورسات التي تتفاعل معها
              </h2>
              <Link 
                href="/student/courses" 
                className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 px-4 py-2 rounded-xl transition-colors"
              >
                عرض الكل <ArrowLeft className="w-4 h-4" />
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
                <h3 className="text-xl text-slate-900 dark:text-white font-black mb-3">لا توجد كورسات حالياً</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm mx-auto leading-relaxed">
                  لم تقم بالاشتراك في أي كورسات حتى الآن، استكشف الكورسات المتاحة وابدأ رحلة التعلم.
                </p>
                <Link 
                  href="/student/courses" 
                  className="inline-flex items-center justify-center px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white text-base font-black rounded-2xl shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all hover:-translate-y-1"
                >
                  تصفح الكورسات المتاحة
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
        </div>

        {/* Right Col (Side widgets) */}
        <div className="space-y-6">
          
          {/* Upcoming Schedule */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-8 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-violet-500 to-fuchsia-500"></div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-violet-500/10 flex items-center justify-center">
                <CalendarDays className="w-4 h-4 text-violet-500" />
              </div>
              جدول المذاكرة لليوم
            </h3>
            
            <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-5">ليس لديك أي مهام مجدولة اليوم.</p>
              <Link 
                href="/student/schedule"
                className="inline-flex items-center justify-center px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold text-violet-600 dark:text-violet-400 hover:border-violet-500/50 hover:bg-violet-50 dark:hover:bg-violet-500/10 rounded-xl transition-all"
              >
                إضافة مهمة جديدة
              </Link>
            </div>
          </section>
        </div>
      </div>

    </div>
  );
}
