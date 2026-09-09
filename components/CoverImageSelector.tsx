'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { 
  Upload, 
  Image as ImageIcon, 
  Sparkles, 
  Trash2, 
  Check, 
  Layers, 
  Link as LinkIcon, 
  Eye, 
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { ENGLISH_COURSE_TEMPLATES, CourseCoverTemplate } from '@/lib/courseTemplates';
import { useResolvedImageUrl } from '@/hooks/useResolvedImageUrl';

interface CoverImageSelectorProps {
  value: string;
  onChange: (url: string) => void;
  defaultTitle?: string;
}

export default function CoverImageSelector({ value, onChange, defaultTitle }: CoverImageSelectorProps) {
  const resolvedValue = useResolvedImageUrl(value);
  const [activeTab, setActiveTab] = useState<'upload' | 'templates' | 'url'>('upload');
  const [templateCategory, setTemplateCategory] = useState<string>('all');
  const [urlInput, setUrlInput] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter templates
  const filteredTemplates = ENGLISH_COURSE_TEMPLATES.filter(t => {
    if (templateCategory === 'all') return true;
    return t.category === templateCategory;
  });

  // Handle local file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      processFile(files[0]);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('يرجى اختيار ملف صورة صالح (PNG, JPG, WEBP, SVG)');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      alert('حجم الصورة كبير جداً. يرجى اختيار صورة أقل من 8 ميجابايت.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        onChange(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
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
      processFile(e.dataTransfer.files[0]);
    }
  };

  const isTemplateSelected = (tplDataUrl: string) => value === tplDataUrl;

  return (
    <div className="space-y-4">
      {/* Current Preview Card */}
      {value ? (
        <div className="relative aspect-[21/9] w-full bg-slate-950 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md group">
          <Image
            src={resolvedValue}
            alt="Course Cover Preview"
            fill
            className="object-cover"
            referrerPolicy="no-referrer"
            unoptimized={Boolean(resolvedValue?.startsWith('data:') || resolvedValue?.startsWith('blob:') || resolvedValue?.startsWith('idb://'))}
          />
          <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-xs">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-white/90 hover:bg-white text-slate-900 font-bold text-xs rounded-xl shadow-lg flex items-center gap-1.5 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              تغيير الصورة
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              className="px-4 py-2 bg-rose-600/90 hover:bg-rose-600 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-1.5 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              إزالة الغلاف
            </button>
          </div>
          <div className="absolute bottom-2 right-2 px-3 py-1 bg-slate-950/80 backdrop-blur-md rounded-lg text-[11px] font-bold text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <Check className="w-3 h-3" />
            تم تعيين غلاف الكورس
          </div>
        </div>
      ) : null}

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'upload'
              ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-200 dark:border-slate-800'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>رفع صورة من الجهاز</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('templates')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'templates'
              ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-200 dark:border-slate-800'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>قوالب إنجليزية جاهزة (احترافية)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('url')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'url'
              ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-200 dark:border-slate-800'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <LinkIcon className="w-3.5 h-3.5" />
          <span>رابط خارجي</span>
        </button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/webp, image/svg+xml"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* TAB 1: DEVICE UPLOAD */}
      {activeTab === 'upload' && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`p-6 sm:p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center space-y-3 ${
            dragActive
              ? 'border-emerald-500 bg-emerald-500/10'
              : 'border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 bg-slate-50 dark:bg-slate-950/50'
          }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <FolderOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              اضغط لاختيار صورة من جهازك، أو اسحب الملف وأفلته هنا
            </p>
            <p className="text-xs text-slate-500 mt-1">
              يدعم الصيغ (PNG, JPG, WEBP, SVG) بنسبة أبعاد عرضية مناسبة (16:9 أو 21:9)
            </p>
          </div>
          <button
            type="button"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm inline-flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            استعراض ملفات الجهاز
          </button>
        </div>
      )}

      {/* TAB 2: READY-MADE ENGLISH TEMPLATES */}
      {activeTab === 'templates' && (
        <div className="space-y-3">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              type="button"
              onClick={() => setTemplateCategory('all')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                templateCategory === 'all'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              الكل ({ENGLISH_COURSE_TEMPLATES.length})
            </button>
            <button
              type="button"
              onClick={() => setTemplateCategory('general')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                templateCategory === 'general'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              شرح وتأسيس عام
            </button>
            <button
              type="button"
              onClick={() => setTemplateCategory('revision')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                templateCategory === 'revision'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              مراجعات وامتحانات
            </button>
            <button
              type="button"
              onClick={() => setTemplateCategory('azhar')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                templateCategory === 'azhar'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              الأزهر الشريف
            </button>
            <button
              type="button"
              onClick={() => setTemplateCategory('middle')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                templateCategory === 'middle'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              المرحلة الإعدادية
            </button>
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {filteredTemplates.map((tpl) => {
              const isSelected = isTemplateSelected(tpl.dataUrl);
              return (
                <div
                  key={tpl.id}
                  onClick={() => onChange(tpl.dataUrl)}
                  className={`group relative rounded-2xl overflow-hidden border-2 cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? 'border-emerald-500 ring-2 ring-emerald-500/30 scale-[1.02] shadow-lg'
                      : 'border-slate-200 dark:border-slate-800 hover:border-emerald-400 hover:shadow-md'
                  }`}
                >
                  <div className="relative aspect-[21/9] w-full bg-slate-900">
                    <Image
                      src={tpl.dataUrl}
                      alt={tpl.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-emerald-600 text-white p-1 rounded-lg shadow-md">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                  <div className="p-2.5 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {tpl.name}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate font-mono">
                      {tpl.nameEn}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: CUSTOM URL */}
      {activeTab === 'url' && (
        <div className="flex gap-2">
          <input
            type="url"
            placeholder="https://example.com/cover-image.jpg"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
          />
          <button
            type="button"
            onClick={() => {
              if (urlInput.trim()) {
                onChange(urlInput.trim());
                setUrlInput('');
              }
            }}
            className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
          >
            تطبيق الرابط
          </button>
        </div>
      )}
    </div>
  );
}
