'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import StudentSupportDashboard from '@/components/support/StudentSupportDashboard';
import { fetchStudentEnrolledCourseIds, fetchAllCourses } from '@/lib/academicService';

export default function StudentSupportPage() {
  const { currentUser } = useAuth();
  const [enrolledCourses, setEnrolledCourses] = useState<{id: string, title: string}[]>([]);

  useEffect(() => {
    if (currentUser) {
      fetchStudentEnrolledCourseIds(currentUser.id).then(async (ids) => {
        const allCourses = await fetchAllCourses();
        const active = allCourses.filter(c => ids.includes(c.id)).map(c => ({ id: c.id, title: c.title }));
        setEnrolledCourses(active);
      });
    }
  }, [currentUser]);

  if (!currentUser) return <div className="p-8 text-center">الرجاء تسجيل الدخول</div>;

  return <StudentSupportDashboard currentUser={currentUser} enrolledCourses={enrolledCourses} />;
}
