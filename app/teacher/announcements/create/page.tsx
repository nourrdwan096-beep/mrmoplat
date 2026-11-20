'use client';

import React from 'react';
import AnnouncementFormClient from '@/components/shared/AnnouncementFormClient';

export default function CreateAnnouncementPage() {
  return <AnnouncementFormClient mode="create" basePath="/teacher" />;
}
