'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Search,
  Filter,
  ArrowLeft,
  Layers,
  EyeOff,
  Lock,
  ArrowRight,
} from 'lucide-react';
import { fetchAllCourses, CourseData } from '@/lib/academicService';
import { useAuth } from '@/context/AuthContext';
import { fetchMyAssistantProfileServerAction } from '@/app/actions/assistantActions';
import {
  AssistantPermissionsConfig,
  COURSE_PERMISSION_LABELS,
  CourseGranularPermissions,
  FULL_COURSE_PERMISSIONS,
  FULL_STUDENT_PERMISSIONS,
  canAccessCourse,
  hasAnyCoursePermission,
  isBlindQuestionAddOnly,
  normalizeAssistantPermissions,
  resolveCoursePermissions,
} from '@/lib/assistantPermissions';

export default function AssistantCoursesPage() {
  const { currentUser, currentRole } = useAuth();
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [perms, setPerms] = useState<AssistantPermissionsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStage, setSelectedStage] = useState<string>('all');

  const isTeacherOverride = currentRole === 'teacher' || currentRole === 'super_admin';

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        let resolvedPerms: AssistantPermissionsConfig;
        if (isTeacherOverride) {
          resolvedPerms = {
            roleTitle: 'صلاحيات المعلم',
            canManageStudents: true,
            canApproveRegistrations: true,
            canViewStudentPasswords: false,
            studentPermissions: { ...FULL_STUDENT_PERMISSIONS },
            canManageAllCourses: true,
            assignedCourseIds: [],
            globalCoursePermissions: { ...FULL_COURSE_PERMISSIONS },
            coursePermissionsMap: {},
            canHandleAcademicSupport: true,
            canHandleTechnicalSupport: true,
            canReviewHomework: true,
            canPublishAnnouncements: true,
            canSendMessages: true,
          };
        } else {
          const res = await fetchMyAssistantProfileServerAction();
          resolvedPerms =
            res.success && res.data
              ? normalizeAssistantPermissions(
                  res.data.permissions as Record<string, any>,
                  res.data.permissions as Partial<AssistantPermissionsConfig>
                )
              : normalizeAssistantPermissions(null, null);
        }

        const allCourses = await fetchAllCourses();
        if (!isMounted) return;

        setPerms(resolvedPerms);
        const accessible = (allCourses || []).filter(
          (c) =>
            canAccessCourse(resolvedPerms, c.id) &&
            hasAnyCoursePermission(resolveCoursePermissions(resolvedPerms, c.id))
        );
        setCourses(accessible);
      } catch (err) {
        console.error('AssistantCoursesPage load error:', err);
        if (isMounted) setCourses([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [currentUser, isTeacherOverride]);

  const filteredCourses = courses.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStage = selectedStage === 'all' || c.stage === selectedStage;
    return matchesSearch && matchesStage;
  });

  return (
    <div className="space-y-8 pb-10 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="text-xs font-black text-blue-600 dark:text-blue-400">
              المقررات والكورسات المخصصة
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">
              إدارة الكورسات المصرح بها
            </h1>
            <p className="text-slate-600 dark:text-slate-400 font-semibold text-sm max-w-2xl">
              {perms?.canManageAllCourses
                ? 'تمتلك صلاحية إدارة الكورسات وفق المصفوفة المحددة من مستر محمد رضوان.'
                : 'تظهر هنا فقط الكورسات التي تم إسنادها لحسابك وتفعيل صلاحياتها من قبل المعلم.'}
            </p>
          </div>
          <Link
            href="/assistant/permissions"
            className="px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-black text-xs whitespace-nowrap shrink-0 transition-colors"
          >
            عرض تفاصيل الصلاحيات
          </Link>
        </div>
      </div>

      {/* Filters */}
      {courses.length > 0 && (
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث في الكورسات المتاحة..."
              className="w-full h-11 pr-10 pl-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="h-11 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="all">جميع المراحل</option>
              <option value="middle">الإعدادية</option>
              <option value="high">الثانوية</option>
            </select>
          </div>
        </div>
      )}

      {/* Course Cards */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 font-bold text-sm">
          جاري تحميل الكورسات المصرح لك بإدارتها...
        </div>
      ) : filteredCourses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((c) => {
            const cp = isTeacherOverride
              ? FULL_COURSE_PERMISSIONS
              : resolveCoursePermissions(perms, c.id);
            const activeCount = (
              Object.keys(COURSE_PERMISSION_LABELS) as Array<keyof CourseGranularPermissions>
            ).filter((k) => cp[k]).length;
            const blindMode = !isTeacherOverride && isBlindQuestionAddOnly(cp);

            return (
              <div
                key={c.id}
                className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 text-xs font-black">
                    <span className="text-blue-700 dark:text-blue-300">
                      {c.stage === 'high' ? 'ثانوي' : 'إعدادي'} · الصف {c.grade}
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {c.isFree ? 'مجاني' : `${c.price} ج.م`}
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-slate-900 dark:text-white leading-snug">
                    {c.title}
                  </h3>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {c.description || 'كورس اللغة الإنجليزية الشامل'}
                  </p>

                  <div className="pt-2 text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between gap-2">
                    <span className="tabular-nums">الصلاحيات المفعلة: {activeCount} من 17</span>
                    {blindMode && (
                      <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-black">
                        <EyeOff className="w-3.5 h-3.5" />
                        إضافة سري
                      </span>
                    )}
                  </div>
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
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-colors whitespace-nowrap"
                  >
                    <span>فتح لوحة الكورس</span>
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-16 px-6 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              لا توجد كورسات مصرح لك بإدارتها حالياً
            </h3>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              لم يقم مستر محمد رضوان بإسناد أي كورس بصلاحيات مفعلة لحسابك حتى الآن.
            </p>
          </div>
          <Link
            href="/assistant"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white font-bold text-xs"
          >
            <ArrowRight className="w-4 h-4" />
            العودة للرئيسية
          </Link>
        </div>
      )}
    </div>
  );
}
