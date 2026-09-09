'use client';

import React from 'react';
import { Tag, Sparkles, X, Check, DollarSign } from 'lucide-react';

interface PriceControlSelectorProps {
  price: number;
  originalPrice?: number;
  hasDiscount?: boolean;
  isFree: boolean;
  onPriceChange: (price: number) => void;
  onOriginalPriceChange: (originalPrice: number | undefined) => void;
  onHasDiscountChange: (hasDiscount: boolean) => void;
  onIsFreeChange: (isFree: boolean) => void;
}

export default function PriceControlSelector({
  price,
  originalPrice,
  hasDiscount = false,
  isFree,
  onPriceChange,
  onOriginalPriceChange,
  onHasDiscountChange,
  onIsFreeChange,
}: PriceControlSelectorProps) {
  const discountAmount = originalPrice && originalPrice > price ? originalPrice - price : 0;

  return (
    <div className="space-y-4 p-5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl">
      <div className="flex items-center justify-between">
        <label className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          تسعير الكورس وطريقة العرض
        </label>

        {/* Free Course Toggle */}
        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={isFree}
            onChange={(e) => {
              const free = e.target.checked;
              onIsFreeChange(free);
              if (free) {
                onPriceChange(0);
                onHasDiscountChange(false);
              }
            }}
            className="w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500"
          />
          <span>كورس مجاني 100% (بدون مقابل)</span>
        </label>
      </div>

      {!isFree && (
        <div className="space-y-4 pt-2">
          {/* Main Direct Price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {hasDiscount ? 'السعر الجديد بعد الخصم (ج.م)' : 'سعر الكورس المباشر (ج.م)'}
                <span className="text-rose-500 mr-1">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={price === 0 ? '' : price}
                  onChange={(e) => onPriceChange(Number(e.target.value))}
                  placeholder="مثال: 150"
                  className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-black text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
                <span className="absolute left-3 top-3 text-xs font-bold text-slate-400">
                  ج.م
                </span>
              </div>
            </div>

            {/* Discount Offer Toggle Option */}
            <div className="flex flex-col justify-end">
              <button
                type="button"
                onClick={() => {
                  const nextState = !hasDiscount;
                  onHasDiscountChange(nextState);
                  if (!nextState) {
                    onOriginalPriceChange(undefined);
                  } else if (!originalPrice) {
                    onOriginalPriceChange(price > 0 ? price + 50 : 200);
                  }
                }}
                className={`py-3 px-4 rounded-xl text-xs font-bold transition-all border flex items-center justify-between ${
                  hasDiscount
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-emerald-500'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-amber-500" />
                  <span>{hasDiscount ? 'تخفيض السعر مفعّل ✓' : 'إضافة عرض خاص أو تخفيض؟'}</span>
                </div>
                <span className="text-[11px] underline">
                  {hasDiscount ? 'إلغاء الخصم والعودة للسعر المباشر' : 'تفعيل العرض'}
                </span>
              </button>
            </div>
          </div>

          {/* Expanded discount configuration if active */}
          {hasDiscount && (
            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  إعدادات العرض الخاص (يظهر السعر الجديد مباشرة بدون خط شطب)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onHasDiscountChange(false);
                    onOriginalPriceChange(undefined);
                  }}
                  className="text-xs text-rose-500 hover:text-rose-600 font-bold flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  إلغاء العرض
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    السعر المرجعي الأصلي (ج.م)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={originalPrice ?? ''}
                    onChange={(e) => onOriginalPriceChange(Number(e.target.value))}
                    placeholder="مثال: 200"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 text-xs"
                  />
                </div>

                {/* Direct Price Live Preview Badge */}
                <div className="flex flex-col justify-end">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-500/20 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">طريقة العرض للطالب:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                        {price} ج.م
                      </span>
                      {discountAmount > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] border border-emerald-500/20">
                          وفر {discountAmount} ج.م
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {isFree && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
          <Check className="w-4 h-4" />
          سيظهر الكورس للطلاب مجاناً 100% مع إمكانية التفعيل المباشر.
        </div>
      )}
    </div>
  );
}
