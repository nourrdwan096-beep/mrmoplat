'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import CourseCard from '@/components/CourseCard';
import { fetchAllCourses, CourseData, fetchStudentEnrolledCourseIds } from '@/lib/academicService';
import { Course } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import {
  BookOpen,
  Filter,
  Search,
  Video,
  FileCheck,
  CheckCircle,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Layers,
  GraduationCap,
  Lock,
  Unlock,
  Tag,
  Award,
  FileText,
  ShoppingCart,
  CheckCircle2
} from 'lucide-react';

interface CourseExplorerProps {
  onSelectCourse: (course: Course, initialTab?: 'curriculum' | 'enroll') => void;
  onOpenRegister: () => void;
}

export default function CourseExplorer({ onSelectCourse, onOpenRegister }: CourseExplorerProps) {
  const { currentUser } = useAuth();
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Multi-Level Filter State strictly adhering to the prompt specifications
  const [selectedStage, setSelectedStage] = useState<'all' | 'middle' | 'high'>('all');
  const [selectedType, setSelectedType] = useState<'all' | 'general' | 'azhar' | 'arabic' | 'languages'>('all');
  const [selectedGrade, setSelectedGrade] = useState<'all' | 1 | 2 | 3>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchAllCourses().then(data => {
      setCourses(data.filter(c => c.isPublished));
      setLoading(false);
    });

    if (currentUser?.id) {
      fetchStudentEnrolledCourseIds(currentUser.id, currentUser.email).then(ids => {
        setEnrolledCourseIds(ids);
      });
    }
  }, [currentUser?.id, currentUser?.email]);

  // Filtered courses based on user criteria
  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      // Stage filter
      if (selectedStage !== 'all' && course.stage !== selectedStage) {
        return false;
      }
      // Education type filter
      if (selectedType !== 'all' && course.educationType !== selectedType) {
        return false;
      }
      // Grade filter
      if (selectedGrade !== 'all' && course.grade !== selectedGrade) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = course.title.toLowerCase().includes(query);
        const matchDesc = (course.description || '').toLowerCase().includes(query);
        if (!matchTitle && !matchDesc) return false;
      }
      return true;
    });
  }, [courses, selectedStage, selectedType, selectedGrade, searchQuery]);

  return (
    <section id="courses" className="py-16 bg-slate-50/50 dark:bg-slate-950/60 border-y border-slate-200/80 dark:border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 mb-3">
            <BookOpen className="w-3.5 h-3.5" />
            <span>دليل الكورسات والمناهج الأكاديمية</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-4">
            اختر صفك الدراسي وابدأ التفوق في الإنجليزية
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 font-medium">
            شرح تفصيلي للمنهج العام والأزهري طبقاً لأحدث المعايير مع واجبات أسبوعية وامتحانات تفاعلية مؤمنة
          </p>
        </div>

        {/* Enrolled Courses Notification Bar for logged-in students */}
        {currentUser && enrolledCourseIds.length > 0 && (
          <div className="mb-10 p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-xl shadow-emerald-900/20 flex flex-col sm:flex-row items-center justify-between gap-4 border border-emerald-400/30">
            <div className="flex items-center gap-3.5 text-center sm:text-right">
              <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center shrink-0 shadow-inner">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-black text-base sm:text-lg">أهلاً بك، {currentUser.fullName?.split(' ')[0]}! لديك {enrolledCourseIds.length} {enrolledCourseIds.length === 1 ? 'كورس مشترك به' : 'كورسات مشترك بها'}</h3>
                <p className="text-xs sm:text-sm text-emerald-100 font-medium">يمكنك متابعة تعلمك ومحاضراتك فوراً عبر زر «متابعة التعلم» أسفل كل كورس مشترك به.</p>
              </div>
            </div>
            <Link
              href="/student/courses"
              className="px-6 py-3 bg-white text-emerald-800 hover:bg-emerald-50 text-xs sm:text-sm font-black rounded-2xl shadow-lg shadow-black/10 transition-all shrink-0 flex items-center gap-2 hover:-translate-y-0.5"
            >
              <span>كورساتي ومنهجي</span>
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Futuristic Filter Controls Panel strictly as specified: [١] المرحلة [٢] نوع التعليم [٣] الصف */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-xl border border-slate-200 dark:border-slate-800 mb-10">
          
          <div className="flex flex-col gap-6">
            
            {/* Search Bar */}
            <div className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث باسم الكورس، الموضوع، أو السنة الدراسية..."
                className="w-full h-12 pr-11 pl-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              />
              <Search className="w-5 h-5 text-slate-400 absolute right-3.5 top-3.5" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3.5 top-3.5 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  مسح
                </button>
              )}
            </div>

            {/* 3 Main Filter Row Groups */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* [١] المرحلة (إعدادي - ثانوي) */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-black flex items-center justify-center">١</span>
                  <span>المرحلة الدراسية</span>
                </label>
                <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                  <button
                    onClick={() => {
                      setSelectedStage('all');
                      setSelectedType('all');
                    }}
                    className={`py-2 text-xs font-bold rounded-xl transition-all ${
                      selectedStage === 'all'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    الكل
                  </button>
                  <button
                    onClick={() => {
                      setSelectedStage('middle');
                      setSelectedType('all');
                    }}
                    className={`py-2 text-xs font-bold rounded-xl transition-all ${
                      selectedStage === 'middle'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    إعدادي
                  </button>
                  <button
                    onClick={() => {
                      setSelectedStage('high');
                      setSelectedType('all');
                    }}
                    className={`py-2 text-xs font-bold rounded-xl transition-all ${
                      selectedStage === 'high'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    ثانوي
                  </button>
                </div>
              </div>

              {/* [٢] نوع التعليم (يعتمد على المرحلة) */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 text-xs font-black flex items-center justify-center">٢</span>
                  <span>نوع التعليم</span>
                </label>
                <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                  <button
                    onClick={() => setSelectedType('all')}
                    className={`py-2 text-xs font-bold rounded-xl transition-all ${
                      selectedType === 'all'
                        ? 'bg-teal-600 text-white shadow-md'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    الكل
                  </button>
                  {selectedStage === 'middle' ? (
                    <>
                      <button
                        onClick={() => setSelectedType('arabic')}
                        className={`py-2 text-xs font-bold rounded-xl transition-all ${
                          selectedType === 'arabic'
                            ? 'bg-teal-600 text-white shadow-md'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        عربي
                      </button>
                      <button
                        onClick={() => setSelectedType('languages')}
                        className={`py-2 text-xs font-bold rounded-xl transition-all ${
                          selectedType === 'languages'
                            ? 'bg-teal-600 text-white shadow-md'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        لغات
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setSelectedType('general')}
                        className={`py-2 text-xs font-bold rounded-xl transition-all ${
                          selectedType === 'general'
                            ? 'bg-teal-600 text-white shadow-md'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        عام
                      </button>
                      <button
                        onClick={() => setSelectedType('azhar')}
                        className={`py-2 text-xs font-bold rounded-xl transition-all ${
                          selectedType === 'azhar'
                            ? 'bg-teal-600 text-white shadow-md'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        أزهر
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* [٣] الصف (١ - ٢ - ٣) */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-black flex items-center justify-center">٣</span>
                  <span>الصف الدراسي</span>
                </label>
                <div className="grid grid-cols-4 gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                  <button
                    onClick={() => setSelectedGrade('all')}
                    className={`py-2 text-xs font-bold rounded-xl transition-all ${
                      selectedGrade === 'all'
                        ? 'bg-amber-500 text-white shadow-md'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    الكل
                  </button>
                  <button
                    onClick={() => setSelectedGrade(1)}
                    className={`py-2 text-xs font-bold rounded-xl transition-all ${
                      selectedGrade === 1
                        ? 'bg-amber-500 text-white shadow-md'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    الصف ١
                  </button>
                  <button
                    onClick={() => setSelectedGrade(2)}
                    className={`py-2 text-xs font-bold rounded-xl transition-all ${
                      selectedGrade === 2
                        ? 'bg-amber-500 text-white shadow-md'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    الصف ٢
                  </button>
                  <button
                    onClick={() => setSelectedGrade(3)}
                    className={`py-2 text-xs font-bold rounded-xl transition-all ${
                      selectedGrade === 3
                        ? 'bg-amber-500 text-white shadow-md'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    الصف ٣
                  </button>
                </div>
              </div>

            </div>

          </div>

          {/* Active Filter Tags Summary */}
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>
              عرض <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{filteredCourses.length}</strong> كورس مطابق للفرز
            </span>
            {(selectedStage !== 'all' || selectedType !== 'all' || selectedGrade !== 'all' || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedStage('all');
                  setSelectedType('all');
                  setSelectedGrade('all');
                  setSearchQuery('');
                }}
                className="text-xs font-bold text-rose-500 hover:underline"
              >
                إعادة ضبط كل الفلاتر
              </button>
            )}
          </div>

        </div>

        {/* Courses Grid */}
        {filteredCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8">
            {filteredCourses.map((c) => {
              const isEnrolled = enrolledCourseIds.includes(c.id);
              return (
                <CourseCard
                  key={c.id}
                  course={c}
                  isEnrolled={isEnrolled}
                  onSelectCourse={onSelectCourse}
                  actionType="explore"
                />
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
              <BookOpen className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">
              {courses.length === 0
                ? 'لا توجد كورسات مضافة حالياً في المنصة'
                : 'لم يتم العثور على كورسات تطابق هذا الفرز'}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-5 leading-relaxed font-bold">
              {courses.length === 0
                ? 'يمكن للمعلم (مستر محمد رضوان) إضافة الكورسات ونشرها مباشرة من لوحة تحكم المعلم.'
                : 'يرجى تجربة تغيير المرحلة أو نوع التعليم أو مسح كلمات البحث.'}
            </p>
            {courses.length > 0 && (
              <button
                onClick={() => {
                  setSelectedStage('all');
                  setSelectedType('all');
                  setSelectedGrade('all');
                  setSearchQuery('');
                }}
                className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-500 shadow-md transition-all"
              >
                إظهار كل الكورسات
              </button>
            )}
          </div>
        )}

      </div>
    </section>
  );
}
