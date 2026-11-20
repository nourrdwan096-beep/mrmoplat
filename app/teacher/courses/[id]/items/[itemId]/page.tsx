'use client';

import React from 'react';
import CourseItemBuilderClient from '@/components/shared/CourseItemBuilderClient';

export default function ItemBuilderPage({
  params,
}: {
  params: Promise<{ id: string; itemId: string }>;
}) {
  const { id: courseId, itemId } = React.use(params);
  return (
    <CourseItemBuilderClient
      courseId={courseId}
      itemId={itemId}
      mode="teacher"
      basePath="/teacher"
    />
  );
}
