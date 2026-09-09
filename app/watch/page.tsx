'use client';

import React, { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { fetchAllCourses, fetchUnitsByCourse, fetchItemsByUnit } from '@/lib/academicService';

function WatchRouterContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const courseId = searchParams?.get('courseId');
  const itemId = searchParams?.get('itemId');

  useEffect(() => {
    async function redirectWatch() {
      if (courseId && itemId) {
        router.replace(`/watch/${courseId}/${itemId}`);
        return;
      }

      if (courseId) {
        const units = await fetchUnitsByCourse(courseId);
        if (units.length > 0) {
          const items = await fetchItemsByUnit(units[0].id);
          const firstVideo = items.find((i) => i.itemType === 'video') || items[0];
          if (firstVideo) {
            router.replace(`/watch/${courseId}/${firstVideo.id}`);
            return;
          }
        }
      }

      // Fallback: pick first course
      const courses = await fetchAllCourses();
      if (courses.length > 0) {
        const firstCourse = courses[0];
        const units = await fetchUnitsByCourse(firstCourse.id);
        if (units.length > 0) {
          const items = await fetchItemsByUnit(units[0].id);
          const firstVideo = items.find((i) => i.itemType === 'video') || items[0];
          if (firstVideo) {
            router.replace(`/watch/${firstCourse.id}/${firstVideo.id}`);
            return;
          }
        }
      }

      // If no course found, go to homepage
      router.replace('/');
    }

    redirectWatch();
  }, [courseId, itemId, router]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 space-y-4 font-sans">
      <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center animate-pulse">
        <span className="text-xl">🎓</span>
      </div>
      <p className="text-sm font-black text-slate-300">جاري توجيهك إلى صفحة المشغل المؤمّن...</p>
    </div>
  );
}

export default function WatchQueryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <WatchRouterContent />
    </Suspense>
  );
}
