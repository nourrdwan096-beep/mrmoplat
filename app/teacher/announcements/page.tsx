'use client';

import React from 'react';
import AnnouncementsManagerClient from '@/components/shared/AnnouncementsManagerClient';

export default function TeacherAnnouncementsPage() {
  return <AnnouncementsManagerClient basePath="/teacher" />;
}
