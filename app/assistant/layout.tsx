import React from 'react';
import { AssistantLayout } from '@/components/assistant/AssistantLayout';

export const metadata = {
  title: 'لوحة تحكم المساعد | منصة مستر محمد رضوان',
  description: 'لوحة تحكم المساعد لإدارة الطلاب والتذاكر الأكاديمية والفنية والكورسات',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AssistantLayout>{children}</AssistantLayout>;
}
