'use client';

import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';

export type AnnotationType = 'yellow' | 'green' | 'underline';

interface QuestionRichRendererProps {
  content?: string;
  html?: string;
  className?: string;
  dir?: 'ltr' | 'rtl';
  questionId?: string;
  onWordClick?: (wordKey: string, wordText: string) => void;
  onRangeAnnotate?: (wordKeys: string[], tool: AnnotationType | 'clear') => void;
  annotations?: Record<string, AnnotationType>;
  annotationTool?: 'none' | 'yellow' | 'green' | 'underline' | 'eraser';
  fontSizeClass?: string;
}

/**
 * Strips dangerous HTML tags while keeping safe typography and styling tags
 */
function sanitizeQuestionHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/on\w+\s*=\s*(["'][^"']*["']|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '');
}

interface ParsedToken {
  type: 'tag' | 'word' | 'space';
  raw: string;
  key?: string;
  wordIndex?: number;
}

export default function QuestionRichRenderer({
  content,
  html,
  className = '',
  dir = 'ltr',
  questionId,
  onWordClick,
  onRangeAnnotate,
  annotations = {},
  annotationTool = 'none',
  fontSizeClass = ''
}: QuestionRichRendererProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const rawText = html !== undefined ? html : (content || '');
  const sanitized = useMemo(() => sanitizeQuestionHtml(rawText), [rawText]);

  // Floating Selection Popup State (for touch & mouse selection)
  const [selectionPopup, setSelectionPopup] = useState<{
    visible: boolean;
    x: number;
    y: number;
    selectedKeys: string[];
  }>({
    visible: false,
    x: 0,
    y: 0,
    selectedKeys: []
  });

  // Tokenize the HTML / text into tags, interactive words, and spaces
  const tokens: ParsedToken[] = useMemo(() => {
    if (!sanitized) return [];
    const tokenRegex = /(<[^>]+>)|([^<>\s]+)|(\s+)/g;
    let match: RegExpExecArray | null;
    let wordIdx = 0;
    const result: ParsedToken[] = [];

    while ((match = tokenRegex.exec(sanitized)) !== null) {
      if (match[1]) {
        result.push({ type: 'tag', raw: match[1] });
      } else if (match[2]) {
        const cleanWord = match[2].replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '');
        const key = `w_${wordIdx}_${cleanWord || 'token'}`;
        result.push({ type: 'word', raw: match[2], key, wordIndex: wordIdx });
        wordIdx++;
      } else if (match[3]) {
        result.push({ type: 'space', raw: match[3] });
      }
    }
    return result;
  }, [sanitized]);

  // Handle Range Selection (Mouse Drag or Touch Selection on Mobile)
  const handleSelectionCheck = useCallback(() => {
    if (typeof window === 'undefined') return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) {
      // If clicked outside or selection collapsed, close popup
      setSelectionPopup((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      return;
    }

    const range = sel.getRangeAt(0);
    const container = containerRef.current;
    if (!container || !container.contains(range.commonAncestorContainer)) {
      setSelectionPopup((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      return;
    }

    // Find all word token elements within the selection range
    const wordElements = container.querySelectorAll<HTMLElement>('[data-token-key]');
    const matchedKeys: string[] = [];

    wordElements.forEach((el) => {
      try {
        if (sel.containsNode ? sel.containsNode(el, true) : false) {
          const k = el.getAttribute('data-token-key');
          if (k) matchedKeys.push(k);
        }
      } catch {
        // Fallback for older browsers
        const text = el.textContent || '';
        if (text && sel.toString().includes(text)) {
          const k = el.getAttribute('data-token-key');
          if (k) matchedKeys.push(k);
        }
      }
    });

    if (matchedKeys.length === 0) {
      setSelectionPopup((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      return;
    }

    // If an annotation tool is ALREADY active (e.g. Yellow Highlighter), apply it immediately!
    if (annotationTool === 'yellow' || annotationTool === 'green' || annotationTool === 'underline') {
      if (onRangeAnnotate) {
        onRangeAnnotate(matchedKeys, annotationTool);
      } else if (onWordClick) {
        matchedKeys.forEach((k) => onWordClick(k, ''));
      }
      sel.removeAllRanges();
      return;
    }

    if (annotationTool === 'eraser') {
      if (onRangeAnnotate) {
        onRangeAnnotate(matchedKeys, 'clear');
      }
      sel.removeAllRanges();
      return;
    }

    // Otherwise, show the floating mini action menu above the selection
    const rect = range.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    setSelectionPopup({
      visible: true,
      x: Math.max(10, rect.left - containerRect.left + rect.width / 2),
      y: Math.max(0, rect.top - containerRect.top - 44),
      selectedKeys: matchedKeys
    });
  }, [annotationTool, onRangeAnnotate, onWordClick]);

  // Listen for selection events on mouseup and touchend
  useEffect(() => {
    const handleMouseUpOrTouchEnd = () => {
      setTimeout(handleSelectionCheck, 60);
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mouseup', handleMouseUpOrTouchEnd);
      container.addEventListener('touchend', handleMouseUpOrTouchEnd);
    }

    return () => {
      if (container) {
        container.removeEventListener('mouseup', handleMouseUpOrTouchEnd);
        container.removeEventListener('touchend', handleMouseUpOrTouchEnd);
      }
    };
  }, [handleSelectionCheck]);

  const applyPopupAnnotation = (type: AnnotationType | 'clear') => {
    if (onRangeAnnotate && selectionPopup.selectedKeys.length > 0) {
      onRangeAnnotate(selectionPopup.selectedKeys, type);
    } else if (onWordClick && selectionPopup.selectedKeys.length > 0) {
      selectionPopup.selectedKeys.forEach((k) => onWordClick(k, ''));
    }
    setSelectionPopup({ visible: false, x: 0, y: 0, selectedKeys: [] });
    if (typeof window !== 'undefined') {
      window.getSelection()?.removeAllRanges();
    }
  };

  // Cursor style based on active tool
  const cursorStyle = useMemo(() => {
    if (annotationTool === 'yellow' || annotationTool === 'green') return 'cursor-text';
    if (annotationTool === 'underline') return 'cursor-pointer';
    if (annotationTool === 'eraser') return 'cursor-pointer';
    return 'cursor-auto';
  }, [annotationTool]);

  return (
    <span
      ref={containerRef}
      dir={dir}
      data-question-id={questionId}
      className={`relative inline-block max-w-full select-text leading-relaxed ${cursorStyle} ${fontSizeClass} ${className}`}
    >
      {/* Floating Action Menu for Text Selection (Touch & Desktop) */}
      {selectionPopup.visible && (
        <span
          className="absolute z-40 -translate-x-1/2 flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-900/95 dark:bg-slate-800/95 text-white shadow-xl backdrop-blur-md border border-slate-700 animate-in fade-in zoom-in-95 select-none"
          style={{ left: `${selectionPopup.x}px`, top: `${selectionPopup.y}px` }}
          dir="rtl"
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              applyPopupAnnotation('yellow');
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs shadow-xs transition-transform active:scale-95"
            title="تظليل أصفر"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-amber-600" />
            <span>أصفر</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              applyPopupAnnotation('green');
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-400 hover:bg-emerald-500 text-slate-950 font-black text-xs shadow-xs transition-transform active:scale-95"
            title="تظليل أخضر"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-emerald-600" />
            <span>أخضر</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              applyPopupAnnotation('underline');
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-xs transition-transform active:scale-95"
            title="وضع خط"
          >
            <span className="underline font-black text-xs">U</span>
            <span>تسطير</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              applyPopupAnnotation('clear');
            }}
            className="px-2 py-1 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-xs transition-colors"
            title="إلغاء التظليل"
          >
            مسح
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectionPopup({ visible: false, x: 0, y: 0, selectedKeys: [] });
            }}
            className="px-1.5 py-1 text-slate-400 hover:text-white text-xs"
          >
            ✕
          </button>
        </span>
      )}

      {/* Render Tokens */}
      {tokens.map((token, idx) => {
        if (token.type === 'space') {
          return token.raw;
        }

        if (token.type === 'tag') {
          return (
            <span
              key={`tag_${idx}`}
              dangerouslySetInnerHTML={{ __html: token.raw }}
            />
          );
        }

        const key = token.key || `w_${idx}`;
        const anno = annotations[key];

        let annoClass = '';
        if (anno === 'yellow') {
          annoClass = 'bg-amber-300 dark:bg-amber-400 text-slate-950 font-bold rounded-sm px-1 py-0.5 shadow-xs';
        } else if (anno === 'green') {
          annoClass = 'bg-emerald-300 dark:bg-emerald-400 text-slate-950 font-bold rounded-sm px-1 py-0.5 shadow-xs';
        } else if (anno === 'underline') {
          annoClass = 'underline decoration-indigo-600 dark:decoration-indigo-400 decoration-2 underline-offset-4 font-bold';
        }

        const isInteractive = annotationTool !== 'none';

        return (
          <span
            key={key}
            data-token-key={key}
            onClick={(e) => {
              if (isInteractive && onWordClick) {
                e.stopPropagation();
                onWordClick(key, token.raw);
              }
            }}
            className={`transition-colors select-text inline-block ${annoClass} ${
              isInteractive
                ? 'cursor-pointer hover:ring-2 hover:ring-indigo-400/50 hover:bg-slate-100 dark:hover:bg-slate-800 rounded px-0.5'
                : ''
            }`}
          >
            {token.raw}
          </span>
        );
      })}
    </span>
  );
}
