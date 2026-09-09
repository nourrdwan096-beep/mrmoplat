import React from 'react';
import CourseViewClient from './CourseViewClient';

export default async function StudentCourseDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return <CourseViewClient courseId={resolvedParams.id} />;
}
