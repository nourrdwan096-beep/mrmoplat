'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import {
  Trophy,
  Megaphone,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Calendar,
  GraduationCap,
  Star,
  Pin,
  BookOpen,
  Award,
  CheckCircle2,
  Bookmark
} from 'lucide-react';
import { fetchAnnouncements, AnnouncementData } from '@/lib/teacherService';
import RichContentViewer from '@/components/RichContentViewer';

export default function HomeAnnouncementsSection() {
  const [announcements, setAnnouncements] = useState<AnnouncementData[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [direction, setDirection] = useState(0);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const data = await fetchAnnouncements();
        if (mounted) {
          // Sort pinned first, then by date descending
          const sorted = [...data]
            .filter((a) => a.isPublished !== false)
            .sort((a, b) => {
              if (a.isPinned && !b.isPinned) return -1;
              if (!a.isPinned && b.isPinned) return 1;
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });
          setAnnouncements(sorted);
        }
      } catch (err) {
        console.error('Failed to load announcements:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  // If loading or no announcements, remove section entirely as requested:
  // "ولو مفيش فالمكان ده بيتشال تلقائي"
  if (loading || announcements.length === 0) {
    return null;
  }

  const total = announcements.length;
  const current = announcements[page] || announcements[0];
  const isTopStudent = current.announcementType === 'top_student';

  const paginate = (newDirection: number) => {
    setDirection(newDirection);
    setPage((prev) => (prev + newDirection + total) % total);
  };

  // 3D E-book page flip variants
  const bookVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 120 : -120,
      opacity: 0,
      rotateY: dir > 0 ? 18 : -18,
      scale: 0.96,
    }),
    center: {
      x: 0,
      opacity: 1,
      rotateY: 0,
      scale: 1,
      transition: {
        x: { type: 'spring' as const, stiffness: 350, damping: 30 },
        opacity: { duration: 0.25 },
        rotateY: { duration: 0.35 },
      },
    },
    exit: (dir: number) => ({
      x: dir < 0 ? 120 : -120,
      opacity: 0,
      rotateY: dir < 0 ? 18 : -18,
      scale: 0.96,
      transition: { duration: 0.2 },
    }),
  };

  return (
    <section
      id="announcements"
      className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 transition-colors duration-300"
      dir="rtl"
    >
      <div className="relative">
        {/* Subtle Ambient Glow */}
        <div className="absolute -top-6 right-1/4 w-80 h-80 bg-amber-500/10 dark:bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-6 left-1/4 w-80 h-80 bg-emerald-500/10 dark:bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Outer Electronic Book / Magazine Container */}
        <div
          className={`relative rounded-3xl border shadow-xl overflow-hidden backdrop-blur-sm transition-all duration-300 ${
            isTopStudent
              ? 'bg-gradient-to-br from-amber-500/[0.07] via-white to-emerald-500/[0.05] dark:from-amber-950/30 dark:via-slate-900 dark:to-emerald-950/30 border-amber-300/60 dark:border-amber-500/40 shadow-amber-500/5'
              : 'bg-gradient-to-br from-indigo-500/[0.05] via-white to-amber-500/[0.05] dark:from-indigo-950/30 dark:via-slate-900 dark:to-amber-950/30 border-slate-200 dark:border-slate-800 shadow-slate-900/5'
          }`}
          style={{ perspective: 1200 }}
        >
          {/* Top Decorative Book Header & Navigation Spine */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-200/70 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50">
            {/* Title & Tag */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-sm">
                <BookOpen className="w-4 h-4" />
              </div>

              {current.isPinned && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-amber-500 text-slate-950 shadow-sm">
                  <Pin className="w-3 h-3 fill-current" />
                  <span>مثبت في المقدمة</span>
                </span>
              )}

              {isTopStudent ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                  <Trophy className="w-3.5 h-3.5 text-emerald-500" />
                  <span>لوحة شرف الأوائل والمتميزين 🏆</span>
                  <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-400/30">
                  <Megaphone className="w-3.5 h-3.5 text-indigo-500" />
                  <span>إعلان وتنبيه رسمي 📢</span>
                </span>
              )}

              {current.targetStage && (
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  <GraduationCap className="w-3.5 h-3.5" />
                  {current.targetStage === 'high' ? 'الثانوية العامة' : 'المرحلة الإعدادية'}
                  {current.targetGrade ? ` - الصف ${current.targetGrade}` : ''}
                </span>
              )}
            </div>

            {/* Electronic Book Page Flipping Controls */}
            <div className="flex items-center gap-2">
              {total > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-xs">
                    صفحة {page + 1} من {total} 📖
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => paginate(1)}
                      aria-label="الصفحة السابقة"
                      title="الصفحة السابقة"
                      className="p-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all shadow-xs active:scale-95"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => paginate(-1)}
                      aria-label="الصفحة التالية"
                      title="الصفحة التالية"
                      className="p-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all shadow-xs active:scale-95"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Electronic Book Page Surface with Horizontal Drag / Swipe */}
          <div className="relative overflow-hidden cursor-grab active:cursor-grabbing">
            <AnimatePresence initial={false} custom={direction} mode="wait">
              <motion.div
                key={current.id}
                custom={direction}
                variants={bookVariants}
                initial="enter"
                animate="center"
                exit="exit"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.4}
                onDragEnd={(e, { offset, velocity }) => {
                  const swipe = offset.x;
                  if (swipe < -50 && total > 1) {
                    paginate(1);
                  } else if (swipe > 50 && total > 1) {
                    paginate(-1);
                  }
                }}
                className="p-6 md:p-8 select-none"
              >
                {isTopStudent ? (
                  /* ================= TOP STUDENT HONOR DISPLAY ================= */
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    {/* Left/Avatar Box */}
                    <div className="md:col-span-4 flex flex-col items-center text-center justify-center">
                      <div className="relative group">
                        <div className="absolute -inset-2 bg-gradient-to-r from-amber-400 to-emerald-400 rounded-3xl blur-md opacity-35 group-hover:opacity-60 transition duration-300" />
                        <div className="relative w-36 h-36 md:w-44 md:h-44 rounded-3xl overflow-hidden bg-white dark:bg-slate-800 border-4 border-amber-400 shadow-xl flex items-center justify-center">
                          {current.imageUrl ? (
                            <Image
                              src={current.imageUrl}
                              alt={current.studentName || 'صورة الطالب'}
                              fill
                              unoptimized
                              className="object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center text-amber-500 p-4">
                              <Trophy className="w-16 h-16 mb-2 text-amber-500 animate-bounce" />
                              <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                                طالب متميز 🌟
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Top Rank Badge */}
                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-950 font-black text-xs px-3.5 py-1 rounded-full shadow-lg border-2 border-white dark:border-slate-900 flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <span>المركز الأول 🥇</span>
                        </div>
                      </div>

                      <h3 className="mt-5 text-xl md:text-2xl font-black text-slate-900 dark:text-white">
                        {current.studentName || 'طالب متميز'}
                      </h3>

                      {current.studentScore && (
                        <div className="mt-2 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-black text-sm">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span>{current.studentScore}</span>
                        </div>
                      )}
                    </div>

                    {/* Right/Letter Box */}
                    <div className="md:col-span-8 flex flex-col justify-center space-y-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>
                          {new Date(current.createdAt).toLocaleDateString('ar-EG', {
                            dateStyle: 'full',
                          })}
                        </span>
                      </div>

                      <h4 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white leading-tight">
                        {current.title}
                      </h4>

                      <div className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-sm md:text-base leading-relaxed shadow-xs">
                        <RichContentViewer content={current.content} />
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-amber-500" />
                          <span>مع تحيات مستر محمد رضوان وإدارة المنصة</span>
                        </div>
                        {total > 1 && (
                          <span className="text-[11px] text-slate-400">
                            👈 اسحب للإعلان التالي / السابق 👉
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ================= GENERAL ANNOUNCEMENT DISPLAY ================= */
                  <div
                    className={`grid grid-cols-1 ${
                      current.imageUrl ? 'md:grid-cols-12 gap-6' : 'gap-4'
                    } items-center`}
                  >
                    {current.imageUrl && (
                      <div className="md:col-span-5 relative w-full h-56 sm:h-64 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 shadow-md">
                        <Image
                          src={current.imageUrl}
                          alt={current.title}
                          fill
                          unoptimized
                          className="object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}

                    <div className={`${current.imageUrl ? 'md:col-span-7' : 'w-full'} space-y-3`}>
                      <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>
                          {new Date(current.createdAt).toLocaleDateString('ar-EG', {
                            dateStyle: 'full',
                          })}
                        </span>
                      </div>

                      <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white leading-snug">
                        {current.title}
                      </h3>

                      <div className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-sm md:text-base leading-relaxed shadow-xs">
                        <RichContentViewer content={current.content} />
                      </div>

                      {total > 1 && (
                        <div className="text-left text-[11px] font-bold text-slate-400 pt-1">
                          👈 اسحب أو استخدم الأسهم للتقليب ككتاب إلكتروني 👉
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Book Page Indicator Dots / Tabs at Bottom */}
          {total > 1 && (
            <div className="flex items-center justify-center gap-1.5 pb-3.5 pt-1">
              {announcements.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setDirection(idx > page ? 1 : -1);
                    setPage(idx);
                  }}
                  aria-label={`الانتقال إلى الإعلان ${idx + 1}`}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    page === idx
                      ? 'w-7 bg-amber-500 shadow-sm'
                      : 'w-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
