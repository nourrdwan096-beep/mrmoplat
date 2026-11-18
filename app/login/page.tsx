'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mail, Lock, LogIn, ArrowRight, Clock, CheckCircle2, Phone, RefreshCw,
  Eye, EyeOff, ShieldCheck, KeyRound, MessageCircle, AlertTriangle, Languages,
  Check, X, Sparkles
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { normalizeEasternArabicDigits, analyzePasswordScript } from '@/lib/utils';

type ForgotStep = 'identify' | 'waiting_approval' | 'set_new_password' | 'completed';

export default function LoginPage() {
  const router = useRouter();
  const { loginWithCredentials } = useAuth();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [pendingStudent, setPendingStudent] = useState<any>(null);

  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [studentIdForOtp, setStudentIdForOtp] = useState('');

  // Forgot Password / Recovery State
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [forgotStep, setForgotStep] = useState<ForgotStep>('identify');
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetInfo, setResetInfo] = useState<{
    studentName?: string;
    email?: string;
    maskedEmail?: string;
    studentPhone?: string;
    whatsappUrl?: string;
    expiresAt?: string;
  } | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetChecking, setResetChecking] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetNotice, setResetNotice] = useState('');
  const [bgImageError, setBgImageError] = useState(false);

  // Check URL ?mode=forgot cleanly on client mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'forgot') {
      setIsForgotMode(true);
      setForgotStep('identify');
    }
  }, []);

  const getClientDeviceContext = async () => {
    try {
      const { getDeviceContextPayload } = await import('@/lib/deviceSecurity');
      const ctx = await getDeviceContextPayload();
      return {
        deviceFingerprint: ctx.primaryFingerprint,
        hardwareCoreId: ctx.hardwareCoreId,
        candidateFingerprints: ctx.candidateFingerprints,
      };
    } catch {
      return { deviceFingerprint: '', hardwareCoreId: '', candidateFingerprints: [] as string[] };
    }
  };

  const checkResetApprovalStatus = useCallback(async (identifierToCheck: string, silent = false) => {
    const cleanId = normalizeEasternArabicDigits(identifierToCheck).trim();
    if (!cleanId) return;
    if (!silent) setResetChecking(true);
    setResetError('');
    try {
      const { requestOrCheckPasswordResetAction } = await import('@/app/actions/studentActions');
      const dev = await getClientDeviceContext();
      const res = await requestOrCheckPasswordResetAction({
        identifier: cleanId,
        deviceFingerprint: dev.deviceFingerprint,
        hardwareCoreId: dev.hardwareCoreId,
        candidateFingerprints: dev.candidateFingerprints,
        submitRequest: false,
      });

      if (!res.success) {
        if (!silent) setResetError(res.message || 'تعذر التحقق من حالة الطلب');
        return;
      }

      if (res.status === 'approved') {
        setResetInfo(prev => ({
          ...prev,
          studentName: res.studentName,
          email: res.email,
          maskedEmail: res.maskedEmail,
          expiresAt: res.expiresAt,
        }));
        setForgotStep('set_new_password');
        setResetNotice('تمت موافقة مستر محمد رضوان! يمكنك الآن كتابة كلمة المرور الجديدة وحفظها.');
      } else if (res.status === 'rejected') {
        if (!silent) {
          setResetError(res.message || 'تم رفض أو إلغاء الإذن من الإدارة.');
        }
      } else if (!silent) {
        setResetNotice('طلبك مسجل وقيد المراجعة لدى مستر محمد رضوان. سيتم فتح التغيير تلقائياً فور الموافقة.');
      }
    } catch {
      if (!silent) setResetError('حدث خطأ في الاتصال أثناء فحص حالة الموافقة.');
    } finally {
      if (!silent) setResetChecking(false);
    }
  }, []);

  // Poll gently every 8 seconds while waiting on teacher approval
  useEffect(() => {
    if (!isForgotMode || forgotStep !== 'waiting_approval' || !resetIdentifier.trim()) return;
    const interval = setInterval(() => {
      checkResetApprovalStatus(resetIdentifier, true);
    }, 8000);
    return () => clearInterval(interval);
  }, [isForgotMode, forgotStep, resetIdentifier, checkResetApprovalStatus]);

  const handleOpenForgotMode = () => {
    setIsForgotMode(true);
    setShowOtp(false);
    setForgotStep('identify');
    setResetIdentifier(formData.email ? normalizeEasternArabicDigits(formData.email).trim() : '');
    setResetError('');
    setResetNotice('');
    setNewPassword('');
    setConfirmPassword('');
    setResetInfo(null);
  };

  const handleBackToLogin = (prefillEmail?: string) => {
    setIsForgotMode(false);
    setResetError('');
    setResetNotice('');
    setNewPassword('');
    setConfirmPassword('');
    if (prefillEmail) {
      setFormData({ email: prefillEmail, password: '' });
    }
  };

  const handleSubmitResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetNotice('');
    const cleanId = normalizeEasternArabicDigits(resetIdentifier).trim();
    if (!cleanId) {
      setResetError('يرجى إدخال البريد الإلكتروني أو رقم الهاتف المسجل بحسابك.');
      return;
    }

    setResetLoading(true);
    try {
      const { requestOrCheckPasswordResetAction } = await import('@/app/actions/studentActions');
      const dev = await getClientDeviceContext();
      const res = await requestOrCheckPasswordResetAction({
        identifier: cleanId,
        deviceFingerprint: dev.deviceFingerprint,
        hardwareCoreId: dev.hardwareCoreId,
        candidateFingerprints: dev.candidateFingerprints,
        submitRequest: true,
      });

      if (!res.success) {
        setResetError(res.message || 'تعذر تنفيذ الطلب');
        return;
      }

      if (res.status === 'approved') {
        setResetInfo({
          studentName: res.studentName,
          email: res.email,
          maskedEmail: res.maskedEmail,
          expiresAt: res.expiresAt,
        });
        setForgotStep('set_new_password');
        setResetNotice(res.message || 'تمت موافقة المعلم بالفعل! أدخل كلمة المرور الجديدة الآن.');
      } else {
        setResetInfo({
          studentName: res.studentName,
          email: res.studentEmail,
          maskedEmail: res.maskedEmail,
          studentPhone: res.studentPhone,
          whatsappUrl: res.whatsappUrl,
        });
        setForgotStep('waiting_approval');
        setResetNotice(res.message || 'تم إرسال الطلب إلى لوحة المعلم بنجاح!');
      }
    } catch (err: any) {
      setResetError(err?.message || 'حدث خطأ أثناء إرسال الطلب');
    } finally {
      setResetLoading(false);
    }
  };

  const handleCompletePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetNotice('');

    const cleanPass = newPassword.trim();
    const cleanConfirm = confirmPassword.trim();

    if (cleanPass.length < 8) {
      setResetError('كلمة المرور الجديدة يجب أن تكون 8 خانات على الأقل.');
      return;
    }
    if (/\s/.test(cleanPass)) {
      setResetError('كلمة المرور لا يجب أن تحتوي على مسافات.');
      return;
    }
    if (cleanPass !== cleanConfirm) {
      setResetError('كلمتا المرور غير متطابقتين. يرجى التأكد وإعادة كتابتهما.');
      return;
    }

    setResetLoading(true);
    try {
      const { completeStudentPasswordResetAction } = await import('@/app/actions/studentActions');
      const dev = await getClientDeviceContext();
      const res = await completeStudentPasswordResetAction({
        identifier: resetIdentifier,
        newPassword: cleanPass,
        confirmPassword: cleanConfirm,
        deviceFingerprint: dev.deviceFingerprint,
        hardwareCoreId: dev.hardwareCoreId,
        candidateFingerprints: dev.candidateFingerprints,
      });

      if (!res.success) {
        setResetError(res.message || 'تعذر حفظ كلمة المرور الجديدة');
        return;
      }

      setResetInfo(prev => ({ ...prev, email: res.email || prev?.email }));
      setNewPassword('');
      setConfirmPassword('');
      setResetError('');
      setResetNotice('');
      setForgotStep('completed');
    } catch (err: any) {
      setResetError(err?.message || 'حدث خطأ غير متوقع أثناء التحديث');
    } finally {
      setResetLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const cleanVal = name === 'email' ? normalizeEasternArabicDigits(value).trim() : value;
    setFormData(prev => ({ ...prev, [name]: cleanVal }));
    if (error) setError('');
    if (pendingStudent) setPendingStudent(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setPendingStudent(null);

    const cleanEmail = normalizeEasternArabicDigits(formData.email).trim();
    const cleanPass = formData.password.trim();

    if (!cleanEmail || !cleanPass) {
      setError('الرجاء إدخال البريد الإلكتروني أو رقم الهاتف وكلمة المرور');
      return;
    }

    setIsLoading(true);
    try {
      const res = await loginWithCredentials(cleanEmail, cleanPass);

      if (res.success) {
        if (res.requiresOtp && res.studentId) {
          setShowOtp(true);
          setStudentIdForOtp(res.studentId);
          setSuccessMsg(res.message || 'يرجى إدخال رمز التفعيل.');
        } else {
          const stored = localStorage.getItem('mr_radwan_current_user');
          const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
          const rawRedirect = searchParams?.get('redirect') || '';
          const safeRedirect =
            rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') && rawRedirect !== '/login'
              ? rawRedirect
              : '';

          if (stored) {
            const user = JSON.parse(stored);
            if (user.role === 'teacher' || user.role === 'super_admin') {
              router.push(safeRedirect || '/teacher');
              return;
            } else if (user.role === 'assistant') {
              const target = safeRedirect && !safeRedirect.startsWith('/teacher') ? safeRedirect : '/assistant';
              router.push(target);
              return;
            } else if (user.role === 'student' && user.status === 'active') {
              try {
                const { lockDevicePermanently } = await import('@/lib/deviceSecurity');
                await lockDevicePermanently(user);
              } catch {}

              setSuccessMsg('تم تسجيل دخولك بنجاح! مرحباً بك في منصة مستر محمد رضوان 💚');

              const target =
                safeRedirect && !safeRedirect.startsWith('/teacher') && !safeRedirect.startsWith('/assistant')
                  ? safeRedirect
                  : '/student';
              setTimeout(() => {
                router.push(target);
              }, 500);
              return;
            }
          }
          router.push('/');
        }
      } else {
        if (res.isPending) {
          setPendingStudent(res.student || { email: formData.email });
        } else {
          setError(res.message);
        }
      }
    } catch (err: any) {
      setError(err.message || 'فشل تسجيل الدخول، تحقق من البيانات وحاول مرة أخرى');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!otpCode || otpCode.length < 4) {
      setError('الرجاء إدخال الرمز بشكل صحيح');
      return;
    }

    setIsLoading(true);
    try {
      const { verifyOtpAction } = await import('@/app/actions/studentActions');
      const res = await verifyOtpAction(studentIdForOtp, otpCode);

      if (res.success) {
        setShowOtp(false);
        await handleLogin(e);
      } else {
        setError(res.message || 'الرمز غير صحيح');
      }
    } catch (err: any) {
      setError(err.message || 'فشل التحقق من الرمز');
    } finally {
      setIsLoading(false);
    }
  };

  const scriptAnalysis = analyzePasswordScript(newPassword);
  const passwordsMatch = Boolean(confirmPassword) && newPassword.trim() === confirmPassword.trim();

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 selection:bg-violet-500 selection:text-white" dir="rtl">

      {/* Right Side: Login & Zero-Knowledge Recovery Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-12 relative z-10 transition-all duration-500 max-w-2xl mx-auto lg:mx-0">

        {/* Top Header */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <div className="relative w-10 h-10 rounded-full flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform overflow-hidden">
              <Image src="/logo.png" alt="Logo" fill className="object-cover" unoptimized />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-black text-slate-900 dark:text-white tracking-tight">Easy English مع مستر محمد رضوان</span>
              <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400">العودة للرئيسية</span>
            </div>
          </Link>

          <Link href="/register" className="text-xs font-bold text-slate-500 hover:text-violet-600 dark:hover:text-violet-400 transition-colors flex items-center gap-1">
            ليس لديك حساب؟ إنشاء حساب
            <ArrowRight className="w-3 h-3 rotate-180" />
          </Link>
        </div>

        {/* Center Workspace */}
        <div className="flex-1 flex flex-col justify-center max-w-md w-full mx-auto">
          <div className="text-center mb-7">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
              {isForgotMode
                ? forgotStep === 'set_new_password'
                  ? 'إنشاء كلمة مرور جديدة'
                  : forgotStep === 'completed'
                  ? 'تم تأمين حسابك بنجاح'
                  : 'استعادة كلمة المرور بأمان'
                : showOtp
                ? 'تأكيد الحساب'
                : 'تسجيل الدخول للمنصة'}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {isForgotMode
                ? forgotStep === 'set_new_password'
                  ? 'أدخل كلمة المرور الجديدة بنفسك مع التحقق من لغة الكتابة'
                  : forgotStep === 'completed'
                  ? 'أُلغيت كلمة المرور السابقة وتم تشفير الكلمة الجديدة أحادياً'
                  : 'تخضع كلمات المرور للتشفير الأحادي ولا يطلع عليها أي شخص؛ الاستعادة تتم بموافقة المعلم فقط'
                : showOtp
                ? 'لقد تم قبول حسابك، يرجى إدخال الرمز المرسل لتفعيل الدخول'
                : 'أهلاً بك مجدداً، أدخل بياناتك للمتابعة'}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {isForgotMode ? (
              <motion.div
                key={`forgot-${forgotStep}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="space-y-5"
              >
                {resetError && (
                  <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs sm:text-sm font-bold flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                    <span>{resetError}</span>
                  </div>
                )}

                {resetNotice && (
                  <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm font-bold flex items-start gap-2.5">
                    <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                    <span>{resetNotice}</span>
                  </div>
                )}

                {forgotStep === 'identify' && (
                  <form onSubmit={handleSubmitResetRequest} className="space-y-5">
                    <div className="p-4 rounded-2xl bg-violet-50/70 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800/60 text-xs text-slate-700 dark:text-slate-300 leading-relaxed flex items-start gap-3">
                      <ShieldCheck className="w-5 h-5 text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-black text-slate-900 dark:text-white mb-1">حماية الخصوصية الكاملة (Zero-Knowledge)</p>
                        <p className="font-semibold">
                          لا يمكن للمعلم أو لأي جهة كشف كلمة مرورك القديمة. عند إرسال الطلب، يمنحك مستر محمد رضوان تصريحاً لمرة واحدة لتكتب كلمة مرورك الجديدة بنفسك.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block">
                        البريد الإلكتروني أو رقم الهاتف المسجل بحسابك
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="email"
                          value={resetIdentifier}
                          onChange={(e) => {
                            setResetIdentifier(normalizeEasternArabicDigits(e.target.value));
                            if (resetError) setResetError('');
                          }}
                          placeholder="010xxxxxxxx أو student@example.com"
                          dir="ltr"
                          className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all text-left"
                        />
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                          {resetIdentifier && !resetIdentifier.includes('@') ? (
                            <Phone className="w-5 h-5 text-emerald-500" />
                          ) : (
                            <Mail className="w-5 h-5" />
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={resetLoading}
                      className="w-full min-h-[46px] flex items-center justify-center gap-2 py-3.5 px-4 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-violet-500/20 transition-all disabled:opacity-70"
                    >
                      {resetLoading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <KeyRound className="w-5 h-5" />
                          <span>طلب السماح باستعادة كلمة المرور</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleBackToLogin()}
                      className="w-full min-h-[44px] py-2.5 text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors flex items-center justify-center gap-1.5"
                    >
                      <ArrowRight className="w-4 h-4" />
                      <span>العودة لتسجيل الدخول</span>
                    </button>
                  </form>
                )}

                {forgotStep === 'waiting_approval' && (
                  <div className="space-y-4">
                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                          <Clock className="w-6 h-6 animate-pulse" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-black text-slate-900 dark:text-white text-sm truncate">
                            بانتظار موافقة مستر محمد رضوان
                          </h3>
                          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                            {resetInfo?.studentName} · <span dir="ltr">{resetInfo?.maskedEmail || resetIdentifier}</span>
                          </p>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300 font-semibold leading-relaxed space-y-1.5">
                        <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-black">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>وصل طلبك بالفعل إلى لوحة تحكم المعلم على المنصة</span>
                        </div>
                        <p>
                          بمجرد ضغط مستر محمد رضوان على «السماح بتغيير كلمة المرور»، ستُفتح لك هنا خانة إنشاء كلمة المرور الجديدة تلقائياً.
                        </p>
                      </div>

                      {resetInfo?.whatsappUrl && (
                        <div className="space-y-2">
                          <a
                            href={resetInfo.whatsappUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="w-full min-h-[46px] py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all"
                          >
                            <MessageCircle className="w-5 h-5" />
                            <span>إرسال الطلب على واتساب المعلم (رسالة جاهزة بالبيانات)</span>
                          </a>
                          <p className="text-[11px] font-bold text-slate-400 text-center">
                            تتضمن رسالة الواتساب تلقائياً: اسمك، بريدك الإلكتروني، ورقم هاتفك لتسريع الاعتماد
                          </p>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => checkResetApprovalStatus(resetIdentifier, false)}
                        disabled={resetChecking}
                        className="w-full min-h-[44px] py-3 px-4 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-70"
                      >
                        <RefreshCw className={`w-4 h-4 ${resetChecking ? 'animate-spin' : ''}`} />
                        <span>{resetChecking ? 'جاري التحقق من حالة الموافقة...' : 'تحقق من موافقة المعلم الآن'}</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => {
                          setForgotStep('identify');
                          setResetError('');
                          setResetNotice('');
                        }}
                        className="text-slate-500 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                      >
                        تغيير البريد / الهاتف
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBackToLogin()}
                        className="text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                      >
                        العودة لتسجيل الدخول
                      </button>
                    </div>
                  </div>
                )}

                {forgotStep === 'set_new_password' && (
                  <form onSubmit={handleCompletePasswordReset} className="space-y-4">
                    <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-xs space-y-1.5">
                      <div className="flex items-center justify-between font-black text-emerald-800 dark:text-emerald-300">
                        <span className="flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4" /> الحساب المعتمد للتعديل:
                        </span>
                        <span className="font-mono" dir="ltr">{resetInfo?.email || resetInfo?.maskedEmail}</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 font-semibold leading-relaxed">
                        سيتم إلغاء كلمة المرور السابقة نهائياً وحفظ كلمتك الجديدة بتشفير أحادي آمن لا يطلع عليه أحد.
                      </p>
                    </div>

                    {/* New Password Field with Eye Toggle + Keyboard Script Analysis */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block">
                        كلمة المرور الجديدة
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => {
                            setNewPassword(e.target.value);
                            if (resetError) setResetError('');
                          }}
                          onKeyUp={(e) => setCapsLockOn(Boolean(e.getModifierState?.('CapsLock')))}
                          onKeyDown={(e) => setCapsLockOn(Boolean(e.getModifierState?.('CapsLock')))}
                          placeholder="اكتب كلمة المرور الجديدة (8 خانات فأكثر)"
                          dir="ltr"
                          className="w-full pl-20 pr-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all text-left"
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(prev => !prev)}
                            className="p-2 text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors rounded-lg"
                            title={showNewPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور للتأكد منها'}
                            aria-label={showNewPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                          >
                            {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <Lock className="w-4 h-4 text-slate-400 ml-1" />
                        </div>
                      </div>

                      {/* Live Keyboard Language & Script Detector */}
                      <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5">
                        {capsLockOn && (
                          <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            <span>تنبيه: مفتاح الحروف الكبيرة (Caps Lock) مفعّل حالياً!</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <Languages className="w-4 h-4 text-violet-500" />
                            لغة وحروف الكتابة:
                          </span>
                          <span
                            className={`font-black flex items-center gap-1 ${
                              scriptAnalysis.scriptMode === 'arabic' || scriptAnalysis.scriptMode === 'mixed'
                                ? 'text-amber-600 dark:text-amber-400'
                                : scriptAnalysis.scriptMode === 'english'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {scriptAnalysis.scriptMode === 'empty' && 'ابدأ الكتابة لاكتشاف اللغة...'}
                            {scriptAnalysis.scriptMode === 'english' && 'لوحة مفاتيح إنجليزية (EN) ✓'}
                            {scriptAnalysis.scriptMode === 'arabic' && 'تكتب بأحرف/أرقام عربية!'}
                            {scriptAnalysis.scriptMode === 'mixed' && 'أحرف مختلطة (عربي + إنجليزي)!'}
                            {scriptAnalysis.scriptMode === 'digits_symbols' && 'أرقام / رموز فقط'}
                          </span>
                        </div>

                        {(scriptAnalysis.hasArabicLetters || scriptAnalysis.hasArabicDigits) && (
                          <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 text-[11px] font-bold text-amber-800 dark:text-amber-300 leading-relaxed flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                            <span>
                              تنبيه: تم رصد كتابة عربية في كلمة المرور. انقر على أيقونة العين للتأكد من الأحرف المكتوبة؛ يُفضل استخدام الأحرف الإنجليزية والأرقام لتجنب اختلاف لوحة المفاتيح مستقبلاً.
                            </span>
                          </div>
                        )}

                        {scriptAnalysis.hasSpaces && (
                          <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                            <X className="w-3.5 h-3.5 shrink-0" />
                            <span>غير مسموح بوجود مسافات داخل كلمة المرور</span>
                          </div>
                        )}

                        {/* Strength Bar */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className="text-slate-500">قوة كلمة المرور ({scriptAnalysis.length} حرف)</span>
                            <span
                              className={
                                scriptAnalysis.strength === 'strong'
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : scriptAnalysis.strength === 'medium'
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-rose-500'
                              }
                            >
                              {scriptAnalysis.length === 0 ? '—' : scriptAnalysis.strengthLabel}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-1.5 h-1.5">
                            <div className={`rounded-full transition-colors ${scriptAnalysis.length > 0 ? (scriptAnalysis.strength === 'strong' ? 'bg-emerald-500' : scriptAnalysis.strength === 'medium' ? 'bg-amber-500' : 'bg-rose-500') : 'bg-slate-200 dark:bg-slate-800'}`} />
                            <div className={`rounded-full transition-colors ${scriptAnalysis.strength === 'strong' ? 'bg-emerald-500' : scriptAnalysis.strength === 'medium' ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-800'}`} />
                            <div className={`rounded-full transition-colors ${scriptAnalysis.strength === 'strong' ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'}`} />
                          </div>
                        </div>

                        {/* Concise criteria list with dots separator */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold text-slate-500 dark:text-slate-400 pt-1">
                          <span className={scriptAnalysis.minLengthOk ? 'text-emerald-600 dark:text-emerald-400 flex items-center gap-1' : 'flex items-center gap-1'}>
                            {scriptAnalysis.minLengthOk ? <Check className="w-3 h-3" /> : <span>•</span>}
                            8 خانات فأكثر
                          </span>
                          <span className={scriptAnalysis.hasEnglishLower || scriptAnalysis.hasEnglishUpper ? 'text-emerald-600 dark:text-emerald-400 flex items-center gap-1' : 'flex items-center gap-1'}>
                            {scriptAnalysis.hasEnglishLower || scriptAnalysis.hasEnglishUpper ? <Check className="w-3 h-3" /> : <span>•</span>}
                            حروف إنجليزية
                          </span>
                          <span className={scriptAnalysis.hasEnglishDigits ? 'text-emerald-600 dark:text-emerald-400 flex items-center gap-1' : 'flex items-center gap-1'}>
                            {scriptAnalysis.hasEnglishDigits ? <Check className="w-3 h-3" /> : <span>•</span>}
                            أرقام
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Confirm Password Field with Eye Toggle */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block">
                        تأكيد كلمة المرور الجديدة
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            if (resetError) setResetError('');
                          }}
                          placeholder="أعد كتابة كلمة المرور الجديدة للتأكيد"
                          dir="ltr"
                          className="w-full pl-20 pr-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all text-left"
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(prev => !prev)}
                            className="p-2 text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors rounded-lg"
                            title={showConfirmPassword ? 'إخفاء تأكيد كلمة المرور' : 'إظهار تأكيد كلمة المرور'}
                            aria-label={showConfirmPassword ? 'إخفاء تأكيد كلمة المرور' : 'إظهار تأكيد كلمة المرور'}
                          >
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <Lock className="w-4 h-4 text-slate-400 ml-1" />
                        </div>
                      </div>
                      {confirmPassword.length > 0 && (
                        <p className={`text-xs font-bold flex items-center gap-1.5 pt-1 ${passwordsMatch ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {passwordsMatch ? <CheckCircle2 className="w-4 h-4" /> : <X className="w-4 h-4" />}
                          <span>{passwordsMatch ? 'كلمتا المرور متطابقتان تماماً ✓' : 'كلمتا المرور غير متطابقتين'}</span>
                        </p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={resetLoading || !scriptAnalysis.minLengthOk || scriptAnalysis.hasSpaces || !passwordsMatch}
                      className="w-full min-h-[46px] flex items-center justify-center gap-2 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black rounded-xl shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                    >
                      {resetLoading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <ShieldCheck className="w-5 h-5" />
                          <span>حفظ واعتماد كلمة المرور الجديدة</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleBackToLogin()}
                      className="w-full py-2 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors text-center"
                    >
                      إلغاء والعودة لتسجيل الدخول
                    </button>
                  </form>
                )}

                {forgotStep === 'completed' && (
                  <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/60 shadow-sm text-center space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                      <Sparkles className="w-7 h-7" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-black text-slate-900 dark:text-white">تم حفظ كلمة المرور الجديدة بنجاح!</h3>
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 leading-relaxed">
                        تم إلغاء كلمة المرور السابقة وتشفير كلمة المرور الجديدة أحادياً لحسابك{' '}
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400" dir="ltr">
                          {resetInfo?.email}
                        </span>
                        . لا يمكن لأي شخص الاطلاع عليها.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleBackToLogin(resetInfo?.email)}
                      className="w-full min-h-[46px] py-3.5 px-4 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-violet-600/20 transition-all"
                    >
                      <LogIn className="w-5 h-5" />
                      <span>تسجيل الدخول الآن</span>
                    </button>
                  </div>
                )}
              </motion.div>
            ) : showOtp ? (
              <motion.form
                key="otp-form"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                onSubmit={handleVerifyOtp}
                className="space-y-5"
              >
                {error && (
                  <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm font-bold text-center">
                    {error}
                  </div>
                )}
                {successMsg && (
                  <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-bold text-center">
                    {successMsg}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1 block text-center">
                    الرمز السري (OTP)
                  </label>
                  <div className="relative max-w-[200px] mx-auto">
                    <input
                      type="text"
                      name="otp"
                      value={otpCode}
                      onChange={(e) => {
                        setOtpCode(e.target.value);
                        if (error) setError('');
                      }}
                      placeholder="1234"
                      dir="ltr"
                      maxLength={4}
                      className="w-full text-center px-4 py-3.5 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-xl text-2xl tracking-[0.5em] font-black text-slate-900 dark:text-white focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-4"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <LogIn className="w-5 h-5" />
                      <span>تفعيل وتسجيل الدخول</span>
                    </>
                  )}
                </button>
              </motion.form>
            ) : (
              <motion.form
                key="login-form"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                onSubmit={handleLogin}
                className="space-y-5"
              >
                {pendingStudent && (
                  <div className="p-5 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 text-right space-y-3">
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-black text-sm">
                      <Clock className="w-5 h-5 shrink-0 animate-pulse" />
                      <span>طلب انضمامك لا يزال قيد المراجعة</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-bold leading-relaxed">
                      تم استلام طلب تسجيلك بنجاح باسم <span className="text-amber-600 dark:text-amber-400 font-black">{pendingStudent.fullName || formData.email}</span> وجاري مراجعته وتفعيله من قبل مستر محمد رضوان.
                    </p>
                    <div className="pt-2 flex flex-col sm:flex-row gap-2">
                      <Link
                        href="/register"
                        className="flex-1 py-2.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>متابعة حالة الطلب في صفحة التسجيل</span>
                      </Link>
                      <a
                        href="https://wa.me/201552191172"
                        target="_blank"
                        rel="noreferrer"
                        className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>واتساب</span>
                      </a>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm font-bold text-center">
                    {error}
                  </div>
                )}

                {successMsg && (
                  <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-bold text-center">
                    {successMsg}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1 block">
                    البريد الإلكتروني أو رقم الهاتف المسجل
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="010xxxxxxxx أو student@example.com"
                      dir="ltr"
                      className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all text-left"
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      {formData.email && !formData.email.includes('@') ? (
                        <Phone className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <Mail className="w-5 h-5" />
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1 block">
                      كلمة المرور
                    </label>
                    <button
                      type="button"
                      onClick={handleOpenForgotMode}
                      className="text-xs font-bold text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 transition-colors py-1"
                    >
                      نسيت كلمة المرور؟
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="••••••••"
                      dir="ltr"
                      className="w-full pl-20 pr-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all text-left"
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowPassword(prev => !prev)}
                        className="text-slate-400 hover:text-violet-500 transition-colors focus:outline-none"
                        title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <Lock className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-violet-500/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-4"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <LogIn className="w-5 h-5" />
                      <span>دخول الحساب</span>
                    </>
                  )}
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="mt-8 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
            بتسجيلك الدخول، أنت توافق على سياسات وشروط المنصة · كلمات المرور مشفرة أحادياً لحماية خصوصيتك
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="text-center mt-8">
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
            Built With Developer & Designer <span className="text-emerald-500">NOUR M. EL-SAIED 💚 💚</span>
          </p>
        </div>
      </div>

      {/* Left Side: Fixed Image Area */}
      <div className="hidden lg:block lg:w-1/2 relative bg-[#0b1021] border-r border-slate-200 dark:border-slate-800 overflow-hidden">
        {!bgImageError && (
          <Image
            src="/login-image.png?v=1"
            alt="Login Background"
            fill
            sizes="50vw"
            className="object-cover object-center"
            priority
            unoptimized
            onError={() => setBgImageError(true)}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f172a] to-[#1e1b4b] -z-10 flex flex-col items-center justify-center p-12 text-center">
          <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6">
            <LogIn className="w-12 h-12 text-white/20" />
          </div>
          <h2 className="text-2xl font-black text-white/40 mb-2">مساحة الصورة الجانبية</h2>
          <p className="text-sm text-white/30 max-w-sm">قم برفع الصورة باسم login-image.png لتظهر هنا</p>
        </div>
      </div>

    </div>
  );
}

