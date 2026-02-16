import { Category, Language } from '../types';

// 6语言 × 6分类 关键词映射表 (包含 unknown 作为未知语言占位)
export const categoryKeywords: Record<Category, Record<Language, string[]>> = {
  payment: {
    'zh-CN': ['充值', '支付', '付款', '扣费', '到账', '充值失败', '没到账'],
    'zh-TW': ['充值', '支付', '付款', '扣費', '到帳', '儲值'],
    'en': ['payment', 'pay', 'paid', 'purchase', 'purchased', 'charged', 'billing', 'not received'],
    'ja': ['課金', '支払い', '購入', '請求', 'チャージ'],
    'ko': ['결제', '충전', '구매', '청구'],
    'es': ['pago', 'compra', 'cobro', 'facturación'],
    'unknown': ['payment', 'pay', 'purchase', '充值', '退款'] // 未知语言时使用通用关键词
  },
  refund: {
    'zh-CN': ['退款', '退钱', '返还', '退课金'],
    'zh-TW': ['退款', '退錢', '返還', '退費'],
    'en': ['refund', 'money back', 'return', 'chargeback'],
    'ja': ['返金', '払い戻し', 'キャンセル'],
    'ko': ['환불', '반품', '취소'],
    'es': ['reembolso', 'devolución', 'cancelar'],
    'unknown': ['refund', 'return', '退款', '退钱']
  },
  bug: {
    'zh-CN': ['闪退', '卡顿', '崩溃', 'bug', '打不开', '黑屏', '白屏', '报错', '无法打开'],
    'zh-TW': ['閃退', '卡頓', '崩潰', '打不開', '黑畫面'],
    'en': ['crash', 'bug', 'freeze', 'lag', 'black screen'],
    'ja': ['クラッシュ', 'バグ', 'フリーズ', '重い', '落ちる'],
    'ko': ['충돌', '버그', '멈춤', '렉', '검은 화면'],
    'es': ['error', 'fallo', 'congelado', 'pantalla negra', 'falla'],
    'unknown': ['crash', 'bug', 'error', '闪退', '崩溃']
  },
  ban_appeal: {
    'zh-CN': ['封号', '封禁', '解封', '申诉', '误封', '被封'],
    'zh-TW': ['封號', '封禁', '解封', '申訴', '誤封', '被封'],
    'en': ['banned', 'suspended', 'ban appeal', 'account blocked', 'ban'],
    'ja': ['BAN', 'アカウント停止', '異議申し立て', '解除', '停止'],
    'ko': ['밴', '정지', '해제', '이의제기', '계정'],
    'es': ['suspendido', 'bloqueado', 'apelación', 'cuenta', 'baneado'],
    'unknown': ['banned', 'ban', '封号', '封禁', '解封']
  },
  abuse: {
    'zh-CN': ['举报', '辱骂', '外挂', '作弊', '开挂', '举报'],
    'zh-TW': ['舉報', '辱罵', '外掛', '作弊', '開掛', '舉報'],
    'en': ['report', 'cheating', 'hack', 'abuse', 'toxic', 'cheater'],
    'ja': ['通報', 'チート', '暴言', 'ハック'],
    'ko': ['신고', '욕설', '핵', '치트'],
    'es': ['reportar', 'trampa', 'hack', 'abuso', 'tramposo'],
    'unknown': ['report', 'hack', 'cheat', '举报', '外挂']
  },
  general: {
    'zh-CN': ['问题', '咨询', '帮助', '客服'],
    'zh-TW': ['問題', '諮詢', '幫助', '客服'],
    'en': ['question', 'help', 'support', 'issue'],
    'ja': ['質問', 'ヘルプ', 'サポート', '問題'],
    'ko': ['질문', '도움', '지원', '문제'],
    'es': ['pregunta', 'ayuda', 'soporte', 'problema'],
    'unknown': ['question', 'help', 'support', '问题', '咨询']
  }
};

// 有效的分类列表
const validCategories: Category[] = ['payment', 'refund', 'bug', 'ban_appeal', 'abuse', 'general'];
const validLanguages: Language[] = ['zh-CN', 'zh-TW', 'en', 'ja', 'ko', 'es', 'unknown'];

/**
 * 获取指定分类和语言的关键词列表
 * @param category - 问题分类
 * @param language - 语言代码
 * @returns 关键词数组
 * @throws 如果分类或语言无效
 */
export function getKeywordsForCategory(
  category: Category, 
  language: Language
): string[] {
  if (!validCategories.includes(category)) {
    throw new Error(`Invalid category: ${category}. Valid categories are: ${validCategories.join(', ')}`);
  }
  
  if (!validLanguages.includes(language)) {
    throw new Error(`Invalid language: ${language}. Valid languages are: ${validLanguages.join(', ')}`);
  }
  
  return categoryKeywords[category][language];
}

/**
 * 使用关键词匹配内容，返回匹配置信度 0-1
 * @param content - 要匹配的文本内容
 * @param category - 问题分类
 * @param language - 语言代码
 * @returns 置信度 0-1
 * @throws 如果分类或语言无效
 */
export function classifyWithKeywords(
  content: string, 
  category: Category, 
  language: Language
): number {
  if (!validCategories.includes(category)) {
    throw new Error(`Invalid category: ${category}. Valid categories are: ${validCategories.join(', ')}`);
  }
  
  if (!validLanguages.includes(language)) {
    throw new Error(`Invalid language: ${language}. Valid languages are: ${validLanguages.join(', ')}`);
  }
  
  const keywords = categoryKeywords[category][language];
  const contentLower = content.toLowerCase();
  
  let matchCount = 0;
  for (const keyword of keywords) {
    if (contentLower.includes(keyword.toLowerCase())) {
      matchCount++;
    }
  }
  
  return matchCount / keywords.length;
}
