'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  UserPlus, 
  Megaphone, 
  CalendarDays, 
  Wallet,
  Headphones,
  LogOut,
  Menu,
  X,
  MessageSquare
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

const SIDEBAR_LINKS = [
  { href: '/teacher', label: 'الرئيسية', icon: LayoutDashboard },
  { href: '/teacher/courses', label: 'المحتوى الأكاديمي', icon: BookOpen },
  { href: '/teacher/students', label: 'إدارة الطلاب', icon: Users },
  { href: '/teacher/messages', label: 'الرسائل والتواصل', icon: MessageSquare },
  { href: '/teacher/assistants', label: 'المساعدين', icon: UserPlus },
  { href: '/teacher/support', label: 'الدعم والتذاكر', icon: Headphones },
  { href: '/teacher/announcements', label: 'الإعلانات', icon: Megaphone },
  { href: '/teacher/notes', label: 'الملاحظات والجدول', icon: CalendarDays },
  { href: '/teacher/revenue', label: 'الإيرادات', icon: Wallet },
];

export function TeacherLayout({ children }: { children: React.ReactNode }) {
  const { currentRole, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Protected Route Logic with rock-solid session persistence on page reload
  useEffect(() => {
    // 1. Direct synchronous check of localStorage and cookie
    let resolvedRole = currentRole;
    if (resolvedRole !== 'teacher' && resolvedRole !== 'super_admin' && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('mr_radwan_current_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.role === 'teacher' || parsed.role === 'super_admin') {
            resolvedRole = parsed.role;
          }
        }
        if (resolvedRole !== 'teacher' && resolvedRole !== 'super_admin') {
          const match = document.cookie.match(/(^|;)\s*mr_radwan_role=([^;]+)/);
          if (match && (match[2] === 'teacher' || match[2] === 'super_admin')) {
            resolvedRole = match[2] as any;
          }
        }
      } catch {}
    }

    if (resolvedRole === 'teacher' || resolvedRole === 'super_admin') {
      setIsCheckingAuth(false);
      return;
    }

    // Only redirect if definitely not a teacher after hydration check
    const timeout = setTimeout(() => {
      let finalCheck = currentRole;
      try {
        const stored = localStorage.getItem('mr_radwan_current_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.role === 'teacher' || parsed.role === 'super_admin') {
            finalCheck = parsed.role;
          }
        }
      } catch {}

      if (finalCheck !== 'teacher' && finalCheck !== 'super_admin') {
        router.push('/login');
      } else {
        setIsCheckingAuth(false);
      }
    }, 200);

    return () => clearTimeout(timeout);
  }, [currentRole, router]);

  // If still verifying on initial reload, check local storage directly
  if (isCheckingAuth && currentRole !== 'teacher' && currentRole !== 'super_admin') {
    let isTeacherDirect = false;
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('mr_radwan_current_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.role === 'teacher' || parsed.role === 'super_admin') {
            isTeacherDirect = true;
          }
        }
      } catch {}
    }

    if (!isTeacherDirect) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 text-center font-sans" dir="rtl">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-xl shadow-violet-500/20 mb-3 animate-pulse">
            <LayoutDashboard className="w-7 h-7 text-white" />
          </div>
          <h3 className="text-base font-black text-slate-900 dark:text-white mb-1">جاري استعادة جلسة لوحة الإدارة...</h3>
          <p className="text-xs text-slate-500 font-bold">منصة الأستاذ محمد رضوان</p>
        </div>
      );
    }
  }

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row text-slate-900 dark:text-slate-100 font-sans" dir="rtl">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 shadow-sm">
        <h1 className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-l from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400">
          لوحة الإدارة
        </h1>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed md:sticky top-0 right-0 z-40 h-screen w-72 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-xl md:shadow-none
        transition-transform duration-300 ease-in-out flex flex-col
        ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 flex-1 flex flex-col h-full overflow-y-auto">
          {/* Logo / Header */}
          <div className="hidden md:flex items-center justify-between mb-10">
            <h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-l from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400">
              لوحة الإدارة
            </h1>
            <ThemeToggle />
          </div>

          <div className="md:hidden flex justify-between items-center mb-8">
            <span className="text-sm font-bold text-slate-500">القائمة الرئيسية</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-2">
            {SIDEBAR_LINKS.map((link) => {
              const isActive = pathname === link.href || (link.href !== '/teacher' && pathname?.startsWith(link.href));
              const Icon = link.icon;
              return (
                <Link 
                  key={link.href} 
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`
                    flex items-center gap-4 px-4 py-3.5 rounded-2xl font-bold transition-all duration-200
                    ${isActive 
                      ? 'bg-violet-600 text-white shadow-lg shadow-violet-200 dark:shadow-none' 
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                    }
                  `}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* User & Logout */}
          <div className="pt-6 mt-6 border-t border-slate-200 dark:border-slate-800">
            <button 
              onClick={handleLogout}
              className="flex items-center gap-4 w-full px-4 py-3.5 rounded-2xl font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all duration-200"
            >
              <LogOut className="w-5 h-5" />
              تسجيل الخروج
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        <div className="flex-1 p-4 md:p-8">
          {children}
        </div>
        
        {/* Footer */}
        <footer className="py-6 text-center border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mt-auto">
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
            Built With Developer & designer NOUR M. EL-SAIED 💚 💚
          </p>
        </footer>
      </main>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}
