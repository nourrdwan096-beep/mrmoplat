'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import {
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  FileText,
  ArrowLeft
} from 'lucide-react';
import { PLATFORM_POLICIES_DATA } from '@/lib/policiesData';

export default function PlatformPoliciesSection() {
  const [activeTab, setActiveTab] = useState<number>(0);

  // Top 4 highlight policies for fast visual browsing
  const highlightPolicies = PLATFORM_POLICIES_DATA.slice(0, 4);

  return (
    <section id="policies" className="py-20 bg-slate-50/70 dark:bg-slate-950/60 border-t border-slate-200/80 dark:border-slate-800/80 transition-colors relative overflow-hidden" dir="rtl">
      {/* Subtle Background Glows */}
      <div className="absolute top-1/2 -right-40 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-100 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 text-xs font-black shadow-sm">
            <ShieldCheck className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            <span>ميثاق الأمان واللوائح الأكاديمية الصارمة</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            سياسات وضوابط المنصة التعليمية
          </h2>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 font-semibold leading-relaxed">
            تم إرساء هذه اللوائح الأكاديمية والتقنية لتوفير بيئة تعليمية فائقة الأمان والجودة تضمن حقوق الطالب والملكية الفكرية للمعلم.
          </p>
        </div>

        {/* 4 Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {highlightPolicies.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:border-violet-500/40 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-violet-100 dark:bg-violet-950/80 text-violet-600 dark:text-violet-400 flex items-center justify-center border border-violet-200 dark:border-violet-800/60 group-hover:scale-105 transition-transform">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {item.badge}
                    </span>
                  </div>

                  <h3 className="text-base font-black text-slate-900 dark:text-white mb-2 leading-snug">
                    {item.title}
                  </h3>

                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed mb-4">
                    {item.summary}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 text-xs font-black text-violet-600 dark:text-violet-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>بند ملزم ومؤمن برمجياً</span>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Master CTA Banner to Open Full Policy Charter */}
        <div className="bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-700 rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-10 text-white shadow-2xl relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 space-y-2 text-center lg:text-right max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-amber-400/20 text-amber-200 px-3 py-1 rounded-full text-xs font-black border border-amber-300/30">
              <Sparkles className="w-3.5 h-3.5" /> ميثاق السياسات الكامل (٨ بنود معتمدة)
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-white">
              اطّلع على الميثاق الأمني والأكاديمي الشامل
            </h3>
            <p className="text-xs sm:text-sm text-violet-100 font-medium leading-relaxed">
              تعرّف على كافة التفاصيل الخاصة بضوابط الأجهزة، الاشتراك في عدة كورسات، تأمين المحاضرات، ونظام التقييم والامتحانات لضمان تجربة تعليمية متميزة.
            </p>
          </div>

          <div className="relative z-10 flex items-center justify-center w-full lg:w-auto">
            <Link
              href="/policies"
              className="w-full sm:w-auto px-8 py-4 bg-white text-violet-700 hover:bg-violet-50 font-black rounded-2xl text-sm shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2.5"
            >
              <FileText className="w-5 h-5 text-violet-600" />
              <span>الاطلاع على الوثيقة الرسمية كاملة</span>
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </div>
        </div>

      </div>
    </section>
  );
}
