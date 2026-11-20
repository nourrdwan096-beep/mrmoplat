'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowRight } from 'lucide-react';
import { fetchMyAssistantProfileServerAction } from '@/app/actions/assistantActions';
import AnnouncementsManagerClient from '@/components/shared/AnnouncementsManagerClient';
import { useAuth } from '@/context/AuthContext';

export default function AssistantAnnouncementsPage() {
  const { currentRole } = useAuth();
  const [status, setStatus] = useState<'loading' | 'allowed' | 'denied'>('loading');

  useEffect(() => {
    let active = true;
    async function check() {
      if (currentRole === 'teacher' || currentRole === 'super_admin') {
        if (active) setStatus('allowed');
        return;
      }
      const res = await fetchMyAssistantProfileServerAction();
      if (!active) return;
      if (res.success && res.data?.permissions?.canPublishAnnouncements) {
        setStatus('allowed');
      } else {
        setStatus('denied');
      }
    }
    check();
    return () => {
      active = false;
    };
  }, [currentRole]);

  if (status === 'loading') {
    return (
      <div className="min-h-[360px] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (status === 'denied') {
    return (
      <div className="max-w-lg mx-auto my-12 bg-white dark:bg-slate-900 rounded-3xl p-8 border border-rose-200 dark:border-rose-900/50 text-center space-y-5 shadow-lg">
        <div className="w-16 h-16 rounded-2xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">
          غير مصرح لك بإدارة الإعلانات
        </h2>
        <p className="text-sm font-bold text-slate-500 dark:text-slate-400 leading-relaxed">
          صلاحية نشر وتعديل الإعلانات غير مفعّلة لحسابك من قِبل مستر محمد رضوان.
        </p>
        <Link
          href="/assistant"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-black text-xs"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة للرئيسية</span>
        </Link>
      </div>
    );
  }

  return <AnnouncementsManagerClient basePath="/assistant" />;
}
