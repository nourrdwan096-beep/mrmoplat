'use server';

import { supabaseAdmin } from '@/lib/supabaseServer';
import { requireStaffSession } from '@/lib/serverAuth';

const isValidUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

async function checkAnnouncementAuth() {
  const session = await requireStaffSession();
  if (!session) return false;
  if (session.isTeacher) return true;
  return Boolean(session.assistantPermissions?.can_publish_announcements);
}

export async function deleteAnnouncementServerAction(id: string) {
  if (!(await checkAnnouncementAuth())) {
    return { success: false, error: 'غير مصرح لك بإدارة الإعلانات.' };
  }

  if (!isValidUUID(id)) {
    return { success: true };
  }

  try {
    const { error } = await supabaseAdmin
      .from('announcements')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('deleteAnnouncementServerAction error:', JSON.stringify(error));
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('deleteAnnouncementServerAction exception:', err?.message || err);
    return { success: false, error: err?.message || 'Failed to delete announcement' };
  }
}

export async function createAnnouncementServerAction(payload: {
  title: string;
  content: string;
  imageUrl?: string;
  targetStage?: 'middle' | 'high' | null;
  targetGrade?: 1 | 2 | 3 | null;
  isPublished?: boolean;
}) {
  if (!(await checkAnnouncementAuth())) {
    return { success: false, error: 'غير مصرح لك بنشر الإعلانات.' };
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('announcements')
      .insert([
        {
          title: payload.title,
          content: payload.content,
          image_url: payload.imageUrl,
          target_stage: payload.targetStage,
          target_grade: payload.targetGrade,
          is_published: payload.isPublished ?? true,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('createAnnouncementServerAction error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error('createAnnouncementServerAction exception:', err);
    return { success: false, error: err?.message || 'Failed to create announcement' };
  }
}

export async function updateAnnouncementServerAction(
  id: string,
  payload: {
    title: string;
    content: string;
    imageUrl?: string;
    targetStage?: 'middle' | 'high' | null;
    targetGrade?: 1 | 2 | 3 | null;
    isPublished?: boolean;
  }
) {
  if (!(await checkAnnouncementAuth())) {
    return { success: false, error: 'غير مصرح لك بتعديل الإعلانات.' };
  }

  if (!isValidUUID(id)) {
    return { success: true, data: { ...payload, id } };
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('announcements')
      .update({
        title: payload.title,
        content: payload.content,
        image_url: payload.imageUrl,
        target_stage: payload.targetStage,
        target_grade: payload.targetGrade,
        is_published: payload.isPublished ?? true,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('updateAnnouncementServerAction error:', JSON.stringify(error));
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error('updateAnnouncementServerAction exception:', err?.message || err);
    return { success: false, error: err?.message || 'Failed to update announcement' };
  }
}
