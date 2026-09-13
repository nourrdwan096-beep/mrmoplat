'use client';

import React from 'react';

interface ExamWatermarkProps {
  fullName?: string;
  phone?: string;
  sessionTag?: string;
}

/**
 * Subtle repeating diagonal watermark across the main exam page canvas
 */
export function ExamCanvasWatermark({ fullName, phone, sessionTag }: ExamWatermarkProps) {
  const name = fullName || 'طالب منصة مستر محمد رضوان';
  const tel = phone || '01552191172';
  const tag = sessionTag || 'MR. MOHAMED RADWAN SECURE SYSTEM';

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none opacity-[0.032] dark:opacity-[0.048] flex flex-wrap gap-20 p-8 text-xs font-mono font-black text-slate-950 dark:text-white"
    >
      {Array.from({ length: 24 }).map((_, idx) => (
        <div key={idx} className="-rotate-12 whitespace-nowrap tracking-widest">
          {name} • {tel} • {tag}
        </div>
      ))}
    </div>
  );
}

/**
 * Subtle repeating watermark placed directly inside question and passage cards.
 * When a student photographs the screen with a mobile phone, the camera's sensor
 * contrast and sharpening immediately reveals the student's name and phone number,
 * preventing any exam leakage!
 */
export function ExamCardWatermark({ fullName, phone }: ExamWatermarkProps) {
  const name = fullName || 'طالب منصة مستر محمد رضوان';
  const tel = phone || '01552191172';

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden select-none opacity-[0.038] dark:opacity-[0.058] flex flex-wrap gap-12 p-4 text-[11px] font-mono font-black text-slate-900 dark:text-slate-100"
    >
      {Array.from({ length: 8 }).map((_, idx) => (
        <div key={idx} className="-rotate-12 whitespace-nowrap tracking-wider">
          {name} • {tel} • منصة مستر محمد رضوان
        </div>
      ))}
    </div>
  );
}

/**
 * Micro security imprint stamped on the edge of each question.
 * Even if an image is cropped down to a single question line, this footprint reveals the identity!
 */
export function ExamMicroFingerprint({ fullName, phone, questionId }: ExamWatermarkProps & { questionId: string }) {
  const name = fullName || 'طالب منصة مستر محمد رضوان';
  const tel = phone || '01552191172';
  const shortId = (questionId || '').replace(/-/g, '').slice(0, 8);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none select-none text-[9px] font-mono font-medium text-slate-400/40 dark:text-slate-500/40 tracking-wider text-left"
      dir="ltr"
    >
      SEC-HASH: {shortId} • ID: {name} • TEL: {tel} • MR-RADWAN
    </div>
  );
}
