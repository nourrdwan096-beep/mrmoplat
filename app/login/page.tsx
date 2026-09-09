'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, LogIn, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { loginWithCredentials } = useAuth();
  
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [studentIdForOtp, setStudentIdForOtp] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    
    if (!formData.email || !formData.password) {
      setError('الرجاء إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }

    setIsLoading(true);
    try {
      const res = await loginWithCredentials(formData.email, formData.password);
      
      if (res.success) {
        if (res.requiresOtp && res.studentId) {
           setShowOtp(true);
           setStudentIdForOtp(res.studentId);
           setSuccessMsg(res.message || 'يرجى إدخال رمز التفعيل.');
        } else {
          const stored = localStorage.getItem('mr_radwan_current_user');
          if (stored) {
            const user = JSON.parse(stored);
            if (user.role === 'teacher' || user.role === 'super_admin') {
              router.push('/teacher');
              return;
            } else if (user.role === 'assistant') {
              router.push('/assistant');
              return;
            } else if (user.role === 'student' && user.status === 'active') {
              try {
                const { lockDevicePermanently } = await import('@/lib/deviceSecurity');
                await lockDevicePermanently(user);
              } catch {}
              router.push('/student');
              return;
            }
          }
          router.push('/');
        }
      } else {
        setError(res.message);
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
        // Verified! Re-login automatically without showing OTP screen again
        setShowOtp(false);
        await handleLogin(e); // This will pass since otp_verified is now true
      } else {
        setError(res.message || 'الرمز غير صحيح');
      }
    } catch (err: any) {
       setError(err.message || 'فشل التحقق من الرمز');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 selection:bg-violet-500 selection:text-white" dir="rtl">
      
      {/* Right Side: Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-12 relative z-10 transition-all duration-500 max-w-2xl mx-auto lg:mx-0">
        
        {/* Top Header */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <div className="relative w-10 h-10 rounded-full flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform overflow-hidden">
              <Image src="/logo.png" alt="Logo" fill className="object-cover" unoptimized />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-black text-slate-900 dark:text-white tracking-tight">MR. MOHAMED RADWAN</span>
              <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400">العودة للرئيسية</span>
            </div>
          </Link>
          
          <Link href="/register" className="text-xs font-bold text-slate-500 hover:text-violet-600 dark:hover:text-violet-400 transition-colors flex items-center gap-1">
            ليس لديك حساب؟ إنشاء حساب
            <ArrowRight className="w-3 h-3 rotate-180" />
          </Link>
        </div>

        {/* Center Form */}
        <div className="flex-1 flex flex-col justify-center max-w-md w-full mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
              {showOtp ? 'تأكيد الحساب' : 'تسجيل الدخول للمنصة'}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {showOtp ? 'لقد تم قبول حسابك، يرجى إدخال الرمز المرسل لتفعيل الدخول' : 'أهلاً بك مجدداً، أدخل بياناتك للمتابعة'}
            </p>
          </div>

          {showOtp ? (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
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
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-5">
              {error && (
                <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm font-bold text-center">
                  {error}
                </div>
              )}

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1 block">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="example@domain.com"
                  dir="ltr"
                  className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all text-left"
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <Mail className="w-5 h-5" />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1 block">
                كلمة المرور
              </label>
              <div className="relative">
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  dir="ltr"
                  className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all text-left"
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <Lock className="w-5 h-5" />
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
          </form>
          )}

          <div className="mt-8 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
            بتسجيلك الدخول، أنت توافق على سياسات وشروط المنصة
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
        {/* Placeholder for the user's specific login image */}
        <Image 
          src="/login-image.png?v=1" 
          alt="Login Background"
          fill
          sizes="50vw"
          className="object-cover object-center"
          priority
          unoptimized
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
        {/* Fallback solid color if image is missing */}
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
