'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  BookOpen, 
  ShoppingCart, 
  CheckCircle2, 
  ArrowLeft,
  Presentation,
  ShieldCheck
} from 'lucide-react';
import { Course } from '@/lib/types';
import { CourseData } from '@/lib/academicService';

import { useResolvedImageUrl } from '@/hooks/useResolvedImageUrl';

/**
 * Automatically calculates the Egyptian academic batch year.

 * In Egypt, the academic year runs from September to July.
 * As requested, from July (month index 6) to December (month index 11),
 * the batch year is calculated as (currentYear + 1).
 * From January (month index 0) to June (month index 5), the batch year is currentYear.
 * E.g., in July/Aug/Sept 2026 -> 'دفعة 2027'
 * In March 2027 -> 'دفعة 2027'
 * In July 2027 -> 'دفعة 2028'
 */
export function getAcademicBatchYear(date: Date = new Date()): string {
  try {
    const currentYear = date.getFullYear();
    const currentMonth = date.getMonth(); // 0 = Jan, 6 = Jul
    const batchYear = currentMonth >= 6 ? currentYear + 1 : currentYear;
    return `دفعة ${batchYear}`;
  } catch {
    return 'دفعة 2027';
  }
}

import { Eye, Copy, Trash2 } from 'lucide-react';

interface CourseCardProps {
  course: CourseData | Course;
  isEnrolled?: boolean;
  onSelectCourse?: (course: Course, initialTab?: 'curriculum' | 'enroll') => void;
  batchYear?: string;
  actionType?: 'explore' | 'student_enrolled' | 'student_dashboard' | 'teacher_dashboard';
  onDuplicate?: () => void;
  onDelete?: () => void;
}

export default function CourseCard({
  course,
  isEnrolled = false,
  onSelectCourse,
  batchYear,
  actionType = 'explore',
  onDuplicate,
  onDelete
}: CourseCardProps) {
  // Safe field mappings
  const id = course.id;
  const title = course.title || 'كورس اللغة الإنجليزية';
  const description = course.description || '';
  const stage = course.stage || 'high';
  const grade = course.grade || 1;
  const educationType = course.educationType || 'general';
  const isFree = Boolean(course.isFree);
  const price = typeof course.price === 'number' ? course.price : Number(course.price || 0);
  const originalPrice = typeof course.originalPrice === 'number' ? course.originalPrice : Number(course.originalPrice || 0);
  const hasDiscount = Boolean(course.hasDiscount && originalPrice > price);
  const coverImage = course.coverImage || 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=800&auto=format&fit=crop&q=80';

  // Dynamic automatic batch year calculation
  const calculatedBatch = batchYear || getAcademicBatchYear();
  
  // Resolve idb:// urls to viewable Blob URLs
  const resolvedCoverImage = useResolvedImageUrl(coverImage);
  const [imgError, setImgError] = useState(false);

  const fallbackUrl = 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=800&auto=format&fit=crop&q=80';
  const displayCover = (imgError || !resolvedCoverImage || resolvedCoverImage.startsWith('idb://'))
    ? fallbackUrl
    : resolvedCoverImage;

  // Normalized course object for callbacks
  const mappedCourse: Course = {
    id,
    title,
    slug: course.slug || id,
    description,
    stage,
    grade,
    educationType,
    price,
    originalPrice,
    hasDiscount,
    isFree,
    coverImage,
    unitsCount: 0,
    videosCount: 0,
    examsCount: 0,
    homeworksCount: 0,
    publishDate: course.publishDate || '2026',
    tags: [stage === 'high' ? 'ثانوي' : 'إعدادي', `الصف ${grade}`],
  };

  // Helper labels
  const stageLabel = stage === 'high' ? 'ثانوي' : 'إعدادي';
  const gradeLabel = grade === 1 ? 'الصف الأول' : grade === 2 ? 'الصف الثاني' : 'الصف الثالث';
  
        const educationTypeLabel = 
    educationType === 'azhar' ? 'أزهر شريف' : 
    educationType === 'general' ? 'تعليم عام' : 
    educationType === 'arabic' ? 'عربي' : 'لغات';

  // Dynamic colors based on education type
  const isAzhar = educationType === 'azhar';
  const isGeneral = educationType === 'general';
  
  const eduColorClass = isAzhar 
    ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200/60 dark:border-emerald-500/20 shadow-emerald-500/10'
    : isGeneral
    ? 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/10 border-rose-200/60 dark:border-rose-500/20 shadow-rose-500/10'
    : 'text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200/60 dark:border-indigo-500/20 shadow-indigo-500/10';

  return (
    <div
      id={`course-card-${id}`}
      className="group relative flex flex-col rounded-[2.2rem] backdrop-blur-2xl bg-white/85 dark:bg-slate-900/85 p-3 sm:p-3.5 border border-slate-200/90 dark:border-slate-800/90 hover:border-emerald-500/50 dark:hover:border-emerald-500/40 shadow-xl shadow-slate-900/5 dark:shadow-emerald-950/20 hover:shadow-2xl hover:shadow-emerald-500/15 transition-all duration-300 hover:-translate-y-1.5 w-full overflow-hidden"
    >
      {/* Specular Background Glow Accent */}
      <div className="absolute -top-16 -left-16 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
      <div className="absolute -bottom-16 -right-16 w-40 h-40 bg-teal-500/10 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />

      {/* =========================================================================
          LAYER 0: TOP IMAGE CONTAINER - UNCROPPED (100% VISIBLE)
          ========================================================================= */}
      <div className="relative w-full aspect-[16/9] rounded-[1.7rem] overflow-hidden bg-slate-200/50 dark:bg-slate-950/50 shrink-0 shadow-inner flex items-center justify-center">
        {/* 1. Blurred background to fill empty space if image is not 16:9 */}
        <Image
          src={displayCover}
          alt="blur background"
          fill
          className="object-cover opacity-40 dark:opacity-30 blur-2xl scale-110 pointer-events-none"
          unoptimized={Boolean(displayCover?.startsWith('data:') || displayCover?.startsWith('blob:'))}
        />
        
        {/* 2. The Actual Image - Using object-contain so NOTHING is cut off */}
        <Image
          src={displayCover}
          alt={title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-contain z-10 group-hover:scale-105 transition-transform duration-700 ease-out p-1"
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          unoptimized={Boolean(displayCover?.startsWith('data:') || displayCover?.startsWith('blob:'))}
        />
        
        {/* Soft bottom vignette to blend with the overlapping card */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/20 to-transparent pointer-events-none z-10" />
      </div>

      {/* =========================================================================
          LAYER 1: THE 2030 GLASSMORPHIC INFORMATION CONTAINER (OVERLAPPING)
          ========================================================================= */}
      <div className="relative -mt-5 mx-1 mb-1 p-4 sm:p-5 rounded-[1.6rem] backdrop-blur-xl bg-white/95 dark:bg-slate-900/95 border border-white/80 dark:border-slate-800/80 shadow-md flex flex-col flex-1 z-20">
        
        {/* 1. Header Meta Bar: Teacher Icon Badge & Dynamic Batch */}
        <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-1.5 text-xs font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-200/60 dark:border-emerald-500/20 shadow-xs truncate">
            <Presentation className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="truncate">المعلم / مستر محمد رضوان</span>
          </div>

          <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-black tracking-wide border border-slate-200/50 dark:border-slate-700/50 shrink-0 whitespace-nowrap shadow-xs">
            {calculatedBatch}
          </span>
        </div>

        {/* 2. Course Name (Large, crisp, high-contrast) */}
        <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors leading-snug line-clamp-1 mb-2">
          {title}
        </h3>

        {/* 3. Course Description */}
        {description ? (
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed mb-4 font-medium">
            {description}
          </p>
        ) : (
          <p className="text-xs text-slate-400 dark:text-slate-500 italic mb-4">
            شرح تفصيلي للمنهج مع تدريبات أسبوعية وامتحانات دورية ومراجعات شاملة.
          </p>
        )}

        {/* 4. Structured Classification Box: [الصف] and [نوع التعليم] */}
        <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800/80 mb-4 backdrop-blur-md">
          
          {/* Item 1: Grade & Stage */}
          <div className="flex flex-col gap-1 min-w-0">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">الصف :</span>
            <span className="text-xs font-black text-slate-900 dark:text-slate-100 truncate bg-white dark:bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-200/70 dark:border-slate-800/80 shadow-2xs text-center">
              {gradeLabel} ({stageLabel})
            </span>
          </div>

          {/* Item 2: Education System (Dynamic Color) */}
          <div className="flex flex-col gap-1 min-w-0">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">نوع التعليم :</span>
            <span className={`text-xs font-black truncate px-2.5 py-1 rounded-xl shadow-2xs text-center ${eduColorClass}`}>
              {educationTypeLabel}
            </span>
          </div>

        </div>

        {/* 5. Footer: Price & Direct Actions */}
        <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
          
          {/* Price / Enrollment Status Display */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">
              {isEnrolled ? 'حالة الاشتراك :' : 'قيمة الاشتراك :'}
            </span>

            {isEnrolled ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-black border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>أنت مشترك بالفعل</span>
              </span>
            ) : isFree ? (
              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-200 dark:border-emerald-500/20">
                مجاني 100%
              </span>
            ) : (
              <div className="flex items-baseline gap-2">
                {hasDiscount && (
                  <span className="text-xs font-bold text-slate-400 line-through">
                    {originalPrice} ج.م
                  </span>
                )}
                <span className="text-xl font-black text-slate-900 dark:text-white leading-none">
                  {price} <span className="text-xs font-bold text-slate-500">ج.م</span>
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons depending on view context */}
          {isEnrolled ? (
            <Link
              href={`/student/courses/${id}`}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-black rounded-2xl shadow-lg shadow-emerald-600/30 hover:shadow-emerald-600/50 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
            >
              <span>متابعة التعلم</span>
              <ArrowLeft className="w-4 h-4" />
            </Link>
          ) : actionType === 'student_dashboard' ? (
            <Link
              href={`/student/courses/${id}`}
              className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-white text-xs sm:text-sm font-black rounded-2xl shadow-lg shadow-slate-900/20 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
            >
              <span>تفاصيل الكورس والاشتراك</span>
              <ArrowLeft className="w-4 h-4" />
            </Link>
          ) : actionType === 'teacher_dashboard' ? (
            <div className="flex items-center gap-2 w-full">
              <Link 
                href={`/teacher/courses/${id}`}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-100 dark:shadow-none"
              >
                <Eye className="w-4 h-4" />
                إدارة الكورس
              </Link>
              
              {/* Duplicate button */}
              {onDuplicate && (
                <button 
                  onClick={onDuplicate}
                  title="نسخ الكورس لصف أو نظام آخر"
                  className="p-3 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:text-emerald-600 text-slate-600 dark:text-slate-400 rounded-xl transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
              )}

              {/* Delete button */}
              {onDelete && (
                <button 
                  onClick={onDelete}
                  title="حذف الكورس"
                  className="p-3 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 text-slate-600 dark:text-slate-400 rounded-xl transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {/* Direct Buy / Enroll Button */}
              <Link
                href={`/courses/${id}#enroll-section`}
                className="py-2.5 px-3 text-xs sm:text-sm font-black rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 hover:shadow-emerald-600/50 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-1.5 text-center"
              >
                <ShoppingCart className="w-4 h-4 shrink-0" />
                <span className="truncate">{isFree ? 'التحاق مجاني' : 'شراء الكورس'}</span>
              </Link>

              {/* Dedicated Course Details Page Button */}
              <Link
                href={`/courses/${id}`}
                className="py-2.5 px-3 text-xs sm:text-sm font-black rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700 text-center"
              >
                <BookOpen className="w-4 h-4 shrink-0 text-emerald-500" />
                <span className="truncate">تفاصيل الكورس</span>
              </Link>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
