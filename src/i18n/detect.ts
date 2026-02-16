import { Language } from '../types';

// 有效的语言列表（不包括 unknown）
const validLanguages: Language[] = ['zh-CN', 'zh-TW', 'en', 'ja', 'ko', 'es'];

// 简体特征字（这些字在繁体中通常有不同写法）
const simplifiedChars = new Set(['的', '了', '在', '是', '有', '个', '为', '之', '与']);

// 繁体特征字（这些字在简体中有不同写法）
const traditionalChars = new Set([
  // 常用繁体特征字
  '這', '們', '個', '來', '說', '時', '過', '對', '機', '經', '開', '長', '場', '愛', '現', '動', '國', '從', '當', '點', '問', '裡', '後', 
  // 更多繁体特征字
  '麼', '東', '車', '馬', '魚', '鳥', '長', '門', '語', '話', '見', '貝', '車', '電', '頭', '體', '會', '來', '個', '這', '為', '問', '們', '時',
  // 测试中需要的字
  '沒', '帳', '遊', '戲', '題', '請', '員', '問', '號', '舉',
  // 台湾常用字
  '麼', '裡', '後', '裏', '麼', '麼'
]);

// 日文假名 Unicode 范围
const HIRAGANA_START = 0x3040;
const HIRAGANA_END = 0x309F;
const KATAKANA_START = 0x30A0;
const KATAKANA_END = 0x30FF;
const KATAKANA_PHONETIC_START = 0x31F0;
const KATAKANA_PHONETIC_END = 0x31FF;

// 韩文谚文 Unicode 范围
const HANGUL_START = 0xAC00;
const HANGUL_END = 0xD7AF;
const HANGUL_JAMO_START = 0x1100;
const HANGUL_JAMO_END = 0x11FF;
const HANGUL_COMPAT_JAMO_START = 0x3130;
const HANGUL_COMPAT_JAMO_END = 0x318F;

// 西班牙文常见词（无重音符号也能识别）
const commonSpanishWords = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
  'mi', 'tu', 'su', 'mis', 'tus', 'sus',
  'y', 'o', 'pero', 'porque', 'para', 'por', 'con', 'sin',
  'en', 'de', 'a', 'que', 'como', 'cuando', 'donde',
  'no', 'si', 'sí', 'esta', 'este', 'esto', 'está',
  'quiero', 'necesito', 'tengo', 'hay', 'son', 'es',
  'pago', 'cuenta', 'juego', 'ayuda', 'problema', 'cuestión', 'funciona',
  'reembolso', 'devolución', 'congela', 'suspendida', 'reportar', 'trampa'
]);

/**
 * 检查是否为西班牙文
 * 通过常见词和特征字符判断
 * @param text - 要检查的文本
 * @returns 是否为西班牙文
 */
function hasSpanishWords(text: string): boolean {
  const words = text.toLowerCase().split(/\s+/);
  const spanishWordCount = words.filter(word => commonSpanishWords.has(word)).length;
  // 如果超过30%的词是西班牙文常见词，则认为是西班牙文
  return spanishWordCount >= 1 && spanishWordCount / words.length >= 0.3;
}

/**
 * 检测文本语言
 * 使用启发式规则进行语言检测
 * 准确率目标: P0语言 > 90%
 *
 * 优先级：
 * 1. 韩文（Hangul）- 特征最明显
 * 2. 日文假名（Hiragana/Katakana）- 特征明显
 * 3. 简体中文 vs 繁体中文 - 通过特征字区分
 * 4. 英文 - ASCII 字符
 * 5. 西班牙文 - 拉丁字符 + 特殊字符
 *
 * @param content - 要检测的文本
 * @returns 语言代码
 */
export function detectLanguage(content: string): Language {
  if (!content || content.trim().length === 0) {
    return 'unknown';
  }

  // 优先级 1: 检查韩文（特征最明显）
  if (hasKorean(content)) {
    return 'ko';
  }

  // 优先级 2: 检查日文假名
  if (hasJapaneseKana(content)) {
    return 'ja';
  }

  // 检查是否包含中文字符
  const hasChineseChars = /[\u4e00-\u9fff]/.test(content);

  if (hasChineseChars) {
    // 优先级 3: 区分简体中文和繁体中文
    const hasSimplified = hasSimplifiedChinese(content);
    const hasTraditional = hasTraditionalChinese(content);

    if (hasTraditional && !hasSimplified) {
      return 'zh-TW';
    } else if (hasSimplified && !hasTraditional) {
      return 'zh-CN';
    } else if (hasSimplified && hasTraditional) {
      // 混合情况，优先判断繁体特征更明显
      // 计算特征字数量
      let tradCount = 0;
      let simpCount = 0;
      for (const char of content) {
        if (traditionalChars.has(char)) tradCount++;
        if (simplifiedChars.has(char)) simpCount++;
      }
      return tradCount > simpCount ? 'zh-TW' : 'zh-CN';
    } else {
      // 有中文但无特征字，默认简体中文（使用人数更多）
      return 'zh-CN';
    }
  }

  // 优先级 4 & 5: 检查拉丁字符（英文或西班牙文）
  const hasLatinChars = /[a-zA-Z]/.test(content);

  if (hasLatinChars) {
    // 检查西班牙文特有的字符
    const spanishPattern = /[áéíóúüñ¿¡]/i;
    if (spanishPattern.test(content)) {
      return 'es';
    }

    // 检查西班牙文常见词（即使没有重音符号）
    if (hasSpanishWords(content)) {
      return 'es';
    }

    // 默认英文（最常见）
    return 'en';
  }

  // 无法确定语言
  return 'unknown';
}

/**
 * 检查是否包含简体中文特征
 * @param text - 要检查的文本
 * @returns 是否包含简体特征字
 */
export function hasSimplifiedChinese(text: string): boolean {
  for (const char of text) {
    if (simplifiedChars.has(char)) {
      return true;
    }
  }
  return false;
}

/**
 * 检查是否包含繁体中文特征
 * @param text - 要检查的文本
 * @returns 是否包含繁体特征字
 */
export function hasTraditionalChinese(text: string): boolean {
  for (const char of text) {
    if (traditionalChars.has(char)) {
      return true;
    }
  }
  return false;
}

/**
 * 检查是否包含日文假名（平假名或片假名）
 * @param text - 要检查的文本
 * @returns 是否包含假名
 */
export function hasJapaneseKana(text: string): boolean {
  for (const char of text) {
    const code = char.codePointAt(0) || 0;
    if (
      (code >= HIRAGANA_START && code <= HIRAGANA_END) ||
      (code >= KATAKANA_START && code <= KATAKANA_END) ||
      (code >= KATAKANA_PHONETIC_START && code <= KATAKANA_PHONETIC_END)
    ) {
      return true;
    }
  }
  return false;
}

/**
 * 检查是否包含韩文谚文
 * @param text - 要检查的文本
 * @returns 是否包含韩文
 */
export function hasKorean(text: string): boolean {
  for (const char of text) {
    const code = char.codePointAt(0) || 0;
    if (
      (code >= HANGUL_START && code <= HANGUL_END) ||
      (code >= HANGUL_JAMO_START && code <= HANGUL_JAMO_END) ||
      (code >= HANGUL_COMPAT_JAMO_START && code <= HANGUL_COMPAT_JAMO_END)
    ) {
      return true;
    }
  }
  return false;
}
