'use server';

import { supabase } from '@/lib/supabaseClient';
import { revalidatePath } from 'next/cache';

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
  const { data, error } = await supabase
    .from('courses')
    .insert([courseData])
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath('/teacher');
  return data;
}

export async function createCourseUnit(unitData: any) {
  const { data, error } = await supabase
    .from('course_units')
    .insert([unitData])
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath('/teacher');
  return data;
}

export async function createUnitItem(itemData: any) {
  const { data, error } = await supabase
    .from('unit_items')
    .insert([itemData])
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath('/teacher');
  return data;
}

import crypto from 'crypto';

export async function generateActivationCodes(courseId: string, count: number, batchName: string, createdBy: string) {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const prefixes = ['MR', 'RAD', 'ENG', 'SEC', 'EDU'];

  const codesToInsert = Array.from({ length: count }).map(() => {
    const bytes = crypto.randomBytes(24);
    const prefix = prefixes[bytes[0] % prefixes.length];
    const layout = bytes[1] % 3;

    let raw = '';
    for (let i = 2; i < 22; i++) {
      raw += chars[bytes[i] % chars.length];
    }

    let code = '';
    if (layout === 0) {
      code = `${prefix}-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}`;
    } else if (layout === 1) {
      code = `${prefix}-${raw.slice(0, 5)}-${raw.slice(5, 10)}-${raw.slice(10, 15)}`;
    } else {
      code = `${prefix}-${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7, 11)}-${raw.slice(11, 14)}`;
    }

    return {
      course_id: courseId,
      code,
      batch_name: batchName,
      created_by: createdBy && createdBy !== 'teacher' && createdBy !== 'assistant' ? createdBy : null
    };
  });

  const { data, error } = await supabase
    .from('course_activation_codes')
    .insert(codesToInsert)
    .select();

  if (error) throw new Error(error.message);
  revalidatePath('/teacher');
  return data;
}

export async function getCourseCodes(courseId: string) {
  const { data, error } = await supabase
    .from('course_activation_codes')
    .select('*, used_by:profiles(full_name)')
    .eq('course_id', courseId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}
