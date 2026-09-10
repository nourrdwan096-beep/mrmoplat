'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Palette,
  Highlighter,
  Smile,
  Sparkles,
  List,
  ListOrdered,
  Quote,
  Type,
  ChevronDown,
  RotateCcw,
  Check
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
  { label: 'تلقائي (حسب الثيم)', value: 'inherit', bg: 'bg-slate-700 dark:bg-slate-300' },
  { label: 'أسود فحمي داكن', value: '#0f172a', bg: 'bg-slate-900' },
  { label: 'أزرق ملكي كلاسيك', value: '#2563eb', bg: 'bg-blue-600' },
  { label: 'أحمر ياقوتي مشرق', value: '#dc2626', bg: 'bg-red-600' },
  { label: 'أخضر زمردي جذاب', value: '#16a34a', bg: 'bg-emerald-600' },
  { label: 'بنفسجي أنيق ملكي', value: '#9333ea', bg: 'bg-purple-600' },
  { label: 'برتقالي حيوي مشرق', value: '#ea580c', bg: 'bg-orange-600' },
  { label: 'ذهبي ساطع مميز', value: '#d97706', bg: 'bg-amber-600' },
  { label: 'سماوي مائي منعش', value: '#0284c7', bg: 'bg-sky-600' },
];

const HIGHLIGHT_COLORS = [
  { label: 'بدون تظليل', value: 'transparent', bg: 'bg-slate-200 dark:bg-slate-700' },
  { label: 'أصفر فسفوري', value: '#fef08a', bg: 'bg-yellow-300' },
  { label: 'أخضر نعناعي', value: '#bbf7d0', bg: 'bg-green-300' },
  { label: 'سماوي مائي', value: '#bae6fd', bg: 'bg-sky-300' },
  { label: 'وردي لطيف', value: '#fbcfe8', bg: 'bg-pink-300' },
  { label: 'برتقالي ناعم', value: '#fed7aa', bg: 'bg-orange-300' },
];

const FONT_SIZES = [
  { label: 'صغير', value: '14px', tag: 'sm' },
  { label: 'عادي', value: '16px', tag: 'base' },
  { label: 'متوسط وواضح', value: '19px', tag: 'md' },
  { label: 'كبير ومميز', value: '23px', tag: 'lg' },
  { label: 'عنوان عريض', value: '28px', tag: 'xl' },
];

const STICKERS = [
  '🌟', '🎯', '💡', '🏆', '📖', '✍️', '🧠', '⚡', '🔔', '📌',
  '🚀', '⏳', '💯', '🎓', '🔥', '🌈', '🥇', '👑', '🪄', '✅',
  '❌', '⚠️', '❓', '🇬🇧', '🇺🇸', '🎉', '👏', '💪', '📚', '✨',
  '💎', '⭐', '📝', '👌', '❤️', '🤩'
];

const ANIMATION_EFFECTS = [
  { label: 'بدون تأثير (إلغاء الحركة)', value: '', previewClass: '' },
  { label: 'نبض هادئ (Pulse)', value: 'pulse-anim', previewClass: 'animate-pulse text-amber-500 font-bold' },
  { label: 'ارتداد لطيف (Bounce)', value: 'bounce-anim', previewClass: 'animate-bounce text-violet-500 font-bold' },
  { label: 'توهج ذهبي (Glow)', value: 'glow-anim', previewClass: 'text-amber-500 font-black' },
  { label: 'تموج ولمعان (Shimmer)', value: 'shimmer-anim', previewClass: 'text-pink-500 font-black' },
];

export default function RichTextEditor({
  id,
  value,
  onChange,
  placeholder = 'اكتب ملاحظاتك وأفكارك هنا بكل حرية مع تنسيق الخطوط والألوان والأنميشن مثل برنامج Word...',
  minHeight = 'min-h-[160px]',
  showStickers = true,
  showAnimations = true,
  className = '',
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);
  const [isFocused, setIsFocused] = useState(false);

  // Dropdowns state
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showFontSizePicker, setShowFontSizePicker] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [showAnimationPicker, setShowAnimationPicker] = useState(false);

  // Synchronize value into contentEditable without disrupting typing cursor
  useEffect(() => {
    if (!editorRef.current) return;
    if (isInternalChange.current) return;

    const currentHtml = editorRef.current.innerHTML;
    const cleanValue = value || '';

    if (currentHtml !== cleanValue) {
      editorRef.current.innerHTML = cleanValue;
    }
  }, [value]);

  // Emit change to parent
  const emitChange = useCallback(() => {
    if (!editorRef.current) return;
    isInternalChange.current = true;
    let html = editorRef.current.innerHTML;

    // Normalize empty states
    if (
      html === '<br>' ||
      html === '<p><br></p>' ||
      html === '<div><br></div>' ||
      html.trim() === ''
    ) {
      html = '';
    }

    onChange(html);
    setTimeout(() => {
      isInternalChange.current = false;
    }, 50);
  }, [onChange]);

  // Standard document.execCommand helper
  const execCommand = (command: string, arg?: string) => {
    if (typeof window === 'undefined') return;
    editorRef.current?.focus();
    document.execCommand(command, false, arg);
    emitChange();
  };

  // Safe wrapper for custom styles without losing selection
  const applyCustomWrapper = (buildElement: (selectedFragment: DocumentFragment) => HTMLElement) => {
    if (typeof window === 'undefined') return;
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);

    if (range.collapsed) {
      // No text selected: insert a temporary placeholder element that the user can immediately type into
      const fragment = document.createDocumentFragment();
      const elem = buildElement(fragment);
      if (!elem.textContent) {
        elem.textContent = 'نص جديد';
      }
      range.insertNode(elem);

      // Place cursor inside the new element
      selection.removeAllRanges();
      const newRange = document.createRange();
      newRange.selectNodeContents(elem);
      selection.addRange(newRange);
    } else {
      // Wrap the exact selected text
      const fragment = range.extractContents();
      const elem = buildElement(fragment);
      range.insertNode(elem);

      // Keep the element selected
      selection.removeAllRanges();
      const newRange = document.createRange();
      newRange.selectNodeContents(elem);
      selection.addRange(newRange);
    }

    emitChange();
  };

  // Color application (Live on screen, no code)
  const applyTextColor = (color: string) => {
    if (color === 'inherit') {
      execCommand('removeFormat');
      setShowColorPicker(false);
      return;
    }

    applyCustomWrapper((fragment) => {
      const span = document.createElement('span');
      span.style.color = color;
      if (fragment.childNodes.length > 0) {
        span.appendChild(fragment);
      } else {
        span.textContent = 'نص ملون';
      }
      return span;
    });

    setShowColorPicker(false);
  };

  // Highlight application
  const applyHighlight = (bg: string) => {
    if (bg === 'transparent') {
      execCommand('removeFormat');
      setShowHighlightPicker(false);
      return;
    }

    applyCustomWrapper((fragment) => {
      const span = document.createElement('span');
      span.style.backgroundColor = bg;
      span.style.color = '#0f172a'; // High contrast readable dark text
      span.style.padding = '2px 6px';
      span.style.borderRadius = '6px';
      if (fragment.childNodes.length > 0) {
        span.appendChild(fragment);
      } else {
        span.textContent = 'نص مظلل';
      }
      return span;
    });

    setShowHighlightPicker(false);
  };

  // Font size scaling
  const applyFontSize = (size: string, label: string) => {
    applyCustomWrapper((fragment) => {
      const span = document.createElement('span');
      span.style.fontSize = size;
      span.style.lineHeight = '1.4';
      if (fragment.childNodes.length > 0) {
        span.appendChild(fragment);
      } else {
        span.textContent = `نص ${label}`;
      }
      return span;
    });

    setShowFontSizePicker(false);
  };

  // Animation application (Live CSS animation running directly inside editor)
  const applyAnimation = (animClass: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    if (!animClass) {
      // Remove animation classes from surrounding parents
      const selection = window.getSelection();
      let parent = selection?.anchorNode?.parentElement;
      while (parent && parent !== editor) {
        if (
          parent.classList.contains('pulse-anim') ||
          parent.classList.contains('bounce-anim') ||
          parent.classList.contains('glow-anim') ||
          parent.classList.contains('shimmer-anim') ||
          parent.classList.contains('shine-anim')
        ) {
          parent.classList.remove('pulse-anim', 'bounce-anim', 'glow-anim', 'shimmer-anim', 'shine-anim');
          break;
        }
        parent = parent.parentElement;
      }
      emitChange();
      setShowAnimationPicker(false);
      return;
    }

    applyCustomWrapper((fragment) => {
      const span = document.createElement('span');
      span.className = animClass;
      span.style.display = 'inline-block';
      if (fragment.childNodes.length > 0) {
        span.appendChild(fragment);
      } else {
        span.textContent = 'نص متحرك';
      }
      return span;
    });

    setShowAnimationPicker(false);
  };

  // Insert sticker directly as unicode character
  const insertSticker = (sticker: string) => {
    execCommand('insertText', sticker + ' ');
    setShowStickerPicker(false);
  };

  // Reset/Clear formatting
  const handleClearFormatting = () => {
    execCommand('removeFormat');
    // Also remove inline styles if inside custom spans
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const text = range.toString();
      range.deleteContents();
      range.insertNode(document.createTextNode(text));
    }
    emitChange();
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handleDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.rich-editor-toolbar-dropdown')) {
        setShowColorPicker(false);
        setShowHighlightPicker(false);
        setShowFontSizePicker(false);
        setShowStickerPicker(false);
        setShowAnimationPicker(false);
      }
    };
    document.addEventListener('mousedown', handleDocClick);
    return () => document.removeEventListener('mousedown', handleDocClick);
  }, []);

  const hasContent = value && value.trim() !== '' && value !== '<br>' && value !== '<p><br></p>';

  return (
    <div
      id={id || 'rich-text-editor-container'}
      className={`border border-slate-200 dark:border-slate-800 rounded-3xl bg-white dark:bg-slate-950 overflow-hidden shadow-xs transition-all focus-within:ring-2 focus-within:ring-violet-500/40 focus-within:border-violet-500 ${className}`}
      dir="rtl"
    >
      {/* Top Visual Word-Style Toolbar */}
      <div className="bg-slate-50/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 p-2 sm:p-2.5 flex flex-wrap items-center gap-1.5 text-slate-700 dark:text-slate-300 select-none backdrop-blur-xs">
        
        {/* Core Formatting: B, I, U, S */}
        <div className="flex items-center bg-white dark:bg-slate-950 rounded-xl p-0.5 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              execCommand('bold');
            }}
            title="خط غامق وعريض (Bold)"
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-200 hover:text-violet-600 transition-colors"
          >
            <Bold className="w-4 h-4 stroke-[2.5]" />
          </button>

          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              execCommand('italic');
            }}
            title="خط مائل (Italic)"
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-200 hover:text-violet-600 transition-colors"
          >
            <Italic className="w-4 h-4" />
          </button>

          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              execCommand('underline');
            }}
            title="تسطير / خط تحت الكلمة (Underline)"
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-200 hover:text-violet-600 transition-colors"
          >
            <Underline className="w-4 h-4" />
          </button>

          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              execCommand('strikeThrough');
            }}
            title="شطب في المنتصف (Strikethrough)"
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-200 hover:text-violet-600 transition-colors"
          >
            <Strikethrough className="w-4 h-4" />
          </button>
        </div>

        {/* Font Size Dropdown */}
        <div className="relative rich-editor-toolbar-dropdown">
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              setShowFontSizePicker(!showFontSizePicker);
              setShowColorPicker(false);
              setShowHighlightPicker(false);
              setShowStickerPicker(false);
              setShowAnimationPicker(false);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-violet-400 transition-colors"
            title="تكبير وتصغير حجم الخط"
          >
            <Type className="w-3.5 h-3.5 text-violet-500" />
            <span>حجم الخط</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showFontSizePicker && (
            <div className="absolute top-full right-0 mt-1.5 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-1.5 w-40 space-y-1 animate-in fade-in zoom-in-95 duration-150">
              <div className="text-[10px] font-black text-slate-400 px-2 py-1">اختر الحجم:</div>
              {FONT_SIZES.map((size) => (
                <button
                  key={size.value}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    applyFontSize(size.value, size.label);
                  }}
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
        <div className="relative rich-editor-toolbar-dropdown">
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              setShowColorPicker(!showColorPicker);
              setShowFontSizePicker(false);
              setShowHighlightPicker(false);
              setShowStickerPicker(false);
              setShowAnimationPicker(false);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-violet-400 transition-colors"
            title="تلوين الكلمات (Font Colors)"
          >
            <Palette className="w-3.5 h-3.5 text-rose-500" />
            <span>لون النص</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showColorPicker && (
            <div className="absolute top-full right-0 mt-1.5 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-2.5 w-52 space-y-2 animate-in fade-in zoom-in-95 duration-150">
              <div className="text-[11px] font-black text-slate-500 dark:text-slate-400 px-1">
                تلوين الكلمات المحددة مباشرة:
              </div>
              <div className="grid grid-cols-3 gap-2">
                {TEXT_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      applyTextColor(c.value);
                    }}
                    title={c.label}
                    className="flex items-center gap-1.5 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-right transition-all group"
                  >
                    <span className={`w-5 h-5 rounded-lg ${c.bg} shrink-0 shadow-2xs border border-white dark:border-slate-700 group-hover:scale-110 transition-transform`} />
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate">
                      {c.label.split(' ')[0]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Highlighter Picker */}
        <div className="relative rich-editor-toolbar-dropdown">
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              setShowHighlightPicker(!showHighlightPicker);
              setShowColorPicker(false);
              setShowFontSizePicker(false);
              setShowStickerPicker(false);
              setShowAnimationPicker(false);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-violet-400 transition-colors"
            title="تظليل فسفوري للنص (Highlighter)"
          >
            <Highlighter className="w-3.5 h-3.5 text-amber-500" />
            <span>تظليل</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showHighlightPicker && (
            <div className="absolute top-full right-0 mt-1.5 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-2.5 w-48 space-y-2 animate-in fade-in zoom-in-95 duration-150">
              <div className="text-[11px] font-black text-slate-500 dark:text-slate-400 px-1">
                اختر لون التظليل:
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {HIGHLIGHT_COLORS.map((h) => (
                  <button
                    key={h.value}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      applyHighlight(h.value);
                    }}
                    title={h.label}
                    className="flex items-center gap-1.5 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-right group"
                  >
                    <span className={`w-5 h-5 rounded-lg ${h.bg} shrink-0 border border-slate-300 dark:border-slate-600 shadow-2xs group-hover:scale-110 transition-transform`} />
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">
                      {h.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Lists & Quotes */}
        <div className="flex items-center bg-white dark:bg-slate-950 rounded-xl p-0.5 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              execCommand('insertUnorderedList');
            }}
            title="قائمة نقطية"
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-200 transition-colors"
          >
            <List className="w-4 h-4" />
          </button>

          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              execCommand('insertOrderedList');
            }}
            title="قائمة رقمية مرتبة"
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-200 transition-colors"
          >
            <ListOrdered className="w-4 h-4" />
          </button>

          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              execCommand('formatBlock', 'blockquote');
            }}
            title="اقتباس أو تمييز ملحوظة"
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-200 transition-colors"
          >
            <Quote className="w-4 h-4" />
          </button>
        </div>

        {/* Stickers (ملصقات واستيكرز) */}
        {showStickers && (
          <div className="relative rich-editor-toolbar-dropdown">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setShowStickerPicker(!showStickerPicker);
                setShowColorPicker(false);
                setShowFontSizePicker(false);
                setShowHighlightPicker(false);
                setShowAnimationPicker(false);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl text-xs font-black text-amber-700 dark:text-amber-300 hover:scale-105 active:scale-95 transition-all shadow-2xs"
              title="إضافة ستيكرات وملصقات تشجيعية وتفاعلية"
            >
              <Smile className="w-3.5 h-3.5 text-amber-500" />
              <span>ستيكرات 🌟</span>
            </button>

            {showStickerPicker && (
              <div className="absolute top-full right-0 mt-1.5 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-3 w-64 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-150 custom-scrollbar">
                <div className="text-[11px] font-black text-slate-500 dark:text-slate-400 mb-2 px-1 flex items-center justify-between">
                  <span>ستيكرات تشجيعية</span>
                  <span className="text-[10px] text-amber-500 font-bold">اضغط لإدراج</span>
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {STICKERS.map((stk, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        insertSticker(stk);
                      }}
                      className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-amber-100 dark:hover:bg-amber-900/40 flex items-center justify-center text-lg transition-transform hover:scale-125"
                    >
                      {stk}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Visual Word-Style Animations (أنميشن الكلمات التفاعلي الحي) */}
        {showAnimations && (
          <div className="relative rich-editor-toolbar-dropdown">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setShowAnimationPicker(!showAnimationPicker);
                setShowColorPicker(false);
                setShowFontSizePicker(false);
                setShowHighlightPicker(false);
                setShowStickerPicker(false);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30 border border-violet-200 dark:border-violet-800/50 rounded-xl text-xs font-black text-violet-700 dark:text-violet-300 hover:scale-105 active:scale-95 transition-all shadow-2xs"
              title="تطبيق تأثيرات حركية حية للكلمات المحددة"
            >
              <Sparkles className="w-3.5 h-3.5 text-violet-500" />
              <span>أنميشن ✨</span>
            </button>

            {showAnimationPicker && (
              <div className="absolute top-full right-0 mt-1.5 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-2 w-52 space-y-1.5 animate-in fade-in zoom-in-95 duration-150">
                <div className="text-[11px] font-black text-slate-500 dark:text-slate-400 px-1 pb-1 border-b border-slate-100 dark:border-slate-800">
                  تأثير حي للكلمات المحددة:
                </div>
                {ANIMATION_EFFECTS.map((eff) => (
                  <button
                    key={eff.value}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      applyAnimation(eff.value);
                    }}
                    className="w-full text-right px-3 py-2 text-xs font-bold rounded-xl hover:bg-violet-50 dark:hover:bg-violet-950/40 text-slate-700 dark:text-slate-200 flex items-center justify-between transition-colors"
                  >
                    <span>{eff.label}</span>
                    {eff.previewClass && (
                      <span className={`text-[11px] ${eff.previewClass}`}>
                        Aa
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Clear Formatting Reset */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            handleClearFormatting();
          }}
          title="إزالة التنسيق وإرجاع النص عادي (Clear Formatting)"
          className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors mr-auto"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

      </div>

      {/* Main WYSIWYG Editable Canvas */}
      <div className="relative">
        <div
          ref={editorRef}
          contentEditable="true"
          suppressContentEditableWarning
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            emitChange();
          }}
          onInput={emitChange}
          className={`w-full p-4 text-slate-900 dark:text-white bg-transparent focus:outline-hidden font-medium text-base leading-relaxed ${minHeight} select-text overflow-y-auto`}
        />

        {/* Intelligent Placeholder Overlay */}
        {!hasContent && !isFocused && (
          <div
            onClick={() => {
              editorRef.current?.focus();
            }}
            className="absolute top-4 right-4 text-slate-400 dark:text-slate-500 pointer-events-none text-sm select-none font-medium leading-relaxed max-w-[90%]"
          >
            {placeholder}
          </div>
        )}
      </div>

      {/* Footer Status Tip */}
      <div className="px-4 py-2 bg-slate-50/70 dark:bg-slate-900/40 border-t border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-400 flex items-center justify-between select-none">
        <span className="flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5 text-emerald-500" />
          <span>محرر نصوص مرئي حي (تنسيق مباشر، ألوان، أنميشن بدون أي أكواد)</span>
        </span>
        <span className="font-mono">
          {hasContent ? `${value.replace(/<[^>]+>/g, '').length} حرف` : '0 حرف'}
        </span>
      </div>
    </div>
  );
}
