'use client';

export type MindMapShape =
  | 'sketchbook'
  | 'radial_tree'
  | 'organic_clouds'
  | 'formal_sheet'
  | 'timeline_roadmap'
  | 'kanban_board';
export type MindMapPaperStyle = 'plain' | 'cream' | 'grid' | 'ruled' | 'dots';
export type MindMapScope = 'daily' | 'weekly' | 'monthly';
export type BranchPriority = 'normal' | 'high' | 'quick';

export interface WordStyleRule {
  index: number;
  color?: string;
  highlight?: string;
  bold?: boolean;
  underline?: boolean;
}

export interface MindMapBranchItem {
  id: string;
  text: string;
  completed: boolean;
  priority?: BranchPriority;
  scheduledDay?: number;
  lineColor?: string;
  lineHighlight?: string;
  bold?: boolean;
  wordStyles?: WordStyleRule[];
}

export interface MindMapSubjectNode {
  id: string;
  name: string;
  emoji: string;
  colorId: string;
  items: MindMapBranchItem[];
}

export interface MindMapDocument {
  id: string;
  title: string;
  studentName: string;
  scope: MindMapScope;
  trackId: string;
  shape: MindMapShape;
  fontId: string;
  paper: MindMapPaperStyle;
  motto: string;
  showCheckboxesInPrint: boolean;
  subjects: MindMapSubjectNode[];
  updatedAt: string;
}

export interface SubjectPalette {
  id: string;
  name: string;
  hex: string;
  softHex: string;
  headerBg: string;
  borderClass: string;
  softBg: string;
  textClass: string;
}

export const SUBJECT_PALETTES: SubjectPalette[] = [
  {
    id: 'sky',
    name: 'أزرق سماوي',
    hex: '#0284c7',
    softHex: '#e0f2fe',
    headerBg: 'bg-sky-600 text-white',
    borderClass: 'border-sky-400 dark:border-sky-600',
    softBg: 'bg-sky-50/70 dark:bg-sky-950/30',
    textClass: 'text-sky-700 dark:text-sky-300',
  },
  {
    id: 'orange',
    name: 'برتقالي دافئ',
    hex: '#ea580c',
    softHex: '#ffedd5',
    headerBg: 'bg-orange-600 text-white',
    borderClass: 'border-orange-400 dark:border-orange-600',
    softBg: 'bg-orange-50/70 dark:bg-orange-950/30',
    textClass: 'text-orange-700 dark:text-orange-300',
  },
  {
    id: 'emerald',
    name: 'أخضر زمردي',
    hex: '#059669',
    softHex: '#d1fae5',
    headerBg: 'bg-emerald-600 text-white',
    borderClass: 'border-emerald-400 dark:border-emerald-600',
    softBg: 'bg-emerald-50/70 dark:bg-emerald-950/30',
    textClass: 'text-emerald-700 dark:text-emerald-300',
  },
  {
    id: 'violet',
    name: 'بنفسجي ملكي',
    hex: '#7c3aed',
    softHex: '#ede9fe',
    headerBg: 'bg-violet-600 text-white',
    borderClass: 'border-violet-400 dark:border-violet-600',
    softBg: 'bg-violet-50/70 dark:bg-violet-950/30',
    textClass: 'text-violet-700 dark:text-violet-300',
  },
  {
    id: 'rose',
    name: 'أحمر وردي',
    hex: '#e11d48',
    softHex: '#ffe4e6',
    headerBg: 'bg-rose-600 text-white',
    borderClass: 'border-rose-400 dark:border-rose-600',
    softBg: 'bg-rose-50/70 dark:bg-rose-950/30',
    textClass: 'text-rose-700 dark:text-rose-300',
  },
  {
    id: 'teal',
    name: 'تركوازي هادئ',
    hex: '#0d9488',
    softHex: '#ccfbf1',
    headerBg: 'bg-teal-600 text-white',
    borderClass: 'border-teal-400 dark:border-teal-600',
    softBg: 'bg-teal-50/70 dark:bg-teal-950/30',
    textClass: 'text-teal-700 dark:text-teal-300',
  },
  {
    id: 'amber',
    name: 'ذهبي كهرماني',
    hex: '#d97706',
    softHex: '#fef3c7',
    headerBg: 'bg-amber-600 text-white',
    borderClass: 'border-amber-400 dark:border-amber-600',
    softBg: 'bg-amber-50/70 dark:bg-amber-950/30',
    textClass: 'text-amber-700 dark:text-amber-300',
  },
  {
    id: 'indigo',
    name: 'نيلي عميق',
    hex: '#4f46e5',
    softHex: '#e0e7ff',
    headerBg: 'bg-indigo-600 text-white',
    borderClass: 'border-indigo-400 dark:border-indigo-600',
    softBg: 'bg-indigo-50/70 dark:bg-indigo-950/30',
    textClass: 'text-indigo-700 dark:text-indigo-300',
  },
];

export function getPaletteById(colorId: string): SubjectPalette {
  return SUBJECT_PALETTES.find((p) => p.id === colorId) || SUBJECT_PALETTES[0];
}

export interface TrackSubjectTemplate {
  name: string;
  emoji: string;
  colorId: string;
}

export interface AcademicTrackDefinition {
  id: string;
  label: string;
  description: string;
  badgeEmoji: string;
  subjects: TrackSubjectTemplate[];
}

export const ACADEMIC_TRACKS: AcademicTrackDefinition[] = [
  {
    id: 'science_bio',
    label: 'الشعبة العلمية (علمي علوم)',
    description: 'فيزياء، كيمياء، أحياء، جيولوجيا، واللغات — جاهزة لتخطيطك من الصفر',
    badgeEmoji: '🧬',
    subjects: [
      { name: 'الفيزياء', emoji: '⚛️', colorId: 'sky' },
      { name: 'الكيمياء', emoji: '🧪', colorId: 'orange' },
      { name: 'الأحياء', emoji: '🧬', colorId: 'emerald' },
      { name: 'الجيولوجيا', emoji: '🪨', colorId: 'amber' },
      { name: 'اللغة الإنجليزية', emoji: '🇬🇧', colorId: 'teal' },
      { name: 'اللغة العربية', emoji: '🪶', colorId: 'rose' },
      { name: 'اللغة الأجنبية الثانية', emoji: '🗣️', colorId: 'violet' },
    ],
  },
  {
    id: 'science_math',
    label: 'الشعبة العلمية (علمي رياضة)',
    description: 'فيزياء، كيمياء، رياضيات بحتة وتطبيقية، واللغات',
    badgeEmoji: '📐',
    subjects: [
      { name: 'الفيزياء', emoji: '⚛️', colorId: 'sky' },
      { name: 'الكيمياء', emoji: '🧪', colorId: 'orange' },
      { name: 'الرياضيات البحتة', emoji: '📐', colorId: 'violet' },
      { name: 'الرياضيات التطبيقية', emoji: '⚙️', colorId: 'indigo' },
      { name: 'اللغة الإنجليزية', emoji: '🇬🇧', colorId: 'teal' },
      { name: 'اللغة العربية', emoji: '🪶', colorId: 'rose' },
      { name: 'اللغة الأجنبية الثانية', emoji: '🗣️', colorId: 'amber' },
    ],
  },
  {
    id: 'literary',
    label: 'الشعبة الأدبية',
    description: 'تاريخ، جغرافيا، فلسفة ومنطق، علم نفس واجتماع، واللغات',
    badgeEmoji: '🏛️',
    subjects: [
      { name: 'التاريخ', emoji: '🏛️', colorId: 'amber' },
      { name: 'الجغرافيا', emoji: '🗺️', colorId: 'emerald' },
      { name: 'الفلسفة والمنطق', emoji: '🦉', colorId: 'violet' },
      { name: 'علم النفس والاجتماع', emoji: '🧠', colorId: 'rose' },
      { name: 'اللغة الإنجليزية', emoji: '🇬🇧', colorId: 'teal' },
      { name: 'اللغة العربية', emoji: '🪶', colorId: 'orange' },
      { name: 'اللغة الأجنبية الثانية', emoji: '🗣️', colorId: 'sky' },
    ],
  },
  {
    id: 'azhar',
    label: 'الأزهر الشريف (علمي / أدبي)',
    description: 'القرآن الكريم، التفسير والحديث والفقه، النحو والصرف والبلاغة، والإنجليزي',
    badgeEmoji: '🕌',
    subjects: [
      { name: 'القرآن الكريم وتفسيره', emoji: '📖', colorId: 'emerald' },
      { name: 'الحديث والفقه', emoji: '🕌', colorId: 'teal' },
      { name: 'التوحيد والسيرة', emoji: '🌙', colorId: 'amber' },
      { name: 'النحو والصرف', emoji: '✒️', colorId: 'rose' },
      { name: 'البلاغة والأدب', emoji: '📜', colorId: 'orange' },
      { name: 'اللغة الإنجليزية', emoji: '🇬🇧', colorId: 'sky' },
      { name: 'المواد العلمية / الثقافية', emoji: '🎓', colorId: 'violet' },
    ],
  },
  {
    id: 'prep',
    label: 'المرحلة الإعدادية',
    description: 'اللغة العربية، اللغة الإنجليزية، الرياضيات، العلوم، الدراسات والحاسب',
    badgeEmoji: '🎒',
    subjects: [
      { name: 'اللغة الإنجليزية', emoji: '🇬🇧', colorId: 'teal' },
      { name: 'اللغة العربية', emoji: '📖', colorId: 'rose' },
      { name: 'الرياضيات', emoji: '🧮', colorId: 'violet' },
      { name: 'العلوم', emoji: '🔬', colorId: 'emerald' },
      { name: 'الدراسات الاجتماعية', emoji: '🌍', colorId: 'amber' },
      { name: 'تكنولوجيا المعلومات', emoji: '💻', colorId: 'sky' },
    ],
  },
];

export interface MindMapFontOption {
  id: string;
  label: string;
  category: 'handwritten' | 'formal';
  cssStack: string;
  sampleAr: string;
  sampleEn: string;
}

export const MIND_MAP_FONTS: MindMapFontOption[] = [
  {
    id: 'marhey_caveat',
    label: 'خط يد مرسوم (قلم كراسة)',
    category: 'handwritten',
    cssStack: "'Marhey', 'Caveat', cursive, sans-serif",
    sampleAr: 'خطتي للمذاكرة',
    sampleEn: 'Study Plan',
  },
  {
    id: 'ruqaa_patrick',
    label: 'خط رقعة يدوي وقلم جاف',
    category: 'handwritten',
    cssStack: "'Aref Ruqaa', 'Patrick Hand', cursive, serif",
    sampleAr: 'بالقلم والورقة',
    sampleEn: 'Hand Notes',
  },
  {
    id: 'kufi_architect',
    label: 'كوفي هندسي + رسم معماري',
    category: 'handwritten',
    cssStack: "'Reem Kufi', 'Architects Daughter', cursive, sans-serif",
    sampleAr: 'خريطة منظمة',
    sampleEn: 'Sketch Map',
  },
  {
    id: 'cairo_jakarta',
    label: 'خط كمبيوتر حديث وواضح',
    category: 'formal',
    cssStack: "'Cairo', 'Plus Jakarta Sans', sans-serif",
    sampleAr: 'تنسيق رقمي أنيق',
    sampleEn: 'Modern Sans',
  },
  {
    id: 'tajawal_outfit',
    label: 'كمبيوتر متناسق للطباعة',
    category: 'formal',
    cssStack: "'Tajawal', 'Outfit', sans-serif",
    sampleAr: 'منصة مستر محمد رضوان',
    sampleEn: 'Easy English',
  },
  {
    id: 'amiri_lora',
    label: 'خط أكاديمي كلاسيكي (أدبي)',
    category: 'formal',
    cssStack: "'Amiri', 'Lora', serif",
    sampleAr: 'مراجعة شاملة',
    sampleEn: 'Classic Print',
  },
  {
    id: 'ibm_mono',
    label: 'خط تقني دقيق (جداول ومسائل)',
    category: 'formal',
    cssStack: "'IBM Plex Sans Arabic', 'JetBrains Mono', monospace",
    sampleAr: 'أهداف محددة',
    sampleEn: 'Unit 01 - Grammar',
  },
];

export const EMOJI_PICKER_LIST: string[] = [
  '🇬🇧', '⚛️', '🧪', '🧬', '📐', '🧮', '🪶', '📖', '🕌', '🌙',
  '🏛️', '🗺️', '🦉', '🧠', '🪨', '🔬', '🌍', '💻', '⚙️', '🗣️',
  '✒️', '📜', '🎓', '📝', '🎯', '⭐', '🔥', '💡', '📌', '📚',
  '🏆', '🧭', '🎨', '📊', '🧩', '🔭', '⚖️', '🕰️', '🏅', '✨',
];

export const INK_COLORS = [
  { id: 'default', label: 'افتراضي تلقائي', value: '' },
  { id: 'ink_blue', label: 'حبر أزرق', value: '#1d4ed8' },
  { id: 'ink_red', label: 'حبر أحمر', value: '#dc2626' },
  { id: 'ink_green', label: 'حبر أخضر', value: '#047857' },
  { id: 'ink_purple', label: 'حبر بنفسجي', value: '#7c3aed' },
  { id: 'ink_orange', label: 'حبر برتقالي', value: '#c2410c' },
  { id: 'ink_teal', label: 'حبر تركوازي', value: '#0f766e' },
  { id: 'ink_gold', label: 'حبر ذهبي داكن', value: '#b45309' },
];

export const HIGHLIGHT_COLORS = [
  { id: 'none', label: 'بدون تظليل', value: '' },
  { id: 'hl_yellow', label: 'فسفوري أصفر', value: '#fef08a' },
  { id: 'hl_mint', label: 'فسفوري نعناعي', value: '#bbf7d0' },
  { id: 'hl_sky', label: 'فسفوري سماوي', value: '#bae6fd' },
  { id: 'hl_pink', label: 'فسفوري وردي', value: '#fbcfe8' },
  { id: 'hl_lavender', label: 'فسفوري لافندر', value: '#ddd6fe' },
  { id: 'hl_peach', label: 'فسفوري خوخي', value: '#fed7aa' },
];
