'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchMyAssistantProfileServerAction } from '@/app/actions/assistantActions';
import { fetchAllCourses, CourseData } from '@/lib/academicService';
import {
  AssistantPermissionsConfig,
  FULL_COURSE_PERMISSIONS,
  FULL_STUDENT_PERMISSIONS,
  normalizeAssistantPermissions,
} from '@/lib/assistantPermissions';
import AssistantPermissionsManifest from '@/components/shared/AssistantPermissionsManifest';

export default function AssistantPermissionsPage() {
  const { currentUser, currentRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<AssistantPermissionsConfig | null>(null);
  const [courses, setCourses] = useState<CourseData[]>([]);

  useEffect(() => {
    let isMounted = true;

    async function loadManifest() {
      try {
        const allCourses = await fetchAllCourses();
        if (!isMounted) return;
        setCourses(allCourses || []);

        if (currentRole === 'teacher' || currentRole === 'super_admin') {
          setPermissions({
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
          });
          setLoading(false);
          return;
        }

        const res = await fetchMyAssistantProfileServerAction();
        if (!isMounted) return;
        if (res.success && res.data) {
          const normalized = normalizeAssistantPermissions(
            res.data.permissions as Record<string, any>,
            res.data.permissions as Partial<AssistantPermissionsConfig>
          );
          setPermissions(normalized);
        } else {
          setPermissions(normalizeAssistantPermissions(null, null));
        }
      } catch (err) {
        console.error('AssistantPermissionsPage load error:', err);
        if (isMounted) {
          setPermissions(normalizeAssistantPermissions(null, null));
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadManifest();
    return () => {
      isMounted = false;
    };
  }, [currentUser, currentRole]);

  if (loading || !permissions) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin" />
        <p className="text-slate-500 dark:text-slate-400 font-bold text-sm">
          جاري تحميل كشف صلاحياتك المعتمدة...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/assistant"
            className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="العودة للرئيسية"
          >
            <ArrowRight className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              كشف صلاحياتي
            </h1>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">
              مرجع مباشر وشامل لجميع الصلاحيات المسندة لحسابك من مستر محمد رضوان
            </p>
          </div>
        </div>
      </div>

      <AssistantPermissionsManifest
        permissions={permissions}
        courses={courses}
        roleTitle={permissions.roleTitle}
      />
    </div>
  );
}
