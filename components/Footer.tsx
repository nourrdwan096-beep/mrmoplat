'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { TEACHER_INFO } from '@/lib/mockData';
import {
  ShieldCheck,
  Heart,
  Youtube,
  Facebook,
  Instagram,
  PhoneCall,
  GraduationCap,
  Sparkles,
  Lock
} from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-400 pt-16 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 pb-12 border-b border-slate-800/80">
          
          {/* Col 1: Platform Info */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-white flex items-center justify-center p-1 shadow-md">
                <Image 
                  src="/logo.png" 
                  alt="منصة مستر محمد رضوان" 
                  width={56} 
                  height={56} 
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <h3 className="text-white font-black text-base">
                  MR. MOHAMED RADWAN
                </h3>
                <span className="text-[10px] text-violet-400 font-bold tracking-wider uppercase">
                  Easy English Platform
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              المنصة التعليمية المتطورة لتدريس وتأسيس اللغة الإنجليزية لطلاب المرحلة الإعدادية والثانوية للتعليم العام والأزهر الشريف.
            </p>

            <div className="pt-1">
              <Link
                href="/policies"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-violet-950/60 border border-violet-800/80 hover:bg-violet-900 text-violet-300 text-xs font-bold transition-all group cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-violet-400 group-hover:scale-110 transition-transform" />
                <span>ميثاق وسياسات المنصة</span>
                <span className="text-[10px] bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded font-black border border-amber-400/30">معتمدة</span>
              </Link>
            </div>
          </div>

          {/* Col 2: Academic Stages */}
          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-violet-500" />
              <span>المراحل الدراسية</span>
            </h4>
            <ul className="space-y-2 text-xs font-semibold">
              <li className="hover:text-violet-400 transition-colors">
                • المرحلة الإعدادية (الصف ١ - ٢ - ٣)
              </li>
              <li className="hover:text-violet-400 transition-colors">
                • المرحلة الثانوية العامة (الصف ١ - ٢ - ٣)
              </li>
              <li className="hover:text-violet-400 transition-colors">
                • المرحلة الثانوية الأزهرية (علمي وأدبي)
              </li>
              <li className="hover:text-violet-400 transition-colors">
                • ورش التأسيس والمهارات التراكمية
              </li>
            </ul>
          </div>

          {/* Col 3: Quick Contact */}
          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <PhoneCall className="w-4 h-4 text-amber-500" />
              <span>أرقام التواصل الرسمية</span>
            </h4>
            <div className="flex flex-col gap-2 text-xs font-bold">
              <a
                href={`https://wa.me/2${TEACHER_INFO.phones.whatsappMaster}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-300 hover:text-violet-400 transition-colors flex items-center gap-2"
              >
                <PhoneCall className="w-3.5 h-3.5 text-violet-500" />
                <span>واتساب المستر: {TEACHER_INFO.phones.whatsappMaster}</span>
              </a>
              <a
                href={`https://wa.me/2${TEACHER_INFO.phones.whatsappMaster2}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-300 hover:text-violet-400 transition-colors flex items-center gap-2"
              >
                <PhoneCall className="w-3.5 h-3.5 text-violet-500" />
                <span>الرقم البديل: {TEACHER_INFO.phones.whatsappMaster2}</span>
              </a>
            </div>
            
            {/* Social Icons */}
            <div className="flex items-center gap-2.5 pt-3">
              <a
                href={TEACHER_INFO.social.youtube}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-red-500/20 text-slate-300 hover:text-red-400 flex items-center justify-center transition-all border border-slate-800"
                title="يوتيوب"
              >
                <Youtube className="w-4 h-4" />
              </a>
              <a
                href={TEACHER_INFO.social.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-blue-500/20 text-slate-300 hover:text-blue-400 flex items-center justify-center transition-all border border-slate-800"
                title="فيس بوك"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a
                href={TEACHER_INFO.social.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-pink-500/20 text-slate-300 hover:text-pink-400 flex items-center justify-center transition-all border border-slate-800"
                title="انستجرام"
              >
                <Instagram className="w-4 h-4" />
              </a>
            </div>
          </div>

        </div>

        {/* Bottom Mandatory Signature as required strictly in the system instructions:
            توقيع المبرمج اسفل كل صفحة ف كل صفحات المنصة كلاتي:
            Built With Developer & designer NOUR M. EL-SAIED 💚 💚
        */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-right">
          
          <div className="text-xs text-slate-500 font-medium">
            جميع الحقوق محفوظة © {new Date().getFullYear()} - منصة مستر محمد رضوان التعليمية
          </div>

          <a 
            href="https://www.facebook.com/profile.php?id=61563998852885&locale=ar_AR"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 hover:bg-slate-800 transition-all duration-500 text-slate-300 text-xs sm:text-sm font-black tracking-wide shadow-xl overflow-hidden backdrop-blur-md"
          >
            {/* Animated Gradient Background on Hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 via-teal-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="relative z-10 flex items-center gap-2">
              <span className="text-emerald-400 group-hover:animate-pulse">{"<"}</span>
              <span className="group-hover:text-white transition-colors duration-300">
                Built With Developer & designer NOUR M. EL-SAIED 💚 💚
              </span>
              <span className="text-emerald-400 group-hover:animate-pulse">{"/>"}</span>
            </div>
          </a>

        </div>

      </div>
    </footer>
  );
}
