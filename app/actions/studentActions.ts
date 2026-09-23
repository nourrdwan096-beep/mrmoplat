'use server';

import { supabaseAdmin } from '@/lib/supabaseServer';

export async function checkDeviceStatusAction(
  deviceFingerprint: string, 
  email?: string, 
  phone?: string,
  candidateFingerprints: string[] = [],
  studentId?: string
) {
  try {
    const cleanFp = (deviceFingerprint || '').trim();
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPhone = (phone || '').trim();
    const cleanStudentId = (studentId || '').trim();

    // Consolidate all fingerprint candidates into a unique array
    const allFps = Array.from(
      new Set([cleanFp, ...(Array.isArray(candidateFingerprints) ? candidateFingerprints : [])].map(f => (f || '').trim()).filter(Boolean))
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

    // 2. Strict Check by studentId if provided (Checking if this device's student was deleted by teacher)
    let checkedStudentById = false;
    let foundStudentById: any = null;

    if (cleanStudentId) {
      checkedStudentById = true;
      const { data: profileById } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', cleanStudentId)
        .maybeSingle();

      if (profileById && profileById.role === 'student') {
        foundStudentById = profileById;
      }
    }

    // If student ID was checked and found valid student profile:
    if (foundStudentById) {
      const p = foundStudentById;
      const isBanned = p.status === 'banned';

      return {
        isBanned: isBanned,
        isRegistered: true,
        reason: p.ban_reason || (isBanned ? 'تم حظر الحساب أو الجهاز' : undefined),
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
          primaryDeviceFingerprint: p.primary_device_fingerprint,
        },
      };
    }

    // 3. Strict Check: Is any fingerprint already registered as primary_device_fingerprint for a STUDENT in profiles?
    if (allFps.length > 0) {
      const { data: profilesByFp } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('role', 'student')
        .in('primary_device_fingerprint', allFps)
        .limit(1);

      if (profilesByFp && profilesByFp.length > 0) {
        const p = profilesByFp[0];
        const isBanned = p.status === 'banned';

        return {
          isBanned: isBanned,
          isRegistered: true,
          reason: p.ban_reason || (isBanned ? 'تم حظر الحساب أو الجهاز' : undefined),
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
            primaryDeviceFingerprint: p.primary_device_fingerprint,
          },
        };
      }

      // 4. Check student_devices table with all candidate fingerprints
      const { data: deviceRecords } = await supabaseAdmin
        .from('student_devices')
        .select('student_id, is_primary')
        .in('device_fingerprint', allFps)
        .limit(1);

      if (deviceRecords && deviceRecords.length > 0) {
        const matchedStudentId = deviceRecords[0].student_id;
        const { data: studentProfile } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('id', matchedStudentId)
          .eq('role', 'student')
          .maybeSingle();

        if (studentProfile) {
          const isBanned = studentProfile.status === 'banned';
          return {
            isBanned: isBanned,
            isRegistered: true,
            reason: studentProfile.ban_reason,
            student: {
              id: studentProfile.id,
              fullName: studentProfile.full_name,
              email: studentProfile.email,
              phone: studentProfile.phone,
              parentPhone: studentProfile.parent_phone,
              stage: studentProfile.stage,
              grade: studentProfile.grade,
              educationType: studentProfile.education_type,
              status: studentProfile.status,
              avatarUrl: studentProfile.avatar_url,
              whatsapp_otp: studentProfile.whatsapp_otp,
              otp_verified: studentProfile.otp_verified,
              createdAt: studentProfile.created_at,
              primaryDeviceFingerprint: studentProfile.primary_device_fingerprint,
            },
          };
        }
      }
    }

    // 5. Secondary lookup by Email or Phone if provided (only for student profiles)
    let foundProfileByContact: any = null;
    if (cleanEmail) {
      const { data: byEmail } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('role', 'student')
        .eq('email', cleanEmail)
        .limit(1);
      if (byEmail && byEmail.length > 0) {
        foundProfileByContact = byEmail[0];
      }
    }
    if (!foundProfileByContact && cleanPhone) {
      const { data: byPhone } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('role', 'student')
        .eq('phone', cleanPhone)
        .limit(1);
      if (byPhone && byPhone.length > 0) {
        foundProfileByContact = byPhone[0];
      }
    }

    // If student was found by contact info
    if (foundProfileByContact) {
      const p = foundProfileByContact;
      const isBanned = p.status === 'banned';
      return {
        isBanned: isBanned,
        isRegistered: true,
        reason: p.ban_reason,
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
          primaryDeviceFingerprint: p.primary_device_fingerprint,
        },
      };
    }

    return { isBanned: false, isRegistered: false, student: null };
  } catch (err) {
    console.error('Exception checking device status:', err);
    return { isBanned: false, isRegistered: false, student: null };
  }
}

export async function fetchStudentsAction() {
  try {
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
      passwordVault: d.encrypted_password_vault,
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
    const cleanPhone = phone?.trim();
    const cleanEmail = email?.trim().toLowerCase();
    const cleanFp = deviceFingerprint?.trim();

    if (!cleanPhone && !cleanEmail) {
      return { exists: false };
    }

    let query = supabaseAdmin.from('profiles').select('*');
    if (cleanPhone && cleanEmail) {
      query = query.or(`phone.eq.${cleanPhone},email.eq.${cleanEmail}`);
    } else if (cleanPhone) {
      query = query.eq('phone', cleanPhone);
    } else if (cleanEmail) {
      query = query.eq('email', cleanEmail);
    }

    const { data: foundList, error } = await query.limit(1);
    if (error || !foundList || foundList.length === 0) {
      return { exists: false };
    }

    const p = foundList[0];

    // If it's a teacher or assistant
    if (p.role === 'teacher' || p.role === 'super_admin' || p.role === 'assistant') {
      return {
        exists: true,
        isStaff: true,
        message: 'هذا البريد / الرقم مسجل بالفعل كحساب إداري في المنصة. يرجى تسجيل الدخول من صفحة الدخول.'
      };
    }

    return {
      exists: true,
      isStaff: false,
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
  // 1. Is device banned?
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

  // 2. Fetch existing devices for this student
  const { data: studentDevices } = await supabaseAdmin
    .from('student_devices')
    .select('*')
    .eq('student_id', studentId)
    .order('is_primary', { ascending: false });

  let existingList = studentDevices || [];

  // Check if student has unlimited devices exemption (e.g. Maryam Ezzedine or Lamees)
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

  // Parse incoming device physical specs
  const incoming = parseDeviceTypeAndOs(cleanFp, deviceInfo?.name, deviceInfo?.browser);

  // 3. Find if this exact fingerprint or same physical device already exists
  let matchedDevice = existingList.find((d: any) => d.device_fingerprint === cleanFp);

  if (!matchedDevice) {
    // Check if any existing record is the SAME physical device category & OS (e.g. was previously opened in another browser on this phone)
    matchedDevice = existingList.find((d: any) => {
      const existing = parseDeviceTypeAndOs(d.device_fingerprint, d.device_name, d.browser_info);
      return existing.type === incoming.type && existing.os === incoming.os;
    });

    if (matchedDevice) {
      // Update its fingerprint to the unified physical fingerprint!
      await supabaseAdmin
        .from('student_devices')
        .update({
          device_fingerprint: cleanFp,
          device_name: deviceInfo?.name || matchedDevice.device_name,
          browser_info: deviceInfo?.browser || matchedDevice.browser_info,
          last_active: new Date().toISOString(),
        })
        .eq('id', matchedDevice.id);

      if (matchedDevice.is_primary) {
        await supabaseAdmin
          .from('profiles')
          .update({ primary_device_fingerprint: cleanFp })
          .eq('id', studentId);
      }
    }
  } else {
    // Exact match: update last active
    await supabaseAdmin
      .from('student_devices')
      .update({
        device_name: deviceInfo?.name || matchedDevice.device_name,
        browser_info: deviceInfo?.browser || matchedDevice.browser_info,
        last_active: new Date().toISOString(),
      })
      .eq('id', matchedDevice.id);
  }

  // 4. Consolidate any redundant duplicate records from earlier multi-browser testing on the same physical device!
  if (existingList.length > 1) {
    const devicesByPhysical = new Map<string, any>();
    const redundantIdsToDelete: string[] = [];

    for (const d of existingList) {
      const parsed = parseDeviceTypeAndOs(d.device_fingerprint, d.device_name, d.browser_info);
      const key = `${parsed.type}_${parsed.os}`;
      if (!devicesByPhysical.has(key)) {
        devicesByPhysical.set(key, d);
      } else {
        // Redundant duplicate! If current is not primary, delete it
        if (!d.is_primary) {
          redundantIdsToDelete.push(d.id);
        } else {
          // Current is primary, delete the previously stored non-primary
          const prev = devicesByPhysical.get(key);
          if (prev && !prev.is_primary) {
            redundantIdsToDelete.push(prev.id);
            devicesByPhysical.set(key, d);
          }
        }
      }
    }

    if (redundantIdsToDelete.length > 0) {
      await supabaseAdmin
        .from('student_devices')
        .delete()
        .in('id', redundantIdsToDelete);

      existingList = existingList.filter((d: any) => !redundantIdsToDelete.includes(d.id));
    }
  }

  if (matchedDevice) {
    return {
      allowed: true,
      isPrimary: Boolean(matchedDevice.is_primary),
    };
  }

  // 5. New Physical Device: Check 2-device limit (bypassed if exempted)
  if (existingList.length >= 2 && !hasUnlimitedDevicesExemption) {
    return {
      allowed: false,
      maxDevicesReached: true,
      message: 'عذراً، لقد بلغت الحد الأقصى للأجهزة المصرح بها لحسابك (جهازين فقط). لا يمكن فتح الحساب على جهاز ثالث. يرجى الدخول من أحد جهازيك المسجلين، أو إزالة الجهاز الثاني من صفحة "أجهزتي المسجلة" لإتاحة هذا الجهاز.',
    };
  }

  // 6. Register as new physical device
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
  email: string, 
  pass: string, 
  deviceFingerprint?: string,
  deviceInfo?: { name?: string; browser?: string }
) {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = pass.trim();
    const cleanFp = deviceFingerprint?.trim();
    
    const { data: user, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (error || !user) {
      return { success: false, message: 'البريد الإلكتروني غير مسجل بالمنصة. يرجى مراجعة إدارة المنصة أو إنشاء حساب جديد للطلاب.' };
    }

    const isPasswordValid = user.password_hash === cleanPass || user.encrypted_password_vault === cleanPass;
    if (!isPasswordValid) {
      return { success: false, message: 'كلمة المرور غير صحيحة.' };
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

    // Student checks
    if (user.status === 'banned') {
      return { 
        success: false, 
        message: 'تم إيقاف هذا الحساب أو حظر الجهاز من قبل إدارة المنصة.' + (user.ban_reason ? ` (السبب: ${user.ban_reason})` : '') 
      };
    }

    if (user.status === 'rejected') {
      return { success: false, message: 'تم رفض طلب انضمامك للمنصة. يمكنك التواصل مع المعلم للاستفسار على الرقم: 01552191172' };
    }

    // Strict 2-Device Policy Enforcement for Students (Physical hardware level)
    if (user.role === 'student' && cleanFp) {
      try {
        const deviceResult = await verifyAndEnforceStudentDevice(user.id, cleanFp, deviceInfo);
        if (!deviceResult.allowed) {
          return {
            success: false,
            isBanned: deviceResult.isBanned,
            maxDevicesReached: deviceResult.maxDevicesReached,
            message: deviceResult.message || 'تم رفض الدخول من هذا الجهاز',
          };
        }
      } catch (e) {
        console.error('Error enforcing device policy on login:', e);
      }
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
        },
        message: 'طلبك لا يزال قيد المراجعة لدى مستر محمد رضوان. سيتم مراجعة وقبول حسابك خلال 48 ساعة كحد أقصى أو التواصل على 01552191172.' 
      };
    }

    // Active student status
    if (user.status === 'active') {
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
    const cleanEmail = (studentData.email || '').trim().toLowerCase();
    const cleanPhone = (studentData.phone || '').trim();
    const cleanParentPhone = (studentData.parentPhone || '').trim();
    const fingerprint = (studentData.deviceFingerprint || '').trim();
    const candidateFps = Array.isArray(studentData.candidateFingerprints) 
      ? studentData.candidateFingerprints.map((f: any) => (f || '').trim()).filter(Boolean)
      : [];
    const allFps = Array.from(new Set([fingerprint, ...candidateFps].filter(Boolean)));

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
          error: 'عذراً، هذا الجهاز محظور نهائياً من التسجيل في المنصة بقرار من إدارة المنصة.' 
        };
      }

      // 2. Strict Check: Is this device already associated with any student profile (pending, active, rejected, or banned)?
      const { data: existingProfiles } = await supabaseAdmin
        .from('profiles')
        .select('id, status, full_name, email, phone')
        .eq('role', 'student')
        .in('primary_device_fingerprint', allFps)
        .limit(1);

      if (existingProfiles && existingProfiles.length > 0) {
        const p = existingProfiles[0];
        return { 
          success: false, 
          error: `عذراً، هذا الجهاز مسجل بالفعل في المنصة باسم (${p.full_name}). تمنع سياسات المنصة الصارمة تسجيل أي حساب إضافي على نفس الجهاز نهائياً.` 
        };
      }

      // 3. Strict Check: Is this device registered in student_devices table?
      const { data: existingDevices } = await supabaseAdmin
        .from('student_devices')
        .select('student_id')
        .in('device_fingerprint', allFps)
        .limit(1);

      if (existingDevices && existingDevices.length > 0) {
        return { 
          success: false, 
          error: 'عذراً، تم تسجيل هذا الجهاز مسبقاً في قاعدة بيانات المنصة. غير مسموح بإنشاء حساب آخر من هذا الجهاز.' 
        };
      }
    }

    // 4. Strict Check: Duplicate Email
    if (cleanEmail) {
      const { data: existingEmail } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, role')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (existingEmail) {
        if (existingEmail.role === 'assistant' || existingEmail.role === 'teacher' || existingEmail.role === 'super_admin') {
          return { 
            success: false, 
            error: 'هذا البريد الإلكتروني مسجل كحساب إداري (مساعد / معلم). يمكنك تسجيل الدخول به مباشرة من صفحة الدخول دون الحاجة لإنشاء حساب طالب.' 
          };
        }
        return { 
          success: false, 
          error: 'البريد الإلكتروني مُسجل بالفعل في المنصة. يرجى تسجيل الدخول بدلاً من التسجيل الجديد.' 
        };
      }
    }

    // 5. Strict Check: Duplicate Phone
    if (cleanPhone) {
      const { data: existingPhone } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name')
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (existingPhone) {
        return { 
          success: false, 
          error: 'رقم الهاتف مُسجل بالفعل في المنصة لدى حساب آخر. يرجى التأكد من الرقم أو التواصل مع المعلم.' 
        };
      }
    }

    // 6. Detect Mobile Carrier
    let carrier = 'Vodafone';
    if (cleanPhone.startsWith('011')) carrier = 'Etisalat';
    else if (cleanPhone.startsWith('012')) carrier = 'Orange';
    else if (cleanPhone.startsWith('015')) carrier = 'WE';

    // 6.5. Strict Identity Photo Check: Photo is mandatory for teacher approval
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

    // 7. Atomic & Guaranteed Insertion to profiles
    const insertPayload = {
      role: 'student',
      full_name: studentData.fullName?.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      parent_phone: cleanParentPhone || null,
      phone_carrier: carrier,
      password_hash: studentData.password, 
      encrypted_password_vault: studentData.password, 
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

    // 8. Register ONLY the primary fingerprint in student_devices
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

    // 9. Optional Audit Log
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
    } catch {
      // Audit log silent pass
    }

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

