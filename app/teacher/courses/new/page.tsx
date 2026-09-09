'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowRight, BookOpen, CheckCircle2, 
  Layers, Sparkles, Calendar
} from 'lucide-react';
import { saveCourse } from '@/lib/academicService';
import CoverImageSelector from '@/components/CoverImageSelector';
import PriceControlSelector from '@/components/PriceControlSelector';

export default function NewCoursePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [originalPrice, setOriginalPrice] = useState<number | undefined>(undefined);
  const [hasDiscount, setHasDiscount] = useState(false);
  const [isFree, setIsFree] = useState(false);
  
  // Classification
  const [stage, setStage] = useState<'middle' | 'high'>('high');
  const [grade, setGrade] = useState<1 | 2 | 3>(1);
  const [educationType, setEducationType] = useState<'general' | 'azhar' | 'arabic' | 'languages'>('general');
  
  // Progression & Access
  const [enforceUnitProgression, setEnforceUnitProgression] = useState(true);
  const [enforceItemProgression, setEnforceItemProgression] = useState(true);

  // Publishing
  const [isPublished, setIsPublished] = useState(true);
  const [publishDate, setPublishDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('يرجى إدخال اسم الكورس أولاً');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');

      const created = await saveCourse({
        title: title.trim(),
        description: description.trim(),
        coverImage: coverImage.trim() || undefined,
        price: isFree ? 0 : Number(price),
        originalPrice: isFree ? undefined : originalPrice,
        hasDiscount: isFree ? false : hasDiscount,
        isFree: isFree || Number(price) === 0,
        stage,
        grade,
        educationType,
        enforceUnitProgression,
        enforceItemProgression,
        isPublished,
        publishDate,
        expiryDate: expiryDate || undefined,
      });

      // Redirect immediately to course manager to add units & lessons
      router.push(`/teacher/courses/${created.id}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء حفظ الكورس');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/teacher/courses"
          className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-all shadow-sm"
        >
          <ArrowRight className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            إنشاء كورس دراسي جديد
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-bold text-sm">
            حدد بيانات وتصنيف الكورس، ارفع الغلاف أو اختر قالباً إنجليزياً جاهزاً، واضبط السعر بسلاسة.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-2xl text-rose-700 dark:text-rose-400 font-bold text-sm">
          {errorMsg}
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            البيانات الأساسية وغلاف الكورس
          </h2>

          <div className="space-y-5">
            <div>
              <label className="block text-slate-800 dark:text-slate-200 font-bold text-sm mb-2">
                اسم الكورس / المنهج <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="مثال: مراجعة ليلة الامتحان والوحدات 1-3 للثانوية العامة"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="block text-slate-800 dark:text-slate-200 font-bold text-sm mb-2">
                وصف الكورس ونقاط التميز
              </label>
              <textarea
                rows={3}
                placeholder="اكتب نبذة تشرح للطلاب ما سيتم تناوله في هذا الكورس وما سيتعلمونه..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl font-medium text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            {/* Cover Image Selector: Device Upload + Ready-made English Templates */}
            <div>
              <label className="block text-slate-800 dark:text-slate-200 font-bold text-sm mb-2">
                غلاف الكورس (رفع صورة من الجهاز أو اختيار قالب إنجليزي احترافي)
              </label>
              <CoverImageSelector
                value={coverImage}
                onChange={setCoverImage}
                defaultTitle={title}
              />
            </div>
          </div>
        </div>

        {/* Classification & Filtering Link Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-teal-600" />
              المرحلة والتصفية (تحديد الطلاب المستهدفين)
            </h2>
            <span className="text-xs font-bold px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-xl">
              تصفية ذكية في الصفحة الرئيسية ولوحة الطلاب
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* Stage */}
            <div>
              <label className="block text-slate-800 dark:text-slate-200 font-bold text-sm mb-2">
                المرحلة الدراسية <span className="text-rose-500">*</span>
              </label>
              <select
                value={stage}
                onChange={(e) => {
                  const s = e.target.value as 'middle' | 'high';
                  setStage(s);
                  if (s === 'middle') {
                    setEducationType('arabic');
                  } else {
                    setEducationType('general');
                  }
                }}
                className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="high">المرحلة الثانوية</option>
                <option value="middle">المرحلة الإعدادية</option>
              </select>
            </div>

            {/* Grade */}
            <div>
              <label className="block text-slate-800 dark:text-slate-200 font-bold text-sm mb-2">
                الصف الدراسي <span className="text-rose-500">*</span>
              </label>
              <select
                value={grade}
                onChange={(e) => setGrade(Number(e.target.value) as 1 | 2 | 3)}
                className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              >
                <option value={1}>الصف الأول</option>
                <option value={2}>الصف الثاني</option>
                <option value={3}>الصف الثالث</option>
              </select>
            </div>

            {/* Education Type */}
            <div>
              <label className="block text-slate-800 dark:text-slate-200 font-bold text-sm mb-2">
                نوع ونظام التعليم <span className="text-rose-500">*</span>
              </label>
              <select
                value={educationType}
                onChange={(e) => setEducationType(e.target.value as any)}
                className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              >
                {stage === 'high' ? (
                  <>
                    <option value="general">ثانوي عام</option>
                    <option value="azhar">ثانوي أزهر</option>
                  </>
                ) : (
                  <>
                    <option value="arabic">إعدادي عربي</option>
                    <option value="languages">إعدادي لغات</option>
                  </>
                )}
              </select>
            </div>
          </div>
        </div>

        {/* Pricing Card: Clean, Direct Price with Optional Reversible Discount */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
          <PriceControlSelector
            price={price}
            originalPrice={originalPrice}
            hasDiscount={hasDiscount}
            isFree={isFree}
            onPriceChange={setPrice}
            onOriginalPriceChange={setOriginalPrice}
            onHasDiscountChange={setHasDiscount}
            onIsFreeChange={setIsFree}
          />

          {/* Access & Progression Rules */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <h3 className="font-black text-slate-800 dark:text-slate-200 text-sm">قواعد فتح المحتوى والتدرج</h3>
            
            <div className="flex flex-col gap-3">
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative flex items-center justify-center mt-0.5">
                  <input
                    type="checkbox"
                    checked={enforceUnitProgression}
                    onChange={(e) => setEnforceUnitProgression(e.target.checked)}
                    className="w-5 h-5 appearance-none border-2 border-slate-300 dark:border-slate-600 rounded-lg checked:border-emerald-500 checked:bg-emerald-500 transition-colors cursor-pointer"
                  />
                  {enforceUnitProgression && <CheckCircle2 className="w-3.5 h-3.5 text-white absolute pointer-events-none" />}
                </div>
                <div>
                  <span className="block font-bold text-sm text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                    إجبار التدرج بين الوحدات (الوحدة التالية لا تفتح إلا باجتياز السابقة)
                  </span>
                  <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
                    يفضل تفعيلها لكورسات المراجعة، وإلغائها إذا كنت تسمح للطالب بالبدء من أي وحدة بحرية.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative flex items-center justify-center mt-0.5">
                  <input
                    type="checkbox"
                    checked={enforceItemProgression}
                    onChange={(e) => setEnforceItemProgression(e.target.checked)}
                    className="w-5 h-5 appearance-none border-2 border-slate-300 dark:border-slate-600 rounded-lg checked:border-emerald-500 checked:bg-emerald-500 transition-colors cursor-pointer"
                  />
                  {enforceItemProgression && <CheckCircle2 className="w-3.5 h-3.5 text-white absolute pointer-events-none" />}
                </div>
                <div>
                  <span className="block font-bold text-sm text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                    إجبار التدرج الداخلي للدروس (الفيديو/الامتحان التالي لا يفتح إلا باجتياز ما قبله)
                  </span>
                  <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
                    هذا هو الخيار الافتراضي لضمان التزام الطالب بحل الواجبات والامتحانات قبل الانتقال للدرس التالي.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Publication Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div>
              <label className="block text-slate-800 dark:text-slate-200 font-bold text-sm mb-2">
                تاريخ النشر
              </label>
              <input
                type="date"
                value={publishDate}
                onChange={(e) => setPublishDate(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-800 dark:text-slate-200 font-bold text-sm mb-2">
                تاريخ الانتهاء (اختياري)
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3">
            <input
              type="checkbox"
              id="isPublishedCheck"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="w-5 h-5 text-emerald-600 rounded-lg focus:ring-emerald-500"
            />
            <label htmlFor="isPublishedCheck" className="text-slate-800 dark:text-slate-200 font-bold text-sm cursor-pointer">
              نشر الكورس مباشرة للطلاب (يمكنك إلغاء التحديد لحفظه كـ مسودة مؤقتة)
            </label>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-4">
          <Link
            href="/teacher/courses"
            className="px-6 py-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-2xl transition-colors"
          >
            إلغاء وتراجع
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-3 px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg rounded-2xl shadow-xl shadow-emerald-200 dark:shadow-none transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="w-6 h-6" />
                حفظ الكورس والانتقال لإضافة الوحدات والدروس
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
