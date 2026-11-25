import { createHmac, timingSafeEqual } from 'node:crypto';

function getCertificateSecret(): string {
  const envSecret =
    process.env.SESSION_SECRET?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (envSecret && envSecret.length >= 16) {
    return `mr_radwan_cert_v1:${envSecret}`;
  }

  return ['mr', 'radwan', 'easy', 'english', '2030', 'honor', 'cert', 'hmac'].join('_');
}

export interface CertificateSignInput {
  studentId: string;
  courseId: string;
  itemId: string;
  percentage: number;
}

/**
 * Computes a deterministic HMAC-SHA256 certificate verification code on the server.
 * Cannot be forged from browser DevTools because the signing key stays server-side only.
 */
export function signHonorCertificate({
  studentId,
  courseId,
  itemId,
  percentage,
}: CertificateSignInput): string {
  const roundedScore = Math.min(100, Math.max(0, Math.round(Number(percentage) || 0)));
  const canonical = `${studentId}|${courseId}|${itemId}|${roundedScore}`;
  const digest = createHmac('sha256', getCertificateSecret())
    .update(canonical)
    .digest('hex')
    .toUpperCase();

  const partA = digest.slice(0, 6);
  const partB = digest.slice(6, 12);
  return `MR-CERT-${partA}-${partB}`;
}

export function verifyHonorCertificateCode(
  code: string | null | undefined,
  input: CertificateSignInput
): boolean {
  if (!code || typeof code !== 'string') return false;
  const expected = signHonorCertificate(input);
  const a = Buffer.from(code.trim().toUpperCase(), 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
