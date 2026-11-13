'use client';

import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import {
  Plus,
  Printer,
  Trash2,
  Edit3,
  Maximize2,
  Minimize2,
  Layers,
  Type,
  FileText,
  Copy,
  Check,
  X,
  BookOpen,
  SlidersHorizontal,
  Shapes,
  CheckSquare,
  Square,
  PenTool,
  Calendar,
  User,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';
import {
  ACADEMIC_TRACKS,
  EMOJI_PICKER_LIST,
  MIND_MAP_FONTS,
  MindMapBranchItem,
  MindMapDocument,
  MindMapPaperStyle,
  MindMapScope,
  MindMapShape,
  MindMapSubjectNode,
  SUBJECT_PALETTES,
  getPaletteById,
} from './mindMapCatalog';
import { SubjectNodeCard } from './MindMapBranchRenderer';
import BranchItemEditorModal from './BranchItemEditorModal';
import MindMapShapesGallery, {
  MIND_MAP_SHAPE_ITEMS,
} from './MindMapShapesGallery';

interface SvgConnectorPath {
  id: string;
  d: string;
  sketchD: string;
  straightD: string;
  color: string;
  dotX: number;
  dotY: number;
}

const SCOPE_LABELS: Record<MindMapScope, string> = {
  daily: 'خطة يومية',
  weekly: 'خطة أسبوعية',
  monthly: 'خطة شهرية',
};

const PAPER_LABELS: { id: MindMapPaperStyle; label: string }[] = [
  { id: 'cream', label: 'ورق كراسة دافئ' },
  { id: 'grid', label: 'مربعات رسم بياني' },
  { id: 'ruled', label: 'سطور دفتر' },
  { id: 'dots', label: 'نقاط نقطية' },
  { id: 'plain', label: 'أبيض ناصع' },
];

function createBlankDocument(studentName: string, title?: string): MindMapDocument {
  return {
    id: 'mm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    title: title || 'خطتي للمذاكرة',
    studentName: studentName || 'طالب المنصة',
    scope: 'weekly',
    trackId: 'science_bio',
    shape: 'sketchbook',
    fontId: 'marhey_caveat',
    paper: 'cream',
    motto: 'خطوة صغيرة كل يوم .. تصنع فرقًا كبيرًا',
    showCheckboxesInPrint: true,
    subjects: [],
    updatedAt: new Date().toISOString(),
  };
}

export default function MindMapCreator() {
  const { currentUser } = useAuth();
  const userId = currentUser?.id || 'guest';
  const storageKey = `mr_radwan_mind_maps_v2_${userId}`;
  const studentDefaultName = currentUser?.fullName || 'طالب المنصة';

  const [documents, setDocuments] = useState<MindMapDocument[]>([]);
  const [activeDocId, setActiveDocId] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);

  // Studio Drawer Tabs
  const [activeStudioPanel, setActiveStudioPanel] = useState<
    'none' | 'tracks' | 'fonts' | 'paper'
  >('none');

  // Modals & Popovers
  const [isShapesGalleryOpen, setIsShapesGalleryOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // Add / Edit Subject Modal
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<MindMapSubjectNode | null>(
    null
  );
  const [subjNameInput, setSubjNameInput] = useState('');
  const [subjEmojiInput, setSubjEmojiInput] = useState('📘');
  const [subjColorInput, setSubjColorInput] = useState('sky');

  // New Map Modal
  const [isNewMapModalOpen, setIsNewMapModalOpen] = useState(false);
  const [newMapTitleInput, setNewMapTitleInput] = useState('');

  // Branch Item Style Modal
  const [stylerTarget, setStylerTarget] = useState<{
    subjectId: string;
    subjectName: string;
    item: MindMapBranchItem;
  } | null>(null);

  // Delete Confirmation State (zero browser confirm())
  const [deleteTarget, setDeleteTarget] = useState<
    | { type: 'map'; doc: MindMapDocument }
    | { type: 'subject'; subject: MindMapSubjectNode }
    | null
  >(null);

  // DOM Refs for Dynamic SVG Connectors
  const workspaceWrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const centerHubRef = useRef<HTMLDivElement>(null);
  const cardRefsMap = useRef<Record<string, HTMLDivElement | null>>({});
  const [connectors, setConnectors] = useState<SvgConnectorPath[]>([]);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3200);
  }, []);

  // Load saved maps for this specific student
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setDocuments(parsed);
          setActiveDocId(parsed[0].id);
          setIsLoaded(true);
          return;
        }
      }
      const starter = createBlankDocument(studentDefaultName);
      setDocuments([starter]);
      setActiveDocId(starter.id);
      localStorage.setItem(storageKey, JSON.stringify([starter]));
    } catch {
      const starter = createBlankDocument(studentDefaultName);
      setDocuments([starter]);
      setActiveDocId(starter.id);
    } finally {
      setIsLoaded(true);
    }
  }, [storageKey, studentDefaultName]);

  // Persist helper
  const saveDocuments = useCallback(
    (nextDocs: MindMapDocument[]) => {
      setDocuments(nextDocs);
      try {
        localStorage.setItem(storageKey, JSON.stringify(nextDocs));
      } catch (e) {
        console.warn('Failed to save mind maps:', e);
      }
    },
    [storageKey]
  );

  const activeDoc = useMemo(
    () => documents.find((d) => d.id === activeDocId) || documents[0] || null,
    [documents, activeDocId]
  );

  // Sync student name if still placeholder when user loads
  useEffect(() => {
    if (
      isLoaded &&
      activeDoc &&
      currentUser?.fullName &&
      activeDoc.studentName === 'طالب المنصة'
    ) {
      const updated = documents.map((d) =>
        d.studentName === 'طالب المنصة'
          ? { ...d, studentName: currentUser.fullName }
          : d
      );
      saveDocuments(updated);
    }
  }, [isLoaded, activeDoc, currentUser?.fullName, documents, saveDocuments]);

  const updateActiveDoc = useCallback(
    (updater: (doc: MindMapDocument) => MindMapDocument) => {
      if (!activeDoc) return;
      const next = documents.map((d) =>
        d.id === activeDoc.id
          ? { ...updater(d), updatedAt: new Date().toISOString() }
          : d
      );
      saveDocuments(next);
    },
    [activeDoc, documents, saveDocuments]
  );

  // Split subjects symmetrically into Right Column and Left Column for balanced radial tree
  const { rightSubjects, leftSubjects } = useMemo(() => {
    if (!activeDoc) return { rightSubjects: [], leftSubjects: [] };
    const right: MindMapSubjectNode[] = [];
    const left: MindMapSubjectNode[] = [];
    activeDoc.subjects.forEach((s, idx) => {
      if (idx % 2 === 0) right.push(s);
      else left.push(s);
    });
    return { rightSubjects: right, leftSubjects: left };
  }, [activeDoc]);

  const registerCardRef = useCallback(
    (subjectId: string, el: HTMLDivElement | null) => {
      if (el) cardRefsMap.current[subjectId] = el;
      else delete cardRefsMap.current[subjectId];
    },
    []
  );

  // Compute SVG bezier branches between Central Hub and every Subject Card
  const recomputeConnectors = useCallback(() => {
    const canvas = canvasRef.current;
    const hub = centerHubRef.current;
    if (!canvas || !hub || !activeDoc) {
      setConnectors([]);
      return;
    }

    const canvasRect = canvas.getBoundingClientRect();
    const hubRect = hub.getBoundingClientRect();
    if (canvasRect.width === 0 || hubRect.width === 0) return;

    const hubCenterX = hubRect.left - canvasRect.left + hubRect.width / 2;
    const hubCenterY = hubRect.top - canvasRect.top + hubRect.height / 2;

    const nextConnectors: SvgConnectorPath[] = [];

    activeDoc.subjects.forEach((subj) => {
      const cardEl = cardRefsMap.current[subj.id];
      if (!cardEl) return;
      const cardRect = cardEl.getBoundingClientRect();
      if (cardRect.width === 0) return;

      const cardCenterX = cardRect.left - canvasRect.left + cardRect.width / 2;
      const cardCenterY = cardRect.top - canvasRect.top + cardRect.height / 2;

      const isCardRightOfHub = cardCenterX > hubCenterX + 30;
      const isCardLeftOfHub = cardCenterX < hubCenterX - 30;

      let startX = hubCenterX;
      let startY = hubCenterY;
      let endX = cardCenterX;
      let endY = cardCenterY;

      if (isCardRightOfHub) {
        startX = hubRect.right - canvasRect.left - 6;
        endX = cardRect.left - canvasRect.left + 2;
      } else if (isCardLeftOfHub) {
        startX = hubRect.left - canvasRect.left + 6;
        endX = cardRect.right - canvasRect.left - 2;
      } else {
        // Vertical layout on small mobile viewports
        startX = hubCenterX;
        endX = cardCenterX;
        if (cardCenterY < hubCenterY) {
          startY = hubRect.top - canvasRect.top;
          endY = cardRect.bottom - canvasRect.top;
        } else {
          startY = hubRect.bottom - canvasRect.top;
          endY = cardRect.top - canvasRect.top;
        }
      }

      const dx = (endX - startX) * 0.55;
      const dy = (endY - startY) * 0.15;

      const d = isCardRightOfHub || isCardLeftOfHub
        ? `M ${startX} ${startY} C ${startX + dx} ${startY + dy}, ${
            endX - dx
          } ${endY - dy}, ${endX} ${endY}`
        : `M ${startX} ${startY} C ${startX} ${
            (startY + endY) / 2
          }, ${endX} ${(startY + endY) / 2}, ${endX} ${endY}`;

      const sketchD = isCardRightOfHub || isCardLeftOfHub
        ? `M ${startX} ${startY + 4} C ${startX + dx} ${startY + dy + 6}, ${
            endX - dx
          } ${endY - dy - 4}, ${endX} ${endY + 3}`
        : `M ${startX + 3} ${startY} C ${startX + 5} ${
            (startY + endY) / 2
          }, ${endX - 3} ${(startY + endY) / 2}, ${endX + 2} ${endY}`;

      const straightD = `M ${startX} ${startY} L ${
        (startX + endX) / 2
      } ${startY} L ${(startX + endX) / 2} ${endY} L ${endX} ${endY}`;

      const palette = getPaletteById(subj.colorId);
      nextConnectors.push({
        id: subj.id,
        d,
        sketchD,
        straightD,
        color: palette.hex,
        dotX: endX,
        dotY: endY,
      });
    });

    setConnectors(nextConnectors);
  }, [activeDoc]);

  useLayoutEffect(() => {
    recomputeConnectors();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ro = new ResizeObserver(() => {
      requestAnimationFrame(recomputeConnectors);
    });
    ro.observe(canvas);
    window.addEventListener('resize', recomputeConnectors);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', recomputeConnectors);
    };
  }, [recomputeConnectors, activeDoc?.subjects, activeDoc?.shape, activeDoc?.fontId]);

  // Fullscreen listener
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = async () => {
    const el = workspaceWrapperRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      showToast('تعذر تفعيل وضع ملء الشاشة في هذا المتصفح');
    }
  };

  // Subject CRUD
  const openAddSubjectModal = () => {
    setEditingSubject(null);
    setSubjNameInput('');
    setSubjEmojiInput('📘');
    setSubjColorInput(
      SUBJECT_PALETTES[(activeDoc?.subjects.length || 0) % SUBJECT_PALETTES.length].id
    );
    setIsSubjectModalOpen(true);
  };

  const openEditSubjectModal = (subj: MindMapSubjectNode) => {
    setEditingSubject(subj);
    setSubjNameInput(subj.name);
    setSubjEmojiInput(subj.emoji);
    setSubjColorInput(subj.colorId);
    setIsSubjectModalOpen(true);
  };

  const handleSaveSubjectModal = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = subjNameInput.trim();
    if (!trimmed) return;

    if (editingSubject) {
      updateActiveDoc((doc) => ({
        ...doc,
        subjects: doc.subjects.map((s) =>
          s.id === editingSubject.id
            ? {
                ...s,
                name: trimmed,
                emoji: subjEmojiInput,
                colorId: subjColorInput,
              }
            : s
        ),
      }));
      showToast('تم تحديث المادة بنجاح');
    } else {
      const newNode: MindMapSubjectNode = {
        id: 'subj_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
        name: trimmed,
        emoji: subjEmojiInput,
        colorId: subjColorInput,
        items: [],
      };
      updateActiveDoc((doc) => ({
        ...doc,
        subjects: [...doc.subjects, newNode],
      }));
      showToast('تمت إضافة المادة للخريطة — اكتب فروعها بنفسك الآن');
    }
    setIsSubjectModalOpen(false);
  };

  // Add Track Subjects (EMPTY items — student fills them from zero!)
  const handleAddTrackSubjects = (trackId: string, replaceExisting: boolean) => {
    const track = ACADEMIC_TRACKS.find((t) => t.id === trackId);
    if (!track || !activeDoc) return;

    const existingNames = new Set(
      activeDoc.subjects.map((s) => s.name.trim())
    );
    const freshNodes: MindMapSubjectNode[] = track.subjects
      .filter((t) => replaceExisting || !existingNames.has(t.name.trim()))
      .map((t, i) => ({
        id: `subj_${trackId}_${Date.now()}_${i}`,
        name: t.name,
        emoji: t.emoji,
        colorId: t.colorId,
        items: [],
      }));

    updateActiveDoc((doc) => ({
      ...doc,
      trackId,
      subjects: replaceExisting ? freshNodes : [...doc.subjects, ...freshNodes],
    }));
    setActiveStudioPanel('none');
    showToast(`تم تجهيز مواد (${track.label}) فارغة لتخطيطها من الصفر`);
  };

  const handleAddSingleCatalogSubject = (
    name: string,
    emoji: string,
    colorId: string
  ) => {
    if (!activeDoc) return;
    if (activeDoc.subjects.some((s) => s.name.trim() === name.trim())) {
      showToast(`مادة "${name}" موجودة بالفعل في خريطتك`);
      return;
    }
    const newNode: MindMapSubjectNode = {
      id: `subj_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      name,
      emoji,
      colorId,
      items: [],
    };
    updateActiveDoc((doc) => ({
      ...doc,
      subjects: [...doc.subjects, newNode],
    }));
    showToast(`تمت إضافة ${emoji} ${name} إلى الخريطة`);
  };

  // Branch Items CRUD
  const handleAddBranchItem = (subjectId: string, text: string) => {
    const newItem: MindMapBranchItem = {
      id: 'item_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
      text,
      completed: false,
    };
    updateActiveDoc((doc) => ({
      ...doc,
      subjects: doc.subjects.map((s) =>
        s.id === subjectId ? { ...s, items: [...s.items, newItem] } : s
      ),
    }));
  };

  const handleToggleBranchItem = (subjectId: string, itemId: string) => {
    updateActiveDoc((doc) => ({
      ...doc,
      subjects: doc.subjects.map((s) =>
        s.id === subjectId
          ? {
              ...s,
              items: s.items.map((it) =>
                it.id === itemId ? { ...it, completed: !it.completed } : it
              ),
            }
          : s
      ),
    }));
  };

  const handleDeleteBranchItem = (subjectId: string, itemId: string) => {
    updateActiveDoc((doc) => ({
      ...doc,
      subjects: doc.subjects.map((s) =>
        s.id === subjectId
          ? { ...s, items: s.items.filter((it) => it.id !== itemId) }
          : s
      ),
    }));
  };

  const handleSaveBranchItemStyle = (updatedItem: MindMapBranchItem) => {
    if (!stylerTarget) return;
    updateActiveDoc((doc) => ({
      ...doc,
      subjects: doc.subjects.map((s) =>
        s.id === stylerTarget.subjectId
          ? {
              ...s,
              items: s.items.map((it) =>
                it.id === updatedItem.id ? updatedItem : it
              ),
            }
          : s
      ),
    }));
    setStylerTarget(null);
    showToast('تم حفظ تنسيق وألوان الكلمات');
  };

  // Multi-map Management
  const handleCreateNewMap = (e: React.FormEvent) => {
    e.preventDefault();
    const title = newMapTitleInput.trim() || `خريطة مذاكرة ${documents.length + 1}`;
    const newDoc = createBlankDocument(studentDefaultName, title);
    const next = [...documents, newDoc];
    saveDocuments(next);
    setActiveDocId(newDoc.id);
    setNewMapTitleInput('');
    setIsNewMapModalOpen(false);
    showToast('تم إنشاء خريطة جديدة فارغة من الصفر');
  };

  const handleDuplicateActiveMap = () => {
    if (!activeDoc) return;
    const clone: MindMapDocument = {
      ...activeDoc,
      id: 'mm_' + Date.now() + '_copy',
      title: `${activeDoc.title} (نسخة)`,
      updatedAt: new Date().toISOString(),
    };
    const next = [...documents, clone];
    saveDocuments(next);
    setActiveDocId(clone.id);
    showToast('تم إنشاء نسخة من الخريطة الحالية');
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'subject') {
      updateActiveDoc((doc) => ({
        ...doc,
        subjects: doc.subjects.filter((s) => s.id !== deleteTarget.subject.id),
      }));
      showToast(`تم حذف مادة ${deleteTarget.subject.name} من الخريطة`);
    } else if (deleteTarget.type === 'map') {
      const remaining = documents.filter((d) => d.id !== deleteTarget.doc.id);
      if (remaining.length === 0) {
        const fresh = createBlankDocument(studentDefaultName);
        saveDocuments([fresh]);
        setActiveDocId(fresh.id);
      } else {
        saveDocuments(remaining);
        if (activeDocId === deleteTarget.doc.id) {
          setActiveDocId(remaining[0].id);
        }
      }
      showToast('تم حذف الخريطة بنجاح');
    }
    setDeleteTarget(null);
  };

  if (!isLoaded || !activeDoc) {
    return (
      <div className="p-12 flex justify-center items-center">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const activeFont =
    MIND_MAP_FONTS.find((f) => f.id === activeDoc.fontId) || MIND_MAP_FONTS[0];
  const activeShapeInfo =
    MIND_MAP_SHAPE_ITEMS.find((s) => s.id === activeDoc.shape) ||
    MIND_MAP_SHAPE_ITEMS[0];
  const totalBranches = activeDoc.subjects.reduce(
    (sum, s) => sum + s.items.length,
    0
  );
  const completedBranches = activeDoc.subjects.reduce(
    (sum, s) => sum + s.items.filter((i) => i.completed).length,
    0
  );

  return (
    <div
      ref={workspaceWrapperRef}
      className={`space-y-5 ${
        isFullscreen
          ? 'p-4 md:p-6 bg-slate-50 dark:bg-slate-950 overflow-y-auto h-screen'
          : ''
      }`}
      dir="rtl"
    >
      {/* Toast Feedback */}
      {toastMsg && (
        <div className="no-print fixed bottom-6 left-6 z-50 px-4 py-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black shadow-xl flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-500" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 1. Multi-Map Switcher & Action Bar */}
      <div className="no-print bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Map Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {documents.map((doc) => {
              const isSelected = doc.id === activeDoc.id;
              return (
                <div
                  key={doc.id}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-black shrink-0 transition-colors ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-500'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setActiveDocId(doc.id)}
                    className="whitespace-nowrap"
                  >
                    {doc.title}
                  </button>
                  {documents.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setDeleteTarget({ type: 'map', doc })}
                      title="حذف هذه الخريطة"
                      className={`p-0.5 rounded-md ${
                        isSelected
                          ? 'hover:bg-white/20 text-white'
                          : 'text-slate-400 hover:text-rose-500'
                      }`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}

            <button
              type="button"
              onClick={() => setIsNewMapModalOpen(true)}
              className="px-3.5 py-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 text-slate-600 dark:text-slate-300 text-xs font-black flex items-center gap-1.5 shrink-0 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>خريطة جديدة</span>
            </button>
          </div>

          {/* Primary Action Tools */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={openAddSubjectModal}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة مادة بنفسك</span>
            </button>

            <button
              type="button"
              onClick={() => setIsShapesGalleryOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-black flex items-center gap-1.5 transition-colors"
            >
              <Shapes className="w-4 h-4 text-emerald-500" />
              <span>أشكال الخرائط</span>
            </button>

            <button
              type="button"
              onClick={handleDuplicateActiveMap}
              title="نسخ الخريطة الحالية"
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            >
              <Copy className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={toggleFullscreen}
              title={isFullscreen ? 'إنهاء ملء الشاشة' : 'عرض بملء الشاشة'}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 text-xs font-black flex items-center gap-1.5 transition-opacity"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة / حفظ PDF</span>
            </button>
          </div>
        </div>

        {/* Studio Expandable Customization Tabs */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setActiveStudioPanel((p) => (p === 'tracks' ? 'none' : 'tracks'))
              }
              className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 border transition-colors ${
                activeStudioPanel === 'tracks'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>الشعب والمواد بالإيموجي</span>
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveStudioPanel((p) => (p === 'fonts' ? 'none' : 'fonts'))
              }
              className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 border transition-colors ${
                activeStudioPanel === 'fonts'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              <span>الخطوط (يدوي / رسمي)</span>
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveStudioPanel((p) => (p === 'paper' ? 'none' : 'paper'))
              }
              className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 border transition-colors ${
                activeStudioPanel === 'paper'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>الورقة والمدى والطباعة</span>
            </button>
          </div>

          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-3 tabular-nums">
            <span>الشكل: {activeShapeInfo.title}</span>
            <span aria-hidden="true">·</span>
            <span>{activeDoc.subjects.length} مواد</span>
            <span aria-hidden="true">·</span>
            <span>
              {completedBranches}/{totalBranches} بند
            </span>
          </div>
        </div>

        {/* Panel 1: Academic Tracks & Emoji Subject Catalog (No preset lessons!) */}
        {activeStudioPanel === 'tracks' && (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                  اختر شعبتك أو مسارك الدراسي لإضافة المواد برموزها المميزة
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  تضاف المواد فارغة تماماً بدون أي دروس جاهزة لتبدأ أنت التخطيط بطريقتك
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {ACADEMIC_TRACKS.map((tr) => {
                const isCurrent = activeDoc.trackId === tr.id;
                return (
                  <button
                    key={tr.id}
                    type="button"
                    onClick={() =>
                      updateActiveDoc((d) => ({ ...d, trackId: tr.id }))
                    }
                    className={`px-3.5 py-2 rounded-xl text-xs font-black border flex items-center gap-1.5 transition-colors ${
                      isCurrent
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <span>{tr.badgeEmoji}</span>
                    <span>{tr.label}</span>
                  </button>
                );
              })}
            </div>

            {(() => {
              const chosenTrack =
                ACADEMIC_TRACKS.find((t) => t.id === activeDoc.trackId) ||
                ACADEMIC_TRACKS[0];
              return (
                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      مواد {chosenTrack.label} — اضغط على مادة لإضافتها منفردة أو أضفها كلها:
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          handleAddTrackSubjects(chosenTrack.id, false)
                        }
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black"
                      >
                        + إضافة مواد الشعبة الناقصة
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleAddTrackSubjects(chosenTrack.id, true)
                        }
                        className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-black"
                      >
                        تجهيز خريطة الشعبة بالكامل
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {chosenTrack.subjects.map((sub) => {
                      const pal = getPaletteById(sub.colorId);
                      const alreadyAdded = activeDoc.subjects.some(
                        (s) => s.name.trim() === sub.name.trim()
                      );
                      return (
                        <button
                          key={sub.name}
                          type="button"
                          onClick={() =>
                            handleAddSingleCatalogSubject(
                              sub.name,
                              sub.emoji,
                              sub.colorId
                            )
                          }
                          className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                            alreadyAdded
                              ? 'opacity-60 border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
                              : `${pal.borderClass} bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:scale-[1.02]`
                          }`}
                        >
                          <span>{sub.emoji}</span>
                          <span>{sub.name}</span>
                          {alreadyAdded ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Plus className="w-3 h-3 text-slate-400" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Panel 2: Handwritten & Formal Fonts (Arabic + English) */}
        {activeStudioPanel === 'fonts' && (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-slate-900 dark:text-white">
                خطوط الكتابة اليدوية وخطوط الكمبيوتر الرسمية (عربي + English)
              </h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {MIND_MAP_FONTS.map((f) => {
                const selected = activeDoc.fontId === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() =>
                      updateActiveDoc((d) => ({ ...d, fontId: f.id }))
                    }
                    className={`text-right p-3 rounded-xl border transition-all ${
                      selected
                        ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-black text-slate-900 dark:text-white">
                        {f.label}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500">
                        {f.category === 'handwritten' ? 'خط يدوي' : 'رسمي'}
                      </span>
                    </div>
                    <div
                      className="text-sm text-slate-700 dark:text-slate-200 flex items-center justify-between"
                      style={{ fontFamily: f.cssStack }}
                    >
                      <span>{f.sampleAr}</span>
                      <span dir="ltr">{f.sampleEn}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Panel 3: Paper Texture, Scope, Print Checkboxes, Student Name */}
        {activeStudioPanel === 'paper' && (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Student Name & Scope */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1">
                  اسم الطالب على الورقة المطبوعة
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={activeDoc.studentName}
                    onChange={(e) =>
                      updateActiveDoc((d) => ({
                        ...d,
                        studentName: e.target.value,
                      }))
                    }
                    className="w-full pr-9 pl-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1">
                  نطاق الخطة الزمني
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['daily', 'weekly', 'monthly'] as MindMapScope[]).map(
                    (sc) => (
                      <button
                        key={sc}
                        type="button"
                        onClick={() =>
                          updateActiveDoc((d) => ({ ...d, scope: sc }))
                        }
                        className={`py-2 rounded-xl text-xs font-black border transition-colors ${
                          activeDoc.scope === sc
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {SCOPE_LABELS[sc]}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>

            {/* Paper Texture */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300 block">
                خلفية ورقة الرسم والطباعة
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {PAPER_LABELS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() =>
                      updateActiveDoc((d) => ({ ...d, paper: p.id }))
                    }
                    className={`py-2 px-3 rounded-xl text-xs font-bold border text-right transition-colors ${
                      activeDoc.paper === p.id
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Print Options & Motto */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1">
                  عبارة تحفيزية أسفل الخريطة
                </label>
                <input
                  type="text"
                  value={activeDoc.motto}
                  onChange={(e) =>
                    updateActiveDoc((d) => ({ ...d, motto: e.target.value }))
                  }
                  placeholder="اكتب عبارتك التحفيزية..."
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>

              <button
                type="button"
                onClick={() =>
                  updateActiveDoc((d) => ({
                    ...d,
                    showCheckboxesInPrint: !d.showCheckboxesInPrint,
                  }))
                }
                className="w-full py-2.5 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between"
              >
                <span>إظهار مربعات الإنجاز عند الطباعة</span>
                {activeDoc.showCheckboxesInPrint ? (
                  <CheckSquare className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. THE PRINTABLE MIND MAP CANVAS */}
      <div
        id="student-mind-map-printable"
        style={{ '--mm-font': activeFont.cssStack } as React.CSSProperties}
        className={`mindmap-custom-font mm-paper-${activeDoc.paper} rounded-[2rem] border border-slate-200 dark:border-slate-800 p-5 sm:p-8 shadow-sm relative overflow-hidden`}
      >
        {/* Decorative Sketchbook Corner Pen Doodles (Visible in Sketchbook Mode) */}
        {activeDoc.shape === 'sketchbook' && (
          <svg
            aria-hidden="true"
            viewBox="0 0 120 120"
            className="w-20 h-20 absolute top-3 left-3 text-amber-500/35 dark:text-amber-400/25 pointer-events-none"
          >
            <path
              d="M15 45 C 25 15, 55 12, 65 30 C 75 48, 35 62, 22 48"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="4 4"
            />
            <path
              d="M78 18 L 84 26 L 94 22 L 88 31 L 96 38 L 86 38 L 81 47 L 79 37 L 69 35 L 78 29 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
        )}

        {/* Sheet Top Bar: Student Identity + Scope */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pb-5 mb-6 border-b border-dashed border-slate-300 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center font-black text-base shrink-0">
              {activeDoc.studentName.charAt(0) || 'ط'}
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                خريطة الطالب / الطالبة
              </div>
              <input
                type="text"
                value={activeDoc.studentName}
                onChange={(e) =>
                  updateActiveDoc((d) => ({ ...d, studentName: e.target.value }))
                }
                aria-label="اسم الطالب"
                className="text-base font-black text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:outline-none px-0.5"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-bold text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-emerald-500" />
              {SCOPE_LABELS[activeDoc.scope]}
            </span>
            <span aria-hidden="true">·</span>
            <span>Easy English مع مستر محمد رضوان</span>
          </div>
        </div>

        {/* Dynamic Radial Canvas with SVG Connectors */}
        <div ref={canvasRef} className="relative z-10 min-h-[420px]">
          {/* Dynamic Bezier SVG Overlay */}
          <svg
            aria-hidden="true"
            className="hidden lg:block absolute inset-0 w-full h-full pointer-events-none z-0"
          >
            {connectors.map((c) => {
              if (activeDoc.shape === 'formal_sheet') {
                return (
                  <g key={c.id}>
                    <path
                      d={c.straightD}
                      fill="none"
                      stroke={c.color}
                      strokeOpacity="0.65"
                      strokeWidth="2.2"
                    />
                    <circle cx={c.dotX} cy={c.dotY} r="4" fill={c.color} />
                  </g>
                );
              }
              if (activeDoc.shape === 'sketchbook') {
                return (
                  <g key={c.id}>
                    <path
                      d={c.d}
                      fill="none"
                      stroke={c.color}
                      strokeWidth="3.2"
                      strokeLinecap="round"
                    />
                    <path
                      d={c.sketchD}
                      fill="none"
                      stroke={c.color}
                      strokeOpacity="0.55"
                      strokeWidth="1.6"
                      strokeDasharray="6 4"
                      strokeLinecap="round"
                    />
                    <circle
                      cx={c.dotX}
                      cy={c.dotY}
                      r="5"
                      fill="#ffffff"
                      stroke={c.color}
                      strokeWidth="2.5"
                    />
                  </g>
                );
              }
              return (
                <g key={c.id}>
                  <path
                    d={c.d}
                    fill="none"
                    stroke={c.color}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeOpacity="0.85"
                  />
                  <circle cx={c.dotX} cy={c.dotY} r="5" fill={c.color} />
                </g>
              );
            })}
          </svg>

          {activeDoc.subjects.length === 0 ? (
            /* Empty Canvas — Student Starts From Scratch */
            <div className="relative z-10 flex flex-col items-center justify-center py-12 px-4 text-center space-y-6">
              <div
                ref={centerHubRef}
                className="px-8 py-6 rounded-[2rem] bg-slate-900 text-white border-2 border-emerald-400 shadow-lg max-w-sm w-full space-y-2"
              >
                <div className="text-xs font-bold text-emerald-400">
                  المركز الرئيسي للخريطة
                </div>
                <input
                  type="text"
                  value={activeDoc.title}
                  onChange={(e) =>
                    updateActiveDoc((d) => ({ ...d, title: e.target.value }))
                  }
                  className="w-full text-center text-2xl font-black bg-transparent text-white border-b border-white/20 focus:border-emerald-400 focus:outline-none pb-1"
                />
                <div className="text-xs text-slate-300">
                  إعداد: {activeDoc.studentName}
                </div>
              </div>

              <div className="max-w-lg space-y-3">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  خريطتك الذهنية جاهزة لتبدأها من الصفر بطريقتك الخاصة
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  أضف موادك الدراسية مادة بمادة مع اختيار الإيموجي واللون لكل مادة، أو اختر شعبتك من الشريط العلوي لتظهر مواد شعبتك فارغة وتكتب فيها دروسك وأهدافك بنفسك.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2 no-print">
                  <button
                    type="button"
                    onClick={openAddSubjectModal}
                    className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-black flex items-center gap-2 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة أول مادة يدوياً</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveStudioPanel('tracks')}
                    className="px-5 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs sm:text-sm font-black flex items-center gap-2 hover:border-emerald-500 transition-colors"
                  >
                    <Layers className="w-4 h-4 text-emerald-500" />
                    <span>اختيار مواد الشعبة بالإيموجي</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Symmetrical 3-Column Mind Map Grid: Right Branches — Central Hub — Left Branches */
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
              {/* Right Column Subjects */}
              <div className="lg:col-span-4 space-y-5 order-2 lg:order-1">
                {rightSubjects.map((subj) => (
                  <SubjectNodeCard
                    key={subj.id}
                    subject={subj}
                    shape={activeDoc.shape}
                    showCheckboxesInPrint={activeDoc.showCheckboxesInPrint}
                    onAddBranchItem={handleAddBranchItem}
                    onToggleBranchItem={handleToggleBranchItem}
                    onDeleteBranchItem={handleDeleteBranchItem}
                    onOpenItemStyler={(subjectId, item) =>
                      setStylerTarget({
                        subjectId,
                        subjectName: subj.name,
                        item,
                      })
                    }
                    onEditSubject={openEditSubjectModal}
                    onDeleteSubject={(s) =>
                      setDeleteTarget({ type: 'subject', subject: s })
                    }
                    registerCardRef={registerCardRef}
                  />
                ))}
              </div>

              {/* Central Hub */}
              <div className="lg:col-span-4 flex flex-col items-center justify-center order-1 lg:order-2 py-4">
                <div
                  ref={centerHubRef}
                  className={`w-full max-w-xs p-6 text-center space-y-2.5 transition-all ${
                    activeDoc.shape === 'sketchbook'
                      ? 'rounded-[2.2rem] bg-slate-900 text-white border-4 border-dashed border-amber-400 shadow-lg'
                      : activeDoc.shape === 'organic_clouds'
                      ? 'rounded-[3rem] bg-slate-900 text-white border-4 border-emerald-400 shadow-xl'
                      : activeDoc.shape === 'formal_sheet'
                      ? 'rounded-2xl bg-slate-900 text-white border-2 border-slate-700 shadow-md'
                      : 'rounded-full aspect-square flex flex-col items-center justify-center bg-slate-900 text-white border-4 border-emerald-500 shadow-xl max-w-[230px]'
                  }`}
                >
                  <div className="text-[11px] font-black text-emerald-400">
                    {SCOPE_LABELS[activeDoc.scope]}
                  </div>
                  <input
                    type="text"
                    value={activeDoc.title}
                    onChange={(e) =>
                      updateActiveDoc((d) => ({ ...d, title: e.target.value }))
                    }
                    aria-label="عنوان الخريطة الذهنية"
                    className="w-full text-center text-xl sm:text-2xl font-black bg-transparent text-white border-b border-white/20 focus:border-emerald-400 focus:outline-none pb-1"
                  />
                  <div className="text-xs font-bold text-slate-300">
                    {activeDoc.studentName}
                  </div>
                  <div className="text-[11px] text-slate-400 tabular-nums">
                    {activeDoc.subjects.length} مواد · {completedBranches}/
                    {totalBranches} منجز
                  </div>
                </div>
              </div>

              {/* Left Column Subjects */}
              <div className="lg:col-span-4 space-y-5 order-3">
                {leftSubjects.map((subj) => (
                  <SubjectNodeCard
                    key={subj.id}
                    subject={subj}
                    shape={activeDoc.shape}
                    showCheckboxesInPrint={activeDoc.showCheckboxesInPrint}
                    onAddBranchItem={handleAddBranchItem}
                    onToggleBranchItem={handleToggleBranchItem}
                    onDeleteBranchItem={handleDeleteBranchItem}
                    onOpenItemStyler={(subjectId, item) =>
                      setStylerTarget({
                        subjectId,
                        subjectName: subj.name,
                        item,
                      })
                    }
                    onEditSubject={openEditSubjectModal}
                    onDeleteSubject={(s) =>
                      setDeleteTarget({ type: 'subject', subject: s })
                    }
                    registerCardRef={registerCardRef}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sheet Bottom Motto & Platform Signature */}
        <div className="relative z-10 mt-8 pt-4 border-t border-dashed border-slate-300 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-right">
          <div className="flex items-center gap-2 text-sm font-black text-slate-700 dark:text-slate-200">
            <PenTool className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{activeDoc.motto}</span>
          </div>
          <div className="text-[11px] font-bold text-slate-400">
            Easy English مع مستر محمد رضوان · خريطة {activeDoc.studentName}
          </div>
        </div>
      </div>

      {/* Add / Edit Subject Modal */}
      {isSubjectModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto no-print"
          dir="rtl"
        >
          <form
            onSubmit={handleSaveSubjectModal}
            className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                {editingSubject ? 'تعديل المادة' : 'إضافة مادة جديدة للخريطة'}
              </h3>
              <button
                type="button"
                onClick={() => setIsSubjectModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                اسم المادة
              </label>
              <input
                type="text"
                value={subjNameInput}
                onChange={(e) => setSubjNameInput(e.target.value)}
                placeholder="مثال: اللغة الإنجليزية أو الفيزياء أو الفقه..."
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300 block">
                اختر الإيموجي الخاص بالمادة ({subjEmojiInput})
              </label>
              <div className="grid grid-cols-10 gap-1.5 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 max-h-36 overflow-y-auto">
                {EMOJI_PICKER_LIST.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setSubjEmojiInput(em)}
                    className={`h-8 rounded-lg text-lg flex items-center justify-center transition-transform ${
                      subjEmojiInput === em
                        ? 'bg-emerald-500/20 ring-2 ring-emerald-500 scale-110'
                        : 'hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300 block">
                لون الفرع والبطاقة
              </label>
              <div className="grid grid-cols-4 gap-2">
                {SUBJECT_PALETTES.map((pal) => (
                  <button
                    key={pal.id}
                    type="button"
                    onClick={() => setSubjColorInput(pal.id)}
                    className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${
                      subjColorInput === pal.id
                        ? 'ring-2 ring-emerald-500 border-emerald-500 bg-slate-50 dark:bg-slate-800'
                        : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full shrink-0"
                      style={{ backgroundColor: pal.hex }}
                    />
                    <span className="truncate text-[11px] text-slate-700 dark:text-slate-200">
                      {pal.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsSubjectModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-black"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{editingSubject ? 'حفظ التعديل' : 'إضافة للخريطة'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* New Map Modal */}
      {isNewMapModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm no-print"
          dir="rtl"
        >
          <form
            onSubmit={handleCreateNewMap}
            className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                إنشاء خريطة ذهنية جديدة من الصفر
              </h3>
              <button
                type="button"
                onClick={() => setIsNewMapModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <input
              type="text"
              value={newMapTitleInput}
              onChange={(e) => setNewMapTitleInput(e.target.value)}
              placeholder="مثال: مراجعة ليلة الامتحان — الأسبوع الثالث"
              className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              required
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsNewMapModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-black"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black"
              >
                إنشاء الخريطة
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Visual Shapes Gallery Modal */}
      <MindMapShapesGallery
        isOpen={isShapesGalleryOpen}
        activeShape={activeDoc.shape}
        onSelectShape={(shape: MindMapShape) => {
          updateActiveDoc((d) => ({ ...d, shape }));
          showToast('تم تغيير شكل الخريطة الذهنية بنجاح');
        }}
        onClose={() => setIsShapesGalleryOpen(false)}
      />

      {/* Branch Item & Word-Level Styler Modal */}
      <BranchItemEditorModal
        key={stylerTarget?.item.id || 'none'}
        isOpen={Boolean(stylerTarget)}
        item={stylerTarget?.item || null}
        subjectName={stylerTarget?.subjectName || ''}
        onClose={() => setStylerTarget(null)}
        onSave={handleSaveBranchItemStyle}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title={
          deleteTarget?.type === 'map'
            ? 'تأكيد حذف الخريطة الذهنية'
            : 'تأكيد حذف المادة من الخريطة'
        }
        itemType={deleteTarget?.type === 'map' ? 'الخريطة الذهنية' : 'المادة'}
        itemName={
          deleteTarget?.type === 'map'
            ? deleteTarget.doc.title
            : deleteTarget?.type === 'subject'
            ? deleteTarget.subject.name
            : ''
        }
        warningNote={
          deleteTarget?.type === 'map'
            ? 'سيتم حذف هذه الخريطة بجميع موادها وفروعها نهائياً.'
            : 'سيتم حذف المادة وجميع الدروس المكتوبة بداخلها من هذه الخريطة.'
        }
      />
    </div>
  );
}
