'use client';

import React from 'react';
import { SupportManagementView } from './SupportManagementView';

export default function StaffSupportDashboard({ currentUser }: { currentUser: any }) {
  const role = currentUser?.role === 'super_admin' || currentUser?.role === 'teacher' ? 'teacher' : 'assistant';
  return <SupportManagementView viewMode={role} />;
}
