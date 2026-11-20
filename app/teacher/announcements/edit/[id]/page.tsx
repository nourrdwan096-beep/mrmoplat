'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import AnnouncementFormClient from '@/components/shared/AnnouncementFormClient';

export default function EditAnnouncementPage() {
  const params = useParams();
  const announcementId = params?.id as string;
  return (
    <AnnouncementFormClient
      mode="edit"
      basePath="/teacher"
      announcementId={announcementId}
    />
  );
}
