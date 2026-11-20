'use server';

import { supabase } from '@/lib/supabaseClient';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';
import {
  requireStaffSession,
  canAssistantAccessCoursePerm,
  canAssistantAccessAnyCoursePerm,
} from '@/lib/serverAuth';
import { getItemTypePermissionKey } from '@/lib/assistantPermissions';

export async function getTeacherCourses() {
  const { data, error } = await supabase
    .from('courses')
    .select(`
      *,
      units:course_units(count),
      enrollments:course_enrollments(count)
    `)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function getCourseDetails(courseId: string) {
  const { data: course, error } = await supabase
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .single();

  if (error) throw new Error(error.message);

  const { data: units, error: unitsError } = await supabase
    .from('course_units')
    .select(`
      *,
      items:unit_items(*)
    `)
    .eq('course_id', courseId)
    .order('order_index', { ascending: true });

  if (unitsError) throw new Error(unitsError.message);

  // Sort items inside units
  const formattedUnits = units?.map(u => ({
    ...u,
    items: (u.items || []).sort((a: any, b: any) => a.order_index - b.order_index)
  })) || [];

  return { course, units: formattedUnits };
}

export async function createCourse(courseData: any) {
  const session = await requireStaffSession();
  if (!session || !session.isTeacher) throw new Error('غير مصرح بإنشاء الكورسات — صلاحية حصرية للمعلم');
  const { data, error } = await supabaseAdmin
    .from('courses')
    .insert([courseData])
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath('/teacher');
  return data;
}

export async function createCourseUnit(unitData: any) {
  const session = await requireStaffSession();
  if (!session) throw new Error('غير مصرح بإنشاء الوحدات');
  if (!session.isTeacher && !canAssistantAccessCoursePerm(session, unitData?.course_id, 'canManageUnits')) {
    throw new Error('غير مصرح للمساعد بإضافة وحدات لهذا الكورس');
  }
  const { data, error } = await supabaseAdmin
    .from('course_units')
    .insert([unitData])
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath('/teacher');
  return data;
}

export async function createUnitItem(itemData: any) {
  const session = await requireStaffSession();
  if (!session) throw new Error('غير مصرح بإنشاء الدروس');
  if (!session.isTeacher) {
    const permKey = getItemTypePermissionKey(itemData?.item_type);
    if (!permKey || !canAssistantAccessCoursePerm(session, itemData?.course_id, permKey)) {
      throw new Error('غير مصرح للمساعد بإضافة هذا النوع من المحتوى');
    }
  }
  const { data, error } = await supabaseAdmin
    .from('unit_items')
    .insert([itemData])
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath('/teacher');
  return data;
}

export async function generateActivationCodes(
  courseId: string, 
  count: number, 
  batchName: string, 
  createdBy?: string,
  options?: {
    studentBirthDate?: string;
    assignedStudentName?: string;
    centerOrGroup?: string;
  }
) {
  const session = await requireStaffSession();
  if (!session) throw new Error('غير مصرح بإصدار أكواد التفعيل');
  if (!session.isTeacher && !canAssistantAccessCoursePerm(session, courseId, 'canGenerateCodes')) {
    throw new Error('غير مصرح للمساعد بإصدار أكواد تفعيل لهذا الكورس');
  }
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const client = supabaseAdmin || supabase;

  // Format date tag: birth date if provided, otherwise current issue date
  let dateTag = '';
  const resolvedDob = options?.studentBirthDate?.trim();
  if (resolvedDob) {
    const parts = resolvedDob.split(/[-/]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        dateTag = `${parts[0].slice(2)}${parts[1].padStart(2, '0')}${parts[2].padStart(2, '0')}`;
      } else if (parts[2].length === 4) {
        dateTag = `${parts[2].slice(2)}${parts[1].padStart(2, '0')}${parts[0].padStart(2, '0')}`;
      }
    }
    if (!dateTag) {
      const digits = resolvedDob.replace(/\D/g, '');
      dateTag = digits.slice(-6).padStart(6, '0');
    }
  }

  if (!dateTag) {
    const now = new Date();
    const y = String(now.getFullYear()).slice(2);
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    dateTag = `${y}${m}${d}`;
  }

  const codesToInsert = Array.from({ length: count }).map(() => {
    let part1 = '';
    let part2 = '';
    for (let c = 0; c < 4; c++) {
      part1 += chars.charAt(Math.floor(Math.random() * chars.length));
      part2 += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const code = `MR-${dateTag}-${part1}-${part2}`;

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

    return {
      course_id: courseId,
      code,
      batch_name: fullBatchDisplay,
      created_by: createdBy && createdBy !== 'teacher' && createdBy !== 'assistant' ? createdBy : null
    };
  });

  const { data, error } = await client
    .from('course_activation_codes')
    .insert(codesToInsert)
    .select();

  if (error) throw new Error(error.message);
  revalidatePath('/teacher');
  return data;
}

export async function getCourseCodes(courseId: string) {
  const session = await requireStaffSession();
  if (!session) throw new Error('غير مصرح بعرض أكواد التفعيل');
  if (!session.isTeacher && !canAssistantAccessAnyCoursePerm(session, courseId, ['canGenerateCodes', 'canViewCourseStudents'])) {
    throw new Error('غير مصرح للمساعد بعرض أكواد هذا الكورس');
  }
  const client = supabaseAdmin || supabase;
  const { data, error } = await client
    .from('course_activation_codes')
    .select('*, used_by:profiles(full_name)')
    .eq('course_id', courseId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}
