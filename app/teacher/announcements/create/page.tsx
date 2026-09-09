'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  Megaphone,
  Trophy,
  ArrowRight,
  Pin,
  Image as ImageIcon,
  Sparkles,
  CheckCircle2,
  Plus,
  List,
  UploadCloud,
  X,
  GraduationCap,
  Star,
  Users
} from 'lucide-react';
import { createAnnouncement } from '@/lib/teacherService';
import RichTextEditor from '@/components/RichTextEditor';

export default function CreateAnnouncementPage() {
  const router = useRouter();

  // Step / Mode: 'select_type' -> 'form' -> 'success'
  const [announcementType, setAnnouncementType] = useState<'general' | 'top_student'>('general');
  const [selectedTypeYet, setSelectedTypeYet] = useState(false);

  // Form Fields
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentScore, setStudentScore] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [targetStage, setTargetStage] = useState<'all' | 'middle' | 'high'>('all');
  const [targetGrade, setTargetGrade] = useState<'all' | 1 | 2 | 3>('all');
  const [isPinned, setIsPinned] = useState(false);

  // States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [createdTitle, setCreatedTitle] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 5 ميجابايت');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalTitle =
      announcementType === 'top_student'
        ? title || `🌟 تكريم الطالب المتفوق: ${studentName}`
        : title;

    if (!finalTitle.trim() || !content.trim()) {
      alert('يرجى ملء جميع الحقول الإلزامية');
      return;
    }

    if (announcementType === 'top_student' && !studentName.trim()) {
      alert('يرجى كتابة اسم الطالب المتفوق');
      return;
    }

    setIsSubmitting(true);
    try {
      await createAnnouncement({
        title: finalTitle.trim(),
        content: content.trim(),
        imageUrl: imageUrl || undefined,
        targetStage: targetStage === 'all' ? null : targetStage,
        targetGrade: targetGrade === 'all' ? null : targetGrade,
        announcementType,
        studentName: announcementType === 'top_student' ? studentName.trim() : undefined,
        studentScore: announcementType === 'top_student' ? studentScore.trim() : undefined,
        isPinned,
      });

      setCreatedTitle(finalTitle);
      setIsDone(true);
    } catch (err) {
      console.error('Error creating announcement:', err);
      alert('حدث خطأ أثناء حفظ الإعلان، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForAnother = () => {
    setTitle('');
    setContent('');
    setStudentName('');
    setStudentScore('');
    setImageUrl('');
    setIsPinned(false);
    setIsDone(false);
    setSelectedTypeYet(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16 pt-2">
      {/* Top Breadcrumbs & Nav */}
      <div className="flex items-center justify-between">
        <Link
          href="/teacher/announcements"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة إلى إدارة الإعلانات</span>
        </Link>

        <span className="text-xs font-black px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          صفحة إنشاء إعلان رسمي
        </span>
      </div>

      {/* Success State Overlay View */}
      {isDone ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-slate-900 rounded-3xl p-8 md:p-12 border border-emerald-500/30 shadow-2xl text-center space-y-6 relative overflow-hidden"
        >
          <div className="w-20 h-20 mx-auto rounded-3xl bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <span className="inline-block px-3.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-black text-xs">
              تم النشر بنجاح ✨
            </span>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">
              تم نشر الإعلان بنجاح في الصفحة الرئيسية!
            </h2>
            <p className="text-slate-600 dark:text-slate-400 font-medium max-w-lg mx-auto text-sm md:text-base">
              تم حفظ الإعلان بعنوان &quot;{createdTitle}&quot; وسيظهر للطلاب فوراً في شريط الإعلانات المتطور أعلى الكورسات.
            </p>
          </div>

          {/* Action Choice Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={handleResetForAnother}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 transition-all hover:scale-105"
            >
              <Plus className="w-4 h-4" />
              <span>إنشاء إعلان جديد آخر</span>
            </button>

            <button
              onClick={() => router.push('/teacher/announcements')}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-black text-sm flex items-center justify-center gap-2 transition-all"
            >
              <List className="w-4 h-4" />
              <span>العودة لقائمة الإعلانات</span>
            </button>

            <Link
              href="/#announcements"
              className="w-full sm:w-auto px-5 py-3.5 rounded-2xl border border-slate-300 dark:border-slate-700 hover:border-amber-500 text-slate-700 dark:text-slate-300 font-bold text-sm flex items-center justify-center gap-2 transition-all"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>معاينة في الصفحة الرئيسية</span>
            </Link>
          </div>
        </motion.div>
      ) : (
        <div className="space-y-8">
          {/* Header Banner */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 dark:border-slate-800 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-72 h-72 bg-amber-500/10 dark:bg-amber-500/20 blur-3xl rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-black text-xs mb-2">
                  <Megaphone className="w-3.5 h-3.5" />
                  منشئ الإعلانات الرسمية
                </div>
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">
                  إنشاء ونشر إعلان جديد 📢
                </h1>
                <p className="text-slate-600 dark:text-slate-400 font-medium text-sm mt-1">
                  اختر نوع الإعلان (عام أو لوحة شرف للمتفوقين)، وحدد الجمهور المستهدف وميزة التثبيت في المقدمة.
                </p>
              </div>
            </div>
          </div>

          {/* Step 1: Type Selection Cards */}
          <div className="space-y-3">
            <label className="text-sm font-black text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <span>١. اختر نوع الإعلان</span>
              <span className="text-rose-500">*</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option 1: General Announcement */}
              <button
                type="button"
                onClick={() => {
                  setAnnouncementType('general');
                  setSelectedTypeYet(true);
                }}
                className={`p-5 rounded-3xl border-2 text-right transition-all flex flex-col justify-between relative overflow-hidden group ${
                  announcementType === 'general'
                    ? 'border-amber-500 bg-amber-500/10 dark:bg-amber-500/15 shadow-md shadow-amber-500/10'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between w-full mb-3">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                      announcementType === 'general'
                        ? 'bg-amber-500 text-slate-950 shadow-md'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <Megaphone className="w-6 h-6" />
                  </div>
                  {announcementType === 'general' && (
                    <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-xs font-black">
                      ✓
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1">
                    إعلان عام وتنبيهات دراسية 📣
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                    مواعيد المحاضرات، فتح باب الحجز، توجيهات المنهج الجديد، إجازات أو تنبيهات هامة للطلاب.
                  </p>
                </div>
              </button>

              {/* Option 2: Top Student / Honors */}
              <button
                type="button"
                onClick={() => {
                  setAnnouncementType('top_student');
                  setSelectedTypeYet(true);
                }}
                className={`p-5 rounded-3xl border-2 text-right transition-all flex flex-col justify-between relative overflow-hidden group ${
                  announcementType === 'top_student'
                    ? 'border-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/15 shadow-md shadow-emerald-500/10'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between w-full mb-3">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                      announcementType === 'top_student'
                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <Trophy className="w-6 h-6" />
                  </div>
                  {announcementType === 'top_student' && (
                    <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-black">
                      ✓
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1">
                    لوحة شرف وتكريم أوائل الطلبة 🏆
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                    تكريم الطالب المتفوق، كتابة اسمه ودرجته النهائية وكلمة تشجيعية مع إمكانية رفع صورته الشخصية.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Form Content */}
          <form
            onSubmit={handleSubmit}
            className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6"
          >
            {/* Top Students Dedicated Fields */}
            {announcementType === 'top_student' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-500/30 space-y-4"
              >
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-black text-sm">
                  <Trophy className="w-4 h-4" />
                  <span>بيانات الطالب المتفوق المكرم:</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                      اسم الطالب رباعي <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="مثال: مريم أحمد عبد الرحمن"
                      className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                      الدرجة أو التقدير <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={studentScore}
                      onChange={(e) => setStudentScore(e.target.value)}
                      placeholder="مثال: 100 / 100 الدرجة النهائية 🏆"
                      className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-sm"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Announcement Title */}
            <div>
              <label className="block text-sm font-black text-slate-800 dark:text-slate-200 mb-2">
                عنوان الإعلان <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  announcementType === 'top_student'
                    ? 'مثال: 🌟 لوحة الشرف: الطالبة الأولى على دفعة الثانوية العامة 🌟'
                    : 'مثال: 📢 بدء حجز المراجعة النهائية لمستر محمد رضوان'
                }
                className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold text-slate-900 dark:text-white text-sm md:text-base"
              />
            </div>

            {/* Announcement Content / Message */}
            <div>
              <label className="block text-sm font-black text-slate-800 dark:text-slate-200 mb-2">
                {announcementType === 'top_student'
                  ? 'كلمة التكريم والتهنئة للطالب'
                  : 'تفاصيل ومحتوى الإعلان'}{' '}
                <span className="text-rose-500">*</span>
              </label>
              <RichTextEditor
                value={content}
                onChange={setContent}
                placeholder={
                  announcementType === 'top_student'
                    ? 'نبارك لطلبتنا المتفوقة على تحقيق الدرجة الكاملة في اختبارات تحديد المستوى مع مستر محمد رضوان، ونتمنى لها دوام التفوق والريادة!'
                    : 'اكتب تفاصيل الإعلان هنا بالتفصيل واستخدم شريط التنسيق (عريض، مائل، خط تحتي، ألوان، ملصقات)...'
                }
                minHeight="150px"
                showStickers={true}
                showAnimations={true}
              />
            </div>

            {/* Target Audience (Stage & Grade) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                  المرحلة المستهدفة
                </label>
                <select
                  value={targetStage}
                  onChange={(e) => setTargetStage(e.target.value as any)}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold text-sm"
                >
                  <option value="all">جميع المراحل (إعدادي + ثانوي)</option>
                  <option value="high">المرحلة الثانوية</option>
                  <option value="middle">المرحلة الإعدادية</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                  الصف الدراسي المستهدف
                </label>
                <select
                  value={targetGrade}
                  onChange={(e) =>
                    setTargetGrade(e.target.value === 'all' ? 'all' : (Number(e.target.value) as 1 | 2 | 3))
                  }
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold text-sm"
                >
                  <option value="all">جميع الصفوف (الأول والثاني والثالث)</option>
                  <option value="1">الصف الأول</option>
                  <option value="2">الصف الثاني</option>
                  <option value="3">الصف الثالث</option>
                </select>
              </div>
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2">
                {announcementType === 'top_student' ? 'صورة الطالب المتفوق (اختياري)' : 'صورة الإعلان (اختياري)'}
              </label>

              {imageUrl ? (
                <div className="relative w-full max-w-sm rounded-2xl overflow-hidden border-2 border-amber-500/40 group">
                  <img
                    src={imageUrl}
                    alt="معاينة الصورة"
                    className="w-full h-48 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="absolute top-2 left-2 w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg hover:bg-rose-700 transition-colors"
                    title="حذف الصورة"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-amber-500 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-800/30">
                  <UploadCloud className="w-8 h-8 text-amber-500 mb-2" />
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    اضغط لرفع صورة من الجهاز
                  </span>
                  <span className="text-xs text-slate-400 mt-1 font-medium">PNG, JPG, WEBP بحد أقصى 5MB</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Pin Announcement Option (تثبيت الإعلان في المقدمة) */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-sm">
                  <Pin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">
                    تثبيت الإعلان في أول القائمة 📌
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                    سيظهر هذا الإعلان كأول إعلان يراه الطالب عند دخول المنصة في شريط الإعلانات.
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-12 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-amber-500"></div>
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-4 flex items-center justify-end gap-3">
              <Link
                href="/teacher/announcements"
                className="px-6 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                إلغاء
              </Link>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm flex items-center gap-2 shadow-lg shadow-amber-500/25 transition-all hover:scale-105 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>جاري النشر...</span>
                  </>
                ) : (
                  <>
                    <Megaphone className="w-4 h-4" />
                    <span>نشر الإعلان الآن</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
