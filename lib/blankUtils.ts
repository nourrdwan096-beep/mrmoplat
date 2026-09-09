// Universal Blank Detection & Tokenization Utility for English Exams & Word Banks
// Supports dots (.....), underscores (_____), brackets ([...], (...)), explicit numbers ([1], (2)), and dashes

export interface BlankToken {
  type: 'text' | 'blank';
  content: string;
  blankIndex?: number;
  rawPattern?: string;
}

export interface DetectedBlank {
  blankIndex: number;
  label: string; // e.g. "Blank #1" or "فراغ [1]"
}

// Regex to capture any type of blank pattern written by teacher:
// 1. Explicit numbered: [1], (1), {1}, __1__
// 2. Parenthesized / bracketed dots, underscores, dashes, ellipsis: (....), [....], (____), [____], (---), (...)
// 3. Raw consecutive dots: 3 or more dots e.g. ...., ....., ...........
// 4. Raw consecutive underscores: 2 or more underscores e.g. __, ___, ____________
// 5. Raw dashes: 3 or more dashes e.g. ---, --------
// 6. Ellipsis characters: …+
export const UNIVERSAL_BLANK_REGEX = /\[\s*(\d+)\s*\]|\(\s*(\d+)\s*\)|\{\s*(\d+)\s*\}|_{2,}(\d+)_{2,}|\(\s*(?:\.{2,}|_{2,}|-{2,}|…+|\s{3,})\s*\)|\[\s*(?:\.{2,}|_{2,}|-{2,}|…+|\s{3,})\s*\]|\.{3,}|_{2,}|-{3,}|…+/g;

/**
 * Parses passage text into tokens of regular text and auto-numbered blanks (1, 2, 3, ...)
 */
export function parsePassageToTokens(rawText: string): { tokens: BlankToken[]; detectedBlanks: DetectedBlank[] } {
  if (!rawText) {
    return { tokens: [], detectedBlanks: [] };
  }

  const tokens: BlankToken[] = [];
  const detectedBlanks: DetectedBlank[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let autoIncrementBlank = 1;

  // Reset regex state
  const regex = new RegExp(UNIVERSAL_BLANK_REGEX.source, 'g');

  while ((match = regex.exec(rawText)) !== null) {
    // 1. Push preceding text segment if any
    if (match.index > lastIndex) {
      tokens.push({
        type: 'text',
        content: rawText.substring(lastIndex, match.index)
      });
    }

    // 2. Determine blank index
    // If teacher explicitly typed a number e.g. [1], [2], we can use that number or sequence
    const explicitNumStr = match[1] || match[2] || match[3] || match[4];
    let blankIndex = autoIncrementBlank;
    
    if (explicitNumStr) {
      const parsedNum = parseInt(explicitNumStr, 10);
      if (!isNaN(parsedNum) && parsedNum > 0) {
        blankIndex = parsedNum;
      }
    }

    // Ensure we track this blank
    if (!detectedBlanks.some(b => b.blankIndex === blankIndex)) {
      detectedBlanks.push({
        blankIndex,
        label: `Blank #${blankIndex}`
      });
    }

    tokens.push({
      type: 'blank',
      content: match[0],
      blankIndex,
      rawPattern: match[0]
    });

    autoIncrementBlank++;
    lastIndex = match.index + match[0].length;
  }

  // Push trailing text segment
  if (lastIndex < rawText.length) {
    tokens.push({
      type: 'text',
      content: rawText.substring(lastIndex)
    });
  }

  // Sort detected blanks in numerical order
  detectedBlanks.sort((a, b) => a.blankIndex - b.blankIndex);

  return { tokens, detectedBlanks };
}

/**
 * Extracts list of unique sorted blank indices from text
 */
export function extractBlankIndices(text: string): number[] {
  const { detectedBlanks } = parsePassageToTokens(text);
  return detectedBlanks.map(b => b.blankIndex);
}
