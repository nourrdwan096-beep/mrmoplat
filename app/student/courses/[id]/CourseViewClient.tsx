'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  getCourseById, CourseData, fetchUnitsByCourse, UnitData, 
  fetchItemsByUnit, UnitItemData, isStudentEnrolledInCourse, 
  fetchStudentProgress, StudentItemProgressData, isItemAccessible,
  redeemActivationCodeForStudent, enrollStudentInCourse
} from '@/lib/academicService';
import { 
  ArrowRight, Video, FileText, CheckCircle, FileCheck, Lock, Play, CreditCard, Ticket, AlertCircle, BookOpen,
  CheckCircle2, ShieldCheck, Smartphone, Sparkles, X, Download, Award, Layers, Clock, Check, HelpCircle,
  BarChart3, ChevronDown, ChevronUp, FileSpreadsheet, Eye
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useResolvedImageUrl } from '@/hooks/useResolvedImageUrl';

export default function CourseViewClient({ courseId }: { courseId: string }) {
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
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [progress, setProgress] = useState<Record<string, StudentItemProgressData>>({});
  const [loading, setLoading] = useState(true);
  
  const [activationCode, setActivationCode] = useState('');
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [redeemStatusText, setRedeemStatusText] = useState('');
  const [redeemError, setRedeemError] = useState('');

  // Success Confirmation Modal State
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [activationSuccessData, setActivationSuccessData] = useState<{
    courseTitle: string;
    deviceMessage: string;
  } | null>(null);

  // Active unit accordion collapses (all open by default)
  const [collapsedUnits, setCollapsedUnits] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function loadCourse() {
      if (!currentUser?.id) return;
      try {
        const c = await getCourseById(courseId);
        setCourse(c);
        
        const enrolled = await isStudentEnrolledInCourse(currentUser.id, courseId);
        setIsEnrolled(enrolled);
        
        const loadedUnits = await fetchUnitsByCourse(courseId);
        setUnits(loadedUnits.sort((a, b) => a.orderIndex - b.orderIndex));
        
        let itemsMap: Record<string, UnitItemData[]> = {};
        for (const u of loadedUnits) {
          const items = await fetchItemsByUnit(u.id);
          itemsMap[u.id] = items.sort((a, b) => a.orderIndex - b.orderIndex);
        }
        setUnitItems(itemsMap);
        
        if (enrolled) {
          const p = await fetchStudentProgress(currentUser.id, courseId);
          setProgress(p);
        }
        
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    loadCourse();

    const handleEnrollmentUpdate = (e: any) => {
      if (e?.detail?.courseId === courseId || !e?.detail?.courseId) {
        setIsEnrolled(true);
        if (currentUser?.id) {
          fetchStudentProgress(currentUser.id, courseId).then(p => setProgress(p));
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('mr_radwan_enrollments_updated', handleEnrollmentUpdate);
      return () => {
        window.removeEventListener('mr_radwan_enrollments_updated', handleEnrollmentUpdate);
      };
    }
  }, [courseId, currentUser?.id]);

  // Metric aggregates
  const stats = useMemo(() => {
    let totalItems = 0;
    let videoCount = 0;
    let quizCount = 0;
    let docCount = 0;
    let completedCount = 0;

    Object.values(unitItems).forEach(items => {
      items.forEach(it => {
        totalItems++;
        if (it.itemType === 'video') videoCount++;
        else if (it.itemType === 'homework' || it.itemType === 'exam') quizCount++;
        else if (it.itemType === 'concept_sheet' || it.itemType === 'summary_pdf') docCount++;

        if (progress[it.id]?.isPassed) {
          completedCount++;
        }
      });
    });

    const completionPercent = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;

    return {
      totalItems,
      videoCount,
      quizCount,
      docCount,
      completedCount,
      completionPercent,
    };
  }, [unitItems, progress]);

  const toggleUnitCollapse = (unitId: string) => {
    setCollapsedUnits(prev => ({ ...prev, [unitId]: !prev[unitId] }));
  };

  const handleRedeemCode = async () => {
    if (!activationCode.trim() || !currentUser?.id) return;
    setRedeemLoading(true);
    setRedeemError('');
    setRedeemStatusText('جاري فحص كود المعلم والتحقق من الصلاحية...');

    try {
      await new Promise(r => setTimeout(r, 600));
      setRedeemStatusText('جاري اعتماد وتوثيق بصمة هذا الجهاز كجهاز أساسي...');

      const res = await redeemActivationCodeForStudent(
        activationCode.trim(), 
        currentUser.id, 
        currentUser.fullName || 'طالب المنصة',
        courseId,
        {
          email: currentUser.email,
          phone: currentUser.phone,
          parentPhone: currentUser.parentPhone,
        }
      );

      await new Promise(r => setTimeout(r, 500));

      if (res.success) {
        setIsEnrolled(true);
        setActivationSuccessData({
          courseTitle: res.courseTitle || course?.title || 'كورس مستر محمد رضوان',
          deviceMessage: 'سيتم اعتماد هذا الجهاز كأول جهاز أساسي لك (مثبت للأمان)، ولك صلاحية استخدام جهاز واحد آخر إضافي على نفس الإيميل وكلمة المرور (حد أقصى جهازين فقط).'
        });
        setActivationCode('');
        setShowSuccessModal(true);
        if (currentUser?.id) {
          fetchStudentProgress(currentUser.id, courseId).then(p => setProgress(p));
        }
      } else {
        setRedeemError(res.message || 'الكود غير صحيح أو تم استخدامه مسبقاً');
      }
    } catch {
      setRedeemError('حدث خطأ أثناء معالجة كود التفعيل، يرجى إعادة المحاولة');
    } finally {
      setRedeemLoading(false);
      setRedeemStatusText('');
    }
  };

  const handleConfirmAndEnterCourse = async () => {
    setShowSuccessModal(false);
    setIsEnrolled(true);

    if (currentUser?.id) {
      await enrollStudentInCourse(currentUser.id, courseId, 'activation_code', 0, {
        fullName: currentUser.fullName,
        email: currentUser.email,
        phone: currentUser.phone,
        parentPhone: currentUser.parentPhone,
      });
      const p = await fetchStudentProgress(currentUser.id, courseId);
      setProgress(p);
    }
  };

  const handleFreeEnrollment = async () => {
    if (!currentUser?.id) return;
    setRedeemLoading(true);
    setRedeemError('');
    setRedeemStatusText('جاري تسجيل انضمامك للكورس المجاني...');
    try {
      await enrollStudentInCourse(
        currentUser.id,
        courseId,
        'free',
        0,
        {
          fullName: currentUser.fullName,
          email: currentUser.email,
          phone: currentUser.phone,
          parentPhone: currentUser.parentPhone,
        }
      );
      setActivationSuccessData({
        courseTitle: course?.title || 'كورس مجاني',
        deviceMessage: 'تم انضمامك للكورس بنجاح. يمكنك الآن بدء التعلم بحرية تامة!',
      });
      setShowSuccessModal(true);
    } catch (err: any) {
      setRedeemError(err.message || 'فشل الانضمام للكورس.');
    } finally {
      setRedeemLoading(false);
    }
  };

  const handleWalletBuy = async () => {
    alert('شراء من المحفظة أو الدفع الفوري قيد الإعداد.');
  };

  const handleDownloadDocument = (e: React.MouseEvent, item: UnitItemData, isAccessible: boolean) => {
    e.stopPropagation();
    if (!isAccessible) {
      alert('يجب اجتياز المحتوى السابق أولاً لفتح هذا المستند والتمكن من تحميله.');
      return;
    }

    if (item.pdfAttachmentUrl) {
      const link = document.createElement('a');
      link.href = item.pdfAttachmentUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.download = `${item.title}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      router.push(`/watch/${courseId}/${item.id}`);
    }
  };

  if (loading) return (
    <div className="p-8 flex flex-col justify-center items-center min-h-[50vh] gap-3">
      <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-xs font-bold text-slate-500">جاري تحميل بيانات الكورس والمحتوى التعليمي...</p>
    </div>
  );
  
  if (!course) return (
    <div className="p-12 text-center text-slate-500 font-bold max-w-md mx-auto space-y-4">
      <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
      <h2 className="text-lg font-black text-slate-900 dark:text-white">الكورس غير متاح حالياً</h2>
      <p className="text-sm text-slate-500">هذا الكورس غير موجود أو تم تعديله من قبل الإدارة.</p>
      <Link href="/student/courses" className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-black">
        <ArrowRight className="w-4 h-4" /> العودة للكورسات
      </Link>
    </div>
  );

  return (
    <div className="pb-24 min-h-screen">
      {/* 1. Header & Hero Section */}
      <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white p-6 sm:p-10 lg:p-12 relative overflow-hidden border-b border-slate-800">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/30 via-slate-900/50 to-teal-950/20 pointer-events-none"></div>
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 max-w-6xl mx-auto space-y-6">
          {/* Breadcrumbs */}
          <div className="flex items-center justify-between gap-4">
            <Link 
              href="/student/courses" 
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-black transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
              <span>العودة لدليل الكورسات</span>
            </Link>

            {isEnrolled && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-black">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>أنت مشترك في هذا الكورس</span>
              </span>
            )}
          </div>

          {/* Main Course Info Banner */}
          <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start md:items-center">
            {/* Cover Art */}
            <div className="w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 rounded-3xl overflow-hidden shrink-0 border-2 border-slate-700/80 bg-slate-800 shadow-2xl relative">
              {course.coverImage ? (
                <Image 
                  src={displayCover} 
                  alt={course.title} 
                  width={240} 
                  height={240} 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                  unoptimized={Boolean(displayCover?.startsWith('data:') || displayCover?.startsWith('blob:'))}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-600 bg-slate-800/80">
                  <Video className="w-12 h-12" />
                </div>
              )}
            </div>

            {/* Course Details */}
            <div className="flex-1 space-y-3">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-lg text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {course.stage === 'high' ? 'المرحلة الثانوية' : 'المرحلة الإعدادية'}
                </span>
                <span className="px-3 py-1 rounded-lg text-xs font-black bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  الصف {course.grade} {course.stage === 'high' ? 'الثانوي' : 'الإعدادي'}
                </span>
                <span className="px-3 py-1 rounded-lg text-xs font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {course.stage === 'high'
                    ? (course.educationType === 'azhar' ? 'التعليم الأزهري' : 'الثانوية العامة')
                    : (course.educationType === 'azhar' ? 'لغات / أزهر' : 'التعليم العام')}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white leading-tight">
                {course.title}
              </h1>

              {course.description && (
                <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-medium max-w-3xl">
                  {course.description}
                </p>
              )}
            </div>
          </div>

          {/* Quick Metrics & Progress Row */}
          <div className="pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 font-bold block">الوحدات الدراسية</span>
                <span className="text-base font-black text-white">{units.length} وحدات</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <Video className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 font-bold block">محاضرات الشرح</span>
                <span className="text-base font-black text-white">{stats.videoCount} محاضرة</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <FileCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 font-bold block">واجبات وامتحانات</span>
                <span className="text-base font-black text-white">{stats.quizCount} تدريب واختبار</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 font-bold block">ملازم وورق مفاهيم</span>
                <span className="text-base font-black text-white">{stats.docCount} مستند</span>
              </div>
            </div>
          </div>

          {/* Enrolled Student Progress Bar */}
          {isEnrolled && (
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 space-y-2">
              <div className="flex items-center justify-between text-xs font-black">
                <span className="text-emerald-300 flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4" />
                  مستوى إنجازك وتقدمك في الكورس
                </span>
                <span className="text-emerald-400 font-mono text-sm">
                  {stats.completedCount} من {stats.totalItems} منجز ({stats.completionPercent}%)
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, stats.completionPercent))}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* 2. Enrollment / Activation Card (If not yet enrolled) */}
        {!isEnrolled && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl max-w-2xl mx-auto -mt-10 relative z-20 space-y-6">
            <div className="text-center space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <Sparkles className="w-3.5 h-3.5" /> تفعيل فوري معتمد
              </span>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">انضم للكورس الآن</h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                {(course?.isFree || (course?.price ?? 0) <= 0) 
                  ? 'هذا الكورس مجاني ومفتوح. اضغط للانضمام فوراً.' 
                  : 'أدخل كود تفعيل الكورس المسلم لك من مستر محمد رضوان للبدء فوراً.'}
              </p>
            </div>

            {(course?.isFree || (course?.price ?? 0) <= 0) ? (
              <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 space-y-4 text-center">
                <div className="flex justify-center mb-2">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Sparkles className="w-8 h-8" />
                  </div>
                </div>
                <h3 className="font-black text-slate-900 dark:text-white text-lg">هذا الكورس مجاني 100%</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 font-bold mb-4">
                  لا يتطلب أي أكواد تفعيل. يمكنك الانضمام فوراً بحسابك.
                </p>
                <button
                  onClick={handleFreeEnrollment}
                  disabled={redeemLoading}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20"
                >
                  {redeemLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>جاري الانضمام...</span>
                    </>
                  ) : (
                    <>
                      <span>انضم للكورس مجاناً</span>
                      <Check className="w-5 h-5" />
                    </>
                  )}
                </button>

                {redeemError && (
                  <p className="text-xs font-bold text-rose-500 flex items-center gap-1.5 justify-center pt-2">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {redeemError}
                  </p>
                )}
              </div>
            ) : (
              <>
                {/* Code Redemption Box */}
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                      <Ticket className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 dark:text-white text-sm">تفعيل الكورس بكود التفعيل</h3>
                      <p className="text-xs text-slate-400">كود مكون من أرقام وحروف مخصص لك</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={activationCode}
                      onChange={e => setActivationCode(e.target.value)}
                      disabled={redeemLoading}
                      placeholder="أدخل كود التفعيل هنا..."
                      className="flex-1 h-12 px-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold tracking-widest text-center uppercase disabled:opacity-50 text-slate-900 dark:text-white text-sm"
                      dir="ltr"
                    />
                    <button
                      onClick={handleRedeemCode}
                      disabled={redeemLoading || !activationCode.trim()}
                      className="h-12 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs disabled:opacity-50 transition-all flex items-center justify-center gap-2 shrink-0 shadow-md shadow-emerald-600/20"
                    >
                      {redeemLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>جاري التحقق...</span>
                        </>
                      ) : (
                        <>
                          <span>تفعيل الكود</span>
                          <Check className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>

                  {redeemLoading && redeemStatusText && (
                    <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2 justify-center animate-pulse pt-1">
                      <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                      {redeemStatusText}
                    </p>
                  )}

                  {redeemError && (
                    <p className="text-xs font-bold text-rose-500 flex items-center gap-1.5 justify-center pt-1">
                      <AlertCircle className="w-4 h-4 shrink-0" /> {redeemError}
                    </p>
                  )}
                </div>

                {/* Wallet / Fawry Option */}
                <button 
                  onClick={handleWalletBuy}
                  className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 transition-all flex items-center justify-between group text-right"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 dark:text-white text-sm">الشراء عبر المحفظة / فوري</h3>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">سعر الاشتراك: {course?.price} ج.م</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors rotate-180" />
                </button>
              </>
            )}
          </div>
        )}

        {/* Success Confirmation Modal */}
        {showSuccessModal && activationSuccessData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in" dir="rtl">
            <div className="bg-white dark:bg-slate-900 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative overflow-hidden text-center space-y-5">
              <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500"></div>

              <div className="w-20 h-20 rounded-3xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                <ShieldCheck className="w-10 h-10 animate-bounce" />
              </div>

              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                  <Sparkles className="w-3.5 h-3.5" /> تفعيل معتمد وناجح
                </span>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white pt-2">
                  تم تفعيل واشتراك الكورس بنجاح!
                </h3>
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                  {activationSuccessData.courseTitle}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-right space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div className="text-xs sm:text-sm font-bold leading-relaxed text-slate-800 dark:text-slate-200">
                    {activationSuccessData.deviceMessage}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-2 text-[11px] font-black text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>الجهاز الأساسي: معتمد ومثبت</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                    <span>الأجهزة المسموحة: 2 كحد أقصى</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleConfirmAndEnterCourse}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm shadow-xl shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
              >
                <span>الانتقال لمحتوى الكورس وبدء المذاكرة الآن</span>
                <ArrowRight className="w-5 h-5 rotate-180" />
              </button>
            </div>
          </div>
        )}

        {/* 3. Units & Curriculum Section */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
                <Layers className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                <span>المنهج والوحدات الدراسية</span>
                <span className="text-xs font-bold text-slate-400">({units.length} وحدات)</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
                تدرج المحاضرات والتدريبات وفقاً لضوابط المنهج المعتمدة.
              </p>
            </div>

            {/* Instruction badge on sequential progression */}
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700/60 self-start sm:self-auto">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>نظام التتابع: فتح الدروس مشروط باجتياز السابق</span>
            </div>
          </div>
          
          {units.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center shadow-sm space-y-3">
              <BookOpen className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto" />
              <h3 className="text-xl font-black text-slate-900 dark:text-white">لا توجد وحدات بعد</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm">يتم الآن تجهيز ورفع محتويات هذا الكورس بواسطة مستر محمد رضوان.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {units.map((unit) => {
                const items = unitItems[unit.id] || [];
                const isCollapsed = Boolean(collapsedUnits[unit.id]);

                // Count items passed in unit
                const unitCompletedCount = items.filter(it => progress[it.id]?.isPassed).length;

                return (
                  <div 
                    key={unit.id} 
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    {/* Unit Header Card */}
                    <div 
                      onClick={() => toggleUnitCollapse(unit.id)}
                      className="p-5 sm:p-6 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-4 cursor-pointer select-none transition-colors hover:bg-slate-100/80 dark:hover:bg-slate-800/60"
                    >
                      <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-black text-base sm:text-lg shadow-md shrink-0">
                          {unit.unitNumber}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
                              الوحدة {unit.unitNumber}
                            </span>
                            {isEnrolled && items.length > 0 && unitCompletedCount === items.length && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                مكتملة بالكامل ✓
                              </span>
                            )}
                          </div>
                          <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white truncate">
                            {unit.title}
                          </h3>
                          {unit.description && (
                            <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 truncate max-w-xl">
                              {unit.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 hidden sm:inline-block">
                          {items.length} عنصر تعليمي
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500">
                          {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>
                    
                    {/* Unit Items List (Collapsible) */}
                    {!isCollapsed && (
                      <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                        {items.length > 0 ? (
                          items.map((item) => {
                            let accessible = false;
                            let isCompleted = false;
                            let accessResult: { isAccessible: boolean; reason?: string } = { 
                              isAccessible: false, 
                              reason: 'يجب الاشتراك في الكورس أولاً لمشاهدة هذا المحتوى.' 
                            };

                            if (isEnrolled) {
                              accessResult = isItemAccessible(item, unit, units, unitItems, progress, course, currentUser?.role);
                              accessible = accessResult.isAccessible;
                              isCompleted = Boolean(progress[item.id]?.isPassed);
                            }

                            const isVideo = item.itemType === 'video';
                            const isHomework = item.itemType === 'homework';
                            const isExam = item.itemType === 'exam';
                            const isDocument = item.itemType === 'concept_sheet' || item.itemType === 'summary_pdf';

                            // Visual icon & badge colors
                            let typeBadgeText = 'محاضرة شرح';
                            let typeBadgeClass = 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-900/50';
                            let iconEl = <Video className="w-5 h-5 text-rose-500" />;

                            if (isHomework) {
                              typeBadgeText = 'واجب تفاعلي';
                              typeBadgeClass = 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-900/50';
                              iconEl = <FileCheck className="w-5 h-5 text-amber-500" />;
                            } else if (isExam) {
                              typeBadgeText = 'امتحان شامل';
                              typeBadgeClass = 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900/50';
                              iconEl = <Award className="w-5 h-5 text-indigo-500" />;
                            } else if (item.itemType === 'concept_sheet') {
                              typeBadgeText = 'ورقة مفاهيم';
                              typeBadgeClass = 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border-teal-200 dark:border-teal-900/50';
                              iconEl = <FileText className="w-5 h-5 text-teal-500" />;
                            } else if (item.itemType === 'summary_pdf') {
                              typeBadgeText = 'ملزمة وتلخيص';
                              typeBadgeClass = 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-900/50';
                              iconEl = <BookOpen className="w-5 h-5 text-purple-500" />;
                            }

                            return (
                              <div
                                key={item.id}
                                className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                                  accessible 
                                    ? 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40' 
                                    : 'opacity-70 bg-slate-50/40 dark:bg-slate-950/40'
                                }`}
                              >
                                {/* Left/Main Item Meta */}
                                <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                                    isCompleted 
                                      ? 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-400' 
                                      : !accessible 
                                      ? 'bg-slate-100 border-slate-200 text-slate-400 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-500' 
                                      : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800 shadow-sm'
                                  }`}>
                                    {!accessible ? (
                                      <Lock className="w-5 h-5" />
                                    ) : isCompleted ? (
                                      <CheckCircle2 className="w-5 h-5" />
                                    ) : (
                                      iconEl
                                    )}
                                  </div>

                                  <div className="space-y-1 min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${typeBadgeClass}`}>
                                        {typeBadgeText}
                                      </span>
                                      
                                      {/* Duration: only show if explicitly set and not dummy 45, or formatted nicely */}
                                      {item.itemType === 'video' ? (
                                        item.durationMinutes && item.durationMinutes > 0 && item.durationMinutes !== 45 ? (
                                          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {item.durationMinutes >= 60
                                              ? `${Math.floor(item.durationMinutes / 60)} ساعة${item.durationMinutes % 60 > 0 ? ` و ${item.durationMinutes % 60} د` : ''}`
                                              : `${item.durationMinutes} دقيقة`}
                                          </span>
                                        ) : null
                                      ) : (
                                        item.durationMinutes && item.durationMinutes > 0 ? (
                                          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {item.durationMinutes} دقيقة
                                          </span>
                                        ) : null
                                      )}

                                      {/* Total Marks for exams/homework - guarded against rendering stray 0 */}
                                      {(isHomework || isExam) && item.totalMarks && item.totalMarks > 0 ? (
                                        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">
                                          • الدرجة: {item.totalMarks}
                                        </span>
                                      ) : null}

                                      {isCompleted && (
                                        <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                                          تم الاجتياز بنجاح ✓
                                        </span>
                                      )}
                                    </div>

                                    <h4 className={`text-sm sm:text-base font-bold ${
                                      accessible ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'
                                    }`}>
                                      {item.title}
                                    </h4>

                                    {item.description && (
                                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                                        {item.description}
                                      </p>
                                    )}

                                    {!accessible && isEnrolled && (
                                      <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 pt-0.5">
                                        <Lock className="w-3 h-3 shrink-0" />
                                        <span>{accessResult.reason || 'مغلق: يلزم إكمال واجتياز الدرس السابق أولاً.'}</span>
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* Right: Action Buttons per Directive */}
                                <div className="flex items-center justify-end gap-2 shrink-0 self-end sm:self-center">
                                  {!accessible ? (
                                    <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 text-xs font-bold border border-slate-200 dark:border-slate-700">
                                      <Lock className="w-3.5 h-3.5" />
                                      <span>مغلق</span>
                                    </div>
                                  ) : isDocument ? (
                                    /* Direct Download Button only for documents & concept sheets */
                                    <button
                                      type="button"
                                      onClick={(e) => handleDownloadDocument(e, item, accessible)}
                                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs shadow-md shadow-teal-600/20 transition-all active:scale-95"
                                      title="تحميل الملف والمستند"
                                    >
                                      <Download className="w-4 h-4" />
                                      <span>تحميل</span>
                                    </button>
                                  ) : (isHomework || isExam) && isCompleted ? (
                                    /* Exam/Homework already passed: locked from retake as instructed */
                                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-black">
                                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                      <span>تم الاجتياز بنجاح</span>
                                    </div>
                                  ) : (
                                    /* Video, or open homework/exam: "بدء" button */
                                    <Link
                                      href={`/watch/${course.id}/${item.id}`}
                                      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-black text-xs shadow-md transition-all active:scale-95 ${
                                        isVideo 
                                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-600/20'
                                          : isHomework
                                          ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-amber-600/20'
                                          : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-indigo-600/20'
                                      }`}
                                    >
                                      <Play className="w-3.5 h-3.5 fill-current" />
                                      <span>
                                        بدء {isVideo ? (isCompleted ? 'إعادة المشاهدة' : 'المحاضرة') : isHomework ? 'الواجب' : 'الامتحان'}
                                      </span>
                                    </Link>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="p-8 text-center text-xs font-bold text-slate-400">
                            لا توجد دروس مضافة في هذه الوحدة حتى الآن.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
