'use client';

import React, { useState, useEffect } from 'react';
import { fetchAnnouncements, AnnouncementData } from '@/lib/teacherService';
import { Flame, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function AnnouncementsBanner() {
  const [announcements, setAnnouncements] = useState<AnnouncementData[]>([]);

  useEffect(() => {
    fetchAnnouncements()
      .then((data) => {
        const published = data.filter((a) => a.isPublished !== false);
        setAnnouncements(published);
      })
      .catch((err) => console.error(err));
  }, []);

  const currentAnnouncement = announcements[0];

  if (!currentAnnouncement) return null;

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border-b border-amber-500/20 py-2.5 px-4 text-xs sm:text-sm">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500 text-slate-950 animate-pulse">
            {currentAnnouncement.announcementType === 'top_student' ? (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                تكريم الأوائل
              </>
            ) : (
              <>
                <Flame className="w-3.5 h-3.5" />
                تنبيه هام
              </>
            )}
          </span>
          <Link
            href="#announcements"
            className="font-bold text-slate-900 dark:text-amber-200 hover:underline line-clamp-1"
          >
            {currentAnnouncement.title}
          </Link>
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400">
          <Link href="#announcements" className="hover:text-amber-500 transition-colors">
            اضغط لمشاهدة تفاصيل الإعلان في لوحة الإعلانات 👈
          </Link>
        </div>
      </div>
    </div>
  );
}
