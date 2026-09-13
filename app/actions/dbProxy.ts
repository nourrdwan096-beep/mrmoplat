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
      maxExamAttempts: i.max_exam_attempts !== null && i.max_exam_attempts !== undefined ? Number(i.max_exam_attempts) : 3,
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
    max_exam_attempts: item.maxExamAttempts !== undefined && item.maxExamAttempts !== null && !isNaN(Number(item.maxExamAttempts)) ? Math.max(1, Number(item.maxExamAttempts)) : 3,
    video_source_type: item.videoSourceType || 'internal_secured',
    obfuscated_video_id: item.obfuscatedVideoId || null,
    direct_video_url: (item.directVideoUrl && !item.directVideoUrl.startsWith('idb://')) ? item.directVideoUrl : null,
    pdf_attachment_url: (item.pdfAttachmentUrl && !item.pdfAttachmentUrl.startsWith('idb://')) ? item.pdfAttachmentUrl : null,
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
      obfuscatedVideoId: data.obfuscated_video_id,
      directVideoUrl: data.direct_video_url,
      pdfAttachmentUrl: data.pdf_attachment_url,
      isPrerequisiteRequired: data.is_prerequisite_required,
      createdAt: data.created_at,
    };
  } catch (err) {
    console.warn('fetchItemByIdServer exception:', err);
    return null;
  }
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
    return true;
  } catch (err) {
    console.error('saveQuestionsServer exception:', err);
    return false;
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
  questionResults: Record<string, { earned: number; max: number; isCorrect: boolean }>;
  error?: string;
}> {
  try {
    const { itemId, studentId, courseId, answers, isSecurityTerminated } = payload;

    if (!itemId || !studentId || !courseId) {
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

    // 1. Fetch item configuration to get passing score and max attempts
    const { data: itemData, error: itemErr } = await supabaseAdmin
      .from('unit_items')
      .select('passing_score_percentage, max_exam_attempts, total_marks')
      .eq('id', itemId)
      .maybeSingle();

    if (itemErr) {
      console.warn('submitAndGradeExamServer item fetch warning:', itemErr);
    }

    const passingScorePercentage = itemData?.passing_score_percentage ?? 60;
    const maxExamAttempts = itemData?.max_exam_attempts !== null && itemData?.max_exam_attempts !== undefined
      ? Number(itemData.max_exam_attempts)
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

        if (q.question_type === 'mcq' || q.question_type === 'tf') {
          const chosen = answers.mcqAnswers?.[q.id];
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
          const chosen = (answers.multiSelectAnswers?.[q.id] || []).slice().sort();
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
          const studentBlanks = answers.wordBankAnswers?.[q.id] || {};
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
          const ans = (answers.textAnswers?.[q.id] || '').trim().toLowerCase();
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

    const percentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    const isPassed = percentage >= passingScorePercentage;
    const newAttemptsCount = currentAttempts + 1;
    const isExhausted = newAttemptsCount >= maxExamAttempts && !isPassed;

    // Strict rule: "تتتاخد درجة الامتحان الأخير، يعني آخر مرة هو دخلها... فبتتتاخد درجة الامتحان الأخير بس"
    const recordPayload = {
      id: existingProg?.id || crypto.randomUUID(),
      student_id: studentId,
      course_id: courseId,
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

    return {
      success: true,
      totalPoints,
      earnedPoints,
      percentage,
      isPassed,
      attemptsCount: newAttemptsCount,
      maxExamAttempts,
      isExhausted,
      questionResults,
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

    let query = supabaseAdmin
      .from('student_item_progress')
      .select('*, unit_items(title, max_exam_attempts, item_type)')
      .eq('student_id', studentId);

    if (courseId) {
      query = query.eq('course_id', courseId);
    }

    const { data, error } = await query;
    if (error) {
      // Fallback if join syntax is not supported in the schema
      let fallbackQuery = supabaseAdmin
        .from('student_item_progress')
        .select('*')
        .eq('student_id', studentId);
      if (courseId) {
        fallbackQuery = fallbackQuery.eq('course_id', courseId);
      }
      const { data: rawData, error: rawErr } = await fallbackQuery;
      if (rawErr) {
        console.warn('fetchStudentProgressServer fallback warning:', rawErr);
        return [];
      }
      return rawData || [];
    }

    return data || [];
  } catch (err) {
    console.error('fetchStudentProgressServer exception:', err);
    return [];
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
    const { itemId, questionId, chosenAnswer } = payload;
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

    if (q.question_type === 'mcq' || q.question_type === 'tf') {
      const isCorrect = chosenAnswer === correctAnswerId;
      return {
        success: true,
        isCorrect,
        earnedPoints: isCorrect ? maxPts : 0,
        maxPoints: maxPts,
        explanation: isCorrect ? explanation : undefined,
      };
    }

    if (q.question_type === 'multi_select') {
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

      return {
        success: true,
        isCorrect: isExactMatch,
        earnedPoints: earned,
        maxPoints: maxPts,
        explanation,
      };
    }

    if (q.question_type === 'word_bank') {
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

      return {
        success: true,
        isCorrect: isExact,
        earnedPoints: earned,
        maxPoints: maxPts,
        explanation,
      };
    }

    // Text / Essay
    const idealAnswer = isOptionsObj ? (q.options.idealAnswer || q.ideal_answer || '') : (q.ideal_answer || '');
    const isTextMatch = Boolean(idealAnswer && String(chosenAnswer).trim().toLowerCase() === idealAnswer.trim().toLowerCase());
    return {
      success: true,
      isCorrect: isTextMatch,
      earnedPoints: isTextMatch ? maxPts : 0,
      maxPoints: maxPts,
      explanation,
    };
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

export async function fetchCourseEnrolledStudentsDataServer(courseId: string) {
  try {
    const { data: dbEnrollments, error: enrollErr } = await supabaseAdmin
      .from('course_enrollments')
      .select('*, profiles(id, full_name, phone, parent_phone, avatar_url, role)')
      .eq('course_id', courseId)
      .eq('is_active', true)
      .order('enrolled_at', { ascending: false });

    const { data: progressData, error: progressErr } = await supabaseAdmin
      .from('student_item_progress')
      .select('id, student_id, course_id, item_id, attempts_count, status, highest_score, last_score, is_passed, completed_at, updated_at, unit_items(id, title, max_exam_attempts, item_type, total_marks, passing_score_percentage)')
      .eq('course_id', courseId);

    return {
      success: true,
      enrollments: dbEnrollments || [],
      progress: progressData || []
    };
  } catch (err: any) {
    console.error('fetchCourseEnrolledStudentsDataServer exception:', err);
    return {
      success: false,
      enrollments: [],
      progress: []
    };
  }
}
