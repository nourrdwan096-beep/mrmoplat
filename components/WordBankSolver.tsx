'use client';

import React, { useState } from 'react';
import { QuestionData } from '@/lib/academicService';
import { parsePassageToTokens } from '@/lib/blankUtils';
import QuestionRichRenderer from '@/components/QuestionRichRenderer';
import {
  Sparkles,
  Layers,
  RotateCcw,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Check,
  MousePointerClick,
  ListFilter,
  Eye,
  Info
} from 'lucide-react';

interface WordBankSolverProps {
  question: QuestionData;
  mode?: 'solve' | 'preview' | 'review';
  initialAnswers?: Record<number, string>;
  onAnswersChange?: (answers: Record<number, string>) => void;
  showCorrectAnswers?: boolean;
  isStudentView?: boolean;
  renderAnnotatedText?: (text: string) => React.ReactNode;
  fontSizeClass?: string;
  optionFontSizeClass?: string;
}

export default function WordBankSolver({
  question,
  mode = 'preview',
  initialAnswers = {},
  onAnswersChange,
  showCorrectAnswers = false,
  isStudentView = false,
  renderAnnotatedText,
  fontSizeClass = 'text-base sm:text-lg',
  optionFontSizeClass = 'text-sm sm:text-base'
}: WordBankSolverProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>(initialAnswers);
  const [inputMode, setInputMode] = useState<'drag_tap' | 'dropdown'>('drag_tap');
  const [activeWordToPlace, setActiveWordToPlace] = useState<string | null>(null);
  const [testedResults, setTestedResults] = useState<boolean | null>(null);

  const words = question.wordBankWords || [];
  const rawText = question.questionText || '';

  // Parse passage into tokens (text parts and auto-detected blanks: 1, 2, 3...)
  const { tokens, detectedBlanks } = React.useMemo(() => {
    return parsePassageToTokens(rawText);
  }, [rawText]);

  // Effective blanks list (combining detected blanks with saved blank configs)
  const effectiveBlanks = React.useMemo(() => {
    const blanks = question.wordBankBlanks || [];
    if (detectedBlanks.length > 0) {
      return detectedBlanks.map(d => {
        const found = blanks.find(b => b.blankIndex === d.blankIndex);
        return found || { blankIndex: d.blankIndex, correctAnswer: '', points: 1 };
      });
    }
    return blanks;
  }, [detectedBlanks, question.wordBankBlanks]);

  // Helper to get which blanks a word is currently placed in
  const getWordPlacements = (word: string): number[] => {
    const placedIn: number[] = [];
    Object.entries(selectedAnswers).forEach(([blankIdx, val]) => {
      if (val === word) {
        placedIn.push(Number(blankIdx));
      }
    });
    return placedIn.sort((a, b) => a - b);
  };

  const handlePlaceWord = (blankIndex: number, word: string) => {
    const updated = { ...selectedAnswers, [blankIndex]: word };
    setSelectedAnswers(updated);
    if (onAnswersChange) onAnswersChange(updated);
    setActiveWordToPlace(null);
  };

  const handleRemoveWord = (blankIndex: number) => {
    const updated = { ...selectedAnswers };
    delete updated[blankIndex];
    setSelectedAnswers(updated);
    if (onAnswersChange) onAnswersChange(updated);
  };

  const handleReset = () => {
    setSelectedAnswers({});
    setActiveWordToPlace(null);
    setTestedResults(null);
    if (onAnswersChange) onAnswersChange({});
  };

  const handleWordBankClick = (word: string) => {
    if (activeWordToPlace === word) {
      setActiveWordToPlace(null);
    } else {
      setActiveWordToPlace(word);
    }
  };

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, word: string) => {
    e.dataTransfer.setData('text/plain', word);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropOnBlank = (e: React.DragEvent, blankIndex: number) => {
    e.preventDefault();
    const word = e.dataTransfer.getData('text/plain');
    if (word && words.includes(word)) {
      handlePlaceWord(blankIndex, word);
    }
  };

  // Score evaluation for preview test
  const calculateScore = () => {
    if (effectiveBlanks.length === 0) return { correct: 0, total: 0, percentage: 0 };
    let correct = 0;
    effectiveBlanks.forEach(b => {
      if (selectedAnswers[b.blankIndex]?.trim() === b.correctAnswer?.trim()) {
        correct++;
      }
    });
    return {
      correct,
      total: effectiveBlanks.length,
      percentage: Math.round((correct / effectiveBlanks.length) * 100)
    };
  };

  const scoreInfo = calculateScore();

  return (
    <div className="w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-7 shadow-sm space-y-6" dir="rtl">
      
      {/* Top Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200">
                Word Bank &amp; Fill in the Blanks
              </span>
              <span className="text-xs font-bold text-slate-400">
                {effectiveBlanks.length > 0 ? `${effectiveBlanks.length} فراغات مرقمة تلقائياً` : 'إكمال الفراغات'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode Switcher: Drag/Tap vs Dropdown */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200 dark:border-slate-700/60 text-xs font-bold">
            <button
              type="button"
              onClick={() => setInputMode('drag_tap')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
                inputMode === 'drag_tap'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="السحب والنقر التفاعلي"
            >
              <MousePointerClick className="w-3.5 h-3.5" />
              <span>سحب / نقر</span>
            </button>

            <button
              type="button"
              onClick={() => setInputMode('dropdown')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
                inputMode === 'dropdown'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="اختيار من قائمة منسدلة"
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>قائمة منسدلة</span>
            </button>
          </div>

          {/* Reset Button */}
          <button
            type="button"
            onClick={handleReset}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            title="إعادة ضبط وتفريغ الفراغات"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* WORD BANK CONTAINER (Box with all words - STRICTLY LTR for English) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-50/70 to-violet-50/50 dark:from-indigo-950/30 dark:to-violet-950/20 border-2 border-indigo-200/80 dark:border-indigo-800/50 space-y-3 shadow-inner">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5 font-sans">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              Word Bank:
            </span>
            <span className="text-[11px] text-slate-500 font-bold">
              {inputMode === 'drag_tap' ? 'Click on a word then click a blank (or drag it)' : 'Choose the correct word for each blank'}
            </span>
          </div>

          {activeWordToPlace && (
            <span className="text-[11px] font-black bg-indigo-600 text-white px-2.5 py-0.5 rounded-full animate-pulse font-sans">
              Placing: &ldquo;{activeWordToPlace}&rdquo; &rarr; Click on target blank
            </span>
          )}
        </div>

        {/* Word Pills in LTR order */}
        <div className="flex flex-wrap gap-2.5 pt-1" dir="ltr">
          {words.map((word, wIdx) => {
            const placements = getWordPlacements(word);
            const isUsed = placements.length > 0;
            const isSelectedToPlace = activeWordToPlace === word;

            return (
              <div
                key={wIdx}
                draggable={inputMode === 'drag_tap'}
                onDragStart={(e) => handleDragStart(e, word)}
                onClick={() => inputMode === 'drag_tap' && handleWordBankClick(word)}
                className={`group relative select-none inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all cursor-pointer border font-sans ${optionFontSizeClass} ${
                  isSelectedToPlace
                    ? 'bg-indigo-600 text-white border-indigo-700 ring-2 ring-indigo-400 ring-offset-2 scale-105 shadow-md'
                    : isUsed
                    ? 'bg-white dark:bg-slate-800/90 text-indigo-900 dark:text-indigo-200 border-indigo-300 dark:border-indigo-700 shadow-sm hover:border-indigo-500'
                    : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:border-indigo-400 hover:shadow-sm hover:scale-[1.02]'
                }`}
                title={
                  inputMode === 'drag_tap'
                    ? 'Click to select and place, or drag into target blank'
                    : word
                }
              >
                <span className="font-bold tracking-wide">{renderAnnotatedText ? renderAnnotatedText(word) : word}</span>

                {/* Used Badge */}
                {isUsed && (
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    in [{placements.join(', ')}]
                  </span>
                )}
              </div>
            );
          })}

          {words.length === 0 && (
            <p className="text-xs text-slate-400 font-bold py-2 font-sans">
              No words in the word bank yet.
            </p>
          )}
        </div>
      </div>

      {/* PASSAGE TEXT WITH INLINE NUMBERED BLANKS (STRICTLY LTR FOR ENGLISH) */}
      <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between text-xs font-bold text-slate-500">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-slate-400" />
            <span>Complete the following passage:</span>
          </div>
          <span className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">
            {effectiveBlanks.length} Blanks Detected
          </span>
        </div>

        <div
          className={`${fontSizeClass} leading-[2.8] sm:leading-[3.2] font-medium text-slate-800 dark:text-slate-100 text-left font-sans`}
          dir="ltr"
        >
          {tokens.map((token, tIdx) => {
            if (token.type === 'text') {
              if (renderAnnotatedText) {
                return <span key={tIdx} className="whitespace-pre-wrap">{renderAnnotatedText(token.content)}</span>;
              }
              return <QuestionRichRenderer key={tIdx} content={token.content} className="whitespace-pre-wrap" dir="ltr" />;
            }

            const blankIndex = token.blankIndex || 1;
            const currentAnswer = selectedAnswers[blankIndex];
            const blankConfig = effectiveBlanks.find(b => b.blankIndex === blankIndex);
            
            const isEvaluated = testedResults !== null || showCorrectAnswers || mode === 'review';
            const isCorrect = isEvaluated && blankConfig && currentAnswer?.trim().toLowerCase() === blankConfig.correctAnswer?.trim().toLowerCase();
            const isWrong = isEvaluated && currentAnswer && blankConfig && currentAnswer?.trim().toLowerCase() !== blankConfig.correctAnswer?.trim().toLowerCase();

            if (inputMode === 'dropdown') {
              return (
                <span
                  key={tIdx}
                  className="inline-block mx-1.5 align-middle"
                >
                  <span className="relative inline-flex items-center">
                    <span className="absolute -top-3.5 left-1 text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 px-1.5 rounded font-mono">
                      [{blankIndex}]
                    </span>
                    <select
                      value={currentAnswer || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val) handlePlaceWord(blankIndex, val);
                        else handleRemoveWord(blankIndex);
                      }}
                      className={`px-3 py-1.5 rounded-xl font-bold border-2 transition-all outline-none cursor-pointer font-sans ${optionFontSizeClass} ${
                        currentAnswer
                          ? isCorrect
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200'
                            : isWrong
                            ? 'bg-rose-50 border-rose-500 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200'
                            : 'bg-indigo-50 border-indigo-400 text-indigo-950 dark:bg-indigo-950/50 dark:border-indigo-600 dark:text-indigo-100'
                          : 'bg-white dark:bg-slate-900 border-dashed border-slate-300 dark:border-slate-700 text-slate-500 hover:border-indigo-400'
                      }`}
                    >
                      <option value="">-- Blank [{blankIndex}] --</option>
                      {words.map((w, i) => (
                        <option key={i} value={w}>
                          {w}
                        </option>
                      ))}
                    </select>
                  </span>
                </span>
              );
            }

            // Drag / Tap Mode
            return (
              <span
                key={tIdx}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDropOnBlank(e, blankIndex)}
                onClick={() => {
                  if (activeWordToPlace) {
                    handlePlaceWord(blankIndex, activeWordToPlace);
                  } else if (currentAnswer) {
                    handleRemoveWord(blankIndex);
                  }
                }}
                className={`inline-flex items-center justify-center mx-1 px-3 py-1 min-w-[110px] sm:min-w-[130px] h-9 rounded-xl border-2 transition-all align-middle cursor-pointer font-bold select-none font-sans ${optionFontSizeClass} ${
                  currentAnswer
                    ? isCorrect
                      ? 'bg-emerald-100/90 border-emerald-500 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200 ring-1 ring-emerald-400'
                      : isWrong
                      ? 'bg-rose-100/90 border-rose-500 text-rose-900 dark:bg-rose-950/60 dark:text-rose-200 ring-1 ring-rose-400'
                      : 'bg-indigo-100/90 border-indigo-400 text-indigo-950 dark:bg-indigo-950/60 dark:border-indigo-600 dark:text-indigo-200 shadow-sm'
                    : activeWordToPlace
                    ? 'bg-indigo-50 border-dashed border-indigo-400 text-indigo-600 dark:bg-indigo-950/40 animate-pulse'
                    : 'bg-white dark:bg-slate-900 border-dashed border-slate-300 dark:border-slate-700 text-slate-400 hover:border-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title={
                  currentAnswer
                    ? 'Click to remove word from this blank'
                    : activeWordToPlace
                    ? `Click to place "${activeWordToPlace}" here`
                    : `Blank [${blankIndex}] - Click or drag word here`
                }
              >
                {currentAnswer ? (
                  <span className="flex items-center gap-1.5 font-bold">
                    <span className="text-[10px] font-mono opacity-60">[{blankIndex}]</span>
                    <span>{currentAnswer}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveWord(blankIndex);
                      }}
                      className="text-slate-400 hover:text-rose-600 ml-1 text-xs"
                      title="Clear"
                    >
                      ×
                    </button>
                  </span>
                ) : (
                  <span className="text-[11px] font-black text-indigo-500/80 font-mono">
                    ( {blankIndex} )
                  </span>
                )}
              </span>
            );
          })}
        </div>
      </div>

      {/* Review Banner for Completed Solver / Teacher Preview */}
      {mode === 'preview' && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-violet-600" />
            <span className="text-xs font-black text-slate-800 dark:text-slate-200">
              معاينة المعلم التفاعلية
            </span>
            <span className="text-[11px] text-slate-500 font-bold">
              (جرب الحل كما يراه الطالب للتأكد من سهولة السؤال)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTestedResults(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all shadow-sm"
            >
              <Check className="w-4 h-4" />
              <span>فحص الإجابات وحساب الدرجة</span>
            </button>

            {testedResults && (
              <button
                type="button"
                onClick={() => setTestedResults(null)}
                className="px-3 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
              >
                إخفاء النتيجة
              </button>
            )}
          </div>
        </div>
      )}

      {/* Instant Test Results Banner */}
      {testedResults && (
        <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span className="text-sm font-black text-emerald-950 dark:text-emerald-200">
                نتيجة فحص الإجابات:
              </span>
            </div>
            <span className="text-xs font-black px-3 py-1 rounded-xl bg-emerald-600 text-white shadow-sm">
              الدرجة: {scoreInfo.correct} من {scoreInfo.total} ({scoreInfo.percentage}%)
            </span>
          </div>

          {/* Detailed answers review */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-2" dir="ltr">
            {effectiveBlanks.map(b => {
              const studentVal = selectedAnswers[b.blankIndex];
              const isMatch = studentVal?.trim().toLowerCase() === b.correctAnswer?.trim().toLowerCase();

              return (
                <div
                  key={b.blankIndex}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between font-sans ${
                    isMatch
                      ? 'bg-emerald-100/70 border-emerald-300 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200'
                      : 'bg-rose-100/70 border-rose-300 text-rose-900 dark:bg-rose-900/40 dark:text-rose-200'
                  }`}
                >
                  <div>
                    <span className="font-black">Blank [{b.blankIndex}]: </span>
                    <span>{studentVal || '(empty)'}</span>
                  </div>
                  {!isMatch && (
                    <span className="text-[10px] bg-emerald-700 text-white px-2 py-0.5 rounded-md font-black">
                      Correct: {b.correctAnswer}
                    </span>
                  )}
                  {isMatch && <Check className="w-4 h-4 text-emerald-700" />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Model Answer / Explanation */}
      {(showCorrectAnswers || testedResults) && question.explanation && (
        <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 text-left font-sans" dir="ltr">
          <span className="text-xs font-black text-blue-700 dark:text-blue-300 block mb-1">Teacher Explanation &amp; Notes:</span>
          <p className="text-xs font-bold text-blue-900 dark:text-blue-200">{question.explanation}</p>
        </div>
      )}

    </div>
  );
}
