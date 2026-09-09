'use client';

import React, { useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { User, BookOpen, Phone, Mail, Edit3, Shield, MonitorSmartphone, Camera, CheckCircle2, Wallet, Sparkles } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function StudentProfilePage() {
  const { currentUser, updateCurrentUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUpdatingPhoto, setIsUpdatingPhoto] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  if (!currentUser) return null;

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('يرجى اختيار ملف صورة صالح (JPG, PNG, WebP)');
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      alert('حجم الصورة كبير جداً، الحد الأقصى 4 ميجابايت');
      return;
    }

    setIsUpdatingPhoto(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result as string;
      updateCurrentUser({ avatarUrl: base64Data });
      setIsUpdatingPhoto(false);
      setSuccessMsg('تم تحديث الصورة الشخصية بنجاح ✨');
      setTimeout(() => setSuccessMsg(''), 4000);
    };
    reader.onerror = () => {
      alert('حدث خطأ أثناء قراءة ملف الصورة');
      setIsUpdatingPhoto(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-2 flex items-center gap-2">
            الملف الشخصي <User className="w-6 h-6 text-emerald-500" />
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm md:text-base">
            إدارة بياناتك الشخصية وصورتك المعتمدة على المنصة.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold text-sm flex items-center gap-3 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-6 md:p-10 shadow-sm relative overflow-hidden">
        {/* Background Accent */}
        <div className="absolute top-0 right-0 w-full h-32 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 opacity-50 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center md:items-start">
          
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative group">
              <div className="w-32 h-32 rounded-[2rem] bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-black text-5xl border-4 border-white dark:border-slate-800 shadow-xl overflow-hidden relative">
                {currentUser.avatarUrl ? (
                  <Image
                    src={currentUser.avatarUrl}
                    alt={currentUser.fullName}
                    fill
                    unoptimized
                    className="object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span>{currentUser.fullName?.charAt(0) || 'ط'}</span>
                )}
              </div>

              {/* Photo Change Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUpdatingPhoto}
                title="تغيير الصورة الشخصية"
                className="absolute -bottom-2 -left-2 p-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/30 transition-all hover:scale-110 active:scale-95"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 mt-1"
            >
              <Edit3 className="w-3.5 h-3.5" />
              تغيير الصورة الشخصية
            </button>

            <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-black rounded-xl border border-emerald-100 dark:border-emerald-500/20 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" /> حساب موثق ونشط
            </span>
          </div>

          {/* Details Section */}
          <div className="flex-1 w-full space-y-6">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-1">{currentUser.fullName}</h2>
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                  {currentUser.stage === 'high' ? 'المرحلة الثانوية' : 'المرحلة الإعدادية'} - الصف {currentUser.grade === 1 ? 'الأول' : currentUser.grade === 2 ? 'الثاني' : 'الثالث'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs">
                  {currentUser.carrier ? `شبكة ${currentUser.carrier}` : 'شبكة مصرية معتمدة'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">رقم الهاتف الأساسي</span>
                <div className="flex items-center gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <Phone className="w-5 h-5 text-emerald-500" />
                  <span className="font-bold text-slate-800 dark:text-slate-200" dir="ltr">{currentUser.phone}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">رقم هاتف ولي الأمر</span>
                <div className="flex items-center gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <Phone className="w-5 h-5 text-indigo-500" />
                  <span className="font-bold text-slate-800 dark:text-slate-200" dir="ltr">{currentUser.parentPhone || 'غير مسجل'}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">البريد الإلكتروني</span>
                <div className="flex items-center gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <Mail className="w-5 h-5 text-amber-500" />
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{currentUser.email}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">نوع التعليم</span>
                <div className="flex items-center gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <BookOpen className="w-5 h-5 text-blue-500" />
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {currentUser.educationType === 'azhar' ? 'أزهر شريف' : currentUser.educationType === 'general' ? 'تعليم عام' : 'لغات / عربي'}
                  </span>
                </div>
              </div>

            </div>

          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Hardware Devices Mini-Widget */}
        <Link 
          href="/student/devices"
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 hover:border-emerald-500/50 transition-colors shadow-sm group flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-500">
              <MonitorSmartphone className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 dark:text-white mb-0.5">أجهزتي المسجلة</h3>
              <p className="text-xs font-bold text-slate-500">إدارة الأجهزة المسموح لها بالدخول للمنصة</p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
            <Edit3 className="w-4 h-4" />
          </div>
        </Link>

        {/* Wallet Balance Mini-Widget */}
        <Link 
          href="/student/wallet"
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 hover:border-emerald-500/50 transition-colors shadow-sm group flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 dark:text-white mb-0.5">محفظتي ورصيدي</h3>
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {currentUser.walletBalance || 0} ج.م (شحن فوري أو رصيد)
              </p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
            <Sparkles className="w-4 h-4 text-emerald-500" />
          </div>
        </Link>

      </div>

    </div>
  );
}
