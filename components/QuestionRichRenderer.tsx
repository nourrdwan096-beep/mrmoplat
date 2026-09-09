'use client';

import React, { useMemo } from 'react';

interface QuestionRichRendererProps {
  content?: string;
  html?: string;
  className?: string;
  dir?: 'ltr' | 'rtl';
  onWordClick?: (wordKey: string) => void;
  annotations?: Record<string, 'yellow' | 'green' | 'underline'>;
  annotationTool?: 'none' | 'yellow' | 'green' | 'underline';
}

/**
 * Strips dangerous HTML tags while keeping safe typography and styling tags:
 * b, strong, i, em, u, s, span, font, p, div, br, sub, sup
 */
function sanitizeQuestionHtml(html: string): string {
  if (!html) return '';

  // Remove script, iframe, object, embed, form, input, button tags and event handlers (e.g. onclick=)
  let clean = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/on\w+\s*=\s*(["'][^"']*["']|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '');

  return clean;
}

/**
 * Checks if a string contains HTML tags
 */
export function hasHtmlTags(str: string): boolean {
  if (!str) return false;
  return /<[a-z][\s\S]*>/i.test(str);
}

export default function QuestionRichRenderer({
  content,
  html,
  className = '',
  dir = 'ltr',
  onWordClick,
  annotations = {},
  annotationTool = 'none'
}: QuestionRichRendererProps) {
  const rawText = html !== undefined ? html : (content || '');
  const sanitized = useMemo(() => sanitizeQuestionHtml(rawText), [rawText]);
  const isHtml = useMemo(() => hasHtmlTags(sanitized), [sanitized]);

  // If there are NO student annotations active and the content is HTML:
  // Render via dangerouslySetInnerHTML (fully sanitized)
  if (isHtml && (!onWordClick || Object.keys(annotations).length === 0)) {
    return (
      <span
        dir={dir}
        className={`question-rich-content inline-block max-w-full select-text leading-relaxed ${className}`}
        dangerouslySetInnerHTML={{ __html: sanitized }}
      />
    );
  }

  // If student annotations are applied or interacting:
  // If plain text or interactive text chunks:
  const words = (content || '').split(/(\s+)/);

  return (
    <span dir={dir} className={`inline-block max-w-full select-text leading-relaxed ${className}`}>
      {words.map((chunk, idx) => {
        if (!chunk.trim()) return chunk; // preserve spaces
        const key = `w_${idx}_${chunk.replace(/[^a-zA-Z0-9]/g, '')}`;
        const anno = annotations[key];

        let annoClass = '';
        if (anno === 'yellow') {
          annoClass = 'bg-amber-300 text-slate-950 dark:bg-amber-400 dark:text-slate-950 font-black rounded px-1 py-0.5 shadow-xs';
        } else if (anno === 'green') {
          annoClass = 'bg-emerald-300 text-slate-950 dark:bg-emerald-400 dark:text-slate-950 font-black rounded px-1 py-0.5 shadow-xs';
        } else if (anno === 'underline') {
          annoClass = 'underline decoration-indigo-500 decoration-2 underline-offset-4 font-black';
        }

        // Check if chunk contains HTML
        if (hasHtmlTags(chunk)) {
          return (
            <span
              key={idx}
              onClick={() => onWordClick && onWordClick(key)}
              className={`transition-colors cursor-pointer select-text ${annoClass} ${
                annotationTool !== 'none' ? 'hover:bg-slate-200 dark:hover:bg-slate-800 rounded' : ''
              }`}
              dangerouslySetInnerHTML={{ __html: sanitizeQuestionHtml(chunk) }}
            />
          );
        }

        return (
          <span
            key={idx}
            onClick={() => onWordClick && onWordClick(key)}
            className={`transition-colors cursor-pointer select-text ${annoClass} ${
              annotationTool !== 'none' ? 'hover:bg-slate-200 dark:hover:bg-slate-800 rounded' : ''
            }`}
          >
            {chunk}
          </span>
        );
      })}
    </span>
  );
}
