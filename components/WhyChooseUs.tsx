'use client';

import React from 'react';
import { BENEFITS_LIST } from '@/lib/mockData';
import {
  Sparkles,
  CheckSquare,
  FileText,
  PlayCircle,
  BookOpen,
  Headphones,
  ShieldCheck,
  Zap
} from 'lucide-react';

export default function WhyChooseUs() {
  const iconMap: Record<string, React.ReactNode> = {
    Sparkles: <Sparkles className="w-6 h-6 text-violet-500" />,
    CheckSquare: <CheckSquare className="w-6 h-6 text-sky-500" />,
    FileText: <FileText className="w-6 h-6 text-amber-500" />,
    PlayCircle: <PlayCircle className="w-6 h-6 text-purple-500" />,
    BookOpen: <BookOpen className="w-6 h-6 text-rose-500" />,
    Headphones: <Headphones className="w-6 h-6 text-fuchsia-500" />,
  };

  return (
    <section id="benefits" className="py-20 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 mb-3">
            <Zap className="w-3.5 h-3.5" />
            <span>لماذا منصة مستر محمد رضوان؟</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-4">
            إيه اللي هتستفيده معانا داخل المنصة؟
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 font-medium">
            نظام تعليمي متكامل 360 درجة صُمم ليضمن لك التفوق والدرجة النهائية بدون تشتت
          </p>
        </div>

        {/* 6 Value Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {BENEFITS_LIST.map((benefit) => (
            <div
              key={benefit.id}
              className="relative rounded-3xl p-6 bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/90 shadow-lg hover:shadow-2xl hover:border-violet-500/40 transition-all duration-300 group"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                  {iconMap[benefit.icon] || <Sparkles className="w-6 h-6 text-violet-500" />}
                </div>
                <span className="text-2xl font-black text-slate-200 dark:text-slate-800 group-hover:text-violet-500/30 transition-colors">
                  0{benefit.id}
                </span>
              </div>

              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2.5 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                {benefit.title}
              </h3>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                {benefit.description}
              </p>

              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5 text-xs font-bold text-violet-600 dark:text-violet-400">
                <ShieldCheck className="w-4 h-4" />
                <span>ميزة قياسية معتمدة</span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
