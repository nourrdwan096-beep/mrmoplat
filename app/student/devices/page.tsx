'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  getStudentRegisteredDevices,
  deleteSecondaryStudentDevice,
  getDeviceContextPayload,
  RegisteredDeviceEntry,
  CourseDeviceGroup,
} from '@/lib/deviceSecurity';
import { fetchAllCourses, fetchStudentEnrolledCourseIds, CourseData } from '@/lib/academicService';
import {
  MonitorSmartphone,
  Shield,
  Trash2,
  Smartphone,
  Monitor,
  Tablet,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Sparkles,
  Radio,
  RefreshCw,
  Lock,
  Globe,
  Infinity as InfinityIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';

function formatQuotaLabel(maxDevices: number): string {
  if (maxDevices >= 1000) return 'مفتوح';
  if (maxDevices === 1) return 'جهاز واحد';
  if (maxDevices === 2) return 'جهازان';
  return `${maxDevices} أجهزة`;
}

export default function StudentDevicesPage() {
  const { currentUser } = useAuth();
  const [devices, setDevices] = useState<RegisteredDeviceEntry[]>([]);
  const [courseGroups, setCourseGroups] = useState<CourseDeviceGroup[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<CourseData[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
  const [currentCoreId, setCurrentCoreId] = useState<string>('');
  const [currentFp, setCurrentFp] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [deviceToRemove, setDeviceToRemove] = useState<RegisteredDeviceEntry | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  // Respect optional ?courseId= query parameter without needing Suspense wrapper
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const cid = sp.get('courseId');
      if (cid) setSelectedCourseId(cid);
    }
  }, []);

  useEffect(() => {
    async function loadData() {
      if (!currentUser?.id) return;
      setIsLoading(true);
      try {
        const [ctx, loaded, allCourses, eIds] = await Promise.all([
          getDeviceContextPayload(),
          getStudentRegisteredDevices(currentUser.id),
          fetchAllCourses(),
          fetchStudentEnrolledCourseIds(currentUser.id, currentUser.email),
        ]);

        setCurrentCoreId(ctx.hardwareCoreId);
        setCurrentFp(ctx.primaryFingerprint);
        setDevices(loaded.devices);
        setCourseGroups(loaded.courseGroups);
        setEnrolledCourses(allCourses.filter((c) => eIds.includes(c.id)));
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
      setDevices(refreshed.devices);
      setCourseGroups(refreshed.courseGroups);
      setActionMessage({ text: 'تم تحديث قائمة أجهزة الكورسات المعتمدة بنجاح ✨', type: 'success' });
      setTimeout(() => setActionMessage(null), 3000);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDevice = (device: RegisteredDeviceEntry) => {
    if (!currentUser?.id) return;
    if (device.isPrimary) {
      setActionMessage({
        text: 'عذراً، هذا هو الجهاز الأساسي الذي تم تفعيل الكورس من خلاله وهو مثبت دائماً للأمان ولا يمكن حذفه. يمكنك استبدال الأجهزة الإضافية فقط.',
        type: 'error',
      });
      setTimeout(() => setActionMessage(null), 5000);
      return;
    }
    setDeviceToRemove(device);
  };

  const confirmRemoveDevice = async () => {
    if (!currentUser?.id || !deviceToRemove) return;
    setIsRemoving(true);
    try {
      const res = await deleteSecondaryStudentDevice(
        currentUser.id,
        deviceToRemove.id,
        deviceToRemove.courseId
      );

      if (res.success) {
        const refreshed = await getStudentRegisteredDevices(currentUser.id);
        setDevices(refreshed.devices);
        setCourseGroups(refreshed.courseGroups);
        setActionMessage({
          text:
            res.message ||
            'تم إزالة الجهاز الإضافي بنجاح وإخلاء مقعده في هذا الكورس لتتمكن من استخدام جهاز آخر.',
          type: 'success',
        });
        setTimeout(() => setActionMessage(null), 5000);
      } else {
        setActionMessage({
          text: res.message || 'تعذر إزالة الجهاز. تأكد أنه ليس الجهاز الأساسي المثبت.',
          type: 'error',
        });
        setTimeout(() => setActionMessage(null), 5000);
      }
    } catch {
      setActionMessage({ text: 'حدث خطأ أثناء محاولة إزالة الجهاز.', type: 'error' });
      setTimeout(() => setActionMessage(null), 4000);
    } finally {
      setIsRemoving(false);
      setDeviceToRemove(null);
    }
  };

  // Merge course groups with enrolledCourses so every enrolled course appears cleanly in tabs
  const courseTabs = useMemo(() => {
    const map = new Map<string, CourseDeviceGroup>();
    for (const grp of courseGroups) {
      map.set(grp.courseId, grp);
    }
    for (const c of enrolledCourses) {
      if (!map.has(c.id)) {
        const maxD = Number(c.maxDevices ?? 3);
        const isUnlimited = maxD >= 1000;
        map.set(c.id, {
          courseId: c.id,
          courseTitle: c.title,
          maxDevices: maxD,
          isUnlimited,
          activeCount: 0,
          remainingSlots: isUnlimited ? null : maxD,
          devices: [],
        });
      }
    }
    return Array.from(map.values());
  }, [courseGroups, enrolledCourses]);

  const activeGroup = useMemo(() => {
    if (selectedCourseId === 'all') return null;
    return courseTabs.find((g) => g.courseId === selectedCourseId) || null;
  }, [selectedCourseId, courseTabs]);

  const displayedDevices = useMemo(() => {
    if (selectedCourseId === 'all') return devices;
    if (activeGroup) return activeGroup.devices;
    return devices.filter((d) => d.courseId === selectedCourseId);
  }, [selectedCourseId, activeGroup, devices]);

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto space-y-6 md:space-y-8" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-1.5 flex items-center gap-2.5">
            <span>أجهزة الكورسات المعتمدة</span>
            <div className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-500">
              <MonitorSmartphone className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-xs sm:text-sm">
            إدارة ومتابعة الأجهزة المعتمدة لمشاهدة كل كورس من كورساتك وفقاً للحد المقرر من المعلم.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="self-start sm:self-auto flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>تحديث القائمة</span>
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

      {/* Policy Card */}
      <div className="bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-indigo-500/5 border border-emerald-500/20 dark:border-emerald-500/30 rounded-3xl p-5 sm:p-6 relative overflow-hidden">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
            <Shield className="w-5 h-5" />
          </div>
          <div className="space-y-2">
            <h4 className="font-black text-sm sm:text-base text-slate-900 dark:text-white flex flex-wrap items-center gap-2">
              <span>نظام حماية أجهزة الكورسات الذكي</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black">
                توحيد تلقائي للمتصفحات
              </span>
            </h4>
            <ul className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-1.5 font-medium leading-relaxed list-disc list-inside">
              <li>
                <strong>الجهاز الأساسي (جهاز التفعيل):</strong> الجهاز الذي تفعل عليه الكورس لأول مرة يثبت تلقائياً كجهاز أساسي محمي لا يمكن حذفه لضمان أمان اشتراكك.
              </li>
              <li>
                <strong>الأجهزة الإضافية (المرنة):</strong> يمكنك تشغيل الكورس من أجهزة إضافية حتى الحد المقرر للكورس من المعلم، ويمكنك إزالة أو تبديل أي جهاز إضافي في أي وقت.
              </li>
              <li>
                <strong>المتصفحات على نفس الجهاز:</strong> فتح الكورس من Chrome أو Edge أو Firefox أو Safari على نفس الهاتف أو الكمبيوتر يُحتسب كجهاز واحد فقط ولا يستهلك رصيد أجهزة إضافي.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Course Filter Tabs */}
      {courseTabs.length > 0 && (
        <div className="flex flex-col gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
            <BookOpen className="w-4 h-4 text-emerald-500" />
            <span>عرض الأجهزة حسب الكورس:</span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCourseId('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedCourseId === 'all'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span>جميع الكورسات</span>
              <span className="px-1.5 py-0.5 rounded-md bg-black/10 dark:bg-white/10 font-mono text-[10px]">
                {devices.length}
              </span>
            </button>

            {courseTabs.map((grp) => (
              <button
                key={grp.courseId}
                onClick={() => setSelectedCourseId(grp.courseId)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-2 ${
                  selectedCourseId === grp.courseId
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span className="max-w-[180px] truncate">{grp.courseTitle}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-md font-mono text-[10px] ${
                    selectedCourseId === grp.courseId
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {grp.isUnlimited ? `${grp.activeCount} / مفتوح` : `${grp.activeCount} / ${grp.maxDevices}`}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected Course Quota Summary Banner */}
      {activeGroup && (
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-100/80 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
              رصيد الأجهزة المعتمد لكورس:
            </div>
            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
              {activeGroup.courseTitle}
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold">
              <span className="text-slate-500 dark:text-slate-400">الأجهزة المستخدمة: </span>
              <span className="font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {activeGroup.activeCount}
              </span>
              <span className="text-slate-400 mx-1">/</span>
              <span className="font-black text-slate-900 dark:text-white">
                {activeGroup.isUnlimited ? 'مفتوح' : activeGroup.maxDevices}
              </span>
            </div>

            {activeGroup.isUnlimited ? (
              <div className="px-3.5 py-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-black flex items-center gap-1.5">
                <InfinityIcon className="w-4 h-4" />
                <span>مسموح بدون حد أقصى في هذا الكورس</span>
              </div>
            ) : (
              <div className="px-3.5 py-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-xs font-black">
                {activeGroup.remainingSlots && activeGroup.remainingSlots > 0
                  ? `متبقي ${formatQuotaLabel(activeGroup.remainingSlots)} متاح`
                  : 'اكتمل الحد المقرر لهذا الكورس'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Devices List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 font-bold flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs sm:text-sm">جاري فحص الأجهزة المعتمدة لكورساتك...</span>
          </div>
        ) : displayedDevices.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold text-sm space-y-2">
            <MonitorSmartphone className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
            <p>لم يتم ربط أي جهاز لمشاهدة هذا الكورس حتى الآن.</p>
            <p className="text-xs text-slate-400">
              بمجرد فتح أي محاضرة أو تفعيل الكورس سيتم تسجيل جهازك تلقائياً هنا.
            </p>
          </div>
        ) : (
          displayedDevices.map((device, index) => {
            const isCurrent = Boolean(
              (currentCoreId && device.hardwareCoreId && device.hardwareCoreId === currentCoreId) ||
                (currentFp && device.fingerprint === currentFp)
            );
            const devType = device.deviceType;
            const isMobile =
              devType === 'mobile' ||
              device.name.includes('هاتف') ||
              device.browser.includes('iOS') ||
              device.browser.includes('Android');
            const isTablet = devType === 'tablet' || device.name.includes('تابلت') || device.browser.includes('iPad');
            const browsersList =
              device.browsersSeen && device.browsersSeen.length > 0 ? device.browsersSeen : [device.browser];

            return (
              <motion.div
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={`${device.courseId || 'g'}-${device.id}-${index}`}
                className={`bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5 border transition-all ${
                  device.isPrimary
                    ? 'border-emerald-500/60 dark:border-emerald-500/40 shadow-sm shadow-emerald-500/5'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-start sm:items-center gap-4 min-w-0">
                  {/* Icon */}
                  <div
                    className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                      device.isPrimary
                        ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                        : 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                    }`}
                  >
                    {isTablet ? (
                      <Tablet className="w-6 h-6" />
                    ) : isMobile ? (
                      <Smartphone className="w-6 h-6" />
                    ) : (
                      <Monitor className="w-6 h-6" />
                    )}
                  </div>

                  {/* Details */}
                  <div className="space-y-2 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">
                        {device.name}
                      </h3>

                      {device.isPrimary ? (
                        <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black border border-emerald-100 dark:border-emerald-500/20 flex items-center gap-1 shrink-0">
                          <Lock className="w-3 h-3" /> الجهاز الأساسي (جهاز التفعيل المثبت)
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-black border border-indigo-100 dark:border-indigo-500/20 flex items-center gap-1 shrink-0">
                          جهاز إضافي (قابل للتبديل)
                        </span>
                      )}

                      {isCurrent && (
                        <span className="px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-black border border-amber-200 dark:border-amber-500/30 flex items-center gap-1 shrink-0">
                          <Radio className="w-3 h-3 animate-pulse text-amber-500" /> جهازك الحالي الآن
                        </span>
                      )}
                    </div>

                    {selectedCourseId === 'all' && device.courseTitle && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold">
                        <BookOpen className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>الكورس: {device.courseTitle}</span>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                        آخر نشاط: {device.lastActive || 'نشط'}
                      </span>
                      {device.os && <span>النظام: {device.os}</span>}
                      {device.registeredAt && (
                        <span className="text-slate-400">تاريخ التوثيق: {device.registeredAt}</span>
                      )}
                    </div>

                    {/* Unified Browsers Chips */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                        <Globe className="w-3 h-3" /> المتصفحات المستخدمة على هذا الجهاز:
                      </span>
                      {browsersList.map((br, bIdx) => (
                        <span
                          key={bIdx}
                          className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold border border-slate-200/70 dark:border-slate-700/70"
                        >
                          {br}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end sm:justify-start gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800 shrink-0">
                  {device.isPrimary ? (
                    <div className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-xs font-bold flex items-center gap-1.5 border border-slate-200/70 dark:border-slate-800">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>مثبت للأمان</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleDeleteDevice(device)}
                      className="px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-black hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-all flex items-center gap-1.5 border border-rose-200 dark:border-rose-900/30 active:scale-95 cursor-pointer"
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
      {!isLoading && activeGroup && !activeGroup.isUnlimited && (activeGroup.remainingSlots ?? 0) > 0 && (
        <div className="p-4 rounded-2xl border border-dashed border-emerald-300 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 text-center text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>
            لديك {formatQuotaLabel(activeGroup.remainingSlots ?? 0)} شاغر في هذا الكورس؛ عند فتح الكورس من جهاز آخر سيتم اعتماده تلقائياً ضمن رصيدك المسموح.
          </span>
        </div>
      )}

      <DeleteConfirmationModal
        isOpen={Boolean(deviceToRemove)}
        onClose={() => setDeviceToRemove(null)}
        onConfirm={confirmRemoveDevice}
        isLoading={isRemoving}
        title="تأكيد إزالة الجهاز الإضافي"
        itemType="الجهاز"
        itemName={
          deviceToRemove
            ? `${deviceToRemove.name}${deviceToRemove.courseTitle ? ` — ${deviceToRemove.courseTitle}` : ''}`
            : ''
        }
        warningNote="لن يتم حظر الجهاز، بل سيتم إخلاء مقعده في هذا الكورس فقط لتتمكن من استخدام جهاز آخر بدلاً منه."
      />
    </div>
  );
}
