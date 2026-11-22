'use client';

import React from 'react';
import { X, Check } from 'lucide-react';
import { MindMapShape } from './mindMapCatalog';

export interface ShapeShowcaseItem {
  id: MindMapShape;
  title: string;
  subtitle: string;
  renderPreview: () => React.ReactNode;
}

export const MIND_MAP_SHAPE_ITEMS: ShapeShowcaseItem[] = [
  {
    id: 'sketchbook',
    title: 'شخبطة الأقلام والاسكتش اليدوي',
    subtitle: 'فروع مرسومة بقلم الحبر المزدوج وإطارات كراسة تفاعلية دافئة',
    renderPreview: () => (
      <svg viewBox="0 0 220 120" className="w-full h-28">
        <rect x="6" y="6" width="208" height="108" rx="12" fill="#fdfbf2" stroke="#cbd5e1" strokeDasharray="4 3" />
        <path d="M110 60 C 85 45, 70 30, 52 30" fill="none" stroke="#0284c7" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M110 62 C 85 48, 70 34, 52 33" fill="none" stroke="#0284c7" strokeWidth="1" strokeDasharray="3 2" />
        <path d="M110 60 C 135 45, 150 30, 168 30" fill="none" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M110 60 C 85 75, 70 90, 52 90" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M110 60 C 135 75, 150 90, 168 90" fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" />
        <rect x="14" y="18" width="44" height="22" rx="8" fill="#e0f2fe" stroke="#0284c7" strokeDasharray="3 2" />
        <rect x="162" y="18" width="44" height="22" rx="8" fill="#ffedd5" stroke="#ea580c" strokeDasharray="3 2" />
        <rect x="14" y="80" width="44" height="22" rx="8" fill="#d1fae5" stroke="#059669" strokeDasharray="3 2" />
        <rect x="162" y="80" width="44" height="22" rx="8" fill="#ede9fe" stroke="#7c3aed" strokeDasharray="3 2" />
        <ellipse cx="110" cy="60" rx="30" ry="18" fill="#0f172a" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 2" />
        <text x="110" y="64" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">خطتي</text>
      </svg>
    ),
  },
  {
    id: 'radial_tree',
    title: 'التشعّب الشجري المنحني',
    subtitle: 'فروع منحنية متصلة بسلاسة من المركز إلى بطاقات المواد حولك',
    renderPreview: () => (
      <svg viewBox="0 0 220 120" className="w-full h-28">
        <rect x="6" y="6" width="208" height="108" rx="12" fill="#f8fafc" stroke="#e2e8f0" />
        <path d="M110 60 C 80 60, 80 28, 56 28" fill="none" stroke="#0284c7" strokeWidth="3" />
        <path d="M110 60 C 140 60, 140 28, 164 28" fill="none" stroke="#e11d48" strokeWidth="3" />
        <path d="M110 60 C 80 60, 80 92, 56 92" fill="none" stroke="#0d9488" strokeWidth="3" />
        <path d="M110 60 C 140 60, 140 92, 164 92" fill="none" stroke="#7c3aed" strokeWidth="3" />
        <rect x="14" y="18" width="46" height="20" rx="6" fill="#0284c7" />
        <rect x="160" y="18" width="46" height="20" rx="6" fill="#e11d48" />
        <rect x="14" y="82" width="46" height="20" rx="6" fill="#0d9488" />
        <rect x="160" y="82" width="46" height="20" rx="6" fill="#7c3aed" />
        <circle cx="110" cy="60" r="19" fill="#0f172a" stroke="#10b981" strokeWidth="2.5" />
        <text x="110" y="63" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">المركز</text>
      </svg>
    ),
  },
  {
    id: 'organic_clouds',
    title: 'السحابات التفاعلية الملونة',
    subtitle: 'عقد سحابية بألوان زاهية وفروع ناعمة للمراجعة البصرية السريعة',
    renderPreview: () => (
      <svg viewBox="0 0 220 120" className="w-full h-28">
        <rect x="6" y="6" width="208" height="108" rx="12" fill="#f8fafc" stroke="#e2e8f0" />
        <path d="M110 60 Q 75 40 55 32" fill="none" stroke="#059669" strokeWidth="3" />
        <path d="M110 60 Q 145 40 165 32" fill="none" stroke="#ea580c" strokeWidth="3" />
        <path d="M110 60 Q 75 80 55 88" fill="none" stroke="#0284c7" strokeWidth="3" />
        <path d="M110 60 Q 145 80 165 88" fill="none" stroke="#d97706" strokeWidth="3" />
        <rect x="16" y="18" width="44" height="22" rx="11" fill="#059669" />
        <rect x="160" y="18" width="44" height="22" rx="11" fill="#ea580c" />
        <rect x="16" y="78" width="44" height="22" rx="11" fill="#0284c7" />
        <rect x="160" y="78" width="44" height="22" rx="11" fill="#d97706" />
        <rect x="78" y="42" width="64" height="36" rx="18" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
        <text x="110" y="63" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">خريطتي</text>
      </svg>
    ),
  },
  {
    id: 'formal_sheet',
    title: 'ورقة الطباعة الرسمية المنظمة',
    subtitle: 'تصميم أكاديمي مرتب بخطوط مستقيمة وألوان موحدة للطباعة الورقية',
    renderPreview: () => (
      <svg viewBox="0 0 220 120" className="w-full h-28">
        <rect x="6" y="6" width="208" height="108" rx="8" fill="#ffffff" stroke="#cbd5e1" />
        <line x1="110" y1="60" x2="62" y2="30" stroke="#475569" strokeWidth="1.8" />
        <line x1="110" y1="60" x2="158" y2="30" stroke="#475569" strokeWidth="1.8" />
        <line x1="110" y1="60" x2="62" y2="90" stroke="#475569" strokeWidth="1.8" />
        <line x1="110" y1="60" x2="158" y2="90" stroke="#475569" strokeWidth="1.8" />
        <rect x="16" y="18" width="46" height="22" rx="3" fill="#ffffff" stroke="#0284c7" strokeWidth="1.5" />
        <rect x="158" y="18" width="46" height="22" rx="3" fill="#ffffff" stroke="#059669" strokeWidth="1.5" />
        <rect x="16" y="80" width="46" height="22" rx="3" fill="#ffffff" stroke="#e11d48" strokeWidth="1.5" />
        <rect x="158" y="80" width="46" height="22" rx="3" fill="#ffffff" stroke="#7c3aed" strokeWidth="1.5" />
        <rect x="82" y="45" width="56" height="30" rx="6" fill="#0f172a" />
        <text x="110" y="63" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">الخطة</text>
      </svg>
    ),
  },
  {
    id: 'timeline_roadmap',
    title: 'مسار الخطوات والمراحل المتتابعة',
    subtitle: 'ترتيب خطوات المذاكرة والمواد كمسار مرقم من البداية حتى ليلة الامتحان',
    renderPreview: () => (
      <svg viewBox="0 0 220 120" className="w-full h-28">
        <rect x="6" y="6" width="208" height="108" rx="10" fill="#f8fafc" stroke="#e2e8f0" />
        <line x1="34" y1="36" x2="186" y2="36" stroke="#10b981" strokeWidth="3" strokeLinecap="round" />
        <circle cx="42" cy="36" r="10" fill="#0284c7" />
        <text x="42" y="39" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold">01</text>
        <circle cx="90" cy="36" r="10" fill="#059669" />
        <text x="90" y="39" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold">02</text>
        <circle cx="138" cy="36" r="10" fill="#ea580c" />
        <text x="138" y="39" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold">03</text>
        <circle cx="182" cy="36" r="10" fill="#7c3aed" />
        <text x="182" y="39" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold">04</text>
        <rect x="22" y="56" width="40" height="44" rx="6" fill="#ffffff" stroke="#0284c7" strokeWidth="1.4" />
        <rect x="70" y="56" width="40" height="44" rx="6" fill="#ffffff" stroke="#059669" strokeWidth="1.4" />
        <rect x="118" y="56" width="40" height="44" rx="6" fill="#ffffff" stroke="#ea580c" strokeWidth="1.4" />
        <rect x="164" y="56" width="36" height="44" rx="6" fill="#ffffff" stroke="#7c3aed" strokeWidth="1.4" />
      </svg>
    ),
  },
  {
    id: 'kanban_board',
    title: 'لوحة الأعمدة الشبكية المنظمة',
    subtitle: 'بطاقات مرتبة في شبكة متوازنة مع شريط إنجاز لكل مادة ومؤشرات أولوية واضحة',
    renderPreview: () => (
      <svg viewBox="0 0 220 120" className="w-full h-28">
        <rect x="6" y="6" width="208" height="108" rx="10" fill="#f8fafc" stroke="#e2e8f0" />
        <rect x="18" y="18" width="56" height="84" rx="8" fill="#ffffff" stroke="#cbd5e1" />
        <rect x="18" y="18" width="56" height="18" rx="8" fill="#0284c7" />
        <rect x="82" y="18" width="56" height="84" rx="8" fill="#ffffff" stroke="#cbd5e1" />
        <rect x="82" y="18" width="56" height="18" rx="8" fill="#059669" />
        <rect x="146" y="18" width="56" height="84" rx="8" fill="#ffffff" stroke="#cbd5e1" />
        <rect x="146" y="18" width="56" height="18" rx="8" fill="#7c3aed" />
        <line x1="26" y1="50" x2="66" y2="50" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="26" y1="64" x2="58" y2="64" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="90" y1="50" x2="130" y2="50" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="90" y1="64" x2="122" y2="64" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="154" y1="50" x2="194" y2="50" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

interface MindMapShapesGalleryProps {
  isOpen: boolean;
  activeShape: MindMapShape;
  onSelectShape: (shape: MindMapShape) => void;
  onClose: () => void;
}

export default function MindMapShapesGallery({
  isOpen,
  activeShape,
  onSelectShape,
  onClose,
}: MindMapShapesGalleryProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto"
      dir="rtl"
    >
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">
              أشكال الخرائط الذهنية الجاهزة للتصميم
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              اختر الشكل الهندسي الذي يناسب أسلوب مذاكرتك — يمكنك التبديل بينها في أي لحظة دون فقدان بياناتك
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {MIND_MAP_SHAPE_ITEMS.map((item) => {
            const isSelected = activeShape === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectShape(item.id);
                  onClose();
                }}
                className={`text-right p-4 rounded-2xl border-2 transition-all space-y-3 ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-950/30'
                }`}
              >
                <div className="overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-800">
                  {item.renderPreview()}
                </div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">
                      {item.title}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      {item.subtitle}
                    </p>
                  </div>
                  {isSelected && (
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
