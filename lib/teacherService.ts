import { supabase } from './supabaseClient';

export interface CourseActionPermissions {
  canAddVideos: boolean;
  canAddHomework: boolean;
  canAddExams: boolean;
  canAddConceptSheets: boolean;
  canAddSummaries: boolean;
}

export interface AssistantData {
  id: string;
  fullName: string;
  assistantRoleTitle?: string; // e.g. "مساعد أول ثانوي", "مشرف الدعم الأكاديمي"
  email: string;
  phone?: string;
  passwordVault?: string; // Stored securely for teacher master key review
  role: 'assistant';
  isFrozen: boolean;
  createdAt: string;
  permissions?: {
    canManageStudents: boolean;
    canApproveRegistrations: boolean;
    canViewStudentPasswords: boolean;
    canManageAllCourses: boolean;
    assignedCourseIds: string[];
    courseActions?: {
      [courseId: string]: CourseActionPermissions;
    };
    globalCourseActions?: CourseActionPermissions;
    canHandleAcademicSupport: boolean;
    canHandleTechnicalSupport: boolean;
    canReviewHomework: boolean;
    canPublishAnnouncements: boolean;
    canSendMessages: boolean;
  };
}

export interface AnnouncementData {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  targetStage?: 'middle' | 'high' | null;
  targetGrade?: 1 | 2 | 3 | null;
  isPublished: boolean;
  isPinned?: boolean;
  createdAt: string;
  announcementType?: 'general' | 'top_student';
  studentName?: string;
  studentScore?: string;
}

export interface TeacherNoteData {
  id: string;
  title: string;
  content?: string;
  itemType: 'schedule' | 'note' | 'lecture';
  scheduledDatetime?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  isCompleted: boolean;
  targetStage?: 'middle' | 'high' | null;
  targetGrade?: 1 | 2 | 3 | null;
  createdAt: string;
}

export interface ActivationCodeData {
  id: string;
  courseId: string;
  courseTitle?: string;
  code: string;
  batchName?: string;
  isUsed: boolean;
  usedByStudentName?: string;
  usedAt?: string;
  createdAt: string;
}

export interface AuditLogData {
  id: string;
  actorId?: string;
  actorName: string;
  actorRole: string;
  actionType: string;
  targetEntity: string;
  targetId?: string;
  details?: Record<string, any>;
  createdAt: string;
}

// Local Storage Keys
const LOCAL_ASSISTANTS_KEY = 'mr_radwan_assistants';
const LOCAL_ANNOUNCEMENTS_KEY = 'mr_radwan_announcements';
const LOCAL_DELETED_ANNOUNCEMENTS_KEY = 'mr_radwan_deleted_announcements';
const LOCAL_NOTES_KEY = 'mr_radwan_teacher_notes';
const LOCAL_DELETED_NOTES_KEY = 'mr_radwan_deleted_teacher_notes';
const LOCAL_CODES_KEY = 'mr_radwan_activation_codes';
const LOCAL_AUDIT_LOGS_KEY = 'mr_radwan_audit_logs';

// Helper: Seed Default Data if empty
function getLocal<T>(key: string, defaultVal: T): T {
  if (typeof window === 'undefined') return defaultVal;
  const stored = localStorage.getItem(key);
  if (!stored) {
    localStorage.setItem(key, JSON.stringify(defaultVal));
    return defaultVal;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return defaultVal;
  }
}

function setLocal<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err: any) {
    console.warn(`localStorage Quota Exceeded or Error for key ${key}:`, err);
    if (Array.isArray(data) && data.length > 5) {
      try {
        localStorage.setItem(key, JSON.stringify(data.slice(0, 5)));
        console.log(`Saved truncated version for key ${key}`);
      } catch (e) {
        console.error(`Truncation also failed for key ${key}`);
      }
    }
  }
}

// ----------------- ASSISTANTS -----------------
export async function fetchAssistants(): Promise<AssistantData[]> {
  try {
    const { fetchAssistantsServerAction } = await import('@/app/actions/assistantActions');
    const res = await fetchAssistantsServerAction();
    if (res.success && res.data && res.data.length > 0) {
      setLocal(LOCAL_ASSISTANTS_KEY, res.data);
      return res.data as AssistantData[];
    }
  } catch (err) {
    console.warn('fetchAssistantsServerAction error, falling back:', err);
  }

  return getLocal<AssistantData[]>(LOCAL_ASSISTANTS_KEY, [
    {
      id: 'asst-1',
      fullName: 'أحمد محمود (مساعد أول ثانوي)',
      assistantRoleTitle: 'مشرف أول ثانوي ومراجعة الواجبات',
      email: 'ahmed.assistant@radwan.edu',
      phone: '01012345678',
      passwordVault: 'Radwan@Ast#2026_Secured!',
      role: 'assistant',
      isFrozen: false,
      createdAt: new Date().toISOString(),
      permissions: {
        canManageStudents: true,
        canApproveRegistrations: true,
        canViewStudentPasswords: false,
        canManageAllCourses: false,
        assignedCourseIds: [],
        canHandleAcademicSupport: true,
        canHandleTechnicalSupport: true,
        canReviewHomework: true,
        canPublishAnnouncements: false,
        canSendMessages: true,
      },
    },
  ]);
}

export async function createAssistant(payload: {
  fullName: string;
  assistantRoleTitle?: string;
  email: string;
  passwordHash: string;
  phone?: string;
  permissions: AssistantData['permissions'];
}): Promise<AssistantData> {
  const newId = crypto.randomUUID();
  const newAssistant: AssistantData = {
    id: newId,
    fullName: payload.fullName,
    assistantRoleTitle: payload.assistantRoleTitle,
    email: payload.email,
    phone: payload.phone || '',
    passwordVault: payload.passwordHash,
    role: 'assistant',
    isFrozen: false,
    createdAt: new Date().toISOString(),
    permissions: payload.permissions,
  };

  try {
    const { createAssistantServerAction } = await import('@/app/actions/assistantActions');
    const res = await createAssistantServerAction({
      fullName: payload.fullName,
      assistantRoleTitle: payload.assistantRoleTitle,
      email: payload.email,
      passwordHash: payload.passwordHash,
      phone: payload.phone,
      permissions: payload.permissions as any,
    });
    if (res.success && res.assistantId) {
      newAssistant.id = res.assistantId;
    }
  } catch (err) {
    console.warn('createAssistantServerAction error, fallback to local:', err);
  }

  const current = getLocal<AssistantData[]>(LOCAL_ASSISTANTS_KEY, []);
  setLocal(LOCAL_ASSISTANTS_KEY, [newAssistant, ...current.filter(a => a.email.toLowerCase() !== payload.email.toLowerCase())]);

  return newAssistant;
}

export async function updateAssistant(assistant: AssistantData): Promise<void> {
  try {
    const { updateAssistantServerAction } = await import('@/app/actions/assistantActions');
    await updateAssistantServerAction({
      id: assistant.id,
      fullName: assistant.fullName,
      assistantRoleTitle: assistant.assistantRoleTitle,
      email: assistant.email,
      passwordHash: assistant.passwordVault || '',
      phone: assistant.phone,
      permissions: assistant.permissions as any,
    });
  } catch (err) {
    console.warn('updateAssistantServerAction fallback to local:', err);
  }

  const current = getLocal<AssistantData[]>(LOCAL_ASSISTANTS_KEY, []);
  setLocal(
    LOCAL_ASSISTANTS_KEY,
    current.map((a) => (a.id === assistant.id ? assistant : a))
  );
}

export async function toggleAssistantFreeze(id: string, isFrozen: boolean): Promise<void> {
  try {
    const { toggleAssistantFreezeServerAction } = await import('@/app/actions/assistantActions');
    await toggleAssistantFreezeServerAction(id, isFrozen);
  } catch (err) {
    console.warn('toggleAssistantFreezeServerAction error:', err);
  }

  const current = getLocal<AssistantData[]>(LOCAL_ASSISTANTS_KEY, []);
  setLocal(
    LOCAL_ASSISTANTS_KEY,
    current.map((a) => (a.id === id ? { ...a, isFrozen } : a))
  );
}

export async function deleteAssistant(id: string): Promise<void> {
  try {
    const { deleteAssistantServerAction } = await import('@/app/actions/assistantActions');
    await deleteAssistantServerAction(id);
  } catch (err) {
    console.warn('deleteAssistantServerAction error:', err);
  }

  const current = getLocal<AssistantData[]>(LOCAL_ASSISTANTS_KEY, []);
  setLocal(
    LOCAL_ASSISTANTS_KEY,
    current.filter((a) => a.id !== id)
  );
}

// ----------------- ANNOUNCEMENTS -----------------
export async function fetchAnnouncements(): Promise<AnnouncementData[]> {
  const deletedIds = getLocal<string[]>(LOCAL_DELETED_ANNOUNCEMENTS_KEY, []);

  try {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      const mapped = data
        .filter((d) => !deletedIds.includes(d.id))
        .map((d) => {
        let announcementType: 'general' | 'top_student' = 'general';
        let studentName = '';
        let studentScore = '';
        let displayContent = d.content || '';
        let isPinned = false;

        if (typeof displayContent === 'string' && displayContent.startsWith('{"type":"top_student"')) {
          try {
            const parsed = JSON.parse(displayContent);
            announcementType = 'top_student';
            studentName = parsed.studentName || '';
            studentScore = parsed.studentScore || '';
            displayContent = parsed.message || '';
            isPinned = !!parsed.isPinned;
          } catch {
            // fallback
          }
        } else if (typeof displayContent === 'string' && displayContent.startsWith('{"type":"general"')) {
          try {
            const parsed = JSON.parse(displayContent);
            displayContent = parsed.message || '';
            isPinned = !!parsed.isPinned;
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
          isPublished: d.is_published ?? true,
          isPinned,
          createdAt: d.created_at,
          announcementType,
          studentName,
          studentScore,
        };
      });

      return mapped.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }
  } catch (err) {
    console.warn('Supabase fetchAnnouncements fallback to local:', err);
  }

  const local = getLocal<AnnouncementData[]>(LOCAL_ANNOUNCEMENTS_KEY, []);
  return local
    .filter((a) => !deletedIds.includes(a.id))
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
}

export async function createAnnouncement(payload: {
  title: string;
  content: string;
  imageUrl?: string;
  targetStage?: 'middle' | 'high' | null;
  targetGrade?: 1 | 2 | 3 | null;
  announcementType?: 'general' | 'top_student';
  studentName?: string;
  studentScore?: string;
  isPinned?: boolean;
}): Promise<AnnouncementData> {
  const newId = crypto.randomUUID();
  const isTopStudent = payload.announcementType === 'top_student';
  
  // Format content for database storage
  const dbContent = isTopStudent
    ? JSON.stringify({
        type: 'top_student',
        studentName: payload.studentName,
        studentScore: payload.studentScore,
        message: payload.content,
        isPinned: !!payload.isPinned,
      })
    : JSON.stringify({
        type: 'general',
        message: payload.content,
        isPinned: !!payload.isPinned,
      });

  const newAnn: AnnouncementData = {
    id: newId,
    title: payload.title,
    content: payload.content,
    imageUrl: payload.imageUrl,
    targetStage: payload.targetStage,
    targetGrade: payload.targetGrade,
    isPublished: true,
    isPinned: !!payload.isPinned,
    announcementType: payload.announcementType || 'general',
    studentName: payload.studentName,
    studentScore: payload.studentScore,
    createdAt: new Date().toISOString(),
  };

  try {
    await supabase.from('announcements').insert([
      {
        id: newId,
        title: payload.title,
        content: dbContent,
        image_url: payload.imageUrl,
        target_stage: payload.targetStage,
        target_grade: payload.targetGrade,
        is_published: true,
      },
    ]);
  } catch (err) {
    console.warn('Supabase createAnnouncement error:', err);
  }

  const current = getLocal<AnnouncementData[]>(LOCAL_ANNOUNCEMENTS_KEY, []);
  setLocal(LOCAL_ANNOUNCEMENTS_KEY, [newAnn, ...current]);
  return newAnn;
}

export async function updateAnnouncement(
  id: string,
  payload: {
    title: string;
    content: string;
    imageUrl?: string;
    targetStage?: 'middle' | 'high' | null;
    targetGrade?: 1 | 2 | 3 | null;
    announcementType?: 'general' | 'top_student';
    studentName?: string;
    studentScore?: string;
    isPinned?: boolean;
  }
): Promise<void> {
  const isTopStudent = payload.announcementType === 'top_student';
  const dbContent = isTopStudent
    ? JSON.stringify({
        type: 'top_student',
        studentName: payload.studentName,
        studentScore: payload.studentScore,
        message: payload.content,
        isPinned: !!payload.isPinned,
      })
    : JSON.stringify({
        type: 'general',
        message: payload.content,
        isPinned: !!payload.isPinned,
      });

  try {
    await supabase
      .from('announcements')
      .update({
        title: payload.title,
        content: dbContent,
        image_url: payload.imageUrl,
        target_stage: payload.targetStage,
        target_grade: payload.targetGrade,
      })
      .eq('id', id);
  } catch (err) {
    console.warn('Supabase updateAnnouncement error:', err);
  }

  const current = getLocal<AnnouncementData[]>(LOCAL_ANNOUNCEMENTS_KEY, []);
  setLocal(
    LOCAL_ANNOUNCEMENTS_KEY,
    current.map((a) =>
      a.id === id
        ? {
            ...a,
            title: payload.title,
            content: payload.content,
            imageUrl: payload.imageUrl,
            targetStage: payload.targetStage,
            targetGrade: payload.targetGrade,
            announcementType: payload.announcementType,
            studentName: payload.studentName,
            studentScore: payload.studentScore,
            isPinned: !!payload.isPinned,
          }
        : a
    )
  );
}

export async function togglePinAnnouncement(id: string, isPinned: boolean): Promise<void> {
  const current = getLocal<AnnouncementData[]>(LOCAL_ANNOUNCEMENTS_KEY, []);
  const item = current.find((a) => a.id === id);
  if (!item) return;

  const isTopStudent = item.announcementType === 'top_student';
  const dbContent = isTopStudent
    ? JSON.stringify({
        type: 'top_student',
        studentName: item.studentName,
        studentScore: item.studentScore,
        message: item.content,
        isPinned,
      })
    : JSON.stringify({
        type: 'general',
        message: item.content,
        isPinned,
      });

  try {
    await supabase
      .from('announcements')
      .update({ content: dbContent })
      .eq('id', id);
  } catch (err) {
    console.warn('Supabase togglePinAnnouncement error:', err);
  }

  setLocal(
    LOCAL_ANNOUNCEMENTS_KEY,
    current.map((a) => (a.id === id ? { ...a, isPinned } : a))
  );
}

export async function deleteAnnouncement(id: string): Promise<void> {
  // 1. Blacklist locally so it is immediately removed from all views
  const deletedIds = getLocal<string[]>(LOCAL_DELETED_ANNOUNCEMENTS_KEY, []);
  if (!deletedIds.includes(id)) {
    setLocal(LOCAL_DELETED_ANNOUNCEMENTS_KEY, [...deletedIds, id]);
  }

  // 2. Remove from local store
  const current = getLocal<AnnouncementData[]>(LOCAL_ANNOUNCEMENTS_KEY, []);
  setLocal(
    LOCAL_ANNOUNCEMENTS_KEY,
    current.filter((a) => a.id !== id)
  );

  // 3. Call server action using admin bypass
  try {
    const { deleteAnnouncementServerAction } = await import('@/app/actions/announcementActions');
    await deleteAnnouncementServerAction(id);
  } catch (err) {
    console.warn('deleteAnnouncementServerAction error:', err);
  }

  // 4. Fallback delete on client supabase
  try {
    await supabase.from('announcements').delete().eq('id', id);
  } catch (err) {
    // Ignore fallback errors
  }
}

export async function restoreAnnouncement(item: AnnouncementData): Promise<void> {
  const deletedIds = getLocal<string[]>(LOCAL_DELETED_ANNOUNCEMENTS_KEY, []);
  setLocal(
    LOCAL_DELETED_ANNOUNCEMENTS_KEY,
    deletedIds.filter((id) => id !== item.id)
  );

  const current = getLocal<AnnouncementData[]>(LOCAL_ANNOUNCEMENTS_KEY, []);
  if (!current.some((a) => a.id === item.id)) {
    setLocal(LOCAL_ANNOUNCEMENTS_KEY, [item, ...current]);
  }
}

// ----------------- TEACHER NOTES & SCHEDULE -----------------
export async function fetchTeacherNotes(): Promise<TeacherNoteData[]> {
  const deletedIds = getLocal<string[]>(LOCAL_DELETED_NOTES_KEY, []);

  try {
    const { data, error } = await supabase
      .from('teacher_schedules_and_notes')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      return data
        .filter((d) => !deletedIds.includes(d.id))
        .map((d) => ({
        id: d.id,
        title: d.title,
        content: d.content,
        itemType: d.item_type || 'note',
        scheduledDatetime: d.scheduled_datetime,
        priority: d.priority || 'normal',
        isCompleted: !!d.is_completed,
        targetStage: d.target_stage || null,
        targetGrade: d.target_grade || null,
        createdAt: d.created_at,
      }));
    }
  } catch (err) {
    console.warn('Supabase fetchTeacherNotes fallback to local:', err);
  }

  return getLocal<TeacherNoteData[]>(LOCAL_NOTES_KEY, [])
    .filter((n) => !deletedIds.includes(n.id));
}

export async function createTeacherNote(payload: {
  title: string;
  content?: string;
  itemType: 'schedule' | 'note' | 'lecture';
  scheduledDatetime?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  targetStage?: 'middle' | 'high' | null;
  targetGrade?: 1 | 2 | 3 | null;
}): Promise<TeacherNoteData> {
  const newId = crypto.randomUUID();
  const note: TeacherNoteData = {
    id: newId,
    title: payload.title,
    content: payload.content,
    itemType: payload.itemType,
    scheduledDatetime: payload.scheduledDatetime,
    priority: payload.priority,
    isCompleted: false,
    targetStage: payload.targetStage || null,
    targetGrade: payload.targetGrade || null,
    createdAt: new Date().toISOString(),
  };

  try {
    await supabase.from('teacher_schedules_and_notes').insert([
      {
        id: newId,
        title: payload.title,
        content: payload.content,
        item_type: payload.itemType,
        scheduled_datetime: payload.scheduledDatetime,
        priority: payload.priority,
        is_completed: false,
      },
    ]);
  } catch (err) {
    console.warn('Supabase createTeacherNote error:', err);
  }

  const current = getLocal<TeacherNoteData[]>(LOCAL_NOTES_KEY, []);
  setLocal(LOCAL_NOTES_KEY, [note, ...current]);
  return note;
}

export async function updateTeacherNote(
  id: string,
  payload: {
    title: string;
    content?: string;
    itemType: 'schedule' | 'note' | 'lecture';
    scheduledDatetime?: string;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    targetStage?: 'middle' | 'high' | null;
    targetGrade?: 1 | 2 | 3 | null;
  }
): Promise<void> {
  try {
    await supabase
      .from('teacher_schedules_and_notes')
      .update({
        title: payload.title,
        content: payload.content,
        item_type: payload.itemType,
        scheduled_datetime: payload.scheduledDatetime,
        priority: payload.priority,
      })
      .eq('id', id);
  } catch (err) {
    console.warn('Supabase updateTeacherNote error:', err);
  }

  const current = getLocal<TeacherNoteData[]>(LOCAL_NOTES_KEY, []);
  setLocal(
    LOCAL_NOTES_KEY,
    current.map((n) =>
      n.id === id
        ? {
            ...n,
            title: payload.title,
            content: payload.content,
            itemType: payload.itemType,
            scheduledDatetime: payload.scheduledDatetime,
            priority: payload.priority,
            targetStage: payload.targetStage || null,
            targetGrade: payload.targetGrade || null,
          }
        : n
    )
  );
}

export async function toggleTeacherNoteComplete(id: string, isCompleted: boolean): Promise<void> {
  try {
    await supabase
      .from('teacher_schedules_and_notes')
      .update({ is_completed: isCompleted })
      .eq('id', id);
  } catch (err) {
    console.warn('Supabase toggleTeacherNoteComplete error:', err);
  }

  const current = getLocal<TeacherNoteData[]>(LOCAL_NOTES_KEY, []);
  setLocal(
    LOCAL_NOTES_KEY,
    current.map((n) => (n.id === id ? { ...n, isCompleted } : n))
  );
}

export async function deleteTeacherNote(id: string): Promise<void> {
  const deletedIds = getLocal<string[]>(LOCAL_DELETED_NOTES_KEY, []);
  if (!deletedIds.includes(id)) {
    setLocal(LOCAL_DELETED_NOTES_KEY, [...deletedIds, id]);
  }

  const current = getLocal<TeacherNoteData[]>(LOCAL_NOTES_KEY, []);
  setLocal(
    LOCAL_NOTES_KEY,
    current.filter((n) => n.id !== id)
  );

  try {
    await supabase.from('teacher_schedules_and_notes').delete().eq('id', id);
  } catch (err) {
    console.warn('Supabase deleteTeacherNote error:', err);
  }
}

export async function restoreTeacherNote(item: TeacherNoteData): Promise<void> {
  const deletedIds = getLocal<string[]>(LOCAL_DELETED_NOTES_KEY, []);
  setLocal(
    LOCAL_DELETED_NOTES_KEY,
    deletedIds.filter((id) => id !== item.id)
  );

  const current = getLocal<TeacherNoteData[]>(LOCAL_NOTES_KEY, []);
  if (!current.some((n) => n.id === item.id)) {
    setLocal(LOCAL_NOTES_KEY, [item, ...current]);
  }
}

// ----------------- ACTIVATION CODES -----------------
export async function generateCourseCodes(payload: {
  courseId: string;
  courseTitle: string;
  count: number;
  batchName?: string;
}): Promise<ActivationCodeData[]> {
  const generated: ActivationCodeData[] = [];
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  for (let i = 0; i < payload.count; i++) {
    let randomPart = '';
    for (let c = 0; c < 8; c++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const code = `RADWAN-${randomPart.slice(0, 4)}-${randomPart.slice(4)}`;
    const item: ActivationCodeData = {
      id: crypto.randomUUID(),
      courseId: payload.courseId,
      courseTitle: payload.courseTitle,
      code,
      batchName: payload.batchName || 'دفعة ' + new Date().toLocaleDateString('ar-EG'),
      isUsed: false,
      createdAt: new Date().toISOString(),
    };
    generated.push(item);
  }

  try {
    await supabase.from('course_activation_codes').insert(
      generated.map((g) => ({
        id: g.id,
        course_id: g.courseId,
        code: g.code,
        batch_name: g.batchName,
        is_used: false,
      }))
    );
  } catch (err) {
    console.warn('Supabase generateCourseCodes error:', err);
  }

  const current = getLocal<ActivationCodeData[]>(LOCAL_CODES_KEY, []);
  setLocal(LOCAL_CODES_KEY, [...generated, ...current]);

  await logAuditEvent({
    actorName: 'مستر محمد رضوان (Super Admin)',
    actorRole: 'teacher',
    actionType: 'GENERATE_CODES',
    targetEntity: 'course_activation_codes',
    details: { courseId: payload.courseId, count: payload.count, batch: payload.batchName },
  });

  return generated;
}

export async function fetchCourseCodes(courseId?: string): Promise<ActivationCodeData[]> {
  try {
    let query = supabase.from('course_activation_codes').select('*').order('created_at', { ascending: false });
    if (courseId) {
      query = query.eq('course_id', courseId);
    }
    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      return data.map((d) => ({
        id: d.id,
        courseId: d.course_id,
        code: d.code,
        batchName: d.batch_name,
        isUsed: d.is_used,
        usedByStudentName: d.used_by_student_name,
        usedAt: d.used_at,
        createdAt: d.created_at,
      }));
    }
  } catch (err) {
    console.warn('Supabase fetchCourseCodes error:', err);
  }

  const all = getLocal<ActivationCodeData[]>(LOCAL_CODES_KEY, []);
  return courseId ? all.filter((c) => c.courseId === courseId) : all;
}

// ----------------- AUDIT LOGS -----------------
export async function logAuditEvent(payload: {
  actorId?: string;
  actorName: string;
  actorRole: string;
  actionType: string;
  targetEntity: string;
  targetId?: string;
  details?: Record<string, any>;
}): Promise<void> {
  const logItem: AuditLogData = {
    id: crypto.randomUUID(),
    actorId: payload.actorId,
    actorName: payload.actorName,
    actorRole: payload.actorRole,
    actionType: payload.actionType,
    targetEntity: payload.targetEntity,
    targetId: payload.targetId,
    details: payload.details,
    createdAt: new Date().toISOString(),
  };

  try {
    await supabase.from('audit_logs').insert([
      {
        id: logItem.id,
        actor_id: payload.actorId,
        actor_name: payload.actorName,
        actor_role: payload.actorRole,
        action_type: payload.actionType,
        target_entity: payload.targetEntity,
        target_id: payload.targetId,
        details: payload.details,
      },
    ]);
  } catch (err) {
    console.warn('Supabase logAuditEvent error:', err);
  }

  const current = getLocal<AuditLogData[]>(LOCAL_AUDIT_LOGS_KEY, []);
  setLocal(LOCAL_AUDIT_LOGS_KEY, [logItem, ...current.slice(0, 100)]);
}

export async function fetchAuditLogs(): Promise<AuditLogData[]> {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data && data.length > 0) {
      return data.map((d) => ({
        id: d.id,
        actorId: d.actor_id,
        actorName: d.actor_name,
        actorRole: d.actor_role,
        actionType: d.action_type,
        targetEntity: d.target_entity,
        targetId: d.target_id,
        details: d.details,
        createdAt: d.created_at,
      }));
    }
  } catch (err) {
    console.warn('Supabase fetchAuditLogs fallback:', err);
  }

  return getLocal<AuditLogData[]>(LOCAL_AUDIT_LOGS_KEY, []);
}
