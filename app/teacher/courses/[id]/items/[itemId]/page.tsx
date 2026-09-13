'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  UnitItemData,
  QuestionData,
  fetchItemById,
  saveQuestionsForItem,
  fetchQuestionsByItem,
  updateItemMetadata
} from '@/lib/academicService';
import { extractBlankIndices, parsePassageToTokens } from '@/lib/blankUtils';
import {
  ArrowRight,
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
  MousePointerClick,
  ListFilter,
  Check,
  RotateCcw,
  Info,
  Clock,
  Calendar,
  ShieldCheck,
  ListOrdered,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Maximize2,
  Settings,
  Lock,
  Loader2
} from 'lucide-react';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';
import WordBankSolver from '@/components/WordBankSolver';
import QuestionRichEditor from '@/components/QuestionRichEditor';
import QuestionRichRenderer from '@/components/QuestionRichRenderer';
import StudentQuizSolver from '@/components/StudentQuizSolver';

export default function ItemBuilderPage({ params }: { params: Promise<{ id: string; itemId: string }> }) {
  const router = useRouter();
  const { id: courseId, itemId } = React.use(params);
  const [item, setItem] = useState<UnitItemData | null>(null);
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [loading, setLoading] = useState(true);

  // Active view tab: 'settings' (metadata), 'questions' (builder), 'preview' (student view)
  const [activeTab, setActiveTab] = useState<'settings' | 'questions' | 'preview'>('settings');
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

  // Form reference for smooth scrolling
  const formRef = useRef<HTMLDivElement>(null);

  // Form states
  const [isAdding, setIsAdding] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [questionType, setQuestionType] = useState<'mcq' | 'multi_select' | 'tf' | 'rewrite' | 'essay' | 'dialogue' | 'passage' | 'word_bank'>('mcq');
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState<{ id: string; text: string }[]>([]);
  const [correctAnswerId, setCorrectAnswerId] = useState('');
  const [correctAnswerIds, setCorrectAnswerIds] = useState<string[]>([]);
  const [idealAnswer, setIdealAnswer] = useState('');
  const [gradingType, setGradingType] = useState<'auto' | 'manual'>('auto');
  const [points, setPoints] = useState(1);
  const [explanation, setExplanation] = useState('');
  const [hint, setHint] = useState('');
  const [parentId, setParentId] = useState<string>(''); // For linking to a passage

  // Word Bank States
  const [wordBankWords, setWordBankWords] = useState<string[]>([]);
  const [newWordInput, setNewWordInput] = useState('');
  const [bulkWordsInput, setBulkWordsInput] = useState('');
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [wordBankBlanks, setWordBankBlanks] = useState<{ blankIndex: number; correctAnswer: string; points?: number }[]>([]);
  const [showFormLivePreview, setShowFormLivePreview] = useState(true);

  // Modal Preview State
  const [previewQuestionModal, setPreviewQuestionModal] = useState<QuestionData | null>(null);

  // Delete Modal State
  const [questionToDelete, setQuestionToDelete] = useState<QuestionData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
          const dur = (currentItem.durationMinutes !== undefined && currentItem.durationMinutes !== null && !isNaN(Number(currentItem.durationMinutes)) && Number(currentItem.durationMinutes) > 0)
            ? Number(currentItem.durationMinutes)
            : 30;
          setMetaDurationMinutes(dur);
          setMetaPassingScore(currentItem.passingScorePercentage || 60);
          setMetaMaxAttempts(currentItem.maxExamAttempts !== undefined && currentItem.maxExamAttempts !== null && !isNaN(Number(currentItem.maxExamAttempts)) ? Number(currentItem.maxExamAttempts) : 3);
          setMetaStartDate(currentItem.startDate || '');
          setMetaEndDate(currentItem.endDate || '');
          setMetaIsPrerequisite(currentItem.isPrerequisiteRequired);

          const itemQuestions = await fetchQuestionsByItem(currentItem.id);
          if (isMounted) setQuestions(itemQuestions);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadData();
    return () => { isMounted = false; };
  }, [courseId, itemId]);

  const passages = questions.filter(q => q.questionType === 'passage');

  // Detect blanks from questionText for Word Bank (supports dots, underscores, brackets, numbered blanks)
  const detectedBlankIndices: number[] = React.useMemo(() => {
    if (questionType !== 'word_bank') return [];
    return extractBlankIndices(questionText);
  }, [questionText, questionType]);

  // Derived effective blanks configuration
  const effectiveWordBankBlanks = React.useMemo(() => {
    return detectedBlankIndices.map(num => {
      const found = wordBankBlanks.find(b => b.blankIndex === num);
      return found || { blankIndex: num, correctAnswer: '', points: 1 };
    });
  }, [detectedBlankIndices, wordBankBlanks]);

  const handleAddOption = () => {
    setOptions([...options, { id: 'opt_' + Math.random().toString(36).substring(2, 9), text: '' }]);
  };

  const handleOptionChange = (id: string, text: string) => {
    setOptions(options.map(opt => opt.id === id ? { ...opt, text } : opt));
  };

  const handleRemoveOption = (id: string) => {
    setOptions(options.filter(opt => opt.id !== id));
    if (correctAnswerId === id) setCorrectAnswerId('');
    setCorrectAnswerIds(prev => prev.filter(x => x !== id));
  };

  const handleToggleMultiCorrect = (id: string) => {
    setCorrectAnswerIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
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
      .map(w => w.trim())
      .filter(w => w.length > 0);
    
    const combined = Array.from(new Set([...wordBankWords, ...splitWords]));
    setWordBankWords(combined);
    setBulkWordsInput('');
    setShowBulkAdd(false);
  };

  const handleRemoveWordBankWord = (wordToRemove: string) => {
    setWordBankWords(wordBankWords.filter(w => w !== wordToRemove));
    // Clear any blanks using this word
    setWordBankBlanks(prev =>
      prev.map(b => (b.correctAnswer === wordToRemove ? { ...b, correctAnswer: '' } : b))
    );
  };

  const handleInsertBlankInText = (blankNum: number) => {
    const placeholder = ` [${blankNum}] `;
    setQuestionText(prev => prev + placeholder);
  };

  const handleInsertBlankPattern = (patternType: 'dots' | 'line' | 'brackets') => {
    let snippet = ' ............ ';
    if (patternType === 'line') snippet = ' ___________ ';
    if (patternType === 'brackets') snippet = ' (......) ';
    setQuestionText(prev => prev + snippet);
  };

  const handleBlankAnswerChange = (blankIndex: number, answer: string) => {
    setWordBankBlanks(prev => {
      const existing = prev.find(b => b.blankIndex === blankIndex);
      if (existing) {
        return prev.map(b => b.blankIndex === blankIndex ? { ...b, correctAnswer: answer } : b);
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
    resetForm();
    setIsAdding(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleOpenEdit = (q: QuestionData) => {
    setEditingQuestionId(q.id);
    setQuestionType(q.questionType || 'mcq');
    setQuestionText(q.questionText || '');
    setOptions(q.options ? [...q.options] : []);
    setCorrectAnswerId(q.correctAnswerId || '');
    setCorrectAnswerIds(
      q.correctAnswerIds && q.correctAnswerIds.length > 0
        ? [...q.correctAnswerIds]
        : (q.correctAnswerId ? [q.correctAnswerId] : [])
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
    if (!questionText.trim()) return alert('يجب كتابة نص السؤال أو القطعة');

    if (questionType === 'mcq') {
      if (options.length < 2) return alert('يجب إضافة خيارين على الأقل');
      if (!correctAnswerId) return alert('يجب تحديد الإجابة الصحيحة');
    }
    if (questionType === 'multi_select') {
      if (options.length < 2) return alert('يجب إضافة خيارين على الأقل');
      if (correctAnswerIds.length === 0) return alert('يجب تحديد إجابة واحدة صحيحة على الأقل في الاختيار متعدد الإجابات');
    }
    if (questionType === 'word_bank') {
      if (wordBankWords.length < 2) return alert('يجب إضافة كلمتين على الأقل في صندوق الكلمات');
      if (detectedBlankIndices.length === 0) return alert('يجب إدراج فراغ واحد على الأقل في نص القطعة مثل [1] أو [2]');
      const missingAnswers = effectiveWordBankBlanks.some(b => !b.correctAnswer);
      if (missingAnswers) return alert('يرجى تحديد الإجابة الصحيحة لجميع الفراغات في القطعة');
    }
    
    // For T/F, ensure 2 options exist
    let finalOptions = options;
    let finalCorrectAnswerId = correctAnswerId;
    
    if (questionType === 'tf') {
      if (finalOptions.length === 0) {
        const trueId = 'true_opt';
        const falseId = 'false_opt';
        finalOptions = [
          { id: trueId, text: 'صح' },
          { id: falseId, text: 'خطأ' }
        ];
        if (!finalCorrectAnswerId) finalCorrectAnswerId = trueId;
      }
    } else if (questionType === 'multi_select') {
      finalCorrectAnswerId = correctAnswerIds[0] || '';
    }

    try {
      let updatedQuestions: QuestionData[];

      if (editingQuestionId) {
        // Update existing question
        updatedQuestions = questions.map(q => {
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
              points: questionType === 'passage' ? 0 : questionType === 'word_bank' ? (effectiveWordBankBlanks.length || points) : (Number(points) || 1),
              explanation: explanation.trim(),
              hint: hint.trim() || undefined,
              parentId: parentId || undefined,
              wordBankWords: questionType === 'word_bank' ? wordBankWords : undefined,
              wordBankBlanks: questionType === 'word_bank' ? effectiveWordBankBlanks : undefined
            };
          }
          return q;
        });
      } else {
        // Create new question
        const newQuestion: QuestionData = {
          id: 'q_' + Math.random().toString(36).substring(2, 9),
          itemId: itemId,
          questionType,
          questionText: questionText.trim(),
          options: finalOptions,
          correctAnswerId: finalCorrectAnswerId,
          correctAnswerIds: questionType === 'multi_select' ? correctAnswerIds : undefined,
          idealAnswer: idealAnswer.trim(),
          gradingType,
          points: questionType === 'passage' ? 0 : questionType === 'word_bank' ? (effectiveWordBankBlanks.length || points) : (Number(points) || 1),
          explanation: explanation.trim(),
          hint: hint.trim() || undefined,
          orderIndex: questions.length + 1,
          parentId: parentId || undefined,
          wordBankWords: questionType === 'word_bank' ? wordBankWords : undefined,
          wordBankBlanks: questionType === 'word_bank' ? effectiveWordBankBlanks : undefined
        };
        updatedQuestions = [...questions, newQuestion];
      }

      setQuestions(updatedQuestions);
      await saveQuestionsForItem(itemId, updatedQuestions);

      // Automatically calculate total marks from sum of question points excluding passages
      const newCalculatedTotalMarks = updatedQuestions.reduce((sum, q) => {
        if (q.questionType === 'passage') return sum;
        return sum + (typeof q.points === 'number' ? q.points : (Number(q.points) || 1));
      }, 0);
      await updateItemMetadata(itemId, { totalMarks: newCalculatedTotalMarks });
      setItem(prev => prev ? { ...prev, totalMarks: newCalculatedTotalMarks } : null);

      resetForm();
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء حفظ السؤال');
    }
  };

  const handleConfirmDelete = async () => {
    if (!questionToDelete) return;
    setIsDeleting(true);
    try {
      const updatedQuestions = questions.filter(q => q.id !== questionToDelete.id);
      setQuestions(updatedQuestions);
      await saveQuestionsForItem(itemId, updatedQuestions);

      // Automatically calculate total marks from remaining questions excluding passages
      const newCalculatedTotalMarks = updatedQuestions.reduce((sum, q) => {
        if (q.questionType === 'passage') return sum;
        return sum + (typeof q.points === 'number' ? q.points : (Number(q.points) || 1));
      }, 0);
      await updateItemMetadata(itemId, { totalMarks: newCalculatedTotalMarks });
      setItem(prev => prev ? { ...prev, totalMarks: newCalculatedTotalMarks } : null);
    } catch (err) {
      console.error('Delete question error:', err);
    } finally {
      setIsDeleting(false);
      setQuestionToDelete(null);
    }
  };

  // Calculated total marks strictly derived from question points sum (Passages have 0 points)
  const calculatedTotalMarks = useMemo(() => {
    return questions.reduce((sum, q) => {
      if (q.questionType === 'passage') return sum;
      return sum + (typeof q.points === 'number' ? q.points : (Number(q.points) || 1));
    }, 0);
  }, [questions]);

  // Passing score points in real-time
  const passingScorePoints = useMemo(() => {
    return Math.ceil((calculatedTotalMarks * metaPassingScore) / 100);
  }, [calculatedTotalMarks, metaPassingScore]);

  // Save metadata & pre-start instructions
  const handleSaveMetadata = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!metaTitle.trim() || !item) return;

    setIsSavingMeta(true);
    setMetaSaveSuccess(false);
    try {
      const finalDuration = metaDurationMinutes === '' ? 30 : Math.max(1, Number(metaDurationMinutes));
      const currentCalculatedMarks = questions.reduce((sum, q) => {
        if (q.questionType === 'passage') return sum;
        return sum + (typeof q.points === 'number' ? q.points : (Number(q.points) || 1));
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
      } else {
        setItem(prev => prev ? {
          ...prev,
          title: metaTitle.trim(),
          description: metaDescription.trim(),
          durationMinutes: finalDuration,
          passingScorePercentage: metaPassingScore,
          maxExamAttempts: metaMaxAttempts,
          startDate: metaStartDate || undefined,
          endDate: metaEndDate || undefined,
          isPrerequisiteRequired: metaIsPrerequisite,
          totalMarks: currentCalculatedMarks > 0 ? currentCalculatedMarks : prev.totalMarks,
        } : null);
      }
      setMetaSaveSuccess(true);
      setTimeout(() => setMetaSaveSuccess(false), 4500);
    } catch (err) {
      console.error('Error saving metadata:', err);
      alert('حدث خطأ أثناء حفظ بيانات ومواصفات الاختبار');
    } finally {
      setIsSavingMeta(false);
    }
  };

  // Build draft question for live preview
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
    wordBankBlanks: effectiveWordBankBlanks
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-8 text-center space-y-4" dir="rtl">
        <div className="w-12 h-12 border-4 border-violet-500/20 border-t-violet-600 rounded-full animate-spin" />
        <p className="text-slate-600 dark:text-slate-400 font-bold">جاري تحميل بيئة الأسئلة...</p>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-8 text-center flex flex-col items-center justify-center space-y-4" dir="rtl">
        <p className="text-rose-500 font-black text-xl">العنصر المطلوب غير موجود أو تم حذفه</p>
        <button
          onClick={() => router.push(`/teacher/courses/${courseId}`)}
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
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(`/teacher/courses/${courseId}`)}
              className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors shrink-0"
              title="العودة لإدارة الكورس"
            >
              <ArrowRight className="w-6 h-6 text-slate-600 dark:text-slate-400" />
            </button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800/50">
                  {item.itemType === 'homework' ? 'واجب منزلي' : 'امتحان شامل'}
                </span>
                <span className="text-xs font-bold text-slate-400">
                  إجمالي الأسئلة: {questions.filter(q => q.questionType !== 'passage').length}
                </span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                {item.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'questions' && !isAdding && (
              <button
                id="top-add-question-btn"
                onClick={handleOpenAdd}
                className="flex items-center gap-2 px-5 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl font-black text-sm transition-all shadow-md shadow-violet-500/20"
              >
                <Plus className="w-5 h-5" />
                إضافة سؤال أو قطعة جديدة
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 p-1.5 bg-slate-200/80 dark:bg-slate-800/80 rounded-2xl border border-slate-300 dark:border-slate-700 max-w-2xl">
          <button
            type="button"
            id="tab-settings-btn"
            onClick={() => setActiveTab('settings')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-black text-xs sm:text-sm transition-all ${
              activeTab === 'settings'
                ? 'bg-white dark:bg-slate-900 text-violet-700 dark:text-violet-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>بيانات ومواصفات {item.itemType === 'homework' ? 'الواجب' : 'الامتحان'}</span>
          </button>

          <button
            type="button"
            id="tab-questions-btn"
            onClick={() => setActiveTab('questions')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-black text-xs sm:text-sm transition-all ${
              activeTab === 'questions'
                ? 'bg-white dark:bg-slate-900 text-violet-700 dark:text-violet-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>بنك الأسئلة ({questions.filter(q => q.questionType !== 'passage').length})</span>
          </button>

          <button
            type="button"
            id="tab-preview-btn"
            onClick={() => setActiveTab('preview')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-black text-xs sm:text-sm transition-all ${
              activeTab === 'preview'
                ? 'bg-white dark:bg-slate-900 text-violet-700 dark:text-violet-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>معاينة شاشة الطالب</span>
          </button>
        </div>

        {/* TAB 1: METADATA & PRE-START SETTINGS */}
        {activeTab === 'settings' && (
          <form onSubmit={handleSaveMetadata} className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-violet-600" />
                    مواصفات وبيانات {item.itemType === 'homework' ? 'الواجب' : 'الامتحان'} التي تظهر للطالب قبل البدء
                  </h2>
                  <p className="text-xs text-slate-500 font-bold mt-1">
                    قم بضبط الاسم، التعليمات والإرشادات، المدى الزمني، نسبة النجاح، والمحاولات. الدرجة الكلية تُحسب تلقائياً من درجات الأسئلة.
                  </p>
                </div>

                {metaSaveSuccess && (
                  <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-black">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>تم حفظ المواصفات بنجاح</span>
                  </div>
                )}
              </div>

              {/* Notice: Total Marks auto-calculated */}
              <div className="bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/40 dark:to-indigo-950/30 border border-violet-200 dark:border-violet-800/60 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-violet-900 dark:text-violet-300 font-black text-sm">
                    <Award className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                    <span>الدرجة الكلية المحسوبة تلقائياً:</span>
                  </div>
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    يتم تجميع درجات كل سؤال تضيفه في بنك الأسئلة دون الحاجة لكتابتها يدوياً.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="px-4 py-2 bg-white dark:bg-slate-900 rounded-xl border border-violet-200 dark:border-violet-700/60 text-center">
                    <span className="text-xs font-bold text-slate-400 block">إجمالي الدرجات</span>
                    <span className="text-2xl font-black text-violet-600 dark:text-violet-400">
                      {calculatedTotalMarks} <span className="text-xs">درجة</span>
                    </span>
                  </div>
                  <div className="px-4 py-2 bg-white dark:bg-slate-900 rounded-xl border border-emerald-200 dark:border-emerald-700/60 text-center">
                    <span className="text-xs font-bold text-slate-400 block">درجة النجاح ({metaPassingScore}%)</span>
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

              {/* Description / Pre-start instructions */}
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <span>الوصف والتعليمات والإرشادات (تظهر للطالب قبل البدء):</span>
                </label>
                <textarea
                  rows={4}
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  placeholder="اكتب هنا توجيهاتك ونصائحك للطلاب قبل فتح شاشة الاختبار، مثل: 'ركز جيداً في أسئلة Rewrite، وتأكد من حفظ الإجابات قبل التسليم...'"
                  className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-sm focus:ring-2 focus:ring-violet-500 focus:outline-none leading-relaxed"
                />
              </div>

              {/* Duration Settings (Exam / Homework Timer in Minutes) */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      عداد وقت {item?.itemType === 'homework' ? 'الواجب' : 'الامتحان'} (بالدقائق):
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
                      onChange={(e) => setMetaDurationMinutes(e.target.value === '' ? '' : Math.max(1, Number(e.target.value)))}
                      className="w-36 px-4 py-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white font-black text-base focus:ring-2 focus:ring-indigo-500 focus:outline-none text-center"
                      placeholder="30"
                    />
                    <span className="text-sm font-black text-slate-700 dark:text-slate-300">دقيقة</span>
                  </div>

                  {/* Quick Presets */}
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

                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 leading-relaxed">
                  💡 يبدأ التايمر التنازلي فور بدء الطالب حل {item?.itemType === 'homework' ? 'الواجب' : 'الامتحان'}، وعند وصول العداد إلى (00:00) يتم قفل الأسئلة وتسليم الإجابات تلقائياً وبأمان لمنع أي تلاعب.
                </p>
              </div>

              {/* Passing Score & Max Attempts Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Passing Score % */}
                <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <label className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>نسبة النجاح لتخطي المرحلة والفتح:</span>
                    <span className="text-emerald-600 font-black text-sm">{metaPassingScore}%</span>
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
                  <p className="text-[11px] font-bold text-slate-500">
                    يعادل <span className="text-emerald-600 font-black">{passingScorePoints}</span> من إجمالي <span className="font-black">{calculatedTotalMarks}</span> درجة.
                  </p>
                </div>

                {/* Max Attempts */}
                <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                      عدد محاولات السماح قبل إغلاق الجلسة:
                    </label>
                    <span className="text-violet-600 dark:text-violet-400 font-black text-xs px-2.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950/80 border border-violet-200 dark:border-violet-800">
                      {metaMaxAttempts >= 999 ? 'محاولات غير محدودة (مفتوحة)' : `${metaMaxAttempts} ${metaMaxAttempts === 1 ? 'محاولة واحدة' : metaMaxAttempts === 2 ? 'محاولتان' : 'محاولات'}`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMetaMaxAttempts(Math.max(1, (metaMaxAttempts >= 999 ? 10 : metaMaxAttempts) - 1))}
                      className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-black text-lg flex items-center justify-center transition-all shadow-sm active:scale-95"
                      title="تقليل عدد المحاولات"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={9999}
                      value={metaMaxAttempts}
                      onChange={(e) => setMetaMaxAttempts(Math.max(1, Number(e.target.value) || 1))}
                      className="flex-1 text-center py-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white font-black text-base shadow-sm focus:ring-2 focus:ring-violet-500"
                    />
                    <button
                      type="button"
                      onClick={() => setMetaMaxAttempts((metaMaxAttempts >= 999 ? 0 : metaMaxAttempts) + 1)}
                      className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-black text-lg flex items-center justify-center transition-all shadow-sm active:scale-95"
                      title="زيادة عدد المحاولات"
                    >
                      +
                    </button>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] font-bold text-slate-400">تحديد سريع:</span>
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
                        {preset === 999 ? 'غير محدود (999)' : `${preset} ${preset === 3 ? '(الافتراضي)' : ''}`}
                      </button>
                    ))}
                  </div>

                  <p className="text-[11px] font-bold text-slate-500">
                    💡 الوضع الافتراضي هو 3 محاولات، وللمعلم الحرية الكاملة في كتابة أي رقم يناسبه أو اختياره من القائمة السريعة، وتُسجل دائماً أحدث محاولة للطالب.
                  </p>
                </div>
              </div>

              {/* Availability Dates Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Start Date */}
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

                {/* End Date */}
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
                <label htmlFor="metaPrerequisite" className="text-xs font-black text-slate-800 dark:text-slate-200 cursor-pointer">
                  شرط إجباري: يجب على الطالب اجتياز المحتويات السابقة قبل التمكن من فتح هذا {item.itemType === 'homework' ? 'الواجب' : 'الامتحان'}
                </label>
              </div>

              {/* Save & Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                  <button
                    type="submit"
                    disabled={isSavingMeta}
                    className={`w-full sm:w-auto px-8 py-3.5 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 shadow-lg ${
                      metaSaveSuccess
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/40 ring-4 ring-emerald-500/20 animate-pulse'
                        : isSavingMeta
                        ? 'bg-violet-400 text-white cursor-wait'
                        : 'bg-violet-600 hover:bg-violet-700 text-white shadow-violet-600/30 active:scale-95'
                    }`}
                  >
                    {metaSaveSuccess ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-white" />
                        <span>✓ تم حفظ التعديلات والمحاولات بنجاح!</span>
                      </>
                    ) : isSavingMeta ? (
                      <>
                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                        <span>جاري حفظ التعديلات في قاعدة البيانات...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        <span>حفظ مواصفات وبيانات الاختبار</span>
                      </>
                    )}
                  </button>

                  {metaSaveSuccess && (
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 border-2 border-emerald-500 text-emerald-800 dark:text-emerald-200 text-xs font-black animate-in fade-in zoom-in-95 duration-200 shadow-md">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>تم تحديث قاعدة البيانات بنجاح ({metaMaxAttempts >= 999 ? 'محاولات مفتوحة' : `${metaMaxAttempts} محاولات`})</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setActiveTab('questions')}
                    className="flex-1 sm:flex-initial px-6 py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2"
                  >
                    <Layers className="w-4 h-4" />
                    <span>الذهاب لبنك الأسئلة ({questions.filter(q => q.questionType !== 'passage').length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('preview')}
                    className="flex-1 sm:flex-initial px-6 py-3.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded-2xl font-black text-xs border border-emerald-200 dark:border-emerald-800 transition-all flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4 text-emerald-600" />
                    <span>معاينة شاشة الطالب</span>
                  </button>
                </div>
              </div>

              {/* Floating Bottom Notification on Save */}
              {metaSaveSuccess && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-3.5 bg-emerald-600 text-white rounded-2xl shadow-2xl font-black text-sm border-2 border-emerald-400 animate-in fade-in slide-in-from-bottom-5 duration-300">
                  <CheckCircle2 className="w-6 h-6 text-white shrink-0" />
                  <span>تم حفظ التعديلات ومواصفات الاختبار وعدد المحاولات ({metaMaxAttempts >= 999 ? 'غير محدود' : `${metaMaxAttempts} محاولات`}) بنجاح!</span>
                </div>
              )}
            </div>
          </form>
        )}

        {/* TAB 3: STUDENT PREVIEW TAB */}
        {activeTab === 'preview' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800/50 p-4 rounded-2xl">
              <div className="flex items-center gap-2 text-violet-800 dark:text-violet-300 text-xs font-black">
                <Eye className="w-4 h-4 text-violet-600" />
                <span>معاينة شاشة الطالب الحية: يمكنك فحص شاشة البدء أو اختبار حل الأسئلة التفاعلي كاملاً:</span>
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
                    بيئة الحل التفاعلية ({questions.filter(q => q.questionType !== 'passage').length} سؤال)
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('settings')}
                  className="text-xs font-black text-violet-700 dark:text-violet-300 underline hover:no-underline px-2"
                >
                  تعديل المواصفات ⚙️
                </button>
              </div>
            </div>

            {/* SubTab 1: Interactive Live Solver */}
            {previewSubTab === 'interactive' && (
              <div className="space-y-4">
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs text-emerald-800 dark:text-emerald-300 font-bold">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>أنت الآن في وضع المعاينة الحية والتجربة الفعلية. يظهر أمامك مشغل الاختبارات بنفس الواجهة والمؤقت والتنقل وأدوات الخطوط التي سيراها الطالب.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreviewSubTab('pre_start')}
                    className="px-3 py-1 rounded-lg bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 font-black shrink-0 hover:bg-emerald-50"
                  >
                    عرض شاشة المواصفات
                  </button>
                </div>

                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl bg-white dark:bg-slate-950 min-h-[600px]">
                  <StudentQuizSolver
                    item={{
                      ...item,
                      title: metaTitle || item.title,
                      description: metaDescription || item.description,
                      durationMinutes: metaDurationMinutes === '' ? 30 : Math.max(1, Number(metaDurationMinutes)),
                      passingScorePercentage: metaPassingScore,
                      maxExamAttempts: metaMaxAttempts,
                      totalMarks: calculatedTotalMarks,
                    }}
                    courseId={courseId}
                    unitTitle={item.itemType === 'homework' ? 'واجب دراسي' : 'امتحان شامل'}
                    currentUser={{
                      fullName: 'مستر محمد رضوان (معاينة حية)',
                      phone: '01552191172'
                    }}
                  />
                </div>
              </div>
            )}

            {/* SubTab 2: Student Pre-Start Screen Simulation */}
            {previewSubTab === 'pre_start' && (
              <div className="relative flex flex-col items-center justify-center min-h-[550px] p-6 sm:p-10 text-center space-y-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-4xl mx-auto">
                <div className="flex flex-col items-center gap-3">
                  <div className={`w-20 h-20 rounded-3xl flex items-center justify-center shadow-lg ${
                    item.itemType === 'homework'
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  }`}>
                    {item.itemType === 'homework' ? <CheckSquare className="w-10 h-10" /> : <ShieldCheck className="w-10 h-10" />}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-black border ${
                      item.itemType === 'homework'
                        ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                    }`}>
                      {item.itemType === 'homework' ? '📝 واجب منزلي إلكتروني' : '🛡️ امتحان شامل ومراقب'}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      منصة مستر محمد رضوان
                    </span>
                  </div>
                </div>

                <div className="space-y-2 max-w-2xl">
                  <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white leading-tight">
                    {metaTitle || item.title}
                  </h1>
                  <p className="text-sm sm:text-base font-bold text-slate-500 dark:text-slate-400">
                    بيانات ومواصفات {item.itemType === 'homework' ? 'الواجب' : 'الامتحان'} قبل البدء. يرجى مراجعة التفاصيل أدناه بدقة.
                  </p>
                </div>

                {metaDescription && (
                  <div className="w-full text-right bg-gradient-to-br from-violet-50/90 to-indigo-50/50 dark:from-violet-950/40 dark:to-indigo-950/20 border border-violet-200/80 dark:border-violet-800/60 rounded-3xl p-5 shadow-sm space-y-2">
                    <div className="flex items-center gap-2 text-violet-800 dark:text-violet-300 font-black text-xs">
                      <Info className="w-4 h-4" />
                      <span>إرشادات وتوجيهات المعلم:</span>
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                      {metaDescription}
                    </p>
                  </div>
                )}

                {/* Metadata 6 Grid Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 w-full text-right">
                  <div className="bg-slate-50 dark:bg-slate-800/80 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
                        <Award className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200">
                        مجموع الأسئلة
                      </span>
                    </div>
                    <div>
                      <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                        {calculatedTotalMarks}
                      </span>
                      <span className="text-xs font-bold text-slate-400 mr-1">درجة</span>
                    </div>
                    <p className="text-[11px] font-bold text-slate-500">الدرجة الكلية للاختبار</p>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/80 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200">
                        {passingScorePoints} درجة
                      </span>
                    </div>
                    <div>
                      <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
                        {metaPassingScore}%
                      </span>
                    </div>
                    <p className="text-[11px] font-bold text-slate-500">نسبة النجاح لتخطي المرحلة</p>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/80 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
                        <ListOrdered className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200">
                        كامل البنك
                      </span>
                    </div>
                    <div>
                      <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                        {questions.filter(q => q.questionType !== 'passage').length}
                      </span>
                      <span className="text-xs font-bold text-slate-400 mr-1">سؤال</span>
                    </div>
                    <p className="text-[11px] font-bold text-slate-500">إجمالي أسئلة الاختبار</p>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/80 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
                        <Clock className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-200">
                        مؤقت زمني
                      </span>
                    </div>
                    <div>
                      <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                        {metaDurationMinutes || 30} دقيقة
                      </span>
                    </div>
                    <p className="text-[11px] font-bold text-slate-500">المدة المخصصة للحل</p>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/80 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="p-2 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl">
                        <RotateCcw className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-200">
                        {item.itemType === 'homework' ? 'مرن' : 'محدد'}
                      </span>
                    </div>
                    <div>
                      <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                        {metaMaxAttempts} محاولات
                      </span>
                    </div>
                    <p className="text-[11px] font-bold text-slate-500">عدد المحاولات المتاحة</p>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/80 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="p-2 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-xl">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-200">
                        الصلاحية
                      </span>
                    </div>
                    <div>
                      <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate block">
                        {metaEndDate ? new Date(metaEndDate).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' }) : 'متاح دائماً'}
                      </span>
                    </div>
                    <p className="text-[11px] font-bold text-slate-500">الموعد النهائي للحل</p>
                  </div>
                </div>

                {/* Start Button Simulation */}
                <button
                  type="button"
                  onClick={() => setPreviewSubTab('interactive')}
                  className="w-full max-w-md py-4 sm:py-5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-base sm:text-lg rounded-3xl shadow-xl shadow-emerald-600/25 flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02] cursor-pointer"
                >
                  <Maximize2 className="w-6 h-6" />
                  <span>بدء تجربة الاختبار التفاعلي كاملاً 🚀</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: QUESTIONS LIST & BUILDER */}
        {activeTab === 'questions' && (
          <>
            {/* Existing Questions List */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Layers className="w-5 h-5 text-violet-600" />
                    بنك الأسئلة والقطع المضافة ({questions.filter(q => q.questionType !== 'passage').length})
                  </h2>
                  <p className="text-xs text-slate-500 font-bold mt-0.5">
                    الدرجة الكلية المحسوبة تلقائياً: <span className="text-violet-600 dark:text-violet-400 font-black">{calculatedTotalMarks} درجة</span>.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {questions.map((q, idx) => {
                  const isPassage = q.questionType === 'passage';
                  const isMultiSelect = q.questionType === 'multi_select';
                  const isWordBank = q.questionType === 'word_bank';
                  const parentPassage = q.parentId ? passages.find(p => p.id === q.parentId) : null;
                  const displayIndex = isPassage ? <BookOpen className="w-3.5 h-3.5" /> : questions.slice(0, idx).filter(x => x.questionType !== 'passage').length + 1;
              
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
                        <span className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-black text-xs flex items-center justify-center">
                          {displayIndex}
                        </span>

                        <span className={`text-xs font-black px-2.5 py-1 rounded-xl ${
                          isPassage 
                            ? 'bg-amber-200/80 text-amber-900 dark:bg-amber-900/50 dark:text-amber-300' 
                            : isMultiSelect
                            ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50'
                            : isWordBank
                            ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm'
                            : 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
                        }`}>
                          {q.questionType === 'mcq' && 'اختيار من متعدد (إجابة واحدة)'}
                          {q.questionType === 'multi_select' && 'اختيار متعدد الإجابات (أكثر من إجابة)'}
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
                            <span>0 درجات (نص قراءة فقط - لا يضاف للمجموع الكلي)</span>
                          </span>
                        ) : (
                          <>
                            <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                              {q.gradingType === 'auto' ? 'تصحيح إلكتروني تلقائي' : 'تصحيح يدوي'}
                            </span>

                            <span className="text-xs font-black text-violet-600 dark:text-violet-400 flex items-center gap-1">
                              <Award className="w-3.5 h-3.5" />
                              {q.points} {q.points === 1 ? 'درجة' : 'درجات'}
                            </span>
                          </>
                        )}
                      </div>
                      
                      {parentPassage && (
                        <div className="text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-100/70 dark:bg-amber-950/40 px-3 py-1.5 rounded-xl inline-flex items-center gap-1.5 border border-amber-200 dark:border-amber-800/30">
                          <BookOpen className="w-3.5 h-3.5" /> 
                          مرتبط بقطعة: {parentPassage.questionText.slice(0, 45)}...
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
                                const correctForBlank = q.wordBankBlanks?.find(b => b.correctAnswer === word);
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

                          {/* Quick Interactive Preview Trigger */}
                          <button
                            type="button"
                            onClick={() => setPreviewQuestionModal(q)}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-black border border-indigo-200 dark:border-indigo-800 transition-colors"
                          >
                            <Eye className="w-4 h-4 text-indigo-600" />
                            <span>معاينة وتجربة الحل التفاعلي (سحب وإفلات وقائمة منسدلة)</span>
                          </button>
                        </div>
                      )}

                      {/* Standard MCQ Options */}
                      {!isWordBank && q.options && q.options.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                          {q.options.map(opt => {
                            const isSelectedCorrect = isMultiSelect
                              ? (q.correctAnswerIds?.includes(opt.id) || q.correctAnswerId === opt.id)
                              : (q.correctAnswerId === opt.id);

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
                                    <CheckSquare className={`w-4 h-4 ${isSelectedCorrect ? 'text-emerald-600' : 'text-slate-400'}`} />
                                  ) : (
                                    <CheckCircle className={`w-4 h-4 ${isSelectedCorrect ? 'text-emerald-600' : 'text-slate-400'}`} />
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
                          <span className="text-xs font-black text-blue-700 dark:text-blue-400 block mb-1">نموذج الإجابة:</span>
                          <p className="text-xs font-bold text-blue-900 dark:text-blue-200">{q.idealAnswer}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleOpenEdit(q)}
                        className="p-2.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/50 rounded-xl transition-colors"
                        title="تعديل هذا السؤال"
                      >
                        <Edit3 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => {
                          setQuestionToDelete(q);
                        }}
                        className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-colors"
                        title="حذف هذا السؤال"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {questions.length === 0 && !isAdding && (
              <div className="text-center py-16 text-slate-400 font-bold text-sm bg-slate-50 dark:bg-slate-950/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                لا توجد أسئلة أو قطع مضافة في هذا الامتحان حتى الآن. اضغط &ldquo;إضافة سؤال أو قطعة جديدة&rdquo; للبدء. 🚀
              </div>
            )}
          </div>
        </div>

        {/* Add / Edit Question Form */}
        {isAdding && (
          <div ref={formRef} className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border-2 border-violet-500/40 p-6 md:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-violet-600" />
                {editingQuestionId ? 'تعديل السؤال / القطعة' : 'إضافة سؤال أو قطعة جديدة'}
              </h3>
              <button
                onClick={resetForm}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Type Selection */}
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
                  ].map(type => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => {
                        setQuestionType(type.id as any);
                        if (type.id === 'tf') {
                          setOptions([{ id: 'true_opt', text: 'صح' }, { id: 'false_opt', text: 'خطأ' }]);
                          setCorrectAnswerId('true_opt');
                        } else if (type.id === 'multi_select') {
                          if (options.length === 0) {
                            setOptions([
                              { id: 'opt_1', text: '' },
                              { id: 'opt_2', text: '' },
                              { id: 'opt_3', text: '' },
                              { id: 'opt_4', text: '' }
                            ]);
                          }
                        } else if (type.id === 'word_bank') {
                          if (wordBankWords.length === 0) {
                            setWordBankWords(['protect', 'pollution', 'important', 'danger', 'clean']);
                          }
                          if (!questionText) {
                            setQuestionText('Environmental protection is very [1] for our future. We must work together to reduce air [2] and save our planet.');
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

              {/* Passage Link (if not passage / word_bank) */}
              {questionType !== 'passage' && questionType !== 'word_bank' && passages.length > 0 && (
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2">
                    الربط بقطعة فهم (اختياري - لتظهر القطعة أمام الطالب أثناء حل هذا السؤال)
                  </label>
                  <select
                    value={parentId}
                    onChange={(e) => setParentId(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-violet-500 font-bold text-sm text-slate-800 dark:text-slate-200"
                  >
                    <option value="">-- سؤال مستقل (غير مرتبط بقطعة) --</option>
                    {passages.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.questionText.slice(0, 80)}...
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* WORD BANK SPECIALIZED BUILDER SECTION */}
              {/* ------------------------------------------------------------- */}
              {questionType === 'word_bank' ? (
                <div className="space-y-6 p-6 rounded-3xl bg-indigo-50/40 dark:bg-indigo-950/20 border-2 border-indigo-200 dark:border-indigo-800/60">
                  
                  {/* Step 1: Passage Text with Easy Blank Inserter */}
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="block text-xs font-black text-indigo-950 dark:text-indigo-200">
                        1. نص القطعة مع الفراغات (اكتب القطعة وضع نقاط ........... أو خطوط ___________ أو أقواس أو [1] مكان كل فراغ):
                      </label>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-bold text-slate-500">إدراج فراغ سريع:</span>
                        <button
                          type="button"
                          onClick={() => handleInsertBlankPattern('dots')}
                          className="px-2.5 py-1 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-900 dark:bg-indigo-900/50 dark:text-indigo-200 font-mono text-xs font-bold transition-all shadow-sm"
                          title="إدراج نقاط (............)"
                        >
                          + نقاط (....)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInsertBlankPattern('line')}
                          className="px-2.5 py-1 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-900 dark:bg-indigo-900/50 dark:text-indigo-200 font-mono text-xs font-bold transition-all shadow-sm"
                          title="إدراج خط (___________)"
                        >
                          + خط (____)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInsertBlankPattern('brackets')}
                          className="px-2.5 py-1 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-900 dark:bg-indigo-900/50 dark:text-indigo-200 font-mono text-xs font-bold transition-all shadow-sm"
                          title="إدراج فراغ بأقواس (...)"
                        >
                          + أقواس (...)
                        </button>
                        {[1, 2, 3, 4, 5, 6].map(num => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => handleInsertBlankInText(num)}
                            className="px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-mono text-xs font-bold transition-transform active:scale-95 shadow-sm"
                            title={`إدراج الفراغ رقم [${num}]`}
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
                      placeholder="Type the English passage here. Use dots .......... or lines __________ or [1], [2], [3] for blanks..."
                      showBlankInserters={false}
                    />

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-indigo-700 dark:text-indigo-300 font-bold bg-white/60 dark:bg-slate-900/60 p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                      <span>الفراغات المكتشفة تلقائياً: {detectedBlankIndices.length > 0 ? detectedBlankIndices.map(n => `الفراغ #${n}`).join(' ، ') : 'لا يوجد (اكتب نقاط .... أو اضغط على أزرار الإدراج بالأعلى)'}</span>
                      <span>إجمالي الفراغات: {detectedBlankIndices.length}</span>
                    </div>
                  </div>

                  {/* Step 2: Word Bank Management */}
                  <div className="space-y-3 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-black text-indigo-950 dark:text-indigo-200">
                        2. كلمات صندوق الكلمات (Word Bank) - تشمل الإجابات الصحيحة وكلمات للتشتيت:
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowBulkAdd(!showBulkAdd)}
                        className="text-xs font-black text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        {showBulkAdd ? 'إغلاق الإضافة الجماعية' : 'لصق كلمات متعددة دفعة واحدة'}
                      </button>
                    </div>

                    {/* Bulk Add Input */}
                    {showBulkAdd && (
                      <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-dashed border-indigo-300 space-y-2">
                        <textarea
                          dir="ltr"
                          value={bulkWordsInput}
                          onChange={(e) => setBulkWordsInput(e.target.value)}
                          placeholder="Type or paste English words separated by spaces or commas (e.g. protect pollution important danger clean)"
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

                    {/* Single Word Adder */}
                    <div className="flex items-center gap-2">
                      <input
                        dir="ltr"
                        type="text"
                        value={newWordInput}
                        onChange={(e) => setNewWordInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddWordBankWord())}
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

                    {/* Words Chips List */}
                    <div className="flex flex-wrap gap-2 pt-2" dir="ltr">
                      {wordBankWords.map((word, wIdx) => {
                        const assignedToBlank = wordBankBlanks.find(b => b.correctAnswer === word);
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
                              title="Delete word from bank"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                      {wordBankWords.length === 0 && (
                        <p className="text-xs text-rose-500 font-bold" dir="rtl">
                          لم تتم إضافة كلمات بعد. أضف الكلمات بالأعلى لتظهر في صندوق الكلمات أمام الطالب.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Step 3: Map Each Blank to Correct Answer */}
                  {detectedBlankIndices.length > 0 && (
                    <div className="space-y-3 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-black text-indigo-950 dark:text-indigo-200">
                          3. نموذج الإجابة الإلكتروني الإجباري (حدد الكلمة الصحيحة لكل فراغ من الفراغات المكتشفة):
                        </label>
                        <span className="text-[11px] font-bold text-slate-500">
                          {effectiveWordBankBlanks.filter(b => b.correctAnswer).length} من {detectedBlankIndices.length} فراغات محددة
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {detectedBlankIndices.map(blankNum => {
                          const currentBlankConfig = wordBankBlanks.find(b => b.blankIndex === blankNum);
                          const chosenWord = currentBlankConfig?.correctAnswer || '';

                          return (
                            <div
                              key={blankNum}
                              className={`p-3.5 rounded-2xl border transition-all space-y-2 ${
                                chosenWord 
                                  ? 'bg-emerald-50/40 border-emerald-300 dark:bg-emerald-950/20 dark:border-emerald-800/50' 
                                  : 'bg-rose-50/30 border-rose-300 dark:bg-rose-950/20 dark:border-rose-800/50'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 font-sans">
                                  Blank #{blankNum} (الفراغ {blankNum})
                                </span>
                                {chosenWord ? (
                                  <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded-md font-black">✓ محدد</span>
                                ) : (
                                  <span className="text-[10px] bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 px-2 py-0.5 rounded-md font-black">مطلوب تحديد إجابة</span>
                                )}
                              </div>

                              <select
                                dir="ltr"
                                value={chosenWord}
                                onChange={(e) => handleBlankAnswerChange(blankNum, e.target.value)}
                                className={`w-full px-3 py-2 rounded-xl text-xs font-bold font-sans border-2 transition-all outline-none ${
                                  chosenWord
                                    ? 'bg-white dark:bg-slate-900 border-emerald-400 text-emerald-950 dark:text-emerald-200'
                                    : 'bg-white dark:bg-slate-900 border-rose-300 text-slate-500'
                                }`}
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

                  {/* Step 4: Live Interactive Preview Inside Form */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setShowFormLivePreview(!showFormLivePreview)}
                        className="flex items-center gap-2 text-xs font-black text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        <Eye className="w-4 h-4" />
                        <span>{showFormLivePreview ? 'إخفاء المعاينة الحية' : 'إظهار المعاينة الحية والتجربة'}</span>
                      </button>
                      <span className="text-[11px] text-slate-500 font-bold">
                        معاينة تفاعلية فورية كما ستظهر أمام الطالب
                      </span>
                    </div>

                    {showFormLivePreview && (
                      <div className="pt-1">
                        <WordBankSolver
                          question={draftQuestionForPreview}
                          mode="preview"
                        />
                      </div>
                    )}
                  </div>

                </div>
              ) : (
                /* Standard Question Text for other types */
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2">
                    {questionType === 'passage' ? 'نص قطعة الفهم (Passage)' : 'نص السؤال (English Question Text)'}
                  </label>
                  <QuestionRichEditor
                    value={questionText}
                    onChange={(val) => setQuestionText(val)}
                    dir="ltr"
                    minHeight={questionType === 'passage' ? '240px' : '130px'}
                    placeholder={
                      questionType === 'passage'
                        ? 'Write the reading passage here in English (e.g. underline key words, bold headings, format text)...'
                        : 'Write the English question here (you can select text to bold, italicize, underline, color, or change font)...'
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
                        title="تحديد كإجابة صحيحة"
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
                        title="حذف هذا الخيار"
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

              {/* Options for Multi-Select MCQ */}
              {questionType === 'multi_select' && (
                <div className="space-y-3 p-5 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl border border-indigo-200 dark:border-indigo-800/50">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black text-indigo-950 dark:text-indigo-200">
                      الخيارات والإجابات الصحيحة (حدد مربعات الاختيار بجوار جميع الإجابات الصحيحة)
                    </label>
                    <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800">
                      تم تحديد ({correctAnswerIds.length}) إجابات صحيحة
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
                          className="w-5 h-5 text-indigo-600 rounded-md focus:ring-indigo-500 cursor-pointer shrink-0"
                          title="تحديد أو إلغاء كإجابة صحيحة"
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
                          title="حذف هذا الخيار"
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
                  <label className={`flex items-center gap-3 cursor-pointer p-4 rounded-xl border transition-all ${correctAnswerId === 'true_opt' ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
                    <input
                      type="radio"
                      name="tf_answer"
                      checked={correctAnswerId === 'true_opt'}
                      onChange={() => setCorrectAnswerId('true_opt')}
                      className="w-5 h-5 text-emerald-600"
                    />
                    <span className="font-black text-sm text-slate-800 dark:text-slate-200">الإجابة الصحيحة: صح (True)</span>
                  </label>
                  <label className={`flex items-center gap-3 cursor-pointer p-4 rounded-xl border transition-all ${correctAnswerId === 'false_opt' ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-500' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
                    <input
                      type="radio"
                      name="tf_answer"
                      checked={correctAnswerId === 'false_opt'}
                      onChange={() => setCorrectAnswerId('false_opt')}
                      className="w-5 h-5 text-rose-600"
                    />
                    <span className="font-black text-sm text-slate-800 dark:text-slate-200">الإجابة الصحيحة: خطأ (False)</span>
                  </label>
                </div>
              )}

              {/* Grading Settings (For non-passage) */}
              {questionType === 'passage' ? (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-2xl flex items-start gap-3 text-amber-900 dark:text-amber-300">
                  <BookOpen className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
                  <div className="text-xs font-bold leading-relaxed">
                    <p className="font-black text-sm text-amber-800 dark:text-amber-200">قطعة الفهم (Reading Passage) - للقراءة فقط:</p>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                      نص القطعة مخصص للقراءة فقط وتُحسب عليه <span className="font-black text-amber-700 dark:text-amber-300">0 درجة</span> ولا يُحسب من المجموع الكلي للاختبار.
                      بعد حفظ القطعة، يمكنك إنشاء أسئلة (اختر، صح وخطأ، كتابي، إلخ) وربطها بهذه القطعة عبر حقل &quot;ربط هذا السؤال بقطعة فهم&quot; لتحديد درجاتها بدقة.
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
                          يدوي (بواسطة المعلم/المساعد)
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
                      {questionType === 'word_bank' ? 'الدرجة الكلية لسؤال صندوق الكلمات' : 'الدرجة المخصصة للسؤال'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={questionType === 'word_bank' ? (wordBankBlanks.length || points) : points}
                      onChange={(e) => setPoints(Number(e.target.value) || 1)}
                      className="w-full px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-violet-500 font-black text-sm text-slate-900 dark:text-white"
                    />
                    {questionType === 'word_bank' && (
                      <p className="text-[11px] text-slate-500 font-bold">
                        * درجة لكل فراغ صحيح في القطعة (إجمالي {detectedBlankIndices.length} درجات).
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Hint for Student */}
              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                  <span className="text-amber-500">💡</span>
                  <span>تلميح السؤال (اختياري - يظهر للطالب كزر مساعدة أثناء حل السؤال):</span>
                </label>
                <input
                  type="text"
                  value={hint}
                  onChange={(e) => setHint(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-amber-500 font-bold text-sm text-slate-900 dark:text-white"
                  placeholder="مثال: تذكر استخدام زمن الماضي البسيط بعد أداة الربط..."
                />
              </div>

              {/* Explanation / Notes */}
              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2">
                  شرح وتوضيح السؤال للطلاب (يظهر بعد إنهاء الحل):
                </label>
                <textarea
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-violet-500 font-bold text-sm text-slate-900 dark:text-white resize-y"
                  placeholder="اكتب ملاحظات توضيحية أو قاعدة الجرامر/المفردات الخاصة بهذا السؤال..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleSaveQuestion}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl font-black text-sm transition-all shadow-md shadow-violet-500/20"
                >
                  <Save className="w-5 h-5" />
                  {editingQuestionId ? 'حفظ التعديلات على السؤال' : 'حفظ وإضافة السؤال'}
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

  {/* Floating Add Button on Questions Tab */}
  {activeTab === 'questions' && !isAdding && (
    <aside 
      aria-label="إضافة سؤال أو قطعة"
      className="fixed bottom-6 left-6 z-40"
    >
      <button
        type="button"
        id="floating-add-question-btn"
        onClick={handleOpenAdd}
        className="group flex items-center gap-3 px-5 py-3.5 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-black text-sm rounded-full shadow-2xl shadow-violet-600/50 hover:shadow-violet-600/70 hover:scale-105 active:scale-95 transition-all duration-300 border-2 border-white/20 backdrop-blur-md cursor-pointer"
        title="إضافة سؤال أو قطعة جديدة"
      >
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:rotate-90 transition-transform duration-300">
          <Plus className="w-5 h-5 text-white" />
        </div>
        <span className="font-black text-sm tracking-wide">
          إضافة سؤال أو قطعة
        </span>
      </button>
    </aside>
  )}

  {/* Interactive Question Preview Modal */}
  {previewQuestionModal && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn" dir="rtl">
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
              <p className="text-xs text-slate-500 font-bold">
                تجربة السؤال كما يظهر أمام الطالب مع فحص الإجابات وتبديل طرق الحل
              </p>
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
          <WordBankSolver
            question={previewQuestionModal}
            mode="preview"
          />
        ) : (
          <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="text-base font-bold text-slate-900 dark:text-white leading-relaxed">
              <QuestionRichRenderer html={previewQuestionModal.questionText} />
            </div>
            {previewQuestionModal.options && (
              <div className="space-y-2">
                {previewQuestionModal.options.map((opt) => (
                  <div key={opt.id} className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold flex items-center justify-between">
                    <div>
                      <QuestionRichRenderer html={opt.text} />
                    </div>
                    {opt.id === previewQuestionModal.correctAnswerId && (
                      <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-black">
                        الإجابة الصحيحة ✓
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
            {previewQuestionModal.explanation && (
              <div className="mt-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200">
                <span className="font-black block mb-1">💡 تفسير وشرح الإجابة:</span>
                <QuestionRichRenderer html={previewQuestionModal.explanation} />
              </div>
            )}
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

  {/* Large Delete Confirmation Modal for Questions */}
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
    warningNote={
      questionToDelete?.questionType === 'passage'
        ? 'تنبيه: حذف هذه القطعة سيؤدي إلى فك ارتباط جميع الأسئلة التابعة لها.'
        : 'سيتم حذف هذا السؤال ودرجاته ونموذج إجابته نهائياً.'
    }
    isLoading={isDeleting}
  />
</div>
  );
}
