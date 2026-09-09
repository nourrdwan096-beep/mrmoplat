'use client';

import React from 'react';
import Link from 'next/link';
import { Home, ArrowRight, BookOpen } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center font-sans selection:bg-emerald-500 selection:text-white" dir="rtl">
      <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-4xl mb-6 shadow-2xl shadow-emerald-500/10 animate-bounce">
        404
      </div>
      <h1 className="text-3xl font-black text-slate-100 mb-2">الصفحة غير موجودة</h1>
      <p className="text-sm font-medium text-slate-400 max-w-md mb-8 leading-relaxed">
        عذراً، الرابط الذي تحاول الوصول إليه غير متاح أو تم نقله. يمكنك العودة إلى الصفحة الرئيسية ومتابعة دروسك بكل سهولة.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-sm transition-all duration-200 shadow-xl shadow-emerald-500/20"
        >
          <Home className="w-4 h-4" />
          <span>الصفحة الرئيسية</span>
        </Link>
        <Link
          href="/student"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-bold text-sm transition-all duration-200"
        >
          <BookOpen className="w-4 h-4" />
          <span>لوحة الطالب</span>
        </Link>
      </div>
      <div className="mt-16 text-xs text-slate-500 font-mono">
        Built With Developer & Designer NOUR M. EL-SAIED 💚 💚
      </div>
    </div>
  );
}
