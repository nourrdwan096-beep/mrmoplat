'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Users, UserCheck, UserX, ShieldBan, Shield, 
  Key, MoreVertical, Check, MessageCircle, Phone, 
  Mail, MonitorSmartphone, Eye, EyeOff, Lock, Loader2,
  Trash2, AlertTriangle, Send, BookOpen, Award, CheckCircle2,
  RotateCcw, X, MessageSquare, AlertCircle, RefreshCw, ChevronDown,
  Sparkles, ExternalLink, Plus
} from 'lucide-react';
import { fetchStudents, updateStudentStatus, deleteStudent, StudentProfile } from '@/lib/studentService';
import { sendMessage } from '@/lib/messagingService';
import { 
  fetchAllCourses, 
  fetchStudentEnrolledCourseIds, 
  fetchStudentProgress, 
  grantStudentExtraAttempts,
  resetStudentItemProgress,
  CourseData, 
  StudentItemProgressData 
} from '@/lib/academicService';

export default function StudentsManagementClient() {
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'active' | 'banned'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Delete Target & Modal State
  const [deleteTarget, setDeleteTarget] = useState<{
    ids: string[];
    name?: string;
    type: 'single' | 'bulk';
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Master Key State
  const [masterKey, setMasterKey] = useState('');
  const [isMasterKeyUnlocked, setIsMasterKeyUnlocked] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('mr_radwan_master_unlocked') === 'true';
    }
    return false;
  });
  const [showMasterKeyModal, setShowMasterKeyModal] = useState(false);
  const [masterKeyError, setMasterKeyError] = useState('');
  const [captchaCode, setCaptchaCode] = useState(() => Math.floor(1000 + Math.random() * 9000).toString());
  const [enteredCaptcha, setEnteredCaptcha] = useState('');

  // Quick Messaging State
  const [messageTargetStudent, setMessageTargetStudent] = useState<StudentProfile | null>(null);
  const [messageTitle, setMessageTitle] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [messageSentSuccess, setMessageSentSuccess] = useState(false);

  // Academic Details & Advice State
  const [detailsTargetStudent, setDetailsTargetStudent] = useState<StudentProfile | null>(null);
  const [studentCourses, setStudentCourses] = useState<CourseData[]>([]);
  const [loadingAcademic, setLoadingAcademic] = useState(false);
  const [studentProgressMap, setStudentProgressMap] = useState<Record<string, Record<string, StudentItemProgressData>>>({});
  const [adviceText, setAdviceText] = useState('');
  const [sendingAdvice, setSendingAdvice] = useState(false);
  const [adviceSuccess, setAdviceSuccess] = useState(false);

  // Ban Modal State
  const [banTargetStudent, setBanTargetStudent] = useState<StudentProfile | null>(null);
  const [banReason, setBanReason] = useState('');
  const [isSubmittingBan, setIsSubmittingBan] = useState(false);

  // Photo Preview Modal State
  const [previewPhotoStudent, setPreviewPhotoStudent] = useState<StudentProfile | null>(null);

  const refreshCaptcha = () => {
    setCaptchaCode(Math.floor(1000 + Math.random() * 9000).toString());
    setEnteredCaptcha('');
    setMasterKeyError('');
  };

  const loadStudents = async () => {
    const data = await fetchStudents();
    setStudents(data);
    setIsLoading(false);
  };

  useEffect(() => {
    let mounted = true;
    fetchStudents().then(data => {
      if (mounted) {
        setStudents(data);
        setIsLoading(false);
      }
    });
    return () => { mounted = false; };
  }, []);

  // Load Academic Records when detailsTargetStudent changes
  useEffect(() => {
    if (!detailsTargetStudent) {
      setStudentCourses([]);
      return;
    }
    setLoadingAcademic(true);
    setAdviceText('');
    setAdviceSuccess(false);

    (async () => {
      try {
        const enrolledIds = await fetchStudentEnrolledCourseIds(detailsTargetStudent.id, detailsTargetStudent.email);
        const all = await fetchAllCourses();
        const enrolled = all.filter(c => enrolledIds.includes(c.id));
        setStudentCourses(enrolled);

        const progMaps: Record<string, Record<string, StudentItemProgressData>> = {};
        for (const c of enrolled) {
          progMaps[c.id] = await fetchStudentProgress(detailsTargetStudent.id, c.id);
        }
        setStudentProgressMap(progMaps);
      } catch (err) {
        console.warn('Error loading academic details:', err);
      } finally {
        setLoadingAcademic(false);
      }
    })();
  }, [detailsTargetStudent]);

  // Derived Data
  const pendingStudents = students.filter(s => s.status === 'pending_review' && s.fullName?.includes(searchQuery));
  const activeStudents = students.filter(s => s.status === 'active' && s.fullName?.includes(searchQuery));
  const bannedStudents = students.filter(s => s.status === 'banned' && s.fullName?.includes(searchQuery));

  // --- ACTIONS ---
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAll = (list: StudentProfile[]) => {
    if (selectedIds.length === list.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(list.map(s => s.id));
    }
  };

  const handleAction = async (ids: string[], action: 'accept' | 'accept_otp' | 'reject' | 'ban', otpValue?: string, reason?: string) => {
    for (const id of ids) {
      if (action === 'accept') {
        await updateStudentStatus(id, 'active');
      } else if (action === 'accept_otp') {
        const otp = otpValue || Math.floor(1000 + Math.random() * 9000).toString();
        await updateStudentStatus(id, 'pending_review', otp);
      } else if (action === 'reject') {
        await updateStudentStatus(id, 'rejected');
      } else if (action === 'ban') {
        await updateStudentStatus(id, 'banned', undefined, reason || 'حظر من قبل المعلم');
      }
    }

    // Refresh after actions
    await loadStudents();
    setSelectedIds([]);
  };

  const confirmDeleteSingle = (id: string, name: string) => {
    setDeleteTarget({ ids: [id], name, type: 'single' });
  };

  const confirmDeleteBulk = (ids: string[]) => {
    if (ids.length === 0) return;
    setDeleteTarget({ ids, type: 'bulk' });
  };

  const executeDelete = async () => {
    if (!deleteTarget || deleteTarget.ids.length === 0) return;
    setIsDeleting(true);
    try {
      for (const id of deleteTarget.ids) {
        await deleteStudent(id);
      }
      await loadStudents();
      setSelectedIds([]);
      setDeleteTarget(null);
    } catch (err) {
      console.error('Failed to delete student:', err);
      alert('حدث خطأ أثناء حذف الطالب وفك قيد الجهاز');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUnlockMasterKey = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = masterKey.trim();
    const isKeyValid = 
      cleanKey === 'sse-000-#######-****&mr+pp' ||
      cleanKey === 'hfhrefjker4390430458&-cmdsfo3-@iofm3omfoew';

    if (!isKeyValid) {
      setMasterKeyError('كلمة المرور الرئيسية غير صحيحة! يرجى إدخال المفتاح السري المعتمد.');
      return;
    }

    if (enteredCaptcha.trim() !== captchaCode) {
      setMasterKeyError('رمز التحقق البشري غير صحيح! يرجى كتابة الـ 4 أرقام الموضحة.');
      return;
    }

    setIsMasterKeyUnlocked(true);
    setShowMasterKeyModal(false);
    setMasterKey('');
    setEnteredCaptcha('');
    setMasterKeyError('');
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('mr_radwan_master_unlocked', 'true');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageTargetStudent || !messageTitle.trim() || !messageContent.trim()) return;
    setIsSendingMessage(true);
    try {
      await sendMessage({
        senderId: 'teacher',
        senderName: 'مستر محمد رضوان',
        senderRole: 'teacher',
        recipientStudentId: messageTargetStudent.id,
        recipientStudentName: messageTargetStudent.fullName,
        isBroadcast: false,
        title: messageTitle.trim(),
        content: messageContent.trim(),
      });
      setMessageSentSuccess(true);
      setTimeout(() => {
        setMessageSentSuccess(false);
        setMessageTargetStudent(null);
        setMessageTitle('');
        setMessageContent('');
      }, 1800);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء إرسال الرسالة');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleSendAdvice = async () => {
    if (!detailsTargetStudent || !adviceText.trim()) return;
    setSendingAdvice(true);
    try {
      await sendMessage({
        senderId: 'teacher',
        senderName: 'مستر محمد رضوان',
        senderRole: 'teacher',
        recipientStudentId: detailsTargetStudent.id,
        recipientStudentName: detailsTargetStudent.fullName,
        isBroadcast: false,
        title: '🌟 توجيه ونصيحة أكاديمية خاصة من مستر محمد رضوان',
        content: adviceText.trim(),
      });
      setAdviceSuccess(true);
      setTimeout(() => {
        setAdviceSuccess(false);
        setAdviceText('');
      }, 2500);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء إرسال النصيحة');
    } finally {
      setSendingAdvice(false);
    }
  };

  const handleGrantExtraAttempt = async (courseId: string, itemId: string) => {
    if (!detailsTargetStudent) return;
    const res = await grantStudentExtraAttempts(detailsTargetStudent.id, courseId, itemId, 1, false, 'منحة استثنائية من المعلم');
    if (res.success) {
      alert(res.message);
      const updatedProg = await fetchStudentProgress(detailsTargetStudent.id, courseId);
      setStudentProgressMap(prev => ({ ...prev, [courseId]: updatedProg }));
    } else {
      alert(res.message || 'فشلت عملية منح المحاولة');
    }
  };

  const handleResetItemProgress = async (courseId: string, itemId: string) => {
    if (!detailsTargetStudent) return;
    const res = await resetStudentItemProgress(detailsTargetStudent.id, courseId, itemId, 'تصفير شامل للمحاولات والدرجات');
    if (res.success) {
      alert(res.message);
      const updatedProg = await fetchStudentProgress(detailsTargetStudent.id, courseId);
      setStudentProgressMap(prev => ({ ...prev, [courseId]: updatedProg }));
    } else {
      alert(res.message || 'فشلت إعادة التعيين');
    }
  };

  const executeBan = async () => {
    if (!banTargetStudent) return;
    setIsSubmittingBan(true);
    try {
      await updateStudentStatus(banTargetStudent.id, 'banned', undefined, banReason || 'طالب مشاغب / مخالفة تعليمات المنصة');
      await loadStudents();
      setBanTargetStudent(null);
      setBanReason('');
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء حظر الطالب');
    } finally {
      setIsSubmittingBan(false);
    }
  };

  // --- RENDER HELPERS ---
  const renderPendingCard = (student: StudentProfile) => (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      key={student.id}
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-lg transition-all"
    >
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex items-start gap-4 flex-1">
          <input 
            type="checkbox" 
            checked={selectedIds.includes(student.id)}
            onChange={() => toggleSelection(student.id)}
            className="mt-2 w-5 h-5 rounded-md border-slate-300 text-violet-600 focus:ring-violet-500"
          />
          <button
            type="button"
            onClick={() => setPreviewPhotoStudent(student)}
            title="انقر لتكبير صورة هوية الطالب"
            className="group relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-500 rounded-2xl shrink-0"
          >
            <Image width={64} height={64} src={student.avatarUrl || 'https://i.pravatar.cc/150'} alt={student.fullName || ''} unoptimized className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-100 dark:border-slate-800 group-hover:scale-105 transition-transform shadow-sm" referrerPolicy="no-referrer" />
            <span className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition-opacity">
              تكبير
            </span>
          </button>
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              {student.fullName}
              <span className="px-2 py-0.5 text-xs rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 font-bold">
                قيد المراجعة
              </span>
            </h3>
            <div className="flex flex-wrap gap-4 mt-3 text-sm font-semibold text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5"><Phone className="w-4 h-4" /> {student.phone}</span>
              <span className="flex items-center gap-1.5"><Shield className="w-4 h-4" /> ولي الأمر: {student.parentPhone || 'غير متوفر'}</span>
              <span className="flex items-center gap-1.5"><MonitorSmartphone className="w-4 h-4" /> البصمة: {student.deviceFingerprint ? `${student.deviceFingerprint.slice(0, 10)}...` : 'غير متوفر'}</span>
            </div>
            
            <div className="flex flex-wrap gap-4 mt-2 text-xs font-bold text-slate-400">
              <span>المرحلة: {student.stage === 'middle' ? 'الإعدادية' : 'الثانوية'}</span>
              <span>• الصف: {student.grade}</span>
              <span>• النظام: {student.educationType === 'general' ? 'عام' : 'أزهر'}</span>
            </div>

            {student.whatsapp_otp && (
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 rounded-xl text-xs font-black text-amber-700 dark:text-amber-400">
                <Key className="w-3.5 h-3.5" />
                <span>رمز التفعيل عبر الواتساب: <strong className="font-mono text-sm tracking-wider text-slate-900 dark:text-white">{student.whatsapp_otp}</strong></span>
              </div>
            )}
          </div>
        </div>

        {/* Sensitive Information Display */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl flex flex-col justify-center gap-2 min-w-[240px] border border-slate-100 dark:border-slate-800">
          <div className="text-xs font-bold text-slate-400">البريد الإلكتروني:</div>
          <div className="text-sm font-black text-slate-800 dark:text-slate-200 truncate">
            {isMasterKeyUnlocked ? student.email : '••••••••••@•••.com'}
          </div>
          <div className="text-xs font-bold text-slate-400 mt-2">كلمة المرور:</div>
          <div className="text-sm font-black text-slate-800 dark:text-slate-200 truncate">
            {isMasterKeyUnlocked ? (
              <span className="font-mono bg-white dark:bg-slate-900 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700">{student.passwordVault || '••••••'}</span>
            ) : (
              '••••••••••'
            )}
          </div>
          {!isMasterKeyUnlocked && (
            <button 
              onClick={() => { refreshCaptcha(); setShowMasterKeyModal(true); }}
              className="mt-2 text-xs font-bold text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1"
            >
              <Key className="w-3.5 h-3.5" /> كشف البيانات (Master Key)
            </button>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => handleAction([student.id], 'accept')}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Check className="w-4 h-4" /> موافقة الطلب بلا تأكيد
          </button>
          <button 
            onClick={() => handleAction([student.id], 'accept_otp')}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Key className="w-4 h-4" /> موافقة بتأكيد (كود واتساب)
          </button>
          <button 
            onClick={() => handleAction([student.id], 'reject')}
            className="px-4 py-2 bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 hover:bg-rose-100 rounded-xl font-bold text-xs transition-colors"
          >
            رفض الطلب
          </button>
          <button 
            onClick={() => { setBanTargetStudent(student); setBanReason(''); }}
            className="px-4 py-2 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 rounded-xl font-bold text-xs transition-colors"
          >
            حظر الجهاز
          </button>
        </div>

        <button 
          onClick={() => confirmDeleteSingle(student.id, student.fullName)}
          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all"
          title="حذف الطالب وفك قيد جهازه"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );

  const renderActiveCard = (student: StudentProfile) => (
    <motion.div 
      layout
      key={student.id}
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPreviewPhotoStudent(student)}
            title="انقر لتكبير صورة هوية الطالب"
            className="group relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-500 rounded-2xl shrink-0"
          >
            <Image width={48} height={48} src={student.avatarUrl || 'https://i.pravatar.cc/150'} alt={student.fullName} unoptimized className="w-12 h-12 rounded-2xl object-cover border border-slate-100 dark:border-slate-800 group-hover:scale-105 transition-transform" referrerPolicy="no-referrer" />
            <span className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[9px] font-bold transition-opacity">
              تكبير
            </span>
          </button>
          <div>
            <h4 className="font-black text-slate-900 dark:text-white text-base">{student.fullName}</h4>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 font-bold">
              <span>{student.stage === 'middle' ? 'الإعدادية' : 'الثانوية'} - الصف {student.grade}</span>
              <span>• {student.educationType === 'general' ? 'عام' : 'أزهر'}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => confirmDeleteSingle(student.id, student.fullName)} 
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors"
            title="حذف وفك قيد الجهاز"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          <button 
            onClick={() => { setBanTargetStudent(student); setBanReason(''); }} 
            className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors" 
            title="إيقاف / حظر"
          >
            <ShieldBan className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="space-y-3 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between text-sm">
          <span className="font-bold text-slate-500">الهاتف:</span>
          <span className="font-bold text-slate-900 dark:text-white" dir="ltr">{student.phone}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="font-bold text-slate-500">البريد الإلكتروني:</span>
          {isMasterKeyUnlocked ? (
            <span className="font-bold text-slate-900 dark:text-white">{student.email}</span>
          ) : (
            <span className="text-slate-400">••••••••••@•••.com</span>
          )}
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="font-bold text-slate-500">كلمة المرور:</span>
          {isMasterKeyUnlocked ? (
            <span className="font-bold text-slate-900 dark:text-white tracking-wider font-mono" dir="ltr">{student.passwordVault || '••••••'}</span>
          ) : (
            <span className="text-slate-400">••••••••••</span>
          )}
        </div>
      </div>
      
      {!isMasterKeyUnlocked && (
        <button 
          onClick={() => { refreshCaptcha(); setShowMasterKeyModal(true); }} 
          className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-bold text-sm transition-colors"
        >
          <Lock className="w-4 h-4" /> كشف البيانات الحساسة (Master Key)
        </button>
      )}

      <div className="mt-4 flex gap-2">
        <button 
          onClick={() => {
            setMessageTargetStudent(student);
            setMessageTitle('');
            setMessageContent('');
          }}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/40 rounded-xl font-bold text-sm transition-colors"
        >
          <Mail className="w-4 h-4" /> مراسلة
        </button>
        <button 
          onClick={() => setDetailsTargetStudent(student)}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl font-bold text-sm transition-colors"
        >
          <Users className="w-4 h-4" /> تفاصيل أكثر
        </button>
      </div>
    </motion.div>
  );

  const renderBannedCard = (student: StudentProfile) => (
    <motion.div 
      layout
      key={student.id}
      className="bg-rose-50/30 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-3xl p-6 shadow-sm flex flex-col justify-between"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Image width={48} height={48} src={student.avatarUrl || 'https://i.pravatar.cc/150'} alt={student.fullName} unoptimized className="w-12 h-12 rounded-2xl object-cover border border-rose-200 dark:border-rose-800 opacity-70" referrerPolicy="no-referrer" />
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-black text-slate-900 dark:text-white text-base">{student.fullName}</h4>
              <span className="bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                <ShieldBan className="w-3 h-3" /> محظور نهائياً
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 font-bold">
              <span>{student.stage === 'middle' ? 'الإعدادية' : 'الثانوية'} - الصف {student.grade}</span>
              <span>• {student.educationType === 'general' ? 'عام' : 'أزهر'}</span>
            </div>
          </div>
        </div>
        <button 
          onClick={() => confirmDeleteSingle(student.id, student.fullName)} 
          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors"
          title="حذف نهائي وسحب البيانات"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      <div className="mt-4 p-3 bg-rose-100/60 dark:bg-rose-950/60 rounded-2xl border border-rose-200 dark:border-rose-800/80">
        <p className="text-xs font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5 mb-1">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" /> سبب الحظر المسجل:
        </p>
        <p className="text-xs text-slate-700 dark:text-slate-300 font-medium mr-5">
          {student.banReason || 'حظر أمني شامل بقرار المعلم وإغلاق بصمات الأجهزة المسجلة.'}
        </p>
      </div>

      <div className="space-y-2 mt-4 pt-4 border-t border-rose-200/60 dark:border-rose-900/40 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-500">الهاتف:</span>
          <span className="font-bold text-slate-800 dark:text-slate-200" dir="ltr">{student.phone}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-500">ولي الأمر:</span>
          <span className="font-bold text-slate-800 dark:text-slate-200" dir="ltr">{student.parentPhone || 'غير مسجل'}</span>
        </div>
      </div>

      <div className="mt-5 flex gap-2">
        <button 
          onClick={() => handleAction([student.id], 'accept')}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs transition-colors shadow-sm"
        >
          <CheckCircle2 className="w-4 h-4" /> فك الحظر وتفعيل الحساب
        </button>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">إدارة الطلاب</h1>
          <p className="text-slate-500 dark:text-slate-400 font-bold mt-1">التحكم الكامل في تسجيلات الطلاب والبيانات الحساسة</p>
        </div>
        
        {/* Search */}
        <div className="relative w-full md:w-72">
          <input 
            type="text" 
            placeholder="ابحث عن طالب..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl pl-4 pr-11 py-3 text-sm font-bold focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all"
          />
          <Search className="w-5 h-5 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-slate-200/50 dark:bg-slate-800/50 rounded-2xl w-fit flex-wrap gap-1">
        <button 
          onClick={() => { setActiveTab('pending'); setSelectedIds([]); }}
          className={`px-5 py-2.5 rounded-xl font-black text-sm transition-all ${activeTab === 'pending' ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          طلبات الانضمام 
          <span className="mr-2 inline-flex items-center justify-center bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-400 text-xs px-2 py-0.5 rounded-full">{students.filter(s => s.status === 'pending_review').length}</span>
        </button>
        <button 
          onClick={() => { setActiveTab('active'); setSelectedIds([]); }}
          className={`px-5 py-2.5 rounded-xl font-black text-sm transition-all ${activeTab === 'active' ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          المقيدين بالفعل
          <span className="mr-2 inline-flex items-center justify-center bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400 text-xs px-2 py-0.5 rounded-full">{students.filter(s => s.status === 'active').length}</span>
        </button>
        <button 
          onClick={() => { setActiveTab('banned'); setSelectedIds([]); }}
          className={`px-5 py-2.5 rounded-xl font-black text-sm transition-all ${activeTab === 'banned' ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          المحظورين أمنياً
          <span className="mr-2 inline-flex items-center justify-center bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400 text-xs px-2 py-0.5 rounded-full">{students.filter(s => s.status === 'banned').length}</span>
        </button>
      </div>

      {/* Content Area */}
      <div>
        {isLoading ? (
          <div className="text-center py-20">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-violet-600" />
            <p className="mt-2 text-sm font-bold text-slate-400">جاري تحميل بيانات الطلاب...</p>
          </div>
        ) : activeTab === 'pending' ? (
          <div className="space-y-4">
            {/* Bulk Actions Header */}
            {selectedIds.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800/60 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4"
              >
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-violet-600 text-white flex items-center justify-center text-xs font-black">
                    {selectedIds.length}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">طالب تم تحديدهم</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => handleAction(selectedIds, 'accept')} className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors">
                    موافقة جماعية
                  </button>
                  <button onClick={() => handleAction(selectedIds, 'accept_otp')} className="px-3 py-1.5 bg-violet-600 text-white rounded-xl text-xs font-bold hover:bg-violet-700 transition-colors">
                    تأكيد برقم سري موحد
                  </button>
                  <button onClick={() => handleAction(selectedIds, 'reject')} className="px-3 py-1.5 bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 rounded-xl text-xs font-bold hover:bg-rose-200 transition-colors">
                    رفض المحدد
                  </button>
                  <button onClick={() => confirmDeleteBulk(selectedIds)} className="px-3 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-colors flex items-center gap-1">
                    <Trash2 className="w-3.5 h-3.5" /> حذف وفك قيد
                  </button>
                </div>
              </motion.div>
            )}

            {/* Select All Row */}
            <div className="flex items-center px-4 py-2">
              <input 
                type="checkbox" 
                checked={selectedIds.length === pendingStudents.length && pendingStudents.length > 0}
                onChange={() => selectAll(pendingStudents)}
                className="w-5 h-5 rounded-md border-slate-300 text-violet-600 focus:ring-violet-500"
              />
              <span className="mr-3 font-bold text-slate-500 text-sm">تحديد الكل</span>
            </div>

            <div className="space-y-4">
              {pendingStudents.length > 0 ? (
                pendingStudents.map(student => renderPendingCard(student))
              ) : (
                <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
                  <UserCheck className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-black text-slate-500 dark:text-slate-400">لا توجد طلبات انضمام جديدة!</h3>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'active' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {activeStudents.length > 0 ? (
              activeStudents.map(student => renderActiveCard(student))
            ) : (
              <div className="col-span-full text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
                <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-black text-slate-500 dark:text-slate-400">لا يوجد طلاب مقيدين يطابقون بحثك!</h3>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {bannedStudents.length > 0 ? (
              bannedStudents.map(student => renderBannedCard(student))
            ) : (
              <div className="col-span-full text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
                <ShieldBan className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-black text-slate-500 dark:text-slate-400">سجل الطلاب المحظورين فارغ حالياً!</h3>
                <p className="text-xs text-slate-400 font-bold mt-1">عند حظر أي طالب أو إيقاف حسابه سيظهر هنا مع إمكانية فك الحظر في أي وقت.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Master Key Modal with Human Verification Captcha */}
      <AnimatePresence>
        {showMasterKeyModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" dir="rtl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 relative"
            >
              <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 rounded-2xl flex items-center justify-center mb-4 mx-auto">
                <Lock className="w-8 h-8 text-rose-600 dark:text-rose-400" />
              </div>
              <h2 className="text-2xl font-black text-center text-slate-900 dark:text-white mb-2">كلمة المرور الأمنية (Master Key)</h2>
              <p className="text-center text-slate-500 dark:text-slate-400 text-xs font-bold mb-6">
                أدخل المفتاح السري المعتمد واجتز اختبار كتابة الرقم للتأكد من هوية المعلم وحماية خصوصية الطلاب.
              </p>
              
              <form onSubmit={handleUnlockMasterKey} className="space-y-4">
                {masterKeyError && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-600 text-xs font-bold text-center">
                    {masterKeyError}
                  </div>
                )}
                
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">المفتاح السري للمعلم:</label>
                  <input 
                    type="password" 
                    value={masterKey}
                    onChange={(e) => {
                      setMasterKey(e.target.value);
                      if (masterKeyError) setMasterKeyError('');
                    }}
                    placeholder="sse-000-#######-****&mr+pp"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-center font-mono font-bold focus:ring-2 focus:ring-rose-500 outline-none transition-all text-sm"
                    dir="ltr"
                    autoFocus
                  />
                </div>

                {/* Captcha Box */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">اختبار التحقق البشري (اكتب الرقم كما تراه):</label>
                  <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400">الرمز:</span>
                      <span className="px-4 py-1.5 bg-slate-950 text-emerald-400 font-mono text-xl tracking-[6px] font-black rounded-xl select-none border border-emerald-500/30">
                        {captchaCode}
                      </span>
                    </div>
                    <button 
                      type="button" 
                      onClick={refreshCaptcha}
                      className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                      title="توليد رقم جديد"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                  <input 
                    type="text" 
                    maxLength={4}
                    value={enteredCaptcha}
                    onChange={(e) => {
                      setEnteredCaptcha(e.target.value);
                      if (masterKeyError) setMasterKeyError('');
                    }}
                    placeholder="اكتب الأرقام الأربعة هنا..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-center tracking-widest font-black focus:ring-2 focus:ring-rose-500 outline-none transition-all text-sm font-mono"
                    dir="ltr"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="submit" className="flex-1 bg-rose-600 text-white font-black py-3 rounded-2xl hover:bg-rose-700 transition-colors shadow-md shadow-rose-600/20">
                    كشف البيانات
                  </button>
                  <button type="button" onClick={() => setShowMasterKeyModal(false)} className="px-6 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Quick Direct Message Modal */}
        {messageTargetStudent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" dir="rtl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 flex items-center justify-center font-black">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-white text-base">
                      مراسلة الطالب: {messageTargetStudent.fullName}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">إرسال رسالة مباشرة إلى صندوق الرسائل الواردة للطالب</p>
                  </div>
                </div>
                <button 
                  onClick={() => setMessageTargetStudent(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {messageSentSuccess ? (
                <div className="py-10 text-center space-y-3">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="font-black text-slate-900 dark:text-white text-base">تم إرسال الرسالة بنجاح!</h4>
                  <p className="text-xs text-slate-400">سيتمكن الطالب من قراءتها والرد عليها مباشرة.</p>
                </div>
              ) : (
                <form onSubmit={handleSendMessage} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">عنوان الرسالة:</label>
                    <input 
                      type="text" 
                      required
                      value={messageTitle}
                      onChange={(e) => setMessageTitle(e.target.value)}
                      placeholder="مثال: تنبيه بخصوص موعد الواجب أو التوجيه..."
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">نص الرسالة:</label>
                    <textarea 
                      required
                      rows={4}
                      value={messageContent}
                      onChange={(e) => setMessageContent(e.target.value)}
                      placeholder="اكتب رسالتك وتوجيهك للطالب هنا..."
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <a
                      href={`https://wa.me/20${messageTargetStudent.phone.replace(/^0/, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2.5 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 hover:bg-emerald-100 rounded-xl font-bold text-xs flex items-center gap-2 transition-colors"
                    >
                      <Phone className="w-4 h-4" /> مراسلة على واتساب
                    </a>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setMessageTargetStudent(null)}
                        className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs"
                      >
                        إلغاء
                      </button>
                      <button
                        type="submit"
                        disabled={isSendingMessage}
                        className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md shadow-violet-600/20 disabled:opacity-50"
                      >
                        {isSendingMessage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        إرسال الرسالة
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}

        {/* Academic Details & Advice Modal */}
        {detailsTargetStudent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto" dir="rtl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 w-full max-w-3xl shadow-2xl border border-slate-200 dark:border-slate-800 my-8 max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setPreviewPhotoStudent(detailsTargetStudent)}
                    title="انقر لتكبير صورة هوية الطالب"
                    className="group relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-500 rounded-2xl shrink-0"
                  >
                    <Image 
                      width={56} 
                      height={56} 
                      src={detailsTargetStudent.avatarUrl || 'https://i.pravatar.cc/150'} 
                      alt={detailsTargetStudent.fullName} 
                      unoptimized
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-violet-100 dark:border-violet-900/40 group-hover:scale-105 transition-transform" 
                      referrerPolicy="no-referrer"
                    />
                    <span className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[9px] font-bold transition-opacity">
                      تكبير
                    </span>
                  </button>
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-white text-lg flex items-center gap-2">
                      {detailsTargetStudent.fullName}
                      <span className="px-2 py-0.5 text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 rounded-full font-bold">
                        طالب مقيد
                      </span>
                    </h3>
                    <div className="flex flex-wrap gap-2 text-xs font-bold text-slate-400 mt-1">
                      <span>{detailsTargetStudent.stage === 'middle' ? 'إعدادي' : 'ثانوي'}</span>
                      <span>• الصف {detailsTargetStudent.grade}</span>
                      <span>• {detailsTargetStudent.educationType === 'general' ? 'عام' : 'أزهر'}</span>
                      <span>• الهاتف: {detailsTargetStudent.phone}</span>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setDetailsTargetStudent(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Advice Input Section */}
              <div className="mb-6 p-5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 space-y-3">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400 font-black text-sm">
                  <Sparkles className="w-4 h-4" /> توجيه نصيحة أكاديمية خاصة للطالب
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  اكتب توصياتك أو ملاحظاتك التوجيهية لتصل إلى شاشة الطالب فوراً مع تنبيهه بنقاط الضعف المطلوب معالجتها:
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={adviceText}
                    onChange={(e) => setAdviceText(e.target.value)}
                    placeholder="مثال: أحسنت في قواعد الوحدة الأولى، يُرجى إعادة مراجعة فيديو الكلمات وحل الاختبار الجزئي..."
                    className="flex-1 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/60 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    onClick={handleSendAdvice}
                    disabled={sendingAdvice || !adviceText.trim()}
                    className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-600/20 disabled:opacity-50 transition-colors shrink-0"
                  >
                    {sendingAdvice ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    إرسال النصيحة
                  </button>
                </div>
                {adviceSuccess && (
                  <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> تم إرسال النصيحة إلى صندوق رسائل الطالب بنجاح!
                  </p>
                )}
              </div>

              {/* Academic Courses & Progress */}
              <div className="space-y-4">
                <h4 className="font-black text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <Award className="w-5 h-5 text-violet-600" /> الكورسات المشترك بها وسجل الدرجات
                </h4>

                {loadingAcademic ? (
                  <div className="py-12 text-center text-slate-400 font-bold text-xs">جاري جلب السجل الأكاديمي للطالب...</div>
                ) : studentCourses.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-400 text-xs font-bold">
                    لم يقم هذا الطالب بالاشتراك في أي كورس بعد.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {studentCourses.map(course => {
                      const progMap = studentProgressMap[course.id] || {};
                      const progressList = Object.values(progMap);
                      const completedCount = progressList.filter(p => p.isPassed).length;
                      
                      return (
                        <div key={course.id} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                          <div className="flex items-center justify-between">
                            <h5 className="font-black text-slate-900 dark:text-white text-sm flex items-center gap-2">
                              <BookOpen className="w-4 h-4 text-violet-500" /> {course.title}
                            </h5>
                            <span className="text-xs font-bold text-violet-600 dark:text-violet-400">
                              {completedCount} عناصر مجتازة بنجاح
                            </span>
                          </div>

                          {/* Items breakdown */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                            {progressList.map(prog => (
                              <div key={prog.id} className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                                <div>
                                  <span className="font-bold text-slate-800 dark:text-slate-200 block truncate max-w-[180px]">
                                    عنصر تعليمي: {prog.itemId.slice(0, 8)}
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    المحاولات: {prog.attemptsCount} • الدرجة: {prog.highestScore}%
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${prog.isPassed ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'}`}>
                                    {prog.isPassed ? 'ناجح' : 'إعادة'}
                                  </span>
                                  {/* Grant extra attempt (+1) */}
                                  <button
                                    onClick={() => handleGrantExtraAttempt(course.id, prog.itemId)}
                                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors"
                                    title="منح محاولة إضافية واحدة (+1)"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                  {/* Full reset (0) */}
                                  <button
                                    onClick={() => handleResetItemProgress(course.id, prog.itemId)}
                                    className="p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition-colors"
                                    title="تصفير شامل لكافة المحاولات والدرجات (0 محاولات)"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Close Button */}
              <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  onClick={() => setDetailsTargetStudent(null)}
                  className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs hover:bg-slate-200 transition-colors"
                >
                  إغلاق
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Ban Reason Confirmation Modal with Strict Policies & Consequences Warning */}
        {banTargetStudent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md" dir="rtl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-2xl border border-rose-200 dark:border-rose-900/50 max-h-[90vh] overflow-y-auto"
            >
              <div className="w-16 h-16 bg-rose-100 dark:bg-rose-950/60 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-rose-200 dark:border-rose-800/50 shadow-inner">
                <ShieldBan className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-center text-slate-900 dark:text-white mb-2">
                تأكيد حظر الطالب وإغلاق حسابه نهائياً
              </h3>
              <p className="text-center text-xs text-slate-500 dark:text-slate-400 font-semibold mb-5">
                أنت على وشك حظر وإيقاف حساب الطالب: <strong className="text-rose-600 font-black text-sm">{banTargetStudent.fullName}</strong>
              </p>

              {/* Security & Consequence Warnings */}
              <div className="bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-2xl p-4 mb-5 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-black text-rose-700 dark:text-rose-400 text-sm">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  سياسات وعواقب الحظر النهائي (Hardware Lockdown):
                </div>
                <ul className="list-disc list-inside space-y-1.5 font-bold text-slate-700 dark:text-slate-300 leading-relaxed pr-1">
                  <li>سيتم إيقاف دخول الطالب فوراً إلى لوحة تحكم الطلاب وجميع الكورسات.</li>
                  <li>لن يتمكن الطالب من استعادة أو فتح أي كورس حتى وإن كان مدفوعاً.</li>
                  <li>سيتم <strong className="text-rose-600">حظر بصمات أجهزة الطالب نهائياً</strong> في قاعدة البيانات، ولن يتمكن من إنشاء حساب جديد من نفس الأجهزة.</li>
                  <li>لا يمكن للطالب تخطي هذا الحظر برمجياً أو عبر إعادة التسجيل إلا بفك الحظر يدويًا من قبل المعلم.</li>
                </ul>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    سبب الحظر والإيقاف (إلزامي للتوثيق في سجل النشاط):
                  </label>
                  <textarea
                    rows={3}
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    placeholder="اكتب سبب الحظر هنا (مثال: مخالفة ضوابط المشاهدة، محاولة تسريب أو سوء سلوك)..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500 text-slate-900 dark:text-white resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={executeBan}
                    disabled={isSubmittingBan}
                    className="flex-1 py-3.5 bg-rose-600 hover:bg-rose-700 active:scale-[0.99] text-white font-black rounded-2xl transition-all text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-600/25 disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmittingBan ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        جاري تنفيذ الحظر وتأمين النظام...
                      </>
                    ) : (
                      <>
                        <ShieldBan className="w-4 h-4" />
                        تأكيد الحظر النهائي وإغلاق الحساب
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setBanTargetStudent(null)}
                    disabled={isSubmittingBan}
                    className="px-6 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-xs sm:text-sm cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm" dir="rtl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl"
            >
              <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-5">
                <Trash2 className="w-7 h-7" />
              </div>

              <h3 className="text-xl font-black text-center text-slate-900 dark:text-white mb-2">
                تأكيد حذف الطالب وفك قيد جهازه
              </h3>

              <p className="text-sm font-semibold text-center text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                {deleteTarget.type === 'single' ? (
                  <>
                    هل أنت متأكد من رغبتك في حذف الطالب <span className="font-black text-rose-600 dark:text-rose-400">({deleteTarget.name})</span> نهائياً؟
                    <br />
                    <span className="text-xs text-slate-500 mt-2 block">
                      سيتم مسح حسابه وسجلاته وفك قيد جهازه ليتمكن من التسجيل مجدداً إذا رغب.
                    </span>
                  </>
                ) : (
                  <>
                    هل أنت متأكد من حذف <span className="font-black text-rose-600 dark:text-rose-400">{deleteTarget.ids.length} طلاب</span> نهائياً؟
                    <br />
                    <span className="text-xs text-slate-500 mt-2 block">
                      سيتم فك قيد جميع أجهزتهم المسجلة والسماح لهم بالتسجيل من جديد.
                    </span>
                  </>
                )}
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={executeDelete}
                  disabled={isDeleting}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-black py-3 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      جاري الحذف وفك القيد...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      تأكيد الحذف وفك القيد
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => !isDeleting && setDeleteTarget(null)}
                  disabled={isDeleting}
                  className="px-6 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {/* Full Image Preview Modal */}
        {previewPhotoStudent && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl overflow-hidden relative text-center"
            >
              <button
                type="button"
                onClick={() => setPreviewPhotoStudent(null)}
                className="absolute top-4 left-4 p-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-base font-black text-slate-900 dark:text-white mb-1">
                صورة هوية الطالب
              </h3>
              <p className="text-xs font-bold text-slate-500 mb-4">
                {previewPhotoStudent.fullName} • {previewPhotoStudent.phone}
              </p>

              <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border-2 border-violet-200 dark:border-violet-900/50 shadow-inner flex items-center justify-center mb-5">
                <Image
                  src={previewPhotoStudent.avatarUrl || 'https://i.pravatar.cc/300'}
                  alt={previewPhotoStudent.fullName}
                  fill
                  unoptimized
                  className="object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 mb-4">
                <span>المرحلة: {previewPhotoStudent.stage === 'middle' ? 'الإعدادية' : 'الثانوية'} - الصف {previewPhotoStudent.grade}</span>
                <span>نوع التعليم: {previewPhotoStudent.educationType === 'general' ? 'عام' : 'أزهر'}</span>
              </div>

              <button
                type="button"
                onClick={() => setPreviewPhotoStudent(null)}
                className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-black transition-colors shadow-md shadow-violet-600/20"
              >
                إغلاق المعاينة
              </button>
            </motion.div>
          </div>
        )}

      </AnimatePresence>

    </div>
  );
}
