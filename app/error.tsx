'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { RefreshCw, Home } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App runtime error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center font-sans" dir="rtl">
      <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center text-2xl mb-4">
        ⚠️
      </div>
      <h2 className="text-2xl font-black text-slate-100 mb-2">حدث خطأ غير متوقع</h2>
      <p className="text-sm font-medium text-slate-400 max-w-md mb-6 leading-relaxed">
        حدث خطأ أثناء تحميل هذه الصفحة. يرجى المحاولة مرة أخرى أو العودة إلى الصفحة الرئيسية.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-sm transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>إعادة المحاولة</span>
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-bold text-sm transition-all"
        >
          <Home className="w-4 h-4" />
          <span>الرئيسية</span>
        </Link>
      </div>
      <div className="mt-12 text-xs text-slate-500 font-mono">
        Built With Developer & Designer NOUR M. EL-SAIED 💚 💚
      </div>
    </div>
  );
}
