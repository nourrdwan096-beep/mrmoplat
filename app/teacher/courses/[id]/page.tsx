'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowRight, BookOpen, Layers, Plus, Video, CheckSquare, 
  FileText, Bookmark, FileSpreadsheet, Trash2, Edit3, Eye, 
  Copy, Key, Users, Settings, Sparkles, CheckCircle2, 
  X, AlertCircle, RefreshCw, Lock, ShieldCheck, Play, Download,
  ExternalLink, ChevronDown, ChevronUp, Printer, Send,
  Search, Filter, Smartphone, Building2, Share2, CreditCard,
  MessageCircle, UserCheck, Check, Phone, Award, RotateCcw,
  ThumbsUp, AlertTriangle, CheckCircle, Clock, FileQuestion,
  MessageSquare, PhoneCall, HelpCircle, ShieldAlert, Calendar
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
  fetchQuestionsByItem,
  saveQuestionsForItem,
  copyExamToTargetCourse,
  fetchCodesByCourse,
  generateActivationCodes,
  deleteActivationCode,
  saveCourse,
  removeCourse,
  fetchCourseEnrolledStudents,
  fetchStudentProgressForTeacher,
  grantExtraAttempt,
  grantStudentExtraAttempts,
  CourseData,
  UnitData,
  UnitItemData,
  QuestionData,
  ActivationCodeData,
  EnrolledStudentData,
  StudentAssessmentProgress
} from '@/lib/academicService';
import {
  autoFetchVideoDetails,
  obfuscateVideoIdentifier,
  deobfuscateVideoIdentifier,
} from '@/lib/videoService';
import SecuredVideoPlayer from '@/components/SecuredVideoPlayer';
import CoverImageSelector from '@/components/CoverImageSelector';
import PriceControlSelector from '@/components/PriceControlSelector';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';
import PdfResourceUploader from '@/components/PdfResourceUploader';
import ActivationRechargeCard from '@/components/ActivationRechargeCard';
import { detectLinkProvider } from '@/lib/storageService';

interface PageProps {
  params: Promise<{ id: string }>;
}

function generateQuestionId(): string {
  return 'q_' + Math.random().toString(36).substring(2, 10);
}

export default function TeacherCourseDetailPage({ params }: PageProps) {
  const resolvedParams = React.use(params);
  const courseId = resolvedParams.id;
  const router = useRouter();

  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'units' | 'questions_bank' | 'codes' | 'students' | 'settings'>('units');

  // Main State
  const [course, setCourse] = useState<CourseData | null>(null);
  const [allCourses, setAllCourses] = useState<CourseData[]>([]);
  const [units, setUnits] = useState<UnitData[]>([]);
  const [unitItems, setUnitItems] = useState<{ [unitId: string]: UnitItemData[] }>({});
  const [codes, setCodes] = useState<ActivationCodeData[]>([]);
  const [loading, setLoading] = useState(true);

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
          setDurationMinutes(''); // Clear default if not found
        }
        setVideoDetectionMessage(`✓ تم التعرف بنجاح! المدة: ${info.durationMinutes || 'قيد التحديث'} دقيقة | ${info.title?.slice(0, 35) || 'محاضرة تعليمية'}`);
      }
    } catch {
      setVideoDetectionMessage('✓ تم حفظ وتأمين معرّف الفيديو');
    } finally {
      setIsDetectingVideo(false);
    }
  };

  // Question Bank Builder Modal

  // Transfer / Copy Exam Modal
  const [activeExamItem, setActiveExamItem] = useState<UnitItemData | null>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferTargetCourseId, setTransferTargetCourseId] = useState('');
  const [transferTargetUnits, setTransferTargetUnits] = useState<UnitData[]>([]);
  const [transferTargetUnitId, setTransferTargetUnitId] = useState('');
  const [transferExamTitle, setTransferExamTitle] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);

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
  const [itemSaveSuccessMsg, setItemSaveSuccessMsg] = useState<string | null>(null);

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

  const toggleStudentAssessments = (studentId: string) => {
    setExpandedStudentAssessments(prev => ({
      ...prev,
      [studentId]: !prev[studentId]
    }));
  };

  const handleDirectGrantAttempt = async (
    studentId: string, 
    itemId: string, 
    extraAttempts: number = 1, 
    resetCompletely: boolean = false
  ) => {
    const actionKey = `${studentId}_${itemId}`;
    setAttemptActionLoading(prev => ({ ...prev, [actionKey]: true }));
    try {
      const res = await grantStudentExtraAttempts(studentId, courseId, itemId, extraAttempts, resetCompletely);
      if (res.success) {
        // Refresh enrolled students list
        const updatedList = await fetchCourseEnrolledStudents(courseId);
        setEnrolledStudents(updatedList);
        if (selectedStudentForAttempts && selectedStudentForAttempts.studentId === studentId) {
          const updatedStudent = updatedList.find(s => s.studentId === studentId) || null;
          setSelectedStudentForAttempts(updatedStudent);
          const data = await fetchStudentProgressForTeacher(studentId, courseId);
          setStudentProgressList(data || []);
        }
      }
    } catch (err) {
      console.error('handleDirectGrantAttempt error:', err);
    } finally {
      setAttemptActionLoading(prev => ({ ...prev, [actionKey]: false }));
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
  const [isDeletingTarget, setIsDeletingTarget] = useState(false);

  const openManageAttempts = async (student: EnrolledStudentData) => {
    setSelectedStudentForAttempts(student);
    setLoadingStudentProgress(true);
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
    if (!selectedStudentForAttempts) return;
    try {
      const success = await grantExtraAttempt(
        selectedStudentForAttempts.studentId, 
        courseId, 
        itemProgress.item_id,
        itemProgress.unit_items?.max_exam_attempts || 1
      );
      if (success) {
        // refresh list
        const updatedList = await fetchCourseEnrolledStudents(courseId);
        setEnrolledStudents(updatedList);
        const data = await fetchStudentProgressForTeacher(selectedStudentForAttempts.studentId, courseId);
        setStudentProgressList(data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Initial Load
  const loadData = async () => {
    setLoading(true);
    let found = await getCourseById(courseId);
    const coursesList = await fetchAllCourses();
    setAllCourses(coursesList);
    if (!found) {
      found = coursesList.find(c => c.id === courseId) || null;
    }
    if (!found) {
      setCourse(null);
      setLoading(false);
      return;
    }
    setCourse(found);

    // Fetch units
    const unitsList = await fetchUnitsByCourse(courseId);
    setUnits(unitsList);

    // Fetch items for each unit
    const itemsMap: { [unitId: string]: UnitItemData[] } = {};
    for (const u of unitsList) {
      const items = await fetchItemsByUnit(u.id);
      itemsMap[u.id] = items;
    }
    setUnitItems(itemsMap);

    // Fetch codes
    const codesList = await fetchCodesByCourse(courseId);
    setCodes(codesList);

    // Fetch enrolled students
    const studentsList = await fetchCourseEnrolledStudents(courseId);
    setEnrolledStudents(studentsList);

    setLoading(false);
  };

  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      let found = await getCourseById(courseId);
      const coursesList = await fetchAllCourses();
      if (!isMounted) return;
      setAllCourses(coursesList);

      if (!found) {
        found = coursesList.find(c => c.id === courseId) || null;
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

      const codesList = await fetchCodesByCourse(courseId);
      if (!isMounted) return;
      setCodes(codesList);

      const studentsList = await fetchCourseEnrolledStudents(courseId);
      if (!isMounted) return;
      setEnrolledStudents(studentsList);

      setLoading(false);
    };

    run();
    return () => { isMounted = false; };
  }, [courseId]);

  // Unit handlers
  const handleOpenNewUnit = () => {
    setEditingUnit(null);
    setUnitTitle(`الوحدة ${units.length + 1}: `);
    setUnitDesc('');
    setUnitNumber(units.length + 1);
    setIsUnitModalOpen(true);
  };

  const handleOpenEditUnit = (unit: UnitData) => {
    setEditingUnit(unit);
    setUnitTitle(unit.title);
    setUnitDesc(unit.description || '');
    setUnitNumber(unit.unitNumber);
    setIsUnitModalOpen(true);
  };

  const handleSaveUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitTitle.trim()) return;

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
  };

  // Delete Handlers with Confirmation Modal
  const requestDeleteUnit = (unit: UnitData) => {
    setDeleteTarget({
      type: 'unit',
      id: unit.id,
      title: `الوحدة رقم (${unit.unitNumber}): ${unit.title}`,
      itemTypeLabel: 'الوحدة الدراسية بالكامل',
      warningNote: 'سيتم حذف هذه الوحدة وجميع الفيديوهات والامتحانات والواجبات والمذكرات التابعة لها بشكل نهائي.'
    });
  };

  const requestDeleteItem = (item: UnitItemData) => {
    const typeLabel = 
      item.itemType === 'video' ? 'فيديو الشرح' :
      item.itemType === 'homework' ? 'الواجب المنزلي' :
      item.itemType === 'exam' ? 'الامتحان الشامل' :
      item.itemType === 'concept_sheet' ? 'ورقة المفاهيم' : 'الملزمة والملخص';

    setDeleteTarget({
      type: 'item',
      id: item.id,
      title: item.title,
      itemTypeLabel: typeLabel,
      warningNote: (item.itemType === 'exam' || item.itemType === 'homework')
        ? 'سيتم حذف هذا الامتحان وجميع أسئلته وبنك الأسئلة وإجابات الطلاب المسجلة عليه.'
        : 'سيتم إزالة هذا المحتوى نهائياً من قائمة دروس الطلاب في الكورس.'
    });
  };

  const requestDeleteCode = (code: ActivationCodeData) => {
    setDeleteTarget({
      type: 'code',
      id: code.id,
      title: `كود التفعيل: ${code.code} (${code.batchName || 'دفعة عامة'})`,
      itemTypeLabel: 'كود التفعيل',
      warningNote: 'لن يتمكن أي طالب من استخدام هذا الكود لتفعيل الكورس بعد الحذف.'
    });
  };

  const requestDeleteCourse = () => {
    if (!course) return;
    setDeleteTarget({
      type: 'course',
      id: course.id,
      title: course.title,
      itemTypeLabel: 'الكورس التعليمي بالكامل',
      warningNote: 'تحذير هام جداً: سيتم حذف الكورس بجميع وحداته ودروسه وامتحاناته وأكواد تفعيله نهائياً من المنصة.'
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeletingTarget(true);
    try {
      if (deleteTarget.type === 'unit') {
        await removeUnit(deleteTarget.id);
        await loadData();
      } else if (deleteTarget.type === 'item') {
        await removeUnitItem(deleteTarget.id);
        await loadData();
      } else if (deleteTarget.type === 'code') {
        await deleteActivationCode(deleteTarget.id);
        if (course) {
          const updated = await fetchCodesByCourse(course.id);
          setCodes(updated);
        }
      } else if (deleteTarget.type === 'course') {
        await removeCourse(deleteTarget.id);
        router.push('/teacher/courses');
        return;
      }
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setIsDeletingTarget(false);
      setDeleteTarget(null);
    }
  };

  // Item handlers
  const handleOpenNewItem = (unitId: string, type: 'video' | 'homework' | 'exam' | 'concept_sheet' | 'summary_pdf') => {
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
    setTargetUnitId(item.unitId);
    setEditingItem(item);
    setItemType(item.itemType);
    setItemTitle(item.title);
    setItemDesc(item.description || '');
    setDurationMinutes(item.durationMinutes || '');
    setTotalMarks(item.totalMarks || 100);
    setPassingScore(item.passingScorePercentage || 60);
    setMaxAttempts(item.maxExamAttempts !== undefined && item.maxExamAttempts !== null && !isNaN(Number(item.maxExamAttempts)) ? Math.max(1, Number(item.maxExamAttempts)) : 3);
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

    const securedObfuscatedId = itemType === 'video' && videoUrl
      ? obfuscateVideoIdentifier(videoUrl)
      : videoUrl;

    try {
      const saved = await saveUnitItem({
        id: editingItem?.id,
        unitId: targetUnitId,
        courseId,
        itemType,
        title: itemTitle.trim(),
        description: itemDesc.trim(),
        orderIndex: editingItem ? editingItem.orderIndex : Math.floor(Date.now() / 1000),
        durationMinutes: (itemType === 'exam' || itemType === 'homework')
          ? (durationMinutes === '' ? 30 : Math.max(1, Number(durationMinutes)))
          : (durationMinutes === '' ? 0 : Number(durationMinutes)),
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
      setItemSaveSuccessMsg(`تم حفظ ${(itemType === 'exam' ? 'الامتحان' : itemType === 'homework' ? 'الواجب' : 'المحتوى')} وتحديد ${maxAttempts >= 999 ? 'محاولات غير محدودة' : `${maxAttempts} محاولات`} بنجاح!`);
      setTimeout(() => setItemSaveSuccessMsg(null), 4500);

      if (navigateToQuestions && (itemType === 'exam' || itemType === 'homework') && saved?.id) {
        router.push(`/teacher/courses/${courseId}/items/${saved.id}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'حدث خطأ أثناء حفظ المحتوى. يرجى التأكد من تحديث قاعدة البيانات.');
    }
  };


  // Question Bank handlers
  const handleOpenQuestionBank = async (item: UnitItemData) => {
    router.push(`/teacher/courses/${courseId}/items/${item.id}`);
  };

  // Transfer Exam / Homework Modal
  const handleOpenTransferExam = (item: UnitItemData) => {
    setActiveExamItem(item);
    setTransferExamTitle(`${item.title} (نسخة منقولة)`);
    setTransferTargetCourseId(courseId);
    fetchUnitsByCourse(courseId).then(u => {
      setTransferTargetUnits(u);
      if (u.length > 0) setTransferTargetUnitId(u[0].id);
    });
    setIsTransferModalOpen(true);
  };

  const handleExecuteTransfer = async () => {
    if (!activeExamItem || !transferTargetCourseId || !transferTargetUnitId) return;
    setIsTransferring(true);
    try {
      const copiedItem = await copyExamToTargetCourse(
        activeExamItem.id,
        transferTargetCourseId,
        transferTargetUnitId,
        transferExamTitle
      );
      setIsTransferring(false);
      setIsTransferModalOpen(false);
      await loadData();
      if (copiedItem) {
        const wantsToNavigate = window.confirm(
          `تم نسخ ونقل ${activeExamItem.itemType === 'homework' ? 'الواجب' : 'الامتحان'} بجميع أسئلته ومحتواه بنجاح! 🎯\n\nهل تود الانتقال المباشر لبنك أسئلة النسخة الجديدة؟`
        );
        if (wantsToNavigate) {
          router.push(`/teacher/courses/${transferTargetCourseId}/items/${copiedItem.id}`);
        }
      }
    } catch (err) {
      console.error(err);
      setIsTransferring(false);
      alert('حدث خطأ أثناء النسخ والنقل. يرجى المحاولة مرة أخرى.');
    }
  };

  // Codes generator
  const handleGenerateCodes = async () => {
    if (!course) return;

    // Strict guard: Codes are only for PAID courses
    if (course.isFree || (course.price ?? 0) <= 0) {
      alert('هذا الكورس مجاني ومتاح لجميع الطلاب بدون أكواد. توليد كروت الشحن والأكواد متاح حصرياً للكورسات المدفوعة فقط.');
      return;
    }

    setIsGeneratingCodes(true);
    setGenerateSuccessMsg(null);
    try {
      const isPersonalized = codeGenerationMode === 'assigned_student' && targetStudentName.trim().length > 0;
      const count = isPersonalized ? 1 : Number(codesCount);
      const batchLabel = centerOrGroupName.trim() 
        ? centerOrGroupName.trim() 
        : codesBatchName.trim() || 'دفعة عامة';

      const newGenerated = await generateActivationCodes(course.id, count, batchLabel, {
        assignedStudentName: isPersonalized ? targetStudentName.trim() : undefined,
        studentBirthDate: isPersonalized && targetStudentBirthDate ? targetStudentBirthDate.trim() : undefined,
        assignedStudentBirthDate: isPersonalized && targetStudentBirthDate ? targetStudentBirthDate.trim() : undefined,
        centerOrGroup: centerOrGroupName.trim() || undefined,
        price: course.price,
        courseTitle: course.title,
      });

      // Immediate state update guarantees newly generated codes appear without delay
      setCodes(prev => {
        const genIds = new Set(newGenerated.map(g => g.id));
        return [...newGenerated, ...prev.filter(p => !genIds.has(p.id))];
      });

      setGenerateSuccessMsg(isPersonalized 
        ? `✓ تم توليد كارت الشحن المخصص للطالب (${targetStudentName.trim()}) بنجاح! جاهز للطباعة أو الإرسال.` 
        : `✓ تم توليد عدد (${count}) كود شحن بنجاح!`);

      if (isPersonalized) {
        setTargetStudentName('');
        setTargetStudentBirthDate('');
      }
    } catch (err: any) {
      console.error('Error generating codes:', err);
      alert(err?.message || 'حدث خطأ أثناء توليد الأكواد');
    } finally {
      setIsGeneratingCodes(false);
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
          href="/teacher/courses"
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
              href="/teacher/courses"
              className="p-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl transition-colors shrink-0 mt-1"
            >
              <ArrowRight className="w-5 h-5" />
            </Link>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-black text-xs rounded-xl">
                  {course.stage === 'high' ? 'المرحلة الثانوية' : 'المرحلة الإعدادية'}
                </span>
                <span className="px-3 py-1 bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 font-black text-xs rounded-xl">
                  الصف {course.grade}
                </span>
                <span className="px-3 py-1 bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 font-black text-xs rounded-xl">
                  {course.educationType === 'general' ? 'عام' : course.educationType === 'azhar' ? 'أزهر' : course.educationType === 'arabic' ? 'عربي' : 'لغات'}
                </span>
                <span className={`px-3 py-1 font-black text-xs rounded-xl ${course.isPublished ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
                  {course.isPublished ? 'منشور للطلاب' : 'مسودة مغلقة'}
                </span>
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
            <button
              onClick={handleOpenNewUnit}
              className="flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-200 dark:shadow-none transition-all hover:-translate-y-0.5"
            >
              <Plus className="w-4 h-4" />
              إضافة وحدة / يونت جديدة
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className="p-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-2xl transition-colors"
              title="إعدادات الكورس"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto border-t border-slate-100 dark:border-slate-800 pt-4 scrollbar-none">
          <button
            onClick={() => setActiveTab('units')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-sm whitespace-nowrap transition-all ${
              activeTab === 'units'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200 dark:shadow-none'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            الوحدات والدروس ({units.length})
          </button>

          <button
            onClick={() => setActiveTab('questions_bank')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-sm whitespace-nowrap transition-all ${
              activeTab === 'questions_bank'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200 dark:shadow-none'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            بنك الامتحانات والأسئلة
          </button>

          <button
            onClick={() => setActiveTab('codes')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-sm whitespace-nowrap transition-all ${
              activeTab === 'codes'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200 dark:shadow-none'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Key className="w-4 h-4" />
            توليد وطباعة الأكواد ({codes.length})
          </button>

          <button
            onClick={() => setActiveTab('students')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-sm whitespace-nowrap transition-all ${
              activeTab === 'students'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200 dark:shadow-none'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            الطلاب المشتركون
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-sm whitespace-nowrap transition-all ${
              activeTab === 'settings'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200 dark:shadow-none'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Settings className="w-4 h-4" />
            تعديل بيانات الكورس
          </button>
        </div>
      </div>

      {/* TAB 1: UNITS & LESSONS */}
      {activeTab === 'units' && (
        <div className="space-y-6">
          {units.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center shadow-sm">
              <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Layers className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">
                لم تقم بإضافة وحدات (Units) في هذا الكورس بعد
              </h3>
              <p className="text-slate-500 font-bold max-w-md mx-auto mb-6 text-sm">
                يمكنك إضافة وحدة أولى (مثال: Unit 1 - Grammar & Vocabulary) ثم إضافة فيديوهات الشرح، الواجبات، الامتحانات، ومذكرات المفاهيم داخلها.
              </p>
              <button
                onClick={handleOpenNewUnit}
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-lg shadow-emerald-200 dark:shadow-none transition-all"
              >
                <Plus className="w-5 h-5" />
                إضافة الوحدة الأولى الآن
              </button>
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
                      <div className="w-10 h-10 bg-emerald-600 text-white rounded-2xl flex items-center justify-center font-black text-base shadow-sm">
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

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEditUnit(unit)}
                          className="p-2 text-slate-400 hover:text-emerald-600 transition-colors"
                          title="تعديل اسم الوحدة"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => requestDeleteUnit(unit)}
                          className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                          title="حذف الوحدة"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                  </div>

                  {/* Items List Inside Unit */}
                  <div className="space-y-3">
                    {items.length === 0 ? (
                      <div className="py-6 px-4 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
                        <p className="text-slate-400 text-xs font-bold mb-3">
                          لا توجد عناصر مضافة في هذه الوحدة حتى الآن.
                        </p>
                      </div>
                    ) : (
                      items.map((item, idx) => (
                        <div
                          key={item.id}
                          className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-emerald-500/40 transition-colors group"
                        >
                          <div className="flex items-center gap-3.5">
                            <span className="w-7 h-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-black text-xs rounded-xl flex items-center justify-center">
                              {idx + 1}
                            </span>

                            {/* Item Type Icon */}
                            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"
                              style={{
                                backgroundColor:
                                  item.itemType === 'video' ? '#059669' :
                                  item.itemType === 'homework' ? '#0284c7' :
                                  item.itemType === 'exam' ? '#d97706' :
                                  item.itemType === 'concept_sheet' ? '#7c3aed' : '#0d9488',
                                color: '#ffffff'
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
                                <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                  {item.itemType === 'video' ? 'فيديو شرح' :
                                   item.itemType === 'homework' ? 'واجب منزلي' :
                                   item.itemType === 'exam' ? 'امتحان شامل' :
                                   item.itemType === 'concept_sheet' ? 'ورقة مفاهيم' : 'ملازم وملخصات'}
                                </span>
                                {item.isPrerequisiteRequired && (
                                  <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center gap-1">
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

                          {/* Quick Actions & Meta */}
                          <div className="flex items-center gap-2 shrink-0">
                            {/* Video Preview - Dedicated Watch Page */}
                            {item.itemType === 'video' && (
                              <Link
                                href={`/watch/${courseId}/${item.id}`}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-400 font-bold text-xs rounded-xl transition-colors"
                              >
                                <Play className="w-3.5 h-3.5" />
                                فتح صفحة المشغل
                              </Link>
                            )}

                            {/* Exam / Homework Question Bank & Clone */}
                            {(item.itemType === 'exam' || item.itemType === 'homework') && (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleOpenQuestionBank(item)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs rounded-xl shadow-sm transition-all"
                                  title="فتح بنك الأسئلة والمواصفات الكاملة"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>{item.itemType === 'exam' ? 'بنك أسئلة الامتحان 🏆' : 'بنك أسئلة الواجب 🎯'}</span>
                                </button>
                                <button
                                  onClick={() => handleOpenTransferExam(item)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-emerald-500/10 text-slate-700 hover:text-emerald-600 dark:text-slate-300 dark:hover:text-emerald-400 font-bold text-xs rounded-xl transition-all"
                                  title={`نسخ ونقل ${item.itemType === 'homework' ? 'الواجب' : 'الامتحان'} لكورس أو وحدة أخرى`}
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                  <span className="hidden md:inline">نسخ ونقل</span>
                                </button>
                              </div>
                            )}

                            {/* PDF View with provider badge */}
                            {(item.itemType === 'concept_sheet' || item.itemType === 'summary_pdf') && item.pdfAttachmentUrl && (() => {
                              const provider = detectLinkProvider(item.pdfAttachmentUrl);
                              return (
                                <a
                                  href={item.pdfAttachmentUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={`flex items-center gap-1.5 px-3 py-1.5 font-bold text-xs rounded-xl transition-colors ${
                                    provider === 'mediafire'
                                      ? 'bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40'
                                      : provider === 'drive'
                                      ? 'bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40'
                                      : 'bg-purple-50 dark:bg-purple-500/10 hover:bg-purple-100 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800/40'
                                  }`}
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  <span>{provider === 'mediafire' ? 'MediaFire 🔥' : provider === 'drive' ? 'Drive 📁' : 'عرض الملف 📄'}</span>
                                </a>
                              );
                            })()}

                            <button
                              onClick={() => handleOpenEditItem(item)}
                              className="p-2 text-slate-400 hover:text-emerald-600 transition-colors"
                              title="تعديل العنصر"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => requestDeleteItem(item)}
                              className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                              title="حذف العنصر"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Items Action Bar */}
                  <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-black text-slate-500 pl-2">إضافة إلى هذه الوحدة:</span>
                    
                    <button
                      onClick={() => handleOpenNewItem(unit.id, 'video')}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-black text-xs rounded-xl transition-colors"
                    >
                      <Video className="w-3.5 h-3.5" />
                      + فيديو شرح
                    </button>

                    <button
                      onClick={() => handleOpenNewItem(unit.id, 'homework')}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-50 dark:bg-sky-500/10 hover:bg-sky-100 dark:hover:bg-sky-500/20 text-sky-700 dark:text-sky-400 font-black text-xs rounded-xl transition-colors"
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      + واجب منزلي
                    </button>

                    <button
                      onClick={() => handleOpenNewItem(unit.id, 'exam')}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-black text-xs rounded-xl transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      + امتحان شامل
                    </button>

                    <button
                      onClick={() => handleOpenNewItem(unit.id, 'concept_sheet')}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-50 dark:bg-purple-500/10 hover:bg-purple-100 dark:hover:bg-purple-500/20 text-purple-700 dark:text-purple-400 font-black text-xs rounded-xl transition-colors"
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                      + ورقة مفاهيم
                    </button>

                    <button
                      onClick={() => handleOpenNewItem(unit.id, 'summary_pdf')}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-50 dark:bg-teal-500/10 hover:bg-teal-100 dark:hover:bg-teal-500/20 text-teal-700 dark:text-teal-400 font-black text-xs rounded-xl transition-colors"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      + ملازم الكورس
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: QUESTIONS BANK & EXAMS OVERVIEW */}
      {activeTab === 'questions_bank' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-600" />
                بنك الامتحانات والواجبات في هذا الكورس
              </h2>
              <p className="text-xs text-slate-500 font-bold">
                إدارة الأسئلة، خيارات الإجابة، الشروحات، ونسخ الامتحانات بين الكورسات.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {units.flatMap(u => (unitItems[u.id] || []).filter(i => i.itemType === 'exam' || i.itemType === 'homework')).length === 0 ? (
              <div className="py-12 text-center text-slate-400 font-bold text-sm">
                لم تقم بإنشاء أي امتحانات أو واجبات بعد في هذا الكورس. أضف امتحان من تبويب الوحدات أعلاه 📝
              </div>
            ) : (
              units.flatMap(u => (unitItems[u.id] || []).filter(i => i.itemType === 'exam' || i.itemType === 'homework')).map(testItem => (
                <div 
                  key={testItem.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl"
                >
                  <div>
                    <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 mb-2 inline-block">
                      {testItem.itemType === 'exam' ? 'امتحان رئيسي' : 'واجب إلكتروني'}
                    </span>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">{testItem.title}</h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      درجة النجاح: {testItem.passingScorePercentage}% | الدرجة الكلية: {testItem.totalMarks} درجة | عدد المحاولات: {testItem.maxExamAttempts !== undefined && testItem.maxExamAttempts !== null ? testItem.maxExamAttempts : 3}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenQuestionBank(testItem)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                    >
                      إدارة بنك الأسئلة
                    </button>
                    <button
                      onClick={() => handleOpenTransferExam(testItem)}
                      className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all flex items-center gap-1"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      نسخ لكورس آخر
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: CODES GENERATOR & PRINTABLE VOUCHERS */}
      {activeTab === 'codes' && (
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
                  توليد كروت شحن فاخرة معتمدة تحمل لوجو المنصة، صالحة للتفعيل لمرة واحدة على (جهازين فقط) وفقاً للسياسة الأمنية.
                </p>
              </div>

              {/* Stats Chips */}
              <div className="flex flex-wrap items-center gap-2 text-xs font-black">
                <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  الإجمالي: <span className="text-emerald-600 dark:text-emerald-400">{codes.length}</span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  متاح للشحن: <span>{codes.filter(c => !c.isUsed).length}</span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                  تم التفعيل: <span>{codes.filter(c => c.isUsed).length}</span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                  مخصص لطلاب: <span>{codes.filter(c => c.assignedStudentName).length}</span>
                </div>
              </div>
            </div>

            {/* If Course is Free -> Notice Banner, otherwise Generator Form */}
            {(course.isFree || (course.price ?? 0) <= 0) ? (
              <div className="no-print p-6 rounded-3xl bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-500/30 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-xs">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  هذا الكورس مجاني ومتاح لجميع الطلاب بدون أكواد أو كروت شحن
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-bold max-w-xl mx-auto leading-relaxed">
                  الكورسات المجانية مفتوحة لجميع طلاب المنصة تلقائياً وعلى جميع الأجهزة بدون أي أكواد تفعيل. توليد كروت الشحن والأكواد الرقمية مخصص حصرياً للكورسات المدفوعة فقط.
                </p>
              </div>
            ) : (
              <div className="no-print bg-slate-50 dark:bg-slate-950 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    خيارات توليد الكروت والأكواد (خاص بالكورس المدفوع):
                  </span>

                  {/* Mode Selector Toggle */}
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
                      <span>⭐ كود مخصص لاسم وتاريخ ميلاد طالب</span>
                    </button>
                  </div>
                </div>

                {/* Dynamic Form Fields */}
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
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-1 block">
                          سيتم طباعة اسم الطالب على الكارت، وقصر التفعيل عليه.
                        </span>
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-teal-600" />
                          <span>تاريخ ميلاد الطالب</span>
                          <span className="text-teal-600 dark:text-teal-400 text-[10px] font-normal">(مميز للأمان)</span>
                        </label>
                        <input
                          type="date"
                          value={targetStudentBirthDate}
                          onChange={(e) => setTargetStudentBirthDate(e.target.value)}
                          className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-teal-300 dark:border-teal-700/60 rounded-xl font-bold text-sm text-slate-900 dark:text-white focus:outline-hidden focus:border-teal-500"
                        />
                        <span className="text-[10px] text-teal-600 dark:text-teal-400 font-medium mt-1 block">
                          يتم إدراج تاريخ الميلاد داخل الكود لتخصيصه بشكل كامل.
                        </span>
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          السنتر / المجموعة (اختياري)
                        </label>
                        <input
                          type="text"
                          value={centerOrGroupName}
                          onChange={(e) => setCenterOrGroupName(e.target.value)}
                          placeholder="مثال: سنتر الأهرام - مجموعة السبت"
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

                {/* Feedback Success Message */}
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

            {/* Management & Filter Toolbar */}
            <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2">
              {/* Search & Filter Chips */}
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

                {/* Filter Status Chips */}
                <div className="flex items-center gap-1 text-xs font-bold">
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
                    المتاحة ({codes.filter(c => !c.isUsed).length})
                  </button>
                  <button
                    onClick={() => setCodeFilterStatus('used')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      codeFilterStatus === 'used'
                        ? 'bg-slate-700 text-white font-black'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    المستخدمة ({codes.filter(c => c.isUsed).length})
                  </button>
                </div>
              </div>

              {/* View Switcher & Print / Export Action Buttons */}
              <div className="flex items-center gap-2">
                {/* View Mode Toggle */}
                <div className="inline-flex p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setCodesViewMode('cards')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      codesViewMode === 'cards'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                    title="عرض كروت الشحن"
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
                    title="عرض جدول مدمج"
                  >
                    جدول
                  </button>
                </div>

                {/* Print Sheet Button */}
                <button
                  type="button"
                  onClick={() => window.print()}
                  disabled={codes.length === 0}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  title="طباعة جميع الكروت المعروضة على ورق A4"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة كروت الشحن (A4)</span>
                </button>

                {/* Copy All Available Text */}
                <button
                  type="button"
                  onClick={() => {
                    const available = codes.filter(c => !c.isUsed).map(c => {
                      return `${c.code}${c.assignedStudentName ? ` (طالب: ${c.assignedStudentName})` : ''}${c.centerOrGroup ? ` [${c.centerOrGroup}]` : ''}`;
                    }).join('\n');
                    if (!available) {
                      alert('لا توجد أكواد متاحة للشحن حالياً للنسخ.');
                      return;
                    }
                    navigator.clipboard.writeText(available);
                    alert(`✓ تم نسخ (${codes.filter(c => !c.isUsed).length}) كود متاح إلى الحافظة بنجاح!`);
                  }}
                  disabled={codes.length === 0}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                  title="نسخ جميع الأكواد المتاحة كنص"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>نسخ الأكواد كنص</span>
                </button>
              </div>
            </div>

            {/* Filter Logic */}
            {(() => {
              const filteredCodes = codes.filter((c) => {
                const matchesStatus = 
                  codeFilterStatus === 'all' ? true :
                  codeFilterStatus === 'available' ? !c.isUsed :
                  codeFilterStatus === 'used' ? c.isUsed : true;

                const q = codeSearchQuery.trim().toLowerCase();
                const matchesQuery = !q ? true : (
                  c.code.toLowerCase().includes(q) ||
                  (c.assignedStudentName && c.assignedStudentName.toLowerCase().includes(q)) ||
                  (c.centerOrGroup && c.centerOrGroup.toLowerCase().includes(q)) ||
                  (c.batchName && c.batchName.toLowerCase().includes(q)) ||
                  (c.usedByStudentName && c.usedByStudentName.toLowerCase().includes(q))
                );

                return matchesStatus && matchesQuery;
              });

              if (filteredCodes.length === 0) {
                return (
                  <div className="py-12 text-center text-slate-400 font-bold text-xs bg-slate-50 dark:bg-slate-950/60 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                    {codes.length === 0 
                      ? 'لا توجد أكواد شحن مولدة بعد. اختر نوع الكود واضغط "توليد الأكواد الآن" بالأعلى.' 
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
                        onDelete={() => requestDeleteCode(c)}
                        onCopy={(codeText) => {
                          alert(`تم نسخ الكود: ${codeText}`);
                        }}
                      />
                    ))}
                  </div>
                );
              }

              // Table View
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
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 font-black">
                                ⭐ {c.assignedStudentName}
                              </span>
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
                                ❌ تم التفعيل {c.usedByStudentName ? `(بواسطة: ${c.usedByStudentName})` : ''}
                              </span>
                            ) : (
                              <span className="text-emerald-600 dark:text-emerald-400">
                                ✓ متاح للشحن
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-slate-400">
                            {c.usedAt ? new Date(c.usedAt).toLocaleDateString('ar-EG') : '—'}
                          </td>
                          <td className="p-3 text-center">
                            <div className="inline-flex items-center gap-1">
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(c.code);
                                  alert(`تم نسخ الكود: ${c.code}`);
                                }}
                                className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg"
                                title="نسخ الكود"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => requestDeleteCode(c)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                                title="حذف الكود"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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
      {activeTab === 'students' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
            
            {/* Header & Overall Student Count */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-teal-600" />
                  الطلاب المشتركون في هذا الكورس
                </h2>
                <p className="text-xs text-slate-500 font-bold mt-1">
                  متابعة جميع الطلاب المشتركين، أرقام هواتفهم، طريقة الدفع، ونسبة تقدمهم مع الالتزام الصارم بسياسة (جهازين فقط لكل طالب).
                </p>
              </div>

              {/* Stats & Performance Counters */}
              <div className="flex flex-wrap items-center gap-2 text-xs font-black">
                <div className="px-3.5 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                  إجمالي المشتركين: <span>{enrolledStudents.length}</span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>يحتاج اتصال عاجل (استنفاد/رُسوب): {enrolledStudents.filter(e => e.recommendation?.level === 'critical').length}</span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>مستوى منخفض (متابعة): {enrolledStudents.filter(e => e.recommendation?.level === 'warning').length}</span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" />
                  <span>متفوقون (تقدير وتشجيع): {enrolledStudents.filter(e => e.recommendation?.level === 'excellent').length}</span>
                </div>
              </div>
            </div>

            {/* Filter and Search Bar */}
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

                {/* Academic Status Filter */}
                <div className="flex items-center gap-1.5 text-xs font-black overflow-x-auto pb-1">
                  <span className="text-[11px] text-slate-400 font-bold ml-1 shrink-0">حالة الطالب:</span>
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
                    <span>اتصال عاجل ({enrolledStudents.filter(e => e.recommendation?.level === 'critical').length})</span>
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
                    <span>متابعة ({enrolledStudents.filter(e => e.recommendation?.level === 'warning').length})</span>
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
                    <span>متفوقون ({enrolledStudents.filter(e => e.recommendation?.level === 'excellent').length})</span>
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
                    <span>لم يبدأ ({enrolledStudents.filter(e => e.recommendation?.level === 'idle').length})</span>
                  </button>
                </div>
              </div>

              {/* Payment Method Filter Pills */}
              <div className="flex items-center gap-1.5 text-xs font-bold overflow-x-auto pb-1 border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
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
                  أكواد سنتر ({enrolledStudents.filter(e => e.paymentMethod === 'activation_code').length})
                </button>
                <button
                  onClick={() => setStudentFilterMethod('fawry')}
                  className={`px-2.5 py-1 rounded-lg whitespace-nowrap text-[11px] transition-all ${
                    studentFilterMethod === 'fawry'
                      ? 'bg-cyan-600 text-white font-black'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  فوري ({enrolledStudents.filter(e => e.paymentMethod === 'fawry').length})
                </button>
                <button
                  onClick={() => setStudentFilterMethod('wallet')}
                  className={`px-2.5 py-1 rounded-lg whitespace-nowrap text-[11px] transition-all ${
                    studentFilterMethod === 'wallet'
                      ? 'bg-amber-600 text-white font-black'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  المحفظة ({enrolledStudents.filter(e => e.paymentMethod === 'wallet').length})
                </button>
              </div>
            </div>

            {/* Students List - Single Unrepeated Card per Student */}
            {(() => {
              const filteredStudents = enrolledStudents.filter((st) => {
                // Filter by payment method
                const matchesMethod = 
                  studentFilterMethod === 'all' ? true : st.paymentMethod === studentFilterMethod;

                // Filter by academic recommendation/status
                const matchesStatus = 
                  studentStatusFilter === 'all' ? true : st.recommendation?.level === studentStatusFilter;

                // Filter by search query
                const q = studentSearchQuery.trim().toLowerCase();
                const matchesQuery = !q ? true : (
                  st.studentName.toLowerCase().includes(q) ||
                  (st.studentPhone && st.studentPhone.includes(q)) ||
                  (st.parentPhone && st.parentPhone.includes(q))
                );

                return matchesMethod && matchesStatus && matchesQuery;
              });

              if (filteredStudents.length === 0) {
                return (
                  <div className="py-16 text-center space-y-3 bg-slate-50 dark:bg-slate-950/60 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                    <Users className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                      {enrolledStudents.length === 0 
                        ? 'لا يوجد طلاب مسجلين في هذا الكورس حالياً. سيظهر الطلاب هنا فور اشتراكهم أو تفعيل كود الشحن.'
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
                            ? 'border-rose-400 dark:border-rose-800/80 ring-1 ring-rose-400/20 shadow-rose-100/20'
                            : recLevel === 'warning'
                            ? 'border-amber-400 dark:border-amber-800/80 ring-1 ring-amber-400/20'
                            : recLevel === 'excellent'
                            ? 'border-emerald-400 dark:border-emerald-800/80 ring-1 ring-emerald-400/20'
                            : 'border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        {/* TOP ROW: Student Identity & Payment Badge */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4">
                          <div className="flex items-center gap-3.5">
                            <div className={`w-12 h-12 rounded-2xl text-white font-black text-base flex items-center justify-center shrink-0 shadow-md ${
                              recLevel === 'critical' ? 'bg-rose-600' :
                              recLevel === 'excellent' ? 'bg-emerald-600' :
                              recLevel === 'warning' ? 'bg-amber-600' : 'bg-teal-600'
                            }`}>
                              {st.studentName.charAt(0) || 'ط'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-base font-black text-slate-900 dark:text-white">
                                  {st.studentName}
                                </h3>
                                {recLevel === 'excellent' && (
                                  <span className="px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-black flex items-center gap-1 border border-emerald-300 dark:border-emerald-800">
                                    <Award className="w-3 h-3" />
                                    <span>طالب متفوق</span>
                                  </span>
                                )}
                                {recLevel === 'critical' && (
                                  <span className="px-2 py-0.5 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[10px] font-black flex items-center gap-1 border border-rose-300 dark:border-rose-800">
                                    <ShieldAlert className="w-3 h-3" />
                                    <span>استنفاد محاولات ورُسوب</span>
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-slate-400 font-bold block mt-0.5">
                                تاريخ التسجيل: {new Date(st.enrolledAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                          </div>

                          {/* Payment & Device Compliance */}
                          <div className="flex items-center gap-2 flex-wrap sm:justify-end">
                            {st.paymentMethod === 'activation_code' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-black border border-emerald-500/30">
                                <Key className="w-3 h-3" />
                                <span>كود سنتر</span>
                              </span>
                            ) : st.paymentMethod === 'fawry' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 text-xs font-black border border-cyan-500/30">
                                <CreditCard className="w-3 h-3" />
                                <span>فوري / كاش</span>
                              </span>
                            ) : st.paymentMethod === 'wallet' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-black border border-amber-500/30">
                                <span>رصيد محفظة</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-black">
                                <span>كورس مجاني</span>
                              </span>
                            )}

                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 text-xs font-black border border-teal-200 dark:border-teal-800">
                              <ShieldCheck className="w-3 h-3 text-teal-500" />
                              <span>جهازين مصرحين: {st.activeDevicesCount || 1} نشط</span>
                            </span>
                          </div>
                        </div>

                        {/* ROW 2: SMART ADVISORY BOX (توصية المعلم والمتابعة الذكية) */}
                        <div className={`p-4 rounded-2xl border transition-all ${
                          recLevel === 'critical'
                            ? 'bg-rose-50/90 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800/80 text-rose-900 dark:text-rose-100'
                            : recLevel === 'warning'
                            ? 'bg-amber-50/90 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/80 text-amber-900 dark:text-amber-100'
                            : recLevel === 'excellent'
                            ? 'bg-emerald-50/90 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-100'
                            : recLevel === 'good'
                            ? 'bg-sky-50/90 dark:bg-sky-950/30 border-sky-300 dark:border-sky-800/80 text-sky-900 dark:text-sky-100'
                            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                        }`}>
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                {recLevel === 'critical' && <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />}
                                {recLevel === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />}
                                {recLevel === 'excellent' && <Award className="w-4 h-4 text-emerald-600 shrink-0" />}
                                {recLevel === 'good' && <ThumbsUp className="w-4 h-4 text-sky-600 shrink-0" />}
                                {recLevel === 'idle' && <Clock className="w-4 h-4 text-slate-500 shrink-0" />}
                                <h4 className="text-sm font-black">
                                  {st.recommendation?.title || 'متابعة أداء الطالب'}
                                </h4>
                              </div>
                              <p className="text-xs font-bold leading-relaxed">
                                {st.recommendation?.message}
                              </p>
                            </div>

                            {/* SMART ACTION BUTTONS */}
                            <div className="flex items-center gap-2 flex-wrap shrink-0">
                              {/* If Critical: Teacher MUST call parent or student */}
                              {recLevel === 'critical' && (
                                <>
                                  {st.parentPhone && (
                                    <a
                                      href={`tel:${st.parentPhone}`}
                                      className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition-transform active:scale-95"
                                    >
                                      <PhoneCall className="w-3.5 h-3.5" />
                                      <span>اتصل بولي الأمر</span>
                                    </a>
                                  )}
                                  <button
                                    onClick={() => setMessagingStudent({
                                      student: st,
                                      customMessage: st.recommendation?.suggestedTemplate || `السلام عليكم ورحمة الله، مع حضراتكم مستر محمد رضوان بخصوص الطالب/ة ${st.studentName}. نود التنبيه أن الطالب يحتاج متابعة عاجلة في امتحانات وواجبات مادة اللغة الإنجليزية.`
                                    })}
                                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition-transform active:scale-95"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                    <span>واتساب عاجل</span>
                                  </button>
                                </>
                              )}

                              {/* If Warning: Teacher should call or message student */}
                              {recLevel === 'warning' && (
                                <>
                                  {st.studentPhone && (
                                    <a
                                      href={`tel:${st.studentPhone}`}
                                      className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition-transform active:scale-95"
                                    >
                                      <Phone className="w-3.5 h-3.5" />
                                      <span>اتصال بالولد</span>
                                    </a>
                                  )}
                                  <button
                                    onClick={() => setMessagingStudent({
                                      student: st,
                                      customMessage: st.recommendation?.suggestedTemplate || `مرحباً يا بطل، مع مستر محمد رضوان. لاحظت تراجعاً بسيطاً في درجات الواجبات الأخيرة، أنا واثق في قدرتك ولازم تشد حيلك ونعوض في الامتحان القادم!`
                                    })}
                                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition-transform active:scale-95"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                    <span>رسالة متابعة واتساب</span>
                                  </button>
                                </>
                              )}

                              {/* If Excellent: Teacher does NOT need to call, just send appreciation */}
                              {recLevel === 'excellent' && (
                                <button
                                  onClick={() => setMessagingStudent({
                                    student: st,
                                    customMessage: st.recommendation?.suggestedTemplate || `ألف مبروك يا دكتور ${st.studentName}! أحييك على مستواك المشرف ودرجاتك الممتازة في كورس اللغة الإنجليزية. فخور جداً بتميزك واجتهادك ومستمر في دعمك حتى الدرجة النهائية بإذن الله. - مستر محمد رضوان 🌟`
                                  })}
                                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition-transform active:scale-95"
                                >
                                  <Award className="w-3.5 h-3.5" />
                                  <span>🎉 إرسال رسالة تقدير وتشجيع</span>
                                </button>
                              )}

                              {/* If Good or Idle */}
                              {(recLevel === 'good' || recLevel === 'idle') && (
                                <button
                                  onClick={() => setMessagingStudent({
                                    student: st,
                                    customMessage: st.recommendation?.suggestedTemplate || `مرحباً ${st.studentName}، مع مستر محمد رضوان. بالتوفيق في دراستك وتذكر دائماً أن النجاح يحتاج الاستمرار في حل الواجبات والامتحانات أولاً بأول!`
                                  })}
                                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition-transform active:scale-95"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                  <span>إرسال رسالة عبر واتساب</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* ROW 3: CONTACTS & ASSESSMENT METRICS SUMMARY */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 text-xs">
                          {/* Contact phones with quick direct actions */}
                          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 font-bold">هاتف الطالب:</span>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-black text-slate-900 dark:text-white text-xs" dir="ltr">
                                  {st.studentPhone || 'غير متوفر'}
                                </span>
                                {st.studentPhone && (
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
                                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300 text-xs" dir="ltr">
                                    {st.parentPhone}
                                  </span>
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
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Assessment Metrics Score */}
                          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 flex items-center justify-around gap-2 text-center">
                            <div>
                              <span className="text-[10px] text-slate-400 font-bold block mb-1">متوسط الدرجات</span>
                              <span className={`text-base font-black px-3 py-1 rounded-xl inline-block ${
                                (st.averageScore || 0) >= 85
                                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                  : (st.averageScore || 0) >= 60
                                  ? 'bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300'
                                  : (st.averageScore || 0) > 0
                                  ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                                  : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                              }`}>
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

                          {/* Quick Actions & Status */}
                          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between gap-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-slate-500">حالة الاختبارات:</span>
                              {isExhausted ? (
                                <span className="px-2 py-0.5 rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 text-[10px] font-black flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" />
                                  <span>مستنفد المحاولات ({st.exhaustedItemsCount})</span>
                                </span>
                              ) : (st.completedAssessments || 0) > 0 ? (
                                <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px] font-black flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>مستمر بالحل بنجاح</span>
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-lg bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-[10px] font-black">
                                  لم يبدأ بعد
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openManageAttempts(st)}
                                className="flex-1 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                              >
                                <Settings className="w-3.5 h-3.5" />
                                <span>نافذة المحاولات</span>
                              </button>
                              <button
                                onClick={() => toggleStudentAssessments(st.studentId)}
                                className="px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs transition-colors flex items-center justify-center gap-1 shadow-xs"
                              >
                                <span>{isExpanded ? 'إخفاء السجل' : 'عرض السجل'}</span>
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* ROW 4: DETAILED ACCORDION OF ALL EXAMS & HOMEWORKS (سجل تفاصيل الامتحانات والواجبات) */}
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
                                  <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                                    <BookOpen className="w-3.5 h-3.5 text-teal-600" />
                                    <span>سجل درجات ومحاولات الطالب في كل امتحان وواجب بالكورس ({st.assessments?.length || 0})</span>
                                  </h4>
                                  <span className="text-[10px] font-bold text-slate-400">
                                    اسم الطالب ثابت ولا يتكرر — سجل تراكمي شامل
                                  </span>
                                </div>

                                {(!st.assessments || st.assessments.length === 0) ? (
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
                                          {/* Item Details */}
                                          <div className="flex-1 space-y-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                                                item.itemType === 'exam'
                                                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                                                  : 'bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300'
                                              }`}>
                                                {item.itemType === 'exam' ? 'امتحان' : 'واجب'}
                                              </span>
                                              <span className="text-xs font-black text-slate-900 dark:text-white">
                                                {item.itemTitle}
                                              </span>
                                              <span className="text-[10px] text-slate-400 font-bold">
                                                ({item.unitTitle})
                                              </span>
                                            </div>

                                            {/* Status and Score Row */}
                                            <div className="flex items-center gap-2 flex-wrap text-xs font-bold pt-0.5">
                                              {/* Pass/Fail Status */}
                                              {item.isPassed ? (
                                                <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-black flex items-center gap-1">
                                                  <CheckCircle className="w-3 h-3" />
                                                  <span>اجتاز بنجاح ✓</span>
                                                </span>
                                              ) : isItemExhausted ? (
                                                <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[10px] font-black flex items-center gap-1">
                                                  <AlertCircle className="w-3 h-3" />
                                                  <span>استنفد المحاولات ورسب ⛔</span>
                                                </span>
                                              ) : item.attemptsCount > 0 ? (
                                                <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[10px] font-black">
                                                  لم يجتز (متبقي {item.maxAttempts - item.attemptsCount} فرصة)
                                                </span>
                                              ) : (
                                                <span className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px]">
                                                  لم يبدأ بعد
                                                </span>
                                              )}

                                              {/* Attempts count */}
                                              <span className="text-[11px] text-slate-500 font-bold">
                                                المحاولات: <span className="font-mono font-black text-slate-800 dark:text-slate-200">{item.attemptsCount}</span> / {item.maxAttempts}
                                              </span>

                                              {/* Score display (strictly last attempt certified score) */}
                                              {item.attemptsCount > 0 ? (
                                                <span className={`text-[11px] font-black px-2 py-0.5 rounded-md ${
                                                  item.isPassed ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                                                }`}>
                                                  الدرجة المعتمدة (آخر محاولة): {item.lastScore} / {item.totalMarks} ({Math.round(item.percentage)}%)
                                                </span>
                                              ) : (
                                                <span className="text-[10px] text-slate-400">
                                                  الدرجة الكلية: {item.totalMarks} درجات
                                                </span>
                                              )}
                                            </div>
                                          </div>

                                          {/* TEACHER INLINE ACTIONS: Grant extra attempt or Reset */}
                                          <div className="flex items-center gap-1.5 shrink-0 pt-2 md:pt-0">
                                            {/* Extra Attempt Button */}
                                            <button
                                              disabled={isActing}
                                              onClick={() => handleDirectGrantAttempt(st.studentId, item.itemId, 1, false)}
                                              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 shadow-xs ${
                                                isItemExhausted
                                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse'
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

                                            {/* Complete Reset Button */}
                                            {item.attemptsCount > 0 && (
                                              <button
                                                disabled={isActing}
                                                onClick={() => {
                                                  if (confirm(`هل أنت متأكد من إعادة تعيين كافة محاولات ودرجة الطالب في "${item.itemTitle}" ليتمكن من الحل مجدداً من الصفر؟`)) {
                                                    handleDirectGrantAttempt(st.studentId, item.itemId, item.maxAttempts, true);
                                                  }
                                                }}
                                                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold transition-all flex items-center gap-1"
                                                title="إعادة تعيين المحاولات والدرجة من البداية"
                                              >
                                                <RotateCcw className="w-3 h-3" />
                                                <span className="hidden sm:inline">إعادة تعيين</span>
                                              </button>
                                            )}
                                          </div>
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
      {activeTab === 'settings' && (
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
                    {(course.enforceUnitProgression ?? true) && <CheckCircle2 className="w-3.5 h-3.5 text-white absolute pointer-events-none" />}
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
                    {(course.enforceItemProgression ?? true) && <CheckCircle2 className="w-3.5 h-3.5 text-white absolute pointer-events-none" />}
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
                  <span className="text-[11px] text-slate-400 font-medium mt-1 block">
                    (اختياري) لن يظهر المحتوى للطلاب قبل هذا التاريخ.
                  </span>
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
                  <span className="text-[11px] text-slate-400 font-medium mt-1 block">
                    (اختياري) يُغلق الكورس تلقائياً بعد هذا التاريخ.
                  </span>
                </div>
              </div>

              {/* Freeze Course Toggle */}
              <div className="p-4 rounded-2xl border transition-colors bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
                <label className="flex items-start justify-between gap-4 cursor-pointer">
                  <div className="space-y-1">
                    <span className="font-black text-sm text-slate-900 dark:text-white block">
                      حالة نشر الكورس والظهور للطلاب
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 block leading-relaxed">
                      {course.isPublished 
                        ? '🟢 الكورس نشط ومتاح للطلاب المشتركين حالياً.' 
                        : '🔒 الكورس مجمد ومغلق مؤقتاً (لا يمكن للطلاب فتحه أو رؤية دروسه أثناء التجميد).'}
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
                  await saveCourse(course);
                  alert('تم حفظ التعديلات بنجاح! ✓');
                  await loadData();
                }}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all"
              >
                حفظ التعديلات
              </button>

              <button
                onClick={requestDeleteCourse}
                className="px-5 py-3 bg-rose-50 dark:bg-rose-500/10 text-rose-600 hover:bg-rose-100 font-bold rounded-xl transition-all"
              >
                حذف الكورس نهائياً
              </button>
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

      {/* MODAL 2: ADD / EDIT ITEM (Video, Homework, Exam, Concept, PDF) */}
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
                  {editingItem ? 'تعديل بيانات العنصر' : `إضافة ${itemType === 'video' ? 'فيديو شرح' : itemType === 'homework' ? 'واجب منزلي' : itemType === 'exam' ? 'امتحان شامل' : itemType === 'concept_sheet' ? 'ورقة مفاهيم' : 'ملزمة تلخيص'}`}
                </h3>
                <button onClick={() => setIsItemModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={(e) => handleSaveItem(e, false)} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {itemType === 'homework' ? 'عنوان الواجب' : itemType === 'exam' ? 'عنوان الامتحان' : 'العنوان'} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder={
                      itemType === 'video' ? 'مثال: محاضرة 1 - شرح الماضي البسيط والماضي المستمر' :
                      itemType === 'homework' ? 'مثال: واجب الدرس الأول - Grammar & Vocabulary' :
                      itemType === 'exam' ? 'مثال: امتحان شامل على الوحدة الأولى' : 'عنوان الملف'
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

                {/* VIDEO SPECIFICS */}
                {itemType === 'video' && (
                  <div className="space-y-4 p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl">
                    <div>
                      <label className="block text-xs font-black text-emerald-900 dark:text-emerald-300 mb-2">
                        طريقة عرض الفيديو والتأمين المطلوب:
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <label className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer font-bold text-xs ${
                          videoSourceType === 'internal_secured' 
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' 
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                        }`}>
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

                        <label className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer font-bold text-xs ${
                          videoSourceType === 'direct_youtube' 
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' 
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                        }`}>
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
                          title="استخراج العنوان والمدة تلقائياً من يوتيوب"
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
                          مدة الفيديو (تُحدد تلقائياً بالدقائق)
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
                        🔒 في المشغل الداخلي، يُشفر رابط الفيديو ويتم تفعيل العلامة المائية المتحركة برقم هاتف الطالب.
                      </div>
                    </div>
                  </div>
                )}

                {/* EXAM / HOMEWORK CONFIGURATION (DURATION TIMER, ATTEMPTS & PASSING SCORE) */}
                {(itemType === 'exam' || itemType === 'homework') && (
                  <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-200/70 dark:border-amber-500/30 rounded-2xl space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 font-black text-xs">
                        <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>إعدادات {itemType === 'homework' ? 'الواجب' : 'الامتحان'} (التايمر والمحاولات):</span>
                      </div>
                      <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border border-amber-300/60 dark:border-amber-700/60 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{durationMinutes || 30} دقيقة للحل</span>
                      </span>
                    </div>

                    {/* Row 1: Duration Timer Box (Mandatory Number Box for Minutes) */}
                    <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-amber-200 dark:border-amber-800/40 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-amber-600" />
                          <span>⏱️ عداد وقت {itemType === 'homework' ? 'الواجب' : 'الامتحان'} (بالدقائق):</span>
                        </label>
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md">
                          تايمر تنازلي إجباري أمام الطالب
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min={1}
                            max={600}
                            value={durationMinutes}
                            onChange={(e) => setDurationMinutes(e.target.value === '' ? '' : Math.max(1, Number(e.target.value)))}
                            placeholder="30"
                            className="w-28 text-center px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-black text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                          />
                          <span className="text-xs font-black text-slate-600 dark:text-slate-400">دقيقة</span>
                        </div>

                        {/* Quick Duration Presets */}
                        <div className="flex flex-wrap items-center gap-1">
                          {[15, 30, 45, 60, 90, 120].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setDurationMinutes(preset)}
                              className={`px-2 py-1 rounded-lg text-[11px] font-black transition-all ${
                                Number(durationMinutes) === preset
                                  ? 'bg-amber-500 text-white shadow-sm ring-1 ring-amber-400'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-amber-100 dark:hover:bg-slate-700'
                              }`}
                            >
                              {preset}د {preset === 30 ? '⭐' : ''}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {/* Max Attempts Control */}
                      <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-amber-200 dark:border-amber-800/40 space-y-2">
                        <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 block">
                          عدد المحاولات المسموحة للطالب:
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setMaxAttempts(Math.max(1, maxAttempts - 1))}
                            className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-black flex items-center justify-center transition-colors"
                            title="تقليل المحاولات"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min={1}
                            value={maxAttempts}
                            onChange={(e) => setMaxAttempts(Math.max(1, Number(e.target.value) || 1))}
                            className="w-full text-center px-2 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-black text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => setMaxAttempts(maxAttempts + 1)}
                            className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-black flex items-center justify-center transition-colors"
                            title="زيادة المحاولات"
                          >
                            +
                          </button>
                        </div>
                        {/* Quick Presets */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          <span className="text-[10px] text-slate-400 font-bold">خيارات سريعة:</span>
                          {[1, 2, 3, 5, 10, 20, 999].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setMaxAttempts(preset)}
                              className={`px-2 py-0.5 rounded text-[10px] font-black transition-all ${
                                maxAttempts === preset
                                  ? 'bg-amber-500 text-white shadow-sm ring-1 ring-amber-400'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-amber-100'
                              }`}
                            >
                              {preset === 999 ? 'مفتوح (999)' : `${preset} ${preset === 3 ? '(افتراضي)' : ''}`}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Passing Score Control */}
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
                            className="w-full text-center px-2 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-black text-sm"
                          />
                          <span className="text-xs font-black text-slate-500">%</span>
                        </div>
                        <div className="flex items-center gap-1.5 pt-0.5">
                          <span className="text-[10px] text-slate-400 font-bold">نسب شائعة:</span>
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
                              {sc}% {sc === 60 ? '(افتراضي)' : ''}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] text-amber-800/90 dark:text-amber-300 font-bold leading-relaxed pt-1">
                      💡 يبدأ تايمر الامتحان فور بدء الطالب، ويتم تسليم الإجابات تلقائياً وبأمان عند وصول العداد لـ (00:00). المحاولات المسموحة افتراضياً 3 ويمكن تعديلها لأي رقم.
                    </p>
                  </div>
                )}

                {/* PDF SPECIFICS */}
                {(itemType === 'concept_sheet' || itemType === 'summary_pdf') && (
                  <PdfResourceUploader
                    value={pdfUrl}
                    onChange={(url) => setPdfUrl(url)}
                    itemType={itemType}
                    title={itemTitle}
                  />
                )}

                {/* Prerequisite checkbox */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <input
                    type="checkbox"
                    id="prereqCheck"
                    checked={isPrerequisite}
                    onChange={(e) => setIsPrerequisite(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <label htmlFor="prereqCheck" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                    قفل إجباري: لا يفتح هذا الدرس للطالب إلا بعد اجتياز والنجاح في المحتويات السابقة 🔒
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

                    {(itemType === 'exam' || itemType === 'homework') ? (
                      <button
                        type="button"
                        onClick={() => handleSaveItem(undefined, true)}
                        className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-emerald-600 hover:from-amber-600 hover:to-emerald-700 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all"
                      >
                        <FileText className="w-4 h-4" />
                        <span>حفظ والدخول لبنك الأسئلة 🚀</span>
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

      {/* MODAL 3 HAS BEEN MOVED TO A DEDICATED PAGE */}

      {/* MODAL 4: TRANSFER / COPY EXAM OR HOMEWORK */}
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
                  <span>نسخ ونقل {activeExamItem.itemType === 'homework' ? 'الواجب' : 'الامتحان'}</span>
                </h3>
                <button onClick={() => setIsTransferModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
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
                    }}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs text-slate-900 dark:text-white focus:outline-none"
                  >
                    {allCourses.map(c => (
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
                      ⚠️ لا توجد وحدات في هذا الكورس بعد. يرجى إنشاء وحدة في الكورس أولاً لنقل المحتوى إليها.
                    </div>
                  ) : (
                    <select
                      value={transferTargetUnitId}
                      onChange={(e) => setTransferTargetUnitId(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs text-slate-900 dark:text-white focus:outline-none"
                    >
                      {transferTargetUnits.map(u => (
                        <option key={u.id} value={u.id}>الوحدة {u.unitNumber}: {u.title}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/20 rounded-2xl text-[11px] text-emerald-800 dark:text-emerald-300 font-bold leading-relaxed">
                  💡 سيتم نسخ {activeExamItem.itemType === 'homework' ? 'الواجب' : 'الامتحان'} بجميع أسئلته وقطعه وخياراته وشروحاته ودرجاته إلى الكورس والوحدة المحددة دون الحاجة لإعادة كتابته.
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
                studentName="مستر محمد رضوان"
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MANAGE ATTEMPTS MODAL */}
      <AnimatePresence>
        {selectedStudentForAttempts && (
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
                {loadingStudentProgress ? (
                  <div className="flex justify-center p-8">
                    <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
                  </div>
                ) : studentProgressList.length === 0 ? (
                  <div className="text-center p-8 text-slate-500 font-bold text-sm bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                    لم يبدأ هذا الطالب أي واجب أو امتحان في هذا الكورس بعد.
                  </div>
                ) : (
                  studentProgressList.map((prog) => {
                    const maxAttempts = prog.unit_items?.max_exam_attempts || 1;
                    const isExhausted = prog.attempts_count >= maxAttempts && !prog.is_passed;
                    
                    return (
                      <div key={prog.id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex-1">
                          <h4 className="text-sm font-black text-slate-900 dark:text-white mb-1">
                            {prog.unit_items?.title || 'عنصر غير معروف'}
                          </h4>
                          <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                            <span className="px-2 py-0.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                              {prog.unit_items?.item_type === 'homework' ? 'واجب' : 'امتحان'}
                            </span>
                            <span className={`px-2 py-0.5 rounded-lg ${
                              prog.is_passed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              الحالة: {prog.is_passed ? 'ناجح' : (prog.status === 'locked' ? 'مغلق' : 'مفتوح')}
                            </span>
                            <span className={`px-2 py-0.5 rounded-lg ${
                              isExhausted ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                            }`}>
                              المحاولات: {prog.attempts_count} / {maxAttempts}
                            </span>
                            <span className="px-2 py-0.5 rounded-lg bg-indigo-100 text-indigo-700">
                              أعلى درجة: {prog.highest_score}%
                            </span>
                          </div>
                        </div>
                        
                        {isExhausted && (
                          <button
                            onClick={() => handleGrantAttempt(prog)}
                            className="px-4 py-2 shrink-0 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-sm transition-transform active:scale-95"
                          >
                            منح محاولة إضافية
                          </button>
                        )}
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
      {/* Floating Bottom Notification on Item Save */}
      {itemSaveSuccessMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-3.5 bg-emerald-600 text-white rounded-2xl shadow-2xl font-black text-sm border-2 border-emerald-400 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <CheckCircle2 className="w-6 h-6 text-white shrink-0" />
          <span>{itemSaveSuccessMsg}</span>
        </div>
      )}
    </div>
  );
}
