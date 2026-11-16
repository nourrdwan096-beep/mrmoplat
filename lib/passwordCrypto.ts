/**
 * Zero-Knowledge Cryptographic Password Hashing (Web Crypto PBKDF2-SHA256)
 * Works across Cloudflare Workers (workerd), Next.js Edge, and Node.js runtimes
 * without requiring Node's 'crypto' or 'Buffer' modules.
 */

const HASH_PREFIX = 'pbkdf2_sha256';
const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const DERIVED_KEY_BITS = 256;

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str: string): Uint8Array | null {
  try {
    let padded = str.replace(/-/g, '+').replace(/_/g, '/');
    while (padded.length % 4) {
      padded += '=';
    }
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

export function isPasswordHash(stored?: string | null): boolean {
  if (!stored || typeof stored !== 'string') return false;
  return stored.startsWith(`${HASH_PREFIX}$`);
}

async function derivePbkdf2Bits(
  password: string,
  salt: Uint8Array,
  iterations: number
): Promise<Uint8Array> {
  const keyMaterial = await globalThis.crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const bits = await globalThis.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    DERIVED_KEY_BITS
  );

  return new Uint8Array(bits);
}

/**
 * Generates an irreversible salted PBKDF2-SHA256 password digest.
 */
export async function hashPasswordSecure(password: string): Promise<string> {
  const salt = new Uint8Array(SALT_BYTES);
  globalThis.crypto.getRandomValues(salt);
  const derived = await derivePbkdf2Bits(password, salt, PBKDF2_ITERATIONS);
  return `${HASH_PREFIX}$${PBKDF2_ITERATIONS}$${toBase64Url(salt)}$${toBase64Url(derived)}`;
}

/**
 * Verifies a candidate plaintext password against a stored PBKDF2-SHA256 digest
 * using constant-time byte comparison.
 */
export async function verifyPasswordSecure(
  password: string,
  storedHash: string
): Promise<boolean> {
  if (!password || !isPasswordHash(storedHash)) return false;

  const parts = storedHash.split('$');
  if (parts.length !== 4) return false;

  const iterations = parseInt(parts[1], 10);
  if (!Number.isFinite(iterations) || iterations < 10_000 || iterations > 1_000_000) {
    return false;
  }

  const salt = fromBase64Url(parts[2]);
  const expected = fromBase64Url(parts[3]);
  if (!salt || !expected || salt.length < 8 || expected.length !== DERIVED_KEY_BITS / 8) {
    return false;
  }

  try {
    const derived = await derivePbkdf2Bits(password, salt, iterations);
    return timingSafeEqualBytes(derived, expected);
  } catch {
    return false;
  }
}
