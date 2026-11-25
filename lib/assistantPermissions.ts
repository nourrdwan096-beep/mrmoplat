export interface CourseGranularPermissions {
  // Structure & Course Settings
  canManageUnits: boolean;
  canEditCourseSettings: boolean;
  canDeleteContent: boolean;

  // Content Creation
  canAddVideos: boolean;
  canAddHomework: boolean;
  canAddExams: boolean;
  canAddConceptSheets: boolean;
  canAddSummaries: boolean;
  canTransferContent: boolean;
  canConvertAssessments: boolean;

  // Question Bank (Supports Blind Add-Only Mode when canViewQuestions === false)
  canViewQuestions: boolean;
  canAddQuestions: boolean;
  canEditQuestions: boolean;
  canDeleteQuestions: boolean;

  // Course Operations & Enrollment
  canViewCourseStudents: boolean;
  canGrantExtraAttempts: boolean;
  canGenerateCodes: boolean;
  canDeleteCodes: boolean;
}

export interface StudentGranularPermissions {
  canManageStudents: boolean;
  canApproveRegistrations: boolean;
  canCreateStudents: boolean;
  canHandlePasswordResets: boolean;
  canManageStudentDevices: boolean;
  canBanStudents: boolean;
  canDeleteStudents: boolean;
}

export interface AssistantPermissionsConfig {
  roleTitle?: string;
  // Legacy / Top-level flags synced with studentPermissions
  canManageStudents: boolean;
  canApproveRegistrations: boolean;
  canViewStudentPasswords: boolean; // Always false for strict security

  studentPermissions: StudentGranularPermissions;

  // Course Scoping
  canManageAllCourses: boolean;
  assignedCourseIds: string[];
  globalCoursePermissions: CourseGranularPermissions;
  coursePermissionsMap: Record<string, CourseGranularPermissions>;

  // Backwards-compatible aliases
  courseActions?: Record<string, CourseGranularPermissions>;
  globalCourseActions?: CourseGranularPermissions;

  // Global Modules
  canHandleAcademicSupport: boolean;
  canHandleTechnicalSupport: boolean;
  canReviewHomework: boolean;
  canPublishAnnouncements: boolean;
  canSendMessages: boolean;
}

export const DEFAULT_COURSE_PERMISSIONS: CourseGranularPermissions = {
  canManageUnits: false,
  canEditCourseSettings: false,
  canDeleteContent: false,
  canAddVideos: false,
  canAddHomework: false,
  canAddExams: false,
  canAddConceptSheets: false,
  canAddSummaries: false,
  canTransferContent: false,
  canConvertAssessments: false,
  canViewQuestions: false,
  canAddQuestions: false,
  canEditQuestions: false,
  canDeleteQuestions: false,
  canViewCourseStudents: false,
  canGrantExtraAttempts: false,
  canGenerateCodes: false,
  canDeleteCodes: false,
};

export const FULL_COURSE_PERMISSIONS: CourseGranularPermissions = {
  canManageUnits: true,
  canEditCourseSettings: true,
  canDeleteContent: true,
  canAddVideos: true,
  canAddHomework: true,
  canAddExams: true,
  canAddConceptSheets: true,
  canAddSummaries: true,
  canTransferContent: true,
  canConvertAssessments: true,
  canViewQuestions: true,
  canAddQuestions: true,
  canEditQuestions: true,
  canDeleteQuestions: true,
  canViewCourseStudents: true,
  canGrantExtraAttempts: true,
  canGenerateCodes: true,
  canDeleteCodes: true,
};

export const DEFAULT_STUDENT_PERMISSIONS: StudentGranularPermissions = {
  canManageStudents: false,
  canApproveRegistrations: false,
  canCreateStudents: false,
  canHandlePasswordResets: false,
  canManageStudentDevices: false,
  canBanStudents: false,
  canDeleteStudents: false,
};

export const FULL_STUDENT_PERMISSIONS: StudentGranularPermissions = {
  canManageStudents: true,
  canApproveRegistrations: true,
  canCreateStudents: true,
  canHandlePasswordResets: true,
  canManageStudentDevices: true,
  canBanStudents: true,
  canDeleteStudents: true,
};

export const COURSE_PERMISSION_LABELS: Record<
  keyof CourseGranularPermissions,
  { label: string; description: string; group: 'structure' | 'content' | 'questions' | 'operations' }
> = {
  canManageUnits: {
    label: 'إدارة الوحدات الدراسية',
    description: 'إضافة وتعديل وحذف العناوين وترتيب الوحدات داخل الكورس',
    group: 'structure',
  },
  canEditCourseSettings: {
    label: 'تعديل إعدادات الكورس',
    description: 'تعديل السعر، حدود الأجهزة، التدرج الإجباري، وحالة النشر',
    group: 'structure',
  },
  canDeleteContent: {
    label: 'حذف الدروس والوحدات',
    description: 'حذف الوحدات أو العناصر (فيديوهات، واجبات، امتحانات، ملفات)',
    group: 'structure',
  },
  canAddVideos: {
    label: 'إضافة وتعديل الفيديوهات',
    description: 'رفع وربط حصص الشرح والفيديوهات المشفرة أو يوتيوب',
    group: 'content',
  },
  canAddHomework: {
    label: 'إضافة وتعديل الواجبات',
    description: 'إنشاء وتعديل الواجبات التطبيقية وإعداداتها',
    group: 'content',
  },
  canAddExams: {
    label: 'إضافة وتعديل الامتحانات',
    description: 'إنشاء وتعديل الامتحانات وتحديد الدرجات والمحاولات والمواعيد',
    group: 'content',
  },
  canAddConceptSheets: {
    label: 'إضافة شيتات المفاهيم',
    description: 'إدراج وتعديل شيتات المفاهيم والملخصات التفاعلية',
    group: 'content',
  },
  canAddSummaries: {
    label: 'إضافة ملازم PDF',
    description: 'رفع وإرفاق مذكرات وملازم الشرح للطلاب',
    group: 'content',
  },
  canTransferContent: {
    label: 'نسخ ونقل المحتوى',
    description: 'نسخ الامتحانات أو الدروس بين الوحدات والكورسات المصرح بها',
    group: 'content',
  },
  canConvertAssessments: {
    label: 'تحويل الامتحانات والواجبات ذهاباً وإياباً',
    description: 'تحويل الامتحان إلى واجب أو العكس بنفس الأسئلة، أو إنشاء نسخة مستقلة من النوع الآخر مع بقاء الأصل',
    group: 'content',
  },
  canViewQuestions: {
    label: 'الاطلاع على الأسئلة الموجودة',
    description: 'عرض الأسئلة والإجابات المحفوظة مسبقاً. عند تعطيلها يدخل المساعد في وضع الإضافة العمياء فقط.',
    group: 'questions',
  },
  canAddQuestions: {
    label: 'إضافة أسئلة جديدة',
    description: 'إنشاء أسئلة بجميع الأنواع الـ 8 للامتحانات والواجبات',
    group: 'questions',
  },
  canEditQuestions: {
    label: 'تعديل الأسئلة الحالية',
    description: 'تعديل نصوص وخيارات ودرجات الأسئلة الموجودة (يتطلب تفعيل العرض)',
    group: 'questions',
  },
  canDeleteQuestions: {
    label: 'حذف الأسئلة',
    description: 'إزالة أسئلة من الامتحانات أو الواجبات (يتطلب تفعيل العرض)',
    group: 'questions',
  },
  canViewCourseStudents: {
    label: 'عرض طلاب الكورس وتقدمهم',
    description: 'متابعة قائمة المشتركين ونسب الإنجاز ونتائج الاختبارات',
    group: 'operations',
  },
  canGrantExtraAttempts: {
    label: 'منح محاولات وتصفير الاختبارات',
    description: 'فتح محاولة إضافية للطالب أو تصفير درجات اختبار معين',
    group: 'operations',
  },
  canGenerateCodes: {
    label: 'إصدار وطباعة أكواد التفعيل',
    description: 'توليد دفعات أكواد التفعيل وكروت الطباعة للكورس',
    group: 'operations',
  },
  canDeleteCodes: {
    label: 'حذف أكواد التفعيل',
    description: 'إلغاء وحذف أكواد التفعيل الصادرة مسبقاً',
    group: 'operations',
  },
};

export const STUDENT_PERMISSION_LABELS: Record<
  keyof StudentGranularPermissions,
  { label: string; description: string }
> = {
  canManageStudents: {
    label: 'الاطلاع على سجل الطلاب',
    description: 'فتح صفحة إدارة الطلاب وعرض بياناتهم الأساسية وحالة الأجهزة',
  },
  canApproveRegistrations: {
    label: 'قبول ورفض طلبات التسجيل',
    description: 'مراجعة حسابات الطلاب الجديدة وتفعيلها أو رفضها مع كود SMS',
  },
  canCreateStudents: {
    label: 'إضافة حساب طالب جديد يدوياً',
    description: 'إنشاء وتفعيل حسابات طلاب جديدة مباشرة من لوحة التحكم',
  },
  canHandlePasswordResets: {
    label: 'إدارة طلبات استعادة كلمة المرور',
    description: 'الموافقة أو رفض طلبات السماح للطالب بإنشاء كلمة مرور جديدة',
  },
  canManageStudentDevices: {
    label: 'فك قيد أجهزة الطلاب',
    description: 'إعادة ضبط أجهزة الطالب سواء للحساب أو لكورس محدد',
  },
  canBanStudents: {
    label: 'حظر وفك حظر الطلاب',
    description: 'تطبيق أو رفع الحظر على حسابات الطلاب وأجهزتهم',
  },
  canDeleteStudents: {
    label: 'حذف حسابات الطلاب نهائياً',
    description: 'حذف سجل الطالب واشتراكاته ونتائجه نهائياً من المنصة',
  },
};

export interface AssistantPermissionPreset {
  id: string;
  label: string;
  roleTitle: string;
  description: string;
  config: AssistantPermissionsConfig;
}

export const ASSISTANT_PERMISSION_PRESETS: AssistantPermissionPreset[] = [
  {
    id: 'full_deputy',
    label: 'نائب مشرف عام (كامل الصلاحيات)',
    roleTitle: 'نائب المدير العام والمشرف الأكاديمي',
    description: 'صلاحيات شاملة على جميع الكورسات والطلاب والدعم والإعلانات بدون كشف كلمات المرور.',
    config: {
      roleTitle: 'نائب المدير العام والمشرف الأكاديمي',
      canManageStudents: true,
      canApproveRegistrations: true,
      canViewStudentPasswords: false,
      studentPermissions: { ...FULL_STUDENT_PERMISSIONS },
      canManageAllCourses: true,
      assignedCourseIds: [],
      globalCoursePermissions: { ...FULL_COURSE_PERMISSIONS },
      coursePermissionsMap: {},
      canHandleAcademicSupport: true,
      canHandleTechnicalSupport: true,
      canReviewHomework: true,
      canPublishAnnouncements: true,
      canSendMessages: true,
    },
  },
  {
    id: 'courses_exams_admin',
    label: 'مشرف المحتوى والامتحانات',
    roleTitle: 'مشرف المنهج وبنك الأسئلة',
    description: 'إدارة كاملة للوحدات والدروس والامتحانات والأسئلة داخل الكورسات المحددة.',
    config: {
      roleTitle: 'مشرف المنهج وبنك الأسئلة',
      canManageStudents: false,
      canApproveRegistrations: false,
      canViewStudentPasswords: false,
      studentPermissions: { ...DEFAULT_STUDENT_PERMISSIONS },
      canManageAllCourses: false,
      assignedCourseIds: [],
      globalCoursePermissions: {
        ...DEFAULT_COURSE_PERMISSIONS,
        canManageUnits: true,
        canAddVideos: true,
        canAddHomework: true,
        canAddExams: true,
        canAddConceptSheets: true,
        canAddSummaries: true,
        canTransferContent: true,
        canViewQuestions: true,
        canAddQuestions: true,
        canEditQuestions: true,
        canDeleteQuestions: true,
        canViewCourseStudents: true,
        canGrantExtraAttempts: true,
      },
      coursePermissionsMap: {},
      canHandleAcademicSupport: true,
      canHandleTechnicalSupport: false,
      canReviewHomework: true,
      canPublishAnnouncements: false,
      canSendMessages: false,
    },
  },
  {
    id: 'blind_question_author',
    label: 'محرر أسئلة سري (إضافة عمياء فقط)',
    roleTitle: 'معد أسئلة سري (وضع الإضافة فقط)',
    description: 'يرفع أسئلة جديدة للامتحانات والواجبات بدون القدرة على رؤية أو تعديل الأسئلة الموجودة مسبقاً.',
    config: {
      roleTitle: 'معد أسئلة سري (وضع الإضافة فقط)',
      canManageStudents: false,
      canApproveRegistrations: false,
      canViewStudentPasswords: false,
      studentPermissions: { ...DEFAULT_STUDENT_PERMISSIONS },
      canManageAllCourses: false,
      assignedCourseIds: [],
      globalCoursePermissions: {
        ...DEFAULT_COURSE_PERMISSIONS,
        canViewQuestions: false,
        canAddQuestions: true,
        canEditQuestions: false,
        canDeleteQuestions: false,
      },
      coursePermissionsMap: {},
      canHandleAcademicSupport: false,
      canHandleTechnicalSupport: false,
      canReviewHomework: false,
      canPublishAnnouncements: false,
      canSendMessages: false,
    },
  },
  {
    id: 'students_support_coordinator',
    label: 'منسق شؤون الطلاب والدعم',
    roleTitle: 'مسؤول شؤون الطلاب والدعم',
    description: 'متابعة الطلاب وتفعيل التسجيلات وفك قيود الأجهزة والرد على التذاكر والرسائل.',
    config: {
      roleTitle: 'مسؤول شؤون الطلاب والدعم',
      canManageStudents: true,
      canApproveRegistrations: true,
      canViewStudentPasswords: false,
      studentPermissions: {
        canManageStudents: true,
        canApproveRegistrations: true,
        canCreateStudents: true,
        canHandlePasswordResets: false,
        canManageStudentDevices: true,
        canBanStudents: false,
        canDeleteStudents: false,
      },
      canManageAllCourses: false,
      assignedCourseIds: [],
      globalCoursePermissions: {
        ...DEFAULT_COURSE_PERMISSIONS,
        canViewCourseStudents: true,
        canGrantExtraAttempts: true,
        canGenerateCodes: true,
      },
      coursePermissionsMap: {},
      canHandleAcademicSupport: true,
      canHandleTechnicalSupport: true,
      canReviewHomework: true,
      canPublishAnnouncements: true,
      canSendMessages: true,
    },
  },
];

export function normalizeCoursePermissions(
  raw?: Partial<CourseGranularPermissions> | null,
  fallback?: CourseGranularPermissions
): CourseGranularPermissions {
  const base = fallback ? { ...fallback } : { ...DEFAULT_COURSE_PERMISSIONS };
  if (!raw || typeof raw !== 'object') return base;

  const normalized: CourseGranularPermissions = {
    canManageUnits: raw.canManageUnits ?? base.canManageUnits,
    canEditCourseSettings: raw.canEditCourseSettings ?? base.canEditCourseSettings,
    canDeleteContent: raw.canDeleteContent ?? base.canDeleteContent,
    canAddVideos: raw.canAddVideos ?? base.canAddVideos,
    canAddHomework: raw.canAddHomework ?? base.canAddHomework,
    canAddExams: raw.canAddExams ?? base.canAddExams,
    canAddConceptSheets: raw.canAddConceptSheets ?? base.canAddConceptSheets,
    canAddSummaries: raw.canAddSummaries ?? base.canAddSummaries,
    canTransferContent: raw.canTransferContent ?? base.canTransferContent,
    canConvertAssessments: raw.canConvertAssessments ?? base.canConvertAssessments,
    canViewQuestions: raw.canViewQuestions ?? base.canViewQuestions,
    canAddQuestions: raw.canAddQuestions ?? base.canAddQuestions,
    canEditQuestions: raw.canEditQuestions ?? base.canEditQuestions,
    canDeleteQuestions: raw.canDeleteQuestions ?? base.canDeleteQuestions,
    canViewCourseStudents: raw.canViewCourseStudents ?? base.canViewCourseStudents,
    canGrantExtraAttempts: raw.canGrantExtraAttempts ?? base.canGrantExtraAttempts,
    canGenerateCodes: raw.canGenerateCodes ?? base.canGenerateCodes,
    canDeleteCodes: raw.canDeleteCodes ?? base.canDeleteCodes,
  };

  // Security invariant: editing/deleting existing questions strictly requires viewing them
  if (!normalized.canViewQuestions) {
    normalized.canEditQuestions = false;
    normalized.canDeleteQuestions = false;
  }

  return normalized;
}

export function normalizeStudentPermissions(
  raw?: Partial<StudentGranularPermissions> | null,
  legacyManage?: boolean,
  legacyApprove?: boolean
): StudentGranularPermissions {
  const manage = raw?.canManageStudents ?? Boolean(legacyManage);
  const approve = raw?.canApproveRegistrations ?? Boolean(legacyApprove);

  return {
    canManageStudents: Boolean(manage),
    canApproveRegistrations: Boolean(approve),
    canCreateStudents: Boolean(raw?.canCreateStudents ?? manage),
    canHandlePasswordResets: Boolean(raw?.canHandlePasswordResets ?? false),
    canManageStudentDevices: Boolean(raw?.canManageStudentDevices ?? manage),
    canBanStudents: Boolean(raw?.canBanStudents ?? false),
    canDeleteStudents: Boolean(raw?.canDeleteStudents ?? false),
  };
}

export function normalizeAssistantPermissions(
  rawLegacy?: Record<string, any> | null,
  matrixOverride?: Partial<AssistantPermissionsConfig> | null
): AssistantPermissionsConfig {
  const source = matrixOverride && typeof matrixOverride === 'object' ? matrixOverride : {};
  const leg = rawLegacy && typeof rawLegacy === 'object' ? rawLegacy : {};

  const legacyManageStudents =
    source.canManageStudents ??
    leg.can_manage_students ??
    leg.canManageStudents ??
    false;
  const legacyApproveRegs =
    source.canApproveRegistrations ??
    leg.can_approve_registrations ??
    leg.canApproveRegistrations ??
    false;

  const studentPermissions = normalizeStudentPermissions(
    source.studentPermissions,
    legacyManageStudents,
    legacyApproveRegs
  );

  const canManageAllCourses = Boolean(
    source.canManageAllCourses ?? leg.can_manage_all_courses ?? leg.canManageAllCourses ?? false
  );

  const rawAssigned =
    source.assignedCourseIds ?? leg.assigned_course_ids ?? leg.assignedCourseIds ?? [];
  const assignedCourseIds = Array.isArray(rawAssigned)
    ? Array.from(new Set(rawAssigned.map((id: any) => String(id)).filter(Boolean)))
    : [];

  // Fallback for very old rows where only content-add flags existed
  const legacyCourseFallback: CourseGranularPermissions = canManageAllCourses
    ? {
        ...DEFAULT_COURSE_PERMISSIONS,
        canManageUnits: true,
        canAddVideos: true,
        canAddHomework: true,
        canAddExams: true,
        canAddConceptSheets: true,
        canAddSummaries: true,
        canViewQuestions: true,
        canAddQuestions: true,
        canEditQuestions: true,
        canViewCourseStudents: true,
        canGrantExtraAttempts: true,
      }
    : { ...DEFAULT_COURSE_PERMISSIONS };

  const globalCoursePermissions = normalizeCoursePermissions(
    source.globalCoursePermissions || source.globalCourseActions || leg.globalCourseActions,
    legacyCourseFallback
  );

  const rawMap =
    source.coursePermissionsMap ||
    source.courseActions ||
    leg.course_actions ||
    leg.courseActions ||
    {};

  const coursePermissionsMap: Record<string, CourseGranularPermissions> = {};
  if (rawMap && typeof rawMap === 'object') {
    for (const [cid, perms] of Object.entries(rawMap)) {
      if (cid) {
        coursePermissionsMap[cid] = normalizeCoursePermissions(perms as any, {
          ...DEFAULT_COURSE_PERMISSIONS,
          canViewQuestions: true,
          canAddQuestions: true,
        });
      }
    }
  }

  for (const cid of assignedCourseIds) {
    if (!coursePermissionsMap[cid]) {
      coursePermissionsMap[cid] = normalizeCoursePermissions(globalCoursePermissions);
    }
  }

  const anyStudentFlag = Object.values(studentPermissions).some(Boolean);

  return {
    roleTitle: typeof source.roleTitle === 'string' ? source.roleTitle : undefined,
    canManageStudents: Boolean(studentPermissions.canManageStudents || anyStudentFlag),
    canApproveRegistrations: studentPermissions.canApproveRegistrations,
    canViewStudentPasswords: false, // Hard-enforced Zero-Knowledge invariant
    studentPermissions,
    canManageAllCourses,
    assignedCourseIds,
    globalCoursePermissions,
    coursePermissionsMap,
    courseActions: coursePermissionsMap,
    globalCourseActions: globalCoursePermissions,
    canHandleAcademicSupport: Boolean(
      source.canHandleAcademicSupport ??
        leg.can_handle_academic_support ??
        leg.canHandleAcademicSupport ??
        false
    ),
    canHandleTechnicalSupport: Boolean(
      source.canHandleTechnicalSupport ??
        leg.can_handle_technical_support ??
        leg.canHandleTechnicalSupport ??
        false
    ),
    canReviewHomework: Boolean(
      source.canReviewHomework ?? leg.can_review_homework ?? leg.canReviewHomework ?? false
    ),
    canPublishAnnouncements: Boolean(
      source.canPublishAnnouncements ??
        leg.can_publish_announcements ??
        leg.canPublishAnnouncements ??
        false
    ),
    canSendMessages: Boolean(
      source.canSendMessages ?? leg.can_send_messages ?? leg.canSendMessages ?? false
    ),
  };
}

export function canAccessCourse(
  perms: AssistantPermissionsConfig | null | undefined,
  courseId: string
): boolean {
  if (!perms || !courseId) return false;
  if (perms.canManageAllCourses) return true;
  return perms.assignedCourseIds.includes(courseId);
}

export function resolveCoursePermissions(
  perms: AssistantPermissionsConfig | null | undefined,
  courseId: string
): CourseGranularPermissions {
  if (!perms || !courseId) return { ...DEFAULT_COURSE_PERMISSIONS };
  if (perms.canManageAllCourses) {
    return normalizeCoursePermissions(perms.globalCoursePermissions, DEFAULT_COURSE_PERMISSIONS);
  }
  if (!perms.assignedCourseIds.includes(courseId)) {
    return { ...DEFAULT_COURSE_PERMISSIONS };
  }
  const perCourse = perms.coursePermissionsMap?.[courseId] || perms.courseActions?.[courseId];
  return normalizeCoursePermissions(perCourse, DEFAULT_COURSE_PERMISSIONS);
}

export function hasAnyCoursePermission(cp: CourseGranularPermissions | null | undefined): boolean {
  if (!cp) return false;
  return Object.values(cp).some(Boolean);
}

export function hasAnyStudentPermission(sp: StudentGranularPermissions | null | undefined): boolean {
  if (!sp) return false;
  return Object.values(sp).some(Boolean);
}

export function isBlindQuestionAddOnly(cp: CourseGranularPermissions | null | undefined): boolean {
  if (!cp) return false;
  return !cp.canViewQuestions && cp.canAddQuestions;
}

export function getAllowedItemTypesForCourse(
  cp: CourseGranularPermissions | null | undefined
): Array<'video' | 'homework' | 'exam' | 'concept_sheet' | 'summary_pdf'> {
  if (!cp) return [];
  const types: Array<'video' | 'homework' | 'exam' | 'concept_sheet' | 'summary_pdf'> = [];
  if (cp.canAddVideos) types.push('video');
  if (cp.canAddHomework) types.push('homework');
  if (cp.canAddExams) types.push('exam');
  if (cp.canAddConceptSheets) types.push('concept_sheet');
  if (cp.canAddSummaries) types.push('summary_pdf');
  return types;
}

export function getItemTypePermissionKey(
  itemType: string
): keyof CourseGranularPermissions | null {
  switch (itemType) {
    case 'video':
      return 'canAddVideos';
    case 'homework':
      return 'canAddHomework';
    case 'exam':
      return 'canAddExams';
    case 'concept_sheet':
      return 'canAddConceptSheets';
    case 'summary_pdf':
      return 'canAddSummaries';
    default:
      return null;
  }
}
