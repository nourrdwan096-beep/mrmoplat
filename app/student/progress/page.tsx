'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { 
  fetchAllCourses, 
  fetchStudentEnrolledCourseIds, 
  fetchUnitsByCourse, 
  fetchItemsByUnit, 
  fetchStudentProgress,
  CourseData, 
  UnitData, 
  UnitItemData, 
  StudentItemProgressData 
} from '@/lib/academicService';
import { 
  Award, TrendingUp, CheckCircle2, AlertTriangle, 
  BookOpen, Video, FileText, HelpCircle, ChevronRight, 
  Sparkles, ArrowLeft, RotateCcw, Target, ShieldCheck,
  Crown, X, Printer, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import HonorCertificate from '@/components/HonorCertificate';

interface CourseProgressSummary {
  course: CourseData;
  units: UnitData[];
  items: UnitItemData[];
  progressMap: Record<string, StudentItemProgressData>;
  totalItems: number;
  completedItems: number;
  averageScore: number;
  passedExamsCount: number;
  failedExamsCount: number;
  weakTopics: { item: UnitItemData; score: number; relatedVideo?: UnitItemData }[];
  strongTopics: { item: UnitItemData; score: number }[];
}

interface EarnedCertificate {
  item: UnitItemData;
  course: CourseData;
  score: number;
  dateStr?: string;
  certificateId: string;
}

export default function StudentProgressPage() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [coursesSummary, setCoursesSummary] = useState<CourseProgressSummary[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [allCertificates, setAllCertificates] = useState<EarnedCertificate[]>([]);
  const [viewingCertificate, setViewingCertificate] = useState<EarnedCertificate | null>(null);

  useEffect(() => {
    async function loadAcademicProgress() {
      if (!currentUser?.id) return;
      try {
        const enrolledIds = await fetchStudentEnrolledCourseIds(currentUser.id, currentUser.email);
        const allCourses = await fetchAllCourses();
        const myCourses = allCourses.filter(c => enrolledIds.includes(c.id));

        const summaries: CourseProgressSummary[] = [];
        const earnedCerts: EarnedCertificate[] = [];

        for (const course of myCourses) {
          const units = await fetchUnitsByCourse(course.id);
          const allItems: UnitItemData[] = [];
          for (const u of units) {
            const items = await fetchItemsByUnit(u.id);
            allItems.push(...items);
          }

          const progressMap = await fetchStudentProgress(currentUser.id, course.id);

          let totalItems = allItems.length;
          let completedItems = 0;
          let scoreSum = 0;
          let scoreCount = 0;
          let passedCount = 0;
          let failedCount = 0;
          const weakTopics: { item: UnitItemData; score: number; relatedVideo?: UnitItemData }[] = [];
          const strongTopics: { item: UnitItemData; score: number }[] = [];

          allItems.forEach((item) => {
            const prog = progressMap[item.id];
            if (prog?.isPassed) {
              completedItems++;
            }

            if (item.itemType === 'exam' || item.itemType === 'homework') {
              if (prog && prog.attemptsCount > 0) {
                scoreSum += prog.highestScore;
                scoreCount++;

                if (prog.isPassed) {
                  passedCount++;
                  if (prog.highestScore >= 85) {
                    strongTopics.push({ item, score: prog.highestScore });
                  }

                  // Certificate eligibility: EXAM ONLY and HIGHEST SCORE >= 80%
                  if (item.itemType === 'exam' && prog.highestScore >= 80) {
                    earnedCerts.push({
                      item,
                      course,
                      score: prog.highestScore,
                      dateStr: prog.completedAt ? new Date(prog.completedAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }) : undefined,
                      certificateId: `MR-${item.id.slice(0, 4).toUpperCase()}-${Math.round(prog.highestScore)}`,
                    });
                  }
                } else {
                  failedCount++;
                  // Find related or previous video in the unit
                  const unitVideos = allItems.filter(i => i.unitId === item.unitId && i.itemType === 'video');
                  const relatedVideo = unitVideos[unitVideos.length - 1];
                  weakTopics.push({ item, score: prog.highestScore, relatedVideo });
                }
              }
            }
          });

          const averageScore = scoreCount > 0 ? Math.round(scoreSum / scoreCount) : 0;

          summaries.push({
            course,
            units,
            items: allItems,
            progressMap,
            totalItems,
            completedItems,
            averageScore,
            passedExamsCount: passedCount,
            failedExamsCount: failedCount,
            weakTopics,
            strongTopics
          });
        }

        setCoursesSummary(summaries);
        setAllCertificates(earnedCerts);
        setSelectedCourseId(prev => prev || (summaries.length > 0 ? summaries[0].course.id : ''));
      } catch (err) {
        console.error('Error loading progress:', err);
      } finally {
        setLoading(false);
      }
    }

    loadAcademicProgress();
  }, [currentUser?.id, currentUser?.email]);

  const activeSummary = coursesSummary.find(s => s.course.id === selectedCourseId) || coursesSummary[0];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-2 flex items-center gap-2">
            تقدمي الأكاديمي <Award className="w-8 h-8 text-amber-500" />
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm md:text-base">
            تحليل درجاتك ونقاط القوة والضعف في كل كورس وسجل شهادات التكريم المعتمدة من مستر محمد رضوان.
          </p>
        </div>
      </div>

      {/* Royal Honor Certificates Counter Banner */}
      {!loading && (
        <div className="relative overflow-hidden p-6 md:p-8 rounded-3xl bg-gradient-to-br from-amber-500/10 via-violet-500/5 to-amber-500/15 border-2 border-amber-400/40 dark:border-amber-500/30 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/30">
                <Crown className="w-8 h-8" />
              </div>
              <div>
                <span className="text-xs font-black text-amber-700 dark:text-amber-300 uppercase tracking-wider block">
                  لوحة الشرف والتميز الأكاديمي
                </span>
                <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">
                  عدد الشهادات التي حصلت عليها منذ انضمامك للمنصة
                </h3>
              </div>
            </div>

            {/* Counter Value */}
            <div className="text-right sm:text-left">
              {allCertificates.length === 0 ? (
                <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-500/20 border border-amber-400/50 text-amber-800 dark:text-amber-200 font-black text-sm md:text-base shadow-sm">
                  <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
                  <span>ستحصل بإذن الله عليها قريبًا 🌟</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-black text-lg md:text-xl shadow-lg shadow-amber-500/30">
                  <Award className="w-6 h-6" />
                  <span>{allCertificates.length} {allCertificates.length === 1 ? 'شهادة تقدير وتكريم' : 'شهادات تقدير وتكريم'}</span>
                </div>
              )}
            </div>
          </div>

          <p className="text-xs font-bold text-slate-600 dark:text-slate-300 max-w-3xl">
            💡 تُمنح شهادة التقدير والتكريم الرسمية حصرياً عند تجاوز نسبة 80% فما فوق في أي امتحان شامل، وتوثق باسم الطالب وتوقيع مستر محمد رضوان.
          </p>

          {/* List of Earned Certificates Cards */}
          {allCertificates.length > 0 && (
            <div className="pt-2">
              <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" /> الشهادات المكتسبة القابلة للعرض والطباعة:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {allCertificates.map((cert) => (
                  <div
                    key={cert.item.id}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50 shadow-sm flex items-center justify-between gap-3 hover:border-amber-400 transition-all"
                  >
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 block truncate">
                        {cert.course.title}
                      </span>
                      <h5 className="text-xs font-black text-slate-900 dark:text-white truncate">
                        {cert.item.title}
                      </h5>
                      <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 block mt-0.5">
                        درجة الامتياز: {cert.score}%
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setViewingCertificate(cert)}
                      className="shrink-0 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>عرض</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-slate-400 font-bold">جاري تحليل مستواك ودرجاتك والشهادات...</div>
      ) : coursesSummary.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
          <BookOpen className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
          <h3 className="text-lg font-black text-slate-800 dark:text-slate-200">لست مشتركاً في أي كورس حالياً</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            اشترك في كورسات مستر محمد رضوان لتبدأ حل الواجبات والامتحانات وتتبع تقدمك خطوة بخطوة.
          </p>
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 text-white font-black text-xs rounded-2xl shadow-lg shadow-violet-600/20"
          >
            تصفح الكورسات المتاحة
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Course Selector Tabs */}
          <div className="flex gap-3 overflow-x-auto pb-2">
            {coursesSummary.map(s => {
              const isSelected = s.course.id === activeSummary?.course.id;
              const percent = s.totalItems > 0 ? Math.round((s.completedItems / s.totalItems) * 100) : 0;
              return (
                <button
                  key={s.course.id}
                  onClick={() => setSelectedCourseId(s.course.id)}
                  className={`px-5 py-3 rounded-2xl font-black text-xs whitespace-nowrap transition-all flex items-center gap-3 border ${isSelected ? 'bg-violet-600 text-white border-violet-600 shadow-md shadow-violet-600/20' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-violet-300'}`}
                >
                  <span>{s.course.title}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                    {percent}% مكتمل
                  </span>
                </button>
              );
            })}
          </div>

          {activeSummary && (
            <div className="space-y-8">
              
              {/* Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-xs font-bold text-slate-400">نسبة إنجاز المنهج</span>
                  <div className="text-3xl font-black text-violet-600 dark:text-violet-400 mt-2">
                    {activeSummary.totalItems > 0 ? Math.round((activeSummary.completedItems / activeSummary.totalItems) * 100) : 0}%
                  </div>
                  <div className="mt-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-violet-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${activeSummary.totalItems > 0 ? Math.round((activeSummary.completedItems / activeSummary.totalItems) * 100) : 0}%` }}
                    />
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-xs font-bold text-slate-400">متوسط درجات الاختبارات</span>
                  <div className="text-3xl font-black text-slate-900 dark:text-white mt-2">
                    {activeSummary.averageScore}%
                  </div>
                  <span className="text-[11px] font-bold text-emerald-500 mt-2 block">
                    {activeSummary.averageScore >= 80 ? 'مستوى ممتاز ومتقدم' : activeSummary.averageScore >= 60 ? 'مستوى جيد ويحتاج تثبيت' : 'بحاجة للمراجعة المكثفة'}
                  </span>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-xs font-bold text-emerald-500">اختبارات تم اجتيازها</span>
                  <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
                    {activeSummary.passedExamsCount}
                  </div>
                  <span className="text-[11px] font-bold text-slate-400 mt-2 block">نجاح وتفوق</span>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-xs font-bold text-rose-500">مهام تحتاج إعادة أو مراجعة</span>
                  <div className="text-3xl font-black text-rose-600 dark:text-rose-400 mt-2">
                    {activeSummary.failedExamsCount}
                  </div>
                  <span className="text-[11px] font-bold text-slate-400 mt-2 block">درجة أقل من نسبة النجاح</span>
                </div>
              </div>

              {/* Weakness & Strength Analysis Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Weak Topics (Need Revision) */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-rose-100 dark:border-rose-950/40 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-black">
                    <AlertTriangle className="w-5 h-5" />
                    <h3 className="text-base">نقاط الضعف والدروس الواجب مراجعتها</h3>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    بناءً على نتائجك في الواجبات والامتحانات، هذه الدروس تحتاج منك إعادة مشاهدة الشرح وحل الأسئلة مجدداً:
                  </p>

                  {activeSummary.weakTopics.length === 0 ? (
                    <div className="p-6 text-center bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-800/40">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                      <p className="text-xs font-black text-emerald-700 dark:text-emerald-300">
                        رائع جداً! لا توجد لديك أي نقاط ضعف مسجلة في هذا الكورس حتى الآن.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activeSummary.weakTopics.map(({ item, score, relatedVideo }) => (
                        <div 
                          key={item.id}
                          className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div>
                            <span className="text-xs font-black text-slate-900 dark:text-white block">
                              {item.title}
                            </span>
                            <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                              الدرجة المسجلة: {score}% (أقل من نسبة الاجتياز)
                            </span>
                          </div>
                          {relatedVideo && (
                            <Link
                              href={`/student/study/${activeSummary.course.id}?itemId=${relatedVideo.id}`}
                              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 whitespace-nowrap shadow-md shadow-rose-600/10"
                            >
                              <RotateCcw className="w-3.5 h-3.5" /> مراجعة الشرح
                            </Link>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Strong Topics */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-950/40 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black">
                    <ShieldCheck className="w-5 h-5" />
                    <h3 className="text-base">نقاط القوة والتميز الأكاديمي</h3>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    الدروس والوحدات التي حققت فيها درجات فائقة وتثبت إتقانك التام لقواعدها ومفرداتها:
                  </p>

                  {activeSummary.strongTopics.length === 0 ? (
                    <div className="p-6 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <Target className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-500">
                        أكمل حل الواجبات والامتحانات لتحصل على وسام التميز في الدروس المتفوق فيها.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activeSummary.strongTopics.map(({ item, score }) => (
                        <div 
                          key={item.id}
                          className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 flex items-center justify-between gap-3"
                        >
                          <div>
                            <span className="text-xs font-black text-slate-900 dark:text-white block">
                              {item.title}
                            </span>
                            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                              إتقان تام بدرجة: {score}%
                            </span>
                          </div>
                          <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-black text-xs rounded-xl">
                            متقن ✓
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Detailed Breakdown per Unit */}
              <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-violet-500" /> تفاصيل إنجازك في وحدات الكورس
                </h3>

                <div className="space-y-6">
                  {activeSummary.units.map(unit => {
                    const unitItems = activeSummary.items.filter(i => i.unitId === unit.id);
                    return (
                      <div key={unit.id} className="border border-slate-100 dark:border-slate-800 rounded-2xl p-5 space-y-4 bg-slate-50/50 dark:bg-slate-900/50">
                        <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-3">
                          <h4 className="text-base font-black text-slate-900 dark:text-white">
                            الوحدة {unit.unitNumber}: {unit.title}
                          </h4>
                          <span className="text-xs font-bold text-slate-400">
                            {unitItems.filter(i => activeSummary.progressMap[i.id]?.isPassed).length} من {unitItems.length} عنصر مكتمل
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {unitItems.map(item => {
                            const prog = activeSummary.progressMap[item.id];
                            const isPassed = prog?.isPassed;
                            return (
                              <div
                                key={item.id}
                                className={`p-3.5 rounded-xl border flex items-center justify-between gap-2 ${isPassed ? 'bg-emerald-50/40 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="shrink-0 text-slate-400">
                                    {item.itemType === 'video' ? <Video className="w-4 h-4 text-blue-500" /> : <FileText className="w-4 h-4 text-violet-500" />}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-black text-slate-800 dark:text-slate-200 truncate">
                                      {item.title}
                                    </p>
                                    <p className="text-[10px] text-slate-400 font-semibold">
                                      {item.itemType === 'video' ? 'محاضرة شرح' : item.itemType === 'exam' ? 'امتحان شامل' : 'واجب تطبيقي'}
                                    </p>
                                  </div>
                                </div>

                                <div className="shrink-0 text-left">
                                  {isPassed ? (
                                    <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      {prog?.highestScore ? `${prog.highestScore}%` : 'تم'}
                                    </span>
                                  ) : prog?.attemptsCount ? (
                                    <span className="text-[10px] font-black text-rose-500">
                                      {prog.highestScore}% (إعادة)
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-bold text-slate-400">
                                      لم يبدأ
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* Certificate Viewer Modal */}
      <AnimatePresence>
        {viewingCertificate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-4xl bg-slate-900 rounded-3xl p-4 sm:p-6 border border-amber-500/40 shadow-2xl my-8"
            >
              <button
                type="button"
                onClick={() => setViewingCertificate(null)}
                className="absolute top-6 left-6 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all print:hidden"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="pt-8">
                <HonorCertificate
                  studentName={currentUser?.fullName || 'الطالب المتفوق'}
                  examTitle={viewingCertificate.item.title}
                  courseTitle={viewingCertificate.course.title}
                  scorePercentage={viewingCertificate.score}
                  dateStr={viewingCertificate.dateStr}
                  certificateId={viewingCertificate.certificateId}
                  onClose={() => setViewingCertificate(null)}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mandatory Signature Footer */}
      <div className="text-center pt-8 pb-4 text-xs font-bold text-slate-400 dark:text-slate-500">
        Built With Developer & Designer NOUR M. EL-SAIED 💚 💚
      </div>

    </div>
  );
}
