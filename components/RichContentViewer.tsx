'use client';

import React, { useMemo } from 'react';

interface RichContentViewerProps {
  content: string;
  className?: string;
}

export default function RichContentViewer({ content, className = '' }: RichContentViewerProps) {
  // Normalize and decode escaped HTML if any legacy escaped tags exist
  const processedHtml = useMemo(() => {
    if (!content) return '';

    let decoded = content;

    // Check if the content has escaped tags like &lt;span or &lt;strong
    if (decoded.includes('&lt;') && decoded.includes('&gt;')) {
      decoded = decoded
        .replace(/&lt;(\/?[a-z][a-z0-9]*[\s\S]*?)&gt;/gi, '<$1>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&');
    }

    return decoded;
  }, [content]);

  if (!content) return null;

  // Check if content contains valid HTML tags
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
