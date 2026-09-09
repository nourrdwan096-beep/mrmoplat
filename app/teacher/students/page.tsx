import React from 'react';
import StudentsManagementClient from './StudentsManagementClient';

export const metadata = {
  title: 'إدارة الطلاب | لوحة الإدارة',
  description: 'مراجعة طلبات الانضمام والطلاب المقيدين في المنصة',
};

export default function StudentsPage() {
  return <StudentsManagementClient />;
}
