'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  BookOpen,
  Headphones,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  Calendar,
  Megaphone,
  Mail,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchSupportTickets, TicketData } from '@/lib/supportService';
import { fetchAllCourses, CourseData } from '@/lib/academicService';
import { fetchMyAssistantProfileServerAction } from '@/app/actions/assistantActions';
import {
  AssistantPermissionsConfig,
  FULL_COURSE_PERMISSIONS,
  FULL_STUDENT_PERMISSIONS,
  canAccessCourse,
  hasAnyCoursePermission,
  hasAnyStudentPermission,
  normalizeAssistantPermissions,
  resolveCoursePermissions,
} from '@/lib/assistantPermissions';
import AssistantPermissionsManifest from '@/components/shared/AssistantPermissionsManifest';

export default function AssistantHomePage() {
  const { currentUser, currentRole } = useAuth();
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [allCourses, setAllCourses] = useState<CourseData[]>([]);
  const [perms, setPerms] = useState<AssistantPermissionsConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const isTeacherOverride = currentRole === 'teacher' || currentRole === 'super_admin';
        let normalizedPerms: AssistantPermissionsConfig;

        if (isTeacherOverride) {
          normalizedPerms = {
            roleTitle: 'صلاحيات المعلم المالك للمنصة',
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
          normalizedPerms =
            res.success && res.data
              ? normalizeAssistantPermissions(
                  res.data.permissions as Record<string, any>,
                  res.data.permissions as Partial<AssistantPermissionsConfig>
                )
              : normalizeAssistantPermissions(null, null);
        }

        if (!isMounted) return;
        setPerms(normalizedPerms);

        const hasSupportAccess =
          normalizedPerms.canHandleAcademicSupport || normalizedPerms.canHandleTechnicalSupport;

        const [fetchedCourses, fetchedTickets] = await Promise.all([
          fetchAllCourses(),
          hasSupportAccess ? fetchSupportTickets() : Promise.resolve([]),
        ]);

        if (!isMounted) return;
        setAllCourses(fetchedCourses || []);

        const accessibleCourses = (fetchedCourses || []).filter(
          (c) =>
            canAccessCourse(normalizedPerms, c.id) &&
            hasAnyCoursePermission(resolveCoursePermissions(normalizedPerms, c.id))
        );
        setCourses(accessibleCourses);

        if (hasSupportAccess) {
          const allowedTickets = (fetchedTickets || []).filter((t) => {
            if (t.ticketType === 'academic' && !normalizedPerms.canHandleAcademicSupport) {
              return false;
            }
            if (t.ticketType === 'technical' && !normalizedPerms.canHandleTechnicalSupport) {
              return false;
            }
            if (!normalizedPerms.canManageAllCourses) {
              const cid = (t.course_id || t.courseId || '') as string;
              if (cid && !normalizedPerms.assignedCourseIds.includes(cid)) {
                return false;
              }
            }
            return true;
          });
          setTickets(allowedTickets);
        } else {
          setTickets([]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [currentUser, currentRole]);

  const hasSupportAccess = Boolean(
    perms && (perms.canHandleAcademicSupport || perms.canHandleTechnicalSupport)
  );
  const hasCourseAccess = courses.length > 0;
  const hasStudentsAccess = Boolean(perms && hasAnyStudentPermission(perms.studentPermissions));
  const hasAnnouncementsAccess = Boolean(perms?.canPublishAnnouncements);
  const hasMessagesAccess = Boolean(perms?.canSendMessages);

  const openTickets = tickets.filter((t) => t.status === 'open' || t.status === 'in_progress');
  const academicTickets = openTickets.filter((t) => t.ticketType === 'academic');
  const techTickets = openTickets.filter((t) => t.ticketType === 'technical');

  return (
    <div className="space-y-8 pb-10 max-w-6xl mx-auto">
      {/* Executive Welcome Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="text-xs font-black text-emerald-600 dark:text-emerald-400">
              منصة مستر محمد رضوان · فريق الإدارة والمساعدين
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">
              مرحباً {currentUser?.fullName || 'بكم في لوحة المساعد'}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 font-semibold text-sm max-w-2xl">
              {perms?.roleTitle
                ? `المسمى الوظيفي المعتمد: ${perms.roleTitle} — يمكنك إدارة جميع المهام والصلاحيات المخصصة لك مباشرة من هنا.`
                : 'لوحة تحكم موحدة لإدارة المهام المصرح بها ضمن منصة مستر محمد رضوان بأعلى معايير الأمان.'}
            </p>
          </div>

          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs whitespace-nowrap shrink-0">
            <Calendar className="w-4 h-4 text-emerald-500" />
            <span>
              {new Date().toLocaleDateString('ar-EG', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>
        </div>

        {/* Permitted Quick Modules Strip */}
        {!loading && perms && (
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2.5">
            {hasCourseAccess && (
              <Link
                href="/assistant/courses"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-black text-xs hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
              >
                <BookOpen className="w-4 h-4" />
                <span>إدارة الكورسات ({courses.length})</span>
              </Link>
            )}
            {hasStudentsAccess && (
              <Link
                href="/assistant/students"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300 font-black text-xs hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-colors"
              >
                <Users className="w-4 h-4" />
                <span>شؤون الطلاب</span>
              </Link>
            )}
            {hasAnnouncementsAccess && (
              <Link
                href="/assistant/announcements"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 font-black text-xs hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
              >
                <Megaphone className="w-4 h-4" />
                <span>إدارة الإعلانات</span>
              </Link>
            )}
            {hasSupportAccess && (
              <Link
                href="/assistant/support"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 font-black text-xs hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
              >
                <Headphones className="w-4 h-4" />
                <span>تذاكر الدعم ({openTickets.length})</span>
              </Link>
            )}
            {hasMessagesAccess && (
              <Link
                href="/assistant/messages"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-black text-xs hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
              >
                <Mail className="w-4 h-4" />
                <span>الرسائل والتوجيهات</span>
              </Link>
            )}
            <Link
              href="/assistant/permissions"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-black text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>كشف صلاحياتي الكامل</span>
            </Link>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {hasSupportAccess && (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                تذاكر بحاجة للرد والمتابعة
              </span>
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">
              {openTickets.length}
            </h3>
            <p className="text-xs font-bold text-slate-500 mt-2">
              {perms?.canHandleAcademicSupport ? `${academicTickets.length} أكاديمية` : ''}
              {perms?.canHandleAcademicSupport && perms?.canHandleTechnicalSupport ? ' · ' : ''}
              {perms?.canHandleTechnicalSupport ? `${techTickets.length} فنية` : ''}
            </p>
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">
              الكورسات المصرح لك بها
            </span>
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">
            {courses.length}
          </h3>
          <p className="text-xs font-bold text-slate-500 mt-2">
            {perms?.canManageAllCourses ? 'نطاق شامل لجميع الكورسات' : 'مقيدة بالكورسات المسندة'}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">
              حالة الصلاحيات والأمان
            </span>
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-lg font-black text-emerald-600 dark:text-emerald-400">
            حساب نشط ومعتمد
          </h3>
          <p className="text-xs font-bold text-slate-500 mt-2">
            التفاصيل والصلاحيات تحت رقابة السيرفر المباشرة
          </p>
        </div>
      </div>

      {/* Live Compact Permissions Manifest */}
      {perms && (
        <AssistantPermissionsManifest
          permissions={perms}
          courses={allCourses}
          roleTitle={perms.roleTitle}
          compact
        />
      )}

      {/* Action Panels (Only rendered if permitted) */}
      {(hasSupportAccess || hasCourseAccess) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {hasSupportAccess && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Headphones className="w-5 h-5 text-emerald-500" />
                    أحدث تذاكر الدعم المفتوحة
                  </h3>
                  <Link
                    href="/assistant/support"
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 whitespace-nowrap"
                  >
                    عرض كل التذاكر
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {loading ? (
                  <p className="text-xs text-slate-400 py-6 text-center">جاري التحميل...</p>
                ) : openTickets.length > 0 ? (
                  <div className="space-y-3">
                    {openTickets.slice(0, 4).map((ticket) => (
                      <Link
                        key={ticket.id}
                        href={`/assistant/support?ticketId=${ticket.id}`}
                        className="block p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 border border-slate-100 dark:border-slate-800 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                            {ticket.subject}
                          </span>
                          <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 shrink-0">
                            {ticket.ticketType === 'academic' ? 'أكاديمي' : 'فني'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                          <span>{ticket.studentName || 'طالب'}</span>
                          <span>{ticket.courseTitle || 'عام'}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-400 font-bold text-xs">
                    لا توجد تذاكر مفتوحة حالياً ضمن نطاق صلاحياتك.
                  </div>
                )}
              </div>
            </div>
          )}

          {hasCourseAccess && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-blue-500" />
                    الكورسات المسؤول عنها
                  </h3>
                  <Link
                    href="/assistant/courses"
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 whitespace-nowrap"
                  >
                    إدارة الكورسات
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {loading ? (
                  <p className="text-xs text-slate-400 py-6 text-center">جاري التحميل...</p>
                ) : courses.length > 0 ? (
                  <div className="space-y-3">
                    {courses.slice(0, 4).map((c) => (
                      <Link
                        key={c.id}
                        href={`/assistant/courses/${c.id}`}
                        className="block p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 border border-slate-100 dark:border-slate-800 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                            {c.title}
                          </span>
                          <span className="text-[11px] font-bold text-slate-400 shrink-0">
                            {c.stage === 'high' ? 'ثانوي' : 'إعدادي'} · الصف {c.grade}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-1 font-semibold">
                          {c.description || 'كورس اللغة الإنجليزية الشامل'}
                        </p>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-400 font-bold text-xs">
                    لم يتم تعيين كورسات محددة لك بعد من قبل المعلم.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
