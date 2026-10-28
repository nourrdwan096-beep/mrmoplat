'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Lightbulb,
  Atom,
  FlaskConical,
  Microscope,
  Calculator,
  BookOpen,
  Languages,
  Compass,
  Sparkles,
  Printer,
  Download,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  Circle,
  RotateCcw,
  Sliders,
  Share2,
  HelpCircle,
  Maximize2,
  Minimize2,
  Palette,
  Layers,
  Calendar,
  Flame,
  GraduationCap,
  Heart,
  Save,
  X,
  Check,
  Globe,
  Feather,
  Scale,
  BrainCircuit,
  Mountain,
  Wand2,
  FileDown,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/context/AuthContext';

export interface MindMapTaskItem {
  id: string;
  title: string;
  completed: boolean;
  priority?: 'high' | 'medium' | 'low';
}

export interface MindMapSubject {
  id: string;
  name: string;
  colorName: string;
  accentBg: string;
  accentBorder: string;
  accentText: string;
  badgeBg: string;
  lightCloudBg: string;
  darkCloudBg: string;
  svgColor: string;
  iconType: 'physics' | 'chemistry' | 'math' | 'english' | 'arabic' | 'biology' | 'french' | 'german' | 'history' | 'geography' | 'philosophy' | 'geology' | 'custom';
  subtitle: string;
  tasks: MindMapTaskItem[];
}

export interface MindMapState {
  id: string;
  title: string;
  studentName: string;
  scope: 'daily' | 'weekly' | 'monthly';
  motto: string;
  subjects: MindMapSubject[];
  lastSavedAt: string;
}

const DEFAULT_SUBJECTS: MindMapSubject[] = [
  {
    id: 'subj-physics',
    name: 'الفيزياء',
    colorName: 'sky',
    accentBg: 'bg-sky-500',
    accentBorder: 'border-sky-400 dark:border-sky-600',
    accentText: 'text-sky-600 dark:text-sky-300',
    badgeBg: 'bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-200 border-sky-300 dark:border-sky-800',
    lightCloudBg: 'bg-sky-500 text-white',
    darkCloudBg: 'dark:bg-sky-600 dark:text-white',
    svgColor: '#0ea5e9',
    iconType: 'physics',
    subtitle: 'قوانين، مسائل وتجارب',
    tasks: [
      { id: 'p1', title: 'الكهرباء والمغناطيسية', completed: true },
      { id: 'p2', title: 'الحركة والقوانين', completed: true },
      { id: 'p3', title: 'الطاقة والشغل', completed: false },
      { id: 'p4', title: 'الفيزياء الحديثة', completed: false },
      { id: 'p5', title: 'المراجعة وحل المسائل', completed: false },
    ],
  },
  {
    id: 'subj-chemistry',
    name: 'الكيمياء',
    colorName: 'orange',
    accentBg: 'bg-orange-500',
    accentBorder: 'border-orange-400 dark:border-orange-600',
    accentText: 'text-orange-600 dark:text-orange-300',
    badgeBg: 'bg-orange-100 text-orange-800 dark:bg-orange-950/70 dark:text-orange-200 border-orange-300 dark:border-orange-800',
    lightCloudBg: 'bg-orange-500 text-white',
    darkCloudBg: 'dark:bg-orange-600 dark:text-white',
    svgColor: '#f97316',
    iconType: 'chemistry',
    subtitle: 'تفاعلات ومركبات عضوية',
    tasks: [
      { id: 'c1', title: 'البنية الذرية', completed: true },
      { id: 'c2', title: 'الروابط الكيميائية', completed: true },
      { id: 'c3', title: 'المعادلات والتفاعلات', completed: false },
      { id: 'c4', title: 'الكيمياء العضوية', completed: false },
      { id: 'c5', title: 'المراجعة وحل الأسئلة', completed: false },
    ],
  },
  {
    id: 'subj-math',
    name: 'الرياضيات',
    colorName: 'purple',
    accentBg: 'bg-purple-600',
    accentBorder: 'border-purple-400 dark:border-purple-600',
    accentText: 'text-purple-600 dark:text-purple-300',
    badgeBg: 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-200 border-purple-300 dark:border-purple-800',
    lightCloudBg: 'bg-purple-600 text-white',
    darkCloudBg: 'dark:bg-purple-700 dark:text-white',
    svgColor: '#9333ea',
    iconType: 'math',
    subtitle: 'جبر، تفاضل وهندسة فراغية',
    tasks: [
      { id: 'm1', title: 'الجبر', completed: true },
      { id: 'm2', title: 'الهندسة', completed: true },
      { id: 'm3', title: 'التفاضل والتكامل', completed: false },
      { id: 'm4', title: 'الاحتمالات والإحصاء', completed: false },
      { id: 'm5', title: 'المراجعة وحل المسائل', completed: false },
    ],
  },
  {
    id: 'subj-english',
    name: 'اللغة الإنجليزية',
    colorName: 'teal',
    accentBg: 'bg-teal-600',
    accentBorder: 'border-teal-400 dark:border-teal-600',
    accentText: 'text-teal-600 dark:text-teal-300',
    badgeBg: 'bg-teal-100 text-teal-800 dark:bg-teal-950/70 dark:text-teal-200 border-teal-300 dark:border-teal-800',
    lightCloudBg: 'bg-teal-600 text-white',
    darkCloudBg: 'dark:bg-teal-700 dark:text-white',
    svgColor: '#0d9488',
    iconType: 'english',
    subtitle: 'Easy English مع مستر محمد رضوان',
    tasks: [
      { id: 'e1', title: 'القواعد (Grammar)', completed: true },
      { id: 'e2', title: 'المفردات (Vocabulary)', completed: true },
      { id: 'e3', title: 'القراءة والفهم (Reading)', completed: false },
      { id: 'e4', title: 'مهارات الكتابة (Writing)', completed: false },
      { id: 'e5', title: 'المحادثة والاستماع (Speaking)', completed: false },
    ],
  },
  {
    id: 'subj-arabic',
    name: 'اللغة العربية',
    colorName: 'rose',
    accentBg: 'bg-rose-600',
    accentBorder: 'border-rose-400 dark:border-rose-600',
    accentText: 'text-rose-600 dark:text-rose-300',
    badgeBg: 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-200 border-rose-300 dark:border-rose-800',
    lightCloudBg: 'bg-rose-600 text-white',
    darkCloudBg: 'dark:bg-rose-700 dark:text-white',
    svgColor: '#e11d48',
    iconType: 'arabic',
    subtitle: 'نحو، بلاغة وأدب ونصوص',
    tasks: [
      { id: 'a1', title: 'النحو', completed: true },
      { id: 'a2', title: 'البلاغة', completed: true },
      { id: 'a3', title: 'الأدب والنصوص', completed: false },
      { id: 'a4', title: 'القراءة والتعبير', completed: false },
      { id: 'a5', title: 'المراجعة وحل الأسئلة', completed: false },
    ],
  },
  {
    id: 'subj-biology',
    name: 'الأحياء',
    colorName: 'emerald',
    accentBg: 'bg-emerald-600',
    accentBorder: 'border-emerald-400 dark:border-emerald-600',
    accentText: 'text-emerald-600 dark:text-emerald-300',
    badgeBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800',
    lightCloudBg: 'bg-emerald-600 text-white',
    darkCloudBg: 'dark:bg-emerald-700 dark:text-white',
    svgColor: '#059669',
    iconType: 'biology',
    subtitle: 'خلية، وراثة، وتكاثر',
    tasks: [
      { id: 'b1', title: 'الخلية', completed: true },
      { id: 'b2', title: 'الوراثة', completed: true },
      { id: 'b3', title: 'التكاثر والنمو', completed: false },
      { id: 'b4', title: 'التغذية والهضم', completed: false },
      { id: 'b5', title: 'المراجعة وحل الأسئلة', completed: false },
    ],
  },
];

export default function MindMapCreator() {
  const { currentUser } = useAuth();
  const studentDisplayName = currentUser?.fullName || 'بطل المذاكرة';
  const localStorageKey = `mr_radwan_mind_map_${currentUser?.id || 'guest'}`;

  const [mindMap, setMindMap] = useState<MindMapState>({
    id: 'map-default',
    title: 'خطتي للمذاكرة',
    studentName: studentDisplayName,
    scope: 'weekly',
    motto: 'خطوة صغيرة كل يوم .. تصنع فرقًا كبيرًا',
    subjects: DEFAULT_SUBJECTS,
    lastSavedAt: new Date().toISOString(),
  });

  const [activeLayout, setActiveLayout] = useState<'organic' | 'cyber' | 'grid'>('organic');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Modals state
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiTrack, setAiTrack] = useState<'science' | 'math' | 'literary' | 'english_focus'>('science');
  const [aiIntensity, setAiIntensity] = useState<'normal' | 'intense' | 'exam_ready'>('normal');

  const [isAddSubjectModalOpen, setIsAddSubjectModalOpen] = useState(false);
  const [newSubjName, setNewSubjName] = useState('');
  const [newSubjIcon, setNewSubjIcon] = useState<MindMapSubject['iconType']>('custom');
  const [newSubjColor, setNewSubjColor] = useState('blue');

  const [editingTaskSubjectId, setEditingTaskSubjectId] = useState<string | null>(null);
  const [newTaskInput, setNewTaskInput] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);

  // Load from local storage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(localStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && Array.isArray(parsed.subjects)) {
          setMindMap({
            ...parsed,
            studentName: parsed.studentName || studentDisplayName,
          });
        }
      } else {
        // Initialize with student's real name
        setMindMap((prev) => ({
          ...prev,
          studentName: studentDisplayName,
        }));
      }
    } catch (e) {
      console.warn('Could not load mind map:', e);
    }
  }, [localStorageKey, studentDisplayName]);

  // Persist helper
  const saveMindMap = (updated: MindMapState, message?: string) => {
    const stateToSave = {
      ...updated,
      lastSavedAt: new Date().toISOString(),
    };
    setMindMap(stateToSave);
    try {
      localStorage.setItem(localStorageKey, JSON.stringify(stateToSave));
      if (message) {
        showNotification(message);
      }
    } catch (e) {
      console.warn('Could not save mind map:', e);
    }
  };

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // Toggle task completion
  const handleToggleTask = (subjectId: string, taskId: string) => {
    const updatedSubjects = mindMap.subjects.map((sub) => {
      if (sub.id !== subjectId) return sub;
      const updatedTasks = sub.tasks.map((t) =>
        t.id === taskId ? { ...t, completed: !t.completed } : t
      );
      return { ...sub, tasks: updatedTasks };
    });

    saveMindMap({ ...mindMap, subjects: updatedSubjects });
  };

  // Add task to subject
  const handleAddTask = (subjectId: string) => {
    if (!newTaskInput.trim()) return;
    const updatedSubjects = mindMap.subjects.map((sub) => {
      if (sub.id !== subjectId) return sub;
      const newTask: MindMapTaskItem = {
        id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
        title: newTaskInput.trim(),
        completed: false,
      };
      return { ...sub, tasks: [...sub.tasks, newTask] };
    });

    saveMindMap({ ...mindMap, subjects: updatedSubjects }, 'تمت إضافة البند بنجاح ✨');
    setNewTaskInput('');
    setEditingTaskSubjectId(null);
  };

  // Delete task from subject
  const handleDeleteTask = (subjectId: string, taskId: string) => {
    const updatedSubjects = mindMap.subjects.map((sub) => {
      if (sub.id !== subjectId) return sub;
      return { ...sub, tasks: sub.tasks.filter((t) => t.id !== taskId) };
    });
    saveMindMap({ ...mindMap, subjects: updatedSubjects }, 'تم حذف البند');
  };

  // Delete subject
  const handleDeleteSubject = (subjectId: string) => {
    if (mindMap.subjects.length <= 1) {
      showNotification('يجب أن تحتوي الخريطة على مادة واحدة على الأقل');
      return;
    }
    const updatedSubjects = mindMap.subjects.filter((s) => s.id !== subjectId);
    saveMindMap({ ...mindMap, subjects: updatedSubjects }, 'تم حذف المادة من الخريطة');
  };

  // Add new subject
  const handleCreateSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjName.trim()) return;

    const paletteMap: Record<string, any> = {
      blue: {
        accentBg: 'bg-blue-600',
        accentBorder: 'border-blue-400 dark:border-blue-600',
        accentText: 'text-blue-600 dark:text-blue-300',
        badgeBg: 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-200 border-blue-300 dark:border-blue-800',
        lightCloudBg: 'bg-blue-600 text-white',
        darkCloudBg: 'dark:bg-blue-700 dark:text-white',
        svgColor: '#2563eb',
      },
      emerald: {
        accentBg: 'bg-emerald-600',
        accentBorder: 'border-emerald-400 dark:border-emerald-600',
        accentText: 'text-emerald-600 dark:text-emerald-300',
        badgeBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800',
        lightCloudBg: 'bg-emerald-600 text-white',
        darkCloudBg: 'dark:bg-emerald-700 dark:text-white',
        svgColor: '#059669',
      },
      amber: {
        accentBg: 'bg-amber-600',
        accentBorder: 'border-amber-400 dark:border-amber-600',
        accentText: 'text-amber-600 dark:text-amber-300',
        badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-200 border-amber-300 dark:border-amber-800',
        lightCloudBg: 'bg-amber-600 text-white',
        darkCloudBg: 'dark:bg-amber-700 dark:text-white',
        svgColor: '#d97706',
      },
      fuchsia: {
        accentBg: 'bg-fuchsia-600',
        accentBorder: 'border-fuchsia-400 dark:border-fuchsia-600',
        accentText: 'text-fuchsia-600 dark:text-fuchsia-300',
        badgeBg: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-950/70 dark:text-fuchsia-200 border-fuchsia-300 dark:border-fuchsia-800',
        lightCloudBg: 'bg-fuchsia-600 text-white',
        darkCloudBg: 'dark:bg-fuchsia-700 dark:text-white',
        svgColor: '#c026d3',
      },
    };

    const chosenPalette = paletteMap[newSubjColor] || paletteMap.blue;

    const newSubj: MindMapSubject = {
      id: 'subj-' + Date.now(),
      name: newSubjName.trim(),
      colorName: newSubjColor,
      subtitle: 'مادة دراسية مخصصة',
      iconType: newSubjIcon,
      ...chosenPalette,
      tasks: [
        { id: 't1_' + Date.now(), title: 'مذاكرة الدرس الأول وتلخيصه', completed: false },
        { id: 't2_' + Date.now(), title: 'حل بنك الأسئلة والتدريبات', completed: false },
      ],
    };

    saveMindMap({ ...mindMap, subjects: [...mindMap.subjects, newSubj] }, 'تمت إضافة المادة بنجاح 🎨');
    setNewSubjName('');
    setIsAddSubjectModalOpen(false);
  };

  // Reset to default sample template
  const handleResetToDefault = () => {
    if (confirm('هل أنت متأكد من استعادة النموذج الافتراضي للخريطة الذهنية؟')) {
      const resetState: MindMapState = {
        id: 'map-default',
        title: 'خطتي للمذاكرة',
        studentName: studentDisplayName,
        scope: 'weekly',
        motto: 'خطوة صغيرة كل يوم .. تصنع فرقًا كبيرًا',
        subjects: DEFAULT_SUBJECTS,
        lastSavedAt: new Date().toISOString(),
      };
      saveMindMap(resetState, 'تمت استعادة الخريطة الافتراضية بنجاح 🔄');
    }
  };

  // AI Auto-generator algorithm
  const handleGenerateAiMap = () => {
    let generatedSubjects: MindMapSubject[] = [];

    if (aiTrack === 'science') {
      generatedSubjects = [
        {
          ...DEFAULT_SUBJECTS[0], // Physics
          tasks: [
            { id: 'ap1', title: 'التيار الكهربي وقانون أوم وكيرشوف', completed: false },
            { id: 'ap2', title: 'التأثير المغناطيسي وأجهزة القياس', completed: false },
            { id: 'ap3', title: 'الحث الكهرومغناطيسي والدينامو والمحول', completed: false },
            { id: 'ap4', title: 'الفيزياء الحديثة وازدواجية الموجة والجسيم', completed: false },
            { id: 'ap5', title: 'حل اختبار شامل وتصحيح الأخطاء', completed: false },
          ],
        },
        {
          ...DEFAULT_SUBJECTS[1], // Chemistry
          tasks: [
            { id: 'ac1', title: 'العناصر الانتقالية والحديد وخواصه', completed: false },
            { id: 'ac2', title: 'التحليل الكيميائي الوصفي والكمي', completed: false },
            { id: 'ac3', title: 'الاتزان الكيميائي والأيوني وقاعدة لوشاتيليه', completed: false },
            { id: 'ac4', title: 'الكيمياء الكهربية والخلايا الجلفانية', completed: false },
            { id: 'ac5', title: 'الهيدروكربونات ومشتقاتها (العضوية)', completed: false },
          ],
        },
        {
          ...DEFAULT_SUBJECTS[5], // Biology
          tasks: [
            { id: 'ab1', title: 'الدعامة والحركة في النبات والإنسان', completed: false },
            { id: 'ab2', title: 'التنسيق الهرموني والغدد الصماء', completed: false },
            { id: 'ab3', title: 'التكاثر في الكائنات الحية والإنسان', completed: false },
            { id: 'ab4', title: 'المناعة في الإنسان وآليات الدفاع', completed: false },
            { id: 'ab5', title: 'الحمض النووي DNA وRNA والهندسة الوراثية', completed: false },
          ],
        },
        {
          ...DEFAULT_SUBJECTS[3], // English
          tasks: [
            { id: 'ae1', title: 'Unit 1-3 Grammar & Vocabulary Mastery', completed: false },
            { id: 'ae2', title: 'Reading Comprehension & Critical Thinking', completed: false },
            { id: 'ae3', title: 'Writing Skills (Essay & Punctuation)', completed: false },
            { id: 'ae4', title: 'Novel (Great Expectations) Characters & Themes', completed: false },
            { id: 'ae5', title: 'حل نماذج امتحانات منصة مستر محمد رضوان', completed: false },
          ],
        },
        {
          ...DEFAULT_SUBJECTS[4], // Arabic
          tasks: [
            { id: 'aa1', title: 'الوحدة الأولى والثانية نحو (المشتقات وإعمالها)', completed: false },
            { id: 'aa2', title: 'مفاهيم البلاغة والنصوص المتحررة', completed: false },
            { id: 'aa3', title: 'مدارس الأدب (الإحياء والبعث، الاتجاه الوجداني)', completed: false },
            { id: 'aa4', title: 'التعبير المقالي والموضوعي', completed: false },
            { id: 'aa5', title: 'حل امتحانات السنوات السابقة الشاملة', completed: false },
          ],
        },
        {
          id: 'subj-geology',
          name: 'الجيولوجيا وعلوم البيئة',
          colorName: 'amber',
          accentBg: 'bg-amber-600',
          accentBorder: 'border-amber-400 dark:border-amber-600',
          accentText: 'text-amber-600 dark:text-amber-300',
          badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-200 border-amber-300 dark:border-amber-800',
          lightCloudBg: 'bg-amber-600 text-white',
          darkCloudBg: 'dark:bg-amber-700 dark:text-white',
          svgColor: '#d97706',
          iconType: 'geology',
          subtitle: 'طبقات الأرض والمعادن والصخور',
          tasks: [
            { id: 'ag1', title: 'مكونات كوكب الأرض والجيولوجيا التاريخية', completed: false },
            { id: 'ag2', title: 'المعادن والأنظمة البلورية', completed: false },
            { id: 'ag3', title: 'الصخور النارية والرسوبية والمتحولة', completed: false },
            { id: 'ag4', title: 'الحركات الأرضية والانجراف القاري', completed: false },
            { id: 'ag5', title: 'مفاهيم البيئة واستنزاف الموارد الطبيعية', completed: false },
          ],
        },
      ];
    } else if (aiTrack === 'math') {
      generatedSubjects = [
        DEFAULT_SUBJECTS[0], // Physics
        DEFAULT_SUBJECTS[1], // Chemistry
        DEFAULT_SUBJECTS[2], // Math
        DEFAULT_SUBJECTS[3], // English
        DEFAULT_SUBJECTS[4], // Arabic
      ];
    } else if (aiTrack === 'literary') {
      generatedSubjects = [
        DEFAULT_SUBJECTS[3], // English
        DEFAULT_SUBJECTS[4], // Arabic
        {
          id: 'subj-history',
          name: 'التاريخ',
          colorName: 'amber',
          accentBg: 'bg-amber-600',
          accentBorder: 'border-amber-400 dark:border-amber-600',
          accentText: 'text-amber-600 dark:text-amber-300',
          badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-200 border-amber-300 dark:border-amber-800',
          lightCloudBg: 'bg-amber-600 text-white',
          darkCloudBg: 'dark:bg-amber-700 dark:text-white',
          svgColor: '#d97706',
          iconType: 'history',
          subtitle: 'الحملة الفرنسية، محمد علي، وثورات مصر',
          tasks: [
            { id: 'h1', title: 'الحملة الفرنسية على مصر والشام', completed: false },
            { id: 'h2', title: 'بناء الدولة الحديثة في عهد محمد علي', completed: false },
            { id: 'h3', title: 'مصر منذ الثورة العرابية حتى الحرب العالمية الأولى', completed: false },
            { id: 'h4', title: 'ثورة 1919 ومصر حتى ثورة 23 يوليو 1952', completed: false },
            { id: 'h5', title: 'حل بنك أسئلة نواتج التعلم التاريخية', completed: false },
          ],
        },
        {
          id: 'subj-geography',
          name: 'الجغرافيا السياسية',
          colorName: 'blue',
          accentBg: 'bg-blue-600',
          accentBorder: 'border-blue-400 dark:border-blue-600',
          accentText: 'text-blue-600 dark:text-blue-300',
          badgeBg: 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-200 border-blue-300 dark:border-blue-800',
          lightCloudBg: 'bg-blue-600 text-white',
          darkCloudBg: 'dark:bg-blue-700 dark:text-white',
          svgColor: '#2563eb',
          iconType: 'geography',
          subtitle: 'الدولة، الحدود، والتكتلات الاقتصادية',
          tasks: [
            { id: 'g1', title: 'مفهوم الجغرافيا السياسية والدولة كظاهرة', completed: false },
            { id: 'g2', title: 'المقومات الطبيعية والبشرية لقوة الدولة', completed: false },
            { id: 'g3', title: 'تطور خريطة العالم والحدود السياسية', completed: false },
            { id: 'g4', title: 'التكتلات الاقتصادية والأحلاف العسكرية', completed: false },
            { id: 'g5', title: 'النظام العالمي الجديد والعولمة', completed: false },
          ],
        },
        {
          id: 'subj-philosophy',
          name: 'الفلسفة والمنطق',
          colorName: 'purple',
          accentBg: 'bg-purple-600',
          accentBorder: 'border-purple-400 dark:border-purple-600',
          accentText: 'text-purple-600 dark:text-purple-300',
          badgeBg: 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-200 border-purple-300 dark:border-purple-800',
          lightCloudBg: 'bg-purple-600 text-white',
          darkCloudBg: 'dark:bg-purple-700 dark:text-white',
          svgColor: '#9333ea',
          iconType: 'philosophy',
          subtitle: 'فلسفة البيئة والأخلاق والمنطق الاستقرائي',
          tasks: [
            { id: 'ph1', title: 'فلسفة البيئة وقضايا الحفاظ عليها', completed: false },
            { id: 'ph2', title: 'البيوتيقا والرؤية الفلسفية للأخلاق الطبية', completed: false },
            { id: 'ph3', title: 'أخلاق المهنة والواجب المهني', completed: false },
            { id: 'ph4', title: 'الاستدلال الاستقرائي وتطبيقه في العلوم', completed: false },
            { id: 'ph5', title: 'المنطق والذكاء الاصطناعي والصياغة الرمزية', completed: false },
          ],
        },
      ];
    } else {
      // English Focus
      generatedSubjects = [
        DEFAULT_SUBJECTS[3], // English
        {
          id: 'subj-grammar-intense',
          name: 'Grammar Deep Dive',
          colorName: 'blue',
          accentBg: 'bg-blue-600',
          accentBorder: 'border-blue-400 dark:border-blue-600',
          accentText: 'text-blue-600 dark:text-blue-300',
          badgeBg: 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-200 border-blue-300 dark:border-blue-800',
          lightCloudBg: 'bg-blue-600 text-white',
          darkCloudBg: 'dark:bg-blue-700 dark:text-white',
          svgColor: '#2563eb',
          iconType: 'english',
          subtitle: 'Tenses, Conditionals, Inversion',
          tasks: [
            { id: 'eg1', title: 'Present & Past Tenses (Simple, Continuous, Perfect)', completed: false },
            { id: 'eg2', title: 'Modal Verbs of Deduction & Regret', completed: false },
            { id: 'eg3', title: 'Conditionals (Zero to 3rd) & If Alternatives', completed: false },
            { id: 'eg4', title: 'Passive Voice & Causative Verbs (Have/Get)', completed: false },
            { id: 'eg5', title: 'Reported Speech & Reporting Verbs Mastery', completed: false },
          ],
        },
        {
          id: 'subj-vocab-intense',
          name: 'Vocabulary & Idioms',
          colorName: 'teal',
          accentBg: 'bg-teal-600',
          accentBorder: 'border-teal-400 dark:border-teal-600',
          accentText: 'text-teal-600 dark:text-teal-300',
          badgeBg: 'bg-teal-100 text-teal-800 dark:bg-teal-950/70 dark:text-teal-200 border-teal-300 dark:border-teal-800',
          lightCloudBg: 'bg-teal-600 text-white',
          darkCloudBg: 'dark:bg-teal-700 dark:text-white',
          svgColor: '#0d9488',
          iconType: 'english',
          subtitle: 'Phrasal Verbs, Collocations, Synonyms',
          tasks: [
            { id: 'ev1', title: 'Key Unit Collocations & Prepositions', completed: false },
            { id: 'ev2', title: 'Confusing Words & Common Traps', completed: false },
            { id: 'ev3', title: 'Prefixes, Suffixes & Word Formation', completed: false },
            { id: 'ev4', title: 'Advanced Idioms for High Band Score', completed: false },
            { id: 'ev5', title: 'Weekly Vocab Speed Test & Flashcards', completed: false },
          ],
        },
        DEFAULT_SUBJECTS[0], // Physics
        DEFAULT_SUBJECTS[1], // Chemistry
        DEFAULT_SUBJECTS[4], // Arabic
      ];
    }

    const updatedMap: MindMapState = {
      ...mindMap,
      subjects: generatedSubjects,
      lastSavedAt: new Date().toISOString(),
    };

    saveMindMap(updatedMap, 'تم توليد الخريطة الذكية بنجاح بواسطة الخوارزمية 🚀');
    setIsAiModalOpen(false);
  };

  // High-Resolution Printing with Landscape Print Engine
  const handlePrint = () => {
    window.print();
  };

  // Export JSON backup
  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(mindMap, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `mind_map_${mindMap.studentName.replace(/\s+/g, '_')}_${mindMap.scope}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showNotification('تم تحميل نسخة احتياطية من الخريطة 💾');
  };

  // Calculate statistics
  const totalTasks = mindMap.subjects.reduce((acc, s) => acc + s.tasks.length, 0);
  const completedTasks = mindMap.subjects.reduce(
    (acc, s) => acc + s.tasks.filter((t) => t.completed).length,
    0
  );
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Render subject icon helper
  const renderSubjectIcon = (type: MindMapSubject['iconType'], className = 'w-6 h-6') => {
    switch (type) {
      case 'physics':
        return <Atom className={className} />;
      case 'chemistry':
        return <FlaskConical className={className} />;
      case 'math':
        return <Calculator className={className} />;
      case 'english':
        return <Languages className={className} />;
      case 'arabic':
        return <BookOpen className={className} />;
      case 'biology':
        return <Microscope className={className} />;
      case 'geology':
        return <Mountain className={className} />;
      case 'history':
        return <Feather className={className} />;
      case 'geography':
        return <Globe className={className} />;
      case 'philosophy':
        return <Scale className={className} />;
      default:
        return <Sparkles className={className} />;
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full transition-all duration-300 ${
        isFullscreen ? 'fixed inset-0 z-50 bg-slate-100 dark:bg-slate-950 overflow-y-auto p-4 sm:p-8' : ''
      }`}
    >
      {/* ============================================================== */}
      {/* Control Header & Action Bar                                    */}
      {/* ============================================================== */}
      <div className="no-print bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 mb-6 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Left / Title Info */}
        <div className="flex items-center gap-3.5 w-full lg:w-auto">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-violet-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                خريطة المذاكرة الذهنية التفاعلية
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                إصدار 2030 الذكي
              </span>
            </div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">
              خريطة متطورة لتنظيم المواد الدراسية، مخصصة للطالب{' '}
              <span className="text-violet-600 dark:text-violet-400 font-black">{mindMap.studentName}</span>
            </p>
          </div>
        </div>

        {/* Middle: Scope Selector & View Mode */}
        <div className="flex items-center gap-2 flex-wrap justify-center w-full lg:w-auto">
          {/* Scope Pills */}
          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl flex items-center gap-1">
            <button
              onClick={() => saveMindMap({ ...mindMap, scope: 'daily' }, 'تم التحويل للخطة اليومية')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                mindMap.scope === 'daily'
                  ? 'bg-white dark:bg-slate-900 text-violet-600 dark:text-violet-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              خطة اليوم
            </button>
            <button
              onClick={() => saveMindMap({ ...mindMap, scope: 'weekly' }, 'تم التحويل للخطة الأسبوعية')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                mindMap.scope === 'weekly'
                  ? 'bg-white dark:bg-slate-900 text-violet-600 dark:text-violet-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              خطة الأسبوع
            </button>
            <button
              onClick={() => saveMindMap({ ...mindMap, scope: 'monthly' }, 'تم التحويل للخطة الشهرية')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                mindMap.scope === 'monthly'
                  ? 'bg-white dark:bg-slate-900 text-violet-600 dark:text-violet-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              خطة الشهر
            </button>
          </div>

          {/* Layout Mode */}
          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl flex items-center gap-1">
            <button
              onClick={() => setActiveLayout('organic')}
              title="النمط السحابي الفني (مثل الصورة المرجعية)"
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 ${
                activeLayout === 'organic'
                  ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>فني سحابي</span>
            </button>
            <button
              onClick={() => setActiveLayout('cyber')}
              title="النمط المداري المستقبلي 2030"
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 ${
                activeLayout === 'cyber'
                  ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <BrainCircuit className="w-3.5 h-3.5" />
              <span>نيون 2030</span>
            </button>
            <button
              onClick={() => setActiveLayout('grid')}
              title="نمط البطاقات المنظمة للطباعة والمراجعة السريعة"
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 ${
                activeLayout === 'grid'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>هيكلي</span>
            </button>
          </div>
        </div>

        {/* Right / Quick Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap justify-end w-full lg:w-auto">
          {/* Smart AI Generator Button */}
          <button
            onClick={() => setIsAiModalOpen(true)}
            className="py-2.5 px-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-violet-500/20 active:scale-95 transition-all"
          >
            <Wand2 className="w-4 h-4 text-amber-300" />
            <span>توليد تلقائي ذكي</span>
          </button>

          {/* Add Subject Button */}
          <button
            onClick={() => setIsAddSubjectModalOpen(true)}
            className="py-2.5 px-3.5 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة مادة</span>
          </button>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            title="طباعة الخريطة بجودة عالية أو حفظ كـ PDF"
            className="py-2.5 px-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة الخريطة</span>
          </button>

          {/* Backup Button */}
          <button
            onClick={handleExportJson}
            title="تحميل نسخة احتياطية من الخريطة"
            className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs transition-colors"
          >
            <FileDown className="w-4 h-4" />
          </button>

          {/* Reset Template */}
          <button
            onClick={handleResetToDefault}
            title="استعادة النموذج الأصلي"
            className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'تصغير' : 'ملء الشاشة'}
            className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Progress & Stats Bar */}
      <div className="no-print bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-emerald-500/10 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-600 text-white flex items-center justify-center font-black text-sm">
            {completionPercentage}%
          </div>
          <div>
            <h4 className="font-black text-slate-900 dark:text-white text-xs sm:text-sm">
              إنجاز خريطة المذاكرة: {completedTasks} من {totalTasks} بنود مكتملة
            </h4>
            <p className="text-[11px] font-bold text-slate-500">
              {completionPercentage === 100
                ? 'مذهل! أتممت جميع أهداف خريطتك بنجاح 🏆'
                : 'استمر في الإنجاز لتلوين خريطتك بالكامل وتحقيق التفوق 🎯'}
            </p>
          </div>
        </div>

        {/* Progress bar line */}
        <div className="w-full sm:w-64 bg-slate-200 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-600 to-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 py-3 px-6 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-sm shadow-2xl flex items-center gap-2 border border-slate-700 dark:border-slate-300"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
            <span>{notification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================================== */}
      {/* PRINTABLE CANVAS CONTAINER                                     */}
      {/* ============================================================== */}
      <div
        id="student-mind-map-printable"
        className={`
          relative w-full rounded-3xl p-6 sm:p-10 border transition-all duration-300 overflow-hidden
          ${
            activeLayout === 'cyber'
              ? 'bg-slate-950 border-cyan-900/60 text-cyan-50 shadow-2xl'
              : 'bg-[#fffdf7] dark:bg-slate-900 border-amber-200/80 dark:border-slate-800 text-slate-900 dark:text-white shadow-xl'
          }
        `}
        style={{ minHeight: '850px' }}
      >
        {/* Subtle Background Doodles and Atmospheric Elements (like in reference image) */}
        {activeLayout === 'organic' && (
          <div className="absolute inset-0 pointer-events-none select-none opacity-40 dark:opacity-10 overflow-hidden">
            {/* E=mc2 doodle top-left */}
            <div className="absolute top-12 left-20 font-black text-2xl text-sky-700/60 rotate-[-12deg] tracking-wider font-mono">
              E = mc²
            </div>
            {/* ABC doodle bottom-right */}
            <div className="absolute bottom-28 right-28 font-black text-3xl text-teal-700/50 rotate-[8deg]">
              ABC
            </div>
            {/* Pi doodle middle-right */}
            <div className="absolute top-1/2 right-12 font-black text-4xl text-purple-700/50 rotate-[-6deg]">
              π
            </div>
            {/* Better Study Better Future doodle bottom-left */}
            <div className="absolute bottom-16 left-14 text-xs font-black text-slate-700/60 leading-tight">
              Better<br />Study<br />Better<br />Future ♥
            </div>
            {/* Calligraphy doodle bottom-center */}
            <div className="absolute bottom-12 left-1/3 font-black text-xl text-rose-700/60 rotate-[-15deg]">
              توفيقك يا رب ✍️
            </div>
          </div>
        )}

        {/* Printable Header Bar (Only visible in Print or high-res export) */}
        <div className="print-only border-b-2 border-slate-300 pb-4 mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900">
              خريطة المذاكرة الذهنية • Easy English مع مستر محمد رضوان
            </h1>
            <p className="text-sm font-bold text-slate-600 mt-1">
              اسم الطالب: {mindMap.studentName} | النطاق الزمني:{' '}
              {mindMap.scope === 'daily' ? 'خطة يومية' : mindMap.scope === 'weekly' ? 'خطة أسبوعية' : 'خطة شهرية'} | تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}
            </p>
          </div>
          <div className="text-left font-black text-xs text-slate-500">
            <div>منصة التفوق الأكاديمي</div>
            <div className="text-emerald-700">مستر محمد رضوان 2027 - 2028</div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* LAYOUT 1: ORGANIC CLOUD MIND MAP (REFERENCE IMAGE FIDELITY)     */}
        {/* ============================================================== */}
        {activeLayout === 'organic' && (
          <div className="relative w-full flex flex-col items-center">
            {/* Central Brain / Hub Node */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative z-20 mb-8 sm:mb-12 max-w-md w-full"
            >
              {/* Glowing Lightbulb illustration on top of center hub */}
              <div className="flex justify-center -mb-5 relative z-30">
                <div className="w-16 h-16 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-xl shadow-amber-400/50 border-4 border-amber-200 animate-pulse">
                  <Lightbulb className="w-9 h-9 fill-amber-300 stroke-slate-950 stroke-[2.5]" />
                </div>
              </div>

              {/* Central Dark Cloud Hub with Student's Name and Title */}
              <div className="bg-slate-950 text-white dark:bg-slate-800 rounded-[2.5rem] p-6 sm:p-7 text-center shadow-2xl border-4 border-amber-300/60 relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-28 h-28 bg-amber-400/10 rounded-full blur-xl" />
                <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-violet-400/10 rounded-full blur-xl" />

                <div className="relative z-10 pt-2">
                  <span className="inline-block px-3 py-1 rounded-full text-[11px] font-black bg-amber-400 text-slate-950 mb-2 shadow-sm">
                    {mindMap.scope === 'daily'
                      ? '⚡ خطة المذاكرة اليومية'
                      : mindMap.scope === 'weekly'
                      ? '🗓️ خطة المذاكرة الأسبوعية'
                      : '🎯 خطة المذاكرة الشهرية'}
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black text-amber-300 tracking-tight mb-1">
                    {mindMap.title}
                  </h3>
                  <p className="text-sm font-extrabold text-slate-300 flex items-center justify-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-amber-400" />
                    <span>خريطة الطالب: {mindMap.studentName}</span>
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Surrounding Subject Clusters in Responsive Organic Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 w-full relative z-10">
              {mindMap.subjects.map((subject, idx) => {
                const completedCount = subject.tasks.filter((t) => t.completed).length;
                const totalCount = subject.tasks.length;
                const isAllDone = totalCount > 0 && completedCount === totalCount;

                return (
                  <motion.div
                    key={subject.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.08 }}
                    className={`
                      relative rounded-3xl p-5 sm:p-6 transition-all duration-300 border-2
                      ${
                        isAllDone
                          ? 'bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-400'
                          : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl'
                      }
                    `}
                  >
                    {/* Organic Subject Cloud Header */}
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div className="flex items-center gap-2.5">
                        {/* Subject Icon Cloud Badge */}
                        <div
                          className={`w-12 h-12 rounded-2xl ${subject.lightCloudBg} ${subject.darkCloudBg} flex items-center justify-center shadow-md shrink-0`}
                        >
                          {renderSubjectIcon(subject.iconType, 'w-6 h-6')}
                        </div>
                        <div>
                          <h4 className="font-black text-lg text-slate-900 dark:text-white leading-tight">
                            {subject.name}
                          </h4>
                          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                            {subject.subtitle}
                          </p>
                        </div>
                      </div>

                      {/* Subject Actions & Badge */}
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${subject.badgeBg} border`}>
                          {completedCount}/{totalCount}
                        </span>

                        <div className="no-print flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingTaskSubjectId(subject.id);
                              setNewTaskInput('');
                            }}
                            title="إضافة بند لهذا الموضوع"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-slate-700 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteSubject(subject.id)}
                            title="حذف المادة من الخريطة"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-700 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Quick Inline Add Task Input */}
                    {editingTaskSubjectId === subject.id && (
                      <div className="no-print mb-3 p-2 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center gap-2">
                        <input
                          type="text"
                          autoFocus
                          placeholder="اكتب اسم الدرس أو المهمة..."
                          value={newTaskInput}
                          onChange={(e) => setNewTaskInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddTask(subject.id);
                          }}
                          className="flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white"
                        />
                        <button
                          onClick={() => handleAddTask(subject.id)}
                          className="p-1.5 rounded-xl bg-violet-600 text-white hover:bg-violet-700"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingTaskSubjectId(null)}
                          className="p-1.5 rounded-xl bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {/* Task Pills / Branch Items (exactly like the reference image pills) */}
                    <div className="space-y-2">
                      {subject.tasks.map((task) => (
                        <div
                          key={task.id}
                          onClick={() => handleToggleTask(subject.id, task.id)}
                          className={`
                            group flex items-center justify-between gap-2.5 p-2.5 rounded-2xl cursor-pointer transition-all duration-200 border
                            ${
                              task.completed
                                ? 'bg-emerald-500/10 border-emerald-400/40 text-emerald-800 dark:text-emerald-300'
                                : 'bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-900 border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                            }
                          `}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {/* Checkmark circle */}
                            <div
                              className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-90 ${
                                task.completed
                                  ? 'bg-emerald-500 text-white shadow-xs'
                                  : 'border-2 border-slate-300 dark:border-slate-600 group-hover:border-violet-500'
                              }`}
                            >
                              {task.completed && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>

                            <span
                              className={`text-xs font-black truncate ${
                                task.completed
                                  ? 'line-through decoration-2 decoration-emerald-500 opacity-75'
                                  : ''
                              }`}
                            >
                              {task.title}
                            </span>
                          </div>

                          <div className="no-print opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTask(subject.id, task.id);
                              }}
                              className="p-1 text-slate-400 hover:text-rose-500 rounded"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {subject.tasks.length === 0 && (
                        <div className="text-center py-4 text-xs font-bold text-slate-400">
                          لا توجد بنود مضافة بعد. اضغط (+) لإضافة أول درس.
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Motivational Quote at Bottom (as seen in reference image) */}
            <div className="mt-10 text-center relative z-10">
              <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-amber-100/80 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 shadow-sm">
                <span className="text-sm sm:text-base font-black text-amber-900 dark:text-amber-200">
                  {mindMap.motto}
                </span>
                <Heart className="w-4 h-4 text-rose-500 fill-rose-500 inline" />
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* LAYOUT 2: CYBER 2030 NEON MATRIX                               */}
        {/* ============================================================== */}
        {activeLayout === 'cyber' && (
          <div className="relative w-full space-y-8">
            <div className="text-center py-4 border-b border-cyan-800/60 pb-6">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                CYBERNETIC MIND MAP ENGINE v2030
              </span>
              <h3 className="text-3xl font-black text-cyan-300 mt-2 tracking-wide">
                {mindMap.title} • {mindMap.studentName}
              </h3>
              <p className="text-xs font-mono text-cyan-400/80 mt-1">
                COMPLETION RATIO: {completionPercentage}% | ACTIVE NODES: {mindMap.subjects.length}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mindMap.subjects.map((subject) => {
                const completedCount = subject.tasks.filter((t) => t.completed).length;
                return (
                  <div
                    key={subject.id}
                    className="p-5 rounded-3xl bg-slate-900/90 border border-cyan-800/80 shadow-lg shadow-cyan-950/50 relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-cyan-900/60">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center">
                          {renderSubjectIcon(subject.iconType, 'w-5 h-5')}
                        </div>
                        <div>
                          <h4 className="font-black text-base text-cyan-100">{subject.name}</h4>
                          <span className="text-[10px] font-mono text-cyan-400">
                            {completedCount}/{subject.tasks.length} SYNCED
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setEditingTaskSubjectId(subject.id);
                          setNewTaskInput('');
                        }}
                        className="no-print p-1.5 rounded-lg text-cyan-400 hover:bg-cyan-950"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    {editingTaskSubjectId === subject.id && (
                      <div className="no-print mb-3 flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="مهمة جديدة..."
                          value={newTaskInput}
                          onChange={(e) => setNewTaskInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddTask(subject.id)}
                          className="flex-1 bg-slate-950 border border-cyan-700 rounded-xl px-3 py-1.5 text-xs text-white"
                        />
                        <button
                          onClick={() => handleAddTask(subject.id)}
                          className="px-3 py-1.5 bg-cyan-600 rounded-xl text-xs font-black text-white"
                        >
                          إضافة
                        </button>
                      </div>
                    )}

                    <div className="space-y-2">
                      {subject.tasks.map((task) => (
                        <div
                          key={task.id}
                          onClick={() => handleToggleTask(subject.id, task.id)}
                          className={`p-2.5 rounded-xl cursor-pointer border flex items-center justify-between transition-colors ${
                            task.completed
                              ? 'bg-cyan-950/40 border-cyan-500/40 text-cyan-300'
                              : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-cyan-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                                task.completed ? 'bg-cyan-500 border-cyan-400 text-slate-950' : 'border-slate-600'
                              }`}
                            >
                              {task.completed && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span className={`text-xs font-bold ${task.completed ? 'line-through opacity-70' : ''}`}>
                              {task.title}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* LAYOUT 3: STRUCTURED CARDS HIERARCHY                           */}
        {/* ============================================================== */}
        {activeLayout === 'grid' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  جدول المهام الهيكلي • {mindMap.studentName}
                </h3>
                <p className="text-xs font-bold text-slate-500">
                  عرض قوائم مفصل لتنظيم أولويات المذاكرة والواجبات والمراجعة
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-xl text-xs font-black bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200">
                  {mindMap.subjects.length} مواد مسجلة
                </span>
                <span className="px-3 py-1 rounded-xl text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                  {completedTasks}/{totalTasks} تم إنجازها
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mindMap.subjects.map((sub) => (
                <div
                  key={sub.id}
                  className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm"
                >
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-xl ${sub.lightCloudBg} ${sub.darkCloudBg}`}>
                        {renderSubjectIcon(sub.iconType, 'w-4 h-4')}
                      </div>
                      <h4 className="font-black text-base text-slate-900 dark:text-white">{sub.name}</h4>
                    </div>
                    <span className="text-xs font-bold text-slate-400">
                      {sub.tasks.filter((t) => t.completed).length} من {sub.tasks.length}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {sub.tasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => handleToggleTask(sub.id, task.id)}
                        className="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer"
                      >
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            task.completed
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'border-slate-400'
                          }`}
                        >
                          {task.completed && <Check className="w-3 h-3" />}
                        </div>
                        <span
                          className={`text-xs font-bold ${
                            task.completed ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {task.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Printable Official Footer Signature */}
        <div className="mt-12 pt-6 border-t border-slate-300 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-bold text-slate-500">
          <div className="flex items-center gap-2">
            <span>منصة Easy English التعليمية</span>
            <span>•</span>
            <span>بإشراف: مستر محمد رضوان</span>
          </div>
          <div className="text-emerald-600 dark:text-emerald-400 font-black">
            Built With Developer & Designer NOUR M. EL-SAIED 💚 💚
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODAL 1: AI AUTO-GENERATOR ALGORITHM                           */}
      {/* ============================================================== */}
      <AnimatePresence>
        {isAiModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-violet-600 text-white flex items-center justify-center">
                    <Wand2 className="w-5 h-5 text-amber-300" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-white text-base">
                      التوليد الذكي لخريطة المذاكرة
                    </h3>
                    <p className="text-xs font-bold text-slate-500">
                      خوارزمية ذكية لبناء وتوزيع بنود المذاكرة لكل مادة
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAiModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Controls */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2">
                    اختر الشعبة أو مسار الدراسة:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAiTrack('science')}
                      className={`p-3 rounded-2xl border text-right font-black text-xs transition-all ${
                        aiTrack === 'science'
                          ? 'border-violet-600 bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      🧪 علمي علوم
                      <div className="text-[10px] font-normal text-slate-500 mt-0.5">فيزياء، كيمياء، أحياء، جيولوجيا</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAiTrack('math')}
                      className={`p-3 rounded-2xl border text-right font-black text-xs transition-all ${
                        aiTrack === 'math'
                          ? 'border-violet-600 bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      📐 علمي رياضة
                      <div className="text-[10px] font-normal text-slate-500 mt-0.5">رياضيات بحتة وتطبيقية وفيزياء</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAiTrack('literary')}
                      className={`p-3 rounded-2xl border text-right font-black text-xs transition-all ${
                        aiTrack === 'literary'
                          ? 'border-violet-600 bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      📜 الشعبة الأدبية
                      <div className="text-[10px] font-normal text-slate-500 mt-0.5">تاريخ، جغرافيا، فلسفة، منطق</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAiTrack('english_focus')}
                      className={`p-3 rounded-2xl border text-right font-black text-xs transition-all ${
                        aiTrack === 'english_focus'
                          ? 'border-violet-600 bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      🇬🇧 تركيز مكثف لغة إنجليزية
                      <div className="text-[10px] font-normal text-slate-500 mt-0.5">معسكر التفوق مع مستر محمد رضوان</div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2">
                    كثافة وأسلوب الخطة:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setAiIntensity('normal')}
                      className={`p-2.5 rounded-xl border text-center font-bold text-xs ${
                        aiIntensity === 'normal'
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                          : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      متوازنة
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiIntensity('intense')}
                      className={`p-2.5 rounded-xl border text-center font-bold text-xs ${
                        aiIntensity === 'intense'
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                          : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      مكثفة
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiIntensity('exam_ready')}
                      className={`p-2.5 rounded-xl border text-center font-bold text-xs ${
                        aiIntensity === 'exam_ready'
                          ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                          : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      مراجعة امتحانات
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAiModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleGenerateAiMap}
                  className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>توليد وتحديث الخريطة الآن</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================== */}
      {/* MODAL 2: ADD NEW SUBJECT MODAL                                 */}
      {/* ============================================================== */}
      <AnimatePresence>
        {isAddSubjectModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
            <motion.form
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onSubmit={handleCreateSubject}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <h3 className="font-black text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <Plus className="w-5 h-5 text-violet-500" />
                  <span>إضافة مادة جديدة إلى خريطتك</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAddSubjectModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                  اسم المادة:
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: اللغة الفرنسية، التاريخ، الجغرافيا..."
                  value={newSubjName}
                  onChange={(e) => setNewSubjName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                  الأيقونة التوضيحية:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'physics', label: 'ذرة', icon: Atom },
                    { id: 'chemistry', label: 'دوارق', icon: FlaskConical },
                    { id: 'math', label: 'حساب', icon: Calculator },
                    { id: 'biology', label: 'مجهر', icon: Microscope },
                    { id: 'english', label: 'لغات', icon: Languages },
                    { id: 'arabic', label: 'كتاب', icon: BookOpen },
                    { id: 'history', label: 'ريشة', icon: Feather },
                    { id: 'geography', label: 'كرة أرضية', icon: Globe },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setNewSubjIcon(item.id as any)}
                      className={`p-2 rounded-xl border flex flex-col items-center gap-1 text-[10px] font-bold ${
                        newSubjIcon === item.id
                          ? 'border-violet-600 bg-violet-50 dark:bg-violet-950/40 text-violet-600'
                          : 'border-slate-200 dark:border-slate-800 text-slate-500'
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                  اللون المفضل للمادة:
                </label>
                <div className="flex items-center gap-3">
                  {[
                    { id: 'blue', bg: 'bg-blue-600' },
                    { id: 'emerald', bg: 'bg-emerald-600' },
                    { id: 'amber', bg: 'bg-amber-600' },
                    { id: 'fuchsia', bg: 'bg-fuchsia-600' },
                  ].map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setNewSubjColor(c.id)}
                      className={`w-8 h-8 rounded-full ${c.bg} transition-transform ${
                        newSubjColor === c.id ? 'ring-4 ring-violet-400 scale-110' : ''
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddSubjectModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-black text-xs shadow-md"
                >
                  إضافة المادة للخريطة
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
