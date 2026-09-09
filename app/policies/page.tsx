'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AnnouncementsBanner from '@/components/AnnouncementsBanner';
import { PLATFORM_POLICIES_DATA } from '@/lib/policiesData';
import {
  ShieldCheck,
  CheckCircle2,
  Printer,
  Share2,
  Sparkles,
  AlertTriangle,
  BadgeCheck,
  ArrowRight,
  ArrowLeft,
  UserPlus,
  LogIn,
  BookOpen,
  FileText,
  Lock,
  Smartphone,
  Layers,
  Award,
  ShieldBan,
  PhoneCall,
  Clock,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Fingerprint,
  Cpu,
  Eye,
  Check,
  Copy,
  ExternalLink
} from 'lucide-react';

export default function PoliciesPage() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedPolicyId, setExpandedPolicyId] = useState<string | null>(null);
  const [copiedToast, setCopiedToast] = useState(false);
  
  // Interactive Digital Signature State
  const [studentSignName, setStudentSignName] = useState('');
  const [isSigned, setIsSigned] = useState(false);
  const [signedTimestamp, setSignedTimestamp] = useState<string | null>(null);
  const [certificateCode, setCertificateCode] = useState<string | null>(null);

  // FAQ Expand state
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const categories = [
    { id: 'all', label: 'كافة المواد والسياسات' },
    { id: 'الأمان والتوثيق', label: '🔒 الأمان وتوثيق الأجهزة' },
    { id: 'الاشتراكات والدراسة', label: '📚 الاشتراكات وتعدد الكورسات' },
    { id: 'حماية المحتوى والملكية', label: '🛡️ حماية الفيديوهات والمحتوى' },
    { id: 'النظام الأكاديمي والامتحانات', label: '📝 التسلسل الأكاديمي والامتحانات' },
    { id: 'العقوبات واللوائح التأديبية', label: '⚖️ اللوائح التأديبية والحظر النهائي' }
  ];

  const filteredPolicies = PLATFORM_POLICIES_DATA.filter(policy => {
    const matchesCategory = activeCategory === 'all' || policy.category === activeCategory;
    const matchesSearch =
      policy.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      policy.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      policy.details.some(d => d.toLowerCase().includes(searchQuery.toLowerCase())) ||
      policy.articleNumber.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2500);
    }
  };

  const handleSignCertificate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentSignName.trim()) return;
    const now = new Date();
    const formatted = now.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    const code = 'RADWAN-SEC-' + Math.floor(100000 + Math.random() * 900000);
    setSignedTimestamp(formatted);
    setCertificateCode(code);
    setIsSigned(true);
  };

  const faqs = [
    {
      q: 'هل يمكنني التسجيل في أكثر من كورس من نفس الحساب؟',
      a: 'نعم بالتأكيد. حسابك المعتمد يتيح لك الاشتراك في أي عدد من الكورسات المتاحة لمرحلتك (سواء كانت مجانية أو مدفوعة عبر المحفظة أو أكواد التفعيل).'
    },
    {
      q: 'ماذا يحدث إذا حاولت فتح الكورس من جهاز ثالث؟',
      a: 'المنصة تسمح بتشغيل الكورس على جهازين مسجلين كحد أقصى (الجهاز الأساسي + جهاز إضافي). محاولة الدخول من جهاز ثالث ستُرفض تلقائياً بظهور رسالة "استكفاء عدد الأجهزة المسموح بها".'
    },
    {
      q: 'ما هي مدة مراجعة الحساب بعد التسجيل الجديد؟',
      a: 'تتم مراجعة البيانات وصورة الهوية بواسطة المعلم في غضون 48 ساعة كحد أقصى. وفي حال قبول الطلب برمز سري، سيصلك كود التفعيل عبر رسالة نصية SMS لتأكيد حسابك.'
    },
    {
      q: 'لماذا لا تفتح المحاضرة التالية إلا بعد اجتياز الامتحان؟',
      a: 'هذا نظام تربوي معتمد ومدروس لضمان استيعاب الطالب لكل درس أولاً بأول؛ حيث يشترط اجتياز الواجب وامتحان الحصة بدرجة النجاح المحددة لفتح المحاضرة التالية.'
    },
    {
      q: 'ما عقوبة محاولة تسجيل الشاشة أو تسريب فيديوهات الشرح؟',
      a: 'يتم التعرف الفوري على هوية المسرب عبر العلامات المائية المشفرة المخفية، ويتم حظر جهاز الطالب نهائياً من المنصة مع اتخاذ كافة الإجراءات الإدارية والتأديبية الصارمة لحفظ حقوق المنصة.'
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 font-sans selection:bg-violet-500 selection:text-white" dir="rtl">
      
      {/* Top Announcements Banner */}
      <AnnouncementsBanner />

      {/* Navigation Header */}
      <Navbar />

      {/* Main Official Content */}
      <main className="flex-1 py-8 sm:py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Top Quick Actions Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 sm:p-4 rounded-3xl shadow-sm">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl text-xs sm:text-sm font-black shadow-md hover:shadow-violet-500/20 active:scale-95 transition-all group"
            >
              <ArrowRight className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span>العودة إلى الصفحة الرئيسية</span>
            </Link>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-violet-500" />
                <span>مشاركة الوثيقة</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4 text-emerald-500" />
                <span>طباعة رسمية</span>
              </button>

              <Link
                href="/register"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-sm transition-all"
              >
                <UserPlus className="w-4 h-4" />
                <span>إنشاء حساب</span>
              </Link>
            </div>
          </div>

          {/* Official Document Banner Header (2030 Futuristic High-Trust Style) */}
          <div className="relative bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950 text-white rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-12 border border-violet-500/20 shadow-2xl overflow-hidden mb-10">
            {/* Ambient Lighting FX */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-6">
              
              {/* Official Seal and Badges */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-amber-300 shadow-inner">
                    <ShieldCheck className="w-8 h-8 sm:w-10 sm:h-10" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="bg-amber-400/20 text-amber-300 border border-amber-300/30 text-[10px] sm:text-xs font-black px-2.5 py-0.5 rounded-full">
                        وثيقة رسمية معتمدة
                      </span>
                      <span className="text-xs text-slate-300 font-bold">
                        العام الدراسي 2025 - 2026
                      </span>
                    </div>
                    <h2 className="text-sm sm:text-base font-black text-white mt-1">
                      منصة مستر محمد رضوان التعليمية • لغة إنجليزية
                    </h2>
                  </div>
                </div>

                <div className="hidden md:flex items-center gap-2 text-xs font-bold text-slate-300 bg-white/5 border border-white/10 px-4 py-2 rounded-2xl">
                  <Fingerprint className="w-4 h-4 text-emerald-400" />
                  <span>تأمين سيبراني وبصمة رقمية مشفرة</span>
                </div>
              </div>

              {/* Title and Intro Text */}
              <div className="space-y-3 max-w-3xl">
                <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
                  ميثاق السياسات واللوائح التنظيمية والأمنية
                </h1>
                <p className="text-xs sm:text-sm md:text-base text-slate-300 font-medium leading-relaxed">
                  تحدد هذه الوثيقة الرسمية الشروط الأكاديمية والتقنية واللوائح الانضباطية الملزمة لجميع الطلاب والمشتركين لضمان تجربة تعليمية فائقة الجودة وحماية الملكية الفكرية ومكافحة التلاعب والتسريب.
                </p>
              </div>

              {/* 4 Pillar Quick KPI Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-2">
                <div className="bg-white/5 border border-white/10 p-3 sm:p-4 rounded-2xl backdrop-blur-sm space-y-1">
                  <div className="flex items-center gap-2 text-violet-300 text-xs font-bold">
                    <Smartphone className="w-4 h-4 text-violet-400" />
                    <span>تأمين الأجهزة</span>
                  </div>
                  <div className="text-sm sm:text-base font-black text-white">
                    جهازان كحد أقصى
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">
                    (أساسي مثبت + ثانٍ بديل)
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 p-3 sm:p-4 rounded-2xl backdrop-blur-sm space-y-1">
                  <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    <span>تعدد الكورسات</span>
                  </div>
                  <div className="text-sm sm:text-base font-black text-white">
                    اشتراك مفتوح
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">
                    نفس الحساب لجميع المواد
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 p-3 sm:p-4 rounded-2xl backdrop-blur-sm space-y-1">
                  <div className="flex items-center gap-2 text-amber-300 text-xs font-bold">
                    <Lock className="w-4 h-4 text-amber-400" />
                    <span>المشغل الداخلي</span>
                  </div>
                  <div className="text-sm sm:text-base font-black text-white">
                    علامة مائية مشفرة
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">
                    حماية ضد التسجيل والتسريب
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 p-3 sm:p-4 rounded-2xl backdrop-blur-sm space-y-1">
                  <div className="flex items-center gap-2 text-rose-300 text-xs font-bold">
                    <ShieldBan className="w-4 h-4 text-rose-400" />
                    <span>العقوبات والانضباط</span>
                  </div>
                  <div className="text-sm sm:text-base font-black text-white">
                    حظر أجهزة دائم
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">
                    للحسابات أو المحاولات المخالفة
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Search and Category Filter Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 mb-8 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              
              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none text-xs font-bold">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-3.5 py-2.5 rounded-2xl whitespace-nowrap transition-all cursor-pointer ${
                      activeCategory === cat.id
                        ? 'bg-violet-600 text-white shadow-md font-black scale-102'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="relative min-w-[260px]">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="ابحث في نصوص ومواد الميثاق..."
                  className="w-full pl-3 pr-9 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <FileText className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute left-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
                  >
                    مسح
                  </button>
                )}
              </div>

            </div>

            {/* Results count banner */}
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800 font-bold">
              <span>عرض {filteredPolicies.length} مادة من إجمالي {PLATFORM_POLICIES_DATA.length} مادة معتمدة</span>
              <span className="text-violet-600 dark:text-violet-400">آخر تحديث للوائح: سبتمبر 2026</span>
            </div>
          </div>

          {/* Legal Warning Notice Box */}
          <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-3xl p-5 sm:p-6 mb-8 flex items-start gap-4 shadow-sm">
            <AlertTriangle className="w-7 h-7 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-right">
              <h3 className="text-sm sm:text-base font-black text-amber-900 dark:text-amber-300">
                إشعار الأثر التأديبي والتقني الملزم:
              </h3>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-bold leading-relaxed">
                إنشاء أي حساب على المنصة أو إتمام التسجيل يُعد إقراراً رسمياً وتوقيعاً إلكترونياً على الالتزام التام بكافة بنود هذا الميثاق. تحتفظ إدارة المنصة بالحق الكامل في اتخاذ الإجراءات التأديبية والحظر التقني الدائم دون إنذار مسبق لأي محاولة مخالفة أو تسريب.
              </p>
            </div>
          </div>

          {/* Master Policy Articles Feed */}
          <div className="space-y-6 mb-12">
            {filteredPolicies.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-3">
                <FileText className="w-12 h-12 text-slate-400 mx-auto" />
                <h3 className="text-lg font-black text-slate-700 dark:text-slate-300">
                  لم يتم العثور على مواد تطابق بحثك
                </h3>
                <p className="text-xs text-slate-500 font-bold">
                  جرّب البحث بكلمات أخرى أو اختر &quot;كافة المواد والسياسات&quot; لإعادة العرض بالكامل.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setActiveCategory('all');
                  }}
                  className="px-4 py-2 bg-violet-600 text-white rounded-xl text-xs font-bold"
                >
                  إعادة ضبط الفلتر
                </button>
              </div>
            ) : (
              filteredPolicies.map((policy) => {
                const Icon = policy.icon;
                const isExpanded = expandedPolicyId === policy.id;

                return (
                  <article
                    key={policy.id}
                    id={policy.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-xl hover:border-violet-500/30 transition-all space-y-5"
                  >
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-4 flex-wrap sm:flex-nowrap border-b border-slate-100 dark:border-slate-800 pb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-violet-100 dark:bg-violet-950/70 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0 border border-violet-200 dark:border-violet-800/60 shadow-sm">
                          <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-violet-600 dark:text-violet-400">
                              {policy.articleNumber}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold">
                              • {policy.category}
                            </span>
                          </div>
                          <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-0.5">
                            {policy.title}
                          </h2>
                        </div>
                      </div>

                      <span className="px-3 py-1 rounded-full text-xs font-black bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {policy.badge}
                      </span>
                    </div>

                    {/* Executive Summary */}
                    <div className="bg-violet-50/80 dark:bg-violet-950/30 p-4 rounded-2xl border border-violet-100 dark:border-violet-900/40 text-xs sm:text-sm font-bold text-violet-900 dark:text-violet-300 leading-relaxed flex items-start gap-2.5">
                      <Sparkles className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-black">ملخص الحكم التنفيذي: </span>
                        {policy.summary}
                      </div>
                    </div>

                    {/* Detailed Clauses List */}
                    <div className="space-y-3 pt-1">
                      <h4 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        البنود واللوائح التفصيلية المعتمدة:
                      </h4>
                      <ul className="space-y-2.5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 leading-relaxed pr-1">
                        {policy.details.map((detail, dIdx) => (
                          <li key={dIdx} className="flex items-start gap-2.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                            <span>{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Footer Confirmation Tag */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-bold text-slate-400">
                      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                        <Check className="w-3.5 h-3.5" />
                        <span>بند مفعل برمجياً ومراقب بنظام Audit Log</span>
                      </div>
                      <span className="hidden sm:inline-block font-mono text-[10px]">
                        REF: RADWAN-POL-{policy.id}
                      </span>
                    </div>
                  </article>
                );
              })
            )}
          </div>

          {/* Interactive Digital Signature & Compliance Certificate Generator */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 border border-slate-800 text-white rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-10 shadow-2xl relative overflow-hidden mb-12">
            <div className="absolute top-0 right-0 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

            <div className="max-w-2xl mx-auto text-center space-y-6 relative z-10">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-inner">
                <BadgeCheck className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl sm:text-3xl font-black text-white">
                  إقرار وتوقيع الالتزام بميثاق المنصة
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 font-medium leading-relaxed">
                  أدخل اسمك رباعياً لتسجيل توقيعك الرقمي وتوليد وثيقة إقرار الالتزام باللوائح والضوابط الأكاديمية.
                </p>
              </div>

              {!isSigned ? (
                <form onSubmit={handleSignCertificate} className="space-y-4 max-w-md mx-auto">
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={studentSignName}
                      onChange={e => setStudentSignName(e.target.value)}
                      placeholder="اكتب اسم الطالب رباعياً كما هو مسجل..."
                      className="w-full px-4 py-3.5 bg-white/10 border border-white/20 rounded-2xl text-sm font-bold text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 text-center"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-black rounded-2xl text-sm shadow-xl hover:shadow-violet-500/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <BadgeCheck className="w-5 h-5 text-emerald-300" />
                    <span>توقيع الميثاق وإصدار شهادة الالتزام</span>
                  </button>
                </form>
              ) : (
                <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-3xl p-6 text-right space-y-4 animate-in zoom-in-95 duration-300 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-emerald-500/30 pb-3">
                    <div className="flex items-center gap-2 text-emerald-400 font-black text-sm">
                      <CheckCircle2 className="w-5 h-5" />
                      <span>تم توثيق إقرارك الرقمي بنجاح</span>
                    </div>
                    <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-black">
                      {certificateCode}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-300">
                    <div><strong className="text-white">اسم الطالب المقر:</strong> {studentSignName}</div>
                    <div><strong className="text-white">تاريخ وساعة التوقيع:</strong> {signedTimestamp} (بتوقيت القاهرة)</div>
                    <div><strong className="text-white">الحالة:</strong> ملتزم رسمياً بكافة لوائح وضوابط منصة مستر محمد رضوان التعليمية.</div>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                    <Link
                      href="/register"
                      className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black text-center flex items-center justify-center gap-2"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>الانتقال لإنشاء الحساب الآن</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => setIsSigned(false)}
                      className="w-full sm:w-auto px-4 py-3 bg-white/10 hover:bg-white/20 text-slate-300 rounded-xl text-xs font-bold text-center"
                    >
                      إعادة التوقيع باسم آخر
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Frequently Asked Questions (FAQ) Section */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 mb-12 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  الأسئلة الشائعة حول سياسات وضوابط المنصة
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  إجابات سريعة وواضحة على أبرز الاستفسارات الأكاديمية والتقنية
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {faqs.map((faq, index) => {
                const isOpen = openFaqIndex === index;
                return (
                  <div
                    key={index}
                    className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden transition-all"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                      className="w-full p-4 text-right flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200 cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-violet-200 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300 text-[10px] font-black flex items-center justify-center shrink-0">
                          {index + 1}
                        </span>
                        {faq.q}
                      </span>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-violet-600 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                    </button>

                    {isOpen && (
                      <div className="p-4 bg-white dark:bg-slate-900 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Direct Navigation & Teacher Support Box */}
          <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-3xl p-6 sm:p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl mb-6">
            <div className="space-y-1.5 text-center md:text-right">
              <h3 className="text-xl sm:text-2xl font-black">
                هل لديك استفسار أو واجهتك أي مشكلة في التسجيل؟
              </h3>
              <p className="text-xs sm:text-sm text-violet-100 font-medium">
                تواصل مباشرة مع مستر محمد رضوان أو فريق الدعم الفني عبر الواتساب المعتمد: 01552191172 - 01148553118
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Link
                href="/"
                className="px-6 py-3.5 bg-white text-violet-700 hover:bg-violet-50 rounded-2xl text-xs sm:text-sm font-black shadow-lg transition-all flex items-center gap-2"
              >
                <ArrowRight className="w-4 h-4" />
                <span>العودة للرئيسية</span>
              </Link>

              <a
                href="https://wa.me/201552191172"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-xs sm:text-sm font-black shadow-lg transition-all flex items-center gap-2"
              >
                <PhoneCall className="w-4 h-4" />
                <span>واتساب الدعم</span>
              </a>
            </div>
          </div>

        </div>
      </main>

      {/* Official Footer with Signature */}
      <Footer />

      {/* Copied Link Toast */}
      {copiedToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[1000] bg-slate-900 text-white px-5 py-2.5 rounded-2xl text-xs font-black shadow-2xl border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>تم نسخ رابط وثيقة السياسات الرسمية إلى الحافظة بنجاح!</span>
        </div>
      )}

    </div>
  );
}
