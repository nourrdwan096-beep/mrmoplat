import React from 'react';
import { TeacherLayout } from '@/components/teacher/TeacherLayout';

export const metadata = {
  title: 'لوحة الإدارة - مستر محمد رضوان',
  description: 'لوحة التحكم الخاصة بإدارة المنصة التعليمية'
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <TeacherLayout>
      {children}
    </TeacherLayout>
  );
}
