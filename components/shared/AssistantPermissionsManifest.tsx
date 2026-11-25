'use client';

import React from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  BookOpen,
  Users,
  Headphones,
  Megaphone,
  Mail,
  CheckCircle2,
  Lock,
  EyeOff,
  Layers,
  Sparkles,
  ArrowLeft,
  FileCheck2,
  ShieldAlert,
} from 'lucide-react';
import {
  AssistantPermissionsConfig,
  COURSE_PERMISSION_LABELS,
  CourseGranularPermissions,
  STUDENT_PERMISSION_LABELS,
  StudentGranularPermissions,
  hasAnyCoursePermission,
  isBlindQuestionAddOnly,
  resolveCoursePermissions,
} from '@/lib/assistantPermissions';
import { CourseData } from '@/lib/academicService';

interface AssistantPermissionsManifestProps {
  permissions: AssistantPermissionsConfig;
  courses?: CourseData[];
  roleTitle?: string;
  compact?: boolean;
}

const GROUP_LABELS: Record<'structure' | 'content' | 'questions' | 'operations', string> = {
  structure: 'الهيكل والإعدادات',
  content: 'المحتوى والملفات',
  questions: 'بنك الأسئلة',
  operations: 'الطلاب والأكواد',
};

function renderCourseMicroPermissions(cp: CourseGranularPermissions) {
  const entries = (
    Object.keys(COURSE_PERMISSION_LABELS) as Array<keyof CourseGranularPermissions>
  ).filter((k) => cp[k]);

  if (entries.length === 0) {
    return (
      <p className="text-xs font-bold text-slate-400">
        لا توجد صلاحيات مفعلة على هذا الكورس حالياً.
      </p>
    );
  }

  const blindMode = isBlindQuestionAddOnly(cp);

  return (
    <div className="space-y-3">
      {blindMode && (
        <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-start gap-2.5 text-xs">
          <EyeOff className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-black text-amber-800 dark:text-amber-300 block">
              وضع إضافة الأسئلة السري مفعّل (Blind Add-Only Mode)
            </span>
            <span className="font-semibold text-amber-700/90 dark:text-amber-400/90">
              يُسمح بإضافة أسئلة جديدة فقط دون الاطلاع على الأسئلة المحفوظة مسبقاً أو تعديلها أو حذفها.
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {entries.map((key) => {
          const meta = COURSE_PERMISSION_LABELS[key];
          return (
            <div
              key={key}
              className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 text-xs"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="font-black text-slate-900 dark:text-white leading-snug">
                  {meta.label}
                </div>
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                  {GROUP_LABELS[meta.group]}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AssistantPermissionsManifest({
  permissions,
  courses = [],
  roleTitle,
  compact = false,
}: AssistantPermissionsManifestProps) {
  const effectiveTitle = roleTitle || permissions.roleTitle || 'مساعد إداري وأكاديمي معتمد';

  const studentKeys = Object.keys(
    STUDENT_PERMISSION_LABELS
  ) as Array<keyof StudentGranularPermissions>;
  const activeStudentCount = studentKeys.filter((k) => permissions.studentPermissions[k]).length;

  const globalModules = [
    {
      key: 'academic_support',
      label: 'الدعم الأكاديمي والإجابة على أسئلة المنهج',
      enabled: Boolean(permissions.canHandleAcademicSupport),
      icon: Headphones,
    },
    {
      key: 'technical_support',
      label: 'الدعم الفني وحل مشكلات المشغل والامتحانات',
      enabled: Boolean(permissions.canHandleTechnicalSupport),
      icon: Headphones,
    },
    {
      key: 'review_homework',
      label: 'مراجعة وتصحيح الواجبات والاختبارات',
      enabled: Boolean(permissions.canReviewHomework),
      icon: FileCheck2,
    },
    {
      key: 'announcements',
      label: 'نشر وتعديل وتثبيت الإعلانات بالمنصة',
      enabled: Boolean(permissions.canPublishAnnouncements),
      icon: Megaphone,
    },
    {
      key: 'messages',
      label: 'إرسال الرسائل والتوجيهات الفردية والعامة للطلاب',
      enabled: Boolean(permissions.canSendMessages),
      icon: Mail,
    },
  ];
  const activeGlobalCount = globalModules.filter((m) => m.enabled).length;

  const assignedCourseIds = permissions.assignedCourseIds || [];
  const activeScopedCourses = assignedCourseIds.filter((cid) =>
    hasAnyCoursePermission(resolveCoursePermissions(permissions, cid))
  );

  const globalCoursePermCount = (
    Object.keys(COURSE_PERMISSION_LABELS) as Array<keyof CourseGranularPermissions>
  ).filter((k) => permissions.globalCoursePermissions[k]).length;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Executive Role & Zero-Knowledge Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-7 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                كشف الصلاحيات المعتمد من مستر محمد رضوان
              </div>
              <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">
                {effectiveTitle}
              </h2>
              <p className="text-xs md:text-sm font-semibold text-slate-500 dark:text-slate-400">
                نطاق الكورسات:{' '}
                <strong className="text-slate-900 dark:text-white">
                  {permissions.canManageAllCourses
                    ? 'جميع كورسات المنصة (صلاحية عامة موحدة)'
                    : `كورسات محددة (${assignedCourseIds.length} كورس مسند)`}
                </strong>
                {' · '}
                شؤون الطلاب:{' '}
                <strong className="text-slate-900 dark:text-white tabular-nums">
                  {activeStudentCount} / {studentKeys.length}
                </strong>
                {' · '}
                الوحدات العامة:{' '}
                <strong className="text-slate-900 dark:text-white tabular-nums">
                  {activeGlobalCount} / {globalModules.length}
                </strong>
              </p>
            </div>
          </div>

          {compact && (
            <Link
              href="/assistant/permissions"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs whitespace-nowrap shrink-0 transition-colors"
            >
              <span>عرض المصفوفة التفصيلية</span>
              <ArrowLeft className="w-4 h-4" />
            </Link>
          )}
        </div>

        {/* Strict Zero-Knowledge Security Notice */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/70 flex items-start gap-3">
          <Lock className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <span className="font-black text-slate-900 dark:text-white block">
              سياسة التشفير الأحادي وعدم كشف كلمات المرور (Zero-Knowledge Security)
            </span>
            <span className="font-semibold text-slate-600 dark:text-slate-400">
              كلمات مرور الطلاب وبريدهم السري محمية بتشفير أحادي وخوارزمية المعلم الرئيسية؛ لا يمكن لأي حساب مساعد كشف كلمات مرور الطلاب أو استخدام المفتاح الرئيسي (Master Key).
            </span>
          </div>
        </div>
      </div>

      {!compact && (
        <>
          {/* Course Matrix Section */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-7 shadow-sm space-y-5">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <h3 className="text-base md:text-lg font-black text-slate-900 dark:text-white">
                    صلاحيات الكورسات والمحتوى التعليمي
                  </h3>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    تفصيل دقيق للوحدات، الدروس، بنك الأسئلة، الأكواد، والطلاب المشتركين
                  </p>
                </div>
              </div>
              <span className="text-xs font-black text-slate-600 dark:text-slate-300 tabular-nums whitespace-nowrap shrink-0">
                {permissions.canManageAllCourses
                  ? `${globalCoursePermCount} / ${Object.keys(COURSE_PERMISSION_LABELS).length} صلاحية مفعلة`
                  : `${activeScopedCourses.length} كورس مفعّل`}
              </span>
            </div>

            {permissions.canManageAllCourses ? (
              renderCourseMicroPermissions(permissions.globalCoursePermissions)
            ) : assignedCourseIds.length === 0 ? (
              <div className="py-8 text-center text-xs font-bold text-slate-400">
                لم يتم إسناد أي كورسات محددة لحسابك حتى الآن.
              </div>
            ) : (
              <div className="space-y-4">
                {assignedCourseIds.map((cid) => {
                  const matchedCourse = courses.find((c) => c.id === cid);
                  const cp = resolveCoursePermissions(permissions, cid);
                  const activeCount = (
                    Object.keys(COURSE_PERMISSION_LABELS) as Array<keyof CourseGranularPermissions>
                  ).filter((k) => cp[k]).length;

                  return (
                    <div
                      key={cid}
                      className="p-4 md:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <div className="min-w-0">
                            <div className="font-black text-sm text-slate-900 dark:text-white truncate">
                              {matchedCourse ? matchedCourse.title : `كورس معرّف (${cid.slice(0, 8)})`}
                            </div>
                            {matchedCourse && (
                              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                {matchedCourse.stage === 'high' ? 'المرحلة الثانوية' : 'المرحلة الإعدادية'} · الصف {matchedCourse.grade}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs font-black text-slate-600 dark:text-slate-300 tabular-nums">
                            {activeCount} / {Object.keys(COURSE_PERMISSION_LABELS).length} صلاحية
                          </span>
                          {hasAnyCoursePermission(cp) && (
                            <Link
                              href={`/assistant/courses/${cid}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs whitespace-nowrap transition-colors"
                            >
                              <span>فتح الإدارة</span>
                              <ArrowLeft className="w-3.5 h-3.5" />
                            </Link>
                          )}
                        </div>
                      </div>

                      {renderCourseMicroPermissions(cp)}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Student Management & Global Modules Split Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Student Permissions */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    صلاحيات إدارة الطلاب
                  </h3>
                </div>
                <span className="text-xs font-black text-slate-500 tabular-nums">
                  {activeStudentCount} / {studentKeys.length}
                </span>
              </div>

              <div className="space-y-2.5">
                {studentKeys.map((key) => {
                  const meta = STUDENT_PERMISSION_LABELS[key];
                  const allowed = Boolean(permissions.studentPermissions[key]);
                  return (
                    <div
                      key={key}
                      className={`p-3 rounded-2xl border flex items-start justify-between gap-3 ${
                        allowed
                          ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50'
                          : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800 opacity-75'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        {allowed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <Lock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <div className="text-xs font-black text-slate-900 dark:text-white">
                            {meta.label}
                          </div>
                          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                            {meta.description}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`text-[11px] font-black whitespace-nowrap shrink-0 ${
                          allowed ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400'
                        }`}
                      >
                        {allowed ? 'مفعّل' : 'مغلق'}
                      </span>
                    </div>
                  );
                })}

                {/* Locked Master Key Row */}
                <div className="p-3 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-black text-rose-800 dark:text-rose-300">
                        كشف كلمات المرور أو البريد السري (Master Key)
                      </div>
                      <div className="text-[11px] font-semibold text-rose-700/80 dark:text-rose-400/80 mt-0.5">
                        محظور برمجياً على جميع حسابات المساعدين لضمان أمان المنصة.
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] font-black text-rose-600 dark:text-rose-400 whitespace-nowrap shrink-0">
                    محظور نهائياً
                  </span>
                </div>
              </div>
            </div>

            {/* Global Modules */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    الوحدات والخدمات العامة بالمنصة
                  </h3>
                </div>
                <span className="text-xs font-black text-slate-500 tabular-nums">
                  {activeGlobalCount} / {globalModules.length}
                </span>
              </div>

              <div className="space-y-2.5">
                {globalModules.map((mod) => {
                  const Icon = mod.icon;
                  return (
                    <div
                      key={mod.key}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                        mod.enabled
                          ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50'
                          : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800 opacity-75'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            mod.enabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                          }`}
                        />
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          {mod.label}
                        </span>
                      </div>
                      <span
                        className={`text-[11px] font-black whitespace-nowrap shrink-0 ${
                          mod.enabled ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400'
                        }`}
                      >
                        {mod.enabled ? 'مصرّح' : 'غير مصرّح'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
