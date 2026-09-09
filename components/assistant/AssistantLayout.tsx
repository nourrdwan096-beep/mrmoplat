'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Headphones,
  Mail,
  LogOut,
  Menu,
  X,
  ShieldAlert,
  Sun,
  Moon,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { fetchAssistants, AssistantData } from '@/lib/teacherService';
import ThemeToggle from '@/components/ThemeToggle';

export function AssistantLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, currentRole, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [assistantData, setAssistantData] = useState<AssistantData | null>(null);
  const [loading, setLoading] = useState(true);

  // Load Assistant Permissions
  useEffect(() => {
    async function loadAssistant() {
      if (currentRole !== 'assistant' && currentRole !== 'teacher' && currentRole !== 'super_admin') {
        router.push('/login');
        return;
      }

      if (currentRole === 'assistant' && currentUser?.id) {
        try {
          const all = await fetchAssistants();
          const found = all.find((a) => a.id === currentUser.id || a.email === currentUser.email);
          if (found) {
            setAssistantData(found);
          }
        } catch (err) {
          console.error(err);
        }
      }
      setLoading(false);
    }
    loadAssistant();
  }, [currentRole, currentUser, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 font-sans" dir="rtl">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold text-slate-500">جاري التحقق من صلاحيات المساعد...</p>
        </div>
      </div>
    );
  }

  // If Frozen
  if (assistantData?.isFrozen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 text-slate-900 dark:text-slate-100 font-sans" dir="rtl">
        <div className="max-w-md w-full text-center space-y-6 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-rose-200 dark:border-rose-900 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto text-2xl font-black">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-rose-600 dark:text-rose-400">حساب المساعد مجمد</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 font-semibold leading-relaxed">
            تم تجميد حسابك مؤقتاً من قبل مستر محمد رضوان. يرجى التواصل مع الإدارة لفك التجميد.
          </p>
          <button
            onClick={() => {
              logout();
              router.push('/');
            }}
            className="w-full py-3 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold hover:bg-slate-300"
          >
            تسجيل الخروج
          </button>
        </div>
      </div>
    );
  }

  // Dynamic Navigation Links based on Permissions strictly
  const permissions = assistantData?.permissions;
  
  // Check if assistant has any courses assigned or all courses enabled
  const hasCourseAccess = permissions
    ? permissions.canManageAllCourses || (permissions.assignedCourseIds && permissions.assignedCourseIds.length > 0)
    : false;

  const hasSupportAccess = permissions
    ? permissions.canHandleAcademicSupport || permissions.canHandleTechnicalSupport
    : false;

  const hasStudentsAccess = permissions ? permissions.canManageStudents : false;
  const hasMessagesAccess = permissions ? (permissions.canSendMessages ?? true) : false;

  // If no permissions assigned yet
  const hasAnyPermission = hasCourseAccess || hasSupportAccess || hasStudentsAccess || hasMessagesAccess;

  const navLinks = [
    { href: '/assistant', label: 'الرئيسية', icon: LayoutDashboard, visible: true },
    {
      href: '/assistant/students',
      label: 'إدارة الطلاب',
      icon: Users,
      visible: hasStudentsAccess,
    },
    {
      href: '/assistant/courses',
      label: 'الكورسات المخصصة',
      icon: BookOpen,
      visible: hasCourseAccess,
    },
    {
      href: '/assistant/support',
      label: 'الدعم والتذاكر الذكية',
      icon: Headphones,
      visible: hasSupportAccess,
    },
    { 
      href: '/assistant/messages', 
      label: 'الرسائل الواردة', 
      icon: Mail, 
      visible: hasMessagesAccess 
    },
  ].filter((link) => link.visible);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row text-slate-900 dark:text-slate-100 font-sans" dir="rtl">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 shadow-sm">
        <div>
          <h1 className="text-lg font-black text-emerald-600 dark:text-emerald-400">
            لوحة المساعد
          </h1>
          <p className="text-xs text-slate-500 font-bold">{currentUser?.fullName}</p>
        </div>
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
      <aside
        className={`
        fixed md:sticky top-0 right-0 z-40 h-screen w-72 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-xl md:shadow-none
        transition-transform duration-300 ease-in-out flex flex-col
        ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
      `}
      >
        <div className="p-6 flex-1 flex flex-col h-full overflow-y-auto">
          {/* Logo */}
          <div className="hidden md:flex items-center justify-between mb-8">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-black text-xs mb-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                مساعد معتمد
              </div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white">
                لوحة تحكم المساعد
              </h1>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">{currentUser?.fullName}</p>
            </div>
            <ThemeToggle />
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-2">
            {navLinks.map((link) => {
              const isActive =
                pathname === link.href || (link.href !== '/assistant' && pathname?.startsWith(link.href));
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`
                    flex items-center gap-3.5 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all duration-200
                    ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                    }
                  `}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="pt-6 mt-6 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={handleLogout}
              className="flex items-center gap-4 w-full px-4 py-3 rounded-2xl font-bold text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              تسجيل الخروج
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        <div className="flex-1 p-4 md:p-8">{children}</div>

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
