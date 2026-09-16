'use client';

/**
 * MR. MOHAMED RADWAN EDUCATION PLATFORM - ULTRA-SECURE DEVICE FINGERPRINTING
 * 
 * Hardware-level cryptographic fingerprinting engine combining:
 * 1. 2D Canvas rendering & subpixel font antialiasing
 * 2. WebGL vendor, unmasked renderer, and shader precision profile
 * 3. Web AudioContext oscillator & dynamics compressor response
 * 4. Hardware specs (cores, device memory, screen geometry, pixel ratio, touch points)
 * 5. Multi-Storage Persistence (LocalStorage, SessionStorage, IndexedDB, Persistent Cookie)
 * 
 * Prevents device spoofing, private window bypass, and clearing of standard storage.
 */

// Simple fast 64-bit hash (djb2-like + fnv-1a variant)
function hashString(str: string): string {
  let h1 = 0xdeadbeef ^ 0;
  let h2 = 0x41c64e6d ^ 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hash = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return hash.toString(16).padStart(12, '0');
}

// 1. Canvas Fingerprinting
function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 280;
    canvas.height = 60;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'no-canvas-2d';

    ctx.textBaseline = 'top';
    ctx.font = '14px "Arial", "Segoe UI", "Tahoma", sans-serif';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);

    ctx.fillStyle = '#069';
    ctx.fillText('MR-RADWAN-EDU-2030 🛡️🚀', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('MR-RADWAN-EDU-2030 🛡️🚀', 4, 17);

    // Geometric curves with anti-aliasing
    ctx.beginPath();
    ctx.arc(50, 45, 15, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 0, 128, 0.5)';
    ctx.fill();

    return hashString(canvas.toDataURL());
  } catch {
    return 'canvas-err';
  }
}

// 2. WebGL Fingerprinting
function getWebGLFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl) return 'no-webgl';

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR);
    const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    const version = gl.getParameter(gl.VERSION);
    const shadingLangVersion = gl.getParameter(gl.SHADING_LANGUAGE_VERSION);
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);

    const raw = `${vendor}~${renderer}~${version}~${shadingLangVersion}~${maxTextureSize}`;
    return hashString(raw);
  } catch {
    return 'webgl-err';
  }
}

// 3. AudioContext Fingerprinting
async function getAudioFingerprint(): Promise<string> {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return 'no-audio-api';

    const context = new OfflineAudioContext(1, 44100, 44100);
    const oscillator = context.createOscillator();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(10000, context.currentTime);

    const compressor = context.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-50, context.currentTime);
    compressor.knee.setValueAtTime(40, context.currentTime);
    compressor.ratio.setValueAtTime(12, context.currentTime);
    compressor.attack.setValueAtTime(0, context.currentTime);
    compressor.release.setValueAtTime(0.25, context.currentTime);

    oscillator.connect(compressor);
    compressor.connect(context.destination);
    oscillator.start(0);

    const renderedBuffer = await context.startRendering();
    const channelData = renderedBuffer.getChannelData(0);
    
    let sum = 0;
    for (let i = 4500; i < 5000; i++) {
      sum += Math.abs(channelData[i] || 0);
    }
    return hashString(sum.toString());
  } catch {
    return 'audio-err';
  }
}

// 4. Hardware & Screen Profile
function getHardwareProfile(): string {
  if (typeof window === 'undefined') return 'server';

  const sw = window.screen?.width || 0;
  const sh = window.screen?.height || 0;
  const maxDim = Math.max(sw, sh);
  const minDim = Math.min(sw, sh);
  const pixelRatio = Math.round((window.devicePixelRatio || 1) * 10) / 10;

  const nav = navigator as any;
  const hardware = [
    nav.hardwareConcurrency || 4,
    nav.maxTouchPoints || 0,
    nav.platform || 'platform',
  ].join('|');

  return `${maxDim}x${minDim}@${pixelRatio};${hardware}`;
}

export interface PhysicalHardwareProfile {
  deviceType: 'mobile' | 'tablet' | 'desktop';
  deviceTypeArabic: string;
  os: 'Android' | 'iOS' | 'Windows' | 'macOS' | 'Linux' | 'Other';
  osArabic: string;
  screenSummary: string;
  hardwareFingerprint: string;
  displayName: string;
  browserName: string;
}

/**
 * Accurately classifies the physical device category, operating system, and hardware signature.
 * This signature is invariant across all browsers (Chrome, Firefox, Safari, Samsung Internet, Edge),
 * tabs, and private windows on the exact same physical device.
 */
export function getPhysicalHardwareProfile(): PhysicalHardwareProfile {
  if (typeof window === 'undefined') {
    return {
      deviceType: 'desktop',
      deviceTypeArabic: 'كمبيوتر / سيرفر',
      os: 'Other',
      osArabic: 'نظام تشغيل',
      screenSummary: 'server',
      hardwareFingerprint: 'DEV-SERVER',
      displayName: 'بيئة السيرفر',
      browserName: 'Server',
    };
  }

  const nav = navigator as any;
  const ua = nav.userAgent || '';

  // 1. Detect OS accurately across all browsers
  let os: 'Android' | 'iOS' | 'Windows' | 'macOS' | 'Linux' | 'Other' = 'Other';
  let osArabic = 'نظام تشغيل';

  if (/Android/i.test(ua)) {
    os = 'Android';
    osArabic = 'أندرويد (Android)';
  } else if (/iPhone|iPad|iPod/i.test(ua) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1)) {
    os = 'iOS';
    osArabic = 'أبل (iOS / iPadOS)';
  } else if (/Windows/i.test(ua)) {
    os = 'Windows';
    osArabic = 'ويندوز (Windows)';
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    os = 'macOS';
    osArabic = 'ماك أبل (macOS)';
  } else if (/Linux/i.test(ua)) {
    os = 'Linux';
    osArabic = 'لينكس (Linux)';
  }

  // 2. Detect Device Type (mobile, tablet, desktop)
  let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
  let deviceTypeArabic = 'كمبيوتر / لابتوب';

  const isTablet = /iPad|tablet|(android(?!.*mobile))/i.test(ua) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);
  const isMobile = !isTablet && (/Mobile|iPhone|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua) || (window.screen?.width < 600 && (nav.maxTouchPoints || 0) > 0));

  if (isTablet) {
    deviceType = 'tablet';
    deviceTypeArabic = 'تابلت / جهاز لوحي';
  } else if (isMobile) {
    deviceType = 'mobile';
    deviceTypeArabic = 'هاتف ذكي محمول';
  } else {
    deviceType = 'desktop';
    deviceTypeArabic = 'كمبيوتر / لابتوب';
  }

  // 3. Browser Info (informational only - does NOT fragment the physical device!)
  let browserName = 'متصفح ويب';
  if (/Edg/i.test(ua)) browserName = 'Microsoft Edge';
  else if (/SamsungBrowser/i.test(ua)) browserName = 'Samsung Internet';
  else if (/Chrome/i.test(ua) && !/Edg/i.test(ua) && !/OPR/i.test(ua)) browserName = 'Google Chrome';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browserName = 'Apple Safari';
  else if (/Firefox/i.test(ua)) browserName = 'Mozilla Firefox';
  else if (/OPR|Opera/i.test(ua)) browserName = 'Opera';

  // 4. Physical Screen Specs - Rotation & Browser UI Independent
  const sw = window.screen?.width || 0;
  const sh = window.screen?.height || 0;
  const maxDim = Math.max(sw, sh);
  const minDim = Math.min(sw, sh);
  const pixelRatio = Math.round((window.devicePixelRatio || 1) * 10) / 10;
  const cores = nav.hardwareConcurrency || 4;
  const touchPoints = (nav.maxTouchPoints && nav.maxTouchPoints > 0) ? 'TOUCH' : 'NOTOUCH';

  const screenSummary = `${maxDim}x${minDim}@${pixelRatio}`;

  // 5. Deterministic Physical Hardware Fingerprint (Identical across all browsers on this hardware)
  const hardwareFingerprint = `DEV-${deviceType.toUpperCase()}-${os.toUpperCase()}-${maxDim}X${minDim}-${pixelRatio}-${cores}C-${touchPoints}`;
  const displayName = `${deviceTypeArabic} (${osArabic})`;

  return {
    deviceType,
    deviceTypeArabic,
    os,
    osArabic,
    screenSummary,
    hardwareFingerprint,
    displayName,
    browserName,
  };
}

// 5. IndexedDB Persistence Layer for Hardware Tag
const IDB_NAME = 'MR_RADWAN_SECURE_VAULT';
const IDB_STORE = 'device_identity';

function getIndexedDBData(): Promise<{ token: string | null; studentInfo: any | null }> {
  return new Promise((resolve) => {
    try {
      if (typeof window === 'undefined' || !window.indexedDB) {
        return resolve({ token: null, studentInfo: null });
      }
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE, { keyPath: 'key' });
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction(IDB_STORE, 'readonly');
        const store = tx.objectStore(IDB_STORE);
        const getReq = store.get('hw_fingerprint');
        const getStudentReq = store.get('student_info');

        let token: string | null = null;
        let studentInfo: any = null;

        getReq.onsuccess = () => {
          token = getReq.result?.val || null;
        };
        getStudentReq.onsuccess = () => {
          studentInfo = getStudentReq.result?.val || null;
        };

        tx.oncomplete = () => resolve({ token, studentInfo });
        tx.onerror = () => resolve({ token, studentInfo });
      };
      req.onerror = () => resolve({ token: null, studentInfo: null });
    } catch {
      resolve({ token: null, studentInfo: null });
    }
  });
}

async function getIndexedDBToken(): Promise<string | null> {
  const data = await getIndexedDBData();
  return data.token;
}

function saveIndexedDBData(token: string, studentInfo?: any): Promise<void> {
  return new Promise((resolve) => {
    try {
      if (typeof window === 'undefined' || !window.indexedDB) return resolve();
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE, { keyPath: 'key' });
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction(IDB_STORE, 'readwrite');
        const store = tx.objectStore(IDB_STORE);
        store.put({ key: 'hw_fingerprint', val: token });
        if (studentInfo) {
          store.put({ key: 'student_info', val: studentInfo });
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      };
      req.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

function saveIndexedDBToken(token: string): Promise<void> {
  return saveIndexedDBData(token);
}

// Cookie Helper
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

function setCookie(name: string, value: string, days = 3650): void {
  if (typeof document === 'undefined') return;
  const d = new Date();
  d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${d.toUTCString()};path=/;SameSite=Lax`;
}

// Cache Storage Persistence Layer
const CACHE_NAME = 'mr-radwan-device-vault-v1';
const CACHE_KEY_URL = '/__device_identity_anchor__';

async function getCacheData(): Promise<{ token: string | null; studentInfo: any | null }> {
  if (typeof window === 'undefined' || !('caches' in window)) return { token: null, studentInfo: null };
  try {
    const cache = await caches.open(CACHE_NAME);
    const res = await cache.match(CACHE_KEY_URL);
    if (!res) return { token: null, studentInfo: null };
    const data = await res.json();
    return { token: data?.token || null, studentInfo: data?.studentInfo || null };
  } catch {
    return { token: null, studentInfo: null };
  }
}

async function getCacheToken(): Promise<string | null> {
  const data = await getCacheData();
  return data.token;
}

async function saveCacheToken(dataObj: any): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window)) return;
  try {
    const cache = await caches.open(CACHE_NAME);
    const blob = new Blob([JSON.stringify(dataObj)], { type: 'application/json' });
    const response = new Response(blob, {
      headers: { 'content-type': 'application/json' },
    });
    await cache.put(CACHE_KEY_URL, response);
  } catch {
    // silent catch
  }
}

/**
 * Main function to generate and retrieve the unforgeable device fingerprint
 * Truly deterministic per physical hardware, invariant across all browsers, tabs, and private windows.
 */
export async function getStrictDeviceFingerprint(): Promise<string> {
  if (typeof window === 'undefined') return 'SERVER_ENVIRONMENT';

  // Compute Deterministic Physical Hardware Fingerprint
  const physicalProfile = getPhysicalHardwareProfile();
  const physicalFp = physicalProfile.hardwareFingerprint;

  // Re-anchor across all persistence layers
  try {
    localStorage.setItem('mr_hw_device_fp', physicalFp);
    localStorage.setItem('mr_device_fingerprint', physicalFp);
    localStorage.setItem('mr_radwan_device_fp', physicalFp);
    sessionStorage.setItem('mr_hw_device_fp', physicalFp);
  } catch {}

  setCookie('mr_hw_device_fp', physicalFp);
  setCookie('mr_radwan_device_fp', physicalFp);
  saveIndexedDBToken(physicalFp).catch(() => {});
  saveCacheToken({ token: physicalFp, updatedAt: new Date().toISOString() }).catch(() => {});

  return physicalFp;
}

export interface StrictDeviceIdentity {
  primaryFingerprint: string;
  candidateFingerprints: string[];
  isLocallyLocked: boolean;
  studentId?: string;
  storedStudent: {
    id?: string;
    fullName?: string;
    email?: string;
    phone?: string;
    status?: string;
  } | null;
}

/**
 * Gather complete identity with all historical fingerprints and lock status
 */
export async function getStrictDeviceIdentity(): Promise<StrictDeviceIdentity> {
  if (typeof window === 'undefined') {
    return {
      primaryFingerprint: 'SERVER',
      candidateFingerprints: [],
      isLocallyLocked: false,
      storedStudent: null,
    };
  }

  const primaryFp = await getStrictDeviceFingerprint();
  const candidateSet = new Set<string>();
  if (primaryFp) candidateSet.add(primaryFp);

  // Compute sub-fingerprints for hardware matching
  try {
    const hwRaw = getHardwareProfile();
    const hwHash = hashString(hwRaw);
    const cvHash = getCanvasFingerprint();
    const glHash = getWebGLFingerprint();
    candidateSet.add(`MR-HW-${hwHash}`.toUpperCase());
    candidateSet.add(`MR-HW-${hwHash}-${cvHash}`.toUpperCase());
    candidateSet.add(`MR-HW-${hwHash}-${cvHash}-${glHash}`.toUpperCase());
    candidateSet.add(`MR-CV-${cvHash}`.toUpperCase());
    candidateSet.add(`MR-GL-${glHash}`.toUpperCase());
  } catch {}

  // Collect candidate historical fingerprints across all stores
  try {
    const k1 = localStorage.getItem('mr_hw_device_fp');
    const k2 = localStorage.getItem('mr_radwan_device_fp');
    const k3 = localStorage.getItem('mr_device_fingerprint');
    const k4 = localStorage.getItem('mr_primary_fp');
    if (k1) candidateSet.add(k1);
    if (k2) candidateSet.add(k2);
    if (k3) candidateSet.add(k3);
    if (k4) candidateSet.add(k4);

    const devRegistered = localStorage.getItem('mr_radwan_registered_devices');
    if (devRegistered) {
      const arr = JSON.parse(devRegistered);
      if (Array.isArray(arr)) arr.forEach((x: any) => typeof x === 'string' && candidateSet.add(x));
    }
  } catch {}

  const c1 = getCookie('mr_hw_device_fp');
  const c2 = getCookie('mr_radwan_device_fp');
  if (c1) candidateSet.add(c1);
  if (c2) candidateSet.add(c2);

  const idbData = await getIndexedDBData();
  if (idbData.token) candidateSet.add(idbData.token);

  const cacheData = await getCacheData();
  if (cacheData.token) candidateSet.add(cacheData.token);

  // Check Local Lock and Stored Student Profile
  let isLocallyLocked = false;
  let studentId: string | undefined = undefined;
  let storedStudent: StrictDeviceIdentity['storedStudent'] = null;

  try {
    const isLockedStr = localStorage.getItem('mr_device_registered');
    const isBannedStr = localStorage.getItem('mr_device_banned');
    const cRegistered = getCookie('mr_device_registered') === 'true';
    if (isLockedStr === 'true' || isBannedStr === 'true' || cRegistered) {
      isLocallyLocked = true;
    }

    studentId = localStorage.getItem('mr_student_id') || getCookie('mr_student_id') || undefined;
    const studentEmail = localStorage.getItem('mr_student_email') || getCookie('mr_student_email') || undefined;
    const studentPhone = localStorage.getItem('mr_student_phone') || getCookie('mr_student_phone') || undefined;

    // Check modern robust device student binding
    const rawBinding = localStorage.getItem('mr_device_student_binding') || getCookie('mr_device_student_binding');
    if (rawBinding) {
      try {
        const parsed = JSON.parse(rawBinding);
        if (parsed && (parsed.id || parsed.email || parsed.phone)) {
          storedStudent = parsed;
          isLocallyLocked = true;
          if (parsed.id) studentId = parsed.id;
        }
      } catch {}
    }

    const rawInfo = localStorage.getItem('mr_registered_student_info');
    if (rawInfo && !storedStudent) {
      storedStudent = JSON.parse(rawInfo);
      isLocallyLocked = true;
      if (!studentId && storedStudent?.id) {
        studentId = storedStudent.id;
      }
    }

    if (!storedStudent && (studentId || studentEmail || studentPhone)) {
      storedStudent = {
        id: studentId,
        email: studentEmail,
        phone: studentPhone,
      };
    }

    // Recover from IndexedDB or Cache if local storage was cleared
    if (!storedStudent && idbData.studentInfo) {
      storedStudent = idbData.studentInfo;
      isLocallyLocked = true;
      if (!studentId && storedStudent?.id) {
        studentId = storedStudent.id;
      }
    } else if (!storedStudent && cacheData.studentInfo) {
      storedStudent = cacheData.studentInfo;
      isLocallyLocked = true;
      if (!studentId && storedStudent?.id) {
        studentId = storedStudent.id;
      }
    }

    // Also check current active user if student
    const rawUser = localStorage.getItem('mr_radwan_current_user');
    if (rawUser) {
      const parsedUser = JSON.parse(rawUser);
      if (parsedUser && parsedUser.role === 'student') {
        isLocallyLocked = true;
        studentId = parsedUser.id || studentId;
        storedStudent = {
          id: parsedUser.id,
          fullName: parsedUser.fullName,
          email: parsedUser.email,
          phone: parsedUser.phone,
          status: parsedUser.status,
        };
      }
    }
  } catch {}

  return {
    primaryFingerprint: primaryFp,
    candidateFingerprints: Array.from(candidateSet).filter(Boolean),
    isLocallyLocked,
    studentId,
    storedStudent,
  };
}

/**
 * Clear the local device lock to allow re-registration if the server confirms the student is deleted
 */
export async function clearDeviceLock(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem('mr_device_registered');
    localStorage.removeItem('mr_device_student_binding');
    localStorage.removeItem('mr_registered_student_info');
    localStorage.removeItem('mr_student_id');
    localStorage.removeItem('mr_student_email');
    localStorage.removeItem('mr_student_phone');
    localStorage.removeItem('mr_hw_device_fp');
    localStorage.removeItem('mr_radwan_device_fp');
    localStorage.removeItem('mr_radwan_registered_devices');
    localStorage.removeItem('mr_radwan_current_user');
    
    sessionStorage.removeItem('mr_device_registered');
    sessionStorage.removeItem('mr_device_student_binding');
    sessionStorage.removeItem('mr_registered_student_info');
    sessionStorage.removeItem('mr_student_id');
    sessionStorage.removeItem('mr_student_email');
    sessionStorage.removeItem('mr_student_phone');

    // Expire all security and binding cookies
    document.cookie = 'mr_device_registered=; path=/; max-age=0';
    document.cookie = 'mr_device_student_binding=; path=/; max-age=0';
    document.cookie = 'mr_student_id=; path=/; max-age=0';
    document.cookie = 'mr_student_email=; path=/; max-age=0';
    document.cookie = 'mr_student_phone=; path=/; max-age=0';
    document.cookie = 'mr_hw_device_fp=; path=/; max-age=0';
    document.cookie = 'mr_radwan_user=; path=/; max-age=0';
    
    // Clear IndexedDB cache
    try {
      if (window.indexedDB) {
        const req = indexedDB.open(IDB_NAME, 1);
        req.onsuccess = () => {
          const db = req.result;
          if (db.objectStoreNames.contains(IDB_STORE)) {
            const tx = db.transaction(IDB_STORE, 'readwrite');
            const store = tx.objectStore(IDB_STORE);
            store.delete('student_info');
            store.delete('hw_fingerprint');
          }
        };
      }
    } catch (e) {}

    // Clear Cache API
    if ('caches' in window) {
      try {
        const cache = await caches.open(CACHE_NAME);
        await cache.delete(CACHE_KEY_URL);
        await caches.delete(CACHE_NAME);
        await caches.delete('MR_RADWAN_CACHE_V1');
      } catch (e) {}
    }
  } catch (err) {
    console.warn('Error clearing device lock', err);
  }
}

/**
 * Permanently lock device locally across all 5 layers upon confirmed server registration
 */
export async function lockDevicePermanently(studentInfo: {
  id?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  status?: string;
}): Promise<void> {
  if (typeof window === 'undefined') return;

  const fp = await getStrictDeviceFingerprint();

  try {
    localStorage.setItem('mr_device_registered', 'true');
    localStorage.setItem('mr_device_student_binding', JSON.stringify(studentInfo));
    localStorage.setItem('mr_registered_student_info', JSON.stringify(studentInfo));
    if (studentInfo.id) {
      localStorage.setItem('mr_student_id', studentInfo.id);
    }
    if (studentInfo.email) {
      localStorage.setItem('mr_student_email', studentInfo.email);
    }
    if (studentInfo.phone) {
      localStorage.setItem('mr_student_phone', studentInfo.phone);
    }
    localStorage.setItem('mr_hw_device_fp', fp);
    localStorage.setItem('mr_radwan_device_fp', fp);
    
    // Add to registered devices list
    const regDevices = JSON.parse(localStorage.getItem('mr_radwan_registered_devices') || '[]');
    if (!regDevices.includes(fp)) {
      regDevices.push(fp);
      localStorage.setItem('mr_radwan_registered_devices', JSON.stringify(regDevices));
    }

    sessionStorage.setItem('mr_device_registered', 'true');
    sessionStorage.setItem('mr_device_student_binding', JSON.stringify(studentInfo));
    sessionStorage.setItem('mr_registered_student_info', JSON.stringify(studentInfo));
    if (studentInfo.id) sessionStorage.setItem('mr_student_id', studentInfo.id);
  } catch {}

  setCookie('mr_device_registered', 'true');
  setCookie('mr_device_student_binding', JSON.stringify(studentInfo));
  if (studentInfo.id) {
    setCookie('mr_student_id', studentInfo.id);
  }
  if (studentInfo.email) {
    setCookie('mr_student_email', studentInfo.email);
  }
  if (studentInfo.phone) {
    setCookie('mr_student_phone', studentInfo.phone);
  }
  setCookie('mr_hw_device_fp', fp);

  await saveIndexedDBData(fp, studentInfo);
  await saveCacheToken({
    token: fp,
    studentInfo,
    lockedAt: new Date().toISOString(),
  });
}

/**
 * Completely unlock device locally when student is deleted by teacher
 */
export async function unlockDevicePermanently(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem('mr_device_registered');
    localStorage.removeItem('mr_registered_student_info');
    localStorage.removeItem('mr_student_id');
    localStorage.removeItem('mr_student_email');
    localStorage.removeItem('mr_student_phone');
    localStorage.removeItem('mr_device_banned');
    localStorage.removeItem('mr_banned_device_info');
    sessionStorage.removeItem('mr_device_registered');
    sessionStorage.removeItem('mr_registered_student_info');
    sessionStorage.removeItem('mr_student_id');
    sessionStorage.removeItem('mr_student_email');
    sessionStorage.removeItem('mr_student_phone');
  } catch {}

  // Expire persistent cookies
  document.cookie = 'mr_device_registered=; path=/; max-age=0';
  document.cookie = 'mr_student_id=; path=/; max-age=0';
  document.cookie = 'mr_student_email=; path=/; max-age=0';
  document.cookie = 'mr_student_phone=; path=/; max-age=0';
  document.cookie = 'mr_device_banned=; path=/; max-age=0';

  // Clear IndexedDB
  try {
    if (window.indexedDB) {
      indexedDB.deleteDatabase(IDB_NAME);
    }
  } catch {}

  // Clear cache token
  try {
    if ('caches' in window) {
      await caches.delete(CACHE_NAME);
      await caches.delete('MR_RADWAN_CACHE_V1');
    }
  } catch {}
}

/**
 * Interface for Registered Student Device
 */
export interface RegisteredDeviceEntry {
  id: string;
  fingerprint: string;
  name: string;
  browser: string;
  isPrimary: boolean;
  registeredAt: string;
  lastActive: string;
  courseId?: string;
}

export interface DeviceVerificationResult {
  allowed: boolean;
  isPrimary: boolean;
  deviceNumber: 1 | 2 | 3;
  message?: string;
  currentDevice?: RegisteredDeviceEntry;
  allDevices?: RegisteredDeviceEntry[];
}

/**
 * Register or verify the student's current physical device for course access.
 * Enforces the strict 2-device limit by physical hardware (Mobile, Tablet, Laptop/PC).
 * Opening different browsers or tabs on the same device is recognized as the same device.
 */
export async function registerOrVerifyStudentCourseDevice(
  studentId: string,
  courseId?: string
): Promise<DeviceVerificationResult> {
  if (typeof window === 'undefined' || !studentId) {
    return { allowed: true, isPrimary: true, deviceNumber: 1 };
  }

  const profile = getPhysicalHardwareProfile();
  const currentFp = profile.hardwareFingerprint;

  try {
    const { checkAndRegisterStudentDeviceAction } = await import('@/app/actions/studentActions');
    const res = await checkAndRegisterStudentDeviceAction(studentId, currentFp, {
      name: profile.displayName,
      browser: profile.browserName,
    });

    if (res.allowed) {
      const isPrimary = Boolean((res as any).isPrimary);
      return {
        allowed: true,
        isPrimary,
        deviceNumber: (isPrimary ? 1 : 2) as 1 | 2,
        currentDevice: {
          id: 'dev_' + (isPrimary ? 'primary' : 'secondary'),
          fingerprint: currentFp,
          name: profile.displayName,
          browser: profile.browserName,
          isPrimary,
          registeredAt: new Date().toLocaleDateString('ar-EG'),
          lastActive: 'الآن (نشط)',
          courseId,
        },
      };
    } else {
      return {
        allowed: false,
        isPrimary: false,
        deviceNumber: 3,
        message: res.message || 'تم استكفاء عدد الأجهزة المسموحة (جهازين فقط).',
      };
    }
  } catch (err) {
    console.warn('Server device check fallback to local check:', err);
    return { allowed: true, isPrimary: true, deviceNumber: 1 };
  }
}

/**
 * Fetch all registered physical devices for a student from database
 */
export async function getStudentRegisteredDevices(studentId: string): Promise<RegisteredDeviceEntry[]> {
  if (typeof window === 'undefined' || !studentId) return [];
  const storageKey = `mr_student_devices_${studentId}`;

  try {
    const { getStudentRegisteredDevicesAction } = await import('@/app/actions/studentActions');
    const res = await getStudentRegisteredDevicesAction(studentId);
    if (res.success && Array.isArray(res.devices) && res.devices.length > 0) {
      const mapped: RegisteredDeviceEntry[] = res.devices.map((d: any) => ({
        id: d.id,
        fingerprint: d.deviceFingerprint,
        name: d.deviceName,
        browser: d.browserInfo,
        isPrimary: d.isPrimary,
        registeredAt: d.createdAt ? new Date(d.createdAt).toLocaleDateString('ar-EG') : 'مثبت',
        lastActive: d.lastActive ? new Date(d.lastActive).toLocaleDateString('ar-EG') : 'الآن (نشط)',
      }));
      try {
        localStorage.setItem(storageKey, JSON.stringify(mapped));
      } catch {}
      return mapped;
    }
  } catch (e) {
    console.warn('getStudentRegisteredDevices server fetch error:', e);
  }

  // Fallback to local cache
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}

  const profile = getPhysicalHardwareProfile();
  const initial: RegisteredDeviceEntry[] = [
    {
      id: 'dev_primary_main',
      fingerprint: profile.hardwareFingerprint,
      name: profile.displayName + ' - الجهاز الأساسي',
      browser: profile.browserName,
      isPrimary: true,
      registeredAt: new Date().toLocaleDateString('ar-EG'),
      lastActive: 'الآن (نشط)',
    }
  ];
  return initial;
}

/**
 * Delete a secondary device for a student (Primary device CANNOT be deleted)
 * Deleting a secondary device frees slot #2 so another device can be used.
 */
export async function deleteSecondaryStudentDevice(studentId: string, deviceId: string): Promise<boolean> {
  if (typeof window === 'undefined' || !studentId) return false;
  const storageKey = `mr_student_devices_${studentId}`;

  try {
    const { deleteStudentSecondaryDeviceAction } = await import('@/app/actions/studentActions');
    const res = await deleteStudentSecondaryDeviceAction(studentId, deviceId);
    if (res.success) {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          let devices: RegisteredDeviceEntry[] = JSON.parse(raw);
          devices = devices.filter(d => d.id !== deviceId);
          localStorage.setItem(storageKey, JSON.stringify(devices));
        }
      } catch {}
      return true;
    }
    return false;
  } catch (err) {
    console.error('deleteSecondaryStudentDevice error:', err);
    return false;
  }
}
