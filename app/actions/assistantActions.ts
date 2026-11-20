'use server';

import { supabaseAdmin } from '@/lib/supabaseServer';
import {
  getServerSession,
  isMasterUnlockVerified,
  requireTeacherSession,
} from '@/lib/serverAuth';
import { hashPasswordSecure } from '@/lib/passwordCrypto';
import {
  AssistantPermissionsConfig,
  normalizeAssistantPermissions,
} from '@/lib/assistantPermissions';

export interface AssistantPayload {
  id?: string;
  fullName: string;
  assistantRoleTitle?: string;
  email: string;
  passwordHash: string;
  phone?: string;
  permissions?: Partial<AssistantPermissionsConfig>;
}

async function fetchLatestMatrixMap(assistantIds?: string[]): Promise<Record<string, any>> {
  const map: Record<string, any> = {};
  try {
    let query = supabaseAdmin
      .from('audit_logs')
      .select('target_id, details, created_at')
      .eq('target_entity', 'assistant_permissions_matrix')
      .order('created_at', { ascending: false })
      .limit(500);

    if (assistantIds && assistantIds.length === 1) {
      query = query.eq('target_id', assistantIds[0]);
    } else if (assistantIds && assistantIds.length > 1) {
      query = query.in('target_id', assistantIds);
    }

    const { data } = await query;
    for (const row of data || []) {
      const tid = row.target_id;
      if (tid && !map[tid] && row.details && typeof row.details === 'object') {
        map[tid] = row.details;
      }
    }
  } catch (err) {
    console.warn('fetchLatestMatrixMap warning:', err);
  }
  return map;
}

async function persistAssistantPermissions(
  assistantId: string,
  normalized: AssistantPermissionsConfig,
  isFrozen: boolean = false
) {
  const nowIso = new Date().toISOString();

  // 1. Always upsert guaranteed base SQL columns
  await supabaseAdmin
    .from('assistant_permissions')
    .upsert(
      [
        {
          assistant_id: assistantId,
          can_manage_students: normalized.canManageStudents,
          can_approve_registrations: normalized.canApproveRegistrations,
          can_view_student_passwords: false, // Hard Zero-Knowledge invariant
          can_manage_all_courses: normalized.canManageAllCourses,
          assigned_course_ids: normalized.assignedCourseIds,
          can_handle_academic_support: normalized.canHandleAcademicSupport,
          can_handle_technical_support: normalized.canHandleTechnicalSupport,
          can_review_homework: normalized.canReviewHomework,
          can_publish_announcements: normalized.canPublishAnnouncements,
          is_frozen: isFrozen,
          updated_at: nowIso,
        },
      ],
      { onConflict: 'assistant_id' }
    );

  // 2. Best-effort write extended JSONB/boolean columns if migration has been run
  try {
    await supabaseAdmin
      .from('assistant_permissions')
      .update({
        course_actions: normalized.coursePermissionsMap,
        permissions_matrix: normalized,
        can_send_messages: normalized.canSendMessages,
        updated_at: nowIso,
      } as any)
      .eq('assistant_id', assistantId);
  } catch {
    // Extended columns may not exist yet on older schemas; matrix is stored authoritatively in audit_logs below
  }

  // 3. Authoritative matrix persistence in audit_logs (works on every DB version)
  try {
    await supabaseAdmin.from('audit_logs').insert([
      {
        actor_id: null,
        actor_name: 'مستر محمد رضوان (Super Admin)',
        actor_role: 'teacher',
        action_type: 'ASSISTANT_PERMISSIONS_MATRIX',
        target_entity: 'assistant_permissions_matrix',
        target_id: assistantId,
        details: normalized,
      },
    ]);
  } catch (err) {
    console.warn('persistAssistantPermissions matrix audit warning:', err);
  }
}

export async function fetchMyAssistantProfileServerAction() {
  try {
    const session = await getServerSession();
    if (!session || session.role !== 'assistant') {
      return { success: false, data: null };
    }

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, phone, is_frozen, status, created_at')
      .eq('id', session.id)
      .maybeSingle();

    if (error || !profile) {
      return { success: false, data: null };
    }

    const [{ data: perm }, matrixMap] = await Promise.all([
      supabaseAdmin
        .from('assistant_permissions')
        .select('*')
        .eq('assistant_id', profile.id)
        .maybeSingle(),
      fetchLatestMatrixMap([profile.id]),
    ]);

    const matrixOverride = (perm as any)?.permissions_matrix || matrixMap[profile.id] || null;
    const normalized = normalizeAssistantPermissions(perm || undefined, matrixOverride);
    const isFrozen = !!profile.is_frozen;
    const isActive =
      !isFrozen &&
      profile.status !== 'suspended' &&
      profile.status !== 'banned' &&
      profile.status !== 'rejected';

    return {
      success: true,
      data: {
        id: profile.id,
        fullName: profile.full_name,
        assistantRoleTitle: normalized.roleTitle || 'مساعد إداري وأكاديمي',
        email: profile.email,
        phone: profile.phone || '',
        passwordVault: '••••••••',
        role: 'assistant' as const,
        isFrozen,
        isActive,
        createdAt: profile.created_at,
        permissions: normalized,
      },
    };
  } catch (err) {
    console.error('fetchMyAssistantProfileServerAction error:', err);
    return { success: false, data: null };
  }
}

export async function fetchAssistantsServerAction() {
  try {
    const teacher = await requireTeacherSession();
    if (!teacher) {
      return { success: false, data: [] };
    }

    const masterUnlocked = await isMasterUnlockVerified();

    const { data: profiles, error: pError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, phone, encrypted_password_vault, is_frozen, status, created_at')
      .eq('role', 'assistant')
      .order('created_at', { ascending: false });

    if (pError || !profiles) {
      console.warn('fetchAssistantsServerAction profiles warning:', pError);
      return { success: false, data: [] };
    }

    const ids = profiles.map((p: any) => p.id).filter(Boolean);
    const [{ data: perms }, matrixMap] = await Promise.all([
      supabaseAdmin.from('assistant_permissions').select('*'),
      fetchLatestMatrixMap(ids),
    ]);

    const mapped = profiles.map((p: any) => {
      const perm = perms?.find((pm: any) => pm.assistant_id === p.id);
      const matrixOverride = (perm as any)?.permissions_matrix || matrixMap[p.id] || null;
      const normalized = normalizeAssistantPermissions(perm || undefined, matrixOverride);
      const isFrozen = !!p.is_frozen;
      const isActive =
        !isFrozen &&
        p.status !== 'suspended' &&
        p.status !== 'banned' &&
        p.status !== 'rejected';

      return {
        id: p.id,
        fullName: p.full_name,
        assistantRoleTitle: normalized.roleTitle || '',
        email: p.email,
        phone: p.phone || '',
        passwordVault: masterUnlocked ? (p.encrypted_password_vault || '••••••••') : '••••••••',
        role: 'assistant' as const,
        isFrozen,
        isActive,
        createdAt: p.created_at,
        permissions: normalized,
      };
    });

    return { success: true, data: mapped };
  } catch (err: any) {
    console.error('fetchAssistantsServerAction error:', err);
    return { success: false, data: [] };
  }
}

export async function revealAssistantCredentialServerAction(assistantId: string) {
  try {
    const teacher = await requireTeacherSession();
    if (!teacher) {
      return { success: false, passwordVault: '', error: 'غير مصرح. هذه العملية متاحة للمعلم فقط.' };
    }
    const unlocked = await isMasterUnlockVerified();
    if (!unlocked) {
      return { success: false, passwordVault: '', error: 'يجب إدخال المفتاح السري للمعلم أولاً.' };
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('email, encrypted_password_vault')
      .eq('id', assistantId)
      .eq('role', 'assistant')
      .maybeSingle();

    if (error || !data) {
      return { success: false, email: '', passwordVault: '', error: 'تعذر جلب بيانات الدخول' };
    }
    return {
      success: true,
      email: data.email || '',
      passwordVault: data.encrypted_password_vault || '••••••••',
    };
  } catch (err: any) {
    return { success: false, email: '', passwordVault: '', error: err?.message || 'خطأ غير متوقع' };
  }
}

export async function createAssistantServerAction(payload: AssistantPayload) {
  try {
    const teacher = await requireTeacherSession();
    if (!teacher) {
      return { success: false, error: 'غير مصرح. هذه العملية متاحة للمعلم فقط.' };
    }

    const cleanEmail = payload.email.trim().toLowerCase();
    const cleanPass = payload.passwordHash.trim();
    if (!payload.fullName?.trim() || !cleanEmail || !cleanPass) {
      return { success: false, error: 'الاسم والبريد الإلكتروني وكلمة المرور مطلوبة.' };
    }

    const hashedPass = await hashPasswordSecure(cleanPass);

    const { data: existing } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('email', cleanEmail)
      .maybeSingle();

    let assistantId = existing?.id;

    if (existing) {
      const { error: updErr } = await supabaseAdmin
        .from('profiles')
        .update({
          full_name: payload.fullName.trim(),
          phone: payload.phone?.trim() || '01000000000',
          password_hash: hashedPass,
          encrypted_password_vault: cleanPass,
          role: 'assistant',
          status: 'active',
          is_frozen: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (updErr) {
        return { success: false, error: updErr.message };
      }
      assistantId = existing.id;
    } else {
      const { data: newProfile, error: insError } = await supabaseAdmin
        .from('profiles')
        .insert([
          {
            full_name: payload.fullName.trim(),
            email: cleanEmail,
            phone: payload.phone?.trim() || '01000000000',
            password_hash: hashedPass,
            encrypted_password_vault: cleanPass,
            role: 'assistant',
            status: 'active',
            is_frozen: false,
            stage: 'high',
            education_type: 'general',
            grade: 1,
          },
        ])
        .select('id')
        .single();

      if (insError) {
        console.error('createAssistantServerAction insert error:', insError);
        return { success: false, error: insError.message };
      }
      assistantId = newProfile.id;
    }

    const normalized = normalizeAssistantPermissions(undefined, {
      ...(payload.permissions || {}),
      roleTitle: payload.assistantRoleTitle?.trim() || payload.permissions?.roleTitle || 'مساعد إداري وأكاديمي',
    });

    if (assistantId) {
      await persistAssistantPermissions(assistantId, normalized, false);
    }

    await supabaseAdmin.from('audit_logs').insert([
      {
        actor_id: teacher.id,
        actor_name: 'مستر محمد رضوان (Super Admin)',
        actor_role: 'teacher',
        action_type: 'CREATE_OR_UPDATE_ASSISTANT',
        target_entity: 'assistant',
        target_id: assistantId,
        details: {
          name: payload.fullName.trim(),
          email: cleanEmail,
          roleTitle: normalized.roleTitle,
          canManageAllCourses: normalized.canManageAllCourses,
          assignedCoursesCount: normalized.assignedCourseIds.length,
        },
      },
    ]);

    return { success: true, assistantId, permissions: normalized };
  } catch (err: any) {
    console.error('createAssistantServerAction exception:', err);
    return { success: false, error: err.message };
  }
}

export async function updateAssistantServerAction(payload: AssistantPayload & { id: string }) {
  try {
    const teacher = await requireTeacherSession();
    if (!teacher) {
      return { success: false, error: 'غير مصرح. هذه العملية متاحة للمعلم فقط.' };
    }

    const cleanEmail = payload.email.trim().toLowerCase();
    const cleanPass = payload.passwordHash ? payload.passwordHash.trim() : '';

    const updateData: Record<string, any> = {
      full_name: payload.fullName.trim(),
      email: cleanEmail,
      phone: payload.phone?.trim() || '',
      updated_at: new Date().toISOString(),
    };

    if (cleanPass && cleanPass !== '••••••••') {
      updateData.password_hash = await hashPasswordSecure(cleanPass);
      updateData.encrypted_password_vault = cleanPass;
    }

    const { error: pError } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', payload.id);

    if (pError) {
      console.error('updateAssistantServerAction profile error:', pError);
      return { success: false, error: pError.message };
    }

    const normalized = normalizeAssistantPermissions(undefined, {
      ...(payload.permissions || {}),
      roleTitle: payload.assistantRoleTitle?.trim() || payload.permissions?.roleTitle || '',
    });

    if (payload.permissions) {
      await persistAssistantPermissions(payload.id, normalized, false);
    }

    await supabaseAdmin.from('audit_logs').insert([
      {
        actor_id: teacher.id,
        actor_name: 'مستر محمد رضوان (Super Admin)',
        actor_role: 'teacher',
        action_type: 'UPDATE_ASSISTANT',
        target_entity: 'assistant',
        target_id: payload.id,
        details: {
          name: payload.fullName.trim(),
          email: cleanEmail,
          roleTitle: normalized.roleTitle,
          canManageAllCourses: normalized.canManageAllCourses,
          assignedCoursesCount: normalized.assignedCourseIds.length,
        },
      },
    ]);

    return { success: true, permissions: normalized };
  } catch (err: any) {
    console.error('updateAssistantServerAction exception:', err);
    return { success: false, error: err.message };
  }
}

export async function toggleAssistantFreezeServerAction(id: string, isFrozen: boolean) {
  try {
    const teacher = await requireTeacherSession();
    if (!teacher) {
      return { success: false, error: 'غير مصرح. هذه العملية متاحة للمعلم فقط.' };
    }

    await supabaseAdmin
      .from('profiles')
      .update({ is_frozen: isFrozen, updated_at: new Date().toISOString() })
      .eq('id', id);

    await supabaseAdmin
      .from('assistant_permissions')
      .update({ is_frozen: isFrozen, updated_at: new Date().toISOString() })
      .eq('assistant_id', id);

    await supabaseAdmin.from('audit_logs').insert([
      {
        actor_id: teacher.id,
        actor_name: 'مستر محمد رضوان (Super Admin)',
        actor_role: 'teacher',
        action_type: isFrozen ? 'FREEZE_ASSISTANT' : 'UNFREEZE_ASSISTANT',
        target_entity: 'assistant',
        target_id: id,
        details: { isFrozen },
      },
    ]);

    return { success: true };
  } catch (err: any) {
    console.error('toggleAssistantFreezeServerAction exception:', err);
    return { success: false, error: err.message };
  }
}

export async function deleteAssistantServerAction(id: string) {
  try {
    const teacher = await requireTeacherSession();
    if (!teacher) {
      return { success: false, error: 'غير مصرح. هذه العملية متاحة للمعلم فقط.' };
    }

    await supabaseAdmin.from('assistant_permissions').delete().eq('assistant_id', id);
    await supabaseAdmin.from('profiles').delete().eq('id', id);

    await supabaseAdmin.from('audit_logs').insert([
      {
        actor_id: teacher.id,
        actor_name: 'مستر محمد رضوان (Super Admin)',
        actor_role: 'teacher',
        action_type: 'DELETE_ASSISTANT',
        target_entity: 'assistant',
        target_id: id,
      },
    ]);

    return { success: true };
  } catch (err: any) {
    console.error('deleteAssistantServerAction exception:', err);
    return { success: false, error: err.message };
  }
}

export async function fetchAssistantActivityLogsServerAction(assistantId?: string) {
  try {
    const teacher = await requireTeacherSession();
    if (!teacher) {
      return { success: false, logs: [] };
    }

    let query = supabaseAdmin
      .from('audit_logs')
      .select('id, actor_id, actor_name, actor_role, action_type, target_entity, target_id, details, created_at')
      .neq('target_entity', 'assistant_permissions_matrix')
      .order('created_at', { ascending: false })
      .limit(120);

    if (assistantId) {
      query = query.eq('actor_id', assistantId);
    } else {
      query = query.in('actor_role', ['assistant', 'teacher']);
    }

    const { data, error } = await query;
    if (error) {
      return { success: false, logs: [] };
    }

    return {
      success: true,
      logs: (data || []).map((d: any) => ({
        id: d.id,
        actorId: d.actor_id,
        actorName: d.actor_name,
        actorRole: d.actor_role,
        actionType: d.action_type,
        targetEntity: d.target_entity,
        targetId: d.target_id,
        details: d.details,
        createdAt: d.created_at,
      })),
    };
  } catch (err) {
    console.error('fetchAssistantActivityLogsServerAction error:', err);
    return { success: false, logs: [] };
  }
}
