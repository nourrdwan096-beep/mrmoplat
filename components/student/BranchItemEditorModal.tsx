'use client';

import React, { useState } from 'react';
import { X, Check, Palette, Highlighter, Bold, Underline, RotateCcw } from 'lucide-react';
import {
  BranchPriority,
  HIGHLIGHT_COLORS,
  INK_COLORS,
  MindMapBranchItem,
  WordStyleRule,
} from './mindMapCatalog';
import { StyledBranchText } from './MindMapBranchRenderer';

interface BranchItemEditorModalProps {
  isOpen: boolean;
  item: MindMapBranchItem | null;
  subjectName: string;
  onClose: () => void;
  onSave: (updated: MindMapBranchItem) => void;
}

export default function BranchItemEditorModal({
  isOpen,
  item,
  subjectName,
  onClose,
  onSave,
}: BranchItemEditorModalProps) {
  const [text, setText] = useState(item?.text || '');
  const [lineColor, setLineColor] = useState(item?.lineColor || '');
  const [lineHighlight, setLineHighlight] = useState(item?.lineHighlight || '');
  const [bold, setBold] = useState(Boolean(item?.bold));
  const [priority, setPriority] = useState<BranchPriority>(item?.priority || 'normal');
  const [wordStyles, setWordStyles] = useState<WordStyleRule[]>(
    item?.wordStyles || []
  );
  const [selectedWordIndex, setSelectedWordIndex] = useState<number | null>(null);

  if (!isOpen || !item) return null;

  const words = text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);

  const selectedRule =
    selectedWordIndex !== null
      ? wordStyles.find((w) => w.index === selectedWordIndex)
      : undefined;

  const updateWordRule = (
    idx: number,
    patch: Partial<Omit<WordStyleRule, 'index'>>
  ) => {
    setWordStyles((prev) => {
      const existing = prev.find((r) => r.index === idx);
      if (!existing) {
        return [...prev, { index: idx, ...patch }];
      }
      return prev.map((r) => (r.index === idx ? { ...r, ...patch } : r));
    });
  };

  const previewItem: MindMapBranchItem = {
    ...item,
    text,
    priority,
    lineColor: lineColor || undefined,
    lineHighlight: lineHighlight || undefined,
    bold,
    wordStyles,
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSave({
      ...previewItem,
      text: text.trim(),
    });
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto"
      dir="rtl"
    >
      <form
        onSubmit={handleSave}
        className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5"
      >
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              تعديل وتلوين البند — {subjectName}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              لوّن السطر بالكامل أو اضغط على أي كلمة لتلوينها أو تظليلها منفردة قبل الطباعة
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Preview Strip */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
          <div className="text-[11px] font-bold text-slate-400 mb-1.5">
            معاينة مباشرة لشكل الكلمات عند الطباعة:
          </div>
          <div className="text-base text-slate-900 dark:text-white">
            <StyledBranchText item={previewItem} />
          </div>
        </div>

        {/* Text Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-black text-slate-700 dark:text-slate-300">
            نص البند أو الدرس (عربي أو إنجليزي)
          </label>
          <input
            type="text"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setSelectedWordIndex(null);
            }}
            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
            required
          />
        </div>

        {/* Priority Selector */}
        <div className="space-y-1.5">
          <span className="text-xs font-black text-slate-700 dark:text-slate-300 block">
            أولوية البند في المذاكرة
          </span>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: 'normal', label: 'عادي' },
                { id: 'high', label: 'مهم جداً' },
                { id: 'quick', label: 'مراجعة سريعة' },
              ] as { id: BranchPriority; label: string }[]
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setPriority(opt.id)}
                className={`py-2 px-3 rounded-xl text-xs font-black border transition-colors ${
                  priority === opt.id
                    ? opt.id === 'high'
                      ? 'bg-rose-600 text-white border-rose-600'
                      : opt.id === 'quick'
                      ? 'bg-amber-500 text-slate-950 border-amber-500'
                      : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Whole-line Styling */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Palette className="w-4 h-4 text-emerald-500" />
              <span>تنسيق السطر بالكامل</span>
            </span>
            <button
              type="button"
              onClick={() => setBold((b) => !b)}
              className={`px-3 py-1 rounded-lg text-xs font-black flex items-center gap-1 border transition-colors ${
                bold
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              <Bold className="w-3.5 h-3.5" />
              <span>عريض</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 ml-1">لون الحبر:</span>
            {INK_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setLineColor(c.value)}
                title={c.label}
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-transform ${
                  lineColor === c.value
                    ? 'scale-110 ring-2 ring-emerald-500 border-white dark:border-slate-900'
                    : 'border-slate-300 dark:border-slate-600'
                }`}
                style={{
                  backgroundColor: c.value || '#64748b',
                }}
              >
                {c.value === '' && (
                  <span className="text-[9px] font-black text-white">ت</span>
                )}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 ml-1 flex items-center gap-1">
              <Highlighter className="w-3.5 h-3.5" /> تظليل السطر:
            </span>
            {HIGHLIGHT_COLORS.map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => setLineHighlight(h.value)}
                title={h.label}
                className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-transform ${
                  lineHighlight === h.value
                    ? 'scale-110 ring-2 ring-emerald-500 border-slate-900 dark:border-white'
                    : 'border-slate-300 dark:border-slate-600'
                }`}
                style={{
                  backgroundColor: h.value || 'transparent',
                }}
              >
                {h.value === '' && (
                  <X className="w-3 h-3 text-slate-400" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Per-Word Coloring */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-black text-slate-700 dark:text-slate-300">
              تلوين كلمة محددة (اضغط على الكلمة لتحديدها):
            </span>
            {wordStyles.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setWordStyles([]);
                  setSelectedWordIndex(null);
                }}
                className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>مسح تلوين الكلمات</span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {words.map((w, idx) => {
              const rule = wordStyles.find((r) => r.index === idx);
              const isSelected = selectedWordIndex === idx;
              return (
                <button
                  key={`${w}-${idx}`}
                  type="button"
                  onClick={() =>
                    setSelectedWordIndex(isSelected ? null : idx)
                  }
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                    isSelected
                      ? 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                  }`}
                  style={{
                    color: rule?.color || undefined,
                    backgroundColor: rule?.highlight || undefined,
                    textDecoration: rule?.underline ? 'underline' : undefined,
                  }}
                >
                  {w}
                </button>
              );
            })}
          </div>

          {selectedWordIndex !== null && (
            <div className="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                  تنسيق كلمة: &ldquo;{words[selectedWordIndex]}&rdquo;
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      updateWordRule(selectedWordIndex, {
                        bold: !selectedRule?.bold,
                      })
                    }
                    className={`px-2 py-1 rounded-md text-[11px] font-black border ${
                      selectedRule?.bold
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <Bold className="w-3 h-3 inline ml-1" />
                    عريض
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateWordRule(selectedWordIndex, {
                        underline: !selectedRule?.underline,
                      })
                    }
                    className={`px-2 py-1 rounded-md text-[11px] font-black border ${
                      selectedRule?.underline
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <Underline className="w-3 h-3 inline ml-1" />
                    تحتها خط
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500">لون الكلمة:</span>
                {INK_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() =>
                      updateWordRule(selectedWordIndex, { color: c.value || undefined })
                    }
                    title={c.label}
                    className={`w-5 h-5 rounded-full border-2 ${
                      (selectedRule?.color || '') === c.value
                        ? 'ring-2 ring-emerald-500 scale-110'
                        : 'border-slate-300 dark:border-slate-600'
                    }`}
                    style={{ backgroundColor: c.value || '#64748b' }}
                  />
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500">تظليل الكلمة:</span>
                {HIGHLIGHT_COLORS.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() =>
                      updateWordRule(selectedWordIndex, {
                        highlight: h.value || undefined,
                      })
                    }
                    title={h.label}
                    className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                      (selectedRule?.highlight || '') === h.value
                        ? 'ring-2 ring-emerald-500 scale-110'
                        : 'border-slate-300 dark:border-slate-600'
                    }`}
                    style={{ backgroundColor: h.value || 'transparent' }}
                  >
                    {h.value === '' && <X className="w-2.5 h-2.5 text-slate-400" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-black"
          >
            إلغاء
          </button>
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>حفظ التنسيق</span>
          </button>
        </div>
      </form>
    </div>
  );
}
