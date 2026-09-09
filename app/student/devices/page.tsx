'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
  getStudentRegisteredDevices, 
  deleteSecondaryStudentDevice, 
  getStrictDeviceFingerprint,
  RegisteredDeviceEntry 
} from '@/lib/deviceSecurity';
import { fetchAllCourses, fetchStudentEnrolledCourseIds, CourseData } from '@/lib/academicService';
import { 
  deleteStudentSecondaryDeviceAction, 
  getStudentRegisteredDevicesAction 
} from '@/app/actions/studentActions';
import { 
  MonitorSmartphone, 
  Shield, 
  Trash2, 
  Smartphone, 
  Monitor, 
  Tablet,
  Info, 
  CheckCircle2, 
  AlertTriangle,
  BookOpen,
  Sparkles,
  Layers,
  Radio,
  Cpu,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function StudentDevicesPage() {
  const { currentUser } = useAuth();
  const [devices, setDevices] = useState<RegisteredDeviceEntry[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<CourseData[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
  const [currentFp, setCurrentFp] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!currentUser?.id) return;
      setIsLoading(true);
      try {
        const [fp, loadedDevs, allCourses, eIds] = await Promise.all([
          getStrictDeviceFingerprint(),
          getStudentRegisteredDevices(currentUser.id),
          fetchAllCourses(),
          fetchStudentEnrolledCourseIds(currentUser.id, currentUser.email)
        ]);

        setCurrentFp(fp);
        setDevices(loadedDevs);
        setEnrolledCourses(allCourses.filter(c => eIds.includes(c.id)));
      } catch (err) {
        console.error('Failed to load device data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [currentUser?.id, currentUser?.email]);

  const handleRefresh = async () => {
    if (!currentUser?.id) return;
    setIsLoading(true);
    try {
      const refreshed = await getStudentRegisteredDevices(currentUser.id);
      setDevices(refreshed);
      setActionMessage({ text: 'تم تحديث قائمة الأجهزة بنجاح ✨', type: 'success' });
      setTimeout(() => setActionMessage(null), 3000);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDevice = async (id: string, isPrimary: boolean) => {
    if (!currentUser?.id) return;
    if (isPrimary) {
      setActionMessage({
        text: 'عذراً، الجهاز الأساسي مثبت دائماً لضمان أمان حسابك وحماية الكورس. يمكنك استبدال الجهاز الثاني فقط.',
        type: 'error'
      });
      setTimeout(() => setActionMessage(null), 5000);
      return;
    }

    if (!confirm('هل أنت متأكد من رغبتك في إزالة هذا الجهاز الثانوي؟\n\nتنبيه: الجهاز لن يتم حظره، بل سيتم إخلاء مكانه (الجهاز الثاني) لتتمكن من الدخول من أي هاتف أو كمبيوتر آخر تريده، ويمكنك إعادة استخدامه لاحقاً.')) {
      return;
    }

    try {
      // 1. Local removal
      const successLocal = await deleteSecondaryStudentDevice(currentUser.id, id);
      
      // 2. Server action removal
      try {
        await deleteStudentSecondaryDeviceAction(currentUser.id, id);
      } catch (e) {
        console.warn('Server delete optional error:', e);
      }

      if (successLocal) {
        const refreshed = await getStudentRegisteredDevices(currentUser.id);
        setDevices(refreshed);
        setActionMessage({
          text: 'تم إزالة الجهاز الثانوي بنجاح. المكان متاح الآن لتسجيل أي جهاز ثانٍ تختاره دون أي قيود.',
          type: 'success'
        });
        setTimeout(() => setActionMessage(null), 5000);
      }
    } catch {
      setActionMessage({ text: 'حدث خطأ أثناء محاولة إزالة الجهاز.', type: 'error' });
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  const filteredDevices = devices.filter(d => {
    if (selectedCourseId === 'all') return true;
    return !d.courseId || d.courseId === selectedCourseId;
  });

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto space-y-6 md:space-y-8" dir="rtl">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-1.5 flex items-center gap-2.5">
            <span>أجهزتي المسجلة المعتمدة</span>
            <div className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-500">
              <MonitorSmartphone className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-xs sm:text-sm">
            إدارة ومتابعة الأجهزة المسموح لها بالدخول ومتابعة الكورسات (جهازان بحد أقصى).
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="self-start sm:self-auto flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>تحديث الأجهزة</span>
        </button>
      </div>

      {/* Action Alerts */}
      <AnimatePresence>
        {actionMessage && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`p-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-3 border ${
              actionMessage.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
            }`}
          >
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 shrink-0" />
            )}
            <span className="leading-relaxed">{actionMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Policy Card (Futuristic & Clear) */}
      <div className="bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-indigo-500/5 border border-emerald-500/20 dark:border-emerald-500/30 rounded-3xl p-5 sm:p-6 relative overflow-hidden">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
            <Shield className="w-5 h-5" />
          </div>
          <div className="space-y-2">
            <h4 className="font-black text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
              <span>نظام الأجهزة الذكي وحماية الكورسات</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black">
                نظام صارم وسلس 2030
              </span>
            </h4>
            <ul className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-1.5 font-medium leading-relaxed list-disc list-inside">
              <li>
                <strong>الجهاز الأول (الأساسي):</strong> هو الجهاز الذي سجلت به لأول مرة، مثبت دائماً ومحمي ولا يمكن حذفه لضمان أمان حسابك.
              </li>
              <li>
                <strong>الجهاز الثاني (المرن):</strong> يمكنك استخدامه مع الجهاز الأساسي، ويمكنك حذفه وتبديله في أي وقت بأي هاتف أو كمبيوتر آخر دون أي حظر.
              </li>
              <li>
                <strong>التشغيل المتوازي:</strong> كلا الجهازين المعتمدين يعملان بسلاسة تامة دون أي تعليق أو تعارض على الإطلاق.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Course Filter Bar (If student is enrolled in courses) */}
      {enrolledCourses.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
            <BookOpen className="w-4 h-4 text-emerald-500" />
            <span>تصفية الأجهزة بحسب الكورس:</span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setSelectedCourseId('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                selectedCourseId === 'all'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              جميع الكورسات ({devices.length})
            </button>
            {enrolledCourses.map(course => (
              <button
                key={course.id}
                onClick={() => setSelectedCourseId(course.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                  selectedCourseId === course.id
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {course.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Devices List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 font-bold flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs sm:text-sm">جاري جلب وفحص الأجهزة المعتمدة لحسابك...</span>
          </div>
        ) : filteredDevices.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-slate-400 font-bold text-sm">
            لا توجد أجهزة مسجلة لهذا الكورس حتى الآن.
          </div>
        ) : (
          filteredDevices.map((device, index) => {
            const isCurrent = currentFp && (device.fingerprint === currentFp || device.id === 'dev_primary_main');
            const isMobile = device.name.includes('هاتف') || device.browser.includes('iOS') || device.browser.includes('Android');
            const isTablet = device.name.includes('تابلت') || device.browser.includes('iPad');

            return (
              <motion.div 
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={device.id || index} 
                className={`
                  bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5 border transition-all
                  ${device.isPrimary 
                    ? 'border-emerald-500/60 dark:border-emerald-500/40 shadow-sm shadow-emerald-500/5' 
                    : 'border-slate-200 dark:border-slate-800'}
                `}
              >
                <div className="flex items-start sm:items-center gap-4">
                  
                  {/* Icon */}
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                    device.isPrimary 
                      ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                      : 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                  }`}>
                    {isTablet ? (
                      <Tablet className="w-6 h-6" />
                    ) : isMobile ? (
                      <Smartphone className="w-6 h-6" />
                    ) : (
                      <Monitor className="w-6 h-6" />
                    )}
                  </div>
                  
                  {/* Details */}
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">
                        {device.name}
                      </h3>

                      {device.isPrimary ? (
                        <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black border border-emerald-100 dark:border-emerald-500/20 flex items-center gap-1 shrink-0">
                          <Shield className="w-3 h-3" /> الجهاز الأساسي (مثبت)
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-black border border-indigo-100 dark:border-indigo-500/20 flex items-center gap-1 shrink-0">
                          الجهاز الثاني (مرن)
                        </span>
                      )}

                      {isCurrent && (
                        <span className="px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-black border border-amber-200 dark:border-amber-500/30 flex items-center gap-1 shrink-0">
                          <Radio className="w-3 h-3 animate-pulse text-amber-500" /> هذا الجهاز الحالي
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                        الحالة: {device.lastActive || 'نشط'}
                      </span>
                      <span className="truncate max-w-[220px]">{device.browser}</span>
                      {device.registeredAt && (
                        <span className="text-slate-400">سجل في: {device.registeredAt}</span>
                      )}
                    </div>
                  </div>

                </div>

                {/* Actions */}
                <div className="flex items-center justify-end sm:justify-start gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                  {device.isPrimary ? (
                    <div className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 text-xs font-bold flex items-center gap-1.5 border border-slate-200/50 dark:border-slate-800">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>مثبت للأمان</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleDeleteDevice(device.id, false)}
                      className="px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-black hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-all flex items-center gap-1.5 border border-rose-200 dark:border-rose-900/30 active:scale-95"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>إزالة / تبديل الجهاز</span>
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Available Slot Notice */}
      {!isLoading && devices.length < 2 && (
        <div className="p-4 rounded-2xl border border-dashed border-emerald-300 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 text-center text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-500" />
          <span>لديك مكان شاغر لجهاز ثانٍ. يمكنك فتح المنصة من أي هاتف أو لابتوب آخر وسيتم اعتماده تلقائياً كجهازك الثاني.</span>
        </div>
      )}

    </div>
  );
}
