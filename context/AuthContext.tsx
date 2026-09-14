'use client';

import React, { createContext, useContext, useSyncExternalStore, useState } from 'react';
import { UserProfile } from '@/lib/types';

export const TEACHER_CREDENTIALS = {
  email: 'mr-mohamedrdwan-eng-langue-99@gmail.mnsa.nour.com',
  password: 'hfhrefjker4390430458&-cmdsfo3-@iofm3omfoew',
};

interface AuthContextType {
  currentUser: UserProfile | null;
  currentRole: 'guest' | 'student' | 'teacher' | 'assistant' | 'super_admin';
  deviceFingerprint: string;
  isDeviceBanned: boolean;
  isDeviceAlreadyRegistered: boolean;
  loginWithCredentials: (email: string, pass: string) => Promise<{ success: boolean; message: string; requiresOtp?: boolean; studentId?: string }>;
  logout: () => void;
  registerStudent: (studentData: Partial<UserProfile> & { password?: string }) => Promise<{ success: boolean; message: string; requiresOtp?: boolean }>;
  verifyOtp: (otp: string) => boolean;
  isPolicyAccepted: boolean;
  setPolicyAccepted: (accepted: boolean) => void;
  updateCurrentUser: (updates: Partial<UserProfile>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const authListeners = new Set<() => void>();

function notifyAuth() {
  for (const l of authListeners) {
    l();
  }
}

function subscribeAuth(callback: () => void) {
  authListeners.add(callback);
  const handleStorage = (e: StorageEvent) => {
    if (e.key?.startsWith('mr_radwan_')) {
      callback();
    }
  };
  window.addEventListener('storage', handleStorage);
  return () => {
    authListeners.delete(callback);
    window.removeEventListener('storage', handleStorage);
  };
}

function getUserSnapshot(): string {
  if (typeof window === 'undefined') return '';
  const local = localStorage.getItem('mr_radwan_current_user');
  if (local) return local;
  
  // Resilient fallback to cookies if localStorage was re-initialized
  try {
    const match = document.cookie.match(/(^|;)\s*mr_radwan_user=([^;]+)/);
    if (match) {
      const val = decodeURIComponent(match[2]);
      if (val) {
        localStorage.setItem('mr_radwan_current_user', val);
        return val;
      }
    }
  } catch {}

  return '';
}

function getDevicesSnapshot(): string {
  if (typeof window === 'undefined') return '{"banned":[],"registered":[],"fp":"DEV-INIT-001","isLocked":false}';
  let fp = localStorage.getItem('mr_radwan_device_fp') || localStorage.getItem('mr_hw_device_fp');
  if (!fp) {
    fp = 'DEV-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    localStorage.setItem('mr_radwan_device_fp', fp);
  }
  const banned = localStorage.getItem('mr_radwan_banned_devices') || '[]';
  const registered = localStorage.getItem('mr_radwan_registered_devices') || '[]';
  const isDeviceRegisteredFlag = localStorage.getItem('mr_device_registered') === 'true' || !!localStorage.getItem('mr_registered_student_info');
  const isBannedFlag = localStorage.getItem('mr_device_banned') === 'true';

  return JSON.stringify({ 
    banned: JSON.parse(banned), 
    registered: JSON.parse(registered), 
    fp,
    isLocked: isDeviceRegisteredFlag,
    isBanned: isBannedFlag
  });
}

function getServerSnapshot(): string {
  return '';
}

function getServerDevicesSnapshot(): string {
  return '{"banned":[],"registered":[],"fp":"DEV-INIT-001","isLocked":false}';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const userJson = useSyncExternalStore(subscribeAuth, getUserSnapshot, getServerSnapshot);
  const devicesJson = useSyncExternalStore(subscribeAuth, getDevicesSnapshot, getServerDevicesSnapshot);
  const [isPolicyAccepted, setPolicyAccepted] = useState(false);

  let currentUser: UserProfile | null = null;
  if (userJson) {
    try {
      currentUser = JSON.parse(userJson);
      // Ensure teacher id is always standard UUID
      if (currentUser && (currentUser.role === 'teacher' || currentUser.role === 'super_admin')) {
        if (!currentUser.id || currentUser.id === 'teacher-radwan-01' || currentUser.id === 'staff-master') {
          currentUser.id = 'a0000000-0000-4000-8000-000000000001';
        }
      }
    } catch {
      currentUser = null;
    }
  }

  const currentRole: 'guest' | 'student' | 'teacher' | 'assistant' | 'super_admin' = currentUser?.role || 'guest';

  let deviceFingerprint = 'DEV-INIT-001';
  let isDeviceBanned = false;
  let isDeviceAlreadyRegistered = false;

  try {
    const parsedDevices = JSON.parse(devicesJson);
    deviceFingerprint = parsedDevices.fp || 'DEV-INIT-001';
    isDeviceBanned = parsedDevices.isBanned || (Array.isArray(parsedDevices.banned) && parsedDevices.banned.includes(deviceFingerprint));
    isDeviceAlreadyRegistered = parsedDevices.isLocked || (Array.isArray(parsedDevices.registered) && parsedDevices.registered.includes(deviceFingerprint));
    
    if (currentUser && currentUser.role === 'student') {
      isDeviceAlreadyRegistered = true;
    }
  } catch {
    // fallback defaults
  }

  const loginWithCredentials = async (email: string, pass: string): Promise<{ success: boolean; message: string; requiresOtp?: boolean; studentId?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = pass.trim();

    // 1. Teacher Check
    if (cleanEmail === TEACHER_CREDENTIALS.email.toLowerCase()) {
      if (cleanPass === TEACHER_CREDENTIALS.password) {
        const teacherProfile: UserProfile = {
          id: 'a0000000-0000-4000-8000-000000000001',
          fullName: 'مستر / محمد رضوان',
          email: TEACHER_CREDENTIALS.email,
          phone: '01552191172',
          parentPhone: '',
          carrier: 'Vodafone',
          role: 'teacher',
          stage: 'high',
          educationType: 'general',
          grade: 3,
          status: 'active',
          walletBalance: 0,
          registeredDevices: [{ id: '1', name: 'Master Device (Primary)', isPrimary: true, lastActive: 'الآن' }]
        };
        localStorage.setItem('mr_radwan_current_user', JSON.stringify(teacherProfile));
        try {
          document.cookie = 'mr_radwan_role=teacher; path=/; max-age=31536000; SameSite=Lax';
          document.cookie = 'mr_radwan_user=' + encodeURIComponent(JSON.stringify(teacherProfile)) + '; path=/; max-age=31536000; SameSite=Lax';
        } catch {}
        notifyAuth();
        return { success: true, message: 'مرحباً بك يا مستر محمد رضوان، تم تسجيل الدخول بنجاح إلى لوحة الإدارة.' };
      } else {
        return { success: false, message: 'كلمة المرور غير صحيحة لحساب المعلم.' };
      }
    }

    // 2. Students & Assistants from Database via Action
    try {
      let deviceFp = '';
      let deviceInfo: { name?: string; browser?: string } | undefined = undefined;
      try {
        const { getStrictDeviceIdentity, getPhysicalHardwareProfile } = await import('@/lib/deviceSecurity');
        const identity = await getStrictDeviceIdentity();
        deviceFp = identity.primaryFingerprint;
        const profile = getPhysicalHardwareProfile();
        deviceInfo = { name: profile.displayName, browser: profile.browserName };
      } catch {}

      const { loginAction } = await import('@/app/actions/studentActions');
      const res = await loginAction(cleanEmail, cleanPass, deviceFp, deviceInfo);
      
      if (res.success) {
        if (res.requiresOtp) {
          return { success: true, message: res.message || '', requiresOtp: true, studentId: res.studentId };
        }
        
        // Log in user (Assistant or Student)
        if (res.user) {
          const userToStore = { ...res.user };
          if (userToStore.avatarUrl && userToStore.avatarUrl.length > 100000) {
            userToStore.avatarUrl = null; // Prevent localStorage quota exceeded error for large base64 images
          }
          localStorage.setItem('mr_radwan_current_user', JSON.stringify(userToStore));
          try {
            document.cookie = `mr_radwan_role=${userToStore.role}; path=/; max-age=31536000; SameSite=Lax`;
            document.cookie = `mr_radwan_user=${encodeURIComponent(JSON.stringify(userToStore))}; path=/; max-age=31536000; SameSite=Lax`;
          } catch {}
          notifyAuth();
          
          if (res.user.role === 'student') {
            try {
              const { lockDevicePermanently } = await import('@/lib/deviceSecurity');
              await lockDevicePermanently(res.user);
            } catch {}
          }

          if (res.user.role === 'assistant') {
            return { 
              success: true, 
              message: `مرحباً بك يا ${res.user.fullName}، تم تسجيل دخولك بنجاح كمساعد معتمد للمستر محمد رضوان.` 
            };
          }
          
          return { success: true, message: 'تم تسجيل الدخول بنجاح!' };
        }
      }
      
      if ((res as any)?.isPending) {
        if ((res as any)?.student) {
          try {
            const { lockDevicePermanently } = await import('@/lib/deviceSecurity');
            await lockDevicePermanently((res as any).student);
          } catch {}
        }
        return { success: false, message: res.message || 'طلبك قيد المراجعة لدى المعلم.' };
      }
      
      // Fallback check for locally saved assistant credentials if server action couldn't find it
      const localAssistantsRaw = localStorage.getItem('mr_radwan_assistants');
      if (localAssistantsRaw) {
        try {
          const localAssistants = JSON.parse(localAssistantsRaw);
          const foundLocal = localAssistants.find(
            (a: any) => a.email.toLowerCase() === cleanEmail
          );
          if (foundLocal) {
            if (foundLocal.passwordVault === cleanPass || foundLocal.passwordHash === cleanPass) {
              if (foundLocal.isFrozen) {
                return { success: false, message: 'عذراً، تم تجميد حساب المساعد من قبل المعلم. يرجى مراجعة إدارة المنصة.' };
              }
              const assistantProfile: UserProfile = {
                id: foundLocal.id,
                fullName: foundLocal.fullName,
                email: foundLocal.email,
                phone: foundLocal.phone || '',
                parentPhone: '',
                carrier: 'Vodafone',
                role: 'assistant',
                stage: 'high',
                educationType: 'general',
                grade: 1,
                status: 'active',
                walletBalance: 0,
                assistantRoleTitle: foundLocal.assistantRoleTitle || 'مساعد إداري وأكاديمي',
                permissions: foundLocal.permissions,
                registeredDevices: [],
              };
              localStorage.setItem('mr_radwan_current_user', JSON.stringify(assistantProfile));
              notifyAuth();
              return { 
                success: true, 
                message: `مرحباً بك يا ${foundLocal.fullName}، تم تسجيل دخولك بنجاح كمساعد معتمد للمستر محمد رضوان.` 
              };
            } else {
              return { success: false, message: 'كلمة المرور غير صحيحة لحساب المساعد.' };
            }
          }
        } catch (e) {
          console.error('Local assistant fallback parse error:', e);
        }
      }
      
      return { success: false, message: res.message || 'البريد الإلكتروني غير مسجل بالمنصة.' };
    } catch (error) {
      console.error('Login action failed:', error);
      
      // Also attempt local assistant fallback on network exception
      const localAssistantsRaw = localStorage.getItem('mr_radwan_assistants');
      if (localAssistantsRaw) {
        try {
          const localAssistants = JSON.parse(localAssistantsRaw);
          const foundLocal = localAssistants.find(
            (a: any) => a.email.toLowerCase() === cleanEmail
          );
          if (foundLocal && (foundLocal.passwordVault === cleanPass || foundLocal.passwordHash === cleanPass)) {
            if (foundLocal.isFrozen) {
              return { success: false, message: 'عذراً، تم تجميد حساب المساعد من قبل المعلم.' };
            }
            const assistantProfile: UserProfile = {
              id: foundLocal.id,
              fullName: foundLocal.fullName,
              email: foundLocal.email,
              phone: foundLocal.phone || '',
              parentPhone: '',
              carrier: 'Vodafone',
              role: 'assistant',
              stage: 'high',
              educationType: 'general',
              grade: 1,
              status: 'active',
              walletBalance: 0,
              assistantRoleTitle: foundLocal.assistantRoleTitle || 'مساعد إداري وأكاديمي',
              permissions: foundLocal.permissions,
              registeredDevices: [],
            };
            localStorage.setItem('mr_radwan_current_user', JSON.stringify(assistantProfile));
            notifyAuth();
            return { 
              success: true, 
              message: `مرحباً بك يا ${foundLocal.fullName}، تم تسجيل دخولك بنجاح كمساعد معتمد.` 
            };
          }
        } catch {}
      }

      return { success: false, message: 'حدث خطأ أثناء محاولة الاتصال بالخادم.' };
    }
  };

  const logout = () => {
    localStorage.removeItem('mr_radwan_current_user');
    try {
      document.cookie = 'mr_radwan_role=; path=/; max-age=0; SameSite=Lax';
      document.cookie = 'mr_radwan_user=; path=/; max-age=0; SameSite=Lax';
    } catch {}
    notifyAuth();
  };

  const registerStudent = async (studentData: Partial<UserProfile> & { password?: string }) => {
    if (isDeviceBanned) {
      return { success: false, message: 'عذراً، هذا الجهاز محظور نهائياً من التسجيل في المنصة بناءً على قرار الإدارة.' };
    }

    if (isDeviceAlreadyRegistered) {
      return { success: false, message: 'عذراً، هذا الجهاز تم التسجيل به مسبقاً في المنصة ولا يمكن تسجيل نفس الجهاز أكثر من مرة.' };
    }

    try {
      const { registerStudentAction } = await import('@/app/actions/studentActions');
      const res = await registerStudentAction({
        ...studentData,
        deviceFingerprint,
      });

      if (!res.success) {
        return { success: false, message: res.error || 'حدث خطأ أثناء التسجيل. يرجى المحاولة مرة أخرى.' };
      }

      // Mark device registered locally
      if (res.student) {
        try {
          const { lockDevicePermanently } = await import('@/lib/deviceSecurity');
          await lockDevicePermanently(res.student);
        } catch {}
      }

      const regDevices = JSON.parse(localStorage.getItem('mr_radwan_registered_devices') || '[]');
      if (!regDevices.includes(deviceFingerprint)) {
        regDevices.push(deviceFingerprint);
        localStorage.setItem('mr_radwan_registered_devices', JSON.stringify(regDevices));
      }
      notifyAuth();

      return {
        success: true,
        message: 'تم إرسال طلب انضمامك بنجاح! حسابك قيد المراجعة (48 ساعة كحد أقصى). بعد القبول، سيتم إرسال كود التفعيل عبر رسالة نصية (SMS) لتأكيد حسابك. للدعم: 01552191172'
      };
    } catch (err) {
      console.error('Registration failed:', err);
      return { success: false, message: 'حدث خطأ أثناء محاولة الاتصال بالخادم.' };
    }
  };

  const verifyOtp = (otp: string) => {
    if (otp.length === 4) {
      if (currentUser) {
        const updated = { ...currentUser, status: 'active' as const };
        localStorage.setItem('mr_radwan_current_user', JSON.stringify(updated));
        notifyAuth();
      }
      return true;
    }
    return false;
  };

  const updateCurrentUser = (updates: Partial<UserProfile>) => {
    if (currentUser) {
      const updated = { ...currentUser, ...updates };
      localStorage.setItem('mr_radwan_current_user', JSON.stringify(updated));
      
      // Also update in registered students list if student
      try {
        const raw = localStorage.getItem('mr_radwan_registered_students');
        if (raw) {
          const list: any[] = JSON.parse(raw);
          const idx = list.findIndex(s => s.id === currentUser.id || s.email === currentUser.email);
          if (idx !== -1) {
            list[idx] = { ...list[idx], ...updates };
            localStorage.setItem('mr_radwan_registered_students', JSON.stringify(list));
          }
        }
      } catch (e) {
        console.error('Error syncing student update to list:', e);
      }

      notifyAuth();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentRole,
        deviceFingerprint,
        isDeviceBanned,
        isDeviceAlreadyRegistered,
        loginWithCredentials,
        logout,
        registerStudent,
        verifyOtp,
        isPolicyAccepted,
        setPolicyAccepted,
        updateCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

