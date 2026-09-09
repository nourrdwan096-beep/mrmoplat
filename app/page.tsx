'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import AnnouncementsBanner from '@/components/AnnouncementsBanner';
import HeroTeacherSection from '@/components/HeroTeacherSection';
import HomeAnnouncementsSection from '@/components/HomeAnnouncementsSection';
import CourseExplorer from '@/components/CourseExplorer';
import WhyChooseUs from '@/components/WhyChooseUs';
import SocialAndContactSection from '@/components/SocialAndContactSection';
import PlatformPoliciesSection from '@/components/PlatformPoliciesSection';
import Footer from '@/components/Footer';
import CourseDetailModal from '@/components/CourseDetailModal';
import ElevatorScroll from '@/components/ElevatorScroll';
import { Course } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { CheckCircle2, AlertTriangle, Clock, ArrowLeft, ShieldAlert } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { currentUser, isDeviceBanned, currentRole } = useAuth();

  // Modals state
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [courseModalTab, setCourseModalTab] = useState<'curriculum' | 'enroll'>('curriculum');

  const handleStartRegisterFlow = () => {
    // Navigate directly to the dedicated registration page
    router.push('/register');
  };

  const handleStartLoginFlow = () => {
    // Navigate directly to the dedicated login page
    router.push('/login');
  };

  const handleSelectCourse = (course: Course, initialTab?: 'curriculum' | 'enroll') => {
    setSelectedCourse(course);
    setCourseModalTab(initialTab || 'curriculum');
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 font-sans selection:bg-violet-500 selection:text-white">
      
      {/* 1. Announcements Banner */}
      <AnnouncementsBanner />

      {/* 2. Top Navigation Bar (Theme Switch + Login + Register + Policies Tab) */}
      <Navbar
        onOpenLogin={handleStartLoginFlow}
        onOpenRegister={handleStartRegisterFlow}
      />

      <ElevatorScroll />

      {/* Main Content Sections */}
      <main className="flex-1 relative">
        
        {/* Prominent Auth CTA for Unauthenticated Users */}
        {!currentUser && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 lg:mt-10 mb-4 z-10 relative">
            <div className="bg-gradient-to-r from-violet-600 to-fuchsia-600 p-1 rounded-3xl shadow-xl">
              <div className="bg-white dark:bg-slate-950 rounded-[22px] p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 overflow-hidden relative">
                
                {/* Decorative background blobs */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-fuchsia-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

                <div className="flex-1 text-center sm:text-right relative z-10">
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white mb-2">
                    ابدأ رحلتك نحو التفوق الآن! 🚀
                  </h2>
                  <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 font-bold max-w-2xl">
                    انضم لآلاف الطلاب في أقوى منصة لتعلم اللغة الإنجليزية. سجل حسابك الجديد في ثوانٍ معدودة.
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto shrink-0 relative z-10">
                  <button
                    onClick={handleStartLoginFlow}
                    className="w-full sm:w-auto px-8 py-3.5 text-sm font-bold text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-900/30 hover:bg-violet-100 dark:hover:bg-violet-900/50 border border-violet-200 dark:border-violet-800 rounded-xl transition-all"
                  >
                    تسجيل الدخول
                  </button>
                  <button
                    onClick={handleStartRegisterFlow}
                    className="w-full sm:w-auto px-8 py-3.5 text-sm font-black text-white bg-gradient-to-l from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 rounded-xl shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 transition-all transform hover:-translate-y-0.5"
                  >
                    إنشاء حساب جديد
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Security / Ban Notification Banner */}
        {isDeviceBanned && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
            <div className="bg-red-500/10 border-2 border-red-500/30 text-red-700 dark:text-red-400 p-4 rounded-2xl flex items-center gap-3">
              <ShieldAlert className="w-6 h-6 shrink-0 text-red-600" />
              <div className="flex-1 text-sm font-bold">
                ⚠️ هذا الجهاز محظور أمنياً من قبل إدارة المنصة لمخالفة سياسات التسجيل. لا يمكن تسجيل حساب جديد أو الدخول من هذا الجهاز.
              </div>
            </div>
          </div>
        )}

        {/* Student Approved Notification Banner */}
        {currentUser && currentRole === 'student' && currentUser.status === 'active' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
            <div className="bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-800 dark:text-emerald-300 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                <div className="text-sm font-black">
                  🎉 تم قبول واعتماد حسابك بنجاح يا {currentUser.fullName}! مرحباً بك في منصة مستر محمد رضوان التعليمية.
                </div>
              </div>
              <button
                type="button"
                onClick={() => router.push('/student')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-2 transition-transform active:scale-95 shrink-0"
              >
                الدخول للوحة دراستي
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Student Pending Review Banner */}
        {currentUser && currentUser.status === 'pending_review' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
            <div className="bg-amber-500/10 border-2 border-amber-500/30 text-amber-800 dark:text-amber-300 p-4 rounded-2xl flex items-center gap-3 shadow-sm">
              <Clock className="w-6 h-6 text-amber-600 shrink-0" />
              <div className="text-sm font-bold">
                ⏳ مرحباً {currentUser.fullName}، حسابك قيد المراجعة والتدقيق بواسطة مستر محمد رضوان وسيتم اعتماده خلال 48 ساعة. إذا استغرق وقتاً أطول يمكنك التواصل مع المعلم على 01552191172.
              </div>
            </div>
          </div>
        )}

        {/* 3. Hero / Teacher Bio & Image Card */}
        <HeroTeacherSection onOpenRegister={handleStartRegisterFlow} />

        {/* 3.5. Smart Home Announcements & Top Students Honor Board */}
        <HomeAnnouncementsSection />

        {/* 4. Course Directory with Multi-Filter [١] المرحلة [٢] نوع التعليم [٣] الصف */}
        <CourseExplorer
          onSelectCourse={handleSelectCourse}
          onOpenRegister={handleStartRegisterFlow}
        />

        {/* 5. Why Choose Us (إيه اللي هتستفيده معانا) */}
        <WhyChooseUs />

        {/* 6. Dedicated Platform Policies Section */}
        <PlatformPoliciesSection />

        {/* 7. Social Channels & Direct Contact Methods */}
        <SocialAndContactSection />
      </main>

      {/* 8. Footer with developer signature */}
      <Footer />

      {/* MODALS */}
      {/* Course Details Modal */}
      <CourseDetailModal
        course={selectedCourse}
        initialTab={courseModalTab}
        onClose={() => setSelectedCourse(null)}
        onOpenRegister={handleStartRegisterFlow}
      />
    </div>
  );
}
