'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  FileText,
  Download,
  ExternalLink,
  CheckCircle2,
  Maximize2,
  Minimize2,
  Printer,
  ShieldCheck,
  Copy,
  Check,
  FileSpreadsheet,
  Flame,
  FolderDown,
  Info,
  RefreshCw,
  Eye,
  Sun,
  Moon,
  Sparkles,
  FileArchive,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';
import { resolveDocumentUrls } from '@/lib/storageService';
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
  const viewerContainerRef = useRef<HTMLDivElement>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isMarkingComplete, setIsMarkingComplete] = useState(false);
  const [idbResolvedUrl, setIdbResolvedUrl] = useState<string | null>(null);
  const [viewerMode, setViewerMode] = useState<'primary' | 'alt'>('primary');
  const [readerSurface, setReaderSurface] = useState<'dark' | 'light'>('light');
  const [zoomPercent, setZoomPercent] = useState<number>(100);
  const [frameKey, setFrameKey] = useState<number>(0);
  const [frameLoaded, setFrameLoaded] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    if (url && url.startsWith('idb://')) {
      resolveVirtualUrl(url).then((res) => {
        if (isMounted) setIdbResolvedUrl(res);
      });
    } else {
      setIdbResolvedUrl(null);
    }
    return () => {
      isMounted = false;
    };
  }, [url]);

  useEffect(() => {
    const handleFsChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen && !document.fullscreenElement) {
        setIsFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  const activeRawUrl = url?.startsWith('idb://') ? idbResolvedUrl || '' : url;

  const resolved = useMemo(() => resolveDocumentUrls(activeRawUrl || url), [activeRawUrl, url]);

  const isConcept = itemType === 'concept_sheet';
  const hasValidUrl = Boolean(resolved.safeUrl);
  const canEmbed = resolved.canEmbedInPlatform && Boolean(resolved.previewUrl);

  // Switch between primary preview (e.g., Google Drive / Direct PDF / Office Apps) and alt preview (e.g., Google GView)
  const activeEmbedSrc = useMemo(() => {
    if (!canEmbed) return '';
    if (viewerMode === 'alt' && resolved.officeViewerUrl && resolved.officeViewerUrl !== resolved.previewUrl) {
      return resolved.officeViewerUrl;
    }
    if (resolved.fileKind === 'pdf' && resolved.provider !== 'drive' && !resolved.previewUrl.includes('docs.google.com/gview')) {
      return `${resolved.previewUrl}#toolbar=1&navpanes=0`;
    }
    return resolved.previewUrl;
  }, [canEmbed, viewerMode, resolved]);

  const toggleFullscreen = async () => {
    if (!isFullscreen) {
      setIsFullscreen(true);
      try {
        if (viewerContainerRef.current && viewerContainerRef.current.requestFullscreen) {
          await viewerContainerRef.current.requestFullscreen();
        }
      } catch {
        // Graceful CSS fixed viewport fullscreen fallback stays active
      }
    } else {
      setIsFullscreen(false);
      try {
        if (document.fullscreenElement && document.exitFullscreen) {
          await document.exitFullscreen();
        }
      } catch {
        // Ignore if not native fullscreen
      }
    }
  };

  const handleCopyLink = () => {
    if (!resolved.safeUrl) return;
    navigator.clipboard.writeText(resolved.safeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMarkComplete = async () => {
    if (onComplete) {
      setIsMarkingComplete(true);
      try {
        await onComplete();
      } finally {
        setIsMarkingComplete(false);
      }
    }
  };

  const handleReloadViewer = () => {
    setFrameLoaded(false);
    setFrameKey((k) => k + 1);
  };

  const downloadFileAttr = resolved.fileExtension
    ? `${title.replace(/[\\/:*?"<>|]/g, '_')}.${resolved.fileExtension}`
    : undefined;

  return (
    <div
      ref={viewerContainerRef}
      className={`transition-all duration-300 ${
        isFullscreen
          ? 'fixed inset-0 z-[9999] bg-slate-950 p-3 sm:p-5 flex flex-col gap-3 overflow-hidden'
          : 'space-y-5'
      }`}
    >
      {/* Top Header Card (Compact in Fullscreen, Rich in Normal View) */}
      {!isFullscreen && (
        <div className="relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-sm space-y-4">
          <div className="absolute -top-20 -left-20 w-56 h-56 rounded-full bg-gradient-to-br from-teal-500/10 via-emerald-500/5 to-transparent blur-2xl pointer-events-none" />

          <div className="relative flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl font-black text-xs ${
                    isConcept
                      ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                      : 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isConcept ? 'ورقة مفاهيم علمية' : 'ملزمة تلخيص ومذكرات'}</span>
                </span>

                {unitTitle && (
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    {unitTitle}
                  </span>
                )}

                {isPassed && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>تمت المذاكرة والاستيعاب</span>
                  </span>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {title}
              </h1>
            </div>

            {/* Provider Badge */}
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-black text-xs border ${
                  resolved.provider === 'drive'
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                    : resolved.provider === 'mediafire'
                    ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20'
                    : resolved.provider === 'dropbox' || resolved.provider === 'onedrive'
                    ? 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20'
                    : 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20'
                }`}
              >
                {resolved.provider === 'mediafire' ? (
                  <Flame className="w-3.5 h-3.5 text-orange-500" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
                <span>{resolved.providerLabel}</span>
              </span>
            </div>
          </div>

          {description && (
            <p className="relative text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
              {description}
            </p>
          )}
        </div>
      )}

      {/* CASE 1: IN-PLATFORM FUTURISTIC READER (Google Drive, Dropbox, OneDrive, Direct PDF/Image/Office, Platform/Supabase) */}
      {hasValidUrl && canEmbed ? (
        <div
          className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden flex flex-col ${
            isFullscreen ? 'flex-1 h-full border-slate-800' : 'p-3 sm:p-5 space-y-3.5'
          }`}
        >
          {/* Futuristic Action Control Deck */}
          <div
            className={`flex flex-wrap items-center justify-between gap-2.5 p-2.5 sm:p-3 rounded-2xl border ${
              isFullscreen
                ? 'bg-slate-950/90 border-slate-800 m-2 mb-0'
                : 'bg-slate-50/90 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
            }`}
          >
            {/* Left/Start Group: Primary Desktop Download + External Open + Print */}
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={resolved.downloadUrl}
                download={downloadFileAttr}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleMarkComplete}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>
                  تنزيل على الجهاز{' '}
                  {resolved.fileExtension ? `(${resolved.fileExtension.toUpperCase()})` : ''}
                </span>
              </a>

              <a
                href={resolved.safeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500/40 rounded-xl font-bold text-xs transition-all"
                title="فتح في نافذة مستقلة"
              >
                <ExternalLink className="w-3.5 h-3.5 text-emerald-500" />
                <span className="hidden md:inline">فتح بنافذة مستقلة</span>
              </a>

              <button
                type="button"
                onClick={() => window.print()}
                className="p-2 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:text-emerald-600 rounded-xl transition-colors hidden sm:inline-flex"
                title="طباعة المستند"
              >
                <Printer className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleReloadViewer}
                className="p-2 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:text-teal-500 rounded-xl transition-colors"
                title="تحديث وإعادة تحميل العارض"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Right/End Group: Zoom + Surface + Viewer Switcher + Fullscreen + Mark Complete */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Zoom Controls */}
              <div className="hidden sm:flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setZoomPercent((z) => Math.max(70, z - 15))}
                  className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-emerald-600 rounded-lg"
                  title="تصغير العرض"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="px-1.5 text-[11px] font-black text-slate-700 dark:text-slate-200 min-w-[42px] text-center">
                  {zoomPercent}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomPercent((z) => Math.min(160, z + 15))}
                  className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-emerald-600 rounded-lg"
                  title="تكبير العرض"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                {zoomPercent !== 100 && (
                  <button
                    type="button"
                    onClick={() => setZoomPercent(100)}
                    className="p-1.5 text-slate-500 hover:text-rose-500 rounded-lg"
                    title="إعادة الحجم الافتراضي"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Reader Surface Toggle */}
              <button
                type="button"
                onClick={() => setReaderSurface((s) => (s === 'dark' ? 'light' : 'dark'))}
                className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl hover:border-teal-500/40 transition-all"
                title={readerSurface === 'dark' ? 'خلفية قراءة فاتحة' : 'خلفية قراءة داكنة'}
              >
                {readerSurface === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-indigo-500" />
                )}
              </button>

              {/* Alternative Engine Switch (when available for Office/Direct files) */}
              {resolved.officeViewerUrl && resolved.officeViewerUrl !== resolved.previewUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setFrameLoaded(false);
                    setViewerMode((m) => (m === 'primary' ? 'alt' : 'primary'));
                  }}
                  className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[11px] rounded-xl hover:border-violet-500/40 transition-all"
                  title="تبديل محرك العرض إذا لم يظهر الملف"
                >
                  {viewerMode === 'primary' ? 'محرك عرض بديل' : 'المحرك الأساسي'}
                </button>
              )}

              {/* Fullscreen Toggle */}
              <button
                type="button"
                onClick={toggleFullscreen}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 font-black text-xs rounded-xl border transition-all ${
                  isFullscreen
                    ? 'bg-rose-600 hover:bg-rose-700 border-rose-500 text-white'
                    : 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 border-slate-900 dark:border-white hover:opacity-90'
                }`}
              >
                {isFullscreen ? (
                  <>
                    <Minimize2 className="w-3.5 h-3.5" />
                    <span>إغلاق ملء الشاشة</span>
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
                  type="button"
                  onClick={handleMarkComplete}
                  disabled={isMarkingComplete}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-xl shadow-sm transition-all disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isMarkingComplete ? 'جاري التسجيل...' : 'تمت المذاكرة والاستيعاب ✓'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Embedded Document Reader Viewport */}
          <div
            className={`relative w-full overflow-auto rounded-2xl border transition-colors ${
              readerSurface === 'dark'
                ? 'bg-slate-950 border-slate-800'
                : 'bg-slate-100 border-slate-200 dark:border-slate-800'
            } ${isFullscreen ? 'flex-1 m-2 mt-2' : 'h-[72vh] min-h-[540px] max-h-[860px]'}`}
          >
            {/* Loading indicator while iframe initializes */}
            {!frameLoaded && (
              <div className="absolute inset-0 z-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
                <div className="w-10 h-10 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin" />
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  جاري تجهيز قارئ المذكرات التفاعلي...
                </p>
              </div>
            )}

            {/* Dynamic Anti-Leak Security Watermark */}
            <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-around items-center opacity-[0.06] select-none text-slate-900 dark:text-white font-mono font-black text-xs sm:text-sm rotate-[-22deg] overflow-hidden">
              <div>{studentName} • {studentPhone}</div>
              <div>MR. MOHAMED RADWAN PLATFORM • {studentPhone}</div>
              <div>{studentName} • {studentPhone}</div>
              <div>MR. MOHAMED RADWAN PLATFORM • {studentPhone}</div>
            </div>

            <div
              className="w-full h-full origin-top transition-transform duration-200"
              style={
                zoomPercent !== 100
                  ? {
                      transform: `scale(${zoomPercent / 100})`,
                      width: `${10000 / zoomPercent}%`,
                      height: `${10000 / zoomPercent}%`,
                    }
                  : undefined
              }
            >
              <iframe
                key={`${frameKey}-${activeEmbedSrc}`}
                src={activeEmbedSrc}
                title={title}
                allow="autoplay; fullscreen"
                allowFullScreen
                onLoad={() => setFrameLoaded(true)}
                className="relative z-10 w-full h-full border-0 rounded-2xl bg-transparent"
              />
            </div>
          </div>

          {/* Discreet Troubleshooting & Security Bar */}
          {!isFullscreen && (
            <div className="flex flex-wrap items-center justify-between gap-3 px-2 pt-0.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>
                  مشغل مؤمّن بدون استهلاك مساحة المنصة — يدعم العرض بملء الشاشة والتنزيل المباشر على جهازك.
                </span>
              </div>

              <div className="flex items-center gap-3">
                {resolved.provider === 'drive' && (
                  <span className="text-amber-600 dark:text-amber-400">
                    إن ظهر تنبيه صلاحية من Drive تأكد من اختيار «تنزيل على الجهاز» أو «فتح بنافذة مستقلة».
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 hover:text-emerald-600 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'تم نسخ الرابط' : 'نسخ الرابط'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* CASE 2: EXTERNAL / ARCHIVE / MEDIAFIRE LAUNCHER CARD */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-md space-y-6 text-center">
          <div className="relative mx-auto w-24 h-24 rounded-3xl bg-gradient-to-tr from-teal-500/20 via-emerald-500/10 to-sky-500/20 border border-teal-500/30 flex items-center justify-center shadow-lg">
            {resolved.provider === 'mediafire' ? (
              <Flame className="w-12 h-12 text-orange-500 animate-pulse" />
            ) : resolved.fileKind === 'archive' ? (
              <FileArchive className="w-12 h-12 text-amber-500" />
            ) : resolved.provider === 'drive' ? (
              <FolderDown className="w-12 h-12 text-emerald-500" />
            ) : (
              <FileSpreadsheet className="w-12 h-12 text-teal-500" />
            )}
            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md">
              <Download className="w-4 h-4" />
            </div>
          </div>

          <div className="space-y-2 max-w-lg mx-auto">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {resolved.fileKind === 'archive'
                ? 'حزمة ملفات مضغوطة جاهزة للتنزيل المباشر'
                : isConcept
                ? 'ورقة المفاهيم جاهزة للتحميل'
                : 'ملزمة الشرح والتلخيص متاحة للتحميل'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
              {resolved.provider === 'mediafire'
                ? 'تم ربط هذا الملف عبر MediaFire للتحميل المباشر. (لعرض الملف داخل قارئ المنصة مستقبلاً يُفضل رفعه على Google Drive أو رابط مباشر).'
                : resolved.fileKind === 'archive'
                ? 'الملفات المضغوطة يتم تنزيلها مباشرة على سطح المكتب لفك ضغطها واستخدامها بالكامل.'
                : hasValidUrl
                ? 'الملف جاهز للفتح والتحميل مباشرة عبر الرابط المعتمد المرفق من قبل المعلم.'
                : 'لم يتم إرفاق رابط صالح لهذا المستند بعد.'}
            </p>
          </div>

          {hasValidUrl && (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 max-w-md mx-auto">
              <a
                href={resolved.downloadUrl}
                download={downloadFileAttr}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleMarkComplete}
                className={`w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-8 py-4 text-white font-black text-sm rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 ${
                  resolved.provider === 'mediafire'
                    ? 'bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 shadow-blue-500/20'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-500/20'
                }`}
              >
                <Download className="w-5 h-5" />
                <span>
                  {resolved.provider === 'mediafire'
                    ? 'تحميل الملف من MediaFire'
                    : `تنزيل الملف على الجهاز${resolved.fileExtension ? ` (${resolved.fileExtension.toUpperCase()})` : ''}`}
                </span>
              </a>

              {!isPassed && onComplete && (
                <button
                  type="button"
                  onClick={handleMarkComplete}
                  disabled={isMarkingComplete}
                  className="w-full sm:w-auto px-5 py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-black text-xs rounded-2xl transition-all flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>تأكيد المذاكرة ✓</span>
                </button>
              )}
            </div>
          )}

          {hasValidUrl && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 max-w-lg mx-auto">
              <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
                <input
                  type="text"
                  readOnly
                  value={resolved.safeUrl}
                  className="flex-1 bg-transparent px-2 font-mono text-[11px] text-slate-600 dark:text-slate-400 focus:outline-none truncate text-left"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1 transition-colors shrink-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'تم النسخ' : 'نسخ الرابط'}</span>
                </button>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-bold mt-2">
                <Info className="w-3.5 h-3.5" />
                <span>عند الضغط على التنزيل يتم تسجيل إكمال الدرس تلقائياً لفتح المحتوى التالي.</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
