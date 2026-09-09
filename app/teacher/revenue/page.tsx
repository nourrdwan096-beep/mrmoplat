'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Wallet,
  KeyRound,
  Download,
  Copy,
  CheckCircle2,
  TrendingUp,
  CreditCard,
  QrCode,
  DollarSign,
  Search,
  BookOpen,
  Filter,
  Sparkles,
  X
} from 'lucide-react';
import {
  fetchCourseCodes,
  generateCourseCodes,
  ActivationCodeData
} from '@/lib/teacherService';
import { fetchAllCourses, CourseData } from '@/lib/academicService';

export default function TeacherRevenuePage() {
  const [codes, setCodes] = useState<ActivationCodeData[]>([]);
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Generate Form
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [codesCount, setCodesCount] = useState(10);
  const [batchName, setBatchName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [allCodes, allCourses] = await Promise.all([
          fetchCourseCodes(),
          fetchAllCourses(),
        ]);
        setCodes(allCodes);
        setCourses(allCourses);
        if (allCourses.length > 0) {
          setSelectedCourseId(allCourses[0].id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId || codesCount < 1) return;

    setIsGenerating(true);
    try {
      const course = courses.find((c) => c.id === selectedCourseId);
      const generated = await generateCourseCodes({
        courseId: selectedCourseId,
        courseTitle: course?.title || 'كورس تعليمي',
        count: codesCount,
        batchName: batchName || undefined,
      });

      setCodes([...generated, ...codes]);
      setIsModalOpen(false);
      setSuccessMsg(`تم توليد ${codesCount} كود تفعيل بنجاح جاهزة للطباعة والإرسال 🎟️`);
      setTimeout(() => setSuccessMsg(''), 4000);
      setBatchName('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const exportCodesTxt = () => {
    const list = codes
      .filter((c) => (selectedCourseFilter === 'all' ? true : c.courseId === selectedCourseFilter))
      .map((c) => `${c.code}\t${c.courseTitle || ''}\t${c.isUsed ? 'مستخدم' : 'متاح'}`)
      .join('\n');

    const blob = new Blob([list], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RADWAN-CODES-${Date.now()}.txt`;
    a.click();
  };

  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'used' | 'available'>('all');

  const usedCodesList = codes.filter((c) => c.isUsed);
  const availableCodesList = codes.filter((c) => !c.isUsed);
  const usedCount = usedCodesList.length;
  const availableCount = availableCodesList.length;

  // Real Calculated Revenue: (Codes sold & used by students) * (Course Price)
  const realEarnedRevenue = usedCodesList.reduce((sum, c) => {
    const course = courses.find((crs) => crs.id === c.courseId);
    return sum + (course ? Number(course.price || 0) : 0);
  }, 0);

  // Potential Revenue if all available generated codes are sold & redeemed
  const potentialRevenue = availableCodesList.reduce((sum, c) => {
    const course = courses.find((crs) => crs.id === c.courseId);
    return sum + (course ? Number(course.price || 0) : 0);
  }, 0);

  // Per Course Detailed Financial Breakdown
  const courseFinancialBreakdown = courses.map((course) => {
    const courseCodes = codes.filter((c) => c.courseId === course.id);
    const courseUsedCodes = courseCodes.filter((c) => c.isUsed);
    const courseAvailableCodes = courseCodes.filter((c) => !c.isUsed);
    const earned = courseUsedCodes.length * Number(course.price || 0);
    const potential = courseAvailableCodes.length * Number(course.price || 0);
    const rate = courseCodes.length > 0 ? ((courseUsedCodes.length / courseCodes.length) * 100).toFixed(0) : '0';

    return {
      course,
      totalCodes: courseCodes.length,
      usedCount: courseUsedCodes.length,
      availableCount: courseAvailableCodes.length,
      earned,
      potential,
      rate,
    };
  });

  const filteredCodes = codes.filter((c) => {
    const matchesCourse = selectedCourseFilter === 'all' || c.courseId === selectedCourseFilter;
    const matchesStatus =
      selectedStatusFilter === 'all' ||
      (selectedStatusFilter === 'used' && c.isUsed) ||
      (selectedStatusFilter === 'available' && !c.isUsed);
    const matchesSearch =
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.batchName && c.batchName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.courseTitle && c.courseTitle.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCourse && matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-8 pb-10">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 dark:border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 dark:bg-rose-500/20 blur-3xl rounded-full -translate-y-1/2 translate-x-1/3"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 font-bold text-xs mb-3">
              <Wallet className="w-4 h-4" />
              الإيرادات والأكواد المشفرة
            </div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
              الإيرادات وتوليد الأكواد 💳
            </h1>
            <p className="text-slate-600 dark:text-slate-400 font-bold text-sm md:text-base">
              توليد أكواد التفعيل للكورسات، متابعة عمليات فوري وشحن المحفظة، وتصدير الأكواد للطباعة.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={exportCodesTxt}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm transition-colors"
            >
              <Download className="w-4 h-4" />
              تصدير الأكواد TXT
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-lg shadow-rose-600/20 transition-all hover:scale-105"
            >
              <KeyRound className="w-5 h-5" />
              توليد أكواد جديدة
            </button>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold text-sm flex items-center gap-3 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Revenue Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[
          { 
            label: 'إجمالي المبيعات المحققة (الأكواد المستخدمة)', 
            value: `EGP ${realEarnedRevenue.toLocaleString('en-US')}`, 
            sub: `${usedCount} كود تم شراؤه وتفعيله`,
            icon: TrendingUp, 
            color: 'text-emerald-600',
            bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
          },
          { 
            label: 'الأرباح المتوقعة من الأكواد المتاحة', 
            value: `EGP ${potentialRevenue.toLocaleString('en-US')}`, 
            sub: `${availableCount} كود متاح للبيع والتوزيع`,
            icon: Wallet, 
            color: 'text-amber-600',
            bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
          },
          { 
            label: 'إجمالي الأكواد المولدة بالمنصة', 
            value: codes.length.toString(), 
            sub: 'شامل كل الدفعات والسناتر',
            icon: KeyRound, 
            color: 'text-blue-600',
            bg: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'
          },
          { 
            label: 'نسبة استخدام الأكواد (الاسترداد)', 
            value: codes.length > 0 ? `${((usedCount / codes.length) * 100).toFixed(1)}%` : '0%', 
            sub: `${usedCount} من أصل ${codes.length} كود`,
            icon: CreditCard, 
            color: 'text-rose-600',
            bg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
          },
        ].map((stat, i) => (
          <div
            key={i}
            className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">{stat.label}</span>
                <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white" dir="ltr">
                {stat.value}
              </h3>
            </div>
            <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mt-2">
              {stat.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Course Breakdown Cards */}
      {courses.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-rose-600" />
              <span>تحليل الإيرادات والأكواد بحسب كل كورس (بيانات حقيقية 100%)</span>
            </h2>
            <span className="text-xs font-bold text-slate-500">
              {courses.length} كورسات
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courseFinancialBreakdown.map(({ course, totalCodes, usedCount, availableCount, earned, potential, rate }) => (
              <div
                key={course.id}
                className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 hover:border-rose-300 dark:hover:border-rose-800/60 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white line-clamp-1">
                      {course.title}
                    </h3>
                    <p className="text-[11px] font-bold text-slate-500 mt-0.5">
                      {course.stage === 'middle' ? 'المرحلة الإعدادية' : 'المرحلة الثانوية'} • الصف {course.grade} • {course.educationType === 'azhar' ? 'أزهر' : 'عام'}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-xs shrink-0">
                    {course.price} ج.م
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block">الإيراد المحقق:</span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                      EGP {earned.toLocaleString('en-US')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block">أكواد تم تفعيلها:</span>
                    <span className="font-black text-slate-900 dark:text-white text-sm">
                      {usedCount} <span className="text-[10px] font-normal text-slate-400">من {totalCodes}</span>
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-bold text-slate-500">
                    <span>نسبة بيع واستخدام الأكواد</span>
                    <span>{rate}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-rose-500 to-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Number(rate))}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <span>المتاح للبيع: <strong className="text-slate-700 dark:text-slate-300">{availableCount} كود</strong></span>
                  <span>المتوقع: <strong className="text-amber-600">EGP {potential.toLocaleString('en-US')}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Codes Table & Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالكود أو اسم الدفعة أو الكورس..."
              className="w-full h-11 pr-10 pl-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold focus:ring-2 focus:ring-rose-500"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter Buttons */}
            <div className="flex bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                  selectedStatusFilter === 'all'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                الكل ({codes.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatusFilter('used')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                  selectedStatusFilter === 'used'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                المستخدم ({usedCount})
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatusFilter('available')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                  selectedStatusFilter === 'available'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                المتاح ({availableCount})
              </button>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={selectedCourseFilter}
                onChange={(e) => setSelectedCourseFilter(e.target.value)}
                className="h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-rose-500"
              >
                <option value="all">جميع الكورسات</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.price} ج.م)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="py-12 text-center text-slate-400 font-bold">جاري تحميل الأكواد...</div>
        ) : filteredCodes.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-black border-y border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">كود التفعيل (Code)</th>
                  <th className="py-3 px-4">الكورس</th>
                  <th className="py-3 px-4">اسم الدفعة</th>
                  <th className="py-3 px-4">الحالة</th>
                  <th className="py-3 px-4">تاريخ التوليد</th>
                  <th className="py-3 px-4 text-center">نسخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredCodes.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3.5 px-4 font-mono font-black text-slate-900 dark:text-white" dir="ltr">
                      {c.code}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-700 dark:text-slate-300">
                      {c.courseTitle || 'كورس اللغة الإنجليزية'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-semibold">{c.batchName || 'دفعة عامة'}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold ${
                          c.isUsed
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                        }`}
                      >
                        {c.isUsed ? 'مستخدم ✓' : 'متاح للبيع'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {new Date(c.createdAt).toLocaleDateString('ar-EG')}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => copyToClipboard(c.code)}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 transition-colors"
                        title="نسخ الكود"
                      >
                        {copiedCode === c.code ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400 font-bold">لا توجد أكواد تطابق البحث</div>
        )}
      </div>

      {/* Generate Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl my-8"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">
                    توليد أكواد كورس جديدة
                  </h3>
                  <p className="text-xs text-slate-500 font-bold mt-1">
                    أكواد عشوائية فريدة مشفرة لتفعيل الكورسات للطلاب
                  </p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleGenerate} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    اختر الكورس المطلوب *
                  </label>
                  <select
                    required
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold focus:ring-2 focus:ring-rose-500"
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title} ({c.price} ج.م)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    عدد الأكواد المراد توليدها *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    required
                    value={codesCount}
                    onChange={(e) => setCodesCount(Number(e.target.value))}
                    className="w-full h-11 px-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-semibold focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    اسم الدفعة أو السنتر (اختياري)
                  </label>
                  <input
                    type="text"
                    value={batchName}
                    onChange={(e) => setBatchName(e.target.value)}
                    placeholder="مثال: سنتر الأوائل - دفعة أكتوبر"
                    className="w-full h-11 px-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-semibold focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={isGenerating}
                    className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-lg shadow-rose-600/20 disabled:opacity-50"
                  >
                    {isGenerating ? 'جاري التوليد...' : 'توليد الأكواد الآن'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
