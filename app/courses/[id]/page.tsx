'use client';

import React, { useEffect, useState, use } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import {
  Presentation,
  BookOpen,
  CheckCircle2,
  Lock,
  PlayCircle,
  FileText,
  HelpCircle,
  Award,
  Sparkles,
  ArrowRight,
  ShoppingCart,
  CreditCard,
  KeyRound,
  Wallet,
  ShieldCheck,
  Clock,
  Check,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  Layers,
  MessageCircle,
  Phone
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useAuth } from '@/context/AuthContext';
import {
  CourseData,
  UnitData,
  UnitItemData,
  getCourseById,
  fetchUnitsByCourse,
  fetchItemsByUnit,
  isStudentEnrolledInCourse,
  enrollStudentInCourse,
  redeemActivationCodeForStudent
} from '@/lib/academicService';
import { getAcademicBatchYear } from '@/components/CourseCard';
import { useResolvedImageUrl } from '@/hooks/useResolvedImageUrl';

export default function CourseDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const courseId = resolvedParams.id;
  const router = useRouter();
  const { currentUser } = useAuth();

  const [course, setCourse] = useState<CourseData | null>(null);
  const [imgError, setImgError] = useState(false);
  const fallbackUrl = 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=800&auto=format&fit=crop&q=80';
  const resolvedCoverImage = useResolvedImageUrl(course?.coverImage);
  const displayCover = (imgError || !resolvedCoverImage || resolvedCoverImage.startsWith('idb://'))
    ? fallbackUrl
    : resolvedCoverImage;
  const [units, setUnits] = useState<UnitData[]>([]);
  const [unitItems, setUnitItems] = useState<Record<string, UnitItemData[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);

  // Enrollment states
  const [enrollMethod, setEnrollMethod] = useState<'code' | 'wallet' | 'fawry'>('code');
  const [activationCode, setActivationCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [enrollSuccess, setEnrollSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [securityNoticeItem, setSecurityNoticeItem] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!courseId) return;
      setIsLoading(true);

      try {
        const fetchedCourse = await getCourseById(courseId);
        if (!isMounted) return;
        setCourse(fetchedCourse);

        if (fetchedCourse) {
          // Check enrollment if student is logged in
          if (currentUser?.id) {
            const enrolled = await isStudentEnrolledInCourse(currentUser.id, courseId, currentUser.email);
            if (isMounted) setIsEnrolled(enrolled);
          }

          // Fetch units
          const fetchedUnits = await fetchUnitsByCourse(courseId);
          if (!isMounted) return;
          setUnits(fetchedUnits);

          // Fetch items for each unit
          const itemsMap: Record<string, UnitItemData[]> = {};
          for (const u of fetchedUnits) {
            const items = await fetchItemsByUnit(u.id);
            itemsMap[u.id] = items;
          }
          if (isMounted) setUnitItems(itemsMap);
        }
      } catch (err) {
        console.error('Error loading course details:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [courseId, currentUser?.id, currentUser?.email]);

  const handleRedeemCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setErrorMessage('يجب تسجيل الدخول أو إنشاء حساب طالب أولاً لتفعيل الكود');
      return;
    }
    if (!activationCode.trim()) {
      setErrorMessage('يرجى كتابة كود التفعيل المطبوع');
      return;
    }

    if (!course) return;

    setIsSubmitting(true);
    setErrorMessage('');
    const res = await redeemActivationCodeForStudent(
      activationCode, 
      currentUser.id, 
      currentUser.fullName,
      course.id,
      {
        email: currentUser.email,
        phone: currentUser.phone,
        parentPhone: currentUser.parentPhone,
      }
    );
    setIsSubmitting(false);

    if (res.success) {
      setEnrollSuccess(true);
      setIsEnrolled(true);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mr_radwan_enrollments_updated', {
          detail: { courseId: course.id, studentId: currentUser.id }
        }));
      }
    } else {
      setErrorMessage(res.message);
    }
  };

  const handleWalletEnroll = async () => {
    if (!currentUser) {
      setErrorMessage('يجب تسجيل الدخول أولاً لإتمام عملية الشراء');
      return;
    }

    if (!course) return;

    setIsSubmitting(true);
    setErrorMessage('');
    const success = await enrollStudentInCourse(currentUser.id, course.id, 'wallet', course.price, {
      fullName: currentUser.fullName,
      phone: currentUser.phone,
      parentPhone: currentUser.parentPhone,
    });
    setIsSubmitting(false);

    if (success) {
      setEnrollSuccess(true);
      setIsEnrolled(true);
    } else {
      setErrorMessage('فشل الشراء عبر المحفظة، يرجى المحاولة لاحقاً');
    }
  };

  const handleFreeEnroll = async () => {
    if (!currentUser) {
      setErrorMessage('يجب تسجيل الدخول أولاً للالتحاق بالكورس المجاني');
      return;
    }

    if (!course) return;

    setIsSubmitting(true);
    setErrorMessage('');
    const success = await enrollStudentInCourse(currentUser.id, course.id, 'free', 0, {
      fullName: currentUser.fullName,
      phone: currentUser.phone,
      parentPhone: currentUser.parentPhone,
    });
    setIsSubmitting(false);

    if (success) {
      setEnrollSuccess(true);
      setIsEnrolled(true);
    } else {
      setErrorMessage('فشل الالتحاق بالكورس');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white" dir="rtl">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="w-14 h-14 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">جاري تحميل تفاصيل الكورس ومحتويات المنهج...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white" dir="rtl">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
          <div className="w-20 h-20 rounded-3xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4 text-3xl">
            ⚠️
          </div>
          <h1 className="text-2xl font-black mb-2">الكورس غير موجود</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            قد يكون تم حذف الكورس أو أن الرابط الذي طلبته غير صحيح.
          </p>
          <Link
            href="/"
            className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة للكورسات المتاحة</span>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const stageLabel = course.stage === 'high' ? 'المرحلة الثانوية' : 'المرحلة الإعدادية';
  const gradeLabel = course.grade === 1 ? 'الصف الأول' : course.grade === 2 ? 'الصف الثاني' : 'الصف الثالث';
  const educationTypeLabel =
    course.educationType === 'azhar' ? 'أزهر شريف' :
    course.educationType === 'general' ? 'تعليم عام' :
    course.educationType === 'arabic' ? 'عربي' : 'لغات';

  // Calculate totals
  let totalLectures = 0;
  let totalHomeworks = 0;
  let totalExams = 0;
  let totalSummaries = 0;

  Object.values(unitItems).forEach((items) => {
    items.forEach((item) => {
      if (item.itemType === 'video') totalLectures++;
      else if (item.itemType === 'homework') totalHomeworks++;
      else if (item.itemType === 'exam') totalExams++;
      else if (item.itemType === 'summary_pdf' || item.itemType === 'concept_sheet') totalSummaries++;
    });
  });

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 font-sans selection:bg-emerald-500 selection:text-white" dir="rtl">
      
      {/* 1. Header Navigation */}
      <Navbar />

      {/* Main Container */}
      <main className="flex-1 pb-16">
        
        {/* Breadcrumb Bar */}
        <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 py-3.5 px-4 sm:px-8">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 text-xs font-bold">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <Link href="/" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-1">
                <span>الرئيسية</span>
              </Link>
              <span>/</span>
              <Link href="/#courses" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                <span>الكورسات والمناهج</span>
              </Link>
              <span>/</span>
              <span className="text-slate-900 dark:text-white font-black truncate max-w-[200px] sm:max-w-xs">{course.title}</span>
            </div>

            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-xs font-bold"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>العودة للمنصة</span>
            </Link>
          </div>
        </div>

        {/* Hero Section with 2030 Glassmorphism */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Right / Main Info Column (8 Cols) */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Main Glassmorphic Course Overview Card */}
              <div className="relative rounded-[2.5rem] backdrop-blur-2xl bg-white/80 dark:bg-slate-900/80 p-6 sm:p-8 border border-white/60 dark:border-slate-800/80 shadow-2xl shadow-emerald-500/5 overflow-hidden">
                
                {/* Background Specular Flare */}
                <div className="absolute -top-24 -left-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

                {/* Badges Row */}
                <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3.5 py-1.5 rounded-xl border border-emerald-200/60 dark:border-emerald-500/20 shadow-xs">
                      <Presentation className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>المعلم / مستر محمد رضوان</span>
                    </span>

                    <span className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 shadow-xs">
                      {getAcademicBatchYear()}
                    </span>
                  </div>

                  {isEnrolled && (
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 text-white text-xs font-black shadow-md shadow-emerald-500/30">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>مشترك بالفعل</span>
                    </span>
                  )}
                </div>

                {/* Course Title */}
                <h1 className="relative z-10 text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white leading-tight tracking-tight mb-4">
                  {course.title}
                </h1>

                {/* Course Description */}
                <p className="relative z-10 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed mb-6 font-medium">
                  {course.description || 'شرح تفصيلي شامل ومبسط لمنهج اللغة الإنجليزية، مدعوماً بمحاضرات فيديو عالية الدقة، تدريبات تفاعلية أسبوعية، امتحانات إلكترونية شاملة، وملازم ومذكرات بصيغة PDF قابلة للاستعراض.'}
                </p>

                {/* Structured Classification Badges Box */}
                <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 mb-6 backdrop-blur-md">
                  
                  {/* Grade & Stage */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">الصف والمرحلة :</span>
                    <span className="text-xs font-black text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg">
                      {gradeLabel} - {stageLabel}
                    </span>
                  </div>

                  {/* Education System */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">نوع التعليم :</span>
                    <span className="text-xs font-black text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-200/50 dark:border-emerald-500/20">
                      {educationTypeLabel}
                    </span>
                  </div>

                </div>

                {/* Stats Highlights */}
                <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <PlayCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-lg font-black text-slate-900 dark:text-white">{totalLectures}</div>
                      <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">محاضرة مؤمنة</div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-lg font-black text-slate-900 dark:text-white">{totalHomeworks}</div>
                      <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">واجب أسبوعي</div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-lg font-black text-slate-900 dark:text-white">{totalExams}</div>
                      <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">امتحان دوري</div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-lg font-black text-slate-900 dark:text-white">{totalSummaries}</div>
                      <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">ملازم ومفاهيم</div>
                    </div>
                  </div>
                </div>

              </div>

              {/* CURRICULUM BREAKDOWN SECTION (Full naming by the teacher) */}
              <div className="space-y-4 pt-4">
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-900 dark:text-white">فهرس ومحتويات الكورس: {course.title}</h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">جميع الوحدات والمحاضرات المقررة</p>
                    </div>
                  </div>

                  <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-200/60 dark:border-emerald-500/20">
                    {units.length} {units.length === 1 ? 'وحدة دراسية' : 'وحدات دراسية'}
                  </span>
                </div>

                {units.length === 0 ? (
                  <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 text-center">
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                      جاري تجهيز محتويات ووحدات الكورس من قبل المعلم...
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {units.map((unit, uIdx) => {
                      const items = unitItems[unit.id] || [];
                      return (
                        <div
                          key={unit.id}
                          className="rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 p-5 sm:p-6 shadow-sm overflow-hidden transition-all"
                        >
                          {/* Unit Title Bar */}
                          <div className="flex items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100 dark:border-slate-800/80">
                            <div className="flex items-center gap-3">
                              <span className="w-8 h-8 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black flex items-center justify-center shrink-0">
                                {uIdx + 1}
                              </span>
                              <div>
                                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                                  {unit.title}
                                </h3>
                                {unit.description && (
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                                    {unit.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-xl shrink-0">
                              {items.length} {items.length === 1 ? 'عنصر' : 'عناصر'}
                            </span>
                          </div>

                          {/* Unit Items List */}
                          {items.length === 0 ? (
                            <p className="text-xs text-slate-400 italic py-2">لا توجد عناصر مضافة في هذه الوحدة حالياً.</p>
                          ) : (
                            <div className="space-y-2.5">
                              {items.map((item) => {
                                const isVideo = item.itemType === 'video';
                                const isHomework = item.itemType === 'homework';
                                const isExam = item.itemType === 'exam';
                                const isPdf = item.itemType === 'summary_pdf' || item.itemType === 'concept_sheet';

                                return (
                                  <div
                                    key={item.id}
                                    className={`group flex items-center justify-between gap-3 p-3.5 rounded-2xl border transition-all ${
                                      isEnrolled
                                        ? 'bg-slate-50 hover:bg-emerald-50/50 dark:bg-slate-950/60 dark:hover:bg-emerald-950/20 border-slate-200/80 dark:border-slate-800/80 hover:border-emerald-500/40'
                                        : 'bg-slate-50/70 dark:bg-slate-950/40 border-slate-200/60 dark:border-slate-800/60'
                                    }`}
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      {/* Icon Badge */}
                                      <div
                                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                          isVideo
                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                            : isHomework
                                            ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
                                            : isExam
                                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                            : 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
                                        }`}
                                      >
                                        {isVideo && <PlayCircle className="w-5 h-5" />}
                                        {isHomework && <FileText className="w-5 h-5" />}
                                        {isExam && <Award className="w-5 h-5" />}
                                        {isPdf && <BookOpen className="w-5 h-5" />}
                                      </div>

                                      {/* Title & Metadata */}
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                                            {item.title}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-3 mt-0.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                          <span>
                                            {isVideo ? 'محاضرة فيديو' : isHomework ? 'واجب أسبوعي' : isExam ? 'امتحان إلكتروني' : 'ورقة مفاهيم وملزمة'}
                                          </span>
                                          {item.durationMinutes ? (
                                            <>
                                              <span>•</span>
                                              <span>{item.durationMinutes} دقيقة</span>
                                            </>
                                          ) : null}
                                          {item.totalMarks ? (
                                            <>
                                              <span>•</span>
                                              <span>{item.totalMarks} درجة</span>
                                            </>
                                          ) : null}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Action or Lock Badge */}
                                    {isEnrolled ? (
                                      <Link
                                        href={`/watch?courseId=${course.id}&itemId=${item.id}`}
                                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-sm transition-all flex items-center gap-1.5 shrink-0"
                                      >
                                        <span>{isVideo ? 'مشاهدة' : isHomework ? 'حل الواجب' : isExam ? 'بدء الامتحان' : 'استعراض'}</span>
                                        <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                                      </Link>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSecurityNoticeItem(item.title);
                                          const el = document.getElementById('enroll-section');
                                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                                        }}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold shrink-0 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                                      >
                                        <Lock className="w-3.5 h-3.5" />
                                        <span className="hidden sm:inline">محتوى محمي</span>
                                        <span className="sm:hidden">مغلق</span>
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

              </div>

            </div>

            {/* Left / Enrollment & Pricing Sticky Sidebar (4 Cols) */}
            <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-6" id="enroll-section">
              
              {/* Cover Card */}
              <div className="rounded-[2rem] overflow-hidden bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xl relative aspect-[16/9] w-full">
                <Image
                  src={displayCover}
                  alt={course.title}
                  fill
                  className="object-cover"
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                  unoptimized={Boolean(displayCover?.startsWith('data:') || displayCover?.startsWith('blob:'))}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-5">
                  <div className="text-white">
                    <span className="text-xs font-bold text-emerald-400">MR. MOHAMED RADWAN</span>
                    <h3 className="text-sm font-black truncate">{course.title}</h3>
                  </div>
                </div>
              </div>

              {/* Pricing & Checkout Box */}
              <div className="rounded-[2.5rem] backdrop-blur-2xl bg-white/90 dark:bg-slate-900/90 border border-white/60 dark:border-slate-800/80 p-6 shadow-2xl shadow-emerald-500/5 space-y-5">
                
                {/* Price Display */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/80">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">قيمة الاشتراك:</span>
                  {course.isFree ? (
                    <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3.5 py-1 rounded-xl border border-emerald-200 dark:border-emerald-500/20">
                      مجاني 100%
                    </span>
                  ) : (
                    <div className="flex items-baseline gap-2">
                      {course.hasDiscount && course.originalPrice && course.originalPrice > course.price && (
                        <span className="text-sm font-bold text-slate-400 line-through">
                          {course.originalPrice} ج.م
                        </span>
                      )}
                      <span className="text-3xl font-black text-slate-900 dark:text-white">
                        {course.price} <span className="text-sm font-bold text-slate-500">ج.م</span>
                      </span>
                    </div>
                  )}
                </div>

                {/* If Already Enrolled */}
                {isEnrolled ? (
                  <div className="space-y-4 text-center">
                    <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold space-y-1">
                      <p className="font-black text-sm">🎉 أنت مسجل ومشترك في هذا الكورس</p>
                      <p>يمكنك فتح جميع المحاضرات وحل الواجبات والامتحانات مباشرة الآن.</p>
                    </div>

                    <div className="flex flex-col gap-2.5">
                      <Link
                        href={`/watch?courseId=${course.id}`}
                        className="w-full py-4 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-600/30 hover:shadow-emerald-600/50 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                      >
                        <PlayCircle className="w-5 h-5" />
                        <span>متابعة التعلم (مشاهدة المحاضرات)</span>
                      </Link>
                      <Link
                        href={`/student/courses/${course.id}`}
                        className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
                      >
                        <BookOpen className="w-4 h-4" />
                        <span>منهج ووحدات الكورس</span>
                      </Link>
                    </div>
                  </div>
                ) : course.isFree ? (
                  /* Free Course Checkout */
                  <div className="space-y-4">
                    {errorMessage && (
                      <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-bold">
                        {errorMessage}
                      </div>
                    )}
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleFreeEnroll}
                      className="w-full py-4 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-600/30 hover:shadow-emerald-600/50 transition-all flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <Check className="w-5 h-5" />
                          <span>التحاق فوري بالكورس المجاني</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  /* Paid Course Checkout Methods */
                  <div className="space-y-4">
                    
                    {/* Method Selector Tabs */}
                    <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs font-black">
                      <button
                        type="button"
                        onClick={() => setEnrollMethod('code')}
                        className={`py-2 px-1.5 rounded-xl transition-all flex flex-col items-center gap-1 ${
                          enrollMethod === 'code'
                            ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span className="text-[11px]">كود سنتر</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setEnrollMethod('fawry')}
                        className={`py-2 px-1.5 rounded-xl transition-all flex flex-col items-center gap-1 ${
                          enrollMethod === 'fawry'
                            ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span className="text-[11px]">فودافون/فوري</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setEnrollMethod('wallet')}
                        className={`py-2 px-1.5 rounded-xl transition-all flex flex-col items-center gap-1 ${
                          enrollMethod === 'wallet'
                            ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <Wallet className="w-3.5 h-3.5" />
                        <span className="text-[11px]">المحفظة</span>
                      </button>
                    </div>

                    {/* Messages */}
                    {errorMessage && (
                      <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold">
                        {errorMessage}
                      </div>
                    )}
                    {enrollSuccess && (
                      <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                        🎉 تم تفعيل واشتراك الكورس بنجاح! جاري التوجيه...
                      </div>
                    )}

                    {/* Tab 1: Code */}
                    {enrollMethod === 'code' && (
                      <form onSubmit={handleRedeemCode} className="space-y-3">
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400">
                          أدخل كود الكورس المطبوع (المستلم من السنتر أو المعلم):
                        </label>
                        <input
                          type="text"
                          value={activationCode}
                          onChange={(e) => setActivationCode(e.target.value.toUpperCase())}
                          placeholder="MR-XXXX-XXXX"
                          className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-center text-sm uppercase tracking-wider focus:outline-hidden focus:border-emerald-500"
                        />
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
                        >
                          {isSubmitting ? (
                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                          ) : (
                            <>
                              <KeyRound className="w-4 h-4" />
                              <span>تفعيل الكود وفتح الكورس</span>
                            </>
                          )}
                        </button>
                      </form>
                    )}

                    {/* Tab 2: Fawry / Vodafone Cash */}
                    {enrollMethod === 'fawry' && (
                      <div className="space-y-3 text-xs">
                        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-2">
                          <p className="font-bold text-slate-700 dark:text-slate-300">
                            طرق الدفع الإلكتروني المباشر:
                          </p>
                          <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                            <span className="font-bold">فودافون كاش / انستاباي :</span>
                            <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">01552191172</span>
                          </div>
                          <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                            <span className="font-bold">رقم الدعم الإضافي :</span>
                            <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">01148553118</span>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            بعد التحويل، أرسل سكرين شوت التحويل على واتساب لتفعيل الكورس فوراً.
                          </p>
                        </div>

                        <a
                          href="https://wa.me/201552191172"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span>إرسال إيصال التحويل عبر واتساب</span>
                        </a>
                      </div>
                    )}

                    {/* Tab 3: Wallet */}
                    {enrollMethod === 'wallet' && (
                      <div className="space-y-3 text-xs">
                        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-slate-800">
                          <span className="font-bold text-slate-600 dark:text-slate-400">رصيدك في المحفظة:</span>
                          <span className="font-black text-sm text-slate-900 dark:text-white">
                            {currentUser ? `${currentUser.walletBalance || 0} ج.م` : 'سجل الدخول لمعرفة الرصيد'}
                          </span>
                        </div>

                        <button
                          type="button"
                          disabled={isSubmitting || !currentUser || (currentUser?.walletBalance || 0) < course.price}
                          onClick={handleWalletEnroll}
                          className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:cursor-not-allowed text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
                        >
                          {isSubmitting ? (
                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                          ) : (
                            <>
                              <Wallet className="w-4 h-4" />
                              <span>خصم {course.price} ج.م والشراء من المحفظة</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                  </div>
                )}

                {/* Guarantee List */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>مشاهدة غير محدودة طوال العام الدراسي</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>مشاهدة بجودة عالية بدون إعلانات مزعجة</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>متابعة شخصية ودعم أكاديمي مباشر مع المستر</span>
                  </div>
                </div>

              </div>

              {/* Direct WhatsApp Contact Box */}
              <div className="p-5 rounded-3xl bg-slate-900 text-white space-y-3 border border-slate-800 shadow-lg">
                <div className="flex items-center gap-2.5 text-xs font-black text-emerald-400">
                  <Phone className="w-4 h-4" />
                  <span>تواصل مباشر مع مستر محمد رضوان</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                  هل لديك استفسار حول الكورس أو طرق الاشتراك؟ تواصل معنا مباشرة عبر الواتساب.
                </p>
                <div className="flex flex-col gap-2 pt-1 text-xs">
                  <a
                    href="https://wa.me/201552191172"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center justify-between font-mono"
                  >
                    <span>واتساب مستر محمد :</span>
                    <span className="text-emerald-400 font-bold">01552191172</span>
                  </a>
                </div>
              </div>

            </div>

          </div>

        </div>

      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
