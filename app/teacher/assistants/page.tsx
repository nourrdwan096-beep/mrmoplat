'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  Wand2,
  RefreshCw,
  Copy,
  Check,
  Edit,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  EyeClosed,
  Layers,
  GraduationCap,
  Bell,
  MessageSquare,
  FileCheck,
  SlidersHorizontal,
  Shield,
  Loader2,
} from 'lucide-react';
import {
  fetchAssistants,
  createAssistant,
  updateAssistant,
  toggleAssistantFreeze,
  deleteAssistant,
  revealAssistantCredential,
  fetchAssistantActivityLogs,
  AssistantData,
  AuditLogData,
} from '@/lib/teacherService';
import {
  AssistantPermissionsConfig,
  CourseGranularPermissions,
  StudentGranularPermissions,
  DEFAULT_COURSE_PERMISSIONS,
  FULL_COURSE_PERMISSIONS,
  DEFAULT_STUDENT_PERMISSIONS,
  FULL_STUDENT_PERMISSIONS,
  COURSE_PERMISSION_LABELS,
  STUDENT_PERMISSION_LABELS,
  ASSISTANT_PERMISSION_PRESETS,
  normalizeAssistantPermissions,
  normalizeCoursePermissions,
  isBlindQuestionAddOnly,
} from '@/lib/assistantPermissions';
import { fetchAllCourses, CourseData } from '@/lib/academicService';

const COURSE_GROUP_META: Array<{
  key: 'structure' | 'content' | 'questions' | 'operations';
  title: string;
  accent: string;
}> = [
  { key: 'structure', title: 'الهيكل والإعدادات', accent: 'text-violet-600 dark:text-violet-400' },
  { key: 'content', title: 'إضافة ونقل المحتوى', accent: 'text-emerald-600 dark:text-emerald-400' },
  { key: 'questions', title: 'بنك الأسئلة والتأمين', accent: 'text-amber-600 dark:text-amber-400' },
  { key: 'operations', title: 'طلاب الكورس والأكواد', accent: 'text-sky-600 dark:text-sky-400' },
];

const GLOBAL_MODULE_ITEMS: Array<{
  key:
    | 'canHandleAcademicSupport'
    | 'canHandleTechnicalSupport'
    | 'canReviewHomework'
    | 'canPublishAnnouncements'
    | 'canSendMessages';
  label: string;
  description: string;
}> = [
  {
    key: 'canHandleAcademicSupport',
    label: 'الرد على الدعم الأكاديمي والأسئلة العلمية',
    description: 'استلام والرد على استفسارات الطلاب العلمية داخل المنصة',
  },
  {
    key: 'canHandleTechnicalSupport',
    label: 'الرد على الدعم الفني وأعطال الفيديوهات',
    description: 'متابعة ومعالجة بلاغات التشغيل والأعطال التقنية للطلاب',
  },
  {
    key: 'canReviewHomework',
    label: 'مراجعة وتقييم الواجبات',
    description: 'الاطلاع على حلول الواجبات ورصد الملاحظات والتقييمات',
  },
  {
    key: 'canPublishAnnouncements',
    label: 'إدارة ونشر الإعلانات',
    description: 'إنشاء وتعديل وتثبيت وحذف الإعلانات ولوحة الشرف',
  },
  {
    key: 'canSendMessages',
    label: 'إرسال الرسائل والتنبيهات للطلاب',
    description: 'إرسال رسائل فردية أو إشعارات مباشرة للطلاب',
  },
];

function CourseGranularMatrix({
  value,
  onChange,
  title,
  subtitle,
  onCopyToAllSelected,
}: {
  value: CourseGranularPermissions;
  onChange: (next: CourseGranularPermissions) => void;
  title: string;
  subtitle?: string;
  onCopyToAllSelected?: () => void;
}) {
  const activeCount = Object.values(value).filter(Boolean).length;
  const isBlind = isBlindQuestionAddOnly(value);

  const toggleKey = (k: keyof CourseGranularPermissions, checked: boolean) => {
    const next = { ...value, [k]: checked };
    if (k === 'canViewQuestions' && !checked) {
      next.canEditQuestions = false;
      next.canDeleteQuestions = false;
    }
    if ((k === 'canEditQuestions' || k === 'canDeleteQuestions') && checked) {
      next.canViewQuestions = true;
    }
    onChange(normalizeCoursePermissions(next));
  };

  return (
    <div className="rounded-2xl bg-slate-50/90 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h5 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600" />
            <span>{title}</span>
            <span className="px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-black text-[10px] tabular-nums">
              {activeCount} / 17
            </span>
          </h5>
          {subtitle && (
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => onChange({ ...FULL_COURSE_PERMISSIONS })}
            className="px-2.5 py-1 rounded-lg bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 text-[11px] font-black transition-colors"
          >
            تحديد الكل
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...DEFAULT_COURSE_PERMISSIONS })}
            className="px-2.5 py-1 rounded-lg bg-slate-200/70 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-black transition-colors"
          >
            إلغاء الكل
          </button>
          {onCopyToAllSelected && (
            <button
              type="button"
              onClick={onCopyToAllSelected}
              className="px-2.5 py-1 rounded-lg bg-violet-600/10 hover:bg-violet-600/20 text-violet-700 dark:text-violet-300 text-[11px] font-black transition-colors flex items-center gap-1"
            >
              <Copy className="w-3 h-3" />
              تطبيق على كل المختارة
            </button>
          )}
        </div>
      </div>

      {isBlind && (
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300/70 dark:border-amber-800/70 flex items-start gap-2.5 text-[11px] font-bold text-amber-800 dark:text-amber-300">
          <EyeOff className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <div>
            <span className="font-black block">وضع الإضافة العمياء السري مفعّل (Blind Add-Only Mode)</span>
            يمكن للمساعد كتابة ورفع أسئلة جديدة فقط دون رؤية الأسئلة الموجودة أو تعديلها أو حذفها.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {COURSE_GROUP_META.map((group) => {
          const groupEntries = (
            Object.entries(COURSE_PERMISSION_LABELS) as Array<
              [keyof CourseGranularPermissions, (typeof COURSE_PERMISSION_LABELS)[keyof CourseGranularPermissions]]
            >
          ).filter(([, meta]) => meta.group === group.key);

          return (
            <div
              key={group.key}
              className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-3 space-y-2"
            >
              <div className={`text-[11px] font-black ${group.accent} pb-1 border-b border-slate-100 dark:border-slate-800`}>
                {group.title}
              </div>
              <div className="space-y-1.5">
                {groupEntries.map(([permKey, meta]) => {
                  const lockedByBlind =
                    !value.canViewQuestions &&
                    (permKey === 'canEditQuestions' || permKey === 'canDeleteQuestions');

                  return (
                    <label
                      key={permKey}
                      className={`flex items-start gap-2 p-1.5 rounded-lg transition-colors ${
                        lockedByBlind
                          ? 'opacity-45 cursor-not-allowed'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer'
                      }`}
                      title={meta.description}
                    >
                      <input
                        type="checkbox"
                        disabled={lockedByBlind}
                        checked={value[permKey]}
                        onChange={(e) => toggleKey(permKey, e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <div className="min-w-0">
                        <span className="block text-[11px] font-black text-slate-800 dark:text-slate-100 leading-tight">
                          {meta.label}
                        </span>
                        <span className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 leading-snug mt-0.5">
                          {meta.description}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function TeacherAssistantsPage() {
  const [assistants, setAssistants] = useState<AssistantData[]>([]);
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [courseSearchQuery, setCourseSearchQuery] = useState('');
  const [logActorFilter, setLogActorFilter] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAssistant, setEditingAssistant] = useState<AssistantData | null>(null);
  const [activeTab, setActiveTab] = useState<'assistants' | 'audit_logs'>('assistants');

  // Master Secret Verification for Revealing Assistant Email
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
  const [revealedCredentialInfo, setRevealedCredentialInfo] = useState<{
    email: string;
    passwordNote?: string;
  } | null>(null);
  const [loadingCredentialReveal, setLoadingCredentialReveal] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Form Basic Info State
  const [fullName, setFullName] = useState('');
  const [assistantRoleTitle, setAssistantRoleTitle] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [formError, setFormError] = useState('');
  const [activePresetId, setActivePresetId] = useState<string>('');

  // Complete Granular Permissions Matrix State
  const [studentPermissions, setStudentPermissions] = useState<StudentGranularPermissions>({
    ...DEFAULT_STUDENT_PERMISSIONS,
  });
  const [canHandleAcademicSupport, setCanHandleAcademicSupport] = useState(false);
  const [canHandleTechnicalSupport, setCanHandleTechnicalSupport] = useState(false);
  const [canReviewHomework, setCanReviewHomework] = useState(false);
  const [canPublishAnnouncements, setCanPublishAnnouncements] = useState(false);
  const [canSendMessages, setCanSendMessages] = useState(false);
  const [canManageAllCourses, setCanManageAllCourses] = useState(false);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [globalCoursePermissions, setGlobalCoursePermissions] = useState<CourseGranularPermissions>({
    ...DEFAULT_COURSE_PERMISSIONS,
  });
  const [coursePermissionsMap, setCoursePermissionsMap] = useState<
    Record<string, CourseGranularPermissions>
  >({});
  const [expandedCoursePerms, setExpandedCoursePerms] = useState<Record<string, boolean>>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const loadLogs = async (actorId?: string) => {
    setLoadingLogs(true);
    try {
      const logs = await fetchAssistantActivityLogs(actorId || undefined);
      setAuditLogs(logs);
    } finally {
      setLoadingLogs(false);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [assts, crs, logs] = await Promise.all([
        fetchAssistants(),
        fetchAllCourses(),
        fetchAssistantActivityLogs(),
      ]);
      setAssistants(assts);
      setCourses(crs);
      setAuditLogs(logs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

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

  const fetchRevealedCreds = async (asst: AssistantData) => {
    setLoadingCredentialReveal(true);
    try {
      const res = await revealAssistantCredential(asst.id);
      if (res.success) {
        setRevealedCredentialInfo({
          email: res.email || asst.email,
          passwordNote: res.passwordNote,
        });
      } else {
        setRevealedCredentialInfo({
          email: asst.email,
          passwordNote: res.message || 'كلمة المرور مشفرة أحادياً — يمكنك تعيين كلمة مرور جديدة من شاشة التعديل.',
        });
      }
    } finally {
      setLoadingCredentialReveal(false);
    }
  };

  const handleOpenCredentialsModal = async (asst: AssistantData) => {
    setViewingCredentialsAsst(asst);
    setRevealedCredentialInfo(null);
    if (!isMasterVerified) {
      generateCaptcha();
      setSecretInput('');
      setSecretError('');
      setIsMasterSecretModalOpen(true);
    } else {
      await fetchRevealedCreds(asst);
    }
  };

  const handleVerifyMasterSecret = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSecret = secretInput.trim();

    if (captchaCode && captchaInput.trim() !== captchaCode) {
      setSecretError('رمز التحقق البشري (Captcha) غير مطابق! يرجى إعادة المحاولة.');
      return;
    }

    try {
      const { verifyMasterKeyAction } = await import('@/app/actions/studentActions');
      const res = await verifyMasterKeyAction(cleanSecret);
      if (!res.success) {
        setSecretError(res.message || 'كلمة السر الرئيسية للمعلم غير صحيحة! يرجى إدخال Master Key المعتمد.');
        return;
      }

      setIsMasterVerified(true);
      setIsMasterSecretModalOpen(false);
      setSecretError('');
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('mr_radwan_master_unlocked', 'true');
      }
      if (viewingCredentialsAsst) {
        await fetchRevealedCreds(viewingCredentialsAsst);
      }
    } catch {
      setSecretError('تعذر التحقق من الخادم حالياً. يرجى المحاولة مرة أخرى.');
    }
  };

  const handleGeneratePassword = () => {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghijkmnpqrstuvwxyz';
    const nums = '23456789';
    const symbols = '!@#$%^&*';
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

  const handleGenerateEmail = () => {
    const cleanName = fullName
      .trim()
      .toLowerCase()
      .replace(/[أإآ]/g, 'a')
      .replace(/[ع]/g, 'aa')
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '.');

    const prefix = cleanName || 'assistant.' + Math.floor(100 + Math.random() * 900);
    setEmail(`${prefix}@radwan.edu`);
    setEmailError('');
  };

  const handleEmailChange = (val: string) => {
    setEmail(val);
    if (val && !val.toLowerCase().endsWith('.edu') && !val.toLowerCase().endsWith('.edu.eg')) {
      setEmailError('تنبيه: يُفضل أن ينتهي البريد الإلكتروني للمساعد بـ .edu أو .edu.eg');
    } else {
      setEmailError('');
    }
  };

  const applyPermissionMatrixToForm = (matrix: AssistantPermissionsConfig) => {
    setStudentPermissions({ ...matrix.studentPermissions });
    setCanHandleAcademicSupport(matrix.canHandleAcademicSupport);
    setCanHandleTechnicalSupport(matrix.canHandleTechnicalSupport);
    setCanReviewHomework(matrix.canReviewHomework);
    setCanPublishAnnouncements(matrix.canPublishAnnouncements);
    setCanSendMessages(matrix.canSendMessages);
    setCanManageAllCourses(matrix.canManageAllCourses);
    setSelectedCourseIds([...matrix.assignedCourseIds]);
    setGlobalCoursePermissions({ ...matrix.globalCoursePermissions });
    setCoursePermissionsMap({ ...matrix.coursePermissionsMap });
  };

  const applyPreset = (presetId: string) => {
    const preset = ASSISTANT_PERMISSION_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setActivePresetId(presetId);
    if (!assistantRoleTitle.trim()) {
      setAssistantRoleTitle(preset.roleTitle);
    }
    const baseCfg = normalizeAssistantPermissions(undefined, preset.config);
    setStudentPermissions({ ...baseCfg.studentPermissions });
    setCanHandleAcademicSupport(baseCfg.canHandleAcademicSupport);
    setCanHandleTechnicalSupport(baseCfg.canHandleTechnicalSupport);
    setCanReviewHomework(baseCfg.canReviewHomework);
    setCanPublishAnnouncements(baseCfg.canPublishAnnouncements);
    setCanSendMessages(baseCfg.canSendMessages);
    setCanManageAllCourses(baseCfg.canManageAllCourses);
    setGlobalCoursePermissions({ ...baseCfg.globalCoursePermissions });

    // Preserve already checked courses and update their permissions when preset isn't manage-all
    if (!baseCfg.canManageAllCourses && selectedCourseIds.length > 0) {
      const updatedMap: Record<string, CourseGranularPermissions> = { ...coursePermissionsMap };
      for (const cid of selectedCourseIds) {
        updatedMap[cid] = { ...baseCfg.globalCoursePermissions };
      }
      setCoursePermissionsMap(updatedMap);
    }
  };

  const handleGrantAllGlobalPermissions = () => {
    setActivePresetId('');
    setStudentPermissions({ ...FULL_STUDENT_PERMISSIONS });
    setCanHandleAcademicSupport(true);
    setCanHandleTechnicalSupport(true);
    setCanReviewHomework(true);
    setCanPublishAnnouncements(true);
    setCanSendMessages(true);
    setCanManageAllCourses(true);
    setGlobalCoursePermissions({ ...FULL_COURSE_PERMISSIONS });
  };

  const handleRevokeAllGlobalPermissions = () => {
    setActivePresetId('');
    setStudentPermissions({ ...DEFAULT_STUDENT_PERMISSIONS });
    setCanHandleAcademicSupport(false);
    setCanHandleTechnicalSupport(false);
    setCanReviewHomework(false);
    setCanPublishAnnouncements(false);
    setCanSendMessages(false);
    setCanManageAllCourses(false);
    setSelectedCourseIds([]);
    setGlobalCoursePermissions({ ...DEFAULT_COURSE_PERMISSIONS });
    setCoursePermissionsMap({});
  };

  const handleOpenCreateModal = () => {
    setFullName('');
    setAssistantRoleTitle('');
    setEmail('');
    setPassword('');
    setPhone('');
    setEmailError('');
    setFormError('');
    setShowPassword(false);
    setActivePresetId('');
    setCourseSearchQuery('');
    setExpandedCoursePerms({});
    applyPermissionMatrixToForm(normalizeAssistantPermissions());
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (asst: AssistantData) => {
    setEditingAssistant(asst);
    setFullName(asst.fullName);
    setAssistantRoleTitle(asst.assistantRoleTitle || asst.permissions?.roleTitle || '');
    setEmail(asst.email);
    setPassword(''); // Never prefill password hash
    setPhone(asst.phone || '');
    setEmailError('');
    setFormError('');
    setShowPassword(false);
    setActivePresetId('');
    setCourseSearchQuery('');
    const normalized = normalizeAssistantPermissions(undefined, asst.permissions);
    applyPermissionMatrixToForm(normalized);
    const expandedInit: Record<string, boolean> = {};
    normalized.assignedCourseIds.slice(0, 2).forEach((cid) => {
      expandedInit[cid] = true;
    });
    setExpandedCoursePerms(expandedInit);
    setIsEditModalOpen(true);
  };

  const buildNormalizedConfigFromForm = (): AssistantPermissionsConfig => {
    const cleanCourseMap: Record<string, CourseGranularPermissions> = {};
    selectedCourseIds.forEach((cid) => {
      cleanCourseMap[cid] = normalizeCoursePermissions(
        coursePermissionsMap[cid] || globalCoursePermissions
      );
    });

    return normalizeAssistantPermissions(undefined, {
      roleTitle: assistantRoleTitle.trim() || 'مساعد إداري وأكاديمي',
      canManageStudents:
        studentPermissions.canManageStudents || Object.values(studentPermissions).some(Boolean),
      canApproveRegistrations: studentPermissions.canApproveRegistrations,
      canViewStudentPasswords: false,
      studentPermissions: { ...studentPermissions },
      canManageAllCourses,
      assignedCourseIds: canManageAllCourses ? [] : selectedCourseIds,
      globalCoursePermissions: normalizeCoursePermissions(globalCoursePermissions),
      coursePermissionsMap: canManageAllCourses ? {} : cleanCourseMap,
      canHandleAcademicSupport,
      canHandleTechnicalSupport,
      canReviewHomework,
      canPublishAnnouncements,
      canSendMessages,
    });
  };

  const handleCreateAssistant = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setFormError('يرجى إدخال الاسم والبريد الإلكتروني وكلمة المرور');
      return;
    }

    let finalEmail = email.trim().toLowerCase();
    if (!finalEmail.includes('@')) {
      finalEmail = `${finalEmail}@radwan.edu`;
    }

    const permissionsMatrix = buildNormalizedConfigFromForm();
    setIsSubmitting(true);
    try {
      const newAsst = await createAssistant({
        fullName: fullName.trim(),
        assistantRoleTitle: assistantRoleTitle.trim() || 'مساعد إداري وأكاديمي',
        email: finalEmail,
        passwordHash: password.trim(),
        phone: phone.trim(),
        permissions: permissionsMatrix,
      });

      setAssistants((prev) => [newAsst, ...prev]);
      setIsModalOpen(false);
      setSuccessMsg('تمت إضافة المساعد واعتماد بيانات دخوله ومصفوفة الصلاحيات التفصيلية بنجاح ✨');
      setTimeout(() => setSuccessMsg(''), 4500);
      loadLogs(logActorFilter);
    } catch (err: any) {
      setFormError(err?.message || 'حدث خطأ أثناء إنشاء حساب المساعد');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateAssistant = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!editingAssistant || !fullName.trim() || !email.trim()) {
      setFormError('يرجى تعبئة الاسم والبريد الإلكتروني');
      return;
    }

    let finalEmail = email.trim().toLowerCase();
    if (!finalEmail.includes('@')) {
      finalEmail = `${finalEmail}@radwan.edu`;
    }

    const permissionsMatrix = buildNormalizedConfigFromForm();
    setIsSubmitting(true);
    try {
      const updated: AssistantData = {
        ...editingAssistant,
        fullName: fullName.trim(),
        assistantRoleTitle: assistantRoleTitle.trim() || 'مساعد إداري وأكاديمي',
        email: finalEmail,
        phone: phone.trim(),
        permissions: permissionsMatrix,
      };

      await updateAssistant({
        ...updated,
        newPassword: password.trim() || undefined,
      });

      setAssistants((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      setIsEditModalOpen(false);
      setSuccessMsg('تم حفظ وتحديث مصفوفة صلاحيات المساعد وبياناته بنجاح ✨');
      setTimeout(() => setSuccessMsg(''), 4500);
      loadLogs(logActorFilter);
    } catch (err: any) {
      setFormError(err?.message || 'حدث خطأ أثناء تحديث بيانات المساعد');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleFreeze = async (assistant: AssistantData) => {
    const updatedStatus = !assistant.isFrozen;
    await toggleAssistantFreeze(assistant.id, updatedStatus);
    setAssistants((prev) =>
      prev.map((a) => (a.id === assistant.id ? { ...a, isFrozen: updatedStatus } : a))
    );
    loadLogs(logActorFilter);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المساعد نهائياً؟ لن يتمكن من الدخول للمنصة مجدداً.')) return;
    await deleteAssistant(id);
    setAssistants((prev) => prev.filter((a) => a.id !== id));
    loadLogs(logActorFilter);
  };

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const filteredAssistants = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return assistants;
    return assistants.filter(
      (a) =>
        a.fullName.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        (a.assistantRoleTitle && a.assistantRoleTitle.toLowerCase().includes(q))
    );
  }, [assistants, searchQuery]);

  const filteredModalCourses = useMemo(() => {
    const q = courseSearchQuery.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter((c) => c.title.toLowerCase().includes(q));
  }, [courses, courseSearchQuery]);

  // KPI metrics
  const kpiStats = useMemo(() => {
    const total = assistants.length;
    const activeCount = assistants.filter((a) => !a.isFrozen).length;
    const frozenCount = assistants.filter((a) => a.isFrozen).length;
    const blindAuthorsCount = assistants.filter((a) => {
      const norm = normalizeAssistantPermissions(undefined, a.permissions);
      if (norm.canManageAllCourses && isBlindQuestionAddOnly(norm.globalCoursePermissions)) return true;
      return norm.assignedCourseIds.some((cid) => isBlindQuestionAddOnly(norm.coursePermissionsMap[cid]));
    }).length;
    return { total, activeCount, frozenCount, blindAuthorsCount };
  }, [assistants]);

  const copyCoursePermsToAllSelected = (sourceCourseId: string) => {
    const source = normalizeCoursePermissions(coursePermissionsMap[sourceCourseId]);
    const nextMap: Record<string, CourseGranularPermissions> = { ...coursePermissionsMap };
    selectedCourseIds.forEach((cid) => {
      nextMap[cid] = { ...source };
    });
    setCoursePermissionsMap(nextMap);
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 dark:border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/10 dark:bg-emerald-500/20 blur-3xl rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-bold text-xs mb-3">
              <ShieldCheck className="w-4 h-4" />
              منظومة الصلاحيات الجزيئية الفائقة والأمان الصفري 2030
            </div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
              مركز إدارة مساعدي مستر محمد رضوان 🛡️
            </h1>
            <p className="text-slate-600 dark:text-slate-400 font-bold text-sm md:text-base max-w-3xl">
              تحكم تفصيلي لكل مساعد على حدة: صلاحيات الكورسات (جميع الكورسات أو كورسات محددة × 17 صلاحية دقيقة)، وضع الإضافة العمياء للأسئلة، صلاحيات الطلاب، ومراقبة كافة النشاطات.
            </p>
          </div>

          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.02] shrink-0"
          >
            <UserPlus className="w-5 h-5" />
            <span>إضافة مساعد جديد</span>
          </button>
        </div>

        {/* KPI Strip */}
        <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">إجمالي المساعدين</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white tabular-nums mt-1 block">
              {kpiStats.total}
            </span>
          </div>
          <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/50">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 block">حسابات نشطة</span>
            <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300 tabular-nums mt-1 block">
              {kpiStats.activeCount}
            </span>
          </div>
          <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/50">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-300 block">بوضع الإضافة العمياء</span>
            <span className="text-2xl font-black text-amber-700 dark:text-amber-300 tabular-nums mt-1 block">
              {kpiStats.blindAuthorsCount}
            </span>
          </div>
          <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/70 dark:border-rose-900/50">
            <span className="text-xs font-bold text-rose-700 dark:text-rose-300 block">حسابات مجمدة</span>
            <span className="text-2xl font-black text-rose-700 dark:text-rose-300 tabular-nums mt-1 block">
              {kpiStats.frozenCount}
            </span>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('assistants')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-sm transition-all ${
            activeTab === 'assistants'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>المساعدون الحاليون ({assistants.length})</span>
        </button>
        <button
          onClick={() => {
            setActiveTab('audit_logs');
            loadLogs(logActorFilter);
          }}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-sm transition-all ${
            activeTab === 'audit_logs'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>سجل نشاطات المساعدين الموثق ({auditLogs.length})</span>
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
            <div className="py-16 text-center text-slate-400 font-bold flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              <span>جاري تحميل بيانات المساعدين ومصفوفات الصلاحيات...</span>
            </div>
          ) : filteredAssistants.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAssistants.map((asst) => {
                const norm = normalizeAssistantPermissions(undefined, asst.permissions);
                const studentCount = Object.values(norm.studentPermissions).filter(Boolean).length;
                const moduleCount = [
                  norm.canHandleAcademicSupport,
                  norm.canHandleTechnicalSupport,
                  norm.canReviewHomework,
                  norm.canPublishAnnouncements,
                  norm.canSendMessages,
                ].filter(Boolean).length;
                const hasBlindCourse = norm.canManageAllCourses
                  ? isBlindQuestionAddOnly(norm.globalCoursePermissions)
                  : norm.assignedCourseIds.some((cid) =>
                      isBlindQuestionAddOnly(norm.coursePermissionsMap[cid])
                    );

                return (
                  <div
                    key={asst.id}
                    className={`bg-white dark:bg-slate-900 rounded-3xl p-6 border shadow-sm transition-all flex flex-col justify-between ${
                      asst.isFrozen
                        ? 'border-rose-300 dark:border-rose-900/50 bg-rose-50/20 dark:bg-rose-950/10 opacity-85'
                        : 'border-slate-200 dark:border-slate-800 hover:shadow-lg'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-xl">
                          {asst.fullName.charAt(0)}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 justify-end">
                          {hasBlindCourse && (
                            <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 flex items-center gap-1">
                              <EyeClosed className="w-3 h-3" />
                              إضافة عمياء
                            </span>
                          )}
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
                      {(asst.assistantRoleTitle || norm.roleTitle) && (
                        <span className="inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 mb-2">
                          {asst.assistantRoleTitle || norm.roleTitle}
                        </span>
                      )}
                      <p className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 mb-4 truncate" dir="ltr">
                        {asst.email}
                      </p>

                      {/* Granular Summary */}
                      <div className="space-y-2 py-3 border-t border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-slate-500">
                            <BookOpen className="w-3.5 h-3.5" /> نطاق الكورسات:
                          </span>
                          <span className="text-slate-800 dark:text-slate-100 font-black">
                            {norm.canManageAllCourses
                              ? 'جميع الكورسات'
                              : norm.assignedCourseIds.length > 0
                              ? `${norm.assignedCourseIds.length} كورس محدد`
                              : 'بدون كورسات'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-slate-500">
                            <GraduationCap className="w-3.5 h-3.5" /> صلاحيات الطلاب:
                          </span>
                          <span className={studentCount > 0 ? 'text-emerald-600 dark:text-emerald-400 font-black tabular-nums' : 'text-slate-400 tabular-nums'}>
                            {studentCount} / 7
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-slate-500">
                            <Headphones className="w-3.5 h-3.5" /> الأقسام العامة:
                          </span>
                          <span className={moduleCount > 0 ? 'text-sky-600 dark:text-sky-400 font-black tabular-nums' : 'text-slate-400 tabular-nums'}>
                            {moduleCount} / 5
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
                          <span>بيانات الدخول</span>
                        </button>

                        <button
                          onClick={() => handleOpenEditModal(asst)}
                          className="flex-1 py-2 px-3 rounded-xl bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>تعديل الصلاحيات</span>
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
                );
              })}
            </div>
          ) : (
            <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-bold">لا يوجد مساعدون مسجلون حالياً. اضغط «إضافة مساعد جديد» للبدء.</p>
            </div>
          )}
        </div>
      ) : (
        /* Audit Logs Tab */
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <History className="w-5 h-5 text-emerald-600" />
                سجل نشاطات المساعدين الموثق (Audit Logs)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-0.5">
                رصد فوري لكل عملية يقوم بها أي مساعد في الكورسات، الأسئلة، الأكواد، الطلاب، والإعلانات.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={logActorFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setLogActorFilter(val);
                  loadLogs(val);
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200"
              >
                <option value="">جميع المساعدين</option>
                {assistants.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.fullName}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => loadLogs(logActorFilter)}
                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
                تحديث
              </button>
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {loadingLogs ? (
              <div className="py-12 text-center text-slate-400 font-bold">جاري تحميل السجلات...</div>
            ) : auditLogs.length > 0 ? (
              auditLogs.map((log) => (
                <div key={log.id} className="py-4 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-black text-sm text-slate-900 dark:text-white">
                          {log.actorName}
                        </span>
                        <span className="text-[11px] px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold">
                          {log.actionType}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 break-words">
                        الهدف: <span className="font-bold">{log.targetEntity}</span>
                        {log.targetId ? ` (${log.targetId})` : ''}
                        {log.details && Object.keys(log.details).length > 0
                          ? ` — ${JSON.stringify(log.details)}`
                          : ''}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 font-bold whitespace-nowrap tabular-nums">
                    {new Date(log.createdAt).toLocaleString('ar-EG', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-slate-400 font-bold">
                لا توجد سجلات نشاط مسجلة لهذا الفلتر بعد
              </div>
            )}
          </div>
        </div>
      )}

      {/* Master Secret Modal for Revealing Assistant Credentials */}
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
                <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                  <ShieldAlert className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  التحقق الأمني للمعلم (Master Key)
                </h3>
                <p className="text-xs text-slate-500 font-bold">
                  أدخل كلمة السر الرئيسية واجتز رمز التحقق للوصول لبيانات الحساب المعتمدة.
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
                    تأكيد ومتابعة
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View Credentials Modal (After Master Key Verified) */}
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
                    بيانات حساب المساعد
                  </h3>
                </div>
                <button
                  onClick={() => setViewingCredentialsAsst(null)}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {loadingCredentialReveal ? (
                <div className="py-10 text-center text-slate-400 font-bold flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                  <span>جاري التحقق من الخزنة الأمنية...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <span className="text-[11px] font-bold text-slate-400 block mb-1">اسم المساعد:</span>
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      {viewingCredentialsAsst.fullName}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[11px] font-bold text-slate-400 block mb-1">البريد الإلكتروني المعتمد:</span>
                      <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 select-all break-all" dir="ltr">
                        {revealedCredentialInfo?.email || viewingCredentialsAsst.email}
                      </span>
                    </div>
                    <button
                      onClick={() =>
                        handleCopyText(
                          revealedCredentialInfo?.email || viewingCredentialsAsst.email,
                          'email'
                        )
                      }
                      className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-600 dark:text-slate-300 shrink-0"
                      title="نسخ الإيميل"
                    >
                      {copiedField === 'email' ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-black text-emerald-700 dark:text-emerald-300">
                      <ShieldCheck className="w-4 h-4 shrink-0" />
                      <span>أمان كلمة المرور (Zero-Knowledge Hash)</span>
                    </div>
                    <p className="text-[11px] font-bold text-emerald-800/80 dark:text-emerald-200/80 leading-relaxed">
                      {revealedCredentialInfo?.passwordNote ||
                        'كلمة مرور المساعد مشفرة أحادياً بتقنية PBKDF2-SHA256 ولا تُخزن كنص مكشوف. لتعيين كلمة مرور جديدة استخدم زر «تعديل الصلاحيات».'}
                    </p>
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
              )}

              <div className="pt-2 flex gap-2">
                <button
                  onClick={() => {
                    const target = viewingCredentialsAsst;
                    setViewingCredentialsAsst(null);
                    handleOpenEditModal(target);
                  }}
                  className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
                >
                  تعديل البيانات وكلمة المرور
                </button>
                <button
                  onClick={() => setViewingCredentialsAsst(null)}
                  className="px-5 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs"
                >
                  إغلاق
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add / Edit Assistant Ultra-Granular Modal */}
      <AnimatePresence>
        {(isModalOpen || isEditModalOpen) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl my-6 max-h-[92vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">
                    {isEditModalOpen
                      ? 'تعديل مصفوفة الصلاحيات وبيانات المساعد'
                      : 'إضافة مساعد جديد وبناء مصفوفة الصلاحيات'}
                  </h3>
                  <p className="text-xs text-slate-500 font-bold mt-1">
                    النظام يطبق Zero-Exposure في الواجهة + تحقق خادمي صارم لكل إجراء.
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

              <form
                onSubmit={isEditModalOpen ? handleUpdateAssistant : handleCreateAssistant}
                className="space-y-6"
              >
                {formError && (
                  <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* 1. Basic Identity */}
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
                      placeholder="مثال: مشرف أول ثانوي وبنك الأسئلة"
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
                        توليد تلقائي
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

                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {isEditModalOpen ? 'تعيين كلمة مرور جديدة (اتركه فارغاً للإبقاء على الحالية)' : 'كلمة المرور *'}
                      </label>
                      <button
                        type="button"
                        onClick={handleGeneratePassword}
                        className="text-[11px] font-bold text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" />
                        توليد كلمة سر قوية
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required={!isEditModalOpen}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={isEditModalOpen ? '•••••••••••• (اختياري للتغيير فقط)' : '••••••••••••'}
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

                {/* 2. Role Presets & Quick Master Toggles */}
                <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-emerald-600" />
                        قوالب الصلاحيات الجاهزة (Presets)
                      </h4>
                      <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                        اختر قالباً وظيفياً جاهزاً ثم خصص أي صلاحية بالأسفل بحرية تامة
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleGrantAllGlobalPermissions}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-colors"
                      >
                        تحديد الكل (صلاحيات شاملة)
                      </button>
                      <button
                        type="button"
                        onClick={handleRevokeAllGlobalPermissions}
                        className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-black transition-colors"
                      >
                        إلغاء الكل
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {ASSISTANT_PERMISSION_PRESETS.map((preset) => {
                      const active = activePresetId === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => applyPreset(preset.id)}
                          className={`p-3 rounded-2xl border text-right transition-all ${
                            active
                              ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 ring-1 ring-emerald-500'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-400'
                          }`}
                        >
                          <span className="block text-xs font-black text-slate-900 dark:text-white">
                            {preset.label}
                          </span>
                          <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                            {preset.description}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Granular Student Permissions (7 keys) */}
                <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-violet-600" />
                        صلاحيات شؤون الطلاب (7 صلاحيات دقيقة)
                      </h4>
                      <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                        لا يمكن للمساعد مطلقاً كشف كلمات مرور الطلاب أو استخدام المفتاح السري للمعلم
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setStudentPermissions({ ...FULL_STUDENT_PERMISSIONS })}
                        className="px-2.5 py-1 rounded-lg bg-violet-600/10 hover:bg-violet-600/20 text-violet-700 dark:text-violet-300 text-[11px] font-black"
                      >
                        تحديد كل صلاحيات الطلاب
                      </button>
                      <button
                        type="button"
                        onClick={() => setStudentPermissions({ ...DEFAULT_STUDENT_PERMISSIONS })}
                        className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-black"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {(
                      Object.entries(STUDENT_PERMISSION_LABELS) as Array<
                        [keyof StudentGranularPermissions, { label: string; description: string }]
                      >
                    ).map(([key, meta]) => (
                      <label
                        key={key}
                        className="flex items-start gap-2.5 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-violet-500 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={studentPermissions[key]}
                          onChange={(e) =>
                            setStudentPermissions((prev) => ({
                              ...prev,
                              [key]: e.target.checked,
                            }))
                          }
                          className="mt-0.5 w-4 h-4 rounded text-violet-600 focus:ring-violet-500"
                        />
                        <div>
                          <span className="block text-xs font-black text-slate-900 dark:text-white">
                            {meta.label}
                          </span>
                          <span className="block text-[10px] font-bold text-slate-400 mt-0.5 leading-snug">
                            {meta.description}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 4. Global Support, Homework, Announcements & Messaging Modules */}
                <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-4">
                  <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-sky-600" />
                    صلاحيات الأقسام العامة (الدعم، الإعلانات، والرسائل)
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {GLOBAL_MODULE_ITEMS.map((item) => {
                      const val =
                        item.key === 'canHandleAcademicSupport'
                          ? canHandleAcademicSupport
                          : item.key === 'canHandleTechnicalSupport'
                          ? canHandleTechnicalSupport
                          : item.key === 'canReviewHomework'
                          ? canReviewHomework
                          : item.key === 'canPublishAnnouncements'
                          ? canPublishAnnouncements
                          : canSendMessages;

                      const setter =
                        item.key === 'canHandleAcademicSupport'
                          ? setCanHandleAcademicSupport
                          : item.key === 'canHandleTechnicalSupport'
                          ? setCanHandleTechnicalSupport
                          : item.key === 'canReviewHomework'
                          ? setCanReviewHomework
                          : item.key === 'canPublishAnnouncements'
                          ? setCanPublishAnnouncements
                          : setCanSendMessages;

                      return (
                        <label
                          key={item.key}
                          className="flex items-start gap-2.5 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-sky-500 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={val}
                            onChange={(e) => setter(e.target.checked)}
                            className="mt-0.5 w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
                          />
                          <div>
                            <span className="block text-xs font-black text-slate-900 dark:text-white">
                              {item.label}
                            </span>
                            <span className="block text-[10px] font-bold text-slate-400 mt-0.5 leading-snug">
                              {item.description}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* 5. Course Scoping & 17-Key Per-Course Matrix */}
                <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <Layers className="w-4 h-4 text-emerald-600" />
                        نطاق إدارة الكورسات والمناهج (17 صلاحية لكل كورس)
                      </h4>
                      <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                        حدد ما إذا كان المساعد يدير جميع الكورسات بصلاحيات موحدة أم كورسات محددة بصلاحيات مستقلة لكل كورس
                      </p>
                    </div>

                    <div className="inline-flex p-1 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-black">
                      <button
                        type="button"
                        onClick={() => setCanManageAllCourses(false)}
                        className={`px-3.5 py-1.5 rounded-xl transition-all ${
                          !canManageAllCourses
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        كورسات محددة بعينها
                      </button>
                      <button
                        type="button"
                        onClick={() => setCanManageAllCourses(true)}
                        className={`px-3.5 py-1.5 rounded-xl transition-all ${
                          canManageAllCourses
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        جميع الكورسات
                      </button>
                    </div>
                  </div>

                  {canManageAllCourses ? (
                    <CourseGranularMatrix
                      title="المصفوفة الموحدة لجميع كورسات المنصة (الحالية والمستقبلية)"
                      subtitle="تطبق هذه الصلاحيات تلقائياً على كل كورس بالمنصة."
                      value={globalCoursePermissions}
                      onChange={setGlobalCoursePermissions}
                    />
                  ) : (
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <div className="relative flex-1">
                          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={courseSearchQuery}
                            onChange={(e) => setCourseSearchQuery(e.target.value)}
                            placeholder="ابحث باسم الكورس لتعيينه وتخصيص صلاحياته..."
                            className="w-full pr-9 pl-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold"
                          />
                        </div>
                        <span className="text-xs font-black text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800 tabular-nums">
                          الكورسات المختارة: {selectedCourseIds.length}
                        </span>
                      </div>

                      <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                        {filteredModalCourses.length > 0 ? (
                          filteredModalCourses.map((c) => {
                            const isSelected = selectedCourseIds.includes(c.id);
                            const isExpanded = Boolean(expandedCoursePerms[c.id]);
                            const coursePerms = normalizeCoursePermissions(
                              coursePermissionsMap[c.id] || globalCoursePermissions
                            );
                            const activeCount = Object.values(coursePerms).filter(Boolean).length;
                            const isBlind = isBlindQuestionAddOnly(coursePerms);

                            return (
                              <div
                                key={c.id}
                                className={`rounded-2xl border p-3.5 transition-all ${
                                  isSelected
                                    ? 'bg-white dark:bg-slate-900 border-emerald-500/60 shadow-xs'
                                    : 'bg-white/70 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800'
                                }`}
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <label className="flex items-center gap-2.5 text-xs font-black text-slate-800 dark:text-slate-100 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedCourseIds((prev) =>
                                            prev.includes(c.id) ? prev : [...prev, c.id]
                                          );
                                          if (!coursePermissionsMap[c.id]) {
                                            setCoursePermissionsMap((prev) => ({
                                              ...prev,
                                              [c.id]: { ...globalCoursePermissions },
                                            }));
                                          }
                                          setExpandedCoursePerms((prev) => ({
                                            ...prev,
                                            [c.id]: true,
                                          }));
                                        } else {
                                          setSelectedCourseIds((prev) =>
                                            prev.filter((id) => id !== c.id)
                                          );
                                        }
                                      }}
                                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <span>{c.title}</span>
                                    <span className="text-[10px] font-bold text-slate-400">
                                      ({c.stage === 'high' ? 'ثانوي' : 'إعدادي'} - الصف {c.grade})
                                    </span>
                                  </label>

                                  {isSelected && (
                                    <div className="flex items-center gap-2">
                                      {isBlind && (
                                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                          إضافة عمياء
                                        </span>
                                      )}
                                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 tabular-nums">
                                        {activeCount}/17
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setExpandedCoursePerms((prev) => ({
                                            ...prev,
                                            [c.id]: !isExpanded,
                                          }))
                                        }
                                        className="text-xs text-emerald-600 dark:text-emerald-400 font-black flex items-center gap-1 hover:underline"
                                      >
                                        <span>{isExpanded ? 'طي الصلاحيات' : 'تخصيص الـ 17 صلاحية'}</span>
                                        {isExpanded ? (
                                          <ChevronUp className="w-3.5 h-3.5" />
                                        ) : (
                                          <ChevronDown className="w-3.5 h-3.5" />
                                        )}
                                      </button>
                                    </div>
                                  )}
                                </div>

                                {isSelected && isExpanded && (
                                  <div className="mt-3">
                                    <CourseGranularMatrix
                                      title={`صلاحيات كورس: ${c.title}`}
                                      value={coursePerms}
                                      onChange={(next) =>
                                        setCoursePermissionsMap((prev) => ({
                                          ...prev,
                                          [c.id]: next,
                                        }))
                                      }
                                      onCopyToAllSelected={
                                        selectedCourseIds.length > 1
                                          ? () => copyCoursePermsToAllSelected(c.id)
                                          : undefined
                                      }
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <div className="py-6 text-center text-xs font-bold text-slate-400">
                            لا توجد كورسات مطابقة لبحثك
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Submit Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setIsEditModalOpen(false);
                    }}
                    className="px-5 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-7 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-lg shadow-emerald-600/20 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>
                      {isSubmitting
                        ? 'جاري الحفظ...'
                        : isEditModalOpen
                        ? 'حفظ مصفوفة الصلاحيات'
                        : 'تأكيد واعتماد المساعد'}
                    </span>
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
