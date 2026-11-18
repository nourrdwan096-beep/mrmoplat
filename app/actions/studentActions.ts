'use server';

import { supabaseAdmin } from '@/lib/supabaseServer';
import { normalizeEasternArabicDigits, cleanEgyptianPhone, maskEmail } from '@/lib/utils';
import { hashPasswordSecure, verifyPasswordSecure, isPasswordHash } from '@/lib/passwordCrypto';
import {
  getServerSession,
  requireStaffSession,
  requireTeacherSession,
  requireStudentOrStaffSession,
  setServerSessionCookie,
  clearServerSessionCookie,
  verifyTeacherCredentialsServer,
  verifyMasterKeyServer,
  setMasterUnlockCookie,
  isMasterUnlockVerified,
  getTeacherProfilePayload,
  isTeacherEmail,
} from '@/lib/serverAuth';

export async function verifyMasterKeyAction(secretKey: string) {
  const session = await requireStaffSession();
  if (!session) {
    return { success: false, message: 'غير مصرح. يرجى تسجيل الدخول كمعلم أو مساعد.' };
  }
  const isValid = verifyMasterKeyServer(secretKey);
  if (!isValid) {
    return { success: false, message: 'كلمة السر الرئيسية غير صحيحة! يرجى إدخال المفتاح السري المعتمد.' };
  }
  if (session.isTeacher) {
    await setMasterUnlockCookie();
  }
  return { success: true };
}

export async function logoutServerAction() {
  await clearServerSessionCookie();
  return { success: true };
}

export async function getVerifiedSessionAction() {
  const session = await getServerSession();
  if (!session) {
    return { authenticated: false, user: null };
  }
  return {
    authenticated: true,
    user: {
      id: session.id,
      role: session.role,
      email: session.email,
      fullName: session.fullName,
      status: session.status,
    },
  };
}

function toSafeDeviceAccount(p: any) {
  return {
    id: p.id,
    fullName: p.full_name,
    email: p.email,
    phone: p.phone,
    stage: p.stage,
    grade: p.grade,
    educationType: p.education_type || 'general',
    status: p.status as 'pending_review' | 'active' | 'rejected' | 'banned',
    createdAt: p.created_at,
    needsOtpActivation: Boolean(p.whatsapp_otp && !p.otp_verified),
  };
}

export async function checkDeviceStatusAction(
  deviceFingerprint: string, 
  _email?: string, 
  _phone?: string,
  candidateFingerprints: string[] = [],
  _studentId?: string
) {
  try {
    const cleanFp = (deviceFingerprint || '').trim();

    // Consolidate all fingerprint candidates into a unique array, strictly filtering out legacy generic screen dimensions
    const allFps = Array.from(
      new Set([cleanFp, ...(Array.isArray(candidateFingerprints) ? candidateFingerprints : [])]
        .map(f => (f || '').trim())
        .filter(f => Boolean(f) && !/^DEV-(MOBILE|DESKTOP|TABLET)-(ANDROID|WINDOWS|IOS|LINUX|OTHER)-\d+X\d+/i.test(f))
      )
    );

    // 1. Strict Check: Are any candidate fingerprints in banned_devices?
    if (allFps.length > 0) {
      const { data: bannedList } = await supabaseAdmin
        .from('banned_devices')
        .select('*')
        .in('device_fingerprint', allFps)
        .limit(1);

      if (bannedList && bannedList.length > 0) {
        return {
          isBanned: true,
          isRegistered: false,
          canRegisterNew: false,
          blockReason: 'DEVICE_BANNED' as const,
          hasApprovedAccounts: false,
          approvedAccounts: [],
          pendingAccount: null,
          reason: bannedList[0].reason || 'تم حظر هذا الجهاز نهائياً من قبل إدارة المنصة',
          student: null,
          siblingAccounts: [],
        };
      }
    }

    // 2. Query ALL student profiles linked to this physical device via primary_device_fingerprint OR student_devices
    const matchedProfileMap = new Map<string, any>();

    if (allFps.length > 0) {
      const { data: profilesByFp } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email, phone, stage, grade, education_type, status, ban_reason, whatsapp_otp, otp_verified, created_at, primary_device_fingerprint')
        .eq('role', 'student')
        .neq('status', 'rejected')
        .in('primary_device_fingerprint', allFps)
        .order('created_at', { ascending: false });

      if (profilesByFp) {
        profilesByFp.forEach((p: any) => matchedProfileMap.set(p.id, p));
      }

      const { data: devMatches } = await supabaseAdmin
        .from('student_devices')
        .select('student_id')
        .in('device_fingerprint', allFps)
        .limit(20);

      if (devMatches && devMatches.length > 0) {
        const sIds = Array.from(new Set(devMatches.map((d: any) => d.student_id).filter(Boolean)));
        if (sIds.length > 0) {
          const { data: ps } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name, email, phone, stage, grade, education_type, status, ban_reason, whatsapp_otp, otp_verified, created_at, primary_device_fingerprint')
            .in('id', sIds)
            .eq('role', 'student')
            .neq('status', 'rejected')
            .order('created_at', { ascending: false });

          if (ps) {
            ps.forEach((p: any) => matchedProfileMap.set(p.id, p));
          }
        }
      }
    }

    const allMatched = Array.from(matchedProfileMap.values()).sort(
      (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );

    // 3. Enforce ban if any linked account is banned
    const bannedProfile = allMatched.find(p => p.status === 'banned');
    if (bannedProfile) {
      return {
        isBanned: true,
        isRegistered: false,
        canRegisterNew: false,
        blockReason: 'DEVICE_BANNED' as const,
        hasApprovedAccounts: false,
        approvedAccounts: [],
        pendingAccount: null,
        reason: bannedProfile.ban_reason || 'تم حظر هذا الجهاز نظراً لوجود حساب محظور مسجل به.',
        student: null,
        siblingAccounts: allMatched.map(toSafeDeviceAccount),
      };
    }

    // 4. Separate pending_review vs approved (active) accounts
    const pendingAccounts = allMatched.filter(p => p.status === 'pending_review');
    const approvedAccounts = allMatched.filter(p => p.status === 'active');

    const safePending = pendingAccounts.map(toSafeDeviceAccount);
    const safeApproved = approvedAccounts.map(toSafeDeviceAccount);

    // Hard block rule: If ANY linked account is still pending_review, student CANNOT submit another account
    const hasPending = safePending.length > 0;
    const primaryDisplayStudent = safePending[0] || safeApproved[0] || null;

    return {
      isBanned: false,
      isRegistered: safeApproved.length > 0 || safePending.length > 0,
      canRegisterNew: !hasPending,
      blockReason: hasPending ? ('PENDING_ACCOUNT_EXISTS' as const) : null,
      hasApprovedAccounts: safeApproved.length > 0,
      approvedAccounts: safeApproved,
      pendingAccount: safePending[0] || null,
      student: primaryDisplayStudent,
      siblingAccounts: [...safePending, ...safeApproved],
      deviceFingerprint: cleanFp,
    };
  } catch (err) {
    console.error('Exception checking device status:', err);
    return {
      isBanned: false,
      isRegistered: false,
      canRegisterNew: true,
      blockReason: null,
      hasApprovedAccounts: false,
      approvedAccounts: [],
      pendingAccount: null,
      student: null,
      siblingAccounts: [],
    };
  }
}

export async function fetchStudentsAction(masterKey?: string) {
  try {
    const session = await requireStaffSession();
    if (!session) {
      return [];
    }

    const cleanKey = (masterKey || '').trim();
    const hasCookieUnlock = await isMasterUnlockVerified();
    const canRevealEmails =
      session.isTeacher && (hasCookieUnlock || Boolean(cleanKey && verifyMasterKeyServer(cleanKey)));

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, phone, parent_phone, stage, grade, education_type, status, primary_device_fingerprint, created_at, avatar_url, whatsapp_otp, ban_reason')
      .eq('role', 'student')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching students:', error);
      return [];
    }

    // Build device hardware fingerprint map to cross-reference shared device accounts
    const fpMap: Record<string, Array<{ id: string; fullName: string; phone: string; status: string; stage: string; grade: number }>> = {};
    data.forEach((d: any) => {
      const fp = (d.primary_device_fingerprint || '').trim();
      if (fp) {
        if (!fpMap[fp]) fpMap[fp] = [];
        fpMap[fp].push({
          id: d.id,
          fullName: d.full_name,
          phone: d.phone,
          status: d.status,
          stage: d.stage,
          grade: d.grade,
        });
      }
    });

    return data.map((d: any) => {
      const fp = (d.primary_device_fingerprint || '').trim();
      const linkedAccounts = fp ? (fpMap[fp] || []).filter(item => item.id !== d.id) : [];

      return {
        id: d.id,
        fullName: d.full_name,
        email: canRevealEmails ? d.email : maskEmail(d.email),
        phone: d.phone,
        parentPhone: d.parent_phone,
        stage: d.stage,
        grade: d.grade,
        educationType: d.education_type,
        status: d.status,
        passwordVault: null,
        isPasswordEncrypted: true,
        deviceFingerprint: d.primary_device_fingerprint,
        createdAt: d.created_at,
        avatarUrl: d.avatar_url,
        whatsapp_otp: d.whatsapp_otp,
        banReason: d.ban_reason,
        linkedDeviceAccounts: linkedAccounts,
      };
    });
  } catch (err) {
    console.error('Exception fetching students:', err);
    return [];
  }
}

/**
 * Server-Authoritative Contact Email Revealer for Super Admin (Teacher).
 * Zero-Knowledge Security: Student passwords are NEVER decrypted or returned anywhere.
 */
export async function revealStudentPasswordsAction(masterKey: string) {
  try {
    const session = await requireTeacherSession();
    if (!session) {
      return { success: false, message: 'غير مصرح. كشف البريد الإلكتروني متاح للمعلم فقط.' };
    }

    const isKeyValid = verifyMasterKeyServer(masterKey);
    if (!isKeyValid) {
      return { success: false, message: 'المفتاح السري غير صحيح.' };
    }

    await setMasterUnlockCookie();

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('role', 'student');

    if (error) {
      return { success: false, message: 'تعذر جلب بيانات التواصل' };
    }

    const emailMap: Record<string, string> = {};
    (data || []).forEach((d: any) => {
      emailMap[d.id] = d.email || '';
    });

    return { success: true, emailMap, vaultMap: {} as Record<string, string> };
  } catch (err: any) {
    return { success: false, message: err.message || 'حدث خطأ غير متوقع' };
  }
}

export async function updateStudentStatusAction(
  studentId: string, 
  status: 'active' | 'rejected' | 'banned' | 'pending_review',
  otp?: string,
  banReason?: string
) {
  try {
    const session = await requireStaffSession();
    if (!session || (!session.isTeacher && !session.assistantPermissions?.can_approve_registrations && !session.assistantPermissions?.can_manage_students)) {
      return false;
    }

    const updateData: any = { status };
    if (otp) {
      updateData.whatsapp_otp = otp;
      updateData.otp_verified = false;
    } else if (status === 'active') {
      updateData.otp_verified = true;
    }

    if (status === 'banned') {
      updateData.ban_reason = banReason || 'تم حظر الحساب والأجهزة نهائياً من قبل إدارة المنصة';
    }

    const { data: updatedProfile, error } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', studentId)
      .select('id, primary_device_fingerprint, full_name, email, phone')
      .single();

    if (error) {
      console.error(`Error updating student ${studentId} to ${status}:`, error);
      return false;
    }

    // Collect all fingerprints & hardwareCoreIds across student_devices and course_device_bindings
    const allFingerprints = await collectStudentAllFingerprints(studentId, updatedProfile?.primary_device_fingerprint);

    // If banned, lock all device fingerprints in banned_devices table
    if (status === 'banned' && allFingerprints.length > 0) {
      const banRecords = allFingerprints.map(fp => ({
        device_fingerprint: fp,
        reason: banReason || `حظر الطالب: ${updatedProfile.full_name} (${updatedProfile.phone})`,
      }));
      await supabaseAdmin
        .from('banned_devices')
        .upsert(banRecords, { onConflict: 'device_fingerprint' });

      // Add audit log
      try {
        await supabaseAdmin.from('audit_logs').insert([{
          actor_name: 'إدارة المنصة (المعلم)',
          actor_role: 'teacher',
          action_type: 'STUDENT_BANNED_HARDWARE_LOCK',
          target_entity: 'profiles',
          target_id: studentId,
          details: {
            name: updatedProfile.full_name,
            phone: updatedProfile.phone,
            reason: banReason,
            lockedDevicesCount: allFingerprints.length,
          },
        }]);
      } catch {}
    }

    // If unbanned or activated, remove all associated devices from banned_devices
    if (status === 'active' && allFingerprints.length > 0) {
      await supabaseAdmin
        .from('banned_devices')
        .delete()
        .in('device_fingerprint', allFingerprints);

      // Add audit log
      try {
        await supabaseAdmin.from('audit_logs').insert([{
          actor_name: 'إدارة المنصة (المعلم)',
          actor_role: 'teacher',
          action_type: 'STUDENT_UNBANNED_ACTIVATED',
          target_entity: 'profiles',
          target_id: studentId,
          details: {
            name: updatedProfile.full_name,
            phone: updatedProfile.phone,
            unlockedDevicesCount: allFingerprints.length,
          },
        }]);
      } catch {}
    }

    // If rejected, unbind primary_device_fingerprint, student_devices, and course bindings
    if (status === 'rejected') {
      await supabaseAdmin.from('student_devices').delete().eq('student_id', studentId);
      await supabaseAdmin
        .from('audit_logs')
        .delete()
        .eq('target_entity', 'course_device_bindings')
        .eq('actor_id', studentId);
      await supabaseAdmin
        .from('profiles')
        .update({ primary_device_fingerprint: null })
        .eq('id', studentId);
    }

    return true;
  } catch (err) {
    console.error('Exception updating student status:', err);
    return false;
  }
}

export async function deleteStudentAction(studentId: string) {
  try {
    const session = await requireStaffSession();
    if (!session || (!session.isTeacher && !session.assistantPermissions?.can_manage_students)) {
      return { success: false, message: 'غير مصرح لك بحذف الطلاب.' };
    }

    const cleanId = (studentId || '').trim();
    if (!cleanId) return { success: false, message: 'معرف الطالب غير صالح' };

    // 1. Fetch student first to obtain their fingerprints and name
    const { data: student } = await supabaseAdmin
      .from('profiles')
      .select('id, primary_device_fingerprint, full_name, phone')
      .eq('id', cleanId)
      .maybeSingle();

    if (!student) {
      return { success: true, message: 'الطالب غير موجود أو تم حذفه بالفعل' };
    }

    // 2. Collect any registered devices to release any bans on them
    const fingerprintsToRelease = await collectStudentAllFingerprints(cleanId, student.primary_device_fingerprint);

    if (fingerprintsToRelease.length > 0) {
      await supabaseAdmin
        .from('banned_devices')
        .delete()
        .in('device_fingerprint', fingerprintsToRelease);
    }

    // 3. Delete related records
    await supabaseAdmin.from('student_devices').delete().eq('student_id', cleanId);
    await supabaseAdmin
      .from('audit_logs')
      .delete()
      .eq('target_entity', 'course_device_bindings')
      .eq('actor_id', cleanId);
    await supabaseAdmin.from('student_item_progress').delete().eq('student_id', cleanId);
    await supabaseAdmin.from('course_enrollments').delete().eq('student_id', cleanId);
    await supabaseAdmin.from('support_tickets').delete().eq('student_id', cleanId);
    await supabaseAdmin.from('student_sketch_notes').delete().eq('student_id', cleanId);
    await supabaseAdmin.from('student_study_schedules').delete().eq('student_id', cleanId);

    // 3. Delete the profile itself
    const { error } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', cleanId);

    if (error) {
      console.error('Error deleting student profile:', error);
      return { success: false, message: error.message };
    }

    // 4. Audit Log
    try {
      await supabaseAdmin.from('audit_logs').insert([{
        actor_name: 'إدارة المنصة (المعلم)',
        actor_role: 'teacher',
        action_type: 'STUDENT_DELETED_PERMANENTLY',
        target_entity: 'profiles',
        target_id: cleanId,
        details: {
          name: student.full_name,
          phone: student.phone,
          unlockedDevice: true,
        },
      }]);
    } catch {}

    return { success: true };
  } catch (err: any) {
    console.error('Exception deleting student:', err);
    return { success: false, message: err.message || 'حدث خطأ أثناء حذف الطالب' };
  }
}

/**
 * Reset student hardware device lock (globally or for a specific course)
 * allowing student to re-bind physical devices without deleting account or academic progress.
 */
export async function resetStudentDeviceLockAction(studentId: string, courseId?: string) {
  try {
    const session = await requireStaffSession();
    if (!session || (!session.isTeacher && !session.assistantPermissions?.can_manage_students)) {
      return { success: false, message: 'غير مصرح لك بفك قيد أجهزة الطلاب.' };
    }

    const cleanId = (studentId || '').trim();
    const cleanCourseId = (courseId || '').trim();
    if (!cleanId) return { success: false, message: 'معرف الطالب غير صالح' };

    const { data: student } = await supabaseAdmin
      .from('profiles')
      .select('id, primary_device_fingerprint, full_name, phone')
      .eq('id', cleanId)
      .maybeSingle();

    if (!student) {
      return { success: false, message: 'الطالب غير موجود' };
    }

    if (cleanCourseId) {
      // Per-course device reset
      const { data: courseBindings } = await supabaseAdmin
        .from('audit_logs')
        .select('id, details')
        .eq('target_entity', 'course_device_bindings')
        .eq('actor_id', cleanId)
        .eq('target_id', cleanCourseId);

      const courseFps = new Set<string>();
      (courseBindings || []).forEach((row: any) => {
        const devs = Array.isArray(row.details?.devices) ? row.details.devices : [];
        devs.forEach((d: any) => {
          if (d?.fingerprint) courseFps.add(d.fingerprint);
          if (d?.hardwareCoreId) courseFps.add(d.hardwareCoreId);
          if (Array.isArray(d?.candidateFingerprints)) {
            d.candidateFingerprints.forEach((f: string) => f && courseFps.add(f));
          }
        });
      });

      if (courseFps.size > 0) {
        await supabaseAdmin
          .from('banned_devices')
          .delete()
          .in('device_fingerprint', Array.from(courseFps));
      }

      await supabaseAdmin
        .from('audit_logs')
        .delete()
        .eq('target_entity', 'course_device_bindings')
        .eq('actor_id', cleanId)
        .eq('target_id', cleanCourseId);

      try {
        await supabaseAdmin.from('audit_logs').insert([{
          actor_id: session.id,
          actor_name: session.fullName || 'إدارة المنصة (المعلم)',
          actor_role: session.role,
          action_type: 'STUDENT_COURSE_DEVICE_LOCK_RESET',
          target_entity: 'profiles',
          target_id: cleanId,
          details: {
            name: student.full_name,
            phone: student.phone,
            courseId: cleanCourseId,
          },
        }]);
      } catch {}

      return { success: true, message: 'تم فك قيد أجهزة الطالب في هذا الكورس بنجاح! يمكنه الآن تصفير الأجهزة وإعادة الربط.' };
    }

    // Full reset across login devices & all enrolled courses
    const fingerprintsToRelease = await collectStudentAllFingerprints(cleanId, student.primary_device_fingerprint);

    if (fingerprintsToRelease.length > 0) {
      await supabaseAdmin
        .from('banned_devices')
        .delete()
        .in('device_fingerprint', fingerprintsToRelease);
    }

    await supabaseAdmin.from('student_devices').delete().eq('student_id', cleanId);
    await supabaseAdmin
      .from('audit_logs')
      .delete()
      .eq('target_entity', 'course_device_bindings')
      .eq('actor_id', cleanId);

    await supabaseAdmin
      .from('profiles')
      .update({
        primary_device_fingerprint: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', cleanId);

    try {
      await supabaseAdmin.from('audit_logs').insert([{
        actor_id: session.id,
        actor_name: session.fullName || 'إدارة المنصة (المعلم)',
        actor_role: session.role,
        action_type: 'STUDENT_DEVICE_LOCK_RESET',
        target_entity: 'profiles',
        target_id: cleanId,
        details: {
          name: student.full_name,
          phone: student.phone,
          resetDevicesCount: fingerprintsToRelease.length,
        },
      }]);
    } catch {}

    return { success: true, message: 'تم فك قيد جميع أجهزة الطالب وكورساته بنجاح! يمكن للطالب الآن الدخول والربط من جديد.' };
  } catch (err: any) {
    console.error('Exception resetting student device lock:', err);
    return { success: false, message: err.message || 'حدث خطأ أثناء فك قيد الجهاز' };
  }
}

/**
 * Direct registration of a student by Teacher/Admin with custom credentials and instant activation
 */
export async function createStudentByTeacherAction(data: {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  stage: string;
  grade: number;
  educationType: string;
  parentPhone?: string;
}) {
  try {
    const session = await requireStaffSession();
    if (!session || (!session.isTeacher && !session.assistantPermissions?.can_manage_students)) {
      return { success: false, message: 'غير مصرح لك بإنشاء حسابات الطلاب.' };
    }

    const cleanEmail = (data.email || '').trim().toLowerCase();
    const cleanPhone = (data.phone || '').trim();
    const cleanPass = (data.password || '').trim();

    if (!data.fullName || !cleanEmail || !cleanPhone || !cleanPass) {
      return { success: false, message: 'جميع البيانات الأساسية مطلوبة (الاسم، البريد، الهاتف، كلمة المرور)' };
    }

    // Check if email already exists
    const { data: existingEmail } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (existingEmail) {
      return { success: false, message: `البريد الإلكتروني مسجل بالفعل باسم (${existingEmail.full_name})` };
    }

    // Check if phone already exists
    const { data: existingPhone } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, phone')
      .eq('phone', cleanPhone)
      .maybeSingle();

    if (existingPhone) {
      return { success: false, message: `رقم الهاتف مسجل بالفعل باسم (${existingPhone.full_name})` };
    }

    let carrier = 'Vodafone';
    if (cleanPhone.startsWith('011')) carrier = 'Etisalat';
    else if (cleanPhone.startsWith('012')) carrier = 'Orange';
    else if (cleanPhone.startsWith('015')) carrier = 'WE';

    const hashedPassword = await hashPasswordSecure(cleanPass);

    const insertPayload = {
      role: 'student',
      full_name: data.fullName.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      parent_phone: data.parentPhone?.trim() || null,
      phone_carrier: carrier,
      password_hash: hashedPassword,
      encrypted_password_vault: null,
      avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent(data.fullName),
      stage: data.stage === 'middle' ? 'middle' : 'high',
      education_type: data.educationType === 'azhar' ? 'azhar' : 'general',
      grade: data.grade || 1,
      status: 'active',
      otp_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: insertedUser, error } = await supabaseAdmin
      .from('profiles')
      .insert([insertPayload])
      .select('id, full_name, email, phone, stage, grade, status')
      .single();

    if (error) {
      return { success: false, message: 'خطأ في قاعدة البيانات: ' + error.message };
    }

    // Audit Log
    try {
      await supabaseAdmin.from('audit_logs').insert([{
        actor_name: 'إدارة المنصة (المعلم)',
        actor_role: 'teacher',
        action_type: 'STUDENT_MANUAL_CREATED_BY_TEACHER',
        target_entity: 'profiles',
        target_id: insertedUser?.id,
        details: {
          name: data.fullName,
          email: cleanEmail,
          phone: cleanPhone,
        },
      }]);
    } catch {}

    return { 
      success: true, 
      student: insertedUser,
      message: 'تم تسجيل وتفعيل حساب الطالب بنجاح' 
    };
  } catch (err: any) {
    console.error('Exception creating student by teacher:', err);
    return { success: false, message: err.message || 'حدث خطأ غير متوقع' };
  }
}

export async function checkStudentContactAction(
  phone?: string, 
  email?: string, 
  deviceFingerprint?: string
) {
  try {
    const cleanPhone = phone?.trim() ? cleanEgyptianPhone(phone) : '';
    const cleanEmail = email?.trim() ? normalizeEasternArabicDigits(email).trim().toLowerCase() : '';
    const cleanFp = deviceFingerprint?.trim();

    if (!cleanPhone && !cleanEmail) {
      return { exists: false };
    }

    let p: any = null;
    let matchedField: 'email' | 'phone' | null = null;

    if (cleanEmail) {
      const { data: byEmail } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (byEmail) {
        p = byEmail;
        matchedField = 'email';
      }
    }

    if (!p && cleanPhone) {
      const { data: byPhone } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (byPhone) {
        p = byPhone;
        matchedField = 'phone';
      }
    }

    if (!p) {
      return { exists: false };
    }

    // If it's a teacher or assistant
    if (p.role === 'teacher' || p.role === 'super_admin' || p.role === 'assistant') {
      return {
        exists: true,
        isStaff: true,
        matchedField,
        message: 'هذا البريد / الرقم مسجل بالفعل كحساب إداري في المنصة. يرجى تسجيل الدخول من صفحة الدخول.'
      };
    }

    return {
      exists: true,
      isStaff: false,
      matchedField,
      student: {
        id: p.id,
        fullName: p.full_name,
        status: p.status,
        needsOtpActivation: Boolean(p.whatsapp_otp && !p.otp_verified),
        otp_verified: Boolean(p.otp_verified),
      }
    };
  } catch (err) {
    console.error('Check student contact error:', err);
    return { exists: false };
  }
}

interface IncomingHardwareContext {
  name?: string;
  browser?: string;
  hardwareCoreId?: string;
  candidateFingerprints?: string[];
  os?: string;
  deviceType?: 'mobile' | 'tablet' | 'desktop' | string;
  gpuSummary?: string;
  screenSummary?: string;
  timezone?: string;
}

interface StoredDeviceMetadata {
  hardwareCoreId?: string;
  candidateFingerprints?: string[];
  os?: string;
  deviceType?: string;
  gpuSummary?: string;
  screenSummary?: string;
  timezone?: string;
  browsersSeen: string[];
}

const LEGACY_DIM_REGEX = /^DEV-(MOBILE|DESKTOP|TABLET)-(ANDROID|WINDOWS|IOS|LINUX|OTHER)-\d+X\d+/i;
const GENERIC_GPU_TOKENS = new Set(['', 'NO-WEBGL', 'WEBGL-ERR', 'GENERIC_GPU', 'SERVER']);

function filterValidFingerprints(fps: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(
      fps
        .map((f) => (f || '').trim())
        .filter((f) => Boolean(f) && !LEGACY_DIM_REGEX.test(f))
    )
  );
}

function parseStoredDeviceMeta(rawBrowserInfo: string | null | undefined): StoredDeviceMetadata {
  if (!rawBrowserInfo || typeof rawBrowserInfo !== 'string') {
    return { browsersSeen: [] };
  }
  const trimmed = rawBrowserInfo.trim();
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      const browsers: string[] = Array.isArray(parsed.browsersSeen)
        ? parsed.browsersSeen.filter(Boolean)
        : parsed.browser
        ? [parsed.browser]
        : [];
      return {
        hardwareCoreId: parsed.hardwareCoreId || undefined,
        candidateFingerprints: Array.isArray(parsed.candidateFingerprints) ? parsed.candidateFingerprints.filter(Boolean) : undefined,
        os: parsed.os || undefined,
        deviceType: parsed.deviceType || undefined,
        gpuSummary: parsed.gpuSummary || undefined,
        screenSummary: parsed.screenSummary || undefined,
        timezone: parsed.timezone || undefined,
        browsersSeen: Array.from(new Set(browsers)),
      };
    } catch {
      // fall through to plain browser string
    }
  }
  return { browsersSeen: trimmed ? [trimmed] : [] };
}

function serializeStoredDeviceMeta(meta: StoredDeviceMetadata): string {
  return JSON.stringify({
    hardwareCoreId: meta.hardwareCoreId,
    candidateFingerprints: (meta.candidateFingerprints || []).slice(0, 10),
    os: meta.os,
    deviceType: meta.deviceType,
    gpuSummary: meta.gpuSummary,
    screenSummary: meta.screenSummary,
    timezone: meta.timezone,
    browsersSeen: Array.from(new Set((meta.browsersSeen || []).filter(Boolean))),
  });
}

function mergeBrowsers(existing: string[] | undefined, incomingBrowser?: string): string[] {
  const list = [...(existing || [])];
  if (incomingBrowser && incomingBrowser.trim() && !list.includes(incomingBrowser.trim())) {
    list.push(incomingBrowser.trim());
  }
  return list.length > 0 ? list : ['متصفح ويب'];
}

function parseScreenSummaryDims(screenSummary?: string): { phys: string; logical: string } {
  if (!screenSummary || typeof screenSummary !== 'string') {
    return { phys: '', logical: '' };
  }
  const physMatch = screenSummary.match(/^(\d+x\d+)/);
  const logMatch = screenSummary.match(/\((\d+x\d+)@/);
  return {
    phys: physMatch ? physMatch[1] : '',
    logical: logMatch ? logMatch[1] : '',
  };
}

function isMacAppleSiliconPair(os: string, gpuA: string, gpuB: string): boolean {
  if (os !== 'macOS') return false;
  const isAppleGpuA = gpuA === 'APPLE_GPU' || /^APPLE_M\d+/.test(gpuA);
  const isAppleGpuB = gpuB === 'APPLE_GPU' || /^APPLE_M\d+/.test(gpuB);
  return isAppleGpuA && isAppleGpuB;
}

function matchesPhysicalDevice(
  stored: {
    hardwareCoreId?: string;
    fingerprint?: string;
    candidateFingerprints?: string[];
    os?: string;
    deviceType?: string;
    gpuSummary?: string;
    screenSummary?: string;
    timezone?: string;
  },
  incoming: {
    fp: string;
    hardwareCoreId?: string;
    candidateFingerprints?: string[];
    os?: string;
    deviceType?: string;
    gpuSummary?: string;
    screenSummary?: string;
    timezone?: string;
  }
): boolean {
  const incomingHardwareCore = (incoming.hardwareCoreId || '').trim();
  const storedHardwareCore = (stored.hardwareCoreId || '').trim();

  if (incomingHardwareCore && storedHardwareCore && incomingHardwareCore === storedHardwareCore) {
    return true;
  }

  const incomingSet = new Set(
    filterValidFingerprints([incoming.fp, incomingHardwareCore, ...(incoming.candidateFingerprints || [])])
  );
  const storedFps = filterValidFingerprints([stored.fingerprint, storedHardwareCore, ...(stored.candidateFingerprints || [])]);

  if (storedFps.some((f) => incomingSet.has(f))) {
    return true;
  }

  // Same-student physical silicon + display geometry fallback for cross-browser recovery
  // Requires matching screen dimensions so distinct phone/laptop models (e.g. two iPhones) stay separated,
  // while Safari vs Chrome/Firefox (including zoomed browsers or Apple Silicon masking) unify cleanly.
  const stGpu = (stored.gpuSummary || '').toUpperCase().trim();
  const inGpu = (incoming.gpuSummary || '').toUpperCase().trim();
  if (
    stored.os &&
    incoming.os &&
    stored.os === incoming.os &&
    stored.deviceType &&
    incoming.deviceType &&
    stored.deviceType === incoming.deviceType &&
    stored.timezone &&
    incoming.timezone &&
    stored.timezone === incoming.timezone &&
    !GENERIC_GPU_TOKENS.has(stGpu) &&
    !GENERIC_GPU_TOKENS.has(inGpu) &&
    (stGpu === inGpu || isMacAppleSiliconPair(stored.os, stGpu, inGpu))
  ) {
    const stScreen = parseScreenSummaryDims(stored.screenSummary);
    const inScreen = parseScreenSummaryDims(incoming.screenSummary);
    if (stScreen.phys && inScreen.phys) {
      if (stScreen.phys === inScreen.phys || (stScreen.logical && inScreen.logical && stScreen.logical === inScreen.logical)) {
        return true;
      }
      return false;
    }
    return true;
  }

  return false;
}

async function collectStudentAllFingerprints(studentId: string, profilePrimaryFp?: string | null): Promise<string[]> {
  const fps = new Set<string>();
  if (profilePrimaryFp) fps.add(profilePrimaryFp);

  const { data: studentDevices } = await supabaseAdmin
    .from('student_devices')
    .select('device_fingerprint, browser_info')
    .eq('student_id', studentId);

  (studentDevices || []).forEach((d: any) => {
    if (d.device_fingerprint) fps.add(d.device_fingerprint);
    const meta = parseStoredDeviceMeta(d.browser_info);
    if (meta.hardwareCoreId) fps.add(meta.hardwareCoreId);
    (meta.candidateFingerprints || []).forEach((f) => fps.add(f));
  });

  const { data: courseBindings } = await supabaseAdmin
    .from('audit_logs')
    .select('details')
    .eq('target_entity', 'course_device_bindings')
    .eq('actor_id', studentId);

  (courseBindings || []).forEach((row: any) => {
    const devs = Array.isArray(row.details?.devices) ? row.details.devices : [];
    devs.forEach((d: any) => {
      if (d?.fingerprint) fps.add(d.fingerprint);
      if (d?.hardwareCoreId) fps.add(d.hardwareCoreId);
      if (Array.isArray(d?.candidateFingerprints)) {
        d.candidateFingerprints.forEach((f: string) => f && fps.add(f));
      }
    });
  });

  return filterValidFingerprints(Array.from(fps));
}

async function isDeviceBannedServer(fps: string[]): Promise<{ banned: boolean; reason?: string }> {
  const validFps = filterValidFingerprints(fps);
  if (validFps.length === 0) return { banned: false };
  const { data: bannedCheck } = await supabaseAdmin
    .from('banned_devices')
    .select('id, reason')
    .in('device_fingerprint', validFps)
    .limit(1);

  if (bannedCheck && bannedCheck.length > 0) {
    return {
      banned: true,
      reason: bannedCheck[0].reason || '',
    };
  }
  return { banned: false };
}

function parseCourseMetaMaxDevices(description: string | null | undefined, rowMaxDevices?: number | null): number {
  let maxDevices = typeof rowMaxDevices === 'number' && rowMaxDevices > 0 ? rowMaxDevices : 3;
  if (description) {
    const metaMatch = description.match(/\n\n<!--meta:([\s\S]*?)-->$/);
    if (metaMatch) {
      try {
        const parsed = JSON.parse(metaMatch[1]);
        if (parsed.maxDevices !== undefined) {
          const val = Number(parsed.maxDevices);
          if (!Number.isNaN(val) && val >= 1) {
            maxDevices = Math.floor(val);
          }
        }
      } catch {}
    }
  }
  return maxDevices;
}

async function getCourseMaxDevicesServer(courseId: string): Promise<{
  courseTitle: string;
  maxDevices: number;
  isUnlimited: boolean;
}> {
  const { data: courseRow } = await supabaseAdmin
    .from('courses')
    .select('id, title, description')
    .eq('id', courseId)
    .maybeSingle();

  const maxDevices = parseCourseMetaMaxDevices(courseRow?.description, null);
  return {
    courseTitle: courseRow?.title || 'الكورس التعليمي',
    maxDevices,
    isUnlimited: maxDevices >= 1000 || maxDevices === 0,
  };
}

/**
 * Silently record physical login devices for analytics & teacher inspection.
 * NEVER blocks students on login device count and NEVER reveals/hints login limit rules.
 */
async function recordStudentLoginDevice(
  studentId: string,
  cleanFp: string,
  deviceInfo?: IncomingHardwareContext
): Promise<{ allowed: boolean; isBanned?: boolean; message?: string }> {
  const allIncomingFps = filterValidFingerprints([
    cleanFp,
    deviceInfo?.hardwareCoreId,
    ...(deviceInfo?.candidateFingerprints || []),
  ]);

  if (allIncomingFps.length === 0) {
    return { allowed: true };
  }

  const banRes = await isDeviceBannedServer(allIncomingFps);
  if (banRes.banned) {
    return {
      allowed: false,
      isBanned: true,
      message: 'تم حظر هذا الجهاز نهائياً من قبل إدارة المنصة. ' + (banRes.reason || ''),
    };
  }

  const { data: studentDevices } = await supabaseAdmin
    .from('student_devices')
    .select('*')
    .eq('student_id', studentId)
    .order('is_primary', { ascending: false });

  const existingList = studentDevices || [];
  const matchedDevice = existingList.find((d: any) => {
    const meta = parseStoredDeviceMeta(d.browser_info);
    return matchesPhysicalDevice(
      {
        hardwareCoreId: meta.hardwareCoreId,
        fingerprint: d.device_fingerprint,
        candidateFingerprints: meta.candidateFingerprints,
        os: meta.os,
        deviceType: meta.deviceType,
        gpuSummary: meta.gpuSummary,
        screenSummary: meta.screenSummary,
        timezone: meta.timezone,
      },
      {
        fp: cleanFp,
        hardwareCoreId: deviceInfo?.hardwareCoreId,
        candidateFingerprints: deviceInfo?.candidateFingerprints,
        os: deviceInfo?.os,
        deviceType: deviceInfo?.deviceType,
        gpuSummary: deviceInfo?.gpuSummary,
        screenSummary: deviceInfo?.screenSummary,
        timezone: deviceInfo?.timezone,
      }
    );
  });

  const nowIso = new Date().toISOString();

  if (matchedDevice) {
    const prevMeta = parseStoredDeviceMeta(matchedDevice.browser_info);
    const updatedMeta: StoredDeviceMetadata = {
      hardwareCoreId: deviceInfo?.hardwareCoreId || prevMeta.hardwareCoreId,
      candidateFingerprints: filterValidFingerprints([
        ...(prevMeta.candidateFingerprints || []),
        cleanFp,
        ...(deviceInfo?.candidateFingerprints || []),
      ]),
      os: deviceInfo?.os || prevMeta.os,
      deviceType: deviceInfo?.deviceType || prevMeta.deviceType,
      gpuSummary: deviceInfo?.gpuSummary || prevMeta.gpuSummary,
      screenSummary: deviceInfo?.screenSummary || prevMeta.screenSummary,
      timezone: deviceInfo?.timezone || prevMeta.timezone,
      browsersSeen: mergeBrowsers(prevMeta.browsersSeen, deviceInfo?.browser),
    };

    await supabaseAdmin
      .from('student_devices')
      .update({
        device_name: deviceInfo?.name || matchedDevice.device_name,
        browser_info: serializeStoredDeviceMeta(updatedMeta),
        last_active: nowIso,
      })
      .eq('id', matchedDevice.id);

    return { allowed: true };
  }

  // Record new physical device silently for audit/inspection
  const isFirstEver = existingList.length === 0;
  const newMeta: StoredDeviceMetadata = {
    hardwareCoreId: deviceInfo?.hardwareCoreId,
    candidateFingerprints: allIncomingFps,
    os: deviceInfo?.os,
    deviceType: deviceInfo?.deviceType,
    gpuSummary: deviceInfo?.gpuSummary,
    screenSummary: deviceInfo?.screenSummary,
    timezone: deviceInfo?.timezone,
    browsersSeen: mergeBrowsers([], deviceInfo?.browser),
  };

  if (isFirstEver) {
    await supabaseAdmin
      .from('profiles')
      .update({ primary_device_fingerprint: cleanFp })
      .eq('id', studentId)
      .is('primary_device_fingerprint', null);
  }

  await supabaseAdmin.from('student_devices').upsert(
    [
      {
        student_id: studentId,
        device_fingerprint: cleanFp,
        device_name: deviceInfo?.name || (isFirstEver ? 'الجهاز الأساسي' : 'جهاز دخول مسجل'),
        browser_info: serializeStoredDeviceMeta(newMeta),
        is_primary: isFirstEver,
        last_active: nowIso,
      },
    ],
    { onConflict: 'student_id,device_fingerprint' }
  );

  return { allowed: true };
}

/**
 * Bind Device #1 (Primary Activation Device - undeletable) when a student enrolls in or activates a course.
 */
export async function bindCoursePrimaryDeviceServer(
  studentId: string,
  courseId: string,
  deviceContext?: IncomingHardwareContext & { primaryFingerprint?: string },
  activatedVia: string = 'activation'
): Promise<{ maxDevices: number; isUnlimited: boolean }> {
  const config = await getCourseMaxDevicesServer(courseId);
  if (!studentId || !courseId || !deviceContext) {
    return { maxDevices: config.maxDevices, isUnlimited: config.isUnlimited };
  }

  const fp = (deviceContext.primaryFingerprint || deviceContext.hardwareCoreId || '').trim();
  if (!fp) {
    return { maxDevices: config.maxDevices, isUnlimited: config.isUnlimited };
  }

  const { data: existingRow } = await supabaseAdmin
    .from('audit_logs')
    .select('id, details')
    .eq('target_entity', 'course_device_bindings')
    .eq('actor_id', studentId)
    .eq('target_id', courseId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const existingDevices: any[] = Array.isArray(existingRow?.details?.devices)
    ? [...existingRow.details.devices]
    : [];

  const nowIso = new Date().toISOString();
  const matchedIdx = existingDevices.findIndex((d: any) =>
    matchesPhysicalDevice(d, {
      fp,
      hardwareCoreId: deviceContext.hardwareCoreId,
      candidateFingerprints: deviceContext.candidateFingerprints,
      os: deviceContext.os,
      deviceType: deviceContext.deviceType,
      gpuSummary: deviceContext.gpuSummary,
      screenSummary: deviceContext.screenSummary,
      timezone: deviceContext.timezone,
    })
  );

  if (matchedIdx >= 0) {
    const prev = existingDevices[matchedIdx];
    existingDevices[matchedIdx] = {
      ...prev,
      hardwareCoreId: deviceContext.hardwareCoreId || prev.hardwareCoreId,
      candidateFingerprints: filterValidFingerprints([
        ...(prev.candidateFingerprints || []),
        fp,
        ...(deviceContext.candidateFingerprints || []),
      ]),
      browsersSeen: mergeBrowsers(prev.browsersSeen, deviceContext.browser),
      lastActive: nowIso,
    };
  } else if (config.isUnlimited || existingDevices.length < config.maxDevices) {
    const isPrimary = existingDevices.length === 0;
    existingDevices.push({
      id: crypto.randomUUID(),
      hardwareCoreId: deviceContext.hardwareCoreId || fp,
      fingerprint: fp,
      candidateFingerprints: filterValidFingerprints([
        fp,
        deviceContext.hardwareCoreId,
        ...(deviceContext.candidateFingerprints || []),
      ]),
      name: deviceContext.name || (isPrimary ? 'جهاز التفعيل الأساسي' : 'جهاز مسجل للكورس'),
      deviceType: deviceContext.deviceType || 'desktop',
      os: deviceContext.os || 'Other',
      gpuSummary: deviceContext.gpuSummary || '',
      screenSummary: deviceContext.screenSummary || '',
      timezone: deviceContext.timezone || '',
      browsersSeen: mergeBrowsers([], deviceContext.browser),
      isPrimary,
      activatedVia,
      boundAt: nowIso,
      lastActive: nowIso,
    });
  }

  const nextDetails = {
    studentId,
    courseId,
    courseTitle: config.courseTitle,
    maxDevicesSnapshot: config.maxDevices,
    devices: existingDevices,
    updatedAt: nowIso,
  };

  if (existingRow?.id) {
    await supabaseAdmin
      .from('audit_logs')
      .update({ details: nextDetails })
      .eq('id', existingRow.id);
  } else {
    await supabaseAdmin.from('audit_logs').insert([
      {
        actor_id: studentId,
        actor_name: 'نظام تفعيل الكورسات',
        actor_role: 'student',
        action_type: 'COURSE_DEVICE_REGISTRY',
        target_entity: 'course_device_bindings',
        target_id: courseId,
        details: nextDetails,
      },
    ]);
  }

  return { maxDevices: config.maxDevices, isUnlimited: config.isUnlimited };
}

/**
 * Per-course physical hardware verification & enforcement.
 * Collapses browsers/incognito onto 1 physical device per (studentId, courseId).
 */
async function verifyAndEnforceCourseDeviceServer(
  studentId: string,
  courseId: string,
  cleanFp: string,
  deviceInfo?: IncomingHardwareContext
): Promise<{
  allowed: boolean;
  isPrimary: boolean;
  deviceId?: string;
  maxDevices?: number;
  activeCount?: number;
  isUnlimited?: boolean;
  maxDevicesReached?: boolean;
  isBanned?: boolean;
  message?: string;
}> {
  const allIncomingFps = filterValidFingerprints([
    cleanFp,
    deviceInfo?.hardwareCoreId,
    ...(deviceInfo?.candidateFingerprints || []),
  ]);

  // 1. Check banned device fingerprints
  const banRes = await isDeviceBannedServer(allIncomingFps);
  if (banRes.banned) {
    return {
      allowed: false,
      isPrimary: false,
      isBanned: true,
      message: 'تم حظر هذا الجهاز نهائياً من قبل إدارة المنصة. ' + (banRes.reason || ''),
    };
  }

  // 2. Check student profile ban status
  const { data: prof } = await supabaseAdmin
    .from('profiles')
    .select('id, status, ban_reason')
    .eq('id', studentId)
    .maybeSingle();

  if (prof?.status === 'banned') {
    return {
      allowed: false,
      isPrimary: false,
      isBanned: true,
      message: 'تم إيقاف هذا الحساب من قبل إدارة المنصة.' + (prof.ban_reason ? ` (${prof.ban_reason})` : ''),
    };
  }

  // 3. Read course-level device policy
  const config = await getCourseMaxDevicesServer(courseId);

  // 4. Read per-course device bindings row
  const { data: existingRow } = await supabaseAdmin
    .from('audit_logs')
    .select('id, details')
    .eq('target_entity', 'course_device_bindings')
    .eq('actor_id', studentId)
    .eq('target_id', courseId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const devices: any[] = Array.isArray(existingRow?.details?.devices)
    ? [...existingRow.details.devices]
    : [];

  const nowIso = new Date().toISOString();

  // 5. Match existing physical device for this (student, course)
  const matchedIdx = devices.findIndex((d: any) =>
    matchesPhysicalDevice(d, {
      fp: cleanFp,
      hardwareCoreId: deviceInfo?.hardwareCoreId,
      candidateFingerprints: deviceInfo?.candidateFingerprints,
      os: deviceInfo?.os,
      deviceType: deviceInfo?.deviceType,
      gpuSummary: deviceInfo?.gpuSummary,
      screenSummary: deviceInfo?.screenSummary,
      timezone: deviceInfo?.timezone,
    })
  );

  if (matchedIdx >= 0) {
    const existing = devices[matchedIdx];
    devices[matchedIdx] = {
      ...existing,
      hardwareCoreId: deviceInfo?.hardwareCoreId || existing.hardwareCoreId,
      candidateFingerprints: filterValidFingerprints([
        ...(existing.candidateFingerprints || []),
        cleanFp,
        ...(deviceInfo?.candidateFingerprints || []),
      ]),
      os: deviceInfo?.os || existing.os,
      deviceType: deviceInfo?.deviceType || existing.deviceType,
      gpuSummary: deviceInfo?.gpuSummary || existing.gpuSummary,
      screenSummary: deviceInfo?.screenSummary || existing.screenSummary,
      timezone: deviceInfo?.timezone || existing.timezone,
      browsersSeen: mergeBrowsers(existing.browsersSeen, deviceInfo?.browser),
      lastActive: nowIso,
    };

    const nextDetails = {
      studentId,
      courseId,
      courseTitle: config.courseTitle,
      maxDevicesSnapshot: config.maxDevices,
      devices,
      updatedAt: nowIso,
    };

    if (existingRow?.id) {
      await supabaseAdmin.from('audit_logs').update({ details: nextDetails }).eq('id', existingRow.id);
    }

    return {
      allowed: true,
      isPrimary: Boolean(existing.isPrimary),
      deviceId: existing.id,
      maxDevices: config.maxDevices,
      activeCount: devices.length,
      isUnlimited: config.isUnlimited,
    };
  }

  // 6. Enforce per-course device quota strictly for new physical devices
  if (!config.isUnlimited && devices.length >= config.maxDevices) {
    return {
      allowed: false,
      isPrimary: false,
      maxDevicesReached: true,
      maxDevices: config.maxDevices,
      activeCount: devices.length,
      isUnlimited: false,
      message: `تم بلوغ الحد الأقصى للأجهزة المسموحة لهذا الكورس (${devices.length} من ${config.maxDevices} أجهزة). يمكنك استخدام أحد أجهزتك المرتبطة بهذا الكورس، أو إزالة جهاز ثانوي من صفحة "الأجهزة المرتبطة" لإتاحة هذا الجهاز.`,
    };
  }

  // 7. Register physical device for this course
  const isPrimary = devices.length === 0;
  const newDeviceId = crypto.randomUUID();
  devices.push({
    id: newDeviceId,
    hardwareCoreId: deviceInfo?.hardwareCoreId || cleanFp,
    fingerprint: cleanFp,
    candidateFingerprints: allIncomingFps,
    name: deviceInfo?.name || (isPrimary ? 'الجهاز الأساسي للكورس' : `جهاز إضافي (${devices.length + 1})`),
    deviceType: deviceInfo?.deviceType || 'desktop',
    os: deviceInfo?.os || 'Other',
    gpuSummary: deviceInfo?.gpuSummary || '',
    screenSummary: deviceInfo?.screenSummary || '',
    timezone: deviceInfo?.timezone || '',
    browsersSeen: mergeBrowsers([], deviceInfo?.browser),
    isPrimary,
    activatedVia: isPrimary ? 'course_watch' : 'watch',
    boundAt: nowIso,
    lastActive: nowIso,
  });

  const nextDetails = {
    studentId,
    courseId,
    courseTitle: config.courseTitle,
    maxDevicesSnapshot: config.maxDevices,
    devices,
    updatedAt: nowIso,
  };

  if (existingRow?.id) {
    await supabaseAdmin.from('audit_logs').update({ details: nextDetails }).eq('id', existingRow.id);
  } else {
    await supabaseAdmin.from('audit_logs').insert([
      {
        actor_id: studentId,
        actor_name: 'نظام حماية الكورسات',
        actor_role: 'student',
        action_type: 'COURSE_DEVICE_REGISTRY',
        target_entity: 'course_device_bindings',
        target_id: courseId,
        details: nextDetails,
      },
    ]);
  }

  return {
    allowed: true,
    isPrimary,
    deviceId: newDeviceId,
    maxDevices: config.maxDevices,
    activeCount: devices.length,
    isUnlimited: config.isUnlimited,
  };
}

export async function loginAction(
  emailOrPhone: string, 
  pass: string, 
  deviceFingerprint?: string,
  deviceInfo?: IncomingHardwareContext
) {
  try {
    const rawIdentifier = (emailOrPhone || '').trim();
    const normalizedIdentifier = normalizeEasternArabicDigits(rawIdentifier);
    const cleanEmail = normalizedIdentifier.toLowerCase();
    const cleanPhone = cleanEgyptianPhone(normalizedIdentifier);
    const cleanPass = (pass || '').trim();
    const cleanFp = (deviceFingerprint || '').trim();
    
    if (!rawIdentifier || !cleanPass) {
      return { success: false, message: 'الرجاء إدخال البريد الإلكتروني أو رقم الهاتف وكلمة المرور' };
    }

    // 0. Server-Authoritative Super Admin (Teacher) Verification
    if (isTeacherEmail(cleanEmail)) {
      if (verifyTeacherCredentialsServer(cleanEmail, cleanPass)) {
        const teacherProfile = getTeacherProfilePayload();
        await setServerSessionCookie({
          id: teacherProfile.id,
          role: 'teacher',
          email: teacherProfile.email,
          fullName: teacherProfile.fullName,
          status: 'active',
        });
        return {
          success: true,
          user: teacherProfile,
          message: 'مرحباً بك يا مستر محمد رضوان، تم تسجيل الدخول بنجاح إلى لوحة الإدارة.',
        };
      }
      return { success: false, message: 'كلمة المرور غير صحيحة لحساب المعلم.' };
    }

    // Lookup user: support email (case-insensitive) or Egyptian phone number
    let user: any = null;

    if (normalizedIdentifier.includes('@')) {
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .ilike('email', cleanEmail)
        .maybeSingle();
      if (!error && data) user = data;
    } else {
      // 1. Direct exact phone matching
      const phoneCandidates = [
        cleanPhone,
        normalizedIdentifier,
        rawIdentifier.trim(),
        cleanPhone.startsWith('0') ? cleanPhone.slice(1) : '0' + cleanPhone,
        cleanPhone.startsWith('0') ? '+20' + cleanPhone.slice(1) : '+20' + cleanPhone,
        cleanPhone.startsWith('+20') ? '0' + cleanPhone.slice(3) : cleanPhone,
      ].filter(Boolean);

      const uniquePhoneCandidates = Array.from(new Set(phoneCandidates));

      const { data: byPhone } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .in('phone', uniquePhoneCandidates)
        .order('created_at', { ascending: false })
        .limit(1);

      if (byPhone && byPhone.length > 0) {
        user = byPhone[0];
      }

      // 2. Check parent_phone if student typed their parent's phone number
      if (!user) {
        const { data: byParentPhone } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .in('parent_phone', uniquePhoneCandidates)
          .order('created_at', { ascending: false })
          .limit(1);

        if (byParentPhone && byParentPhone.length > 0) {
          user = byParentPhone[0];
        }
      }

      // 3. Exact email match in case someone entered username without standard @
      if (!user) {
        const { data: byEmail } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .ilike('email', cleanEmail)
          .maybeSingle();
        if (byEmail) user = byEmail;
      }
    }

    if (!user) {
      return { success: false, message: 'بيانات الدخول غير مسجلة بالمنصة. يرجى التأكد من البريد أو رقم الهاتف أو إنشاء حساب جديد للطلاب.' };
    }

    // Verify Password (Supports one-way PBKDF2-SHA256 hashes + seamless transparent migration for legacy accounts)
    const userPassHash = (user.password_hash || '').trim();
    const normalizedPass = normalizeEasternArabicDigits(cleanPass);
    let isPasswordValid = false;

    if (isPasswordHash(userPassHash)) {
      isPasswordValid = await verifyPasswordSecure(cleanPass, userPassHash);
      if (!isPasswordValid && pass && pass !== cleanPass) {
        isPasswordValid = await verifyPasswordSecure(pass, userPassHash);
      }
      if (!isPasswordValid && normalizedPass && normalizedPass !== cleanPass) {
        isPasswordValid = await verifyPasswordSecure(normalizedPass, userPassHash);
      }
    } else {
      const userPassVault = (user.encrypted_password_vault || '').trim();
      const noSpacePass = cleanPass.replace(/\s+/g, '');
      const noSpaceVault = userPassVault.replace(/\s+/g, '');
      const noSpaceHash = userPassHash.replace(/\s+/g, '');

      const passVariants = [
        cleanPass,
        pass,
        (pass || '').trim(),
        cleanPass.toLowerCase(),
        (pass || '').toLowerCase(),
        normalizedPass,
        normalizeEasternArabicDigits(pass || ''),
        normalizeEasternArabicDigits((pass || '').trim()),
        noSpacePass,
      ];

      isPasswordValid =
        passVariants.some(p => p && (
          p === userPassHash ||
          p === userPassVault ||
          p === user.password_hash ||
          p === user.encrypted_password_vault ||
          p.toLowerCase() === userPassHash.toLowerCase() ||
          p.toLowerCase() === userPassVault.toLowerCase() ||
          (noSpaceVault && p.replace(/\s+/g, '') === noSpaceVault) ||
          (noSpaceHash && p.replace(/\s+/g, '') === noSpaceHash)
        ));

      // Immediately upgrade student's legacy plaintext password to irreversible PBKDF2 hash & wipe vault
      if (isPasswordValid && user.role === 'student') {
        try {
          const passwordToHash = userPassHash || userPassVault || cleanPass;
          const upgradedHash = await hashPasswordSecure(passwordToHash);
          await supabaseAdmin
            .from('profiles')
            .update({
              password_hash: upgradedHash,
              encrypted_password_vault: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', user.id);
        } catch (migErr) {
          console.warn('Password hash auto-migration warning:', migErr);
        }
      }
    }

    if (!isPasswordValid) {
      return {
        success: false,
        message: 'كلمة المرور غير صحيحة. يرجى التأكد من كلمة المرور وإعادة المحاولة، أو الضغط على "نسيت كلمة المرور؟" لطلب استعادتها بأمان.',
      };
    }

    // Special Handling for Assistant Role
    if (user.role === 'assistant') {
      if (user.is_frozen) {
        return { success: false, message: 'عذراً، تم تجميد حساب المساعد من قبل المعلم. يرجى مراجعة مستر محمد رضوان.' };
      }

      // Fetch assistant permissions
      const { data: perm } = await supabaseAdmin
        .from('assistant_permissions')
        .select('*')
        .eq('assistant_id', user.id)
        .maybeSingle();

      const permissions = perm
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
          };

      const assistantUser = {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        phone: user.phone || '',
        role: 'assistant' as const,
        status: 'active' as const,
        assistantRoleTitle: user.carrier || 'مساعد إداري وأكاديمي',
        permissions,
      };

      await setServerSessionCookie({
        id: assistantUser.id,
        role: 'assistant',
        email: assistantUser.email,
        fullName: assistantUser.fullName,
        status: 'active',
      });

      return {
        success: true,
        user: assistantUser,
      };
    }

    // Teacher / Super Admin check in profiles table
    if (user.role === 'teacher' || user.role === 'super_admin') {
      const teacherUser = {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        phone: user.phone || '',
        role: 'teacher' as const,
        status: 'active' as const,
      };
      await setServerSessionCookie({
        id: teacherUser.id,
        role: 'teacher',
        email: teacherUser.email,
        fullName: teacherUser.fullName,
        status: 'active',
      });
      return {
        success: true,
        user: teacherUser,
      };
    }

    // Student checks
    if (user.status === 'banned') {
      return { 
        success: false, 
        isBanned: true,
        message: 'تم إيقاف هذا الحساب أو حظر الجهاز من قبل إدارة المنصة.' + (user.ban_reason ? ` (السبب: ${user.ban_reason})` : '') 
      };
    }

    if (user.status === 'rejected') {
      return { 
        success: false, 
        isRejected: true,
        message: 'تم رفض طلب انضمامك للمنصة. يمكنك التواصل مع المعلم للاستفسار على الرقم: 01552191172' 
      };
    }

    if (user.status === 'pending_review') {
      return { 
        success: false, 
        isPending: true, 
        student: {
          id: user.id,
          fullName: user.full_name,
          email: user.email,
          phone: user.phone,
          stage: user.stage,
          grade: user.grade,
          educationType: user.education_type,
          status: user.status,
          createdAt: user.created_at,
        },
        message: 'طلبك لا يزال قيد المراجعة لدى مستر محمد رضوان. سيتم مراجعة وقبول حسابك خلال 48 ساعة كحد أقصى أو التواصل على 01552191172.' 
      };
    }

    // Active student: Record login physical device quietly (only rejects if device/student is banned)
    if (user.status === 'active') {
      if (cleanFp || deviceInfo?.hardwareCoreId) {
        const loginDevResult = await recordStudentLoginDevice(user.id, cleanFp || deviceInfo?.hardwareCoreId || '', deviceInfo);
        if (!loginDevResult.allowed) {
          return {
            success: false,
            isBanned: loginDevResult.isBanned,
            message: loginDevResult.message || 'تم رفض الدخول من هذا الجهاز',
          };
        }
      }

      if (user.whatsapp_otp && !user.otp_verified) {
        // Needs OTP
        return { 
          success: true, 
          requiresOtp: true, 
          studentId: user.id,
          message: 'تم قبول طلبك! يرجى إدخال رمز التفعيل (OTP) المكون من 4 أرقام لتأكيد حسابك.' 
        };
      }
      
      // Success — mint HttpOnly signed session cookie
      await setServerSessionCookie({
        id: user.id,
        role: 'student',
        email: user.email || '',
        fullName: user.full_name,
        status: user.status,
      });

      return {
        success: true,
        user: {
          id: user.id,
          fullName: user.full_name,
          email: user.email,
          phone: user.phone,
          parentPhone: user.parent_phone,
          role: user.role,
          stage: user.stage,
          educationType: user.education_type,
          grade: user.grade,
          status: user.status,
          avatarUrl: user.avatar_url,
          walletBalance: user.wallet_balance || 0,
        }
      };
    }

    return { success: false, message: 'حالة الحساب غير معروفة.' };
  } catch (err: any) {
    console.error('Login error:', err);
    return { success: false, message: 'حدث خطأ أثناء تسجيل الدخول.' };
  }
}

export async function verifyOtpAction(studentId: string, otp: string) {
  try {
    const { data: user, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', studentId)
      .single();
      
    if (error || !user) return { success: false, message: 'طالب غير موجود' };
    
    if (user.status === 'banned' || user.status === 'rejected') {
      return { success: false, message: 'هذا الحساب موقوف أو مرفوض من قبل الإدارة.' };
    }

    if (user.whatsapp_otp && user.whatsapp_otp === normalizeEasternArabicDigits(otp).trim()) {
      // Mark as verified and clear OTP secret
      await supabaseAdmin
        .from('profiles')
        .update({ otp_verified: true, status: 'active' })
        .eq('id', studentId);

      await setServerSessionCookie({
        id: user.id,
        role: 'student',
        email: user.email || '',
        fullName: user.full_name,
        status: 'active',
      });
        
      return { 
        success: true,
        user: {
          id: user.id,
          fullName: user.full_name,
          email: user.email,
          phone: user.phone,
          parentPhone: user.parent_phone,
          role: user.role,
          stage: user.stage,
          educationType: user.education_type,
          grade: user.grade,
          status: 'active',
          avatarUrl: user.avatar_url,
          walletBalance: user.wallet_balance || 0,
        }
      };
    }
    
    return { success: false, message: 'رمز التفعيل غير صحيح، يرجى التأكد من الرمز وإعادة المحاولة' };
  } catch {
    return { success: false, message: 'حدث خطأ أثناء التحقق' };
  }
}

export async function registerStudentAction(studentData: any) {
  try {
    const cleanEmail = normalizeEasternArabicDigits(studentData.email || '').trim().toLowerCase();
    const cleanPhone = cleanEgyptianPhone(studentData.phone || '');
    const cleanParentPhone = cleanEgyptianPhone(studentData.parentPhone || '');
    const cleanPass = (studentData.password || '').trim();
    const fingerprint = (studentData.deviceFingerprint || '').trim();
    const candidateFps = Array.isArray(studentData.candidateFingerprints) 
      ? studentData.candidateFingerprints.map((f: any) => (f || '').trim()).filter(Boolean)
      : [];
    const devInfo = studentData.deviceInfo as IncomingHardwareContext | undefined;
    const allFps = filterValidFingerprints([
      fingerprint,
      studentData.hardwareSignature,
      devInfo?.hardwareCoreId,
      ...candidateFps,
    ]);

    if (!cleanPhone || cleanPhone.length !== 11) {
      return { success: false, error: 'يرجى إدخال رقم هاتف مصري صحيح مكون من 11 رقماً.' };
    }

    if (cleanPhone === cleanParentPhone) {
      return { success: false, error: 'يجب أن يكون رقم ولي الأمر مختلفاً عن رقم هاتف الطالب.' };
    }

    if (cleanPass.length < 8) {
      return { success: false, error: 'كلمة المرور يجب أن تكون 8 خانات على الأقل.' };
    }

    let siblingProfiles: any[] = [];

    // 1. Strict Check: Is any device fingerprint banned in banned_devices?
    if (allFps.length > 0) {
      const { data: bannedList } = await supabaseAdmin
        .from('banned_devices')
        .select('id, reason')
        .in('device_fingerprint', allFps)
        .limit(1);
        
      if (bannedList && bannedList.length > 0) {
        return { 
          success: false, 
          error: 'عذراً، هذا الجهاز محظور نهائياً من التسجيل في المنصة بقرار من إدارة المنصة. ' + (bannedList[0].reason || '')
        };
      }

      // 2. Strict Security: Block if device is tied to any BANNED account or device
      const { data: bannedProfiles } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, status, ban_reason')
        .eq('role', 'student')
        .eq('status', 'banned')
        .in('primary_device_fingerprint', allFps)
        .limit(1);

      if (bannedProfiles && bannedProfiles.length > 0) {
        return {
          success: false,
          error: 'عذراً، هذا الجهاز محظور نهائياً من التسجيل في المنصة بقرار من إدارة المنصة.'
        };
      }

      // Check existing sibling accounts on this hardware fingerprint (via profiles AND student_devices)
      const siblingMap = new Map<string, any>();
      const { data: foundSiblings } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, phone, status')
        .eq('role', 'student')
        .neq('status', 'rejected')
        .in('primary_device_fingerprint', allFps);

      if (foundSiblings) {
        foundSiblings.forEach((s: any) => siblingMap.set(s.id, s));
      }

      const { data: devSiblings } = await supabaseAdmin
        .from('student_devices')
        .select('student_id')
        .in('device_fingerprint', allFps);

      if (devSiblings && devSiblings.length > 0) {
        const sIds = Array.from(new Set(devSiblings.map((d: any) => d.student_id).filter(Boolean)));
        if (sIds.length > 0) {
          const { data: extraSibs } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name, phone, status')
            .eq('role', 'student')
            .neq('status', 'rejected')
            .in('id', sIds);
          if (extraSibs) {
            extraSibs.forEach((s: any) => siblingMap.set(s.id, s));
          }
        }
      }

      siblingProfiles = Array.from(siblingMap.values());

      if (siblingProfiles.some(s => s.status === 'banned')) {
        return {
          success: false,
          error: 'عذراً، هذا الجهاز محظور نهائياً من التسجيل في المنصة بقرار من إدارة المنصة.'
        };
      }

      // Hard Multi-Account Pending Guard: Block additional registrations while ANY linked account is still pending_review
      const existingPending = siblingProfiles.find(s => s.status === 'pending_review');
      if (existingPending) {
        return {
          success: false,
          isPendingDeviceLock: true,
          error: `يوجد بالفعل طلب تسجيل قيد المراجعة مرتبط بهذا الجهاز باسم (${existingPending.full_name}). لا يمكن تسجيل حساب جديد إضافي من نفس الجهاز قبل مراجعة الطلب الحالي (قبوله أو رفضه) من قِبل الإدارة.`
        };
      }
    }

    // 2. Check if phone is in any banned account
    const { data: bannedPhone } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, status, ban_reason')
      .eq('phone', cleanPhone)
      .eq('status', 'banned')
      .limit(1);

    if (bannedPhone && bannedPhone.length > 0) {
      return {
        success: false,
        error: 'هذا الحساب ورقم الهاتف محظور نهائياً من قبل إدارة المنصة.' + (bannedPhone[0].ban_reason ? ` (السبب: ${bannedPhone[0].ban_reason})` : '')
      };
    }

    // 3. Strict Check: Duplicate Email
    if (cleanEmail) {
      const { data: existingEmail } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, role')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (existingEmail) {
        if (existingEmail.role === 'assistant' || existingEmail.role === 'teacher' || existingEmail.role === 'super_admin') {
          return { 
            success: false, 
            error: 'هذا البريد الإلكتروني مسجل كحساب إداري (مساعد / معلم). يمكنك تسجيل الدخول به مباشرة من صفحة الدخول دون الحاجة لإنشاء حساب طالب.',
            isAlreadyRegistered: true,
          };
        }
        return { 
          success: false, 
          error: `البريد الإلكتروني مسجل بالفعل في المنصة باسم (${existingEmail.full_name}). إذا كان هذا حسابك، يرجى الانتقال لصفحة تسجيل الدخول.`,
          isAlreadyRegistered: true,
        };
      }
    }

    // 4. Strict Check: Duplicate Phone
    if (cleanPhone) {
      const { data: existingPhone } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name')
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (existingPhone) {
        return { 
          success: false, 
          error: `رقم الهاتف مسجل بالفعل في المنصة باسم (${existingPhone.full_name}). إذا كان هذا حسابك، يرجى الانتقال لصفحة تسجيل الدخول.`,
          isAlreadyRegistered: true,
        };
      }
    }

    // 7. Detect Mobile Carrier
    let carrier = 'Vodafone';
    if (cleanPhone.startsWith('011')) carrier = 'Etisalat';
    else if (cleanPhone.startsWith('012')) carrier = 'Orange';
    else if (cleanPhone.startsWith('015')) carrier = 'WE';

    // 8. Strict Identity Photo Check: Photo is mandatory for teacher approval
    if (!studentData.avatarUrl || typeof studentData.avatarUrl !== 'string' || studentData.avatarUrl.trim().length < 50) {
      return {
        success: false,
        error: 'التقاط أو رفع صورة الهوية الشخصية للطالب إلزامي لاستكمال التسجيل ومراجعة الحساب من قِبل المعلم.'
      };
    }

    const stage = studentData.stage === 'middle' ? 'middle' : 'high';
    const education_type = studentData.educationType === 'azhar' ? 'azhar' : 'general';
    const parsedGrade = parseInt(studentData.grade, 10);
    const grade = isNaN(parsedGrade) || parsedGrade < 1 || parsedGrade > 3 ? 1 : parsedGrade;

    // 9. Atomic & Guaranteed Insertion to profiles with Zero-Knowledge Hash
    const hashedPassword = await hashPasswordSecure(cleanPass);
    const insertPayload = {
      role: 'student',
      full_name: studentData.fullName?.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      parent_phone: cleanParentPhone || null,
      phone_carrier: carrier,
      password_hash: hashedPassword,
      encrypted_password_vault: null,
      avatar_url: studentData.avatarUrl || null,
      stage: stage,
      education_type: education_type,
      grade: grade,
      status: 'pending_review',
      primary_device_fingerprint: fingerprint || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: insertedUser, error } = await supabaseAdmin
      .from('profiles')
      .insert([insertPayload])
      .select('id, full_name, email, phone, stage, grade, education_type, status, created_at')
      .single();

    if (error) {
      console.error('Error inserting student:', error);
      return { success: false, error: 'حدث خطأ في قاعدة البيانات: ' + error.message };
    }

    // 10. Register the primary fingerprint & full physical hardware profile in student_devices
    if (insertedUser && (fingerprint || devInfo?.hardwareCoreId)) {
      try {
        const regFp = fingerprint || devInfo?.hardwareCoreId || '';
        const regMeta: StoredDeviceMetadata = {
          hardwareCoreId: devInfo?.hardwareCoreId || studentData.hardwareSignature,
          candidateFingerprints: allFps,
          os: devInfo?.os,
          deviceType: devInfo?.deviceType,
          gpuSummary: devInfo?.gpuSummary,
          screenSummary: devInfo?.screenSummary,
          timezone: devInfo?.timezone,
          browsersSeen: mergeBrowsers([], devInfo?.browser),
        };
        await supabaseAdmin
          .from('student_devices')
          .upsert([{
            student_id: insertedUser.id,
            device_fingerprint: regFp,
            device_name: devInfo?.name || 'الجهاز الأساسي للتسجيل',
            browser_info: serializeStoredDeviceMeta(regMeta),
            is_primary: true,
            last_active: new Date().toISOString(),
          }], { onConflict: 'student_id,device_fingerprint' });
      } catch (devErr) {
        console.warn('student_devices logging warning:', devErr);
      }
    }

    // 11. Security Audit Log & Device Tracking Chain
    try {
      const detailsPayload: any = {
        phone: cleanPhone,
        stage: stage,
        grade: grade,
        education_type: education_type,
        fingerprint: fingerprint,
        hardwareSignature: studentData.hardwareSignature || null,
      };

      if (siblingProfiles && siblingProfiles.length > 0) {
        detailsPayload.isSharedDevice = true;
        detailsPayload.siblingCount = siblingProfiles.length;
        detailsPayload.siblingNames = siblingProfiles.map(s => s.full_name);
        detailsPayload.siblingPhones = siblingProfiles.map(s => s.phone);
      }

      await supabaseAdmin.from('audit_logs').insert([{
        actor_name: studentData.fullName?.trim() || 'طالب جديد',
        actor_role: 'student',
        action_type: siblingProfiles && siblingProfiles.length > 0 ? 'STUDENT_SHARED_DEVICE_REGISTERED' : 'STUDENT_REGISTRATION_SUBMITTED',
        target_entity: 'profiles',
        target_id: insertedUser?.id,
        details: detailsPayload,
      }]);
    } catch {}

    return { 
      success: true, 
      studentId: insertedUser?.id,
      student: insertedUser 
    };
  } catch (err: any) {
    console.error('Exception registering student:', err);
    return { success: false, error: err.message || 'حدث خطأ غير متوقع أثناء التسجيل' };
  }
}

// =========================================================================
// PER-COURSE HARDWARE SECURITY & DEVICE MANAGEMENT ACTIONS
// =========================================================================

export async function getStudentRegisteredDevicesAction(studentId: string, courseIdFilter?: string) {
  try {
    const cleanStudentId = (studentId || '').trim();
    if (!cleanStudentId) {
      return { success: false, devices: [], courseGroups: [], loginDevices: [], message: 'معرف الطالب غير محدد' };
    }

    const session = await requireStudentOrStaffSession(cleanStudentId);
    if (!session) {
      return { success: false, devices: [], courseGroups: [], loginDevices: [], message: 'غير مصرح بالوصول لبيانات أجهزة هذا الحساب.' };
    }

    // 1. Login hardware history (passive physical devices recorded in student_devices)
    const { data: rawLoginDevs } = await supabaseAdmin
      .from('student_devices')
      .select('*')
      .eq('student_id', cleanStudentId)
      .order('is_primary', { ascending: false })
      .order('last_active', { ascending: false });

    const loginDevices = (rawLoginDevs || []).map((d: any) => {
      const meta = parseStoredDeviceMeta(d.browser_info);
      return {
        id: d.id,
        fingerprint: d.device_fingerprint,
        hardwareCoreId: meta.hardwareCoreId || d.device_fingerprint,
        name: d.device_name || 'جهاز دخول مسجل',
        browser: meta.browsersSeen[0] || 'متصفح ويب',
        browsersSeen: meta.browsersSeen,
        deviceType: (meta.deviceType as any) || 'desktop',
        os: meta.os || 'Other',
        isPrimary: Boolean(d.is_primary),
        registeredAt: d.created_at || new Date().toISOString(),
        lastActive: d.last_active || d.created_at || new Date().toISOString(),
      };
    });

    // 2. Enrolled courses + per-course configured maxDevices
    const { data: enrollments } = await supabaseAdmin
      .from('course_enrollments')
      .select('course_id, enrolled_at, payment_method')
      .eq('student_id', cleanStudentId)
      .eq('is_active', true);

    const { data: bindingLogs } = await supabaseAdmin
      .from('audit_logs')
      .select('target_id, details, updated_at, created_at')
      .eq('target_entity', 'course_device_bindings')
      .eq('actor_id', cleanStudentId);

    const courseIdsSet = new Set<string>();
    (enrollments || []).forEach((e: any) => e.course_id && courseIdsSet.add(e.course_id));
    (bindingLogs || []).forEach((b: any) => b.target_id && courseIdsSet.add(b.target_id));
    if (courseIdFilter) courseIdsSet.add(courseIdFilter);

    const courseIds = Array.from(courseIdsSet);
    const courseMetaMap: Record<string, { title: string; maxDevices: number; isUnlimited: boolean }> = {};

    if (courseIds.length > 0) {
      const { data: courseRows } = await supabaseAdmin
        .from('courses')
        .select('id, title, description')
        .in('id', courseIds);

      (courseRows || []).forEach((c: any) => {
        const maxDev = parseCourseMetaMaxDevices(c.description, null);
        courseMetaMap[c.id] = {
          title: c.title || 'كورس تعليمي',
          maxDevices: maxDev,
          isUnlimited: maxDev >= 1000 || maxDev === 0,
        };
      });
    }

    const bindingsByCourse: Record<string, any[]> = {};
    (bindingLogs || []).forEach((row: any) => {
      const cid = row.target_id || row.details?.courseId;
      if (cid && Array.isArray(row.details?.devices)) {
        bindingsByCourse[cid] = row.details.devices;
      }
    });

    const courseGroups = courseIds.map((cid) => {
      const cMeta = courseMetaMap[cid] || { title: 'كورس تعليمي', maxDevices: 3, isUnlimited: false };
      const rawDevs = bindingsByCourse[cid] || [];
      const mappedDevs = rawDevs.map((d: any) => ({
        id: d.id,
        fingerprint: d.fingerprint,
        hardwareCoreId: d.hardwareCoreId || d.fingerprint,
        name: d.name || (d.isPrimary ? 'جهاز التفعيل الأساسي' : 'جهاز إضافي'),
        browser: Array.isArray(d.browsersSeen) && d.browsersSeen.length > 0 ? d.browsersSeen[0] : 'متصفح ويب',
        browsersSeen: Array.isArray(d.browsersSeen) ? d.browsersSeen : [],
        deviceType: d.deviceType || 'desktop',
        os: d.os || 'Other',
        isPrimary: Boolean(d.isPrimary),
        registeredAt: d.boundAt || new Date().toISOString(),
        lastActive: d.lastActive || d.boundAt || new Date().toISOString(),
        courseId: cid,
        courseTitle: cMeta.title,
        activatedVia: d.activatedVia,
      }));

      return {
        courseId: cid,
        courseTitle: cMeta.title,
        maxDevices: cMeta.maxDevices,
        isUnlimited: cMeta.isUnlimited,
        activeCount: mappedDevs.length,
        remainingSlots: cMeta.isUnlimited ? null : Math.max(0, cMeta.maxDevices - mappedDevs.length),
        devices: mappedDevs,
      };
    });

    const flattenedDevices = courseIdFilter
      ? (courseGroups.find((g) => g.courseId === courseIdFilter)?.devices || [])
      : courseGroups.flatMap((g) => g.devices);

    return {
      success: true,
      devices: flattenedDevices,
      courseGroups,
      loginDevices,
    };
  } catch (err: any) {
    console.error('getStudentRegisteredDevicesAction error:', err);
    return { success: false, devices: [], courseGroups: [], loginDevices: [], error: err.message };
  }
}

export async function deleteStudentSecondaryDeviceAction(studentId: string, deviceId: string, courseId?: string) {
  try {
    const cleanStudentId = (studentId || '').trim();
    const cleanDeviceId = (deviceId || '').trim();
    const cleanCourseId = (courseId || '').trim();

    if (!cleanStudentId || !cleanDeviceId) {
      return { success: false, message: 'بيانات غير صالحة' };
    }

    const session = await requireStudentOrStaffSession(cleanStudentId);
    if (!session) {
      return { success: false, message: 'غير مصرح لك بإدارة أجهزة هذا الحساب.' };
    }

    let query = supabaseAdmin
      .from('audit_logs')
      .select('id, target_id, details')
      .eq('target_entity', 'course_device_bindings')
      .eq('actor_id', cleanStudentId);

    if (cleanCourseId) {
      query = query.eq('target_id', cleanCourseId);
    }

    const { data: bindingRows } = await query;

    let targetRow: any = null;
    let targetDevice: any = null;

    for (const row of bindingRows || []) {
      const devs = Array.isArray(row.details?.devices) ? row.details.devices : [];
      const found = devs.find((d: any) => d.id === cleanDeviceId);
      if (found) {
        targetRow = row;
        targetDevice = found;
        break;
      }
    }

    if (!targetRow || !targetDevice) {
      return { success: false, message: 'الجهاز غير موجود في هذا الكورس أو تم حذفه مسبقاً' };
    }

    if (targetDevice.isPrimary) {
      return {
        success: false,
        message: 'عذراً! هذا هو الجهاز الأساسي المرتبط بتفعيل الكورس ولا يمكن حذفه نهائياً. يمكنك حذف أو استبدال الأجهزة الإضافية فقط ضمن الحد المسموح للكورس.',
      };
    }

    const updatedDevices = (targetRow.details?.devices || []).filter((d: any) => d.id !== cleanDeviceId);
    const updatedDetails = {
      ...targetRow.details,
      devices: updatedDevices,
      updatedAt: new Date().toISOString(),
    };

    const { error: updErr } = await supabaseAdmin
      .from('audit_logs')
      .update({ details: updatedDetails })
      .eq('id', targetRow.id);

    if (updErr) {
      return { success: false, message: 'تعذر حذف الجهاز، يرجى المحاولة لاحقاً' };
    }

    try {
      await supabaseAdmin.from('audit_logs').insert([{
        actor_id: cleanStudentId,
        actor_role: 'student',
        action_type: 'STUDENT_SECONDARY_DEVICE_REMOVED',
        target_entity: 'course_device_bindings',
        target_id: targetRow.target_id,
        details: {
          removed_device_id: cleanDeviceId,
          removed_device_fingerprint: targetDevice.fingerprint,
          removed_hardware_core: targetDevice.hardwareCoreId,
          removed_device_name: targetDevice.name,
          courseId: targetRow.target_id,
        },
      }]);
    } catch {}

    return {
      success: true,
      message: 'تم إزالة الجهاز الإضافي بنجاح! يمكنك الآن تشغيل الكورس من جهاز بديل ضمن الحد المسموح.',
    };
  } catch (err: any) {
    console.error('deleteStudentSecondaryDeviceAction error:', err);
    return { success: false, message: err.message || 'حدث خطأ أثناء إزالة الجهاز' };
  }
}

export async function checkAndRegisterStudentDeviceAction(
  studentId: string,
  fingerprint: string,
  deviceInfo?: IncomingHardwareContext,
  courseId?: string
) {
  try {
    const cleanStudentId = (studentId || '').trim();
    const cleanFp = (fingerprint || '').trim();
    const cleanCourseId = (courseId || '').trim();

    if (!cleanStudentId || (!cleanFp && !deviceInfo?.hardwareCoreId)) {
      return { allowed: false, message: 'بيانات الجهاز غير مكتملة' };
    }

    const session = await requireStudentOrStaffSession(cleanStudentId);
    if (!session) {
      return { allowed: false, message: 'يرجى تسجيل الدخول للتحقق من أمان الجهاز.' };
    }

    if (cleanCourseId) {
      return await verifyAndEnforceCourseDeviceServer(cleanStudentId, cleanCourseId, cleanFp || deviceInfo?.hardwareCoreId || '', deviceInfo);
    }

    // Without courseId: silent login hardware check (only blocks banned hardware)
    return await recordStudentLoginDevice(cleanStudentId, cleanFp || deviceInfo?.hardwareCoreId || '', deviceInfo);
  } catch (err: any) {
    console.error('checkAndRegisterStudentDeviceAction error:', err);
    return { allowed: false, message: err.message || 'حدث خطأ أثناء فحص الجهاز' };
  }
}

export async function getStudentProfilesByIdsAction(studentIds: string[]) {
  try {
    const session = await requireStaffSession();
    if (!session) {
      return { success: false, profiles: [] };
    }

    if (!studentIds || studentIds.length === 0) {
      return { success: true, profiles: [] };
    }
    const isValidUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const cleanIds = Array.from(new Set(studentIds.map(s => (s || '').trim()).filter(id => Boolean(id) && isValidUUID(id))));
    if (cleanIds.length === 0) {
      return { success: true, profiles: [] };
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, phone, parent_phone, phone_carrier, avatar_url, role, status, stage, grade, education_type')
      .in('id', cleanIds);

    if (error) {
      console.warn('getStudentProfilesByIdsAction query error:', error);
      return { success: false, profiles: [] };
    }

    return { success: true, profiles: data || [] };
  } catch (err: any) {
    console.error('getStudentProfilesByIdsAction exception:', err);
    return { success: false, profiles: [] };
  }
}

export async function saveStudentItemProgressAction(payload: {
  id?: string;
  studentId: string;
  courseId: string;
  itemId: string;
  status: string;
  attemptsCount: number;
  highestScore: number;
  lastScore: number;
  isPassed: boolean;
  studentAnswers?: any;
  completedAt?: string;
  updatedAt?: string;
}) {
  try {
    const {
      id,
      studentId,
      courseId,
      itemId,
      status,
      attemptsCount,
      highestScore,
      lastScore,
      isPassed,
      studentAnswers,
      completedAt,
      updatedAt
    } = payload;

    if (!studentId || !courseId || !itemId) {
      return { success: false, error: 'بيانات غير مكتملة' };
    }

    const session = await requireStudentOrStaffSession(studentId);
    if (!session) {
      return { success: false, error: 'غير مصرح بتسجيل التقدم لهذا الحساب.' };
    }

    const recordId = id || crypto.randomUUID();

    const dbPayload: any = {
      id: recordId,
      student_id: studentId,
      course_id: courseId,
      item_id: itemId,
      status: status || 'in_progress',
      attempts_count: attemptsCount || 1,
      highest_score: highestScore ?? 0,
      last_score: lastScore ?? 0,
      is_passed: isPassed ?? false,
      student_answers: studentAnswers || null,
      completed_at: completedAt || null,
      updated_at: updatedAt || new Date().toISOString(),
    };

    const { error } = await supabaseAdmin
      .from('student_item_progress')
      .upsert(dbPayload, { onConflict: 'student_id,item_id' });

    if (error) {
      console.warn('saveStudentItemProgressAction error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('saveStudentItemProgressAction exception:', err);
    return { success: false, error: err.message || 'حدث خطأ أثناء حفظ تقدم الطالب' };
  }
}

/**
 * Zero-Knowledge Policy: Neither Teacher nor Assistants can directly read or overwrite student passwords.
 * Teacher grants one-time reset permission so the student creates their own new password.
 */
export async function updateStudentPasswordByTeacherAction(_studentId: string, _newPassword: string) {
  return {
    success: false,
    message: 'لأقصى درجات الخصوصية والأمان، لا يمكن لأي شخص (حتى الإدارة) تعديل كلمة مرور الطالب مباشرة أو الاطلاع عليها. استخدم زر "السماح بتغيير كلمة المرور" ليقوم الطالب بإنشاء كلمة المرور الجديدة بنفسه.',
  };
}

// =========================================================================
// ZERO-KNOWLEDGE TEACHER-AUTHORIZED PASSWORD RESET SYSTEM
// =========================================================================

const TEACHER_RESET_WHATSAPP_NUMBER = '201552191172';

function buildPasswordResetWhatsappUrl(student: { full_name: string; email: string; phone: string }) {
  const text = [
    'مرحباً مستر محمد رضوان أنا نسيت كلمة المرور الخاصة بي، ممكن حضرتك تسمح لي بإنشاء كلمة مرور جديدة؟',
    '',
    `• اسم الطالب: ${student.full_name}`,
    `• البريد الإلكتروني المسجل: ${student.email}`,
    `• رقم الهاتف المسجل: ${student.phone}`,
  ].join('\n');
  return `https://wa.me/${TEACHER_RESET_WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

async function lookupStudentForPasswordReset(identifier: string) {
  const raw = (identifier || '').trim();
  const normalized = normalizeEasternArabicDigits(raw);
  const cleanEmail = normalized.toLowerCase();
  const cleanPhone = cleanEgyptianPhone(normalized);

  if (!normalized) return null;

  if (normalized.includes('@')) {
    if (isTeacherEmail(cleanEmail)) {
      return { isStaff: true as const, student: null };
    }
    const { data } = await supabaseAdmin
      .from('profiles')
      .select('id, role, full_name, email, phone, stage, grade, status, ban_reason, primary_device_fingerprint')
      .ilike('email', cleanEmail)
      .maybeSingle();

    if (!data) return null;
    if (data.role !== 'student') return { isStaff: true as const, student: null };
    return { isStaff: false as const, student: data };
  }

  const phoneCandidates = Array.from(
    new Set([
      cleanPhone,
      normalized,
      raw,
      cleanPhone.startsWith('0') ? cleanPhone.slice(1) : `0${cleanPhone}`,
      cleanPhone.startsWith('0') ? `+20${cleanPhone.slice(1)}` : `+20${cleanPhone}`,
      cleanPhone.startsWith('+20') ? `0${cleanPhone.slice(3)}` : cleanPhone,
    ].filter(Boolean))
  );

  if (phoneCandidates.length > 0) {
    const { data: byPhone } = await supabaseAdmin
      .from('profiles')
      .select('id, role, full_name, email, phone, stage, grade, status, ban_reason, primary_device_fingerprint')
      .in('phone', phoneCandidates)
      .order('created_at', { ascending: false })
      .limit(1);

    if (byPhone && byPhone.length > 0) {
      const p = byPhone[0];
      if (p.role !== 'student') return { isStaff: true as const, student: null };
      return { isStaff: false as const, student: p };
    }
  }

  // Exact email fallback in case input lacked @
  const { data: byEmailFallback } = await supabaseAdmin
    .from('profiles')
    .select('id, role, full_name, email, phone, stage, grade, status, ban_reason, primary_device_fingerprint')
    .ilike('email', cleanEmail)
    .maybeSingle();

  if (byEmailFallback) {
    if (byEmailFallback.role !== 'student') return { isStaff: true as const, student: null };
    return { isStaff: false as const, student: byEmailFallback };
  }

  return null;
}

export async function requestOrCheckPasswordResetAction(params: {
  identifier: string;
  deviceFingerprint?: string;
  hardwareCoreId?: string;
  candidateFingerprints?: string[];
  submitRequest?: boolean;
}) {
  try {
    const rawId = (params.identifier || '').trim();
    if (!rawId) {
      return { success: false, message: 'يرجى إدخال البريد الإلكتروني أو رقم الهاتف المسجل بحسابك.' };
    }

    const cleanFp = (params.deviceFingerprint || '').trim();
    const allFps = filterValidFingerprints([
      cleanFp,
      params.hardwareCoreId,
      ...(Array.isArray(params.candidateFingerprints) ? params.candidateFingerprints : []),
    ]);

    if (allFps.length > 0) {
      const banRes = await isDeviceBannedServer(allFps);
      if (banRes.banned) {
        return {
          success: false,
          blockedReason: 'device_banned' as const,
          message: 'هذا الجهاز محظور نهائياً من إدارة المنصة ولا يمكن إجراء استعادة كلمة المرور من خلاله.',
        };
      }
    }

    const lookup = await lookupStudentForPasswordReset(rawId);
    if (!lookup) {
      return {
        success: false,
        notFound: true,
        message: 'لا يوجد حساب طالب مسجل بهذا البريد الإلكتروني أو رقم الهاتف. يرجى التأكد من البيانات المدخلة.',
      };
    }

    if (lookup.isStaff || !lookup.student) {
      return {
        success: false,
        blockedReason: 'staff_protected' as const,
        message: 'بوابة استعادة كلمة المرور مخصصة للطلاب فقط. الحسابات الإدارية تُدار عبر الإدارة العليا.',
      };
    }

    const student = lookup.student;

    if (student.status === 'banned') {
      return {
        success: false,
        blockedReason: 'banned' as const,
        message: 'هذا الحساب محظور أمنياً من إدارة المنصة ولا يمكن استعادة كلمة المرور.',
      };
    }

    if (student.status === 'rejected') {
      return {
        success: false,
        blockedReason: 'rejected' as const,
        message: 'تم رفض طلب تسجيل هذا الحساب مسبقاً.',
      };
    }

    if (student.status === 'pending_review') {
      return {
        success: false,
        blockedReason: 'pending_review' as const,
        message: 'حسابك لا يزال قيد المراجعة والاعتماد الأولي من مستر محمد رضوان ولم يتم تفعيله بعد.',
      };
    }

    // Fetch existing password_reset audit records for this student
    const { data: logs } = await supabaseAdmin
      .from('audit_logs')
      .select('id, action_type, details, created_at')
      .eq('target_entity', 'password_reset')
      .eq('target_id', student.id)
      .order('created_at', { ascending: false })
      .limit(50);

    const nowMs = Date.now();
    const activeApproved = (logs || []).find((row: any) => {
      const d = row.details || {};
      if (d.status !== 'approved') return false;
      const exp = d.expiresAt ? new Date(d.expiresAt).getTime() : 0;
      return exp > nowMs;
    });

    if (activeApproved) {
      const d = activeApproved.details || {};
      return {
        success: true,
        status: 'approved' as const,
        requestId: d.requestId || activeApproved.id,
        studentId: student.id,
        studentName: student.full_name,
        email: student.email,
        maskedEmail: maskEmail(student.email),
        expiresAt: d.expiresAt,
        approvedAt: d.approvedAt,
        message: 'تمت موافقة مستر محمد رضوان! يمكنك الآن إنشاء كلمة مرور جديدة وتأكيدها بنفسك.',
      };
    }

    const activePending = (logs || []).find((row: any) => {
      const d = row.details || {};
      if (d.status !== 'pending') return false;
      const createdMs = new Date(row.created_at).getTime();
      return nowMs - createdMs < 24 * 60 * 60 * 1000;
    });

    const whatsappUrl = buildPasswordResetWhatsappUrl(student);

    if (activePending) {
      const d = activePending.details || {};
      return {
        success: true,
        status: 'pending' as const,
        alreadyRequested: true,
        requestId: d.requestId || activePending.id,
        studentId: student.id,
        studentName: student.full_name,
        studentEmail: student.email,
        maskedEmail: maskEmail(student.email),
        studentPhone: student.phone,
        whatsappUrl,
        requestedAt: activePending.created_at,
        message: 'طلبك مسجل بالفعل في لوحة المعلم وبانتظار موافقة مستر محمد رضوان. يمكنك أيضاً إرسال تذكير عبر واتساب.',
      };
    }

    const latestRow = logs && logs.length > 0 ? logs[0] : null;
    if (!params.submitRequest) {
      const latestDetails = latestRow?.details || {};
      if (latestDetails.status === 'rejected' && latestRow) {
        const rejAgeMs = nowMs - new Date(latestRow.created_at).getTime();
        if (rejAgeMs < 15 * 60 * 1000) {
          return {
            success: true,
            status: 'rejected' as const,
            studentName: student.full_name,
            maskedEmail: maskEmail(student.email),
            whatsappUrl,
            message: latestDetails.reason || 'تم إلغاء / رفض طلب الاستعادة السابق من الإدارة. يمكنك إرسال طلب جديد أو التواصل عبر واتساب.',
          };
        }
      }

      return {
        success: true,
        status: 'none' as const,
        studentName: student.full_name,
        maskedEmail: maskEmail(student.email),
        message: 'تم العثور على الحساب. اضغط لإرسال طلب السماح للمعلم.',
      };
    }

    // Check whether request originates from a registered trusted device for teacher visibility
    let deviceMatch = false;
    if (allFps.length > 0) {
      if (student.primary_device_fingerprint && allFps.includes(student.primary_device_fingerprint)) {
        deviceMatch = true;
      } else {
        const { data: devs } = await supabaseAdmin
          .from('student_devices')
          .select('device_fingerprint')
          .eq('student_id', student.id);
        if (devs && devs.some((dv: any) => allFps.includes(dv.device_fingerprint))) {
          deviceMatch = true;
        }
      }
    }

    const requestId = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    const { error: insertErr } = await supabaseAdmin.from('audit_logs').insert([{
      actor_id: student.id,
      actor_name: student.full_name,
      actor_role: 'student',
      action_type: 'PASSWORD_RESET_REQUEST',
      target_entity: 'password_reset',
      target_id: student.id,
      details: {
        requestId,
        status: 'pending',
        studentId: student.id,
        studentName: student.full_name,
        studentEmail: student.email,
        studentPhone: student.phone,
        stage: student.stage,
        grade: student.grade,
        deviceFingerprint: cleanFp || null,
        deviceMatch,
        requestedAt: nowIso,
      },
    }]);

    if (insertErr) {
      console.error('Error inserting password reset request:', insertErr);
      return { success: false, message: 'تعذر تسجيل طلب الاستعادة حالياً. يرجى المحاولة مرة أخرى.' };
    }

    return {
      success: true,
      status: 'pending' as const,
      alreadyRequested: false,
      requestId,
      studentId: student.id,
      studentName: student.full_name,
      studentEmail: student.email,
      maskedEmail: maskEmail(student.email),
      studentPhone: student.phone,
      whatsappUrl,
      requestedAt: nowIso,
      message: 'تم إرسال طلبك مباشرة إلى لوحة مستر محمد رضوان على المنصة! يمكنك أيضاً مراسلته على واتساب بالرسالة الجاهزة لتسريع الموافقة.',
    };
  } catch (err: any) {
    console.error('requestOrCheckPasswordResetAction error:', err);
    return { success: false, message: err.message || 'حدث خطأ غير متوقع' };
  }
}

export async function completeStudentPasswordResetAction(params: {
  identifier: string;
  newPassword: string;
  confirmPassword: string;
  deviceFingerprint?: string;
  hardwareCoreId?: string;
  candidateFingerprints?: string[];
}) {
  try {
    const rawId = (params.identifier || '').trim();
    const cleanPass = (params.newPassword || '').trim();
    const cleanConfirm = (params.confirmPassword || '').trim();
    const cleanFp = (params.deviceFingerprint || '').trim();
    const allFps = filterValidFingerprints([
      cleanFp,
      params.hardwareCoreId,
      ...(Array.isArray(params.candidateFingerprints) ? params.candidateFingerprints : []),
    ]);

    if (!rawId) {
      return { success: false, message: 'بيانات الحساب غير محددة.' };
    }
    if (!cleanPass || cleanPass.length < 8) {
      return { success: false, message: 'كلمة المرور الجديدة يجب أن تتكون من 8 خانات على الأقل.' };
    }
    if (cleanPass.length > 128) {
      return { success: false, message: 'كلمة المرور طويلة جداً.' };
    }
    if (/\s/.test(cleanPass)) {
      return { success: false, message: 'كلمة المرور لا يجب أن تحتوي على مسافات.' };
    }
    if (cleanPass !== cleanConfirm) {
      return { success: false, message: 'كلمتا المرور غير متطابقتين. يرجى التأكد وإعادة المحاولة.' };
    }

    if (allFps.length > 0) {
      const banRes = await isDeviceBannedServer(allFps);
      if (banRes.banned) {
        return { success: false, message: 'هذا الجهاز محظور نهائياً من إدارة المنصة.' };
      }
    }

    const lookup = await lookupStudentForPasswordReset(rawId);
    if (!lookup || lookup.isStaff || !lookup.student) {
      return { success: false, message: 'تعذر التحقق من حساب الطالب.' };
    }

    const student = lookup.student;
    if (student.status !== 'active') {
      return { success: false, message: 'حساب الطالب غير مفعل حالياً.' };
    }

    const { data: logs } = await supabaseAdmin
      .from('audit_logs')
      .select('id, action_type, details, created_at')
      .eq('target_entity', 'password_reset')
      .eq('target_id', student.id)
      .order('created_at', { ascending: false })
      .limit(50);

    const nowMs = Date.now();
    const approvedRow = (logs || []).find((row: any) => {
      const d = row.details || {};
      if (d.status !== 'approved') return false;
      const exp = d.expiresAt ? new Date(d.expiresAt).getTime() : 0;
      return exp > nowMs;
    });

    if (!approvedRow) {
      return {
        success: false,
        message: 'لم تتم الموافقة من المعلم بعد أو انتهت صلاحية الإذن. يرجى طلب السماح مجدداً.',
      };
    }

    const hashedPassword = await hashPasswordSecure(cleanPass);
    const verifiedSelfCheck = await verifyPasswordSecure(cleanPass, hashedPassword);
    if (!verifiedSelfCheck) {
      return {
        success: false,
        message: 'تعذر التحقق من تشفير كلمة المرور الجديدة. يرجى إعادة المحاولة.',
      };
    }

    const nowIso = new Date().toISOString();

    const { error: updateErr } = await supabaseAdmin
      .from('profiles')
      .update({
        password_hash: hashedPassword,
        encrypted_password_vault: null,
        updated_at: nowIso,
      })
      .eq('id', student.id);

    if (updateErr) {
      return { success: false, message: 'تعذر حفظ كلمة المرور الجديدة: ' + updateErr.message };
    }

    // Atomically consume & invalidate all approved/pending reset rows so permission is strictly one-time
    for (const row of logs || []) {
      const d = row.details || {};
      if (d.status === 'approved' || d.status === 'pending') {
        await supabaseAdmin
          .from('audit_logs')
          .update({
            action_type: d.status === 'approved' ? 'PASSWORD_RESET_COMPLETED' : 'PASSWORD_RESET_SUPERSEDED',
            details: {
              ...d,
              status: d.status === 'approved' ? 'completed' : 'superseded',
              completedAt: nowIso,
              completedDeviceFp: cleanFp || null,
            },
          })
          .eq('id', row.id);
      }
    }

    // Security Audit Log (Zero-Knowledge: never logs any password)
    try {
      await supabaseAdmin.from('audit_logs').insert([{
        actor_id: student.id,
        actor_name: student.full_name,
        actor_role: 'student',
        action_type: 'STUDENT_PASSWORD_SELF_RESET_COMPLETED',
        target_entity: 'profiles',
        target_id: student.id,
        details: {
          studentEmail: student.email,
          completedAt: nowIso,
          deviceFp: cleanFp || null,
        },
      }]);
    } catch {}

    // Notify Student
    try {
      await supabaseAdmin.from('student_notifications').insert([{
        student_id: student.id,
        type: 'password_reset_completed',
        title: 'تم تحديث كلمة المرور وتشفيرها بنجاح 🔐',
        message: 'تم إلغاء كلمة المرور السابقة وتفعيل كلمتك الجديدة بنظام التشفير الأحادي الآمن.',
        link: '/login',
      }]);
    } catch {}

    return {
      success: true,
      email: student.email,
      message: 'تم حفظ كلمة المرور الجديدة وتشفيرها بنجاح، وإلغاء كلمة المرور السابقة نهائياً!',
    };
  } catch (err: any) {
    console.error('completeStudentPasswordResetAction error:', err);
    return { success: false, message: err.message || 'حدث خطأ أثناء تعيين كلمة المرور الجديدة' };
  }
}

export interface PasswordResetRequestItem {
  id: string;
  requestId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  stage: string;
  grade: number;
  avatarUrl: string | null;
  studentStatus: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'expired' | 'superseded';
  deviceFingerprint: string | null;
  deviceMatch: boolean;
  requestedAt: string;
  approvedAt?: string;
  expiresAt?: string;
  completedAt?: string;
  reason?: string;
}

export async function fetchPasswordResetRequestsAction(): Promise<{
  success: boolean;
  requests: PasswordResetRequestItem[];
  message?: string;
}> {
  try {
    const teacher = await requireTeacherSession();
    if (!teacher) {
      return { success: false, requests: [], message: 'صلاحية حصرية للمعلم فقط.' };
    }

    const { data: logs, error } = await supabaseAdmin
      .from('audit_logs')
      .select('id, actor_id, actor_name, action_type, target_id, details, created_at')
      .eq('target_entity', 'password_reset')
      .order('created_at', { ascending: false })
      .limit(250);

    if (error) {
      return { success: false, requests: [], message: error.message };
    }

    const studentIds = Array.from(new Set((logs || []).map((l: any) => l.target_id || l.actor_id).filter(Boolean)));
    const profileMap: Record<string, any> = {};

    if (studentIds.length > 0) {
      const { data: profs } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email, phone, stage, grade, avatar_url, status')
        .in('id', studentIds);
      (profs || []).forEach((p: any) => {
        profileMap[p.id] = p;
      });
    }

    const nowMs = Date.now();
    const mapped: PasswordResetRequestItem[] = (logs || [])
      .map((row: any) => {
        const d = row.details || {};
        const sid = row.target_id || d.studentId || row.actor_id;
        const prof = profileMap[sid];
        let status = (d.status || 'pending') as PasswordResetRequestItem['status'];
        if (status === 'approved' && d.expiresAt && new Date(d.expiresAt).getTime() <= nowMs) {
          status = 'expired';
        }
        return {
          id: row.id,
          requestId: d.requestId || row.id,
          studentId: sid,
          studentName: prof?.full_name || d.studentName || row.actor_name || 'طالب',
          studentEmail: prof?.email || d.studentEmail || '',
          studentPhone: prof?.phone || d.studentPhone || '',
          stage: prof?.stage || d.stage || 'high',
          grade: Number(prof?.grade || d.grade || 1),
          avatarUrl: prof?.avatar_url || null,
          studentStatus: prof?.status || 'active',
          status,
          deviceFingerprint: d.deviceFingerprint || null,
          deviceMatch: Boolean(d.deviceMatch),
          requestedAt: d.requestedAt || row.created_at,
          approvedAt: d.approvedAt,
          expiresAt: d.expiresAt,
          completedAt: d.completedAt,
          reason: d.reason,
        };
      })
      .filter((r) => r.status !== 'superseded');

    const priorityOrder: Record<string, number> = {
      pending: 0,
      approved: 1,
      completed: 2,
      expired: 3,
      rejected: 4,
    };

    mapped.sort((a, b) => {
      const pa = priorityOrder[a.status] ?? 9;
      const pb = priorityOrder[b.status] ?? 9;
      if (pa !== pb) return pa - pb;
      return new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime();
    });

    return { success: true, requests: mapped };
  } catch (err: any) {
    console.error('fetchPasswordResetRequestsAction error:', err);
    return { success: false, requests: [], message: err.message };
  }
}

export async function authorizeStudentPasswordResetByTeacherAction(studentId: string, requestId?: string) {
  try {
    const teacher = await requireTeacherSession();
    if (!teacher) {
      return { success: false, message: 'هذه الصلاحية الحساسة حصرية للمعلم (مستر محمد رضوان) فقط.' };
    }

    const cleanId = (studentId || '').trim();
    if (!cleanId) {
      return { success: false, message: 'معرف الطالب غير صالح.' };
    }

    const { data: student, error } = await supabaseAdmin
      .from('profiles')
      .select('id, role, full_name, email, phone, stage, grade, status')
      .eq('id', cleanId)
      .maybeSingle();

    if (error || !student || student.role !== 'student') {
      return { success: false, message: 'تعذر العثور على حساب الطالب.' };
    }

    if (student.status === 'banned' || student.status === 'rejected') {
      return { success: false, message: 'لا يمكن منح إذن استعادة كلمة مرور لحساب محظور أو مرفوض.' };
    }

    const nowIso = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { data: existingLogs } = await supabaseAdmin
      .from('audit_logs')
      .select('id, details, created_at')
      .eq('target_entity', 'password_reset')
      .eq('target_id', cleanId)
      .order('created_at', { ascending: false })
      .limit(20);

    let updatedTargetRow = false;

    for (const row of existingLogs || []) {
      const d = row.details || {};
      const matchesTarget = requestId ? (d.requestId === requestId || row.id === requestId) : d.status === 'pending';

      if (matchesTarget && !updatedTargetRow && (d.status === 'pending' || d.status === 'approved')) {
        await supabaseAdmin
          .from('audit_logs')
          .update({
            action_type: 'PASSWORD_RESET_APPROVED',
            details: {
              ...d,
              status: 'approved',
              approvedAt: nowIso,
              approvedBy: teacher.fullName,
              expiresAt,
            },
          })
          .eq('id', row.id);
        updatedTargetRow = true;
      } else if (d.status === 'pending' || d.status === 'approved') {
        await supabaseAdmin
          .from('audit_logs')
          .update({
            action_type: 'PASSWORD_RESET_SUPERSEDED',
            details: { ...d, status: 'superseded' },
          })
          .eq('id', row.id);
      }
    }

    if (!updatedTargetRow) {
      await supabaseAdmin.from('audit_logs').insert([{
        actor_id: cleanId,
        actor_name: student.full_name,
        actor_role: 'student',
        action_type: 'PASSWORD_RESET_APPROVED',
        target_entity: 'password_reset',
        target_id: cleanId,
        details: {
          requestId: requestId || crypto.randomUUID(),
          status: 'approved',
          studentId: student.id,
          studentName: student.full_name,
          studentEmail: student.email,
          studentPhone: student.phone,
          stage: student.stage,
          grade: student.grade,
          deviceFingerprint: null,
          deviceMatch: true,
          requestedAt: nowIso,
          approvedAt: nowIso,
          approvedBy: teacher.fullName,
          expiresAt,
        },
      }]);
    }

    // Security audit log & student notification
    try {
      await supabaseAdmin.from('audit_logs').insert([{
        actor_id: teacher.id,
        actor_name: teacher.fullName,
        actor_role: 'teacher',
        action_type: 'TEACHER_APPROVED_PASSWORD_RESET',
        target_entity: 'profiles',
        target_id: cleanId,
        details: {
          studentName: student.full_name,
          studentEmail: student.email,
          approvedAt: nowIso,
          expiresAt,
        },
      }]);
    } catch {}

    try {
      await supabaseAdmin.from('student_notifications').insert([{
        student_id: cleanId,
        type: 'password_reset_approved',
        title: 'تم السماح لك بإنشاء كلمة مرور جديدة 🔓',
        message: 'وافق مستر محمد رضوان على طلب استعادة الحساب. توجه إلى صفحة تسجيل الدخول واختر "نسيت كلمة المرور؟" لإنشاء كلمتك الجديدة بنفسك.',
        link: '/login?mode=forgot',
      }]);
    } catch {}

    return {
      success: true,
      message: `تم السماح للبريد (${student.email}) بتغيير كلمة المرور لمدة 24 ساعة (لمرة واحدة). سيتم إلغاء الكلمة القديمة فور تعيين الجديدة.`,
    };
  } catch (err: any) {
    console.error('authorizeStudentPasswordResetByTeacherAction error:', err);
    return { success: false, message: err.message || 'تعذر منح الصلاحية' };
  }
}

export async function revokePasswordResetByTeacherAction(requestId: string, studentId: string, reason?: string) {
  try {
    const teacher = await requireTeacherSession();
    if (!teacher) {
      return { success: false, message: 'صلاحية حصرية للمعلم فقط.' };
    }

    const cleanStudentId = (studentId || '').trim();
    const { data: logs } = await supabaseAdmin
      .from('audit_logs')
      .select('id, details')
      .eq('target_entity', 'password_reset')
      .eq('target_id', cleanStudentId)
      .order('created_at', { ascending: false })
      .limit(50);

    const nowIso = new Date().toISOString();
    for (const row of logs || []) {
      const d = row.details || {};
      if ((d.requestId === requestId || row.id === requestId) || (!requestId && (d.status === 'pending' || d.status === 'approved'))) {
        await supabaseAdmin
          .from('audit_logs')
          .update({
            action_type: 'PASSWORD_RESET_REJECTED',
            details: {
              ...d,
              status: 'rejected',
              rejectedAt: nowIso,
              rejectedBy: teacher.fullName,
              reason: reason || 'تم إلغاء الإذن من إدارة المنصة',
            },
          })
          .eq('id', row.id);
      }
    }

    return { success: true, message: 'تم إلغاء / رفض إذن تغيير كلمة المرور لهذا الحساب.' };
  } catch (err: any) {
    return { success: false, message: err.message || 'حدث خطأ أثناء الإلغاء' };
  }
}

export async function bulkAuthorizePasswordResetByTeacherAction(
  targets: Array<{ studentId: string; requestId?: string }>
): Promise<{
  success: boolean;
  approvedCount: number;
  failedCount: number;
  message: string;
}> {
  try {
    const teacher = await requireTeacherSession();
    if (!teacher) {
      return {
        success: false,
        approvedCount: 0,
        failedCount: targets.length,
        message: 'هذه الصلاحية الحساسة حصرية للمعلم (مستر محمد رضوان) فقط.',
      };
    }

    const uniqueTargetsMap = new Map<string, { studentId: string; requestId?: string }>();
    for (const t of targets || []) {
      const sid = (t?.studentId || '').trim();
      if (sid && !uniqueTargetsMap.has(sid)) {
        uniqueTargetsMap.set(sid, { studentId: sid, requestId: t.requestId });
      }
    }

    const uniqueTargets = Array.from(uniqueTargetsMap.values());
    if (uniqueTargets.length === 0) {
      return {
        success: false,
        approvedCount: 0,
        failedCount: 0,
        message: 'لم يتم تحديد أي طلبات صالحة.',
      };
    }

    let approvedCount = 0;
    let failedCount = 0;

    for (const target of uniqueTargets) {
      const res = await authorizeStudentPasswordResetByTeacherAction(target.studentId, target.requestId);
      if (res.success) {
        approvedCount += 1;
      } else {
        failedCount += 1;
      }
    }

    if (approvedCount === 0) {
      return {
        success: false,
        approvedCount: 0,
        failedCount,
        message: 'تعذر السماح للطلبات المحددة. يرجى التأكد من حالة حسابات الطلاب.',
      };
    }

    return {
      success: true,
      approvedCount,
      failedCount,
      message:
        failedCount > 0
          ? `تمت الموافقة والسماح لـ (${approvedCount}) طالب بتغيير كلمة المرور، وتعذر تنفيذ (${failedCount}).`
          : `تمت الموافقة الجماعية بنجاح لـ (${approvedCount}) طالب! يمكنهم الآن إنشاء كلمة المرور الجديدة وحذف القديمة.`,
    };
  } catch (err: any) {
    console.error('bulkAuthorizePasswordResetByTeacherAction error:', err);
    return {
      success: false,
      approvedCount: 0,
      failedCount: targets.length,
      message: err?.message || 'حدث خطأ أثناء التنفيذ الجماعي',
    };
  }
}

export async function bulkRevokePasswordResetByTeacherAction(
  targets: Array<{ studentId: string; requestId: string }>,
  reason?: string
): Promise<{
  success: boolean;
  revokedCount: number;
  message: string;
}> {
  try {
    const teacher = await requireTeacherSession();
    if (!teacher) {
      return { success: false, revokedCount: 0, message: 'صلاحية حصرية للمعلم فقط.' };
    }

    const uniqueTargets = (targets || []).filter(t => t?.studentId && t?.requestId);
    if (uniqueTargets.length === 0) {
      return { success: false, revokedCount: 0, message: 'لم يتم تحديد أي طلبات.' };
    }

    let revokedCount = 0;
    for (const t of uniqueTargets) {
      const res = await revokePasswordResetByTeacherAction(t.requestId, t.studentId, reason);
      if (res.success) revokedCount += 1;
    }

    return {
      success: true,
      revokedCount,
      message: `تم رفض / إلغاء (${revokedCount}) طلب استعادة كلمة مرور.`,
    };
  } catch (err: any) {
    return { success: false, revokedCount: 0, message: err?.message || 'حدث خطأ أثناء الإلغاء الجماعي' };
  }
}
