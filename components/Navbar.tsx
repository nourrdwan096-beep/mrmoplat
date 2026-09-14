'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import ThemeToggle from '@/components/ThemeToggle';
import NotificationBell from '@/components/notifications/NotificationBell';
import {
  Sun,
  Moon,
  BookOpen,
  LogIn,
  UserPlus,
  LogOut,
  Sparkles,
  PhoneCall,
  Menu,
  X,
  Users,
  ShieldCheck,
  Star
} from 'lucide-react';

interface NavbarProps {
  onOpenLogin?: () => void;
  onOpenRegister?: () => void;
}

export default function Navbar({ onOpenLogin, onOpenRegister }: NavbarProps) {
  const router = useRouter();
  const { theme, toggleTheme, mounted } = useTheme();
  const { currentUser, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const handleLoginClick = () => {
    if (onOpenLogin) {
      onOpenLogin();
    } else {
      router.push('/login');
    }
  };

  const handleRegisterClick = () => {
    if (onOpenRegister) {
      onOpenRegister();
    } else {
      router.push('/register');
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollTop;
      const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scroll = windowHeight > 0 ? (totalScroll / windowHeight) * 100 : 0;
      setScrollProgress(scroll);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/90 dark:bg-slate-950/90 border-b border-slate-200/80 dark:border-slate-800/80 transition-colors duration-300">
      {/* Scroll Progress Bar */}
      <div 
        className="absolute top-0 right-0 h-1.5 z-50 overflow-hidden w-full transition-all duration-150 ease-out"
        style={{ width: `${scrollProgress}%` }}
      >
        <div 
          className="absolute top-0 right-0 h-full w-screen"
          style={{ 
            background: 'linear-gradient(to left, #ef4444, #f59e0b, #10b981, #3b82f6)'
          }}
        />
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Right Section: Brand & Logo */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link href="/" className="flex items-center gap-2 sm:gap-3 group">
              <div className="relative w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-full shadow-sm group-hover:scale-105 transition-transform duration-300 overflow-hidden flex items-center justify-center">
                {!logoError ? (
                  <Image
                    src="/logo.png"
                    alt="Mr Mohamed Radwan Platform Logo"
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <div className="w-full h-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                    <span className="text-base sm:text-lg font-extrabold text-violet-600 dark:text-violet-400">
                      MR
                    </span>
                  </div>
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm sm:text-base lg:text-lg font-black tracking-tight text-slate-900 dark:text-white truncate">
                    مستر / محمد رضوان
                  </span>
                </div>
                <span className="hidden sm:block text-[9px] sm:text-[10px] lg:text-xs text-slate-500 dark:text-slate-400 font-bold truncate">
                  منصة تعليم اللغة الإنجليزية للمرحلة الإعدادية والثانوية
                </span>
              </div>
            </Link>
          </div>

          {/* Center Navigation Links (Desktop) */}
          <nav className="hidden xl:flex items-center gap-1 bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shrink-0">
            <Link
              href="/#courses"
              className="px-2.5 py-2 text-[13px] font-bold rounded-xl text-slate-700 dark:text-slate-200 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-white dark:hover:bg-slate-800 transition-all flex items-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5 text-violet-500" />
              الكورسات
            </Link>

            <Link
              href="/#features"
              className="px-2.5 py-2 text-[13px] font-bold rounded-xl text-slate-700 dark:text-slate-200 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-white dark:hover:bg-slate-800 transition-all flex items-center gap-1.5"
            >
              <Star className="w-3.5 h-3.5 text-amber-500" />
              إيه اللي هتستفيده
            </Link>

            <Link
              href="/policies"
              className="px-2.5 py-2 text-[13px] font-bold rounded-xl text-slate-700 dark:text-slate-200 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-white dark:hover:bg-slate-800 transition-all flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-violet-500" />
              <span>السياسات والضوابط</span>
            </Link>

            <Link
              href="/#contact"
              className="px-2.5 py-2 text-[13px] font-bold rounded-xl text-slate-700 dark:text-slate-200 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-white dark:hover:bg-slate-800 transition-all flex items-center gap-1.5"
            >
              <PhoneCall className="w-3.5 h-3.5 text-violet-500" />
              تواصل معنا
            </Link>
          </nav>

          {/* Left Actions: Notification Bell + Theme Toggle + Auth Buttons / User Area */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Notification Bell (for authenticated users) */}
            {currentUser && <NotificationBell />}

            {/* Theme Toggle (Futuristic Custom Design) */}
            <ThemeToggle />

            {/* Auth Buttons or Logged-in Menu */}
            {currentUser ? (
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 py-1.5 px-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                <Link 
                  href={
                    currentUser.role === 'teacher' || currentUser.role === 'super_admin' ? '/teacher' :
                    currentUser.role === 'assistant' ? '/assistant' : 
                    currentUser.status === 'active' ? '/student' : '/'
                  }
                  className="flex flex-col text-right hover:opacity-80 transition-opacity"
                >
                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[130px]">
                    {currentUser.fullName}
                  </span>
                  <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400">
                    {currentUser.role === 'teacher'
                      ? 'المستر (Super Admin)'
                      : currentUser.role === 'assistant'
                      ? 'مساعد معتمد'
                      : currentUser.status === 'pending_review'
                      ? 'قيد المراجعة'
                      : 'طالب مفعل'}
                  </span>
                </Link>
                <button
                  onClick={logout}
                  className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-all"
                  title="تسجيل الخروج"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleLoginClick}
                  id="nav-login-btn"
                  className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 hover:text-violet-600 dark:hover:text-violet-400 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 transition-all flex items-center gap-1.5"
                >
                  <LogIn className="w-4 h-4" />
                  <span>دخول</span>
                </button>
              </div>
            )}

            {/* Mobile Menu Trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2.5 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
              aria-label="القائمة"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="xl:hidden py-4 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2">
            <Link
              href="/#courses"
              onClick={() => setMobileMenuOpen(false)}
              className="px-4 py-2.5 text-sm font-bold rounded-xl text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
            >
              <BookOpen className="w-4 h-4 text-violet-500" />
              الكورسات
            </Link>
            <Link
              href="/#features"
              onClick={() => setMobileMenuOpen(false)}
              className="px-4 py-2.5 text-sm font-bold rounded-xl text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
            >
              <Star className="w-4 h-4 text-amber-500" />
              إيه اللي هتستفيده معانا
            </Link>
            <Link
              href="/policies"
              onClick={() => setMobileMenuOpen(false)}
              className="px-4 py-2.5 text-sm font-bold rounded-xl text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-violet-500" />
                <span>سياسات وضوابط المنصة</span>
              </div>
            </Link>
            <Link
              href="/#contact"
              onClick={() => setMobileMenuOpen(false)}
              className="px-4 py-2.5 text-sm font-bold rounded-xl text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
            >
              <PhoneCall className="w-4 h-4 text-violet-500" />
              التواصل ومنصات المستر
            </Link>
            {!currentUser && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleRegisterClick();
                }}
                className="w-full py-3 mt-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm shadow-md transition-colors"
              >
                إنشاء حساب جديد
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
