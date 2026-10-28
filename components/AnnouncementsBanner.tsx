'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { fetchAnnouncements, AnnouncementData } from '@/lib/teacherService';
import { Sparkles, MessageCircle, ExternalLink, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function AnnouncementsBanner() {
  const pathname = usePathname();
  const [announcements, setAnnouncements] = useState<AnnouncementData[]>([]);

  // Do not display banner on teacher or assistant administrative panels
  const isStaffRoute = pathname?.startsWith('/teacher') || pathname?.startsWith('/assistant');

  useEffect(() => {
    fetchAnnouncements()
      .then((data) => {
        const published = data.filter((a) => a.isPublished !== false);
        setAnnouncements(published);
      })
      .catch((err) => console.error(err));
  }, []);

  if (isStaffRoute) return null;

  const currentAnnouncement = announcements[0] || {
    id: 'non_profit_announcement',
    title: 'تنويه رسمي: منصة Easy English مبادرة تعليمية غير ربحية • باب الاشتراكات المالية مغلق حالياً ولا يتم استقبال أي مدفوعات • للتواصل المباشر مع مستر محمد رضوان',
    announcementType: 'general',
    isPublished: true,
  };

  return (
    <div 
      dir="rtl"
      className="relative z-40 overflow-hidden bg-gradient-to-r from-sky-500/10 via-emerald-500/10 to-teal-500/10 dark:from-sky-950/50 dark:via-emerald-950/40 dark:to-teal-950/50 border-b border-emerald-500/25 py-2 px-3 sm:px-6 text-xs transition-colors backdrop-blur-md"
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
        
        {/* Main Content */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-gradient-to-r from-sky-600 to-emerald-600 text-white shadow-sm shrink-0">
            <Sparkles className="w-3 h-3 text-sky-200 animate-pulse" />
            <span>منصة غير ربحية</span>
          </span>

          <p className="font-bold text-slate-800 dark:text-emerald-100 text-[11px] sm:text-xs truncate">
            {currentAnnouncement.title}
          </p>
        </div>

        {/* Quick WhatsApp Teacher Contact */}
        <div className="flex items-center gap-2 shrink-0">
          <a
            href="https://wa.me/201552191172?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D9%8B%20%D9%85%D8%B3%D8%AA%D8%B1%20%D9%85%D8%AD%D9%85%D8%AF%D8%8C%20%D8%A3%D9%88%D8%AF%20%D8%A7%D9%84%D8%AA%D9%88%D8%A7%D8%B5%D9%84%20%D9%85%D8%B9%D9%83%D9%85%20%D8%A8%D8%AE%D8%B5%D9%88%D8%B5%20%D9%83%D9%88%D8%B1%D8%B3%D8%A7%D8%AA%20Easy%20English"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] shadow-sm transition-all hover:scale-105 active:scale-95"
            title="تواصل مع مستر محمد رضوان"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>تواصل مع المعلم واتساب</span>
          </a>

          <Link
            href="/policies"
            className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-sky-700 dark:text-sky-300 hover:underline px-2 py-0.5"
          >
            <span>التفاصيل</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

      </div>
    </div>
  );
}
