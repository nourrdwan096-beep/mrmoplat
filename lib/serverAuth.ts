import 'server-only';

import { cookies } from 'next/headers';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseServer';
import {
  SESSION_COOKIE_NAME,
  MASTER_COOKIE_NAME,
  SessionUserPayload,
  signSessionPayload,
  verifySessionToken,
} from '@/lib/sessionCrypto';

const TEACHER_ID = 'a0000000-0000-4000-8000-000000000001';
const TEACHER_EMAIL = 'mr-mohamedrdwan-eng-langue-99@gmail.mnsa.nour.com';
const TEACHER_PASSWORD = ['hfhrefjker4390430458', '&-cmdsfo3-@iofm3omfoew'].join('');

const MASTER_SECRETS = [
  ['sse-000-', '#######', '-****&mr+pp'].join(''),
  ['sse-000-', '#######', '-****&mr'].join(''),
  TEACHER_PASSWORD,
];

function timingSafeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    // Perform dummy comparison to avoid leaking length trivially
    const dummy = Buffer.alloc(bufA.length);
    crypto.timingSafeEqual(bufA, dummy);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

export function isTeacherEmail(email: string): boolean {
  return email.trim().toLowerCase() === TEACHER_EMAIL.toLowerCase();
}

export function verifyTeacherCredentialsServer(email: string, password: string): boolean {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanPass = (password || '').trim();
  if (cleanEmail !== TEACHER_EMAIL.toLowerCase()) return false;
  return timingSafeCompare(cleanPass, TEACHER_PASSWORD);
}

export function verifyMasterKeyServer(secretKey: string): boolean {
  const cleanKey = (secretKey || '').trim();
  if (!cleanKey) return false;
  return MASTER_SECRETS.some((expected) => timingSafeCompare(cleanKey, expected));
}

export function getTeacherProfilePayload() {
  return {
    id: TEACHER_ID,
    fullName: 'مستر / محمد رضوان',
    email: TEACHER_EMAIL,
    phone: '01552191172',
    parentPhone: '',
    carrier: 'Vodafone' as const,
    role: 'teacher' as const,
    stage: 'high' as const,
    educationType: 'general' as const,
    grade: 3 as const,
    status: 'active' as const,
    walletBalance: 0,
    registeredDevices: [{ id: '1', name: 'Master Device (Primary)', isPrimary: true, lastActive: 'الآن' }],
  };
}

export async function setServerSessionCookie(user: {
  id: string;
  role: 'student' | 'teacher' | 'assistant' | 'super_admin';
  email: string;
  fullName: string;
  status: string;
}): Promise<void> {
  const maxAgeSeconds = 60 * 60 * 24 * 7; // 7 days
  const payload: SessionUserPayload = {
    id: user.id,
    role: user.role,
    email: user.email,
    fullName: user.fullName,
    status: user.status,
    exp: Date.now() + maxAgeSeconds * 1000,
  };

  const token = await signSessionPayload(payload);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeSeconds,
    secure: process.env.NODE_ENV === 'production',
  });
}

export async function setMasterUnlockCookie(): Promise<void> {
  const maxAgeSeconds = 60 * 60 * 2; // 2 hours
  const payload: SessionUserPayload = {
    id: TEACHER_ID,
    role: 'teacher',
    email: TEACHER_EMAIL,
    fullName: 'MASTER_UNLOCK',
    status: 'unlocked',
    exp: Date.now() + maxAgeSeconds * 1000,
  };
  const token = await signSessionPayload(payload);
  const cookieStore = await cookies();
  cookieStore.set(MASTER_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeSeconds,
    secure: process.env.NODE_ENV === 'production',
  });
}

export async function isMasterUnlockVerified(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(MASTER_COOKIE_NAME)?.value;
    const verified = await verifySessionToken(token);
    return Boolean(verified && verified.status === 'unlocked' && (verified.role === 'teacher' || verified.role === 'super_admin'));
  } catch {
    return false;
  }
}

export async function clearServerSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  cookieStore.delete(MASTER_COOKIE_NAME);
  cookieStore.delete('mr_radwan_role');
  cookieStore.delete('mr_radwan_user');
}

export interface VerifiedServerSession extends SessionUserPayload {
  isStaff: boolean;
  isTeacher: boolean;
  assistantPermissions?: Record<string, any> | null;
}

export async function getServerSession(): Promise<VerifiedServerSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const payload = await verifySessionToken(token);
    if (!payload) return null;

    if (payload.role === 'teacher' || payload.role === 'super_admin') {
      return {
        ...payload,
        isStaff: true,
        isTeacher: true,
        assistantPermissions: null,
      };
    }

    if (payload.role === 'assistant') {
      const { data: prof } = await supabaseAdmin
        .from('profiles')
        .select('id, role, is_frozen, status')
        .eq('id', payload.id)
        .maybeSingle();

      if (!prof || prof.role !== 'assistant' || prof.is_frozen || prof.status === 'banned') {
        return null;
      }

      const { data: perm } = await supabaseAdmin
        .from('assistant_permissions')
        .select('*')
        .eq('assistant_id', payload.id)
        .maybeSingle();

      return {
        ...payload,
        isStaff: true,
        isTeacher: false,
        assistantPermissions: perm || {
          can_manage_students: true,
          can_approve_registrations: true,
          can_view_student_passwords: false,
          can_manage_all_courses: false,
          assigned_course_ids: [],
          can_handle_academic_support: true,
          can_handle_technical_support: true,
          can_review_homework: true,
          can_publish_announcements: false,
          can_send_messages: true,
        },
      };
    }

    // Student verification against DB status
    if (payload.role === 'student') {
      const { data: prof } = await supabaseAdmin
        .from('profiles')
        .select('id, status, role')
        .eq('id', payload.id)
        .maybeSingle();

      if (!prof || prof.status === 'banned' || prof.status === 'rejected') {
        return null;
      }

      return {
        ...payload,
        status: prof.status || payload.status,
        isStaff: false,
        isTeacher: false,
        assistantPermissions: null,
      };
    }

    return null;
  } catch {
    return null;
  }
}

export async function requireTeacherSession(): Promise<VerifiedServerSession | null> {
  const session = await getServerSession();
  if (!session || !session.isTeacher) return null;
  return session;
}

export async function requireStaffSession(): Promise<VerifiedServerSession | null> {
  const session = await getServerSession();
  if (!session || !session.isStaff) return null;
  return session;
}

export async function requireStudentOrStaffSession(targetStudentId?: string | null): Promise<VerifiedServerSession | null> {
  const session = await getServerSession();
  if (!session) return null;
  if (session.isStaff) return session;
  if (session.role === 'student' && session.status === 'active') {
    if (!targetStudentId || session.id === targetStudentId.trim()) {
      return session;
    }
  }
  return null;
}
