'use client';

import React, { useMemo } from 'react';
import { parseRichContent } from '@/lib/richTextParser';

interface RichContentViewerProps {
  content: string;
  className?: string;
}

export default function RichContentViewer({ content, className = '' }: RichContentViewerProps) {
  // Parse, decode, and transform any shortcodes/BBCode/HTML into safe rich text
  const processedHtml = useMemo(() => {
    return parseRichContent(content);
  }, [content]);

  if (!content) return null;

  // Check if content contains valid HTML tags after parsing
  const hasHtml = /<[a-z][\s\S]*>/i.test(processedHtml);

  if (hasHtml) {
    return (
      <div
        className={`rich-content-viewer font-medium leading-relaxed break-words space-y-2 select-text ${className}`}
        dangerouslySetInnerHTML={{ __html: processedHtml }}
      />
    );
  }

  // Otherwise render plain text with preserved linebreaks
  return (
    <div className={`whitespace-pre-line font-medium leading-relaxed break-words select-text ${className}`}>
      {content}
    </div>
  );
}
