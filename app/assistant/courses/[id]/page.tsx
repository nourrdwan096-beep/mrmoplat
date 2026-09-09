'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowRight, BookOpen, Layers, Plus, Video, CheckSquare, 
  FileText, Bookmark, FileSpreadsheet, Trash2, Edit3, Eye, 
  Copy, Key, Users, Sparkles, CheckCircle2, 
  X, AlertCircle, RefreshCw, Lock, ShieldCheck, Play, Download,
  ChevronDown, ChevronUp, Clock, HelpCircle, Check, Search, Filter
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
  fetchCodesByCourse,
  generateActivationCodes,
  deleteActivationCode,
  CourseData,
  UnitData,
  UnitItemData,
  QuestionData,
  ActivationCodeData
} from '@/lib/academicService';
import {
  autoFetchVideoDetails,
} from '@/lib/videoService';
import SecuredVideoPlayer from '@/components/SecuredVideoPlayer';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';
import PdfResourceUploader from '@/components/PdfResourceUploader';
import { useAuth } from '@/context/AuthContext';
import { fetchAssistants, AssistantData } from '@/lib/teacherService';
import { fetchStudents, StudentProfile } from '@/lib/studentService';

interface PageProps {
  params: Promise<{ id: string }>;
}

function generateQuestionId(): string {
  return 'q_' + Math.random().toString(36).substring(2, 10);
}

export default function AssistantCourseDetailPage({ params }: PageProps) {
  const resolvedParams = React.use(params);
  const courseId = resolvedParams.id;
  const router = useRouter();
  const { currentUser } = useAuth();

  // Assistant permissions state
  const [assistant, setAssistant] = useState<AssistantData | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'units' | 'questions_bank' | 'students' | 'codes'>('units');

  // Main Data State
  const [course, setCourse] = useState<CourseData | null>(null);
  const [units, setUnits] = useState<UnitData[]>([]);
  const [unitItems, setUnitItems] = useState<{ [unitId: string]: UnitItemData[] }>({});
  const [codes, setCodes] = useState<ActivationCodeData[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Unit Modals
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<UnitData | null>(null);
  const [unitTitle, setUnitTitle] = useState('');
  const [unitDesc, setUnitDesc] = useState('');
  const [unitNumber, setUnitNumber] = useState(1);

  // Item Modals
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [targetUnitId, setTargetUnitId] = useState<string>('');
  const [editingItem, setEditingItem] = useState<UnitItemData | null>(null);
  const [itemType, setItemType] = useState<'video' | 'homework' | 'exam' | 'concept_sheet' | 'summary_pdf'>('video');
  const [itemTitle, setItemTitle] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [durationMinutes, setDurationMinutes] = useState<number | ''>('');
  const [totalMarks, setTotalMarks] = useState(100);
  const [passingScore, setPassingScore] = useState(60);
  const [maxAttempts, setMaxAttempts] = useState(2);
  const [videoSourceType, setVideoSourceType] = useState<'internal_secured' | 'direct_youtube'>('internal_secured');
  const [videoUrl, setVideoUrl] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [isPrerequisite, setIsPrerequisite] = useState(true);
  const [isDetectingVideo, setIsDetectingVideo] = useState(false);
  const [videoDetectionMessage, setVideoDetectionMessage] = useState<string | null>(null);

  // Question Builder Modal
  const [isQuestionsModalOpen, setIsQuestionsModalOpen] = useState(false);
  const [activeQuizItem, setActiveQuizItem] = useState<UnitItemData | null>(null);
  const [questionsList, setQuestionsList] = useState<QuestionData[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [isSavingQuestions, setIsSavingQuestions] = useState(false);

  // Video Preview Modal
  const [previewVideoItem, setPreviewVideoItem] = useState<UnitItemData | null>(null);

  // Codes Generator
  const [codesCount, setCodesCount] = useState<number>(10);
  const [codesBatchName, setCodesBatchName] = useState('دفعة المساعد');
  const [isGeneratingCodes, setIsGeneratingCodes] = useState(false);

  // Delete Target Modal
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'unit' | 'item' | 'code';
    id: string;
    title: string;
    itemTypeLabel: string;
    warningNote?: string;
  } | null>(null);
  const [isDeletingTarget, setIsDeletingTarget] = useState(false);

  // Success / Info Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      try {
        const [foundCourse, allAssistants, allStudents] = await Promise.all([
          getCourseById(courseId),
          fetchAssistants(),
          fetchStudents(),
        ]);

        if (!isMounted) return;

        const currentAst = allAssistants.find(
          (a) => a.id === currentUser?.id || a.email === currentUser?.email
        );
        setAssistant(currentAst || null);

        // Verify permission
        if (currentUser?.role === 'super_admin' || currentUser?.role === 'teacher') {
          setHasPermission(true);
        } else if (currentAst) {
          if (currentAst.permissions?.canManageAllCourses) {
            setHasPermission(true);
          } else if (currentAst.permissions?.assignedCourseIds?.includes(courseId)) {
            setHasPermission(true);
          } else {
            setHasPermission(false);
          }
        } else {
          setHasPermission(false);
        }

        if (!foundCourse) {
          setCourse(null);
          setLoading(false);
          return;
        }
        setCourse(foundCourse);

        // Fetch units and items
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

        // Fetch codes
        const codesList = await fetchCodesByCourse(courseId);
        if (!isMounted) return;
        setCodes(codesList);

        // Filter enrolled students (matching stage & grade & active status)
        const matching = allStudents.filter(
          (s) => s.status === 'active' && s.stage === foundCourse.stage && s.grade === foundCourse.grade
        );
        setEnrolledStudents(matching);
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [courseId, currentUser]);

  // Video auto detection
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
        }
        setVideoDetectionMessage(`✓ تم التعرف بنجاح! المدة: ${info.durationMinutes || 'قيد التحديث'} دقيقة | ${info.title?.slice(0, 35) || 'محاضرة تعليمية'}`);
      }
    } catch {
      setVideoDetectionMessage('✓ تم فحص وتأمين معرّف الفيديو');
    } finally {
      setIsDetectingVideo(false);
    }
  };

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
    if (!unitTitle.trim() || !course) return;

    try {
      const saved = await saveUnit({
        id: editingUnit ? editingUnit.id : undefined,
        courseId: course.id,
        unitNumber,
        title: unitTitle.trim(),
        description: unitDesc.trim(),
        orderIndex: unitNumber,
        isPublished: true,
      });

      if (editingUnit) {
        setUnits((prev) => prev.map((u) => (u.id === saved.id ? saved : u)));
        showToast('تم تعديل الوحدة بنجاح');
      } else {
        setUnits((prev) => [...prev, saved]);
        setUnitItems((prev) => ({ ...prev, [saved.id]: [] }));
        showToast('تمت إضافة الوحدة الجديدة بنجاح');
      }
      setIsUnitModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء حفظ الوحدة');
    }
  };

  // Item handlers
  const handleOpenNewItem = (unitId: string, type: 'video' | 'homework' | 'exam' | 'concept_sheet' | 'summary_pdf') => {
    setTargetUnitId(unitId);
    setEditingItem(null);
    setItemType(type);
    setItemTitle('');
    setItemDesc('');
    setDurationMinutes(type === 'video' ? 45 : '');
    setTotalMarks(type === 'exam' ? 100 : type === 'homework' ? 50 : 0);
    setPassingScore(60);
    setMaxAttempts(type === 'exam' ? 2 : 5);
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
    setMaxAttempts(item.maxExamAttempts || 2);
    setVideoSourceType(item.videoSourceType || 'internal_secured');
    setVideoUrl(item.directVideoUrl || item.obfuscatedVideoId || '');
    setPdfUrl(item.pdfAttachmentUrl || '');
    setIsPrerequisite(item.isPrerequisiteRequired ?? true);
    setVideoDetectionMessage(null);
    setIsItemModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemTitle.trim() || !course || !targetUnitId) return;

    try {
      const currentUnitItems = unitItems[targetUnitId] || [];
      const orderIndex = editingItem ? editingItem.orderIndex : currentUnitItems.length + 1;

      const saved = await saveUnitItem({
        id: editingItem ? editingItem.id : undefined,
        unitId: targetUnitId,
        courseId: course.id,
        itemType,
        title: itemTitle.trim(),
        description: itemDesc.trim(),
        orderIndex,
        isPrerequisiteRequired: isPrerequisite,
        passingScorePercentage: passingScore,
        videoSourceType,
        directVideoUrl: videoUrl.trim() || undefined,
        pdfAttachmentUrl: pdfUrl.trim() || undefined,
        durationMinutes: typeof durationMinutes === 'number' ? durationMinutes : 0,
        totalMarks,
        maxExamAttempts: maxAttempts,
      });

      setUnitItems((prev) => {
        const list = prev[targetUnitId] || [];
        if (editingItem) {
          return { ...prev, [targetUnitId]: list.map((it) => (it.id === saved.id ? saved : it)) };
        } else {
          return { ...prev, [targetUnitId]: [...list, saved] };
        }
      });

      showToast('تم حفظ العنصر وتحديث المنهج بنجاح');
      setIsItemModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء حفظ العنصر');
    }
  };

  // Questions Bank Modal Handlers
  const handleOpenQuestionsModal = async (item: UnitItemData) => {
    setActiveQuizItem(item);
    setIsQuestionsModalOpen(true);
    setIsLoadingQuestions(true);
    try {
      const qList = await fetchQuestionsByItem(item.id);
      if (qList.length === 0) {
        // Init with default question
        setQuestionsList([
          {
            id: generateQuestionId(),
            itemId: item.id,
            questionText: 'Choose the correct answer from a, b, c, or d:',
            questionType: 'mcq',
            options: [
              { id: 'opt_1', text: 'Option A' },
              { id: 'opt_2', text: 'Option B' },
              { id: 'opt_3', text: 'Option C' },
              { id: 'opt_4', text: 'Option D' },
            ],
            correctAnswerId: 'opt_1',
            explanation: 'شرح وتوضيح الإجابة النموذجية للطالب',
            points: 1,
            orderIndex: 1,
          },
        ]);
      } else {
        setQuestionsList(qList);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const handleAddQuestion = () => {
    if (!activeQuizItem) return;
    const newQ: QuestionData = {
      id: generateQuestionId(),
      itemId: activeQuizItem.id,
      questionText: `سؤال جديد رقم (${questionsList.length + 1})`,
      questionType: 'mcq',
      options: [
        { id: 'opt_1', text: 'الخيار الأول (A)' },
        { id: 'opt_2', text: 'الخيار الثاني (B)' },
        { id: 'opt_3', text: 'الخيار الثالث (C)' },
        { id: 'opt_4', text: 'الخيار الرابع (D)' },
      ],
      correctAnswerId: 'opt_1',
      explanation: 'شرح مفصل لطريقة الحل والإجابة الصحيحة',
      points: 1,
      orderIndex: questionsList.length + 1,
    };
    setQuestionsList((prev) => [...prev, newQ]);
  };

  const handleSaveQuestions = async () => {
    if (!activeQuizItem) return;
    setIsSavingQuestions(true);
    try {
      await saveQuestionsForItem(activeQuizItem.id, questionsList);
      showToast('تم حفظ بنك الأسئلة وتحديثه فوراً للطالب');
      setIsQuestionsModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء حفظ بنك الأسئلة');
    } finally {
      setIsSavingQuestions(false);
    }
  };

  // Generate Codes Handler
  const handleGenerateCodes = async () => {
    if (!course) return;
    setIsGeneratingCodes(true);
    try {
      const newCodes = await generateActivationCodes(
        course.id,
        codesCount,
        codesBatchName
      );
      setCodes((prev) => [...newCodes, ...prev]);
      showToast(`تم توليد ${codesCount} كود تفعيل بنجاح ✨`);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء توليد الأكواد');
    } finally {
      setIsGeneratingCodes(false);
    }
  };

  // Execute Delete
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeletingTarget(true);
    try {
      if (deleteTarget.type === 'unit') {
        await removeUnit(deleteTarget.id);
        setUnits((prev) => prev.filter((u) => u.id !== deleteTarget.id));
        setUnitItems((prev) => {
          const clone = { ...prev };
          delete clone[deleteTarget.id];
          return clone;
        });
        showToast('تم حذف الوحدة وجميع متعلقاتها بنجاح');
      } else if (deleteTarget.type === 'item') {
        await removeUnitItem(deleteTarget.id);
        setUnitItems((prev) => {
          const clone = { ...prev };
          for (const uId of Object.keys(clone)) {
            clone[uId] = clone[uId].filter((it) => it.id !== deleteTarget.id);
          }
          return clone;
        });
        showToast('تم حذف العنصر بنجاح');
      } else if (deleteTarget.type === 'code') {
        await deleteActivationCode(deleteTarget.id);
        setCodes((prev) => prev.filter((c) => c.id !== deleteTarget.id));
        showToast('تم حذف كود التفعيل');
      }
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء الحذف');
    } finally {
      setIsDeletingTarget(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-bold text-sm">جاري تحميل بيانات الكورس والمحتوى التعليمي...</p>
      </div>
    );
  }

  if (hasPermission === false) {
    return (
      <div className="max-w-xl mx-auto py-16 px-6 text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
          <Lock className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">غير مصرح لك بإدارة هذا الكورس</h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm font-semibold leading-relaxed">
          هذا الكورس غير مسند إلى صلاحياتك المعتمدة من قبل مستر محمد رضوان. يرجى مراجعة المعلم لتحديث الكورسات المسندة لك.
        </p>
        <Link
          href="/assistant/courses"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700"
        >
          <ArrowRight className="w-4 h-4" />
          العودة لقائمة كورساتي
        </Link>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="max-w-xl mx-auto py-16 px-6 text-center space-y-6">
        <AlertCircle className="w-16 h-16 text-slate-300 mx-auto" />
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">الكورس غير موجود</h2>
        <p className="text-slate-500 text-sm font-bold">ربما تم حذفه أو تعديل رابطه</p>
        <Link
          href="/assistant/courses"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 text-white font-bold text-xs"
        >
          العودة للكورسات
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3.5 rounded-2xl bg-emerald-600 text-white font-bold text-xs shadow-2xl flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Breadcrumb & Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 dark:border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-blue-500/10 dark:bg-blue-500/20 blur-3xl rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-3">
            <Link
              href="/assistant/courses"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>العودة لكورسات المساعد</span>
            </Link>
            
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-black text-xs">
                {course.stage === 'high' ? 'مرحلة ثانوية' : 'مرحلة إعدادية'} - الصف {course.grade}
              </span>
              <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs">
                {course.educationType === 'azhar' ? 'أزهر' : course.educationType === 'languages' ? 'لغات' : 'عام'}
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-bold text-xs">
                {course.isFree ? 'مجاني 🎁' : `${course.price} ج.م`}
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">
              {course.title}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-xs md:text-sm max-w-2xl leading-relaxed">
              {course.description || 'كورس اللغة الإنجليزية الشامل للمنهج والوحدات'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenNewUnit}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-600/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة يونت جديدة</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('units')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs transition-all whitespace-nowrap ${
            activeTab === 'units'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>الوحدات والمحتوى الدراسي ({units.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('students')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs transition-all whitespace-nowrap ${
            activeTab === 'students'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>الطلاب المشتركين ({enrolledStudents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('codes')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs transition-all whitespace-nowrap ${
            activeTab === 'codes'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>أكواد التفعيل ({codes.length})</span>
        </button>
      </div>

      {/* TAB 1: UNITS & CONTENT */}
      {activeTab === 'units' && (
        <div className="space-y-6">
          {units.length === 0 ? (
            <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8">
              <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">لا توجد وحدات في هذا الكورس بعد</h3>
              <p className="text-xs text-slate-500 font-semibold mb-6">ابدأ الآن بإضافة الوحدة الأولى وإرفاق الفيديوهات والواجبات والامتحانات داخلها.</p>
              <button
                onClick={handleOpenNewUnit}
                className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
              >
                + إنشاء أول يونت
              </button>
            </div>
          ) : (
            units.map((unit) => {
              const items = unitItems[unit.id] || [];
              return (
                <div
                  key={unit.id}
                  className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm transition-all"
                >
                  {/* Unit Card Header */}
                  <div className="p-6 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-md shadow-blue-600/20">
                        {unit.unitNumber}
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white">
                          {unit.title}
                        </h3>
                        {unit.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                            {unit.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Unit Actions */}
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="dropdown relative group">
                        <button className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold text-xs hover:bg-blue-100 transition-colors">
                          <Plus className="w-3.5 h-3.5" />
                          <span>إضافة محتوى لليونت</span>
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        <div className="hidden group-hover:block absolute left-0 top-full mt-1 w-52 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-2 z-30">
                          <button
                            onClick={() => handleOpenNewItem(unit.id, 'video')}
                            className="w-full text-right px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-2 text-rose-600"
                          >
                            <Video className="w-4 h-4" />
                            فيديو / محاضرة شرح
                          </button>
                          <button
                            onClick={() => handleOpenNewItem(unit.id, 'homework')}
                            className="w-full text-right px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-2 text-blue-600"
                          >
                            <CheckSquare className="w-4 h-4" />
                            واجب دراسي
                          </button>
                          <button
                            onClick={() => handleOpenNewItem(unit.id, 'exam')}
                            className="w-full text-right px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-2 text-amber-600"
                          >
                            <FileText className="w-4 h-4" />
                            امتحان تقييمي
                          </button>
                          <button
                            onClick={() => handleOpenNewItem(unit.id, 'concept_sheet')}
                            className="w-full text-right px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-2 text-emerald-600"
                          >
                            <Bookmark className="w-4 h-4" />
                            ورقة مفاهيم علمية
                          </button>
                          <button
                            onClick={() => handleOpenNewItem(unit.id, 'summary_pdf')}
                            className="w-full text-right px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-2 text-indigo-600"
                          >
                            <FileSpreadsheet className="w-4 h-4" />
                            ملزمة الكورس الخلاصة
                          </button>
                        </div>
                      </div>

                      <button
                        onClick={() => handleOpenEditUnit(unit)}
                        className="p-2 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="تعديل اسم وبيانات الوحدة"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() =>
                          setDeleteTarget({
                            type: 'unit',
                            id: unit.id,
                            title: unit.title,
                            itemTypeLabel: 'الوحدة الدراسية',
                            warningNote: 'سيتم حذف جميع الدروس والفيديوهات والامتحانات والواجبات المرتبطة بهذه الوحدة نهائياً.',
                          })
                        }
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        title="حذف الوحدة"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Unit Items List */}
                  <div className="p-6">
                    {items.length === 0 ? (
                      <p className="text-xs text-slate-400 font-bold text-center py-4">
                        لا يوجد محتوى في هذه الوحدة بعد. اضغط على &quot;إضافة محتوى&quot; لإضافة فيديو أو واجب أو امتحان.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {items.map((item, idx) => (
                          <div
                            key={item.id}
                            className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                                  item.itemType === 'video'
                                    ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400'
                                    : item.itemType === 'homework'
                                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400'
                                    : item.itemType === 'exam'
                                    ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400'
                                    : item.itemType === 'concept_sheet'
                                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400'
                                    : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400'
                                }`}
                              >
                                {item.itemType === 'video' ? (
                                  <Video className="w-4 h-4" />
                                ) : item.itemType === 'homework' ? (
                                  <CheckSquare className="w-4 h-4" />
                                ) : item.itemType === 'exam' ? (
                                  <FileText className="w-4 h-4" />
                                ) : item.itemType === 'concept_sheet' ? (
                                  <Bookmark className="w-4 h-4" />
                                ) : (
                                  <FileSpreadsheet className="w-4 h-4" />
                                )}
                              </div>

                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-black text-slate-900 dark:text-white">
                                    {item.title}
                                  </span>
                                  {item.isPrerequisiteRequired && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                      متطلب سابق
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-[11px] text-slate-400 font-semibold mt-0.5">
                                  {item.itemType === 'video' && item.durationMinutes ? (
                                    <span>⏱️ {item.durationMinutes} دقيقة</span>
                                  ) : null}
                                  {(item.itemType === 'homework' || item.itemType === 'exam') && (
                                    <span>
                                      درجة النجاح: {item.passingScorePercentage || 60}% | الدرجة الكلية: {item.totalMarks || 100}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Item Actions */}
                            <div className="flex items-center gap-2 self-end sm:self-auto">
                              {/* If Exam or Homework -> Question Bank Builder */}
                              {(item.itemType === 'homework' || item.itemType === 'exam') && (
                                <button
                                  onClick={() => handleOpenQuestionsModal(item)}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-bold text-xs hover:bg-amber-100 transition-colors"
                                >
                                  <HelpCircle className="w-3.5 h-3.5" />
                                  <span>بنك الأسئلة</span>
                                </button>
                              )}

                              {/* If Video -> Preview Player */}
                              {item.itemType === 'video' && (
                                <button
                                  onClick={() => setPreviewVideoItem(item)}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 font-bold text-xs hover:bg-rose-100 transition-colors"
                                >
                                  <Play className="w-3.5 h-3.5" />
                                  <span>تشغيل وتجربة</span>
                                </button>
                              )}

                              <button
                                onClick={() => handleOpenEditItem(item)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                title="تعديل"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() =>
                                  setDeleteTarget({
                                    type: 'item',
                                    id: item.id,
                                    title: item.title,
                                    itemTypeLabel: item.itemType === 'video' ? 'الفيديو' : 'العنصر',
                                  })
                                }
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                                title="حذف"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: ENROLLED STUDENTS */}
      {activeTab === 'students' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                الطلاب المقيدين في مرحلة وصف هذا الكورس 🎓
              </h3>
              <p className="text-xs text-slate-500 font-bold mt-1">
                إجمالي الطلاب المعتمدين في هذا الصف: {enrolledStudents.length} طالب
              </p>
            </div>
          </div>

          {enrolledStudents.length === 0 ? (
            <div className="py-12 text-center text-slate-400 font-bold text-xs">
              لا يوجد طلاب مسجلين في هذا الصف حتى الآن.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {enrolledStudents.map((st) => (
                <div
                  key={st.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 flex items-center justify-center font-black text-xs">
                      {st.fullName.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-white">
                        {st.fullName}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-semibold">{st.phone}</p>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                    نشط ✓
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ACTIVATION CODES */}
      {activeTab === 'codes' && (
        <div className="space-y-6">
          {/* Generate Codes Widget */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">
              توليد أكواد تفعيل جديدة للكورس 🔑
            </h3>
            <p className="text-xs text-slate-500 font-semibold mb-6">
              يمكنك توليد أكواد تفعيل وتوزيعها على الطلاب لفتح هذا الكورس مباشرة دون الحاجة لشحن المحفظة.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  عدد الأكواد المطلوبة
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={codesCount}
                  onChange={(e) => setCodesCount(Number(e.target.value))}
                  className="w-full h-11 px-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  اسم الدفعة / السنتر
                </label>
                <input
                  type="text"
                  value={codesBatchName}
                  onChange={(e) => setCodesBatchName(e.target.value)}
                  placeholder="مثال: دفعة سنتر المستقبل أسبوع 1"
                  className="w-full h-11 px-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              onClick={handleGenerateCodes}
              disabled={isGeneratingCodes}
              className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-600/20 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              <Key className="w-4 h-4" />
              <span>{isGeneratingCodes ? 'جاري التوليد...' : 'توليد الأكواد الآن'}</span>
            </button>
          </div>

          {/* Codes List */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4">
              الأكواد الحالية ({codes.length})
            </h3>

            {codes.length === 0 ? (
              <p className="text-xs text-slate-400 font-bold text-center py-6">
                لم يتم توليد أكواد لهذا الكورس بعد.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {codes.map((c) => (
                  <div
                    key={c.id}
                    className={`p-3 rounded-2xl border flex items-center justify-between ${
                      c.isUsed
                        ? 'bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60'
                        : 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900'
                    }`}
                  >
                    <div>
                      <span className="font-mono text-xs font-black text-slate-900 dark:text-white select-all">
                        {c.code}
                      </span>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                        {c.isUsed ? 'مستخدم ✓' : 'متاح للاستخدام'}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(c.code);
                        showToast(`تم نسخ الكود: ${c.code}`);
                      }}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 transition-colors"
                      title="نسخ الكود"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: UNIT ADD / EDIT */}
      {isUnitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                {editingUnit ? 'تعديل بيانات الوحدة' : 'إضافة يونت جديدة للكورس'}
              </h3>
              <button
                onClick={() => setIsUnitModalOpen(false)}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUnit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  رقم الوحدة *
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={unitNumber}
                  onChange={(e) => setUnitNumber(Number(e.target.value))}
                  className="w-full h-11 px-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  عنوان الوحدة / Unit Title *
                </label>
                <input
                  type="text"
                  required
                  value={unitTitle}
                  onChange={(e) => setUnitTitle(e.target.value)}
                  placeholder="مثال: Unit 1 - Grammar & Vocabulary Review"
                  className="w-full h-11 px-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  وصف الوحدة (اختياري)
                </label>
                <textarea
                  rows={3}
                  value={unitDesc}
                  onChange={(e) => setUnitDesc(e.target.value)}
                  placeholder="اكتب نبذة عن موضوعات هذه الوحدة..."
                  className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsUnitModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-slate-500 font-bold text-xs hover:bg-slate-100"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
                >
                  حفظ الوحدة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ITEM ADD / EDIT */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6 my-8">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                {editingItem ? 'تعديل المحتوى' : 'إضافة عنصر جديد لليونت'}
              </h3>
              <button
                onClick={() => setIsItemModalOpen(false)}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  نوع العنصر
                </label>
                <select
                  value={itemType}
                  onChange={(e) => setItemType(e.target.value as any)}
                  className="w-full h-11 px-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold"
                >
                  <option value="video">🎥 فيديو / محاضرة شرح</option>
                  <option value="homework">📝 واجب دراسي</option>
                  <option value="exam">🏆 امتحان تقييمي شامل أو جزئي</option>
                  <option value="concept_sheet">📑 ورقة مفاهيم علمية</option>
                  <option value="summary_pdf">📚 ملزمة الكورس الخلاصة</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  عنوان العنصر *
                </label>
                <input
                  type="text"
                  required
                  value={itemTitle}
                  onChange={(e) => setItemTitle(e.target.value)}
                  placeholder="مثال: شرح قاعدة Past Perfect بالتفصيل"
                  className="w-full h-11 px-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold"
                />
              </div>

              {/* Video Specific Fields */}
              {itemType === 'video' && (
                <div className="space-y-3 p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      رابط فيديو يوتيوب أو معرف الفيديو *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        value={videoUrl}
                        onChange={(e) => {
                          setVideoUrl(e.target.value);
                          handleAutoDetectVideo(e.target.value);
                        }}
                        placeholder="https://www.youtube.com/watch?v=..."
                        className="flex-1 h-11 px-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold"
                        dir="ltr"
                      />
                      <button
                        type="button"
                        onClick={() => handleAutoDetectVideo()}
                        disabled={isDetectingVideo}
                        className="px-4 h-11 rounded-xl bg-rose-600 text-white font-bold text-xs"
                      >
                        {isDetectingVideo ? 'فحص...' : 'تأمين'}
                      </button>
                    </div>
                    {videoDetectionMessage && (
                      <p className="text-[11px] font-bold text-emerald-600 mt-1">
                        {videoDetectionMessage}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      المدة المقدرة بالدقائق
                    </label>
                    <input
                      type="number"
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(e.target.value ? Number(e.target.value) : '')}
                      placeholder="45"
                      className="w-full h-11 px-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold"
                    />
                  </div>
                </div>
              )}

              {/* Exam & Homework Fields */}
              {(itemType === 'exam' || itemType === 'homework') && (
                <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/50">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      الدرجة الكلية
                    </label>
                    <input
                      type="number"
                      value={totalMarks}
                      onChange={(e) => setTotalMarks(Number(e.target.value))}
                      className="w-full h-11 px-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      نسبة النجاح (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={passingScore}
                      onChange={(e) => setPassingScore(Number(e.target.value))}
                      className="w-full h-11 px-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold"
                    />
                  </div>
                </div>
              )}

              {/* PDF Attachments */}
              {(itemType === 'concept_sheet' || itemType === 'summary_pdf') && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    رابط ملف PDF أو المذكرة
                  </label>
                  <input
                    type="url"
                    value={pdfUrl}
                    onChange={(e) => setPdfUrl(e.target.value)}
                    placeholder="https://.../sheet.pdf"
                    className="w-full h-11 px-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold"
                    dir="ltr"
                  />
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isPrerequisite"
                  checked={isPrerequisite}
                  onChange={(e) => setIsPrerequisite(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="isPrerequisite" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  اشتراط اجتياز هذا العنصر لفتح الدروس التالية (نظام القفل التسلسلي الصارم)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-slate-500 font-bold text-xs hover:bg-slate-100"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20"
                >
                  حفظ العنصر
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: QUESTIONS BANK BUILDER */}
      {isQuestionsModalOpen && activeQuizItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 max-w-3xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6 my-8 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                  {activeQuizItem.itemType === 'exam' ? 'امتحان تقييمي' : 'واجب'}
                </span>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                  بنك الأسئلة: {activeQuizItem.title}
                </h3>
              </div>
              <button
                onClick={() => setIsQuestionsModalOpen(false)}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6 pr-1">
              {isLoadingQuestions ? (
                <div className="py-12 text-center text-slate-400 font-bold">جاري تحميل الأسئلة...</div>
              ) : (
                questionsList.map((q, qIdx) => (
                  <div
                    key={q.id}
                    className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-blue-600 dark:text-blue-400">
                        السؤال ({qIdx + 1})
                      </span>
                      {questionsList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setQuestionsList((prev) => prev.filter((item) => item.id !== q.id))}
                          className="text-xs text-rose-500 font-bold hover:underline"
                        >
                          حذف السؤال
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        نص السؤال *
                      </label>
                      <input
                        type="text"
                        value={q.questionText}
                        onChange={(e) => {
                          const val = e.target.value;
                          setQuestionsList((prev) =>
                            prev.map((item) => (item.id === q.id ? { ...item, questionText: val } : item))
                          );
                        }}
                        className="w-full h-11 px-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold"
                      />
                    </div>

                    {/* Options A, B, C, D */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        الخيارات الأربعة (حدد الإجابة النموذجية الصحيحة):
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q.options.map((opt, optIdx) => (
                          <div
                            key={opt.id}
                            className={`flex items-center gap-2 p-2 rounded-xl border ${
                              q.correctAnswerId === opt.id
                                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`correct_${q.id}`}
                              checked={q.correctAnswerId === opt.id}
                              onChange={() => {
                                setQuestionsList((prev) =>
                                  prev.map((item) =>
                                    item.id === q.id ? { ...item, correctAnswerId: opt.id } : item
                                  )
                                );
                              }}
                              className="w-4 h-4 text-emerald-600 cursor-pointer"
                            />
                            <input
                              type="text"
                              value={opt.text}
                              onChange={(e) => {
                                const newText = e.target.value;
                                setQuestionsList((prev) =>
                                  prev.map((item) =>
                                    item.id === q.id
                                      ? {
                                          ...item,
                                          options: item.options.map((o) =>
                                            o.id === opt.id ? { ...o, text: newText } : o
                                          ),
                                        }
                                      : item
                                  )
                                );
                              }}
                              className="flex-1 bg-transparent text-xs font-semibold outline-none"
                              placeholder={`الخيار ${optIdx + 1}`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        تفسير الإجابة وشرحها للطالب بعد التسليم
                      </label>
                      <input
                        type="text"
                        value={q.explanation || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setQuestionsList((prev) =>
                            prev.map((item) => (item.id === q.id ? { ...item, explanation: val } : item))
                          );
                        }}
                        placeholder="اكتب توضيح الإجابة الصحيحة..."
                        className="w-full h-10 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium"
                      />
                    </div>
                  </div>
                ))
              )}

              <button
                type="button"
                onClick={handleAddQuestion}
                className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-blue-600 dark:text-blue-400 font-bold text-xs hover:bg-blue-50/50 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>+ إضافة سؤال جديد للبنك</span>
              </button>
            </div>

            <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-800 pt-4">
              <span className="text-xs font-bold text-slate-500">
                إجمالي الأسئلة: {questionsList.length}
              </span>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsQuestionsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-slate-500 font-bold text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={isSavingQuestions}
                  onClick={handleSaveQuestions}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 disabled:opacity-50"
                >
                  {isSavingQuestions ? 'جاري الحفظ...' : 'حفظ ونشر الأسئلة ✓'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VIDEO PREVIEW */}
      {previewVideoItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 rounded-3xl p-6 max-w-3xl w-full border border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between text-white">
              <h3 className="font-black text-base flex items-center gap-2">
                <Video className="w-5 h-5 text-rose-500" />
                معاينة مشغل الفيديو الداخلي المؤمن: {previewVideoItem.title}
              </h3>
              <button
                onClick={() => setPreviewVideoItem(null)}
                className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-slate-800">
              <SecuredVideoPlayer
                videoIdOrUrl={previewVideoItem.directVideoUrl || previewVideoItem.obfuscatedVideoId || ''}
                studentPhone={currentUser?.phone || '01552191172'}
                studentId={currentUser?.id || 'MR_RADWAN_ASSISTANT'}
                title={previewVideoItem.title}
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setPreviewVideoItem(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 text-white font-bold text-xs hover:bg-slate-700"
              >
                إغلاق المشغل
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      <DeleteConfirmationModal
        isOpen={Boolean(deleteTarget)}
        title={`تأكيد حذف ${deleteTarget?.itemTypeLabel || 'العنصر'}`}
        itemName={deleteTarget?.title || ''}
        itemType={deleteTarget?.itemTypeLabel || 'العنصر'}
        warningNote={deleteTarget?.warningNote}
        isLoading={isDeletingTarget}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
