import { Language } from '../types';

export function detectLanguage(content: string): Language {
  if (!content || content.trim().length === 0) {
    return 'unknown';
  }
  
  // 日文假名检测 (优先)
  if (hasJapaneseKana(content)) {
    return 'ja';
  }
  
  // 韩文检测
  if (hasKorean(content)) {
    return 'ko';
  }
  
  // 西班牙文特殊字符
  if (hasSpanishSpecificChars(content)) {
    return 'es';
  }
  
  // 繁体中文检测
  if (hasTraditionalChinese(content)) {
    return 'zh-TW';
  }
  
  // 简体中文检测
  if (hasSimplifiedChinese(content)) {
    return 'zh-CN';
  }
  
  // 纯英文检测
  if (isEnglishOnly(content)) {
    return 'en';
  }
  
  return 'unknown';
}

function hasSimplifiedChinese(text: string): boolean {
  const simplifiedChars = ['的', '了', '在', '是', '有', '个', '不', '为'];
  return simplifiedChars.some(char => text.includes(char));
}

function hasTraditionalChinese(text: string): boolean {
  const traditionalChars = ['這', '們', '個', '來', '說', '詢', '幫', '幫'];
  return traditionalChars.some(char => text.includes(char));
}

function hasJapaneseKana(text: string): boolean {
  const hiragana = /[\u3040-\u309F]/;
  const katakana = /[\u30A0-\u30FF]/;
  return hiragana.test(text) || katakana.test(text);
}

function hasKorean(text: string): boolean {
  const hangul = /[\uAC00-\uD7AF]/;
  return hangul.test(text);
}

function hasSpanishSpecificChars(text: string): boolean {
  const spanishChars = ['ñ', 'á', 'é', 'í', 'ó', 'ú', 'ü', '¿', '¡'];
  return spanishChars.some(char => text.toLowerCase().includes(char));
}

function isEnglishOnly(text: string): boolean {
  const englishPattern = /^[\x00-\x7F\s]+$/;
  return englishPattern.test(text) && text.length > 0;
}

// 导出辅助函数供测试
export { hasSimplifiedChinese, hasTraditionalChinese, hasJapaneseKana, hasKorean };
