'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Type,
  Palette,
  RotateCcw,
  Sparkles,
  ChevronDown,
  Check,
  Maximize2
} from 'lucide-react';

export interface QuestionRichEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  dir?: 'ltr' | 'rtl';
  showBlankInserters?: boolean;
  onInsertBlankPattern?: (pattern: 'dots' | 'line' | 'brackets') => void;
  onInsertNumberedBlank?: (num: number) => void;
  availableBlankNumbers?: number[];
  className?: string;
}

const FONT_FAMILIES = [
  { label: 'افتراضي عصري (Modern Sans)', value: 'ui-sans-serif, system-ui, -apple-system, sans-serif' },
  { label: 'أكاديمي راقي (Classic Serif)', value: "Georgia, 'Times New Roman', serif" },
  { label: 'آلة كاتبة وملاحظات (Monospace)', value: "'Courier New', Courier, monospace" },
  { label: 'خط مرح وسريع (Casual Comic)', value: "'Comic Sans MS', 'Chalkboard SE', cursive, sans-serif" },
  { label: 'خط عريض بارز (Heavy Display)', value: "'Impact', 'Arial Black', sans-serif" },
  { label: 'خط أنيق متصل (Artistic Script)', value: "'Brush Script MT', 'Lucida Handwriting', cursive" },
];

const FONT_SIZES = [
  { label: 'عادي (Normal)', value: '1rem', scale: '100%' },
  { label: 'كبير (Large)', value: '1.25rem', scale: '125%' },
  { label: 'ضخم وبارز (Extra Large)', value: '1.5rem', scale: '150%' },
];

const BASIC_COLORS = [
  { label: 'تلقائي (حسب الثيم)', value: 'inherit', bgClass: 'bg-slate-700 dark:bg-slate-300' },
  { label: 'أسود داكن صريح (Black)', value: '#000000', bgClass: 'bg-black' },
  { label: 'أسود فحمي احترافي (Charcoal)', value: '#0f172a', bgClass: 'bg-slate-900' },
  { label: 'أزرق ملكي كلاسيكي (Royal Blue)', value: '#2563eb', bgClass: 'bg-blue-600' },
  { label: 'أزرق داكن مميز (Navy Blue)', value: '#1d4ed8', bgClass: 'bg-blue-800' },
  { label: 'أزرق سماوي مشرق (Sky Blue)', value: '#0284c7', bgClass: 'bg-sky-600' },
  { label: 'أحمر أساسي (Red)', value: '#ef4444', bgClass: 'bg-red-500' },
  { label: 'أخضر مميز (Green)', value: '#10b981', bgClass: 'bg-emerald-500' },
  { label: 'برتقالي مشرق (Orange)', value: '#f97316', bgClass: 'bg-orange-500' },
  { label: 'أصفر لامع (Yellow)', value: '#eab308', bgClass: 'bg-yellow-500' },
  { label: 'بنفسجي أنيق (Purple)', value: '#9333ea', bgClass: 'bg-purple-600' },
];

export default function QuestionRichEditor({
  value,
  onChange,
  placeholder = 'Write the English question here...',
  minHeight = '140px',
  dir = 'ltr',
  showBlankInserters = false,
  onInsertBlankPattern,
  onInsertNumberedBlank,
  availableBlankNumbers = [1, 2, 3, 4, 5, 6],
  className = '',
}: QuestionRichEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFontPicker, setShowFontPicker] = useState(false);
  const [showSizePicker, setShowSizePicker] = useState(false);
  const [selectedFont, setSelectedFont] = useState(FONT_FAMILIES[0].value);
  const [selectedColor, setSelectedColor] = useState('inherit');
  const [selectedSize, setSelectedSize] = useState(FONT_SIZES[0].value);
  const [isFocused, setIsFocused] = useState(false);

  // Synchronize external value into editor HTML without resetting selection when typing
  useEffect(() => {
    if (editorRef.current) {
      if (editorRef.current.innerHTML !== (value || '')) {
        editorRef.current.innerHTML = value || '';
      }
    }
  }, [value]);

  const emitChange = useCallback(() => {
    if (editorRef.current) {
      let html = editorRef.current.innerHTML;
      // If user clears everything, innerHTML might be '<br>' or '<p><br></p>'
      if (html === '<br>' || html === '<p><br></p>' || html === '<div><br></div>') {
        html = '';
      }
      onChange(html);
    }
  }, [onChange]);

  // Execute formatting command or wrap selection in styled element
  const executeCommand = (command: string, arg?: string) => {
    if (typeof window === 'undefined') return;
    editorRef.current?.focus();
    
    // Ensure standard execCommand formatting works reliably
    document.execCommand(command, false, arg);
    emitChange();
  };

  const applyCustomStyle = (styleProperty: string, styleValue: string) => {
    if (typeof window === 'undefined') return;
    editorRef.current?.focus();

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      // If no text is highlighted, apply default styling command or wrap
      if (styleProperty === 'color') {
        document.execCommand('foreColor', false, styleValue === 'inherit' ? '#000000' : styleValue);
      } else if (styleProperty === 'fontFamily') {
        document.execCommand('fontName', false, styleValue);
      }
      emitChange();
      return;
    }

    const range = selection.getRangeAt(0);
    const selectedContent = range.extractContents();
    const span = document.createElement('span');

    if (styleProperty === 'color') {
      if (styleValue === 'inherit') {
        span.style.color = '';
      } else {
        span.style.color = styleValue;
      }
    } else if (styleProperty === 'fontFamily') {
      span.style.fontFamily = styleValue;
    } else if (styleProperty === 'fontSize') {
      span.style.fontSize = styleValue;
      span.style.lineHeight = '1.4';
    }

    span.appendChild(selectedContent);
    range.insertNode(span);

    // Keep selection inside the new node
    selection.removeAllRanges();
    const newRange = document.createRange();
    newRange.selectNodeContents(span);
    selection.addRange(newRange);

    emitChange();
  };

  const handleClearFormatting = () => {
    if (typeof window === 'undefined') return;
    editorRef.current?.focus();
    document.execCommand('removeFormat', false, undefined);
    // Also strip custom span styles from selected text if any
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const text = range.toString();
      range.deleteContents();
      range.insertNode(document.createTextNode(text));
    }
    emitChange();
  };

  const insertCustomText = (text: string) => {
    if (typeof window === 'undefined') return;
    editorRef.current?.focus();
    document.execCommand('insertText', false, text);
    emitChange();
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handleDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.rich-editor-toolbar-dropdown')) {
        setShowColorPicker(false);
        setShowFontPicker(false);
        setShowSizePicker(false);
      }
    };
    document.addEventListener('mousedown', handleDocClick);
    return () => document.removeEventListener('mousedown', handleDocClick);
  }, []);

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 overflow-hidden bg-white dark:bg-slate-950 ${
        isFocused
          ? 'border-violet-500 ring-2 ring-violet-500/20 shadow-md shadow-violet-500/5'
          : 'border-slate-200 dark:border-slate-800'
      } ${className}`}
    >
      {/* Visual Word-Style Formatting Toolbar */}
      <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-2 flex flex-wrap items-center gap-1.5 text-slate-700 dark:text-slate-300 select-none">
        
        {/* Bold (تضخيم) */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            executeCommand('bold');
          }}
          className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 active:scale-95 transition-all flex items-center justify-center font-black group relative"
          title="تضخيم الكلمة / الخط العريض (Bold)"
        >
          <Bold className="w-4 h-4 stroke-[3]" />
          <span className="sr-only">Bold</span>
        </button>

        {/* Italic (إمالة) */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            executeCommand('italic');
          }}
          className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 active:scale-95 transition-all flex items-center justify-center font-bold"
          title="إمالة النص (Italic)"
        >
          <Italic className="w-4 h-4 stroke-[2.5]" />
          <span className="sr-only">Italic</span>
        </button>

        {/* Underline (وضع خط تحت كلمة - مهم جداً للقطع وأسئلة الإشارة) */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            executeCommand('underline');
          }}
          className="p-2 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-800/60 active:scale-95 transition-all flex items-center justify-center font-bold"
          title="وضع خط تحت الكلمة (Underline) - مناسب لأسئلة القطعة"
        >
          <Underline className="w-4 h-4 stroke-[2.5]" />
          <span className="sr-only">Underline</span>
        </button>

        <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-800 mx-0.5" />

        {/* Font Family Dropdown (تغيير نوع الخط بالإنجليزية) */}
        <div className="relative rich-editor-toolbar-dropdown">
          <button
            type="button"
            onClick={() => {
              setShowFontPicker(!showFontPicker);
              setShowColorPicker(false);
              setShowSizePicker(false);
            }}
            className="px-2.5 py-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 flex items-center gap-1.5 transition-all"
            title="نوع الخط الإنجليزي (Font Family)"
          >
            <Type className="w-3.5 h-3.5 text-violet-500" />
            <span className="truncate max-w-[110px] hidden sm:inline">
              {FONT_FAMILIES.find((f) => f.value === selectedFont)?.label.split(' ')[0] || 'نوع الخط'}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showFontPicker && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-1.5 space-y-1 animate-in fade-in zoom-in-95">
              <div className="px-2.5 py-1 text-[11px] font-black text-slate-400 border-b border-slate-100 dark:border-slate-800">
                اختر نوع الخط الإنجليزي:
              </div>
              {FONT_FAMILIES.map((font) => (
                <button
                  key={font.value}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setSelectedFont(font.value);
                    applyCustomStyle('fontFamily', font.value);
                    setShowFontPicker(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between hover:bg-violet-50 dark:hover:bg-violet-950/40 transition-colors group"
                >
                  <span style={{ fontFamily: font.value }} className="text-sm text-slate-800 dark:text-slate-200">
                    {font.label}
                  </span>
                  {selectedFont === font.value && (
                    <Check className="w-3.5 h-3.5 text-violet-500" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Word Size / Emphasis (تضخيم حجم الكلمة) */}
        <div className="relative rich-editor-toolbar-dropdown">
          <button
            type="button"
            onClick={() => {
              setShowSizePicker(!showSizePicker);
              setShowColorPicker(false);
              setShowFontPicker(false);
            }}
            className="px-2.5 py-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 flex items-center gap-1.5 transition-all"
            title="تضخيم وتكبير حجم الكلمة (Font Size)"
          >
            <Maximize2 className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">حجم الكلمة</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showSizePicker && (
            <div className="absolute top-full left-0 mt-1 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-1.5 space-y-1 animate-in fade-in zoom-in-95">
              <div className="px-2.5 py-1 text-[11px] font-black text-slate-400 border-b border-slate-100 dark:border-slate-800">
                تضخيم حجم الكلمة المحددة:
              </div>
              {FONT_SIZES.map((size) => (
                <button
                  key={size.value}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setSelectedSize(size.value);
                    applyCustomStyle('fontSize', size.value);
                    setShowSizePicker(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                >
                  <span style={{ fontSize: size.value }} className="font-bold text-slate-800 dark:text-slate-200">
                    {size.label}
                  </span>
                  {selectedSize === size.value && (
                    <Check className="w-3.5 h-3.5 text-amber-500" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Color Palette (التلوين بألوان أساسية: أحمر، أخضر، برتقالي، أصفر، أزرق) */}
        <div className="relative rich-editor-toolbar-dropdown">
          <button
            type="button"
            onClick={() => {
              setShowColorPicker(!showColorPicker);
              setShowFontPicker(false);
              setShowSizePicker(false);
            }}
            className="px-2.5 py-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 flex items-center gap-1.5 transition-all"
            title="تلوين الكلمة بألوان مميزة (Text Color)"
          >
            <Palette className="w-3.5 h-3.5 text-rose-500" />
            <span
              className="w-3 h-3 rounded-full border border-slate-300 dark:border-slate-600 inline-block shadow-xs"
              style={{ backgroundColor: selectedColor === 'inherit' ? '#64748b' : selectedColor }}
            />
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showColorPicker && (
            <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-2 space-y-1.5 animate-in fade-in zoom-in-95">
              <div className="px-2 py-1 text-[11px] font-black text-slate-400 border-b border-slate-100 dark:border-slate-800">
                اختر لون الكلمة أو العبارة:
              </div>
              <div className="grid grid-cols-1 gap-1">
                {BASIC_COLORS.map((col) => (
                  <button
                    key={col.value}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setSelectedColor(col.value);
                      applyCustomStyle('color', col.value);
                      setShowColorPicker(false);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-xl text-xs flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-right"
                  >
                    <span className={`w-4 h-4 rounded-full ${col.bgClass} shrink-0 border border-black/10`} />
                    <span className="font-bold text-slate-800 dark:text-slate-200 flex-1">{col.label}</span>
                    {selectedColor === col.value && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Clear Formatting (إزالة التنسيق) */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            handleClearFormatting();
          }}
          className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 active:scale-95 transition-all flex items-center justify-center"
          title="مسح التنسيقات عن الكلمة المحددة (Clear Format)"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="sr-only">Clear</span>
        </button>

        {/* Optional Fast Inserters for Blank Patterns */}
        {showBlankInserters && (
          <>
            <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-800 mx-0.5" />
            <div className="flex items-center gap-1 text-xs">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  if (onInsertBlankPattern) onInsertBlankPattern('line');
                  else insertCustomText(' ___________ ');
                }}
                className="px-2 py-1 bg-slate-200/70 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg font-mono text-xs font-bold transition-all"
                title="إدراج خط فراغ (______)"
              >
                ______
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  if (onInsertBlankPattern) onInsertBlankPattern('dots');
                  else insertCustomText(' ............ ');
                }}
                className="px-2 py-1 bg-slate-200/70 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg font-mono text-xs font-bold transition-all"
                title="إدراج نقاط فراغ (......)"
              >
                ......
              </button>
              {availableBlankNumbers.slice(0, 4).map((num) => (
                <button
                  key={num}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    if (onInsertNumberedBlank) onInsertNumberedBlank(num);
                    else insertCustomText(` [${num}] `);
                  }}
                  className="px-1.5 py-1 bg-indigo-100 dark:bg-indigo-950/60 hover:bg-indigo-200 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-lg font-mono text-xs font-black transition-all"
                  title={`إدراج رقم الفراغ [${num}]`}
                >
                  [{num}]
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* The WYSIWYG Content Area */}
      <div className="relative">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          dir={dir}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            emitChange();
          }}
          onInput={emitChange}
          style={{ minHeight }}
          className="w-full px-4 py-3.5 focus:outline-none font-sans text-left font-bold text-sm text-slate-900 dark:text-white leading-relaxed select-text overflow-y-auto"
        />

        {/* Empty Placeholder overlay */}
        {(!value || value === '<br>' || value === '<p><br></p>') && !isFocused && (
          <div
            onClick={() => editorRef.current?.focus()}
            dir={dir}
            className="absolute top-3.5 left-4 text-slate-400 dark:text-slate-500 font-sans text-sm font-medium pointer-events-none select-none"
          >
            {placeholder}
          </div>
        )}
      </div>

      {/* Visual Indicator Footer */}
      <div className="px-3 py-1.5 bg-slate-50/70 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-bold">
        <span className="flex items-center gap-1.5 text-violet-600 dark:text-violet-400">
          <Sparkles className="w-3 h-3" />
          <span>محرر أسئلة تفاعلي واقعي (WYSIWYG) - ظلل أي كلمة لتغيير خطها أو تلوينها أو وضع خط تحتها.</span>
        </span>
        <span className="font-mono text-[10px] text-slate-500">
          English Content
        </span>
      </div>
    </div>
  );
}
