'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://btwwkfrkdgmonzufyuyd.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY || '"your-secret-key-here"';

// Server-side admin client to bypass RLS
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

export interface AssistantPayload {
  id?: string;
  fullName: string;
  assistantRoleTitle?: string;
  email: string;
  passwordHash: string;
  phone?: string;
  permissions?: {
    canManageStudents: boolean;
    canApproveRegistrations: boolean;
    canViewStudentPasswords: boolean;
    canManageAllCourses: boolean;
    assignedCourseIds: string[];
    courseActions?: {
      [courseId: string]: {
        canAddVideos: boolean;
        canAddHomework: boolean;
        canAddExams: boolean;
        canAddConceptSheets: boolean;
        canAddSummaries: boolean;
      };
    };
    canHandleAcademicSupport: boolean;
    canHandleTechnicalSupport: boolean;
    canReviewHomework: boolean;
    canPublishAnnouncements: boolean;
    canSendMessages: boolean;
  };
}

export async function fetchAssistantsServerAction() {
  try {
    const { data: profiles, error: pError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('role', 'assistant')
      .order('created_at', { ascending: false });

    if (pError || !profiles) {
      console.warn('fetchAssistantsServerAction profiles warning:', pError);
      return { success: false, data: [] };
    }

    const { data: perms } = await supabaseAdmin
      .from('assistant_permissions')
      .select('*');

    const mapped = profiles.map((p: any) => {
      const perm = perms?.find((pm: any) => pm.assistant_id === p.id);
      return {
        id: p.id,
        fullName: p.full_name,
        assistantRoleTitle: p.carrier || '',
        email: p.email,
        phone: p.phone || '',
        passwordVault: p.encrypted_password_vault || p.password_hash || '',
        role: 'assistant',
        isFrozen: !!p.is_frozen,
        createdAt: p.created_at,
        permissions: perm
          ? {
              canManageStudents: perm.can_manage_students ?? false,
              canApproveRegistrations: perm.can_approve_registrations ?? false,
              canViewStudentPasswords: perm.can_view_student_passwords ?? false,
              canManageAllCourses: perm.can_manage_all_courses ?? false,
              assignedCourseIds: perm.assigned_course_ids ?? [],
              courseActions: (perm as any).course_actions || {},
              canHandleAcademicSupport: perm.can_handle_academic_support ?? false,
              canHandleTechnicalSupport: perm.can_handle_technical_support ?? false,
              canReviewHomework: perm.can_review_homework ?? false,
              canPublishAnnouncements: perm.can_publish_announcements ?? false,
              canSendMessages: (perm as any).can_send_messages ?? true,
            }
          : {
              canManageStudents: true,
              canApproveRegistrations: true,
              canViewStudentPasswords: false,
              canManageAllCourses: false,
              assignedCourseIds: [],
              courseActions: {},
              canHandleAcademicSupport: true,
              canHandleTechnicalSupport: true,
              canReviewHomework: true,
              canPublishAnnouncements: false,
              canSendMessages: true,
            },
      };
    });

    return { success: true, data: mapped };
  } catch (err: any) {
    console.error('fetchAssistantsServerAction error:', err);
    return { success: false, data: [] };
  }
}

export async function createAssistantServerAction(payload: AssistantPayload) {
  try {
    const cleanEmail = payload.email.trim().toLowerCase();
    const cleanPass = payload.passwordHash.trim();

    // Check if email already exists
    const { data: existing } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('email', cleanEmail)
      .maybeSingle();

    let assistantId = existing?.id;

    if (existing) {
      // Update existing
      await supabaseAdmin
        .from('profiles')
        .update({
          full_name: payload.fullName.trim(),
          phone: payload.phone?.trim() || '01000000000',
          password_hash: cleanPass,
          encrypted_password_vault: cleanPass,
          role: 'assistant',
          status: 'active',
          is_frozen: false,
          carrier: payload.assistantRoleTitle || '',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      assistantId = existing.id;
    } else {
      // Insert new profile
      const { data: newProfile, error: insError } = await supabaseAdmin
        .from('profiles')
        .insert([{
          full_name: payload.fullName.trim(),
          email: cleanEmail,
          phone: payload.phone?.trim() || '01000000000',
          password_hash: cleanPass,
          encrypted_password_vault: cleanPass,
          role: 'assistant',
          status: 'active',
          is_frozen: false,
          stage: 'high',
          education_type: 'general',
          grade: 1,
          carrier: payload.assistantRoleTitle || '',
        }])
        .select('id')
        .single();

      if (insError) {
        console.error('createAssistantServerAction insert error:', insError);
        return { success: false, error: insError.message };
      }
      assistantId = newProfile.id;
    }

    // Insert or update assistant permissions
    if (payload.permissions && assistantId) {
      await supabaseAdmin
        .from('assistant_permissions')
        .upsert([{
          assistant_id: assistantId,
          can_manage_students: payload.permissions.canManageStudents,
          can_approve_registrations: payload.permissions.canApproveRegistrations,
          can_view_student_passwords: payload.permissions.canViewStudentPasswords,
          can_manage_all_courses: payload.permissions.canManageAllCourses,
          assigned_course_ids: payload.permissions.assignedCourseIds,
          can_handle_academic_support: payload.permissions.canHandleAcademicSupport,
          can_handle_technical_support: payload.permissions.canHandleTechnicalSupport,
          canReview_homework: payload.permissions.canReviewHomework,
          can_publish_announcements: payload.permissions.canPublishAnnouncements,
          is_frozen: false,
          updated_at: new Date().toISOString(),
        }], { onConflict: 'assistant_id' });
    }

    // Audit log
    await supabaseAdmin
      .from('audit_logs')
      .insert([{
        actor_name: 'مستر محمد رضوان (Super Admin)',
        actor_role: 'teacher',
        action_type: 'CREATE_OR_UPDATE_ASSISTANT',
        target_entity: 'assistant',
        target_id: assistantId,
        details: { name: payload.fullName, email: cleanEmail, roleTitle: payload.assistantRoleTitle },
      }]);

    return { success: true, assistantId };
  } catch (err: any) {
    console.error('createAssistantServerAction exception:', err);
    return { success: false, error: err.message };
  }
}

export async function updateAssistantServerAction(payload: AssistantPayload & { id: string }) {
  try {
    const cleanEmail = payload.email.trim().toLowerCase();
    const cleanPass = payload.passwordHash ? payload.passwordHash.trim() : undefined;

    const updateData: any = {
      full_name: payload.fullName.trim(),
      email: cleanEmail,
      phone: payload.phone?.trim() || '',
      carrier: payload.assistantRoleTitle || '',
      updated_at: new Date().toISOString(),
    };

    if (cleanPass) {
      updateData.password_hash = cleanPass;
      updateData.encrypted_password_vault = cleanPass;
    }

    const { error: pError } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', payload.id);

    if (pError) {
      console.error('updateAssistantServerAction profile error:', pError);
    }

    if (payload.permissions) {
      await supabaseAdmin
        .from('assistant_permissions')
        .upsert([{
          assistant_id: payload.id,
          can_manage_students: payload.permissions.canManageStudents,
          can_approve_registrations: payload.permissions.canApproveRegistrations,
          can_view_student_passwords: payload.permissions.canViewStudentPasswords,
          can_manage_all_courses: payload.permissions.canManageAllCourses,
          assigned_course_ids: payload.permissions.assignedCourseIds,
          can_handle_academic_support: payload.permissions.canHandleAcademicSupport,
          can_handle_technical_support: payload.permissions.canHandleTechnicalSupport,
          can_review_homework: payload.permissions.canReviewHomework,
          can_publish_announcements: payload.permissions.canPublishAnnouncements,
          updated_at: new Date().toISOString(),
        }], { onConflict: 'assistant_id' });
    }

    // Audit log
    await supabaseAdmin
      .from('audit_logs')
      .insert([{
        actor_name: 'مستر محمد رضوان (Super Admin)',
        actor_role: 'teacher',
        action_type: 'UPDATE_ASSISTANT',
        target_entity: 'assistant',
        target_id: payload.id,
        details: { name: payload.fullName, email: cleanEmail },
      }]);

    return { success: true };
  } catch (err: any) {
    console.error('updateAssistantServerAction exception:', err);
    return { success: false, error: err.message };
  }
}

export async function toggleAssistantFreezeServerAction(id: string, isFrozen: boolean) {
  try {
    await supabaseAdmin
      .from('profiles')
      .update({ is_frozen: isFrozen, updated_at: new Date().toISOString() })
      .eq('id', id);

    await supabaseAdmin
      .from('assistant_permissions')
      .update({ is_frozen: isFrozen, updated_at: new Date().toISOString() })
      .eq('assistant_id', id);

    await supabaseAdmin
      .from('audit_logs')
      .insert([{
        actor_name: 'مستر محمد رضوان (Super Admin)',
        actor_role: 'teacher',
        action_type: isFrozen ? 'FREEZE_ASSISTANT' : 'UNFREEZE_ASSISTANT',
        target_entity: 'assistant',
        target_id: id,
        details: { isFrozen },
      }]);

    return { success: true };
  } catch (err: any) {
    console.error('toggleAssistantFreezeServerAction exception:', err);
    return { success: false, error: err.message };
  }
}

export async function deleteAssistantServerAction(id: string) {
  try {
    await supabaseAdmin
      .from('assistant_permissions')
      .delete()
      .eq('assistant_id', id);

    await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', id);

    await supabaseAdmin
      .from('audit_logs')
      .insert([{
        actor_name: 'مستر محمد رضوان (Super Admin)',
        actor_role: 'teacher',
        action_type: 'DELETE_ASSISTANT',
        target_entity: 'assistant',
        target_id: id,
      }]);

    return { success: true };
  } catch (err: any) {
    console.error('deleteAssistantServerAction exception:', err);
    return { success: false, error: err.message };
  }
}
