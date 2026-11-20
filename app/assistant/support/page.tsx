'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Lock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import StaffSupportDashboard from '@/components/support/StaffSupportDashboard';
import { fetchMyAssistantProfileServerAction } from '@/app/actions/assistantActions';
import {
  AssistantPermissionsConfig,
  normalizeAssistantPermissions,
} from '@/lib/assistantPermissions';

export default function AssistantSupportPage() {
  const { currentUser, currentRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [allowedTypes, setAllowedTypes] = useState<Array<'academic' | 'technical'>>([]);
  const [assignedCourseIds, setAssignedCourseIds] = useState<string[]>([]);
  const [canManageAllCourses, setCanManageAllCourses] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadPermissions() {
      try {
        if (currentRole === 'super_admin' || currentRole === 'teacher') {
          if (!isMounted) return;
          setAllowedTypes(['academic', 'technical']);
          setCanManageAllCourses(true);
          setAuthorized(true);
          setLoading(false);
          return;
        }

        const res = await fetchMyAssistantProfileServerAction();
        if (!isMounted) return;

        if (!res.success || !res.data || res.data.isActive === false) {
          setAuthorized(false);
          setLoading(false);
          return;
        }

        const perms = normalizeAssistantPermissions(
          res.data.permissions as Record<string, any>,
          res.data.permissions as Partial<AssistantPermissionsConfig>
        );

        const types: Array<'academic' | 'technical'> = [];
        if (perms.canHandleAcademicSupport) types.push('academic');
        if (perms.canHandleTechnicalSupport) types.push('technical');

        setAllowedTypes(types);
        setAssignedCourseIds(perms.assignedCourseIds || []);
        setCanManageAllCourses(Boolean(perms.canManageAllCourses));
        setAuthorized(types.length > 0);
      } catch (err) {
        console.error('AssistantSupportPage permission error:', err);
        if (isMounted) setAuthorized(false);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadPermissions();
    return () => {
      isMounted = false;
    };
  }, [currentUser, currentRole]);

  if (!currentUser) {
    return (
      <div className="p-8 text-center text-sm font-bold text-slate-500">
        الرجاء تسجيل الدخول أولاً
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin" />
        <p className="text-slate-500 dark:text-slate-400 font-bold text-sm">
          جاري التحقق من صلاحيات الدعم والتذاكر...
        </p>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="max-w-xl mx-auto py-16 px-6 text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto border border-rose-200 dark:border-rose-500/20">
          <Lock className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">
            غير مصرح لك بالوصول لبوابة الدعم
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm font-semibold leading-relaxed">
            لم يتم تفعيل صلاحية الدعم الأكاديمي أو الدعم الفني لحسابك من قبل مستر محمد رضوان.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/assistant"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            العودة إلى الرئيسية
          </Link>
          <Link
            href="/assistant/permissions"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-black text-xs transition-colors"
          >
            عرض كشف صلاحياتي
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <StaffSupportDashboard
        currentUser={currentUser}
        assignedCourseIds={assignedCourseIds}
        canManageAllCourses={canManageAllCourses}
        allowedTicketTypes={allowedTypes}
      />
    </div>
  );
}
