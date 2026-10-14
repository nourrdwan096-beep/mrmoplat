'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Course } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import {
  fetchUnitsByCourse,
  fetchItemsByUnit,
  UnitData,
  UnitItemData,
  isStudentEnrolledInCourse,
  enrollStudentInCourse,
  redeemActivationCodeForStudent
} from '@/lib/academicService';
import {
  X,
  BookOpen,
  Layers,
  Video,
  FileCheck,
  Award,
  Lock,
  Unlock,
  CreditCard,
  Key,
  Wallet,
  ShieldCheck,
  CheckCircle2,
  PhoneCall,
  Sparkles,
  ArrowRight,
  AlertCircle,
  PlayCircle,
  FileText,
  Presentation,
  Play,
  Download,
  MessageSquare
} from 'lucide-react';
import { getAcademicBatchYear } from '@/components/CourseCard';
import { useResolvedImageUrl } from '@/hooks/useResolvedImageUrl';

interface CourseDetailModalProps {
  course: Course | null;
  onClose: () => void;
  onOpenRegister: () => void;
  initialTab?: 'curriculum' | 'enroll';
}

export default function CourseDetailModal({
  course,
  onClose,
  onOpenRegister,
  initialTab = 'curriculum',
}: CourseDetailModalProps) {
  const router = useRouter();
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'curriculum' | 'enroll'>(initialTab);
  const [activationCode, setActivationCode] = useState('');
  const [enrollSuccess, setEnrollSuccess] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isLoadingUnits, setIsLoadingUnits] = useState(true);
  const [units, setUnits] = useState<UnitData[]>([]);
  const [unitItems, setUnitItems] = useState<Record<string, UnitItemData[]>>({});
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imgError, setImgError] = useState(false);

  const fallbackUrl = 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=800&auto=format&fit=crop&q=80';
  const resolvedCoverImage = useResolvedImageUrl(course?.coverImage);
  const displayCover = (imgError || !resolvedCoverImage || resolvedCoverImage.startsWith('idb://'))
    ? fallbackUrl
    : resolvedCoverImage;

  useEffect(() => {
    if (initialTab) {
      Promise.resolve().then(() => {
        setActiveTab(initialTab);
      });
    }
  }, [initialTab]);

  useEffect(() => {
    if (!course) return;

    let isMounted = true;
    Promise.resolve().then(() => {
      if (isMounted) {
        setIsLoadingUnits(true);
        setErrorMessage('');
      }
    });

    // Check if student is already enrolled
    if (currentUser?.id) {
      isStudentEnrolledInCourse(currentUser.id, course.id).then((enrolled) => {
        if (isMounted) setIsEnrolled(enrolled);
      });
    }

    // Load actual units and items
    fetchUnitsByCourse(course.id).then(async (fetchedUnits) => {
      if (!isMounted) return;
      setUnits(fetchedUnits);

      const itemsMap: Record<string, UnitItemData[]> = {};
      for (const u of fetchedUnits) {
        const items = await fetchItemsByUnit(u.id);
        itemsMap[u.id] = items;
      }

      if (isMounted) {
        setUnitItems(itemsMap);
        setIsLoadingUnits(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [course, currentUser?.id]);

  if (!course) return null;

  const handleRedeemCode = async () => {
    if (!currentUser) {
      setErrorMessage('يجب تسجيل الدخول أو إنشاء حساب طالب أولاً لتفعيل الكود');
      return;
    }
    if (!activationCode.trim()) {
      setErrorMessage('يرجى كتابة كود التفعيل المطبوع');
      return;
    }

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
        fullName: currentUser.fullName,
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

    setIsSubmitting(true);
    setErrorMessage('');
    await enrollStudentInCourse(currentUser.id, course.id, 'wallet', course.price, {
      fullName: currentUser.fullName,
      phone: currentUser.phone,
      parentPhone: currentUser.parentPhone,
    });
    setIsSubmitting(false);
    setEnrollSuccess(true);
    setIsEnrolled(true);
  };

  const handleFreeEnroll = async () => {
    if (!currentUser) {
      setErrorMessage('يجب تسجيل الدخول أولاً للالتحاق بالكورس المجاني');
      return;
    }

    setIsSubmitting(true);
    await enrollStudentInCourse(currentUser.id, course.id, 'free', 0, {
      fullName: currentUser.fullName,
      phone: currentUser.phone,
      parentPhone: currentUser.parentPhone,
    });
    setIsSubmitting(false);
    setEnrollSuccess(true);
    setIsEnrolled(true);
  };

  const handleGoToWatch = () => {
    onClose();
    router.push(`/watch?courseId=${course.id}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto" dir="rtl">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6 max-h-[92vh] flex flex-col">
        
        {/* Course Banner Header with clean 16:9 aspect ratio */}
        <div className="relative w-full aspect-[16/9] max-h-72 bg-slate-900 overflow-hidden shrink-0">
          <Image
            src={displayCover}
            alt={course.title}
            fill
            className="object-cover"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            unoptimized={Boolean(displayCover?.startsWith('data:') || displayCover?.startsWith('blob:'))}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />
          
          <button
            onClick={onClose}
            aria-label="إغلاق النافذة"
            className="absolute top-4 left-4 p-2.5 rounded-2xl bg-slate-950/80 text-white hover:bg-slate-800 backdrop-blur-md border border-slate-700/60 shadow-lg transition-all z-20"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Structured Course Header Info Bar */}
        <div className="p-4 sm:p-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-200/60 dark:border-emerald-500/20">
                <Presentation className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>المعلم / مستر محمد رضوان</span>
              </span>
              <span className="px-3 py-1 rounded-xl text-xs font-black bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                {getAcademicBatchYear()}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-xl text-xs font-black bg-emerald-500 text-slate-950 shadow-sm">
                {course.stage === 'high' ? 'المرحلة الثانوية' : 'المرحلة الإعدادية'} - الصف {course.grade}
              </span>
              <span className="px-3 py-1 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {course.educationType === 'azhar' ? 'أزهر شريف' : course.educationType === 'general' ? 'تعليم عام' : course.educationType === 'arabic' ? 'عربي' : 'لغات'}
              </span>
              {isEnrolled && (
                <span className="px-3 py-1 rounded-xl text-xs font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  ✓ أنت مشترك بالفعل
                </span>
              )}
            </div>
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-snug">
            {course.title}
          </h3>
        </div>

        {/* Tabs Bar */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 bg-slate-50 dark:bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('curriculum')}
              className={`py-3.5 px-4 text-xs sm:text-sm font-black border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'curriculum'
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>محتوى المنهج والوحدات</span>
            </button>
            <button
              onClick={() => setActiveTab('enroll')}
              className={`py-3.5 px-4 text-xs sm:text-sm font-black border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'enroll'
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>الاشتراك وتفعيل الكورس</span>
            </button>
          </div>

          {/* Quick Price on Tabs */}
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs text-slate-500 font-bold">السعر:</span>
            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
              {course.isFree ? 'مجاني 100%' : `${course.price} ج.م`}
            </span>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-7 overflow-y-auto space-y-6 flex-1 text-slate-700 dark:text-slate-300">
          
          {/* TAB 1: CURRICULUM PREVIEW */}
          {activeTab === 'curriculum' && (
            <div className="space-y-6">
              {/* Description Card */}
              {course.description && (
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">نبذة عن الكورس</h4>
                  <p className="text-sm sm:text-base leading-relaxed text-slate-700 dark:text-slate-300 font-medium">
                    {course.description}
                  </p>
                </div>
              )}

              {/* Total Summary Counts Breakdown (Visible to all students, while content itself remains locked) */}
              {(() => {
                const allItems = Object.values(unitItems).flat();
                const totalVideos = allItems.filter(i => i.itemType === 'video').length;
                const totalExams = allItems.filter(i => i.itemType === 'exam').length;
                const totalHomeworks = allItems.filter(i => i.itemType === 'homework').length;
                const totalPdfs = allItems.filter(i => i.itemType === 'concept_sheet' || i.itemType === 'summary_pdf').length;
                
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800/80">
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm">
                      <Video className="w-4 h-4 text-rose-500 shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-black text-slate-900 dark:text-white truncate">{totalVideos} محاضرات</span>
                        <span className="text-[10px] text-slate-400 font-semibold truncate">شرح تفصيلي</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm">
                      <FileCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-black text-slate-900 dark:text-white truncate">{totalHomeworks} واجبات</span>
                        <span className="text-[10px] text-slate-400 font-semibold truncate">تدريبات أسبوعية</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm">
                      <Award className="w-4 h-4 text-amber-500 shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-black text-slate-900 dark:text-white truncate">{totalExams} امتحانات</span>
                        <span className="text-[10px] text-slate-400 font-semibold truncate">تقييمات إلكترونية</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm">
                      <FileText className="w-4 h-4 text-teal-500 shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-black text-slate-900 dark:text-white truncate">{totalPdfs} ملازم ومفاهيم</span>
                        <span className="text-[10px] text-slate-400 font-semibold truncate">ملخصات شاملة</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Security & Access Banner */}
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-800 dark:text-emerald-300 font-semibold">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>محتوى تعليمي مؤمن ومحدث بالكامل لمعايير ٢٠٢٦ بإشراف مستر محمد رضوان</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-bold shrink-0">
                  <Lock className="w-3.5 h-3.5 text-amber-500" />
                  <span>معاينة الفهرس فقط (يتطلب الاشتراك للاستفادة)</span>
                </div>
              </div>

              {/* Units List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-500" />
                    <span>فهرس الوحدات والمحاضرات ({units.length} وحدات)</span>
                  </h4>
                  <span className="text-xs text-slate-400 font-bold">
                    ترتيب تسلسلي مؤمن
                  </span>
                </div>

                {isLoadingUnits ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-3">
                    <div className="w-8 h-8 border-3 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                    <span className="text-xs font-bold text-slate-400">جاري تحميل عناصر المنهج...</span>
                  </div>
                ) : units.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <BookOpen className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
                      يتم حالياً تجهيز وإضافة محتويات هذا الكورس من قبل مستر محمد رضوان.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {units.map((unit) => {
                      const items = unitItems[unit.id] || [];
                      return (
                        <div
                          key={unit.id}
                          className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm"
                        >
                          <div className="flex items-center justify-between">
                            <h5 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2.5">
                              <span className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs flex items-center justify-center font-black border border-emerald-500/20">
                                {unit.unitNumber}
                              </span>
                              <span>{unit.title}</span>
                            </h5>
                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                              {items.length} عناصر
                            </span>
                          </div>

                          {unit.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed pr-9">
                              {unit.description}
                            </p>
                          )}

                          {/* Items Grid */}
                          {items.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                              {items.map((item) => (
                                <div
                                  key={item.id}
                                  className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 text-xs"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    {item.itemType === 'video' && <Video className="w-4 h-4 text-rose-500 shrink-0" />}
                                    {item.itemType === 'homework' && <FileCheck className="w-4 h-4 text-emerald-500 shrink-0" />}
                                    {item.itemType === 'exam' && <Award className="w-4 h-4 text-amber-500 shrink-0" />}
                                    {item.itemType === 'concept_sheet' && <FileText className="w-4 h-4 text-teal-500 shrink-0" />}
                                    {item.itemType === 'summary_pdf' && <BookOpen className="w-4 h-4 text-purple-500 shrink-0" />}
                                    <div className="flex flex-col min-w-0">
                                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{item.title}</span>
                                      <span className="text-[10px] text-slate-400">
                                        {item.itemType === 'video' ? 'محاضرة شرح حصرية' :
                                         item.itemType === 'homework' ? 'واجب تفاعلي' :
                                         item.itemType === 'exam' ? 'امتحان إلكتروني' :
                                         item.itemType === 'concept_sheet' ? 'ورقة مفاهيم' : 'ملزمة تلخيص'}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="shrink-0 flex items-center gap-1 text-[11px] font-bold text-slate-400">
                                    <Lock className="w-3.5 h-3.5" />
                                    <span>مغلق</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-[11px] font-semibold text-slate-400 pt-1 pr-9">
                              المحتوى قيد النشر والإعداد بواسطة المستر.
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: ENROLLMENT & PURCHASE */}
          {activeTab === 'enroll' && (
            <div className="space-y-6">
              {enrollSuccess || isEnrolled ? (
                <div className="text-center py-8 space-y-4 bg-emerald-500/10 rounded-3xl border border-emerald-500/20 p-6">
                  <div className="w-16 h-16 rounded-3xl bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/30 animate-bounce">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xl font-black text-slate-900 dark:text-white">
                      تم تفعيل واشتراك الكورس بنجاح!
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed font-medium">
                      يمكنك الآن البدء في متابعة المحاضرات والدروس وحل الواجبات والامتحانات التفاعلية.
                    </p>
                  </div>

                  {/* Device Policy Notice Box */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-500/30 max-w-md mx-auto text-right space-y-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black">
                      <ShieldCheck className="w-4 h-4" />
                      <span>اعتماد الجهاز والأمان:</span>
                    </div>
                    <p className="leading-relaxed">
                      سيتم اعتماد هذا الجهاز كأول جهاز أساسي لك، ولك صلاحية استخدام جهاز واحد آخر إضافي على نفس الإيميل وكلمة المرور (حد أقصى جهازين فقط).
                    </p>
                  </div>

                  <button
                    onClick={handleGoToWatch}
                    className="px-8 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm shadow-xl shadow-emerald-600/30 flex items-center gap-2 mx-auto"
                  >
                    <span>الدخول لمشاهدة الكورس والمذاكرة الآن</span>
                    <ArrowRight className="w-4 h-4 rotate-180" />
                  </button>
                </div>
              ) : (
                <>
                  {/* Guest Warning if not logged in */}
                  {!currentUser && (
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-300 font-bold">
                        <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                        <span>يرجى تسجيل الدخول أو إنشاء حساب طالب جديد لتفعيل الكورس وربطه بجهازك</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Link
                          href="/login"
                          className="px-3.5 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-xs hover:opacity-90"
                        >
                          تسجيل دخول
                        </Link>
                        <button
                          onClick={() => {
                            onClose();
                            onOpenRegister();
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white font-black text-xs hover:bg-emerald-500"
                        >
                          إنشاء حساب
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Error Alert */}
                  {errorMessage && (
                    <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold text-center">
                      {errorMessage}
                    </div>
                  )}

                  {/* Trial Period Announcement Banner */}
                  <div className="p-5 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 space-y-2 text-right">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-black text-sm">
                      <Sparkles className="w-4 h-4 shrink-0 text-amber-500" />
                      <span>مرحلة التشغيل التجريبي • العام الدراسي 2027 - 2028</span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-bold leading-relaxed">
                      المنصة حالياً غير جاهزة للاشتراكات التجارية وسيتم فتح باب الاشتراكات رسمياً العام القادم بإذن الله.
                      <span className="block text-rose-600 dark:text-rose-400 font-black mt-1">
                        ⛔ يمنع تحويل أي مبالغ مالية إلى أي محفظة إلكترونية.
                      </span>
                      🎁 يسعدنا أن نمنحك كود تفعيل تجريبي لهذا الكورس مجاناً 100% للتجربة والتعلم!
                    </p>
                  </div>

                  {/* Free Course Instant Enroll (if course is explicitly marked free) */}
                  {course.isFree ? (
                    <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-center space-y-3">
                      <h4 className="text-base font-black text-emerald-900 dark:text-emerald-300">
                        هذا الكورس متاح ومفتوح مجاناً
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                        اضغط على الزر أدناه لتفعيل الكورس مباشرة على حسابك والبدء في المذاكرة فوراً.
                      </p>
                      <button
                        onClick={handleFreeEnroll}
                        disabled={isSubmitting}
                        className="px-8 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50"
                      >
                        {isSubmitting ? 'جاري التفعيل...' : 'تفعيل الكورس المجاني الآن'}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* WhatsApp Button to Request Free Trial Code */}
                      <a
                        href={`https://wa.me/201552191172?text=${encodeURIComponent(`مرحباً مستر محمد رضوان، أود تجربة المنصة وأحتاج كود التفعيل المجاني لكورس: (${course.title})`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5 text-center"
                      >
                        <MessageSquare className="w-4 h-4 shrink-0" />
                        <span>احصل على كود تفعيل الكورس مجاناً عبر واتساب 🎁</span>
                      </a>

                      {/* Code Input Box */}
                      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
                        <div className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
                          <Key className="w-4 h-4 text-amber-500" />
                          <span>إدخال كود التفعيل المجاني (المستلم من المستر)</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                          أدخل الكود الذي أرسله لك مستر محمد رضوان لفتح الكورس وتثبيته على جهازك:
                        </p>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={activationCode}
                            onChange={(e) => setActivationCode(e.target.value.toUpperCase())}
                            placeholder="MR-XXXX-XXXX"
                            className="flex-1 h-12 px-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                          <button
                            onClick={handleRedeemCode}
                            disabled={isSubmitting || !activationCode.trim()}
                            className="px-6 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 hover:bg-slate-800 font-black text-xs transition-all disabled:opacity-50 shadow-md"
                          >
                            {isSubmitting ? 'جاري التحقق...' : 'تفعيل الكود'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 font-semibold">
            واتساب مستر محمد رضوان: <strong className="text-emerald-600 dark:text-emerald-400 font-bold" dir="ltr">01552191172</strong>
          </div>
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            {!currentUser && (
              <button
                onClick={() => {
                  onClose();
                  onOpenRegister();
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md"
              >
                تسجيل حساب جديد
              </button>
            )}
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
            >
              إغلاق
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

