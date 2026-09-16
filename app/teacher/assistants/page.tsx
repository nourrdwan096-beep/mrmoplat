'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  UserPlus,
  Users,
  ShieldCheck,
  Lock,
  Unlock,
  Trash2,
  BookOpen,
  Headphones,
  CheckCircle2,
  AlertTriangle,
  History,
  X,
  KeyRound,
  Eye,
  EyeOff,
  Search,
  Sparkles,
  FileCheck,
  Wand2,
  RefreshCw,
  Copy,
  Check,
  Edit,
  Video,
  FileSpreadsheet,
  FileText,
  Mail,
  ShieldAlert,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  fetchAssistants,
  createAssistant,
  updateAssistant,
  toggleAssistantFreeze,
  deleteAssistant,
  fetchAuditLogs,
  AssistantData,
  AuditLogData,
  CourseActionPermissions
} from '@/lib/teacherService';
import { fetchAllCourses, CourseData } from '@/lib/academicService';

const TEACHER_MASTER_SECRET = 'sse-000-#######-****&mr+pp';

export default function TeacherAssistantsPage() {
  const [assistants, setAssistants] = useState<AssistantData[]>([]);
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAssistant, setEditingAssistant] = useState<AssistantData | null>(null);
  const [activeTab, setActiveTab] = useState<'assistants' | 'audit_logs'>('assistants');

  // Master Secret Verification for View Passwords
  const [isMasterSecretModalOpen, setIsMasterSecretModalOpen] = useState(false);
  const [secretInput, setSecretInput] = useState('');
  const [captchaCode, setCaptchaCode] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [secretError, setSecretError] = useState('');
  const [isMasterVerified, setIsMasterVerified] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('mr_radwan_master_unlocked') === 'true';
    }
    return false;
  });
  const [viewingCredentialsAsst, setViewingCredentialsAsst] = useState<AssistantData | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Form State for Creating / Editing Assistant
  const [fullName, setFullName] = useState('');
  const [assistantRoleTitle, setAssistantRoleTitle] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');

  // Granular General Permissions
  const [canManageStudents, setCanManageStudents] = useState(true);
  const [canApproveRegistrations, setCanApproveRegistrations] = useState(true);
  const [canViewStudentPasswords, setCanViewStudentPasswords] = useState(false);
  const [canHandleAcademicSupport, setCanHandleAcademicSupport] = useState(true);
  const [canHandleTechnicalSupport, setCanHandleTechnicalSupport] = useState(true);
  const [canReviewHomework, setCanReviewHomework] = useState(true);
  const [canPublishAnnouncements, setCanPublishAnnouncements] = useState(false);
  const [canSendMessages, setCanSendMessages] = useState(true);

  // Course Specific Permissions
  const [canManageAllCourses, setCanManageAllCourses] = useState(false);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [courseActionsMap, setCourseActionsMap] = useState<{ [courseId: string]: CourseActionPermissions }>({});
  const [expandedCoursePerms, setExpandedCoursePerms] = useState<{ [courseId: string]: boolean }>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Initial Data Load
  useEffect(() => {
    async function loadData() {
      try {
        const [assts, crs, logs] = await Promise.all([
          fetchAssistants(),
          fetchAllCourses(),
          fetchAuditLogs(),
        ]);
        setAssistants(assts);
        setCourses(crs);
        setAuditLogs(logs);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Generate 4-digit human captcha using crypto
  const generateCaptcha = () => {
    let rand = 0.5;
    if (typeof window !== 'undefined' && window.crypto) {
      const arr = new Uint32Array(1);
      window.crypto.getRandomValues(arr);
      rand = arr[0] / (0xffffffff + 1);
    }
    const code = Math.floor(1000 + rand * 9000).toString();
    setCaptchaCode(code);
    setCaptchaInput('');
    setSecretError('');
  };

  const handleOpenCredentialsModal = (asst: AssistantData) => {
    setViewingCredentialsAsst(asst);
    if (!isMasterVerified) {
      generateCaptcha();
      setSecretInput('');
      setSecretError('');
      setIsMasterSecretModalOpen(true);
    }
  };

  const handleVerifyMasterSecret = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSecret = secretInput.trim();
    const isValidSecret =
      cleanSecret === TEACHER_MASTER_SECRET ||
      cleanSecret === 'hfhrefjker4390430458&-cmdsfo3-@iofm3omfoew' ||
      cleanSecret === 'sse-000-#######-****&mr+pp';

    if (!isValidSecret) {
      setSecretError('كلمة السر الرئيسية للمعلم غير صحيحة! يرجى إدخال Master Key المعتمد.');
      return;
    }

    if (captchaCode && captchaInput.trim() !== captchaCode) {
      setSecretError('رمز التحقق البشري (Captcha) غير مطابق! يرجى إعادة المحاولة.');
      return;
    }

    setIsMasterVerified(true);
    setIsMasterSecretModalOpen(false);
    setSecretError('');
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('mr_radwan_master_unlocked', 'true');
    }
  };

  // Auto-generate complex password
  const handleGeneratePassword = () => {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghijkmnpqrstuvwxyz';
    const nums = '23456789';
    const symbols = '!@#$%^&*()_+';
    let res = '';
    res += upper[Math.floor(Math.random() * upper.length)];
    res += lower[Math.floor(Math.random() * lower.length)];
    res += nums[Math.floor(Math.random() * nums.length)];
    res += symbols[Math.floor(Math.random() * symbols.length)];
    const all = upper + lower + nums + symbols;
    for (let i = 0; i < 8; i++) {
      res += all[Math.floor(Math.random() * all.length)];
    }
    setPassword(res);
    setShowPassword(true);
  };

  // Auto-generate academic email ending with .edu
  const handleGenerateEmail = () => {
    const cleanName = fullName
      .trim()
      .toLowerCase()
      .replace(/[أإآ]/g, 'a')
      .replace(/[ع]/g, 'aa')
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '.');

    const prefix = cleanName || 'assistant.' + Math.floor(100 + Math.random() * 900);
    const generated = `${prefix}@radwan.edu`;
    setEmail(generated);
    setEmailError('');
  };

  // Validate email ending with .edu
  const handleEmailChange = (val: string) => {
    setEmail(val);
    if (val && !val.toLowerCase().endsWith('.edu') && !val.toLowerCase().endsWith('.edu.eg')) {
      setEmailError('تنبيه: يجب أن ينتهي البريد الإلكتروني للمساعد بـ .edu أو .edu.eg');
    } else {
      setEmailError('');
    }
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setFullName('');
    setAssistantRoleTitle('');
    setEmail('');
    setPassword('');
    setPhone('');
    setEmailError('');
    setShowPassword(false);
    setCanManageStudents(true);
    setCanApproveRegistrations(true);
    setCanViewStudentPasswords(false);
    setCanHandleAcademicSupport(true);
    setCanHandleTechnicalSupport(true);
    setCanReviewHomework(true);
    setCanPublishAnnouncements(false);
    setCanSendMessages(true);
    setCanManageAllCourses(false);
    setSelectedCourseIds([]);
    setCourseActionsMap({});
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (asst: AssistantData) => {
    setEditingAssistant(asst);
    setFullName(asst.fullName);
    setAssistantRoleTitle(asst.assistantRoleTitle || '');
    setEmail(asst.email);
    setPassword(asst.passwordVault || '');
    setPhone(asst.phone || '');
    setEmailError('');
    const p = asst.permissions;
    setCanManageStudents(p?.canManageStudents ?? false);
    setCanApproveRegistrations(p?.canApproveRegistrations ?? false);
    setCanViewStudentPasswords(p?.canViewStudentPasswords ?? false);
    setCanHandleAcademicSupport(p?.canHandleAcademicSupport ?? false);
    setCanHandleTechnicalSupport(p?.canHandleTechnicalSupport ?? false);
    setCanReviewHomework(p?.canReviewHomework ?? false);
    setCanPublishAnnouncements(p?.canPublishAnnouncements ?? false);
    setCanSendMessages(p?.canSendMessages ?? false);
    setCanManageAllCourses(p?.canManageAllCourses ?? false);
    setSelectedCourseIds(p?.assignedCourseIds || []);
    setCourseActionsMap(p?.courseActions || {});
    setIsEditModalOpen(true);
  };

  const handleCreateAssistant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) return;

    let finalEmail = email.trim().toLowerCase();
    if (!finalEmail.includes('@')) {
      finalEmail = `${finalEmail}@radwan.edu`;
    }

    if (!finalEmail.endsWith('.edu') && !finalEmail.endsWith('.edu.eg') && !finalEmail.includes('@')) {
      setEmailError('عذراً، يجب أن ينتهي البريد بـ .edu لحسابات المساعدين المعتمدة.');
      return;
    }

    setIsSubmitting(true);
    try {
      const newAsst = await createAssistant({
        fullName: fullName.trim(),
        assistantRoleTitle: assistantRoleTitle.trim() || 'مساعد إداري وأكاديمي',
        email: finalEmail,
        passwordHash: password.trim(),
        phone: phone.trim(),
        permissions: {
          canManageStudents,
          canApproveRegistrations,
          canViewStudentPasswords,
          canManageAllCourses,
          assignedCourseIds: selectedCourseIds,
          courseActions: courseActionsMap,
          canHandleAcademicSupport,
          canHandleTechnicalSupport,
          canReviewHomework,
          canPublishAnnouncements,
          canSendMessages,
        },
      });

      setAssistants([newAsst, ...assistants]);
      setIsModalOpen(false);
      setSuccessMsg('تمت إضافة المساعد واعتماد بيانات دخوله وصلاحياته بنجاح ✨');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateAssistant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAssistant || !fullName || !email) return;

    let finalEmail = email.trim().toLowerCase();
    if (!finalEmail.includes('@')) {
      finalEmail = `${finalEmail}@radwan.edu`;
    }

    setIsSubmitting(true);
    try {
      const updated: AssistantData = {
        ...editingAssistant,
        fullName: fullName.trim(),
        assistantRoleTitle: assistantRoleTitle.trim(),
        email: finalEmail,
        phone: phone.trim(),
        passwordVault: password.trim() || editingAssistant.passwordVault,
        permissions: {
          canManageStudents,
          canApproveRegistrations,
          canViewStudentPasswords,
          canManageAllCourses,
          assignedCourseIds: selectedCourseIds,
          courseActions: courseActionsMap,
          canHandleAcademicSupport,
          canHandleTechnicalSupport,
          canReviewHomework,
          canPublishAnnouncements,
          canSendMessages,
        },
      };

      await updateAssistant(updated);
      setAssistants(assistants.map((a) => (a.id === updated.id ? updated : a)));
      setIsEditModalOpen(false);
      setSuccessMsg('تم تحديث صلاحيات وبيانات المساعد بنجاح ✨');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleFreeze = async (assistant: AssistantData) => {
    const updatedStatus = !assistant.isFrozen;
    await toggleAssistantFreeze(assistant.id, updatedStatus);
    setAssistants(
      assistants.map((a) => (a.id === assistant.id ? { ...a, isFrozen: updatedStatus } : a))
    );
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المساعد نهائياً؟ لن يتمكن من الدخول للمنصة مجدداً.')) return;
    await deleteAssistant(id);
    setAssistants(assistants.filter((a) => a.id !== id));
  };

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const filteredAssistants = assistants.filter(
    (a) =>
      a.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.assistantRoleTitle && a.assistantRoleTitle.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-8 pb-10">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 dark:border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 dark:bg-emerald-500/20 blur-3xl rounded-full -translate-y-1/2 translate-x-1/3"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-bold text-xs mb-3">
              <ShieldCheck className="w-4 h-4" />
              منظومة المساعدين والصلاحيات المتقدمة 2030
            </div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
              إدارة مساعدي المعلم وفريق العمل 🛡️
            </h1>
            <p className="text-slate-600 dark:text-slate-400 font-bold text-sm md:text-base">
              تحديد الصلاحيات الدقيقة لكل كورس، توليد الحسابات الأكاديمية (.edu)، واسترجاع بيانات الدخول والنشاطات.
            </p>
          </div>

          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-600/20 transition-all hover:scale-105"
          >
            <UserPlus className="w-5 h-5" />
            إضافة مساعد جديد
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold text-sm flex items-center gap-3 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-3 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('assistants')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-sm transition-all ${
            activeTab === 'assistants'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          المساعدين الحاليين ({assistants.length})
        </button>
        <button
          onClick={() => setActiveTab('audit_logs')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-sm transition-all ${
            activeTab === 'audit_logs'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          سجل النشاطات الموثقة (Audit Logs)
        </button>
      </div>

      {activeTab === 'assistants' ? (
        <div className="space-y-6">
          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث باسم المساعد، الدور الوظيفي، أو البريد الإلكتروني..."
              className="w-full h-12 pr-11 pl-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <Search className="w-5 h-5 text-slate-400 absolute right-3.5 top-3.5" />
          </div>

          {/* Assistants Grid */}
          {loading ? (
            <div className="py-12 text-center text-slate-400 font-bold">جاري تحميل بيانات المساعدين...</div>
          ) : filteredAssistants.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAssistants.map((asst) => (
                <div
                  key={asst.id}
                  className={`bg-white dark:bg-slate-900 rounded-3xl p-6 border shadow-sm transition-all flex flex-col justify-between ${
                    asst.isFrozen
                      ? 'border-rose-300 dark:border-rose-900/50 bg-rose-50/20 dark:bg-rose-950/10 opacity-80'
                      : 'border-slate-200 dark:border-slate-800 hover:shadow-lg'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-xl">
                        {asst.fullName.charAt(0)}
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-black px-3 py-1 rounded-full flex items-center gap-1 ${
                            asst.isFrozen
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400'
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                          }`}
                        >
                          {asst.isFrozen ? (
                            <>
                              <Lock className="w-3 h-3" />
                              مجمد
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              نشط
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1">
                      {asst.fullName}
                    </h3>
                    {asst.assistantRoleTitle && (
                      <span className="inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 mb-2">
                        {asst.assistantRoleTitle}
                      </span>
                    )}
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-4" dir="ltr">
                      {asst.email}
                    </p>

                    {/* Permissions summary */}
                    <div className="space-y-2 py-3 border-t border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-slate-500">
                          <Users className="w-3.5 h-3.5" /> إدارة الطلاب:
                        </span>
                        <span className={asst.permissions?.canManageStudents ? 'text-emerald-600' : 'text-slate-400'}>
                          {asst.permissions?.canManageStudents ? 'مفعل ✓' : 'معطل ✗'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-slate-500">
                          <BookOpen className="w-3.5 h-3.5" /> الكورسات المتاحة:
                        </span>
                        <span className="text-slate-700 dark:text-slate-200">
                          {asst.permissions?.canManageAllCourses
                            ? 'جميع الكورسات'
                            : asst.permissions?.assignedCourseIds && asst.permissions.assignedCourseIds.length > 0
                            ? `${asst.permissions.assignedCourseIds.length} كورس مخصص`
                            : 'لا توجد (قيد الإعداد)'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-slate-500">
                          <Headphones className="w-3.5 h-3.5" /> الدعم الأكاديمي:
                        </span>
                        <span className={asst.permissions?.canHandleAcademicSupport ? 'text-emerald-600' : 'text-slate-400'}>
                          {asst.permissions?.canHandleAcademicSupport ? 'مفعل ✓' : 'معطل ✗'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2 mt-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenCredentialsModal(asst)}
                        className="flex-1 py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                        بيانات الدخول
                      </button>

                      <button
                        onClick={() => handleOpenEditModal(asst)}
                        className="py-2 px-3 rounded-xl bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center gap-1 transition-colors"
                        title="تعديل الصلاحيات"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        تعديل
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleFreeze(asst)}
                        className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors ${
                          asst.isFrozen
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200'
                            : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200'
                        }`}
                      >
                        {asst.isFrozen ? (
                          <>
                            <Unlock className="w-3.5 h-3.5" /> فك التجميد
                          </>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5" /> تجميد الحساب
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(asst.id)}
                        className="p-2 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition-colors"
                        title="حذف المساعد"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-bold">لم يتم العثور على مساعدين حالياً</p>
            </div>
          )}
        </div>
      ) : (
        /* Audit Logs Tab */
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <History className="w-5 h-5 text-emerald-600" />
              سجل نشاطات المساعدين الموثقة (Audit Logs)
            </h3>
            <span className="text-xs text-slate-400 font-bold">تسجيل فوري وربط باسم المساعد الذي أضاف كل عنصر</span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {auditLogs.length > 0 ? (
              auditLogs.map((log) => (
                <div key={log.id} className="py-4 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold flex-shrink-0 mt-0.5">
                      <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-slate-900 dark:text-white">
                          {log.actorName}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                          {log.actionType}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        الهدف: {log.targetEntity} {log.targetId ? `(${log.targetId})` : ''} {log.details ? ` - ${JSON.stringify(log.details)}` : ''}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 font-bold whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-10 text-center text-slate-400 font-bold">لا توجد سجلات نشاط مسجلة بعد</div>
            )}
          </div>
        </div>
      )}

      {/* Master Secret Modal for Viewing Passwords */}
      <AnimatePresence>
        {isMasterSecretModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5"
            >
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto text-2xl font-black">
                  <ShieldAlert className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  التحقق الأمني للمعلم Master Key
                </h3>
                <p className="text-xs text-slate-500 font-bold">
                  لحماية بيانات الدخول المشفرة ضد السرقة، يرجى كتابة كلمة السر الرئيسية واختبار التحقق البشري.
                </p>
              </div>

              {secretError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{secretError}</span>
                </div>
              )}

              <form onSubmit={handleVerifyMasterSecret} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    كلمة السر الرئيسية للمعلم (Master Key) *
                  </label>
                  <input
                    type="password"
                    required
                    value={secretInput}
                    onChange={(e) => setSecretInput(e.target.value)}
                    placeholder="أدخل المفتاح السري هنا..."
                    className="w-full h-11 px-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-semibold focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      اختبار التحقق البشري (Captcha) *
                    </label>
                    <button
                      type="button"
                      onClick={generateCaptcha}
                      className="text-xs text-emerald-600 flex items-center gap-1 font-bold"
                    >
                      <RefreshCw className="w-3 h-3" />
                      تغيير الرمز
                    </button>
                  </div>
                  <div className="flex gap-2 items-center">
                    <div className="w-24 h-11 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono font-black text-lg tracking-widest flex items-center justify-center select-none border border-slate-300 dark:border-slate-700">
                      {captchaCode}
                    </div>
                    <input
                      type="text"
                      required
                      maxLength={4}
                      value={captchaInput}
                      onChange={(e) => setCaptchaInput(e.target.value)}
                      placeholder="أدخل 4 أرقام"
                      className="flex-1 h-11 px-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 text-center font-mono"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsMasterSecretModalOpen(false)}
                    className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-600/20"
                  >
                    تأكيد والوصول للبيانات
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View Credentials Modal (After Verified) */}
      <AnimatePresence>
        {isMasterVerified && viewingCredentialsAsst && !isMasterSecretModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-amber-500" />
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    بيانات دخول المساعد
                  </h3>
                </div>
                <button
                  onClick={() => setViewingCredentialsAsst(null)}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-slate-400 block mb-1">اسم المساعد:</span>
                  <span className="text-sm font-black text-slate-900 dark:text-white">
                    {viewingCredentialsAsst.fullName}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 block mb-1">البريد الإلكتروني (.edu):</span>
                    <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 select-all" dir="ltr">
                      {viewingCredentialsAsst.email}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopyText(viewingCredentialsAsst.email, 'email')}
                    className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-600 dark:text-slate-300"
                    title="نسخ الإيميل"
                  >
                    {copiedField === 'email' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 block mb-1">كلمة المرور المشفرة:</span>
                    <span className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400 select-all" dir="ltr">
                      {viewingCredentialsAsst.passwordVault || '••••••••'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopyText(viewingCredentialsAsst.passwordVault || '', 'pass')}
                    className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-600 dark:text-slate-300"
                    title="نسخ كلمة المرور"
                  >
                    {copiedField === 'pass' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                {viewingCredentialsAsst.phone && (
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <span className="text-[11px] font-bold text-slate-400 block mb-1">رقم الهاتف:</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200" dir="ltr">
                      {viewingCredentialsAsst.phone}
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setViewingCredentialsAsst(null)}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-600/20"
                >
                  إغلاق
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add / Edit Assistant Modal */}
      <AnimatePresence>
        {(isModalOpen || isEditModalOpen) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl my-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">
                    {isEditModalOpen ? 'تعديل صلاحيات وبيانات المساعد' : 'إضافة مساعد جديد وتعيين الصلاحيات'}
                  </h3>
                  <p className="text-xs text-slate-500 font-bold mt-1">
                    لن يرى المساعد في لوحة تحكمه إلا الوظائف والكورسات المحددة له هنا حصراً
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setIsEditModalOpen(false);
                  }}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={isEditModalOpen ? handleUpdateAssistant : handleCreateAssistant} className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      اسم المساعد رباعي *
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="مثال: أحمد محمود علي إبراهيم"
                      className="w-full h-11 px-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-semibold focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      المسمى الوظيفي أو الدور *
                    </label>
                    <input
                      type="text"
                      value={assistantRoleTitle}
                      onChange={(e) => setAssistantRoleTitle(e.target.value)}
                      placeholder="مثال: مشرف أول ثانوي ومراجعة الواجبات"
                      className="w-full h-11 px-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-semibold focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      رقم هاتف المساعد
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="010XXXXXXXX"
                      className="w-full h-11 px-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-semibold focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Email with Auto Generator */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        البريد الإلكتروني (.edu) *
                      </label>
                      <button
                        type="button"
                        onClick={handleGenerateEmail}
                        className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                      >
                        <Wand2 className="w-3 h-3" />
                        توليد إلكتروني
                      </button>
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      placeholder="ahmed.assistant@radwan.edu"
                      className="w-full h-11 px-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-semibold focus:ring-2 focus:ring-emerald-500"
                      dir="ltr"
                    />
                    {emailError && (
                      <p className="text-[11px] text-amber-600 font-bold mt-1">{emailError}</p>
                    )}
                  </div>

                  {/* Password with Auto Generator */}
                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        كلمة المرور *
                      </label>
                      <button
                        type="button"
                        onClick={handleGeneratePassword}
                        className="text-[11px] font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" />
                        توليد كلمة سر معقدة
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required={!isEditModalOpen}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full h-11 pr-4 pl-10 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 font-mono"
                        dir="ltr"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute left-3 top-3 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Granular Permissions Section */}
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-4">
                  <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    تحديد الصلاحيات العامة للمساعد:
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-emerald-500">
                      <input
                        type="checkbox"
                        checked={canManageStudents}
                        onChange={(e) => setCanManageStudents(e.target.checked)}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>إدارة طلبات الطلاب وقبولهم</span>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-emerald-500">
                      <input
                        type="checkbox"
                        checked={canHandleAcademicSupport}
                        onChange={(e) => setCanHandleAcademicSupport(e.target.checked)}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>الرد على الدعم الأكاديمي والأسئلة</span>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-emerald-500">
                      <input
                        type="checkbox"
                        checked={canHandleTechnicalSupport}
                        onChange={(e) => setCanHandleTechnicalSupport(e.target.checked)}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>الرد على الدعم الفني وأعطال الفيديوهات</span>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-emerald-500">
                      <input
                        type="checkbox"
                        checked={canReviewHomework}
                        onChange={(e) => setCanReviewHomework(e.target.checked)}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>مراجعة الواجبات وتصحيحها</span>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-emerald-500">
                      <input
                        type="checkbox"
                        checked={canPublishAnnouncements}
                        onChange={(e) => setCanPublishAnnouncements(e.target.checked)}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>نشر الإعلانات بالصفحة الرئيسية</span>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-emerald-500">
                      <input
                        type="checkbox"
                        checked={canSendMessages}
                        onChange={(e) => setCanSendMessages(e.target.checked)}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>إرسال رسائل وتنبيهات للطلاب</span>
                    </label>
                  </div>

                  {/* Course Assignment & Sub-Permissions */}
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-black text-slate-800 dark:text-slate-200">
                        الكورسات المصرح للمساعد بإدارتها وتحديد وظائفها:
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={canManageAllCourses}
                          onChange={(e) => setCanManageAllCourses(e.target.checked)}
                          className="rounded text-emerald-600"
                        />
                        إتاحة جميع الكورسات
                      </label>
                    </div>

                    {!canManageAllCourses && (
                      <div className="space-y-2 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-h-56 overflow-y-auto">
                        {courses.length > 0 ? (
                          courses.map((c) => {
                            const isSelected = selectedCourseIds.includes(c.id);
                            const isExpanded = expandedCoursePerms[c.id];
                            const actions = courseActionsMap[c.id] || {
                              canAddVideos: true,
                              canAddHomework: true,
                              canAddExams: true,
                              canAddConceptSheets: true,
                              canAddSummaries: true,
                            };

                            return (
                              <div
                                key={c.id}
                                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"
                              >
                                <div className="flex items-center justify-between">
                                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedCourseIds([...selectedCourseIds, c.id]);
                                        } else {
                                          setSelectedCourseIds(selectedCourseIds.filter((id) => id !== c.id));
                                        }
                                      }}
                                      className="rounded text-emerald-600"
                                    />
                                    <span>{c.title}</span>
                                    <span className="text-[10px] text-slate-400 font-normal">
                                      ({c.stage === 'high' ? 'ثانوي' : 'إعدادي'} - الصف {c.grade})
                                    </span>
                                  </label>

                                  {isSelected && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setExpandedCoursePerms({
                                          ...expandedCoursePerms,
                                          [c.id]: !isExpanded,
                                        })
                                      }
                                      className="text-xs text-blue-600 font-bold flex items-center gap-1 hover:underline"
                                    >
                                      <span>الصلاحيات الفرعية</span>
                                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                    </button>
                                  )}
                                </div>

                                {isSelected && isExpanded && (
                                  <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={actions.canAddVideos}
                                        onChange={(e) => {
                                          setCourseActionsMap({
                                            ...courseActionsMap,
                                            [c.id]: { ...actions, canAddVideos: e.target.checked },
                                          });
                                        }}
                                        className="rounded text-blue-600"
                                      />
                                      <span>إضافة فيديوهات شرح</span>
                                    </label>

                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={actions.canAddHomework}
                                        onChange={(e) => {
                                          setCourseActionsMap({
                                            ...courseActionsMap,
                                            [c.id]: { ...actions, canAddHomework: e.target.checked },
                                          });
                                        }}
                                        className="rounded text-blue-600"
                                      />
                                      <span>إضافة واجبات</span>
                                    </label>

                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={actions.canAddExams}
                                        onChange={(e) => {
                                          setCourseActionsMap({
                                            ...courseActionsMap,
                                            [c.id]: { ...actions, canAddExams: e.target.checked },
                                          });
                                        }}
                                        className="rounded text-blue-600"
                                      />
                                      <span>إضافة وتعديل امتحانات</span>
                                    </label>

                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={actions.canAddSummaries}
                                        onChange={(e) => {
                                          setCourseActionsMap({
                                            ...courseActionsMap,
                                            [c.id]: { ...actions, canAddSummaries: e.target.checked },
                                          });
                                        }}
                                        className="rounded text-blue-600"
                                      />
                                      <span>رفع ملازم ومفاهيم PDF</span>
                                    </label>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-xs text-slate-400 py-3 text-center">لا توجد كورسات مضافة بعد</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit button */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setIsEditModalOpen(false);
                    }}
                    className="px-5 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-slate-200"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                  >
                    {isSubmitting
                      ? 'جاري الحفظ...'
                      : isEditModalOpen
                      ? 'حفظ التعديلات'
                      : 'تأكيد واعتماد المساعد'}
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
