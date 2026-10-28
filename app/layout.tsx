import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import GlobalNotificationPermissionPrompt from '@/components/notifications/GlobalNotificationPermissionPrompt';
import AnnouncementsBanner from '@/components/AnnouncementsBanner';

export const metadata: Metadata = {
  title: {
    default: 'Easy English مع مستر محمد رضوان | منصة اللغة الإنجليزية للثانوية العامة والأزهرية',
    template: '%s | Easy English مع مستر محمد رضوان',
  },
  description: 'المنصة التعليمية المتطورة لتدريس وتأسيس مادة اللغة الإنجليزية لطلاب المرحلة الثانوية العامة والأزهرية، شرح القواعد والكلمات والقصة وبنك الأسئلة مع مستر محمد رضوان.',
  keywords: [
    'Easy English',
    'Easy English مع مستر محمد رضوان',
    'مستر محمد رضوان',
    'محمد رضوان',
    'منصة إنجليزي ثانوية عامة',
    'اللغة الإنجليزية للثانوية العامة',
    'اللغة الإنجليزية للثانوية الأزهرية',
    'شرح جرامر إنجليزي',
    'مراجعات إنجليزي ثانوية عامة',
  ],
  authors: [{ name: 'مستر محمد رضوان' }],
  creator: 'مستر محمد رضوان',
  publisher: 'Easy English مع مستر محمد رضوان',
  formatDetection: {
    telephone: true,
  },
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
  openGraph: {
    title: 'Easy English مع مستر محمد رضوان | منصة اللغة الإنجليزية للثانوية العامة والأزهرية',
    description: 'المنصة التعليمية المتطورة لتدريس وتأسيس مادة اللغة الإنجليزية لطلاب المرحلة الثانوية العامة والأزهرية مع مستر محمد رضوان.',
    siteName: 'Easy English مع مستر محمد رضوان',
    locale: 'ar_EG',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Easy English مع مستر محمد رضوان | منصة اللغة الإنجليزية للثانوية العامة والأزهرية',
    description: 'المنصة التعليمية لتدريس وشرح مادة اللغة الإنجليزية لطلاب الثانوية العامة والأزهرية مع مستر محمد رضوان.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: 'Easy English مع مستر محمد رضوان',
    alternateName: 'Easy English Platform',
    description: 'المنصة التعليمية المتطورة لتدريس وتأسيس مادة اللغة الإنجليزية لطلاب المرحلة الثانوية العامة والأزهرية.',
    url: 'https://easyenglish-mrradwan.com',
    logo: 'https://easyenglish-mrradwan.com/logo.png',
    founder: {
      '@type': 'Person',
      name: 'محمد رضوان (Mr. Mohamed Radwan)',
      jobTitle: 'كبير معلمي ومعدي مادة اللغة الإنجليزية',
    },
    educationalCredentialAwarded: 'شهادة إتمام كورسات اللغة الإنجليزية للثانوية العامة والأزهرية',
  };

  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="antialiased bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen" suppressHydrationWarning>
        <ThemeProvider>
          <AuthProvider>
            <AnnouncementsBanner />
            {children}
            <GlobalNotificationPermissionPrompt />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
