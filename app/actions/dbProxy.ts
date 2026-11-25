'use server';

import { createHmac, timingSafeEqual } from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseServer';
import {
  getServerSession,
  requireStaffSession,
  requireStudentOrStaffSession,
  canAssistantAccessCoursePerm,
  canAssistantAccessAnyCoursePerm,
} from '@/lib/serverAuth';
import { getItemTypePermissionKey } from '@/lib/assistantPermissions';

function getCertificateSigningSecret(): string {
  return process.env.HONOR_CERTIFICATE_SECRET
    || process.env.CERTIFICATE_SIGNING_SECRET
    || 'mrmoplat-honor-certificate-development-secret';
}

function encodeCertificatePayload(payload: {
  studentId: string;
  courseId: string;
  itemId: string;
  percentage: number;
}): string {
  return Buffer.from(JSON.stringify({
    studentId: payload.studentId,
    courseId: payload.courseId,
    itemId: payload.itemId,
    percentage: payload.percentage,
  }), 'utf8').toString('base64url');
}

function signHonorCertificate(payload: {
  studentId: string;
  courseId: string;
  itemId: string;
  percentage: number;
}): string {
  const encodedPayload = encodeCertificatePayload(payload);
  const signature = createHmac('sha256', getCertificateSigningSecret())
    .update(encodedPayload)
    .digest('base64url');
  return `${encodedPayload}.${signature}`;
}

function verifyHonorCertificateCode(code: string, payload: {
  studentId: string;
  courseId: string;
  itemId: string;
  percentage: number;
}): boolean {
  if (!code) return false;

  const expectedCode = signHonorCertificate(payload);
  const codeBuffer = Buffer.from(code);
  const expectedBuffer = Buffer.from(expectedCode);

  return codeBuffer.length === expectedBuffer.length
    && timingSafeEqual(codeBuffer, expectedBuffer);
}

const STAFF_PROXY_TABLES = new Set([
  'announcements',
  'teacher_schedules_and_notes',
  'course_activation_codes',
  'audit_logs',
]);

async function resolveCourseIdForUnit(unitId: string): Promise<string | null> {
  if (!unitId) return null;
  const { data } = await supabaseAdmin
    .from('course_units')
    .select('course_id')
    .eq('id', unitId)
    .maybeSingle();
  return data?.course_id || null;
}

async function resolveCourseIdForItem(itemId: string): Promise<string | null> {
  if (!itemId) return null;
  const { data } = await supabaseAdmin
    .from('unit_items')
    .select('course_id')
    .eq('id', itemId)
    .maybeSingle();
  return data?.course_id || null;
}

async function assertProxyAccess(
  table: string,
  payloadOrMatch?: Record<string, any> | any[],
  op: 'select' | 'write' | 'delete' = 'write'
) {
  if (STAFF_PROXY_TABLES.has(table)) {
    const staff = await requireStaffSession();
    if (!staff) {
      throw new Error('غير مصرح بهذه العملية الإدارية');
    }
    if (!staff.isTeacher) {
      if (table === 'announcements' && op !== 'select' && !staff.assistantMatrix?.canPublishAnnouncements) {
        throw new Error('غير مصرح للمساعد بنشر أو تعديل الإعلانات');
      }
      if (table === 'course_activation_codes') {
        const items = Array.isArray(payloadOrMatch) ? payloadOrMatch : (payloadOrMatch ? [payloadOrMatch] : []);
        for (const rec of items) {
          const cid = rec?.course_id || rec?.courseId;
          if (op === 'delete') {
            if (cid && !canAssistantAccessCoursePerm(staff, cid, 'canDeleteCodes')) {
              throw new Error('غير مصرح للمساعد بحذف أكواد التفعيل');
            }
          } else if (op === 'write' && cid) {
            if (!canAssistantAccessCoursePerm(staff, cid, 'canGenerateCodes')) {
              throw new Error('غير مصرح للمساعد بإصدار أكواد تفعيل لهذا الكورس');
            }
          }
        }
      }
    }
    return staff;
  }

  if (table === 'student_item_progress') {
    const session = await getServerSession();
    if (!session) {
      throw new Error('يجب تسجيل الدخول أولاً');
    }
    if (session.isStaff) return session;
    // STRICT SECURITY: Students cannot directly write/upsert/update/delete progress or scores!
    if (op !== 'select') {
      throw new Error('غير مصرح بتعديل الدرجات أو حالة الإنجاز مباشرة');
    }
    const records = Array.isArray(payloadOrMatch) ? payloadOrMatch : [payloadOrMatch];
    for (const rec of records) {
      const targetStudentId = rec?.student_id || rec?.studentId;
      if (targetStudentId && String(targetStudentId) !== session.id) {
        throw new Error('غير مصرح بالوصول لبيانات طالب آخر');
      }
    }
    return session;
  }

  throw new Error('الجدول غير مصرح بالوصول إليه عبر هذه الواجهة');
}

async function checkStudentItemAccessServer(
  studentId: string,
  itemRow: any
): Promise<{ isAccessible: boolean; reason?: string }> {
  if (!itemRow || !itemRow.course_id) {
    return { isAccessible: false, reason: 'المحتوى المطلوب غير موجود.' };
  }

  const today = new Date().toISOString().split('T')[0];

  const { data: courseRow } = await supabaseAdmin
    .from('courses')
    .select('id, is_published, publish_date, expiry_date, description')
    .eq('id', itemRow.course_id)
    .maybeSingle();

  if (!courseRow || courseRow.is_published === false) {
    return { isAccessible: false, reason: 'هذا الكورس غير متاح أو مغلق حالياً.' };
  }
  if (courseRow.publish_date && today < String(courseRow.publish_date)) {
    return { isAccessible: false, reason: `هذا الكورس مجدول للبدء بتاريخ ${courseRow.publish_date}.` };
  }
  if (courseRow.expiry_date && today > String(courseRow.expiry_date)) {
    return { isAccessible: false, reason: `انتهت صلاحية هذا الكورس بتاريخ ${courseRow.expiry_date}.` };
  }

  if (itemRow.start_date && today < String(itemRow.start_date)) {
    return { isAccessible: false, reason: `هذا العنصر مجدول ومحدد للبدء بتاريخ ${itemRow.start_date}.` };
  }
  if (itemRow.end_date && today > String(itemRow.end_date)) {
    return { isAccessible: false, reason: `انتهى الموعد النهائي لهذا العنصر بتاريخ ${itemRow.end_date}.` };
  }

  const parsedCourse = parseCourseFromRow(courseRow);
  const enforceUnitProgression = parsedCourse.enforceUnitProgression ?? true;
  const enforceItemProgression = parsedCourse.enforceItemProgression ?? true;

  if (!enforceUnitProgression && !enforceItemProgression) {
    return { isAccessible: true };
  }

  const [{ data: units }, { data: allItems }, { data: progRows }] = await Promise.all([
    supabaseAdmin
      .from('course_units')
      .select('id, order_index, unit_number, title')
      .eq('course_id', itemRow.course_id)
      .order('order_index', { ascending: true }),
    supabaseAdmin
      .from('unit_items')
      .select('id, unit_id, item_type, order_index, is_prerequisite_required')
      .eq('course_id', itemRow.course_id)
      .order('order_index', { ascending: true }),
    supabaseAdmin
      .from('student_item_progress')
      .select('item_id, is_passed')
      .eq('student_id', studentId)
      .eq('course_id', itemRow.course_id),
  ]);

  const passedSet = new Set(
    (progRows || []).filter((p: any) => p.is_passed === true).map((p: any) => p.item_id)
  );
  const sortedUnits = (units || []).slice().sort(
    (a: any, b: any) => (a.order_index || 0) - (b.order_index || 0) || (a.unit_number || 0) - (b.unit_number || 0)
  );
  const currentUnitIdx = sortedUnits.findIndex((u: any) => u.id === itemRow.unit_id);

  const itemsByUnit = new Map<string, any[]>();
  (allItems || []).forEach((it: any) => {
    const arr = itemsByUnit.get(it.unit_id) || [];
    arr.push(it);
    itemsByUnit.set(it.unit_id, arr);
  });

  if (enforceUnitProgression && currentUnitIdx > 0) {
    for (let uIdx = 0; uIdx < currentUnitIdx; uIdx++) {
      const prevUnit = sortedUnits[uIdx];
      const prevItems = itemsByUnit.get(prevUnit.id) || [];
      for (const pItem of prevItems) {
        const isCore = pItem.item_type === 'video' || pItem.item_type === 'homework' || pItem.item_type === 'exam';
        if (isCore && pItem.is_prerequisite_required !== false && !passedSet.has(pItem.id)) {
          return {
            isAccessible: false,
            reason: `يجب إكمال واجتياز (${prevUnit.title}) أولاً لفتح هذا المحتوى.`,
          };
        }
      }
    }
  }

  if (enforceItemProgression && itemRow.is_prerequisite_required !== false && itemRow.unit_id) {
    const currentUnitItems = (itemsByUnit.get(itemRow.unit_id) || []).slice().sort(
      (a: any, b: any) => (a.order_index || 0) - (b.order_index || 0)
    );
    const currentItemIdx = currentUnitItems.findIndex((i: any) => i.id === itemRow.id);
    if (currentItemIdx > 0) {
      for (let iIdx = 0; iIdx < currentItemIdx; iIdx++) {
        const prevItem = currentUnitItems[iIdx];
        const isCore = prevItem.item_type === 'video' || prevItem.item_type === 'homework' || prevItem.item_type === 'exam';
        if (isCore && prevItem.is_prerequisite_required !== false && !passedSet.has(prevItem.id)) {
          return {
            isAccessible: false,
            reason: 'يجب اجتياز الدروس والاختبارات السابقة أولاً قبل الدخول إلى هذا التقييم.',
          };
        }
      }
    }
  }

  return { isAccessible: true };
}

async function hasCourseContentAccess(
  session: Awaited<ReturnType<typeof getServerSession>>,
  courseId?: string | null
): Promise<boolean> {
  if (!session) return false;
  if (session.isStaff) return true;
  if (session.role !== 'student' || session.status !== 'active' || !courseId) return false;

  const { data: enrollment } = await supabaseAdmin
    .from('course_enrollments')
    .select('id')
    .eq('student_id', session.id)
    .eq('course_id', courseId)
    .eq('is_active', true)
    .maybeSingle();

  if (enrollment?.id) return true;

  const { data: course } = await supabaseAdmin
    .from('courses')
    .select('is_free, price')
    .eq('id', courseId)
    .maybeSingle();

  return Boolean(course && (course.is_free === true || Number(course.price) === 0));
}

// Generic CRUD proxies for Supabase via Admin Client (strictly role-guarded)
export async function proxyUpsert(table: string, payload: any) {
  const session = await assertProxyAccess(table, payload, 'write');
  let normalizedPayload = payload;
  if (table === 'student_item_progress' && !session.isStaff) {
    if (Array.isArray(payload)) {
      normalizedPayload = payload.map((p: any) => ({ ...p, student_id: session.id }));
    } else if (payload && typeof payload === 'object') {
      normalizedPayload = { ...payload, student_id: session.id };
    }
  }
  const { data, error } = await supabaseAdmin.from(table).upsert(normalizedPayload).select();
  if (error) {
    console.error(`proxyUpsert [${table}] error:`, error);
    throw new Error(error.message);
  }
  return data;
}

export async function proxyInsert(table: string, payload: any) {
  const session = await assertProxyAccess(table, payload, 'write');
  let normalizedPayload = payload;
  if (table === 'student_item_progress' && !session.isStaff) {
    if (Array.isArray(payload)) {
      normalizedPayload = payload.map((p: any) => ({ ...p, student_id: session.id }));
    } else if (payload && typeof payload === 'object') {
      normalizedPayload = { ...payload, student_id: session.id };
    }
  }
  const { data, error } = await supabaseAdmin.from(table).insert(normalizedPayload).select();
  if (error) {
    console.error(`proxyInsert [${table}] error:`, error);
    throw new Error(error.message);
  }
  return data;
}

export async function proxyUpdate(table: string, match: Record<string, any>, payload: any) {
  const session = await assertProxyAccess(table, match, 'write');
  const safeMatch =
    table === 'student_item_progress' && !session.isStaff
      ? { ...match, student_id: session.id }
      : match;
  const { data, error } = await supabaseAdmin.from(table).update(payload).match(safeMatch).select();
  if (error) {
    console.error(`proxyUpdate [${table}] error:`, error);
    throw new Error(error.message);
  }
  return data;
}

export async function proxyDelete(table: string, match: Record<string, any>) {
  const session = await assertProxyAccess(table, match, 'delete');
  if (table === 'course_activation_codes' && !session.isTeacher && match?.id) {
    const { data: codeRow } = await supabaseAdmin
      .from('course_activation_codes')
      .select('course_id')
      .eq('id', match.id)
      .maybeSingle();
    if (!codeRow?.course_id || !canAssistantAccessCoursePerm(session, codeRow.course_id, 'canDeleteCodes')) {
      throw new Error('غير مصرح للمساعد بحذف هذا الكود');
    }
  }
  const safeMatch =
    table === 'student_item_progress' && !session.isStaff
      ? { ...match, student_id: session.id }
      : match;
  const { data, error } = await supabaseAdmin.from(table).delete().match(safeMatch);
  if (error) {
    console.error(`proxyDelete [${table}] error:`, error);
    throw new Error(error.message);
  }
  return data;
}

export async function proxySelect(table: string, match?: Record<string, any>, orderBy?: { column: string; ascending?: boolean }) {
  const session = await assertProxyAccess(table, match, 'select');
  const safeMatch =
    table === 'student_item_progress' && !session.isStaff
      ? { ...(match || {}), student_id: session.id }
      : match;
  let query = supabaseAdmin.from(table).select('*');
  if (safeMatch) {
    query = query.match(safeMatch);
  }
  if (orderBy) {
    query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
  }
  const { data, error } = await query;
  if (error) {
    console.error(`proxySelect [${table}] error:`, error);
    throw new Error(error.message);
  }
  return data || [];
}

// -------------------------------------------------------------
// DEDICATED ROBUST COURSE OPERATIONS (Supabase Single Source of Truth)
// -------------------------------------------------------------

function parseCourseFromRow(row: any): any {
  let description = row.description || '';
  let originalPrice = undefined;
  let hasDiscount = false;
  let enforceUnitProgression = true;
  let enforceItemProgression = true;
  let maxDevices = typeof row.max_devices === 'number' && row.max_devices > 0 ? row.max_devices : 3;

  // Extract meta block if present
  const metaMatch = description.match(/\n\n<!--meta:([\s\S]*?)-->$/);
  if (metaMatch) {
    try {
      const parsed = JSON.parse(metaMatch[1]);
      if (parsed.originalPrice !== undefined) originalPrice = parsed.originalPrice;
      if (parsed.hasDiscount !== undefined) hasDiscount = parsed.hasDiscount;
      if (parsed.enforceUnitProgression !== undefined) enforceUnitProgression = parsed.enforceUnitProgression;
      if (parsed.enforceItemProgression !== undefined) enforceItemProgression = parsed.enforceItemProgression;
      if (parsed.maxDevices !== undefined) {
        const parsedMax = Number(parsed.maxDevices);
        if (!Number.isNaN(parsedMax) && parsedMax >= 1) {
          maxDevices = Math.floor(parsedMax);
        }
      }
      description = description.replace(metaMatch[0], '');
    } catch {
      // ignore
    }
  }

  return {
    id: row.id,
    title: row.title,
    slug: row.slug || row.title.toLowerCase().replace(/\s+/g, '-'),
    description,
    coverImage: (row.cover_image_url && !row.cover_image_url.startsWith('idb://'))
      ? row.cover_image_url
      : 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=800&auto=format&fit=crop&q=80',
    price: Number(row.price) || 0,
    originalPrice,
    hasDiscount,
    isFree: row.is_free ?? (Number(row.price) === 0),
    stage: row.stage || 'high',
    grade: row.grade || 1,
    educationType: row.education_type || 'general',
    isPublished: row.is_published ?? true,
    publishDate: row.publish_date || row.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
    expiryDate: row.expiry_date,
    enforceUnitProgression,
    enforceItemProgression,
    maxDevices,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

export async function fetchCoursesServer(): Promise<any[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('fetchCoursesServer error:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map(parseCourseFromRow);
  } catch (err) {
    console.error('fetchCoursesServer exception:', err);
    return [];
  }
}

export async function saveCourseServer(course: any): Promise<any> {
  const staff = await requireStaffSession();
  if (!staff) {
    throw new Error('غير مصرح بتعديل الكورسات');
  }
  const courseId = course.id && course.id.length === 36 ? course.id : crypto.randomUUID();
  if (!staff.isTeacher && !canAssistantAccessCoursePerm(staff, courseId, 'canEditCourseSettings')) {
    throw new Error('غير مصرح للمساعد بتعديل إعدادات هذا الكورس');
  }

  // Embed extra metadata cleanly into the description field so non-existent columns are avoided
  const parsedMaxDevices = Number(course.maxDevices);
  const resolvedMaxDevices = !Number.isNaN(parsedMaxDevices) && parsedMaxDevices >= 1 ? Math.floor(parsedMaxDevices) : 3;
  const meta = {
    originalPrice: course.originalPrice,
    hasDiscount: course.hasDiscount,
    enforceUnitProgression: course.enforceUnitProgression ?? true,
    enforceItemProgression: course.enforceItemProgression ?? true,
    maxDevices: resolvedMaxDevices,
  };
  const rawDesc = (course.description || '').replace(/\n\n<!--meta:[\s\S]*?-->$/, '');
  const storedDescription = `${rawDesc}\n\n<!--meta:${JSON.stringify(meta)}-->`;

  const payload = {
    id: courseId,
    title: course.title,
    slug: course.slug || course.title.toLowerCase().replace(/\s+/g, '-'),
    description: storedDescription,
    cover_image_url: (course.coverImage && !course.coverImage.startsWith('idb://'))
      ? course.coverImage
      : 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=800&auto=format&fit=crop&q=80',
    price: Number(course.price) || 0,
    is_free: Boolean(course.isFree || Number(course.price) === 0),
    stage: course.stage === 'middle' ? 'middle' : 'high',
    grade: Number(course.grade) || 1,
    education_type: course.educationType === 'azhar' ? 'azhar' : 'general',
    is_published: course.isPublished !== false,
    publish_date: course.publishDate || new Date().toISOString().split('T')[0],
    expiry_date: course.expiryDate || null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from('courses')
    .upsert(payload)
    .select();

  if (error) {
    console.error('saveCourseServer error:', error);
    throw new Error(error.message);
  }

  try {
    await supabaseAdmin.from('audit_logs').insert([{
      actor_id: staff.id,
      actor_name: staff.fullName,
      actor_role: staff.role,
      action_type: 'SAVE_COURSE_SETTINGS',
      target_entity: 'courses',
      target_id: courseId,
      details: { title: course.title, isPublished: payload.is_published },
    }]);
  } catch {}

  return parseCourseFromRow(data[0]);
}

export async function deleteCourseServer(courseId: string): Promise<boolean> {
  const staff = await requireStaffSession();
  if (!staff || !staff.isTeacher) {
    throw new Error('غير مصرح بحذف الكورسات — صلاحية حصرية للمعلم فقط');
  }
  const { error } = await supabaseAdmin
    .from('courses')
    .delete()
    .eq('id', courseId);

  if (error) {
    console.error('deleteCourseServer error:', error);
    throw new Error(error.message);
  }
  return true;
}

// -------------------------------------------------------------
// COURSE UNITS SERVER ACTIONS
// -------------------------------------------------------------
export async function fetchUnitsServer(courseId: string): Promise<any[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('course_units')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('fetchUnitsServer error:', error);
      return [];
    }

    return (data || []).map((u: any) => ({
      id: u.id,
      courseId: u.course_id,
      unitNumber: u.unit_number || u.order_index || 1,
      title: u.title,
      description: u.description || '',
      orderIndex: u.order_index || 1,
      isPublished: u.is_published ?? true,
      createdAt: u.created_at || new Date().toISOString(),
    }));
  } catch (err) {
    console.error('fetchUnitsServer exception:', err);
    return [];
  }
}

export async function saveUnitServer(unit: any): Promise<any> {
  const staff = await requireStaffSession();
  if (!staff) {
    throw new Error('غير مصرح بتعديل الوحدات');
  }
  if (!staff.isTeacher && !canAssistantAccessCoursePerm(staff, unit.courseId, 'canManageUnits')) {
    throw new Error('غير مصرح للمساعد بإدارة الوحدات في هذا الكورس');
  }
  const unitId = unit.id && unit.id.length === 36 ? unit.id : crypto.randomUUID();
  const payload = {
    id: unitId,
    course_id: unit.courseId,
    unit_number: Number(unit.unitNumber) || Number(unit.orderIndex) || 1,
    title: unit.title,
    description: unit.description || null,
    order_index: Number(unit.orderIndex) || 1,
    is_published: unit.isPublished !== false,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from('course_units')
    .upsert(payload)
    .select();

  if (error) {
    console.error('saveUnitServer error:', error);
    throw new Error(error.message);
  }

  try {
    await supabaseAdmin.from('audit_logs').insert([{
      actor_id: staff.id,
      actor_name: staff.fullName,
      actor_role: staff.role,
      action_type: 'SAVE_COURSE_UNIT',
      target_entity: 'course_units',
      target_id: unitId,
      details: { courseId: unit.courseId, title: unit.title },
    }]);
  } catch {}

  const u = data[0];
  return {
    id: u.id,
    courseId: u.course_id,
    unitNumber: u.unit_number,
    title: u.title,
    description: u.description || '',
    orderIndex: u.order_index,
    isPublished: u.is_published,
    createdAt: u.created_at,
  };
}

export async function deleteUnitServer(unitId: string): Promise<boolean> {
  const staff = await requireStaffSession();
  if (!staff) {
    throw new Error('غير مصرح بحذف الوحدات');
  }
  if (!staff.isTeacher) {
    const courseId = await resolveCourseIdForUnit(unitId);
    if (!courseId || !canAssistantAccessCoursePerm(staff, courseId, 'canDeleteContent')) {
      throw new Error('غير مصرح للمساعد بحذف وحدات هذا الكورس');
    }
  }
  const { error } = await supabaseAdmin
    .from('course_units')
    .delete()
    .eq('id', unitId);

  if (error) {
    console.error('deleteUnitServer error:', error);
    throw new Error(error.message);
  }
  return true;
}

// -------------------------------------------------------------
// UNIT ITEMS SERVER ACTIONS
// -------------------------------------------------------------
export async function fetchItemsServer(unitId: string): Promise<any[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('unit_items')
      .select('*')
      .eq('unit_id', unitId)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('fetchItemsServer error:', error);
      return [];
    }

    const rows = data || [];
    const session = await getServerSession();
    const courseId = rows[0]?.course_id;
    const canViewMedia = courseId ? await hasCourseContentAccess(session, courseId) : Boolean(session?.isStaff);

    return rows.map((i: any) => ({
      id: i.id,
      unitId: i.unit_id,
      courseId: i.course_id,
      itemType: i.item_type,
      title: i.title,
      description: i.description || '',
      orderIndex: i.order_index || 1,
      durationMinutes: i.duration_minutes || 0,
      totalMarks: i.total_marks || 100,
      passingScorePercentage: i.passing_score_percentage || 60,
      maxExamAttempts: i.max_exam_attempts !== null && i.max_exam_attempts !== undefined ? Number(i.max_exam_attempts) : 3,
      startDate: i.start_date || undefined,
      endDate: i.end_date || undefined,
      videoSourceType: i.video_source_type || 'internal_secured',
      obfuscatedVideoId: canViewMedia ? (i.obfuscated_video_id || '') : '',
      directVideoUrl: canViewMedia ? (i.direct_video_url || '') : '',
      pdfAttachmentUrl: canViewMedia ? (i.pdf_attachment_url || '') : '',
      isPrerequisiteRequired: i.is_prerequisite_required ?? true,
      createdAt: i.created_at || new Date().toISOString(),
    }));
  } catch (err) {
    console.error('fetchItemsServer exception:', err);
    return [];
  }
}

export async function saveItemServer(item: any): Promise<any> {
  const staff = await requireStaffSession();
  if (!staff) {
    throw new Error('غير مصرح بتعديل عناصر المنهج');
  }
  if (!staff.isTeacher) {
    const permKey = getItemTypePermissionKey(item.itemType);
    const hasPerm = permKey
      ? canAssistantAccessCoursePerm(staff, item.courseId, permKey)
      : canAssistantAccessCoursePerm(staff, item.courseId, 'canTransferContent');
    if (!hasPerm) {
      throw new Error('غير مصرح للمساعد بإضافة أو تعديل هذا النوع من المحتوى');
    }
  }
  const itemId = item.id && item.id.length === 36 ? item.id : crypto.randomUUID();
  const payload: Record<string, any> = {
    id: itemId,
    unit_id: item.unitId,
    course_id: item.courseId,
    item_type: item.itemType,
    title: item.title,
    description: item.description || null,
    order_index: Number(item.orderIndex) || 1,
    duration_minutes: Number(item.durationMinutes) || 0,
    total_marks: Number(item.totalMarks) || 100,
    passing_score_percentage: Number(item.passingScorePercentage) || 60,
    max_exam_attempts: item.maxExamAttempts !== undefined && item.maxExamAttempts !== null && !isNaN(Number(item.maxExamAttempts)) ? Math.max(1, Number(item.maxExamAttempts)) : 3,
    video_source_type: item.videoSourceType || 'internal_secured',
    obfuscated_video_id: item.obfuscatedVideoId || null,
    direct_video_url: (item.directVideoUrl && !item.directVideoUrl.startsWith('idb://')) ? item.directVideoUrl : null,
    pdf_attachment_url: (item.pdfAttachmentUrl && !item.pdfAttachmentUrl.startsWith('idb://')) ? item.pdfAttachmentUrl : null,
    is_prerequisite_required: item.isPrerequisiteRequired !== false,
    updated_at: new Date().toISOString(),
  };
  if (item.startDate !== undefined) payload.start_date = item.startDate || null;
  if (item.endDate !== undefined) payload.end_date = item.endDate || null;

  const { data, error } = await supabaseAdmin
    .from('unit_items')
    .upsert(payload)
    .select();

  if (error) {
    console.error('saveItemServer error:', error);
    throw new Error(error.message);
  }

  try {
    await supabaseAdmin.from('audit_logs').insert([{
      actor_id: staff.id,
      actor_name: staff.fullName,
      actor_role: staff.role,
      action_type: 'SAVE_UNIT_ITEM',
      target_entity: 'unit_items',
      target_id: itemId,
      details: { courseId: item.courseId, itemType: item.itemType, title: item.title },
    }]);
  } catch {}

  const i = data[0];
  return {
    id: i.id,
    unitId: i.unit_id,
    courseId: i.course_id,
    itemType: i.item_type,
    title: i.title,
    description: i.description || '',
    orderIndex: i.order_index,
    durationMinutes: i.duration_minutes,
    totalMarks: i.total_marks,
    passingScorePercentage: i.passing_score_percentage,
    maxExamAttempts: i.max_exam_attempts,
    startDate: i.start_date || undefined,
    endDate: i.end_date || undefined,
    videoSourceType: i.video_source_type,
    obfuscatedVideoId: i.obfuscated_video_id,
    directVideoUrl: i.direct_video_url,
    pdfAttachmentUrl: i.pdf_attachment_url,
    isPrerequisiteRequired: i.is_prerequisite_required,
    createdAt: i.created_at,
  };
}

export async function updateItemMetadataServer(itemId: string, metadata: {
  title?: string;
  description?: string;
  durationMinutes?: number;
  totalMarks?: number;
  passingScorePercentage?: number;
  maxExamAttempts?: number;
  startDate?: string;
  endDate?: string;
  isPrerequisiteRequired?: boolean;
}): Promise<{ success: boolean; item?: any; error?: string }> {
  try {
    const staff = await requireStaffSession();
    if (!staff) {
      return { success: false, error: 'غير مصرح بتحديث بيانات العنصر' };
    }
    if (!staff.isTeacher) {
      const courseId = await resolveCourseIdForItem(itemId);
      const allowed = courseId && canAssistantAccessAnyCoursePerm(staff, courseId, [
        'canEditCourseSettings',
        'canAddExams',
        'canAddHomework',
        'canAddQuestions',
        'canAddVideos',
        'canAddConceptSheets',
        'canAddSummaries',
      ]);
      if (!allowed) {
        return { success: false, error: 'غير مصرح للمساعد بتحديث بيانات هذا المحتوى' };
      }
    }
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (metadata.title !== undefined) updatePayload.title = metadata.title;
    if (metadata.description !== undefined) updatePayload.description = metadata.description;
    if (metadata.durationMinutes !== undefined) updatePayload.duration_minutes = metadata.durationMinutes;
    if (metadata.totalMarks !== undefined) updatePayload.total_marks = metadata.totalMarks;
    if (metadata.passingScorePercentage !== undefined) updatePayload.passing_score_percentage = metadata.passingScorePercentage;
    if (metadata.maxExamAttempts !== undefined) updatePayload.max_exam_attempts = Math.max(1, Number(metadata.maxExamAttempts) || 3);
    if (metadata.startDate !== undefined) updatePayload.start_date = metadata.startDate || null;
    if (metadata.endDate !== undefined) updatePayload.end_date = metadata.endDate || null;
    if (metadata.isPrerequisiteRequired !== undefined) updatePayload.is_prerequisite_required = metadata.isPrerequisiteRequired;

    const { data, error } = await supabaseAdmin
      .from('unit_items')
      .update(updatePayload)
      .eq('id', itemId)
      .select();

    if (error) {
      console.error('updateItemMetadataServer error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, item: data?.[0] };
  } catch (err: any) {
    console.error('updateItemMetadataServer exception:', err);
    return { success: false, error: err?.message || 'فشل تحديث البيانات' };
  }
}

export async function fetchItemByIdServer(itemId: string): Promise<any | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('unit_items')
      .select('*')
      .eq('id', itemId)
      .maybeSingle();

    if (error || !data) {
      if (error) console.warn('fetchItemByIdServer error:', error);
      return null;
    }

    const session = await getServerSession();
    const canViewMedia = await hasCourseContentAccess(session, data.course_id);

    return {
      id: data.id,
      unitId: data.unit_id,
      courseId: data.course_id,
      itemType: data.item_type,
      title: data.title,
      description: data.description || '',
      orderIndex: data.order_index,
      durationMinutes: data.duration_minutes,
      totalMarks: data.total_marks,
      passingScorePercentage: data.passing_score_percentage,
      maxExamAttempts: data.max_exam_attempts !== null && data.max_exam_attempts !== undefined ? Number(data.max_exam_attempts) : 3,
      startDate: data.start_date || undefined,
      endDate: data.end_date || undefined,
      videoSourceType: data.video_source_type,
      obfuscatedVideoId: canViewMedia ? data.obfuscated_video_id : '',
      directVideoUrl: canViewMedia ? data.direct_video_url : '',
      pdfAttachmentUrl: canViewMedia ? data.pdf_attachment_url : '',
      isPrerequisiteRequired: data.is_prerequisite_required,
      createdAt: data.created_at,
    };
  } catch (err) {
    console.warn('fetchItemByIdServer exception:', err);
    return null;
  }
}

export async function deleteItemServer(itemId: string): Promise<boolean> {
  const staff = await requireStaffSession();
  if (!staff) {
    throw new Error('غير مصرح بحذف عناصر المنهج');
  }
  if (!staff.isTeacher) {
    const courseId = await resolveCourseIdForItem(itemId);
    if (!courseId || !canAssistantAccessCoursePerm(staff, courseId, 'canDeleteContent')) {
      throw new Error('غير مصرح للمساعد بحذف محتوى هذا الكورس');
    }
  }
  const { error } = await supabaseAdmin
    .from('unit_items')
    .delete()
    .eq('id', itemId);

  if (error) {
    console.error('deleteItemServer error:', error);
    throw new Error(error.message);
  }
  return true;
}

// -------------------------------------------------------------
// QUIZ QUESTIONS SERVER ACTIONS
// -------------------------------------------------------------
export async function fetchQuestionsServer(itemId: string): Promise<any[]> {
  try {
    const staff = await requireStaffSession();
    if (!staff) {
      return [];
    }
    if (!staff.isTeacher) {
      const courseId = await resolveCourseIdForItem(itemId);
      if (!courseId || !canAssistantAccessCoursePerm(staff, courseId, 'canViewQuestions')) {
        // STRICT SECURITY: Blind Add-Only Mode receives zero existing questions
        return [];
      }
    }
    const { data, error } = await supabaseAdmin
      .from('quiz_questions')
      .select('*')
      .eq('item_id', itemId)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('fetchQuestionsServer error:', error);
      return [];
    }

    return (data || []).map((q: any) => {
      const isOptionsObj = q.options && typeof q.options === 'object' && !Array.isArray(q.options);
      const optionsArray = Array.isArray(q.options) ? q.options : (q.options?.items || []);
      return {
        id: q.id,
        itemId: q.item_id,
        questionText: q.question_text,
        questionImageUrl: q.question_image_url,
        questionType: q.question_type || 'mcq',
        options: optionsArray,
        correctAnswerId: q.correct_answer_id,
        correctAnswerIds: isOptionsObj ? (q.options.correctAnswerIds || (q.correct_answer_id ? [q.correct_answer_id] : [])) : (q.correct_answer_id ? [q.correct_answer_id] : []),
        idealAnswer: isOptionsObj ? (q.options.idealAnswer || q.ideal_answer || '') : (q.ideal_answer || ''),
        wordBankBlanks: isOptionsObj ? (q.options.wordBankBlanks || []) : (q.word_bank_blanks || []),
        wordBankWords: isOptionsObj ? (q.options.wordBankWords || []) : (q.word_bank_words || []),
        hint: isOptionsObj ? (q.options.hint || '') : (q.hint || ''),
        gradingType: q.grading_type || (isOptionsObj ? q.options.gradingType : 'auto'),
        parentId: (isOptionsObj ? q.options?.parentId : null) || q.parent_id || null,
        explanation: q.explanation || '',
        points: Number(q.points) || 1,
        orderIndex: q.order_index || 1,
      };
    });
  } catch (err) {
    console.error('fetchQuestionsServer exception:', err);
    return [];
  }
}

// STRICT SECURITY: Student-facing question fetcher that STRIPS all answers, ideal answers, and explanations
export async function fetchSecuredStudentQuestionsServer(itemId: string): Promise<any[]> {
  try {
    const session = await getServerSession();
    if (!session) return [];

    const { data: itemMeta } = await supabaseAdmin
      .from('unit_items')
      .select('id, course_id, unit_id, item_type, order_index, is_prerequisite_required, start_date, end_date, max_exam_attempts')
      .eq('id', itemId)
      .maybeSingle();

    if (!itemMeta || (itemMeta.item_type !== 'exam' && itemMeta.item_type !== 'homework')) {
      return [];
    }

    if (!session.isStaff) {
      const allowed = await hasCourseContentAccess(session, itemMeta.course_id);
      if (!allowed) return [];

      const accessCheck = await checkStudentItemAccessServer(session.id, itemMeta);
      if (!accessCheck.isAccessible) return [];

      const maxAttempts =
        itemMeta.max_exam_attempts !== null && itemMeta.max_exam_attempts !== undefined
          ? Math.max(1, Number(itemMeta.max_exam_attempts))
          : 3;
      const { data: prog } = await supabaseAdmin
        .from('student_item_progress')
        .select('attempts_count, is_passed')
        .eq('student_id', session.id)
        .eq('item_id', itemId)
        .maybeSingle();

      if (Number(prog?.attempts_count || 0) >= maxAttempts && !prog?.is_passed) {
        return [];
      }
    } else if (!session.isTeacher) {
      if (!canAssistantAccessCoursePerm(session, itemMeta.course_id, 'canViewQuestions')) {
        return [];
      }
    }

    const { data, error } = await supabaseAdmin
      .from('quiz_questions')
      .select('*')
      .eq('item_id', itemId)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('fetchSecuredStudentQuestionsServer error:', error);
      return [];
    }

    return (data || []).map((q: any) => {
      const isOptionsObj = q.options && typeof q.options === 'object' && !Array.isArray(q.options);
      const optionsArray = Array.isArray(q.options) ? q.options : (q.options?.items || []);
      
      // Sanitize word bank blanks: remove correctAnswer
      const rawBlanks = isOptionsObj ? (q.options.wordBankBlanks || []) : (q.word_bank_blanks || []);
      const sanitizedBlanks = (rawBlanks || []).map((b: any) => ({
        blankIndex: b.blankIndex,
        points: b.points,
        // STRICT SECURITY: DO NOT SEND b.correctAnswer TO STUDENT!
      }));

      // STRICT SECURITY: Remove all answer pointers, explanations, and ideal answers
      return {
        id: q.id,
        itemId: q.item_id,
        questionText: q.question_text,
        questionImageUrl: q.question_image_url,
        questionType: q.question_type || 'mcq',
        options: optionsArray.map((opt: any) => ({ id: opt.id, text: opt.text })),
        points: Number(q.points) || 1,
        orderIndex: q.order_index || 1,
        parentId: (isOptionsObj ? q.options?.parentId : null) || q.parent_id || null,
        wordBankWords: isOptionsObj ? q.options.wordBankWords : q.word_bank_words,
        wordBankBlanks: sanitizedBlanks,
        // ZERO ANSWERS IN PAYLOAD:
        correctAnswerId: '',
        correctAnswerIds: [],
        idealAnswer: '',
        explanation: '',
      };
    });
  } catch (err) {
    console.error('fetchSecuredStudentQuestionsServer exception:', err);
    return [];
  }
}

export async function saveQuestionsServer(itemId: string, questions: any[]): Promise<boolean> {
  try {
    const staff = await requireStaffSession();
    if (!staff) {
      return false;
    }
    const courseId = await resolveCourseIdForItem(itemId);
    if (!staff.isTeacher) {
      const canView = courseId && canAssistantAccessCoursePerm(staff, courseId, 'canViewQuestions');
      const canMutate = courseId && canAssistantAccessAnyCoursePerm(staff, courseId, ['canAddQuestions', 'canEditQuestions', 'canDeleteQuestions']);
      if (!canView || !canMutate) {
        return false;
      }
    }
    await supabaseAdmin.from('quiz_questions').delete().eq('item_id', itemId);

    if (!questions || questions.length === 0) return true;

    const rows = questions.map((q: any, idx: number) => {
      const optionsPayload = {
        items: Array.isArray(q.options) ? q.options : (q.options?.items || []),
        correctAnswerIds: q.correctAnswerIds || (q.correctAnswerId ? [q.correctAnswerId] : []),
        wordBankBlanks: q.wordBankBlanks || [],
        wordBankWords: q.wordBankWords || [],
        hint: q.hint || '',
        idealAnswer: q.idealAnswer || '',
        gradingType: q.gradingType || 'auto',
        parentId: q.parentId || null,
      };
      return {
        id: q.id && q.id.length === 36 ? q.id : crypto.randomUUID(),
        item_id: itemId,
        question_text: q.questionText || '',
        question_image_url: q.questionImageUrl || null,
        question_type: q.questionType || 'mcq',
        options: optionsPayload,
        correct_answer_id: q.correctAnswerId || '',
        explanation: q.explanation || null,
        points: Number(q.points) || 1,
        order_index: q.orderIndex || idx + 1,
      };
    });

    const { error } = await supabaseAdmin.from('quiz_questions').insert(rows);
    if (error) {
      console.error('saveQuestionsServer error:', error);
      throw new Error(error.message);
    }

    try {
      await supabaseAdmin.from('audit_logs').insert([{
        actor_id: staff.id,
        actor_name: staff.fullName,
        actor_role: staff.role,
        action_type: 'SAVE_ITEM_QUESTIONS',
        target_entity: 'unit_items',
        target_id: itemId,
        details: { courseId, questionsCount: rows.length },
      }]);
    } catch {}

    return true;
  } catch (err) {
    console.error('saveQuestionsServer exception:', err);
    return false;
  }
}

export async function appendQuestionsServer(
  itemId: string,
  newQuestions: any[]
): Promise<{ success: boolean; insertedCount: number; totalMarks?: number; error?: string }> {
  try {
    const staff = await requireStaffSession();
    if (!staff) {
      return { success: false, insertedCount: 0, error: 'غير مصرح بإضافة الأسئلة' };
    }
    const courseId = await resolveCourseIdForItem(itemId);
    if (!courseId) {
      return { success: false, insertedCount: 0, error: 'تعذر العثور على هذا الامتحان أو الواجب' };
    }
    if (!staff.isTeacher && !canAssistantAccessCoursePerm(staff, courseId, 'canAddQuestions')) {
      return { success: false, insertedCount: 0, error: 'غير مصرح للمساعد بإضافة أسئلة في هذا الكورس' };
    }
    if (!Array.isArray(newQuestions) || newQuestions.length === 0) {
      return { success: false, insertedCount: 0, error: 'لا توجد أسئلة جديدة للحفظ' };
    }

    const { data: existingOrderRows } = await supabaseAdmin
      .from('quiz_questions')
      .select('order_index')
      .eq('item_id', itemId)
      .order('order_index', { ascending: false })
      .limit(1);

    const startOrder = (existingOrderRows?.[0]?.order_index || 0) + 1;

    const rows = newQuestions.map((q: any, idx: number) => {
      const optionsPayload = {
        items: Array.isArray(q.options) ? q.options : (q.options?.items || []),
        correctAnswerIds: q.correctAnswerIds || (q.correctAnswerId ? [q.correctAnswerId] : []),
        wordBankBlanks: q.wordBankBlanks || [],
        wordBankWords: q.wordBankWords || [],
        hint: q.hint || '',
        idealAnswer: q.idealAnswer || '',
        gradingType: q.gradingType || 'auto',
        parentId: q.parentId || null,
      };
      return {
        id: q.id && q.id.length === 36 ? q.id : crypto.randomUUID(),
        item_id: itemId,
        question_text: q.questionText || '',
        question_image_url: q.questionImageUrl || null,
        question_type: q.questionType || 'mcq',
        options: optionsPayload,
        correct_answer_id: q.correctAnswerId || '',
        explanation: q.explanation || null,
        points: Number(q.points) || 1,
        order_index: startOrder + idx,
      };
    });

    const { error } = await supabaseAdmin.from('quiz_questions').insert(rows);
    if (error) {
      return { success: false, insertedCount: 0, error: error.message };
    }

    const { data: allPointRows } = await supabaseAdmin
      .from('quiz_questions')
      .select('points, question_type')
      .eq('item_id', itemId);

    const recomputedTotalMarks = (allPointRows || []).reduce((sum: number, r: any) => {
      if (r.question_type === 'passage') return sum;
      return sum + (Number(r.points) || 1);
    }, 0);

    if (recomputedTotalMarks > 0) {
      await supabaseAdmin
        .from('unit_items')
        .update({ total_marks: recomputedTotalMarks, updated_at: new Date().toISOString() })
        .eq('id', itemId);
    }

    try {
      await supabaseAdmin.from('audit_logs').insert([{
        actor_id: staff.id,
        actor_name: staff.fullName,
        actor_role: staff.role,
        action_type: 'APPEND_QUESTIONS_BLIND_MODE',
        target_entity: 'unit_items',
        target_id: itemId,
        details: { courseId, appendedCount: rows.length, totalMarks: recomputedTotalMarks },
      }]);
    } catch {}

    return { success: true, insertedCount: rows.length, totalMarks: recomputedTotalMarks };
  } catch (err: any) {
    console.error('appendQuestionsServer exception:', err);
    return { success: false, insertedCount: 0, error: err?.message || 'حدث خطأ أثناء حفظ الأسئلة الجديدة' };
  }
}

// -------------------------------------------------------------
// SECURE SERVER-SIDE EXAM SUBMISSION & GRADING
// Completely prevents client-side answer tampering, verifies attempt limit,
// and strictly records the last attempt's score.
// -------------------------------------------------------------
export async function submitAndGradeExamServer(payload: {
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
}): Promise<{
  success: boolean;
  totalPoints: number;
  earnedPoints: number;
  percentage: number;
  isPassed: boolean;
  attemptsCount: number;
  maxExamAttempts: number;
  isExhausted: boolean;
  canRevealModelAnswers?: boolean;
  certificateCode?: string;
  questionResults: Record<string, { earned: number; max: number; isCorrect: boolean }>;
  error?: string;
}> {
  try {
    const session = await getServerSession();
    if (!session) {
      return {
        success: false,
        totalPoints: 0,
        earnedPoints: 0,
        percentage: 0,
        isPassed: false,
        attemptsCount: 0,
        maxExamAttempts: 3,
        isExhausted: false,
        questionResults: {},
        error: 'يجب تسجيل الدخول لتسليم الاختبار',
      };
    }

    const { itemId, answers, isSecurityTerminated } = payload;
    const studentId = session.isStaff ? payload.studentId : session.id;

    if (!itemId || !studentId) {
      return {
        success: false,
        totalPoints: 0,
        earnedPoints: 0,
        percentage: 0,
        isPassed: false,
        attemptsCount: 0,
        maxExamAttempts: 3,
        isExhausted: false,
        questionResults: {},
        error: 'بيانات غير مكتملة',
      };
    }

    // 1. Fetch item configuration authoritatively from DB (NEVER trust client courseId!)
    const { data: itemData, error: itemErr } = await supabaseAdmin
      .from('unit_items')
      .select('id, course_id, unit_id, item_type, order_index, is_prerequisite_required, start_date, end_date, passing_score_percentage, max_exam_attempts, total_marks')
      .eq('id', itemId)
      .maybeSingle();

    if (itemErr || !itemData || (itemData.item_type !== 'exam' && itemData.item_type !== 'homework')) {
      return {
        success: false,
        totalPoints: 0,
        earnedPoints: 0,
        percentage: 0,
        isPassed: false,
        attemptsCount: 0,
        maxExamAttempts: 3,
        isExhausted: false,
        questionResults: {},
        error: 'الاختبار أو الواجب المطلوب غير موجود',
      };
    }

    const canonicalCourseId = itemData.course_id;

    if (!session.isStaff) {
      const enrolled = await hasCourseContentAccess(session, canonicalCourseId);
      if (!enrolled) {
        return {
          success: false,
          totalPoints: 0,
          earnedPoints: 0,
          percentage: 0,
          isPassed: false,
          attemptsCount: 0,
          maxExamAttempts: 3,
          isExhausted: false,
          questionResults: {},
          error: 'غير مصرح بتسليم هذا الاختبار بدون اشتراك مفعل',
        };
      }

      const accessCheck = await checkStudentItemAccessServer(session.id, itemData);
      if (!accessCheck.isAccessible) {
        return {
          success: false,
          totalPoints: 0,
          earnedPoints: 0,
          percentage: 0,
          isPassed: false,
          attemptsCount: 0,
          maxExamAttempts: 3,
          isExhausted: false,
          questionResults: {},
          error: accessCheck.reason || 'هذا التقييم مغلق حالياً أو لم يتم اجتياز المتطلبات السابقة.',
        };
      }
    }

    const passingScorePercentage = itemData?.passing_score_percentage ?? 60;
    const maxExamAttempts = itemData?.max_exam_attempts !== null && itemData?.max_exam_attempts !== undefined
      ? Math.max(1, Number(itemData.max_exam_attempts))
      : 3;

    // 2. Fetch current student progress for this item
    const { data: existingProg } = await supabaseAdmin
      .from('student_item_progress')
      .select('*')
      .eq('student_id', studentId)
      .eq('item_id', itemId)
      .maybeSingle();

    const currentAttempts = Number(existingProg?.attempts_count || 0);

    // If student has already exhausted attempts and did not pass, lock out
    if (currentAttempts >= maxExamAttempts && !existingProg?.is_passed) {
      return {
        success: false,
        totalPoints: 0,
        earnedPoints: 0,
        percentage: existingProg?.last_score || 0,
        isPassed: false,
        attemptsCount: currentAttempts,
        maxExamAttempts,
        isExhausted: true,
        questionResults: {},
        error: `عذراً، لقد استنفدت جميع المحاولات المسموح بها (${maxExamAttempts} محاولات). يرجى مراجعة المعلم أو المساعد لفتح محاولة إضافية.`,
      };
    }

    // For homework items, lock any pre-verified question choice to prevent interactive-oracle tampering
    const lockedHomeworkAnswers: Record<string, any> =
      itemData.item_type === 'homework' &&
      existingProg?.student_answers &&
      typeof existingProg.student_answers === 'object' &&
      existingProg.student_answers.__homeworkChecked &&
      typeof existingProg.student_answers.__homeworkChecked === 'object'
        ? existingProg.student_answers.__homeworkChecked
        : {};

    // 3. Fetch true questions with answers securely from database
    const { data: questionsData, error: qErr } = await supabaseAdmin
      .from('quiz_questions')
      .select('*')
      .eq('item_id', itemId)
      .order('order_index', { ascending: true });

    if (qErr) {
      console.error('submitAndGradeExamServer questions fetch error:', qErr);
      throw new Error('فشل جلب أسئلة الاختبار للتقييم');
    }

    const questions = questionsData || [];
    let totalPoints = 0;
    let earnedPoints = 0;
    const questionResults: Record<
      string,
      {
        earned: number;
        max: number;
        isCorrect: boolean;
        correctAnswerId?: string;
        correctAnswerIds?: string[];
        idealAnswer?: string;
        explanation?: string;
      }
    > = {};

    // If exam was terminated due to a security violation, score is strictly 0
    if (isSecurityTerminated) {
      questions.forEach((q: any) => {
        if (q.question_type === 'passage') return;
        const maxPts = Number(q.points) || 1;
        totalPoints += maxPts;
        questionResults[q.id] = { earned: 0, max: maxPts, isCorrect: false };
      });
      earnedPoints = 0;
    } else {
      // Authoritative server-side evaluation
      questions.forEach((q: any) => {
        if (q.question_type === 'passage') return; // Passages do not carry marks directly

        const maxPts = Number(q.points) || 1;
        totalPoints += maxPts;

        const isOptionsObj = q.options && typeof q.options === 'object' && !Array.isArray(q.options);
        const correctAnswerId = q.correct_answer_id || '';
        const correctAnswerIds: string[] = isOptionsObj
          ? (q.options.correctAnswerIds || (correctAnswerId ? [correctAnswerId] : []))
          : (correctAnswerId ? [correctAnswerId] : []);
        const idealAnswer = isOptionsObj ? (q.options.idealAnswer || q.ideal_answer || '') : (q.ideal_answer || '');
        const wordBankBlanks = isOptionsObj ? (q.options.wordBankBlanks || []) : (q.word_bank_blanks || []);
        const lockedChoice = lockedHomeworkAnswers[q.id];

        if (q.question_type === 'mcq' || q.question_type === 'tf') {
          const chosen = lockedChoice !== undefined ? lockedChoice.chosenAnswer : answers.mcqAnswers?.[q.id];
          const isCorrect = Boolean(chosen && chosen === correctAnswerId);
          const earned = isCorrect ? maxPts : 0;
          earnedPoints += earned;
          questionResults[q.id] = {
            earned,
            max: maxPts,
            isCorrect,
            correctAnswerId,
            correctAnswerIds: [correctAnswerId],
            idealAnswer: '',
            explanation: q.explanation || '',
          };
        } else if (q.question_type === 'multi_select') {
          const rawChosen = lockedChoice !== undefined
            ? (Array.isArray(lockedChoice.chosenAnswer) ? lockedChoice.chosenAnswer : [])
            : (answers.multiSelectAnswers?.[q.id] || []);
          const chosen = rawChosen.slice().sort();
          const expected = correctAnswerIds.slice().sort();
          const isExactMatch =
            chosen.length === expected.length &&
            chosen.every((val: string, idx: number) => val === expected[idx]);

          const correctPicks = chosen.filter((id: string) => expected.includes(id)).length;
          const wrongPicks = chosen.filter((id: string) => !expected.includes(id)).length;
          const totalCount = expected.length || 1;
          let earned = 0;

          if (isExactMatch) {
            earned = maxPts;
          } else if (wrongPicks === 0 && correctPicks > 0) {
            earned = parseFloat(((correctPicks / totalCount) * maxPts).toFixed(2));
          } else if (correctPicks > wrongPicks && expected.length > 0) {
            const net = Math.max(0, correctPicks - wrongPicks);
            earned = parseFloat(((net / totalCount) * maxPts).toFixed(2));
          } else {
            earned = 0;
          }

          earnedPoints += earned;
          questionResults[q.id] = {
            earned,
            max: maxPts,
            isCorrect: isExactMatch,
            correctAnswerId: correctAnswerId || correctAnswerIds[0] || '',
            correctAnswerIds,
            idealAnswer: '',
            explanation: q.explanation || '',
          };
        } else if (q.question_type === 'word_bank') {
          const studentBlanks =
            lockedChoice !== undefined && typeof lockedChoice.chosenAnswer === 'object' && lockedChoice.chosenAnswer !== null
              ? lockedChoice.chosenAnswer
              : (answers.wordBankAnswers?.[q.id] || {});
          let correctCount = 0;

          wordBankBlanks.forEach((b: any) => {
            const studentAns = (studentBlanks[b.blankIndex] || '').trim().toLowerCase();
            const expectedAns = (b.correctAnswer || '').trim().toLowerCase();
            if (studentAns && expectedAns && studentAns === expectedAns) {
              correctCount++;
            }
          });

          const totalBlanks = wordBankBlanks.length || 1;
          const blankPoints = maxPts / totalBlanks;
          const earned = parseFloat((correctCount * blankPoints).toFixed(2));
          earnedPoints += earned;
          questionResults[q.id] = {
            earned,
            max: maxPts,
            isCorrect: totalBlanks > 0 && correctCount === totalBlanks,
            correctAnswerId: '',
            correctAnswerIds: [],
            idealAnswer: wordBankBlanks.map((b: any) => b.correctAnswer).join(', '),
            explanation: q.explanation || '',
          };
        } else {
          // Text / Essay / Rewrite
          const rawAns = lockedChoice !== undefined ? String(lockedChoice.chosenAnswer || '') : (answers.textAnswers?.[q.id] || '');
          const ans = rawAns.trim().toLowerCase();
          const ideal = idealAnswer.trim().toLowerCase();
          const isMatch = Boolean(ideal && ans === ideal);
          const earned = isMatch ? maxPts : 0;
          earnedPoints += earned;
          questionResults[q.id] = {
            earned,
            max: maxPts,
            isCorrect: isMatch,
            correctAnswerId: '',
            correctAnswerIds: [],
            idealAnswer: idealAnswer,
            explanation: q.explanation || '',
          };
        }
      });
    }

    earnedPoints = Math.min(totalPoints, Math.max(0, parseFloat(earnedPoints.toFixed(2))));
    const percentage = totalPoints > 0 ? Math.min(100, Math.max(0, Math.round((earnedPoints / totalPoints) * 100))) : 0;
    const isPassed = percentage >= passingScorePercentage;
    const newAttemptsCount = currentAttempts + 1;
    const isExhausted = newAttemptsCount >= maxExamAttempts && !isPassed;

    // Certificate only minted server-side for EXAMS when passed with >= 80%
    const certificateCode =
      itemData.item_type === 'exam' && isPassed && percentage >= 80
        ? signHonorCertificate({
            studentId,
            courseId: canonicalCourseId,
            itemId,
            percentage,
          })
        : undefined;

    // Strict rule: "تتتاخد درجة الامتحان الأخير، يعني آخر مرة هو دخلها... فبتتتاخد درجة الامتحان الأخير بس"
    const recordPayload = {
      id: existingProg?.id || crypto.randomUUID(),
      student_id: studentId,
      course_id: canonicalCourseId,
      item_id: itemId,
      status: isPassed ? 'completed' : (isExhausted ? 'failed_exhausted' : 'in_progress'),
      attempts_count: newAttemptsCount,
      highest_score: percentage, // strictly set to last attempt score
      last_score: percentage,    // exact last attempt score
      is_passed: isPassed,
      student_answers: answers,
      completed_at: isPassed ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    const { error: upsertErr } = await supabaseAdmin
      .from('student_item_progress')
      .upsert(recordPayload, { onConflict: 'student_id,item_id' });

    if (upsertErr) {
      console.warn('submitAndGradeExamServer upsert error:', upsertErr);
    }

    // SECURITY HARDENING: Never expose exact answer keys unless passed AND (homework OR final attempt used)!
    const canRevealModelAnswers =
      isPassed && (itemData.item_type === 'homework' || newAttemptsCount >= maxExamAttempts);

    const sanitizedQuestionResults = canRevealModelAnswers
      ? questionResults
      : Object.fromEntries(
          Object.entries(questionResults).map(([qId, res]) => [
            qId,
            {
              earned: res.earned,
              max: res.max,
              isCorrect: res.isCorrect,
              correctAnswerId: '',
              correctAnswerIds: [],
              idealAnswer: '',
              explanation: '',
            },
          ])
        );

    return {
      success: true,
      totalPoints,
      earnedPoints,
      percentage,
      isPassed,
      attemptsCount: newAttemptsCount,
      maxExamAttempts,
      isExhausted,
      canRevealModelAnswers,
      certificateCode,
      questionResults: sanitizedQuestionResults,
    };
  } catch (err: any) {
    console.error('submitAndGradeExamServer exception:', err);
    return {
      success: false,
      totalPoints: 0,
      earnedPoints: 0,
      percentage: 0,
      isPassed: false,
      attemptsCount: 0,
      maxExamAttempts: 3,
      isExhausted: false,
      questionResults: {},
      error: err?.message || 'حدث خطأ غير متوقع أثناء تسليم الاختبار',
    };
  }
}

// -------------------------------------------------------------
// SECURE CROSS-DEVICE STUDENT PROGRESS SYNC (SERVER ACTION)
// -------------------------------------------------------------
export async function fetchStudentProgressServer(studentId: string, courseId?: string): Promise<any[]> {
  try {
    if (!studentId) return [];
    const session = await requireStudentOrStaffSession(studentId);
    if (!session) return [];
    const targetStudentId = session.isStaff ? studentId : session.id;

    let query = supabaseAdmin
      .from('student_item_progress')
      .select('*, unit_items(title, max_exam_attempts, item_type)')
      .eq('student_id', targetStudentId);

    if (courseId) {
      query = query.eq('course_id', courseId);
    }

    const { data, error } = await query;
    let rows: any[] = data || [];
    const itemTypeMap = new Map<string, string>();

    if (error) {
      let fallbackQuery = supabaseAdmin
        .from('student_item_progress')
        .select('*')
        .eq('student_id', targetStudentId);
      if (courseId) {
        fallbackQuery = fallbackQuery.eq('course_id', courseId);
      }
      const { data: rawData, error: rawErr } = await fallbackQuery;
      if (rawErr) {
        console.warn('fetchStudentProgressServer fallback warning:', rawErr);
        return [];
      }
      rows = rawData || [];
    }

    const missingTypeIds = rows
      .filter((r) => !r.unit_items?.item_type && r.item_id)
      .map((r) => r.item_id);

    if (missingTypeIds.length > 0) {
      const { data: itemsInfo } = await supabaseAdmin
        .from('unit_items')
        .select('id, item_type')
        .in('id', missingTypeIds);
      (itemsInfo || []).forEach((it: any) => {
        itemTypeMap.set(it.id, it.item_type);
      });
    }

    return rows.map((row: any) => {
      const resolvedItemType = row.unit_items?.item_type || itemTypeMap.get(row.item_id);
      const score = Number(row.last_score ?? row.highest_score ?? 0);
      const eligible = resolvedItemType === 'exam' && row.is_passed === true && score >= 80;
      const certificate_code = eligible
        ? signHonorCertificate({
            studentId: targetStudentId,
            courseId: row.course_id,
            itemId: row.item_id,
            percentage: score,
          })
        : undefined;

      // Strip internal __homeworkChecked cache from student response if present
      let cleanAnswers = row.student_answers;
      if (cleanAnswers && typeof cleanAnswers === 'object' && '__homeworkChecked' in cleanAnswers) {
        const { __homeworkChecked: _omit, ...rest } = cleanAnswers;
        cleanAnswers = rest;
      }

      return {
        ...row,
        student_answers: cleanAnswers,
        certificate_code,
      };
    });
  } catch (err) {
    console.error('fetchStudentProgressServer exception:', err);
    return [];
  }
}

export async function verifyHonorCertificateServer(payload: {
  certificateCode: string;
  studentId: string;
  courseId: string;
  itemId: string;
  percentage: number;
}): Promise<{ valid: boolean }> {
  const session = await getServerSession();
  if (!session) return { valid: false };
  return {
    valid: verifyHonorCertificateCode(payload.certificateCode, {
      studentId: payload.studentId,
      courseId: payload.courseId,
      itemId: payload.itemId,
      percentage: payload.percentage,
    }),
  };
}

// -------------------------------------------------------------
// AUTHORITATIVE ATTEMPTS MANAGEMENT (GRANT EXTRA / FULL RESET)
// -------------------------------------------------------------
export async function grantStudentExtraAttemptsServer(
  studentId: string,
  courseId: string,
  itemId: string,
  extraAttemptsCount: number = 1,
  teacherNote?: string
): Promise<{
  success: boolean;
  message: string;
  attemptsCount: number;
  maxAttempts: number;
  isPassed: boolean;
}> {
  try {
    const staff = await requireStaffSession();
    if (!staff) {
      return {
        success: false,
        message: 'غير مصرح بهذه العملية الإدارية',
        attemptsCount: 0,
        maxAttempts: 3,
        isPassed: false,
      };
    }
    if (!staff.isTeacher && !canAssistantAccessCoursePerm(staff, courseId, 'canGrantExtraAttempts')) {
      return {
        success: false,
        message: 'غير مصرح للمساعد بمنح محاولات إضافية في هذا الكورس',
        attemptsCount: 0,
        maxAttempts: 3,
        isPassed: false,
      };
    }
    if (!studentId || !courseId || !itemId) {
      return {
        success: false,
        message: 'بيانات غير مكتملة',
        attemptsCount: 0,
        maxAttempts: 3,
        isPassed: false,
      };
    }

    // 1. Fetch item max attempts & title
    const { data: itemData } = await supabaseAdmin
      .from('unit_items')
      .select('id, title, max_exam_attempts, item_type')
      .eq('id', itemId)
      .maybeSingle();

    const maxAttempts = itemData?.max_exam_attempts !== null && itemData?.max_exam_attempts !== undefined
      ? Math.max(1, Number(itemData.max_exam_attempts))
      : 3;

    // 2. Fetch existing student progress
    const { data: existingProg } = await supabaseAdmin
      .from('student_item_progress')
      .select('*')
      .eq('student_id', studentId)
      .eq('item_id', itemId)
      .maybeSingle();

    const currentAttempts = Number(existingProg?.attempts_count || 0);

    // Calculate new attempts count: ensure the student has room for `extraAttemptsCount` attempts
    let newAttemptsCount = 0;
    if (currentAttempts >= maxAttempts) {
      newAttemptsCount = Math.max(0, maxAttempts - extraAttemptsCount);
    } else {
      newAttemptsCount = Math.max(0, currentAttempts - extraAttemptsCount);
    }

    const recordPayload = {
      id: existingProg?.id || crypto.randomUUID(),
      student_id: studentId,
      course_id: courseId,
      item_id: itemId,
      status: 'in_progress',
      attempts_count: newAttemptsCount,
      highest_score: 0, // Reset so only the new retake score is evaluated
      last_score: 0,
      is_passed: false,
      student_answers: null,
      completed_at: null,
      updated_at: new Date().toISOString(),
    };

    const { error: upsertErr } = await supabaseAdmin
      .from('student_item_progress')
      .upsert(recordPayload, { onConflict: 'student_id,item_id' });

    if (upsertErr) {
      console.error('grantStudentExtraAttemptsServer upsert error:', upsertErr);
      return {
        success: false,
        message: `فشل تسجيل منح المحاولة في قاعدة البيانات: ${upsertErr.message}`,
        attemptsCount: currentAttempts,
        maxAttempts,
        isPassed: false,
      };
    }

    // Audit log
    try {
      await supabaseAdmin.from('audit_logs').insert({
        id: crypto.randomUUID(),
        actor_name: staff.fullName,
        actor_role: staff.role,
        action_type: 'grant_extra_attempt',
        target_entity: 'student_item_progress',
        target_id: recordPayload.id,
        details: {
          studentId,
          courseId,
          itemId,
          itemTitle: itemData?.title || '',
          extraAttemptsCount,
          newAttemptsCount,
          maxAttempts,
          teacherNote: teacherNote || 'منح فرصة إضافية استثنائية من المعلم',
          grantedAt: new Date().toISOString(),
        },
      });
    } catch (auditErr) {
      console.warn('Audit log write non-fatal error:', auditErr);
    }

    return {
      success: true,
      message: `تم منح الطالب فرصة إضافية بنجاح! تم فتح الاختبار وأصبحت المحاولات المستهلكة (${newAttemptsCount} من ${maxAttempts}).`,
      attemptsCount: newAttemptsCount,
      maxAttempts,
      isPassed: false,
    };
  } catch (err: any) {
    console.error('grantStudentExtraAttemptsServer exception:', err);
    return {
      success: false,
      message: err?.message || 'حدث خطأ غير متوقع أثناء معالجة الطلب على السيرفر',
      attemptsCount: 0,
      maxAttempts: 3,
      isPassed: false,
    };
  }
}

export async function resetStudentItemProgressServer(
  studentId: string,
  courseId: string,
  itemId: string,
  teacherNote?: string
): Promise<{
  success: boolean;
  message: string;
  attemptsCount: number;
  isPassed: boolean;
}> {
  try {
    const staff = await requireStaffSession();
    if (!staff) {
      return {
        success: false,
        message: 'غير مصرح بهذه العملية الإدارية',
        attemptsCount: 0,
        isPassed: false,
      };
    }
    if (!staff.isTeacher && !canAssistantAccessCoursePerm(staff, courseId, 'canGrantExtraAttempts')) {
      return {
        success: false,
        message: 'غير مصرح للمساعد بتصفير درجات الطلاب في هذا الكورس',
        attemptsCount: 0,
        isPassed: false,
      };
    }
    if (!studentId || !courseId || !itemId) {
      return {
        success: false,
        message: 'بيانات غير مكتملة',
        attemptsCount: 0,
        isPassed: false,
      };
    }

    // 1. Fetch item title
    const { data: itemData } = await supabaseAdmin
      .from('unit_items')
      .select('id, title, item_type')
      .eq('id', itemId)
      .maybeSingle();

    // 2. Fetch existing progress
    const { data: existingProg } = await supabaseAdmin
      .from('student_item_progress')
      .select('*')
      .eq('student_id', studentId)
      .eq('item_id', itemId)
      .maybeSingle();

    const recordPayload = {
      id: existingProg?.id || crypto.randomUUID(),
      student_id: studentId,
      course_id: courseId,
      item_id: itemId,
      status: 'in_progress',
      attempts_count: 0,
      highest_score: 0,
      last_score: 0,
      is_passed: false,
      student_answers: null,
      completed_at: null,
      updated_at: new Date().toISOString(),
    };

    const { error: upsertErr } = await supabaseAdmin
      .from('student_item_progress')
      .upsert(recordPayload, { onConflict: 'student_id,item_id' });

    if (upsertErr) {
      console.error('resetStudentItemProgressServer upsert error:', upsertErr);
      return {
        success: false,
        message: `فشل إعادة التعيين في السيرفر: ${upsertErr.message}`,
        attemptsCount: 0,
        isPassed: false,
      };
    }

    // Audit log
    try {
      await supabaseAdmin.from('audit_logs').insert({
        id: crypto.randomUUID(),
        actor_name: staff.fullName,
        actor_role: staff.role,
        action_type: 'reset_exam_progress',
        target_entity: 'student_item_progress',
        target_id: recordPayload.id,
        details: {
          studentId,
          courseId,
          itemId,
          itemTitle: itemData?.title || '',
          teacherNote: teacherNote || 'إعادة تعيين شاملة وتصفير لكافة المحاولات والدرجات السابقة',
          resetAt: new Date().toISOString(),
        },
      });
    } catch (auditErr) {
      console.warn('Audit log write non-fatal error:', auditErr);
    }

    return {
      success: true,
      message: 'تم تصفير وإعادة تعيين كافة المحاولات والدرجات للاختبار بنجاح (0 محاولات مستهلكة).',
      attemptsCount: 0,
      isPassed: false,
    };
  } catch (err: any) {
    console.error('resetStudentItemProgressServer exception:', err);
    return {
      success: false,
      message: err?.message || 'حدث خطأ غير متوقع أثناء إعادة التعيين على السيرفر',
      attemptsCount: 0,
      isPassed: false,
    };
  }
}

// Single question validation for interactive homework practice
export async function verifyHomeworkQuestionAnswerServer(payload: {
  itemId: string;
  questionId: string;
  chosenAnswer: any;
}): Promise<{
  success: boolean;
  isCorrect: boolean;
  isPartial?: boolean;
  earnedPoints: number;
  maxPoints: number;
  explanation?: string;
}> {
  try {
    const session = await getServerSession();
    if (!session) {
      return { success: false, isCorrect: false, earnedPoints: 0, maxPoints: 1 };
    }

    const { itemId, questionId, chosenAnswer } = payload;

    const { data: itemMeta } = await supabaseAdmin
      .from('unit_items')
      .select('id, course_id, unit_id, item_type, order_index, is_prerequisite_required, start_date, end_date')
      .eq('id', itemId)
      .maybeSingle();

    // STRICT ANTI-ORACLE INVARIANT: Interactive answer verification is ONLY allowed for HOMEWORK, NEVER for EXAMS!
    if (!itemMeta || itemMeta.item_type !== 'homework') {
      return { success: false, isCorrect: false, earnedPoints: 0, maxPoints: 1 };
    }

    let existingProg: any = null;
    if (!session.isStaff) {
      const allowed = await hasCourseContentAccess(session, itemMeta.course_id);
      if (!allowed) {
        return { success: false, isCorrect: false, earnedPoints: 0, maxPoints: 1 };
      }
      const accessCheck = await checkStudentItemAccessServer(session.id, itemMeta);
      if (!accessCheck.isAccessible) {
        return { success: false, isCorrect: false, earnedPoints: 0, maxPoints: 1 };
      }

      const { data: progRow } = await supabaseAdmin
        .from('student_item_progress')
        .select('*')
        .eq('student_id', session.id)
        .eq('item_id', itemId)
        .maybeSingle();
      existingProg = progRow;

      // Single-check lock: if this student already verified this homework question, return the locked verdict
      const lockedVerdict = existingProg?.student_answers?.__homeworkChecked?.[questionId];
      if (lockedVerdict) {
        return {
          success: true,
          isCorrect: Boolean(lockedVerdict.isCorrect),
          isPartial: Boolean(lockedVerdict.isPartial),
          earnedPoints: Number(lockedVerdict.earnedPoints) || 0,
          maxPoints: Number(lockedVerdict.maxPoints) || 1,
          explanation: lockedVerdict.explanation,
        };
      }
    }

    const { data: q, error } = await supabaseAdmin
      .from('quiz_questions')
      .select('*')
      .eq('item_id', itemId)
      .eq('id', questionId)
      .maybeSingle();

    if (error || !q) {
      return { success: false, isCorrect: false, earnedPoints: 0, maxPoints: 1 };
    }

    const maxPts = Number(q.points) || 1;
    const isOptionsObj = q.options && typeof q.options === 'object' && !Array.isArray(q.options);
    const correctAnswerId = q.correct_answer_id || '';
    const explanation = q.explanation || '';

    let verdict: {
      success: boolean;
      isCorrect: boolean;
      isPartial?: boolean;
      earnedPoints: number;
      maxPoints: number;
      explanation?: string;
    };

    if (q.question_type === 'mcq' || q.question_type === 'tf') {
      const isCorrect = chosenAnswer === correctAnswerId;
      verdict = {
        success: true,
        isCorrect,
        earnedPoints: isCorrect ? maxPts : 0,
        maxPoints: maxPts,
        explanation: isCorrect ? explanation : undefined,
      };
    } else if (q.question_type === 'multi_select') {
      const correctAnswerIds: string[] = isOptionsObj
        ? (q.options.correctAnswerIds || (correctAnswerId ? [correctAnswerId] : []))
        : (correctAnswerId ? [correctAnswerId] : []);
      const chosen: string[] = (Array.isArray(chosenAnswer) ? chosenAnswer : []).slice().sort();
      const expected = correctAnswerIds.slice().sort();
      const isExactMatch =
        chosen.length === expected.length &&
        chosen.every((val, idx) => val === expected[idx]);

      const correctPicks = chosen.filter((id) => expected.includes(id)).length;
      const wrongPicks = chosen.filter((id) => !expected.includes(id)).length;
      const totalCount = expected.length || 1;
      let earned = 0;

      if (isExactMatch) {
        earned = maxPts;
      } else if (wrongPicks === 0 && correctPicks > 0) {
        earned = parseFloat(((correctPicks / totalCount) * maxPts).toFixed(2));
      } else if (correctPicks > wrongPicks && expected.length > 0) {
        const net = Math.max(0, correctPicks - wrongPicks);
        earned = parseFloat(((net / totalCount) * maxPts).toFixed(2));
      }

      verdict = {
        success: true,
        isCorrect: isExactMatch,
        isPartial: !isExactMatch && earned > 0,
        earnedPoints: earned,
        maxPoints: maxPts,
        explanation: isExactMatch ? explanation : undefined,
      };
    } else if (q.question_type === 'word_bank') {
      const wordBankBlanks = isOptionsObj ? (q.options.wordBankBlanks || []) : (q.word_bank_blanks || []);
      const studentBlanks = typeof chosenAnswer === 'object' && chosenAnswer !== null ? chosenAnswer : {};
      let correctCount = 0;

      wordBankBlanks.forEach((b: any) => {
        const studentAns = (studentBlanks[b.blankIndex] || '').trim().toLowerCase();
        const expectedAns = (b.correctAnswer || '').trim().toLowerCase();
        if (studentAns && expectedAns && studentAns === expectedAns) {
          correctCount++;
        }
      });

      const totalBlanks = wordBankBlanks.length || 1;
      const blankPoints = maxPts / totalBlanks;
      const earned = parseFloat((correctCount * blankPoints).toFixed(2));
      const isExact = totalBlanks > 0 && correctCount === totalBlanks;

      verdict = {
        success: true,
        isCorrect: isExact,
        isPartial: !isExact && earned > 0,
        earnedPoints: earned,
        maxPoints: maxPts,
        explanation: isExact ? explanation : undefined,
      };
    } else {
      // Text / Essay
      const idealAnswer = isOptionsObj ? (q.options.idealAnswer || q.ideal_answer || '') : (q.ideal_answer || '');
      const isTextMatch = Boolean(idealAnswer && String(chosenAnswer).trim().toLowerCase() === idealAnswer.trim().toLowerCase());
      verdict = {
        success: true,
        isCorrect: isTextMatch,
        earnedPoints: isTextMatch ? maxPts : 0,
        maxPoints: maxPts,
        explanation: isTextMatch ? explanation : undefined,
      };
    }

    // Persist locked first check for students so this question cannot be probed repeatedly
    if (!session.isStaff && !existingProg?.is_passed) {
      const prevAnswers =
        existingProg?.student_answers && typeof existingProg.student_answers === 'object'
          ? existingProg.student_answers
          : {};
      const prevChecked =
        prevAnswers.__homeworkChecked && typeof prevAnswers.__homeworkChecked === 'object'
          ? prevAnswers.__homeworkChecked
          : {};

      const nextAnswers = {
        ...prevAnswers,
        __homeworkChecked: {
          ...prevChecked,
          [questionId]: {
            chosenAnswer,
            isCorrect: verdict.isCorrect,
            isPartial: Boolean(verdict.isPartial),
            earnedPoints: verdict.earnedPoints,
            maxPoints: verdict.maxPoints,
            explanation: verdict.explanation || '',
          },
        },
      };

      await supabaseAdmin.from('student_item_progress').upsert(
        {
          id: existingProg?.id || crypto.randomUUID(),
          student_id: session.id,
          course_id: itemMeta.course_id,
          item_id: itemId,
          status: existingProg?.status || 'in_progress',
          attempts_count: Number(existingProg?.attempts_count || 0),
          highest_score: Number(existingProg?.highest_score || 0),
          last_score: Number(existingProg?.last_score || 0),
          is_passed: Boolean(existingProg?.is_passed),
          student_answers: nextAnswers,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'student_id,item_id' }
      );
    }

    return verdict;
  } catch (err) {
    console.error('verifyHomeworkQuestionAnswerServer exception:', err);
    return { success: false, isCorrect: false, earnedPoints: 0, maxPoints: 1 };
  }
}

// -------------------------------------------------------------
// ACTIVATION CODES SERVER ACTIONS
// -------------------------------------------------------------
export async function fetchCodesServer(courseId?: string): Promise<any[]> {
  try {
    const staff = await requireStaffSession();
    if (!staff) return [];

    if (!staff.isTeacher) {
      if (courseId) {
        if (!canAssistantAccessAnyCoursePerm(staff, courseId, ['canGenerateCodes', 'canViewCourseStudents'])) {
          return [];
        }
      } else if (!staff.assistantMatrix?.canManageAllCourses) {
        const allowedCourses = (staff.assistantMatrix?.assignedCourseIds || []).filter((cid) =>
          canAssistantAccessAnyCoursePerm(staff, cid, ['canGenerateCodes', 'canViewCourseStudents'])
        );
        if (allowedCourses.length === 0) return [];
        const { data, error } = await supabaseAdmin
          .from('course_activation_codes')
          .select('*')
          .in('course_id', allowedCourses)
          .order('created_at', { ascending: false });
        if (error) return [];
        return (data || []).map((c: any) => ({
          id: c.id,
          courseId: c.course_id,
          code: c.code,
          batchName: c.batch_name || '',
          isUsed: Boolean(c.is_used),
          usedByStudentId: c.used_by_student_id,
          usedAt: c.used_at,
          createdAt: c.created_at,
        }));
      }
    }

    let query = supabaseAdmin.from('course_activation_codes').select('*').order('created_at', { ascending: false });
    if (courseId) {
      query = query.eq('course_id', courseId);
    }
    const { data, error } = await query;
    if (error) {
      console.error('fetchCodesServer error:', error);
      return [];
    }
    return (data || []).map((c: any) => ({
      id: c.id,
      courseId: c.course_id,
      code: c.code,
      batchName: c.batch_name || '',
      isUsed: Boolean(c.is_used),
      usedByStudentId: c.used_by_student_id,
      usedAt: c.used_at,
      createdAt: c.created_at,
    }));
  } catch (err) {
    console.error('fetchCodesServer exception:', err);
    return [];
  }
}

export async function insertCodesServer(codes: any[]): Promise<boolean> {
  try {
    const staff = await requireStaffSession();
    if (!staff) return false;
    if (!codes || codes.length === 0) return true;

    if (!staff.isTeacher) {
      for (const c of codes) {
        if (!c?.courseId || !canAssistantAccessCoursePerm(staff, c.courseId, 'canGenerateCodes')) {
          return false;
        }
      }
    }

    const rows = codes.map((c: any) => ({
      id: c.id && c.id.length === 36 ? c.id : crypto.randomUUID(),
      course_id: c.courseId,
      code: c.code,
      batch_name: c.batchName || c.assignedStudentName || null,
      is_used: Boolean(c.isUsed),
      used_by_student_id: c.usedByStudentId || null,
      used_at: c.usedAt || null,
    }));
    const { error } = await supabaseAdmin.from('course_activation_codes').insert(rows);
    if (error) {
      console.error('insertCodesServer error:', error);
      throw new Error(error.message);
    }
    return true;
  } catch (err) {
    console.error('insertCodesServer exception:', err);
    return false;
  }
}

export async function deleteActivationCodeServer(codeId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const staff = await requireStaffSession();
    if (!staff) return { success: false, error: 'غير مصرح بحذف أكواد التفعيل' };

    const { data: codeRow } = await supabaseAdmin
      .from('course_activation_codes')
      .select('id, course_id, code')
      .eq('id', codeId)
      .maybeSingle();

    if (!codeRow) return { success: true };

    if (!staff.isTeacher && !canAssistantAccessCoursePerm(staff, codeRow.course_id, 'canDeleteCodes')) {
      return { success: false, error: 'غير مصرح للمساعد بحذف أكواد هذا الكورس' };
    }

    const { error } = await supabaseAdmin
      .from('course_activation_codes')
      .delete()
      .eq('id', codeId);

    if (error) return { success: false, error: error.message };

    try {
      await supabaseAdmin.from('audit_logs').insert([{
        actor_id: staff.id,
        actor_name: staff.fullName,
        actor_role: staff.role,
        action_type: 'DELETE_ACTIVATION_CODE',
        target_entity: 'course_activation_codes',
        target_id: codeId,
        details: { courseId: codeRow.course_id, code: codeRow.code },
      }]);
    } catch {}

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'فشل حذف الكود' };
  }
}

export async function markCodeUsedServer(codeId: string, studentId: string, nowIso: string): Promise<boolean> {
  try {
    const staff = await requireStaffSession();
    if (!staff) return false;

    const { error } = await supabaseAdmin
      .from('course_activation_codes')
      .update({
        is_used: true,
        used_by_student_id: studentId,
        used_at: nowIso,
      })
      .eq('id', codeId);
    if (error) console.error('markCodeUsedServer error:', error);
    return !error;
  } catch (err) {
    console.error('markCodeUsedServer exception:', err);
    return false;
  }
}

// -------------------------------------------------------------
// ENROLLMENT & WALLET SERVER ACTIONS
// -------------------------------------------------------------
export async function fetchStudentEnrollmentsServer(studentId: string): Promise<string[]> {
  try {
    const session = await requireStudentOrStaffSession(studentId);
    if (!session) return [];
    const targetStudentId = session.isStaff ? studentId : session.id;

    const { data, error } = await supabaseAdmin
      .from('course_enrollments')
      .select('course_id')
      .eq('student_id', targetStudentId)
      .eq('is_active', true);

    if (error) {
      console.error('fetchStudentEnrollmentsServer error:', error);
      return [];
    }

    return (data || []).map((d: any) => d.course_id).filter(Boolean);
  } catch (err) {
    console.error('fetchStudentEnrollmentsServer exception:', err);
    return [];
  }
}

export async function saveEnrollmentServer(enrollment: any, walletTx?: any): Promise<boolean> {
  try {
    const session = await requireStudentOrStaffSession(enrollment?.studentId);
    if (!session) return false;

    const targetStudentId = session.isStaff ? enrollment.studentId : session.id;
    const courseId = enrollment?.courseId;
    if (!targetStudentId || !courseId) return false;

    // Students may only self-enroll directly into explicitly FREE courses; paid courses require activation code or staff
    if (!session.isStaff) {
      const { data: courseRow } = await supabaseAdmin
        .from('courses')
        .select('is_free, price')
        .eq('id', courseId)
        .maybeSingle();

      if (!courseRow || !(courseRow.is_free === true || Number(courseRow.price) === 0)) {
        return false;
      }
    }

    const enrollmentRow = {
      id: enrollment.id && enrollment.id.length === 36 ? enrollment.id : crypto.randomUUID(),
      student_id: targetStudentId,
      course_id: courseId,
      payment_method: session.isStaff ? (enrollment.paymentMethod || 'activation_code') : 'free',
      amount_paid: session.isStaff ? (Number(enrollment.amountPaid) || 0) : 0,
      is_active: true,
      enrolled_at: enrollment.enrolledAt || new Date().toISOString(),
    };

    await supabaseAdmin.from('course_enrollments').upsert(enrollmentRow);

    if (walletTx && session.isStaff) {
      const txRow = {
        id: walletTx.id && walletTx.id.length === 36 ? walletTx.id : crypto.randomUUID(),
        student_id: targetStudentId,
        amount: Number(walletTx.amount) || 0,
        transaction_type: walletTx.transactionType || 'course_purchase',
        fawry_reference_number: walletTx.fawryReference || null,
        status: 'completed',
        notes: walletTx.notes || null,
      };
      await supabaseAdmin.from('wallet_transactions').insert(txRow);
    }
    return true;
  } catch (err) {
    console.error('saveEnrollmentServer exception:', err);
    return false;
  }
}

// -------------------------------------------------------------
// AUTO-MIGRATION / SYNC SERVER ACTION
// Preserves any existing local courses and publishes them to Supabase
// -------------------------------------------------------------
export async function syncLocalCoursesServer(localCourses: any[]): Promise<any[]> {
  try {
    const staff = await requireStaffSession();
    if (!staff) {
      return await fetchCoursesServer();
    }
    if (!localCourses || localCourses.length === 0) {
      return await fetchCoursesServer();
    }

    const { data: existingRemote } = await supabaseAdmin.from('courses').select('id');
    const existingIds = new Set((existingRemote || []).map((r: any) => r.id));

    // Upload courses that do not yet exist in Supabase
    for (const c of localCourses) {
      if (!c.id || !existingIds.has(c.id)) {
        await saveCourseServer(c);
      }
    }

    return await fetchCoursesServer();
  } catch (err) {
    console.error('syncLocalCoursesServer exception:', err);
    return [];
  }
}

export async function fetchCourseEnrolledStudentsDataServer(courseId: string) {
  try {
    const staff = await requireStaffSession();
    if (!staff) {
      return { success: false, enrollments: [], progress: [], deviceCountsByStudent: {} as Record<string, number> };
    }
    if (!staff.isTeacher && !canAssistantAccessAnyCoursePerm(staff, courseId, ['canViewCourseStudents', 'canGrantExtraAttempts'])) {
      return { success: false, enrollments: [], progress: [], deviceCountsByStudent: {} as Record<string, number> };
    }
    const { data: dbEnrollments } = await supabaseAdmin
      .from('course_enrollments')
      .select('*, profiles(id, full_name, phone, parent_phone, avatar_url, role)')
      .eq('course_id', courseId)
      .eq('is_active', true)
      .order('enrolled_at', { ascending: false });

    const { data: progressData } = await supabaseAdmin
      .from('student_item_progress')
      .select('id, student_id, course_id, item_id, attempts_count, status, highest_score, last_score, is_passed, completed_at, updated_at, unit_items(id, title, max_exam_attempts, item_type, total_marks, passing_score_percentage)')
      .eq('course_id', courseId);

    const deviceCountsByStudent: Record<string, number> = {};
    try {
      const { data: bindingLogs } = await supabaseAdmin
        .from('audit_logs')
        .select('actor_id, details')
        .eq('target_entity', 'course_device_bindings')
        .eq('target_id', courseId)
        .limit(1000);

      (bindingLogs || []).forEach((log: any) => {
        const sid = log.actor_id || log.details?.studentId;
        const devs = Array.isArray(log.details?.devices) ? log.details.devices : [];
        if (sid) {
          deviceCountsByStudent[sid] = devs.length;
        }
      });
    } catch {}

    return {
      success: true,
      enrollments: dbEnrollments || [],
      progress: progressData || [],
      deviceCountsByStudent,
    };
  } catch (err: any) {
    console.error('fetchCourseEnrolledStudentsDataServer exception:', err);
    return {
      success: false,
      enrollments: [],
      progress: [],
      deviceCountsByStudent: {} as Record<string, number>,
    };
  }
}

// -------------------------------------------------------------
// ATOMIC ASSESSMENT CONVERSION, INDEPENDENT CLONING & CROSS-COURSE EXPORT
// -------------------------------------------------------------

function mapUnitItemRow(i: any) {
  return {
    id: i.id,
    unitId: i.unit_id,
    courseId: i.course_id,
    itemType: i.item_type,
    title: i.title,
    description: i.description || '',
    orderIndex: i.order_index || 1,
    durationMinutes: i.duration_minutes || 0,
    totalMarks: i.total_marks || 100,
    passingScorePercentage: i.passing_score_percentage || 60,
    maxExamAttempts: i.max_exam_attempts !== null && i.max_exam_attempts !== undefined ? Number(i.max_exam_attempts) : 3,
    startDate: i.start_date || undefined,
    endDate: i.end_date || undefined,
    videoSourceType: i.video_source_type || 'internal_secured',
    obfuscatedVideoId: i.obfuscated_video_id || '',
    directVideoUrl: i.direct_video_url || '',
    pdfAttachmentUrl: i.pdf_attachment_url || '',
    isPrerequisiteRequired: i.is_prerequisite_required ?? true,
    createdAt: i.created_at || new Date().toISOString(),
  };
}

async function deepCloneQuestionsOnServer(sourceItemId: string, targetItemId: string): Promise<{ questionsCount: number; totalMarks: number }> {
  const { data: sourceQuestions, error: qFetchErr } = await supabaseAdmin
    .from('quiz_questions')
    .select('*')
    .eq('item_id', sourceItemId)
    .order('order_index', { ascending: true });

  if (qFetchErr) {
    throw new Error(`فشل قراءة أسئلة المصدر للنسخ: ${qFetchErr.message}`);
  }

  const list = sourceQuestions || [];
  if (list.length === 0) {
    return { questionsCount: 0, totalMarks: 0 };
  }

  const idMap = new Map<string, string>();
  list.forEach((q: any) => {
    idMap.set(q.id, crypto.randomUUID());
  });

  let totalMarks = 0;
  const clonedRows = list.map((q: any, idx: number) => {
    const newId = idMap.get(q.id) || crypto.randomUUID();
    const clonedOptions = q.options ? JSON.parse(JSON.stringify(q.options)) : {};
    if (clonedOptions && typeof clonedOptions === 'object' && !Array.isArray(clonedOptions)) {
      if (clonedOptions.parentId && idMap.has(clonedOptions.parentId)) {
        clonedOptions.parentId = idMap.get(clonedOptions.parentId);
      } else if (clonedOptions.parentId) {
        clonedOptions.parentId = null;
      }
    }

    if (q.question_type !== 'passage') {
      totalMarks += Number(q.points) || 1;
    }

    return {
      id: newId,
      item_id: targetItemId,
      question_text: q.question_text || '',
      question_image_url: q.question_image_url || null,
      question_type: q.question_type || 'mcq',
      options: clonedOptions,
      correct_answer_id: q.correct_answer_id || '',
      explanation: q.explanation || null,
      points: Number(q.points) || 1,
      order_index: q.order_index || idx + 1,
    };
  });

  const { error: insertErr } = await supabaseAdmin.from('quiz_questions').insert(clonedRows);
  if (insertErr) {
    throw new Error(`فشل نسخ الأسئلة للعنصر الجديد: ${insertErr.message}`);
  }

  return { questionsCount: clonedRows.length, totalMarks };
}

export async function convertOrCloneAssessmentServer(payload: {
  sourceItemId: string;
  targetType: 'exam' | 'homework';
  mode: 'convert_in_place' | 'keep_copy';
  newTitle?: string;
  targetCourseId?: string;
  targetUnitId?: string;
}): Promise<{
  success: boolean;
  item?: any;
  questionsCount?: number;
  mode?: 'convert_in_place' | 'keep_copy';
  error?: string;
}> {
  try {
    const staff = await requireStaffSession();
    if (!staff) {
      return { success: false, error: 'غير مصرح بهذه العملية الإدارية' };
    }

    const { sourceItemId, targetType, mode, newTitle, targetCourseId, targetUnitId } = payload;
    if (!sourceItemId || (targetType !== 'exam' && targetType !== 'homework') || (mode !== 'convert_in_place' && mode !== 'keep_copy')) {
      return { success: false, error: 'بيانات التحويل أو النسخ غير صالحة' };
    }

    const { data: sourceItem, error: srcErr } = await supabaseAdmin
      .from('unit_items')
      .select('*')
      .eq('id', sourceItemId)
      .maybeSingle();

    if (srcErr || !sourceItem) {
      return { success: false, error: 'لم يتم العثور على الامتحان أو الواجب المطلوب' };
    }

    if (sourceItem.item_type !== 'exam' && sourceItem.item_type !== 'homework') {
      return { success: false, error: 'التحويل الثنائي متاح فقط للامتحانات والواجبات' };
    }

    if (!staff.isTeacher && !canAssistantAccessCoursePerm(staff, sourceItem.course_id, 'canConvertAssessments')) {
      return {
        success: false,
        error: 'غير مصرح للمساعد بتحويل الامتحانات والواجبات ذهاباً وإياباً. يرجى مراجعة المعلم لمنح الصلاحية.',
      };
    }

    const resolvedTargetCourseId = targetCourseId || sourceItem.course_id;
    const resolvedTargetUnitId = targetUnitId || sourceItem.unit_id;

    if (mode === 'keep_copy' && resolvedTargetCourseId !== sourceItem.course_id && !staff.isTeacher) {
      if (!canAssistantAccessCoursePerm(staff, sourceItem.course_id, 'canTransferContent')) {
        return { success: false, error: 'غير مصرح للمساعد بنقل النسخ إلى كورس آخر' };
      }
      const targetPerm = targetType === 'exam' ? 'canAddExams' : 'canAddHomework';
      if (!canAssistantAccessAnyCoursePerm(staff, resolvedTargetCourseId, [targetPerm, 'canTransferContent', 'canConvertAssessments'])) {
        return { success: false, error: 'غير مصرح للمساعد بإضافة محتوى في الكورس المستهدف' };
      }
    }

    const { data: existingQuestions } = await supabaseAdmin
      .from('quiz_questions')
      .select('id, points, question_type')
      .eq('item_id', sourceItemId);

    const qList = existingQuestions || [];
    const computedMarks = qList.reduce((sum: number, q: any) => {
      if (q.question_type === 'passage') return sum;
      return sum + (Number(q.points) || 1);
    }, 0);
    const finalTotalMarks = computedMarks > 0 ? computedMarks : (Number(sourceItem.total_marks) || 100);
    const nowIso = new Date().toISOString();

    if (mode === 'convert_in_place') {
      if (sourceItem.item_type === targetType) {
        return { success: false, error: 'العنصر يحمل نفس النوع المحدد بالفعل' };
      }

      const updateFields: Record<string, any> = {
        item_type: targetType,
        total_marks: finalTotalMarks,
        updated_at: nowIso,
      };
      if (newTitle && newTitle.trim()) {
        updateFields.title = newTitle.trim();
      }

      const { data: updatedRows, error: upErr } = await supabaseAdmin
        .from('unit_items')
        .update(updateFields)
        .eq('id', sourceItemId)
        .select();

      if (upErr || !updatedRows?.[0]) {
        return { success: false, error: upErr?.message || 'فشل تحويل العنصر في قاعدة البيانات' };
      }

      try {
        await supabaseAdmin.from('audit_logs').insert([{
          actor_id: staff.id,
          actor_name: staff.fullName,
          actor_role: staff.role,
          action_type: 'CONVERT_ASSESSMENT_IN_PLACE',
          target_entity: 'unit_items',
          target_id: sourceItemId,
          details: {
            courseId: sourceItem.course_id,
            fromType: sourceItem.item_type,
            toType: targetType,
            questionsCount: qList.length,
            title: updatedRows[0].title,
          },
        }]);
      } catch {}

      return {
        success: true,
        item: mapUnitItemRow(updatedRows[0]),
        questionsCount: qList.length,
        mode: 'convert_in_place',
      };
    }

    // Mode: keep_copy (Independent clone preserving the original item completely untouched)
    const { data: unitCheck } = await supabaseAdmin
      .from('course_units')
      .select('id, course_id')
      .eq('id', resolvedTargetUnitId)
      .maybeSingle();

    if (!unitCheck || unitCheck.course_id !== resolvedTargetCourseId) {
      return { success: false, error: 'الوحدة المستهدفة غير صالحة أو لا تنتمي للكورس المختار' };
    }

    const newItemId = crypto.randomUUID();
    const defaultSuffix = targetType === 'homework' ? 'نسخة واجب' : 'نسخة امتحان';
    const finalTitle = newTitle?.trim() || `${sourceItem.title} (${defaultSuffix})`;

    const { data: existingUnitItems } = await supabaseAdmin
      .from('unit_items')
      .select('order_index')
      .eq('unit_id', resolvedTargetUnitId)
      .order('order_index', { ascending: false })
      .limit(1);

    const nextOrderIndex = Number(existingUnitItems?.[0]?.order_index || 0) + 1;

    const newItemPayload: Record<string, any> = {
      id: newItemId,
      unit_id: resolvedTargetUnitId,
      course_id: resolvedTargetCourseId,
      item_type: targetType,
      title: finalTitle,
      description: sourceItem.description || null,
      order_index: nextOrderIndex,
      duration_minutes: Number(sourceItem.duration_minutes) || 0,
      total_marks: finalTotalMarks,
      passing_score_percentage: Number(sourceItem.passing_score_percentage) || 60,
      max_exam_attempts: sourceItem.max_exam_attempts !== null && sourceItem.max_exam_attempts !== undefined ? Math.max(1, Number(sourceItem.max_exam_attempts)) : 3,
      start_date: sourceItem.start_date || null,
      end_date: sourceItem.end_date || null,
      is_prerequisite_required: sourceItem.is_prerequisite_required !== false,
      updated_at: nowIso,
    };

    const { data: insertedItems, error: insItemErr } = await supabaseAdmin
      .from('unit_items')
      .insert(newItemPayload)
      .select();

    if (insItemErr || !insertedItems?.[0]) {
      return { success: false, error: insItemErr?.message || 'فشل إنشاء النسخة الجديدة في الوحدة المستهدفة' };
    }

    let clonedCount = 0;
    try {
      const cloned = await deepCloneQuestionsOnServer(sourceItemId, newItemId);
      clonedCount = cloned.questionsCount;
    } catch (cloneErr: any) {
      // Roll back the new item so we never leave a broken half-copied assessment
      await supabaseAdmin.from('unit_items').delete().eq('id', newItemId);
      return { success: false, error: cloneErr?.message || 'فشل استنساخ الأسئلة للنسخة الجديدة' };
    }

    try {
      await supabaseAdmin.from('audit_logs').insert([{
        actor_id: staff.id,
        actor_name: staff.fullName,
        actor_role: staff.role,
        action_type: 'CLONE_ASSESSMENT_AS_OPPOSITE_TYPE',
        target_entity: 'unit_items',
        target_id: newItemId,
        details: {
          sourceItemId,
          sourceCourseId: sourceItem.course_id,
          sourceType: sourceItem.item_type,
          targetCourseId: resolvedTargetCourseId,
          targetUnitId: resolvedTargetUnitId,
          targetType,
          questionsCount: clonedCount,
          title: finalTitle,
        },
      }]);
    } catch {}

    return {
      success: true,
      item: mapUnitItemRow(insertedItems[0]),
      questionsCount: clonedCount,
      mode: 'keep_copy',
    };
  } catch (err: any) {
    console.error('convertOrCloneAssessmentServer exception:', err);
    return { success: false, error: err?.message || 'حدث خطأ غير متوقع أثناء التحويل أو الاستنساخ' };
  }
}

export async function transferItemToTargetCourseServer(payload: {
  sourceItemId: string;
  targetCourseId: string;
  targetUnitId: string;
  newItemTitle?: string;
}): Promise<{
  success: boolean;
  item?: any;
  questionsCount?: number;
  error?: string;
}> {
  try {
    const staff = await requireStaffSession();
    if (!staff) {
      return { success: false, error: 'غير مصرح بهذه العملية الإدارية' };
    }

    const { sourceItemId, targetCourseId, targetUnitId, newItemTitle } = payload;
    if (!sourceItemId || !targetCourseId || !targetUnitId) {
      return { success: false, error: 'يرجى تحديد العنصر والكورس والوحدة المستهدفة' };
    }

    const { data: sourceItem, error: srcErr } = await supabaseAdmin
      .from('unit_items')
      .select('*')
      .eq('id', sourceItemId)
      .maybeSingle();

    if (srcErr || !sourceItem) {
      return { success: false, error: 'لم يتم العثور على المحتوى المطلوب تصديره' };
    }

    if (!staff.isTeacher) {
      if (!canAssistantAccessCoursePerm(staff, sourceItem.course_id, 'canTransferContent')) {
        return { success: false, error: 'غير مصرح للمساعد بنقل وتصدير المحتوى من هذا الكورس' };
      }
      if (targetCourseId !== sourceItem.course_id) {
        const permKey = getItemTypePermissionKey(sourceItem.item_type);
        const allowedKeys = permKey ? [permKey, 'canTransferContent'] as any : ['canTransferContent'] as any;
        if (!canAssistantAccessAnyCoursePerm(staff, targetCourseId, allowedKeys)) {
          return { success: false, error: 'غير مصرح للمساعد بإضافة أو استيراد محتوى في الكورس المستهدف' };
        }
      }
    }

    const { data: unitCheck } = await supabaseAdmin
      .from('course_units')
      .select('id, course_id')
      .eq('id', targetUnitId)
      .maybeSingle();

    if (!unitCheck || unitCheck.course_id !== targetCourseId) {
      return { success: false, error: 'الوحدة المستهدفة لا تنتمي للكورس المحدد' };
    }

    const { data: existingUnitItems } = await supabaseAdmin
      .from('unit_items')
      .select('order_index')
      .eq('unit_id', targetUnitId)
      .order('order_index', { ascending: false })
      .limit(1);

    const nextOrderIndex = Number(existingUnitItems?.[0]?.order_index || 0) + 1;
    const newItemId = crypto.randomUUID();
    const targetTitle = newItemTitle?.trim() || `${sourceItem.title} (نسخة)`;
    const nowIso = new Date().toISOString();

    const newItemRow: Record<string, any> = {
      id: newItemId,
      unit_id: targetUnitId,
      course_id: targetCourseId,
      item_type: sourceItem.item_type,
      title: targetTitle,
      description: sourceItem.description || null,
      order_index: nextOrderIndex,
      duration_minutes: Number(sourceItem.duration_minutes) || 0,
      total_marks: Number(sourceItem.total_marks) || 100,
      passing_score_percentage: Number(sourceItem.passing_score_percentage) || 60,
      max_exam_attempts: sourceItem.max_exam_attempts !== null && sourceItem.max_exam_attempts !== undefined ? Math.max(1, Number(sourceItem.max_exam_attempts)) : 3,
      start_date: sourceItem.start_date || null,
      end_date: sourceItem.end_date || null,
      video_source_type: sourceItem.video_source_type || 'internal_secured',
      obfuscated_video_id: sourceItem.obfuscated_video_id || null,
      direct_video_url: sourceItem.direct_video_url || null,
      pdf_attachment_url: sourceItem.pdf_attachment_url || null,
      is_prerequisite_required: sourceItem.is_prerequisite_required !== false,
      updated_at: nowIso,
    };

    const { data: insertedRows, error: insertErr } = await supabaseAdmin
      .from('unit_items')
      .insert(newItemRow)
      .select();

    if (insertErr || !insertedRows?.[0]) {
      return { success: false, error: insertErr?.message || 'فشل إنشاء النسخة في الكورس المستهدف' };
    }

    let clonedQuestionsCount = 0;
    let finalTotalMarks = Number(sourceItem.total_marks) || 100;

    if (sourceItem.item_type === 'exam' || sourceItem.item_type === 'homework') {
      try {
        const cloned = await deepCloneQuestionsOnServer(sourceItemId, newItemId);
        clonedQuestionsCount = cloned.questionsCount;
        if (cloned.totalMarks > 0) {
          finalTotalMarks = cloned.totalMarks;
          await supabaseAdmin
            .from('unit_items')
            .update({ total_marks: finalTotalMarks, updated_at: new Date().toISOString() })
            .eq('id', newItemId);
        }
      } catch (cloneErr: any) {
        await supabaseAdmin.from('unit_items').delete().eq('id', newItemId);
        return { success: false, error: cloneErr?.message || 'فشل نسخ الأسئلة أثناء التصدير' };
      }
    }

    try {
      await supabaseAdmin.from('audit_logs').insert([{
        actor_id: staff.id,
        actor_name: staff.fullName,
        actor_role: staff.role,
        action_type: 'EXPORT_ITEM_TO_TARGET_COURSE',
        target_entity: 'unit_items',
        target_id: newItemId,
        details: {
          sourceItemId,
          sourceCourseId: sourceItem.course_id,
          targetCourseId,
          targetUnitId,
          itemType: sourceItem.item_type,
          questionsCount: clonedQuestionsCount,
          title: targetTitle,
        },
      }]);
    } catch {}

    const mapped = mapUnitItemRow(insertedRows[0]);
    mapped.totalMarks = finalTotalMarks;
    return {
      success: true,
      item: mapped,
      questionsCount: clonedQuestionsCount,
    };
  } catch (err: any) {
    console.error('transferItemToTargetCourseServer exception:', err);
    return { success: false, error: err?.message || 'حدث خطأ أثناء نسخ وتصدير المحتوى' };
  }
}
