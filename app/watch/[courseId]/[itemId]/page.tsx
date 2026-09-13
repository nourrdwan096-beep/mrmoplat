'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import SecuredVideoPlayer from '@/components/SecuredVideoPlayer';
import StudentQuizSolver from '@/components/StudentQuizSolver';
import InteractiveDocumentViewer from '@/components/InteractiveDocumentViewer';
import {
  getCourseById,
  fetchUnitsByCourse,
  fetchItemsByUnit,
  fetchStudentProgress,
  recordStudentItemProgress,
  isItemAccessible,
  isStudentEnrolledInCourse,
  CourseData,
  UnitData,
  UnitItemData,
  StudentItemProgressData
} from '@/lib/academicService';
import { registerOrVerifyStudentCourseDevice } from '@/lib/deviceSecurity';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Layers,
  Video,
  FileCheck,
  Award,
  Lock,
  Unlock,
  CheckCircle2,
  Share2,
  Download,
  FileText,
  FileSpreadsheet,
  Bookmark,
  ShieldCheck,
  Ticket,
  Sun,
  Moon,
  Smartphone,
  Phone,
  Sparkles,
  Info,
  ExternalLink,
  Menu,
  X,
  Home
} from 'lucide-react';
import Footer from '@/components/Footer';

export default function WatchLessonPage() {
  const params = useParams();
  const router = useRouter();
  const { currentUser, currentRole } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const courseId = params?.courseId as string;
  const itemId = params?.itemId as string;

  const [course, setCourse] = useState<CourseData | null>(null);
  const [units, setUnits] = useState<UnitData[]>([]);
  const [unitItemsMap, setUnitItemsMap] = useState<Record<string, UnitItemData[]>>({});
  const [currentItem, setCurrentItem] = useState<UnitItemData | null>(null);
  const [currentUnit, setCurrentUnit] = useState<UnitData | null>(null);
  const [studentProgress, setStudentProgress] = useState<Record<string, StudentItemProgressData>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [deviceBlockedError, setDeviceBlockedError] = useState<string | null>(null);
  const [isNotEnrolled, setIsNotEnrolled] = useState<boolean>(false);

  // Load Course, Units, Items and Student Progress
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      if (!courseId) return;
      setIsLoading(true);
      setDeviceBlockedError(null);
      setIsNotEnrolled(false);

      try {
        const foundCourse = await getCourseById(courseId);
        if (!isMounted) return;
        setCourse(foundCourse);

        // Check Auth First
        if (!currentUser) {
          if (!isMounted) return;
          setIsNotEnrolled(true);
        } else if (currentUser?.id && currentRole === 'student') {
          // Check Device Limits and Enrollment for students
          const devCheck = await registerOrVerifyStudentCourseDevice(currentUser.id, courseId);
          if (!devCheck.allowed) {
            if (!isMounted) return;
            setDeviceBlockedError(devCheck.message || 'تم استكفاء عدد الأجهزة المسموحة (جهازين فقط).');
            setIsLoading(false);
            return;
          }

          if (foundCourse) {
            const enrolled = await isStudentEnrolledInCourse(currentUser.id, courseId);
            if (!enrolled) {
              if (!isMounted) return;
              setIsNotEnrolled(true);
            }
          }
        }

        const loadedUnits = await fetchUnitsByCourse(courseId);
        if (!isMounted) return;
        setUnits(loadedUnits);

        const itemsMap: Record<string, UnitItemData[]> = {};
        let targetItem: UnitItemData | null = null;
        let targetUnit: UnitData | null = null;

        for (const u of loadedUnits) {
          const items = await fetchItemsByUnit(u.id);
          itemsMap[u.id] = items;
          const matched = items.find((i) => i.id === itemId);
          if (matched) {
            targetItem = matched;
            targetUnit = u;
          }
        }

        if (!isMounted) return;
        setUnitItemsMap(itemsMap);

        // Fetch Student Progress
        const studentId = currentUser?.id || 'demo_student';
        const progressMap = await fetchStudentProgress(studentId, courseId);
        if (!isMounted) return;
        setStudentProgress(progressMap);

        // If specific item not found, pick first video or item
        if (!targetItem && loadedUnits.length > 0) {
          for (const u of loadedUnits) {
            const firstVideo = (itemsMap[u.id] || []).find((i) => i.itemType === 'video');
            if (firstVideo) {
              targetItem = firstVideo;
              targetUnit = u;
              break;
            }
          }
          if (!targetItem && (itemsMap[loadedUnits[0].id] || []).length > 0) {
            targetItem = itemsMap[loadedUnits[0].id][0];
            targetUnit = loadedUnits[0];
          }
        }

        setCurrentItem(targetItem);
        setCurrentUnit(targetUnit);

        // Auto mark video / concept sheet as completed when opened
        if (targetItem && (targetItem.itemType === 'video' || targetItem.itemType === 'concept_sheet' || targetItem.itemType === 'summary_pdf')) {
          if (!progressMap[targetItem.id]?.isPassed) {
            recordStudentItemProgress(studentId, courseId, targetItem.id, 100, true).then(() => {
              fetchStudentProgress(studentId, courseId).then(refreshed => {
                if (isMounted) setStudentProgress(refreshed);
              });
            });
          }
        }
      } catch (e) {
        console.error('Error loading watch page data:', e);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [courseId, itemId, currentUser?.id, currentRole]);

  // Flattened video & lesson items for Previous / Next navigation
  const allLessons: { item: UnitItemData; unit: UnitData }[] = [];
  units.forEach((u) => {
    const items = unitItemsMap[u.id] || [];
    items.forEach((it) => {
      allLessons.push({ item: it, unit: u });
    });
  });

  const currentIndex = allLessons.findIndex((l) => l.item.id === currentItem?.id);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex >= 0 && currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  const navigateToLesson = (lessonItem: UnitItemData) => {
    router.push(`/watch/${courseId}/${lessonItem.id}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 space-y-4 font-sans">
        <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center animate-pulse">
          <Video className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-black text-white">جاري تجهيز مشغل المحاضرة المؤمّن...</h2>
        <p className="text-xs text-slate-400 font-bold">منصة مستر محمد رضوان التعليمية</p>
      </div>
    );
  }

  // If student device limit exceeded (3rd device)
  if (deviceBlockedError) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center" dir="rtl">
        <div className="max-w-md w-full bg-slate-900 border border-rose-500/30 rounded-3xl p-8 space-y-6 shadow-2xl shadow-rose-500/10">
          <div className="w-20 h-20 rounded-3xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
            <Lock className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white">تم استكفاء عدد الأجهزة (جهازين فقط)</h2>
            <p className="text-sm font-bold text-slate-300 leading-relaxed">
              {deviceBlockedError}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700 text-xs font-bold text-slate-400 leading-relaxed text-right">
            • يُسمح لكل طالب بفتح الحساب وتشغيل الكورسات على <strong>جهازين فقط</strong>.
            <br />
            • الجهاز الأول (الأساسي) مثبت دائماً، ويمكنك تبديل الجهاز الثاني من خلال صفحة أجهزتك.
          </div>
          <div className="flex flex-col gap-3 pt-2">
            <Link
              href="/student/devices"
              className="w-full py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm transition-all shadow-lg shadow-emerald-600/30"
            >
              إدارة أجهزتي المسجلة وتبديل الجهاز الثاني
            </Link>
            <Link
              href="/"
              className="w-full py-3 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
            >
              العودة للصفحة الرئيسية
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // If student is not enrolled (paid or free)
  if (isNotEnrolled && course) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center" dir="rtl">
        <div className="max-w-md w-full bg-slate-900 border border-amber-500/30 rounded-3xl p-8 space-y-6 shadow-2xl shadow-amber-500/10">
          <div className="w-20 h-20 rounded-3xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
            <Ticket className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white">الاشتراك مطلوب للمشاهدة</h2>
            <p className="text-sm font-bold text-slate-300 leading-relaxed">
              {course.isFree 
                ? 'هذا الكورس مجاني، ولكن يجب عليك تسجيل الدخول والانضمام إليه أولاً لفتح المحاضرات.'
                : 'لم تقم بتفعيل كود الاشتراك لهذا الكورس بعد. يرجى إدخال كود التفعيل المستلم من مستر محمد رضوان للاشتراك وفتح المحاضرات.'}
            </p>
          </div>
          <div className="flex flex-col gap-3 pt-2">
            <Link
              href={`/courses/${courseId}`}
              className="w-full py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm transition-all shadow-lg shadow-indigo-600/30"
            >
              {course.isFree ? 'الانضمام للكورس الآن' : 'تفعيل كود الكورس الآن'}
            </Link>
            <Link
              href="/student/courses"
              className="w-full py-3 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
            >
              العودة لكورساتي
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-300 font-sans">
      
      {/* Top Main Navigation & Breadcrumb Header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          
          {/* Right: Return Back & Course Title */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href={currentRole === 'teacher' || currentRole === 'super_admin' ? `/teacher/courses/${courseId}` : '/'}
              className="p-2 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors shrink-0"
              title="العودة لإدارة الكورس أو الرئيسية"
            >
              <ArrowRight className="w-5 h-5" />
            </Link>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  {course?.stage === 'high' ? 'ثانوي' : 'إعدادي'} - الصف {course?.grade} ({course?.educationType === 'azhar' ? 'أزهر' : 'عام'})
                </span>
                {currentUnit && (
                  <span className="hidden sm:inline-block text-[11px] text-slate-500 dark:text-slate-400 font-bold truncate">
                    {currentUnit.title}
                  </span>
                )}
              </div>
              <h1 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">
                {currentItem?.title || course?.title || 'مشاهدة المحاضرة'}
              </h1>
            </div>
          </div>

          {/* Left: Quick Actions, Next/Prev & Sidebar Toggle */}
          <div className="flex items-center gap-2 shrink-0">
            
            {/* Prev Lesson Button */}
            {prevLesson && (
              <button
                type="button"
                onClick={() => navigateToLesson(prevLesson.item)}
                className="hidden md:flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition-all"
                title={`الدرس السابق: ${prevLesson.item.title}`}
              >
                <ChevronRight className="w-4 h-4" />
                <span>السابق</span>
              </button>
            )}

            {/* Next Lesson Button */}
            {nextLesson && (
              <button
                type="button"
                onClick={() => navigateToLesson(nextLesson.item)}
                className="hidden md:flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm"
                title={`الدرس التالي: ${nextLesson.item.title}`}
              >
                <span>التالي</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title={theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>

            {/* Curriculum Drawer Toggle (Mobile & Tablet) - Hidden in Exam/Homework mode */}
            {!(currentItem?.itemType === 'exam' || currentItem?.itemType === 'homework') && (
              <button
                type="button"
                onClick={() => setSidebarOpen((prev) => !prev)}
                className="lg:hidden p-2 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center gap-1 text-xs font-black shadow-sm"
              >
                <Layers className="w-4 h-4" />
                <span className="hidden sm:inline">محتوى الكورس</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Watch Page Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main Stage: Full 12 cols for Exam/Homework, 8 cols for Video/PDF */}
          <div className={(currentItem?.itemType === 'exam' || currentItem?.itemType === 'homework') ? "lg:col-span-12 space-y-6" : "lg:col-span-8 space-y-6"}>
            
            {/* The Main Interactive Stage: Video Player or Exam/Homework Solver */}
            <div className="w-full">
              {(() => {
                const currentAccess = (currentItem && currentUnit)
                  ? isItemAccessible(currentItem, currentUnit, units, unitItemsMap, studentProgress, course, currentRole)
                  : { isAccessible: true };

                if (!currentAccess.isAccessible) {
                  return (
                    <div className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-slate-900 border border-amber-300/40 dark:border-amber-700/40 text-center space-y-5 shadow-xl" dir="rtl">
                      <div className="w-20 h-20 rounded-3xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto border border-amber-500/20">
                        <Lock className="w-10 h-10 animate-bounce" />
                      </div>
                      <div className="space-y-2 max-w-md mx-auto">
                        <h3 className="text-xl font-black text-slate-900 dark:text-white">
                          هذا المحتوى مقفول حالياً 🔒
                        </h3>
                        <p className="text-sm font-bold text-amber-700 dark:text-amber-300 leading-relaxed bg-amber-50 dark:bg-amber-950/40 p-4 rounded-2xl border border-amber-200 dark:border-amber-900/30">
                          {currentAccess.reason || 'يجب اجتياز المحاضرات والواجبات السابقة بنجاح أولاً لفتح هذا الدرس.'}
                        </p>
                      </div>
                      <div className="pt-2">
                        {prevLesson && (
                          <button
                            type="button"
                            onClick={() => navigateToLesson(prevLesson.item)}
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition-all"
                          >
                            <span>الانتقال للدرس المطلوب اجتيازه</span>
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                }

                if (currentItem?.itemType === 'video') {
                  return (
                    <SecuredVideoPlayer
                      videoIdOrUrl={currentItem.obfuscatedVideoId || currentItem.directVideoUrl || 'M7lc1UVf-VE'}
                      itemId={currentItem.id}
                      courseId={courseId}
                      sourceType={currentItem.videoSourceType || 'internal_secured'}
                      title={currentItem.title}
                      durationMinutes={currentItem.durationMinutes}
                    />
                  );
                }

                if (currentItem?.itemType === 'exam' || currentItem?.itemType === 'homework') {
                  return (
                    <StudentQuizSolver
                      item={currentItem}
                      courseId={courseId}
                      courseData={course}
                      unitTitle={currentUnit?.title}
                      studentProgress={studentProgress[currentItem.id]}
                      currentUser={currentUser ? {
                        id: currentUser.id,
                        fullName: currentUser.fullName,
                        phone: currentUser.phone
                      } : undefined}
                      onComplete={async (score, passed) => {
                        const studentId = currentUser?.id || 'demo_student';
                        const refreshed = await fetchStudentProgress(studentId, courseId);
                        setStudentProgress(refreshed);
                      }}
                      onSecurityViolation={async () => {
                        const studentId = currentUser?.id || 'demo_student';
                        const refreshed = await fetchStudentProgress(studentId, courseId);
                        setStudentProgress(refreshed);
                      }}
                    />
                  );
                }

                if (currentItem?.itemType === 'concept_sheet' || currentItem?.itemType === 'summary_pdf') {
                  const studentId = currentUser?.id || 'demo_student';
                  const isPassed = studentProgress[currentItem.id]?.isPassed || false;
                  return (
                    <InteractiveDocumentViewer
                      url={currentItem.pdfAttachmentUrl || ''}
                      title={currentItem.title}
                      description={currentItem.description}
                      itemType={currentItem.itemType}
                      unitTitle={currentUnit?.title}
                      studentName={currentUser?.fullName || 'طالب منصة مستر محمد رضوان'}
                      studentPhone={currentUser?.phone || '01xxxxxxxxx'}
                      isPassed={isPassed}
                      onComplete={async () => {
                        await recordStudentItemProgress(studentId, courseId, currentItem.id, 100, true);
                        const refreshed = await fetchStudentProgress(studentId, courseId);
                        setStudentProgress(refreshed);
                      }}
                    />
                  );
                }

                return (
                  <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                      <FileText className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">
                      {currentItem?.title}
                    </h3>
                    <p className="text-xs text-slate-500 font-bold max-w-md mx-auto leading-relaxed">
                      {currentItem?.description || 'هذا العنصر متاح ضمن خطة المنهج.'}
                    </p>
                    {currentItem?.pdfAttachmentUrl && (
                      <a
                        href={currentItem.pdfAttachmentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl shadow-md transition-all"
                      >
                        <Download className="w-4 h-4" />
                        <span>تحميل الملف المرفق (PDF)</span>
                      </a>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Lecture Meta & Lesson Card */}
            {!(currentItem?.itemType === 'exam' || currentItem?.itemType === 'homework') && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black text-xs">
                        {currentUnit?.title || 'الوحدة الحالية'}
                      </span>
                      <span className="text-xs font-bold text-slate-400">
                        محاضرة رقم {currentIndex + 1} من {allLessons.length}
                      </span>
                      {currentItem && studentProgress[currentItem.id]?.isPassed && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>تم الاجتياز</span>
                        </span>
                      )}
                    </div>
                    <h2 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white">
                      {currentItem?.title}
                    </h2>
                  </div>

                  {/* Teacher Profile Stamp */}
                  <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <div className="relative w-11 h-11 rounded-full overflow-hidden border-2 border-emerald-500 shrink-0">
                      <Image
                        src="/master-image.png"
                        alt="Mr Mohamed Radwan"
                        fill
                        className="object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="text-right">
                      <h4 className="text-xs font-black text-slate-900 dark:text-white">مستر محمد رضوان</h4>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">خبير تدريس اللغة الإنجليزية</span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {currentItem?.description && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Info className="w-4 h-4 text-emerald-500" />
                      <span>توضيح ونقاط المحاضرة</span>
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                      {currentItem.description}
                    </p>
                  </div>
                )}

                {/* Fast Lesson Actions */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-xs shadow-sm hover:scale-105 active:scale-95 transition-all"
                  >
                    <Home className="w-4 h-4" />
                    <span>الرئيسية ولوحة التحكم</span>
                  </Link>

                  <Link
                    href={`/courses/${courseId}`}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-colors"
                  >
                    <BookOpen className="w-4 h-4 text-emerald-500" />
                    <span>فهرس الكورس</span>
                  </Link>

                  {currentItem?.pdfAttachmentUrl && (
                    <a
                      href={currentItem.pdfAttachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-colors"
                    >
                      <Download className="w-4 h-4 text-emerald-500" />
                      <span>تحميل ملزمة المحاضرة (PDF)</span>
                    </a>
                  )}

                  <div className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
                    <ShieldCheck className="w-4 h-4" />
                    <span>مؤمن بالكامل ومعتمد لطلاب المنصة</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Desktop Right Sidebar: Course Curriculum Syllabus (Hidden during Exam / Homework) */}
          {!(currentItem?.itemType === 'exam' || currentItem?.itemType === 'homework') && (
            <aside className="hidden lg:block lg:col-span-4 sticky top-24 space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4 max-h-[calc(100vh-8rem)] flex flex-col">
              
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Layers className="w-4 h-4" />
                  </div>
                  <h3 className="font-black text-sm text-slate-900 dark:text-white">
                    منهج ووحدات الكورس
                  </h3>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500">
                  {allLessons.length} عنصر
                </span>
              </div>

              {/* Units & Lessons List */}
              <div className="space-y-4 overflow-y-auto flex-1 pr-1 custom-scrollbar">
                {units.map((unit) => {
                  const items = unitItemsMap[unit.id] || [];
                  const isCurrentUnit = currentUnit?.id === unit.id;

                  return (
                    <div key={unit.id} className="space-y-2">
                      <div className={`p-3 rounded-2xl flex items-center justify-between ${
                        isCurrentUnit
                          ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                          : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300'
                      }`}>
                        <span className="font-black text-xs truncate">
                          {unit.title}
                        </span>
                        <span className="text-[10px] font-bold opacity-75">
                          {items.length} درس
                        </span>
                      </div>

                      <div className="space-y-1.5 pr-2">
                        {items.map((item) => {
                          const isSelected = currentItem?.id === item.id;
                          const access = isItemAccessible(item, unit, units, unitItemsMap, studentProgress, course, currentRole);
                          const isPassed = studentProgress[item.id]?.isPassed;

                          return (
                            <button
                              type="button"
                              key={item.id}
                              disabled={!access.isAccessible}
                              onClick={() => {
                                if (access.isAccessible) {
                                  navigateToLesson(item);
                                }
                              }}
                              title={!access.isAccessible ? (access.reason || 'مقفول - يجب اجتياز ما قبله أولاً') : item.title}
                              className={`w-full text-right p-2.5 rounded-xl text-xs font-bold flex items-center justify-between gap-2 transition-all ${
                                isSelected
                                  ? 'bg-emerald-600 text-white shadow-md'
                                  : !access.isAccessible
                                  ? 'opacity-60 cursor-not-allowed bg-slate-50/50 dark:bg-slate-950/50 text-slate-400'
                                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 ${
                                  isSelected
                                    ? 'bg-white/20 text-white'
                                    : !access.isAccessible
                                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                    : isPassed
                                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                    : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                                }`}>
                                  {!access.isAccessible ? (
                                    <Lock className="w-3 h-3" />
                                  ) : isPassed ? (
                                    <CheckCircle2 className="w-3 h-3" />
                                  ) : item.itemType === 'video' ? (
                                    <Video className="w-3 h-3" />
                                  ) : item.itemType === 'homework' ? (
                                    <FileCheck className="w-3 h-3" />
                                  ) : item.itemType === 'exam' ? (
                                    <Award className="w-3 h-3" />
                                  ) : item.itemType === 'concept_sheet' ? (
                                    <Bookmark className="w-3 h-3" />
                                  ) : (
                                    <FileSpreadsheet className="w-3 h-3" />
                                  )}
                                </span>
                                <span className="truncate">{item.title}</span>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {!access.isAccessible && (
                                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-500">
                                    مقفول
                                  </span>
                                )}
                                {item.durationMinutes && item.durationMinutes > 0 && item.durationMinutes !== 45 && (
                                  <span className="text-[10px] font-mono opacity-75">
                                    {item.durationMinutes} د
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            </aside>
          )}
        </div>
      </main>

      {/* Mobile Drawer Backdrop & Drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex justify-end bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-xs bg-white dark:bg-slate-900 h-full p-6 space-y-4 overflow-y-auto flex flex-col shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-500" />
                <span>قائمة المحاضرات</span>
              </h3>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 flex-1">
              {units.map((unit) => {
                const items = unitItemsMap[unit.id] || [];
                return (
                  <div key={unit.id} className="space-y-2">
                    <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-950 font-black text-xs text-slate-800 dark:text-slate-200">
                      {unit.title}
                    </div>
                    <div className="space-y-1 pr-2">
                      {items.map((item) => {
                        const isSelected = currentItem?.id === item.id;
                        const access = isItemAccessible(item, unit, units, unitItemsMap, studentProgress, course, currentRole);
                        const isPassed = studentProgress[item.id]?.isPassed;

                        return (
                          <button
                            type="button"
                            key={item.id}
                            disabled={!access.isAccessible}
                            onClick={() => {
                              if (access.isAccessible) {
                                navigateToLesson(item);
                                setSidebarOpen(false);
                              }
                            }}
                            className={`w-full text-right p-2.5 rounded-xl text-xs font-bold flex items-center justify-between gap-2 ${
                              isSelected
                                ? 'bg-emerald-600 text-white'
                                : !access.isAccessible
                                ? 'opacity-50 cursor-not-allowed text-slate-400'
                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {!access.isAccessible ? (
                                <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              ) : isPassed ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              ) : null}
                              <span className="truncate">{item.title}</span>
                            </div>
                            {item.durationMinutes && item.durationMinutes > 0 && item.durationMinutes !== 45 && (
                              <span className="text-[10px] font-mono opacity-75">{item.durationMinutes} د</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Mandatory Footer Signature */}
      <Footer />
    </div>
  );
}
