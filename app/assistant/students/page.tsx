'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Lock } from 'lucide-react';
import StudentsManagementClient from '@/app/teacher/students/StudentsManagementClient';
import { useAuth } from '@/context/AuthContext';
import { fetchMyAssistantProfileServerAction } from '@/app/actions/assistantActions';
import {
  AssistantPermissionsConfig,
  hasAnyStudentPermission,
  normalizeAssistantPermissions,
} from '@/lib/assistantPermissions';

export default function AssistantStudentsPage() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function verifyAccess() {
      try {
        if (currentUser?.role === 'super_admin' || currentUser?.role === 'teacher') {
          if (isMounted) {
            setAuthorized(true);
            setLoading(false);
          }
          return;
        }

        const res = await fetchMyAssistantProfileServerAction();
        if (!isMounted) return;

        if (!res.success || !res.data || res.data.isActive === false) {
          setAuthorized(false);
          setLoading(false);
          return;
        }

        const normalized = normalizeAssistantPermissions(
          res.data.permissions as Record<string, any>,
          res.data.permissions as Partial<AssistantPermissionsConfig>
        );
        setAuthorized(hasAnyStudentPermission(normalized.studentPermissions));
      } catch (err) {
        console.error('AssistantStudentsPage access error:', err);
        if (isMounted) setAuthorized(false);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    verifyAccess();
    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin" />
        <p className="text-slate-500 dark:text-slate-400 font-bold text-sm">
          جاري التحقق من صلاحيات إدارة الطلاب...
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
            غير مصرح لك بالوصول لإدارة الطلاب
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm font-semibold leading-relaxed">
            لم يتم تفعيل أي من صلاحيات شؤون الطلاب لحسابك من قبل مستر محمد رضوان.
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

  return <StudentsManagementClient />;
}
