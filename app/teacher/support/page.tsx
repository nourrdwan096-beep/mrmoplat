'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import StaffSupportDashboard from '@/components/support/StaffSupportDashboard';

export default function TeacherSupportPage() {
  const { currentUser } = useAuth();
  if (!currentUser) return <div className="p-8 text-center">الرجاء تسجيل الدخول</div>;
  
  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <StaffSupportDashboard currentUser={currentUser} />
    </div>
  );
}
