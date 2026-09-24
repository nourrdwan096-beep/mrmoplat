import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Convert Eastern Arabic / Persian numerals (٠-٩ / ۰-۹) to standard Western digits (0-9)
 */
export function normalizeEasternArabicDigits(str: string): string {
  if (!str) return '';
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  let res = String(str);
  for (let i = 0; i < 10; i++) {
    res = res.replaceAll(arabicDigits[i], String(i)).replaceAll(persianDigits[i], String(i));
  }
  return res;
}

/**
 * Standardize Egyptian mobile numbers into 01XXXXXXXXX (11 digits)
 * Handles +20, 0020, 20 prefixes, spaces, brackets, dashes, and Eastern Arabic digits
 */
export function cleanEgyptianPhone(phone: string): string {
  if (!phone) return '';
  let digits = normalizeEasternArabicDigits(phone).replace(/\D/g, '');
  if (digits.startsWith('0020')) {
    digits = digits.substring(4);
  } else if (digits.startsWith('20')) {
    digits = digits.substring(2);
  }
  if (!digits.startsWith('0') && digits.length === 10) {
    digits = '0' + digits;
  }
  return digits;
}

/**
 * Validate Egyptian mobile phone number (11 digits, starts with 010, 011, 012, or 015)
 */
export function validateEgyptianPhone(phone: string): boolean {
  const cleaned = cleanEgyptianPhone(phone);
  if (!/^01[0125][0-9]{8}$/.test(cleaned)) return false;
  // Prevent all identical repeating digits like 01111111111
  if (/^01[0125](\d)\1{7}$/.test(cleaned)) return false;
  return true;
}

/**
 * Strip Arabic diacritics / tashkeel and tatweel (kashida) for reliable name validation
 */
export function cleanArabicText(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '') // strip harakat and tatweel
    .trim();
}

/**
 * Strict Arabic name validation:
 * Requires Arabic characters, at least 2 characters, at least 2 unique characters,
 * no repeating consecutive characters >= 3, and no keyboard smashes.
 */
export function validateArabicName(name: string): boolean {
  const cleaned = cleanArabicText(name);
  if (!cleaned) return false;

  // 1. Only Arabic letters and spaces
  if (!/^[\u0621-\u064A\s]{2,}$/.test(cleaned)) return false;

  // 2. Prevent 3 or more consecutive identical characters
  if (/(.)\1{2,}/.test(cleaned)) return false;

  // 3. Prevent names consisting of only one repeated character
  const uniqueChars = new Set(cleaned.replace(/\s/g, '').split(''));
  if (uniqueChars.size < 2) return false;

  // 4. Prevent common keyboard smashes
  const keyboardSmashes = ['شسيب', 'ضصثق', 'ظزوة', 'يسبش', 'قثصض', 'ةوزظ', 'غفقث', 'ثقفغ', 'صثقف', 'فقثص'];
  for (const smash of keyboardSmashes) {
    if (cleaned.includes(smash)) return false;
  }

  return true;
}
