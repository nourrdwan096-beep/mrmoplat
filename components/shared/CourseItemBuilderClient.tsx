'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  UnitItemData,
  QuestionData,
  CourseData,
  UnitData,
  fetchItemById,
  saveQuestionsForItem,
  appendQuestionsForItem,
  fetchQuestionsByItem,
  updateItemMetadata,
  fetchAllCourses,
  fetchUnitsByCourse,
  copyItemToTargetCourse,
  convertOrCloneAssessment,
} from '@/lib/academicService';
import { extractBlankIndices } from '@/lib/blankUtils';
import {
  CourseGranularPermissions,
  FULL_COURSE_PERMISSIONS,
  isBlindQuestionAddOnly,
} from '@/lib/assistantPermissions';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowRight,
  ArrowLeftRight,
  Plus,
  Save,
  Trash2,
  FileText,
  CheckCircle,
  CheckSquare,
  MessageCircle,
  Edit3,
  BookOpen,
  X,
  Layers,
  Sparkles,
  Award,
  Package,
  Eye,
  RotateCcw,
  Info,
  Clock,
  Calendar,
  ShieldCheck,
  ListOrdered,
  CheckCircle2,
  Sliders,
  Maximize2,
  Settings,
  Loader2,
  Copy,
  EyeOff,
  Lock,
  Send,
} from 'lucide-react';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';
import WordBankSolver from '@/components/WordBankSolver';
import QuestionRichEditor from '@/components/QuestionRichEditor';
import QuestionRichRenderer from '@/components/QuestionRichRenderer';
import StudentQuizSolver from '@/components/StudentQuizSolver';

interface CourseItemBuilderClientProps {
  courseId: string;
  itemId: string;
  mode: 'teacher' | 'assistant';
  basePath: '/teacher' | '/assistant';
  coursePerms?: CourseGranularPermissions;
  allowedTargetCourseIds?: string[] | null;
}

export default function CourseItemBuilderClient({
  courseId,
  itemId,
  mode,
  basePath,
  coursePerms,
  allowedTargetCourseIds = null,
}: CourseItemBuilderClientProps) {
  const router = useRouter();
  const isTeacher = mode === 'teacher';
  const cp = coursePerms || FULL_COURSE_PERMISSIONS;

  // Derived Granular Capabilities
  const isBlind = !isTeacher && isBlindQuestionAddOnly(cp);
  const canViewQuestions = isTeacher || cp.canViewQuestions;
  const canAddQuestions = isTeacher || cp.canAddQuestions;
  const canEditQuestions = isTeacher || (cp.canViewQuestions && cp.canEditQuestions);
  const canDeleteQuestions = isTeacher || (cp.canViewQuestions && cp.canDeleteQuestions);
  const canEditSettings =
    isTeacher || cp.canEditCourseSettings || cp.canAddExams || cp.canAddHomework;
  const canTransfer = isTeacher || cp.canTransferContent;
  const canConvertAssessments = isTeacher || cp.canConvertAssessments;
  const canPreviewStudent = isTeacher || cp.canViewQuestions;
  const hasQuestionsTabAccess = canViewQuestions || canAddQuestions;

  const [item, setItem] = useState<UnitItemData | null>(null);
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [blindQueue, setBlindQueue] = useState<QuestionData[]>([]);
  const [isSubmittingBlind, setIsSubmittingBlind] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statusFeedback, setStatusFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setStatusFeedback({ type, text });
    setTimeout(() => setStatusFeedback(null), 5000);
  };

  // Active view tab
  const [activeTab, setActiveTab] = useState<'settings' | 'questions' | 'preview'>(() => {
    if (isTeacher) return 'settings';
    if (isBlind) return 'questions';
    if (canEditSettings) return 'settings';
    if (hasQuestionsTabAccess) return 'questions';
    return 'settings';
  });
  const [previewSubTab, setPreviewSubTab] = useState<'pre_start' | 'interactive'>('interactive');

  // Metadata form states
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [metaDurationMinutes, setMetaDurationMinutes] = useState<number | ''>(30);
  const [metaPassingScore, setMetaPassingScore] = useState(60);
  const [metaMaxAttempts, setMetaMaxAttempts] = useState(3);
  const [metaStartDate, setMetaStartDate] = useState('');
  const [metaEndDate, setMetaEndDate] = useState('');
  const [metaIsPrerequisite, setMetaIsPrerequisite] = useState(true);
  const [isSavingMeta, setIsSavingMeta] = useState(false);
  const [metaSaveSuccess, setMetaSaveSuccess] = useState(false);

  const formRef = useRef<HTMLDivElement>(null);

  // Question Form states
  const [isAdding, setIsAdding] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [questionType, setQuestionType] = useState<
    'mcq' | 'multi_select' | 'tf' | 'rewrite' | 'essay' | 'dialogue' | 'passage' | 'word_bank'
  >('mcq');
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState<{ id: string; text: string }[]>([]);
  const [correctAnswerId, setCorrectAnswerId] = useState('');
  const [correctAnswerIds, setCorrectAnswerIds] = useState<string[]>([]);
  const [idealAnswer, setIdealAnswer] = useState('');
  const [gradingType, setGradingType] = useState<'auto' | 'manual'>('auto');
  const [points, setPoints] = useState(1);
  const [explanation, setExplanation] = useState('');
  const [hint, setHint] = useState('');
  const [parentId, setParentId] = useState<string>('');

  // Word Bank States
  const [wordBankWords, setWordBankWords] = useState<string[]>([]);
  const [newWordInput, setNewWordInput] = useState('');
  const [bulkWordsInput, setBulkWordsInput] = useState('');
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [wordBankBlanks, setWordBankBlanks] = useState<
    { blankIndex: number; correctAnswer: string; points?: number }[]
  >([]);
  const [showFormLivePreview, setShowFormLivePreview] = useState(true);

  // Modal Preview & Delete State
  const [previewQuestionModal, setPreviewQuestionModal] = useState<QuestionData | null>(null);
  const [questionToDelete, setQuestionToDelete] = useState<QuestionData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Transfer Modal State
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [allCourses, setAllCourses] = useState<CourseData[]>([]);
  const [transferTargetCourseId, setTransferTargetCourseId] = useState('');
  const [transferTargetUnits, setTransferTargetUnits] = useState<UnitData[]>([]);
  const [transferTargetUnitId, setTransferTargetUnitId] = useState('');
  const [transferTitle, setTransferTitle] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);

  const handleOpenTransfer = async () => {
    if (!item || !canTransfer) return;
    setTransferTitle(`${item.title} (نسخة منقولة)`);
    setTransferTargetCourseId(courseId);
    const courses = await fetchAllCourses();
    const filteredCourses =
      allowedTargetCourseIds && allowedTargetCourseIds.length > 0
        ? courses.filter((c) => allowedTargetCourseIds.includes(c.id))
        : courses;
    setAllCourses(filteredCourses);
    const units = await fetchUnitsByCourse(courseId);
    setTransferTargetUnits(units);
    if (units.length > 0) setTransferTargetUnitId(units[0].id);
    else setTransferTargetUnitId('');
    setIsTransferModalOpen(true);
  };

  const handleExecuteTransfer = async () => {
    if (!item || !transferTargetCourseId || !transferTargetUnitId || !canTransfer) return;
    setIsTransferring(true);
    try {
      const copiedItem = await copyItemToTargetCourse(
        item.id,
        transferTargetCourseId,
        transferTargetUnitId,
        transferTitle
      );
      setIsTransferring(false);
      setIsTransferModalOpen(false);
      if (copiedItem) {
        showFeedback(
          'success',
          `تم نسخ ونقل ${item.itemType === 'homework' ? 'الواجب' : 'الامتحان'} بنجاح إلى الكورس المحدد!`
        );
      }
    } catch (err: any) {
      console.error(err);
      setIsTransferring(false);
      showFeedback('error', err.message || 'حدث خطأ أثناء النسخ والنقل');
    }
  };

  // Bidirectional Conversion / Independent Clone Modal State
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [convertMode, setConvertMode] = useState<'convert_in_place' | 'keep_copy'>('keep_copy');
  const [convertTitle, setConvertTitle] = useState('');
  const [convertTargetCourseId, setConvertTargetCourseId] = useState('');
  const [convertTargetUnits, setConvertTargetUnits] = useState<UnitData[]>([]);
  const [convertTargetUnitId, setConvertTargetUnitId] = useState('');
  const [isConvertingAssessment, setIsConvertingAssessment] = useState(false);

  const handleOpenConvertModal = async () => {
    if (!item || !canConvertAssessments) return;
    const targetLabel = item.itemType === 'exam' ? 'واجب' : 'امتحان';
    setConvertMode('keep_copy');
    setConvertTitle(`${item.title} (نسخة ${targetLabel})`);
    setConvertTargetCourseId(courseId);
    const [courses, units] = await Promise.all([fetchAllCourses(), fetchUnitsByCourse(courseId)]);
    const filteredCourses =
      !canTransfer
        ? courses.filter((c) => c.id === courseId)
        : allowedTargetCourseIds && allowedTargetCourseIds.length > 0
        ? courses.filter((c) => allowedTargetCourseIds.includes(c.id))
        : courses;
    setAllCourses(filteredCourses);
    setConvertTargetUnits(units);
    setConvertTargetUnitId(item.unitId || (units[0]?.id || ''));
    setIsConvertModalOpen(true);
  };

  const handleExecuteConvertAssessment = async () => {
    if (!item || !canConvertAssessments) return;
    const targetType = item.itemType === 'exam' ? 'homework' : 'exam';
    const targetLabel = targetType === 'homework' ? 'واجب منزلي' : 'امتحان شامل';

    setIsConvertingAssessment(true);
    try {
      const res = await convertOrCloneAssessment({
        sourceItemId: item.id,
        targetType,
        mode: convertMode,
        newTitle: convertTitle.trim() || undefined,
        targetCourseId: convertMode === 'keep_copy' ? (convertTargetCourseId || courseId) : undefined,
        targetUnitId: convertMode === 'keep_copy' ? (convertTargetUnitId || item.unitId) : undefined,
      });

      if (!res.success || !res.item) {
        showFeedback('error', res.error || 'تعذر تنفيذ التحويل أو الاستنساخ');
        return;
      }

      setIsConvertModalOpen(false);
      const qCount = res.questionsCount ?? 0;

      if (convertMode === 'convert_in_place') {
        setItem(res.item);
        setMetaTitle(res.item.title || '');
        showFeedback('success', `تم التحويل التام إلى ${targetLabel} مع الحفاظ على (${qCount}) سؤال بالكامل.`);
        router.refresh();
      } else {
        showFeedback('success', `تم إنشاء ${targetLabel} مستقل بعنوان "${res.item.title}" (${qCount} سؤال) مع إبقاء الأصل كما هو.`);
      }
    } catch (err: any) {
      showFeedback('error', err?.message || 'حدث خطأ أثناء التحويل');
    } finally {
      setIsConvertingAssessment(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setLoading(true);
      try {
        const currentItem = await fetchItemById(itemId);
        if (currentItem && isMounted) {
          setItem(currentItem);
          setMetaTitle(currentItem.title || '');
          setMetaDescription(currentItem.description || '');
          const dur =
            currentItem.durationMinutes !== undefined &&
            currentItem.durationMinutes !== null &&
            !isNaN(Number(currentItem.durationMinutes)) &&
            Number(currentItem.durationMinutes) > 0
              ? Number(currentItem.durationMinutes)
              : 30;
          setMetaDurationMinutes(dur);
          setMetaPassingScore(currentItem.passingScorePercentage || 60);
          setMetaMaxAttempts(
            currentItem.maxExamAttempts !== undefined &&
              currentItem.maxExamAttempts !== null &&
              !isNaN(Number(currentItem.maxExamAttempts))
              ? Number(currentItem.maxExamAttempts)
              : 3
          );
          setMetaStartDate(currentItem.startDate || '');
          setMetaEndDate(currentItem.endDate || '');
          setMetaIsPrerequisite(currentItem.isPrerequisiteRequired);

          // ZERO-EXPOSURE: Never fetch existing questions in Blind Mode or when canViewQuestions is false
          if (canViewQuestions) {
            const itemQuestions = await fetchQuestionsByItem(currentItem.id);
            if (isMounted) setQuestions(itemQuestions);
          } else {
            if (isMounted) setQuestions([]);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, [courseId, itemId, canViewQuestions]);

  // Passages available for linking (from blindQueue if in Blind Mode, otherwise from existing questions)
  const passages = useMemo(() => {
    const source = isBlind ? blindQueue : questions;
    return source.filter((q) => q.questionType === 'passage');
  }, [isBlind, blindQueue, questions]);

  // Detect blanks for Word Bank
  const detectedBlankIndices: number[] = useMemo(() => {
    if (questionType !== 'word_bank') return [];
    return extractBlankIndices(questionText);
  }, [questionText, questionType]);

  const effectiveWordBankBlanks = useMemo(() => {
    return detectedBlankIndices.map((num) => {
      const found = wordBankBlanks.find((b) => b.blankIndex === num);
      return found || { blankIndex: num, correctAnswer: '', points: 1 };
    });
  }, [detectedBlankIndices, wordBankBlanks]);

  const handleAddOption = () => {
    setOptions([...options, { id: 'opt_' + Math.random().toString(36).substring(2, 9), text: '' }]);
  };

  const handleOptionChange = (id: string, text: string) => {
    setOptions(options.map((opt) => (opt.id === id ? { ...opt, text } : opt)));
  };

  const handleRemoveOption = (id: string) => {
    setOptions(options.filter((opt) => opt.id !== id));
    if (correctAnswerId === id) setCorrectAnswerId('');
    setCorrectAnswerIds((prev) => prev.filter((x) => x !== id));
  };

  const handleToggleMultiCorrect = (id: string) => {
    setCorrectAnswerIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Word Bank Helper Handlers
  const handleAddWordBankWord = () => {
    const trimmed = newWordInput.trim();
    if (!trimmed) return;
    if (!wordBankWords.includes(trimmed)) {
      setWordBankWords([...wordBankWords, trimmed]);
    }
    setNewWordInput('');
  };

  const handleBulkAddWords = () => {
    if (!bulkWordsInput.trim()) return;
    const splitWords = bulkWordsInput
      .split(/[\n, -]+/)
      .map((w) => w.trim())
      .filter((w) => w.length > 0);

    const combined = Array.from(new Set([...wordBankWords, ...splitWords]));
    setWordBankWords(combined);
    setBulkWordsInput('');
    setShowBulkAdd(false);
  };

  const handleRemoveWordBankWord = (wordToRemove: string) => {
    setWordBankWords(wordBankWords.filter((w) => w !== wordToRemove));
    setWordBankBlanks((prev) =>
      prev.map((b) => (b.correctAnswer === wordToRemove ? { ...b, correctAnswer: '' } : b))
    );
  };

  const handleInsertBlankInText = (blankNum: number) => {
    setQuestionText((prev) => prev + ` [${blankNum}] `);
  };

  const handleInsertBlankPattern = (patternType: 'dots' | 'line' | 'brackets') => {
    let snippet = ' ............ ';
    if (patternType === 'line') snippet = ' ___________ ';
    if (patternType === 'brackets') snippet = ' (......) ';
    setQuestionText((prev) => prev + snippet);
  };

  const handleBlankAnswerChange = (blankIndex: number, answer: string) => {
    setWordBankBlanks((prev) => {
      const existing = prev.find((b) => b.blankIndex === blankIndex);
      if (existing) {
        return prev.map((b) => (b.blankIndex === blankIndex ? { ...b, correctAnswer: answer } : b));
      }
      return [...prev, { blankIndex, correctAnswer: answer, points: 1 }];
    });
  };

  const resetForm = () => {
    setEditingQuestionId(null);
    setQuestionType('mcq');
    setQuestionText('');
    setOptions([]);
    setCorrectAnswerId('');
    setCorrectAnswerIds([]);
    setIdealAnswer('');
    setGradingType('auto');
    setPoints(1);
    setExplanation('');
    setHint('');
    setParentId('');
    setWordBankWords([]);
    setNewWordInput('');
    setBulkWordsInput('');
    setShowBulkAdd(false);
    setWordBankBlanks([]);
    setIsAdding(false);
  };

  const handleOpenAdd = () => {
    if (!canAddQuestions) return;
    resetForm();
    setIsAdding(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleOpenEdit = (q: QuestionData) => {
    // Allowed for saved questions ONLY if canEditQuestions, or for unsaved blindQueue drafts
    const isInBlindDraft = isBlind && blindQueue.some((bq) => bq.id === q.id);
    if (!isInBlindDraft && !canEditQuestions) return;

    setEditingQuestionId(q.id);
    setQuestionType(q.questionType || 'mcq');
    setQuestionText(q.questionText || '');
    setOptions(q.options ? [...q.options] : []);
    setCorrectAnswerId(q.correctAnswerId || '');
    setCorrectAnswerIds(
      q.correctAnswerIds && q.correctAnswerIds.length > 0
        ? [...q.correctAnswerIds]
        : q.correctAnswerId
        ? [q.correctAnswerId]
        : []
    );
    setIdealAnswer(q.idealAnswer || '');
    setGradingType(q.gradingType || 'auto');
    setPoints(q.points || 1);
    setExplanation(q.explanation || '');
    setHint(q.hint || '');
    setParentId(q.parentId || '');
    setWordBankWords(q.wordBankWords ? [...q.wordBankWords] : []);
    setWordBankBlanks(q.wordBankBlanks ? [...q.wordBankBlanks] : []);
    setIsAdding(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleSaveQuestion = async () => {
    if (!questionText.trim()) {
      showFeedback('error', 'يجب كتابة نص السؤال أو القطعة');
      return;
    }

    if (questionType === 'mcq') {
      if (options.length < 2) {
        showFeedback('error', 'يجب إضافة خيارين على الأقل');
        return;
      }
      if (!correctAnswerId) {
        showFeedback('error', 'يجب تحديد الإجابة الصحيحة');
        return;
      }
    }
    if (questionType === 'multi_select') {
      if (options.length < 2) {
        showFeedback('error', 'يجب إضافة خيارين على الأقل');
        return;
      }
      if (correctAnswerIds.length === 0) {
        showFeedback('error', 'يجب تحديد إجابة واحدة صحيحة على الأقل في الاختيار متعدد الإجابات');
        return;
      }
    }
    if (questionType === 'word_bank') {
      if (wordBankWords.length < 2) {
        showFeedback('error', 'يجب إضافة كلمتين على الأقل في صندوق الكلمات');
        return;
      }
      if (detectedBlankIndices.length === 0) {
        showFeedback('error', 'يجب إدراج فراغ واحد على الأقل في نص القطعة مثل [1] أو [2]');
        return;
      }
      const missingAnswers = effectiveWordBankBlanks.some((b) => !b.correctAnswer);
      if (missingAnswers) {
        showFeedback('error', 'يرجى تحديد الإجابة الصحيحة لجميع الفراغات في القطعة');
        return;
      }
    }

    let finalOptions = options;
    let finalCorrectAnswerId = correctAnswerId;

    if (questionType === 'tf') {
      if (finalOptions.length === 0) {
        finalOptions = [
          { id: 'true_opt', text: 'صح' },
          { id: 'false_opt', text: 'خطأ' },
        ];
        if (!finalCorrectAnswerId) finalCorrectAnswerId = 'true_opt';
      }
    } else if (questionType === 'multi_select') {
      finalCorrectAnswerId = correctAnswerIds[0] || '';
    }

    const builtPoints =
      questionType === 'passage'
        ? 0
        : questionType === 'word_bank'
        ? effectiveWordBankBlanks.length || points
        : Number(points) || 1;

    // BLIND ADD-ONLY MODE: Queue locally in session memory, NEVER overwrite existing questions
    if (isBlind) {
      if (editingQuestionId) {
        setBlindQueue((prev) =>
          prev.map((q) =>
            q.id === editingQuestionId
              ? {
                  ...q,
                  questionType,
                  questionText: questionText.trim(),
                  options: finalOptions,
                  correctAnswerId: finalCorrectAnswerId,
                  correctAnswerIds: questionType === 'multi_select' ? correctAnswerIds : undefined,
                  idealAnswer: idealAnswer.trim(),
                  gradingType,
                  points: builtPoints,
                  explanation: explanation.trim(),
                  hint: hint.trim() || undefined,
                  parentId: parentId || undefined,
                  wordBankWords: questionType === 'word_bank' ? wordBankWords : undefined,
                  wordBankBlanks:
                    questionType === 'word_bank' ? effectiveWordBankBlanks : undefined,
                }
              : q
          )
        );
        showFeedback('success', 'تم تحديث السؤال في مسودة الإرسال السرية');
      } else {
        const draftQuestion: QuestionData = {
          id: crypto.randomUUID(),
          itemId,
          questionType,
          questionText: questionText.trim(),
          options: finalOptions,
          correctAnswerId: finalCorrectAnswerId,
          correctAnswerIds: questionType === 'multi_select' ? correctAnswerIds : undefined,
          idealAnswer: idealAnswer.trim(),
          gradingType,
          points: builtPoints,
          explanation: explanation.trim(),
          hint: hint.trim() || undefined,
          orderIndex: blindQueue.length + 1,
          parentId: parentId || undefined,
          wordBankWords: questionType === 'word_bank' ? wordBankWords : undefined,
          wordBankBlanks: questionType === 'word_bank' ? effectiveWordBankBlanks : undefined,
        };
        setBlindQueue((prev) => [...prev, draftQuestion]);
        showFeedback(
          'success',
          'تمت إضافة السؤال إلى مسودة الجلسة! اضغط "رفع الأسئلة إلى البنك السري" عند الانتهاء.'
        );
      }
      resetForm();
      return;
    }

    // STANDARD MODE (Teacher or Assistant with View + Add/Edit permissions)
    if (editingQuestionId && !canEditQuestions) {
      showFeedback('error', 'غير مصرح لك بتعديل الأسئلة الموجودة');
      return;
    }
    if (!editingQuestionId && !canAddQuestions) {
      showFeedback('error', 'غير مصرح لك بإضافة أسئلة جديدة');
      return;
    }

    try {
      let updatedQuestions: QuestionData[];

      if (editingQuestionId) {
        updatedQuestions = questions.map((q) => {
          if (q.id === editingQuestionId) {
            return {
              ...q,
              questionType,
              questionText: questionText.trim(),
              options: finalOptions,
              correctAnswerId: finalCorrectAnswerId,
              correctAnswerIds: questionType === 'multi_select' ? correctAnswerIds : undefined,
              idealAnswer: idealAnswer.trim(),
              gradingType,
              points: builtPoints,
              explanation: explanation.trim(),
              hint: hint.trim() || undefined,
              parentId: parentId || undefined,
              wordBankWords: questionType === 'word_bank' ? wordBankWords : undefined,
              wordBankBlanks: questionType === 'word_bank' ? effectiveWordBankBlanks : undefined,
            };
          }
          return q;
        });
      } else {
        const newQuestion: QuestionData = {
          id: crypto.randomUUID(),
          itemId,
          questionType,
          questionText: questionText.trim(),
          options: finalOptions,
          correctAnswerId: finalCorrectAnswerId,
          correctAnswerIds: questionType === 'multi_select' ? correctAnswerIds : undefined,
          idealAnswer: idealAnswer.trim(),
          gradingType,
          points: builtPoints,
          explanation: explanation.trim(),
          hint: hint.trim() || undefined,
          orderIndex: questions.length + 1,
          parentId: parentId || undefined,
          wordBankWords: questionType === 'word_bank' ? wordBankWords : undefined,
          wordBankBlanks: questionType === 'word_bank' ? effectiveWordBankBlanks : undefined,
        };
        updatedQuestions = [...questions, newQuestion];
      }

      const savedOk = await saveQuestionsForItem(itemId, updatedQuestions);
      if (!savedOk) {
        showFeedback('error', 'تعذر حفظ السؤال — يرجى التحقق من صلاحياتك أو الاتصال بالخادم');
        return;
      }

      setQuestions(updatedQuestions);
      const newCalculatedTotalMarks = updatedQuestions.reduce((sum, q) => {
        if (q.questionType === 'passage') return sum;
        return sum + (typeof q.points === 'number' ? q.points : Number(q.points) || 1);
      }, 0);
      await updateItemMetadata(itemId, { totalMarks: newCalculatedTotalMarks });
      setItem((prev) => (prev ? { ...prev, totalMarks: newCalculatedTotalMarks } : null));

      showFeedback('success', editingQuestionId ? 'تم حفظ تعديلات السؤال بنجاح' : 'تم حفظ السؤال وإضافته للبنك بنجاح');
      resetForm();
    } catch (err) {
      console.error(err);
      showFeedback('error', 'حدث خطأ أثناء حفظ السؤال');
    }
  };

  const handleSubmitBlindQueue = async () => {
    if (!isBlind || blindQueue.length === 0) return;
    setIsSubmittingBlind(true);
    try {
      const res = await appendQuestionsForItem(itemId, blindQueue);
      if (res.success) {
        showFeedback(
          'success',
          `تم رفع وحفظ (${res.insertedCount}) سؤال في البنك السري بنجاح وإخفاء محتواها بعد الإرسال!`
        );
        setBlindQueue([]);
        if (res.totalMarks !== undefined) {
          setItem((prev) => (prev ? { ...prev, totalMarks: res.totalMarks! } : null));
        }
      } else {
        showFeedback('error', res.error || 'تعذر حفظ الأسئلة المضافة');
      }
    } catch (err: any) {
      showFeedback('error', err?.message || 'حدث خطأ أثناء رفع الأسئلة');
    } finally {
      setIsSubmittingBlind(false);
    }
  };

  const handleRemoveBlindDraft = (draftId: string) => {
    setBlindQueue((prev) => prev.filter((q) => q.id !== draftId));
  };

  const handleConfirmDelete = async () => {
    if (!questionToDelete || !canDeleteQuestions) return;
    setIsDeleting(true);
    try {
      const updatedQuestions = questions.filter((q) => q.id !== questionToDelete.id);
      const ok = await saveQuestionsForItem(itemId, updatedQuestions);
      if (!ok) {
        showFeedback('error', 'غير مصرح بحذف الأسئلة');
        return;
      }
      setQuestions(updatedQuestions);

      const newCalculatedTotalMarks = updatedQuestions.reduce((sum, q) => {
        if (q.questionType === 'passage') return sum;
        return sum + (typeof q.points === 'number' ? q.points : Number(q.points) || 1);
      }, 0);
      await updateItemMetadata(itemId, { totalMarks: newCalculatedTotalMarks });
      setItem((prev) => (prev ? { ...prev, totalMarks: newCalculatedTotalMarks } : null));
      showFeedback('success', 'تم حذف السؤال وتحديث الدرجة الكلية بنجاح');
    } catch (err) {
      console.error('Delete question error:', err);
      showFeedback('error', 'حدث خطأ أثناء الحذف');
    } finally {
      setIsDeleting(false);
      setQuestionToDelete(null);
    }
  };

  const calculatedTotalMarks = useMemo(() => {
    if (isBlind) return item?.totalMarks || 0;
    return questions.reduce((sum, q) => {
      if (q.questionType === 'passage') return sum;
      return sum + (typeof q.points === 'number' ? q.points : Number(q.points) || 1);
    }, 0);
  }, [questions, isBlind, item?.totalMarks]);

  const passingScorePoints = useMemo(() => {
    return Math.ceil((calculatedTotalMarks * metaPassingScore) / 100);
  }, [calculatedTotalMarks, metaPassingScore]);

  const handleSaveMetadata = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!metaTitle.trim() || !item || !canEditSettings) return;

    setIsSavingMeta(true);
    setMetaSaveSuccess(false);
    try {
      const finalDuration =
        metaDurationMinutes === '' ? 30 : Math.max(1, Number(metaDurationMinutes));
      const currentCalculatedMarks: number = isBlind
        ? Number(item.totalMarks ?? 0)
        : questions.reduce((sum, q) => {
            if (q.questionType === 'passage') return sum;
            return sum + (typeof q.points === 'number' ? q.points : Number(q.points) || 1);
          }, 0);

      const updated = await updateItemMetadata(item.id, {
        title: metaTitle.trim(),
        description: metaDescription.trim(),
        durationMinutes: finalDuration,
        passingScorePercentage: metaPassingScore,
        maxExamAttempts: Math.max(1, Number(metaMaxAttempts) || 3),
        startDate: metaStartDate || undefined,
        endDate: metaEndDate || undefined,
        isPrerequisiteRequired: metaIsPrerequisite,
        totalMarks: currentCalculatedMarks > 0 ? currentCalculatedMarks : item.totalMarks,
      });

      if (updated) {
        setItem(updated);
      }
      setMetaSaveSuccess(true);
      setTimeout(() => setMetaSaveSuccess(false), 4500);
    } catch (err) {
      console.error('Error saving metadata:', err);
      showFeedback('error', 'حدث خطأ أثناء حفظ بيانات ومواصفات الاختبار');
    } finally {
      setIsSavingMeta(false);
    }
  };

  const draftQuestionForPreview: QuestionData = {
    id: editingQuestionId || 'draft_preview',
    itemId,
    questionType,
    questionText,
    options,
    correctAnswerId,
    correctAnswerIds,
    idealAnswer,
    gradingType,
    points,
    orderIndex: 1,
    explanation,
    hint,
    wordBankWords,
    wordBankBlanks: effectiveWordBankBlanks,
  };

  if (loading) {
    return (
      <div
        className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-8 text-center space-y-4"
        dir="rtl"
      >
        <div className="w-12 h-12 border-4 border-violet-500/20 border-t-violet-600 rounded-full animate-spin" />
        <p className="text-slate-600 dark:text-slate-400 font-bold">جاري تحميل بيئة الأسئلة...</p>
      </div>
    );
  }

  if (!item) {
    return (
      <div
        className="min-h-screen bg-slate-50 dark:bg-slate-950 p-8 text-center flex flex-col items-center justify-center space-y-4"
        dir="rtl"
      >
        <p className="text-rose-500 font-black text-xl">العنصر المطلوب غير موجود أو تم حذفه</p>
        <button
          onClick={() => router.push(`${basePath}/courses/${courseId}`)}
          className="px-6 py-3 bg-violet-600 text-white font-bold rounded-2xl"
        >
          العودة للكورس
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-8 font-sans relative" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-6 pb-28">
        {/* Status Toast */}
        {statusFeedback && (
          <div
            className={`p-4 rounded-2xl border font-bold text-sm flex items-center justify-between gap-3 ${
              statusFeedback.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>{statusFeedback.text}</span>
            </div>
            <button onClick={() => setStatusFeedback(null)} className="p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(`${basePath}/courses/${courseId}`)}
              className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors shrink-0"
              title="العودة لإدارة الكورس"
            >
              <ArrowRight className="w-6 h-6 text-slate-600 dark:text-slate-400" />
            </button>
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800/50">
                  {item.itemType === 'homework' ? 'واجب منزلي' : 'امتحان شامل'}
                </span>
                {isBlind ? (
                  <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 flex items-center gap-1">
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>وضع الإضافة العمياء السري</span>
                  </span>
                ) : (
                  <span className="text-xs font-bold text-slate-400 tabular-nums">
                    إجمالي الأسئلة: {questions.filter((q) => q.questionType !== 'passage').length}
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">{item.title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {canConvertAssessments && (
              <button
                type="button"
                onClick={handleOpenConvertModal}
                className="flex items-center gap-1.5 px-4 py-3 bg-violet-50 hover:bg-violet-100 dark:bg-violet-500/15 dark:hover:bg-violet-500/25 text-violet-700 dark:text-violet-300 font-black text-xs rounded-2xl transition-all border border-violet-200 dark:border-violet-700/60 whitespace-nowrap shrink-0"
                title={item.itemType === 'exam' ? 'تحويل أو نسخ هذا الامتحان كواجب' : 'تحويل أو نسخ هذا الواجب كامتحان'}
              >
                <ArrowLeftRight className="w-4 h-4 text-violet-600" />
                <span>{item.itemType === 'exam' ? 'تحويل / نسخ كواجب' : 'تحويل / نسخ كامتحان'}</span>
              </button>
            )}

            {canTransfer && (
              <button
                type="button"
                onClick={handleOpenTransfer}
                className="flex items-center gap-1.5 px-4 py-3 bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-emerald-500/10 text-slate-700 hover:text-emerald-600 dark:text-slate-300 dark:hover:text-emerald-400 font-bold text-xs rounded-2xl transition-all border border-slate-200 dark:border-slate-700 whitespace-nowrap shrink-0"
                title="نسخ هذا الامتحان بجميع أسئلته لكورس آخر"
              >
                <Copy className="w-4 h-4 text-emerald-600" />
                <span>نسخ لكورس آخر</span>
              </button>
            )}

            {canAddQuestions && activeTab === 'questions' && !isAdding && (
              <button
                id="top-add-question-btn"
                onClick={handleOpenAdd}
                className="flex items-center gap-2 px-5 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl font-black text-sm transition-all shadow-md shadow-violet-500/20 whitespace-nowrap shrink-0"
              >
                <Plus className="w-5 h-5" />
                <span>إضافة سؤال أو قطعة جديدة</span>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs (Zero-Exposure) */}
        <div className="flex items-center gap-2 p-1.5 bg-slate-200/80 dark:bg-slate-800/80 rounded-2xl border border-slate-300 dark:border-slate-700 max-w-2xl overflow-x-auto">
          {canEditSettings && (
            <button
              type="button"
              id="tab-settings-btn"
              onClick={() => setActiveTab('settings')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-black text-xs sm:text-sm transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'settings'
                  ? 'bg-white dark:bg-slate-900 text-violet-700 dark:text-violet-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>بيانات ومواصفات {item.itemType === 'homework' ? 'الواجب' : 'الامتحان'}</span>
            </button>
          )}

          {hasQuestionsTabAccess && (
            <button
              type="button"
              id="tab-questions-btn"
              onClick={() => setActiveTab('questions')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-black text-xs sm:text-sm transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'questions'
                  ? 'bg-white dark:bg-slate-900 text-violet-700 dark:text-violet-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>
                {isBlind
                  ? `مسودة الإضافة (${blindQueue.filter((q) => q.questionType !== 'passage').length})`
                  : `بنك الأسئلة (${questions.filter((q) => q.questionType !== 'passage').length})`}
              </span>
            </button>
          )}

          {canPreviewStudent && (
            <button
              type="button"
              id="tab-preview-btn"
              onClick={() => setActiveTab('preview')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-black text-xs sm:text-sm transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'preview'
                  ? 'bg-white dark:bg-slate-900 text-violet-700 dark:text-violet-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span>معاينة شاشة الطالب</span>
            </button>
          )}
        </div>

        {/* TAB 1: METADATA & PRE-START SETTINGS */}
        {activeTab === 'settings' && canEditSettings && (
          <form onSubmit={handleSaveMetadata} className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 flex-wrap gap-3">
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-violet-600" />
                    مواصفات وبيانات {item.itemType === 'homework' ? 'الواجب' : 'الامتحان'} التي تظهر للطالب قبل البدء
                  </h2>
                  <p className="text-xs text-slate-500 font-bold mt-1">
                    قم بضبط الاسم، التعليمات والإرشادات، المدى الزمني، نسبة النجاح، والمحاولات.
                  </p>
                </div>

                {metaSaveSuccess && (
                  <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-black">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>تم حفظ المواصفات بنجاح</span>
                  </div>
                )}
              </div>

              {/* Total Marks Banner */}
              <div className="bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/40 dark:to-indigo-950/30 border border-violet-200 dark:border-violet-800/60 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-violet-900 dark:text-violet-300 font-black text-sm">
                    <Award className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                    <span>الدرجة الكلية المعتمدة:</span>
                  </div>
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    يتم تجميع درجات كل سؤال تلقائياً من بنك الأسئلة.
                  </p>
                </div>
                <div className="flex items-center gap-3 tabular-nums">
                  <div className="px-4 py-2 bg-white dark:bg-slate-900 rounded-xl border border-violet-200 dark:border-violet-700/60 text-center">
                    <span className="text-xs font-bold text-slate-400 block">إجمالي الدرجات</span>
                    <span className="text-2xl font-black text-violet-600 dark:text-violet-400">
                      {calculatedTotalMarks} <span className="text-xs">درجة</span>
                    </span>
                  </div>
                  <div className="px-4 py-2 bg-white dark:bg-slate-900 rounded-xl border border-emerald-200 dark:border-emerald-700/60 text-center">
                    <span className="text-xs font-bold text-slate-400 block">
                      درجة النجاح ({metaPassingScore}%)
                    </span>
                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                      {passingScorePoints} <span className="text-xs">درجة</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Title Input */}
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <span>اسم {item.itemType === 'homework' ? 'الواجب' : 'الامتحان'}:</span>
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  placeholder="مثال: واجب Unit 1 Grammar & Vocabulary الشامل"
                  className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-sm focus:ring-2 focus:ring-violet-500 focus:outline-none"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <span>الوصف والتعليمات والإرشادات (تظهر للطالب قبل البدء):</span>
                </label>
                <textarea
                  rows={4}
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  placeholder="اكتب هنا توجيهاتك ونصائحك للطلاب قبل فتح شاشة الاختبار..."
                  className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-sm focus:ring-2 focus:ring-violet-500 focus:outline-none leading-relaxed"
                />
              </div>

              {/* Duration Timer */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      عداد وقت {item.itemType === 'homework' ? 'الواجب' : 'الامتحان'} (بالدقائق):
                    </span>
                  </div>
                  <span className="text-xs font-black px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    تايمر تنازلي مباشر أمام الطالب ⏱️
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={600}
                      value={metaDurationMinutes}
                      onChange={(e) =>
                        setMetaDurationMinutes(
                          e.target.value === '' ? '' : Math.max(1, Number(e.target.value))
                        )
                      }
                      className="w-36 px-4 py-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white font-black text-base focus:ring-2 focus:ring-indigo-500 focus:outline-none text-center tabular-nums"
                      placeholder="30"
                    />
                    <span className="text-sm font-black text-slate-700 dark:text-slate-300">دقيقة</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-slate-400 font-bold">خيارات سريعة:</span>
                    {[15, 30, 45, 60, 90, 120].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setMetaDurationMinutes(preset)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                          Number(metaDurationMinutes) === preset
                            ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-400'
                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        {preset} دقيقة {preset === 30 ? '⭐' : ''}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Passing Score & Max Attempts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <label className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>نسبة النجاح لتخطي المرحلة والفتح:</span>
                    <span className="text-emerald-600 font-black text-sm tabular-nums">
                      {metaPassingScore}%
                    </span>
                  </label>
                  <input
                    type="range"
                    min={40}
                    max={100}
                    step={5}
                    value={metaPassingScore}
                    onChange={(e) => setMetaPassingScore(Number(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                  <p className="text-[11px] font-bold text-slate-500 tabular-nums">
                    يعادل <span className="text-emerald-600 font-black">{passingScorePoints}</span> من
                    إجمالي <span className="font-black">{calculatedTotalMarks}</span> درجة.
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                      عدد محاولات السماح قبل إغلاق الجلسة:
                    </label>
                    <span className="text-violet-600 dark:text-violet-400 font-black text-xs px-2.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950/80 border border-violet-200 dark:border-violet-800 tabular-nums">
                      {metaMaxAttempts >= 999
                        ? 'غير محدودة'
                        : `${metaMaxAttempts} ${
                            metaMaxAttempts === 1 ? 'محاولة' : metaMaxAttempts === 2 ? 'محاولتان' : 'محاولات'
                          }`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setMetaMaxAttempts(
                          Math.max(1, (metaMaxAttempts >= 999 ? 10 : metaMaxAttempts) - 1)
                        )
                      }
                      className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-black text-lg flex items-center justify-center transition-all shadow-sm"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={9999}
                      value={metaMaxAttempts}
                      onChange={(e) => setMetaMaxAttempts(Math.max(1, Number(e.target.value) || 1))}
                      className="flex-1 text-center py-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white font-black text-base shadow-sm tabular-nums"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setMetaMaxAttempts((metaMaxAttempts >= 999 ? 0 : metaMaxAttempts) + 1)
                      }
                      className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-black text-lg flex items-center justify-center transition-all shadow-sm"
                    >
                      +
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {[1, 2, 3, 5, 10, 20, 50, 999].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setMetaMaxAttempts(preset)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all ${
                          metaMaxAttempts === preset
                            ? 'bg-violet-600 text-white shadow-sm ring-2 ring-violet-400'
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {preset === 999 ? 'مفتوح (999)' : preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Availability Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-teal-600" />
                    <span>تاريخ البداية وإتاحة الرؤية (اختياري):</span>
                  </label>
                  <input
                    type="date"
                    value={metaStartDate}
                    onChange={(e) => setMetaStartDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-rose-600" />
                    <span>تاريخ النهاية والموعد النهائي للحل (اختياري):</span>
                  </label>
                  <input
                    type="date"
                    value={metaEndDate}
                    onChange={(e) => setMetaEndDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-xs"
                  />
                </div>
              </div>

              {/* Prerequisite Checkbox */}
              <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                <input
                  type="checkbox"
                  id="metaPrerequisite"
                  checked={metaIsPrerequisite}
                  onChange={(e) => setMetaIsPrerequisite(e.target.checked)}
                  className="w-4 h-4 accent-violet-600 rounded cursor-pointer"
                />
                <label
                  htmlFor="metaPrerequisite"
                  className="text-xs font-black text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  شرط إجباري: يجب على الطالب اجتياز المحتويات السابقة قبل التمكن من فتح هذا{' '}
                  {item.itemType === 'homework' ? 'الواجب' : 'الامتحان'}
                </label>
              </div>

              {/* Bidirectional Exam <-> Homework Conversion & Independent Clone Card */}
              {canConvertAssessments && (
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-violet-50/80 to-indigo-50/70 dark:from-violet-950/30 dark:to-indigo-950/20 border border-violet-200 dark:border-violet-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-xs sm:text-sm font-black text-violet-900 dark:text-violet-200 flex items-center gap-2">
                      <ArrowLeftRight className="w-4 h-4 text-violet-600 shrink-0" />
                      <span>
                        {item.itemType === 'exam'
                          ? 'تحويل هذا الامتحان إلى واجب أو إنشاء نسخة واجب مستقلة'
                          : 'تحويل هذا الواجب إلى امتحان أو إنشاء نسخة امتحان مستقلة'}
                      </span>
                    </h4>
                    <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                      يمكنك التحويل التام (مع إمكانية الإرجاع في أي وقت) أو عمل نسخة مستقلة بذاتها بنفس الأسئلة كاملة بحيث لا يؤثر تعديل أحدهما على الآخر.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenConvertModal}
                    className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-black text-xs shadow-sm transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 self-start sm:self-center"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    <span>{item.itemType === 'exam' ? 'تحويل / نسخ كواجب' : 'تحويل / نسخ كامتحان'}</span>
                  </button>
                </div>
              )}

              {/* Save & Nav */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="submit"
                  disabled={isSavingMeta}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 shadow-lg bg-violet-600 hover:bg-violet-700 text-white shadow-violet-600/30 disabled:opacity-60 whitespace-nowrap"
                >
                  {isSavingMeta ? (
                    <>
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                      <span>جاري الحفظ...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      <span>حفظ مواصفات وبيانات الاختبار</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {hasQuestionsTabAccess && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('questions')}
                      className="flex-1 sm:flex-initial px-6 py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                      <Layers className="w-4 h-4" />
                      <span>الذهاب لبنك الأسئلة</span>
                    </button>
                  )}

                  {canPreviewStudent && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('preview')}
                      className="flex-1 sm:flex-initial px-6 py-3.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded-2xl font-black text-xs border border-emerald-200 dark:border-emerald-800 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                      <Eye className="w-4 h-4 text-emerald-600" />
                      <span>معاينة شاشة الطالب</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </form>
        )}

        {/* TAB 3: STUDENT PREVIEW TAB */}
        {activeTab === 'preview' && canPreviewStudent && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800/50 p-4 rounded-2xl">
              <div className="flex items-center gap-2 text-violet-800 dark:text-violet-300 text-xs font-black">
                <Eye className="w-4 h-4 text-violet-600" />
                <span>معاينة شاشة الطالب الحية: فحص شاشة البدء أو اختبار حل الأسئلة التفاعلي:</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex bg-white dark:bg-slate-900 p-1 rounded-xl border border-violet-200 dark:border-violet-800">
                  <button
                    type="button"
                    onClick={() => setPreviewSubTab('pre_start')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                      previewSubTab === 'pre_start'
                        ? 'bg-violet-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    شاشة التعليمات والبدء
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewSubTab('interactive')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                      previewSubTab === 'interactive'
                        ? 'bg-violet-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    بيئة الحل التفاعلية ({questions.filter((q) => q.questionType !== 'passage').length}{' '}
                    سؤال)
                  </button>
                </div>
              </div>
            </div>

            {previewSubTab === 'interactive' && (
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl bg-white dark:bg-slate-950 min-h-[600px]">
                <StudentQuizSolver
                  item={{
                    ...item,
                    title: metaTitle || item.title,
                    description: metaDescription || item.description,
                    durationMinutes:
                      metaDurationMinutes === '' ? 30 : Math.max(1, Number(metaDurationMinutes)),
                    passingScorePercentage: metaPassingScore,
                    maxExamAttempts: metaMaxAttempts,
                    totalMarks: calculatedTotalMarks,
                  }}
                  courseId={courseId}
                  unitTitle={item.itemType === 'homework' ? 'واجب دراسي' : 'امتحان شامل'}
                  currentUser={{
                    fullName: isTeacher ? 'مستر محمد رضوان (معاينة حية)' : 'معاينة المساعد المعتمد',
                    phone: '01552191172',
                  }}
                  initialQuestions={questions}
                  previewMode={true}
                />
              </div>
            )}

            {previewSubTab === 'pre_start' && (
              <div className="relative flex flex-col items-center justify-center min-h-[550px] p-6 sm:p-10 text-center space-y-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-4xl mx-auto">
                <div className="flex flex-col items-center gap-3">
                  <div
                    className={`w-20 h-20 rounded-3xl flex items-center justify-center shadow-lg ${
                      item.itemType === 'homework'
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    }`}
                  >
                    {item.itemType === 'homework' ? (
                      <CheckSquare className="w-10 h-10" />
                    ) : (
                      <ShieldCheck className="w-10 h-10" />
                    )}
                  </div>
                  <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white leading-tight">
                    {metaTitle || item.title}
                  </h1>
                </div>

                {metaDescription && (
                  <div className="w-full text-right bg-violet-50/70 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 rounded-3xl p-5 space-y-2">
                    <div className="flex items-center gap-2 text-violet-800 dark:text-violet-300 font-black text-xs">
                      <Info className="w-4 h-4" />
                      <span>إرشادات وتوجيهات المعلم:</span>
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                      {metaDescription}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 w-full text-right tabular-nums">
                  <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-1">
                    <span className="text-xs font-bold text-slate-400">الدرجة الكلية</span>
                    <div className="text-xl font-black text-slate-900 dark:text-white">
                      {calculatedTotalMarks} درجة
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-1">
                    <span className="text-xs font-bold text-slate-400">نسبة النجاح</span>
                    <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                      {metaPassingScore}%
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-1">
                    <span className="text-xs font-bold text-slate-400">المدة والأسئلة</span>
                    <div className="text-xl font-black text-slate-900 dark:text-white">
                      {metaDurationMinutes || 30} دقيقة •{' '}
                      {questions.filter((q) => q.questionType !== 'passage').length} سؤال
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setPreviewSubTab('interactive')}
                  className="w-full max-w-md py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-base rounded-3xl shadow-xl flex items-center justify-center gap-3"
                >
                  <Maximize2 className="w-6 h-6" />
                  <span>بدء تجربة الاختبار التفاعلي كاملاً 🚀</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: QUESTIONS LIST & BUILDER */}
        {activeTab === 'questions' && hasQuestionsTabAccess && (
          <>
            {/* BLIND ADD-ONLY MODE UI (when !canViewQuestions && canAddQuestions) */}
            {isBlind ? (
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-slate-900 rounded-3xl p-6 md:p-8 border-2 border-amber-400/50 dark:border-amber-700/50 shadow-sm space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-md">
                      <Lock className="w-6 h-6" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-white">
                          وضع الإضافة العمياء السري (Blind Add-Only Mode)
                        </h2>
                        <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-800 dark:text-amber-300 font-black text-xs">
                          حماية قصوى للأسئلة
                        </span>
                      </div>
                      <p className="text-xs md:text-sm font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                        صلاحياتك لهذا الكورس تتيح إضافة أسئلة جديدة فقط دون الاطلاع على بنك الأسئلة المحفوظ مسبقاً أو تعديله أو حذفه. يمكنك تجهيز مسودة أسئلتك في هذه الجلسة ومراجعتها ثم رفعها دفعة واحدة للخادم الآمن.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Blind Session Draft Queue */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-8 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <Layers className="w-5 h-5 text-violet-600" />
                        <span>مسودة الأسئلة الجديدة الجاهزة للرفع ({blindQueue.length})</span>
                      </h3>
                      <p className="text-xs text-slate-500 font-bold mt-0.5">
                        بعد الضغط على رفع الأسئلة سيتم حفظها نهائياً في الامتحان ولن تظهر لك مجدداً لضمان السرية.
                      </p>
                    </div>

                    {blindQueue.length > 0 && (
                      <button
                        type="button"
                        disabled={isSubmittingBlind}
                        onClick={handleSubmitBlindQueue}
                        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs md:text-sm shadow-lg shadow-emerald-600/20 flex items-center gap-2 disabled:opacity-50 whitespace-nowrap shrink-0"
                      >
                        {isSubmittingBlind ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        <span>اعتماد ورفع ({blindQueue.length}) إلى البنك السري</span>
                      </button>
                    )}
                  </div>

                  {blindQueue.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 font-bold text-sm bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                      لم تقم بإضافة أي أسئلة جديدة في هذه الجلسة بعد. اضغط &ldquo;إضافة سؤال أو قطعة جديدة&rdquo; للبدء.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {blindQueue.map((q, idx) => (
                        <div
                          key={q.id}
                          className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4"
                        >
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="w-6 h-6 rounded-lg bg-violet-600 text-white font-black text-xs flex items-center justify-center tabular-nums">
                                {idx + 1}
                              </span>
                              <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                                {q.questionType}
                              </span>
                              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                                {q.points} درجات
                              </span>
                              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                                (مسودة قبل الرفع)
                              </span>
                            </div>
                            <div className="text-sm font-bold text-slate-900 dark:text-white">
                              <QuestionRichRenderer content={q.questionText} dir="ltr" />
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(q)}
                              className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/50 rounded-xl"
                              title="تعديل قبل الرفع"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveBlindDraft(q.id)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl"
                              title="إزالة من المسودة"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* NORMAL MODE EXISTING QUESTIONS LIST */
              <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-8 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Layers className="w-5 h-5 text-violet-600" />
                      <span>
                        بنك الأسئلة والقطع المضافة (
                        {questions.filter((q) => q.questionType !== 'passage').length})
                      </span>
                    </h2>
                    <p className="text-xs text-slate-500 font-bold mt-0.5 tabular-nums">
                      الدرجة الكلية المحسوبة تلقائياً:{' '}
                      <span className="text-violet-600 dark:text-violet-400 font-black">
                        {calculatedTotalMarks} درجة
                      </span>
                      .
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {questions.map((q, idx) => {
                    const isPassage = q.questionType === 'passage';
                    const isMultiSelect = q.questionType === 'multi_select';
                    const isWordBank = q.questionType === 'word_bank';
                    const parentPassage = q.parentId
                      ? passages.find((p) => p.id === q.parentId)
                      : null;
                    const displayIndex = isPassage ? (
                      <BookOpen className="w-3.5 h-3.5" />
                    ) : (
                      questions.slice(0, idx).filter((x) => x.questionType !== 'passage').length + 1
                    );

                    return (
                      <div
                        key={q.id}
                        className={`p-5 rounded-2xl border transition-all ${
                          isPassage
                            ? 'bg-amber-50/60 border-amber-300/80 dark:bg-amber-950/20 dark:border-amber-800/40 shadow-sm'
                            : isWordBank
                            ? 'bg-indigo-50/50 border-indigo-200 dark:bg-indigo-950/20 dark:border-indigo-800/60 shadow-sm'
                            : 'bg-slate-50 border-slate-200 dark:bg-slate-950/60 dark:border-slate-800 hover:border-violet-500/40'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div className="space-y-3 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-black text-xs flex items-center justify-center tabular-nums">
                                {displayIndex}
                              </span>

                              <span
                                className={`text-xs font-black px-2.5 py-1 rounded-xl ${
                                  isPassage
                                    ? 'bg-amber-200/80 text-amber-900 dark:bg-amber-900/50 dark:text-amber-300'
                                    : isMultiSelect
                                    ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50'
                                    : isWordBank
                                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm'
                                    : 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
                                }`}
                              >
                                {q.questionType === 'mcq' && 'اختيار من متعدد (إجابة واحدة)'}
                                {q.questionType === 'multi_select' &&
                                  'اختيار متعدد الإجابات (أكثر من إجابة)'}
                                {q.questionType === 'tf' && 'صح وخطأ'}
                                {q.questionType === 'rewrite' && 'أعد كتابة (Rewrite)'}
                                {q.questionType === 'essay' && 'مقالي'}
                                {q.questionType === 'dialogue' && 'محادثة (Dialogue)'}
                                {q.questionType === 'passage' && 'قطعة فهم (Passage)'}
                                {q.questionType === 'word_bank' && '📦 صندوق كلمات وإكمال (Word Bank)'}
                              </span>

                              {isPassage ? (
                                <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60 flex items-center gap-1.5">
                                  <BookOpen className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                                  <span>0 درجات (نص قراءة فقط)</span>
                                </span>
                              ) : (
                                <>
                                  <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                                    {q.gradingType === 'auto' ? 'تصحيح إلكتروني تلقائي' : 'تصحيح يدوي'}
                                  </span>

                                  <span className="text-xs font-black text-violet-600 dark:text-violet-400 flex items-center gap-1 tabular-nums">
                                    <Award className="w-3.5 h-3.5" />
                                    {q.points} {q.points === 1 ? 'درجة' : 'درجات'}
                                  </span>
                                </>
                              )}
                            </div>

                            {parentPassage && (
                              <div className="text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-100/70 dark:bg-amber-950/40 px-3 py-1.5 rounded-xl inline-flex items-center gap-1.5 border border-amber-200 dark:border-amber-800/30">
                                <BookOpen className="w-3.5 h-3.5" />
                                مرتبط بقطعة:{' '}
                                {parentPassage.questionText.replace(/<[^>]+>/g, '').trim().slice(0, 45)}
                                ...
                              </div>
                            )}

                            <div className="text-slate-900 dark:text-white font-bold text-base leading-relaxed select-text">
                              <QuestionRichRenderer content={q.questionText} dir="ltr" />
                            </div>

                            {/* Word Bank Display */}
                            {isWordBank && q.wordBankWords && q.wordBankWords.length > 0 && (
                              <div className="space-y-3 pt-2">
                                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 space-y-2">
                                  <span className="text-xs font-black text-indigo-700 dark:text-indigo-300 block">
                                    📦 الكلمات المتاحة في الصندوق ({q.wordBankWords.length}):
                                  </span>
                                  <div className="flex flex-wrap gap-2">
                                    {q.wordBankWords.map((word, wIndex) => {
                                      const correctForBlank = q.wordBankBlanks?.find(
                                        (b) => b.correctAnswer === word
                                      );
                                      return (
                                        <span
                                          key={wIndex}
                                          className={`px-3 py-1 rounded-xl text-xs font-bold border inline-flex items-center gap-1.5 ${
                                            correctForBlank
                                              ? 'bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-700 dark:text-emerald-300 font-black'
                                              : 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                          }`}
                                        >
                                          <span>{word}</span>
                                          {correctForBlank && (
                                            <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-black">
                                              فراغ [{correctForBlank.blankIndex}]
                                            </span>
                                          )}
                                        </span>
                                      );
                                    })}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => setPreviewQuestionModal(q)}
                                  className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-black border border-indigo-200 dark:border-indigo-800 transition-colors"
                                >
                                  <Eye className="w-4 h-4 text-indigo-600" />
                                  <span>معاينة وتجربة الحل التفاعلي</span>
                                </button>
                              </div>
                            )}

                            {/* Standard Options */}
                            {!isWordBank && q.options && q.options.length > 0 && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                                {q.options.map((opt) => {
                                  const isSelectedCorrect = isMultiSelect
                                    ? q.correctAnswerIds?.includes(opt.id) ||
                                      q.correctAnswerId === opt.id
                                    : q.correctAnswerId === opt.id;

                                  return (
                                    <div
                                      key={opt.id}
                                      className={`p-3 rounded-xl text-xs font-bold border transition-colors flex items-center justify-between ${
                                        isSelectedCorrect
                                          ? 'bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500'
                                          : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                                      }`}
                                    >
                                      <span className="flex items-center gap-2">
                                        {isMultiSelect ? (
                                          <CheckSquare
                                            className={`w-4 h-4 ${
                                              isSelectedCorrect ? 'text-emerald-600' : 'text-slate-400'
                                            }`}
                                          />
                                        ) : (
                                          <CheckCircle
                                            className={`w-4 h-4 ${
                                              isSelectedCorrect ? 'text-emerald-600' : 'text-slate-400'
                                            }`}
                                          />
                                        )}
                                        {opt.text}
                                      </span>
                                      {isSelectedCorrect && (
                                        <span className="text-[10px] bg-emerald-600 text-white font-black px-2 py-0.5 rounded-md">
                                          ✓ إجابة صحيحة
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {q.idealAnswer && (
                              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900/40">
                                <span className="text-xs font-black text-blue-700 dark:text-blue-400 block mb-1">
                                  نموذج الإجابة:
                                </span>
                                <p className="text-xs font-bold text-blue-900 dark:text-blue-200">
                                  {q.idealAnswer}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Zero-Exposure Actions */}
                          {(canEditQuestions || canDeleteQuestions) && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              {canEditQuestions && (
                                <button
                                  onClick={() => handleOpenEdit(q)}
                                  className="p-2.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/50 rounded-xl transition-colors"
                                  title="تعديل هذا السؤال"
                                >
                                  <Edit3 className="w-5 h-5" />
                                </button>
                              )}
                              {canDeleteQuestions && (
                                <button
                                  onClick={() => setQuestionToDelete(q)}
                                  className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-colors"
                                  title="حذف هذا السؤال"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {questions.length === 0 && !isAdding && (
                    <div className="text-center py-16 text-slate-400 font-bold text-sm bg-slate-50 dark:bg-slate-950/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                      لا توجد أسئلة أو قطع مضافة في هذا الامتحان حتى الآن.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Add / Edit Question Form */}
            {isAdding && (canAddQuestions || canEditQuestions) && (
              <div
                ref={formRef}
                className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border-2 border-violet-500/40 p-6 md:p-8 space-y-6"
              >
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-violet-600" />
                    <span>
                      {editingQuestionId ? 'تعديل السؤال / القطعة' : 'إضافة سؤال أو قطعة جديدة'}
                    </span>
                  </h3>
                  <button
                    onClick={resetForm}
                    className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Type Selection (8 Types) */}
                  <div>
                    <label className="block text-xs font-black text-slate-500 mb-2">نوع المحتوى:</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
                      {[
                        { id: 'passage', label: 'قطعة فهم (Passage)', icon: BookOpen },
                        { id: 'word_bank', label: 'صندوق كلمات (Word Bank)', icon: Package },
                        { id: 'mcq', label: 'اختيار (إجابة واحدة)', icon: CheckCircle },
                        { id: 'multi_select', label: 'اختيار متعدد الإجابات', icon: CheckSquare },
                        { id: 'tf', label: 'صح وخطأ (T/F)', icon: CheckCircle },
                        { id: 'rewrite', label: 'Rewrite', icon: Edit3 },
                        { id: 'dialogue', label: 'محادثة (Dialogue)', icon: MessageCircle },
                        { id: 'essay', label: 'مقالي (Essay)', icon: FileText },
                      ].map((type) => (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => {
                            setQuestionType(type.id as any);
                            if (type.id === 'tf') {
                              setOptions([
                                { id: 'true_opt', text: 'صح' },
                                { id: 'false_opt', text: 'خطأ' },
                              ]);
                              setCorrectAnswerId('true_opt');
                            } else if (type.id === 'multi_select') {
                              if (options.length === 0) {
                                setOptions([
                                  { id: 'opt_1', text: '' },
                                  { id: 'opt_2', text: '' },
                                  { id: 'opt_3', text: '' },
                                  { id: 'opt_4', text: '' },
                                ]);
                              }
                            } else if (type.id === 'word_bank') {
                              if (wordBankWords.length === 0) {
                                setWordBankWords([
                                  'protect',
                                  'pollution',
                                  'important',
                                  'danger',
                                  'clean',
                                ]);
                              }
                              if (!questionText) {
                                setQuestionText(
                                  'Environmental protection is very [1] for our future. We must work together to reduce air [2] and save our planet.'
                                );
                              }
                            } else if (type.id !== 'mcq') {
                              setOptions([]);
                              setCorrectAnswerId('');
                              setCorrectAnswerIds([]);
                            }
                          }}
                          className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${
                            questionType === type.id
                              ? 'border-violet-600 bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 shadow-sm scale-[1.02]'
                              : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-violet-300'
                          }`}
                        >
                          <type.icon className="w-5 h-5 mb-1.5" />
                          <span className="text-xs font-black text-center">{type.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Passage Link */}
                  {questionType !== 'passage' && passages.length > 0 && (
                    <div>
                      <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2">
                        الربط بقطعة فهم (اختياري)
                      </label>
                      <select
                        value={parentId}
                        onChange={(e) => setParentId(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-violet-500 font-bold text-sm text-slate-800 dark:text-slate-200"
                      >
                        <option value="">-- سؤال مستقل (غير مرتبط بقطعة) --</option>
                        {passages.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.questionText.replace(/<[^>]+>/g, '').trim().slice(0, 80)}...
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* WORD BANK BUILDER OR STANDARD EDITOR */}
                  {questionType === 'word_bank' ? (
                    <div className="space-y-6 p-6 rounded-3xl bg-indigo-50/40 dark:bg-indigo-950/20 border-2 border-indigo-200 dark:border-indigo-800/60">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <label className="block text-xs font-black text-indigo-950 dark:text-indigo-200">
                            1. نص القطعة مع الفراغات:
                          </label>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleInsertBlankPattern('dots')}
                              className="px-2.5 py-1 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-900 dark:bg-indigo-900/50 dark:text-indigo-200 font-mono text-xs font-bold"
                            >
                              + نقاط (....)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleInsertBlankPattern('line')}
                              className="px-2.5 py-1 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-900 dark:bg-indigo-900/50 dark:text-indigo-200 font-mono text-xs font-bold"
                            >
                              + خط (____)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleInsertBlankPattern('brackets')}
                              className="px-2.5 py-1 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-900 dark:bg-indigo-900/50 dark:text-indigo-200 font-mono text-xs font-bold"
                            >
                              + أقواس (...)
                            </button>
                            {[1, 2, 3, 4, 5, 6].map((num) => (
                              <button
                                key={num}
                                type="button"
                                onClick={() => handleInsertBlankInText(num)}
                                className="px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-mono text-xs font-bold"
                              >
                                + [{num}]
                              </button>
                            ))}
                          </div>
                        </div>

                        <QuestionRichEditor
                          value={questionText}
                          onChange={(val) => setQuestionText(val)}
                          dir="ltr"
                          minHeight="150px"
                          placeholder="Type the English passage here..."
                          showBlankInserters={false}
                        />

                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-indigo-700 dark:text-indigo-300 font-bold bg-white/60 dark:bg-slate-900/60 p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                          <span>
                            الفراغات المكتشفة:{' '}
                            {detectedBlankIndices.length > 0
                              ? detectedBlankIndices.map((n) => `#${n}`).join(' ، ')
                              : 'لا يوجد'}
                          </span>
                          <span className="tabular-nums">الإجمالي: {detectedBlankIndices.length}</span>
                        </div>
                      </div>

                      {/* Word Bank Words */}
                      <div className="space-y-3 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-black text-indigo-950 dark:text-indigo-200">
                            2. كلمات صندوق الكلمات (Word Bank):
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowBulkAdd(!showBulkAdd)}
                            className="text-xs font-black text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            {showBulkAdd ? 'إغلاق الإضافة الجماعية' : 'لصق كلمات متعددة دفعة واحدة'}
                          </button>
                        </div>

                        {showBulkAdd && (
                          <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-dashed border-indigo-300 space-y-2">
                            <textarea
                              dir="ltr"
                              value={bulkWordsInput}
                              onChange={(e) => setBulkWordsInput(e.target.value)}
                              placeholder="protect pollution important danger clean"
                              rows={2}
                              className="w-full px-3 py-2 bg-white dark:bg-slate-900 rounded-lg text-xs font-sans text-left font-bold border border-slate-200 dark:border-slate-800"
                            />
                            <button
                              type="button"
                              onClick={handleBulkAddWords}
                              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-black"
                            >
                              إضافة كل الكلمات للصندوق
                            </button>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <input
                            dir="ltr"
                            type="text"
                            value={newWordInput}
                            onChange={(e) => setNewWordInput(e.target.value)}
                            onKeyDown={(e) =>
                              e.key === 'Enter' && (e.preventDefault(), handleAddWordBankWord())
                            }
                            placeholder="Type a word in English and press Add..."
                            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-sans text-left font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                          />
                          <button
                            type="button"
                            onClick={handleAddWordBankWord}
                            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm shrink-0"
                          >
                            <Plus className="w-4 h-4" />
                            <span>إضافة كلمة</span>
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-2" dir="ltr">
                          {wordBankWords.map((word, wIdx) => {
                            const assignedToBlank = wordBankBlanks.find(
                              (b) => b.correctAnswer === word
                            );
                            return (
                              <div
                                key={wIdx}
                                className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${
                                  assignedToBlank
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 ring-1 ring-emerald-400'
                                    : 'bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800'
                                }`}
                              >
                                <span className="font-sans font-bold">{word}</span>
                                {assignedToBlank && (
                                  <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-black font-sans">
                                    Blank #{assignedToBlank.blankIndex}
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveWordBankWord(word)}
                                  className="text-slate-400 hover:text-rose-600 p-0.5 rounded-full"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {detectedBlankIndices.length > 0 && (
                        <div className="space-y-3 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800">
                          <label className="block text-xs font-black text-indigo-950 dark:text-indigo-200">
                            3. نموذج الإجابة الإلكتروني الإجباري لكل فراغ:
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {detectedBlankIndices.map((blankNum) => {
                              const chosenWord =
                                wordBankBlanks.find((b) => b.blankIndex === blankNum)
                                  ?.correctAnswer || '';
                              return (
                                <div
                                  key={blankNum}
                                  className={`p-3.5 rounded-2xl border space-y-2 ${
                                    chosenWord
                                      ? 'bg-emerald-50/40 border-emerald-300 dark:bg-emerald-950/20 dark:border-emerald-800/50'
                                      : 'bg-rose-50/30 border-rose-300 dark:bg-rose-950/20 dark:border-rose-800/50'
                                  }`}
                                >
                                  <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 font-sans block">
                                    Blank #{blankNum}
                                  </span>
                                  <select
                                    dir="ltr"
                                    value={chosenWord}
                                    onChange={(e) => handleBlankAnswerChange(blankNum, e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl text-xs font-bold font-sans border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                                  >
                                    <option value="">-- Choose correct word --</option>
                                    {wordBankWords.map((w, i) => (
                                      <option key={i} value={w}>
                                        {w}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="space-y-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowFormLivePreview(!showFormLivePreview)}
                          className="flex items-center gap-2 text-xs font-black text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          <Eye className="w-4 h-4" />
                          <span>
                            {showFormLivePreview
                              ? 'إخفاء المعاينة الحية'
                              : 'إظهار المعاينة الحية والتجربة'}
                          </span>
                        </button>
                        {showFormLivePreview && (
                          <WordBankSolver question={draftQuestionForPreview} mode="preview" />
                        )}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2">
                        {questionType === 'passage'
                          ? 'نص قطعة الفهم (Passage)'
                          : 'نص السؤال (English Question Text)'}
                      </label>
                      <QuestionRichEditor
                        value={questionText}
                        onChange={(val) => setQuestionText(val)}
                        dir="ltr"
                        minHeight={questionType === 'passage' ? '240px' : '130px'}
                        placeholder={
                          questionType === 'passage'
                            ? 'Write the reading passage here in English...'
                            : 'Write the English question here...'
                        }
                        showBlankInserters={questionType !== 'passage'}
                        availableBlankNumbers={[1, 2, 3, 4]}
                        onInsertBlankPattern={handleInsertBlankPattern}
                        onInsertNumberedBlank={handleInsertBlankInText}
                      />
                    </div>
                  )}

                  {/* Options for Single MCQ */}
                  {questionType === 'mcq' && (
                    <div className="space-y-3 p-5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                      <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
                        الخيارات والإجابة الصحيحة (اختر الدائرة بجوار الإجابة الصحيحة)
                      </label>
                      {options.map((opt, i) => (
                        <div key={opt.id} className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="correctAnswer"
                            checked={correctAnswerId === opt.id}
                            onChange={() => setCorrectAnswerId(opt.id)}
                            className="w-5 h-5 text-emerald-600 focus:ring-emerald-500 cursor-pointer shrink-0"
                          />
                          <input
                            dir="ltr"
                            type="text"
                            value={opt.text}
                            onChange={(e) => handleOptionChange(opt.id, e.target.value)}
                            placeholder={`Option ${String.fromCharCode(65 + i)}`}
                            className="flex-1 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-violet-500 font-sans text-left font-bold text-sm text-slate-900 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(opt.id)}
                            className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={handleAddOption}
                        className="text-xs font-black text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1 pt-1"
                      >
                        <Plus className="w-4 h-4" /> إضافة خيار جديد
                      </button>
                    </div>
                  )}

                  {/* Options for Multi-Select */}
                  {questionType === 'multi_select' && (
                    <div className="space-y-3 p-5 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl border border-indigo-200 dark:border-indigo-800/50">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-black text-indigo-950 dark:text-indigo-200">
                          الخيارات والإجابات الصحيحة
                        </label>
                        <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800 tabular-nums">
                          تم تحديد ({correctAnswerIds.length})
                        </span>
                      </div>
                      {options.map((opt, i) => {
                        const isChecked = correctAnswerIds.includes(opt.id);
                        return (
                          <div key={opt.id} className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleMultiCorrect(opt.id)}
                              className="w-5 h-5 text-indigo-600 rounded-md cursor-pointer shrink-0"
                            />
                            <input
                              dir="ltr"
                              type="text"
                              value={opt.text}
                              onChange={(e) => handleOptionChange(opt.id, e.target.value)}
                              placeholder={`Option ${String.fromCharCode(65 + i)}`}
                              className={`flex-1 px-4 py-2.5 rounded-xl border focus:outline-none focus:border-indigo-500 font-sans text-left font-bold text-sm text-slate-900 dark:text-white ${
                                isChecked
                                  ? 'bg-emerald-50/70 border-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-700'
                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveOption(opt.id)}
                              className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                      <button
                        type="button"
                        onClick={handleAddOption}
                        className="text-xs font-black text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 pt-1"
                      >
                        <Plus className="w-4 h-4" /> إضافة خيار جديد
                      </button>
                    </div>
                  )}

                  {/* T/F Setup */}
                  {questionType === 'tf' && (
                    <div className="grid grid-cols-2 gap-4 p-5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                      <label
                        className={`flex items-center gap-3 cursor-pointer p-4 rounded-xl border transition-all ${
                          correctAnswerId === 'true_opt'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <input
                          type="radio"
                          name="tf_answer"
                          checked={correctAnswerId === 'true_opt'}
                          onChange={() => setCorrectAnswerId('true_opt')}
                          className="w-5 h-5 text-emerald-600"
                        />
                        <span className="font-black text-sm text-slate-800 dark:text-slate-200">
                          الإجابة الصحيحة: صح (True)
                        </span>
                      </label>
                      <label
                        className={`flex items-center gap-3 cursor-pointer p-4 rounded-xl border transition-all ${
                          correctAnswerId === 'false_opt'
                            ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-500'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <input
                          type="radio"
                          name="tf_answer"
                          checked={correctAnswerId === 'false_opt'}
                          onChange={() => setCorrectAnswerId('false_opt')}
                          className="w-5 h-5 text-rose-600"
                        />
                        <span className="font-black text-sm text-slate-800 dark:text-slate-200">
                          الإجابة الصحيحة: خطأ (False)
                        </span>
                      </label>
                    </div>
                  )}

                  {/* Ideal answer for text-based questions */}
                  {(questionType === 'rewrite' ||
                    questionType === 'essay' ||
                    questionType === 'dialogue') && (
                    <div>
                      <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2">
                        نموذج الإجابة القياسي (يُستخدم في التصحيح ومقارنة إجابة الطالب):
                      </label>
                      <input
                        dir="ltr"
                        type="text"
                        value={idealAnswer}
                        onChange={(e) => setIdealAnswer(e.target.value)}
                        placeholder="Write the model answer..."
                        className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-violet-500 font-sans font-bold text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                  )}

                  {/* Grading Settings */}
                  {questionType === 'passage' ? (
                    <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-2xl flex items-start gap-3 text-amber-900 dark:text-amber-300">
                      <BookOpen className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
                      <div className="text-xs font-bold leading-relaxed">
                        <p className="font-black text-sm text-amber-800 dark:text-amber-200">
                          قطعة الفهم (Reading Passage) - للقراءة فقط:
                        </p>
                        <p className="text-slate-600 dark:text-slate-400 mt-1">
                          تُحسب عليها 0 درجة، وبعد حفظها يمكنك ربط الأسئلة التابعة لها.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                        <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
                          طريقة التصحيح
                        </label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setGradingType('auto')}
                            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all border ${
                              gradingType === 'auto'
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                            }`}
                          >
                            إلكتروني تلقائي
                          </button>
                          {questionType !== 'word_bank' && (
                            <button
                              type="button"
                              onClick={() => setGradingType('manual')}
                              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all border ${
                                gradingType === 'manual'
                                  ? 'bg-amber-600 text-white border-amber-600 shadow-md'
                                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                              }`}
                            >
                              يدوي (المعلم/المساعد)
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                        <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
                          الدرجة المخصصة للسؤال
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={
                            questionType === 'word_bank'
                              ? effectiveWordBankBlanks.length || points
                              : points
                          }
                          onChange={(e) => setPoints(Number(e.target.value) || 1)}
                          className="w-full px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-violet-500 font-black text-sm text-slate-900 dark:text-white tabular-nums"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2">
                      💡 تلميح السؤال (اختياري):
                    </label>
                    <input
                      type="text"
                      value={hint}
                      onChange={(e) => setHint(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-amber-500 font-bold text-sm text-slate-900 dark:text-white"
                      placeholder="مثال: تذكر استخدام زمن الماضي البسيط..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2">
                      شرح وتوضيح السؤال للطلاب (يظهر بعد الحل):
                    </label>
                    <textarea
                      value={explanation}
                      onChange={(e) => setExplanation(e.target.value)}
                      rows={2}
                      className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-violet-500 font-bold text-sm text-slate-900 dark:text-white resize-y"
                      placeholder="اكتب ملاحظات توضيحية أو قاعدة الجرامر..."
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={handleSaveQuestion}
                      className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl font-black text-sm transition-all shadow-md shadow-violet-500/20"
                    >
                      <Save className="w-5 h-5" />
                      <span>
                        {isBlind
                          ? editingQuestionId
                            ? 'تحديث في مسودة الجلسة'
                            : 'إضافة لمسودة الرفع السرية'
                          : editingQuestionId
                          ? 'حفظ التعديلات على السؤال'
                          : 'حفظ وإضافة السؤال'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl font-black text-sm transition-colors"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating Add Button */}
      {canAddQuestions && activeTab === 'questions' && !isAdding && (
        <aside aria-label="إضافة سؤال أو قطعة" className="fixed bottom-6 left-6 z-40">
          <button
            type="button"
            id="floating-add-question-btn"
            onClick={handleOpenAdd}
            className="group flex items-center gap-3 px-5 py-3.5 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-black text-sm rounded-full shadow-2xl shadow-violet-600/50 hover:scale-105 active:scale-95 transition-all duration-300 border-2 border-white/20 backdrop-blur-md cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:rotate-90 transition-transform duration-300">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <span className="font-black text-sm tracking-wide">إضافة سؤال أو قطعة</span>
          </button>
        </aside>
      )}

      {/* Interactive Question Preview Modal */}
      {previewQuestionModal && canViewQuestions && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
          dir="rtl"
        >
          <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    معاينة وتجربة السؤال التفاعلية
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewQuestionModal(null)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {previewQuestionModal.questionType === 'word_bank' ? (
              <WordBankSolver question={previewQuestionModal} mode="preview" />
            ) : (
              <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="text-base font-bold text-slate-900 dark:text-white leading-relaxed">
                  <QuestionRichRenderer html={previewQuestionModal.questionText} />
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setPreviewQuestionModal(null)}
                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl"
              >
                إغلاق المعاينة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {canDeleteQuestions && (
        <DeleteConfirmationModal
          isOpen={!!questionToDelete}
          onClose={() => setQuestionToDelete(null)}
          onConfirm={handleConfirmDelete}
          title="تأكيد حذف المحتوى"
          itemType={
            questionToDelete?.questionType === 'passage'
              ? 'قطعة الفهم (Passage)'
              : questionToDelete?.questionType === 'word_bank'
              ? 'سؤال صندوق الكلمات (Word Bank)'
              : 'السؤال'
          }
          itemName={questionToDelete?.questionText || ''}
          warningNote="سيتم حذف هذا السؤال ودرجاته ونموذج إجابته نهائياً."
          isLoading={isDeleting}
        />
      )}

      {/* Transfer Modal */}
      <AnimatePresence>
        {isTransferModalOpen && item && canTransfer && (
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
                    نسخ ونقل {item.itemType === 'homework' ? 'الواجب 🎯' : 'الامتحان 🏆'}
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
                    value={transferTitle}
                    onChange={(e) => setTransferTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs text-slate-900 dark:text-white focus:outline-none"
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
                    {allCourses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title} (الصف {c.grade} -{' '}
                        {c.id === courseId ? 'هذا الكورس' : 'كورس آخر'})
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
                      ⚠️ لا توجد وحدات في هذا الكورس بعد.
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
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={isTransferring || !transferTargetCourseId || !transferTargetUnitId}
                  onClick={handleExecuteTransfer}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{isTransferring ? 'جاري النسخ...' : 'تأكيد النسخ والنقل'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bidirectional Convert / Independent Clone Modal */}
      <AnimatePresence>
        {isConvertModalOpen && item && canConvertAssessments && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-7 max-w-lg w-full shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <ArrowLeftRight className="w-5 h-5 text-violet-600" />
                  <span>
                    {item.itemType === 'exam'
                      ? 'تحويل أو نسخ الامتحان كواجب'
                      : 'تحويل أو نسخ الواجب كامتحان'}
                  </span>
                </h3>
                <button
                  onClick={() => setIsConvertModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setConvertMode('keep_copy');
                    const targetLabel = item.itemType === 'exam' ? 'واجب' : 'امتحان';
                    setConvertTitle(`${item.title} (نسخة ${targetLabel})`);
                  }}
                  className={`text-right p-4 rounded-2xl border-2 transition-all space-y-1 ${
                    convertMode === 'keep_copy'
                      ? 'border-violet-600 bg-violet-50/70 dark:bg-violet-950/35 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 hover:border-violet-300'
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
                    ينشئ {item.itemType === 'exam' ? 'واجباً جديداً' : 'امتحاناً جديداً'} بكل الأسئلة كاملة وبشكل مستقل تماماً بحيث أي إضافة أو تعديل مستقبلي لا يؤثر على الأصل.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setConvertMode('convert_in_place');
                    setConvertTitle(item.title);
                  }}
                  className={`text-right p-4 rounded-2xl border-2 transition-all space-y-1 ${
                    convertMode === 'convert_in_place'
                      ? 'border-amber-600 bg-amber-50/70 dark:bg-amber-950/35 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 hover:border-amber-300'
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
                    يحوّل هذا العنصر نفسه من {item.itemType === 'exam' ? 'امتحان إلى واجب' : 'واجب إلى امتحان'} بجميع أسئلته كما هي، مع إمكانية إرجاعه لاحقاً.
                  </p>
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {convertMode === 'keep_copy' ? 'عنوان النسخة المستقلة' : 'العنوان بعد التحويل'}
                  </label>
                  <input
                    type="text"
                    value={convertTitle}
                    onChange={(e) => setConvertTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs text-slate-900 dark:text-white focus:outline-none"
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
                        disabled={!canTransfer}
                        onChange={async (e) => {
                          const cId = e.target.value;
                          setConvertTargetCourseId(cId);
                          const u = await fetchUnitsByCourse(cId);
                          setConvertTargetUnits(u);
                          setConvertTargetUnitId(u[0]?.id || '');
                        }}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs text-slate-900 dark:text-white disabled:opacity-70"
                      >
                        {allCourses.map((c) => (
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
                  onClick={() => setIsConvertModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl"
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
                  className={`px-5 py-2 text-white font-black text-xs rounded-xl shadow-md disabled:opacity-50 flex items-center gap-1.5 ${
                    convertMode === 'convert_in_place'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-violet-600 hover:bg-violet-700'
                  }`}
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  <span>
                    {isConvertingAssessment
                      ? 'جاري التنفيذ...'
                      : convertMode === 'convert_in_place'
                      ? `تأكيد التحويل إلى ${item.itemType === 'exam' ? 'واجب' : 'امتحان'}`
                      : `إنشاء نسخة ${item.itemType === 'exam' ? 'الواجب' : 'الامتحان'} المستقلة`}
                  </span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
