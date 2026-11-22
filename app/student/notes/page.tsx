'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  PenTool,
  Plus,
  Edit3,
  Book,
  ChevronRight,
  ChevronLeft,
  Palette,
  Save,
  Trash2,
  Pin,
  PinOff,
  Search,
  Copy,
  Printer,
  Maximize2,
  Minimize2,
  CheckCircle2,
  AlertCircle,
  Layers,
  RotateCw,
  Shuffle,
  Check,
  X,
  FileText,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import RichTextEditor from '@/components/RichTextEditor';
import RichContentViewer from '@/components/RichContentViewer';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';
import UndoDeleteToast from '@/components/UndoDeleteToast';
import { useAuth } from '@/context/AuthContext';

type NoteCategory = 'general' | 'grammar' | 'vocab' | 'mistakes' | 'writing';
type NotePaperStyle = 'english' | 'ruled' | 'cream' | 'dots' | 'grid' | 'plain';

interface VocabCard {
  id: string;
  front: string;
  back: string;
  mastered?: boolean;
}

interface NotePage {
  id: string;
  title: string;
  content: string;
  color: string;
  accentHex?: string;
  icon: string;
  date: string;
  category?: NoteCategory;
  isPinned?: boolean;
  paperStyle?: NotePaperStyle;
  vocabCards?: VocabCard[];
  updatedAt?: string;
}

const NOTE_THEMES = [
  {
    id: 'amber',
    label: 'كهرماني دافئ',
    swatch: '#d97706',
    borderClass: 'border-amber-300 dark:border-amber-800/60',
    tintClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
    legacyValue:
      'bg-amber-100 dark:bg-amber-950/40 text-amber-950 dark:text-amber-100 border-amber-300 dark:border-amber-800/60',
  },
  {
    id: 'blue',
    label: 'أزرق سماوي',
    swatch: '#0284c7',
    borderClass: 'border-sky-300 dark:border-sky-800/60',
    tintClass: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
    legacyValue:
      'bg-blue-100 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 border-blue-300 dark:border-blue-800/60',
  },
  {
    id: 'emerald',
    label: 'أخضر زمردي',
    swatch: '#059669',
    borderClass: 'border-emerald-300 dark:border-emerald-800/60',
    tintClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    legacyValue:
      'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 border-emerald-300 dark:border-emerald-800/60',
  },
  {
    id: 'rose',
    label: 'وردي هادئ',
    swatch: '#e11d48',
    borderClass: 'border-rose-300 dark:border-rose-800/60',
    tintClass: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
    legacyValue:
      'bg-rose-100 dark:bg-rose-950/40 text-rose-950 dark:text-rose-100 border-rose-300 dark:border-rose-800/60',
  },
  {
    id: 'violet',
    label: 'بنفسجي ملكي',
    swatch: '#7c3aed',
    borderClass: 'border-violet-300 dark:border-violet-800/60',
    tintClass: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
    legacyValue:
      'bg-violet-100 dark:bg-violet-950/40 text-violet-950 dark:text-violet-100 border-violet-300 dark:border-violet-800/60',
  },
  {
    id: 'slate',
    label: 'رمادي كلاسيكي',
    swatch: '#475569',
    borderClass: 'border-slate-300 dark:border-slate-700',
    tintClass: 'bg-slate-500/10 text-slate-700 dark:text-slate-300',
    legacyValue:
      'bg-slate-100 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700',
  },
];

const CATEGORIES: { id: NoteCategory; label: string }[] = [
  { id: 'general', label: 'عام' },
  { id: 'grammar', label: 'قواعد Grammar' },
  { id: 'vocab', label: 'كلمات Vocab' },
  { id: 'mistakes', label: 'أخطاء شائعة' },
  { id: 'writing', label: 'تعبير ومقال' },
];

const PAPER_STYLES: { id: NotePaperStyle; label: string }[] = [
  { id: 'english', label: 'مسطر إنجليزي' },
  { id: 'ruled', label: 'مسطر عادي' },
  { id: 'cream', label: 'ورق دافئ' },
  { id: 'dots', label: 'نقطي' },
  { id: 'grid', label: 'مربعات' },
  { id: 'plain', label: 'أبيض نقي' },
];

const NOTE_ICONS = ['📝', '💡', '🇬🇧', '⭐', '🎯', '📚', '🧠', '✨', '🔥', '📌'];

const STUDY_LAYOUT_SNIPPETS: { id: string; label: string; html: string }[] = [
  {
    id: 'vocab_table',
    label: '+ جدول مفردات',
    html: `<table style="width:100%;border-collapse:collapse;margin:8px 0;"><thead><tr><th style="border:1px solid #cbd5e1;padding:6px 10px;text-align:right;">الكلمة / المصطلح</th><th style="border:1px solid #cbd5e1;padding:6px 10px;text-align:right;">المعنى</th><th style="border:1px solid #cbd5e1;padding:6px 10px;text-align:right;">مثال توضيحي</th></tr></thead><tbody><tr><td style="border:1px solid #cbd5e1;padding:6px 10px;">...</td><td style="border:1px solid #cbd5e1;padding:6px 10px;">...</td><td style="border:1px solid #cbd5e1;padding:6px 10px;">...</td></tr></tbody></table><p><br></p>`,
  },
  {
    id: 'grammar_box',
    label: '+ قاعدة ومثال',
    html: `<p><strong>📌 القاعدة الأساسية:</strong> اكتب شرح القاعدة هنا...</p><p><strong>✅ أمثلة تطبيقية:</strong></p><ul><li>مثال 1: ...</li><li>مثال 2: ...</li></ul><p><strong>💡 ملاحظة هامة:</strong> ...</p><p><br></p>`,
  },
  {
    id: 'mistake_compare',
    label: '+ خطأ وصواب',
    html: `<p><strong style="color:#dc2626;">❌ الخطأ الشائع:</strong> اكتب الجملة الخاطئة...</p><p><strong style="color:#16a34a;">✅ الصواب:</strong> اكتب التصحيح مع السبب...</p><p><br></p>`,
  },
  {
    id: 'checklist',
    label: '+ نقاط مراجعة',
    html: `<p><strong>🎯 نقاط مراجعة سريعة:</strong></p><ul><li>النقطة الأولى...</li><li>النقطة الثانية...</li></ul><p><br></p>`,
  },
];

function stripHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function countWords(html: string): number {
  const plain = stripHtml(html);
  if (!plain) return 0;
  return plain.split(/\s+/).filter(Boolean).length;
}

function getThemeByColor(colorVal?: string) {
  return (
    NOTE_THEMES.find((t) => t.legacyValue === colorVal || t.id === colorVal) ||
    NOTE_THEMES[0]
  );
}

export default function StudentNotesPage() {
  const { currentUser } = useAuth();
  const storageKey = `mr_radwan_student_notes_${currentUser?.id || 'guest'}`;

  // ZERO-STATE ENFORCED: starts completely empty, no fake mock notes!
  const [pages, setPages] = useState<NotePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNoteId, setSelectedNoteId] = useState<string>('');

  // Index Filters & Focus Mode
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'pinned' | NoteCategory>('all');
  const [isFocusMode, setIsFocusMode] = useState(false);

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editColor, setEditColor] = useState(NOTE_THEMES[0].legacyValue);
  const [editIcon, setEditIcon] = useState('📝');
  const [editCategory, setEditCategory] = useState<NoteCategory>('general');
  const [editPaperStyle, setEditPaperStyle] = useState<NotePaperStyle>('english');
  const [validationError, setValidationError] = useState('');

  // Flashcards State inside active note
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [cardFrontInput, setCardFrontInput] = useState('');
  const [cardBackInput, setCardBackInput] = useState('');
  const [flippedCardIds, setFlippedCardIds] = useState<Record<string, boolean>>({});

  // Deletion & 5-Second Undo State
  const [itemToDelete, setItemToDelete] = useState<NotePage | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [pendingDeletedItem, setPendingDeletedItem] = useState<{ item: NotePage; index: number } | null>(null);
  const [isUndoToastOpen, setIsUndoToastOpen] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState('');

  const showNotice = (msg: string) => {
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(''), 3000);
  };

  // Load notes from user-scoped localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setPages(parsed);
          if (parsed.length > 0) {
            setSelectedNoteId(parsed[0].id);
          }
          return;
        }
      }
      setPages([]);
    } catch (e) {
      console.warn('Could not read stored notes:', e);
    } finally {
      setLoading(false);
    }
  }, [storageKey]);

  // Save notes to user-scoped localStorage
  const persistPages = (newPages: NotePage[]) => {
    setPages(newPages);
    try {
      localStorage.setItem(storageKey, JSON.stringify(newPages));
    } catch (e) {
      console.warn('Could not persist notes:', e);
    }
  };

  // Sorted & Filtered Index List (Pinned first)
  const filteredPages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...pages]
      .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return 0;
      })
      .filter((p) => {
        if (categoryFilter === 'pinned' && !p.isPinned) return false;
        if (
          categoryFilter !== 'all' &&
          categoryFilter !== 'pinned' &&
          (p.category || 'general') !== categoryFilter
        ) {
          return false;
        }
        if (!q) return true;
        const inTitle = p.title.toLowerCase().includes(q);
        const inBody = stripHtml(p.content).toLowerCase().includes(q);
        const inCards = (p.vocabCards || []).some(
          (c) => c.front.toLowerCase().includes(q) || c.back.toLowerCase().includes(q)
        );
        return inTitle || inBody || inCards;
      });
  }, [pages, searchQuery, categoryFilter]);

  const currentPageIndex = useMemo(() => {
    const idx = filteredPages.findIndex((p) => p.id === selectedNoteId);
    return idx >= 0 ? idx : 0;
  }, [filteredPages, selectedNoteId]);

  const currentPage = useMemo(() => {
    return (
      pages.find((p) => p.id === selectedNoteId) ||
      filteredPages[0] ||
      pages[0] ||
      null
    );
  }, [pages, filteredPages, selectedNoteId]);

  const totalWordsAcrossNotebook = useMemo(
    () => pages.reduce((sum, p) => sum + countWords(p.content), 0),
    [pages]
  );

  const handleNext = () => {
    if (currentPageIndex < filteredPages.length - 1) {
      setSelectedNoteId(filteredPages[currentPageIndex + 1].id);
      setFlippedCardIds({});
    }
  };

  const handlePrev = () => {
    if (currentPageIndex > 0) {
      setSelectedNoteId(filteredPages[currentPageIndex - 1].id);
      setFlippedCardIds({});
    }
  };

  const startNewPage = () => {
    setEditTitle('');
    setEditContent('');
    setEditColor(NOTE_THEMES[0].legacyValue);
    setEditIcon('📝');
    setEditCategory('general');
    setEditPaperStyle('english');
    setValidationError('');
    setIsCreatingNew(true);
    setIsEditing(true);
  };

  const editCurrentPage = () => {
    if (!currentPage) return;
    setEditTitle(currentPage.title);
    setEditContent(currentPage.content);
    setEditColor(currentPage.color || NOTE_THEMES[0].legacyValue);
    setEditIcon(currentPage.icon || '📝');
    setEditCategory(currentPage.category || 'general');
    setEditPaperStyle(currentPage.paperStyle || 'english');
    setValidationError('');
    setIsCreatingNew(false);
    setIsEditing(true);
  };

  const handleInsertSnippet = (snippetHtml: string) => {
    setEditContent((prev) => `${prev || ''}${snippetHtml}`);
  };

  const savePage = () => {
    if (!editTitle.trim()) {
      setValidationError('يرجى كتابة عنوان للملاحظة أولاً قبل الحفظ');
      return;
    }
    setValidationError('');
    const themeObj = getThemeByColor(editColor);

    if (!isCreatingNew && currentPage) {
      const updated = pages.map((p) =>
        p.id === currentPage.id
          ? {
              ...p,
              title: editTitle.trim(),
              content: editContent,
              color: editColor,
              accentHex: themeObj.swatch,
              icon: editIcon,
              category: editCategory,
              paperStyle: editPaperStyle,
              updatedAt: new Date().toISOString(),
            }
          : p
      );
      persistPages(updated);
      setSelectedNoteId(currentPage.id);
      showNotice('تم حفظ تعديلات الملاحظة بنجاح');
    } else {
      const newPage: NotePage = {
        id: 'note_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        title: editTitle.trim(),
        content: editContent,
        color: editColor,
        accentHex: themeObj.swatch,
        icon: editIcon,
        category: editCategory,
        paperStyle: editPaperStyle,
        isPinned: false,
        vocabCards: [],
        date: new Date().toLocaleDateString('ar-EG', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
        updatedAt: new Date().toISOString(),
      };
      const updated = [newPage, ...pages];
      persistPages(updated);
      setSelectedNoteId(newPage.id);
      showNotice('تمت إضافة الصفحة الجديدة إلى مفكرتك بنجاح');
    }

    setIsEditing(false);
    setIsCreatingNew(false);
  };

  const handleTogglePin = (noteId: string) => {
    const updated = pages.map((p) =>
      p.id === noteId ? { ...p, isPinned: !p.isPinned } : p
    );
    persistPages(updated);
  };

  const handleChangePaperStyleLive = (style: NotePaperStyle) => {
    if (!currentPage) return;
    const updated = pages.map((p) =>
      p.id === currentPage.id ? { ...p, paperStyle: style } : p
    );
    persistPages(updated);
  };

  const handleDuplicateCurrentPage = () => {
    if (!currentPage) return;
    const clone: NotePage = {
      ...currentPage,
      id: 'note_' + Date.now() + '_copy',
      title: `${currentPage.title} (نسخة)`,
      isPinned: false,
      date: new Date().toLocaleDateString('ar-EG', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      updatedAt: new Date().toISOString(),
    };
    const updated = [clone, ...pages];
    persistPages(updated);
    setSelectedNoteId(clone.id);
    showNotice('تم نسخ صفحة الملاحظة بنجاح');
  };

  // Flashcards inside a note
  const handleAddVocabCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPage || !cardFrontInput.trim() || !cardBackInput.trim()) return;
    const newCard: VocabCard = {
      id: 'fc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
      front: cardFrontInput.trim(),
      back: cardBackInput.trim(),
      mastered: false,
    };
    const updated = pages.map((p) =>
      p.id === currentPage.id
        ? { ...p, vocabCards: [...(p.vocabCards || []), newCard] }
        : p
    );
    persistPages(updated);
    setCardFrontInput('');
    setCardBackInput('');
    setIsAddingCard(false);
  };

  const handleToggleCardMastered = (cardId: string) => {
    if (!currentPage) return;
    const updated = pages.map((p) =>
      p.id === currentPage.id
        ? {
            ...p,
            vocabCards: (p.vocabCards || []).map((c) =>
              c.id === cardId ? { ...c, mastered: !c.mastered } : c
            ),
          }
        : p
    );
    persistPages(updated);
  };

  const handleDeleteVocabCard = (cardId: string) => {
    if (!currentPage) return;
    const updated = pages.map((p) =>
      p.id === currentPage.id
        ? {
            ...p,
            vocabCards: (p.vocabCards || []).filter((c) => c.id !== cardId),
          }
        : p
    );
    persistPages(updated);
  };

  const handleShuffleCards = () => {
    if (!currentPage || !currentPage.vocabCards || currentPage.vocabCards.length < 2) return;
    const shuffled = [...currentPage.vocabCards];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const updated = pages.map((p) =>
      p.id === currentPage.id ? { ...p, vocabCards: shuffled } : p
    );
    persistPages(updated);
    setFlippedCardIds({});
  };

  // Step 1: Open Confirmation Modal
  const requestDeletePage = () => {
    if (!currentPage) return;
    setItemToDelete(currentPage);
    setIsDeleteModalOpen(true);
  };

  // Step 2: Confirm Delete -> Trigger 5-Second Undo Toast
  const handleConfirmDelete = () => {
    if (!itemToDelete) return;
    const target = itemToDelete;
    const originalIndex = pages.findIndex((p) => p.id === target.id);
    setIsDeleteModalOpen(false);
    setItemToDelete(null);

    const updated = pages.filter((p) => p.id !== target.id);
    persistPages(updated);
    if (updated.length > 0) {
      setSelectedNoteId(updated[Math.min(originalIndex, updated.length - 1)].id);
    } else {
      setSelectedNoteId('');
    }

    setPendingDeletedItem({ item: target, index: originalIndex });
    setIsUndoToastOpen(true);
  };

  // Step 3: Undo deletion within 5 seconds
  const handleUndoDelete = () => {
    if (!pendingDeletedItem) return;
    const { item, index } = pendingDeletedItem;

    const restored = [...pages];
    restored.splice(Math.min(index, restored.length), 0, item);
    persistPages(restored);
    setSelectedNoteId(item.id);

    setPendingDeletedItem(null);
    setIsUndoToastOpen(false);
    showNotice('تم التراجع عن حذف الملاحظة بنجاح');
  };

  const handlePermanentDeleteExpire = () => {
    setPendingDeletedItem(null);
    setIsUndoToastOpen(false);
    showNotice('تم حذف الملاحظة نهائياً من دفترك');
  };

  const activePaper = isEditing
    ? editPaperStyle
    : currentPage?.paperStyle || 'english';
  const activeTheme = getThemeByColor(
    isEditing ? editColor : currentPage?.color
  );
  const currentCards = currentPage?.vocabCards || [];
  const masteredCardsCount = currentCards.filter((c) => c.mastered).length;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto flex flex-col gap-6" dir="rtl">
      {/* Header */}
      <div className="no-print flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <span>مفكرة ملاحظاتي</span>
            <PenTool className="w-6 h-6 text-amber-500" />
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">
            دفتر منظم لتدوين القواعد، المفردات، الأخطاء الشائعة، وبطاقات الحفظ السريعة.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {pages.length > 0 && !isEditing && (
            <>
              <button
                type="button"
                onClick={() => setIsFocusMode((f) => !f)}
                className="px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-500/60 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                {isFocusMode ? (
                  <>
                    <Minimize2 className="w-4 h-4 text-amber-500" />
                    <span>إظهار الفهرس</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-4 h-4 text-amber-500" />
                    <span>وضع القراءة الهادئة</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <Printer className="w-4 h-4 text-slate-500" />
                <span>طباعة الصفحة</span>
              </button>
            </>
          )}

          {!isEditing && (
            <button
              type="button"
              onClick={startNewPage}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center gap-2 transition-transform active:scale-95 shadow-sm whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>صفحة جديدة</span>
            </button>
          )}
        </div>
      </div>

      {/* Notification Banner */}
      {notificationMsg && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="no-print p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm font-black flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{notificationMsg}</span>
        </motion.div>
      )}

      {/* Main Content */}
      {loading ? (
        <div className="min-h-[420px] flex items-center justify-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : pages.length === 0 && !isEditing ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 md:p-16 text-center space-y-5">
          <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto">
            <Book className="w-10 h-10" />
          </div>
          <div className="space-y-2 max-w-md mx-auto">
            <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">
              دفتر ملاحظاتك جاهز لأول صفحة
            </h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm leading-relaxed">
              دوّن ملخصات القواعد، قوائم الكلمات الصعبة، وأضف بطاقات حفظ لتختبر نفسك في أي وقت.
            </p>
          </div>
          <button
            type="button"
            onClick={startNewPage}
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 px-6 py-3 rounded-xl font-black text-sm transition-transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة أول صفحة ملاحظات</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Smart Index Sidebar */}
          {!isFocusMode && (
            <aside className="no-print lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 space-y-4">
              {/* Search Box */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث في العناوين أو الكلمات..."
                  className="w-full pr-10 pl-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Category Filter Buttons */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'all', label: 'الكل' },
                  { id: 'pinned', label: 'المثبتة' },
                  ...CATEGORIES.map((c) => ({ id: c.id, label: c.label.split(' ')[0] })),
                ].map((tab) => {
                  const active = categoryFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() =>
                        setCategoryFilter(tab.id as 'all' | 'pinned' | NoteCategory)
                      }
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black transition-colors whitespace-nowrap ${
                        active
                          ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Quiet Tabular Summary Line */}
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 px-1 tabular-nums border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <span>{filteredPages.length} صفحة</span>
                <span>{totalWordsAcrossNotebook} كلمة إجمالاً</span>
              </div>

              {/* Notes Index List */}
              <div className="space-y-2 max-h-[520px] overflow-y-auto custom-scrollbar pl-1">
                {filteredPages.length === 0 ? (
                  <div className="text-center py-8 text-xs font-bold text-slate-400">
                    لا توجد ملاحظات تطابق البحث الحالي
                  </div>
                ) : (
                  filteredPages.map((note) => {
                    const isActive = currentPage?.id === note.id && !isCreatingNew;
                    const theme = getThemeByColor(note.color);
                    const catLabel =
                      CATEGORIES.find((c) => c.id === (note.category || 'general'))
                        ?.label.split(' ')[0] || 'عام';
                    const words = countWords(note.content);
                    const cardsLen = note.vocabCards?.length || 0;

                    return (
                      <div
                        key={note.id}
                        className={`rounded-2xl border p-3 transition-all cursor-pointer flex items-start justify-between gap-2.5 ${
                          isActive
                            ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-400 dark:border-amber-700'
                            : 'bg-slate-50/60 dark:bg-slate-950/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                        onClick={() => {
                          setSelectedNoteId(note.id);
                          setIsEditing(false);
                          setIsCreatingNew(false);
                          setFlippedCardIds({});
                        }}
                      >
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          <span
                            className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0"
                            style={{ backgroundColor: note.accentHex || theme.swatch }}
                            aria-hidden="true"
                          />
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-base leading-none shrink-0">
                                {note.icon || '📝'}
                              </span>
                              <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                                {note.title}
                              </h3>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 tabular-nums">
                              <span>{catLabel}</span>
                              <span aria-hidden="true">·</span>
                              <span>{words} كلمة</span>
                              {cardsLen > 0 && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span>{cardsLen} بطاقة</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTogglePin(note.id);
                          }}
                          title={note.isPinned ? 'إلغاء التثبيت' : 'تثبيت في الأعلى'}
                          className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                            note.isPinned
                              ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10'
                              : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                          }`}
                        >
                          {note.isPinned ? (
                            <Pin className="w-3.5 h-3.5" />
                          ) : (
                            <PinOff className="w-3.5 h-3.5 opacity-60" />
                          )}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </aside>
          )}

          {/* Open Notebook Page Canvas */}
          <section
            id="student-notes-printable"
            className={`${
              isFocusMode ? 'lg:col-span-12 max-w-4xl mx-auto w-full' : 'lg:col-span-8'
            }`}
          >
            <div
              className={`rounded-3xl border ${activeTheme.borderClass} mm-paper-${activePaper} shadow-sm relative overflow-hidden transition-colors duration-300`}
            >
              {/* Top Theme Color Bar */}
              <div
                className="h-1.5 w-full"
                style={{ backgroundColor: activeTheme.swatch }}
              />

              {/* Subtle Physical Binder Rings */}
              <div className="hidden sm:flex absolute left-0 top-1.5 bottom-0 w-7 border-r border-slate-200/70 dark:border-slate-800/80 flex-col justify-evenly py-10 z-10 pointer-events-none">
                {[...Array(7)].map((_, i) => (
                  <div
                    key={i}
                    className="w-5 h-3.5 bg-slate-200 dark:bg-slate-800 rounded-r-full border-y border-r border-slate-300 dark:border-slate-700 -ml-0.5"
                  />
                ))}
              </div>

              <div className="sm:ml-7 p-5 sm:p-8 min-h-[540px] flex flex-col justify-between relative z-10">
                {isEditing ? (
                  /* EDITING / CREATING MODE */
                  <div className="space-y-5">
                    {validationError && (
                      <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-black flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{validationError}</span>
                      </div>
                    )}

                    {/* Title & Emoji */}
                    <div className="space-y-3 pb-4 border-b border-slate-200/80 dark:border-slate-800">
                      <div className="flex flex-wrap gap-1.5">
                        {NOTE_ICONS.map((ic) => (
                          <button
                            key={ic}
                            type="button"
                            onClick={() => setEditIcon(ic)}
                            className={`w-8 h-8 rounded-xl text-base flex items-center justify-center transition-transform ${
                              editIcon === ic
                                ? 'bg-amber-500/20 ring-2 ring-amber-500 scale-105'
                                : 'bg-white/80 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 hover:scale-105'
                            }`}
                          >
                            {ic}
                          </button>
                        ))}
                      </div>

                      <input
                        type="text"
                        required
                        placeholder="عنوان الصفحة (مثال: قواعد الأزمنة المركبة أو كلمات الوحدة الثالثة)..."
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full text-xl md:text-2xl font-black bg-transparent border-b-2 border-slate-300 dark:border-slate-700 focus:border-amber-500 outline-none pb-2 text-slate-900 dark:text-white placeholder:text-slate-400"
                      />
                    </div>

                    {/* Category, Theme Color & Paper Texture */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                      <div className="space-y-2">
                        <span className="text-xs font-black text-slate-700 dark:text-slate-300 block">
                          تصنيف الصفحة:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {CATEGORIES.map((cat) => (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => setEditCategory(cat.id)}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                editCategory === cat.id
                                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              {cat.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <Palette className="w-3.5 h-3.5 text-amber-500" />
                            <span>لون الصفحة ونوع الورق:</span>
                          </span>
                          <div className="flex items-center gap-1.5">
                            {NOTE_THEMES.map((t) => (
                              <button
                                key={t.id}
                                type="button"
                                title={t.label}
                                onClick={() => setEditColor(t.legacyValue)}
                                className={`w-5 h-5 rounded-full border-2 transition-transform ${
                                  editColor === t.legacyValue
                                    ? 'scale-125 border-slate-900 dark:border-white'
                                    : 'border-transparent'
                                }`}
                                style={{ backgroundColor: t.swatch }}
                              />
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {PAPER_STYLES.map((ps) => (
                            <button
                              key={ps.id}
                              type="button"
                              onClick={() => setEditPaperStyle(ps.id)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                                editPaperStyle === ps.id
                                  ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              {ps.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Blank Layout Inserters */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                        أدوات تنظيم جاهزة للإدراج داخل الصفحة (اختياري):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {STUDY_LAYOUT_SNIPPETS.map((sn) => (
                          <button
                            key={sn.id}
                            type="button"
                            onClick={() => handleInsertSnippet(sn.html)}
                            className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-amber-500 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors"
                          >
                            {sn.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Rich Text Editor */}
                    <RichTextEditor
                      value={editContent}
                      onChange={setEditContent}
                      placeholder="ابدأ بتدوين القاعدة أو الكلمات أو ملخص الدرس هنا..."
                      minHeight="min-h-[240px]"
                      showStickers={true}
                      showAnimations={true}
                    />

                    {/* Edit Footer Actions */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200/80 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditing(false);
                          setIsCreatingNew(false);
                        }}
                        className="px-5 py-2.5 rounded-xl font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs transition-colors"
                      >
                        إلغاء
                      </button>
                      <button
                        type="button"
                        onClick={savePage}
                        className="px-6 py-2.5 rounded-xl font-black bg-amber-500 hover:bg-amber-600 text-slate-950 transition-transform active:scale-95 flex items-center gap-2 text-xs shadow-sm"
                      >
                        <Save className="w-4 h-4" />
                        <span>حفظ الصفحة</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* VIEW MODE */
                  currentPage && (
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentPage.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.16 }}
                        className="flex flex-col flex-1 justify-between gap-8"
                      >
                        <div className="space-y-6">
                          {/* Note Header */}
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
                            <div className="space-y-1.5 min-w-0">
                              <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2.5 flex-wrap">
                                <span className="text-2xl sm:text-3xl shrink-0">
                                  {currentPage.icon || '📝'}
                                </span>
                                <span className="break-words">{currentPage.title}</span>
                              </h2>
                              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums">
                                <span>
                                  {CATEGORIES.find(
                                    (c) => c.id === (currentPage.category || 'general')
                                  )?.label || 'عام'}
                                </span>
                                <span aria-hidden="true">·</span>
                                <span>{currentPage.date}</span>
                                <span aria-hidden="true">·</span>
                                <span>{countWords(currentPage.content)} كلمة</span>
                                {currentPage.isPinned && (
                                  <>
                                    <span aria-hidden="true">·</span>
                                    <span className="text-amber-600 dark:text-amber-400 font-bold">
                                      مثبتة
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Sheet Toolbar Actions */}
                            <div className="no-print flex flex-wrap items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleTogglePin(currentPage.id)}
                                title={currentPage.isPinned ? 'إلغاء التثبيت' : 'تثبيت الصفحة'}
                                className={`p-2 rounded-xl border text-xs font-bold transition-colors ${
                                  currentPage.isPinned
                                    ? 'bg-amber-500/15 border-amber-400 text-amber-700 dark:text-amber-300'
                                    : 'bg-white/90 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-amber-400'
                                }`}
                              >
                                <Pin className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={handleDuplicateCurrentPage}
                                title="نسخ هذه الصفحة"
                                className="p-2 rounded-xl bg-white/90 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-400 transition-colors"
                              >
                                <Copy className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={editCurrentPage}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/90 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-slate-800 dark:text-white font-bold text-xs transition-colors"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-blue-500" />
                                <span>تعديل</span>
                              </button>

                              <button
                                type="button"
                                onClick={requestDeletePage}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 font-bold text-xs transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>حذف</span>
                              </button>
                            </div>
                          </div>

                          {/* Live Quick Paper Switcher */}
                          <div className="no-print flex flex-wrap items-center justify-between gap-2 text-[11px]">
                            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-bold">
                              <FileText className="w-3.5 h-3.5" />
                              <span>خلفية الورقة:</span>
                              {PAPER_STYLES.map((ps) => (
                                <button
                                  key={ps.id}
                                  type="button"
                                  onClick={() => handleChangePaperStyleLive(ps.id)}
                                  className={`px-2 py-0.5 rounded-md transition-colors whitespace-nowrap ${
                                    activePaper === ps.id
                                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black'
                                      : 'hover:bg-slate-200/70 dark:hover:bg-slate-800'
                                  }`}
                                >
                                  {ps.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Rich Note Content */}
                          <div className="leading-relaxed text-base md:text-lg text-slate-900 dark:text-slate-100">
                            {stripHtml(currentPage.content) ? (
                              <RichContentViewer content={currentPage.content} />
                            ) : (
                              <p className="text-sm text-slate-400 italic">
                                هذه الصفحة لا تحتوي على نص بعد — اضغط على «تعديل» للبدء بالكتابة.
                              </p>
                            )}
                          </div>

                          {/* Quick Recall Flashcards Section inside this note */}
                          <div className="pt-6 border-t border-dashed border-slate-300 dark:border-slate-700 space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                                  <Layers className="w-4 h-4 text-amber-500" />
                                  <span>بطاقات المراجعة السريعة لهذه الصفحة</span>
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                                  {currentCards.length === 0
                                    ? 'أضف كلمات أو أسئلة قصيرة لتختبر نفسك بقلب البطاقة'
                                    : `أتقنت ${masteredCardsCount} من ${currentCards.length} بطاقة`}
                                </p>
                              </div>

                              <div className="no-print flex items-center gap-2">
                                {currentCards.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={handleShuffleCards}
                                    className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1 hover:border-amber-500"
                                  >
                                    <Shuffle className="w-3.5 h-3.5" />
                                    <span>خلط</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setIsAddingCard((v) => !v)}
                                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black flex items-center gap-1"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>إضافة بطاقة</span>
                                </button>
                              </div>
                            </div>

                            {/* Inline Add Flashcard Form */}
                            {isAddingCard && (
                              <form
                                onSubmit={handleAddVocabCard}
                                className="no-print p-4 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
                              >
                                <div className="sm:col-span-5 space-y-1">
                                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                                    الوجه الأول (الكلمة / السؤال)
                                  </label>
                                  <input
                                    type="text"
                                    required
                                    value={cardFrontInput}
                                    onChange={(e) => setCardFrontInput(e.target.value)}
                                    placeholder="مثال: Persist in"
                                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                                  />
                                </div>
                                <div className="sm:col-span-5 space-y-1">
                                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                                    الوجه الخلفي (المعنى / الإجابة)
                                  </label>
                                  <input
                                    type="text"
                                    required
                                    value={cardBackInput}
                                    onChange={(e) => setCardBackInput(e.target.value)}
                                    placeholder="مثال: يثابر على / يصر على"
                                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                                  />
                                </div>
                                <div className="sm:col-span-2 flex items-center gap-1.5">
                                  <button
                                    type="submit"
                                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center justify-center"
                                    title="حفظ البطاقة"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setIsAddingCard(false)}
                                    className="py-2 px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500"
                                    title="إلغاء"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              </form>
                            )}

                            {/* Interactive Flip Cards Grid */}
                            {currentCards.length > 0 && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {currentCards.map((card) => {
                                  const isFlipped = Boolean(flippedCardIds[card.id]);
                                  return (
                                    <div
                                      key={card.id}
                                      onClick={() =>
                                        setFlippedCardIds((prev) => ({
                                          ...prev,
                                          [card.id]: !prev[card.id],
                                        }))
                                      }
                                      className={`cursor-pointer rounded-2xl border p-4 transition-all select-none flex flex-col justify-between gap-3 ${
                                        isFlipped
                                          ? 'bg-slate-900 dark:bg-slate-800 text-white border-slate-800'
                                          : card.mastered
                                          ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                                          : 'bg-white/95 dark:bg-slate-900/95 border-slate-200 dark:border-slate-800 hover:border-amber-400'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between gap-2 text-[10px] font-bold opacity-70">
                                        <span>
                                          {isFlipped ? 'الإجابة / المعنى' : 'اضغط لقلب البطاقة'}
                                        </span>
                                        <RotateCw className="w-3 h-3" />
                                      </div>

                                      <div className="text-sm sm:text-base font-black text-center py-2 break-words">
                                        {isFlipped ? card.back : card.front}
                                      </div>

                                      <div
                                        className="no-print flex items-center justify-between pt-2 border-t border-current/10"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <button
                                          type="button"
                                          onClick={() => handleToggleCardMastered(card.id)}
                                          className={`text-[11px] font-black flex items-center gap-1 ${
                                            card.mastered
                                              ? 'text-emerald-500'
                                              : isFlipped
                                              ? 'text-slate-300 hover:text-emerald-400'
                                              : 'text-slate-500 hover:text-emerald-600'
                                          }`}
                                        >
                                          <CheckCircle2 className="w-3.5 h-3.5" />
                                          <span>{card.mastered ? 'تم الإتقان' : 'حدّد كمتقن'}</span>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => handleDeleteVocabCard(card.id)}
                                          className="text-slate-400 hover:text-rose-500 p-1"
                                          title="حذف البطاقة"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Notebook Footer Pagination */}
                        <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                          <span>مفكرة مستر محمد رضوان</span>
                          <div className="no-print flex items-center gap-2 tabular-nums">
                            <button
                              type="button"
                              onClick={handlePrev}
                              disabled={currentPageIndex === 0}
                              className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 disabled:opacity-35 hover:border-amber-500 transition-colors"
                              title="الصفحة السابقة"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                            <span>
                              صفحة {currentPageIndex + 1} من {Math.max(1, filteredPages.length)}
                            </span>
                            <button
                              type="button"
                              onClick={handleNext}
                              disabled={currentPageIndex >= filteredPages.length - 1}
                              className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 disabled:opacity-35 hover:border-amber-500 transition-colors"
                              title="الصفحة التالية"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  )
                )}
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setItemToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="تأكيد حذف صفحة الملاحظات"
        itemType="الملاحظة"
        itemName={itemToDelete?.title || ''}
        warningNote="سيتم إزالة الصفحة من دفترك، ويمكنك التراجع خلال 5 ثوانٍ قبل الحذف النهائي."
      />

      {/* 5-Second Undo Toast */}
      <UndoDeleteToast
        isOpen={isUndoToastOpen}
        itemName={pendingDeletedItem?.item.title || 'صفحة الملاحظات'}
        durationSeconds={5}
        onUndo={handleUndoDelete}
        onExpire={handlePermanentDeleteExpire}
        onDismiss={handlePermanentDeleteExpire}
      />
    </div>
  );
}
