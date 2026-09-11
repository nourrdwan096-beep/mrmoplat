'use server';

import { supabaseAdmin } from '@/lib/supabaseServer';

// Generic CRUD proxies for Supabase via Admin Client (bypasses RLS issues)
export async function proxyUpsert(table: string, payload: any) {
  const { data, error } = await supabaseAdmin.from(table).upsert(payload).select();
  if (error) {
    console.error(`proxyUpsert [${table}] error:`, error);
    throw new Error(error.message);
  }
  return data;
}

export async function proxyInsert(table: string, payload: any) {
  const { data, error } = await supabaseAdmin.from(table).insert(payload).select();
  if (error) {
    console.error(`proxyInsert [${table}] error:`, error);
    throw new Error(error.message);
  }
  return data;
}

export async function proxyUpdate(table: string, match: Record<string, any>, payload: any) {
  const { data, error } = await supabaseAdmin.from(table).update(payload).match(match).select();
  if (error) {
    console.error(`proxyUpdate [${table}] error:`, error);
    throw new Error(error.message);
  }
  return data;
}

export async function proxyDelete(table: string, match: Record<string, any>) {
  const { data, error } = await supabaseAdmin.from(table).delete().match(match);
  if (error) {
    console.error(`proxyDelete [${table}] error:`, error);
    throw new Error(error.message);
  }
  return data;
}

export async function proxySelect(table: string, match?: Record<string, any>, orderBy?: { column: string; ascending?: boolean }) {
  let query = supabaseAdmin.from(table).select('*');
  if (match) {
    query = query.match(match);
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

  // Extract meta block if present
  const metaMatch = description.match(/\n\n<!--meta:([\s\S]*?)-->$/);
  if (metaMatch) {
    try {
      const parsed = JSON.parse(metaMatch[1]);
      if (parsed.originalPrice !== undefined) originalPrice = parsed.originalPrice;
      if (parsed.hasDiscount !== undefined) hasDiscount = parsed.hasDiscount;
      if (parsed.enforceUnitProgression !== undefined) enforceUnitProgression = parsed.enforceUnitProgression;
      if (parsed.enforceItemProgression !== undefined) enforceItemProgression = parsed.enforceItemProgression;
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
    coverImage: row.cover_image_url || 'https://picsum.photos/seed/course/800/600',
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
  const courseId = course.id && course.id.length === 36 ? course.id : crypto.randomUUID();

  // Embed extra metadata cleanly into the description field so non-existent columns are avoided
  const meta = {
    originalPrice: course.originalPrice,
    hasDiscount: course.hasDiscount,
    enforceUnitProgression: course.enforceUnitProgression ?? true,
    enforceItemProgression: course.enforceItemProgression ?? true,
  };
  const rawDesc = (course.description || '').replace(/\n\n<!--meta:[\s\S]*?-->$/, '');
  const storedDescription = `${rawDesc}\n\n<!--meta:${JSON.stringify(meta)}-->`;

  const payload = {
    id: courseId,
    title: course.title,
    slug: course.slug || course.title.toLowerCase().replace(/\s+/g, '-'),
    description: storedDescription,
    cover_image_url: course.coverImage,
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

  return parseCourseFromRow(data[0]);
}

export async function deleteCourseServer(courseId: string): Promise<boolean> {
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

    return (data || []).map((i: any) => ({
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
      maxExamAttempts: i.max_exam_attempts || 2,
      videoSourceType: i.video_source_type || 'internal_secured',
      obfuscatedVideoId: i.obfuscated_video_id || '',
      directVideoUrl: i.direct_video_url || '',
      pdfAttachmentUrl: i.pdf_attachment_url || '',
      isPrerequisiteRequired: i.is_prerequisite_required ?? true,
      createdAt: i.created_at || new Date().toISOString(),
    }));
  } catch (err) {
    console.error('fetchItemsServer exception:', err);
    return [];
  }
}

export async function saveItemServer(item: any): Promise<any> {
  const itemId = item.id && item.id.length === 36 ? item.id : crypto.randomUUID();
  const payload = {
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
    max_exam_attempts: Number(item.maxExamAttempts) || 2,
    video_source_type: item.videoSourceType || 'internal_secured',
    obfuscated_video_id: item.obfuscatedVideoId || null,
    direct_video_url: item.directVideoUrl || null,
    pdf_attachment_url: item.pdfAttachmentUrl || null,
    is_prerequisite_required: item.isPrerequisiteRequired !== false,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from('unit_items')
    .upsert(payload)
    .select();

  if (error) {
    console.error('saveItemServer error:', error);
    throw new Error(error.message);
  }

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
    videoSourceType: i.video_source_type,
    obfuscatedVideoId: i.obfuscated_video_id,
    directVideoUrl: i.direct_video_url,
    pdfAttachmentUrl: i.pdf_attachment_url,
    isPrerequisiteRequired: i.is_prerequisite_required,
    createdAt: i.created_at,
  };
}

export async function deleteItemServer(itemId: string): Promise<boolean> {
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
    const { data, error } = await supabaseAdmin
      .from('quiz_questions')
      .select('*')
      .eq('item_id', itemId)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('fetchQuestionsServer error:', error);
      return [];
    }

    return (data || []).map((q: any) => ({
      id: q.id,
      itemId: q.item_id,
      questionText: q.question_text,
      questionImageUrl: q.question_image_url,
      questionType: q.question_type || 'mcq',
      options: q.options || [],
      correctAnswerId: q.correct_answer_id,
      explanation: q.explanation || '',
      points: Number(q.points) || 1,
      orderIndex: q.order_index || 1,
    }));
  } catch (err) {
    console.error('fetchQuestionsServer exception:', err);
    return [];
  }
}

export async function saveQuestionsServer(itemId: string, questions: any[]): Promise<boolean> {
  try {
    await supabaseAdmin.from('quiz_questions').delete().eq('item_id', itemId);

    if (!questions || questions.length === 0) return true;

    const rows = questions.map((q: any, idx: number) => ({
      id: q.id && q.id.length === 36 ? q.id : crypto.randomUUID(),
      item_id: itemId,
      question_text: q.questionText || '',
      question_image_url: q.questionImageUrl || null,
      question_type: q.questionType || 'mcq',
      options: q.options || [],
      correct_answer_id: q.correctAnswerId || '',
      explanation: q.explanation || null,
      points: Number(q.points) || 1,
      order_index: q.orderIndex || idx + 1,
    }));

    const { error } = await supabaseAdmin.from('quiz_questions').insert(rows);
    if (error) {
      console.error('saveQuestionsServer error:', error);
      throw new Error(error.message);
    }
    return true;
  } catch (err) {
    console.error('saveQuestionsServer exception:', err);
    return false;
  }
}

// -------------------------------------------------------------
// ACTIVATION CODES SERVER ACTIONS
// -------------------------------------------------------------
export async function fetchCodesServer(courseId?: string): Promise<any[]> {
  try {
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
    if (!codes || codes.length === 0) return true;
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

export async function markCodeUsedServer(codeId: string, studentId: string, nowIso: string): Promise<boolean> {
  try {
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
    const { data, error } = await supabaseAdmin
      .from('course_enrollments')
      .select('course_id')
      .eq('student_id', studentId)
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
    const enrollmentRow = {
      id: enrollment.id && enrollment.id.length === 36 ? enrollment.id : crypto.randomUUID(),
      student_id: enrollment.studentId,
      course_id: enrollment.courseId,
      payment_method: enrollment.paymentMethod || 'activation_code',
      amount_paid: Number(enrollment.amountPaid) || 0,
      is_active: true,
      enrolled_at: enrollment.enrolledAt || new Date().toISOString(),
    };

    await supabaseAdmin.from('course_enrollments').upsert(enrollmentRow);

    if (walletTx) {
      const txRow = {
        id: walletTx.id && walletTx.id.length === 36 ? walletTx.id : crypto.randomUUID(),
        student_id: walletTx.studentId,
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
