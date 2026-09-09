'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  ExternalLink, 
  CheckCircle2, 
  Maximize2, 
  Minimize2, 
  Printer, 
  Sparkles, 
  ShieldCheck, 
  Copy, 
  Check, 
  Bookmark, 
  FileSpreadsheet,
  Flame,
  FolderDown,
  Info
} from 'lucide-react';
import { detectLinkProvider } from '@/lib/storageService';
import { resolveVirtualUrl } from '@/lib/indexedDbStorage';

interface InteractiveDocumentViewerProps {
  url: string;
  title: string;
  description?: string;
  itemType: 'concept_sheet' | 'summary_pdf' | 'homework' | 'exam' | 'video';
  unitTitle?: string;
  studentName?: string;
  studentPhone?: string;
  isPassed?: boolean;
  onComplete?: () => void;
}

export default function InteractiveDocumentViewer({
  url,
  title,
  description,
  itemType,
  unitTitle,
  studentName = 'طالب منصة مستر محمد رضوان',
  studentPhone = '01xxxxxxxxx',
  isPassed = false,
  onComplete,
}: InteractiveDocumentViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isMarkingComplete, setIsMarkingComplete] = useState(false);
  const [idbResolvedUrl, setIdbResolvedUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (url && url.startsWith('idb://')) {
      resolveVirtualUrl(url).then(res => {
        if (isMounted) setIdbResolvedUrl(res);
      });
    }
    return () => {
      isMounted = false;
    };
  }, [url]);

  const activeUrl = url?.startsWith('idb://') ? (idbResolvedUrl || '') : url;
  const provider = detectLinkProvider(url);
  const isConcept = itemType === 'concept_sheet';
  const isPlatformHosted = provider === 'platform' || url.startsWith('data:') || url.startsWith('idb://') || url.includes('supabase.co') || activeUrl.startsWith('blob:');

  const handleCopyLink = () => {
    navigator.clipboard.writeText(activeUrl || url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMarkComplete = async () => {
    if (onComplete) {
      setIsMarkingComplete(true);
      await onComplete();
      setIsMarkingComplete(false);
    }
  };

  // Build embeddable link if Google Drive or Direct PDF
  let embedSrc = activeUrl || url;
  if (provider === 'drive') {
    if (url.includes('/view') || url.includes('/file/d/')) {
      embedSrc = url.replace('/view', '/preview').replace('usp=sharing', '');
    }
  }

  return (
    <div className={`space-y-6 ${isFullscreen ? 'fixed inset-0 z-50 bg-slate-950 p-4 md:p-8 flex flex-col justify-between overflow-y-auto' : ''}`}>
      {/* Top Header & Context Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-xl font-black text-xs ${
                isConcept 
                  ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                  : 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20'
              }`}>
                {isConcept ? 'ورقة مفاهيم علمية 📑' : 'ملزمة تلخيص ومذكرات 📚'}
              </span>
              {unitTitle && (
                <span className="text-xs font-bold text-slate-400">
                  {unitTitle}
                </span>
              )}
              {isPassed && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>تمت المذاكرة والاستيعاب</span>
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {title}
            </h1>
          </div>

          {/* Quick Status Pill */}
          <div className="flex items-center gap-2">
            {isPlatformHosted ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 text-purple-700 dark:text-purple-300 font-bold text-xs">
                <FileText className="w-3.5 h-3.5" />
                <span>قارئ مدمج داخل المنصة</span>
              </span>
            ) : provider === 'mediafire' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 text-blue-700 dark:text-blue-300 font-bold text-xs">
                <Flame className="w-3.5 h-3.5 text-orange-500" />
                <span>رابط تحميل MediaFire معتمد</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold text-xs">
                <FolderDown className="w-3.5 h-3.5" />
                <span>رابط تحميل خارجي معتمد</span>
              </span>
            )}
          </div>
        </div>

        {description && (
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {/* CASE 1: IN-PLATFORM PDF VIEWER (Supabase Hosted / In-App Reader) */}
      {isPlatformHosted ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-md space-y-4 relative overflow-hidden">
          
          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <a
                href={activeUrl || url}
                download={`${title}.pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-sm transition-all"
              >
                <Download className="w-4 h-4" />
                <span>تحميل الملف (PDF)</span>
              </a>

              <a
                href={activeUrl || url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-slate-600 dark:text-slate-300 hover:text-emerald-600 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-colors"
                title="فتح في نافذة مستقلة"
              >
                <ExternalLink className="w-4 h-4" />
              </a>

              <button
                onClick={() => window.print()}
                className="p-2 text-slate-600 dark:text-slate-300 hover:text-emerald-600 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-colors hidden sm:block"
                title="طباعة الملف"
              >
                <Printer className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="flex items-center gap-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-100 transition-all"
              >
                {isFullscreen ? (
                  <>
                    <Minimize2 className="w-3.5 h-3.5" />
                    <span>تصغير الشاشة</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>ملء الشاشة</span>
                  </>
                )}
              </button>

              {!isPassed && onComplete && (
                <button
                  onClick={handleMarkComplete}
                  disabled={isMarkingComplete}
                  className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-xl shadow-sm transition-all disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تمت المذاكرة والاستيعاب ✓</span>
                </button>
              )}
            </div>
          </div>

          {/* Embedded PDF Frame with Watermark */}
          <div className="relative w-full h-[650px] sm:h-[750px] bg-slate-100 dark:bg-slate-950 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
            {/* Dynamic Anti-Leak Security Watermark */}
            <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-around items-center opacity-[0.07] select-none text-slate-900 dark:text-white font-mono font-black text-sm rotate-[-25deg] overflow-hidden">
              <div>{studentName} • {studentPhone}</div>
              <div>MR. MOHAMED RADWAN PLATFORM • ID: {studentPhone}</div>
              <div>{studentName} • {studentPhone}</div>
              <div>MR. MOHAMED RADWAN PLATFORM • ID: {studentPhone}</div>
            </div>

            <iframe
              src={embedSrc ? `${embedSrc}#toolbar=1&navpanes=0` : ''}
              title={title}
              className="w-full h-full border-0 rounded-2xl"
            />
          </div>
        </div>
      ) : (
        /* CASE 2: EXTERNAL DOWNLOAD CARD (MediaFire / Google Drive) */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-md space-y-6 text-center">
          
          {/* Main Visual Badge */}
          <div className="relative mx-auto w-24 h-24 rounded-3xl bg-gradient-to-tr from-teal-500/20 via-emerald-500/10 to-sky-500/20 border border-teal-500/30 flex items-center justify-center shadow-lg">
            {provider === 'mediafire' ? (
              <Flame className="w-12 h-12 text-orange-500 animate-pulse" />
            ) : provider === 'drive' ? (
              <FolderDown className="w-12 h-12 text-amber-500" />
            ) : (
              <FileSpreadsheet className="w-12 h-12 text-teal-500" />
            )}
            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md">
              <Download className="w-4 h-4" />
            </div>
          </div>

          <div className="space-y-2 max-w-lg mx-auto">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {isConcept ? 'ورقة المفاهيم جاهزة للتحميل' : 'ملزمة الشرح والتلخيص متاحة للتحميل'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
              {provider === 'mediafire' 
                ? 'تم رفع هذا الملف على موقع MediaFire المعتمد للتحميل السريع والمباشر بجودة فائقة.'
                : provider === 'drive'
                ? 'الملف متاح على Google Drive بجودة عالية للتحميل أو المشاهدة المباشرة.'
                : 'الملف متاح عبر الرابط المعتمد المرفق من قبل المعلم.'}
            </p>
          </div>

          {/* Prominent CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 max-w-md mx-auto">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleMarkComplete}
              className={`w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-8 py-4 text-white font-black text-sm rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 ${
                provider === 'mediafire'
                  ? 'bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 shadow-blue-500/20'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-500/20'
              }`}
            >
              <Download className="w-5 h-5" />
              <span>
                {provider === 'mediafire' ? 'تحميل الملزمة من MediaFire 🚀' : 'فتح وتحميل الملف الآن 📥'}
              </span>
            </a>

            {!isPassed && onComplete && (
              <button
                onClick={handleMarkComplete}
                disabled={isMarkingComplete}
                className="w-full sm:w-auto px-5 py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-black text-xs rounded-2xl transition-all flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>تأكيد المذاكرة ✓</span>
              </button>
            )}
          </div>

          {/* Copy Link Box */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 max-w-lg mx-auto">
            <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
              <input
                type="text"
                readOnly
                value={url}
                className="flex-1 bg-transparent px-2 font-mono text-[11px] text-slate-600 dark:text-slate-400 focus:outline-none truncate text-left"
                dir="ltr"
              />
              <button
                onClick={handleCopyLink}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1 transition-colors shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'تم النسخ' : 'نسخ الرابط'}</span>
              </button>
            </div>
            
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-bold mt-2">
              <Info className="w-3.5 h-3.5" />
              <span>عند الضغط على التحميل، يتم فتح الرابط تلقائياً وتسجيل إكمال الدرس لفتح المحاضرات القادمة.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
