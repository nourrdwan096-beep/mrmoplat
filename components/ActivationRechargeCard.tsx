'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { 
  Copy, 
  Check, 
  Printer, 
  Trash2, 
  Share2, 
  ShieldCheck, 
  User, 
  Building2, 
  Sparkles,
  Smartphone,
  QrCode
} from 'lucide-react';
import { ActivationCodeData, CourseData } from '@/lib/academicService';

interface ActivationRechargeCardProps {
  code: ActivationCodeData;
  course?: CourseData | null;
  onDelete?: (codeId: string) => void;
  onCopy?: (codeStr: string) => void;
  compact?: boolean;
}

export default function ActivationRechargeCard({
  code,
  course,
  onDelete,
  onCopy,
  compact = false,
}: ActivationRechargeCardProps) {
  const [copied, setCopied] = useState(false);

  const courseTitle = code.courseTitle || course?.title || 'كورس اللغة الإنجليزية المتطور';
  const stageLabel = course?.stage === 'high' ? 'المرحلة الثانوية' : 'المرحلة الإعدادية';
  const gradeLabel = course?.grade === 1 ? 'الصف الأول' : course?.grade === 2 ? 'الصف الثاني' : 'الصف الثالث';
  const eduLabel = course?.educationType === 'azhar' ? 'أزهر شريف' : course?.educationType === 'general' ? 'تعليم عام' : 'عربي / لغات';

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code.code);
    setCopied(true);
    if (onCopy) onCopy(code.code);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const message = encodeURIComponent(
      `مرحباً بك في منصة مستر محمد رضوان التعليمية 🌟\n\n` +
      `🎓 كارت اشتراك وتفعيل الكورس:\n` +
      `📌 الكورس: ${courseTitle}\n` +
      (code.assignedStudentName ? `👤 الطالب المخصص له: ${code.assignedStudentName}\n` : '') +
      (code.centerOrGroup ? `🏢 السنتر / المجموعة: ${code.centerOrGroup}\n` : '') +
      `🔑 كود التفعيل: ${code.code}\n\n` +
      `📱 خطوات التفعيل:\n` +
      `1. سجل دخولك على المنصة.\n` +
      `2. افتح صفحة الكورس واختر (كود سنتر).\n` +
      `3. الصق الكود أعلاه واضغط (تفعيل الكود).\n` +
      `⚠️ ملاحظة أمنية: الكود يعمل بحد أقصى على جهازين فقط وفقاً لسياسة المنصة.`
    );
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const handlePrintSingle = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.print();
  };

  return (
    <div 
      className={`recharge-voucher-card relative overflow-hidden rounded-3xl transition-all duration-300 ${
        code.isUsed 
          ? 'bg-slate-100/90 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-800 opacity-85' 
          : 'bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 border border-emerald-500/30 dark:border-emerald-500/40 shadow-xl shadow-emerald-500/5 hover:border-emerald-500'
      } ${compact ? 'p-4' : 'p-5 sm:p-6'}`}
      dir="rtl"
    >
      {/* Scratch / Decorative Top Border Ribbon */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400" />

      {/* Watermark Security BG Symbol */}
      <div className="absolute -left-6 -bottom-6 w-32 h-32 opacity-5 pointer-events-none select-none">
        <ShieldCheck className="w-full h-full text-emerald-500" />
      </div>

      {/* Card Header: Platform Brand + Logo */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-800/80 pb-3.5 mb-4">
        <div className="flex items-center gap-3">
          <div className="relative w-11 h-11 rounded-2xl bg-white dark:bg-slate-800 p-1.5 shadow-md border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-center shrink-0">
            <Image
              src="/logo.png"
              alt="Logo"
              width={40}
              height={40}
              className="object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] sm:text-[11px] font-black tracking-wider text-emerald-600 dark:text-emerald-400 uppercase">
                MR. MOHAMED RADWAN
              </span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white leading-tight">
              منصة مستر محمد رضوان التعليمية
            </h3>
            <p className="text-[9px] sm:text-[10px] text-slate-500 font-bold">
              كارت شحن واشتراك رسمي معتمد • 2030 VIP
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="shrink-0">
          {code.isUsed ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-black">
              <span>تم التفعيل</span>
              <span>✓</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-black animate-pulse">
              <Sparkles className="w-3 h-3" />
              <span>جاهز للشحن</span>
            </span>
          )}
        </div>
      </div>

      {/* Course Title & Metadata */}
      <div className="space-y-1.5 mb-4">
        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
          <span className="px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300">
            {stageLabel}
          </span>
          <span className="px-2 py-0.5 rounded-lg bg-teal-100 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300">
            {gradeLabel}
          </span>
          <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {eduLabel}
          </span>
          {code.price && code.price > 0 && (
            <span className="px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 font-black">
              {code.price} ج.م
            </span>
          )}
        </div>

        <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 line-clamp-1">
          {courseTitle}
        </h4>
      </div>

      {/* Personalized Student & Center Badges */}
      {(code.assignedStudentName || code.centerOrGroup) && (
        <div className="mb-4 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800 space-y-1.5 text-xs">
          {code.assignedStudentName && (
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-black">
              <User className="w-3.5 h-3.5 shrink-0" />
              <span>كود مخصص للطالب:</span>
              <span className="text-slate-900 dark:text-white underline decoration-amber-500 font-black">
                {code.assignedStudentName}
              </span>
            </div>
          )}
          {code.centerOrGroup && (
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-bold text-[11px]">
              <Building2 className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>السنتر / المجموعة:</span>
              <span className="text-slate-800 dark:text-slate-200 font-bold">
                {code.centerOrGroup}
              </span>
            </div>
          )}
        </div>
      )}

      {/* The Voucher Code Box (Styled like a scratch recharge box) */}
      <div className="relative mb-4 group">
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-2 border-dashed border-emerald-500/50 text-center shadow-inner relative">
          <div className="text-[9px] font-bold text-slate-400 mb-1 flex items-center justify-center gap-1">
            <QrCode className="w-3 h-3 text-emerald-400" />
            <span>كود الشحن والتفعيل السري</span>
          </div>
          <div className="font-mono font-black text-lg sm:text-xl tracking-widest text-emerald-400 select-all py-1">
            {code.code}
          </div>
          {code.isUsed && code.usedByStudentName && (
            <div className="text-[10px] text-rose-400 font-bold mt-1">
              تم الاستخدام بواسطة: {code.usedByStudentName}
            </div>
          )}
        </div>
      </div>

      {/* Security & 2-Device Policy Notice */}
      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100/70 dark:bg-slate-900/40 p-2 rounded-xl mb-4">
        <Smartphone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span>حماية مشددة: مسموح بالتفعيل على (جهازين فقط) كحد أقصى.</span>
      </div>

      {/* Screen Interactive Actions (Hidden in Print Mode) */}
      <div className="no-print flex items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800/80">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition-all flex items-center gap-1 shadow-sm active:scale-95"
            title="نسخ الكود"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'تم النسخ' : 'نسخ'}</span>
          </button>

          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-300 hover:text-emerald-600 transition-all"
            title="مشاركة الكارت عبر واتساب"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handlePrintSingle}
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all"
            title="طباعة هذا الكارت"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>
        </div>

        {onDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(code.id);
            }}
            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all"
            title="حذف الكود"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Watermark Signature Footer */}
      <div className="mt-3 pt-2 text-center text-[9px] font-bold text-slate-400 dark:text-slate-500 border-t border-dashed border-slate-200 dark:border-slate-800/60">
        Built With Developer & Designer NOUR M. EL-SAIED 💚 💚
      </div>
    </div>
  );
}
