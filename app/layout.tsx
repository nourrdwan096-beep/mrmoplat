import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import GlobalNotificationPermissionPrompt from '@/components/notifications/GlobalNotificationPermissionPrompt';

export const metadata: Metadata = {
  title: 'منصة مستر محمد رضوان التعليمية | MR. MOHAMED RADWAN',
  description: 'المنصة التعليمية المتطورة لتدريس وتأسيس اللغة الإنجليزية للمرحلتين الإعدادية والثانوية - عام وأزهر مع مستر محمد رضوان',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className="antialiased bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen" suppressHydrationWarning>
        <ThemeProvider>
          <AuthProvider>
            {children}
            <GlobalNotificationPermissionPrompt />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
