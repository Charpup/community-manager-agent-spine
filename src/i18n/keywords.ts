import { Category, Language } from '../types';

export const categoryKeywords: Record<Category, Record<Language, string[]>> = {
  payment: {
    'zh-CN': ['充值', '支付', '付款', '扣费', '到账', '充值失败', '没到账'],
    'zh-TW': ['充值', '支付', '付款', '扣費', '到帳', '儲值', '沒到帳'],
    'en': ['payment', 'pay', 'paid', 'purchase', 'charged', 'billing', 'not received', 'failed'],
    'ja': ['課金', '支払い', '購入', '請求', 'チャージ', '反映されない'],
    'ko': ['결제', '충전', '구매', '청구'],
    'es': ['pago', 'compra', 'cobro', 'facturación'],
    'unknown': ['payment']
  },
  refund: {
    'zh-CN': ['退款', '退钱', '返还', '退课金', '能退吗'],
    'zh-TW': ['退款', '退錢', '返還', '退費'],
    'en': ['refund', 'money back', 'return', 'chargeback'],
    'ja': ['返金', '払い戻し', 'キャンセル', 'リターン'],
    'ko': ['환불', '반품', '취소'],
    'es': ['reembolso', 'devolución', 'cancelar'],
    'unknown': ['refund']
  },
  bug: {
    'zh-CN': ['闪退', '卡顿', '崩溃', 'bug', '打不开', '黑屏', '白屏', '掉帧'],
    'zh-TW': ['閃退', '卡頓', '崩潰', '打不開', '黑畫面'],
    'en': ['crash', 'bug', 'freeze', 'lag', 'black screen', 'not loading'],
    'ja': ['クラッシュ', 'バグ', 'フリーズ', '重い', '落ちる', '黒画面'],
    'ko': ['충돌', '버그', '멈춤', '렉', '검은 화면'],
    'es': ['error', 'fallo', 'congelado', 'pantalla negra', 'no carga'],
    'unknown': ['bug']
  },
  ban_appeal: {
    'zh-CN': ['封号', '封禁', '解封', '申诉', '误封', '账号被封'],
    'zh-TW': ['封號', '封禁', '解封', '申訴', '誤封'],
    'en': ['banned', 'suspended', 'ban appeal', 'account blocked', 'unban'],
    'ja': ['BAN', 'アカウント停止', '異議申し立て', '解除', '誤BAN'],
    'ko': ['밴', '정지', '해제', '이의제기', '오밴'],
    'es': ['prohibido', 'suspendido', 'apelación', 'bloqueado'],
    'unknown': ['ban']
  },
  abuse: {
    'zh-CN': ['举报', '辱骂', '外挂', '作弊', '开挂', '骗子'],
    'zh-TW': ['舉報', '辱駡', '外掛', '作弊', '開掛'],
    'en': ['report', 'cheating', 'hack', 'abuse', 'toxic', 'scam'],
    'ja': ['通報', 'チート', '暴言', 'ハック', '詐欺'],
    'ko': ['신고', '욕설', '핵', '치트', '사기'],
    'es': ['reportar', 'trampa', 'hack', 'abuso', 'estafa'],
    'unknown': ['report']
  },
  general: {
    'zh-CN': ['问题', '咨询', '帮助', '客服'],
    'zh-TW': ['問題', '諮詢', '幫助', '客服'],
    'en': ['question', 'help', 'support', 'issue'],
    'ja': ['質問', 'ヘルプ', 'サポート', '問題'],
    'ko': ['질문', '도움', '지원', '문제'],
    'es': ['pregunta', 'ayuda', 'soporte', 'problema'],
    'unknown': ['help']
  }
};

export function getKeywordsForCategory(category: Category, language: Language): string[] {
  if (!categoryKeywords[category]) {
    throw new Error(`Invalid category: ${category}`);
  }
  if (!categoryKeywords[category][language]) {
    throw new Error(`Invalid language: ${language} for category ${category}`);
  }
  return categoryKeywords[category][language];
}

export function classifyWithKeywords(content: string, category: Category, language: Language): number {
  const keywords = getKeywordsForCategory(category, language);
  const contentLower = content.toLowerCase();
  
  let matchCount = 0;
  for (const keyword of keywords) {
    if (contentLower.includes(keyword.toLowerCase())) {
      matchCount++;
    }
  }
  
  return matchCount / keywords.length;
}
