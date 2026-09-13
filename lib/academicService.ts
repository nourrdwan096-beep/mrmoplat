import { supabase } from './supabaseClient';
import { 
  proxyUpsert, 
  proxyInsert, 
  proxyUpdate, 
  proxyDelete,
  fetchCoursesServer,
  saveCourseServer,
  deleteCourseServer,
  fetchUnitsServer,
  saveUnitServer,
  deleteUnitServer,
  fetchItemsServer,
  saveItemServer,
  deleteItemServer,
  updateItemMetadataServer,
  fetchItemByIdServer,
  fetchQuestionsServer,
  fetchSecuredStudentQuestionsServer,
  saveQuestionsServer,
  submitAndGradeExamServer,
  verifyHomeworkQuestionAnswerServer,
  fetchStudentProgressServer,
  grantStudentExtraAttemptsServer,
  resetStudentItemProgressServer,
  fetchCodesServer,
  insertCodesServer,
  markCodeUsedServer,
  fetchStudentEnrollmentsServer,
  saveEnrollmentServer,
  syncLocalCoursesServer,
  fetchCourseEnrolledStudentsDataServer,
} from '@/app/actions/dbProxy';
import { saveVaultItem } from './indexedDbStorage';
import { getStudentProfilesByIdsAction, saveStudentItemProgressAction } from '@/app/actions/studentActions';

export interface AnnouncementData {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  targetStage?: string;
  targetGrade?: number;
  isPublished: boolean;
  createdAt: string;
  announcementType?: 'general' | 'top_student';
  studentName?: string;
  studentScore?: string;
}

export async function fetchAnnouncements(): Promise<AnnouncementData[]> {
  try {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data) return [];

    return data.map((d: any) => {
      let announcementType: 'general' | 'top_student' = 'general';
      let studentName = '';
      let studentScore = '';
      let displayContent = d.content || '';

      if (typeof displayContent === 'string' && displayContent.startsWith('{"type":"top_student"')) {
        try {
          const parsed = JSON.parse(displayContent);
          announcementType = 'top_student';
          studentName = parsed.studentName || '';
          studentScore = parsed.studentScore || '';
          displayContent = parsed.message || '';
        } catch {
          // fallback
        }
      }

      return {
        id: d.id,
        title: d.title,
        content: displayContent,
        imageUrl: d.image_url,
        targetStage: d.target_stage,
        targetGrade: d.target_grade,
        isPublished: d.is_published,
        createdAt: d.created_at,
        announcementType,
        studentName,
        studentScore,
      };
    });
  } catch (err) {
    console.error('Error fetching announcements:', err);
    return [];
  }
}

export interface CourseData {
  id: string;
  title: string;
  slug?: string;
  description: string;
  coverImage?: string;
  price: number;
  originalPrice?: number;
  hasDiscount?: boolean;
  isFree: boolean;
  stage: 'middle' | 'high';
  grade: 1 | 2 | 3;
  educationType: 'general' | 'azhar' | 'arabic' | 'languages';
  isPublished: boolean;
  publishDate?: string;
  expiryDate?: string;
  enforceUnitProgression?: boolean;
  enforceItemProgression?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface UnitData {
  id: string;
  courseId: string;
  unitNumber: number;
  title: string;
  description?: string;
  orderIndex: number;
  isPublished: boolean;
  createdAt: string;
}

export interface QuestionData {
  id: string;
  itemId: string;
  questionText: string;
  questionImageUrl?: string;
  questionType: 'mcq' | 'multi_select' | 'tf' | 'rewrite' | 'essay' | 'dialogue' | 'passage' | 'word_bank';
  options: { id: string; text: string }[];
  correctAnswerId: string;
  correctAnswerIds?: string[];
  idealAnswer?: string;
  gradingType?: 'auto' | 'manual';
  explanation?: string;
  hint?: string; // Optional hint provided by teacher during the question
  points: number;
  orderIndex: number;
  parentId?: string; // For questions belonging to a reading passage
  wordBankWords?: string[]; // List of words available in the word bank
  wordBankBlanks?: { blankIndex: number; correctAnswer: string; points?: number }[]; // Correct answers for each blank [1], [2], etc.
}

export interface UnitItemData {
  id: string;
  unitId: string;
  courseId: string;
  itemType: 'video' | 'homework' | 'exam' | 'concept_sheet' | 'summary_pdf';
  title: string;
  description?: string;
  orderIndex: number;
  durationMinutes?: number;
  totalMarks?: number;
  passingScorePercentage?: number;
  maxExamAttempts?: number;
  startDate?: string;
  endDate?: string;
  videoSourceType?: 'internal_secured' | 'direct_youtube';
  obfuscatedVideoId?: string;
  directVideoUrl?: string;
  pdfAttachmentUrl?: string;
  isPrerequisiteRequired: boolean;
  createdAt: string;
  questions?: QuestionData[];
}

export interface ActivationCodeData {
  id: string;
  courseId: string;
  courseTitle?: string;
  code: string;
  batchName?: string;
  studentBirthDate?: string;
  assignedStudentName?: string; // Teacher designated specific student
  assignedStudentBirthDate?: string; // Student birth date (e.g. YYYY-MM-DD)
  centerOrGroup?: string;       // Optional center or group
  price?: number;               // Optional course price / card value
  isUsed: boolean;
  usedByStudentName?: string;
  usedByStudentId?: string;
  usedAt?: string;
  createdAt: string;
}

export interface StudentAssessmentProgress {
  itemId: string;
  itemTitle: string;
  itemType: 'exam' | 'homework' | 'video' | 'concept_sheet' | 'summary_pdf';
  unitId: string;
  unitTitle?: string;
  unitNumber?: number;
  orderIndex: number;
  totalMarks: number;
  passingScorePercentage: number;
  maxAttempts: number;
  attemptsCount: number;
  highestScore: number;
  lastScore: number;
  percentage: number;
  scorePercentage?: number;
  isPassed: boolean;
  isExhausted: boolean;
  status: 'not_started' | 'passed' | 'failed_exhausted' | 'failed_can_retry' | 'in_progress';
  completedAt?: string;
  updatedAt?: string;
}

export interface EnrolledStudentData {
  id: string;
  studentId: string;
  courseId?: string;
  studentName: string;
  studentPhone: string;
  parentPhone?: string;
  paymentMethod: string;
  amountPaid: number;
  enrolledAt: string;
  progressPercentage: number;
  activeDevicesCount: number;
  progressList?: any[]; // Raw student_item_progress records
  assessments?: StudentAssessmentProgress[];
  totalCourseExams?: number;
  completedExams?: number;
  totalCourseHomeworks?: number;
  completedHomeworks?: number;
  completedAssessments?: number;
  latestExam?: {
    itemId: string;
    title: string;
    score: number;
    percentage: number;
    isPassed: boolean;
    attemptsCount: number;
    maxAttempts: number;
    isExhausted: boolean;
    completedAt?: string;
  } | null;
  latestHomework?: {
    itemId: string;
    title: string;
    score: number;
    percentage: number;
    isPassed: boolean;
    attemptsCount: number;
    maxAttempts: number;
    isExhausted: boolean;
    completedAt?: string;
  } | null;
  averageScore?: number;
  needsAttention?: boolean;
  isExcellent?: boolean;
  exhaustedItemsCount?: number;
  failedItemsCount?: number;
  recommendation?: {
    level: 'excellent' | 'good' | 'warning' | 'critical' | 'idle';
    title: string;
    message: string;
    shouldCall: boolean;
    suggestedAction: 'appreciate' | 'monitor' | 'call_urgent' | 'encourage_sms';
    suggestedTemplate: string;
  };
}

const STORAGE_KEYS = {
  COURSES: 'mr_radwan_courses_db',
  UNITS: 'mr_radwan_units_db',
  ITEMS: 'mr_radwan_unit_items_db',
  QUESTIONS: 'mr_radwan_questions_db',
  CODES: 'mr_radwan_codes_db',
  ENROLLMENTS: 'mr_radwan_enrollments_db',
};

// Safe Local Storage Handlers
function sanitizeForLocalStorage<T>(key: string, val: T): T {
  if (!val) return val;
  try {
    if (key === STORAGE_KEYS.ITEMS && Array.isArray(val)) {
      return val.map((item: any) => {
        if (!item) return item;
        const cleanItem = { ...item };
        // Never store questions array inside unit item in localstorage to save memory
        if ('questions' in cleanItem && Array.isArray(cleanItem.questions)) {
          delete cleanItem.questions;
        }
        if (cleanItem.pdfAttachmentUrl && typeof cleanItem.pdfAttachmentUrl === 'string') {
          if (cleanItem.pdfAttachmentUrl.startsWith('data:') && cleanItem.pdfAttachmentUrl.length > 500) {
            const vaultId = `item_pdf_${cleanItem.id || Math.random().toString(36).substring(2, 9)}`;
            // Offload to IndexedDB in background
            saveVaultItem(vaultId, cleanItem.pdfAttachmentUrl).catch(() => {});
            cleanItem.pdfAttachmentUrl = `idb://${vaultId}`;
          }
        }
        return cleanItem;
      }) as unknown as T;
    }
    if (key === STORAGE_KEYS.COURSES && Array.isArray(val)) {
      return val.map((course: any) => {
        if (!course) return course;
        const cleanCourse = { ...course };
        // Only offload extremely large raw image data urls (> 200KB) and NEVER SVG templates
        if (
          cleanCourse.coverImage && 
          typeof cleanCourse.coverImage === 'string' && 
          cleanCourse.coverImage.startsWith('data:') && 
          !cleanCourse.coverImage.startsWith('data:image/svg+xml') && 
          cleanCourse.coverImage.length > 200000
        ) {
          const vaultId = `course_img_${cleanCourse.id || Math.random().toString(36).substring(2, 9)}`;
          saveVaultItem(vaultId, cleanCourse.coverImage).catch(() => {});
          cleanCourse.coverImage = `idb://${vaultId}`;
        }
        return cleanCourse;
      }) as unknown as T;
    }
  } catch (err) {
    console.warn('Error in sanitizeForLocalStorage:', err);
  }
  return val;
}

function getLocal<T>(key: string, defaultVal: T): T {
  if (typeof window === 'undefined') return defaultVal;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultVal;
  } catch {
    return defaultVal;
  }
}

function setLocal<T>(key: string, val: T): void {
  if (typeof window === 'undefined') return;
  try {
    const sanitized = sanitizeForLocalStorage(key, val);
    const serialized = JSON.stringify(sanitized);
    localStorage.setItem(key, serialized);
  } catch (e) {
    console.warn(`LocalStorage quota warning for key "${key}". Compacting storage.`);
    try {
      // Step 1: Lightweight sanitization
      if (key === STORAGE_KEYS.ITEMS && Array.isArray(val)) {
        const lightweight = val.map((item: any) => {
          const clone = { ...item };
          delete clone.questions;
          if (clone.pdfAttachmentUrl && clone.pdfAttachmentUrl.length > 150) {
            clone.pdfAttachmentUrl = '';
          }
          return clone;
        });
        localStorage.setItem(key, JSON.stringify(lightweight));
        return;
      }
      
      // Step 2: Clean old caches
      const disposableKeys = ['mr_radwan_questions_db', 'mr_radwan_codes_db', 'course_draft_cache'];
      for (const k of disposableKeys) {
        if (k !== key) {
          try { localStorage.removeItem(k); } catch {}
        }
      }

      // Step 3: Try writing sanitized version
      const sanitized = sanitizeForLocalStorage(key, val);
      localStorage.setItem(key, JSON.stringify(sanitized));
    } catch {
      // In extreme cases, fail silently without throwing an unhandled exception to UI
      console.warn(`Could not persist key "${key}" into localStorage due to browser quota limits.`);
    }
  }
}

// ==========================================
// COURSES CRUD
// ==========================================
export async function fetchAllCourses(): Promise<CourseData[]> {
  try {
    const remoteCourses = await fetchCoursesServer();
    if (remoteCourses && Array.isArray(remoteCourses)) {
      // Overwrite local storage completely to ensure deleted items on server are removed locally
      setLocal(STORAGE_KEYS.COURSES, remoteCourses);
      return remoteCourses;
    }
  } catch (err) {
    console.warn('fetchAllCourses server action error, fallback to local storage:', err);
  }
  return getLocal<CourseData[]>(STORAGE_KEYS.COURSES, []);
}

export async function getCourseById(courseId: string): Promise<CourseData | null> {
  try {
    const remoteCourses = await fetchCoursesServer();
    if (remoteCourses && Array.isArray(remoteCourses)) {
      setLocal(STORAGE_KEYS.COURSES, remoteCourses);
      const foundRemote = remoteCourses.find((c: any) => c.id === courseId);
      return foundRemote || null;
    }
  } catch (err) {
    console.warn('getCourseById error, fallback to local:', err);
  }

  const localCourses = getLocal<CourseData[]>(STORAGE_KEYS.COURSES, []);
  return localCourses.find(c => c.id === courseId) || null;
}

export async function saveCourse(course: Omit<CourseData, 'id' | 'createdAt'> & { id?: string }): Promise<CourseData> {
  const newCourse: CourseData = {
    id: course.id && course.id.length === 36 ? course.id : crypto.randomUUID(),
    title: course.title,
    slug: course.slug || course.title.toLowerCase().replace(/\s+/g, '-'),
    description: course.description,
    coverImage: course.coverImage,
    price: course.price,
    originalPrice: course.originalPrice,
    hasDiscount: course.hasDiscount,
    isFree: course.isFree,
    stage: course.stage,
    grade: course.grade,
    educationType: course.educationType,
    isPublished: course.isPublished,
    publishDate: course.publishDate || new Date().toISOString().split('T')[0],
    expiryDate: course.expiryDate,
    enforceUnitProgression: course.enforceUnitProgression ?? true,
    enforceItemProgression: course.enforceItemProgression ?? true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    const saved = await saveCourseServer(newCourse);
    if (saved) {
      Object.assign(newCourse, saved);
    }
  } catch (err: any) {
    console.warn('saveCourseServer error:', err);
    throw new Error(err.message || 'فشل حفظ الكورس في قاعدة البيانات');
  }

  const existing = getLocal<CourseData[]>(STORAGE_KEYS.COURSES, []);
  const index = existing.findIndex(c => c.id === newCourse.id);
  if (index >= 0) {
    existing[index] = newCourse;
  } else {
    existing.unshift(newCourse);
  }
  setLocal(STORAGE_KEYS.COURSES, existing);

  return newCourse;
}

export async function removeCourse(courseId: string): Promise<boolean> {
  try {
    await deleteCourseServer(courseId);
  } catch (err) {
    console.warn('deleteCourseServer error:', err);
  }

  const existing = getLocal<CourseData[]>(STORAGE_KEYS.COURSES, []);
  setLocal(STORAGE_KEYS.COURSES, existing.filter(c => c.id !== courseId));

  // Also cascade clean units and items
  const units = getLocal<UnitData[]>(STORAGE_KEYS.UNITS, []);
  const unitIdsToRemove = units.filter(u => u.courseId === courseId).map(u => u.id);
  setLocal(STORAGE_KEYS.UNITS, units.filter(u => u.courseId !== courseId));

  const items = getLocal<UnitItemData[]>(STORAGE_KEYS.ITEMS, []);
  setLocal(STORAGE_KEYS.ITEMS, items.filter(i => !unitIdsToRemove.includes(i.unitId)));

  return true;
}

// Duplicate an entire course with its units and items to another stage / grade / education type!
export async function duplicateCourse(
  sourceCourseId: string,
  targetStage: 'middle' | 'high',
  targetGrade: 1 | 2 | 3,
  targetEducationType: 'general' | 'azhar' | 'arabic' | 'languages',
  newTitle: string
): Promise<CourseData | null> {
  const courses = await fetchAllCourses();
  const source = courses.find(c => c.id === sourceCourseId);
  if (!source) return null;

  const newCourse = await saveCourse({
    title: newTitle,
    description: source.description,
    coverImage: source.coverImage,
    price: source.price,
    isFree: source.isFree,
    stage: targetStage,
    grade: targetGrade,
    educationType: targetEducationType,
    isPublished: false, // Start as draft so teacher can tweak
    publishDate: new Date().toISOString().split('T')[0],
    expiryDate: source.expiryDate,
  });

  // Duplicate units
  const sourceUnits = await fetchUnitsByCourse(sourceCourseId);
  for (const u of sourceUnits) {
    const newUnit = await saveUnit({
      courseId: newCourse.id,
      unitNumber: u.unitNumber,
      title: u.title,
      description: u.description,
      orderIndex: u.orderIndex,
      isPublished: u.isPublished,
    });

    // Duplicate items in this unit
    const sourceItems = await fetchItemsByUnit(u.id);
    for (const item of sourceItems) {
      const newItem = await saveUnitItem({
        unitId: newUnit.id,
        courseId: newCourse.id,
        itemType: item.itemType,
        title: item.title,
        description: item.description,
        orderIndex: item.orderIndex,
        durationMinutes: item.durationMinutes,
        totalMarks: item.totalMarks,
        passingScorePercentage: item.passingScorePercentage,
        videoSourceType: item.videoSourceType,
        obfuscatedVideoId: item.obfuscatedVideoId,
        directVideoUrl: item.directVideoUrl,
        pdfAttachmentUrl: item.pdfAttachmentUrl,
        isPrerequisiteRequired: item.isPrerequisiteRequired,
      });

      // Duplicate questions if homework or exam
      if (item.itemType === 'homework' || item.itemType === 'exam') {
        const questions = await fetchQuestionsByItem(item.id);
        if (questions.length > 0) {
          const duplicatedQuestions = questions.map(q => ({
            ...q,
            id: 'q_' + Math.random().toString(36).substring(2, 9),
            itemId: newItem.id,
          }));
          await saveQuestionsForItem(newItem.id, duplicatedQuestions);
        }
      }
    }
  }

  return newCourse;
}

// ==========================================
// UNITS CRUD
// ==========================================
export async function fetchUnitsByCourse(courseId: string): Promise<UnitData[]> {
  try {
    const remoteUnits = await fetchUnitsServer(courseId);
    if (remoteUnits && Array.isArray(remoteUnits)) {
      const allUnits = getLocal<UnitData[]>(STORAGE_KEYS.UNITS, []);
      const otherCoursesUnits = allUnits.filter(u => u.courseId !== courseId);
      const combined = [...otherCoursesUnits, ...remoteUnits];
      setLocal(STORAGE_KEYS.UNITS, combined);
      return remoteUnits.sort((a, b) => a.orderIndex - b.orderIndex);
    }
  } catch (err) {
    console.warn('fetchUnitsServer error, fallback to local storage:', err);
  }

  const allUnits = getLocal<UnitData[]>(STORAGE_KEYS.UNITS, []);
  const localUnits = allUnits.filter(u => u.courseId === courseId);
  return localUnits.sort((a, b) => a.orderIndex - b.orderIndex);
}

export async function saveUnit(unit: Omit<UnitData, 'id' | 'createdAt'> & { id?: string }): Promise<UnitData> {
  const newUnit: UnitData = {
    id: unit.id && unit.id.length === 36 ? unit.id : crypto.randomUUID(),
    courseId: unit.courseId,
    unitNumber: Number(unit.unitNumber) || Number(unit.orderIndex) || 1,
    title: unit.title,
    description: unit.description,
    orderIndex: Number(unit.orderIndex) || 1,
    isPublished: unit.isPublished,
    createdAt: new Date().toISOString(),
  };

  try {
    const saved = await saveUnitServer(newUnit);
    if (saved) Object.assign(newUnit, saved);
  } catch (err: any) {
    console.warn('saveUnitServer error:', err);
    throw new Error(err.message || 'فشل حفظ الوحدة في قاعدة البيانات');
  }

  const allUnits = getLocal<UnitData[]>(STORAGE_KEYS.UNITS, []);
  const index = allUnits.findIndex(u => u.id === newUnit.id);
  if (index >= 0) {
    allUnits[index] = newUnit;
  } else {
    allUnits.push(newUnit);
  }
  setLocal(STORAGE_KEYS.UNITS, allUnits);

  return newUnit;
}

export async function removeUnit(unitId: string): Promise<boolean> {
  try {
    await deleteUnitServer(unitId);
  } catch (err) {
    console.warn('deleteUnitServer error:', err);
  }

  const allUnits = getLocal<UnitData[]>(STORAGE_KEYS.UNITS, []);
  setLocal(STORAGE_KEYS.UNITS, allUnits.filter(u => u.id !== unitId));

  const allItems = getLocal<UnitItemData[]>(STORAGE_KEYS.ITEMS, []);
  setLocal(STORAGE_KEYS.ITEMS, allItems.filter(i => i.unitId !== unitId));

  return true;
}

// ==========================================
// UNIT ITEMS (Lessons, Homework, Exams, Sheets) CRUD
// ==========================================
export async function fetchItemsByUnit(unitId: string): Promise<UnitItemData[]> {
  try {
    const remoteItems = await fetchItemsServer(unitId);
    if (remoteItems && Array.isArray(remoteItems)) {
      const allItems = getLocal<UnitItemData[]>(STORAGE_KEYS.ITEMS, []);
      const otherUnitsItems = allItems.filter(i => i.unitId !== unitId);
      const combined = [...otherUnitsItems, ...remoteItems];
      setLocal(STORAGE_KEYS.ITEMS, combined);
      return remoteItems.sort((a, b) => a.orderIndex - b.orderIndex);
    }
  } catch (err) {
    console.warn('fetchItemsServer error, fallback to local storage:', err);
  }

  const allItems = getLocal<UnitItemData[]>(STORAGE_KEYS.ITEMS, []);
  const localItems = allItems.filter(i => i.unitId === unitId);
  return localItems.sort((a, b) => a.orderIndex - b.orderIndex);
}

export async function saveUnitItem(item: Omit<UnitItemData, 'id' | 'createdAt'> & { id?: string }): Promise<UnitItemData> {
  const itemId = item.id && item.id.length === 36 ? item.id : crypto.randomUUID();
  let safePdfUrl = item.pdfAttachmentUrl;

  if (safePdfUrl && safePdfUrl.startsWith('data:') && safePdfUrl.length > 5000) {
    try {
      const vaultId = `item_pdf_${itemId}`;
      await saveVaultItem(vaultId, safePdfUrl);
      safePdfUrl = `idb://${vaultId}`;
    } catch (e) {
      console.warn('Could not store to IDB:', e);
    }
  }

  const newItem: UnitItemData = {
    id: itemId,
    unitId: item.unitId,
    courseId: item.courseId,
    itemType: item.itemType,
    title: item.title,
    description: item.description,
    orderIndex: Number(item.orderIndex) || 1,
    durationMinutes: Number(item.durationMinutes) || 0,
    totalMarks: Number(item.totalMarks) || 100,
    passingScorePercentage: Number(item.passingScorePercentage) || 60,
    maxExamAttempts: item.maxExamAttempts !== undefined && item.maxExamAttempts !== null && !isNaN(Number(item.maxExamAttempts)) ? Math.max(1, Number(item.maxExamAttempts)) : 3,
    videoSourceType: item.videoSourceType || 'internal_secured',
    obfuscatedVideoId: item.obfuscatedVideoId,
    directVideoUrl: item.directVideoUrl,
    pdfAttachmentUrl: safePdfUrl,
    isPrerequisiteRequired: item.isPrerequisiteRequired ?? true,
    createdAt: new Date().toISOString(),
  };

  try {
    const saved = await saveItemServer(newItem);
    if (saved) Object.assign(newItem, saved);
  } catch (err: any) {
    console.warn('saveItemServer error:', err);
    throw new Error(err.message || 'حدث خطأ في قاعدة البيانات أثناء حفظ المحتوى. (قد تحتاج لتشغيل كود SQL لتحديث الجداول)');
  }

  const allItems = getLocal<UnitItemData[]>(STORAGE_KEYS.ITEMS, []);
  const index = allItems.findIndex(i => i.id === newItem.id);
  if (index >= 0) {
    allItems[index] = newItem;
  } else {
    allItems.push(newItem);
  }
  setLocal(STORAGE_KEYS.ITEMS, allItems);

  return newItem;
}

export async function updateItemDuration(itemId: string, durationMinutes: number): Promise<void> {
  const allItems = getLocal<UnitItemData[]>(STORAGE_KEYS.ITEMS, []);
  const target = allItems.find(i => i.id === itemId);
  if (target) {
    target.durationMinutes = durationMinutes;
    setLocal(STORAGE_KEYS.ITEMS, allItems);
  }

  try {
    await supabase
      .from('unit_items')
      .update({ duration_minutes: durationMinutes })
      .eq('id', itemId);
  } catch (err) {
    console.warn('Supabase updateItemDuration error:', err);
  }
}

export async function updateItemMetadata(
  itemId: string,
  metadata: Partial<{
    title: string;
    description: string;
    durationMinutes: number;
    totalMarks: number;
    passingScorePercentage: number;
    maxExamAttempts: number;
    startDate?: string;
    endDate?: string;
    isPrerequisiteRequired: boolean;
  }>
): Promise<UnitItemData | null> {
  const allItems = getLocal<UnitItemData[]>(STORAGE_KEYS.ITEMS, []);
  let target = allItems.find(i => i.id === itemId);
  
  if (target) {
    if (metadata.title !== undefined) target.title = metadata.title;
    if (metadata.description !== undefined) target.description = metadata.description;
    if (metadata.durationMinutes !== undefined) target.durationMinutes = metadata.durationMinutes;
    if (metadata.totalMarks !== undefined) target.totalMarks = metadata.totalMarks;
    if (metadata.passingScorePercentage !== undefined) target.passingScorePercentage = metadata.passingScorePercentage;
    if (metadata.maxExamAttempts !== undefined) target.maxExamAttempts = Math.max(1, Number(metadata.maxExamAttempts) || 3);
    if (metadata.startDate !== undefined) target.startDate = metadata.startDate;
    if (metadata.endDate !== undefined) target.endDate = metadata.endDate;
    if (metadata.isPrerequisiteRequired !== undefined) target.isPrerequisiteRequired = metadata.isPrerequisiteRequired;
    
    setLocal(STORAGE_KEYS.ITEMS, allItems);
  }

  try {
    const serverRes = await updateItemMetadataServer(itemId, {
      title: metadata.title,
      description: metadata.description,
      durationMinutes: metadata.durationMinutes,
      totalMarks: metadata.totalMarks,
      passingScorePercentage: metadata.passingScorePercentage,
      maxExamAttempts: metadata.maxExamAttempts !== undefined ? Math.max(1, Number(metadata.maxExamAttempts) || 3) : 3,
      startDate: metadata.startDate,
      endDate: metadata.endDate,
      isPrerequisiteRequired: metadata.isPrerequisiteRequired,
    });

    if (serverRes?.success && serverRes.item) {
      const dbItem = serverRes.item;
      const formattedItem: UnitItemData = {
        id: dbItem.id,
        unitId: dbItem.unit_id,
        courseId: dbItem.course_id,
        itemType: dbItem.item_type,
        title: dbItem.title,
        description: dbItem.description || '',
        orderIndex: dbItem.order_index,
        durationMinutes: dbItem.duration_minutes,
        totalMarks: dbItem.total_marks,
        passingScorePercentage: dbItem.passing_score_percentage,
        maxExamAttempts: dbItem.max_exam_attempts !== null && dbItem.max_exam_attempts !== undefined ? Number(dbItem.max_exam_attempts) : 3,
        startDate: dbItem.start_date || undefined,
        endDate: dbItem.end_date || undefined,
        videoSourceType: dbItem.video_source_type,
        obfuscatedVideoId: dbItem.obfuscated_video_id,
        directVideoUrl: dbItem.direct_video_url,
        pdfAttachmentUrl: dbItem.pdf_attachment_url,
        isPrerequisiteRequired: dbItem.is_prerequisite_required,
        createdAt: dbItem.created_at,
      };

      const updatedAll = getLocal<UnitItemData[]>(STORAGE_KEYS.ITEMS, []);
      const idx = updatedAll.findIndex(i => i.id === itemId);
      if (idx >= 0) {
        updatedAll[idx] = { ...updatedAll[idx], ...formattedItem };
      } else {
        updatedAll.push(formattedItem);
      }
      setLocal(STORAGE_KEYS.ITEMS, updatedAll);
      return formattedItem;
    }
  } catch (err) {
    console.warn('updateItemMetadataServer error:', err);
  }

  return target || null;
}

export async function removeUnitItem(itemId: string): Promise<boolean> {
  try {
    await deleteItemServer(itemId);
  } catch (err) {
    console.warn('deleteItemServer error:', err);
  }

  const allItems = getLocal<UnitItemData[]>(STORAGE_KEYS.ITEMS, []);
  setLocal(STORAGE_KEYS.ITEMS, allItems.filter(i => i.id !== itemId));

  const allQuestions = getLocal<QuestionData[]>(STORAGE_KEYS.QUESTIONS, []);
  setLocal(STORAGE_KEYS.QUESTIONS, allQuestions.filter(q => q.itemId !== itemId));

  return true;
}

export async function fetchItemById(itemId: string): Promise<UnitItemData | null> {
  // First try server query for authoritative, cross-device fresh state
  try {
    const remote = await fetchItemByIdServer(itemId);
    if (remote) {
      const allItems = getLocal<UnitItemData[]>(STORAGE_KEYS.ITEMS, []);
      const idx = allItems.findIndex(i => i.id === itemId);
      if (idx >= 0) {
        allItems[idx] = { ...allItems[idx], ...remote };
      } else {
        allItems.push(remote);
      }
      setLocal(STORAGE_KEYS.ITEMS, allItems);
      return remote;
    }
  } catch (err) {
    console.warn('fetchItemByIdServer warning:', err);
  }

  // Fallback to local storage
  const allItems = getLocal<UnitItemData[]>(STORAGE_KEYS.ITEMS, []);
  const item = allItems.find(i => i.id === itemId);
  if (item) {
    if (item.maxExamAttempts === undefined || item.maxExamAttempts === null || isNaN(Number(item.maxExamAttempts))) {
      item.maxExamAttempts = 3;
    }
    return item;
  }

  return null;
}

// ==========================================
// QUIZ & EXAM QUESTIONS BANK
// ==========================================
export async function fetchQuestionsByItem(itemId: string): Promise<QuestionData[]> {
  try {
    const remoteQuestions = await fetchQuestionsServer(itemId);
    if (remoteQuestions && Array.isArray(remoteQuestions)) {
      const allQuestions = getLocal<QuestionData[]>(STORAGE_KEYS.QUESTIONS, []);
      const otherQuestions = allQuestions.filter(q => q.itemId !== itemId);
      setLocal(STORAGE_KEYS.QUESTIONS, [...otherQuestions, ...remoteQuestions]);
      return remoteQuestions.sort((a, b) => a.orderIndex - b.orderIndex);
    }
  } catch (err) {
    console.warn('fetchQuestionsServer error, fallback to local storage:', err);
  }

  const allQuestions = getLocal<QuestionData[]>(STORAGE_KEYS.QUESTIONS, []);
  return allQuestions.filter(q => q.itemId === itemId).sort((a, b) => a.orderIndex - b.orderIndex);
}

// STRICT SECURITY: Student Question Fetcher
// Fetches questions WITHOUT answers, preventing answer scraping or local storage snooping
export async function fetchSecuredStudentQuestions(itemId: string): Promise<QuestionData[]> {
  try {
    const remoteQuestions = await fetchSecuredStudentQuestionsServer(itemId);
    if (remoteQuestions && Array.isArray(remoteQuestions) && remoteQuestions.length > 0) {
      return remoteQuestions.sort((a, b) => a.orderIndex - b.orderIndex);
    }
  } catch (err) {
    console.warn('fetchSecuredStudentQuestionsServer error, falling back:', err);
  }

  // Fallback: strictly sanitize any cached local questions without fetching unmasked answers
  const cachedQuestions = getLocal<QuestionData[]>(STORAGE_KEYS.QUESTIONS, []).filter((q) => q.itemId === itemId);
  return cachedQuestions.map((q) => ({
    ...q,
    correctAnswerId: '',
    correctAnswerIds: [],
    idealAnswer: '',
    explanation: '',
    wordBankBlanks: q.wordBankBlanks?.map((b) => ({
      blankIndex: b.blankIndex,
      points: b.points,
      correctAnswer: '',
    })),
  })).sort((a, b) => a.orderIndex - b.orderIndex);
}

// Submit student answers to server for authoritative scoring
export async function submitStudentExamAnswers(payload: {
  itemId: string;
  studentId: string;
  courseId: string;
  answers: {
    mcqAnswers?: Record<string, string>;
    multiSelectAnswers?: Record<string, string[]>;
    wordBankAnswers?: Record<string, Record<number, string>>;
    textAnswers?: Record<string, string>;
  };
  timeSpentSeconds?: number;
  isSecurityTerminated?: boolean;
}) {
  return await submitAndGradeExamServer(payload);
}

// Interactive check for individual homework questions
export async function verifyHomeworkQuestionAnswer(payload: {
  itemId: string;
  questionId: string;
  chosenAnswer: any;
}) {
  return await verifyHomeworkQuestionAnswerServer(payload);
}

export async function saveQuestionsForItem(itemId: string, questions: QuestionData[]): Promise<boolean> {
  try {
    await saveQuestionsServer(itemId, questions);
  } catch (err) {
    console.warn('saveQuestionsServer error:', err);
  }

  const allQuestions = getLocal<QuestionData[]>(STORAGE_KEYS.QUESTIONS, []);
  const otherQuestions = allQuestions.filter(q => q.itemId !== itemId);
  setLocal(STORAGE_KEYS.QUESTIONS, [...otherQuestions, ...questions]);

  return true;
}

// Transfer / Copy questions and full exam/homework to another Course & Unit item
export async function copyExamToTargetCourse(
  sourceItemId: string,
  targetCourseId: string,
  targetUnitId: string,
  newExamTitle: string
): Promise<UnitItemData | null> {
  const sourceItems = getLocal<UnitItemData[]>(STORAGE_KEYS.ITEMS, []);
  let sourceItem = sourceItems.find(i => i.id === sourceItemId);
  if (!sourceItem) {
    sourceItem = (await fetchItemById(sourceItemId)) || undefined;
  }
  if (!sourceItem) return null;

  const newItem = await saveUnitItem({
    unitId: targetUnitId,
    courseId: targetCourseId,
    itemType: sourceItem.itemType,
    title: newExamTitle,
    description: sourceItem.description,
    orderIndex: Math.floor(Date.now() / 1000),
    durationMinutes: sourceItem.durationMinutes || 0,
    totalMarks: sourceItem.totalMarks || 100,
    passingScorePercentage: sourceItem.passingScorePercentage || 60,
    maxExamAttempts: sourceItem.maxExamAttempts !== undefined && sourceItem.maxExamAttempts !== null ? Number(sourceItem.maxExamAttempts) : 3,
    isPrerequisiteRequired: sourceItem.isPrerequisiteRequired ?? true,
  });

  const questions = await fetchQuestionsByItem(sourceItemId);
  if (questions.length > 0) {
    // Map old question IDs (especially passages) to newly generated IDs
    const idMap: { [oldId: string]: string } = {};
    questions.forEach(q => {
      idMap[q.id] = 'q_' + Math.random().toString(36).substring(2, 9) + '_' + Math.random().toString(36).substring(2, 6);
    });

    const duplicatedQuestions: QuestionData[] = questions.map((q, idx) => ({
      ...q,
      id: idMap[q.id] || ('q_' + Math.random().toString(36).substring(2, 9)),
      itemId: newItem.id,
      parentId: q.parentId && idMap[q.parentId] ? idMap[q.parentId] : undefined,
      orderIndex: idx + 1,
    }));

    await saveQuestionsForItem(newItem.id, duplicatedQuestions);
  }

  return newItem;
}

// ==========================================
// COURSE ACTIVATION CODES
// ==========================================
export async function fetchCodesByCourse(courseId: string): Promise<ActivationCodeData[]> {
  const allCodes = getLocal<ActivationCodeData[]>(STORAGE_KEYS.CODES, []);
  const localForCourse = allCodes.filter(c => c.courseId === courseId);
  const localCodesMap = new Map<string, ActivationCodeData>();
  localForCourse.forEach(c => {
    localCodesMap.set(c.id, c);
    localCodesMap.set(c.code.toUpperCase(), c);
  });

  let serverCodes: any[] = [];

  // 1. Try server API route (bypasses RLS with supabaseAdmin)
  try {
    const res = await fetch(`/api/course-codes?courseId=${encodeURIComponent(courseId)}`, {
      cache: 'no-store',
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.codes) && json.codes.length > 0) {
        serverCodes = json.codes;
      }
    }
  } catch (apiErr) {
    console.warn('API /api/course-codes fetch error:', apiErr);
  }

  // 2. Fallback to direct supabase client if API had no data
  if (serverCodes.length === 0) {
    try {
      const { data, error } = await supabase
        .from('course_activation_codes')
        .select('*, courses(id, title, price)')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        serverCodes = data;
      }
    } catch (sbErr) {
      console.warn('Supabase fetchCodes error:', sbErr);
    }
  }

  // 3. If server returned codes, format and merge with local records
  if (serverCodes.length > 0) {
    const mappedServerCodes: ActivationCodeData[] = serverCodes.map((c: any) => {
      const cleanCode = (c.code || '').toUpperCase();
      const local = localCodesMap.get(c.id) || localCodesMap.get(cleanCode);

      // Parse metadata embedded in batch_name: e.g. "دفعة سنتر النخبة [مخصص: أحمد محمود] [ميلاد: 2008-05-15]"
      let parsedBatch = c.batch_name || '';
      let assignedStudent = local?.assignedStudentName;
      let studentBirthDate = local?.studentBirthDate || (local as any)?.assignedStudentBirthDate;
      let center = local?.centerOrGroup;

      if (parsedBatch.includes('مخصص:')) {
        const parts = parsedBatch.split('مخصص:');
        assignedStudent = assignedStudent || parts[1]?.split(']')[0]?.trim();
      }
      if (parsedBatch.includes('ميلاد:')) {
        const parts = parsedBatch.split('ميلاد:');
        studentBirthDate = studentBirthDate || parts[1]?.split(']')[0]?.trim();
      }
      if (parsedBatch.includes('سنتر:')) {
        const parts = parsedBatch.split('سنتر:');
        center = center || parts[1]?.split(']')[0]?.trim();
      }

      return {
        id: c.id,
        courseId: c.course_id,
        courseTitle: c.courses?.title || local?.courseTitle,
        code: c.code,
        batchName: c.batch_name || local?.batchName,
        assignedStudentName: assignedStudent,
        studentBirthDate,
        assignedStudentBirthDate: studentBirthDate,
        centerOrGroup: center,
        price: c.courses?.price || local?.price,
        isUsed: Boolean(c.is_used),
        usedAt: c.used_at || local?.usedAt,
        usedByStudentName: local?.usedByStudentName,
        usedByStudentId: c.used_by_student_id || local?.usedByStudentId,
        createdAt: c.created_at || local?.createdAt,
      };
    });

    // Merge any locally generated codes that might not have reached server yet
    const serverCodeSet = new Set(mappedServerCodes.map(s => s.code.toUpperCase()));
    const localOnly = localForCourse.filter(l => !serverCodeSet.has(l.code.toUpperCase()));
    const combined = [...mappedServerCodes, ...localOnly];

    // Persist combined back to local storage
    const otherCoursesCodes = allCodes.filter(c => c.courseId !== courseId);
    setLocal(STORAGE_KEYS.CODES, [...combined, ...otherCoursesCodes]);

    return combined;
  }

  // 4. If server returned nothing or had an error: RETURN ALL LOCAL CODES (Never return empty if local exist!)
  return localForCourse;
}

export async function generateActivationCodes(
  courseId: string, 
  count: number, 
  batchName: string, 
  createdByOrOptions?: string | {
    assignedStudentName?: string;
    studentBirthDate?: string;
    assignedStudentBirthDate?: string;
    centerOrGroup?: string;
    price?: number;
    courseTitle?: string;
    createdBy?: string;
  },
  optionsArg?: {
    assignedStudentName?: string;
    studentBirthDate?: string;
    assignedStudentBirthDate?: string;
    centerOrGroup?: string;
    price?: number;
    courseTitle?: string;
    createdBy?: string;
  }
): Promise<ActivationCodeData[]> {
  let createdBy: string | undefined;
  let options: {
    assignedStudentName?: string;
    studentBirthDate?: string;
    assignedStudentBirthDate?: string;
    centerOrGroup?: string;
    price?: number;
    courseTitle?: string;
    createdBy?: string;
  } | undefined;

  if (typeof createdByOrOptions === 'object' && createdByOrOptions !== null) {
    options = createdByOrOptions;
    createdBy = options.createdBy;
  } else {
    createdBy = createdByOrOptions;
    options = optionsArg;
  }

  const generated: ActivationCodeData[] = [];
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  // Format date tag for code:
  // If student birth date is provided (e.g. 2008-05-15 or 15/05/2008): format as YYMMDD
  // Otherwise use current issue date as YYMMDD
  const resolvedDob = options?.studentBirthDate?.trim() || options?.assignedStudentBirthDate?.trim();
  let dateTag = '';

  if (resolvedDob) {
    const parts = resolvedDob.split(/[-/]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        const y = parts[0].slice(2);
        const m = parts[1].padStart(2, '0');
        const d = parts[2].padStart(2, '0');
        dateTag = `${y}${m}${d}`;
      } else if (parts[2].length === 4) {
        // DD-MM-YYYY
        const d = parts[0].padStart(2, '0');
        const m = parts[1].padStart(2, '0');
        const y = parts[2].slice(2);
        dateTag = `${y}${m}${d}`;
      }
    }
    if (!dateTag) {
      const digits = resolvedDob.replace(/\D/g, '');
      dateTag = digits.slice(-6).padStart(6, '0');
    }
  }

  if (!dateTag) {
    // Current issue date
    const now = new Date();
    const y = String(now.getFullYear()).slice(2);
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    dateTag = `${y}${m}${d}`;
  }

  for (let i = 0; i < count; i++) {
    let part1 = '';
    let part2 = '';
    for (let c = 0; c < 4; c++) {
      part1 += chars.charAt(Math.floor(Math.random() * chars.length));
      part2 += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // High-prestige distinctive code format: MR-[YYMMDD]-[PART1]-[PART2]
    const codeString = `MR-${dateTag}-${part1}-${part2}`;

    let fullBatchDisplay = batchName?.trim() || 'دفعة ' + new Date().toLocaleDateString('ar-EG');
    if (options?.centerOrGroup?.trim()) {
      fullBatchDisplay += ` [سنتر: ${options.centerOrGroup.trim()}]`;
    }
    if (options?.assignedStudentName?.trim()) {
      fullBatchDisplay += ` [مخصص: ${options.assignedStudentName.trim()}]`;
    }
    if (resolvedDob) {
      fullBatchDisplay += ` [ميلاد: ${resolvedDob}]`;
    }

    const newCode: ActivationCodeData = {
      id: crypto.randomUUID(),
      courseId,
      courseTitle: options?.courseTitle,
      code: codeString,
      batchName: fullBatchDisplay,
      assignedStudentName: options?.assignedStudentName?.trim() || undefined,
      studentBirthDate: resolvedDob || undefined,
      assignedStudentBirthDate: resolvedDob || undefined,
      centerOrGroup: options?.centerOrGroup?.trim() || undefined,
      price: options?.price,
      isUsed: false,
      createdAt: new Date().toISOString(),
    };
    generated.push(newCode);
  }

  // 1. Immediately save to local storage (guarantees zero UI lag/drop)
  const allCodes = getLocal<ActivationCodeData[]>(STORAGE_KEYS.CODES, []);
  setLocal(STORAGE_KEYS.CODES, [...generated, ...allCodes]);

  // 2. Persist to server API route in the background (uses supabaseAdmin)
  try {
    await fetch('/api/course-codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codes: generated }),
    });
  } catch (apiErr) {
    console.warn('API /api/course-codes POST error:', apiErr);
  }

  // 3. Also attempt direct supabase insert as fallback
  try {
    await proxyInsert('course_activation_codes', 
      generated.map(g => ({
        id: g.id,
        course_id: g.courseId,
        code: g.code,
        batch_name: g.batchName,
        is_used: false,
        created_by: createdBy && createdBy !== 'assistant' && createdBy !== 'teacher' ? createdBy : null,
      }))
    );
  } catch (err) {
    console.warn('Supabase insert codes error:', err);
  }

  return generated;
}

export async function deleteActivationCode(codeId: string): Promise<boolean> {
  // 1. Delete via server API
  try {
    await fetch(`/api/course-codes?id=${encodeURIComponent(codeId)}`, {
      method: 'DELETE',
    });
  } catch (apiErr) {
    console.warn('API /api/course-codes DELETE error:', apiErr);
  }

  // 2. Direct supabase fallback
  try {
    await proxyDelete('course_activation_codes', { id: codeId });
  } catch (err) {
    console.warn('Supabase delete code error:', err);
  }

  // 3. Delete from local storage
  const allCodes = getLocal<ActivationCodeData[]>(STORAGE_KEYS.CODES, []);
  setLocal(STORAGE_KEYS.CODES, allCodes.filter(c => c.id !== codeId));
  return true;
}

// ==========================================
// STUDENT ITEM PROGRESSION & ACCESSIBILITY
// ==========================================
export interface StudentItemProgressData {
  id: string;
  studentId: string;
  courseId: string;
  itemId: string;
  status: 'locked' | 'unlocked' | 'in_progress' | 'completed';
  attemptsCount: number;
  highestScore: number;
  lastScore: number;
  isPassed: boolean;
  studentAnswers?: any;
  completedAt?: string;
  updatedAt?: string;
}

export async function fetchStudentProgress(studentId: string, courseId: string): Promise<Record<string, StudentItemProgressData>> {
  const map: Record<string, StudentItemProgressData> = {};
  if (!studentId || !courseId) return map;

  const storageKey = `mr_radwan_progress_${studentId}_${courseId}`;
  const localList = getLocal<StudentItemProgressData[]>(storageKey, []);
  localList.forEach(p => { map[p.itemId] = p; });

  try {
    const remoteData = await fetchStudentProgressServer(studentId, courseId);

    if (remoteData && remoteData.length > 0) {
      remoteData.forEach((row: any) => {
        map[row.item_id] = {
          id: row.id,
          studentId: row.student_id,
          courseId: row.course_id,
          itemId: row.item_id,
          status: row.status,
          attemptsCount: row.attempts_count || 0,
          highestScore: Number(row.highest_score || 0),
          lastScore: Number(row.last_score || 0),
          isPassed: row.is_passed ?? false,
          studentAnswers: row.student_answers,
          completedAt: row.completed_at,
          updatedAt: row.updated_at,
        };
      });
      setLocal(storageKey, Object.values(map));
    }
  } catch (err) {
    console.warn('fetchStudentProgress error:', err);
  }

  return map;
}

export async function recordStudentItemProgress(
  studentId: string,
  courseId: string,
  itemId: string,
  score: number = 100,
  isPassed: boolean = true,
  answers?: any
): Promise<boolean> {
  if (!studentId || !courseId || !itemId) return false;

  const storageKey = `mr_radwan_progress_${studentId}_${courseId}`;
  const existingMap = await fetchStudentProgress(studentId, courseId);
  const prev = existingMap[itemId];

  // User rule:
  // "ولو أداله يبقى يُعاد وتتتاخد درجة الامتحان الأخير، يعني آخر مرة هو دخلها. يعني لو نجح في امتحان والمعلم حب يتأكد منه فدخله الامتحان تاني، فبتتتاخد درجة الامتحان الأخير بس وبتتلغي درجة الامتحان الأول."
  // Strictly take the score of the LAST attempt and update status accordingly:
  const updated: StudentItemProgressData = {
    id: prev?.id || crypto.randomUUID(),
    studentId,
    courseId,
    itemId,
    status: isPassed ? 'completed' : 'in_progress',
    attemptsCount: (prev?.attemptsCount || 0) + 1,
    highestScore: score, // Strictly set to the score of the last attempt
    lastScore: score,    // Store the exact last attempt score
    isPassed: isPassed,  // True only if this last attempt passed!
    studentAnswers: answers || prev?.studentAnswers,
    completedAt: isPassed ? new Date().toISOString() : undefined,
    updatedAt: new Date().toISOString(),
  };

  existingMap[itemId] = updated;
  setLocal(storageKey, Object.values(existingMap));

  try {
    const actionResult = await saveStudentItemProgressAction({
      id: updated.id,
      studentId: updated.studentId,
      courseId: updated.courseId,
      itemId: updated.itemId,
      status: updated.status,
      attemptsCount: updated.attemptsCount,
      highestScore: updated.highestScore,
      lastScore: updated.lastScore,
      isPassed: updated.isPassed,
      studentAnswers: updated.studentAnswers,
      completedAt: updated.completedAt,
      updatedAt: updated.updatedAt,
    });
    if (!actionResult?.success) {
      // Fallback to client-side supabase directly
      await proxyUpsert('student_item_progress', {
        id: updated.id,
        student_id: updated.studentId,
        course_id: updated.courseId,
        item_id: updated.itemId,
        status: updated.status,
        attempts_count: updated.attemptsCount,
        highest_score: updated.highestScore,
        last_score: updated.lastScore,
        is_passed: updated.isPassed,
        student_answers: updated.studentAnswers,
        completed_at: updated.completedAt,
        updated_at: updated.updatedAt,
      });
    }
  } catch (err) {
    console.warn('Supabase recordStudentItemProgress error:', err);
  }

  return true;
}

export async function grantStudentExtraAttempts(
  studentId: string,
  courseId: string,
  itemId: string,
  extraAttemptsCount: number = 1,
  resetCompletely: boolean = false,
  teacherNote?: string
): Promise<{ success: boolean; newAttemptsCount: number; message: string }> {
  if (!studentId || !courseId || !itemId) {
    return { success: false, newAttemptsCount: 0, message: 'بيانات غير مكتملة' };
  }

  try {
    if (resetCompletely) {
      const serverRes = await resetStudentItemProgressServer(studentId, courseId, itemId, teacherNote);
      if (serverRes.success) {
        // Update local cache
        const storageKey = `mr_radwan_progress_${studentId}_${courseId}`;
        const localList = getLocal<StudentItemProgressData[]>(storageKey, []);
        const progIndex = localList.findIndex(p => p.itemId === itemId);
        if (progIndex !== -1) {
          localList[progIndex] = {
            ...localList[progIndex],
            attemptsCount: 0,
            status: 'in_progress',
            isPassed: false,
            highestScore: 0,
            lastScore: 0,
            studentAnswers: null,
            completedAt: undefined,
            updatedAt: new Date().toISOString(),
          };
          setLocal(storageKey, localList);
        }
        return {
          success: true,
          newAttemptsCount: 0,
          message: serverRes.message || 'تم إعادة تعيين محاولات الاختبار بالكامل بنجاح',
        };
      }
      return { success: false, newAttemptsCount: 0, message: serverRes.message || 'فشلت إعادة التعيين' };
    } else {
      const serverRes = await grantStudentExtraAttemptsServer(
        studentId,
        courseId,
        itemId,
        extraAttemptsCount,
        teacherNote || 'منح فرصة استثنائية من المعلم'
      );

      if (serverRes.success) {
        // Update local cache
        const storageKey = `mr_radwan_progress_${studentId}_${courseId}`;
        const localList = getLocal<StudentItemProgressData[]>(storageKey, []);
        const progIndex = localList.findIndex(p => p.itemId === itemId);
        if (progIndex !== -1) {
          localList[progIndex] = {
            ...localList[progIndex],
            attemptsCount: serverRes.attemptsCount,
            status: 'in_progress',
            isPassed: false,
            highestScore: 0,
            lastScore: 0,
            studentAnswers: null,
            completedAt: undefined,
            updatedAt: new Date().toISOString(),
          };
          setLocal(storageKey, localList);
        }
        return {
          success: true,
          newAttemptsCount: serverRes.attemptsCount,
          message: serverRes.message,
        };
      }
      return {
        success: false,
        newAttemptsCount: serverRes.attemptsCount,
        message: serverRes.message || 'فشل منح الفرصة الإضافية على السيرفر',
      };
    }
  } catch (err: any) {
    console.error('grantStudentExtraAttempts exception:', err);
    return { success: false, newAttemptsCount: 0, message: err?.message || 'حدث خطأ أثناء الاتصال بالخادم' };
  }
}

export async function resetStudentItemProgress(
  studentId: string,
  courseId: string,
  itemId: string,
  teacherNote?: string
): Promise<{ success: boolean; message: string }> {
  const res = await grantStudentExtraAttempts(studentId, courseId, itemId, 1, true, teacherNote);
  return { success: res.success, message: res.message };
}

export async function grantExtraAttempt(studentId: string, courseId: string, itemId: string, maxAttempts: number = 3): Promise<boolean> {
  const res = await grantStudentExtraAttempts(studentId, courseId, itemId, 1, false);
  return res.success;
}

export async function fetchStudentProgressForTeacher(studentId: string, courseId: string) {
  try {
    const data = await fetchStudentProgressServer(studentId, courseId);
    return data || [];
  } catch (err) {
    console.warn('fetchStudentProgressForTeacher error:', err);
    return [];
  }
}

/**
 * Checks whether an item is accessible for a student based on:
 * 1. Role bypass (Teacher, Super Admin, Assistant always bypass).
 * 2. Course enforceUnitProgression (if true, all items in previous units must be passed/completed).
 * 3. Course enforceItemProgression (if true, all preceding items in current unit must be passed/completed).
 * 4. Item prerequisite flag (if false, item unlocks freely within its unit).
 */
export function isItemAccessible(
  item: UnitItemData,
  unit: UnitData,
  allUnits: UnitData[],
  unitItemsMap: Record<string, UnitItemData[]>,
  studentProgress: Record<string, StudentItemProgressData>,
  course: CourseData | null,
  userRole?: string
): { isAccessible: boolean; reason?: string } {
  // Staff bypass
  if (userRole === 'teacher' || userRole === 'super_admin' || userRole === 'assistant') {
    return { isAccessible: true };
  }

  // 0. Check Course Status & Scheduling
  if (course) {
    if (course.isPublished === false) {
      return {
        isAccessible: false,
        reason: 'هذا الكورس مجمد أو قيد التحديث ومغلق مؤقتاً من قِبل المعلم.'
      };
    }
    const today = new Date().toISOString().split('T')[0];
    if (course.publishDate && today < course.publishDate) {
      return {
        isAccessible: false,
        reason: `هذا الكورس مجدول وسيبدأ نشره للطلاب بتاريخ ${course.publishDate}.`
      };
    }
    if (course.expiryDate && today > course.expiryDate) {
      return {
        isAccessible: false,
        reason: `انتهت صلاحية هذا الكورس بتاريخ ${course.expiryDate}.`
      };
    }
  }

  // 0.1 Check Item Specific Scheduling (Start Date / Deadline)
  if (item.startDate || item.endDate) {
    const today = new Date().toISOString().split('T')[0];
    if (item.startDate && today < item.startDate) {
      const typeLabel = item.itemType === 'homework' ? 'الواجب' : item.itemType === 'exam' ? 'الامتحان' : 'الدرس';
      return {
        isAccessible: false,
        reason: `هذا ${typeLabel} مجدول ومحدد للبدء بتاريخ ${item.startDate}.`
      };
    }
    if (item.endDate && today > item.endDate) {
      const typeLabel = item.itemType === 'homework' ? 'الواجب' : item.itemType === 'exam' ? 'الامتحان' : 'الدرس';
      return {
        isAccessible: false,
        reason: `انتهت المهلة والموعد النهائي المحدد لحل هذا ${typeLabel} بتاريخ ${item.endDate}.`
      };
    }
  }

  const enforceUnitProgression = course?.enforceUnitProgression ?? true;
  const enforceItemProgression = course?.enforceItemProgression ?? true;

  // Sorted units
  const sortedUnits = [...allUnits].sort((a, b) => a.orderIndex - b.orderIndex || a.unitNumber - b.unitNumber);
  const currentUnitIndex = sortedUnits.findIndex(u => u.id === unit.id);

  // 1. Check Unit Progression
  if (enforceUnitProgression && currentUnitIndex > 0) {
    for (let uIdx = 0; uIdx < currentUnitIndex; uIdx++) {
      const prevUnit = sortedUnits[uIdx];
      const prevItems = unitItemsMap[prevUnit.id] || [];
      // Only interactive/essential assessment & lecture items (video, homework, exam) act as mandatory blocking prerequisites
      for (const pItem of prevItems) {
        const isCoreAssessmentOrLecture = pItem.itemType === 'video' || pItem.itemType === 'homework' || pItem.itemType === 'exam';
        if (isCoreAssessmentOrLecture && pItem.isPrerequisiteRequired !== false) {
          const prog = studentProgress[pItem.id];
          if (!prog || !prog.isPassed) {
            return {
              isAccessible: false,
              reason: `يجب إكمال واجتياز محاضرات واختبارات (${prevUnit.title}) أولاً لفتح هذه الوحدة.`
            };
          }
        }
      }
    }
  }

  // 2. Check Item Progression within Current Unit
  if (enforceItemProgression && item.isPrerequisiteRequired !== false) {
    const currentUnitItems = (unitItemsMap[unit.id] || []).sort((a, b) => a.orderIndex - b.orderIndex);
    const itemIndex = currentUnitItems.findIndex(i => i.id === item.id);

    if (itemIndex > 0) {
      for (let iIdx = 0; iIdx < itemIndex; iIdx++) {
        const prevItem = currentUnitItems[iIdx];
        // Only interactive lectures & assessments (video, homework, exam) block downstream items.
        // PDF attachments, concept sheets, and summaries NEVER block exams, homeworks, or lectures.
        const isCoreAssessmentOrLecture = prevItem.itemType === 'video' || prevItem.itemType === 'homework' || prevItem.itemType === 'exam';
        if (isCoreAssessmentOrLecture && prevItem.isPrerequisiteRequired !== false) {
          const prog = studentProgress[prevItem.id];
          if (!prog || !prog.isPassed) {
            const itemTypeLabel = prevItem.itemType === 'video' ? 'مشاهدة المحاضرة' :
                                  prevItem.itemType === 'homework' ? 'اجتياز الواجب' :
                                  prevItem.itemType === 'exam' ? 'اجتياز الامتحان' : 'إكمال العنصر';
            return {
              isAccessible: false,
              reason: `يجب ${itemTypeLabel} (${prevItem.title}) أولاً لفتح هذا الدرس.`
            };
          }
        }
      }
    }
  }

  return { isAccessible: true };
}

// ==========================================
// COURSE ENROLLED STUDENTS & SUBSCRIPTIONS
// ==========================================
export async function fetchCourseEnrolledStudents(courseId: string): Promise<EnrolledStudentData[]> {
  // 1. Fetch units and unit items for this course to know all exams and homeworks
  let courseUnits: UnitData[] = [];
  const courseItems: UnitItemData[] = [];
  try {
    courseUnits = await fetchUnitsByCourse(courseId);
    for (const unit of courseUnits) {
      const uItems = await fetchItemsByUnit(unit.id);
      courseItems.push(...uItems);
    }
  } catch (err) {
    console.warn('Error fetching units/items for enrolled students view:', err);
  }

  // Filter assessment items (exams and homeworks)
  const assessmentItems = courseItems
    .filter(i => i.itemType === 'exam' || i.itemType === 'homework')
    .sort((a, b) => a.orderIndex - b.orderIndex);

  const totalCourseExams = assessmentItems.filter(i => i.itemType === 'exam').length;
  const totalCourseHomeworks = assessmentItems.filter(i => i.itemType === 'homework').length;

  // 2. Fetch Enrollments from LocalStorage and Supabase, deduplicated by studentId
  const allEnrollments = getLocal<any[]>(STORAGE_KEYS.ENROLLMENTS, []);
  const studentMap = new Map<string, any>();

  allEnrollments
    .filter(e => (e as any).courseId === courseId || e.id === courseId)
    .forEach(e => {
      const sId = e.studentId || (e as any).student_id || e.id;
      if (sId && !studentMap.has(sId)) {
        studentMap.set(sId, {
          id: e.id,
          studentId: sId,
          courseId,
          studentName: e.studentName || (e as any).student_name || 'طالب مسجل',
          studentPhone: e.studentPhone || (e as any).student_phone || 'غير مسجل',
          parentPhone: e.parentPhone || (e as any).parent_phone || '',
          paymentMethod: e.paymentMethod || (e as any).payment_method || 'activation_code',
          amountPaid: Number(e.amountPaid || (e as any).amount_paid || 0),
          enrolledAt: e.enrolledAt || (e as any).enrolled_at || new Date().toISOString(),
          progressPercentage: e.progressPercentage || (e as any).progress_percentage || 0,
          activeDevicesCount: e.activeDevicesCount || (e as any).active_devices_count || 1,
        });
      }
    });

  let dbProgressMap = new Map<string, any[]>();
  try {
    const serverData = await fetchCourseEnrolledStudentsDataServer(courseId);
    if (serverData.success) {
      if (serverData.enrollments && serverData.enrollments.length > 0) {
        serverData.enrollments.forEach((e: any) => {
          const sId = e.student_id;
          if (sId) {
            const existing = studentMap.get(sId);
            studentMap.set(sId, {
              id: e.id,
              studentId: sId,
              courseId: e.course_id,
              studentName: e.profiles?.full_name || e.student_name || existing?.studentName || 'طالب مسجل',
              studentPhone: e.profiles?.phone || e.student_phone || existing?.studentPhone || 'غير مسجل',
              parentPhone: e.profiles?.parent_phone || e.parent_phone || existing?.parentPhone || '',
              paymentMethod: e.payment_method || existing?.paymentMethod || 'activation_code',
              amountPaid: Number(e.amount_paid || existing?.amountPaid || 0),
              enrolledAt: e.enrolled_at || existing?.enrolledAt || new Date().toISOString(),
              progressPercentage: e.progress_percentage || existing?.progressPercentage || 0,
              activeDevicesCount: e.active_devices_count || existing?.activeDevicesCount || 1,
            });
          }
        });
      }

      if (serverData.progress && serverData.progress.length > 0) {
        serverData.progress.forEach((p: any) => {
          if (!dbProgressMap.has(p.student_id)) {
            dbProgressMap.set(p.student_id, []);
          }
          dbProgressMap.get(p.student_id)!.push(p);
        });
      }
    }
  } catch (err) {
    console.warn('Server fetchCourseEnrolledStudentsDataServer error:', err);
  }

  // 3.5. REPAIR & ENRICH STUDENT PHONE AND PROFILE DATA VIA SERVER ACTION & LOCAL CACHE
  try {
    const studentIds = Array.from(studentMap.keys());
    if (studentIds.length > 0) {
      const profilesRes = await getStudentProfilesByIdsAction(studentIds);
      if (profilesRes.success && profilesRes.profiles && profilesRes.profiles.length > 0) {
        profilesRes.profiles.forEach((p: any) => {
          const s = studentMap.get(p.id);
          if (s) {
            if (p.full_name && (s.studentName === 'طالب مسجل' || !s.studentName)) {
              s.studentName = p.full_name;
            }
            if (p.phone && (s.studentPhone === 'غير مسجل' || !s.studentPhone || s.studentPhone.trim() === '')) {
              s.studentPhone = p.phone;
            }
            if (p.parent_phone && (!s.parentPhone || s.parentPhone === 'غير مسجل' || s.parentPhone.trim() === '')) {
              s.parentPhone = p.parent_phone;
            }
          }
        });
      }
    }
  } catch (profErr) {
    console.warn('Profile fetch via server action error:', profErr);
  }

  // Fallback to local session storage cache if still missing phone
  if (typeof window !== 'undefined') {
    let localUser: any = null;
    let registeredInfo: any = null;
    try {
      const uStr = localStorage.getItem('mr_radwan_current_user');
      if (uStr) localUser = JSON.parse(uStr);
      const rStr = localStorage.getItem('mr_registered_student_info');
      if (rStr) registeredInfo = JSON.parse(rStr);
    } catch (e) {}

    for (const [sId, s] of studentMap.entries()) {
      if (!s.studentPhone || s.studentPhone === 'غير مسجل' || s.studentPhone.trim() === '') {
        if (localUser && (localUser.id === sId || studentMap.size === 1)) {
          s.studentPhone = localUser.phone || s.studentPhone;
          s.parentPhone = s.parentPhone || localUser.parentPhone || localUser.parent_phone || '';
          if (s.studentName === 'طالب مسجل' && (localUser.fullName || localUser.full_name)) {
            s.studentName = localUser.fullName || localUser.full_name;
          }
        }
        if ((!s.studentPhone || s.studentPhone === 'غير مسجل') && registeredInfo) {
          if (registeredInfo.id === sId || studentMap.size === 1) {
            s.studentPhone = registeredInfo.phone || s.studentPhone;
            s.parentPhone = s.parentPhone || registeredInfo.parentPhone || '';
            if (s.studentName === 'طالب مسجل' && registeredInfo.fullName) {
              s.studentName = registeredInfo.fullName;
            }
          }
        }
      }
    }

    // Persist healed phone numbers back to STORAGE_KEYS.ENROLLMENTS
    try {
      const storedEnrollments = getLocal<any[]>(STORAGE_KEYS.ENROLLMENTS, []);
      let changed = false;
      const updatedEnrollments = storedEnrollments.map(e => {
        const sId = e.studentId || e.student_id;
        const s = studentMap.get(sId);
        if (s && s.studentPhone && s.studentPhone !== 'غير مسجل' && (!e.studentPhone || e.studentPhone === 'غير مسجل')) {
          changed = true;
          return {
            ...e,
            studentName: s.studentName,
            studentPhone: s.studentPhone,
            parentPhone: s.parentPhone,
          };
        }
        return e;
      });
      if (changed) {
        setLocal(STORAGE_KEYS.ENROLLMENTS, updatedEnrollments);
      }
    } catch (e) {}
  }

  // 4. Transform and assemble each unique student
  const result: EnrolledStudentData[] = [];

  for (const [studentId, student] of studentMap.entries()) {
    // Merge progress from local storage and Supabase
    const localKey = `mr_radwan_progress_${studentId}_${courseId}`;
    const localProgressList = getLocal<StudentItemProgressData[]>(localKey, []);
    const dbStudentProgress = dbProgressMap.get(studentId) || [];

    // Map by item_id to avoid duplicates
    const itemProgMap = new Map<string, any>();
    dbStudentProgress.forEach(p => {
      itemProgMap.set(p.item_id, p);
    });
    localProgressList.forEach(lp => {
      if (!itemProgMap.has(lp.itemId)) {
        itemProgMap.set(lp.itemId, {
          id: lp.id,
          student_id: lp.studentId,
          course_id: lp.courseId,
          item_id: lp.itemId,
          attempts_count: lp.attemptsCount,
          status: lp.status,
          highest_score: lp.highestScore,
          last_score: lp.lastScore,
          is_passed: lp.isPassed,
          completed_at: lp.completedAt,
          updated_at: lp.updatedAt,
        });
      } else {
        // Strict requirement: Take the latest attempt's score (lastScore) and status
        const existing = itemProgMap.get(lp.itemId);
        const isLocalNewer = !existing.updated_at || (lp.updatedAt && lp.updatedAt >= existing.updated_at);
        itemProgMap.set(lp.itemId, {
          ...existing,
          attempts_count: Math.max(existing.attempts_count || 0, lp.attemptsCount || 0),
          highest_score: isLocalNewer ? Number(lp.highestScore || 0) : Number(existing.highest_score || 0),
          last_score: isLocalNewer ? Number(lp.lastScore ?? lp.highestScore ?? 0) : Number(existing.last_score ?? existing.highest_score ?? 0),
          is_passed: isLocalNewer ? lp.isPassed : existing.is_passed,
          completed_at: isLocalNewer ? lp.completedAt : existing.completed_at,
          updated_at: isLocalNewer ? lp.updatedAt : existing.updated_at,
        });
      }
    });

    // Build assessment breakdown
    const assessments: StudentAssessmentProgress[] = [];
    let totalScorePercentages = 0;
    let scoredItemsCount = 0;
    let failedItemsCount = 0;
    let exhaustedItemsCount = 0;
    let completedExams = 0;
    let completedHomeworks = 0;

    let latestExamData: any = null;
    let latestHomeworkData: any = null;

    assessmentItems.forEach(item => {
      const p = itemProgMap.get(item.id);
      const unit = courseUnits.find(u => u.id === item.unitId);

      const maxAttempts = item.maxExamAttempts !== undefined && item.maxExamAttempts !== null ? Number(item.maxExamAttempts) : 3;
      const attemptsCount = p ? Number(p.attempts_count || 0) : 0;
      
      // Strict rule: last attempt score takes precedence
      let finalScore = p ? Number(p.last_score ?? p.highest_score ?? 0) : 0;
      const totalMarks = item.totalMarks || 100;
      const passingScorePercentage = item.passingScorePercentage || 60;

      // Normalization: if score was saved as a percentage (e.g. 100) on a smaller mark (e.g. 20 or 40)
      if (finalScore > totalMarks && totalMarks > 0) {
        finalScore = Math.min(totalMarks, parseFloat(((finalScore / 100) * totalMarks).toFixed(1)));
      }

      // Percentage is strictly clamped between 0 and 100%
      const percentage = totalMarks > 0 
        ? Math.min(100, Math.max(0, Math.round((finalScore / totalMarks) * 100))) 
        : 0;

      const isPassed = p ? (p.is_passed === true || percentage >= passingScorePercentage) : false;
      const isExhausted = !isPassed && attemptsCount >= maxAttempts;

      let status: StudentAssessmentProgress['status'] = 'not_started';
      if (attemptsCount === 0) {
        status = 'not_started';
      } else if (isPassed) {
        status = 'passed';
      } else if (isExhausted) {
        status = 'failed_exhausted';
      } else {
        status = 'failed_can_retry';
      }

      if (attemptsCount > 0) {
        scoredItemsCount++;
        totalScorePercentages += percentage;
        if (item.itemType === 'exam') completedExams++;
        if (item.itemType === 'homework') completedHomeworks++;

        if (!isPassed) {
          failedItemsCount++;
          if (isExhausted) exhaustedItemsCount++;
        }
      }

      const assessmentRecord: StudentAssessmentProgress = {
        itemId: item.id,
        itemTitle: item.title,
        itemType: item.itemType,
        unitId: item.unitId,
        unitTitle: unit?.title || `الوحدة ${unit?.unitNumber || ''}`,
        unitNumber: unit?.unitNumber || 1,
        orderIndex: item.orderIndex,
        totalMarks,
        passingScorePercentage,
        maxAttempts,
        attemptsCount,
        highestScore: finalScore,
        lastScore: finalScore,
        percentage,
        scorePercentage: percentage,
        isPassed,
        isExhausted,
        status,
        completedAt: p?.completed_at,
        updatedAt: p?.updated_at,
      };

      assessments.push(assessmentRecord);

      // Track latest attempted exam
      if (item.itemType === 'exam' && attemptsCount > 0) {
        if (!latestExamData || (assessmentRecord.completedAt && (!latestExamData.completedAt || assessmentRecord.completedAt > latestExamData.completedAt))) {
          latestExamData = {
            itemId: item.id,
            title: item.title,
            score: finalScore,
            percentage,
            isPassed,
            attemptsCount,
            maxAttempts,
            isExhausted,
            completedAt: assessmentRecord.completedAt,
          };
        }
      }

      // Track latest attempted homework
      if (item.itemType === 'homework' && attemptsCount > 0) {
        if (!latestHomeworkData || (assessmentRecord.completedAt && (!latestHomeworkData.completedAt || assessmentRecord.completedAt > latestHomeworkData.completedAt))) {
          latestHomeworkData = {
            itemId: item.id,
            title: item.title,
            score: finalScore,
            percentage,
            isPassed,
            attemptsCount,
            maxAttempts,
            isExhausted,
            completedAt: assessmentRecord.completedAt,
          };
        }
      }
    });

    const averageScore = scoredItemsCount > 0 
      ? Math.min(100, Math.max(0, Math.round(totalScorePercentages / scoredItemsCount))) 
      : 0;
    const needsAttention = exhaustedItemsCount > 0 || (scoredItemsCount > 0 && averageScore < 60);
    const isExcellent = scoredItemsCount > 0 && failedItemsCount === 0 && averageScore >= 85;

    // Build smart recommendation for teacher
    let recommendation: EnrolledStudentData['recommendation'];
    if (completedExams === 0 && completedHomeworks === 0) {
      recommendation = {
        level: 'idle',
        title: 'لم يبدأ الحل بعد ⏳',
        message: 'الطالب لم يبدأ بحل أي واجب أو امتحان بعد. يُفضل إرسال رسالة تشجيع لحثه على البدء وتجنب تراكم الدروس.',
        shouldCall: false,
        suggestedAction: 'encourage_sms',
        suggestedTemplate: `مرحباً ${student.studentName} يا بطل 👏 نذكرك بالبدء في حل واجب وامتحان كورس اللغة الإنجليزية للاستفادة القصوى من المحتوى.. بالتوفيق!`
      };
    } else if (exhaustedItemsCount > 0 || (latestExamData && !latestExamData.isPassed && latestExamData.isExhausted)) {
      recommendation = {
        level: 'critical',
        title: 'تنبيه عاجل: استنفاد محاولات ورُسوب 🚨',
        message: 'الطالب استنفد جميع المحاولات المقررة في الامتحان ورسب. يجب الاتصال الفوري بولي الأمر ومناقشة سبب الإخفاق ومنحه فرصة تعويضية.',
        shouldCall: true,
        suggestedAction: 'call_urgent',
        suggestedTemplate: `السلام عليكم ورحمة الله، مع حضرتك مستر محمد رضوان. نود إبلاغكم بأن نجلكم ${student.studentName} واجه صعوبة واستنفد محاولاته في الامتحان الأخير، نرجو التواصل معنا هاتفياً لبحث الأمر ومنحه فرصة تعويضية استثنائية.`
      };
    } else if (averageScore < 60 || failedItemsCount > 0) {
      recommendation = {
        level: 'warning',
        title: 'مستوى مقلق يحتاج متابعة هاتفية ⚠️',
        message: 'متوسط درجات الطالب منخفض ويحتاج إلى اتصال هاتفي أو رسالة متابعة حازمة لمعرفة سبب الضعف في حل الواجب والامتحان.',
        shouldCall: true,
        suggestedAction: 'call_urgent',
        suggestedTemplate: `أهلاً يا ${student.studentName}.. مستواك في الاختبارات الأخيرة يحتاج إلى مراجعة واهتمام أكبر. يرجى مراجعة فيديوهات الشرح وحل الواجب بعناية - مستر محمد رضوان`
      };
    } else if (averageScore >= 85) {
      recommendation = {
        level: 'excellent',
        title: 'أداء ممتاز ومتفوق 🌟',
        message: 'الطالب متفوق ودرجاته ممتازة جداً. لا داعي للاتصال الهاتفي، ويُكتفى بإرسال رسالة تقدير وتشجيع لتحفيزه.',
        shouldCall: false,
        suggestedAction: 'appreciate',
        suggestedTemplate: `أحسنت يا بطل ${student.studentName}! درجاتك مشرفة (${averageScore}%) ومستواك ممتاز في كورس اللغة الإنجليزية. فخور بجهدك وتفوقك الدائم 👏 مستر محمد رضوان`
      };
    } else {
      recommendation = {
        level: 'good',
        title: 'مستوى جيد ومستقر 👍',
        message: 'مستوى الطالب جيد ومستقر. يُنصح بإرسال رسالة توجيهية لحثه على الوصول للدرجة النهائية.',
        shouldCall: false,
        suggestedAction: 'monitor',
        suggestedTemplate: `مرحباً ${student.studentName}.. أداؤك جيد ومبشر (${averageScore}%)، راجع أخطاءك البسيطة في آخر واجب لتصل للمركز الأول دائماً! بالتوفيق - مستر محمد رضوان`
      };
    }

    result.push({
      id: student.id,
      studentId,
      courseId,
      studentName: student.studentName,
      studentPhone: student.studentPhone,
      parentPhone: student.parentPhone,
      paymentMethod: student.paymentMethod,
      amountPaid: student.amountPaid,
      enrolledAt: student.enrolledAt,
      progressPercentage: assessmentItems.length > 0 
        ? Math.round((scoredItemsCount / assessmentItems.length) * 100)
        : student.progressPercentage,
      activeDevicesCount: student.activeDevicesCount,
      progressList: Array.from(itemProgMap.values()),
      assessments,
      totalCourseExams,
      completedExams,
      totalCourseHomeworks,
      completedHomeworks,
      completedAssessments: completedExams + completedHomeworks,
      latestExam: latestExamData,
      latestHomework: latestHomeworkData,
      averageScore,
      needsAttention,
      isExcellent,
      exhaustedItemsCount,
      failedItemsCount,
      recommendation,
    });
  }

  // Sort so students needing urgent attention / critical come first
  return result.sort((a, b) => {
    if (a.recommendation?.level === 'critical' && b.recommendation?.level !== 'critical') return -1;
    if (b.recommendation?.level === 'critical' && a.recommendation?.level !== 'critical') return 1;
    if (a.needsAttention && !b.needsAttention) return -1;
    if (b.needsAttention && !a.needsAttention) return 1;
    return (b.averageScore || 0) - (a.averageScore || 0);
  });
}

export async function fetchStudentEnrolledCourseIds(studentId: string, studentEmail?: string): Promise<string[]> {
  if (!studentId) return [];
  const results: string[] = [];

  try {
    const remoteEnrolledIds = await fetchStudentEnrollmentsServer(studentId);
    if (remoteEnrolledIds && remoteEnrolledIds.length > 0) {
      remoteEnrolledIds.forEach(id => {
        if (!results.includes(id)) results.push(id);
      });
    }
  } catch (err) {
    console.warn("fetchStudentEnrollmentsServer failed, fallback to local:", err);
  }

  const allEnrollments = getLocal<any[]>(STORAGE_KEYS.ENROLLMENTS, []);
  allEnrollments.forEach(e => {
    const matchesId = e.studentId === studentId || e.student_id === studentId;
    const matchesEmail = studentEmail && (e.email === studentEmail || e.studentEmail === studentEmail);
    if (matchesId || matchesEmail) {
      const cid = e.courseId || e.course_id || e.id;
      if (cid && !results.includes(cid)) {
        results.push(cid);
      }
    }
  });

  // Free courses are available to all registered students without requiring any activation code
  try {
    const allCourses = await fetchAllCourses();
    allCourses.forEach(c => {
      if (c.isPublished && (c.isFree || (c.price ?? 0) <= 0)) {
        if (!results.includes(c.id)) {
          results.push(c.id);
        }
      }
    });
  } catch (err) {
    console.warn("Auto-including free courses error:", err);
  }

  return results;
}

export async function isStudentEnrolledInCourse(studentId: string, courseId: string, studentEmail?: string): Promise<boolean> {
  if (!studentId || !courseId) return false;
  const enrolledIds = await fetchStudentEnrolledCourseIds(studentId, studentEmail);
  if (enrolledIds.includes(courseId)) return true;

  // Fallback direct check for free course
  try {
    const course = await getCourseById(courseId);
    if (course && (course.isFree || (course.price ?? 0) <= 0)) {
      await enrollStudentInCourse(studentId, courseId, 'free', 0);
      return true;
    }
  } catch (e) {}

  return false;
}

export async function enrollStudentInCourse(
  studentId: string,
  courseId: string,
  paymentMethod: 'fawry' | 'wallet' | 'activation_code' | 'free',
  amount: number,
  studentInfo?: { fullName?: string; phone?: string; parentPhone?: string; email?: string; fawryRefNumber?: string }
): Promise<boolean> {
  if (!studentId || !courseId) return false;

  const allEnrollments = getLocal<any[]>(STORAGE_KEYS.ENROLLMENTS, []);
  const alreadyEnrolled = allEnrollments.some(
    e => (e.studentId === studentId || e.student_id === studentId) && (e.courseId === courseId || e.course_id === courseId)
  );

  if (alreadyEnrolled) return true;

  let finalName = studentInfo?.fullName || 'طالب المنصة';
  let finalPhone = studentInfo?.phone || '';
  let finalParentPhone = studentInfo?.parentPhone || '';
  let finalEmail = studentInfo?.email || '';

  // Auto-heal missing student data from local session storage
  if (typeof window !== 'undefined' && (!finalPhone || !finalParentPhone || finalName === 'طالب المنصة')) {
    try {
      const uStr = localStorage.getItem('mr_radwan_current_user');
      if (uStr) {
        const u = JSON.parse(uStr);
        if (u.id === studentId || !finalPhone) {
          if (finalName === 'طالب المنصة' && (u.fullName || u.full_name)) {
            finalName = u.fullName || u.full_name;
          }
          finalPhone = finalPhone || u.phone || '';
          finalParentPhone = finalParentPhone || u.parentPhone || u.parent_phone || '';
          finalEmail = finalEmail || u.email || '';
        }
      }
    } catch (e) {}
    if (!finalPhone) {
      try {
        const rStr = localStorage.getItem('mr_registered_student_info');
        if (rStr) {
          const r = JSON.parse(rStr);
          if (finalName === 'طالب المنصة' && r.fullName) {
            finalName = r.fullName;
          }
          finalPhone = finalPhone || r.phone || '';
          finalParentPhone = finalParentPhone || r.parentPhone || '';
          finalEmail = finalEmail || r.email || '';
        }
      } catch (e) {}
    }
  }

  const newEnrollment = {
    id: crypto.randomUUID(),
    studentId,
    courseId,
    studentName: finalName,
    studentPhone: finalPhone,
    parentPhone: finalParentPhone,
    studentEmail: finalEmail,
    email: finalEmail,
    paymentMethod,
    amountPaid: amount,
    enrolledAt: new Date().toISOString(),
    progressPercentage: 0,
    activeDevicesCount: 1,
    fawryReference: studentInfo?.fawryRefNumber,
  };

  allEnrollments.push(newEnrollment);
  setLocal(STORAGE_KEYS.ENROLLMENTS, allEnrollments);

  try {
    await saveEnrollmentServer(newEnrollment, {
      id: crypto.randomUUID(),
      studentId: studentId,
      amount: amount,
      transactionType: paymentMethod === 'wallet' ? 'course_purchase' : paymentMethod === 'fawry' ? 'fawry_purchase' : 'activation_code',
      fawryReference: studentInfo?.fawryRefNumber || null,
      notes: `اشتراك وتفعيل كورس (${courseId}) عبر ${paymentMethod}`,
    });
  } catch (err) {
    console.warn('saveEnrollmentServer error:', err);
  }

  return true;
}

export async function redeemActivationCodeForStudent(
  codeStr: string,
  studentId: string,
  studentName: string,
  targetCourseId?: string,
  studentInfo?: { email?: string; phone?: string; parentPhone?: string; fullName?: string }
): Promise<{ 
  success: boolean; 
  message: string; 
  courseId?: string; 
  courseTitle?: string;
  isFirstDevice?: boolean;
}> {
  if (!codeStr || !codeStr.trim()) {
    return { success: false, message: 'يرجى إدخال كود التفعيل أولاً' };
  }

  // Auto-heal missing student info for activation code redemption
  let resolvedPhone = studentInfo?.phone;
  let resolvedParentPhone = studentInfo?.parentPhone;
  let resolvedName = studentInfo?.fullName || studentName;
  let resolvedEmail = studentInfo?.email;

  if (typeof window !== 'undefined' && (!resolvedPhone || !resolvedParentPhone)) {
    try {
      const uStr = localStorage.getItem('mr_radwan_current_user');
      if (uStr) {
        const u = JSON.parse(uStr);
        resolvedPhone = resolvedPhone || u.phone;
        resolvedParentPhone = resolvedParentPhone || u.parentPhone || u.parent_phone;
        resolvedName = resolvedName || u.fullName || u.full_name;
        resolvedEmail = resolvedEmail || u.email;
      }
    } catch (e) {}
    if (!resolvedPhone) {
      try {
        const rStr = localStorage.getItem('mr_registered_student_info');
        if (rStr) {
          const r = JSON.parse(rStr);
          resolvedPhone = resolvedPhone || r.phone;
          resolvedParentPhone = resolvedParentPhone || r.parentPhone;
          resolvedName = resolvedName || r.fullName;
          resolvedEmail = resolvedEmail || r.email;
        }
      } catch (e) {}
    }
  }

  const cleanCode = codeStr.trim().toUpperCase();

  // 1. Check in Supabase first
  let codeObj: any = null;
  try {
    const { data: dbCode, error } = await supabase
      .from('course_activation_codes')
      .select('*, courses(id, title, price)')
      .ilike('code', cleanCode)
      .maybeSingle();

    if (!error && dbCode) {
      // Parse assigned student from batch_name if available
      let assignedStudent = '';
      if (dbCode.batch_name?.includes('مخصص:')) {
        assignedStudent = dbCode.batch_name.split('مخصص:')[1]?.replace(']', '')?.trim();
      }

      codeObj = {
        id: dbCode.id,
        courseId: dbCode.course_id,
        courseTitle: dbCode.courses?.title,
        price: dbCode.courses?.price,
        code: dbCode.code,
        batchName: dbCode.batch_name,
        assignedStudentName: assignedStudent,
        isUsed: dbCode.is_used,
        usedAt: dbCode.used_at,
        usedByStudentId: dbCode.used_by_student_id,
      };
    }
  } catch (err) {
    console.warn('Supabase query code error:', err);
  }

  // 2. Fallback to local storage if not found in Supabase
  const allCodes = getLocal<ActivationCodeData[]>(STORAGE_KEYS.CODES, []);
  if (!codeObj) {
    const localFound = allCodes.find(c => c.code.toUpperCase() === cleanCode);
    if (localFound) {
      codeObj = { ...localFound };
    }
  } else {
    // Merge local metadata if present
    const localFound = allCodes.find(c => c.code.toUpperCase() === cleanCode || c.id === codeObj.id);
    if (localFound) {
      codeObj.assignedStudentName = codeObj.assignedStudentName || localFound.assignedStudentName;
      codeObj.centerOrGroup = localFound.centerOrGroup;
      codeObj.price = codeObj.price || localFound.price;
    }
  }

  if (!codeObj) {
    return { success: false, message: 'كود التفعيل غير صحيح أو غير مسجل بالمنصة' };
  }

  if (codeObj.isUsed) {
    return { success: false, message: 'عذراً، هذا الكود تم استخدامه وتفعيله مسبقاً' };
  }

  if (targetCourseId && codeObj.courseId && codeObj.courseId !== targetCourseId) {
    return { success: false, message: 'هذا الكود مخصص لكورس آخر وليس هذا الكورس المطلوب' };
  }

  // Check personalized student assignment (تخصيص الكود لاسم طالب معين)
  if (codeObj.assignedStudentName && codeObj.assignedStudentName.trim()) {
    const assigned = codeObj.assignedStudentName.trim().toLowerCase();
    const current = (studentName || '').trim().toLowerCase();
    
    // Check if the current student matches or shares key name tokens
    const assignedTokens = assigned.split(/\s+/).filter((t: string) => t.length > 2);
    const currentTokens = current.split(/\s+/).filter((t: string) => t.length > 2);
    const matchesAnyToken = assignedTokens.some((t: string) => currentTokens.some((c: string) => c.includes(t) || t.includes(c)));

    if (!matchesAnyToken && assigned !== current) {
      return { 
        success: false, 
        message: `عذراً، هذا الكود مخصص ومسجل باسم الطالب: (${codeObj.assignedStudentName}). يرجى التأكد من حسابك أو مراجعة المعلم.` 
      };
    }
  }

  const nowIso = new Date().toISOString();

  // Mark code as used locally
  const updatedCodes = allCodes.map(c => {
    if (c.code.toUpperCase() === cleanCode || c.id === codeObj.id) {
      return {
        ...c,
        isUsed: true,
        usedByStudentName: studentName,
        usedByStudentId: studentId,
        usedAt: nowIso,
      };
    }
    return c;
  });
  setLocal(STORAGE_KEYS.CODES, updatedCodes);

  // Mark code as used in Supabase
  try {
    await markCodeUsedServer(codeObj.id, studentId, nowIso);
  } catch (err) {
    console.warn('markCodeUsedServer error:', err);
  }

  // Enroll student in course
  await enrollStudentInCourse(studentId, codeObj.courseId, 'activation_code', codeObj.price || 0, {
    fullName: resolvedName,
    phone: resolvedPhone,
    parentPhone: resolvedParentPhone,
    email: resolvedEmail,
  });

  // Resolve course title
  let courseTitle = codeObj.courseTitle;
  if (!courseTitle) {
    const allCourses = await fetchAllCourses();
    const matchedCourse = allCourses.find(c => c.id === codeObj.courseId);
    courseTitle = matchedCourse?.title || 'كورس مستر محمد رضوان';
  }

  return { 
    success: true, 
    message: 'تم تفعيل واشتراك الكورس بنجاح!', 
    courseId: codeObj.courseId,
    courseTitle,
    isFirstDevice: true
  };
}

