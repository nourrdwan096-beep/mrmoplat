'use client';

import React, { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  registerStudentAction, 
  checkDeviceStatusAction, 
  checkStudentContactAction,
  verifyOtpAction 
} from '@/app/actions/studentActions';
import { 
  getStrictDeviceFingerprint, 
  getStrictDeviceIdentity, 
  lockDevicePermanently,
  clearDeviceLock
} from '@/lib/deviceSecurity';
import { useAuth } from '@/context/AuthContext';
import { 
  ShieldCheck, 
  User, 
  Phone, 
  Mail, 
  Lock, 
  Camera, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  ArrowLeft, 
  RefreshCw,
  Info,
  ShieldAlert,
  Edit3,
  Clock,
  Sparkles,
  KeyRound,
  ExternalLink,
  Smartphone,
  Check,
  XCircle,
  HelpCircle,
  Radio,
  LogOut,
  GraduationCap
} from 'lucide-react';

interface DeviceStatusInfo {
  isRegistered: boolean;
  isBanned: boolean;
  student?: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    parentPhone?: string | null;
    stage: string;
    grade: number;
    educationType: string;
    status: 'pending_review' | 'active' | 'rejected' | 'banned';
    whatsapp_otp?: string | null;
    otp_verified?: boolean;
    createdAt?: string;
    banReason?: string | null;
    rejectionReason?: string | null;
  } | null;
  reason?: string | null;
}

export default function RegisterPage() {
  const router = useRouter();
  const { currentUser, logout } = useAuth();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingDevice, setIsCheckingDevice] = useState(true);
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatusInfo | null>(null);
  const [fingerprint, setFingerprint] = useState<string>('');
  const [candidateFingerprints, setCandidateFingerprints] = useState<string[]>([]);

  // OTP Verification state for students accepted with OTP
  const [otpInput, setOtpInput] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpSuccess, setOtpSuccess] = useState(false);

  // Form States
  const [policiesAccepted, setPoliciesAccepted] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: '',
    secondName: '',
    thirdName: '',
    lastName: '',
    phone: '',
    parentPhone: '',
    stage: '',
    educationType: '',
    grade: '',
    email: '',
    password: '',
    confirmPassword: '',
    captchaCode: '',
  });

  const [generatedCaptcha, setGeneratedCaptcha] = useState(() => Math.floor(1000 + Math.random() * 9000).toString());
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Initialize strict hardware identity and check device registration lock on mount
  useEffect(() => {
    let isCancelled = false;

    const initSecurity = async () => {
      setIsCheckingDevice(true);
      try {
        const identity = await getStrictDeviceIdentity();
        if (isCancelled) return;
        setFingerprint(identity.primaryFingerprint);
        setCandidateFingerprints(identity.candidateFingerprints);

        // Gather candidate emails and phones
        let storedEmail = identity.storedStudent?.email;
        let storedPhone = identity.storedStudent?.phone;

        if (typeof window !== 'undefined') {
          storedEmail = storedEmail || localStorage.getItem('mr_student_email') || undefined;
          storedPhone = storedPhone || localStorage.getItem('mr_student_phone') || undefined;
        }

        if (currentUser && currentUser.role === 'student') {
          storedEmail = storedEmail || currentUser.email;
          storedPhone = storedPhone || currentUser.phone;
        }

        const res = await checkDeviceStatusAction(
          identity.primaryFingerprint, 
          storedEmail, 
          storedPhone, 
          identity.candidateFingerprints,
          identity.studentId
        );
        if (isCancelled) return;

        if (res.isRegistered || res.isBanned) {
          setDeviceStatus(res);
          if (res.student) {
            await lockDevicePermanently(res.student);
          }
        } else {
          // If the server confirms this device/email is NOT registered, clear any stale local locks
          // so the student can register again.
          if (identity.isLocallyLocked || identity.storedStudent) {
            await clearDeviceLock();
          }
          setDeviceStatus(null);
        }
      } catch (err) {
        console.error('Device verification error:', err);
        // Resilient fallback: check if local lock was placed
        try {
          const identity = await getStrictDeviceIdentity();
          if (identity.isLocallyLocked || identity.storedStudent) {
            const s = identity.storedStudent;
            setDeviceStatus({
              isRegistered: true,
              isBanned: false,
              student: {
                id: s?.id || '',
                fullName: s?.fullName || 'طالب مسجل بالمنصة',
                email: s?.email || '',
                phone: s?.phone || '',
                stage: 'high',
                grade: 1,
                educationType: 'general',
                status: (s?.status as any) || 'pending_review',
              }
            });
          }
        } catch {}
      } finally {
        if (!isCancelled) {
          setIsCheckingDevice(false);
        }
      }
    };

    initSecurity();

    return () => {
      isCancelled = true;
    };
  }, [currentUser]);

  const refreshDeviceStatus = async () => {
    setIsCheckingDevice(true);
    try {
      const identity = await getStrictDeviceIdentity();
      let storedEmail = identity.storedStudent?.email;
      let storedPhone = identity.storedStudent?.phone;

      if (currentUser && currentUser.role === 'student') {
        storedEmail = storedEmail || currentUser.email;
        storedPhone = storedPhone || currentUser.phone;
      }

      const res = await checkDeviceStatusAction(
        identity.primaryFingerprint, 
        storedEmail, 
        storedPhone, 
        identity.candidateFingerprints,
        identity.studentId
      );
      
      if (res.isRegistered || res.isBanned) {
        setDeviceStatus(res);
        if (res.student) {
          await lockDevicePermanently(res.student);
        }
      } else {
        if (identity.isLocallyLocked || identity.storedStudent) {
          await clearDeviceLock();
        }
        setDeviceStatus(null);
      }
    } catch (err) {
      console.error('Refresh status error:', err);
      try {
        const identity = await getStrictDeviceIdentity();
        if (identity.isLocallyLocked || identity.storedStudent) {
          const s = identity.storedStudent;
          setDeviceStatus({
            isRegistered: true,
            isBanned: false,
            student: {
              id: s?.id || '',
              fullName: s?.fullName || 'طالب مسجل بالمنصة',
              email: s?.email || '',
              phone: s?.phone || '',
              stage: 'high',
              grade: 1,
              educationType: 'general',
              status: (s?.status as any) || 'pending_review',
            }
          });
        }
      } catch {}
    } finally {
      setIsCheckingDevice(false);
    }
  };

  const handleVerifyOtpFromScreen = async () => {
    if (!deviceStatus?.student?.id) return;
    if (!otpInput || otpInput.trim().length !== 4) {
      setOtpError('يرجى إدخال رمز التحقق المكون من 4 أرقام');
      return;
    }

    setIsVerifyingOtp(true);
    setOtpError('');

    try {
      const res = await verifyOtpAction(deviceStatus.student.id, otpInput.trim());
      if (res.success) {
        setOtpSuccess(true);
        // Save auth state or redirect to login
        setTimeout(() => {
          router.push('/login?activated=true');
        }, 1500);
      } else {
        setOtpError(res.message || 'رمز التحقق غير صحيح، يرجى التأكد وإعادة المحاولة');
      }
    } catch {
      setOtpError('حدث خطأ أثناء الاتصال بالخادم');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const generateNewCaptcha = useCallback(() => {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedCaptcha(code);
    setFormData(prev => ({ ...prev, captchaCode: '' }));
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'stage') {
        updated.educationType = '';
      }
      return updated;
    });

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateArabicName = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return false;
    
    // 1. Only Arabic letters and spaces
    if (!/^[\u0621-\u064A\s]{2,}$/.test(trimmed)) return false;

    // 2. Prevent 3 or more consecutive identical characters
    if (/(.)\1{2,}/.test(trimmed)) return false;

    // 3. Prevent names consisting of only one repeated letter
    const uniqueChars = new Set(trimmed.replace(/\s/g, '').split(''));
    if (uniqueChars.size < 2) return false;

    // 4. Prevent common keyboard smashes
    const keyboardSmashes = ['شسيب', 'ضصثق', 'ظزوة', 'يسبش', 'قثصض', 'ةوزظ', 'غفقث', 'ثقفغ', 'صثقف', 'فقثص'];
    for (const smash of keyboardSmashes) {
      if (trimmed.includes(smash)) return false;
    }

    return true;
  };

  const validateEgyptianPhone = (phone: string) => {
    // 11 digits starting with 010, 011, 012, or 015
    if (!/^01[0125][0-9]{8}$/.test(phone)) return false;
    // Prevent exactly identical 8 digits like 01111111111
    if (/^01[0125](\d)\1{7}$/.test(phone)) return false;
    return true;
  };

  const detectCarrier = (phone: string) => {
    if (phone.startsWith('010')) return 'فودافون (Vodafone)';
    if (phone.startsWith('011')) return 'اتصالات (Etisalat e&)';
    if (phone.startsWith('012')) return 'أورنچ (Orange)';
    if (phone.startsWith('015')) return 'وي (WE)';
    return '';
  };

  const validateStep = () => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!validateArabicName(formData.firstName)) newErrors.firstName = 'يرجى إدخال الاسم الأول بحروف عربية صحيحة';
      if (!validateArabicName(formData.secondName)) newErrors.secondName = 'يرجى إدخال الاسم الثاني بحروف عربية صحيحة';
      if (!validateArabicName(formData.thirdName)) newErrors.thirdName = 'يرجى إدخال الاسم الثالث بحروف عربية صحيحة';
      if (!validateArabicName(formData.lastName)) newErrors.lastName = 'يرجى إدخال الاسم الأخير بحروف عربية صحيحة';
      
      if (!validateEgyptianPhone(formData.phone)) newErrors.phone = 'يرجى إدخال رقم هاتف مصري صحيح (11 رقماً يبدأ بـ 010 أو 011 أو 012 أو 015)';
      if (!validateEgyptianPhone(formData.parentPhone)) newErrors.parentPhone = 'يرجى إدخال رقم هاتف ولي الأمر بشكل صحيح (11 رقماً)';
      if (formData.phone && formData.phone === formData.parentPhone) newErrors.parentPhone = 'يجب أن يكون رقم ولي الأمر مختلفاً عن رقم الطالب';
      if (!formData.stage) newErrors.stage = 'يرجى اختيار المرحلة';
      if (!formData.educationType) newErrors.educationType = 'يرجى اختيار نوع التعليم';
      if (!formData.grade) newErrors.grade = 'يرجى اختيار الصف الدراسي';
    }

    if (step === 2) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'البريد الإلكتروني غير صحيح';
      if (formData.password.length < 8) newErrors.password = 'كلمة المرور يجب أن تكون 8 أحرف على الأقل';
      if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'كلمات المرور غير متطابقة';
    }

    if (step === 3) {
      if (formData.captchaCode !== generatedCaptcha) {
        newErrors.captchaCode = 'الرمز غير صحيح، يرجى كتابة الأرقام الظاهرة بدقة';
        generateNewCaptcha();
      }
    }

    if (step === 4) {
      if (!photoPreview) newErrors.photo = 'يرجى التقاط أو رفع صورة شخصية واضحة وحقيقية للتأكيد';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const [isCheckingContact, setIsCheckingContact] = useState(false);

  const handleNext = async () => {
    if (step === 0 && !policiesAccepted) return;
    if (!validateStep()) return;

    // Early duplicate check on Step 1 (Phone)
    if (step === 1 && formData.phone) {
      setIsCheckingContact(true);
      try {
        const contactCheck = await checkStudentContactAction(formData.phone, undefined, fingerprint);
        if (contactCheck.exists) {
          if (contactCheck.isStaff) {
            setErrors(prev => ({ ...prev, phone: contactCheck.message || 'هذا الرقم مسجل بحساب إداري بالمنصة.' }));
            setIsCheckingContact(false);
            return;
          }
          if (contactCheck.student) {
            await lockDevicePermanently(contactCheck.student);
            setDeviceStatus({
              isRegistered: true,
              isBanned: contactCheck.student.status === 'banned',
              student: contactCheck.student
            });
            setIsCheckingContact(false);
            return;
          }
        }
      } catch (err) {
        console.error('Contact check error:', err);
      } finally {
        setIsCheckingContact(false);
      }
    }

    // Early duplicate check on Step 2 (Email)
    if (step === 2 && formData.email) {
      setIsCheckingContact(true);
      try {
        const contactCheck = await checkStudentContactAction(undefined, formData.email, fingerprint);
        if (contactCheck.exists) {
          if (contactCheck.isStaff) {
            setErrors(prev => ({ ...prev, email: contactCheck.message || 'هذا البريد مسجل بحساب إداري بالمنصة.' }));
            setIsCheckingContact(false);
            return;
          }
          if (contactCheck.student) {
            await lockDevicePermanently(contactCheck.student);
            setDeviceStatus({
              isRegistered: true,
              isBanned: contactCheck.student.status === 'banned',
              student: contactCheck.student
            });
            setIsCheckingContact(false);
            return;
          }
        }
      } catch (err) {
        console.error('Contact check error:', err);
      } finally {
        setIsCheckingContact(false);
      }
    }

    setStep(prev => prev + 1);
  };

  const handlePrev = () => {
    setStep(prev => Math.max(0, prev - 1));
  };

  const compressImageToDataUrl = (file: File, maxDim = 640, quality = 0.85): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new window.Image();
        img.onerror = reject;
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(reader.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, photo: 'حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 20 ميجابايت' }));
        return;
      }
      try {
        const compressed = await compressImageToDataUrl(file, 640, 0.85);
        setPhotoPreview(compressed);
        if (errors.photo) setErrors(prev => ({ ...prev, photo: '' }));
      } catch {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPhotoPreview(reader.result as string);
          if (errors.photo) setErrors(prev => ({ ...prev, photo: '' }));
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleSubmitFinal = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    
    let fp = fingerprint;
    let candidates = candidateFingerprints;
    try {
      const identity = await getStrictDeviceIdentity();
      fp = identity.primaryFingerprint;
      candidates = identity.candidateFingerprints;
      setFingerprint(fp);
      setCandidateFingerprints(candidates);
    } catch {
      // fallback
    }

    const fullName = `${formData.firstName} ${formData.secondName} ${formData.thirdName} ${formData.lastName}`.trim();

    try {
      const result = await registerStudentAction({
        ...formData,
        fullName,
        avatarUrl: photoPreview,
        deviceFingerprint: fp,
        candidateFingerprints: candidates
      });

      if (result.success) {
        const studentRecord = {
          id: result.studentId || '',
          fullName,
          email: formData.email,
          phone: formData.phone,
          parentPhone: formData.parentPhone,
          stage: formData.stage,
          grade: Number(formData.grade),
          educationType: formData.educationType,
          status: 'pending_review' as const,
          createdAt: new Date().toISOString()
        };

        // 1. Lock the device permanently across all 5 layers (IndexedDB, LocalStorage, Cookies, CacheAPI, etc.)
        await lockDevicePermanently(studentRecord);

        // 2. Set device status for permanent lock
        setDeviceStatus({
          isRegistered: true,
          isBanned: false,
          student: studentRecord
        });

        // 3. Move to final success step
        setStep(6);
      } else {
        setSubmitError(result.error || 'حدث خطأ أثناء إرسال طلبك، يرجى المحاولة لاحقاً');
        // If device was already registered according to server
        if (result.error && (result.error.includes('جهاز') || result.error.includes('مُسجل بالفعل') || result.error.includes('محظور'))) {
          await refreshDeviceStatus();
        }
      }
    } catch (err: any) {
      // In case of server disconnect or failure, DO NOT lock the device, allow the student to retry
      setSubmitError(err.message || 'تعذر الاتصال بالخادم، لم يتم حفظ الطلب. يرجى التأكد من اتصال الإنترنت وإعادة المحاولة.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted || isCheckingDevice) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-white selection:bg-emerald-500">
        <div className="relative w-20 h-20 mb-6">
          <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full animate-ping" />
          <div className="w-20 h-20 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin flex items-center justify-center">
            <ShieldCheck className="w-8 h-8 text-emerald-400" />
          </div>
        </div>
        <h2 className="text-xl font-black text-white mb-2">جاري فحص حالة وأمان جهازك بالمنصة...</h2>
        <p className="text-slate-400 text-sm font-bold">التحقق من بصمة الجهاز وقاعدة البيانات المؤمنة</p>
      </div>
    );
  }

  // ==========================================
  // SCREEN: DEVICE IS ALREADY REGISTERED OR BANNED
  // ==========================================
  if (deviceStatus && (deviceStatus.isRegistered || deviceStatus.isBanned)) {
    const student = deviceStatus.student;
    const isBanned = deviceStatus.isBanned || student?.status === 'banned';
    const isActive = student?.status === 'active';
    const isPending = student?.status === 'pending_review' || (!isBanned && !isActive && student?.status !== 'rejected');
    const isRejected = student?.status === 'rejected';

    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-between p-4 sm:p-8 text-white relative overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-2xl w-full mx-auto my-auto relative z-10 py-8">
          
          {/* Header Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden mb-6">
            
            {/* Top Status Badge */}
            <div className="flex items-center justify-between gap-4 mb-6 border-b border-slate-800 pb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl font-black text-white">بيانات تسجيل هذا الجهاز</h1>
                  <p className="text-xs text-slate-400 font-bold mt-0.5">معرف الحماية: {fingerprint.substring(0, 16)}...</p>
                </div>
              </div>

              {isBanned && (
                <span className="px-3.5 py-1.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 text-xs font-black flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" /> جهاز محظور
                </span>
              )}

              {isActive && (
                <span className="px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-black flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> حساب معتمد ونشط
                </span>
              )}

              {isPending && (
                <span className="px-3.5 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-black flex items-center gap-1.5">
                  <Clock className="w-4 h-4 animate-spin" /> قيد المراجعة والتدقيق
                </span>
              )}

              {isRejected && (
                <span className="px-3.5 py-1.5 rounded-full bg-slate-500/20 border border-slate-500/40 text-slate-300 text-xs font-black flex items-center gap-1.5">
                  <XCircle className="w-4 h-4" /> تم رفض الطلب
                </span>
              )}
            </div>

            {/* BANNED SCREEN */}
            {isBanned && (
              <div className="space-y-6">
                <div className="p-5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-right">
                  <div className="flex items-center gap-2.5 text-rose-400 font-black text-lg mb-2">
                    <ShieldAlert className="w-6 h-6 shrink-0" />
                    <span>تم حظر هذا الجهاز من التسجيل أو الدخول</span>
                  </div>
                  <p className="text-slate-300 text-sm font-bold leading-relaxed">
                    تم حظر الجهاز نهائياً من قبل إدارة المنصة وفقاً للوائح الصارمة لمنع الحسابات الوهمية وسارقي البيانات.
                    {deviceStatus.reason && (
                      <span className="block mt-2 text-rose-300">السبب المسجل: {deviceStatus.reason}</span>
                    )}
                  </p>
                </div>

                <div className="p-4 bg-slate-800/60 rounded-2xl border border-slate-700/60 text-sm font-bold text-slate-300 flex items-center justify-between">
                  <span>إذا كنت ترى أن هذا الإجراء تم بالخطأ، تواصل مع المعلم:</span>
                  <a 
                    href="https://wa.me/201552191172" 
                    target="_blank" 
                    rel="noreferrer"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-colors"
                  >
                    واتساب 01552191172
                  </a>
                </div>
              </div>
            )}

            {/* PENDING REVIEW SCREEN */}
            {isPending && (
              <div className="space-y-6">
                <div className="p-6 bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/30 rounded-2xl text-right relative overflow-hidden">
                  <div className="flex items-center gap-3 text-amber-400 font-black text-lg mb-3">
                    <Clock className="w-6 h-6 shrink-0 text-amber-400" />
                    <span>طلبك قيد المراجعة حالياً لدى مستر محمد رضوان</span>
                  </div>
                  <p className="text-slate-300 text-sm font-bold leading-relaxed mb-4">
                    تم رفع طلبك بنجاح للوحة تحكم المعلم. للمحافظة على أمان المنصة، يتم تدقيق بيانات كل طالب يدوياً خلال <span className="text-amber-400 font-black">48 ساعة</span> كحد أقصى.
                  </p>
                  <div className="p-3 bg-slate-900/80 rounded-xl border border-amber-500/20 text-xs font-bold text-amber-300 flex items-center gap-2">
                    <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                    <span>النظام يمنع إنشاء حساب آخر من نفس الجهاز لضمان سلامة بياناتك وعدم تكرار السجلات.</span>
                  </div>
                </div>

                {/* Display Registered Data Summary */}
                {student && (
                  <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-3">
                    <h3 className="text-sm font-black text-slate-400 border-b border-slate-800 pb-2 flex items-center gap-2">
                      <User className="w-4 h-4 text-emerald-400" /> بيانات الحساب المرفوعة للمراجعة:
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-bold">
                      <div className="flex justify-between p-2.5 bg-slate-900/60 rounded-xl border border-slate-800">
                        <span className="text-slate-400">اسم الطالب:</span>
                        <span className="text-white font-black">{student.fullName}</span>
                      </div>
                      <div className="flex justify-between p-2.5 bg-slate-900/60 rounded-xl border border-slate-800">
                        <span className="text-slate-400">رقم الهاتف:</span>
                        <span className="text-white font-black" dir="ltr">{student.phone}</span>
                      </div>
                      <div className="flex justify-between p-2.5 bg-slate-900/60 rounded-xl border border-slate-800">
                        <span className="text-slate-400">المرحلة والصف:</span>
                        <span className="text-white font-black">
                          {student.stage === 'high' ? 'ثانوية' : 'إعدادية'} - الصف {student.grade}
                        </span>
                      </div>
                      <div className="flex justify-between p-2.5 bg-slate-900/60 rounded-xl border border-slate-800">
                        <span className="text-slate-400">البريد الإلكتروني:</span>
                        <span className="text-white font-black truncate max-w-[140px]" dir="ltr">{student.email}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    onClick={refreshDeviceStatus}
                    disabled={isCheckingDevice}
                    className="flex-1 py-3.5 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 border border-slate-700 shadow-md"
                  >
                    <RefreshCw className={`w-4 h-4 ${isCheckingDevice ? 'animate-spin' : ''}`} />
                    <span>تحديث وفحص حالة الطلب الآن</span>
                  </button>

                  <a
                    href="https://wa.me/201552191172"
                    target="_blank"
                    rel="noreferrer"
                    className="py-3.5 px-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                  >
                    <Phone className="w-4 h-4" />
                    <span>تواصل مع المعلم واتساب</span>
                  </a>
                </div>
              </div>
            )}

            {/* ACTIVE SCREEN - OTP or DIRECT LOGIN */}
            {isActive && (
              <div className="space-y-6">
                <div className="p-6 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/40 rounded-2xl text-right">
                  <div className="flex items-center gap-3 text-emerald-400 font-black text-lg mb-2">
                    <CheckCircle2 className="w-7 h-7 shrink-0 text-emerald-400" />
                    <span>تهانينا! تم قبول واعتماد حسابك من قبل المعلم</span>
                  </div>
                  <p className="text-slate-200 text-sm font-bold leading-relaxed">
                    حسابك الآن مقيد ومعتمد في منصة مستر محمد رضوان. يمكنك المتابعة لتفعيل الحساب أو تسجيل الدخول فوراً.
                  </p>
                </div>

                {/* If student has an OTP that needs verification */}
                {student?.whatsapp_otp && !student?.otp_verified ? (
                  <div className="p-6 bg-slate-950/80 border border-violet-500/40 rounded-2xl text-center space-y-4">
                    <div className="w-12 h-12 bg-violet-500/20 text-violet-400 rounded-2xl flex items-center justify-center mx-auto">
                      <KeyRound className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white">أدخل رمز التفعيل السري (OTP)</h3>
                      <p className="text-xs text-slate-400 font-bold mt-1">
                        تم إرسال رمز تفعيل مكون من 4 أرقام لهاتفك. أدخله هنا لتفعيل هذا الجهاز والبدء فوراً.
                      </p>
                    </div>

                    <div className="max-w-xs mx-auto space-y-3">
                      <input 
                        type="text"
                        maxLength={4}
                        dir="ltr"
                        value={otpInput}
                        onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                        placeholder="----"
                        className="w-full text-center py-3.5 bg-slate-900 border-2 border-violet-500/50 rounded-2xl text-3xl font-black tracking-[0.4em] text-white focus:outline-none focus:border-violet-400 transition-colors"
                      />
                      {otpError && <p className="text-xs text-rose-400 font-black">{otpError}</p>}
                      {otpSuccess && <p className="text-xs text-emerald-400 font-black">تم تفعيل حسابك بنجاح! جاري تحويلك...</p>}

                      <button
                        onClick={handleVerifyOtpFromScreen}
                        disabled={isVerifyingOtp || otpSuccess}
                        className="w-full py-3.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-2xl font-black text-sm transition-all shadow-lg shadow-violet-600/30 flex items-center justify-center gap-2"
                      >
                        {isVerifyingOtp ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            <span>جاري التحقق...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            <span>تأكيد وتفعيل الحساب</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-2">
                    <Link
                      href="/login"
                      className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-base transition-all flex items-center justify-center gap-2 shadow-xl shadow-emerald-600/25 hover:scale-[1.01]"
                    >
                      <span>الانتقال لتسجيل الدخول للوحة الطالب</span>
                      <ArrowLeft className="w-5 h-5" />
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* REJECTED SCREEN */}
            {isRejected && (
              <div className="space-y-6">
                <div className="p-6 bg-slate-800/80 border border-slate-700 rounded-2xl text-right">
                  <div className="flex items-center gap-3 text-rose-400 font-black text-lg mb-2">
                    <XCircle className="w-6 h-6 shrink-0" />
                    <span>عذراً، تم رفض طلب التسجيل</span>
                  </div>
                  <p className="text-slate-300 text-sm font-bold leading-relaxed mb-4">
                    تم رفض الطلب نظراً لعدم استيفاء البيانات المطلوبة أو عدم تطابق الصورة الشخصية.
                    {deviceStatus.reason && (
                      <span className="block mt-2 text-amber-300 font-black">ملاحظة المعلم: {deviceStatus.reason}</span>
                    )}
                  </p>
                </div>

                <div className="flex gap-3">
                  <a
                    href="https://wa.me/201552191172"
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2"
                  >
                    <Phone className="w-4 h-4" />
                    <span>تواصل مع المعلم لمعرفة السبب</span>
                  </a>
                  <Link
                    href="/"
                    className="px-6 py-3.5 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-black text-sm transition-all flex items-center justify-center"
                  >
                    الرئيسية
                  </Link>
                </div>
              </div>
            )}

          </div>

          {/* Quick Return to Home */}
          <div className="text-center">
            <Link 
              href="/"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-900/80 hover:bg-slate-800 text-slate-300 rounded-full text-xs font-bold border border-slate-800 transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
              <span>العودة إلى الصفحة الرئيسية</span>
            </Link>
          </div>

        </div>

        {/* Footer Signature */}
        <div className="text-center py-4 text-xs font-black text-slate-500 tracking-wider">
          Built With Developer & Designer NOUR M. EL-SAIED 💚 💚
        </div>

      </div>
    );
  }

  // ==========================================
  // SCREEN: STEP 6 - FINAL SUCCESS AFTER SUBMIT
  // ==========================================
  if (step === 6) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-between p-4 sm:p-8 text-white relative selection:bg-emerald-500">
        <div className="max-w-lg w-full mx-auto my-auto py-8">
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl backdrop-blur-xl relative overflow-hidden">
            <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-3xl border border-emerald-500/30 flex items-center justify-center mx-auto mb-6 shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            
            <h2 className="text-2xl font-black text-white mb-3">
              تم استلام طلبك ورفعه للمعلم بنجاح!
            </h2>
            
            <p className="text-slate-300 mb-6 leading-relaxed font-bold text-sm">
              طلب انضمامك الآن مسجل في قاعدة البيانات ومرفوع في لوحة تحكم <span className="text-emerald-400 font-black">مستر محمد رضوان</span> للمراجعة والتدقيق خلال <span className="text-amber-400 font-black">48 ساعة</span> كحد أقصى.
            </p>

            <div className="p-4 bg-amber-500/10 rounded-2xl text-xs text-amber-300 font-bold mb-6 text-right border border-amber-500/30 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
              <p className="leading-relaxed">
                <span className="font-black text-white">تأمين الجهاز:</span> تم تسجيل وربط هذا الجهاز بهذا الطلب بنجاح. لن تتمكن من إنشاء حساب آخر من هذا الجهاز، ويمكنك متابعة حالة الطلب في أي وقت من خلال هذه الصفحة أو عبر تسجيل الدخول.
              </p>
            </div>

            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-xs text-slate-400 font-bold mb-6 space-y-1">
              <p>رقم التواصل المباشر مع المعلم:</p>
              <p className="text-base text-white font-black tracking-wider" dir="ltr">01552191172</p>
            </div>

            <Link 
              href="/"
              className="block w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm hover:scale-[1.01] transition-all shadow-xl shadow-emerald-600/25"
            >
              العودة للرئيسية
            </Link>
          </div>
        </div>

        <div className="text-center py-4 text-xs font-black text-slate-500 tracking-wider">
          Built With Developer & Designer NOUR M. EL-SAIED 💚 💚
        </div>
      </div>
    );
  }

  // ==========================================
  // NORMAL 5-STEP REGISTRATION FLOW
  // ==========================================
  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-950 selection:bg-emerald-500 selection:text-white text-white">
      
      <div className="flex-1 flex w-full">
        {/* Form Container */}
        <div className={`w-full ${step === 5 ? 'max-w-4xl mx-auto' : 'lg:w-1/2 max-w-2xl mx-auto'} flex flex-col justify-between p-6 sm:p-12 relative z-10 transition-all duration-500`}>
          
          {/* Top Header */}
          <div className="flex items-center justify-between mb-8">
            <Link 
              href="/"
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 rounded-full text-xs font-bold text-slate-300 hover:text-emerald-400 shadow-sm border border-slate-800 transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
              <span>الرجوع للرئيسية</span>
            </Link>

            {step > 0 && step < 5 && (
              <div className="text-xs font-black text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                الخطوة {step} من 4
              </div>
            )}
          </div>

          {/* Teacher or Assistant Banner if logged in */}
          {currentUser && (currentUser.role === 'teacher' || currentUser.role === 'super_admin' || currentUser.role === 'assistant') && (
            <div className="mb-6 p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-right">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white">
                    {currentUser.role === 'assistant' ? 'أنت مسجل حالياً كمساعد معتمد' : 'أنت مسجل حالياً كمعلم المنصة (مستر محمد رضوان)'}
                  </h4>
                  <p className="text-xs text-indigo-200/80 font-bold">
                    حسابك الإداري يتيح لك الوصول المباشر للوحة التحكم
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Link
                  href={currentUser.role === 'assistant' ? '/assistant' : '/teacher'}
                  className="flex-1 sm:flex-none px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black transition-colors text-center"
                >
                  لوحة التحكم
                </Link>
                <button
                  onClick={() => logout()}
                  className="p-2 bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 rounded-xl transition-colors"
                  title="تسجيل الخروج"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Progress Bar (Visible on Steps 1-4) */}
          {step > 0 && step < 5 && (
            <div className="w-full h-1.5 bg-slate-800 rounded-full mb-8 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                style={{ width: `${(step / 4) * 100}%` }}
              />
            </div>
          )}

          {/* Form Content */}
          <div className="flex-1 flex flex-col justify-center">
            
            {/* STEP 0: Strict Policies */}
            {step === 0 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-2xl flex items-center justify-center">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-white">
                      شروط وسياسات التسجيل الصارمة
                    </h1>
                    <p className="text-xs text-slate-400 font-bold mt-1">يرجى قراءة ميثاق الأمان والالتزام بالمنصة</p>
                  </div>
                </div>
                
                <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 mb-6 shadow-xl space-y-4 max-h-[50vh] overflow-y-auto custom-scrollbar text-right">
                  <p className="text-xs font-bold text-slate-400 leading-relaxed">
                    مرحباً بك في منصة مستر محمد رضوان التعليمية. لضمان أقصى معايير الأمان والجدية، يرجى قراءة الشروط التالية والموافقة عليها:
                  </p>
                  <ul className="space-y-4">
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center shrink-0 mt-0.5 text-xs font-black">1</div>
                      <p className="text-xs sm:text-sm font-bold text-slate-200 leading-relaxed">
                        <span className="text-rose-400 font-black">تأمين الجهاز:</span> لا يمكنك التسجيل على نفس الجهاز مرتين نهائياً. يتم ربط حسابك بجهازك الحالي، ولن تتمكن من إنشاء حساب آخر من هذا الجهاز.
                      </p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0 mt-0.5 text-xs font-black">2</div>
                      <p className="text-xs sm:text-sm font-bold text-slate-200 leading-relaxed">
                        <span className="text-emerald-400 font-black">أمان البيانات:</span> احتفظ بالبريد الإلكتروني وكلمة المرور الخاصة بك في مكان آمن، فهما وسيلتك الأساسية للدخول والمتابعة.
                      </p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/40 flex items-center justify-center shrink-0 mt-0.5 text-xs font-black">3</div>
                      <p className="text-xs sm:text-sm font-bold text-slate-200 leading-relaxed">
                        <span className="text-blue-400 font-black">الاسم الحقيقي:</span> يجب إدخال الاسم الرباعي الحقيقي كما في الشهادات الرسمية. الحسابات الوهمية أو الأسماء العشوائية سيتم حظر أجهزتها فوراً.
                      </p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shrink-0 mt-0.5 text-xs font-black">4</div>
                      <p className="text-xs sm:text-sm font-bold text-slate-200 leading-relaxed">
                        <span className="text-amber-400 font-black">فترة التدقيق:</span> خلال فترة المراجعة (48 ساعة)، يتم التحقق من بياناتك من قبل المعلم، ولا يمكن فتح المحتوى حتى يتم القبول والاعتماد الرسمي.
                      </p>
                    </li>
                  </ul>
                </div>

                <label className="flex items-center gap-3 p-4 bg-slate-900 border border-slate-800 rounded-2xl cursor-pointer hover:bg-slate-850 transition-colors">
                  <input 
                    type="checkbox" 
                    checked={policiesAccepted}
                    onChange={(e) => setPoliciesAccepted(e.target.checked)}
                    className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className="text-xs sm:text-sm font-bold text-slate-200">
                    لقد قرأت جميع السياسات والشروط الأمنية وأوافق عليها تماماً.
                  </span>
                </label>
              </div>
            )}

            {/* STEP 1: Personal Info */}
            {step === 1 && (
              <div className="animate-in fade-in slide-in-from-right-8 duration-500">
                <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">
                  البيانات الشخصية والدراسية
                </h2>
                <p className="text-slate-400 mb-8 font-semibold text-sm">
                  يرجى إدخال اسمك الحقيقي وأرقام الهواتف المصرية المعتمدة بدقة.
                </p>

                <div className="space-y-5">
                  {/* 4-Part Name */}
                  <div>
                    <label className="block text-xs font-black text-slate-300 mb-2">الاسم رباعي (باللغة العربية فقط)</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div>
                        <input 
                          type="text"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleInputChange}
                          className={`w-full px-3.5 py-3 bg-slate-900 border ${errors.firstName ? 'border-rose-500' : 'border-slate-800'} rounded-2xl text-white text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none`}
                          placeholder="الأول"
                        />
                        {errors.firstName && <p className="text-[10px] text-rose-400 font-bold mt-1">{errors.firstName}</p>}
                      </div>
                      
                      <div>
                        <input 
                          type="text"
                          name="secondName"
                          value={formData.secondName}
                          onChange={handleInputChange}
                          className={`w-full px-3.5 py-3 bg-slate-900 border ${errors.secondName ? 'border-rose-500' : 'border-slate-800'} rounded-2xl text-white text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none`}
                          placeholder="الثاني"
                        />
                        {errors.secondName && <p className="text-[10px] text-rose-400 font-bold mt-1">{errors.secondName}</p>}
                      </div>

                      <div>
                        <input 
                          type="text"
                          name="thirdName"
                          value={formData.thirdName}
                          onChange={handleInputChange}
                          className={`w-full px-3.5 py-3 bg-slate-900 border ${errors.thirdName ? 'border-rose-500' : 'border-slate-800'} rounded-2xl text-white text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none`}
                          placeholder="الثالث"
                        />
                        {errors.thirdName && <p className="text-[10px] text-rose-400 font-bold mt-1">{errors.thirdName}</p>}
                      </div>

                      <div>
                        <input 
                          type="text"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleInputChange}
                          className={`w-full px-3.5 py-3 bg-slate-900 border ${errors.lastName ? 'border-rose-500' : 'border-slate-800'} rounded-2xl text-white text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none`}
                          placeholder="اللقب / الأخير"
                        />
                        {errors.lastName && <p className="text-[10px] text-rose-400 font-bold mt-1">{errors.lastName}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Student Phone */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-black text-slate-300">رقم هاتف الطالب (واتساب)</label>
                      {detectCarrier(formData.phone) && (
                        <span className="text-[11px] font-black text-emerald-400">{detectCarrier(formData.phone)}</span>
                      )}
                    </div>
                    <div className="relative">
                      <Phone className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="tel"
                        name="phone"
                        dir="ltr"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className={`w-full text-left pl-4 pr-11 py-3.5 bg-slate-900 border ${errors.phone ? 'border-rose-500' : 'border-slate-800'} rounded-2xl text-white font-bold tracking-widest focus:ring-2 focus:ring-emerald-500 outline-none text-sm`}
                        placeholder="01012345678"
                      />
                    </div>
                    {errors.phone && <p className="text-[11px] text-rose-400 font-bold">{errors.phone}</p>}
                  </div>
                  
                  {/* Parent Phone */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-black text-slate-300">رقم هاتف ولي الأمر (مختلف عن رقم الطالب)</label>
                      {detectCarrier(formData.parentPhone) && (
                        <span className="text-[11px] font-black text-amber-400">{detectCarrier(formData.parentPhone)}</span>
                      )}
                    </div>
                    <div className="relative">
                      <Phone className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400" />
                      <input 
                        type="tel"
                        name="parentPhone"
                        dir="ltr"
                        value={formData.parentPhone}
                        onChange={handleInputChange}
                        className={`w-full text-left pl-4 pr-11 py-3.5 bg-slate-900 border ${errors.parentPhone ? 'border-rose-500' : 'border-slate-800'} rounded-2xl text-white font-bold tracking-widest focus:ring-2 focus:ring-emerald-500 outline-none text-sm`}
                        placeholder="01112345678"
                      />
                    </div>
                    {errors.parentPhone && <p className="text-[11px] text-rose-400 font-bold">{errors.parentPhone}</p>}
                  </div>
                  
                  {/* Stage, Type, Grade */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-300">المرحلة الدراسية ونوع التعليم والصف</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Stage */}
                      <select
                        name="stage"
                        value={formData.stage}
                        onChange={(e) => handleInputChange(e as any)}
                        className={`w-full px-4 py-3 bg-slate-900 border ${errors.stage ? 'border-rose-500' : 'border-slate-800'} rounded-2xl text-white font-bold text-sm focus:ring-2 focus:ring-emerald-500 outline-none`}
                        dir="rtl"
                      >
                        <option value="" disabled>المرحلة...</option>
                        <option value="middle">الإعدادية</option>
                        <option value="high">الثانوية</option>
                      </select>

                      {/* Education Type */}
                      <select
                        name="educationType"
                        value={formData.educationType}
                        onChange={(e) => handleInputChange(e as any)}
                        className={`w-full px-4 py-3 bg-slate-900 border ${errors.educationType ? 'border-rose-500' : 'border-slate-800'} rounded-2xl text-white font-bold text-sm focus:ring-2 focus:ring-emerald-500 outline-none`}
                        dir="rtl"
                      >
                        <option value="" disabled>نوع التعليم...</option>
                        {formData.stage === 'middle' ? (
                          <>
                            <option value="arabic">عربي</option>
                            <option value="languages">لغات</option>
                          </>
                        ) : (
                          <>
                            <option value="general">عام</option>
                            <option value="azhar">أزهر</option>
                          </>
                        )}
                      </select>

                      {/* Grade */}
                      <select
                        name="grade"
                        value={formData.grade}
                        onChange={(e) => handleInputChange(e as any)}
                        className={`w-full px-4 py-3 bg-slate-900 border ${errors.grade ? 'border-rose-500' : 'border-slate-800'} rounded-2xl text-white font-bold text-sm focus:ring-2 focus:ring-emerald-500 outline-none`}
                        dir="rtl"
                      >
                        <option value="" disabled>الصف...</option>
                        <option value="1">الصف الأول</option>
                        <option value="2">الصف الثاني</option>
                        <option value="3">الصف الثالث</option>
                      </select>
                    </div>
                    {(errors.stage || errors.educationType || errors.grade) && (
                      <p className="text-[11px] text-rose-400 font-bold">يرجى اختيار المرحلة ونوع التعليم والصف بشكل صحيح.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Account Credentials */}
            {step === 2 && (
              <div className="animate-in fade-in slide-in-from-right-8 duration-500">
                <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">
                  بيانات حساب الدخول
                </h2>
                <p className="text-slate-400 mb-8 font-semibold text-sm">
                  احفظ هذه البيانات جيداً، ستستخدمها للدخول ومتابعة دراستك.
                </p>

                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-300">البريد الإلكتروني</label>
                    <div className="relative">
                      <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="email"
                        name="email"
                        dir="ltr"
                        value={formData.email}
                        onChange={handleInputChange}
                        className={`w-full text-left pl-4 pr-11 py-3.5 bg-slate-900 border ${errors.email ? 'border-rose-500' : 'border-slate-800'} rounded-2xl text-white font-bold focus:ring-2 focus:ring-emerald-500 outline-none text-sm`}
                        placeholder="student@example.com"
                      />
                    </div>
                    {errors.email && <p className="text-[11px] text-rose-400 font-bold">{errors.email}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-300">كلمة المرور (8 خانات على الأقل)</label>
                    <div className="relative">
                      <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="password"
                        name="password"
                        dir="ltr"
                        value={formData.password}
                        onChange={handleInputChange}
                        className={`w-full text-left pl-4 pr-11 py-3.5 bg-slate-900 border ${errors.password ? 'border-rose-500' : 'border-slate-800'} rounded-2xl text-white font-bold focus:ring-2 focus:ring-emerald-500 outline-none text-sm`}
                        placeholder="••••••••"
                      />
                    </div>
                    {errors.password && <p className="text-[11px] text-rose-400 font-bold">{errors.password}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-300">تأكيد كلمة المرور</label>
                    <div className="relative">
                      <ShieldCheck className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="password"
                        name="confirmPassword"
                        dir="ltr"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className={`w-full text-left pl-4 pr-11 py-3.5 bg-slate-900 border ${errors.confirmPassword ? 'border-rose-500' : 'border-slate-800'} rounded-2xl text-white font-bold focus:ring-2 focus:ring-emerald-500 outline-none text-sm`}
                        placeholder="••••••••"
                      />
                    </div>
                    {errors.confirmPassword && <p className="text-[11px] text-rose-400 font-bold">{errors.confirmPassword}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Captcha */}
            {step === 3 && (
              <div className="animate-in fade-in slide-in-from-right-8 duration-500 text-center">
                <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">
                  التحقق البشري
                </h2>
                <p className="text-slate-400 mb-8 font-semibold text-sm">
                  أدخل الأرقام الأربعة الظاهرة أدناه من اليسار إلى اليمين.
                </p>

                <div className="max-w-xs mx-auto space-y-6">
                  <div className="bg-slate-900 rounded-3xl p-6 flex flex-col items-center gap-4 border border-slate-800 shadow-inner">
                    <div className="text-5xl tracking-[0.5em] font-black text-emerald-400 select-none py-4 px-8 rounded-2xl w-full border border-slate-700 bg-slate-950 blur-[0.5px]" dir="ltr">
                      {generatedCaptcha}
                    </div>
                    <button 
                      onClick={generateNewCaptcha}
                      className="flex items-center gap-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>توليد كود آخر</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    <input 
                      type="text"
                      name="captchaCode"
                      dir="ltr"
                      value={formData.captchaCode}
                      onChange={handleInputChange}
                      className={`w-full text-center py-3.5 bg-slate-900 border ${errors.captchaCode ? 'border-rose-500' : 'border-slate-800'} rounded-2xl text-2xl text-white font-black tracking-widest focus:ring-2 focus:ring-emerald-500 outline-none`}
                      placeholder="----"
                      maxLength={4}
                    />
                    {errors.captchaCode && <p className="text-xs text-rose-400 font-bold">{errors.captchaCode}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: Identity Photo */}
            {step === 4 && (
              <div className="animate-in fade-in slide-in-from-right-8 duration-500 text-center">
                <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">
                  الصورة الشخصية للتحقق
                </h2>
                
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 mb-6 text-right space-y-2">
                  <div className="flex items-center gap-2 text-rose-400 font-black text-sm">
                    <ShieldAlert className="w-5 h-5 shrink-0" />
                    <span>تنبيه أمني هام</span>
                  </div>
                  <p className="text-slate-300 font-bold leading-relaxed text-xs">
                    يجب رفع صورة شخصية حقيقية وواضحة لك لتطابق هويتك. الحسابات بصور غير حقيقية أو مجهولة سيتم رفضها فوراً وحظر أجهزتها.
                  </p>
                </div>

                <div className="max-w-xs mx-auto">
                  <label className={`block relative aspect-square rounded-3xl border-2 border-dashed ${errors.photo ? 'border-rose-500 bg-rose-500/10' : 'border-slate-700 hover:border-emerald-500 bg-slate-900/60'} cursor-pointer transition-all overflow-hidden group`}>
                    <input 
                      type="file" 
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoUpload}
                    />
                    
                    {photoPreview ? (
                      <div className="relative w-full h-full">
                        <Image src={photoPreview} alt="Preview" fill unoptimized className="object-cover" />
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-400 group-hover:text-emerald-400 transition-colors p-4">
                        <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-300">
                          <Camera className="w-7 h-7" />
                        </div>
                        <span className="font-black text-sm">اضغط لرفع صورتك الشخصية</span>
                        <span className="text-[11px] font-semibold text-slate-500">JPG أو PNG بحد أقصى 5 ميجابايت</span>
                      </div>
                    )}
                  </label>
                  {errors.photo && <p className="text-xs text-rose-400 font-bold mt-3">{errors.photo}</p>}
                </div>
              </div>
            )}

            {/* STEP 5: Final Review */}
            {step === 5 && (
              <div className="animate-in fade-in zoom-in-95 duration-500">
                <div className="text-center mb-6">
                  <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">
                    مراجعة البيانات قبل التأكيد النهائي
                  </h2>
                  <p className="text-slate-400 font-semibold text-xs sm:text-sm max-w-lg mx-auto">
                    يرجى مراجعة بياناتك جيداً. عند الضغط على تأكيد، سيتم قفل التسجيل على هذا الجهاز ورفع الطلب للمعلم.
                  </p>
                </div>

                {submitError && (
                  <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400 text-xs font-black mb-6 flex items-center gap-2 text-right">
                    <ShieldAlert className="w-5 h-5 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {/* Personal Box */}
                  <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 shadow-sm relative overflow-hidden">
                    <button onClick={() => setStep(1)} className="absolute top-4 left-4 p-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-emerald-500 hover:text-white transition-colors">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                        <User className="w-5 h-5" />
                      </div>
                      <h3 className="text-sm font-black text-white">المعلومات الشخصية</h3>
                    </div>
                    <div className="space-y-3 text-xs font-bold">
                      <div className="flex justify-between border-b border-slate-800 pb-2">
                        <span className="text-slate-400">الاسم بالكامل:</span>
                        <span className="text-white">{`${formData.firstName} ${formData.secondName} ${formData.thirdName} ${formData.lastName}`}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-800 pb-2">
                        <span className="text-slate-400">هاتف الطالب:</span>
                        <span className="text-white" dir="ltr">{formData.phone}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-800 pb-2">
                        <span className="text-slate-400">هاتف ولي الأمر:</span>
                        <span className="text-white" dir="ltr">{formData.parentPhone}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">الصف والمرحلة:</span>
                        <span className="text-emerald-400">
                          {formData.stage === 'high' ? 'المرحلة الثانوية' : 'المرحلة الإعدادية'}
                          {' - '}
                          {formData.educationType === 'general' ? 'عام' : formData.educationType === 'azhar' ? 'أزهر' : formData.educationType === 'arabic' ? 'عربي' : 'لغات'}
                          {' - '}
                          {formData.grade === '1' ? 'الصف الأول' : formData.grade === '2' ? 'الصف الثاني' : 'الصف الثالث'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Account & Photo Box */}
                  <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 shadow-sm relative overflow-hidden">
                    <button onClick={() => setStep(2)} className="absolute top-4 left-4 p-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-emerald-500 hover:text-white transition-colors z-10">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <Lock className="w-5 h-5" />
                      </div>
                      <h3 className="text-sm font-black text-white">حساب الدخول والصورة</h3>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-20 h-20 shrink-0 rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden relative">
                        {photoPreview && <Image src={photoPreview} fill unoptimized className="object-cover" alt="Profile" />}
                        <button onClick={() => setStep(4)} className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex-1 space-y-3 text-xs font-bold flex flex-col justify-center">
                        <div className="flex justify-between border-b border-slate-800 pb-2">
                          <span className="text-slate-400">البريد:</span>
                          <span className="text-white truncate max-w-[130px]" dir="ltr">{formData.email}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">كلمة المرور:</span>
                          <span className="text-white">••••••••</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex gap-3 text-amber-300 text-xs font-bold mb-6 text-right">
                  <Info className="w-5 h-5 shrink-0 text-amber-400" />
                  <p className="leading-relaxed">
                    بمجرد الضغط على تأكيد، يتم حظر إنشاء أي حسابات أخرى من هذا الجهاز نهائياً، ويتم رفع الطلب لمستر محمد رضوان للمراجعة والاعتماد.
                  </p>
                </div>

              </div>
            )}

          </div>

          {/* Bottom Navigation Buttons */}
          <div className="pt-6 mt-6 border-t border-slate-800 flex items-center gap-3">
            {step === 5 ? (
              <button
                onClick={handleSubmitFinal}
                disabled={isSubmitting}
                className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-2xl font-black text-base transition-all shadow-xl shadow-emerald-600/25 flex items-center justify-center gap-2 hover:scale-[1.01]"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>جاري الإرسال وتأمين الطلب...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    <span>تأكيد وإرسال الطلب للمعلم</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={(step === 0 && !policiesAccepted) || isCheckingContact}
                className={`flex-1 py-4 rounded-2xl font-black text-base transition-all flex items-center justify-center gap-2 ${
                  (step === 0 && !policiesAccepted) || isCheckingContact
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl shadow-emerald-600/25 hover:scale-[1.01]'
                }`}
              >
                {isCheckingContact ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>جاري التحقق من البيانات...</span>
                  </>
                ) : (
                  <>
                    <span>{step === 0 ? 'موافق، ابدأ التسجيل' : 'التالي'}</span>
                    <ArrowLeft className="w-5 h-5" />
                  </>
                )}
              </button>
            )}

            {step > 0 && step < 5 && (
              <button
                onClick={handlePrev}
                className="py-4 px-6 rounded-2xl font-black text-sm text-slate-300 bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-colors"
              >
                رجوع
              </button>
            )}
          </div>

        </div>

        {/* Left Side: Fixed Image Area (Desktop) */}
        {step < 5 && (
          <div className="hidden lg:block lg:w-1/2 relative bg-[#112a21] border-r border-slate-800 overflow-hidden">
            <Image 
              src="/register-image.png?v=2" 
              alt="Mr. Mohamed Radwan Registration"
              fill
              sizes="50vw"
              className="object-cover object-center"
              priority
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60" />
          </div>
        )}

      </div>

      {/* Footer Signature */}
      <div className="text-center py-4 text-xs font-black text-slate-500 tracking-wider border-t border-slate-900">
        Built With Developer & Designer NOUR M. EL-SAIED 💚 💚
      </div>

    </div>
  );
}
