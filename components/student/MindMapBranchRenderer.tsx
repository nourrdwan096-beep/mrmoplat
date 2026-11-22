'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Palette,
  Edit3,
  Check,
  X,
  ArrowUp,
  ArrowDown,
  CalendarPlus,
} from 'lucide-react';
import {
  MindMapBranchItem,
  MindMapShape,
  MindMapSubjectNode,
  getPaletteById,
} from './mindMapCatalog';

const SCHEDULE_DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

interface StyledBranchTextProps {
  item: MindMapBranchItem;
}

export function StyledBranchText({ item }: StyledBranchTextProps) {
  const tokens = item.text.split(/(\s+)/);
  let wordCounter = -1;

  return (
    <span
      className={`leading-relaxed break-words ${
        item.bold ? 'font-extrabold' : 'font-semibold'
      } ${item.completed ? 'line-through opacity-60' : ''}`}
      style={{
        color: item.lineColor || undefined,
        backgroundColor: item.lineHighlight || undefined,
        padding: item.lineHighlight ? '1px 6px' : undefined,
        borderRadius: item.lineHighlight ? '6px' : undefined,
      }}
    >
      {tokens.map((token, rawIdx) => {
        if (/^\s+$/.test(token)) {
          return <React.Fragment key={rawIdx}>{token}</React.Fragment>;
        }
        wordCounter += 1;
        const rule = item.wordStyles?.find((w) => w.index === wordCounter);
        if (!rule) {
          return <React.Fragment key={rawIdx}>{token}</React.Fragment>;
        }

        const resolvedColor = rule.color
          ? rule.color
          : rule.highlight
          ? '#0f172a'
          : undefined;

        return (
          <span
            key={rawIdx}
            style={{
              color: resolvedColor,
              backgroundColor: rule.highlight || undefined,
              fontWeight: rule.bold ? 800 : undefined,
              textDecoration: rule.underline ? 'underline' : undefined,
              padding: rule.highlight ? '0 5px' : undefined,
              borderRadius: rule.highlight ? '5px' : undefined,
            }}
          >
            {token}
          </span>
        );
      })}
    </span>
  );
}

interface SubjectNodeCardProps {
  subject: MindMapSubjectNode;
  shape: MindMapShape;
  stepIndex?: number;
  showCheckboxesInPrint: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveSubject?: (subjectId: string, direction: 'up' | 'down') => void;
  onAddBranchItem: (subjectId: string, text: string) => void;
  onToggleBranchItem: (subjectId: string, itemId: string) => void;
  onDeleteBranchItem: (subjectId: string, itemId: string) => void;
  onSendItemToSchedule?: (subject: MindMapSubjectNode, item: MindMapBranchItem, dayIndex: number) => void;
  onOpenItemStyler: (subjectId: string, item: MindMapBranchItem) => void;
  onEditSubject: (subject: MindMapSubjectNode) => void;
  onDeleteSubject: (subject: MindMapSubjectNode) => void;
  registerCardRef: (subjectId: string, el: HTMLDivElement | null) => void;
}

export function SubjectNodeCard({
  subject,
  shape,
  stepIndex,
  showCheckboxesInPrint,
  canMoveUp,
  canMoveDown,
  onMoveSubject,
  onAddBranchItem,
  onToggleBranchItem,
  onDeleteBranchItem,
  onSendItemToSchedule,
  onOpenItemStyler,
  onEditSubject,
  onDeleteSubject,
  registerCardRef,
}: SubjectNodeCardProps) {
  const palette = getPaletteById(subject.colorId);
  const [newBranchText, setNewBranchText] = useState('');
  const [isAddingInline, setIsAddingInline] = useState(false);
  const [schedulePopoverItemId, setSchedulePopoverItemId] = useState<string | null>(null);

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newBranchText.trim();
    if (!cleaned) return;
    onAddBranchItem(subject.id, cleaned);
    setNewBranchText('');
  };

  const completedCount = subject.items.filter((it) => it.completed).length;
  const totalCount = subject.items.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Shape-specific container styles
  const containerClasses =
    shape === 'sketchbook'
      ? `rounded-3xl border-2 border-dashed ${palette.borderClass} bg-white/95 dark:bg-slate-900/95 shadow-sm`
      : shape === 'organic_clouds'
      ? `rounded-[2rem] border-2 ${palette.borderClass} ${palette.softBg} shadow-sm`
      : shape === 'formal_sheet' || shape === 'kanban_board'
      ? `rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs`
      : shape === 'timeline_roadmap'
      ? `rounded-2xl border ${palette.borderClass} bg-white dark:bg-slate-900 shadow-sm`
      : `rounded-2xl border ${palette.borderClass} bg-white/95 dark:bg-slate-900/95 shadow-sm`;

  const headerClasses =
    shape === 'organic_clouds'
      ? `${palette.headerBg} rounded-[1.4rem] px-4 py-2.5 shadow-sm`
      : shape === 'sketchbook'
      ? `${palette.headerBg} rounded-2xl px-4 py-2.5 border border-slate-900/15`
      : shape === 'formal_sheet'
      ? `px-4 py-2.5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 rounded-t-2xl`
      : shape === 'kanban_board'
      ? `px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 rounded-t-2xl`
      : `${palette.headerBg} rounded-xl px-4 py-2.5`;

  const isLightHeader = shape === 'formal_sheet' || shape === 'kanban_board';

  return (
    <div
      ref={(el) => registerCardRef(subject.id, el)}
      className={`${containerClasses} p-3.5 transition-all duration-200 relative group break-inside-avoid flex flex-col justify-between`}
      style={{
        borderTopWidth: shape === 'formal_sheet' || shape === 'kanban_board' ? '4px' : undefined,
        borderTopColor: shape === 'formal_sheet' || shape === 'kanban_board' ? palette.hex : undefined,
      }}
    >
      <div>
        {/* Subject Header */}
        <div className={`${headerClasses} flex items-center justify-between gap-2 mb-3`}>
          <div className="flex items-center gap-2 min-w-0">
            {shape === 'timeline_roadmap' && typeof stepIndex === 'number' && (
              <span className="w-6 h-6 rounded-lg bg-white/25 text-white text-[11px] font-black flex items-center justify-center tabular-nums shrink-0">
                {String(stepIndex + 1).padStart(2, '0')}
              </span>
            )}
            <span className="text-xl leading-none shrink-0" aria-hidden="true">
              {subject.emoji}
            </span>
            <h4
              className={`text-base font-black truncate ${
                isLightHeader ? 'text-slate-900 dark:text-white' : 'text-white'
              }`}
            >
              {subject.name}
            </h4>
          </div>

          <div className="flex items-center gap-1 shrink-0 no-print">
            {onMoveSubject && canMoveUp && (
              <button
                type="button"
                onClick={() => onMoveSubject(subject.id, 'up')}
                title="تقديم المادة"
                className={`p-1 rounded-lg transition-colors opacity-80 hover:opacity-100 ${
                  isLightHeader
                    ? 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                    : 'text-white/90 hover:bg-white/20'
                }`}
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
            )}
            {onMoveSubject && canMoveDown && (
              <button
                type="button"
                onClick={() => onMoveSubject(subject.id, 'down')}
                title="تأخير المادة"
                className={`p-1 rounded-lg transition-colors opacity-80 hover:opacity-100 ${
                  isLightHeader
                    ? 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                    : 'text-white/90 hover:bg-white/20'
                }`}
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsAddingInline((prev) => !prev)}
              title="إضافة فرع جديد للمادة"
              className={`p-1.5 rounded-lg transition-colors ${
                isLightHeader
                  ? 'bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-emerald-500 hover:text-white'
                  : 'bg-white/20 hover:bg-white/30 text-white'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onEditSubject(subject)}
              title="تعديل اسم المادة أو الإيموجي أو اللون"
              className={`p-1.5 rounded-lg transition-colors ${
                isLightHeader
                  ? 'bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-blue-500 hover:text-white'
                  : 'bg-white/20 hover:bg-white/30 text-white'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDeleteSubject(subject)}
              title="حذف المادة من الخريطة"
              className={`p-1.5 rounded-lg transition-colors ${
                isLightHeader
                  ? 'bg-slate-200/80 dark:bg-slate-700 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white'
                  : 'bg-white/20 hover:bg-rose-600 text-white'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Branch Items List */}
        <div className="space-y-1.5">
          {subject.items.length === 0 ? (
            <button
              type="button"
              onClick={() => setIsAddingInline(true)}
              className="w-full py-3.5 px-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-500 dark:text-slate-400 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors text-center no-print-border"
            >
              + أضف أول فرع أو درس لهذه المادة
            </button>
          ) : (
            subject.items.map((item) => (
              <div key={item.id} className="space-y-1">
                <div className="flex items-start justify-between gap-2 px-2.5 py-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors group/item">
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => onToggleBranchItem(subject.id, item.id)}
                      className={`mt-1 shrink-0 transition-transform active:scale-90 ${
                        !showCheckboxesInPrint ? 'no-print' : ''
                      }`}
                      title={item.completed ? 'تحديد كغير مكتمل' : 'تحديد كمكتمل'}
                    >
                      {item.completed ? (
                        <CheckCircle2
                          className="w-4 h-4"
                          style={{ color: palette.hex }}
                        />
                      ) : (
                        <Circle
                          className="w-4 h-4 opacity-70"
                          style={{ color: palette.hex }}
                        />
                      )}
                    </button>

                    {!showCheckboxesInPrint && (
                      <span
                        className="hidden print:inline-block mt-2 w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: palette.hex }}
                      />
                    )}

                    <div className="flex-1 min-w-0">
                      <div
                        onClick={() => onOpenItemStyler(subject.id, item)}
                        className="text-sm text-slate-800 dark:text-slate-100 cursor-pointer"
                        title="اضغط لتعديل النص أو تلوين كلمات محددة"
                      >
                        <StyledBranchText item={item} />
                      </div>
                      {(item.priority === 'high' ||
                        item.priority === 'quick' ||
                        typeof item.scheduledDay === 'number') && (
                        <div className="flex items-center gap-2 text-[10px] font-bold mt-0.5 text-slate-500 dark:text-slate-400">
                          {item.priority === 'high' && (
                            <span className="text-rose-600 dark:text-rose-400">مهم جداً</span>
                          )}
                          {item.priority === 'quick' && (
                            <span className="text-amber-600 dark:text-amber-400">مراجعة سريعة</span>
                          )}
                          {typeof item.scheduledDay === 'number' && (
                            <>
                              {(item.priority === 'high' || item.priority === 'quick') && (
                                <span aria-hidden="true">·</span>
                              )}
                              <span className="text-emerald-600 dark:text-emerald-400">
                                في جدول {SCHEDULE_DAYS[item.scheduledDay] || 'المذاكرة'}
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover/item:opacity-100 transition-opacity shrink-0 no-print">
                    {onSendItemToSchedule && (
                      <button
                        type="button"
                        onClick={() =>
                          setSchedulePopoverItemId((prev) =>
                            prev === item.id ? null : item.id
                          )
                        }
                        title="إرسال البند إلى جدول المذاكرة"
                        className={`p-1 rounded-lg transition-colors ${
                          schedulePopoverItemId === item.id
                            ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40'
                            : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                        }`}
                      >
                        <CalendarPlus className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onOpenItemStyler(subject.id, item)}
                      title="تلوين الكلمات وتنسيق السطر"
                      className="p-1 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                    >
                      <Palette className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteBranchItem(subject.id, item.id)}
                      title="حذف البند"
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Inline Day Picker for Sending Item to Study Schedule */}
                {onSendItemToSchedule && schedulePopoverItemId === item.id && (
                  <div className="no-print mx-2 p-2 rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-black text-slate-700 dark:text-slate-200">
                      <span>اختر اليوم لإضافته لجدول المذاكرة:</span>
                      <button
                        type="button"
                        onClick={() => setSchedulePopoverItemId(null)}
                        className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {SCHEDULE_DAYS.map((dayName, dayIdx) => (
                        <button
                          key={dayName}
                          type="button"
                          onClick={() => {
                            onSendItemToSchedule(subject, item, dayIdx);
                            setSchedulePopoverItemId(null);
                          }}
                          className="px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 text-[10px] font-bold text-slate-700 dark:text-slate-200 transition-colors whitespace-nowrap"
                        >
                          {dayName}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-2.5 space-y-2">
        {/* Inline Quick Add Form */}
        {(isAddingInline || subject.items.length > 0) && (
          <form
            onSubmit={handleQuickAdd}
            className={`flex items-center gap-1.5 no-print ${
              isAddingInline ? '' : 'opacity-85 focus-within:opacity-100'
            }`}
          >
            <input
              type="text"
              value={newBranchText}
              onChange={(e) => setNewBranchText(e.target.value)}
              placeholder="اكتب درساً أو مهمة واضغط Enter..."
              className="flex-1 min-w-0 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
            />
            {newBranchText.trim() ? (
              <button
                type="submit"
                className="p-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                title="إضافة"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            ) : isAddingInline ? (
              <button
                type="button"
                onClick={() => setIsAddingInline(false)}
                className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0"
                title="إغلاق"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : null}
          </form>
        )}

        {/* Per-Subject Progress Hairline */}
        {totalCount > 0 && (
          <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800/70 flex items-center gap-2.5">
            <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${progressPct}%`,
                  backgroundColor: palette.hex,
                }}
              />
            </div>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 tabular-nums shrink-0">
              {completedCount}/{totalCount} · {progressPct}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
