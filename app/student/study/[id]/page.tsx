'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchAllCourses, fetchUnitsByCourse, fetchItemsByUnit } from '@/lib/academicService';

export default function StudentStudyRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const itemId = params?.id as string;

  useEffect(() => {
    async function resolveAndRedirect() {
      if (!itemId) {
        router.replace('/student/courses');
        return;
      }

      try {
        const courses = await fetchAllCourses();
        for (const c of courses) {
          const units = await fetchUnitsByCourse(c.id);
          for (const u of units) {
            const items = await fetchItemsByUnit(u.id);
            if (items.some(it => it.id === itemId)) {
              router.replace(`/watch/${c.id}/${itemId}`);
              return;
            }
          }
        }
      } catch (err) {
        console.error(err);
      }

      router.replace(`/watch?itemId=${itemId}`);
    }

    resolveAndRedirect();
  }, [itemId, router]);

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3 p-8 text-center" dir="rtl">
      <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-sm font-black text-slate-600 dark:text-slate-400">جاري نقلك للمشغل المؤمّن للمحاضرة...</p>
    </div>
  );
}
