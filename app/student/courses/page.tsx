'use client';
import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { fetchAllCourses, CourseData, fetchStudentEnrolledCourseIds } from '@/lib/academicService';
import CourseCard from '@/components/CourseCard';
import { BookOpen, Search, Sparkles, LayoutGrid } from 'lucide-react';

export default function StudentCoursesPage() {
  const { currentUser } = useAuth();
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'my_courses' | 'explore'>('explore');

  // Filters
  const [selectedStage, setSelectedStage] = useState<'all' | 'middle' | 'high'>('all');
  const [selectedType, setSelectedType] = useState<'all' | 'general' | 'azhar' | 'arabic' | 'languages'>('all');
  const [selectedGrade, setSelectedGrade] = useState<'all' | 1 | 2 | 3>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function load() {
      if (!currentUser?.id) return;
      try {
        const [all, eIds] = await Promise.all([
          fetchAllCourses(),
          fetchStudentEnrolledCourseIds(currentUser.id, currentUser.email)
        ]);
        setCourses(all.filter(c => c.isPublished));
        setEnrolledIds(eIds);
        if (eIds.length > 0) {
          setActiveTab('my_courses');
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [currentUser?.id, currentUser?.email]);

  const enrolledCourses = useMemo(() => courses.filter(c => enrolledIds.includes(c.id)), [courses, enrolledIds]);
  
  const exploreCourses = useMemo(() => {
    return courses.filter(c => {
      if (selectedStage !== 'all' && c.stage !== selectedStage) return false;
      if (selectedType !== 'all' && c.educationType !== selectedType) return false;
      if (selectedGrade !== 'all' && c.grade !== selectedGrade) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = c.title.toLowerCase().includes(query);
        const matchDesc = (c.description || '').toLowerCase().includes(query);
        if (!matchTitle && !matchDesc) return false;
      }
      return true;
    });
  }, [courses, selectedStage, selectedType, selectedGrade, searchQuery]);

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-2 flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-emerald-500" />
            <span>كورساتي ومنهجي</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm md:text-base">
            تصفح الكورسات وتابع مذاكرتك على نفس الحساب بحرية كاملة
          </p>
        </div>
        
        {/* Tabs */}
        <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-2xl w-full md:w-auto">
          <button
            onClick={() => setActiveTab('explore')}
            className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
              activeTab === 'explore' 
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            استكشاف الكورسات
          </button>
          <button
            onClick={() => setActiveTab('my_courses')}
            className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
              activeTab === 'my_courses' 
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            اشتراكاتي ({enrolledCourses.length})
          </button>
        </div>
      </div>

      {activeTab === 'my_courses' ? (
        <div className="space-y-6">
          {enrolledCourses.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center mt-8">
              <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-400">
                <BookOpen className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-3">لا توجد اشتراكات حتى الآن</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md mx-auto leading-relaxed">
                لم تقم بالاشتراك في أي كورس بعد. قم باستكشاف الكورسات المتاحة للانضمام.
              </p>
              <button 
                onClick={() => setActiveTab('explore')}
                className="inline-flex items-center justify-center px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black rounded-xl shadow-lg shadow-emerald-500/20 transition-all"
              >
                تصفح الكورسات المتاحة
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enrolledCourses.map((c) => (
                <CourseCard
                  key={c.id}
                  course={c}
                  isEnrolled={true}
                  actionType="student_dashboard"
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Advanced Filter */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200 dark:border-slate-800">
            <div className="flex flex-col gap-6">
              <div className="relative w-full">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث باسم الكورس، الموضوع، أو السنة الدراسية..."
                  className="w-full h-12 pr-11 pl-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                />
                <Search className="w-5 h-5 text-slate-400 absolute right-3.5 top-3.5" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400">المرحلة الدراسية</label>
                  <select
                    value={selectedStage}
                    onChange={(e) => setSelectedStage(e.target.value as any)}
                    className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="all">الكل</option>
                    <option value="middle">المرحلة الإعدادية</option>
                    <option value="high">المرحلة الثانوية</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400">نوع التعليم</label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value as any)}
                    className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="all">الكل</option>
                    <option value="general">عام</option>
                    <option value="azhar">أزهر</option>
                    <option value="languages">لغات</option>
                    <option value="arabic">عربي</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400">الصف الدراسي</label>
                  <select
                    value={selectedGrade}
                    onChange={(e) => setSelectedGrade(e.target.value === 'all' ? 'all' : Number(e.target.value) as 1 | 2 | 3)}
                    className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="all">الكل</option>
                    <option value={1}>الصف الأول</option>
                    <option value={2}>الصف الثاني</option>
                    <option value={3}>الصف الثالث</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exploreCourses.length > 0 ? (
              exploreCourses.map((c) => (
                <CourseCard
                  key={c.id}
                  course={c}
                  isEnrolled={enrolledIds.includes(c.id)}
                  actionType="student_dashboard"
                />
              ))
            ) : (
              <div className="col-span-full py-12 text-center bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-800 border-dashed">
                <Search className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-bold">لم يتم العثور على كورسات تطابق بحثك</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
