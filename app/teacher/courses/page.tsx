'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, Plus, Search, Filter, Trash2, Eye, 
  Copy, Sparkles, AlertCircle, RefreshCw, X, ArrowLeft
} from 'lucide-react';
import { 
  fetchAllCourses, removeCourse, duplicateCourse, CourseData 
} from '@/lib/academicService';
import CourseCard from '@/components/CourseCard';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';

export default function TeacherCoursesPage() {
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filters
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedEducationType, setSelectedEducationType] = useState<string>('all');

  // Duplicate Modal State
  const [duplicatingCourse, setDuplicatingCourse] = useState<CourseData | null>(null);
  const [duplicateTargetStage, setDuplicateTargetStage] = useState<'middle' | 'high'>('high');
  const [duplicateTargetGrade, setDuplicateTargetGrade] = useState<1 | 2 | 3>(1);
  const [duplicateTargetType, setDuplicateTargetType] = useState<'general' | 'azhar' | 'arabic' | 'languages'>('general');
  const [duplicateTitle, setDuplicateTitle] = useState('');
  const [isDuplicating, setIsDuplicating] = useState(false);

  // Delete State
  const [courseToDelete, setCourseToDelete] = useState<CourseData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadCourses = useCallback(async () => {
    setLoading(true);
    const data = await fetchAllCourses();
    setCourses(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    let isMounted = true;
    fetchAllCourses().then(data => {
      if (isMounted) {
        setCourses(data);
        setLoading(false);
      }
    });
    return () => { isMounted = false; };
  }, []);

  // Filter logic
  const filteredCourses = courses.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStage = selectedStage === 'all' || c.stage === selectedStage;
    const matchesGrade = selectedGrade === 'all' || String(c.grade) === selectedGrade;
    const matchesType = selectedEducationType === 'all' || c.educationType === selectedEducationType;
    return matchesSearch && matchesStage && matchesGrade && matchesType;
  });

  const handleOpenDuplicate = (course: CourseData) => {
    setDuplicatingCourse(course);
    setDuplicateTargetStage(course.stage);
    setDuplicateTargetGrade(course.grade);
    setDuplicateTargetType(course.educationType === 'general' ? 'azhar' : 'general');
    setDuplicateTitle(`${course.title} (نسخة جديدة)`);
  };

  const handleExecuteDuplicate = async () => {
    if (!duplicatingCourse || !duplicateTitle.trim()) return;
    setIsDuplicating(true);
    await duplicateCourse(
      duplicatingCourse.id,
      duplicateTargetStage,
      duplicateTargetGrade,
      duplicateTargetType,
      duplicateTitle.trim()
    );
    setIsDuplicating(false);
    setDuplicatingCourse(null);
    await loadCourses();
  };

  const handleExecuteDelete = async () => {
    if (!courseToDelete) return;
    setIsDeleting(true);
    await removeCourse(courseToDelete.id);
    setIsDeleting(false);
    setCourseToDelete(null);
    await loadCourses();
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2 flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            المحتوى الأكاديمي وإدارة الكورسات
          </h1>
          <p className="text-slate-600 dark:text-slate-400 font-bold">
            قسم إدارة المناهج والكورسات، الوحدات والدروس، بنك الامتحانات، وتوليد الأكواد.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={loadCourses}
            title="تحديث البيانات"
            className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold transition-all shadow-sm"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            href="/teacher/courses/new"
            className="flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-lg shadow-emerald-200 dark:shadow-none transition-all hover:-translate-y-0.5"
          >
            <Plus className="w-5 h-5" />
            إنشاء كورس جديد
          </Link>
        </div>
      </div>

      {/* Dynamic Filters & Search */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="ابحث عن كورس بالاسم أو الوصف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-12 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 dark:text-white font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Stage Filter */}
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="px-4 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">كل المراحل</option>
              <option value="high">المرحلة الثانوية</option>
              <option value="middle">المرحلة الإعدادية</option>
            </select>

            {/* Grade Filter */}
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="px-4 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">كل الصفوف</option>
              <option value="1">الصف الأول</option>
              <option value="2">الصف الثاني</option>
              <option value="3">الصف الثالث</option>
            </select>

            {/* Education Type Filter */}
            <select
              value={selectedEducationType}
              onChange={(e) => setSelectedEducationType(e.target.value)}
              className="px-4 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">كل الأنظمة</option>
              <option value="general">عام</option>
              <option value="azhar">أزهر</option>
              <option value="arabic">عربي</option>
              <option value="languages">لغات</option>
            </select>
          </div>
        </div>

        {/* Filter stats bar */}
        <div className="flex items-center justify-between text-xs font-bold text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
          <span>عدد الكورسات المعروضة: {filteredCourses.length} كورس</span>
          {(selectedStage !== 'all' || selectedGrade !== 'all' || selectedEducationType !== 'all' || searchQuery) && (
            <button 
              onClick={() => {
                setSelectedStage('all');
                setSelectedGrade('all');
                setSelectedEducationType('all');
                setSearchQuery('');
              }}
              className="text-emerald-600 dark:text-emerald-400 hover:underline font-bold"
            >
              إلغاء التصفية
            </button>
          )}
        </div>
      </div>

      {/* Courses List / Grid */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 font-bold">جاري تحميل الكورسات من قاعدة البيانات...</p>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center shadow-sm">
          <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <BookOpen className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
            لا توجد كورسات مضافة حالياً
          </h2>
          <p className="text-slate-500 dark:text-slate-400 font-bold max-w-md mx-auto mb-6">
            قاعدة البيانات نظيفة وجاهزة. يمكنك الآن إضافة أول كورس دراسي بكل تفاصيله، وحداته، فيديوهاته، وامتحاناته.
          </p>
          <Link
            href="/teacher/courses/new"
            className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-lg shadow-emerald-200 dark:shadow-none transition-all"
          >
            <Plus className="w-5 h-5" />
            إنشاء أول كورس الآن
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredCourses.map((course, idx) => (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
              key={course.id}
              className="flex flex-col h-full"
            >
              <CourseCard 
                course={course}
                actionType="teacher_dashboard"
                onSelectCourse={() => {}}
                onDuplicate={() => handleOpenDuplicate(course)}
                onDelete={() => setCourseToDelete(course)}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* DUPLICATE MODAL */}
      <AnimatePresence>
        {duplicatingCourse && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 rounded-xl flex items-center justify-center">
                    <Copy className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">نسخ الكورس بالكامل</h3>
                    <p className="text-xs text-slate-500 font-bold">نسخ جميع الوحدات، الدروس، الامتحانات والأسئلة لصف أو نظام آخر</p>
                  </div>
                </div>
                <button 
                  onClick={() => setDuplicatingCourse(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-slate-800 dark:text-slate-200 font-bold text-sm mb-2">اسم الكورس المنسوخ الجديد</label>
                  <input
                    type="text"
                    value={duplicateTitle}
                    onChange={(e) => setDuplicateTitle(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-800 dark:text-slate-200 font-bold text-xs mb-2">المرحلة الهدف</label>
                    <select
                      value={duplicateTargetStage}
                      onChange={(e) => setDuplicateTargetStage(e.target.value as any)}
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="high">ثانوي</option>
                      <option value="middle">إعدادي</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-800 dark:text-slate-200 font-bold text-xs mb-2">الصف الهدف</label>
                    <select
                      value={duplicateTargetGrade}
                      onChange={(e) => setDuplicateTargetGrade(Number(e.target.value) as any)}
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="1">الصف الأول</option>
                      <option value="2">الصف الثاني</option>
                      <option value="3">الصف الثالث</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-800 dark:text-slate-200 font-bold text-xs mb-2">نوع التعليم</label>
                    <select
                      value={duplicateTargetType}
                      onChange={(e) => setDuplicateTargetType(e.target.value as any)}
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="general">عام</option>
                      <option value="azhar">أزهر</option>
                      <option value="arabic">عربي</option>
                      <option value="languages">لغات</option>
                    </select>
                  </div>
                </div>

                <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl text-emerald-800 dark:text-emerald-300 text-xs font-bold leading-relaxed">
                  💡 سيتم إنشاء نسخة جديدة كاملة مطابقة لمحتويات الكورس الحالي، تبدأ كـ مسودة (غير منشورة) حتى تتمكن من مراجعتها وتعديل ما يناسب المرحلة الجديدة بكل سهولة.
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDuplicatingCourse(null)}
                  className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={isDuplicating || !duplicateTitle.trim()}
                  onClick={handleExecuteDuplicate}
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-200 dark:shadow-none transition-all disabled:opacity-50"
                >
                  {isDuplicating ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      تأكيد نسخ الكورس
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION MODAL */}
      <DeleteConfirmationModal
        isOpen={!!courseToDelete}
        onClose={() => setCourseToDelete(null)}
        onConfirm={handleExecuteDelete}
        title="تأكيد حذف الكورس"
        itemType="الكورس التعليمي"
        itemName={courseToDelete?.title || ''}
        warningNote="سيتم حذف هذا الكورس وجميع وحداته وامتحاناته وأكواد تفعيله نهائياً من النظام."
        isLoading={isDeleting}
      />
    </div>
  );
}
