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

  // Protected Route Logic
  useEffect(() => {
    if (currentRole !== 'teacher' && currentRole !== 'super_admin') {
      router.push('/login');
    }
  }, [currentRole, router]);

  if (currentRole !== 'teacher' && currentRole !== 'super_admin') {
    return null;
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
