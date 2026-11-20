'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchMyAssistantProfileServerAction } from '@/app/actions/assistantActions';
import {
  AssistantPermissionsConfig,
  CourseGranularPermissions,
  canAccessCourse,
  resolveCoursePermissions,
  FULL_COURSE_PERMISSIONS,
} from '@/lib/assistantPermissions';
import CourseItemBuilderClient from '@/components/shared/CourseItemBuilderClient';

export default function AssistantItemBuilderPage({
  params,
}: {
  params: Promise<{ id: string; itemId: string }>;
}) {
  const { id: courseId, itemId } = React.use(params);
  const { currentRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [coursePerms, setCoursePerms] = useState<CourseGranularPermissions | null>(null);
  const [allowedTargetIds, setAllowedTargetIds] = useState<string[] | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      if (currentRole === 'teacher' || currentRole === 'super_admin') {
        if (active) {
          setCoursePerms(FULL_COURSE_PERMISSIONS);
          setAllowed(true);
          setLoading(false);
        }
        return;
      }

      try {
        const res = await fetchMyAssistantProfileServerAction();
        if (!active) return;
        const perms = res.success
          ? (res.data?.permissions as AssistantPermissionsConfig | undefined)
          : undefined;

        if (!perms || !canAccessCourse(perms, courseId)) {
          setAllowed(false);
          setLoading(false);
          return;
        }

        const cp = resolveCoursePermissions(perms, courseId);
        const canEnterItemBuilder =
          cp.canEditCourseSettings ||
          cp.canAddExams ||
          cp.canAddHomework ||
          cp.canViewQuestions ||
          cp.canAddQuestions ||
          cp.canEditQuestions ||
          cp.canDeleteQuestions;

        if (!canEnterItemBuilder) {
          setAllowed(false);
          setLoading(false);
          return;
        }

        setCoursePerms(cp);
        setAllowedTargetIds(perms.canManageAllCourses ? null : perms.assignedCourseIds);
        setAllowed(true);
      } catch (err) {
        console.error(err);
        if (active) setAllowed(false);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [courseId, currentRole]);

  if (loading) {
    return (
      <div className="min-h-[420px] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-bold text-slate-500">جاري التحقق من صلاحيات بنك الأسئلة...</p>
      </div>
    );
  }

  if (!allowed || !coursePerms) {
    return (
      <div className="max-w-lg mx-auto my-12 bg-white dark:bg-slate-900 rounded-3xl p-8 border border-rose-200 dark:border-rose-900/50 text-center space-y-5 shadow-lg">
        <div className="w-16 h-16 rounded-2xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">
          غير مصرح لك بالوصول إلى بنك أسئلة هذا الكورس
        </h2>
        <p className="text-sm font-bold text-slate-500 dark:text-slate-400 leading-relaxed">
          الصلاحيات الممنوحة لك لهذا الكورس لا تتضمن إدارة الأسئلة أو إعدادات الاختبارات.
        </p>
        <Link
          href={`/assistant/courses/${courseId}`}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-black text-xs"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة للكورس</span>
        </Link>
      </div>
    );
  }

  return (
    <CourseItemBuilderClient
      courseId={courseId}
      itemId={itemId}
      mode={currentRole === 'teacher' || currentRole === 'super_admin' ? 'teacher' : 'assistant'}
      basePath="/assistant"
      coursePerms={coursePerms}
      allowedTargetCourseIds={allowedTargetIds}
    />
  );
}
