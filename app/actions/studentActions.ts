'use server';

import { supabaseAdmin } from '@/lib/supabaseServer';
import { normalizeEasternArabicDigits, cleanEgyptianPhone } from '@/lib/utils';

export async function checkDeviceStatusAction(
  deviceFingerprint: string, 
  email?: string, 
  phone?: string,
  candidateFingerprints: string[] = [],
  studentId?: string
) {
  try {
    const cleanFp = (deviceFingerprint || '').trim();
    const cleanStudentId = (studentId || '').trim();

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
          isRegistered: true,
          reason: bannedList[0].reason || 'تم حظر هذا الجهاز نهائياً من قبل إدارة المنصة',
          student: null,
        };
      }
    }

    // 2. Strict Hardware Check: Is this device already tied to a student in profiles or student_devices?
    let matchedStudent: any = null;

    if (allFps.length > 0) {
      const { data: profileByFp } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('role', 'student')
        .neq('status', 'rejected')
        .in('primary_device_fingerprint', allFps)
        .order('created_at', { ascending: false })
        .limit(1);

      if (profileByFp && profileByFp.length > 0) {
        matchedStudent = profileByFp[0];
      }

      // Check student_devices table if not matched via primary_device_fingerprint
      if (!matchedStudent) {
        const { data: devMatch } = await supabaseAdmin
          .from('student_devices')
          .select('student_id')
          .in('device_fingerprint', allFps)
          .limit(1);

        if (devMatch && devMatch.length > 0) {
          const { data: p } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', devMatch[0].student_id)
            .maybeSingle();

          if (p && p.role === 'student' && p.status !== 'rejected') {
            matchedStudent = p;
          }
        }
      }
    }

    // 3. Fallback check by cleanStudentId only if cleanStudentId is an actual authenticated student
    if (!matchedStudent && cleanStudentId && cleanStudentId.length > 10) {
      const { data: profileById } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', cleanStudentId)
        .maybeSingle();

      if (profileById && profileById.role === 'student' && profileById.status !== 'rejected') {
        matchedStudent = profileById;
      }
    }

    // If an existing student was matched on this device:
    if (matchedStudent) {
      const isBanned = matchedStudent.status === 'banned';
      return {
        isBanned: isBanned,
        isRegistered: true, // Device is registered with an existing student!
        reason: matchedStudent.ban_reason || (isBanned ? 'تم حظر هذا الحساب أو الجهاز' : undefined),
        student: {
          id: matchedStudent.id,
          fullName: matchedStudent.full_name,
          email: matchedStudent.email,
          phone: matchedStudent.phone,
          parentPhone: matchedStudent.parent_phone,
          stage: matchedStudent.stage,
          grade: matchedStudent.grade,
          educationType: matchedStudent.education_type,
          status: matchedStudent.status,
          avatarUrl: matchedStudent.avatar_url,
          whatsapp_otp: matchedStudent.whatsapp_otp,
          otp_verified: matchedStudent.otp_verified,
          createdAt: matchedStudent.created_at,
          primaryDeviceFingerprint: matchedStudent.primary_device_fingerprint,
        },
      };
    }

    return { isBanned: false, isRegistered: false, student: null };
  } catch (err) {
    console.error('Exception checking device status:', err);
    return { isBanned: false, isRegistered: false, student: null };
  }
}

export async function fetchStudentsAction(masterKey?: string) {
  try {
    const cleanKey = (masterKey || '').trim();
    const isMasterAuthorized = 
      cleanKey === 'hfhrefjker4390430458&-cmdsfo3-@iofm3omfoew' ||
      cleanKey === 'sse-000-#######-****&mr+pp' ||
      cleanKey === 'sse-000-#######-****&mr';

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('role', 'student')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching students:', error);
      return [];
    }

    return data.map((d: any) => ({
      id: d.id,
      fullName: d.full_name,
      email: d.email,
      phone: d.phone,
      parentPhone: d.parent_phone,
      stage: d.stage,
      grade: d.grade,
      educationType: d.education_type,
      status: d.status,
      // SECURITY HARDENING: Only send decrypted vault if master key was validated on server
      passwordVault: isMasterAuthorized ? (d.encrypted_password_vault || '••••••') : '••••••••',
      deviceFingerprint: d.primary_device_fingerprint,
      createdAt: d.created_at,
      avatarUrl: d.avatar_url,
      whatsapp_otp: d.whatsapp_otp,
      banReason: d.ban_reason,
    }));
  } catch (err) {
    console.error('Exception fetching students:', err);
    return [];
  }
}

/**
 * Server-Authoritative Password Vault Revealer for Super Admin (Teacher)
 */
export async function revealStudentPasswordsAction(masterKey: string) {
  try {
    const cleanKey = (masterKey || '').trim();
    const isKeyValid = 
      cleanKey === 'hfhrefjker4390430458&-cmdsfo3-@iofm3omfoew' ||
      cleanKey === 'sse-000-#######-****&mr+pp' ||
      cleanKey === 'sse-000-#######-****&mr';

    if (!isKeyValid) {
      return { success: false, message: 'المفتاح السري غير صحيح. غير مصرح لك بكشف كلمات مرور الطلاب.' };
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, encrypted_password_vault')
      .eq('role', 'student');

    if (error) {
      return { success: false, message: 'تعذر جلب كلمات المرور' };
    }

    const vaultMap: Record<string, string> = {};
    (data || []).forEach((d: any) => {
      vaultMap[d.id] = d.encrypted_password_vault || '••••••';
    });

    return { success: true, vaultMap };
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

    // Fetch all devices associated with this student
    const { data: studentDevices } = await supabaseAdmin
      .from('student_devices')
      .select('device_fingerprint')
      .eq('student_id', studentId);

    const allFingerprints = new Set<string>();
    if (updatedProfile?.primary_device_fingerprint) {
      allFingerprints.add(updatedProfile.primary_device_fingerprint);
    }
    if (studentDevices && studentDevices.length > 0) {
      studentDevices.forEach((d: any) => {
        if (d.device_fingerprint) allFingerprints.add(d.device_fingerprint);
      });
    }

    // If banned, lock all device fingerprints in banned_devices table
    if (status === 'banned' && allFingerprints.size > 0) {
      const banRecords = Array.from(allFingerprints).map(fp => ({
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
            lockedDevicesCount: allFingerprints.size,
          },
        }]);
      } catch {}
    }

    // If unbanned or activated, remove all associated devices from banned_devices
    if (status === 'active' && allFingerprints.size > 0) {
      await supabaseAdmin
        .from('banned_devices')
        .delete()
        .in('device_fingerprint', Array.from(allFingerprints));

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
            unlockedDevicesCount: allFingerprints.size,
          },
        }]);
      } catch {}
    }

    // If rejected, unbind primary_device_fingerprint and clear student_devices
    // so the student can submit a corrected application without hardware conflict
    if (status === 'rejected') {
      await supabaseAdmin.from('student_devices').delete().eq('student_id', studentId);
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

    // 2. Fetch any registered devices to release any bans on them
    const { data: registeredDevs } = await supabaseAdmin
      .from('student_devices')
      .select('device_fingerprint')
      .eq('student_id', cleanId);

    const fingerprintsToRelease = new Set<string>();
    if (student.primary_device_fingerprint) {
      fingerprintsToRelease.add(student.primary_device_fingerprint);
    }
    if (registeredDevs && registeredDevs.length > 0) {
      registeredDevs.forEach(d => {
        if (d.device_fingerprint) fingerprintsToRelease.add(d.device_fingerprint);
      });
    }

    if (fingerprintsToRelease.size > 0) {
      await supabaseAdmin
        .from('banned_devices')
        .delete()
        .in('device_fingerprint', Array.from(fingerprintsToRelease));
    }

    // 3. Delete related records
    await supabaseAdmin.from('student_devices').delete().eq('student_id', cleanId);
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
 * Reset student hardware device lock allowing student to log in from a new device
 * or re-bind their device without deleting their account or academic progress.
 */
export async function resetStudentDeviceLockAction(studentId: string) {
  try {
    const cleanId = (studentId || '').trim();
    if (!cleanId) return { success: false, message: 'معرف الطالب غير صالح' };

    // 1. Fetch student
    const { data: student } = await supabaseAdmin
      .from('profiles')
      .select('id, primary_device_fingerprint, full_name, phone')
      .eq('id', cleanId)
      .maybeSingle();

    if (!student) {
      return { success: false, message: 'الطالب غير موجود' };
    }

    // 2. Fetch any registered devices to release any bans
    const { data: registeredDevs } = await supabaseAdmin
      .from('student_devices')
      .select('device_fingerprint')
      .eq('student_id', cleanId);

    const fingerprintsToRelease = new Set<string>();
    if (student.primary_device_fingerprint) {
      fingerprintsToRelease.add(student.primary_device_fingerprint);
    }
    if (registeredDevs && registeredDevs.length > 0) {
      registeredDevs.forEach(d => {
        if (d.device_fingerprint) fingerprintsToRelease.add(d.device_fingerprint);
      });
    }

    if (fingerprintsToRelease.size > 0) {
      await supabaseAdmin
        .from('banned_devices')
        .delete()
        .in('device_fingerprint', Array.from(fingerprintsToRelease));
    }

    // 3. Clear registered devices in student_devices
    await supabaseAdmin.from('student_devices').delete().eq('student_id', cleanId);

    // 4. Reset primary_device_fingerprint in profiles so device can be re-bound
    await supabaseAdmin
      .from('profiles')
      .update({ 
        primary_device_fingerprint: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', cleanId);

    // 5. Audit Log
    try {
      await supabaseAdmin.from('audit_logs').insert([{
        actor_name: 'إدارة المنصة (المعلم)',
        actor_role: 'teacher',
        action_type: 'STUDENT_DEVICE_LOCK_RESET',
        target_entity: 'profiles',
        target_id: cleanId,
        details: {
          name: student.full_name,
          phone: student.phone,
          resetDevicesCount: fingerprintsToRelease.size,
        },
      }]);
    } catch {}

    return { success: true, message: 'تم فك قيد أجهزة الطالب بنجاح! يمكن للطالب الآن الدخول أو التسجيل مجدداً.' };
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

    const insertPayload = {
      role: 'student',
      full_name: data.fullName.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      parent_phone: data.parentPhone?.trim() || null,
      phone_carrier: carrier,
      password_hash: cleanPass,
      encrypted_password_vault: cleanPass,
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
      .select('id, full_name, email, phone, stage, grade, status, encrypted_password_vault')
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
        email: p.email,
        phone: p.phone,
        parentPhone: p.parent_phone,
        stage: p.stage,
        grade: p.grade,
        educationType: p.education_type,
        status: p.status,
        avatarUrl: p.avatar_url,
        whatsapp_otp: p.whatsapp_otp,
        otp_verified: p.otp_verified,
        createdAt: p.created_at,
        primaryDeviceFingerprint: p.primary_device_fingerprint || cleanFp,
      }
    };
  } catch (err) {
    console.error('Check student contact error:', err);
    return { exists: false };
  }
}

function parseDeviceTypeAndOs(fp: string, name?: string, browser?: string): { type: 'mobile' | 'tablet' | 'desktop'; os: string } {
  const s = `${fp} ${name || ''} ${browser || ''}`.toUpperCase();
  let type: 'mobile' | 'tablet' | 'desktop' = 'desktop';
  if (s.includes('MOBILE') || s.includes('PHONE') || s.includes('هاتف') || s.includes('موبايل')) {
    type = 'mobile';
  } else if (s.includes('TABLET') || s.includes('IPAD') || s.includes('تابلت') || s.includes('لوحي')) {
    type = 'tablet';
  }

  let os = 'UNKNOWN';
  if (s.includes('ANDROID') || s.includes('أندرويد')) os = 'ANDROID';
  else if (s.includes('IOS') || s.includes('IPHONE') || s.includes('IPAD') || s.includes('أبل')) os = 'IOS';
  else if (s.includes('WINDOWS') || s.includes('ويندوز')) os = 'WINDOWS';
  else if (s.includes('MAC') || s.includes('ماك')) os = 'MACOS';
  else if (s.includes('LINUX') || s.includes('لينكس')) os = 'LINUX';

  return { type, os };
}

async function verifyAndEnforceStudentDevice(
  studentId: string,
  cleanFp: string,
  deviceInfo?: { name?: string; browser?: string }
): Promise<{ allowed: boolean; isPrimary?: boolean; maxDevicesReached?: boolean; isBanned?: boolean; message?: string }> {
  if (!cleanFp) {
    return { allowed: true, isPrimary: true };
  }

  // 1. Is device banned in banned_devices?
  const { data: bannedCheck } = await supabaseAdmin
    .from('banned_devices')
    .select('id, reason')
    .eq('device_fingerprint', cleanFp)
    .limit(1);

  if (bannedCheck && bannedCheck.length > 0) {
    return {
      allowed: false,
      isBanned: true,
      message: 'تم حظر هذا الجهاز نهائياً من قبل إدارة المنصة. ' + (bannedCheck[0].reason || ''),
    };
  }

  // 2. Check student exemption for unlimited devices
  let hasUnlimitedDevicesExemption = false;
  try {
    const { data: profileCheck } = await supabaseAdmin
      .from('profiles')
      .select('email, full_name')
      .eq('id', studentId)
      .maybeSingle();

    if (profileCheck) {
      const emailLower = (profileCheck.email || '').toLowerCase();
      const name = profileCheck.full_name || '';
      if (
        emailLower.includes('mariam') || 
        emailLower.includes('maryam') || 
        emailLower.includes('lamees') ||
        name.includes('مريم') ||
        name.includes('لميس')
      ) {
        hasUnlimitedDevicesExemption = true;
      }
    }
  } catch (err) {
    console.warn('Error checking unlimited devices exemption:', err);
  }

  // 4. Fetch existing devices for THIS student
  const { data: studentDevices } = await supabaseAdmin
    .from('student_devices')
    .select('*')
    .eq('student_id', studentId)
    .order('is_primary', { ascending: false });

  let existingList = studentDevices || [];

  // 5. Check if this exact device fingerprint already exists for this student
  let matchedDevice = existingList.find((d: any) => d.device_fingerprint === cleanFp);

  if (matchedDevice) {
    // Update last active
    await supabaseAdmin
      .from('student_devices')
      .update({
        device_name: deviceInfo?.name || matchedDevice.device_name,
        browser_info: deviceInfo?.browser || matchedDevice.browser_info,
        last_active: new Date().toISOString(),
      })
      .eq('id', matchedDevice.id);

    return {
      allowed: true,
      isPrimary: Boolean(matchedDevice.is_primary),
    };
  }

  // 5b. If student has a legacy device slot (e.g. DEV_LEGACY_...), replace that slot with their real device token
  const legacySlot = existingList.find((d: any) => (d.device_fingerprint || '').startsWith('DEV_LEGACY_'));
  if (legacySlot) {
    await supabaseAdmin
      .from('student_devices')
      .update({
        device_fingerprint: cleanFp,
        device_name: deviceInfo?.name || legacySlot.device_name,
        browser_info: deviceInfo?.browser || legacySlot.browser_info,
        last_active: new Date().toISOString(),
      })
      .eq('id', legacySlot.id);

    if (legacySlot.is_primary) {
      await supabaseAdmin
        .from('profiles')
        .update({ primary_device_fingerprint: cleanFp })
        .eq('id', studentId);
    }

    return {
      allowed: true,
      isPrimary: Boolean(legacySlot.is_primary),
    };
  }

  // 6. New device for this student: Enforce max 2 devices limit
  if (existingList.length >= 2 && !hasUnlimitedDevicesExemption) {
    return {
      allowed: false,
      maxDevicesReached: true,
      message: 'عذراً، لقد بلغت الحد الأقصى للأجهزة المصرح بها لحسابك (جهازين فقط). لا يمكن فتح الحساب على جهاز ثالث. يرجى الدخول من أحد جهازيك المسجلين، أو إزالة الجهاز الثاني من صفحة إعدادات الحساب لإتاحة هذا الجهاز.',
    };
  }

  // 7. Register as authorized device for this student
  const isPrimary = (existingList.length === 0);
  const finalDeviceName = deviceInfo?.name || (isPrimary ? 'الجهاز الأساسي (مثبت)' : 'الجهاز الثاني');
  const finalBrowser = deviceInfo?.browser || '';

  if (isPrimary) {
    await supabaseAdmin
      .from('profiles')
      .update({ primary_device_fingerprint: cleanFp })
      .eq('id', studentId);
  }

  await supabaseAdmin.from('student_devices').insert([{
    student_id: studentId,
    device_fingerprint: cleanFp,
    device_name: finalDeviceName,
    browser_info: finalBrowser,
    is_primary: isPrimary,
    last_active: new Date().toISOString(),
  }]);

  return {
    allowed: true,
    isPrimary,
  };
}

export async function loginAction(
  emailOrPhone: string, 
  pass: string, 
  deviceFingerprint?: string,
  deviceInfo?: { name?: string; browser?: string }
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

    // Verify Password (flexible matching against raw, trimmed, normalized digits, and no-space variants)
    const userPassHash = (user.password_hash || '').trim();
    const userPassVault = (user.encrypted_password_vault || '').trim();
    const normalizedPass = normalizeEasternArabicDigits(cleanPass);
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

    const isPasswordValid = 
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

    if (!isPasswordValid) {
      return { success: false, message: 'كلمة المرور غير صحيحة. يرجى التأكد من كلمة المرور وإعادة المحاولة أو التواصل مع مستر محمد رضوان لاستعادتها.' };
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

      return {
        success: true,
        user: {
          id: user.id,
          fullName: user.full_name,
          email: user.email,
          phone: user.phone || '',
          role: 'assistant',
          status: 'active',
          assistantRoleTitle: user.carrier || 'مساعد إداري وأكاديمي',
          permissions,
        }
      };
    }

    // Teacher / Super Admin check
    if (user.role === 'teacher' || user.role === 'super_admin') {
      return {
        success: true,
        user: {
          id: user.id,
          fullName: user.full_name,
          email: user.email,
          phone: user.phone || '',
          role: 'teacher',
          status: 'active',
        }
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

    // Active student: Enforce 2-Device Policy and Anti-Account-Sharing
    if (user.status === 'active') {
      if (cleanFp) {
        const deviceResult = await verifyAndEnforceStudentDevice(user.id, cleanFp, deviceInfo);
        if (!deviceResult.allowed) {
          return {
            success: false,
            isBanned: deviceResult.isBanned,
            maxDevicesReached: deviceResult.maxDevicesReached,
            message: deviceResult.message || 'تم رفض الدخول من هذا الجهاز',
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
      
      // Success
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
    
    if (user.whatsapp_otp === otp.trim()) {
      // Mark as verified
      await supabaseAdmin
        .from('profiles')
        .update({ otp_verified: true })
        .eq('id', studentId);
        
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
  } catch (err) {
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
    const allFps = Array.from(
      new Set([fingerprint, ...candidateFps]
        .map(f => (f || '').trim())
        .filter(f => Boolean(f) && !/^DEV-(MOBILE|DESKTOP|TABLET)-(ANDROID|WINDOWS|IOS|LINUX|OTHER)-\d+X\d+/i.test(f))
      )
    );

    if (!cleanPhone || cleanPhone.length !== 11) {
      return { success: false, error: 'يرجى إدخال رقم هاتف مصري صحيح مكون من 11 رقماً.' };
    }

    if (cleanPhone === cleanParentPhone) {
      return { success: false, error: 'يجب أن يكون رقم ولي الأمر مختلفاً عن رقم هاتف الطالب.' };
    }

    if (cleanPass.length < 8) {
      return { success: false, error: 'كلمة المرور يجب أن تكون 8 خانات على الأقل.' };
    }

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

      // 2. Strict Policy: A single device CANNOT register more than one student account!
      // If this device already has an active, pending_review, or banned student:
      const { data: existingProfiles } = await supabaseAdmin
        .from('profiles')
        .select('id, status, full_name, email, phone')
        .eq('role', 'student')
        .neq('status', 'rejected')
        .in('primary_device_fingerprint', allFps)
        .limit(1);

      let deviceOwner: any = existingProfiles && existingProfiles.length > 0 ? existingProfiles[0] : null;

      if (!deviceOwner) {
        const { data: existingDevices } = await supabaseAdmin
          .from('student_devices')
          .select('student_id')
          .in('device_fingerprint', allFps)
          .limit(1);

        if (existingDevices && existingDevices.length > 0) {
          const { data: ownerProfile } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name, role, status, email, phone')
            .eq('id', existingDevices[0].student_id)
            .maybeSingle();

          if (ownerProfile && ownerProfile.role === 'student' && ownerProfile.status !== 'rejected') {
            deviceOwner = ownerProfile;
          }
        }
      }

      if (deviceOwner) {
        if (deviceOwner.status === 'banned') {
          return {
            success: false,
            error: 'عذراً، هذا الجهاز محظور نهائياً من التسجيل في المنصة بقرار من إدارة المنصة.'
          };
        }
        if (deviceOwner.status === 'pending_review') {
          return {
            success: false,
            error: `عذراً، يوجد بالفعل طلب تسجيل قيد المراجعة والتدقيق مرفوع من هذا الجهاز باسم (${deviceOwner.full_name}). تمنع سياسات المنصة تكرار الطلبات أو إنشاء أكثر من حساب من نفس الجهاز. يرجى انتظار قرار المعلم.`
          };
        }
        if (deviceOwner.status === 'active') {
          return {
            success: false,
            error: `عذراً، هذا الجهاز مسجل به بالفعل حساب طالب معتمد ومفعل بالمنصة باسم (${deviceOwner.full_name}). تمنع سياسات مستر محمد رضوان الصارمة إنشاء أي حساب إضافي من نفس الجهاز. يرجى تسجيل الدخول بحسابك المعتمد أو استخدام جهاز آخر للتسجيل.`
          };
        }
        if (deviceOwner.status === 'suspended') {
          return {
            success: false,
            error: `عذراً، هذا الحساب أو الجهاز موقوف حالياً بقرار من إدارة المنصة. تمنع لوائح المنصة إنشاء حساب جديد من نفس الجهاز.`
          };
        }
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

    // 9. Atomic & Guaranteed Insertion to profiles
    const insertPayload = {
      role: 'student',
      full_name: studentData.fullName?.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      parent_phone: cleanParentPhone || null,
      phone_carrier: carrier,
      password_hash: cleanPass, 
      encrypted_password_vault: cleanPass, 
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

    // 10. Register the primary fingerprint in student_devices
    if (insertedUser && fingerprint) {
      try {
        await supabaseAdmin
          .from('student_devices')
          .upsert([{
            student_id: insertedUser.id,
            device_fingerprint: fingerprint,
            device_name: 'الجهاز الأساسي للتسجيل',
            is_primary: true,
            last_active: new Date().toISOString(),
          }], { onConflict: 'student_id,device_fingerprint' });
      } catch (devErr) {
        console.warn('student_devices logging warning:', devErr);
      }
    }

    // 11. Optional Audit Log
    try {
      await supabaseAdmin.from('audit_logs').insert([{
        actor_name: studentData.fullName?.trim() || 'طالب جديد',
        actor_role: 'student',
        action_type: 'STUDENT_REGISTRATION_SUBMITTED',
        target_entity: 'profiles',
        target_id: insertedUser?.id,
        details: {
          phone: cleanPhone,
          stage: stage,
          grade: grade,
          education_type: education_type,
          fingerprint: fingerprint,
        },
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
// STUDENT 2-DEVICE LIMIT & HARDWARE SECURITY ACTIONS
// =========================================================================

export async function getStudentRegisteredDevicesAction(studentId: string) {
  try {
    const cleanStudentId = (studentId || '').trim();
    if (!cleanStudentId) {
      return { success: false, devices: [], message: 'معرف الطالب غير محدد' };
    }

    // 1. Fetch profile to check primary device fingerprint
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, primary_device_fingerprint')
      .eq('id', cleanStudentId)
      .maybeSingle();

    // 2. Query student_devices
    let { data: devices, error } = await supabaseAdmin
      .from('student_devices')
      .select('*')
      .eq('student_id', cleanStudentId)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('Error querying student_devices:', error);
      devices = [];
    }

    // If student_devices is empty, but profile has primary_device_fingerprint, auto-populate
    if ((!devices || devices.length === 0) && profile?.primary_device_fingerprint) {
      const primaryRecord = {
        student_id: cleanStudentId,
        device_fingerprint: profile.primary_device_fingerprint,
        device_name: 'الجهاز الأساسي (مثبت)',
        is_primary: true,
        last_active: new Date().toISOString(),
      };
      const { data: inserted } = await supabaseAdmin
        .from('student_devices')
        .insert([primaryRecord])
        .select()
        .maybeSingle();

      if (inserted) {
        devices = [inserted];
      }
    }

    const mapped = (devices || []).map((d: any) => ({
      id: d.id,
      deviceFingerprint: d.device_fingerprint,
      deviceName: d.device_name || (d.is_primary ? 'الجهاز الأساسي (مثبت)' : 'الجهاز الثاني'),
      browserInfo: d.browser_info || '',
      isPrimary: Boolean(d.is_primary),
      lastActive: d.last_active,
      createdAt: d.created_at,
    }));

    return {
      success: true,
      devices: mapped,
      totalCount: mapped.length,
      maxAllowed: 2,
    };
  } catch (err: any) {
    console.error('getStudentRegisteredDevicesAction error:', err);
    return { success: false, devices: [], error: err.message };
  }
}

export async function deleteStudentSecondaryDeviceAction(studentId: string, deviceId: string) {
  try {
    const cleanStudentId = (studentId || '').trim();
    const cleanDeviceId = (deviceId || '').trim();

    if (!cleanStudentId || !cleanDeviceId) {
      return { success: false, message: 'بيانات غير صالحة' };
    }

    // 1. Fetch device record
    const { data: device, error: fetchErr } = await supabaseAdmin
      .from('student_devices')
      .select('*')
      .eq('id', cleanDeviceId)
      .eq('student_id', cleanStudentId)
      .maybeSingle();

    if (fetchErr || !device) {
      return { success: false, message: 'الجهاز غير موجود أو تم حذفه مسبقاً' };
    }

    // 2. Strict Check: Primary device CANNOT be deleted
    if (device.is_primary) {
      return {
        success: false,
        message: 'عذراً! لا يمكن حذف الجهاز الأساسي للحساب نهائياً، هذا الجهاز مثبت دائماً لضمان أمان حسابك وحماية الكورسات من التسريب. يمكنك إزالة الجهاز الثاني فقط واستبداله.',
      };
    }

    // 3. Delete secondary device
    const { error: delErr } = await supabaseAdmin
      .from('student_devices')
      .delete()
      .eq('id', cleanDeviceId)
      .eq('student_id', cleanStudentId);

    if (delErr) {
      return { success: false, message: 'تعذر حذف الجهاز، يرجى المحاولة لاحقاً' };
    }

    // 4. Audit Log
    try {
      await supabaseAdmin.from('audit_logs').insert([{
        actor_id: cleanStudentId,
        actor_role: 'student',
        action_type: 'STUDENT_SECONDARY_DEVICE_REMOVED',
        target_entity: 'student_devices',
        target_id: cleanDeviceId,
        details: {
          removed_device_fingerprint: device.device_fingerprint,
          removed_device_name: device.device_name,
        },
      }]);
    } catch {
      // silent
    }

    return {
      success: true,
      message: 'تم حذف الجهاز الثاني بنجاح! يمكنك الآن تسجيل الدخول أو تشغيل الكورس من جهاز بديل وتعيينه كجهازك الثاني.',
    };
  } catch (err: any) {
    console.error('deleteStudentSecondaryDeviceAction error:', err);
    return { success: false, message: err.message || 'حدث خطأ أثناء إزالة الجهاز' };
  }
}

export async function checkAndRegisterStudentDeviceAction(
  studentId: string, 
  fingerprint: string, 
  deviceInfo?: { name?: string; browser?: string }
) {
  try {
    const cleanStudentId = (studentId || '').trim();
    const cleanFp = (fingerprint || '').trim();

    if (!cleanStudentId || !cleanFp) {
      return { allowed: false, message: 'بيانات غير مكتملة' };
    }

    const res = await verifyAndEnforceStudentDevice(cleanStudentId, cleanFp, deviceInfo);
    return res;
  } catch (err: any) {
    console.error('checkAndRegisterStudentDeviceAction error:', err);
    return { allowed: false, message: err.message || 'حدث خطأ أثناء فحص الجهاز' };
  }
}

export async function getStudentProfilesByIdsAction(studentIds: string[]) {
  try {
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
 * Teacher / Admin action to directly update or reset any student's password
 */
export async function updateStudentPasswordByTeacherAction(studentId: string, newPassword: string) {
  try {
    const cleanId = (studentId || '').trim();
    const cleanPass = (newPassword || '').trim();

    if (!cleanId || !cleanPass) {
      return { success: false, message: 'معرف الطالب وكلمة المرور الجديدة مطلوبان' };
    }

    if (cleanPass.length < 4) {
      return { success: false, message: 'كلمة المرور يجب أن تكون 4 خانات على الأقل' };
    }

    const { data: updated, error } = await supabaseAdmin
      .from('profiles')
      .update({
        password_hash: cleanPass,
        encrypted_password_vault: cleanPass,
        updated_at: new Date().toISOString(),
      })
      .eq('id', cleanId)
      .select('id, full_name, email, phone, encrypted_password_vault')
      .single();

    if (error || !updated) {
      return { success: false, message: 'فشل تحديث كلمة المرور في قاعدة البيانات: ' + (error?.message || '') };
    }

    // Audit log
    try {
      await supabaseAdmin.from('audit_logs').insert([{
        actor_name: 'إدارة المنصة (المعلم)',
        actor_role: 'teacher',
        action_type: 'STUDENT_PASSWORD_RESET_BY_TEACHER',
        target_entity: 'profiles',
        target_id: cleanId,
        details: {
          name: updated.full_name,
          email: updated.email,
          newPasswordVault: cleanPass,
        },
      }]);
    } catch {}

    return { 
      success: true, 
      student: updated,
      message: `تم تحديث كلمة المرور بنجاح للطالب (${updated.full_name}) إلى: ${cleanPass}` 
    };
  } catch (err: any) {
    return { success: false, message: err.message || 'حدث خطأ أثناء تعديل كلمة المرور' };
  }
}


