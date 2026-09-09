export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  stage: 'middle' | 'high'; // اعدادي | ثانوي
  educationType: 'general' | 'azhar' | 'arabic' | 'languages'; // عام | ازهر | عربي | لغات
  grade: 1 | 2 | 3; // الصف 1, 2, 3
  price: number;
  originalPrice?: number;
  hasDiscount?: boolean;
  isFree: boolean;
  coverImage: string;
  unitsCount: number;
  videosCount: number;
  examsCount: number;
  homeworksCount: number;
  publishDate: string;
  badge?: string;
  tags: string[];
}

export interface Unit {
  id: string;
  courseId: string;
  unitNumber: number;
  title: string;
  description: string;
  items: UnitItem[];
}

export interface UnitItem {
  id: string;
  unitId: string;
  type: 'video' | 'homework' | 'exam' | 'concept_sheet' | 'summary_pdf';
  title: string;
  description?: string;
  durationMinutes?: number;
  totalMarks?: number;
  passingScore?: number;
  isLocked: boolean;
  videoSource?: 'internal_secured' | 'direct_youtube';
  obfuscatedVideoId?: string;
  pdfUrl?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  badge: string;
  isUrgent?: boolean;
}

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  parentPhone: string;
  carrier: 'Vodafone' | 'Orange' | 'Etisalat' | 'WE';
  role: 'student' | 'teacher' | 'assistant' | 'super_admin';
  stage: 'middle' | 'high';
  educationType: 'general' | 'azhar' | 'arabic' | 'languages';
  grade: 1 | 2 | 3;
  status: 'pending_review' | 'active' | 'rejected' | 'banned';
  avatarUrl?: string;
  banReason?: string;
  walletBalance: number;
  assistantRoleTitle?: string;
  permissions?: Record<string, unknown>;
  registeredDevices: {
    id: string;
    name: string;
    isPrimary: boolean;
    lastActive: string;
  }[];
}
