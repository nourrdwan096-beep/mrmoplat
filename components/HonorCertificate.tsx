'use client';

import React, { useRef } from 'react';
import { Award, Sparkles, Printer, Download, Share2, CheckCircle2, ShieldCheck, Star } from 'lucide-react';

interface HonorCertificateProps {
  studentName: string;
  examTitle: string;
  courseTitle?: string;
  scorePercentage: number;
  dateStr?: string;
  certificateId?: string;
  onClose?: () => void;
}

export default function HonorCertificate({
  studentName,
  examTitle,
  courseTitle,
  scorePercentage,
  dateStr,
  certificateId,
  onClose
}: HonorCertificateProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const formattedDate = dateStr || new Date().toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const serialCode = certificateId || `MR-${Math.abs(examTitle.split('').reduce((a, b) => a + b.charCodeAt(0), 0) * 97 + scorePercentage * 31).toString().slice(0, 8)}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-4 rounded-2xl border border-amber-200 dark:border-amber-900/40 shadow-sm print:hidden">
        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-black text-sm">
          <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
          <span>شهادة تقدير وتفوق معتمدة من مستر محمد رضوان</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl font-black text-xs transition-all shadow-md shadow-amber-500/20 flex items-center gap-2 active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة وتنزيل الشهادة (PDF)</span>
          </button>
        </div>
      </div>

      {/* Royal 2030 Futuristic Certificate Canvas */}
      <div
        ref={printRef}
        id="honor-certificate-printable"
        className="relative overflow-hidden rounded-3xl p-8 sm:p-12 md:p-16 bg-gradient-to-br from-[#0c0f1d] via-[#141829] to-[#0c0f1d] text-white shadow-2xl border-4 border-amber-400/80 print:border-8 print:p-8 print:m-0 print:shadow-none print:w-full print:bg-white print:text-black"
        style={{
          boxShadow: '0 25px 50px -12px rgba(245, 158, 11, 0.25), 0 0 40px 0 rgba(217, 119, 6, 0.15)'
        }}
      >
        {/* Ornate Background Elements & Watermarks */}
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#fbbf24_1px,transparent_1px)] [background-size:16px_16px]" />
        
        {/* Corner Accents */}
        <div className="absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 border-amber-400/80 rounded-tr-2xl pointer-events-none" />
        <div className="absolute top-4 left-4 w-12 h-12 border-t-2 border-l-2 border-amber-400/80 rounded-tl-2xl pointer-events-none" />
        <div className="absolute bottom-4 right-4 w-12 h-12 border-b-2 border-r-2 border-amber-400/80 rounded-br-2xl pointer-events-none" />
        <div className="absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 border-amber-400/80 rounded-bl-2xl pointer-events-none" />

        {/* Outer Gold Border Framing */}
        <div className="relative border-2 border-amber-400/40 rounded-2xl p-6 sm:p-10 text-center space-y-6 sm:space-y-8 backdrop-blur-sm bg-black/20 print:border-amber-600">
          
          {/* Certificate Header */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-black tracking-wider uppercase mb-2">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>منصة مستر محمد رضوان التعليمية • شهادة تكريم وتفوق</span>
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            </div>

            <h2 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-100 print:text-amber-800">
              شـهـادة تـقـديـر وتـكـريـم
            </h2>
            <p className="text-xs sm:text-sm font-bold text-amber-200/80 tracking-widest">
              CERTIFICATE OF EXCELLENCE & HONORS
            </p>
          </div>

          {/* Teacher's Dedication Statement */}
          <div className="max-w-2xl mx-auto space-y-4 pt-2">
            <p className="text-sm sm:text-base md:text-lg font-medium text-slate-200 leading-relaxed print:text-slate-800">
              يَـسُـرّ ويَـشْـرُفُ <span className="font-black text-amber-300 print:text-amber-700 text-base sm:text-lg">مستر محمد رضوان</span> (خبير مادة اللغة الإنجليزية)
              أن يمنح هذه الشهادة التقديرية الرفيعة بكل فخر واعتزاز إلى الطالب المتميز:
            </p>

            {/* Student Name */}
            <div className="py-2 px-6 inline-block border-b-2 border-amber-400/70 min-w-[280px]">
              <span className="text-2xl sm:text-3xl md:text-4xl font-black text-white print:text-black tracking-wide">
                {studentName || 'الطالب المتفوق'}
              </span>
            </div>

            {/* Achievement Detail */}
            <p className="text-xs sm:text-sm md:text-base font-normal text-slate-300 leading-relaxed print:text-slate-700">
              وذلك لتفوقه الباهر وحصوله على درجة الامتياز بنسبة{' '}
              <span className="inline-block px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 font-black text-base md:text-lg border border-amber-400/40 print:text-amber-800 print:border-amber-600">
                {scorePercentage}%
              </span>{' '}
              في اختبار: <span className="font-bold text-white print:text-black">«{examTitle}»</span>
              {courseTitle && <span> بكورس <span className="text-amber-200 print:text-slate-900 font-bold">({courseTitle})</span></span>}
              ، متمنين له دوام الرفعة والريادة في مسيرته التعليمية.
            </p>
          </div>

          {/* Badges & Medals Row */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 pt-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-black">
              <Award className="w-5 h-5 text-amber-400" />
              <span>درجة الامتياز الفائق (Honors)</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-400/10 border border-emerald-400/30 text-emerald-300 text-xs font-black">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>موثقة إلكترونياً بالسيرفر</span>
            </div>
          </div>

          {/* Signatures & Footer Section */}
          <div className="grid grid-cols-1 sm:grid-cols-3 items-end gap-6 pt-8 border-t border-amber-400/30 text-xs font-bold text-slate-300 print:text-slate-800">
            {/* Date & Code */}
            <div className="text-right sm:text-right space-y-1">
              <span className="text-slate-400 block text-[11px]">تاريخ المنح:</span>
              <span className="text-amber-200 print:text-slate-900 font-black">{formattedDate}</span>
              <span className="text-[10px] text-slate-500 block font-mono">كود التوثيق: {serialCode}</span>
            </div>

            {/* Official Stamp Hologram */}
            <div className="flex flex-col items-center justify-center">
              <div className="w-20 h-20 rounded-full border-2 border-dashed border-amber-400/80 flex flex-col items-center justify-center p-2 text-center bg-amber-500/10 shadow-lg shadow-amber-500/20">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <span className="text-[9px] font-black text-amber-300 leading-tight">ختم التفوق الرسمي</span>
                <span className="text-[8px] text-slate-400">MR. RADWAN</span>
              </div>
            </div>

            {/* Teacher Signature */}
            <div className="text-left sm:text-left space-y-1">
              <span className="text-slate-400 block text-[11px]">اعتماد وخاتم المعلم:</span>
              <span className="text-base font-black text-amber-300 print:text-amber-700 block font-serif italic">
                Mr. Mohamed Radwan
              </span>
              <span className="text-[10px] text-slate-400 block">خبير مادة اللغة الإنجليزية</span>
            </div>
          </div>

          {/* Signature Mandate Footer */}
          <div className="pt-2 text-[10px] text-slate-500 print:text-slate-400">
            Built With Developer & Designer NOUR M. EL-SAIED 💚 💚
          </div>

        </div>
      </div>
    </div>
  );
}
