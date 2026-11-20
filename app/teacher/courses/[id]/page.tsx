'use client';

import React from 'react';
import CourseDetailManagerClient from '@/components/shared/CourseDetailManagerClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function TeacherCourseDetailPage({ params }: PageProps) {
  const resolvedParams = React.use(params);
  return (
    <CourseDetailManagerClient
      courseId={resolvedParams.id}
      mode="teacher"
      basePath="/teacher"
    />
  );
}
