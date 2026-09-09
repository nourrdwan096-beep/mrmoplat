'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Search,
  Filter,
  Eye,
  Sparkles,
  ArrowLeft,
  Layers,
  CheckCircle2
} from 'lucide-react';
import { fetchAllCourses, CourseData } from '@/lib/academicService';
import { useAuth } from '@/context/AuthContext';
import { fetchAssistants } from '@/lib/teacherService';

export default function AssistantCoursesPage() {
  const { currentUser } = useAuth();
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStage, setSelectedStage] = useState<string>('all');

  useEffect(() => {
    async function load() {
      try {
        const [allCourses, allAssistants] = await Promise.all([
          fetchAllCourses(),
          fetchAssistants(),
        ]);

        const me = allAssistants.find(
          (a) => a.id === currentUser?.id || a.email === currentUser?.email
        );

        if (me && me.permissions && !me.permissions.canManageAllCourses && me.permissions.assignedCourseIds && me.permissions.assignedCourseIds.length > 0) {
          const assigned = me.permissions.assignedCourseIds;
          const filtered = allCourses.filter((c) =>
            assigned.includes(c.id)
          );
          setCourses(filtered);
        } else {
          setCourses(allCourses);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [currentUser]);

  const filteredCourses = courses.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStage = selectedStage === 'all' || c.stage === selectedStage;
    return matchesSearch && matchesStage;
  });

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 dark:border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 dark:bg-blue-500/20 blur-3xl rounded-full -translate-y-1/2 translate-x-1/3"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold text-xs mb-3">
              <BookOpen className="w-4 h-4" />
              المقررات والكورسات المخصصة
            </div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
              إدارة الكورسات المخصصة 📚
            </h1>
            <p className="text-slate-600 dark:text-slate-400 font-bold text-sm md:text-base">
              تصفح الوحدات، رفع الفيديوهات، إضافة الواجبات والامتحانات للمناهج المصرح لك بإدارتها.
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث في الكورسات المتاحة..."
            className="w-full h-11 pr-10 pl-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold focus:ring-2 focus:ring-blue-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            className="h-11 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">جميع المراحل</option>
            <option value="middle">الإعدادية</option>
            <option value="high">الثانوية</option>
          </select>
        </div>
      </div>

      {/* Course Cards */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 font-bold">جاري تحميل الكورسات...</div>
      ) : filteredCourses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((c) => (
            <div
              key={c.id}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-xs font-black px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                    {c.stage === 'high' ? 'ثانوي' : 'إعدادي'} - الصف {c.grade}
                  </span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {c.isFree ? 'مجاني 🎁' : `${c.price} ج.م`}
                  </span>
                </div>

                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">
                  {c.title}
                </h3>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-4">
                  {c.description || 'كورس اللغة الإنجليزية الشامل'}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" />
                  {c.educationType === 'azhar'
                    ? 'أزهر'
                    : c.educationType === 'languages'
                    ? 'لغات'
                    : 'عام'}
                </span>

                <Link
                  href={`/assistant/courses/${c.id}`}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all"
                >
                  <span>إدارة المحتوى واليونت</span>
                  <ArrowLeft className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-bold">لا توجد كورسات مخصصة لك حالياً</p>
        </div>
      )}
    </div>
  );
}
