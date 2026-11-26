'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowRight, BookOpen, Layers, Plus, Video, CheckSquare,
  FileText, Bookmark, FileSpreadsheet, Trash2, Edit3,
  Copy, Key, Users, Settings, Sparkles, CheckCircle2,
  X, AlertCircle, RefreshCw, Lock, ShieldCheck, Play, Download,
  ChevronDown, ChevronUp, Printer, Send,
  Search, CreditCard, Laptop,
  MessageCircle, Phone, Award, RotateCcw,
  ThumbsUp, AlertTriangle, CheckCircle, Clock,
  PhoneCall, ShieldAlert, Calendar, EyeOff, ArrowLeftRight
} from 'lucide-react';

import {
  fetchAllCourses,
  getCourseById,
  fetchUnitsByCourse,
  saveUnit,
  removeUnit,
  fetchItemsByUnit,
  saveUnitItem,
  removeUnitItem,
  copyItemToTargetCourse,
  convertOrCloneAssessment,
  fetchCodesByCourse,
  generateActivationCodes,
  deleteActivationCode,
  saveCourse,
  removeCourse,
  fetchCourseEnrolledStudents,
  fetchStudentProgressForTeacher,
  grantStudentExtraAttempts,
  resetStudentItemProgress,
  CourseData,
  UnitData,
  UnitItemData,
  ActivationCodeData,
  EnrolledStudentData,
  StudentAssessmentProgress
} from '@/lib/academicService';
import {
  autoFetchVideoDetails,
  obfuscateVideoIdentifier,
  deobfuscateVideoIdentifier,
} from '@/lib/videoService';
import {
  CourseGranularPermissions,
  DEFAULT_COURSE_PERMISSIONS,
  FULL_COURSE_PERMISSIONS,
  getAllowedItemTypesForCourse,
  getItemTypePermissionKey,
  normalizeCoursePermissions,
  isBlindQuestionAddOnly,
} from '@/lib/assistantPermissions';
import { sendMessage } from '@/lib/messagingService';
import { useAuth } from '@/context/AuthContext';
import SecuredVideoPlayer from '@/components/SecuredVideoPlayer';
import CoverImageSelector from '@/components/CoverImageSelector';
import PriceControlSelector from '@/components/PriceControlSelector';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';
import PdfResourceUploader from '@/components/PdfResourceUploader';
import ActivationRechargeCard from '@/components/ActivationRechargeCard';
import { detectLinkProvider } from '@/lib/storageService';

export interface CourseDetailManagerClientProps {
  courseId: string;
  mode: 'teacher' | 'assistant';
  basePath: '/teacher' | '/assistant';
  coursePerms?: CourseGranularPermissions;
  canSendMessages?: boolean;
  allowedTargetCourseIds?: string[] | null;
}

export default function CourseDetailManagerClient({
  courseId,
  mode,
  basePath,
  coursePerms,
  canSendMessages = false,
  allowedTargetCourseIds = null,
}: CourseDetailManagerClientProps) {
  const router = useRouter();
  const { currentUser } = useAuth();

  const isTeacher = mode === 'teacher';
  const cp: CourseGranularPermissions = isTeacher
    ? FULL_COURSE_PERMISSIONS
    : normalizeCoursePermissions(coursePerms, DEFAULT_COURSE_PERMISSIONS);
  const allowMessaging = isTeacher || Boolean(canSendMessages);
  const isBlindQuestions = !isTeacher && isBlindQuestionAddOnly(cp);
  const canConvertAssessments = isTeacher || cp.canConvertAssessments;

  const hasUnitsTabAccess =
    isTeacher ||
    cp.canManageUnits ||
    cp.canDeleteContent ||
    cp.canAddVideos ||
    cp.canAddHomework ||
    cp.canAddExams ||
    cp.canAddConceptSheets ||
    cp.canAddSummaries ||
    cp.canTransferContent ||
    cp.canConvertAssessments ||
    cp.canViewQuestions ||
    cp.canAddQuestions ||
    cp.canEditQuestions ||
    cp.canDeleteQuestions;

  const hasQuestionsBankTab =
    isTeacher ||
    cp.canViewQuestions ||
    cp.canAddQuestions ||
    cp.canEditQuestions ||
    cp.canDeleteQuestions;

  const hasCodesTab = isTeacher || cp.canGenerateCodes || cp.canDeleteCodes;
  const hasStudentsTab = isTeacher || cp.canViewCourseStudents || cp.canGrantExtraAttempts;
  const hasSettingsTab = isTeacher || cp.canEditCourseSettings;

  const allowedItemTypes = isTeacher
    ? (['video', 'homework', 'exam', 'concept_sheet', 'summary_pdf'] as const)
    : getAllowedItemTypesForCourse(cp);

  const firstAllowedTab: 'units' | 'questions_bank' | 'codes' | 'students' | 'settings' =
    hasUnitsTabAccess
      ? 'units'
      : hasQuestionsBankTab
      ? 'questions_bank'
      : hasCodesTab
      ? 'codes'
      : hasStudentsTab
      ? 'students'
      : 'settings';

  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'units' | 'questions_bank' | 'codes' | 'students' | 'settings'>(
    firstAllowedTab
  );

  // Sync activeTab if permissions resolve later
  useEffect(() => {
    if (
      (activeTab === 'units' && !hasUnitsTabAccess) ||
      (activeTab === 'questions_bank' && !hasQuestionsBankTab) ||
      (activeTab === 'codes' && !hasCodesTab) ||
      (activeTab === 'students' && !hasStudentsTab) ||
      (activeTab === 'settings' && !hasSettingsTab)
    ) {
      setActiveTab(firstAllowedTab);
    }
  }, [
    activeTab,
    firstAllowedTab,
    hasUnitsTabAccess,
    hasQuestionsBankTab,
    hasCodesTab,
    hasStudentsTab,
    hasSettingsTab,
  ]);

  // Main State
  const [course, setCourse] = useState<CourseData | null>(null);
  const [allCourses, setAllCourses] = useState<CourseData[]>([]);
  const [units, setUnits] = useState<UnitData[]>([]);
  const [unitItems, setUnitItems] = useState<{ [unitId: string]: UnitItemData[] }>({});
  const [codes, setCodes] = useState<ActivationCodeData[]>([]);
  const [loading, setLoading] = useState(true);

  // Toast Feedback
  const [toastBanner, setToastBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastBanner({ type, text });
    setTimeout(() => {
      setToastBanner((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  // Unit Modals
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<UnitData | null>(null);
  const [unitTitle, setUnitTitle] = useState('');
  const [unitDesc, setUnitDesc] = useState('');
  const [unitNumber, setUnitNumber] = useState(1);

  // Item Modals (Lessons / Video / Homework / Exam / Concepts)
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [targetUnitId, setTargetUnitId] = useState<string>('');
  const [editingItem, setEditingItem] = useState<UnitItemData | null>(null);
  const [itemType, setItemType] = useState<'video' | 'homework' | 'exam' | 'concept_sheet' | 'summary_pdf'>('video');
  const [itemTitle, setItemTitle] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [durationMinutes, setDurationMinutes] = useState<number | ''>('');
  const [totalMarks, setTotalMarks] = useState(100);
  const [passingScore, setPassingScore] = useState(60);
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [videoSourceType, setVideoSourceType] = useState<'internal_secured' | 'direct_youtube'>('internal_secured');
  const [videoUrl, setVideoUrl] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [isPrerequisite, setIsPrerequisite] = useState(true);
  const [isDetectingVideo, setIsDetectingVideo] = useState(false);
  const [videoDetectionMessage, setVideoDetectionMessage] = useState<string | null>(null);

  // Auto-detect video duration and details
  const handleAutoDetectVideo = async (urlToTest?: string) => {
    const targetUrl = urlToTest || videoUrl;
    if (!targetUrl.trim()) return;

    setIsDetectingVideo(true);
    setVideoDetectionMessage(null);
    try {
      const info = await autoFetchVideoDetails(targetUrl);
      if (info.videoId) {
        if (!itemTitle.trim() && info.title) {
          setItemTitle(info.title);
        }
        if (info.durationMinutes) {
          setDurationMinutes(info.durationMinutes);
        } else if (!durationMinutes) {
          setDurationMinutes('');
        }
        setVideoDetectionMessage(
          `تم التعرف بنجاح! المدة: ${info.durationMinutes || 'قيد التحديث'} دقيقة | ${info.title?.slice(0, 35) || 'محاضرة تعليمية'}`
        );
      }
    } catch {
      setVideoDetectionMessage('تم حفظ وتأمين معرّف الفيديو');
    } finally {
      setIsDetectingVideo(false);
    }
  };

  // Transfer / Copy Exam Modal
  const [activeExamItem, setActiveExamItem] = useState<UnitItemData | null>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferTargetCourseId, setTransferTargetCourseId] = useState('');
  const [transferTargetUnits, setTransferTargetUnits] = useState<UnitData[]>([]);
  const [transferTargetUnitId, setTransferTargetUnitId] = useState('');
  const [transferExamTitle, setTransferExamTitle] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferPromptNavigate, setTransferPromptNavigate] = useState<{
    href: string;
    label: string;
    description: string;
  } | null>(null);

  // Bidirectional Conversion / Independent Clone Modal (Exam <-> Homework)
  const [convertModalItem, setConvertModalItem] = useState<UnitItemData | null>(null);
  const [convertMode, setConvertMode] = useState<'convert_in_place' | 'keep_copy'>('keep_copy');
  const [convertNewTitle, setConvertNewTitle] = useState('');
  const [convertTargetCourseId, setConvertTargetCourseId] = useState('');
  const [convertTargetUnits, setConvertTargetUnits] = useState<UnitData[]>([]);
  const [convertTargetUnitId, setConvertTargetUnitId] = useState('');
  const [isConvertingAssessment, setIsConvertingAssessment] = useState(false);

  // Video Preview Modal
  const [previewVideoItem, setPreviewVideoItem] = useState<UnitItemData | null>(null);

  // Codes Generator & Management
  const [codesCount, setCodesCount] = useState<number>(10);
  const [codesBatchName, setCodesBatchName] = useState('دفعة سنتر النخبة');
  const [codeGenerationMode, setCodeGenerationMode] = useState<'general' | 'assigned_student'>('general');
  const [targetStudentName, setTargetStudentName] = useState('');
  const [targetStudentBirthDate, setTargetStudentBirthDate] = useState('');
  const [centerOrGroupName, setCenterOrGroupName] = useState('');
  const [codeSearchQuery, setCodeSearchQuery] = useState('');
  const [codeFilterStatus, setCodeFilterStatus] = useState<'all' | 'available' | 'used'>('all');
  const [codesViewMode, setCodesViewMode] = useState<'cards' | 'table'>('cards');
  const [isGeneratingCodes, setIsGeneratingCodes] = useState(false);
  const [generateSuccessMsg, setGenerateSuccessMsg] = useState<string | null>(null);

  // Enrolled Students & Assessment Tracking
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudentData[]>([]);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [studentFilterMethod, setStudentFilterMethod] = useState<'all' | 'activation_code' | 'fawry' | 'wallet' | 'free'>('all');
  const [studentStatusFilter, setStudentStatusFilter] = useState<'all' | 'critical' | 'warning' | 'excellent' | 'idle'>('all');
  const [expandedStudentAssessments, setExpandedStudentAssessments] = useState<Record<string, boolean>>({});
  const [attemptActionLoading, setAttemptActionLoading] = useState<Record<string, boolean>>({});
  const [messagingStudent, setMessagingStudent] = useState<{
    student: EnrolledStudentData;
    customMessage: string;
  } | null>(null);
  const [isSendingPlatformMessage, setIsSendingPlatformMessage] = useState(false);
  const [confirmResetTarget, setConfirmResetTarget] = useState<{
    studentId: string;
    itemId: string;
    itemTitle: string;
    maxAttempts: number;
  } | null>(null);

  const toggleStudentAssessments = (studentId: string) => {
    setExpandedStudentAssessments((prev) => ({
      ...prev,
      [studentId]: !prev[studentId],
    }));
  };

  const handleDirectGrantAttempt = async (
    studentId: string,
    itemId: string,
    extraAttempts: number = 1,
    resetCompletely: boolean = false
  ) => {
    if (!isTeacher && !cp.canGrantExtraAttempts) return;
    const actionKey = `${studentId}_${itemId}`;
    setAttemptActionLoading((prev) => ({ ...prev, [actionKey]: true }));
    try {
      const res = await grantStudentExtraAttempts(studentId, courseId, itemId, extraAttempts, resetCompletely);
      if (res.success) {
        showToast(res.message || 'تم تحديث محاولات الطالب بنجاح');
        const updatedList = await fetchCourseEnrolledStudents(courseId);
        setEnrolledStudents(updatedList);
        if (selectedStudentForAttempts && selectedStudentForAttempts.studentId === studentId) {
          const updatedStudent = updatedList.find((s) => s.studentId === studentId) || null;
          setSelectedStudentForAttempts(updatedStudent);
          const data = await fetchStudentProgressForTeacher(studentId, courseId);
          setStudentProgressList(data || []);
        }
      } else {
        showToast(res.message || 'تعذر تنفيذ العملية', 'error');
      }
    } catch (err) {
      console.error('handleDirectGrantAttempt error:', err);
      showToast('حدث خطأ أثناء تحديث المحاولات', 'error');
    } finally {
      setAttemptActionLoading((prev) => ({ ...prev, [actionKey]: false }));
    }
  };

  // Large Delete Confirmation Modal State
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'unit' | 'item' | 'code' | 'course';
    id: string;
    title: string;
    itemTypeLabel: string;
    warningNote?: string;
  } | null>(null);

  // Manage Student Attempts State
  const [selectedStudentForAttempts, setSelectedStudentForAttempts] = useState<EnrolledStudentData | null>(null);
  const [studentProgressList, setStudentProgressList] = useState<any[]>([]);
  const [loadingStudentProgress, setLoadingStudentProgress] = useState(false);
  const [actionInProgressItemId, setActionInProgressItemId] = useState<string | null>(null);
  const [attemptsActionFeedback, setAttemptsActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isDeletingTarget, setIsDeletingTarget] = useState(false);

  const openManageAttempts = async (student: EnrolledStudentData) => {
    setSelectedStudentForAttempts(student);
    setLoadingStudentProgress(true);
    setAttemptsActionFeedback(null);
    try {
      const data = await fetchStudentProgressForTeacher(student.studentId, courseId);
      setStudentProgressList(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStudentProgress(false);
    }
  };

  const handleGrantAttempt = async (itemProgress: any) => {
    if (!selectedStudentForAttempts || (!isTeacher && !cp.canGrantExtraAttempts)) return;
    const itemId = itemProgress.item_id || itemProgress.itemId;
    setActionInProgressItemId(itemId);
    setAttemptsActionFeedback(null);
    try {
      const res = await grantStudentExtraAttempts(
        selectedStudentForAttempts.studentId,
        courseId,
        itemId,
        1,
        false,
        isTeacher ? 'منح فرصة استثنائية من المعلم' : 'منح فرصة استثنائية من المساعد المختص'
      );
      if (res.success) {
        setAttemptsActionFeedback({ type: 'success', message: res.message });
        const updatedList = await fetchCourseEnrolledStudents(courseId);
        setEnrolledStudents(updatedList);
        const data = await fetchStudentProgressForTeacher(selectedStudentForAttempts.studentId, courseId);
        setStudentProgressList(data || []);
      } else {
        setAttemptsActionFeedback({ type: 'error', message: res.message || 'فشلت عملية منح المحاولة' });
      }
    } catch (err: any) {
      console.error(err);
      setAttemptsActionFeedback({ type: 'error', message: err?.message || 'حدث خطأ غير متوقع' });
    } finally {
      setActionInProgressItemId(null);
    }
  };

  const handleResetAttempts = async (itemProgress: any) => {
    if (!selectedStudentForAttempts || (!isTeacher && !cp.canGrantExtraAttempts)) return;
    const itemId = itemProgress.item_id || itemProgress.itemId;
    setActionInProgressItemId(itemId);
    setAttemptsActionFeedback(null);
    try {
      const res = await resetStudentItemProgress(
        selectedStudentForAttempts.studentId,
        courseId,
        itemId,
        isTeacher ? 'إعادة تعيين وتصفير المحاولات والدرجات بالكامل من المعلم' : 'إعادة تعيين المحاولات من المساعد المختص'
      );
      if (res.success) {
        setAttemptsActionFeedback({ type: 'success', message: res.message });
        const updatedList = await fetchCourseEnrolledStudents(courseId);
        setEnrolledStudents(updatedList);
        const data = await fetchStudentProgressForTeacher(selectedStudentForAttempts.studentId, courseId);
        setStudentProgressList(data || []);
      } else {
        setAttemptsActionFeedback({ type: 'error', message: res.message || 'فشلت إعادة التعيين' });
      }
    } catch (err: any) {
      console.error(err);
      setAttemptsActionFeedback({ type: 'error', message: err?.message || 'حدث خطأ غير متوقع' });
    } finally {
      setActionInProgressItemId(null);
    }
  };

  const filterCoursesForTransfer = (coursesList: CourseData[]) => {
    if (isTeacher || allowedTargetCourseIds === null) return coursesList;
    const allowedSet = new Set([...allowedTargetCourseIds, courseId]);
    return coursesList.filter((c) => allowedSet.has(c.id));
  };

  // Initial / Refresh Load
  const loadData = async () => {
    setLoading(true);
    let found = await getCourseById(courseId);
    const coursesList = await fetchAllCourses();
    setAllCourses(filterCoursesForTransfer(coursesList));
    if (!found) {
      found = coursesList.find((c) => c.id === courseId) || null;
    }
    if (!found) {
      setCourse(null);
      setLoading(false);
      return;
    }
    setCourse(found);

    const unitsList = await fetchUnitsByCourse(courseId);
    setUnits(unitsList);

    const itemsMap: { [unitId: string]: UnitItemData[] } = {};
    for (const u of unitsList) {
      const items = await fetchItemsByUnit(u.id);
      itemsMap[u.id] = items;
    }
    setUnitItems(itemsMap);

    if (hasCodesTab) {
      const codesList = await fetchCodesByCourse(courseId);
      setCodes(codesList);
    } else {
      setCodes([]);
    }

    if (hasStudentsTab) {
      const studentsList = await fetchCourseEnrolledStudents(courseId);
      setEnrolledStudents(studentsList);
    } else {
      setEnrolledStudents([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      let found = await getCourseById(courseId);
      const coursesList = await fetchAllCourses();
      if (!isMounted) return;
      const filteredTargets =
        isTeacher || allowedTargetCourseIds === null
          ? coursesList
          : coursesList.filter((c) => allowedTargetCourseIds.includes(c.id) || c.id === courseId);
      setAllCourses(filteredTargets);

      if (!found) {
        found = coursesList.find((c) => c.id === courseId) || null;
      }

      if (!found) {
        setCourse(null);
        setLoading(false);
        return;
      }
      setCourse(found);

      const unitsList = await fetchUnitsByCourse(courseId);
      if (!isMounted) return;
      setUnits(unitsList);

      const itemsMap: { [unitId: string]: UnitItemData[] } = {};
      for (const u of unitsList) {
        const items = await fetchItemsByUnit(u.id);
        itemsMap[u.id] = items;
      }
      if (!isMounted) return;
      setUnitItems(itemsMap);

      if (hasCodesTab) {
        const codesList = await fetchCodesByCourse(courseId);
        if (!isMounted) return;
        setCodes(codesList);
      }

      if (hasStudentsTab) {
        const studentsList = await fetchCourseEnrolledStudents(courseId);
        if (!isMounted) return;
        setEnrolledStudents(studentsList);
      }

      setLoading(false);
    };

    run();
    return () => {
      isMounted = false;
    };
  }, [courseId, isTeacher, hasCodesTab, hasStudentsTab, allowedTargetCourseIds]);

  // Unit handlers
  const handleOpenNewUnit = () => {
    if (!isTeacher && !cp.canManageUnits) return;
    setEditingUnit(null);
    setUnitTitle(`الوحدة ${units.length + 1}: `);
    setUnitDesc('');
    setUnitNumber(units.length + 1);
    setIsUnitModalOpen(true);
  };

  const handleOpenEditUnit = (unit: UnitData) => {
    if (!isTeacher && !cp.canManageUnits) return;
    setEditingUnit(unit);
    setUnitTitle(unit.title);
    setUnitDesc(unit.description || '');
    setUnitNumber(unit.unitNumber);
    setIsUnitModalOpen(true);
  };

  const handleSaveUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitTitle.trim() || (!isTeacher && !cp.canManageUnits)) return;

    try {
      await saveUnit({
        id: editingUnit?.id,
        courseId,
        unitNumber,
        title: unitTitle.trim(),
        description: unitDesc.trim(),
        orderIndex: unitNumber,
        isPublished: true,
      });

      setIsUnitModalOpen(false);
      await loadData();
      showToast(editingUnit ? 'تم تعديل الوحدة بنجاح' : 'تمت إضافة الوحدة الجديدة بنجاح');
    } catch (err: any) {
      showToast(err?.message || 'حدث خطأ أثناء حفظ الوحدة', 'error');
    }
  };

  // Delete Handlers with Confirmation Modal
  const requestDeleteUnit = (unit: UnitData) => {
    if (!isTeacher && !cp.canDeleteContent) return;
    setDeleteTarget({
      type: 'unit',
      id: unit.id,
      title: `الوحدة رقم (${unit.unitNumber}): ${unit.title}`,
      itemTypeLabel: 'الوحدة الدراسية بالكامل',
      warningNote: 'سيتم حذف هذه الوحدة وجميع الفيديوهات والامتحانات والواجبات والمذكرات التابعة لها بشكل نهائي.',
    });
  };

  const requestDeleteItem = (item: UnitItemData) => {
    if (!isTeacher && !cp.canDeleteContent) return;
    const typeLabel =
      item.itemType === 'video'
        ? 'فيديو الشرح'
        : item.itemType === 'homework'
        ? 'الواجب المنزلي'
        : item.itemType === 'exam'
        ? 'الامتحان الشامل'
        : item.itemType === 'concept_sheet'
        ? 'ورقة المفاهيم'
        : 'الملزمة والملخص';

    setDeleteTarget({
      type: 'item',
      id: item.id,
      title: item.title,
      itemTypeLabel: typeLabel,
      warningNote:
        item.itemType === 'exam' || item.itemType === 'homework'
          ? 'سيتم حذف هذا الامتحان وجميع أسئلته وبنك الأسئلة وإجابات الطلاب المسجلة عليه.'
          : 'سيتم إزالة هذا المحتوى نهائياً من قائمة دروس الطلاب في الكورس.',
    });
  };

  const requestDeleteCode = (code: ActivationCodeData) => {
    if (!isTeacher && !cp.canDeleteCodes) return;
    setDeleteTarget({
      type: 'code',
      id: code.id,
      title: `كود التفعيل: ${code.code} (${code.batchName || 'دفعة عامة'})`,
      itemTypeLabel: 'كود التفعيل',
      warningNote: 'لن يتمكن أي طالب من استخدام هذا الكود لتفعيل الكورس بعد الحذف.',
    });
  };

  const requestDeleteCourse = () => {
    if (!course || !isTeacher) return;
    setDeleteTarget({
      type: 'course',
      id: course.id,
      title: course.title,
      itemTypeLabel: 'الكورس التعليمي بالكامل',
      warningNote: 'تحذير هام جداً: سيتم حذف الكورس بجميع وحداته ودروسه وامتحاناته وأكواد تفعيله نهائياً من المنصة.',
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeletingTarget(true);
    try {
      if (deleteTarget.type === 'unit') {
        await removeUnit(deleteTarget.id);
        await loadData();
        showToast('تم حذف الوحدة بنجاح');
      } else if (deleteTarget.type === 'item') {
        await removeUnitItem(deleteTarget.id);
        await loadData();
        showToast('تم حذف العنصر بنجاح');
      } else if (deleteTarget.type === 'code') {
        await deleteActivationCode(deleteTarget.id);
        if (course) {
          const updated = await fetchCodesByCourse(course.id);
          setCodes(updated);
        }
        showToast('تم حذف كود التفعيل');
      } else if (deleteTarget.type === 'course' && isTeacher) {
        await removeCourse(deleteTarget.id);
        router.push(`${basePath}/courses`);
        return;
      }
    } catch (err: any) {
      console.error('Delete error:', err);
      showToast(err?.message || 'حدث خطأ أثناء تنفيذ الحذف', 'error');
    } finally {
      setIsDeletingTarget(false);
      setDeleteTarget(null);
    }
  };

  // Item handlers
  const handleOpenNewItem = (
    unitId: string,
    type: 'video' | 'homework' | 'exam' | 'concept_sheet' | 'summary_pdf'
  ) => {
    const key = getItemTypePermissionKey(type);
    if (!isTeacher && key && !cp[key]) return;
    setTargetUnitId(unitId);
    setEditingItem(null);
    setItemType(type);
    setItemTitle('');
    setItemDesc('');
    setDurationMinutes(type === 'exam' || type === 'homework' ? 30 : '');
    setTotalMarks(type === 'exam' ? 100 : type === 'homework' ? 20 : 0);
    setPassingScore(60);
    setMaxAttempts(3);
    setVideoSourceType('internal_secured');
    setVideoUrl('');
    setPdfUrl('');
    setIsPrerequisite(true);
    setVideoDetectionMessage(null);
    setIsItemModalOpen(true);
  };

  const handleOpenEditItem = (item: UnitItemData) => {
    const key = getItemTypePermissionKey(item.itemType);
    if (!isTeacher && key && !cp[key]) return;
    setTargetUnitId(item.unitId);
    setEditingItem(item);
    setItemType(item.itemType);
    setItemTitle(item.title);
    setItemDesc(item.description || '');
    setDurationMinutes(item.durationMinutes || '');
    setTotalMarks(item.totalMarks || 100);
    setPassingScore(item.passingScorePercentage || 60);
    setMaxAttempts(
      item.maxExamAttempts !== undefined && item.maxExamAttempts !== null && !isNaN(Number(item.maxExamAttempts))
        ? Math.max(1, Number(item.maxExamAttempts))
        : 3
    );
    setVideoSourceType(item.videoSourceType || 'internal_secured');
    setVideoUrl(item.directVideoUrl || deobfuscateVideoIdentifier(item.obfuscatedVideoId || '') || '');
    setPdfUrl(item.pdfAttachmentUrl || '');
    setIsPrerequisite(item.isPrerequisiteRequired);
    setVideoDetectionMessage(null);
    setIsItemModalOpen(true);
  };

  const handleSaveItem = async (e?: React.FormEvent, navigateToQuestions: boolean = false) => {
    if (e) e.preventDefault();
    if (!itemTitle.trim() || !targetUnitId) return;

    const securedObfuscatedId =
      itemType === 'video' && videoUrl ? obfuscateVideoIdentifier(videoUrl) : videoUrl;

    try {
      const saved = await saveUnitItem({
        id: editingItem?.id,
        unitId: targetUnitId,
        courseId,
        itemType,
        title: itemTitle.trim(),
        description: itemDesc.trim(),
        orderIndex: editingItem ? editingItem.orderIndex : Math.floor(Date.now() / 1000),
        durationMinutes:
          itemType === 'exam' || itemType === 'homework'
            ? durationMinutes === ''
              ? 30
              : Math.max(1, Number(durationMinutes))
            : durationMinutes === ''
            ? 0
            : Number(durationMinutes),
        totalMarks,
        passingScorePercentage: passingScore,
        maxExamAttempts: Math.max(1, Number(maxAttempts) || 3),
        videoSourceType,
        directVideoUrl: videoUrl,
        obfuscatedVideoId: securedObfuscatedId,
        pdfAttachmentUrl: pdfUrl,
        isPrerequisiteRequired: isPrerequisite,
      });

      setIsItemModalOpen(false);
      await loadData();
      showToast(
        `تم حفظ ${itemType === 'exam' ? 'الامتحان' : itemType === 'homework' ? 'الواجب' : 'المحتوى'} وتحديد ${
          maxAttempts >= 999 ? 'محاولات غير محدودة' : `${maxAttempts} محاولات`
        } بنجاح`
      );

      if (navigateToQuestions && (itemType === 'exam' || itemType === 'homework') && saved?.id && hasQuestionsBankTab) {
        router.push(`${basePath}/courses/${courseId}/items/${saved.id}`);
      }
    } catch (err: any) {
      console.error(err);
      const rawMsg = String(err?.message || '');
      if (rawMsg.includes('was not found on the server') || rawMsg.includes('Failed to find Server Action')) {
        showToast('تم تحديث ملفات المنصة على الخادم — يرجى تحديث الصفحة (F5) ثم إعادة الحفظ.', 'error');
      } else {
        showToast(rawMsg || 'حدث خطأ أثناء حفظ المحتوى', 'error');
      }
    }
  };

  // Question Bank handlers
  const handleOpenQuestionBank = async (item: UnitItemData) => {
    if (!hasQuestionsBankTab) return;
    router.push(`${basePath}/courses/${courseId}/items/${item.id}`);
  };

  // Transfer / Duplicate Item Modal
  const handleOpenTransferExam = (item: UnitItemData) => {
    if (!isTeacher && !cp.canTransferContent) return;
    setActiveExamItem(item);
    setTransferExamTitle(`${item.title} (نسخة منقولة)`);
    setTransferTargetCourseId(courseId);
    fetchUnitsByCourse(courseId).then((u) => {
      setTransferTargetUnits(u);
      if (u.length > 0) setTransferTargetUnitId(u[0].id);
      else setTransferTargetUnitId('');
    });
    setIsTransferModalOpen(true);
  };

  const handleExecuteTransfer = async () => {
    if (!activeExamItem || !transferTargetCourseId || !transferTargetUnitId) return;
    if (!isTeacher && !cp.canTransferContent) return;
    setIsTransferring(true);
    try {
      const copiedItem = await copyItemToTargetCourse(
        activeExamItem.id,
        transferTargetCourseId,
        transferTargetUnitId,
        transferExamTitle
      );
      setIsTransferring(false);
      setIsTransferModalOpen(false);
      await loadData();
      if (copiedItem) {
        if (activeExamItem.itemType === 'exam' || activeExamItem.itemType === 'homework') {
          setTransferPromptNavigate({
            href: `${basePath}/courses/${transferTargetCourseId}/items/${copiedItem.id}`,
            label: 'الانتقال لبنك أسئلة النسخة الجديدة',
            description: `تم نسخ ونقل ${activeExamItem.itemType === 'homework' ? 'الواجب' : 'الامتحان'} بجميع أسئلته ومحتواه بنجاح!`,
          });
        } else if (activeExamItem.itemType === 'video') {
          setTransferPromptNavigate({
            href: `${basePath}/courses/${transferTargetCourseId}`,
            label: 'الانتقال للكورس المستهدف',
            description: `تم نسخ ونقل الفيديو "${copiedItem.title}" إلى الكورس والوحدة المحددة بنجاح!`,
          });
        } else {
          showToast('تم نسخ ونقل المحتوى بنجاح');
        }
      }
    } catch (err: any) {
      console.error(err);
      setIsTransferring(false);
      showToast(err.message || 'حدث خطأ أثناء النسخ والنقل', 'error');
    }
  };

  // Bidirectional Conversion / Independent Clone Modal (Exam <-> Homework)
  const handleOpenConvertAssessment = (item: UnitItemData) => {
    if (!canConvertAssessments) return;
    if (item.itemType !== 'exam' && item.itemType !== 'homework') return;

    const targetLabel = item.itemType === 'exam' ? 'واجب' : 'امتحان';
    setConvertModalItem(item);
    setConvertMode('keep_copy');
    setConvertNewTitle(`${item.title} (نسخة ${targetLabel})`);
    setConvertTargetCourseId(courseId);
    setConvertTargetUnits(units);
    setConvertTargetUnitId(item.unitId || (units[0]?.id || ''));
  };

  const handleExecuteConvertAssessment = async () => {
    if (!convertModalItem || !canConvertAssessments) return;
    const targetType = convertModalItem.itemType === 'exam' ? 'homework' : 'exam';
    const targetLabel = targetType === 'homework' ? 'واجب منزلي' : 'امتحان شامل';

    setIsConvertingAssessment(true);
    try {
      const res = await convertOrCloneAssessment({
        sourceItemId: convertModalItem.id,
        targetType,
        mode: convertMode,
        newTitle: convertNewTitle.trim() || undefined,
        targetCourseId: convertMode === 'keep_copy' ? (convertTargetCourseId || courseId) : undefined,
        targetUnitId: convertMode === 'keep_copy' ? (convertTargetUnitId || convertModalItem.unitId) : undefined,
      });

      if (!res.success || !res.item) {
        showToast(res.error || 'تعذر تنفيذ التحويل أو النسخ', 'error');
        return;
      }

      setConvertModalItem(null);
      await loadData();

      const qCount = res.questionsCount ?? 0;
      if (convertMode === 'convert_in_place') {
        showToast(`تم التحويل التام إلى ${targetLabel} مع الحفاظ على (${qCount}) سؤال بالكامل.`);
      } else {
        showToast(`تم إنشاء ${targetLabel} مستقل (${qCount} سؤال) مع إبقاء الأصل كما هو.`);
        if (hasQuestionsBankTab) {
          setTransferPromptNavigate({
            href: `${basePath}/courses/${res.item.courseId || courseId}/items/${res.item.id}`,
            label: 'فتح بنك أسئلة النسخة المستقلة',
            description: `تم إنشاء "${res.item.title}" بنوع (${targetLabel}) وبنفس الأسئلة (${qCount} سؤال) بشكل مستقل تماماً عن الأصل.`,
          });
        }
      }
    } catch (err: any) {
      showToast(err?.message || 'حدث خطأ أثناء التحويل بين الامتحان والواجب', 'error');
    } finally {
      setIsConvertingAssessment(false);
    }
  };

  // Codes generator
  const handleGenerateCodes = async () => {
    if (!course || (!isTeacher && !cp.canGenerateCodes)) return;

    if (course.isFree || (course.price ?? 0) <= 0) {
      showToast('توليد كروت الشحن والأكواد متاح حصرياً للكورسات المدفوعة فقط.', 'error');
      return;
    }

    setIsGeneratingCodes(true);
    setGenerateSuccessMsg(null);
    try {
      const isPersonalized = codeGenerationMode === 'assigned_student' && targetStudentName.trim().length > 0;
      const count = isPersonalized ? 1 : Number(codesCount);
      const batchLabel = centerOrGroupName.trim() ? centerOrGroupName.trim() : codesBatchName.trim() || 'دفعة عامة';

      const newGenerated = await generateActivationCodes(course.id, count, batchLabel, {
        assignedStudentName: isPersonalized ? targetStudentName.trim() : undefined,
        studentBirthDate: isPersonalized && targetStudentBirthDate ? targetStudentBirthDate.trim() : undefined,
        assignedStudentBirthDate: isPersonalized && targetStudentBirthDate ? targetStudentBirthDate.trim() : undefined,
        centerOrGroup: centerOrGroupName.trim() || undefined,
        price: course.price,
        courseTitle: course.title,
      });

      setCodes((prev) => {
        const genIds = new Set(newGenerated.map((g) => g.id));
        return [...newGenerated, ...prev.filter((p) => !genIds.has(p.id))];
      });

      setGenerateSuccessMsg(
        isPersonalized
          ? `تم توليد كارت الشحن المخصص للطالب (${targetStudentName.trim()}) بنجاح`
          : `تم توليد عدد (${count}) كود شحن بنجاح`
      );

      if (isPersonalized) {
        setTargetStudentName('');
        setTargetStudentBirthDate('');
      }
    } catch (err: any) {
      console.error('Error generating codes:', err);
      showToast(err?.message || 'حدث خطأ أثناء توليد الأكواد', 'error');
    } finally {
      setIsGeneratingCodes(false);
    }
  };

  const handleSendPlatformMessageToStudent = async () => {
    if (!messagingStudent || !messagingStudent.customMessage.trim() || !allowMessaging) return;
    setIsSendingPlatformMessage(true);
    try {
      await sendMessage({
        senderId: currentUser?.id || (isTeacher ? 'teacher' : 'assistant-staff'),
        senderName: currentUser?.fullName || (isTeacher ? 'مستر محمد رضوان' : 'فريق المساعدين'),
        senderRole: isTeacher ? 'teacher' : 'assistant',
        recipientStudentId: messagingStudent.student.studentId,
        recipientStudentName: messagingStudent.student.studentName,
        isBroadcast: false,
        title: `توجيه بخصوص كورس: ${course?.title || 'اللغة الإنجليزية'}`,
        content: messagingStudent.customMessage.trim(),
      });
      showToast(`تم إرسال التوجيه إلى صندوق رسائل الطالب (${messagingStudent.student.studentName}) بنجاح`);
      setMessagingStudent(null);
    } catch (err: any) {
      showToast(err?.message || 'تعذر إرسال الرسالة الداخلية', 'error');
    } finally {
      setIsSendingPlatformMessage(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin mx-auto" />
        <p className="text-slate-500 font-bold">جاري تحميل تفاصيل الكورس ومحتوياته...</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="w-16 h-16 bg-rose-100 dark:bg-rose-500/10 text-rose-600 rounded-3xl flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">الكورس غير موجود</h2>
        <p className="text-slate-500 font-bold">ربما تم حذف هذا الكورس أو أن الرابط غير صحيح.</p>
        <Link
          href={`${basePath}/courses`}
          className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-bold rounded-2xl"
        >
          <ArrowRight className="w-4 h-4" />
          العودة لقائمة الكورسات
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <Link
              href={`${basePath}/courses`}
              className="p-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl transition-colors shrink-0 mt-1"
            >
              <ArrowRight className="w-5 h-5" />
            </Link>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                <span className="text-emerald-700 dark:text-emerald-400 font-black">
                  {course.stage === 'high' ? 'المرحلة الثانوية' : 'المرحلة الإعدادية'}
                </span>
                <span aria-hidden="true">·</span>
                <span className="text-teal-700 dark:text-teal-400 font-black">الصف {course.grade}</span>
                <span aria-hidden="true">·</span>
                <span>
                  {course.educationType === 'general'
                    ? 'عام'
                    : course.educationType === 'azhar'
                    ? 'أزهر'
                    : course.educationType === 'arabic'
                    ? 'عربي'
                    : 'لغات'}
                </span>
                <span aria-hidden="true">·</span>
                <span className={course.isPublished ? 'text-emerald-600 dark:text-emerald-400 font-black' : 'text-amber-600 dark:text-amber-400 font-black'}>
                  {course.isPublished ? 'منشور للطلاب' : 'مسودة مغلقة'}
                </span>
                {isBlindQuestions && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-black">
                      <EyeOff className="w-3.5 h-3.5" />
                      وضع الإضافة العمياء للأسئلة
                    </span>
                  </>
                )}
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">
                {course.title}
              </h1>
              {course.description && (
                <p className="text-slate-600 dark:text-slate-400 font-medium text-sm max-w-3xl">
                  {course.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {(isTeacher || cp.canManageUnits) && (
              <button
                onClick={handleOpenNewUnit}
                className="flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-200 dark:shadow-none transition-all hover:-translate-y-0.5 whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                إضافة وحدة / يونت جديدة
              </button>
            )}
            {hasSettingsTab && (
              <button
                onClick={() => setActiveTab('settings')}
                className="p-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-2xl transition-colors"
                title="إعدادات الكورس"
              >
                <Settings className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs (Strictly Zero-Exposure) */}
        <div className="flex items-center gap-2 overflow-x-auto border-t border-slate-100 dark:border-slate-800 pt-4 scrollbar-none">
          {hasUnitsTabAccess && (
            <button
              onClick={() => setActiveTab('units')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-sm whitespace-nowrap shrink-0 transition-all ${
                activeTab === 'units'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200 dark:shadow-none'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span className="tabular-nums">الوحدات والدروس ({units.length})</span>
            </button>
          )}

          {hasQuestionsBankTab && (
            <button
              onClick={() => setActiveTab('questions_bank')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-sm whitespace-nowrap shrink-0 transition-all ${
                activeTab === 'questions_bank'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200 dark:shadow-none'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>{isBlindQuestions ? 'إضافة أسئلة (إضافة عمياء)' : 'بنك الامتحانات والأسئلة'}</span>
            </button>
          )}

          {hasCodesTab && (
            <button
              onClick={() => setActiveTab('codes')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-sm whitespace-nowrap shrink-0 transition-all ${
                activeTab === 'codes'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200 dark:shadow-none'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Key className="w-4 h-4" />
              <span className="tabular-nums">
                {isTeacher || cp.canGenerateCodes ? `توليد وطباعة الأكواد (${codes.length})` : `أكواد التفعيل (${codes.length})`}
              </span>
            </button>
          )}

          {hasStudentsTab && (
            <button
              onClick={() => setActiveTab('students')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-sm whitespace-nowrap shrink-0 transition-all ${
                activeTab === 'students'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200 dark:shadow-none'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span className="tabular-nums">الطلاب المشتركون ({enrolledStudents.length})</span>
            </button>
          )}

          {hasSettingsTab && (
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-sm whitespace-nowrap shrink-0 transition-all ${
                activeTab === 'settings'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200 dark:shadow-none'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>تعديل بيانات الكورس</span>
            </button>
          )}
        </div>
      </div>

      {/* Transfer Follow-up Navigation Banner */}
      {transferPromptNavigate && (
        <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-emerald-900 dark:text-emerald-100 text-sm font-bold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{transferPromptNavigate.description}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={transferPromptNavigate.href}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-colors"
            >
              {transferPromptNavigate.label}
            </Link>
            <button
              type="button"
              onClick={() => setTransferPromptNavigate(null)}
              className="p-2 rounded-xl text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* TAB 1: UNITS & LESSONS */}
      {activeTab === 'units' && hasUnitsTabAccess && (
        <div className="space-y-6">
          {units.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center shadow-sm">
              <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Layers className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">
                لا توجد وحدات (Units) في هذا الكورس بعد
              </h3>
              <p className="text-slate-500 font-bold max-w-md mx-auto mb-6 text-sm">
                يمكنك إضافة وحدة أولى ثم إضافة فيديوهات الشرح والواجبات والامتحانات ومذكرات المفاهيم داخلها.
              </p>
              {(isTeacher || cp.canManageUnits) && (
                <button
                  onClick={handleOpenNewUnit}
                  className="inline-flex items-center gap-2 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-lg shadow-emerald-200 dark:shadow-none transition-all"
                >
                  <Plus className="w-5 h-5" />
                  إضافة الوحدة الأولى الآن
                </button>
              )}
            </div>
          ) : (
            units.map((unit) => {
              const items = unitItems[unit.id] || [];
              return (
                <div
                  key={unit.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm space-y-4 p-6 md:p-8"
                >
                  {/* Unit Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-600 text-white rounded-2xl flex items-center justify-center font-black text-base shadow-sm tabular-nums">
                        {unit.unitNumber}
                      </div>
                      <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                          {unit.title}
                        </h2>
                        {unit.description && (
                          <p className="text-xs text-slate-500 font-bold mt-0.5">{unit.description}</p>
                        )}
                      </div>
                    </div>

                    {(isTeacher || cp.canManageUnits || cp.canDeleteContent) && (
                      <div className="flex items-center gap-2">
                        {(isTeacher || cp.canManageUnits) && (
                          <button
                            onClick={() => handleOpenEditUnit(unit)}
                            className="p-2 text-slate-400 hover:text-emerald-600 transition-colors"
                            title="تعديل اسم الوحدة"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}
                        {(isTeacher || cp.canDeleteContent) && (
                          <button
                            onClick={() => requestDeleteUnit(unit)}
                            className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                            title="حذف الوحدة"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Items List Inside Unit */}
                  <div className="space-y-3">
                    {items.length === 0 ? (
                      <div className="py-6 px-4 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
                        <p className="text-slate-400 text-xs font-bold mb-1">
                          لا توجد عناصر مضافة في هذه الوحدة حتى الآن.
                        </p>
                      </div>
                    ) : (
                      items.map((item, idx) => {
                        const permKey = getItemTypePermissionKey(item.itemType);
                        const canEditThisItem = isTeacher || Boolean(permKey && cp[permKey]);

                        return (
                          <div
                            key={item.id}
                            className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-emerald-500/40 transition-colors group"
                          >
                            <div className="flex items-center gap-3.5">
                              <span className="w-7 h-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-black text-xs rounded-xl flex items-center justify-center tabular-nums">
                                {idx + 1}
                              </span>

                              {/* Item Type Icon */}
                              <div
                                className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm text-white"
                                style={{
                                  backgroundColor:
                                    item.itemType === 'video'
                                      ? '#059669'
                                      : item.itemType === 'homework'
                                      ? '#0284c7'
                                      : item.itemType === 'exam'
                                      ? '#d97706'
                                      : item.itemType === 'concept_sheet'
                                      ? '#7c3aed'
                                      : '#0d9488',
                                }}
                              >
                                {item.itemType === 'video' && <Video className="w-5 h-5" />}
                                {item.itemType === 'homework' && <CheckSquare className="w-5 h-5" />}
                                {item.itemType === 'exam' && <FileText className="w-5 h-5" />}
                                {item.itemType === 'concept_sheet' && <Bookmark className="w-5 h-5" />}
                                {item.itemType === 'summary_pdf' && <FileSpreadsheet className="w-5 h-5" />}
                              </div>

                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-black text-slate-900 dark:text-white text-base">
                                    {item.title}
                                  </span>
                                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                    {item.itemType === 'video'
                                      ? 'فيديو شرح'
                                      : item.itemType === 'homework'
                                      ? 'واجب منزلي'
                                      : item.itemType === 'exam'
                                      ? 'امتحان شامل'
                                      : item.itemType === 'concept_sheet'
                                      ? 'ورقة مفاهيم'
                                      : 'ملازم وملخصات'}
                                  </span>
                                  {item.isPrerequisiteRequired && (
                                    <span className="text-[11px] font-black text-amber-600 dark:text-amber-400 inline-flex items-center gap-1">
                                      <Lock className="w-3 h-3" />
                                      تتابع إجباري
                                    </span>
                                  )}
                                </div>
                                {item.description && (
                                  <p className="text-xs text-slate-500 font-medium line-clamp-1 mt-0.5">
                                    {item.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="flex items-center gap-2 shrink-0 flex-wrap">
                              {/* Video Preview & Transfer */}
                              {item.itemType === 'video' && (
                                <div className="flex items-center gap-1.5">
                                  <Link
                                    href={`/watch/${courseId}/${item.id}`}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-400 font-bold text-xs rounded-xl transition-colors whitespace-nowrap"
                                  >
                                    <Play className="w-3.5 h-3.5" />
                                    <span>فتح المشغل</span>
                                  </Link>
                                  {(isTeacher || cp.canTransferContent) && (
                                    <button
                                      onClick={() => handleOpenTransferExam(item)}
                                      className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-emerald-500/10 text-slate-700 hover:text-emerald-600 dark:text-slate-300 dark:hover:text-emerald-400 font-bold text-xs rounded-xl transition-all whitespace-nowrap"
                                      title="نسخ ونقل هذا الفيديو لكورس أو وحدة أخرى"
                                    >
                                      <Copy className="w-3.5 h-3.5" />
                                      <span className="hidden md:inline">نسخ ونقل</span>
                                    </button>
                                  )}
                                </div>
                              )}

                              {/* Exam / Homework Question Bank, Bidirectional Convert/Clone & Export */}
                              {(item.itemType === 'exam' || item.itemType === 'homework') && (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {hasQuestionsBankTab && (
                                    <button
                                      onClick={() => handleOpenQuestionBank(item)}
                                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs rounded-xl shadow-sm transition-all whitespace-nowrap"
                                      title="فتح بنك الأسئلة"
                                    >
                                      {isBlindQuestions ? <EyeOff className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                                      <span>
                                        {isBlindQuestions
                                          ? 'إضافة أسئلة (وضع أعمى)'
                                          : item.itemType === 'exam'
                                          ? 'بنك أسئلة الامتحان'
                                          : 'بنك أسئلة الواجب'}
                                      </span>
                                    </button>
                                  )}
                                  {canConvertAssessments && (
                                    <button
                                      onClick={() => handleOpenConvertAssessment(item)}
                                      className="flex items-center gap-1 px-2.5 py-1.5 bg-violet-50 hover:bg-violet-100 dark:bg-violet-500/15 dark:hover:bg-violet-500/25 text-violet-700 dark:text-violet-300 border border-violet-200/80 dark:border-violet-700/60 font-black text-xs rounded-xl transition-all whitespace-nowrap"
                                      title={item.itemType === 'exam' ? 'تحويل أو نسخ هذا الامتحان كواجب' : 'تحويل أو نسخ هذا الواجب كامتحان'}
                                    >
                                      <ArrowLeftRight className="w-3.5 h-3.5" />
                                      <span>{item.itemType === 'exam' ? 'تحويل / نسخ كواجب' : 'تحويل / نسخ كامتحان'}</span>
                                    </button>
                                  )}
                                  {(isTeacher || cp.canTransferContent) && (
                                    <button
                                      onClick={() => handleOpenTransferExam(item)}
                                      className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-emerald-500/10 text-slate-700 hover:text-emerald-600 dark:text-slate-300 dark:hover:text-emerald-400 font-bold text-xs rounded-xl transition-all whitespace-nowrap"
                                      title={`نسخ ونقل ${item.itemType === 'homework' ? 'الواجب' : 'الامتحان'} لكورس أو وحدة أخرى`}
                                    >
                                      <Copy className="w-3.5 h-3.5" />
                                      <span className="hidden md:inline">نسخ ونقل</span>
                                    </button>
                                  )}
                                </div>
                              )}

                              {/* PDF View & Transfer */}
                              {(item.itemType === 'concept_sheet' || item.itemType === 'summary_pdf') && (
                                <div className="flex items-center gap-1.5">
                                  {item.pdfAttachmentUrl &&
                                    (() => {
                                      const provider = detectLinkProvider(item.pdfAttachmentUrl);
                                      return (
                                        <a
                                          href={item.pdfAttachmentUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className={`flex items-center gap-1.5 px-3 py-1.5 font-bold text-xs rounded-xl transition-colors whitespace-nowrap ${
                                            provider === 'mediafire'
                                              ? 'bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40'
                                              : provider === 'drive'
                                              ? 'bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40'
                                              : 'bg-purple-50 dark:bg-purple-500/10 hover:bg-purple-100 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800/40'
                                          }`}
                                        >
                                          <Download className="w-3.5 h-3.5" />
                                          <span>
                                            {provider === 'mediafire' ? 'MediaFire' : provider === 'drive' ? 'Drive' : 'عرض الملف'}
                                          </span>
                                        </a>
                                      );
                                    })()}
                                  {(isTeacher || cp.canTransferContent) && (
                                    <button
                                      onClick={() => handleOpenTransferExam(item)}
                                      className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-emerald-500/10 text-slate-700 hover:text-emerald-600 dark:text-slate-300 dark:hover:text-emerald-400 font-bold text-xs rounded-xl transition-all whitespace-nowrap"
                                      title="نسخ ونقل هذا الملف لكورس أو وحدة أخرى"
                                    >
                                      <Copy className="w-3.5 h-3.5" />
                                      <span className="hidden md:inline">نسخ ونقل</span>
                                    </button>
                                  )}
                                </div>
                              )}

                              {canEditThisItem && (
                                <button
                                  onClick={() => handleOpenEditItem(item)}
                                  className="p-2 text-slate-400 hover:text-emerald-600 transition-colors"
                                  title="تعديل العنصر"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                              )}

                              {(isTeacher || cp.canDeleteContent) && (
                                <button
                                  onClick={() => requestDeleteItem(item)}
                                  className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                                  title="حذف العنصر"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Add Items Action Bar (Zero-Exposure Filtered) */}
                  {allowedItemTypes.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-xs font-black text-slate-500 pl-2">إضافة إلى هذه الوحدة:</span>

                      {allowedItemTypes.includes('video') && (
                        <button
                          onClick={() => handleOpenNewItem(unit.id, 'video')}
                          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-black text-xs rounded-xl transition-colors whitespace-nowrap"
                        >
                          <Video className="w-3.5 h-3.5" />
                          + فيديو شرح
                        </button>
                      )}

                      {allowedItemTypes.includes('homework') && (
                        <button
                          onClick={() => handleOpenNewItem(unit.id, 'homework')}
                          className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-50 dark:bg-sky-500/10 hover:bg-sky-100 dark:hover:bg-sky-500/20 text-sky-700 dark:text-sky-400 font-black text-xs rounded-xl transition-colors whitespace-nowrap"
                        >
                          <CheckSquare className="w-3.5 h-3.5" />
                          + واجب منزلي
                        </button>
                      )}

                      {allowedItemTypes.includes('exam') && (
                        <button
                          onClick={() => handleOpenNewItem(unit.id, 'exam')}
                          className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-black text-xs rounded-xl transition-colors whitespace-nowrap"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          + امتحان شامل
                        </button>
                      )}

                      {allowedItemTypes.includes('concept_sheet') && (
                        <button
                          onClick={() => handleOpenNewItem(unit.id, 'concept_sheet')}
                          className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-50 dark:bg-purple-500/10 hover:bg-purple-100 dark:hover:bg-purple-500/20 text-purple-700 dark:text-purple-400 font-black text-xs rounded-xl transition-colors whitespace-nowrap"
                        >
                          <Bookmark className="w-3.5 h-3.5" />
                          + ورقة مفاهيم
                        </button>
                      )}

                      {allowedItemTypes.includes('summary_pdf') && (
                        <button
                          onClick={() => handleOpenNewItem(unit.id, 'summary_pdf')}
                          className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-50 dark:bg-teal-500/10 hover:bg-teal-100 dark:hover:bg-teal-500/20 text-teal-700 dark:text-teal-400 font-black text-xs rounded-xl transition-colors whitespace-nowrap"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          + ملازم الكورس
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: QUESTIONS BANK & EXAMS OVERVIEW */}
      {activeTab === 'questions_bank' && hasQuestionsBankTab && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-600" />
                {isBlindQuestions ? 'إضافة أسئلة جديدة للامتحانات والواجبات (وضع أعمى)' : 'بنك الامتحانات والواجبات في هذا الكورس'}
              </h2>
              <p className="text-xs text-slate-500 font-bold">
                {isBlindQuestions
                  ? 'يمكنك إنشاء وإرسال أسئلة جديدة مباشرة دون الاطلاع على الأسئلة المحفوظة مسبقاً.'
                  : 'إدارة الأسئلة، خيارات الإجابة، الشروحات، ونسخ الامتحانات بين الكورسات.'}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {units.flatMap((u) => (unitItems[u.id] || []).filter((i) => i.itemType === 'exam' || i.itemType === 'homework'))
              .length === 0 ? (
              <div className="py-12 text-center text-slate-400 font-bold text-sm">
                لا توجد امتحانات أو واجبات مضافة بعد في هذا الكورس.
              </div>
            ) : (
              units
                .flatMap((u) => (unitItems[u.id] || []).filter((i) => i.itemType === 'exam' || i.itemType === 'homework'))
                .map((testItem) => (
                  <div
                    key={testItem.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl"
                  >
                    <div>
                      <span className="text-xs font-black text-amber-700 dark:text-amber-400 mb-1 inline-block">
                        {testItem.itemType === 'exam' ? 'امتحان رئيسي' : 'واجب إلكتروني'}
                      </span>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white">{testItem.title}</h3>
                      <p className="text-xs text-slate-500 font-medium mt-0.5 tabular-nums">
                        درجة النجاح: {testItem.passingScorePercentage}% · الدرجة الكلية: {testItem.totalMarks} درجة · عدد المحاولات:{' '}
                        {testItem.maxExamAttempts !== undefined && testItem.maxExamAttempts !== null
                          ? testItem.maxExamAttempts
                          : 3}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <button
                        onClick={() => handleOpenQuestionBank(testItem)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all whitespace-nowrap"
                      >
                        {isBlindQuestions ? 'إضافة أسئلة جديدة (وضع أعمى)' : 'إدارة بنك الأسئلة'}
                      </button>
                      {canConvertAssessments && (
                        <button
                          onClick={() => handleOpenConvertAssessment(testItem)}
                          className="px-3.5 py-2 bg-violet-50 hover:bg-violet-100 dark:bg-violet-500/15 dark:hover:bg-violet-500/25 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-700/60 font-black text-xs rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap"
                        >
                          <ArrowLeftRight className="w-3.5 h-3.5" />
                          <span>{testItem.itemType === 'exam' ? 'تحويل / نسخ كواجب' : 'تحويل / نسخ كامتحان'}</span>
                        </button>
                      )}
                      {(isTeacher || cp.canTransferContent) && (
                        <button
                          onClick={() => handleOpenTransferExam(testItem)}
                          className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all flex items-center gap-1 whitespace-nowrap"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          نسخ لكورس آخر
                        </button>
                      )}
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: CODES GENERATOR & PRINTABLE VOUCHERS */}
      {activeTab === 'codes' && hasCodesTab && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
            {/* Header with Stats */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Key className="w-5 h-5 text-emerald-600" />
                  توليد وطباعة كروت وأكواد شحن الكورس
                </h2>
                <p className="text-xs text-slate-500 font-bold mt-1">
                  كروت شحن معتمدة صالحة للتفعيل وبحد أقصى (
                  {(course.maxDevices ?? 3) >= 1000 ? 'غير محدود من الأجهزة' : `${course.maxDevices ?? 3} أجهزة`}).
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs font-black tabular-nums">
                <span className="text-slate-600 dark:text-slate-300">
                  الإجمالي: <strong className="text-emerald-600 dark:text-emerald-400">{codes.length}</strong>
                </span>
                <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">|</span>
                <span className="text-emerald-700 dark:text-emerald-400">
                  متاح: {codes.filter((c) => !c.isUsed).length}
                </span>
                <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">|</span>
                <span className="text-slate-500 dark:text-slate-400">
                  مستخدم: {codes.filter((c) => c.isUsed).length}
                </span>
                <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">|</span>
                <span className="text-amber-700 dark:text-amber-400">
                  مخصص: {codes.filter((c) => c.assignedStudentName).length}
                </span>
              </div>
            </div>

            {/* Generator Section — Zero-Exposure Gated */}
            {(isTeacher || cp.canGenerateCodes) && (
              <>
                {course.isFree || (course.price ?? 0) <= 0 ? (
                  <div className="no-print p-6 rounded-3xl bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-500/30 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-xs">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                      هذا الكورس مجاني ومتاح لجميع الطلاب بدون أكواد أو كروت شحن
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-bold max-w-xl mx-auto leading-relaxed">
                      توليد كروت الشحن والأكواد الرقمية مخصص حصرياً للكورسات المدفوعة فقط.
                    </p>
                  </div>
                ) : (
                  <div className="no-print bg-slate-50 dark:bg-slate-950 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-emerald-600" />
                        خيارات توليد الكروت والأكواد:
                      </span>

                      <div className="inline-flex p-1 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold">
                        <button
                          type="button"
                          onClick={() => setCodeGenerationMode('general')}
                          className={`px-3.5 py-1.5 rounded-xl transition-all ${
                            codeGenerationMode === 'general'
                              ? 'bg-emerald-600 text-white shadow-xs font-black'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          دفعة عامة للسنتر / الدفعة
                        </button>
                        <button
                          type="button"
                          onClick={() => setCodeGenerationMode('assigned_student')}
                          className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1 ${
                            codeGenerationMode === 'assigned_student'
                              ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          <span>كود مخصص لاسم وتاريخ ميلاد طالب</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                      {codeGenerationMode === 'assigned_student' ? (
                        <>
                          <div className="sm:col-span-4">
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                              اسم الطالب المخصص له الكود <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={targetStudentName}
                              onChange={(e) => setTargetStudentName(e.target.value)}
                              placeholder="مثال: أحمد محمود محمد علي"
                              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700/60 rounded-xl font-bold text-sm text-slate-900 dark:text-white focus:outline-hidden focus:border-amber-500"
                            />
                          </div>

                          <div className="sm:col-span-3">
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-teal-600" />
                              <span>تاريخ ميلاد الطالب</span>
                            </label>
                            <input
                              type="date"
                              value={targetStudentBirthDate}
                              onChange={(e) => setTargetStudentBirthDate(e.target.value)}
                              className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-teal-300 dark:border-teal-700/60 rounded-xl font-bold text-sm text-slate-900 dark:text-white focus:outline-hidden focus:border-teal-500"
                            />
                          </div>

                          <div className="sm:col-span-3">
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                              السنتر / المجموعة (اختياري)
                            </label>
                            <input
                              type="text"
                              value={centerOrGroupName}
                              onChange={(e) => setCenterOrGroupName(e.target.value)}
                              placeholder="مثال: سنتر الأهرام"
                              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-sm text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                            />
                          </div>

                          <div className="sm:col-span-2 flex items-end">
                            <button
                              onClick={handleGenerateCodes}
                              disabled={isGeneratingCodes || !targetStudentName.trim()}
                              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-black text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
                            >
                              {isGeneratingCodes ? (
                                <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                              ) : (
                                <>
                                  <Sparkles className="w-4 h-4" />
                                  توليد كارت الطالب
                                </>
                              )}
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="sm:col-span-3">
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                              عدد الأكواد المطلوبة
                            </label>
                            <select
                              value={codesCount}
                              onChange={(e) => setCodesCount(Number(e.target.value))}
                              className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-sm text-slate-900 dark:text-white focus:outline-hidden"
                            >
                              <option value={1}>كود واحد (1)</option>
                              <option value={5}>5 أكواد</option>
                              <option value={10}>10 أكواد</option>
                              <option value={20}>20 كود</option>
                              <option value={50}>50 كود</option>
                              <option value={100}>100 كود</option>
                            </select>
                          </div>

                          <div className="sm:col-span-6">
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                              السنتر أو المجموعة (اختياري للتمييز)
                            </label>
                            <input
                              type="text"
                              value={centerOrGroupName}
                              onChange={(e) => setCenterOrGroupName(e.target.value)}
                              placeholder="مثال: سنتر الأهرام / دفعة شهر أكتوبر"
                              className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-sm text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                            />
                          </div>

                          <div className="sm:col-span-3 flex items-end">
                            <button
                              onClick={handleGenerateCodes}
                              disabled={isGeneratingCodes}
                              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              {isGeneratingCodes ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              ) : (
                                <>
                                  <Sparkles className="w-4 h-4" />
                                  توليد الأكواد الآن
                                </>
                              )}
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    {generateSuccessMsg && (
                      <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center justify-between">
                        <span>{generateSuccessMsg}</span>
                        <button onClick={() => setGenerateSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-800">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Management & Filter Toolbar */}
            <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[220px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={codeSearchQuery}
                    onChange={(e) => setCodeSearchQuery(e.target.value)}
                    placeholder="بحث بالكود أو اسم الطالب أو السنتر..."
                    className="w-full pr-8 pl-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white border border-transparent focus:border-emerald-500 focus:outline-hidden"
                  />
                  {codeSearchQuery && (
                    <button
                      onClick={() => setCodeSearchQuery('')}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1 text-xs font-bold tabular-nums">
                  <button
                    onClick={() => setCodeFilterStatus('all')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      codeFilterStatus === 'all'
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-black'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    الكل ({codes.length})
                  </button>
                  <button
                    onClick={() => setCodeFilterStatus('available')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      codeFilterStatus === 'available'
                        ? 'bg-emerald-600 text-white font-black'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    المتاحة ({codes.filter((c) => !c.isUsed).length})
                  </button>
                  <button
                    onClick={() => setCodeFilterStatus('used')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      codeFilterStatus === 'used'
                        ? 'bg-slate-700 text-white font-black'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    المستخدمة ({codes.filter((c) => c.isUsed).length})
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="inline-flex p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setCodesViewMode('cards')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      codesViewMode === 'cards'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    كروت VIP
                  </button>
                  <button
                    type="button"
                    onClick={() => setCodesViewMode('table')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      codesViewMode === 'table'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    جدول
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => window.print()}
                  disabled={codes.length === 0}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50 whitespace-nowrap"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة كروت الشحن (A4)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const available = codes
                      .filter((c) => !c.isUsed)
                      .map((c) => {
                        return `${c.code}${c.assignedStudentName ? ` (طالب: ${c.assignedStudentName})` : ''}${
                          c.centerOrGroup ? ` [${c.centerOrGroup}]` : ''
                        }`;
                      })
                      .join('\n');
                    if (!available) {
                      showToast('لا توجد أكواد متاحة للشحن حالياً للنسخ.', 'error');
                      return;
                    }
                    navigator.clipboard.writeText(available);
                    showToast(`تم نسخ (${codes.filter((c) => !c.isUsed).length}) كود متاح إلى الحافظة بنجاح`);
                  }}
                  disabled={codes.length === 0}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50 whitespace-nowrap"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>نسخ الأكواد كنص</span>
                </button>
              </div>
            </div>

            {(() => {
              const filteredCodes = codes.filter((c) => {
                const matchesStatus =
                  codeFilterStatus === 'all' ? true : codeFilterStatus === 'available' ? !c.isUsed : Boolean(c.isUsed);

                const q = codeSearchQuery.trim().toLowerCase();
                const matchesQuery = !q
                  ? true
                  : c.code.toLowerCase().includes(q) ||
                    (c.assignedStudentName && c.assignedStudentName.toLowerCase().includes(q)) ||
                    (c.centerOrGroup && c.centerOrGroup.toLowerCase().includes(q)) ||
                    (c.batchName && c.batchName.toLowerCase().includes(q)) ||
                    (c.usedByStudentName && c.usedByStudentName.toLowerCase().includes(q));

                return matchesStatus && matchesQuery;
              });

              if (filteredCodes.length === 0) {
                return (
                  <div className="py-12 text-center text-slate-400 font-bold text-xs bg-slate-50 dark:bg-slate-950/60 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                    {codes.length === 0
                      ? 'لا توجد أكواد شحن مولدة بعد.'
                      : 'لا توجد أكواد تطابق خيارات البحث والتصفية المحددة.'}
                  </div>
                );
              }

              if (codesViewMode === 'cards') {
                return (
                  <div className="print-sheet-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredCodes.map((c) => (
                      <ActivationRechargeCard
                        key={c.id}
                        code={c}
                        course={course}
                        onDelete={isTeacher || cp.canDeleteCodes ? () => requestDeleteCode(c) : undefined}
                        onCopy={(codeText) => showToast(`تم نسخ الكود: ${codeText}`)}
                      />
                    ))}
                  </div>
                );
              }

              return (
                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-black border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="p-3">كود الشحن</th>
                        <th className="p-3">الطالب المخصص له</th>
                        <th className="p-3">السنتر / المجموعة</th>
                        <th className="p-3">الحالة</th>
                        <th className="p-3">تاريخ التفعيل</th>
                        <th className="p-3 text-center">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredCodes.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                          <td className="p-3 font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                            {c.code}
                          </td>
                          <td className="p-3 font-bold text-slate-800 dark:text-slate-200">
                            {c.assignedStudentName ? (
                              <span className="text-amber-700 dark:text-amber-300 font-black">{c.assignedStudentName}</span>
                            ) : (
                              <span className="text-slate-400">عام (متاح لأي طالب)</span>
                            )}
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-400 font-bold">
                            {c.centerOrGroup || c.batchName || 'دفعة عامة'}
                          </td>
                          <td className="p-3 font-black">
                            {c.isUsed ? (
                              <span className="text-rose-600 dark:text-rose-400">
                                تم التفعيل {c.usedByStudentName ? `(${c.usedByStudentName})` : ''}
                              </span>
                            ) : (
                              <span className="text-emerald-600 dark:text-emerald-400">متاح للشحن</span>
                            )}
                          </td>
                          <td className="p-3 text-slate-400 tabular-nums">
                            {c.usedAt ? new Date(c.usedAt).toLocaleDateString('ar-EG') : '—'}
                          </td>
                          <td className="p-3 text-center">
                            <div className="inline-flex items-center gap-1">
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(c.code);
                                  showToast(`تم نسخ الكود: ${c.code}`);
                                }}
                                className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg"
                                title="نسخ الكود"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              {(isTeacher || cp.canDeleteCodes) && (
                                <button
                                  onClick={() => requestDeleteCode(c)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                                  title="حذف الكود"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* TAB 4: ENROLLED STUDENTS & SUBSCRIPTIONS */}
      {activeTab === 'students' && hasStudentsTab && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-teal-600" />
                  الطلاب المشتركون في هذا الكورس
                </h2>
                <p className="text-xs text-slate-500 font-bold mt-1">
                  متابعة الطلاب المشتركين ونسبة تقدمهم وفقاً لحد الأجهزة المخصص (
                  {(course.maxDevices ?? 3) >= 1000 ? 'غير محدود' : `${course.maxDevices ?? 3} أجهزة لكل طالب`}).
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs font-black tabular-nums">
                <span className="text-teal-700 dark:text-teal-300">إجمالي المشتركين: {enrolledStudents.length}</span>
                <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">|</span>
                <span className="text-rose-700 dark:text-rose-400">
                  يحتاج اتصال عاجل: {enrolledStudents.filter((e) => e.recommendation?.level === 'critical').length}
                </span>
                <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">|</span>
                <span className="text-amber-700 dark:text-amber-400">
                  متابعة: {enrolledStudents.filter((e) => e.recommendation?.level === 'warning').length}
                </span>
                <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">|</span>
                <span className="text-emerald-700 dark:text-emerald-300">
                  متفوقون: {enrolledStudents.filter((e) => e.recommendation?.level === 'excellent').length}
                </span>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                    placeholder="بحث باسم الطالب، رقم الهاتف، أو رقم ولي الأمر..."
                    className="w-full pr-10 pl-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 text-xs font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 focus:border-teal-500 focus:outline-hidden"
                  />
                  {studentSearchQuery && (
                    <button
                      onClick={() => setStudentSearchQuery('')}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-xs font-black overflow-x-auto pb-1 tabular-nums">
                  <button
                    onClick={() => setStudentStatusFilter('all')}
                    className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
                      studentStatusFilter === 'all'
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-black shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    الكل ({enrolledStudents.length})
                  </button>
                  <button
                    onClick={() => setStudentStatusFilter('critical')}
                    className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-1 ${
                      studentStatusFilter === 'critical'
                        ? 'bg-rose-600 text-white font-black shadow-xs'
                        : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                    }`}
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>اتصال عاجل ({enrolledStudents.filter((e) => e.recommendation?.level === 'critical').length})</span>
                  </button>
                  <button
                    onClick={() => setStudentStatusFilter('warning')}
                    className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-1 ${
                      studentStatusFilter === 'warning'
                        ? 'bg-amber-600 text-white font-black shadow-xs'
                        : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>متابعة ({enrolledStudents.filter((e) => e.recommendation?.level === 'warning').length})</span>
                  </button>
                  <button
                    onClick={() => setStudentStatusFilter('excellent')}
                    className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-1 ${
                      studentStatusFilter === 'excellent'
                        ? 'bg-emerald-600 text-white font-black shadow-xs'
                        : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                    }`}
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>متفوقون ({enrolledStudents.filter((e) => e.recommendation?.level === 'excellent').length})</span>
                  </button>
                  <button
                    onClick={() => setStudentStatusFilter('idle')}
                    className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-1 ${
                      studentStatusFilter === 'idle'
                        ? 'bg-slate-700 text-white font-black shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>لم يبدأ ({enrolledStudents.filter((e) => e.recommendation?.level === 'idle').length})</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-bold overflow-x-auto pb-1 border-t border-slate-100 dark:border-slate-800/80 pt-2.5 tabular-nums">
                <span className="text-[11px] text-slate-400 font-bold ml-1 shrink-0">طريقة الدفع:</span>
                <button
                  onClick={() => setStudentFilterMethod('all')}
                  className={`px-2.5 py-1 rounded-lg whitespace-nowrap text-[11px] transition-all ${
                    studentFilterMethod === 'all'
                      ? 'bg-teal-600 text-white font-black'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  الجميع
                </button>
                <button
                  onClick={() => setStudentFilterMethod('activation_code')}
                  className={`px-2.5 py-1 rounded-lg whitespace-nowrap text-[11px] transition-all ${
                    studentFilterMethod === 'activation_code'
                      ? 'bg-emerald-600 text-white font-black'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  أكواد سنتر ({enrolledStudents.filter((e) => e.paymentMethod === 'activation_code').length})
                </button>
                <button
                  onClick={() => setStudentFilterMethod('fawry')}
                  className={`px-2.5 py-1 rounded-lg whitespace-nowrap text-[11px] transition-all ${
                    studentFilterMethod === 'fawry'
                      ? 'bg-cyan-600 text-white font-black'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  فوري ({enrolledStudents.filter((e) => e.paymentMethod === 'fawry').length})
                </button>
                <button
                  onClick={() => setStudentFilterMethod('wallet')}
                  className={`px-2.5 py-1 rounded-lg whitespace-nowrap text-[11px] transition-all ${
                    studentFilterMethod === 'wallet'
                      ? 'bg-amber-600 text-white font-black'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  المحفظة ({enrolledStudents.filter((e) => e.paymentMethod === 'wallet').length})
                </button>
              </div>
            </div>

            {(() => {
              const filteredStudents = enrolledStudents.filter((st) => {
                const matchesMethod = studentFilterMethod === 'all' ? true : st.paymentMethod === studentFilterMethod;
                const matchesStatus =
                  studentStatusFilter === 'all' ? true : st.recommendation?.level === studentStatusFilter;
                const q = studentSearchQuery.trim().toLowerCase();
                const matchesQuery = !q
                  ? true
                  : st.studentName.toLowerCase().includes(q) ||
                    (st.studentPhone && st.studentPhone.includes(q)) ||
                    (st.parentPhone && st.parentPhone.includes(q));
                return matchesMethod && matchesStatus && matchesQuery;
              });

              if (filteredStudents.length === 0) {
                return (
                  <div className="py-16 text-center space-y-3 bg-slate-50 dark:bg-slate-950/60 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                    <Users className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                      {enrolledStudents.length === 0
                        ? 'لا يوجد طلاب مسجلين في هذا الكورس حالياً.'
                        : 'لا توجد نتائج تطابق بحثك أو معايير التصفية المختارة.'}
                    </p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 gap-5">
                  {filteredStudents.map((st) => {
                    const isExhausted = (st.exhaustedItemsCount || 0) > 0;
                    const recLevel = st.recommendation?.level || 'idle';
                    const isExpanded = expandedStudentAssessments[st.studentId] ?? false;

                    return (
                      <div
                        key={st.studentId || st.id}
                        className={`p-5 md:p-6 rounded-3xl bg-white dark:bg-slate-900 border transition-all shadow-xs space-y-4 ${
                          recLevel === 'critical'
                            ? 'border-rose-400 dark:border-rose-800/80 ring-1 ring-rose-400/20'
                            : recLevel === 'warning'
                            ? 'border-amber-400 dark:border-amber-800/80 ring-1 ring-amber-400/20'
                            : recLevel === 'excellent'
                            ? 'border-emerald-400 dark:border-emerald-800/80 ring-1 ring-emerald-400/20'
                            : 'border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        {/* Top Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4">
                          <div className="flex items-center gap-3.5">
                            <div
                              className={`w-12 h-12 rounded-2xl text-white font-black text-base flex items-center justify-center shrink-0 shadow-md ${
                                recLevel === 'critical'
                                  ? 'bg-rose-600'
                                  : recLevel === 'excellent'
                                  ? 'bg-emerald-600'
                                  : recLevel === 'warning'
                                  ? 'bg-amber-600'
                                  : 'bg-teal-600'
                              }`}
                            >
                              {st.studentName.charAt(0) || 'ط'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-base font-black text-slate-900 dark:text-white">{st.studentName}</h3>
                                {recLevel === 'excellent' && (
                                  <span className="text-emerald-700 dark:text-emerald-300 text-xs font-black inline-flex items-center gap-1">
                                    <Award className="w-3.5 h-3.5" />
                                    <span>طالب متفوق</span>
                                  </span>
                                )}
                                {recLevel === 'critical' && (
                                  <span className="text-rose-700 dark:text-rose-300 text-xs font-black inline-flex items-center gap-1">
                                    <ShieldAlert className="w-3.5 h-3.5" />
                                    <span>استنفاد محاولات ورُسوب</span>
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-slate-400 font-bold block mt-0.5 tabular-nums">
                                تاريخ التسجيل:{' '}
                                {new Date(st.enrolledAt).toLocaleDateString('ar-EG', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 flex-wrap sm:justify-end text-xs font-black text-slate-600 dark:text-slate-300 tabular-nums">
                            <span className="inline-flex items-center gap-1">
                              {st.paymentMethod === 'activation_code' ? (
                                <>
                                  <Key className="w-3.5 h-3.5 text-emerald-600" /> كود سنتر
                                </>
                              ) : st.paymentMethod === 'fawry' ? (
                                <>
                                  <CreditCard className="w-3.5 h-3.5 text-cyan-600" /> فوري / كاش
                                </>
                              ) : st.paymentMethod === 'wallet' ? (
                                'رصيد محفظة'
                              ) : (
                                'كورس مجاني'
                              )}
                            </span>
                            <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">|</span>
                            <span className="inline-flex items-center gap-1 text-teal-700 dark:text-teal-300">
                              <ShieldCheck className="w-3.5 h-3.5 text-teal-500" />
                              {(course.maxDevices ?? 3) >= 1000
                                ? `الأجهزة: ${st.activeDevicesCount ?? 0} (مفتوح)`
                                : `أجهزة الكورس: ${st.activeDevicesCount ?? 0} / ${course.maxDevices ?? 3}`}
                            </span>
                          </div>
                        </div>

                        {/* Smart Advisory Box */}
                        <div
                          className={`p-4 rounded-2xl border transition-all ${
                            recLevel === 'critical'
                              ? 'bg-rose-50/90 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800/80 text-rose-900 dark:text-rose-100'
                              : recLevel === 'warning'
                              ? 'bg-amber-50/90 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/80 text-amber-900 dark:text-amber-100'
                              : recLevel === 'excellent'
                              ? 'bg-emerald-50/90 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-100'
                              : recLevel === 'good'
                              ? 'bg-sky-50/90 dark:bg-sky-950/30 border-sky-300 dark:border-sky-800/80 text-sky-900 dark:text-sky-100'
                              : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                {recLevel === 'critical' && <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />}
                                {recLevel === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />}
                                {recLevel === 'excellent' && <Award className="w-4 h-4 text-emerald-600 shrink-0" />}
                                {recLevel === 'good' && <ThumbsUp className="w-4 h-4 text-sky-600 shrink-0" />}
                                {recLevel === 'idle' && <Clock className="w-4 h-4 text-slate-500 shrink-0" />}
                                <h4 className="text-sm font-black">{st.recommendation?.title || 'متابعة أداء الطالب'}</h4>
                              </div>
                              <p className="text-xs font-bold leading-relaxed">{st.recommendation?.message}</p>
                            </div>

                            {allowMessaging && (
                              <div className="flex items-center gap-2 flex-wrap shrink-0">
                                {recLevel === 'critical' && st.parentPhone && (
                                  <a
                                    href={`tel:${st.parentPhone}`}
                                    className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition-transform active:scale-95 whitespace-nowrap"
                                  >
                                    <PhoneCall className="w-3.5 h-3.5" />
                                    <span>اتصل بولي الأمر</span>
                                  </a>
                                )}
                                {recLevel === 'warning' && st.studentPhone && (
                                  <a
                                    href={`tel:${st.studentPhone}`}
                                    className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition-transform active:scale-95 whitespace-nowrap"
                                  >
                                    <Phone className="w-3.5 h-3.5" />
                                    <span>اتصال بالطالب</span>
                                  </a>
                                )}
                                <button
                                  onClick={() =>
                                    setMessagingStudent({
                                      student: st,
                                      customMessage:
                                        st.recommendation?.suggestedTemplate ||
                                        `مرحباً ${st.studentName}، مع فريق منصة مستر محمد رضوان. بالتوفيق في دراستك وتذكر دائماً أن النجاح يحتاج الاستمرار في حل الواجبات والامتحانات أولاً بأول.`,
                                    })
                                  }
                                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition-transform active:scale-95 whitespace-nowrap"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                  <span>
                                    {recLevel === 'excellent'
                                      ? 'رسالة تقدير وتشجيع'
                                      : recLevel === 'critical'
                                      ? 'تواصل عاجل'
                                      : 'إرسال رسالة وتوجيه'}
                                  </span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Contacts & Assessment Metrics Summary */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 text-xs">
                          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 font-bold">هاتف الطالب:</span>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-black text-slate-900 dark:text-white text-xs tabular-nums" dir="ltr">
                                  {st.studentPhone || 'غير متوفر'}
                                </span>
                                {allowMessaging && st.studentPhone && (
                                  <>
                                    <a
                                      href={`tel:${st.studentPhone}`}
                                      className="p-1 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                                      title="مكالمة هاتفية"
                                    >
                                      <Phone className="w-3 h-3" />
                                    </a>
                                    <a
                                      href={`https://wa.me/2${st.studentPhone.replace(/\D/g, '')}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 transition-colors"
                                      title="محادثة واتساب"
                                    >
                                      <MessageCircle className="w-3 h-3" />
                                    </a>
                                  </>
                                )}
                              </div>
                            </div>

                            {st.parentPhone && (
                              <div className="flex items-center justify-between border-t border-slate-200/60 dark:border-slate-800/60 pt-2">
                                <span className="text-slate-500 font-bold">هاتف ولي الأمر:</span>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300 text-xs tabular-nums" dir="ltr">
                                    {st.parentPhone}
                                  </span>
                                  {allowMessaging && (
                                    <>
                                      <a
                                        href={`tel:${st.parentPhone}`}
                                        className="p-1 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                                        title="اتصال بولي الأمر"
                                      >
                                        <Phone className="w-3 h-3" />
                                      </a>
                                      <a
                                        href={`https://wa.me/2${st.parentPhone.replace(/\D/g, '')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1 rounded-lg bg-teal-100 hover:bg-teal-200 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 transition-colors"
                                        title="واتساب ولي الأمر"
                                      >
                                        <MessageCircle className="w-3 h-3" />
                                      </a>
                                    </>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 flex items-center justify-around gap-2 text-center tabular-nums">
                            <div>
                              <span className="text-[10px] text-slate-400 font-bold block mb-1">متوسط الدرجات</span>
                              <span
                                className={`text-base font-black px-3 py-1 rounded-xl inline-block ${
                                  (st.averageScore || 0) >= 85
                                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                    : (st.averageScore || 0) >= 60
                                    ? 'bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300'
                                    : (st.averageScore || 0) > 0
                                    ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                                    : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                }`}
                              >
                                {Math.round(st.averageScore || 0)}%
                              </span>
                            </div>

                            <div className="h-10 w-px bg-slate-200 dark:bg-slate-800" />

                            <div>
                              <span className="text-[10px] text-slate-400 font-bold block mb-1">الامتحانات المكتملة</span>
                              <span className="text-sm font-black text-slate-900 dark:text-white">
                                {st.completedExams || 0} / {st.totalCourseExams || 0}
                              </span>
                            </div>

                            <div className="h-10 w-px bg-slate-200 dark:bg-slate-800" />

                            <div>
                              <span className="text-[10px] text-slate-400 font-bold block mb-1">الواجبات المكتملة</span>
                              <span className="text-sm font-black text-slate-900 dark:text-white">
                                {st.completedHomeworks || 0} / {st.totalCourseHomeworks || 0}
                              </span>
                            </div>
                          </div>

                          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between gap-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-slate-500">حالة الاختبارات:</span>
                              {isExhausted ? (
                                <span className="text-rose-700 dark:text-rose-300 text-xs font-black flex items-center gap-1 tabular-nums">
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  <span>مستنفد المحاولات ({st.exhaustedItemsCount})</span>
                                </span>
                              ) : (st.completedAssessments || 0) > 0 ? (
                                <span className="text-emerald-700 dark:text-emerald-300 text-xs font-black flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>مستمر بالحل بنجاح</span>
                                </span>
                              ) : (
                                <span className="text-slate-600 dark:text-slate-400 text-xs font-black">لم يبدأ بعد</span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              {(isTeacher || cp.canGrantExtraAttempts) && (
                                <button
                                  onClick={() => openManageAttempts(st)}
                                  className="flex-1 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
                                >
                                  <Settings className="w-3.5 h-3.5" />
                                  <span>نافذة المحاولات</span>
                                </button>
                              )}
                              <button
                                onClick={() => toggleStudentAssessments(st.studentId)}
                                className="flex-1 px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs transition-colors flex items-center justify-center gap-1 shadow-xs whitespace-nowrap"
                              >
                                <span>{isExpanded ? 'إخفاء السجل' : 'عرض السجل'}</span>
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Detailed Accordion of Exams & Homeworks */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden pt-2"
                            >
                              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-4 space-y-3">
                                <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-2">
                                  <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5 tabular-nums">
                                    <BookOpen className="w-3.5 h-3.5 text-teal-600" />
                                    <span>سجل درجات ومحاولات الطالب ({st.assessments?.length || 0})</span>
                                  </h4>
                                </div>

                                {!st.assessments || st.assessments.length === 0 ? (
                                  <div className="text-center py-6 text-xs text-slate-500 font-bold">
                                    لم تتم إضافة واجبات أو امتحانات داخل وحدات هذا الكورس بعد.
                                  </div>
                                ) : (
                                  <div className="space-y-2.5">
                                    {st.assessments.map((item: StudentAssessmentProgress) => {
                                      const isItemExhausted = item.isExhausted;
                                      const actionKey = `${st.studentId}_${item.itemId}`;
                                      const isActing = attemptActionLoading[actionKey] || false;

                                      return (
                                        <div
                                          key={item.itemId}
                                          className={`p-3.5 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                                            isItemExhausted
                                              ? 'bg-rose-50/80 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/60'
                                              : item.isPassed
                                              ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                                              : item.attemptsCount > 0
                                              ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40'
                                              : 'bg-white/70 dark:bg-slate-900/60 border-slate-200/60 dark:border-slate-800/60'
                                          }`}
                                        >
                                          <div className="flex-1 space-y-1">
                                            <div className="flex items-center gap-2 flex-wrap text-xs">
                                              <span className="font-black text-indigo-700 dark:text-indigo-300">
                                                {item.itemType === 'exam' ? 'امتحان' : 'واجب'}
                                              </span>
                                              <span aria-hidden="true" className="text-slate-400">·</span>
                                              <span className="font-black text-slate-900 dark:text-white">{item.itemTitle}</span>
                                              <span aria-hidden="true" className="text-slate-400">·</span>
                                              <span className="text-[11px] text-slate-500 font-bold">{item.unitTitle}</span>
                                            </div>

                                            <div className="flex items-center gap-2 flex-wrap text-xs font-bold pt-0.5 tabular-nums">
                                              {item.isPassed ? (
                                                <span className="text-emerald-700 dark:text-emerald-300 font-black flex items-center gap-1">
                                                  <CheckCircle className="w-3.5 h-3.5" />
                                                  <span>اجتاز بنجاح</span>
                                                </span>
                                              ) : isItemExhausted ? (
                                                <span className="text-rose-700 dark:text-rose-300 font-black flex items-center gap-1">
                                                  <AlertCircle className="w-3.5 h-3.5" />
                                                  <span>استنفد المحاولات</span>
                                                </span>
                                              ) : item.attemptsCount > 0 ? (
                                                <span className="text-amber-700 dark:text-amber-300 font-black">
                                                  متبقي {item.maxAttempts - item.attemptsCount} فرصة
                                                </span>
                                              ) : (
                                                <span className="text-slate-500 dark:text-slate-400">لم يبدأ بعد</span>
                                              )}

                                              <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">|</span>

                                              <span className="text-[11px] text-slate-500 font-bold">
                                                المحاولات:{' '}
                                                <span className="font-mono font-black text-slate-800 dark:text-slate-200">
                                                  {item.attemptsCount}
                                                </span>{' '}
                                                / {item.maxAttempts}
                                              </span>

                                              <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">|</span>

                                              {item.attemptsCount > 0 ? (
                                                <span
                                                  className={`text-[11px] font-black ${
                                                    item.isPassed
                                                      ? 'text-emerald-700 dark:text-emerald-400'
                                                      : 'text-rose-700 dark:text-rose-400'
                                                  }`}
                                                >
                                                  الدرجة المعتمدة: {item.lastScore} / {item.totalMarks} ({Math.round(item.percentage)}%)
                                                </span>
                                              ) : (
                                                <span className="text-[11px] text-slate-400">
                                                  الدرجة الكلية: {item.totalMarks} درجات
                                                </span>
                                              )}
                                            </div>
                                          </div>

                                          {(isTeacher || cp.canGrantExtraAttempts) && (
                                            <div className="flex items-center gap-1.5 shrink-0 pt-2 md:pt-0">
                                              <button
                                                disabled={isActing}
                                                onClick={() => handleDirectGrantAttempt(st.studentId, item.itemId, 1, false)}
                                                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 shadow-xs whitespace-nowrap ${
                                                  isItemExhausted
                                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                                    : 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200'
                                                }`}
                                                title="منح الطالب فرصة إضافية لحل هذا الامتحان أو الواجب"
                                              >
                                                {isActing ? (
                                                  <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                  <Plus className="w-3.5 h-3.5" />
                                                )}
                                                <span>منح فرصة إضافية (+1)</span>
                                              </button>

                                              {item.attemptsCount > 0 && (
                                                <button
                                                  disabled={isActing}
                                                  onClick={() =>
                                                    setConfirmResetTarget({
                                                      studentId: st.studentId,
                                                      itemId: item.itemId,
                                                      itemTitle: item.itemTitle,
                                                      maxAttempts: item.maxAttempts,
                                                    })
                                                  }
                                                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold transition-all flex items-center gap-1 whitespace-nowrap"
                                                  title="إعادة تعيين المحاولات والدرجة من البداية"
                                                >
                                                  <RotateCcw className="w-3 h-3" />
                                                  <span className="hidden sm:inline">إعادة تعيين</span>
                                                </button>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* TAB 5: COURSE SETTINGS */}
      {activeTab === 'settings' && hasSettingsTab && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
            <Settings className="w-5 h-5 text-emerald-600" />
            تعديل بيانات وإعدادات الكورس
          </h2>

          <div className="space-y-6 max-w-3xl">
            <div>
              <label className="block text-slate-800 dark:text-slate-200 font-bold text-sm mb-2">اسم الكورس</label>
              <input
                type="text"
                value={course.title}
                onChange={(e) => setCourse({ ...course, title: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-800 dark:text-slate-200 font-bold text-sm mb-2">الوصف</label>
              <textarea
                rows={3}
                value={course.description}
                onChange={(e) => setCourse({ ...course, description: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-medium text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-800 dark:text-slate-200 font-bold text-sm mb-2">
                غلاف الكورس (رفع من الجهاز أو اختيار قالب إنجليزي جاهز)
              </label>
              <CoverImageSelector
                value={course.coverImage || ''}
                onChange={(url) => setCourse({ ...course, coverImage: url })}
                defaultTitle={course.title}
              />
            </div>

            <PriceControlSelector
              price={course.price}
              originalPrice={course.originalPrice}
              hasDiscount={course.hasDiscount}
              isFree={course.isFree}
              onPriceChange={(p) => setCourse({ ...course, price: p })}
              onOriginalPriceChange={(op) => setCourse({ ...course, originalPrice: op })}
              onHasDiscountChange={(hd) => setCourse({ ...course, hasDiscount: hd })}
              onIsFreeChange={(free) => setCourse({ ...course, isFree: free })}
            />

            {/* Access & Progression Rules */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
              <h3 className="font-black text-slate-800 dark:text-slate-200 text-sm">قواعد فتح المحتوى والتدرج</h3>

              <div className="flex flex-col gap-3">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center mt-0.5">
                    <input
                      type="checkbox"
                      checked={course.enforceUnitProgression ?? true}
                      onChange={(e) => setCourse({ ...course, enforceUnitProgression: e.target.checked })}
                      className="w-5 h-5 appearance-none border-2 border-slate-300 dark:border-slate-600 rounded-lg checked:border-emerald-500 checked:bg-emerald-500 transition-colors cursor-pointer"
                    />
                    {(course.enforceUnitProgression ?? true) && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-white absolute pointer-events-none" />
                    )}
                  </div>
                  <div>
                    <span className="block font-bold text-sm text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                      إجبار التدرج بين الوحدات (الوحدة التالية لا تفتح إلا باجتياز السابقة)
                    </span>
                    <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
                      يفضل تفعيلها لكورسات المراجعة، وإلغائها إذا كنت تسمح للطالب بالبدء من أي وحدة بحرية.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center mt-0.5">
                    <input
                      type="checkbox"
                      checked={course.enforceItemProgression ?? true}
                      onChange={(e) => setCourse({ ...course, enforceItemProgression: e.target.checked })}
                      className="w-5 h-5 appearance-none border-2 border-slate-300 dark:border-slate-600 rounded-lg checked:border-emerald-500 checked:bg-emerald-500 transition-colors cursor-pointer"
                    />
                    {(course.enforceItemProgression ?? true) && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-white absolute pointer-events-none" />
                    )}
                  </div>
                  <div>
                    <span className="block font-bold text-sm text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                      إجبار التدرج الداخلي للدروس (الفيديو/الامتحان التالي لا يفتح إلا باجتياز ما قبله)
                    </span>
                    <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
                      هذا هو الخيار الافتراضي لضمان التزام الطالب بحل الواجبات والامتحانات قبل الانتقال للدرس التالي.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Per-Course Allowed Devices Policy */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-sm flex items-center gap-2">
                    <Laptop className="w-4 h-4 text-emerald-600" />
                    <span>عدد الأجهزة المسموحة للطالب لمشاهدة هذا الكورس</span>
                  </h3>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
                    جهاز التفعيل الأول يُقفل كجهاز أساسي لا يحذفه الطالب، وتُحتسب المتصفحات على نفس الجهاز كجهاز واحد.
                  </p>
                </div>
                <span className="text-emerald-700 dark:text-emerald-300 text-xs font-black self-start tabular-nums">
                  {(course.maxDevices ?? 3) >= 1000
                    ? 'غير محدود (مفتوح)'
                    : `${course.maxDevices ?? 3} ${
                        (course.maxDevices ?? 3) === 1 ? 'جهاز' : (course.maxDevices ?? 3) === 2 ? 'جهازان' : 'أجهزة'
                      }`}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  { val: 1, label: 'جهاز واحد (1)' },
                  { val: 2, label: 'جهازان (2)' },
                  { val: 3, label: '3 أجهزة (الافتراضي)' },
                  { val: 4, label: '4 أجهزة' },
                  { val: 5, label: '5 أجهزة' },
                  { val: 1000, label: 'غير محدود' },
                ].map((opt) => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setCourse({ ...course, maxDevices: opt.val })}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black border transition-all ${
                      (course.maxDevices ?? 3) === opt.val
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-emerald-400'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {(course.maxDevices ?? 3) < 1000 && (
                <div className="flex items-center gap-3 max-w-xs">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 shrink-0">أو عدد مخصص:</label>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={course.maxDevices ?? 3}
                    onChange={(e) => {
                      const n = parseInt(e.target.value, 10);
                      setCourse({ ...course, maxDevices: !Number.isNaN(n) && n >= 1 ? Math.min(999, n) : 1 });
                    }}
                    className="w-24 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-black text-center text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 tabular-nums"
                  />
                </div>
              )}
            </div>

            {/* Course Scheduling & Freeze Settings */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
              <h3 className="font-black text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4 text-violet-600" />
                <span>جدولة الكورس ومواعيد النشر والانتهاء</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                    تاريخ بداية نشر الكورس:
                  </label>
                  <input
                    type="date"
                    value={course.publishDate || ''}
                    onChange={(e) => setCourse({ ...course, publishDate: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-sm text-slate-900 dark:text-white focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                    تاريخ انتهاء صلاحية الكورس:
                  </label>
                  <input
                    type="date"
                    value={course.expiryDate || ''}
                    onChange={(e) => setCourse({ ...course, expiryDate: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-sm text-slate-900 dark:text-white focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl border transition-colors bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
                <label className="flex items-start justify-between gap-4 cursor-pointer">
                  <div className="space-y-1">
                    <span className="font-black text-sm text-slate-900 dark:text-white block">
                      حالة نشر الكورس والظهور للطلاب
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 block leading-relaxed">
                      {course.isPublished
                        ? 'الكورس نشط ومتاح للطلاب المشتركين حالياً.'
                        : 'الكورس مجمد ومغلق مؤقتاً (لا يمكن للطلاب فتحه أو رؤية دروسه أثناء التجميد).'}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    id="settingsPublishedCheck"
                    checked={course.isPublished}
                    onChange={(e) => setCourse({ ...course, isPublished: e.target.checked })}
                    className="w-5 h-5 text-emerald-600 rounded-lg shrink-0 mt-1 cursor-pointer"
                  />
                </label>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={async () => {
                  try {
                    await saveCourse(course);
                    showToast('تم حفظ التعديلات بنجاح');
                    await loadData();
                  } catch (err: any) {
                    showToast(err?.message || 'تعذر حفظ تعديلات الكورس', 'error');
                  }
                }}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all"
              >
                حفظ التعديلات
              </button>

              {isTeacher && (
                <button
                  onClick={requestDeleteCourse}
                  className="px-5 py-3 bg-rose-50 dark:bg-rose-500/10 text-rose-600 hover:bg-rose-100 font-bold rounded-xl transition-all"
                >
                  حذف الكورس نهائياً
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD / EDIT UNIT */}
      <AnimatePresence>
        {isUnitModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {editingUnit ? 'تعديل بيانات الوحدة' : 'إضافة وحدة جديدة'}
                </h3>
                <button onClick={() => setIsUnitModalOpen(false)} className="p-1 text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveUnit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    رقم الوحدة (ترتيبها)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={unitNumber}
                    onChange={(e) => setUnitNumber(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    عنوان الوحدة <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: Unit 1: Present Perfect & Vocabulary"
                    value={unitTitle}
                    onChange={(e) => setUnitTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    وصف مختصر للوحدة
                  </label>
                  <textarea
                    rows={2}
                    placeholder="شرح زمن المضارع التام وقراءة نصوص الريدينج..."
                    value={unitDesc}
                    onChange={(e) => setUnitDesc(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-medium text-xs text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsUnitModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md"
                  >
                    حفظ الوحدة
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: ADD / EDIT ITEM */}
      <AnimatePresence>
        {isItemModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 max-w-xl w-full shadow-2xl space-y-5 my-8"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  {itemType === 'video' && <Video className="w-5 h-5 text-emerald-600" />}
                  {itemType === 'homework' && <CheckSquare className="w-5 h-5 text-sky-600" />}
                  {itemType === 'exam' && <FileText className="w-5 h-5 text-amber-600" />}
                  {itemType === 'concept_sheet' && <Bookmark className="w-5 h-5 text-purple-600" />}
                  {itemType === 'summary_pdf' && <FileSpreadsheet className="w-5 h-5 text-teal-600" />}
                  {editingItem
                    ? 'تعديل بيانات العنصر'
                    : `إضافة ${
                        itemType === 'video'
                          ? 'فيديو شرح'
                          : itemType === 'homework'
                          ? 'واجب منزلي'
                          : itemType === 'exam'
                          ? 'امتحان شامل'
                          : itemType === 'concept_sheet'
                          ? 'ورقة مفاهيم'
                          : 'ملزمة تلخيص'
                      }`}
                </h3>
                <button
                  onClick={() => setIsItemModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={(e) => handleSaveItem(e, false)} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {itemType === 'homework' ? 'عنوان الواجب' : itemType === 'exam' ? 'عنوان الامتحان' : 'العنوان'}{' '}
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder={
                      itemType === 'video'
                        ? 'مثال: محاضرة 1 - شرح الماضي البسيط والماضي المستمر'
                        : itemType === 'homework'
                        ? 'مثال: واجب الدرس الأول - Grammar & Vocabulary'
                        : itemType === 'exam'
                        ? 'مثال: امتحان شامل على الوحدة الأولى'
                        : 'عنوان الملف'
                    }
                    value={itemTitle}
                    onChange={(e) => setItemTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    الوصف أو التوجيهات للطالب (اختياري)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="تعليمات أو ملاحظات هامة للطالب قبل البدء..."
                    value={itemDesc}
                    onChange={(e) => setItemDesc(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-medium text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                {itemType === 'video' && (
                  <div className="space-y-4 p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl">
                    <div>
                      <label className="block text-xs font-black text-emerald-900 dark:text-emerald-300 mb-2">
                        طريقة عرض الفيديو والتأمين المطلوب:
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <label
                          className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer font-bold text-xs ${
                            videoSourceType === 'internal_secured'
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="videoSecType"
                            checked={videoSourceType === 'internal_secured'}
                            onChange={() => setVideoSourceType('internal_secured')}
                            className="hidden"
                          />
                          <ShieldCheck className="w-4 h-4 shrink-0" />
                          <span>مشغل داخلي مخصص (بعلامة مائية)</span>
                        </label>

                        <label
                          className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer font-bold text-xs ${
                            videoSourceType === 'direct_youtube'
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="videoSecType"
                            checked={videoSourceType === 'direct_youtube'}
                            onChange={() => setVideoSourceType('direct_youtube')}
                            className="hidden"
                          />
                          <Play className="w-4 h-4 shrink-0" />
                          <span>عرض على يوتيوب مباشرة</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                        معرف الفيديو (YouTube ID أو الرابط)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="مثال: dQw4w9WgXcQ أو https://youtu.be/..."
                          value={videoUrl}
                          onChange={(e) => {
                            setVideoUrl(e.target.value);
                            setVideoDetectionMessage(null);
                          }}
                          onBlur={() => {
                            if (videoUrl.trim()) handleAutoDetectVideo(videoUrl);
                          }}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs text-slate-900 dark:text-white focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleAutoDetectVideo(videoUrl)}
                          disabled={isDetectingVideo || !videoUrl.trim()}
                          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shrink-0 flex items-center gap-1 shadow-sm transition-all"
                        >
                          {isDetectingVideo ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5" />
                          )}
                          <span>تحديد تلقائي</span>
                        </button>
                      </div>
                      {videoDetectionMessage && (
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-1.5 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          {videoDetectionMessage}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                          مدة الفيديو (بالدقائق)
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={durationMinutes}
                          onChange={(e) => setDurationMinutes(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs text-slate-900 dark:text-white focus:outline-none"
                        />
                      </div>
                      <div className="flex flex-col justify-end text-[11px] text-slate-500 font-bold leading-tight pb-1">
                        في المشغل الداخلي يُشفر رابط الفيديو وتظهر العلامة المائية برقم هاتف الطالب.
                      </div>
                    </div>
                  </div>
                )}

                {(itemType === 'exam' || itemType === 'homework') && (
                  <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-200/70 dark:border-amber-500/30 rounded-2xl space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 font-black text-xs">
                        <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>إعدادات {itemType === 'homework' ? 'الواجب' : 'الامتحان'} (التايمر والمحاولات):</span>
                      </div>
                      <span className="text-xs font-black text-amber-800 dark:text-amber-200 flex items-center gap-1 tabular-nums">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{durationMinutes || 30} دقيقة</span>
                      </span>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-amber-200 dark:border-amber-800/40 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-amber-600" />
                          <span>عداد وقت {itemType === 'homework' ? 'الواجب' : 'الامتحان'} (بالدقائق):</span>
                        </label>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min={1}
                            max={600}
                            value={durationMinutes}
                            onChange={(e) =>
                              setDurationMinutes(e.target.value === '' ? '' : Math.max(1, Number(e.target.value)))
                            }
                            placeholder="30"
                            className="w-28 text-center px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-black text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none tabular-nums"
                          />
                          <span className="text-xs font-black text-slate-600 dark:text-slate-400">دقيقة</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1">
                          {[15, 30, 45, 60, 90, 120].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setDurationMinutes(preset)}
                              className={`px-2 py-1 rounded-lg text-[11px] font-black transition-all tabular-nums ${
                                Number(durationMinutes) === preset
                                  ? 'bg-amber-500 text-white shadow-sm ring-1 ring-amber-400'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-amber-100 dark:hover:bg-slate-700'
                              }`}
                            >
                              {preset}د
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-amber-200 dark:border-amber-800/40 space-y-2">
                        <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 block">
                          عدد المحاولات المسموحة للطالب:
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setMaxAttempts(Math.max(1, maxAttempts - 1))}
                            className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-black flex items-center justify-center transition-colors"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min={1}
                            value={maxAttempts}
                            onChange={(e) => setMaxAttempts(Math.max(1, Number(e.target.value) || 1))}
                            className="w-full text-center px-2 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-black text-sm tabular-nums"
                          />
                          <button
                            type="button"
                            onClick={() => setMaxAttempts(maxAttempts + 1)}
                            className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-black flex items-center justify-center transition-colors"
                          >
                            +
                          </button>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5 tabular-nums">
                          {[1, 2, 3, 5, 10, 999].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setMaxAttempts(preset)}
                              className={`px-2 py-0.5 rounded text-[10px] font-black transition-all ${
                                maxAttempts === preset
                                  ? 'bg-amber-500 text-white shadow-sm'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-amber-100'
                              }`}
                            >
                              {preset === 999 ? 'مفتوح' : `${preset}`}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-amber-200 dark:border-amber-800/40 space-y-2">
                        <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 block">
                          نسبة النجاح والاجتياز (%):
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={passingScore}
                            onChange={(e) => setPassingScore(Math.min(100, Math.max(1, Number(e.target.value) || 60)))}
                            className="w-full text-center px-2 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-black text-sm tabular-nums"
                          />
                          <span className="text-xs font-black text-slate-500">%</span>
                        </div>
                        <div className="flex items-center gap-1.5 pt-0.5 tabular-nums">
                          {[50, 60, 70, 80].map((sc) => (
                            <button
                              key={sc}
                              type="button"
                              onClick={() => setPassingScore(sc)}
                              className={`px-2 py-0.5 rounded text-[10px] font-black transition-all ${
                                passingScore === sc
                                  ? 'bg-amber-500 text-white shadow-sm'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-amber-100'
                              }`}
                            >
                              {sc}%
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {(itemType === 'concept_sheet' || itemType === 'summary_pdf') && (
                  <PdfResourceUploader
                    value={pdfUrl}
                    onChange={(url) => setPdfUrl(url)}
                    itemType={itemType}
                    title={itemTitle}
                  />
                )}

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <input
                    type="checkbox"
                    id="prereqCheck"
                    checked={isPrerequisite}
                    onChange={(e) => setIsPrerequisite(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <label htmlFor="prereqCheck" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                    قفل إجباري: لا يفتح هذا الدرس للطالب إلا بعد اجتياز المحتويات السابقة
                  </label>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsItemModalOpen(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all"
                  >
                    إلغاء
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSaveItem(undefined, false)}
                      className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 hover:dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition-all"
                    >
                      {editingItem ? 'حفظ التعديلات' : 'حفظ في الوحدة'}
                    </button>

                    {(itemType === 'exam' || itemType === 'homework') && hasQuestionsBankTab ? (
                      <button
                        type="button"
                        onClick={() => handleSaveItem(undefined, true)}
                        className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-emerald-600 hover:from-amber-600 hover:to-emerald-700 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all"
                      >
                        <FileText className="w-4 h-4" />
                        <span>{isBlindQuestions ? 'حفظ وإضافة أسئلة' : 'حفظ والدخول لبنك الأسئلة'}</span>
                      </button>
                    ) : (
                      <button
                        type="submit"
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition-all"
                      >
                        حفظ وإضافة
                      </button>
                    )}
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4: TRANSFER / COPY ITEM */}
      <AnimatePresence>
        {isTransferModalOpen && activeExamItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Copy className="w-5 h-5 text-emerald-600" />
                  <span>
                    نسخ ونقل{' '}
                    {activeExamItem.itemType === 'video'
                      ? 'الفيديو'
                      : activeExamItem.itemType === 'homework'
                      ? 'الواجب'
                      : activeExamItem.itemType === 'exam'
                      ? 'الامتحان'
                      : 'المحتوى'}
                  </span>
                </h3>
                <button
                  onClick={() => setIsTransferModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    اسم النسخة الجديدة
                  </label>
                  <input
                    type="text"
                    value={transferExamTitle}
                    onChange={(e) => setTransferExamTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    الكورس المستهدف
                  </label>
                  <select
                    value={transferTargetCourseId}
                    onChange={async (e) => {
                      const cId = e.target.value;
                      setTransferTargetCourseId(cId);
                      const u = await fetchUnitsByCourse(cId);
                      setTransferTargetUnits(u);
                      if (u.length > 0) setTransferTargetUnitId(u[0].id);
                      else setTransferTargetUnitId('');
                    }}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs text-slate-900 dark:text-white focus:outline-none"
                  >
                    {(allowedTargetCourseIds && allowedTargetCourseIds.length > 0
                      ? allCourses.filter((c) => allowedTargetCourseIds.includes(c.id))
                      : allCourses
                    ).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title} (الصف {c.grade} - {c.id === courseId ? 'هذا الكورس' : 'كورس آخر'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    الوحدة المستهدفة داخل الكورس
                  </label>
                  {transferTargetUnits.length === 0 ? (
                    <div className="p-3 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 font-bold text-xs rounded-xl">
                      لا توجد وحدات في هذا الكورس بعد. يرجى إنشاء وحدة أولاً.
                    </div>
                  ) : (
                    <select
                      value={transferTargetUnitId}
                      onChange={(e) => setTransferTargetUnitId(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs text-slate-900 dark:text-white focus:outline-none"
                    >
                      {transferTargetUnits.map((u) => (
                        <option key={u.id} value={u.id}>
                          الوحدة {u.unitNumber}: {u.title}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={isTransferring || !transferTargetCourseId || !transferTargetUnitId}
                  onClick={handleExecuteTransfer}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md disabled:opacity-50 transition-all flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{isTransferring ? 'جاري النسخ...' : 'تأكيد النسخ والنقل'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4B: BIDIRECTIONAL ASSESSMENT CONVERSION / INDEPENDENT CLONE */}
      <AnimatePresence>
        {convertModalItem && canConvertAssessments && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-7 max-w-lg w-full shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
                <div className="space-y-0.5">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <ArrowLeftRight className="w-5 h-5 text-violet-600" />
                    <span>
                      {convertModalItem.itemType === 'exam'
                        ? 'تحويل أو نسخ الامتحان كواجب'
                        : 'تحويل أو نسخ الواجب كامتحان'}
                    </span>
                  </h3>
                  <p className="text-[11px] font-bold text-slate-500 truncate max-w-xs sm:max-w-sm">
                    المصدر: {convertModalItem.title}
                  </p>
                </div>
                <button
                  onClick={() => setConvertModalItem(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mode Selector */}
              <div className="grid grid-cols-1 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setConvertMode('keep_copy');
                    const targetLabel = convertModalItem.itemType === 'exam' ? 'واجب' : 'امتحان';
                    setConvertNewTitle(`${convertModalItem.title} (نسخة ${targetLabel})`);
                  }}
                  className={`text-right p-4 rounded-2xl border-2 transition-all space-y-1 ${
                    convertMode === 'keep_copy'
                      ? 'border-violet-600 bg-violet-50/70 dark:bg-violet-950/35 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 hover:border-violet-300 dark:hover:border-violet-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <Copy className="w-4 h-4 text-violet-600" />
                      <span>إنشاء نسخة مستقلة من النوع الآخر (مع بقاء الأصل)</span>
                    </span>
                    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${convertMode === 'keep_copy' ? 'border-violet-600 bg-violet-600' : 'border-slate-300 dark:border-slate-600'}`}>
                      {convertMode === 'keep_copy' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                  </div>
                  <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 leading-relaxed">
                    ينشئ {convertModalItem.itemType === 'exam' ? 'واجباً جديداً' : 'امتحاناً جديداً'} بنفس الأسئلة كاملة لا زيادة ولا نقصان، ويبقى الأصل كما هو بشكل مستقل تماماً بحيث أي تعديل مستقبلاً في أحدهما لا يؤثر على الآخر.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setConvertMode('convert_in_place');
                    setConvertNewTitle(convertModalItem.title);
                  }}
                  className={`text-right p-4 rounded-2xl border-2 transition-all space-y-1 ${
                    convertMode === 'convert_in_place'
                      ? 'border-amber-600 bg-amber-50/70 dark:bg-amber-950/35 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <ArrowLeftRight className="w-4 h-4 text-amber-600" />
                      <span>تحويل تام مباشر (قابل للعكس في أي وقت)</span>
                    </span>
                    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${convertMode === 'convert_in_place' ? 'border-amber-600 bg-amber-600' : 'border-slate-300 dark:border-slate-600'}`}>
                      {convertMode === 'convert_in_place' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                  </div>
                  <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 leading-relaxed">
                    يحول هذا العنصر نفسه من {convertModalItem.itemType === 'exam' ? 'امتحان إلى واجب' : 'واجب إلى امتحان'} محتفظاً بكل أسئلته كما هي، ويمكن إرجاعه لنوعه الأصلي في أي وقت لاحقاً.
                  </p>
                </button>
              </div>

              {/* Title Input */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {convertMode === 'keep_copy' ? 'عنوان النسخة المستقلة الجديدة' : 'العنوان بعد التحويل (اختياري)'}
                  </label>
                  <input
                    type="text"
                    value={convertNewTitle}
                    onChange={(e) => setConvertNewTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                  />
                </div>

                {convertMode === 'keep_copy' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <div>
                      <label className="block text-[11px] font-black text-slate-600 dark:text-slate-400 mb-1">
                        الكورس المستهدف
                      </label>
                      <select
                        value={convertTargetCourseId}
                        disabled={!isTeacher && !cp.canTransferContent}
                        onChange={async (e) => {
                          const cId = e.target.value;
                          setConvertTargetCourseId(cId);
                          const u = await fetchUnitsByCourse(cId);
                          setConvertTargetUnits(u);
                          setConvertTargetUnitId(u[0]?.id || '');
                        }}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs text-slate-900 dark:text-white disabled:opacity-70"
                      >
                        {(!isTeacher && !cp.canTransferContent
                          ? allCourses.filter((c) => c.id === courseId)
                          : allowedTargetCourseIds && allowedTargetCourseIds.length > 0
                          ? allCourses.filter((c) => allowedTargetCourseIds.includes(c.id))
                          : allCourses
                        ).map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.title} {c.id === courseId ? '(هذا الكورس)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-black text-slate-600 dark:text-slate-400 mb-1">
                        الوحدة المستهدفة
                      </label>
                      <select
                        value={convertTargetUnitId}
                        onChange={(e) => setConvertTargetUnitId(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs text-slate-900 dark:text-white"
                      >
                        {convertTargetUnits.map((u) => (
                          <option key={u.id} value={u.id}>
                            الوحدة {u.unitNumber}: {u.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setConvertModalItem(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={
                    isConvertingAssessment ||
                    (convertMode === 'keep_copy' && (!convertTargetCourseId || !convertTargetUnitId))
                  }
                  onClick={handleExecuteConvertAssessment}
                  className={`px-5 py-2.5 text-white font-black text-xs rounded-xl shadow-md disabled:opacity-50 transition-all flex items-center gap-1.5 ${
                    convertMode === 'convert_in_place'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-violet-600 hover:bg-violet-700'
                  }`}
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  <span>
                    {isConvertingAssessment
                      ? 'جاري التنفيذ...'
                      : convertMode === 'convert_in_place'
                      ? `تأكيد التحويل إلى ${convertModalItem.itemType === 'exam' ? 'واجب' : 'امتحان'}`
                      : `إنشاء نسخة ${convertModalItem.itemType === 'exam' ? 'الواجب' : 'الامتحان'} المستقلة`}
                  </span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 5: VIDEO PREVIEW */}
      <AnimatePresence>
        {previewVideoItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-3xl w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Play className="w-5 h-5 text-emerald-400" />
                  معاينة مشغل الفيديو وتأمين العلامة المائية
                </h3>
                <button onClick={() => setPreviewVideoItem(null)} className="p-1 text-slate-400 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <SecuredVideoPlayer
                itemId={previewVideoItem.id}
                courseId={courseId}
                videoIdOrUrl={previewVideoItem.directVideoUrl || previewVideoItem.obfuscatedVideoId || 'dQw4w9WgXcQ'}
                sourceType={previewVideoItem.videoSourceType}
                title={previewVideoItem.title}
                durationMinutes={previewVideoItem.durationMinutes}
                studentPhone="01552191172"
                studentId="MR-RADWAN-PRO"
                studentName={currentUser?.fullName || 'مستر محمد رضوان'}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MESSAGING / WHATSAPP COMPOSER MODAL */}
      <AnimatePresence>
        {messagingStudent && allowMessaging && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-emerald-600" />
                  <span>مراسلة وتوجيه الطالب: {messagingStudent.student.studentName}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setMessagingStudent(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <textarea
                rows={5}
                value={messagingStudent.customMessage}
                onChange={(e) => setMessagingStudent({ ...messagingStudent, customMessage: e.target.value })}
                className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                {messagingStudent.student.studentPhone && (
                  <a
                    href={`https://wa.me/2${messagingStudent.student.studentPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                      messagingStudent.customMessage
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>فتح واتساب الطالب</span>
                  </a>
                )}
                <div className="flex items-center gap-2 mr-auto">
                  <button
                    type="button"
                    onClick={() => setMessagingStudent(null)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    disabled={isSendingPlatformMessage || !messagingStudent.customMessage.trim()}
                    onClick={handleSendPlatformMessageToStudent}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSendingPlatformMessage ? 'جاري الإرسال...' : 'إرسال عبر المنصة'}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRM RESET ATTEMPTS DIALOG */}
      <AnimatePresence>
        {confirmResetTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-amber-500" />
                <span>تأكيد إعادة تعيين المحاولات</span>
              </h3>
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400 leading-relaxed">
                هل أنت متأكد من تصفير محاولات ودرجة الطالب في &quot;{confirmResetTarget.itemTitle}&quot; ليتمكن من الحل من البداية؟
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmResetTarget(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const target = confirmResetTarget;
                    setConfirmResetTarget(null);
                    await handleDirectGrantAttempt(target.studentId, target.itemId, target.maxAttempts, true);
                  }}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs"
                >
                  تأكيد التصفير
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MANAGE ATTEMPTS MODAL */}
      <AnimatePresence>
        {selectedStudentForAttempts && (isTeacher || cp.canGrantExtraAttempts) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    إدارة المحاولات والامتحانات
                  </h3>
                  <p className="text-xs font-bold text-slate-500 mt-1">
                    الطالب: <span className="text-slate-900 dark:text-white">{selectedStudentForAttempts.studentName}</span>
                  </p>
                </div>
                <button
                  onClick={() => setSelectedStudentForAttempts(null)}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                {attemptsActionFeedback && (
                  <div
                    className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-black ${
                      attemptsActionFeedback.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                        : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                    }`}
                  >
                    {attemptsActionFeedback.type === 'success' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    )}
                    <span>{attemptsActionFeedback.message}</span>
                  </div>
                )}

                {loadingStudentProgress ? (
                  <div className="flex flex-col items-center justify-center p-12 space-y-3">
                    <div className="w-10 h-10 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
                    <p className="text-xs font-bold text-slate-500">جاري تحميل سجل المحاولات والدرجات المعتمدة...</p>
                  </div>
                ) : studentProgressList.length === 0 ? (
                  <div className="text-center p-8 text-slate-500 font-bold text-sm bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                    لم يبدأ هذا الطالب أي واجب أو امتحان في هذا الكورس بعد.
                  </div>
                ) : (
                  studentProgressList.map((prog) => {
                    const itemId = prog.item_id || prog.itemId;
                    const maxItemAttempts = prog.unit_items?.max_exam_attempts || 3;
                    const isExhausted = (prog.attempts_count || 0) >= maxItemAttempts && !prog.is_passed;
                    const isBusy = actionInProgressItemId === itemId;

                    return (
                      <div
                        key={prog.id || itemId}
                        className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="flex-1 space-y-2">
                          <h4 className="text-sm font-black text-slate-900 dark:text-white">
                            {prog.unit_items?.title || 'عنصر غير معروف'}
                          </h4>
                          <div className="flex flex-wrap items-center gap-2 text-xs font-bold tabular-nums">
                            <span className="text-slate-700 dark:text-slate-300">
                              {prog.unit_items?.item_type === 'homework' ? 'واجب تفاعلي' : 'امتحان شامل'}
                            </span>
                            <span aria-hidden="true" className="text-slate-400">·</span>
                            <span
                              className={
                                prog.is_passed
                                  ? 'text-emerald-700 dark:text-emerald-300'
                                  : isExhausted
                                  ? 'text-rose-700 dark:text-rose-300'
                                  : 'text-amber-700 dark:text-amber-300'
                              }
                            >
                              {prog.is_passed ? 'ناجح ومعتمد' : isExhausted ? 'استنفد المحاولات' : 'متاح للحل'}
                            </span>
                            <span aria-hidden="true" className="text-slate-400">·</span>
                            <span className="text-slate-700 dark:text-slate-300">
                              المحاولات: {prog.attempts_count || 0} / {maxItemAttempts}
                            </span>
                            <span aria-hidden="true" className="text-slate-400">·</span>
                            <span className="text-indigo-700 dark:text-indigo-300">
                              أعلى درجة: {prog.highest_score || 0}%
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                          <button
                            onClick={() => handleGrantAttempt(prog)}
                            disabled={isBusy}
                            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
                          >
                            {isBusy ? (
                              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Plus className="w-3.5 h-3.5" />
                            )}
                            <span>منح فرصة إضافية</span>
                          </button>

                          <button
                            onClick={() => handleResetAttempts(prog)}
                            disabled={isBusy}
                            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-black text-xs shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>تصفير شامل</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 6: LARGE DELETE CONFIRMATION MODAL */}
      <DeleteConfirmationModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="تأكيد حذف المحتوى"
        itemType={deleteTarget?.itemTypeLabel || 'المحتوى'}
        itemName={deleteTarget?.title || ''}
        warningNote={deleteTarget?.warningNote}
        isLoading={isDeletingTarget}
      />

      {/* Floating Bottom Feedback Toast */}
      {toastBanner && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-3.5 rounded-2xl shadow-2xl font-black text-sm border-2 ${
            toastBanner.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-400'
              : 'bg-rose-600 text-white border-rose-400'
          }`}
        >
          {toastBanner.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-white shrink-0" />
          )}
          <span>{toastBanner.text}</span>
        </div>
      )}
    </div>
  );
}
