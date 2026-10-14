'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
  Wallet, CreditCard, ArrowDownRight, ArrowUpRight, Plus, 
  History, Sparkles, ShieldCheck, Zap, Construction, 
  Layers, Lock, CheckCircle2, AlertCircle, RefreshCw, KeyRound, 
  PhoneCall, MessageCircle, ExternalLink
} from 'lucide-react';
import Link from 'next/link';

interface Transaction {
  id: string;
  type: 'deposit' | 'purchase';
  amount: number;
  date: string;
  title: string;
  status: 'completed' | 'pending';
  method?: string;
}

export default function StudentWalletPage() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'methods' | 'history'>('overview');
  const [selectedDemoGateway, setSelectedDemoGateway] = useState<'fawry' | 'card' | 'vodafone'>('fawry');

  const transactions: Transaction[] = [
    {
      id: 'tx_demo_1',
      type: 'purchase',
      amount: 150,
      date: 'معاملة تجريبية (مفعلة تلقائياً عبر الأكواد التعليمية)',
      title: 'تفعيل كورس عبر كود الشحن التعليمي المعتمد',
      status: 'completed',
      method: 'كود تفعيل'
    }
  ];

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-black mb-2 animate-pulse">
            <Construction className="w-4 h-4" />
            <span>مرحلة التشغيل التجريبي • الاشتراكات المالية مغلقة حتى 2027-2028</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            المحفظة المالية الذكية
            <span className="p-2 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 inline-flex">
              <Wallet className="w-7 h-7" />
            </span>
          </h1>
          <p className="text-slate-600 dark:text-slate-400 font-medium text-sm md:text-base mt-1 max-w-3xl">
            متابعة الرصيد وسجل التفعيل. باب الاشتراكات المالية مغلق حالياً، ويتم تفعيل الكورسات بالكامل عبر <strong className="text-emerald-600 dark:text-emerald-400">أكواد التفعيل المجانية</strong> الممنوحة للطلاب للتجربة بالتواصل مع المعلم.
          </p>
        </div>

        {/* Action Link to Courses */}
        <Link
          href="/student/courses"
          className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
        >
          <KeyRound className="w-4 h-4" />
          <span>تفعيل كورس بكود التفعيل</span>
        </Link>
      </div>

      {/* Dynamic Status / Under Construction Showcase Box */}
      <div className="relative overflow-hidden rounded-3xl border border-violet-500/30 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-white p-6 sm:p-8 shadow-2xl">
        {/* Futuristic Background Accents */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-400">
              <Zap className="w-4 h-4" />
              <span>Next-Gen Financial Architecture • 2030</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black leading-snug">
              الربط المباشر مع شبكات الدفع (Fawry & Visa) قيد التجهيز لعام 2027 - 2028
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              تم بناء البنية التحتية البرمجية لجداول المعاملات المالية بالكامل. عند استلام مفاتيح الـ <span className="font-mono text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-800/40">API Keys</span> الرسمية لبوابات الدفع مع الانطلاق الرسمي العام القادم، سيتم تفعيل الشحن اللحظي بضغطة زر.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <div className="px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>أكواد التجربة المجانية متاحة 100%</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-amber-500/20 backdrop-blur-md border border-amber-500/30 text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-300" />
                <span>الاشتراكات المالية مغلقة حالياً</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-rose-500/20 backdrop-blur-md border border-rose-500/30 text-xs font-bold text-rose-300 flex items-center gap-1.5">
                <span>⛔ يمنع تحويل أي مبالغ لمحفظة</span>
              </div>
            </div>
          </div>

          {/* Balance Widget Simulation */}
          <div className="lg:col-span-5 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">رصيدك الحالي في المنصة</span>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-[11px] font-black text-emerald-400">
                حساب آمن وموثق
              </span>
            </div>
            
            <div className="flex items-baseline gap-2">
              <span className="text-4xl sm:text-5xl font-black tracking-tight text-white">
                {currentUser?.walletBalance || '0.00'}
              </span>
              <span className="text-lg font-bold text-emerald-400">جنيه مصري (EGP)</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-200 flex items-start gap-2.5 leading-relaxed">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <p>
                <strong>تنبيه صارم:</strong> لا تقم بتحويل أي أموال إلى أي أرقام محافظ، الاشتراكات مغلقة حالياً وجميع الأكواد مجانية للتجربة.
              </p>
            </div>

            <div className="pt-1">
              <a
                href="https://wa.me/201552191172?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D9%8B%20%D9%85%D8%B3%D8%AA%D8%B1%20%D9%85%D8%AD%D9%85%D8%AF%D8%8C%20%D8%A3%D9%88%D8%AF%20%D8%AA%D8%AC%D8%B1%D8%A8%D8%A9%20%D8%A7%D9%84%D9%85%D9%86%D8%B5%D8%A9%20%D9%88%D8%A7%D9%84%D8%AD%D8%B5%D9%88%D9%84%20%D8%B9%D9%84%D9%89%20%D9%83%D9%88%D8%AF%20%D8%AA%D8%AC%D8%B1%D9%8A%D8%A8%D9%8A%20%D9%85%D8%AC%D8%A7%D9%86%D9%8A"
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md text-center"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>طلب كود تفعيل كورس مجاناً عبر واتساب</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-5 py-2.5 rounded-2xl font-black text-xs md:text-sm transition-all flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>طرق الشحن المقررة</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-5 py-2.5 rounded-2xl font-black text-xs md:text-sm transition-all flex items-center gap-2 ${
            activeTab === 'history'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>سجل المعاملات والعمليات</span>
        </button>
      </div>

      {/* Tab: Payment Gateways Preparation */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Educational Codes (Active) */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border-2 border-emerald-500/40 shadow-lg relative overflow-hidden flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-black text-xs border border-emerald-200 dark:border-emerald-800">
                  مفعّل ومتاح حالياً ✓
                </span>
                <KeyRound className="w-6 h-6 text-emerald-600" />
              </div>

              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                أكواد التفعيل والشحن
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
                الطريقة الأساسية المعتمدة حالياً. يمكنك استلام كود كورس مخصص من مستر محمد رضوان أو من السنتر وإدخاله في صفحة الكورس لتفعيله فوراً على جهازك.
              </p>
            </div>

            <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
              <Link
                href="/student/courses"
                className="w-full py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-black text-xs flex items-center justify-center gap-1.5 transition-colors border border-emerald-200 dark:border-emerald-800/40"
              >
                <span>الانتقال لتفعيل كود في الكورسات</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Card 2: Fawry Pay (Under API Integration) */}
          <div className="p-6 rounded-3xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 relative overflow-hidden flex flex-col justify-between opacity-95">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-black text-xs border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                  <Construction className="w-3 h-3" />
                  <span>قيد التجهيز (API)</span>
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-400 font-black text-blue-900 text-sm flex items-center justify-center shadow-sm">
                  F
                </div>
              </div>

              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                شحن فوري (Fawry Pay)
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
                شحن الرصيد من أي ماكينة فوري بكود دفع رقمي مميكن يصلك على الهاتف ويتم تأكيد الرصيد آلياً فور السداد.
              </p>
            </div>

            <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
              <div className="w-full py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-black text-xs flex items-center justify-center gap-1.5 cursor-not-allowed">
                <Lock className="w-3.5 h-3.5" />
                <span>سيُتاح مع تحديث الـ API القادم</span>
              </div>
            </div>
          </div>

          {/* Card 3: Credit Cards / Mobile Wallets (Under API Integration) */}
          <div className="p-6 rounded-3xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 relative overflow-hidden flex flex-col justify-between opacity-95">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 font-black text-xs border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                  <Construction className="w-3 h-3" />
                  <span>قيد التجهيز (API)</span>
                </span>
                <CreditCard className="w-6 h-6 text-blue-500" />
              </div>

              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                فيزا، ماستركارد ومحافظ كاش
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
                ستتوفر خدمات الدفع الإلكتروني والربط البنكي والمحافظ عند الافتتاح الرسمي للعام القادم (2027 - 2028). حالياً المنصة تجريبية وكافة الأكواد مجانية تماماً.
              </p>
            </div>

            <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
              <div className="w-full py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-black text-xs flex items-center justify-center gap-1.5 cursor-not-allowed">
                <Lock className="w-3.5 h-3.5" />
                <span>مغلق حالياً • متاح في 2027-2028</span>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Tab: Transactions History */}
      {activeTab === 'history' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <History className="w-5 h-5 text-emerald-500" />
              <span>سجل المعاملات والعمليات المالية</span>
            </h3>
            <span className="text-xs font-bold text-slate-400">
              سجل فوري ومؤرشف
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {transactions.map((tx) => (
              <div key={tx.id} className="p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                    tx.type === 'deposit' 
                      ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                      : 'bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400'
                  }`}>
                    {tx.type === 'deposit' ? <ArrowDownRight className="w-6 h-6" /> : <KeyRound className="w-6 h-6" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base mb-1">{tx.title}</h4>
                    <p className="text-xs font-bold text-slate-500">{tx.date}</p>
                  </div>
                </div>

                <div className="text-left">
                  <span className="inline-block px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 font-black text-xs">
                    مكتمل بنجاح ✓
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

// Helper icon component for note
function Info(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      width="24" 
      height="24" 
      stroke="currentColor" 
      strokeWidth="2" 
      fill="none" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}
