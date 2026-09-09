'use client';

import React from 'react';
import { TEACHER_INFO } from '@/lib/mockData';
import {
  Youtube,
  Facebook,
  Instagram,
  PhoneCall,
  MessageSquare,
  LifeBuoy,
  ShieldCheck,
  Send,
  ExternalLink,
  Clock,
  Headphones
} from 'lucide-react';

interface SocialAndContactSectionProps {
  onOpenSupportModal?: () => void;
}

export default function SocialAndContactSection({ onOpenSupportModal }: SocialAndContactSectionProps) {
  return (
    <section id="contact" className="py-20 bg-slate-100/60 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 mb-3">
            <Headphones className="w-3.5 h-3.5" />
            <span>قنوات التواصل الرسمية والمباشرة</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-4">
            تواصل مع مستر محمد رضوان وفريق العمل
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 font-medium">
            نحن معك خطوة بخطوة للإجابة عن أسئلتك الأكاديمية وحل أي صعوبات تقنية في أسرع وقت
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Part 1: Official Social Platforms (اليوتيوب، الفيس، انستجرام) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 mb-2">
              <span className="w-2 h-6 bg-violet-500 rounded-full" />
              <span>منصات ومواقع المستر الرسمية</span>
            </h3>

            {/* YouTube */}
            <a
              href={TEACHER_INFO.social.youtube}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-red-500/50 shadow-sm hover:shadow-lg transition-all group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Youtube className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-red-500 transition-colors">
                    قناة اليوتيوب الرسمية
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    @mohamedradwan.easy.english (محاضرات وفيديوهات تأسيس)
                  </p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-red-500 transition-colors" />
            </a>

            {/* Facebook */}
            <a
              href={TEACHER_INFO.social.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 shadow-sm hover:shadow-lg transition-all group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Facebook className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                    صفحة الفيس بوك الرسمية
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    متابعة يومية لأهم الأخبار ونماذج الامتحانات
                  </p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
            </a>

            {/* Instagram */}
            <a
              href={TEACHER_INFO.social.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-pink-500/50 shadow-sm hover:shadow-lg transition-all group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-pink-500/10 text-pink-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Instagram className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-pink-500 transition-colors">
                    حساب إنستجرام
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    learn.english.with.mr.radwan (كبسولات لغوية سريعة)
                  </p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-pink-500 transition-colors" />
            </a>

          </div>

          {/* Part 2: Direct Contact Methods strictly as specified: [١] واتساب المستر [٢] الدعم والشكاوى واتساب [٣] الدعم داخل المنصة */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 mb-2">
              <span className="w-2 h-6 bg-rose-500 rounded-full" />
              <span>طرق التواصل المباشرة والدعم الفني</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* [١] رقم المستر واتساب (الرقم الأساسي والثاني) */}
              <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
                      [١] تواصل مباشر مع المستر
                    </span>
                    <MessageSquare className="w-5 h-5 text-violet-500" />
                  </div>
                  <h4 className="text-base font-black text-slate-900 dark:text-white mb-1">
                    واتساب مستر محمد رضوان
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                    للاستفسارات الأكاديمية ومتابعة التسجيل
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <a
                    href={`https://wa.me/2${TEACHER_INFO.phones.whatsappMaster}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold text-center transition-all flex items-center justify-center gap-2 shadow-md"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>واتساب: {TEACHER_INFO.phones.whatsappMaster}</span>
                  </a>
                  <a
                    href={`https://wa.me/2${TEACHER_INFO.phones.whatsappMaster2}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold text-center transition-all flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>الرقم البديل: {TEACHER_INFO.phones.whatsappMaster2}</span>
                  </a>
                </div>
              </div>

              {/* [٢] الدعم والشكاوى واتساب + [٣] الدعم داخل المنصة */}
              <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                      [٢] & [٣] الدعم الفني والأكاديمي
                    </span>
                    <LifeBuoy className="w-5 h-5 text-rose-500" />
                  </div>
                  <h4 className="text-base font-black text-slate-900 dark:text-white mb-1">
                    الدعم والشكاوى داخل وخارج المنصة
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                    حل مشكلات تشغيل الفيديوهات وكلمات المرور والامتحانات
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <a
                    href={`https://wa.me/2${TEACHER_INFO.phones.support}?text=مرحباً،%20أحتاج%20مساعدة%20في%20منصة%20مستر%20محمد%20رضوان`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold text-center transition-all flex items-center justify-center gap-2 shadow-md"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>واتساب الشكاوى والدعم الفني</span>
                  </a>

                  <div className="py-2.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300 text-xs font-semibold text-center border border-slate-200 dark:border-slate-800 flex items-center justify-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-violet-500" />
                    <span>نظام التذاكر متاح في لوحة تحكم الطالب</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Time & Response Notice */}
            <div className="p-4 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center gap-3 text-xs text-violet-800 dark:text-violet-300 font-semibold">
              <Clock className="w-5 h-5 text-violet-500 shrink-0" />
              <span>
                أوقات العمل واستقبال الاستفسارات يومياً من ٩:٠٠ صباحاً حتى ١١:٠٠ مساءً بتوقيت القاهرة.
              </span>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
