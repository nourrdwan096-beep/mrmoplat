import { supabase } from '@/lib/supabaseClient';
import { 
  fetchStudentsAction, 
  updateStudentStatusAction, 
  deleteStudentAction,
  registerStudentAction,
  checkDeviceStatusAction 
} from '@/app/actions/studentActions';

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
  deviceFingerprint: string | null;
  createdAt: string;
  avatarUrl: string | null;
  whatsapp_otp?: string | null;
  otp_verified?: boolean;
  banReason?: string | null;
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

