'use client';

/**
 * MR. MOHAMED RADWAN EDUCATION PLATFORM - CROSS-BROWSER HARDWARE & DEVICE SECURITY
 *
 * Physical Hardware Unification:
 * - Browsers are NOT devices: Chrome, Edge, Firefox, Safari, Samsung Internet, and Incognito
 *   on the exact same physical machine compute the exact same `hardwareCoreId` (`MR_PHY_<hash>`).
 * - Per-course device quotas and Primary Activation locking are verified server-side.
 * - Cross-student collisions are impossible because physical core matching only coalesces devices
 *   belonging to the SAME authenticated student account.
 */

// Fast 64-bit deterministic hash (djb2 + fnv-1a variant)
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

// 1. Canvas Fingerprinting (auxiliary forensic signal)
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

/**
 * Normalizes GPU vendor + renderer string so Chrome (ANGLE / Direct3D), Firefox,
 * Edge, and Safari on the SAME physical hardware collapse into a stable GPU core token.
 */
function extractNormalizedGpuInfo(): { gpuCore: string; maxTexBucket: number } {
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl) return { gpuCore: 'no-webgl', maxTexBucket: 0 };

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const rawVendor = String(debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR) || '');
    const rawRenderer = String(debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER) || '');
    const maxTextureSize = Number(gl.getParameter(gl.MAX_TEXTURE_SIZE) || 0);

    // Strip browser wrappers & trademark tokens while preserving silicon architecture (NVIDIA, AMD, Intel, Apple, Adreno, Mali, PowerVR, Xclipse)
    const cleanStr = (s: string) =>
      s
        .toUpperCase()
        .replace(/\(TM\)|\(R\)|™|®/g, ' ')
        .replace(/ANGLE\s*\(/g, ' ')
        .replace(/GOOGLE INC\.?\s*\(?/g, ' ')
        .replace(/ANGLE METAL RENDERER:?/g, ' ')
        .replace(/UNSPECIFIED VERSION/g, ' ')
        .replace(/LAPTOP GPU/g, ' ')
        .replace(/DIRECT3D\d*\s*(VS_\d+_\d+\s*PS_\d+_\d+)?/g, ' ')
        .replace(/D3D\d+|OPENGL ES \d+(?:\.\d+)?|OPENGL ENGINE|METAL/g, ' ')
        .replace(/\(\s*0X[0-9A-F]+\s*\)/g, ' ')
        .replace(/0X[0-9A-F]+/g, ' ')
        .replace(/\bMP\d+\b/g, ' ')
        .replace(/[^A-Z0-9\s-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const vendorClean = cleanStr(rawVendor);
    const rendererClean = cleanStr(rawRenderer);

    // Extract canonical GPU family / model signature invariant across browsers
    const combined = `${vendorClean} ${rendererClean}`.trim();
    const knownMatch = combined.match(
      /(APPLE M\d+(?:\s*(?:PRO|MAX|ULTRA))?|APPLE GPU|ADRENO\s*\d+|MALI-[A-Z]?\d+|XCLIPSE\s*\d+|IMMORTALIS-[A-Z]?\d+|POWERVR\s*[A-Z0-9]+|GEFORCE\s*(?:RTX|GTX|MX|GT)?\s*\d+(?:\s*(?:TI|SUPER|M))?|RTX\s*[A-Z]?\d+(?:\s*(?:TI|SUPER))?|GTX\s*\d+(?:\s*(?:TI|SUPER))?|RADEON\s*(?:RX\s*)?(?:VEGA\s*)?[A-Z0-9]+|ARC\s*[A-Z]?\d+[A-Z]?|IRIS\s*(?:XE|PLUS|PRO)?(?:\s*\d+)?|UHD GRAPHICS\s*\d*|HD GRAPHICS\s*\d*|INTEL\s*[A-Z0-9]+|SWIFTSHADER|LLVMPIPE)/i
    );

    const gpuCore = knownMatch
      ? knownMatch[1].replace(/\s+/g, '_').replace(/_+/g, '_')
      : (rendererClean || vendorClean || 'GENERIC_GPU').slice(0, 48).replace(/\s+/g, '_');

    return {
      gpuCore,
      maxTexBucket: maxTextureSize > 0 ? Math.round(Math.log2(maxTextureSize)) : 0,
    };
  } catch {
    return { gpuCore: 'webgl-err', maxTexBucket: 0 };
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
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);

    return hashString(`${vendor}~${renderer}~${maxTextureSize}`);
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

/**
 * Zoom-independent and orientation-independent physical screen geometry.
 * Chrome, Edge, Firefox, Safari, and Incognito yield identical physical pixel dimensions
 * when multiplying logical screen dimensions by DPR and normalizing orientation.
 */
function getZoomCompensatedPhysicalScreen(): {
  physMax: number;
  physMin: number;
  logicalSummary: string;
} {
  if (typeof window === 'undefined') {
    return { physMax: 0, physMin: 0, logicalSummary: 'server' };
  }
  const sw = window.screen?.width || 0;
  const sh = window.screen?.height || 0;
  const dpr = window.devicePixelRatio || 1;
  const pw = Math.round((sw * dpr) / 4) * 4;
  const ph = Math.round((sh * dpr) / 4) * 4;
  const physMax = Math.max(pw, ph);
  const physMin = Math.min(pw, ph);
  const maxDim = Math.max(sw, sh);
  const minDim = Math.min(sw, sh);
  const roundedDpr = Math.round(dpr * 10) / 10;
  return {
    physMax,
    physMin,
    logicalSummary: `${maxDim}x${minDim}@${roundedDpr}`,
  };
}

// 4. Hardware & Screen Profile
function getHardwareProfile(): string {
  if (typeof window === 'undefined') return 'server';
  const nav = navigator as any;
  const { physMax, physMin } = getZoomCompensatedPhysicalScreen();
  const hardware = [
    nav.hardwareConcurrency || 4,
    (nav.maxTouchPoints || 0) > 0 ? 'T' : 'N',
    nav.platform || 'platform',
  ].join('|');

  return `${physMax}x${physMin};${hardware}`;
}

export interface PhysicalHardwareProfile {
  deviceType: 'mobile' | 'tablet' | 'desktop';
  deviceTypeArabic: string;
  os: 'Android' | 'iOS' | 'Windows' | 'macOS' | 'Linux' | 'Other';
  osArabic: string;
  screenSummary: string;
  gpuSummary: string;
  timezone: string;
  hardwareCoreId: string;
  hardwareFingerprint: string;
  displayName: string;
  browserName: string;
}

/**
 * Accurately classifies physical hardware, OS, and computes `hardwareCoreId` (`MR_PHY_<hash>`).
 * `hardwareCoreId` stays invariant across Chrome, Firefox, Edge, Safari, Samsung Internet,
 * tabs, and Incognito / Private windows on the same physical machine.
 */
export function getPhysicalHardwareProfile(): PhysicalHardwareProfile {
  if (typeof window === 'undefined') {
    return {
      deviceType: 'desktop',
      deviceTypeArabic: 'كمبيوتر / سيرفر',
      os: 'Other',
      osArabic: 'نظام تشغيل',
      screenSummary: 'server',
      gpuSummary: 'SERVER',
      timezone: 'UTC',
      hardwareCoreId: 'MR_PHY_SERVER',
      hardwareFingerprint: 'DEV-SERVER',
      displayName: 'بيئة السيرفر',
      browserName: 'Server',
    };
  }

  const nav = navigator as any;
  const ua = nav.userAgent || '';

  // 0. Extract physical GPU & screen before classifying OS (handles Android/iOS "Desktop Site" mode cleanly)
  const { physMax, physMin, logicalSummary } = getZoomCompensatedPhysicalScreen();
  const { gpuCore } = extractNormalizedGpuInfo();
  const isAndroidGpu = /^(ADRENO|MALI|POWERVR|XCLIPSE|IMMORTALIS)/i.test(gpuCore);

  // 1. Detect OS accurately across all browsers (handles iPadOS & Android desktop-mode UA)
  let os: 'Android' | 'iOS' | 'Windows' | 'macOS' | 'Linux' | 'Other' = 'Other';
  let osArabic = 'نظام تشغيل';

  if (/Android/i.test(ua) || (isAndroidGpu && (nav.maxTouchPoints || 0) > 0)) {
    os = 'Android';
    osArabic = 'أندرويد (Android)';
  } else if (/iPhone|iPad|iPod/i.test(ua) || (nav.platform === 'MacIntel' && (nav.maxTouchPoints || 0) > 1)) {
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

  const isTablet =
    /iPad|tablet|(android(?!.*mobile))/i.test(ua) ||
    (nav.platform === 'MacIntel' && (nav.maxTouchPoints || 0) > 1) ||
    (os === 'Android' && Math.min(window.screen?.width || 0, window.screen?.height || 0) >= 600);
  const isMobile =
    !isTablet &&
    (/Mobile|iPhone|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
      (os === 'Android' && (nav.maxTouchPoints || 0) > 0) ||
      ((window.screen?.width || 999) < 600 && (nav.maxTouchPoints || 0) > 0));

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

  // 3. Browser Info (informational tag appended to `browsersSeen` — never fragments physical device)
  let browserName = 'متصفح ويب';
  if (/Edg\//i.test(ua)) browserName = 'Microsoft Edge';
  else if (/SamsungBrowser/i.test(ua)) browserName = 'Samsung Internet';
  else if (/OPR|Opera/i.test(ua)) browserName = 'Opera';
  else if (/Firefox|FxiOS/i.test(ua)) browserName = 'Mozilla Firefox';
  else if (/CriOS|Chrome/i.test(ua) && !/Edg/i.test(ua)) browserName = 'Google Chrome';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browserName = 'Apple Safari';

  // 4. Cross-browser physical silicon & display core (excludes Safari/Brave-masked hardwareConcurrency/maxTexSize)
  const touchCap = (nav.maxTouchPoints || 0) > 0 ? 'TOUCH' : 'NOTOUCH';
  let timezone = 'UTC';
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {}

  const coreSeed = [
    os,
    deviceType,
    gpuCore,
    `${physMax}x${physMin}`,
    touchCap,
    timezone,
  ].join('::');

  const hardwareCoreId = `MR_PHY_${hashString(coreSeed).toUpperCase()}`;

  // 5. Persistent browser installation token (for multi-layer recovery & hardware ban defense)
  const hardwareFingerprint = getPersistentUniqueDeviceToken();
  const displayName = `${deviceTypeArabic} (${osArabic})`;

  return {
    deviceType,
    deviceTypeArabic,
    os,
    osArabic,
    screenSummary: `${physMax}x${physMin} (${logicalSummary})`,
    gpuSummary: gpuCore,
    timezone,
    hardwareCoreId,
    hardwareFingerprint,
    displayName,
    browserName,
  };
}

const UNIQUE_DEVICE_STORAGE_KEY = 'mr_unique_device_token';

function generateSecureUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function isLegacyGenericFingerprint(token: string | null | undefined): boolean {
  if (!token) return false;
  return /^DEV-(MOBILE|DESKTOP|TABLET)-(ANDROID|WINDOWS|IOS|LINUX|OTHER)-\d+X\d+/i.test(token);
}

export function getPersistentUniqueDeviceToken(): string {
  if (typeof window === 'undefined') return 'SERVER_ENVIRONMENT';

  let token: string | null = null;

  try {
    const local = localStorage.getItem(UNIQUE_DEVICE_STORAGE_KEY);
    if (local && !isLegacyGenericFingerprint(local)) {
      token = local;
    } else if (isLegacyGenericFingerprint(local)) {
      localStorage.removeItem(UNIQUE_DEVICE_STORAGE_KEY);
    }
  } catch {}

  if (!token) {
    try {
      const sess = sessionStorage.getItem(UNIQUE_DEVICE_STORAGE_KEY) || sessionStorage.getItem('mr_hw_device_fp');
      if (sess && !isLegacyGenericFingerprint(sess)) {
        token = sess;
      }
    } catch {}
  }

  if (!token) {
    const cookieVal = getCookie(UNIQUE_DEVICE_STORAGE_KEY) || getCookie('mr_hw_device_fp') || getCookie('mr_radwan_device_fp');
    if (cookieVal && !isLegacyGenericFingerprint(cookieVal)) {
      token = cookieVal;
    }
  }

  try {
    const oldFp1 = localStorage.getItem('mr_hw_device_fp');
    if (isLegacyGenericFingerprint(oldFp1)) localStorage.removeItem('mr_hw_device_fp');
    const oldFp2 = localStorage.getItem('mr_device_fingerprint');
    if (isLegacyGenericFingerprint(oldFp2)) localStorage.removeItem('mr_device_fingerprint');
    const oldFp3 = localStorage.getItem('mr_radwan_device_fp');
    if (isLegacyGenericFingerprint(oldFp3)) localStorage.removeItem('mr_radwan_device_fp');
  } catch {}

  if (!token) {
    const rawUuid = generateSecureUuid().replace(/-/g, '').slice(0, 16).toUpperCase();
    token = `MR_DEV_${rawUuid}`;
  }

  try {
    localStorage.setItem(UNIQUE_DEVICE_STORAGE_KEY, token);
    localStorage.setItem('mr_hw_device_fp', token);
    localStorage.setItem('mr_device_fingerprint', token);
    localStorage.setItem('mr_radwan_device_fp', token);
    sessionStorage.setItem(UNIQUE_DEVICE_STORAGE_KEY, token);
    sessionStorage.setItem('mr_hw_device_fp', token);
    setCookie(UNIQUE_DEVICE_STORAGE_KEY, token);
    setCookie('mr_hw_device_fp', token);
    setCookie('mr_radwan_device_fp', token);
  } catch {}

  return token;
}

export async function computeHardwareSignature(): Promise<string> {
  if (typeof window === 'undefined') return 'MR_HW_SERVER';
  try {
    const canvasFp = getCanvasFingerprint();
    const webglFp = getWebGLFingerprint();
    const audioFp = await getAudioFingerprint();
    const hwProfile = getHardwareProfile();
    const combined = `${canvasFp}::${webglFp}::${audioFp}::${hwProfile}`;
    return `MR_HW_${hashString(combined).toUpperCase()}`;
  } catch {
    return `MR_HW_${hashString(getHardwareProfile()).toUpperCase()}`;
  }
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

export async function getStrictDeviceFingerprint(): Promise<string> {
  if (typeof window === 'undefined') return 'SERVER_ENVIRONMENT';

  let recoveredToken: string | null = null;

  try {
    const lToken =
      localStorage.getItem(UNIQUE_DEVICE_STORAGE_KEY) ||
      localStorage.getItem('mr_hw_device_fp') ||
      localStorage.getItem('mr_radwan_device_fp');
    if (lToken && !isLegacyGenericFingerprint(lToken)) {
      recoveredToken = lToken;
    }
  } catch {}

  if (!recoveredToken) {
    try {
      const sToken =
        sessionStorage.getItem(UNIQUE_DEVICE_STORAGE_KEY) ||
        sessionStorage.getItem('mr_hw_device_fp');
      if (sToken && !isLegacyGenericFingerprint(sToken)) {
        recoveredToken = sToken;
      }
    } catch {}
  }

  if (!recoveredToken) {
    const cToken =
      getCookie(UNIQUE_DEVICE_STORAGE_KEY) ||
      getCookie('mr_hw_device_fp') ||
      getCookie('mr_radwan_device_fp');
    if (cToken && !isLegacyGenericFingerprint(cToken)) {
      recoveredToken = cToken;
    }
  }

  if (!recoveredToken) {
    try {
      const idbToken = await getIndexedDBToken();
      if (idbToken && !isLegacyGenericFingerprint(idbToken)) {
        recoveredToken = idbToken;
      }
    } catch {}
  }

  if (!recoveredToken) {
    try {
      const cacheToken = await getCacheToken();
      if (cacheToken && !isLegacyGenericFingerprint(cacheToken)) {
        recoveredToken = cacheToken;
      }
    } catch {}
  }

  const finalFp = recoveredToken || getPersistentUniqueDeviceToken();

  try {
    localStorage.setItem(UNIQUE_DEVICE_STORAGE_KEY, finalFp);
    localStorage.setItem('mr_hw_device_fp', finalFp);
    localStorage.setItem('mr_device_fingerprint', finalFp);
    localStorage.setItem('mr_radwan_device_fp', finalFp);
    sessionStorage.setItem(UNIQUE_DEVICE_STORAGE_KEY, finalFp);
    sessionStorage.setItem('mr_hw_device_fp', finalFp);
  } catch {}

  setCookie(UNIQUE_DEVICE_STORAGE_KEY, finalFp);
  setCookie('mr_hw_device_fp', finalFp);
  setCookie('mr_radwan_device_fp', finalFp);
  await saveIndexedDBToken(finalFp).catch(() => {});
  await saveCacheToken({ token: finalFp, updatedAt: new Date().toISOString() }).catch(() => {});

  return finalFp;
}

export interface DeviceContextPayload {
  primaryFingerprint: string;
  hardwareCoreId: string;
  candidateFingerprints: string[];
  name: string;
  browser: string;
  os: 'Android' | 'iOS' | 'Windows' | 'macOS' | 'Linux' | 'Other';
  osArabic: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  deviceTypeArabic: string;
  gpuSummary: string;
  screenSummary: string;
  timezone: string;
}

export interface StrictDeviceIdentity {
  primaryFingerprint: string;
  hardwareCoreId: string;
  candidateFingerprints: string[];
  hardwareSignature?: string;
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

export async function getStrictDeviceIdentity(): Promise<StrictDeviceIdentity> {
  if (typeof window === 'undefined') {
    return {
      primaryFingerprint: 'SERVER',
      hardwareCoreId: 'MR_PHY_SERVER',
      candidateFingerprints: [],
      hardwareSignature: 'MR_HW_SERVER',
      isLocallyLocked: false,
      storedStudent: null,
    };
  }

  const profile = getPhysicalHardwareProfile();
  const [primaryFp, hardwareSignature, idbData, cacheData] = await Promise.all([
    getStrictDeviceFingerprint(),
    computeHardwareSignature(),
    getIndexedDBData().catch(() => ({ token: null, studentInfo: null })),
    getCacheData().catch(() => ({ token: null, studentInfo: null })),
  ]);

  const candidateSet = new Set<string>();
  if (primaryFp && !isLegacyGenericFingerprint(primaryFp)) {
    candidateSet.add(primaryFp);
  }
  if (profile.hardwareCoreId) {
    candidateSet.add(profile.hardwareCoreId);
  }

  try {
    const k1 = localStorage.getItem(UNIQUE_DEVICE_STORAGE_KEY);
    const k2 = localStorage.getItem('mr_device_fingerprint');
    const k3 = localStorage.getItem('mr_hw_device_fp');
    const k4 = localStorage.getItem('mr_radwan_device_fp');
    const s1 = sessionStorage.getItem(UNIQUE_DEVICE_STORAGE_KEY);
    const s2 = sessionStorage.getItem('mr_hw_device_fp');
    [k1, k2, k3, k4, s1, s2].forEach(k => {
      if (k && !isLegacyGenericFingerprint(k)) candidateSet.add(k);
    });
  } catch {}

  [
    getCookie(UNIQUE_DEVICE_STORAGE_KEY),
    getCookie('mr_hw_device_fp'),
    getCookie('mr_radwan_device_fp'),
    idbData?.token,
    cacheData?.token,
  ].forEach(tok => {
    if (tok && !isLegacyGenericFingerprint(tok)) candidateSet.add(tok);
  });

  let isLocallyLocked = false;
  let studentId: string | undefined = undefined;
  let storedStudent: StrictDeviceIdentity['storedStudent'] = null;

  try {
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

    const deepStored = idbData?.studentInfo || cacheData?.studentInfo;
    if (!storedStudent && deepStored && (deepStored.id || deepStored.email || deepStored.phone)) {
      storedStudent = deepStored;
      isLocallyLocked = true;
      if (deepStored.id) studentId = deepStored.id;
    }

    const rawUser = localStorage.getItem('mr_radwan_current_user');
    if (rawUser && !storedStudent) {
      try {
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
      } catch {}
    }
  } catch {}

  return {
    primaryFingerprint: primaryFp,
    hardwareCoreId: profile.hardwareCoreId,
    candidateFingerprints: Array.from(candidateSet).filter(Boolean),
    hardwareSignature,
    isLocallyLocked,
    studentId,
    storedStudent,
  };
}

/**
 * Full unified hardware + browser payload sent to server for logins, enrollments, and course checks.
 */
export async function getDeviceContextPayload(): Promise<DeviceContextPayload> {
  if (typeof window === 'undefined') {
    return {
      primaryFingerprint: 'SERVER',
      hardwareCoreId: 'MR_PHY_SERVER',
      candidateFingerprints: [],
      name: 'بيئة السيرفر',
      browser: 'Server',
      os: 'Other',
      osArabic: 'نظام تشغيل',
      deviceType: 'desktop',
      deviceTypeArabic: 'كمبيوتر / سيرفر',
      gpuSummary: 'SERVER',
      screenSummary: 'server',
      timezone: 'UTC',
    };
  }
  const profile = getPhysicalHardwareProfile();
  const identity = await getStrictDeviceIdentity();
  return {
    primaryFingerprint: identity.primaryFingerprint,
    hardwareCoreId: profile.hardwareCoreId,
    candidateFingerprints: identity.candidateFingerprints,
    name: profile.displayName,
    browser: profile.browserName,
    os: profile.os,
    osArabic: profile.osArabic,
    deviceType: profile.deviceType,
    deviceTypeArabic: profile.deviceTypeArabic,
    gpuSummary: profile.gpuSummary,
    screenSummary: profile.screenSummary,
    timezone: profile.timezone,
  };
}

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

    document.cookie = 'mr_device_registered=; path=/; max-age=0';
    document.cookie = 'mr_device_student_binding=; path=/; max-age=0';
    document.cookie = 'mr_student_id=; path=/; max-age=0';
    document.cookie = 'mr_student_email=; path=/; max-age=0';
    document.cookie = 'mr_student_phone=; path=/; max-age=0';
    document.cookie = 'mr_hw_device_fp=; path=/; max-age=0';
    document.cookie = 'mr_radwan_user=; path=/; max-age=0';

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
    } catch {}

    if ('caches' in window) {
      try {
        const cache = await caches.open(CACHE_NAME);
        await cache.delete(CACHE_KEY_URL);
        await caches.delete(CACHE_NAME);
        await caches.delete('MR_RADWAN_CACHE_V1');
      } catch {}
    }
  } catch (err) {
    console.warn('Error clearing device lock', err);
  }
}

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
    if (studentInfo.id) localStorage.setItem('mr_student_id', studentInfo.id);
    if (studentInfo.email) localStorage.setItem('mr_student_email', studentInfo.email);
    if (studentInfo.phone) localStorage.setItem('mr_student_phone', studentInfo.phone);
    localStorage.setItem('mr_hw_device_fp', fp);
    localStorage.setItem('mr_radwan_device_fp', fp);

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
  if (studentInfo.id) setCookie('mr_student_id', studentInfo.id);
  if (studentInfo.email) setCookie('mr_student_email', studentInfo.email);
  if (studentInfo.phone) setCookie('mr_student_phone', studentInfo.phone);
  setCookie('mr_hw_device_fp', fp);

  await saveIndexedDBData(fp, studentInfo);
  await saveCacheToken({
    token: fp,
    studentInfo,
    lockedAt: new Date().toISOString(),
  });
}

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

  document.cookie = 'mr_device_registered=; path=/; max-age=0';
  document.cookie = 'mr_student_id=; path=/; max-age=0';
  document.cookie = 'mr_student_email=; path=/; max-age=0';
  document.cookie = 'mr_student_phone=; path=/; max-age=0';
  document.cookie = 'mr_device_banned=; path=/; max-age=0';

  try {
    if (window.indexedDB) {
      indexedDB.deleteDatabase(IDB_NAME);
    }
  } catch {}

  try {
    if ('caches' in window) {
      await caches.delete(CACHE_NAME);
      await caches.delete('MR_RADWAN_CACHE_V1');
    }
  } catch {}
}

export interface RegisteredDeviceEntry {
  id: string;
  fingerprint: string;
  hardwareCoreId?: string;
  name: string;
  browser: string;
  browsersSeen?: string[];
  deviceType?: 'mobile' | 'tablet' | 'desktop';
  os?: string;
  isPrimary: boolean;
  registeredAt: string;
  lastActive: string;
  courseId?: string;
  courseTitle?: string;
  activatedVia?: string;
}

export interface CourseDeviceGroup {
  courseId: string;
  courseTitle: string;
  maxDevices: number;
  isUnlimited: boolean;
  activeCount: number;
  remainingSlots: number | null;
  devices: RegisteredDeviceEntry[];
}

export interface DeviceVerificationResult {
  allowed: boolean;
  isPrimary: boolean;
  deviceNumber: number;
  maxDevices?: number;
  activeCount?: number;
  isUnlimited?: boolean;
  isBanned?: boolean;
  message?: string;
  currentDevice?: RegisteredDeviceEntry;
  allDevices?: RegisteredDeviceEntry[];
}

/**
 * Register or verify the student's physical hardware device for accessing a specific course.
 * Browsers on the same physical machine share `hardwareCoreId` so they NEVER consume extra device slots.
 */
export async function registerOrVerifyStudentCourseDevice(
  studentId: string,
  courseId?: string
): Promise<DeviceVerificationResult> {
  if (typeof window === 'undefined' || !studentId) {
    return { allowed: true, isPrimary: true, deviceNumber: 1, maxDevices: 3, activeCount: 1 };
  }

  const ctx = await getDeviceContextPayload();

  try {
    const { checkAndRegisterStudentDeviceAction } = await import('@/app/actions/studentActions');
    const res = await checkAndRegisterStudentDeviceAction(
      studentId,
      ctx.primaryFingerprint,
      {
        name: ctx.name,
        browser: ctx.browser,
        hardwareCoreId: ctx.hardwareCoreId,
        candidateFingerprints: ctx.candidateFingerprints,
        os: ctx.os,
        deviceType: ctx.deviceType,
        gpuSummary: ctx.gpuSummary,
        screenSummary: ctx.screenSummary,
        timezone: ctx.timezone,
      },
      courseId
    );

    if (res.allowed) {
      const isPrimary = Boolean((res as any).isPrimary);
      const maxDevices = Number((res as any).maxDevices ?? 3);
      const activeCount = Number((res as any).activeCount ?? 1);
      const isUnlimited = Boolean((res as any).isUnlimited);
      return {
        allowed: true,
        isPrimary,
        deviceNumber: activeCount || (isPrimary ? 1 : 2),
        maxDevices,
        activeCount,
        isUnlimited,
        currentDevice: {
          id: (res as any).deviceId || ctx.hardwareCoreId || 'dev_primary',
          fingerprint: ctx.primaryFingerprint,
          hardwareCoreId: ctx.hardwareCoreId,
          name: ctx.name,
          browser: ctx.browser,
          browsersSeen: [ctx.browser],
          deviceType: ctx.deviceType,
          os: ctx.os,
          isPrimary,
          registeredAt: new Date().toLocaleDateString('ar-EG'),
          lastActive: 'الآن (نشط)',
          courseId,
        },
      };
    }

    return {
      allowed: false,
      isPrimary: false,
      deviceNumber: Number((res as any).activeCount ?? 0) + 1,
      maxDevices: Number((res as any).maxDevices ?? 3),
      activeCount: Number((res as any).activeCount ?? 0),
      isUnlimited: Boolean((res as any).isUnlimited),
      isBanned: Boolean((res as any).isBanned),
      message:
        res.message ||
        `تم استكفاء الحد الأقصى للأجهزة المصرح بها لهذا الكورس (${Number((res as any).maxDevices ?? 3)} أجهزة).`,
    };
  } catch (err) {
    console.warn('Server device verification rejected or unavailable:', err);
    return {
      allowed: false,
      isPrimary: false,
      deviceNumber: 0,
      message: 'تعذر التحقق من صلاحية الجهاز على الخادم. يرجى تسجيل الدخول والمحاولة مرة أخرى.',
    };
  }
}

export async function getStudentRegisteredDevices(
  studentId: string,
  courseId?: string
): Promise<{
  devices: RegisteredDeviceEntry[];
  courseGroups: CourseDeviceGroup[];
  loginDevices: RegisteredDeviceEntry[];
}> {
  if (typeof window === 'undefined' || !studentId) {
    return { devices: [], courseGroups: [], loginDevices: [] };
  }

  try {
    const { getStudentRegisteredDevicesAction } = await import('@/app/actions/studentActions');
    const res = await getStudentRegisteredDevicesAction(studentId, courseId);
    if (res.success) {
      return {
        devices: (res.devices || []) as RegisteredDeviceEntry[],
        courseGroups: (res.courseGroups || []) as CourseDeviceGroup[],
        loginDevices: (res.loginDevices || []) as RegisteredDeviceEntry[],
      };
    }
  } catch (e) {
    console.warn('getStudentRegisteredDevices server fetch error:', e);
  }

  return { devices: [], courseGroups: [], loginDevices: [] };
}

export async function deleteSecondaryStudentDevice(
  studentId: string,
  deviceId: string,
  courseId?: string
): Promise<{ success: boolean; message?: string }> {
  if (typeof window === 'undefined' || !studentId || !deviceId) {
    return { success: false, message: 'بيانات غير مكتملة' };
  }

  try {
    const { deleteStudentSecondaryDeviceAction } = await import('@/app/actions/studentActions');
    const res = await deleteStudentSecondaryDeviceAction(studentId, deviceId, courseId);
    return { success: Boolean(res.success), message: res.message };
  } catch (err: any) {
    console.error('deleteSecondaryStudentDevice error:', err);
    return { success: false, message: err?.message || 'حدث خطأ أثناء حذف الجهاز' };
  }
}
