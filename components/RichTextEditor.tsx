'use client';

import React, { useState, useRef } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignRight,
  AlignCenter,
  AlignLeft,
  Palette,
  Highlighter,
  Smile,
  Sparkles,
  List,
  ListOrdered,
  Quote,
  Type,
  Maximize2,
  ChevronDown
} from 'lucide-react';

export interface RichTextEditorProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  showStickers?: boolean;
  showAnimations?: boolean;
  className?: string;
}

const TEXT_COLORS = [
  { label: 'تلقائي', value: 'inherit', bg: 'bg-slate-700' },
  { label: 'أزرق', value: '#2563eb', bg: 'bg-blue-600' },
  { label: 'أحمر', value: '#dc2626', bg: 'bg-red-600' },
  { label: 'أخضر', value: '#16a34a', bg: 'bg-emerald-600' },
  { label: 'بنفسجي', value: '#9333ea', bg: 'bg-purple-600' },
  { label: 'برتقالي', value: '#ea580c', bg: 'bg-orange-600' },
  { label: 'ذهبي', value: '#d97706', bg: 'bg-amber-600' },
];

const HIGHLIGHT_COLORS = [
  { label: 'بدون تظليل', value: 'transparent', bg: 'bg-slate-200' },
  { label: 'أصفر فسفوري', value: '#fef08a', bg: 'bg-yellow-200' },
  { label: 'أخضر نعناعي', value: '#bbf7d0', bg: 'bg-green-200' },
  { label: 'سماوي مائي', value: '#bae6fd', bg: 'bg-sky-200' },
  { label: 'وردي لطيف', value: '#fbcfe8', bg: 'bg-pink-200' },
];

const FONT_SIZES = [
  { label: 'صغير', value: '14px', tag: 'sm' },
  { label: 'عادي', value: '16px', tag: 'base' },
  { label: 'كبير', value: '20px', tag: 'lg' },
  { label: 'عنوان', value: '26px', tag: 'xl' },
];

const STICKERS = [
  '🌟', '🎯', '💡', '🏆', '📖', '✍️', '🧠', '⚡', '🔔', '📌', 
  '🚀', '⏳', '💯', '🎓', '🔥', '🌈', '🥇', '👑', '🪄', '✅', 
  '❌', '⚠️', '❓', '🇬🇧', '🇺🇸', '🎉', '👏', '💪', '📚', '✨'
];

const ANIMATION_EFFECTS = [
  { label: 'بدون تأثير', value: '', class: '' },
  { label: 'نبض مستمر (Pulse)', value: 'pulse-anim', class: 'animate-pulse text-amber-500' },
  { label: 'لمعان ذهبي (Shine)', value: 'shine-anim', class: 'text-amber-500 font-black' },
  { label: 'ارتداد لطيف (Bounce)', value: 'bounce-anim', class: 'animate-bounce text-violet-500' },
];

export default function RichTextEditor({
  id,
  value,
  onChange,
  placeholder = 'اكتب المحتوى هنا مع خيارات التنسيق المتقدمة مثل برنامج Word...',
  minHeight = 'min-h-[160px]',
  showStickers = true,
  showAnimations = true,
  className = '',
}: RichTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [showFontSizePicker, setShowFontSizePicker] = useState(false);
  const [showAnimationPicker, setShowAnimationPicker] = useState(false);

  // Helper to wrap selected text in the textarea with HTML or insert at cursor
  const wrapSelection = (beforeTag: string, afterTag: string, defaultText = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = textarea.value;

    const selectedText = currentVal.substring(start, end) || defaultText;
    const replacement = `${beforeTag}${selectedText}${afterTag}`;
    const newVal = currentVal.substring(0, start) + replacement + currentVal.substring(end);

    onChange(newVal);

    // Restore focus and selection
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + replacement.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 10);
  };

  const insertSticker = (sticker: string) => {
    wrapSelection('', '', sticker + ' ');
    setShowStickerPicker(false);
  };

  const applyTextColor = (color: string) => {
    if (color === 'inherit') {
      wrapSelection('', '', 'نص عادي');
    } else {
      wrapSelection(`<span style="color: ${color};">`, '</span>', 'نص ملون');
    }
    setShowColorPicker(false);
  };

  const applyHighlight = (bg: string) => {
    if (bg === 'transparent') {
      wrapSelection('', '', 'نص بدون تظليل');
    } else {
      wrapSelection(`<span style="background-color: ${bg}; padding: 2px 4px; border-radius: 4px; color: #1e293b;">`, '</span>', 'نص مظلل');
    }
    setShowHighlightPicker(false);
  };

  const applyFontSize = (size: string, label: string) => {
    wrapSelection(`<span style="font-size: ${size}; line-height: 1.4;">`, '</span>', `نص ${label}`);
    setShowFontSizePicker(false);
  };

  const applyAnimation = (animValue: string, label: string) => {
    if (!animValue) {
      setShowAnimationPicker(false);
      return;
    }
    wrapSelection(`<span class="${animValue}" style="display: inline-block;">`, '</span>', `نص بتأثير ${label}`);
    setShowAnimationPicker(false);
  };

  return (
    <div
      id={id || 'rich-text-editor-container'}
      className={`border border-slate-200 dark:border-slate-800 rounded-3xl bg-white dark:bg-slate-900 overflow-hidden shadow-sm transition-all focus-within:ring-2 focus-within:ring-violet-500/40 focus-within:border-violet-500 ${className}`}
      dir="rtl"
    >
      {/* Top Word-Style Toolbar */}
      <div className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 p-2 sm:p-2.5 flex flex-wrap items-center gap-1 sm:gap-1.5 text-slate-700 dark:text-slate-300 select-none">
        
        {/* Basic formatting: B, I, U, S */}
        <div className="flex items-center bg-white dark:bg-slate-900 rounded-xl p-0.5 border border-slate-200 dark:border-slate-750 shadow-xs">
          <button
            type="button"
            onClick={() => wrapSelection('<strong>', '</strong>', 'نص غامق')}
            title="خط غامق (Bold)"
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-200 hover:text-violet-600 transition-colors"
          >
            <Bold className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => wrapSelection('<em>', '</em>', 'نص مائل')}
            title="خط مائل (Italic)"
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-200 hover:text-violet-600 transition-colors"
          >
            <Italic className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => wrapSelection('<u>', '</u>', 'نص تحته خط')}
            title="وضع خط تحت الكلمة (Underline)"
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-200 hover:text-violet-600 transition-colors"
          >
            <Underline className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => wrapSelection('<del>', '</del>', 'نص مشطوب')}
            title="خط في المنتصف (Strikethrough)"
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-200 hover:text-violet-600 transition-colors"
          >
            <Strikethrough className="w-4 h-4" />
          </button>
        </div>

        {/* Font Size Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowFontSizePicker(!showFontSizePicker);
              setShowColorPicker(false);
              setShowHighlightPicker(false);
              setShowStickerPicker(false);
              setShowAnimationPicker(false);
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-violet-400 transition-colors"
            title="حجم الخط"
          >
            <Type className="w-3.5 h-3.5 text-violet-500" />
            <span>حجم الخط</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showFontSizePicker && (
            <div className="absolute top-full right-0 mt-1.5 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-1.5 w-36 space-y-1 animate-in fade-in zoom-in-95 duration-150">
              {FONT_SIZES.map((size) => (
                <button
                  key={size.value}
                  type="button"
                  onClick={() => applyFontSize(size.value, size.label)}
                  className="w-full text-right px-3 py-1.5 text-xs font-bold rounded-xl hover:bg-violet-50 dark:hover:bg-violet-950/40 text-slate-700 dark:text-slate-200 flex items-center justify-between"
                >
                  <span>{size.label}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{size.value}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Text Color Picker */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowColorPicker(!showColorPicker);
              setShowFontSizePicker(false);
              setShowHighlightPicker(false);
              setShowStickerPicker(false);
              setShowAnimationPicker(false);
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-violet-400 transition-colors"
            title="تلوين الكلمات (Font Color)"
          >
            <Palette className="w-3.5 h-3.5 text-rose-500" />
            <span>لون النص</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showColorPicker && (
            <div className="absolute top-full right-0 mt-1.5 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-2 w-44 space-y-1 animate-in fade-in zoom-in-95 duration-150">
              <div className="text-[10px] font-black text-slate-400 px-2 py-1">اختر لون النص:</div>
              <div className="grid grid-cols-4 gap-1.5 p-1">
                {TEXT_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => applyTextColor(c.value)}
                    title={c.label}
                    className={`w-7 h-7 rounded-lg ${c.bg} border-2 border-white dark:border-slate-800 shadow-sm transition-transform hover:scale-110 active:scale-95`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Highlighter Picker */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowHighlightPicker(!showHighlightPicker);
              setShowColorPicker(false);
              setShowFontSizePicker(false);
              setShowStickerPicker(false);
              setShowAnimationPicker(false);
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-violet-400 transition-colors"
            title="تظليل النص (Highlighter)"
          >
            <Highlighter className="w-3.5 h-3.5 text-amber-500" />
            <span>تظليل</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showHighlightPicker && (
            <div className="absolute top-full right-0 mt-1.5 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-2 w-44 space-y-1 animate-in fade-in zoom-in-95 duration-150">
              <div className="text-[10px] font-black text-slate-400 px-2 py-1">لون التظليل:</div>
              <div className="flex flex-wrap gap-1.5 p-1">
                {HIGHLIGHT_COLORS.map((h) => (
                  <button
                    key={h.value}
                    type="button"
                    onClick={() => applyHighlight(h.value)}
                    title={h.label}
                    className={`w-7 h-7 rounded-lg ${h.bg} border border-slate-300 dark:border-slate-700 shadow-sm transition-transform hover:scale-110`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Lists & Alignment */}
        <div className="flex items-center bg-white dark:bg-slate-900 rounded-xl p-0.5 border border-slate-200 dark:border-slate-750 shadow-xs">
          <button
            type="button"
            onClick={() => wrapSelection('• ', '\n', 'عنصر في القائمة')}
            title="قائمة نقطية"
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-200 transition-colors"
          >
            <List className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => wrapSelection('1. ', '\n', 'عنصر مرقم')}
            title="قائمة رقمية"
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-200 transition-colors"
          >
            <ListOrdered className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => wrapSelection('<blockquote style="border-right: 3px solid #8b5cf6; padding-right: 12px; margin: 8px 0; color: #64748b;">', '</blockquote>', 'ملاحظة مهمة أو اقتباس')}
            title="اقتباس أو تمييز"
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-200 transition-colors"
          >
            <Quote className="w-4 h-4" />
          </button>
        </div>

        {/* Stickers & Emojis */}
        {showStickers && (
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowStickerPicker(!showStickerPicker);
                setShowColorPicker(false);
                setShowFontSizePicker(false);
                setShowHighlightPicker(false);
                setShowAnimationPicker(false);
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-300 hover:scale-105 transition-all"
              title="إضافة ستيكر أو رمز تفاعلي"
            >
              <Smile className="w-3.5 h-3.5 text-amber-500" />
              <span>ستيكرات 🌟</span>
            </button>

            {showStickerPicker && (
              <div className="absolute top-full right-0 mt-1.5 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-3 w-64 max-h-56 overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
                <div className="text-[11px] font-black text-slate-500 dark:text-slate-400 mb-2 px-1 flex items-center justify-between">
                  <span>ستيكرات ورموز تفاعلية</span>
                  <span className="text-[10px] text-amber-500 font-bold">اضغط لإدراج</span>
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {STICKERS.map((stk, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => insertSticker(stk)}
                      className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-900/50 flex items-center justify-center text-lg transition-transform hover:scale-125"
                    >
                      {stk}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Animation Effects */}
        {showAnimations && (
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowAnimationPicker(!showAnimationPicker);
                setShowColorPicker(false);
                setShowFontSizePicker(false);
                setShowHighlightPicker(false);
                setShowStickerPicker(false);
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30 border border-violet-200 dark:border-violet-800/50 rounded-xl text-xs font-bold text-violet-700 dark:text-violet-300 hover:scale-105 transition-all"
              title="تأثيرات حركية للكلمات"
            >
              <Sparkles className="w-3.5 h-3.5 text-violet-500" />
              <span>أنميشن ✨</span>
            </button>

            {showAnimationPicker && (
              <div className="absolute top-full right-0 mt-1.5 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-1.5 w-48 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                <div className="text-[10px] font-black text-slate-400 px-2 py-1">تأثير حركي للنص المحدد:</div>
                {ANIMATION_EFFECTS.map((eff) => (
                  <button
                    key={eff.value}
                    type="button"
                    onClick={() => applyAnimation(eff.value, eff.label)}
                    className="w-full text-right px-3 py-2 text-xs font-bold rounded-xl hover:bg-violet-50 dark:hover:bg-violet-950/40 text-slate-700 dark:text-slate-200 flex items-center justify-between"
                  >
                    <span>{eff.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Main Text Area with Rich Text Input */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full p-4 text-slate-900 dark:text-white bg-transparent focus:outline-hidden resize-y font-medium text-base leading-relaxed ${minHeight}`}
      />

      {/* Footer info tip */}
      <div className="px-4 py-2 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-400 flex items-center justify-between">
        <span>يدعم خيارات التنسيق المتقدمة، التلوين، الخطوط، وتكبير النصوص مثل Word</span>
        <span>{value ? `${value.length} حرف` : '0 حرف'}</span>
      </div>
    </div>
  );
}
