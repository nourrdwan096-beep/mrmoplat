import { supabase } from '@/lib/supabaseClient';
import { 
  fetchStudentsAction, 
  updateStudentStatusAction, 
  deleteStudentAction,
  resetStudentDeviceLockAction,
  createStudentByTeacherAction,
  registerStudentAction,
  checkDeviceStatusAction,
  fetchPasswordResetRequestsAction,
  authorizeStudentPasswordResetByTeacherAction,
  revokePasswordResetByTeacherAction,
  PasswordResetRequestItem,
} from '@/app/actions/studentActions';

export type { PasswordResetRequestItem };

export interface LinkedDeviceAccount {
  id: string;
  fullName: string;
  phone: string;
  status: string;
  stage: string;
  grade: number;
}

export interface StudentProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  parentPhone: string | null;
  stage: string;
  grade: number;
  educationType: string;
  status: 'pending_review' | 'active' | 'rejected' | 'banned';
  passwordVault: string | null;
  isPasswordEncrypted?: boolean;
  deviceFingerprint: string | null;
  createdAt: string;
  avatarUrl: string | null;
  whatsapp_otp?: string | null;
  otp_verified?: boolean;
  banReason?: string | null;
  linkedDeviceAccounts?: LinkedDeviceAccount[];
}

export async function fetchStudents(): Promise<StudentProfile[]> {
  return await fetchStudentsAction();
}

export async function updateStudentStatus(
  studentId: string, 
  status: 'active' | 'rejected' | 'banned' | 'pending_review',
  otp?: string,
  banReason?: string
) {
  return await updateStudentStatusAction(studentId, status, otp, banReason);
}

export async function deleteStudent(studentId: string) {
  return await deleteStudentAction(studentId);
}

export async function resetStudentDeviceLock(studentId: string) {
  return await resetStudentDeviceLockAction(studentId);
}

export async function createStudentByTeacher(data: {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  stage: string;
  grade: number;
  educationType: string;
  parentPhone?: string;
}) {
  return await createStudentByTeacherAction(data);
}

export async function checkDeviceStatus(
  deviceFingerprint: string, 
  email?: string, 
  phone?: string,
  candidateFingerprints: string[] = [],
  studentId?: string
) {
  return await checkDeviceStatusAction(deviceFingerprint, email, phone, candidateFingerprints, studentId);
}

export async function generateStudentOTP(studentId: string): Promise<string | null> {
  // Generate a random 4-digit OTP
  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  const success = await updateStudentStatus(studentId, 'pending_review', otp);
  return success ? otp : null;
}

export async function registerStudent(studentData: any) {
  return await registerStudentAction(studentData);
}

export async function fetchPasswordResetRequests() {
  return await fetchPasswordResetRequestsAction();
}

export async function authorizeStudentPasswordResetByTeacher(studentId: string, requestId?: string) {
  return await authorizeStudentPasswordResetByTeacherAction(studentId, requestId);
}

export async function revokePasswordResetByTeacher(requestId: string, studentId: string, reason?: string) {
  return await revokePasswordResetByTeacherAction(requestId, studentId, reason);
}


