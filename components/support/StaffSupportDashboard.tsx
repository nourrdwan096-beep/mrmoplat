'use client';

import React from 'react';
import { SupportManagementView } from './SupportManagementView';

interface StaffSupportDashboardProps {
  currentUser: any;
  assignedCourseIds?: string[];
  canManageAllCourses?: boolean;
  allowedTicketTypes?: Array<'academic' | 'technical'>;
}

export default function StaffSupportDashboard({
  currentUser,
  assignedCourseIds,
  canManageAllCourses,
  allowedTicketTypes,
}: StaffSupportDashboardProps) {
  const role =
    currentUser?.role === 'super_admin' || currentUser?.role === 'teacher'
      ? 'teacher'
      : 'assistant';

  return (
    <SupportManagementView
      viewMode={role}
      assignedCourseIds={assignedCourseIds}
      canManageAllCourses={canManageAllCourses}
      allowedTicketTypes={allowedTicketTypes}
    />
  );
}
