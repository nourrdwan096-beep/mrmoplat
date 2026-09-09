'use client';

import React, { useState, useRef } from 'react';
import { 
  FileText, 
  UploadCloud, 
  ExternalLink, 
  Link as LinkIcon, 
  CheckCircle2, 
  Trash2, 
  FileSpreadsheet, 
  Sparkles,
  AlertCircle,
  Eye,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { uploadDocumentToSupabase, detectLinkProvider } from '@/lib/storageService';

interface PdfResourceUploaderProps {
  value: string;
  onChange: (url: string) => void;
  itemType: 'concept_sheet' | 'summary_pdf' | 'homework' | 'exam' | 'video';
  title?: string;
}

export default function PdfResourceUploader({
  value,
  onChange,
  itemType,
  title,
}: PdfResourceUploaderProps) {
  const currentProvider = detectLinkProvider(value);
  const initialMode = (value && (value.startsWith('http') && !value.includes('supabase.co') && !value.startsWith('data:') && !value.startsWith('idb://'))) 
    ? 'link' 
    : (value ? 'upload' : 'link');

  const [mode, setMode] = useState<'link' | 'upload'>(initialMode);
  const [externalUrl, setExternalUrl] = useState(value && !value.startsWith('data:') && !value.startsWith('idb://') ? value : '');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Link type detection
  const detectedType = detectLinkProvider(externalUrl);

  const handleUrlChange = (newUrl: string) => {
    setExternalUrl(newUrl);
    onChange(newUrl.trim());
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      await processFileUpload(files[0]);
    }
  };

  const processFileUpload = async (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setUploadError('يرجى اختيار ملف بصيغة PDF فقط.');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setUploadError('حجم الملف يتجاوز 50 ميجابايت. يُفضل استخدام رابط خارجي (ميديا فاير) للملفات الكبيرة جداً.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);
    setUploadError(null);
    setFileName(file.name);
    setFileSize(`${(file.size / (1024 * 1024)).toFixed(2)} MB`);

    try {
      const result = await uploadDocumentToSupabase(file, 'course_materials', (percent) => {
        setUploadProgress(percent);
      });

      onChange(result.url);
      setExternalUrl('');
    } catch (err: any) {
      console.error('File upload error:', err);
      setUploadError(err?.message || 'تعذر رفع الملف، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFileUpload(e.dataTransfer.files[0]);
    }
  };

  const clearResource = () => {
    onChange('');
    setExternalUrl('');
    setFileName('');
    setFileSize('');
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isConcept = itemType === 'concept_sheet';

  return (
    <div className="space-y-4">
      {/* Header & Tabs */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          {isConcept ? (
            <FileSpreadsheet className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          ) : (
            <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          )}
          <span>{isConcept ? 'ملف ورقة المفاهيم' : 'ملزمة الكورس أو المذكرة'}</span>
          <span className="text-[10px] text-slate-400 font-normal">(اختر الطريقة المناسبة)</span>
        </label>

        {value && (
          <button
            type="button"
            onClick={clearResource}
            className="text-[11px] font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>حذف الملف</span>
          </button>
        )}
      </div>

      {/* Mode Selector */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setMode('link')}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-black text-xs transition-all ${
            mode === 'link'
              ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ExternalLink className="w-4 h-4" />
          <span>رابط خارجي (ميديا فاير / درايف)</span>
        </button>

        <button
          type="button"
          onClick={() => setMode('upload')}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-black text-xs transition-all ${
            mode === 'upload'
              ? 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          <span>رفع على المنصة وسوبابيز</span>
        </button>
      </div>

      {/* MODE 1: EXTERNAL LINK (MediaFire / Google Drive) */}
      {mode === 'link' && (
        <div className="p-4 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 rounded-2xl space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                ضع رابط التحميل المباشر (مثل MediaFire أو Google Drive):
              </span>
              
              {/* Provider Badges */}
              {detectedType === 'mediafire' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  🔥 رابط ميديا فاير (MediaFire)
                </span>
              )}
              {detectedType === 'drive' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  📁 رابط جوجل درايف (Google Drive)
                </span>
              )}
              {detectedType === 'direct' && externalUrl.startsWith('http') && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  🌐 رابط مباشر معتمد
                </span>
              )}
            </div>

            <div className="relative">
              <input
                type="url"
                placeholder="https://www.mediafire.com/file/... أو https://drive.google.com/..."
                value={externalUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                className="w-full px-3.5 py-2.5 pr-9 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 text-left"
                dir="ltr"
              />
              <LinkIcon className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Quick Presets & Test link */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              💡 سينتقل الطالب عند الضغط إلى صفحة التحميل في تبويب جديد فوري.
            </div>

            {externalUrl && (
              <a
                href={externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-700 dark:text-teal-300 font-black text-xs transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>معاينة الرابط ↗️</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* MODE 2: UPLOAD TO PLATFORM & SUPABASE */}
      {mode === 'upload' && (
        <div className="space-y-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".pdf,application/pdf"
            className="hidden"
          />

          {/* Upload Drop Zone */}
          {!value || mode !== 'upload' || (value.startsWith('http') && !value.includes('supabase.co') && !value.startsWith('data:') && !value.startsWith('idb://')) ? (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 border-2 border-dashed rounded-2xl cursor-pointer text-center transition-all flex flex-col items-center justify-center gap-3 ${
                dragActive
                  ? 'border-purple-500 bg-purple-500/10 scale-[0.99]'
                  : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50 hover:bg-slate-100 dark:hover:bg-slate-900/80'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                {isUploading ? (
                  <RefreshCw className="w-6 h-6 animate-spin" />
                ) : (
                  <UploadCloud className="w-6 h-6" />
                )}
              </div>

              <div>
                <p className="text-xs font-black text-slate-800 dark:text-slate-200">
                  اسحب ملف الـ PDF هنا أو اضغط للاختيار من جهازك
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold mt-0.5">
                  يتم حفظه على سوبابيز وعرضه للطالب داخل قارئ المنصة التفاعلي
                </p>
              </div>

              <button
                type="button"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
              >
                تصفح الملفات من الجهاز
              </button>
            </div>
          ) : (
            /* Uploaded Preview Card */
            <div className="p-4 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white truncate max-w-xs">
                      {fileName || title || (isConcept ? 'ورقة مفاهيم مرفوعة' : 'ملزمة مرفوعة على المنصة')}
                    </h4>
                    <p className="text-[10px] text-purple-700 dark:text-purple-300 font-bold">
                      مرفوع على المنصة وسوبابيز {fileSize && `• ${fileSize}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-slate-500 hover:text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/50 rounded-xl transition-all"
                    title="استبدال الملف"
                  >
                    <FolderOpen className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={clearResource}
                    className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-all"
                    title="حذف الملف"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Status bar */}
              <div className="flex items-center gap-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>الملف جاهز ومحفوظ — سيتم عرضه للطالب في مشغل وقارئ المنصة الداخلي 📖</span>
              </div>
            </div>
          )}

          {/* Uploading progress bar */}
          {isUploading && (
            <div className="space-y-1.5 p-3 bg-purple-50 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-800">
              <div className="flex justify-between text-xs font-bold text-purple-700 dark:text-purple-300">
                <span>جاري رفع وتأمين الملف على سوبابيز...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-purple-200 dark:bg-purple-900/50 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-purple-600 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Error notice */}
          {uploadError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}
        </div>
      )}

      {/* Selected Resource Summary Badge */}
      {value && (
        <div className="p-3 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 truncate">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="font-bold text-slate-700 dark:text-slate-300">
              {currentProvider === 'mediafire' ? '🔥 مربوط بـ MediaFire' :
               currentProvider === 'drive' ? '📁 مربوط بـ Google Drive' :
               currentProvider === 'platform' ? '☁️ مرفوع على المنصة وسوبابيز' : '🔗 رابط خارجي معتمد'}
            </span>
          </div>
          
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 shrink-0"
          >
            <span>فتح ومعاينة</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}
    </div>
  );
}
