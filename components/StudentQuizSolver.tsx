'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTheme } from '@/context/ThemeContext';
import {
  QuestionData,
  UnitItemData,
  fetchQuestionsByItem,
  fetchSecuredStudentQuestions,
  submitStudentExamAnswers,
  verifyHomeworkQuestionAnswer,
  StudentItemProgressData
} from '@/lib/academicService';
import WordBankSolver from '@/components/WordBankSolver';
import QuestionRichRenderer from '@/components/QuestionRichRenderer';
import {
  CheckCircle,
  CheckCircle2,
  CheckSquare,
  XCircle,
  Award,
  AlertCircle,
  AlertTriangle,
  HelpCircle,
  RotateCcw,
  BookOpen,
  Send,
  Flag,
  ArrowRight,
  ArrowLeft,
  Check,
  X,
  FileCheck,
  Clock,
  Sparkles,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Sun,
  Moon,
  Highlighter,
  Underline as UnderlineIcon,
  Eraser,
  Lightbulb,
  ShieldCheck,
  ShieldAlert,
  ListOrdered,
  Eye,
  Lock,
  Crown
} from 'lucide-react';
import HonorCertificate from '@/components/HonorCertificate';

interface StudentQuizSolverProps {
  item: UnitItemData;
  courseId: string;
  courseData?: any;
  unitTitle?: string;
  studentProgress?: StudentItemProgressData;
  currentUser?: { id?: string; fullName?: string; phone?: string };
  onComplete?: (score: number, passed: boolean) => void;
  onSecurityViolation?: () => void;
}

export default function StudentQuizSolver({
  item,
  courseId,
  courseData,
  unitTitle,
  studentProgress,
  currentUser,
  onComplete,
  onSecurityViolation
}: StudentQuizSolverProps) {
  const { theme, toggleTheme } = useTheme();
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [loading, setLoading] = useState(true);

  // Mode: 'homework' (immediate evaluation per question, strict lockout) vs 'exam' (evaluation at end)
  const isHomework = item.itemType === 'homework';

  // Security & Anti-cheat states
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [violationCount, setViolationCount] = useState(0);
  const [showViolationModal, setShowViolationModal] = useState(false);
  const [isSecurityTerminated, setIsSecurityTerminated] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Assessment Start & Timer
  const [hasStarted, setHasStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const [mcqAnswers, setMcqAnswers] = useState<Record<string, string>>({});
  const [multiSelectAnswers, setMultiSelectAnswers] = useState<Record<string, string[]>>({});
  const [wordBankAnswers, setWordBankAnswers] = useState<Record<string, Record<number, string>>>({});
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>({});

  // Homework mode: Evaluated & locked questions
  const [evaluatedQuestions, setEvaluatedQuestions] = useState<Record<string, {
    isCorrect: boolean;
    isPartial?: boolean;
    correctCount?: number;
    totalCount?: number;
    earnedPoints: number;
    chosenAnswer: any;
    explanation?: string;
  }>>({});

  // Review & Flagging
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<string, boolean>>({});

  // Teacher Hints revealed per question
  const [revealedHints, setRevealedHints] = useState<Record<string, boolean>>({});

  // Font Scaling (0: 85%, 1: 100%, 2: 115%, 3: 130%, 4: 150%)
  const [fontZoomLevel, setFontZoomLevel] = useState<number>(1);
  const zoomLabels = ['85%', '100%', '115%', '130%', '150%'];

  // Text Annotations: highlight & underline words per question
  const [annotationTool, setAnnotationTool] = useState<'none' | 'yellow' | 'green' | 'underline'>('none');
  const [highlightedWords, setHighlightedWords] = useState<Record<string, Record<string, 'yellow' | 'green' | 'underline'>>>({});

  // Pre-submission summary modal
  const [showPreSubmitModal, setShowPreSubmitModal] = useState(false);

  // Active question filter: 'all' | 'flagged' | 'unanswered'
  const [questionFilter, setQuestionFilter] = useState<'all' | 'flagged' | 'unanswered'>('all');

  // Active question pagination or full list
  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'step_by_step' | 'full_list'>('step_by_step');

  // Submission & Results
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [resultActiveTab, setResultActiveTab] = useState<'score_certificate' | 'answers_review'>('score_certificate');
  const [results, setResults] = useState<{
    totalPoints: number;
    earnedPoints: number;
    percentage: number;
    passed: boolean;
    questionResults: Record<string, {
      earned: number;
      max: number;
      isCorrect: boolean;
      correctAnswerId?: string;
      correctAnswerIds?: string[];
      idealAnswer?: string;
      explanation?: string;
    }>;
  } | null>(null);

  const assessmentDurationMinutes = (item.durationMinutes && item.durationMinutes > 0)
    ? Number(item.durationMinutes)
    : 30;

  useEffect(() => {
    setTimeLeft(assessmentDurationMinutes * 60);
  }, [assessmentDurationMinutes]);

  useEffect(() => {
    if (!hasStarted || isSubmitted || isSecurityTerminated) return;
    if (timeLeft === null) return;
    if (timeLeft <= 0) {
      if (!isSubmitted) {
        handleSubmit();
      }
      return;
    }
    const timerId = setInterval(() => {
      setTimeLeft((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearInterval(timerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasStarted, isSubmitted, isSecurityTerminated, timeLeft]);

  const formatTimeLeft = (seconds: number | null) => {
    if (seconds === null) return null;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Check attempt limits: Default strictly to 3 attempts, customizable and strictly enforced
  const maxAttempts = item.maxExamAttempts !== undefined && item.maxExamAttempts !== null && !isNaN(Number(item.maxExamAttempts))
    ? Math.max(1, Number(item.maxExamAttempts))
    : 3;
  const currentAttempts = studentProgress?.attemptsCount || 0;
  const hasPassed = !!studentProgress?.isPassed;
  // Lock out only when all allowed attempts are exhausted
  const hasExhaustedAttempts = currentAttempts >= maxAttempts;
  const isLockedOut = hasExhaustedAttempts;

  // Load questions using secured student endpoint (answers completely stripped server-side)
  useEffect(() => {
    let isMounted = true;
    async function loadQuestions() {
      setLoading(true);
      try {
        const loaded = await fetchSecuredStudentQuestions(item.id);
        if (isMounted) {
          setQuestions(loaded);
        }
      } catch (err) {
        console.error('Failed to load secured questions for item:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadQuestions();
    return () => {
      isMounted = false;
    };
  }, [item.id]);

  // Security Violation Handler
  const triggerSecurityViolation = React.useCallback((reason: string) => {
    if (isSubmitted || isSecurityTerminated) return;

    setViolationCount((prev) => {
      const nextCount = prev + 1;
      if (nextCount === 1) {
        // First violation: Warning modal
        setShowViolationModal(true);
      } else if (nextCount >= 2) {
        // Second violation: Terminate & Deduct Attempt
        setIsSecurityTerminated(true);
        setShowViolationModal(false);
        if (onSecurityViolation) {
          onSecurityViolation();
        }
        if (onComplete) {
          // Record 0% fail and deduct attempt
          onComplete(0, false);
        }
      }
      return nextCount;
    });
  }, [isSubmitted, isSecurityTerminated, onSecurityViolation, onComplete]);

  // Anti-Cheat & Strict Security Event Listeners (Active during test, before submission)
  useEffect(() => {
    if (isSubmitted || isSecurityTerminated || loading || isLockedOut) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerSecurityViolation('تم رصد تصغير المتصفح أو الانتقال لعلامة تبويب أخرى');
      }
    };

    const handleWindowBlur = () => {
      // Blur indicates clicking outside or opening another window/app
      triggerSecurityViolation('تم رصد الخروج من إطار الاختبار أو تشغيل برنامج خارجي');
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleCopyCut = (e: ClipboardEvent) => {
      e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent F12, DevTools, Ctrl+C, Ctrl+V, Ctrl+U, Alt+Tab hints
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
        (e.ctrlKey && (e.key === 'u' || e.key === 'U' || e.key === 'c' || e.key === 'C' || e.key === 'p' || e.key === 'P'))
      ) {
        e.preventDefault();
      }
    };

    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopyCut);
    document.addEventListener('cut', handleCopyCut);
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopyCut);
      document.removeEventListener('cut', handleCopyCut);
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isSubmitted, isSecurityTerminated, loading, isLockedOut, triggerSecurityViolation]);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await containerRef.current?.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.warn('Fullscreen toggle error:', err);
    }
  };

  const handleStartAssessment = async () => {
    setHasStarted(true);
    try {
      if (!document.fullscreenElement && containerRef.current) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch (err) {
      console.warn('Fullscreen request failed:', err);
    }
  };

  const passages = questions.filter((q) => q.questionType === 'passage');
  const solvableQuestions = questions.filter((q) => q.questionType !== 'passage');

  // Filtered questions list
  const displayQuestions = useMemo(() => {
    return solvableQuestions.filter((q) => {
      if (questionFilter === 'flagged') return flaggedQuestions[q.id];
      if (questionFilter === 'unanswered') {
        if (q.questionType === 'mcq' || q.questionType === 'tf') return !mcqAnswers[q.id];
        if (q.questionType === 'multi_select') return !multiSelectAnswers[q.id]?.length;
        if (q.questionType === 'word_bank') return !Object.keys(wordBankAnswers[q.id] || {}).length;
        return !textAnswers[q.id]?.trim();
      }
      return true;
    });
  }, [solvableQuestions, questionFilter, flaggedQuestions, mcqAnswers, multiSelectAnswers, wordBankAnswers, textAnswers]);

  // Answer status checks
  const isQuestionAnswered = (q: QuestionData) => {
    if (q.questionType === 'mcq' || q.questionType === 'tf') return Boolean(mcqAnswers[q.id]);
    if (q.questionType === 'multi_select') return Boolean(multiSelectAnswers[q.id]?.length);
    if (q.questionType === 'word_bank') return Object.keys(wordBankAnswers[q.id] || {}).length > 0;
    return Boolean(textAnswers[q.id]?.trim());
  };

  const answeredCount = solvableQuestions.filter(isQuestionAnswered).length;
  const unansweredCount = solvableQuestions.length - answeredCount;
  const flaggedCount = solvableQuestions.filter((q) => flaggedQuestions[q.id]).length;

  // Single Question Evaluator for Homework (Using Secure Server Action)
  const evaluateHomeworkQuestion = async (q: QuestionData, answerOverride?: any) => {
    if (evaluatedQuestions[q.id]) return; // Already locked

    const maxPts = q.points || 1;
    const chosen = answerOverride !== undefined ? answerOverride : (
      q.questionType === 'mcq' || q.questionType === 'tf' ? mcqAnswers[q.id] :
      q.questionType === 'multi_select' ? multiSelectAnswers[q.id] :
      q.questionType === 'word_bank' ? wordBankAnswers[q.id] :
      textAnswers[q.id]
    );

    try {
      const res = await verifyHomeworkQuestionAnswer({
        itemId: item.id,
        questionId: q.id,
        chosenAnswer: chosen,
      });

      if (res && res.success) {
        setEvaluatedQuestions((prev) => ({
          ...prev,
          [q.id]: {
            isCorrect: res.isCorrect,
            isPartial: Boolean(res.isPartial),
            correctCount: res.isCorrect ? 1 : 0,
            totalCount: 1,
            earnedPoints: res.earnedPoints !== undefined ? res.earnedPoints : (res.isCorrect ? maxPts : 0),
            explanation: res.explanation,
            chosenAnswer: chosen,
          }
        }));
        return;
      }
    } catch (err) {
      console.error('Homework verification server error, falling back locally:', err);
    }

    // Local fallback if server call is unavailable
    const isCorrect = q.correctAnswerId ? (chosen === q.correctAnswerId) : false;
    setEvaluatedQuestions((prev) => ({
      ...prev,
      [q.id]: {
        isCorrect,
        isPartial: false,
        correctCount: isCorrect ? 1 : 0,
        totalCount: 1,
        earnedPoints: isCorrect ? maxPts : 0,
        chosenAnswer: chosen,
      }
    }));
  };

  // Handle Answers with Strict Homework Lockout
  const handleSelectMCQ = (questionId: string, optionId: string) => {
    if (isSubmitted || isSecurityTerminated) return;
    if (isHomework && evaluatedQuestions[questionId]) return; // Strict Lockout

    setMcqAnswers((prev) => ({ ...prev, [questionId]: optionId }));

    // In homework: evaluate immediately upon choice, locking the answer
    if (isHomework) {
      const q = solvableQuestions.find((item) => item.id === questionId);
      if (q) {
        evaluateHomeworkQuestion(q, optionId);
      }
    }
  };

  const handleToggleMultiSelect = (questionId: string, optionId: string) => {
    if (isSubmitted || isSecurityTerminated) return;
    if (isHomework && evaluatedQuestions[questionId]) return;

    setMultiSelectAnswers((prev) => {
      const current = prev[questionId] || [];
      const updated = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];
      return { ...prev, [questionId]: updated };
    });
  };

  const handleWordBankAnswersChange = (questionId: string, answers: Record<number, string>) => {
    if (isSubmitted || isSecurityTerminated) return;
    if (isHomework && evaluatedQuestions[questionId]) return;
    setWordBankAnswers((prev) => ({ ...prev, [questionId]: answers }));
  };

  const handleTextAnswerChange = (questionId: string, value: string) => {
    if (isSubmitted || isSecurityTerminated) return;
    if (isHomework && evaluatedQuestions[questionId]) return;
    setTextAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  // Toggle review flag
  const handleToggleFlag = (questionId: string) => {
    setFlaggedQuestions((prev) => ({ ...prev, [questionId]: !prev[questionId] }));
  };

  // Toggle Hint
  const handleToggleHint = (questionId: string) => {
    setRevealedHints((prev) => ({ ...prev, [questionId]: !prev[questionId] }));
  };

  // Toggle Word Annotation (Highlighter / Underline)
  const handleWordClick = (questionId: string, wordKey: string) => {
    if (annotationTool === 'none') return;
    setHighlightedWords((prev) => {
      const qMap = { ...(prev[questionId] || {}) };
      if (qMap[wordKey] === annotationTool) {
        delete qMap[wordKey];
      } else {
        qMap[wordKey] = annotationTool;
      }
      return { ...prev, [questionId]: qMap };
    });
  };

  const handleClearAnnotations = (questionId: string) => {
    setHighlightedWords((prev) => {
      const copy = { ...prev };
      delete copy[questionId];
      return copy;
    });
  };

  // Helper to render interactive annotated rich text
  const renderAnnotatedText = (questionId: string, text: string, className: string = '') => {
    const qAnnotations = highlightedWords[questionId] || {};
    return (
      <QuestionRichRenderer
        content={text}
        className={className}
        onWordClick={(key) => handleWordClick(questionId, key)}
        annotations={qAnnotations}
        annotationTool={annotationTool}
      />
    );
  };

  // Submit and Calculate Score via Authoritative Secured Server Engine
  const handleSubmit = async () => {
    if (solvableQuestions.length === 0 || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const studentId = currentUser?.id || 'demo_student';
      const serverResult = await submitStudentExamAnswers({
        itemId: item.id,
        studentId,
        courseId,
        answers: {
          mcqAnswers,
          multiSelectAnswers,
          wordBankAnswers,
          textAnswers,
        },
        timeSpentSeconds: Math.max(0, (assessmentDurationMinutes * 60) - (timeLeft || 0)),
        isSecurityTerminated,
      });

      if (serverResult && serverResult.success) {
        const res = {
          totalPoints: serverResult.totalPoints,
          earnedPoints: serverResult.earnedPoints,
          percentage: serverResult.percentage,
          passed: serverResult.isPassed,
          questionResults: serverResult.questionResults as any,
        };

        setResults(res);
        setIsSubmitted(true);
        setShowPreSubmitModal(false);
        if (onComplete) {
          onComplete(res.percentage, res.passed);
        }
        return;
      }
    } catch (err) {
      console.error('Submit exam to server failed, falling back to local calculation:', err);
    } finally {
      setIsSubmitting(false);
    }

    // Fallback if offline / server action fails
    let totalPoints = 0;
    let earnedPoints = 0;
    const qResults: Record<string, any> = {};

    solvableQuestions.forEach((q) => {
      const maxPts = q.points || 1;
      totalPoints += maxPts;

      if (isHomework && evaluatedQuestions[q.id]) {
        // Use the locked homework score
        const ev = evaluatedQuestions[q.id];
        earnedPoints += ev.earnedPoints;
        qResults[q.id] = { earned: ev.earnedPoints, max: maxPts, isCorrect: ev.isCorrect };
        return;
      }

      if (q.questionType === 'mcq' || q.questionType === 'tf') {
        const chosen = mcqAnswers[q.id];
        const isCorrect = Boolean(q.correctAnswerId && chosen === q.correctAnswerId);
        const earned = isCorrect ? maxPts : 0;
        earnedPoints += earned;
        qResults[q.id] = { earned, max: maxPts, isCorrect };
      } else if (q.questionType === 'multi_select') {
        const chosen = (multiSelectAnswers[q.id] || []).slice().sort();
        const expected = (q.correctAnswerIds || (q.correctAnswerId ? [q.correctAnswerId] : [])).slice().sort();
        const isExactMatch =
          chosen.length === expected.length &&
          chosen.every((val, idx) => val === expected[idx]);
        const earned = isExactMatch ? maxPts : 0;
        earnedPoints += earned;
        qResults[q.id] = { earned, max: maxPts, isCorrect: isExactMatch };
      } else if (q.questionType === 'word_bank') {
        qResults[q.id] = { earned: 0, max: maxPts, isCorrect: false };
      } else {
        const ans = (textAnswers[q.id] || '').trim().toLowerCase();
        const ideal = (q.idealAnswer || '').trim().toLowerCase();
        const isMatch = Boolean(ideal && ans === ideal);
        const earned = isMatch ? maxPts : 0;
        earnedPoints += earned;
        qResults[q.id] = { earned, max: maxPts, isCorrect: isMatch };
      }
    });

    earnedPoints = parseFloat(earnedPoints.toFixed(2));
    const percentage = Math.min(100, Math.round((earnedPoints / (totalPoints || 1)) * 100));
    const passingRequired = item.passingScorePercentage || 60;
    const passed = percentage >= passingRequired;

    const res = {
      totalPoints,
      earnedPoints,
      percentage,
      passed,
      questionResults: qResults
    };

    setResults(res);
    setIsSubmitted(true);
    setShowPreSubmitModal(false);
    if (onComplete) {
      onComplete(percentage, passed);
    }
  };

  const handleRetake = () => {
    if (isLockedOut) return;
    setIsSubmitted(false);
    setResults(null);
    setMcqAnswers({});
    setMultiSelectAnswers({});
    setWordBankAnswers({});
    setTextAnswers({});
    setEvaluatedQuestions({});
    setFlaggedQuestions({});
    setRevealedHints({});
    setViolationCount(0);
    setIsSecurityTerminated(false);
    setActiveQuestionIndex(0);
  };

  // Font Size Classes
  const getQuestionFontSizeClass = () => {
    switch (fontZoomLevel) {
      case 0: return 'text-sm sm:text-base';
      case 1: return 'text-base sm:text-lg';
      case 2: return 'text-lg sm:text-xl';
      case 3: return 'text-xl sm:text-2xl';
      case 4: return 'text-2xl sm:text-3xl';
      default: return 'text-base sm:text-lg';
    }
  };

  const getOptionFontSizeClass = () => {
    switch (fontZoomLevel) {
      case 0: return 'text-xs sm:text-sm';
      case 1: return 'text-sm sm:text-base';
      case 2: return 'text-base sm:text-lg';
      case 3: return 'text-lg sm:text-xl';
      case 4: return 'text-xl sm:text-2xl';
      default: return 'text-sm sm:text-base';
    }
  };

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-[420px] p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center space-y-4 shadow-sm" dir="rtl">
        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin" />
        <div className="space-y-1">
          <p className="font-black text-base text-slate-800 dark:text-slate-200">
            جاري تهيئة البيئة الآمنة {isHomework ? 'للواجب' : 'للاختبار'}...
          </p>
          <p className="text-xs text-slate-500 font-bold">يتم فحص خوارزميات التشفير وبنك الأسئلة</p>
        </div>
      </div>
    );
  }

  // Locked Out Screen (Passed or Exhausted Attempts)
  if (isLockedOut) {
    const itemTypeName = isHomework ? 'الواجب' : 'الاختبار';
    const displayScore = studentProgress?.lastScore ?? studentProgress?.highestScore;
    return (
      <div className={`p-8 sm:p-12 rounded-3xl bg-white dark:bg-slate-900 border text-center space-y-6 shadow-xl ${hasPassed ? 'border-emerald-300 dark:border-emerald-900/50' : 'border-rose-300 dark:border-rose-900/50'}`} dir="rtl">
        <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto border ${hasPassed ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'}`}>
          {hasPassed ? <Award className="w-10 h-10" /> : <Lock className="w-10 h-10" />}
        </div>
        <div className="space-y-2 max-w-md mx-auto">
          <h3 className="text-2xl font-black text-slate-900 dark:text-white">
            {hasPassed ? `لقد اجتزت هذا ${itemTypeName} بنجاح 🏆` : `استنفدت محاولات هذا ${itemTypeName} 🔒`}
          </h3>
          <p className="text-sm font-bold text-slate-600 dark:text-slate-400 leading-relaxed">
            {hasPassed 
              ? `تهانينا! لقد حققت درجة النجاح المطلوبة في هذا ${itemTypeName} وتم إغلاقه واعتماد نتيجتك بنجاح.`
              : `لقد استنفدت ${currentAttempts} من إجمالي ${maxAttempts} محاولات مسموحة لهذا ${itemTypeName}. لا يمكن الإعادة إلا بمنح محاولة إضافية من قبل المعلم.`}
          </p>
          {displayScore !== undefined && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-black">
              الدرجة المعتمدة (آخر محاولة): <span className={`text-sm ${hasPassed ? 'text-emerald-600' : 'text-rose-600'}`}>{displayScore}%</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Security Termination Screen (SwiftAssess lockdown)
  if (isSecurityTerminated) {
    return (
      <div className="p-8 sm:p-12 rounded-3xl bg-rose-950/20 border-2 border-rose-600 text-center space-y-6 shadow-2xl backdrop-blur-md" dir="rtl">
        <div className="w-24 h-24 rounded-3xl bg-rose-600/20 text-rose-500 flex items-center justify-center mx-auto border-2 border-rose-500 animate-pulse">
          <ShieldAlert className="w-12 h-12" />
        </div>
        <div className="space-y-3 max-w-lg mx-auto">
          <span className="px-4 py-1.5 rounded-full text-xs font-black bg-rose-600 text-white uppercase tracking-wider">
            🚨 تم إلغاء الاختبار ورصد مخالفة أمنية
          </span>
          <h3 className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400">
            تم إلغاء الاختبار وخصم محاولة من رصيدك!
          </h3>
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300 leading-relaxed bg-white/60 dark:bg-slate-900/60 p-5 rounded-2xl border border-rose-300 dark:border-rose-900">
            تم رصد تكرار مغادرة شاشة الاختبار أو التبديل بين النوافذ والبرامج والتطبيقات الخارجية. تم تطبيق السياسة الأمنية الصارمة للمنصة: إلغاء محاولتك فورا، تسجيل الدرجة (0%)، وخصم محاولة من رصيدك المسموح به لمنع أي محاولات للغش أو تسريب الأسئلة.
          </p>
        </div>
        <div className="pt-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-8 py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-xs shadow-lg transition-transform active:scale-95"
          >
            تحديث الشاشة والعودة
          </button>
        </div>
      </div>
    );
  }

  // Empty State
  if (solvableQuestions.length === 0) {
    return (
      <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4" dir="rtl">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
          <HelpCircle className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-black text-slate-900 dark:text-white">
            لا توجد أسئلة مضافة بعد
          </h3>
          <p className="text-xs text-slate-500 font-bold">
            لم يقم المعلم برفع أسئلة لهذا {isHomework ? 'الواجب' : 'الاختبار'} حتى الآن.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative select-none transition-colors duration-300 w-full ${
        isFullscreen
          ? 'min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto'
          : 'space-y-6'
      }`}
      dir="rtl"
    >
      {/* Subtle Security Watermark Across Canvas */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-[0.035] flex flex-wrap gap-24 p-8 text-xs font-mono font-bold select-none text-slate-950 dark:text-white">
        {Array.from({ length: 16 }).map((_, idx) => (
          <div key={idx} className="-rotate-12">
            MR. MOHAMED RADWAN SECURE SYSTEM • {currentUser?.fullName || 'STUDENT'} • {currentUser?.phone || 'SECURE'}
          </div>
        ))}
      </div>

      {/* Security Warning Modal (First Offense Alert) */}
      {showViolationModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4" dir="rtl">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border-2 border-amber-500 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl shadow-amber-500/20 text-center animate-in fade-in zoom-in-95">
            <div className="w-20 h-20 rounded-3xl bg-amber-500/20 text-amber-500 flex items-center justify-center mx-auto border border-amber-500/30 animate-bounce">
              <AlertTriangle className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full text-[11px] font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                ⚠️ إنذار أمني مشدد (مخالفة 1 من 2)
              </span>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                تم رصد مغادرة شاشة الاختبار!
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-bold leading-relaxed bg-amber-50 dark:bg-amber-950/40 p-4 rounded-2xl border border-amber-200 dark:border-amber-900/40">
                هذه البيئة مراقبة ومؤمنة بأحدث المعايير. تم تسجيل خروجك من الشاشة أو التنقل لبرنامج آخر.
                <br />
                <strong className="text-rose-600 dark:text-rose-400 block mt-2 font-black">
                  تحذير حاسم: أي محاولة أخرى للخروج أو التبديل ستؤدي فوراً إلى إلغاء الاختبار، ورسوبك بخصم محاولة من رصيدك!
                </strong>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowViolationModal(false)}
              className="w-full py-3.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white font-black text-sm rounded-2xl shadow-lg shadow-amber-600/30 transition-transform active:scale-95"
            >
              أفهم وألتزم بالتعليمات الأمنية للمنصة
            </button>
          </div>
        </div>
      )}

      {/* Pre-Submission Interactive Summary Modal */}
      {showPreSubmitModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4" dir="rtl">
          <div className="max-w-xl w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black">
                  <ListOrdered className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    إحصائية الأسئلة قبل التسليم النهائي
                  </h3>
                  <p className="text-xs text-slate-500 font-bold">
                    راجع حالة جميع الأسئلة وتأكد من اكتمال الإجابات
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPreSubmitModal(false)}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-center">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 block">تمت الإجابة</span>
                <span className="text-xl font-black text-emerald-700 dark:text-emerald-400">{answeredCount}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 text-center">
                <span className="text-xs font-bold text-rose-700 dark:text-rose-300 block">لم تُجب بعد</span>
                <span className="text-xl font-black text-rose-700 dark:text-rose-400">{unansweredCount}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-center">
                <span className="text-xs font-bold text-amber-700 dark:text-amber-300 block">معلمة للمراجعة</span>
                <span className="text-xl font-black text-amber-700 dark:text-amber-400">{flaggedCount}</span>
              </div>
            </div>

            {/* Unanswered Warning Banner */}
            {unansweredCount > 0 && (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-900/60 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div className="text-xs font-bold text-rose-800 dark:text-rose-300 space-y-0.5">
                  <p className="font-black">انتبه: لديك {unansweredCount} أسئلة لم تقم بالإجابة عليها بعد!</p>
                  <p className="opacity-90">يمكنك الضغط على أرقام الأسئلة الحمراء بالأسفل للانتقال إليها مباشرة وحلها قبل التسليم.</p>
                </div>
              </div>
            )}

            {/* Interactive Question Grid Matrix */}
            <div>
              <span className="text-xs font-black text-slate-700 dark:text-slate-300 mb-2.5 block">
                مصفوفة الأسئلة (اضغط على أي رقم للقفز إليه مباشرة):
              </span>
              <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 max-h-48 overflow-y-auto p-1">
                {solvableQuestions.map((q, qIndex) => {
                  const answered = isQuestionAnswered(q);
                  const isFlagged = flaggedQuestions[q.id];
                  
                  let colorClasses = '';
                  if (isFlagged) {
                    colorClasses = 'bg-amber-400 text-slate-950 border-amber-500 font-black shadow-sm';
                  } else if (answered) {
                    colorClasses = 'bg-emerald-600 text-white border-emerald-700 font-black shadow-sm';
                  } else {
                    colorClasses = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-emerald-500';
                  }

                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => {
                        setShowPreSubmitModal(false);
                        setActiveQuestionIndex(qIndex);
                        if (viewMode === 'full_list') {
                          const el = document.getElementById(`question_card_${q.id}`);
                          if (el) {
                            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }
                        }
                      }}
                      className={`relative p-2.5 rounded-xl text-xs font-black flex flex-col items-center justify-center gap-1 border transition-all ${colorClasses}`}
                    >
                      <span>#{qIndex + 1}</span>
                      {isFlagged && (
                        <Flag className="w-3 h-3 fill-current" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowPreSubmitModal(false)}
                className="w-full sm:flex-1 py-3 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors"
              >
                العودة للمراجعة والإكمال
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full sm:flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs shadow-lg shadow-emerald-600/30 transition-transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جارٍ التصحيح وتوثيق النتيجة...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>تأكيد التسليم النهائي</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {!hasStarted && !isSubmitted ? (
        /* Comprehensive Pre-Exam Briefing Screen */
        <div className="relative z-10 max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
          
          {/* Header Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xl relative overflow-hidden text-center sm:text-right space-y-6">
            <div className="absolute top-0 right-0 left-0 h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600" />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
                  <span className={`px-3 py-1 rounded-full text-xs font-black border ${
                    isHomework
                      ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                      : 'bg-indigo-50 text-indigo-700 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800'
                  }`}>
                    {isHomework ? '📝 واجب إلكتروني تفاعلي' : '🛡️ امتحان إلكتروني شامل ومؤمن'}
                  </span>
                  {courseData && (
                    <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                      {courseData.stage === 'high' ? 'المرحلة الثانوية' : 'المرحلة الإعدادية'} - الصف {courseData.grade} ({courseData.educationType === 'azhar' ? 'أزهر' : 'عام'})
                    </span>
                  )}
                  {unitTitle && (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {unitTitle}
                    </span>
                  )}
                </div>
                <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white pt-1">
                  {item.title}
                </h1>
                {courseData?.title && (
                  <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400">
                    ضمن كورس: {courseData.title} • منصة مستر محمد رضوان التعليمية
                  </p>
                )}
              </div>

              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto sm:mx-0 shrink-0 border border-emerald-500/20">
                <Lock className="w-8 h-8" />
              </div>
            </div>

            {/* Teacher Instructions / Description (if provided) */}
            {item.description && (
              <div className="bg-slate-50 dark:bg-slate-950/60 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1.5 text-right">
                <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  تعليمات وتوجيهات مستر محمد رضوان للاختبار:
                </span>
                <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed pr-5">
                  {item.description}
                </p>
              </div>
            )}

            {/* Detailed Parameters Grid (All settings set by teacher) */}
            <div>
              <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                تفاصيل وبيانات التقييم المعتمدة:
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/80 flex flex-col items-center justify-center gap-1 text-center">
                  <ListOrdered className="w-5 h-5 text-emerald-500" />
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">عدد الأسئلة</span>
                  <span className="text-lg font-black text-slate-900 dark:text-white">{solvableQuestions.length} سؤال</span>
                </div>
                
                <div className="bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/80 flex flex-col items-center justify-center gap-1 text-center">
                  <Award className="w-5 h-5 text-indigo-500" />
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">الدرجة الكلية</span>
                  <span className="text-lg font-black text-slate-900 dark:text-white">
                    {item.totalMarks || questions.reduce((acc, q) => acc + (q.points || 1), 0) || 100} درجة
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/80 flex flex-col items-center justify-center gap-1 text-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">درجة النجاح</span>
                  <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                    {item.passingScorePercentage || 60}%
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/80 flex flex-col items-center justify-center gap-1 text-center">
                  <Clock className="w-5 h-5 text-indigo-500" />
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">الوقت المحدد للحل</span>
                  <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                    {assessmentDurationMinutes} دقيقة
                  </span>
                  <span className="text-[9px] font-bold text-slate-400">⏱️ تايمر إجباري</span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/80 flex flex-col items-center justify-center gap-1 text-center">
                  <RefreshCw className="w-5 h-5 text-cyan-500" />
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">المحاولات الكلية</span>
                  <span className="text-lg font-black text-slate-900 dark:text-white">
                    {maxAttempts} {maxAttempts === 1 ? 'محاولة' : 'محاولات'}
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/80 flex flex-col items-center justify-center gap-1 text-center">
                  <ShieldCheck className="w-5 h-5 text-rose-500" />
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">المحاولات المتبقية</span>
                  <span className="text-lg font-black text-rose-600 dark:text-rose-400">
                    {Math.max(0, maxAttempts - currentAttempts)} متبقية
                  </span>
                </div>
              </div>
            </div>

            {/* Student Identity Stamp */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/40 text-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-bold text-emerald-900 dark:text-emerald-200">
                  الطالب الممتحن: <strong>{currentUser?.fullName || 'طالب المنصة'}</strong> (هاتف: {currentUser?.phone || 'مسجل'})
                </span>
              </div>
              <span className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-400">
                جلسة مراقبة مؤمنة وموثقة ✓
              </span>
            </div>

            {/* Security Charter & Strict Anti-Cheat Rules */}
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 p-5 sm:p-6 rounded-2xl text-right space-y-2.5">
              <h4 className="text-sm font-black text-amber-800 dark:text-amber-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> ميثاق النزاهة الأكاديمية ونظام التايمر:
              </h4>
              <ul className="text-xs font-bold text-amber-900 dark:text-amber-300 space-y-1.5 list-disc list-inside leading-relaxed">
                <li>يبدأ العداد التنازلي ({assessmentDurationMinutes} دقيقة) فور الضغط على زر البدء.</li>
                <li>يتم تفعيل وضع ملء الشاشة الآمن تلقائياً فور بدء الاختبار.</li>
                <li>يمنع منعاً باتاً مغادرة النافذة، أو تصغيرها، أو فتح أي برامج جانبية؛ حيث يُرصد ذلك فوراً كنظام إنذار أمني.</li>
                <li>عند وصول العداد إلى (00:00) يتم تسليم جميع إجاباتك وحساب النتيجة تلقائياً وبأمان.</li>
                <li>تم قفل لقطات الشاشة، والنسخ، وقوائم الماوس لضمان نزاهة الامتحان 100%.</li>
              </ul>
            </div>

            {/* Start CTA Button */}
            <div className="pt-2 flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={handleStartAssessment}
                className="w-full max-w-lg py-4 px-8 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-700 hover:to-indigo-700 text-white font-black text-base rounded-2xl shadow-xl shadow-emerald-600/30 transition-transform active:scale-95 flex items-center justify-center gap-3 cursor-pointer"
              >
                <Maximize2 className="w-5 h-5" />
                <span>بدء أداء {isHomework ? 'الواجب' : 'الامتحان'} (التايمر: {assessmentDurationMinutes} دقيقة)</span>
              </button>
              <span className="text-[11px] font-bold text-slate-400">
                بمجرد النقر سيبدأ التايمر التنازلي وتفعيل ملء الشاشة والرقابة المباشرة
              </span>
            </div>

          </div>
        </div>
      ) : (
        <div className="relative z-10 space-y-6">

      {/* Advanced Futuristic Header & Controls Toolbar */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-lg space-y-4">
        
        {/* Row 1: Item Meta & Prominent Countdown Box */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-3 py-0.5 rounded-full text-xs font-black border ${
                isHomework
                  ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                  : 'bg-indigo-50 text-indigo-700 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800'
              }`}>
                {isHomework ? '📝 واجب إلكتروني (تصحيح فوري للسؤال)' : '🛡️ امتحان شامل (بيئة مراقبة)'}
              </span>
              
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">
                درجة النجاح: {item.passingScorePercentage || 60}%
              </span>
              {!isHomework && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  المحاولات المتبقية: {Math.max(0, maxAttempts - currentAttempts)}
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {item.title}
            </h2>
          </div>

          {/* Prominent High-Visibility Numeric Timer Box (2030 Futuristic HUD) */}
          <div className="flex items-center gap-3 flex-wrap">
            {timeLeft !== null && (
              <div className={`flex items-center gap-3 px-4 py-2 rounded-2xl border transition-all ${
                timeLeft < 60
                  ? 'bg-rose-500/10 border-rose-500 text-rose-600 dark:text-rose-400 ring-2 ring-rose-500/40 animate-pulse'
                  : timeLeft < 300
                  ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400 ring-2 ring-amber-500/30'
                  : 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
              }`}>
                <div className={`p-2 rounded-xl flex items-center justify-center ${
                  timeLeft < 60
                    ? 'bg-rose-600 text-white animate-bounce'
                    : timeLeft < 300
                    ? 'bg-amber-500 text-white'
                    : 'bg-indigo-600 text-white'
                }`}>
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1 opacity-80">
                    <span>الوقت المتبقي</span>
                    {timeLeft < 60 && <span className="text-rose-600 dark:text-rose-400 font-bold">⚠️ أسرع!</span>}
                  </div>
                  <div dir="ltr" className="text-xl sm:text-2xl font-black font-mono tracking-wider leading-none">
                    {formatTimeLeft(timeLeft)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Tools: Zoom, Highlighter, Fullscreen */}
          <div className="flex items-center gap-2 flex-wrap">
            
            {/* Font Zoom Controls */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-2xl p-1 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setFontZoomLevel((prev) => Math.max(0, prev - 1))}
                disabled={fontZoomLevel === 0}
                className="p-1.5 rounded-xl hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 transition-all"
                title="تصغير الخط"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="px-2 text-[11px] font-mono font-black text-slate-700 dark:text-slate-300 min-w-[38px] text-center">
                {zoomLabels[fontZoomLevel]}
              </span>
              <button
                type="button"
                onClick={() => setFontZoomLevel((prev) => Math.min(4, prev + 1))}
                disabled={fontZoomLevel === 4}
                className="p-1.5 rounded-xl hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 transition-all"
                title="تكبير الخط"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            {/* Highlighter & Underline Selector */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-2xl p-1 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setAnnotationTool(annotationTool === 'yellow' ? 'none' : 'yellow')}
                className={`p-1.5 rounded-xl transition-all ${
                  annotationTool === 'yellow'
                    ? 'bg-amber-400 text-slate-950 shadow-sm ring-2 ring-amber-500'
                    : 'hover:bg-white dark:hover:bg-slate-700 text-amber-500'
                }`}
                title="تظليل أصفر (حدد أو اضغط الكلمات)"
              >
                <Highlighter className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setAnnotationTool(annotationTool === 'green' ? 'none' : 'green')}
                className={`p-1.5 rounded-xl transition-all ${
                  annotationTool === 'green'
                    ? 'bg-emerald-400 text-slate-950 shadow-sm ring-2 ring-emerald-500'
                    : 'hover:bg-white dark:hover:bg-slate-700 text-emerald-500'
                }`}
                title="تظليل أخضر"
              >
                <Highlighter className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setAnnotationTool(annotationTool === 'underline' ? 'none' : 'underline')}
                className={`p-1.5 rounded-xl transition-all ${
                  annotationTool === 'underline'
                    ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500'
                    : 'hover:bg-white dark:hover:bg-slate-700 text-indigo-500'
                }`}
                title="تسطير خط تحت الكلمات"
              >
                <UnderlineIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-2xl border transition-all bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
              title={theme === 'dark' ? 'تبديل للوضع الفاتح' : 'تبديل للوضع الداكن'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-500" />}
            </button>

            {/* Fullscreen Mode Button */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className={`p-2 rounded-2xl border transition-all ${
                isFullscreen
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
              title={isFullscreen ? 'الخروج من وضع ملء الشاشة' : 'وضع الاختبار الآمن (ملء الشاشة)'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Row 2: Filter Tabs & Answer Progress */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          
          {/* Filters */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setQuestionFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                questionFilter === 'all'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              جميع الأسئلة ({solvableQuestions.length})
            </button>

            <button
              type="button"
              onClick={() => setQuestionFilter('flagged')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
                questionFilter === 'flagged'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-amber-600 dark:text-amber-400 hover:bg-amber-50'
              }`}
            >
              <Flag className="w-3.5 h-3.5 fill-current" />
              <span>المراجعة ({flaggedCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setQuestionFilter('unanswered')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
                questionFilter === 'unanswered'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>غير المجابة ({unansweredCount})</span>
            </button>
          </div>

          {/* Progress Pill */}
          <div className="flex items-center gap-3">
            <div className="w-36 h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
                style={{ width: `${(answeredCount / (solvableQuestions.length || 1)) * 100}%` }}
              />
            </div>
            <span className="text-xs font-black text-slate-700 dark:text-slate-300 whitespace-nowrap">
              {answeredCount} / {solvableQuestions.length} سؤال
            </span>
          </div>

        </div>

      </div>

      {/* Results Header (Displays if submitted) */}
      {isSubmitted && results && (
        <div className="space-y-6">
          {/* Failed Exam Screen: Questions and Model Answers Strictly Hidden */}
          {!results.passed ? (
            <div className="p-6 sm:p-8 rounded-3xl border text-center space-y-5 shadow-xl backdrop-blur-md bg-rose-500/10 border-rose-500/30 text-rose-950 dark:text-rose-100">
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto shadow-lg bg-rose-600 text-white shadow-rose-600/30">
                <AlertCircle className="w-10 h-10" />
              </div>

              <div className="space-y-1">
                <h3 className="text-2xl sm:text-3xl font-black">
                  للأسف لم تحقق درجة النجاح المطلوبة
                </h3>
                <p className="text-xs sm:text-sm font-bold opacity-80">
                  درجة النجاح المطلوبة لاجتياز هذا {isHomework ? 'الواجب' : 'الاختبار'} هي {item.passingScorePercentage || 60}%.
                </p>
              </div>

              {/* Score Display */}
              <div className="flex items-center justify-center gap-6 pt-2">
                <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/50 dark:border-slate-800/50 min-w-[120px]">
                  <span className="text-xs font-bold text-slate-500 block">النسبة المئوية</span>
                  <span className="text-3xl font-black text-rose-600 dark:text-rose-400">{results.percentage}%</span>
                </div>
                <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/50 dark:border-slate-800/50 min-w-[120px]">
                  <span className="text-xs font-bold text-slate-500 block">الدرجة المحققة</span>
                  <span className="text-3xl font-black">
                    {results.earnedPoints} / {results.totalPoints}
                  </span>
                </div>
              </div>

              {/* Security & Integrity Lock Notice */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs font-bold flex items-center justify-center gap-2.5 max-w-lg mx-auto">
                <Lock className="w-5 h-5 text-amber-600 shrink-0" />
                <span>تنويه أمان: نموذج الإجابة التفصيلي والأسئلة يتاح حصرياً للطلاب الذين اجتازوا الاختبار بنجاح حرصاً على العدالة ونزاهة التقييم.</span>
              </div>

              {/* Retake Button if allowed */}
              {!isHomework && !isLockedOut && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleRetake}
                    className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-sm transition-all shadow-lg shadow-rose-600/30 active:scale-95"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>إعادة المحاولة الآن ({Math.max(0, maxAttempts - currentAttempts)} محاولات متبقية)</span>
                  </button>
                </div>
              )}

              {isLockedOut && (
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold">
                  لقد استنفدت جميع المحاولات المتاحة ({maxAttempts} محاولات). يرجى مراجعة المعلم أو المساعد لمنح محاولة جديدة.
                </div>
              )}
            </div>
          ) : (
            /* Passed Exam Screen: 2 Interactive Tabs */
            <div className="space-y-6">
              {/* Tabs Switcher */}
              <div className="flex items-center justify-center gap-3 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <button
                  type="button"
                  onClick={() => setResultActiveTab('score_certificate')}
                  className={`px-6 py-3 rounded-xl font-black text-xs transition-all flex items-center gap-2 ${
                    resultActiveTab === 'score_certificate'
                      ? 'bg-violet-600 text-white shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Award className="w-4 h-4" />
                  <span>نتيجة الاختبار والتكريم {results.percentage >= 80 && !isHomework ? '👑 (الشهادة)' : ''}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setResultActiveTab('answers_review')}
                  className={`px-6 py-3 rounded-xl font-black text-xs transition-all flex items-center gap-2 ${
                    resultActiveTab === 'answers_review'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Eye className="w-4 h-4" />
                  <span>مراجعة الأسئلة ونموذج الإجابة ({solvableQuestions.length})</span>
                </button>
              </div>

              {/* Tab 1: Score & Certificate */}
              {resultActiveTab === 'score_certificate' && (
                <div className="space-y-6">
                  {/* Score & Praise Card */}
                  <div className="p-6 sm:p-8 rounded-3xl border text-center space-y-4 shadow-xl backdrop-blur-md bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-100">
                    <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto shadow-lg bg-emerald-600 text-white shadow-emerald-600/30">
                      <Award className="w-10 h-10" />
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-2xl sm:text-3xl font-black">
                        ألف مبروك! لقد اجتزت بنجاح 🎉
                      </h3>
                      <p className="text-xs sm:text-sm font-bold opacity-80">
                        {results.percentage >= 80
                          ? 'أداء أسطوري وتفوق باهر! استحققت شهادة التقدير الرسمية من مستر محمد رضوان.'
                          : results.percentage >= 70
                          ? 'أداء رائع جداً ومتميز! استمر في هذا المستوى الرائع.'
                          : 'أداء جيد وتم اجتياز الاختبار بنجاح.'}
                      </p>
                    </div>

                    {/* Score Counters & Level */}
                    <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                      <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/50 dark:border-slate-800/50 min-w-[120px]">
                        <span className="text-xs font-bold text-slate-500 block">النسبة المئوية</span>
                        <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{results.percentage}%</span>
                      </div>
                      <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/50 dark:border-slate-800/50 min-w-[120px]">
                        <span className="text-xs font-bold text-slate-500 block">الدرجة المحققة</span>
                        <span className="text-3xl font-black">
                          {results.earnedPoints} / {results.totalPoints}
                        </span>
                      </div>
                      <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/50 dark:border-slate-800/50 min-w-[140px]">
                        <span className="text-xs font-bold text-slate-500 block">التقدير الأكاديمي</span>
                        <span className="text-lg font-black text-violet-600 dark:text-violet-400">
                          {results.percentage >= 80 ? 'ممتاز مع مرتبة الشرف 👑' : results.percentage >= 70 ? 'جيد جداً 🌟' : 'مقبول / جيد 👍'}
                        </span>
                      </div>
                    </div>

                    {/* Retake Button if allowed */}
                    {!isHomework && !isLockedOut && (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={handleRetake}
                          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-all shadow-md active:scale-95"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>إعادة المحاولة لتحسين الدرجة ({Math.max(0, maxAttempts - currentAttempts)} محاولات متبقية)</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Honor Certificate for Exam with Score >= 80% */}
                  {!isHomework && results.percentage >= 80 && (
                    <div className="pt-2">
                      <HonorCertificate
                        studentName={currentUser?.fullName || 'الطالب المتميز'}
                        examTitle={item.title}
                        courseTitle={courseData?.title}
                        scorePercentage={results.percentage}
                      />
                    </div>
                  )}

                  {/* Notice for score between passing score and 80% */}
                  {!isHomework && results.percentage < 80 && (
                    <div className="p-6 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-950 dark:text-amber-100 text-center space-y-2">
                      <Sparkles className="w-8 h-8 text-amber-500 mx-auto" />
                      <h4 className="text-base font-black">شهادة التكريم والامتياز:</h4>
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                        تُمنح شهادة التقدير والتكريم الرسمية للطلاب الذين يحققون نسبة 80% فما فوق. درجتك الحالية ممتازة ({results.percentage}%)، ويمكنك إعادة المحاولة في أي وقت للحصول على الشهادة والتكريم الرسمي.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Questions Matrix and Solvers List (Rendered only when solving OR when submitted AND passed AND on review tab) */}
      {(!isSubmitted || (results?.passed && resultActiveTab === 'answers_review')) && (
        <div className="space-y-6">
      {/* Navigation Matrix & Question Index Toolbar */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-black text-slate-800 dark:text-slate-200">
              جدول أرقام الأسئلة:
            </span>
            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
                <span>تم الحل (أخضر)</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-amber-400 inline-block"></span>
                <span>علامة مراجعة (أصفر)</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-white border border-slate-300 dark:border-slate-600 inline-block"></span>
                <span>لم يُحل بعد (أبيض)</span>
              </span>
            </div>
          </div>

          {/* View mode toggle: Single Question per page vs Full List */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-2xl p-1 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('step_by_step')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                viewMode === 'step_by_step'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              سؤال تلو الآخر (صفحة منفصلة)
            </button>
            <button
              type="button"
              onClick={() => setViewMode('full_list')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                viewMode === 'full_list'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              عرض القائمة الكاملة
            </button>
          </div>
        </div>

        {/* Dynamic Question Grid with Color Coded Status */}
        <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2 max-h-44 overflow-y-auto p-1.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
          {solvableQuestions.map((q, qIdx) => {
            const isFlagged = Boolean(flaggedQuestions[q.id]);
            const isAnswered = isQuestionAnswered(q);
            const isCurrent = viewMode === 'step_by_step' && activeQuestionIndex === qIdx;

            // Color coding according to user directive:
            // 1. Flagged for review -> Yellow (أصفر)
            // 2. Answered without flag -> Green (أخضر)
            // 3. Not answered yet -> White (أبيض)
            let colorClasses = '';
            if (isFlagged) {
              colorClasses = 'bg-amber-400 text-slate-950 border-amber-500 font-black shadow-sm';
            } else if (isAnswered) {
              colorClasses = 'bg-emerald-600 text-white border-emerald-700 font-black shadow-sm';
            } else {
              colorClasses = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-emerald-500';
            }

            return (
              <button
                key={q.id}
                type="button"
                onClick={() => {
                  if (viewMode === 'step_by_step') {
                    setActiveQuestionIndex(qIdx);
                  } else {
                    const el = document.getElementById(`question_card_${q.id}`);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                }}
                className={`relative py-2 px-1 rounded-xl text-xs transition-all flex flex-col items-center justify-center gap-0.5 border ${colorClasses} ${
                  isCurrent ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900 scale-105 z-10' : ''
                }`}
                title={`السؤال #${qIdx + 1} - ${isFlagged ? 'معلم للمراجعة' : isAnswered ? 'تمت الإجابة' : 'لم يتم الحل'}`}
              >
                <span className="font-mono font-black">{qIdx + 1}</span>
                {isFlagged && <Flag className="w-2.5 h-2.5 fill-current" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Reading Passages Box (REMOVED: Passages are now rendered with their linked questions) */}

      {/* Solvable Questions Section (Single Question Mode OR Full List) */}
      <div className="space-y-6">
        {(viewMode === 'step_by_step'
          ? [solvableQuestions[activeQuestionIndex] || solvableQuestions[0]]
          : displayQuestions
        ).map((q) => {
          if (!q) return null;
          const qIndex = solvableQuestions.findIndex((item) => item.id === q.id);
          const isFlagged = flaggedQuestions[q.id];
          const isHintRevealed = revealedHints[q.id];
          const isEvaluated = isHomework && Boolean(evaluatedQuestions[q.id]);
          const evalResult = evaluatedQuestions[q.id];
          const qResult = results?.questionResults[q.id];
          const parentPassage = q.parentId ? passages.find(p => p.id === q.parentId) : null;
          const isFirstForPassage = q.parentId ? solvableQuestions.findIndex(x => x.parentId === q.parentId) === qIndex : false;
          const shouldShowPassage = parentPassage && (viewMode === 'step_by_step' || isFirstForPassage);

          return (
            <div
              id={`question_card_${q.id}`}
              key={q.id}
              className={`p-6 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border transition-all duration-300 space-y-5 shadow-sm relative ${
                isFlagged
                  ? 'border-amber-400 ring-1 ring-amber-400/30'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {/* Reference Passage for this question (if any) */}
              {shouldShowPassage && (
                <div className="mb-4 p-5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/50 space-y-3">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
                    <BookOpen className="w-5 h-5 shrink-0" />
                    <span className="text-xs font-black uppercase tracking-wider">
                      Reference Passage (قطعة الفهم المرتبطة بالسؤال)
                    </span>
                  </div>
                  <div
                    dir="ltr"
                    className={`font-sans leading-relaxed text-slate-800 dark:text-slate-200 p-4 rounded-xl bg-white dark:bg-slate-900 border border-amber-100 dark:border-amber-900/40 text-left select-text ${getQuestionFontSizeClass()}`}
                  >
                    {renderAnnotatedText(parentPassage.id, parentPassage.questionText)}
                  </div>
                </div>
              )}

              {/* Question Header: Number, Marks, Flag & Hint Tools */}
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="w-8 h-8 rounded-xl bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 text-xs font-black flex items-center justify-center shadow-sm">
                    {qIndex + 1}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {q.points || 1} {q.points === 1 ? 'درجة' : 'درجات'}
                  </span>
                  {/* Earned Score Badge if evaluated (homework) or submitted (exam) */}
                  {(isEvaluated || isSubmitted) && (
                    <span
                      className={`px-2.5 py-0.5 rounded-lg text-[11px] font-black border ${
                        (isEvaluated ? evalResult?.isCorrect : qResult?.isCorrect)
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                          : ((isEvaluated ? evalResult?.earnedPoints : qResult?.earned) || 0) > 0
                          ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                          : 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                      }`}
                    >
                      الدرجة المحققة: {isEvaluated ? evalResult?.earnedPoints : (qResult?.earned ?? 0)} / {q.points || 1}
                    </span>
                  )}
                  {q.questionType === 'word_bank' && (
                    <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      صندوق الكلمات
                    </span>
                  )}
                  {q.questionType === 'multi_select' && (
                    <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      متعدد الإجابات (اختر أكثر من إجابة)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Teacher Hint Button */}
                  {q.hint && (
                    <button
                      type="button"
                      onClick={() => handleToggleHint(q.id)}
                      className={`px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
                        isHintRevealed
                          ? 'bg-amber-500 text-white shadow-sm'
                          : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40 hover:bg-amber-100'
                      }`}
                      title="عرض تلميح السؤال"
                    >
                      <Lightbulb className="w-3.5 h-3.5" />
                      <span>تلميح 💡</span>
                    </button>
                  )}

                  {/* Clear Annotations for this question */}
                  {highlightedWords[q.id] && Object.keys(highlightedWords[q.id]).length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleClearAnnotations(q.id)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      title="مسح تظليلات هذا السؤال"
                    >
                      <Eraser className="w-4 h-4" />
                    </button>
                  )}

                  {/* Review Flag */}
                  <button
                    type="button"
                    onClick={() => handleToggleFlag(q.id)}
                    className={`px-3 py-1.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 transition-all ${
                      isFlagged
                        ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-md font-black ring-2 ring-amber-400/50'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 border-slate-200 dark:border-slate-700'
                    }`}
                    title={isFlagged ? 'إلغاء علامة المراجعة لهذا السؤال' : 'تعليم السؤال للمراجعة لاحقاً (يتلون بالأصفر في الجدول)'}
                  >
                    <Flag className={`w-3.5 h-3.5 ${isFlagged ? 'fill-current text-slate-950' : 'text-amber-500'}`} />
                    <span>{isFlagged ? 'مُعلّم للمراجعة ⭐' : 'مراجعة لاحقاً'}</span>
                  </button>
                </div>
              </div>

              {/* Teacher Hint Banner (When clicked) */}
              {isHintRevealed && q.hint && (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 space-y-1 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-black text-xs">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    <span>تلميح من مستر محمد رضوان:</span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-200 leading-relaxed pr-5">
                    {q.hint}
                  </p>
                </div>
              )}

              {/* Question Text with Dynamic Font Scaling & Interactive Annotation */}
              {q.questionType !== 'word_bank' && (
                <div
                  dir="ltr"
                  className={`font-sans font-black text-slate-900 dark:text-white text-left select-text leading-relaxed ${getQuestionFontSizeClass()}`}
                >
                  {renderAnnotatedText(q.id, q.questionText)}
                </div>
              )}

              {/* Optional Question Image */}
              {q.questionImageUrl && (
                <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 max-w-md mx-auto">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={q.questionImageUrl} alt="Question Diagram" className="w-full object-cover" />
                </div>
              )}

              {/* Question Evaluation Banner (For Homework immediate check OR Exam submission review) */}
              {((isHomework && isEvaluated) || isSubmitted) && (
                <div
                  className={`p-4 rounded-2xl border flex items-center justify-between gap-3 animate-in fade-in ${
                    (isEvaluated ? evalResult?.isCorrect : qResult?.isCorrect)
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                      : ((isEvaluated ? evalResult?.earnedPoints : qResult?.earned) || 0) > 0
                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                      : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {(isEvaluated ? evalResult?.isCorrect : qResult?.isCorrect) ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : ((isEvaluated ? evalResult?.earnedPoints : qResult?.earned) || 0) > 0 ? (
                      <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                    )}
                    <span className="text-xs sm:text-sm font-black">
                      {(isEvaluated ? evalResult?.isCorrect : qResult?.isCorrect)
                        ? `إجابة صحيحة وممتازة بالكامل! (+${isEvaluated ? evalResult?.earnedPoints : qResult?.earned} من ${q.points || 1} درجة)`
                        : ((isEvaluated ? evalResult?.earnedPoints : qResult?.earned) || 0) > 0
                        ? `إجابة صحيحة جزئياً (+${isEvaluated ? evalResult?.earnedPoints : qResult?.earned} من ${q.points || 1} درجة${
                            isEvaluated && evalResult?.correctCount !== undefined && evalResult?.totalCount
                              ? ` - تم حل ${evalResult.correctCount} من ${evalResult.totalCount} فراغات بنجاح`
                              : ''
                          })`
                        : `إجابة غير صحيحة (0 من ${q.points || 1} درجة)`}
                    </span>
                  </div>
                  <span className="text-[11px] font-black opacity-75">
                    {isHomework ? 'تم قفل السؤال' : 'مراجعة الإجابة'}
                  </span>
                </div>
              )}

              {/* 1. Single Choice (MCQ or T/F) */}
              {(q.questionType === 'mcq' || q.questionType === 'tf') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" dir="ltr">
                  {q.options.map((opt) => {
                    const isSelected = mcqAnswers[q.id] === opt.id;
                    const correctAnsId = results?.questionResults?.[q.id]?.correctAnswerId || q.correctAnswerId;
                    const isCorrectAnswer = opt.id === correctAnsId;

                    // Styling logic based on submission / homework evaluation
                    let btnStyle = 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white hover:border-indigo-400';
                    let badgeIcon = <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600" />;

                    if (isSubmitted || isEvaluated) {
                      if (isCorrectAnswer) {
                        btnStyle = 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500/40';
                        badgeIcon = <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 stroke-[3]" />;
                      } else if (isSelected && !isCorrectAnswer) {
                        btnStyle = 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-950 dark:text-rose-100 ring-2 ring-rose-500/40 line-through';
                        badgeIcon = <X className="w-4 h-4 text-rose-600 dark:text-rose-400 stroke-[3]" />;
                      } else {
                        btnStyle = 'bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 opacity-50';
                      }
                    } else if (isSelected) {
                      btnStyle = 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-600 text-indigo-950 dark:text-indigo-100 ring-2 ring-indigo-500/30';
                      badgeIcon = <div className="w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-white" /></div>;
                    }

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleSelectMCQ(q.id, opt.id)}
                        disabled={isSubmitted || isEvaluated}
                        className={`p-4 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all ${btnStyle} ${getOptionFontSizeClass()}`}
                      >
                        <span className="font-sans font-bold flex-1">{renderAnnotatedText(q.id, opt.text)}</span>
                        <div className="shrink-0">{badgeIcon}</div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* 2. Multiple Selection */}
              {q.questionType === 'multi_select' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" dir="ltr">
                    {q.options.map((opt) => {
                      const selectedList = multiSelectAnswers[q.id] || [];
                      const isSelected = selectedList.includes(opt.id);
                      const expectedList = results?.questionResults?.[q.id]?.correctAnswerIds || (results?.questionResults?.[q.id]?.correctAnswerId ? [results.questionResults[q.id].correctAnswerId!] : null) || q.correctAnswerIds || (q.correctAnswerId ? [q.correctAnswerId] : []);
                      const isExpected = expectedList.includes(opt.id);

                      let btnStyle = 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white hover:border-amber-400';
                      let badgeIcon = <div className="w-4 h-4 rounded-md border border-slate-300 dark:border-slate-600" />;

                      if (isSubmitted || isEvaluated) {
                        if (isExpected) {
                          btnStyle = 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500/40';
                          badgeIcon = <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />;
                        } else if (isSelected && !isExpected) {
                          btnStyle = 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-950 dark:text-rose-100 line-through';
                          badgeIcon = <X className="w-4 h-4 text-rose-600 stroke-[3]" />;
                        } else {
                          btnStyle = 'bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 opacity-50';
                        }
                      } else if (isSelected) {
                        btnStyle = 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-950 dark:text-amber-100 ring-2 ring-amber-500/30';
                        badgeIcon = <CheckSquare className="w-4 h-4 text-amber-600" />;
                      }

                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleToggleMultiSelect(q.id, opt.id)}
                          disabled={isSubmitted || isEvaluated}
                          className={`p-4 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all ${btnStyle} ${getOptionFontSizeClass()}`}
                        >
                          <span className="font-sans font-bold flex-1">{renderAnnotatedText(q.id, opt.text)}</span>
                          <div className="shrink-0">{badgeIcon}</div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Homework Confirmation button for multi-select */}
                  {isHomework && !isEvaluated && (
                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => evaluateHomeworkQuestion(q)}
                        disabled={(multiSelectAnswers[q.id] || []).length === 0}
                        className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>تأكيد الإجابة وتصحيح السؤال</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* 3. Word Bank Question */}
              {q.questionType === 'word_bank' && (
                <div className="space-y-4">
                  <WordBankSolver
                    question={q}
                    mode={isSubmitted || isEvaluated ? 'review' : 'solve'}
                    initialAnswers={wordBankAnswers[q.id] || {}}
                    onAnswersChange={(ans) => handleWordBankAnswersChange(q.id, ans)}
                    showCorrectAnswers={isSubmitted || isEvaluated}
                    isStudentView={true}
                    renderAnnotatedText={(text) => renderAnnotatedText(q.id, text)}
                    fontSizeClass={getQuestionFontSizeClass()}
                    optionFontSizeClass={getOptionFontSizeClass()}
                  />

                  {/* Homework Confirmation button for Word Bank */}
                  {isHomework && !isEvaluated && (
                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => evaluateHomeworkQuestion(q)}
                        disabled={Object.keys(wordBankAnswers[q.id] || {}).length === 0}
                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>تأكيد الإجابة وتصحيح السؤال</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* 4. Text / Essay / Rewrite / Dialogue */}
              {(q.questionType === 'essay' || q.questionType === 'rewrite' || q.questionType === 'dialogue') && (
                <div className="space-y-3">
                  <textarea
                    dir="ltr"
                    rows={3}
                    value={textAnswers[q.id] || ''}
                    onChange={(e) => handleTextAnswerChange(q.id, e.target.value)}
                    disabled={isSubmitted || isEvaluated}
                    placeholder="Type your English answer here..."
                    className={`w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-indigo-500 font-sans text-left font-bold text-slate-900 dark:text-white resize-y ${getOptionFontSizeClass()}`}
                  />

                  {/* Homework Confirmation for Text questions */}
                  {isHomework && !isEvaluated && (
                    <div className="pt-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => evaluateHomeworkQuestion(q)}
                        disabled={!textAnswers[q.id]?.trim()}
                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>تأكيد وتثبيت الإجابة</span>
                      </button>
                    </div>
                  )}

                  {(isSubmitted || isEvaluated) && (results?.questionResults?.[q.id]?.idealAnswer || q.idealAnswer) && (
                    <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-1">
                      <span className="text-xs font-black text-indigo-900 dark:text-indigo-300">
                        النموذج الإرشادي للإجابة (Ideal Answer):
                      </span>
                      <p dir="ltr" className={`font-sans font-bold text-indigo-950 dark:text-indigo-200 text-left ${getOptionFontSizeClass()}`}>
                        {results?.questionResults?.[q.id]?.idealAnswer || q.idealAnswer}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Teacher Explanation & Rule: Revealed immediately in Homework, or at end in Exam */}
              {((isSubmitted || (isHomework && isEvaluated)) && (results?.questionResults?.[q.id]?.explanation || evaluatedQuestions[q.id]?.explanation || q.explanation)) && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5 animate-in fade-in">
                  <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 dark:text-slate-200">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>توضيح وقاعدة السؤال (Teacher Explanation):</span>
                  </div>
                  <p className={`text-slate-700 dark:text-slate-300 font-medium leading-relaxed ${getOptionFontSizeClass()}`}>
                    {results?.questionResults?.[q.id]?.explanation || evaluatedQuestions[q.id]?.explanation || q.explanation}
                  </p>
                </div>
              )}

              {/* Step-by-Step Single Question Pagination Controls (Next / Previous) */}
              {viewMode === 'step_by_step' && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    disabled={activeQuestionIndex === 0}
                    onClick={() => setActiveQuestionIndex((prev) => Math.max(0, prev - 1))}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-black text-xs disabled:opacity-40 transition-all"
                  >
                    <ChevronRight className="w-4 h-4" />
                    <span>السؤال السابق</span>
                  </button>

                  <div className="text-xs font-black text-slate-500">
                    السؤال {activeQuestionIndex + 1} من {solvableQuestions.length}
                  </div>

                  <button
                    type="button"
                    disabled={activeQuestionIndex >= solvableQuestions.length - 1}
                    onClick={() => setActiveQuestionIndex((prev) => Math.min(solvableQuestions.length - 1, prev + 1))}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs disabled:opacity-40 transition-all shadow-md"
                  >
                    <span>السؤال التالي</span>
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>
              )}

            </div>
          );
        })}
      </div>

      {/* Bottom Sticky Action Bar: Pre-Submit Modal Trigger */}
      {!isSubmitted && (
        <div className="sticky bottom-6 z-30 p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-black text-slate-800 dark:text-slate-200">
              تمت الإجابة على ({answeredCount} من {solvableQuestions.length}) سؤال
            </span>
            {unansweredCount > 0 ? (
              <span className="text-[11px] font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-2.5 py-0.5 rounded-lg border border-rose-200 dark:border-rose-900">
                متبقي {unansweredCount} أسئلة
              </span>
            ) : (
              <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-900">
                ✓ اكتملت جميع الإجابات
              </span>
            )}
            {timeLeft !== null && (
              <span className={`px-3 py-1 rounded-xl text-xs font-black border flex items-center gap-2 ${
                timeLeft < 60
                  ? 'bg-rose-100 text-rose-800 border-rose-400 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-700 animate-pulse'
                  : timeLeft < 300 
                  ? 'bg-amber-100 text-amber-800 border-amber-400 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-700'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700'
              }`}>
                <Clock className="w-3.5 h-3.5" />
                <span className="text-[11px] font-bold opacity-80">الوقت المتبقي:</span>
                <span dir="ltr" className="font-mono font-black text-sm">{formatTimeLeft(timeLeft)}</span>
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowPreSubmitModal(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-600/30 transition-transform active:scale-95"
          >
            <Send className="w-4 h-4" />
            <span>مراجعة الإحصائية وتسليم {isHomework ? 'الواجب' : 'الاختبار'}</span>
          </button>
        </div>
      )}
      
        </div>
      )}
      
        </div>
      )}

      {/* Mandatory Signature */}
      <div className="text-center pt-4 pb-2 text-[11px] font-bold text-slate-400 dark:text-slate-500">
        Built With Developer & Designer NOUR M. EL-SAIED 💚 💚
      </div>

    </div>
  );
}
