'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { TEACHER_INFO } from '@/lib/mockData';
import {
  Paperclip,
  ShieldCheck,
  CheckCircle2,
  PhoneCall,
  Star,
  BookOpenCheck,
  GraduationCap
} from 'lucide-react';

interface HeroTeacherSectionProps {
  onOpenRegister: () => void;
}

export default function HeroTeacherSection({ onOpenRegister }: HeroTeacherSectionProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <section id="hero" className="relative overflow-hidden pt-8 pb-16 lg:py-20">
      {/* Background Decorative Gradients */}
      <div className="absolute top-1/4 -right-40 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 -left-40 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Right Column: Teacher Bio & Introduction */}
          <div className="lg:col-span-7 flex flex-col items-start text-right">
            
            {/* Top Badges */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black bg-violet-500/15 text-violet-700 dark:text-violet-300 border border-violet-500/30">
                <Paperclip className="w-3.5 h-3.5 text-violet-500" />
                المنصة الرسمية المعتمدة لعام 2026
              </span>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                خبرة تدريس تفوق ٢١ عاماً منذ ٢٠٠٥
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white leading-[1.3] mb-4">
              تعلم اللغة الإنجليزية بأعلى درجات التميز الأكاديمي مع{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-fuchsia-500 to-rose-400">
                {TEACHER_INFO.name}
              </span>
            </h1>

            {/* Bio Paragraph */}
            <p className="text-base sm:text-lg text-slate-700 dark:text-slate-300 leading-relaxed mb-6 font-medium">
              {TEACHER_INFO.bio}
            </p>

            {/* Teacher Key Pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full mb-8">
              {TEACHER_INFO.specialties.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 p-3 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 shadow-sm"
                >
                  <CheckCircle2 className="w-5 h-5 text-violet-500 shrink-0 mt-0.5" />
                  <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                    {item}
                  </span>
                </div>
              ))}
            </div>

            {/* CTAs & Direct WhatsApp Master Links */}
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <button
                onClick={onOpenRegister}
                id="hero-register-cta"
                className="w-full sm:w-auto px-7 py-3.5 text-base font-black text-white bg-gradient-to-r from-violet-600 via-fuchsia-600 to-violet-700 hover:from-violet-500 hover:to-fuchsia-500 rounded-2xl shadow-xl shadow-violet-600/30 hover:shadow-violet-600/45 transition-all flex items-center justify-center gap-2 group"
              >
                <GraduationCap className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                <span>انضم للمنصة وابدأ رحلتك</span>
              </button>
              
              <a
                href="#courses"
                id="hero-browse-courses-btn"
                className="w-full sm:w-auto px-6 py-3.5 text-sm font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-900/90 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 transition-all flex items-center justify-center gap-2"
              >
                <BookOpenCheck className="w-4 h-4 text-violet-500" />
                <span>استكشف الكورسات المتاحة</span>
              </a>

              <a
                href={`https://wa.me/2${TEACHER_INFO.phones.whatsappMaster}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-5 py-3.5 text-sm font-bold text-violet-600 dark:text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 rounded-2xl border border-violet-500/30 transition-all flex items-center justify-center gap-2"
              >
                <PhoneCall className="w-4 h-4" />
                <span>واتساب المستر ({TEACHER_INFO.phones.whatsappMaster})</span>
              </a>
            </div>

          </div>

          {/* Left Column: Teacher Image Card [مربع بداخله: صورة للمستر] */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-full max-w-md">
              
              {/* Outer Glowing Futuristic Ring */}
              <div className="absolute -inset-2 rounded-3xl bg-gradient-to-tr from-violet-500 via-fuchsia-400 to-rose-500 opacity-20 blur-xl" />

              {/* Master Card Box Container */}
              <div className="relative rounded-3xl overflow-hidden bg-slate-900 border-2 border-violet-500/30 shadow-2xl p-4 sm:p-5">
                
                {/* Photo Container: /public/master-image.png with star badge and fallback */}
                <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden bg-slate-950 flex flex-col p-4 group">
                  
                  {/* Master Photo as background or direct Image */}
                  {!imgError && (
                    <Image
                      src="/master-image.png"
                      alt="مستر محمد رضوان - معلم خبير اللغة الإنجليزية"
                      fill
                      className="object-cover object-top opacity-90 group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                      onError={() => setImgError(true)}
                    />
                  )}

                  {/* Top Security & Master Badges */}
                  <div className="relative w-full flex items-start justify-end z-10">
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 backdrop-blur-md">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      خبرة +21 عاماً
                    </span>
                  </div>

                </div>

              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
