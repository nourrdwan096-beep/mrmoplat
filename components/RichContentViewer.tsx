'use client';

import React from 'react';

interface RichContentViewerProps {
  content: string;
  className?: string;
}

export default function RichContentViewer({ content, className = '' }: RichContentViewerProps) {
  if (!content) return null;

  // If content contains standard HTML tags like <span>, <strong>, <u>, <em>, <del>, <blockquote>
  const hasHtml = /<[a-z][\s\S]*>/i.test(content);

  if (hasHtml) {
    return (
      <div
        className={`rich-content-viewer font-medium leading-relaxed break-words ${className}`}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  // Otherwise render plain text with preserved linebreaks
  return (
    <div className={`whitespace-pre-line font-medium leading-relaxed break-words ${className}`}>
      {content}
    </div>
  );
}
