'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  BookOpen,
  User,
  MessageSquare,
  HelpCircle,
  PenTool,
  CalendarDays,
  Wallet,
  TrendingUp,
  MonitorSmartphone,
  LogOut,
  Menu,
  Lock,
  Moon,
  Sun,
  X,
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '@/context/ThemeContext';
import ThemeToggle from '@/components/ThemeToggle';
import NotificationBell from '@/components/notifications/NotificationBell';

const STUDENT_NAV_ITEMS = [
  { id: 'dashboard', label: 'لوحة التحكم', icon: TrendingUp, href: '/student' },
  { id: 'courses', label: 'كورساتي ومنهجي', icon: BookOpen, href: '/student/courses' },
  { id: 'progress', label: 'تقدمي الأكاديمي', icon: Award, href: '/student/progress' },
  { id: 'schedule', label: 'جدول المذاكرة', icon: CalendarDays, href: '/student/schedule' },
  { id: 'notes', label: 'مفكرة ملاحظاتي', icon: PenTool, href: '/student/notes' },
  { id: 'messages', label: 'الرسائل الواردة', icon: MessageSquare, href: '/student/messages' },
  { id: 'support', label: 'الدعم الفني والأكاديمي', icon: HelpCircle, href: '/student/support' },
  { id: 'wallet', label: 'المحفظة', icon: Wallet, href: '/student/wallet' },
  { id: 'devices', label: 'أجهزتي المسجلة', icon: MonitorSmartphone, href: '/student/devices' },
  { id: 'profile', label: 'الملف الشخصي', icon: User, href: '/student/profile' },
];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { currentUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsHydrated(true), 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isHydrated) {
      if (!currentUser) {
        router.push('/login');
      } else if (currentUser.role !== 'student') {
        router.push('/');
      } else if (currentUser.status !== 'active') {
        // Only active students can access the dashboard.
        // If pending, they should see a waiting screen.
        // For now, redirect to a pending view or show banner.
      }
    }
  }, [currentUser, isHydrated, router]);

  if (!isHydrated || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // If student is pending, show a locked screen
  if (currentUser.status !== 'active') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 p-8 text-center">
          <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-4">حسابك قيد المراجعة</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
            مرحباً بك في المنصة. حسابك حالياً قيد المراجعة من قبل الإدارة وسيتم تفعيله قريباً. 
            يرجى الانتظار حتى تصلك رسالة التأكيد.
          </p>
          <button
            onClick={logout}
            className="w-full py-3 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            تسجيل الخروج
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row text-slate-900 dark:text-slate-100 font-sans selection:bg-emerald-500 selection:text-white">
      
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-50 sticky top-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full overflow-hidden bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-black text-sm border border-emerald-200 dark:border-emerald-500/20 shrink-0 relative">
            {currentUser.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src={currentUser.avatarUrl} 
                alt={currentUser.fullName || 'الطالب'} 
                className="w-full h-full object-cover"
              />
            ) : (
              currentUser.fullName?.charAt(0) || 'ط'
            )}
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate max-w-[140px] sm:max-w-[200px]">
              {currentUser.fullName}
            </h2>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">حساب طالب نشط</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <ThemeToggle />
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            aria-label="القائمة"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Sidebar Navigation */}
      <AnimatePresence>
        {(isMobileMenuOpen || (typeof window !== 'undefined' && window.innerWidth >= 768)) && (
          <motion.aside
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`
              fixed md:sticky top-0 right-0 h-screen w-72 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 z-40
              flex flex-col overflow-y-auto transform transition-transform duration-300 ease-in-out
              ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
            `}
          >
            <div className="p-5 flex flex-col gap-6 flex-1">
              {/* Profile Card with Notification Bell */}
              <div className="hidden md:flex items-center justify-between gap-2.5 bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/60">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-black text-base border border-emerald-200 dark:border-emerald-500/20 shrink-0 relative">
                    {currentUser.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={currentUser.avatarUrl} 
                        alt={currentUser.fullName || 'الطالب'} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      currentUser.fullName?.charAt(0) || 'ط'
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                      {currentUser.fullName}
                    </h2>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      {currentUser.phone}
                    </p>
                  </div>
                </div>
                <NotificationBell />
              </div>

              {/* Navigation Links */}
              <nav className="flex flex-col gap-1.5 flex-1">
                {STUDENT_NAV_ITEMS.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`
                        flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all
                        ${isActive 
                          ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' 
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                        }
                      `}
                    >
                      <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              {/* Theme Toggle & Logout Button */}
              <div className="mt-auto pt-6 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between px-3.5 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">مظهر المنصة</span>
                  <ThemeToggle />
                </div>
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  <span>تسجيل الخروج</span>
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 w-full min-w-0 overflow-x-hidden relative">
        {/* Overlay for mobile when sidebar is open */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
        
        {children}

        {/* Footer Signature */}
        <footer className="p-6 text-center text-xs font-bold text-slate-400 dark:text-slate-500 border-t border-slate-200 dark:border-slate-800 mt-auto bg-white dark:bg-slate-900">
          Built With Developer & Designer NOUR M. EL-SAIED 💚 💚
        </footer>
      </main>

    </div>
  );
}
