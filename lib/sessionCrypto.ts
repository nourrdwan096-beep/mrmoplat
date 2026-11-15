export const SESSION_COOKIE_NAME = 'mr_radwan_session';
export const MASTER_COOKIE_NAME = 'mr_radwan_master_session';

export interface SessionUserPayload {
  id: string;
  role: 'student' | 'teacher' | 'assistant' | 'super_admin';
  email: string;
  fullName: string;
  status: string;
  exp: number;
}

function getSessionSecretString(): string {
  const envSecret =
    process.env.SESSION_SECRET?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (envSecret && envSecret.length >= 16) {
    return `mr_radwan_sess_v1:${envSecret}`;
  }

  return ['mr', 'radwan', 'easy', 'english', '2030', 'hmac', 'session', 'guard'].join('_');
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(b64Url: string): Uint8Array {
  const padded = b64Url.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((b64Url.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function importHmacKey(): Promise<CryptoKey | null> {
  if (typeof globalThis === 'undefined' || !globalThis.crypto?.subtle) {
    return null;
  }
  const enc = new TextEncoder();
  return globalThis.crypto.subtle.importKey(
    'raw',
    enc.encode(getSessionSecretString()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function signSessionPayload(payload: SessionUserPayload): Promise<string> {
  const enc = new TextEncoder();
  const payloadBytes = enc.encode(JSON.stringify(payload));
  const payloadB64 = bytesToBase64Url(payloadBytes);
  const key = await importHmacKey();
  if (!key) {
    throw new Error('Web Crypto subtle API unavailable');
  }
  const signatureBuffer = await globalThis.crypto.subtle.sign('HMAC', key, enc.encode(payloadB64));
  const sigB64 = bytesToBase64Url(new Uint8Array(signatureBuffer));
  return `${payloadB64}.${sigB64}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<SessionUserPayload | null> {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadB64, sigB64] = parts;
  if (!payloadB64 || !sigB64) return null;

  try {
    const enc = new TextEncoder();
    const key = await importHmacKey();
    if (!key) return null;
    const sigBytes = base64UrlToBytes(sigB64);
    const sigArrayBuffer = new Uint8Array(sigBytes).buffer;
    const isValid = await globalThis.crypto.subtle.verify('HMAC', key, sigArrayBuffer, enc.encode(payloadB64));
    if (!isValid) return null;

    const payloadBytes = base64UrlToBytes(payloadB64);
    const json = new TextDecoder().decode(payloadBytes);
    const parsed = JSON.parse(json) as SessionUserPayload;

    if (!parsed || !parsed.id || !parsed.role || !parsed.exp) return null;
    if (Date.now() > parsed.exp) return null;

    return parsed;
  } catch {
    return null;
  }
}
