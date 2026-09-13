'use client';

import React, { useMemo, useEffect, useRef, useCallback } from 'react';

export type AnnotationType = 'yellow' | 'green' | 'underline';

interface QuestionRichRendererProps {
  content?: string;
  html?: string;
  className?: string;
  dir?: 'ltr' | 'rtl';
  questionId?: string;
  onWordClick?: (wordKey: string, wordText: string) => void;
  onRangeAnnotate?: (wordKeys: string[], tool: AnnotationType | 'clear') => void;
  onSelectionChange?: (questionId: string, wordKeys: string[]) => void;
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
  onSelectionChange,
  annotations = {},
  annotationTool = 'none',
  fontSizeClass = ''
}: QuestionRichRendererProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const rawText = html !== undefined ? html : (content || '');
  const sanitized = useMemo(() => sanitizeQuestionHtml(rawText), [rawText]);

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
    const container = containerRef.current;
    if (!sel || sel.isCollapsed || !sel.rangeCount || !container) {
      return;
    }

    const range = sel.getRangeAt(0);
    // Only process if selection touches this container
    const isInside = container.contains(range.commonAncestorContainer) ||
      (range.intersectsNode && range.intersectsNode(container));

    if (!isInside) return;

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
        const text = el.textContent || '';
        if (text && sel.toString().includes(text)) {
          const k = el.getAttribute('data-token-key');
          if (k) matchedKeys.push(k);
        }
      }
    });

    if (matchedKeys.length === 0) return;

    // If an annotation tool is ALREADY active (e.g. Yellow Highlighter), apply it immediately!
    if (annotationTool === 'yellow' || annotationTool === 'green' || annotationTool === 'underline') {
      if (onRangeAnnotate) {
        onRangeAnnotate(matchedKeys, annotationTool);
      } else if (onWordClick) {
        matchedKeys.forEach((k) => onWordClick(k, ''));
      }
      sel.removeAllRanges();
      if (questionId && onSelectionChange) onSelectionChange(questionId, []);
      return;
    }

    if (annotationTool === 'eraser') {
      if (onRangeAnnotate) {
        onRangeAnnotate(matchedKeys, 'clear');
      }
      sel.removeAllRanges();
      if (questionId && onSelectionChange) onSelectionChange(questionId, []);
      return;
    }

    // When no tool is active, record the selected keys quietly without showing any popup!
    // The student can then look up at the fixed toolbar and choose a color to apply cleanly.
    if (questionId && onSelectionChange) {
      onSelectionChange(questionId, matchedKeys);
    }
  }, [annotationTool, onRangeAnnotate, onSelectionChange, onWordClick, questionId]);

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
