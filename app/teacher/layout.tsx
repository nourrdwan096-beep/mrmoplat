import React from 'react';
import { TeacherLayout } from '@/components/teacher/TeacherLayout';

export const metadata = {
  title: 'لوحة الإدارة | Easy English مع مستر محمد رضوان',
  description: 'لوحة التحكم وإدارة منصة Easy English لتدريس اللغة الإنجليزية للثانوية العامة والأزهرية مع مستر محمد رضوان'
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <TeacherLayout>
      {children}
    </TeacherLayout>
  );
}
