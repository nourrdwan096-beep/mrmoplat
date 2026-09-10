/**
 * Comprehensive Rich Text & Formatting Parser
 * Handles:
 * 1. Safe HTML and recursively decoded entities (&lt;, &gt;, &quot;, &amp;)
 * 2. Live Animation codes: [pulse], [bounce], [glow], [shimmer], <pulse>, <bounce>, etc.
 * 3. Color codes: [color=#hex], [color=red], [لون=أحمر], etc.
 * 4. Typography codes: [b], [i] (إمالة), [u], [s], [size=...], markdown (**bold**, *italic*, etc.)
 * 5. Arabic equivalents: [نبض], [قفز], [توهج], [لمعان], [عريض], [مائل], [تسطير]
 */

const COLOR_NAME_MAP: Record<string, string> = {
  // Arabic color names
  'أحمر': '#dc2626',
  'ازرق': '#2563eb',
  'أزرق': '#2563eb',
  'اخضر': '#16a34a',
  'أخضر': '#16a34a',
  'اصفر': '#ca8a04',
  'أصفر': '#ca8a04',
  'ذهبي': '#d97706',
  'برتقالي': '#ea580c',
  'بنفسجي': '#9333ea',
  'موف': '#9333ea',
  'وردي': '#ec4899',
  'بمبي': '#ec4899',
  'اسود': '#0f172a',
  'أسود': '#0f172a',
  'رمادي': '#64748b',
  'سماوي': '#0284c7',
  'نيلي': '#1e40af',
  // English color names
  'red': '#dc2626',
  'blue': '#2563eb',
  'green': '#16a34a',
  'yellow': '#ca8a04',
  'gold': '#d97706',
  'orange': '#ea580c',
  'purple': '#9333ea',
  'pink': '#ec4899',
  'black': '#0f172a',
  'gray': '#64748b',
  'grey': '#64748b',
  'sky': '#0284c7',
  'cyan': '#0284c7',
};

const FONT_SIZE_MAP: Record<string, string> = {
  'sm': '14px',
  'صغير': '14px',
  'base': '16px',
  'عادي': '16px',
  'md': '19px',
  'متوسط': '19px',
  'lg': '23px',
  'كبير': '23px',
  'xl': '28px',
  'ضخم': '28px',
  'عريض': '28px',
};

/**
 * Decodes all levels of escaped HTML entities
 */
export function decodeHtmlEntities(raw: string): string {
  if (!raw) return '';
  let str = raw;

  // Perform multi-pass decode to resolve &amp;lt;span...
  for (let i = 0; i < 4; i++) {
    const before = str;
    str = str
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');

    if (str === before) break;
    // Decode &amp; after tag brackets to allow multi-step unescaping
    str = str.replace(/&amp;/g, '&');
  }

  return str;
}

/**
 * Resolves color string (hex, rgb, or color name)
 */
function resolveColor(rawVal: string): string {
  const clean = rawVal.trim().toLowerCase().replace(/['"]/g, '');
  if (COLOR_NAME_MAP[clean]) {
    return COLOR_NAME_MAP[clean];
  }
  if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(clean)) {
    return clean;
  }
  if (/^rgba?\(.+?\)$/i.test(clean)) {
    return clean;
  }
  return '#dc2626'; // safe vibrant fallback
}

/**
 * Strips dangerous scripts while keeping styles, classes, and formatting elements
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/on\w+\s*=\s*(["'][^"']*["']|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '');
}

/**
 * Transforms all shortcodes, BBCode, markdown, and raw animation tags into styled HTML
 */
export function parseRichContent(input: string): string {
  if (!input) return '';

  // Step 1: Decode entities
  let text = decodeHtmlEntities(input);

  // Step 2: Convert animation custom tags like <pulse>text</pulse>
  text = text.replace(/<(pulse|bounce|glow|shimmer)>(.*?)<\/\1>/gi, (_match, tag, inner) => {
    return `<span class="${tag.toLowerCase()}-anim" style="display: inline-block;">${inner}</span>`;
  });

  // Step 3: Convert animation shortcodes [pulse]text[/pulse] or [نبض]text[/نبض]
  text = text.replace(/\[(pulse|نبض)\]([\s\S]*?)\[\/\1\]/gi, '<span class="pulse-anim" style="display: inline-block;">$2</span>');
  text = text.replace(/\[(bounce|قفز|ارتداد)\]([\s\S]*?)\[\/\1\]/gi, '<span class="bounce-anim" style="display: inline-block;">$2</span>');
  text = text.replace(/\[(glow|توهج)\]([\s\S]*?)\[\/\1\]/gi, '<span class="glow-anim" style="display: inline-block;">$2</span>');
  text = text.replace(/\[(shimmer|لمعان|تموج)\]([\s\S]*?)\[\/\1\]/gi, '<span class="shimmer-anim" style="display: inline-block;">$2</span>');

  // Step 4: Color codes: [color=#hex]text[/color] or [لون=أحمر]text[/لون]
  text = text.replace(/\[(?:color|colour|لون)=([^\]]+)\]([\s\S]*?)\[\/(?:color|colour|لون)\]/gi, (_match, colVal, inner) => {
    const col = resolveColor(colVal);
    return `<span style="color: ${col}; font-weight: bold;">${inner}</span>`;
  });

  // Step 5: Highlight / Background codes: [highlight=#hex]text[/highlight] or [تظليل=أصفر]text[/تظليل]
  text = text.replace(/\[(?:highlight|bg|تظليل|خلفية)=([^\]]+)\]([\s\S]*?)\[\/(?:highlight|bg|تظليل|خلفية)\]/gi, (_match, bgVal, inner) => {
    const bg = resolveColor(bgVal);
    return `<span style="background-color: ${bg}; color: #0f172a; padding: 2px 6px; border-radius: 6px; font-weight: bold;">${inner}</span>`;
  });

  // Step 6: Font size codes: [size=lg]text[/size] or [حجم=كبير]text[/حجم]
  text = text.replace(/\[(?:size|حجم)=([^\]]+)\]([\s\S]*?)\[\/(?:size|حجم)\]/gi, (_match, sizeVal, inner) => {
    const cleanSize = sizeVal.trim().toLowerCase();
    const resolvedSize = FONT_SIZE_MAP[cleanSize] || cleanSize;
    return `<span style="font-size: ${resolvedSize}; line-height: 1.4;">${inner}</span>`;
  });

  // Step 7: Typography & Formatting:
  // Bold: [b]...[/b], [عريض]...[/عريض], [غامق]...[/غامق]
  text = text.replace(/\[(?:b|bold|عريض|غامق)\]([\s\S]*?)\[\/(?:b|bold|عريض|غامق)\]/gi, '<strong>$1</strong>');

  // Italic (إمالة): [i]...[/i], [italic]...[/italic], [مائل]...[/مائل], [إمالة]...[/إمالة]
  text = text.replace(/\[(?:i|italic|مائل|إمالة)\]([\s\S]*?)\[\/(?:i|italic|مائل|إمالة)\]/gi, '<em style="font-style: italic;">$1</em>');

  // Underline: [u]...[/u], [underline]...[/underline], [تسطير]...[/تسطير], [خط]...[/خط]
  text = text.replace(/\[(?:u|underline|تسطير|خط)\]([\s\S]*?)\[\/(?:u|underline|تسطير|خط)\]/gi, '<u style="text-decoration: underline; text-underline-offset: 3px;">$1</u>');

  // Strikethrough: [s]...[/s], [strike]...[/strike], [شطب]...[/شطب]
  text = text.replace(/\[(?:s|strike|شطب)\]([\s\S]*?)\[\/(?:s|strike|شطب)\]/gi, '<del style="text-decoration: line-through;">$1</del>');

  // Step 8: Safe Markdown support (when not inside existing HTML tags)
  // Bold: **word** or __word__
  text = text.replace(/(?<!\w)\*\*([^*]+)\*\*(?!\w)/g, '<strong>$1</strong>');
  // Italic (إمالة): *word*
  text = text.replace(/(?<!\w)\*([^*]+)\*(?!\w)/g, '<em style="font-style: italic;">$1</em>');
  // Strikethrough: ~~word~~
  text = text.replace(/~~([^~]+)~~/g, '<del style="text-decoration: line-through;">$1</del>');

  // Step 9: Preserve linebreaks if the text lacks block elements (<p>, <div>, <br>)
  const hasBlockTags = /<(?:p|div|br|ul|ol|li|blockquote|h[1-6])\b/i.test(text);
  if (!hasBlockTags && text.includes('\n')) {
    text = text.replace(/\n/g, '<br />');
  }

  // Step 10: Sanitize output
  return sanitizeHtml(text);
}

/**
 * Quick check if content has any formatting or HTML
 */
export function hasRichFormatting(content: string): boolean {
  if (!content) return false;
  return /<[a-z][\s\S]*>|\[(?:pulse|bounce|glow|shimmer|نبض|قفز|توهج|لمعان|color|colour|لون|highlight|bg|تظليل|size|حجم|b|bold|عريض|غامق|i|italic|مائل|إمالة|u|underline|تسطير|s|strike|شطب)[\s=\]]|\*\*|\*|~~/i.test(content);
}
