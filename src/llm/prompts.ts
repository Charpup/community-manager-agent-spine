import { Language, Category, CruiseStats } from '../types';

/**
 * 构建分类 Prompt
 */
export function buildClassifyPrompt(content: string, language: Language): string {
  // 根据语言选择示例
  const examples = getExamplesByLanguage(language);
  
  return `你是一个游戏客服分类助手。请分析以下客诉内容，选择最合适的分类。

## 客诉内容
"""${escapePromptContent(content)}"""

## 检测语言
${getLanguageDisplayName(language)}

## 可选分类
1. **payment** - 充值/支付问题
   示例: ${examples.payment}
   
2. **refund** - 退款诉求
   示例: ${examples.refund}
   
3. **bug** - 游戏技术问题
   示例: ${examples.bug}
   
4. **ban_appeal** - 封号/解封申诉
   示例: ${examples.ban_appeal}
   
5. **abuse** - 举报/作弊
   示例: ${examples.abuse}
   
6. **general** - 其他一般咨询
   示例: ${examples.general}

## 输出要求
请输出 JSON 格式:
{
  "category": "分类名称(必须是上述6个之一)",
  "confidence": 0.0-1.0,
  "reasoning": "分类理由(1-2句话)",
  "severity": "low|medium|high|critical"
}

规则:
- confidence: 0.9+ 表示非常确定, 0.7-0.9 表示较确定, <0.7 表示不太确定
- severity: refund/ban_appeal 通常为 high, payment/bug 根据紧急程度, abuse 为 medium, general 为 low
- 仅用上述6个分类之一，不要创造新分类`;
}

/**
 * 获取各语言的示例
 */
function getExamplesByLanguage(language: Language): Record<Category, string> {
  const examples: Record<Language, Record<Category, string>> = {
    'zh-CN': {
      payment: '充值了但没到账 / 支付失败',
      refund: '我要退款 / 申请退钱',
      bug: '游戏闪退 / 卡顿严重',
      ban_appeal: '账号被封了 / 误封申诉',
      abuse: '有人开挂 / 举报作弊',
      general: '咨询问题 / 需要帮助'
    },
    'zh-TW': {
      payment: '充值沒到帳 / 付款失敗',
      refund: '我要退款 / 退費申請',
      bug: '遊戲閃退 / 卡頓嚴重',
      ban_appeal: '帳號被封 / 解封申訴',
      abuse: '有人開掛 / 舉報作弊',
      general: '諮詢問題 / 需要幫助'
    },
    'en': {
      payment: 'payment failed / charged but not received',
      refund: 'I want a refund / money back',
      bug: 'game crashes / keeps freezing',
      ban_appeal: 'account banned / suspended unfairly',
      abuse: 'report cheater / hacking',
      general: 'question about / need help with'
    },
    'ja': {
      payment: '課金できない / 支払い失敗',
      refund: '返金をお願いします / 払い戻し',
      bug: 'ゲームがクラッシュ / フリーズする',
      ban_appeal: 'アカウント停止 / BAN解除',
      abuse: 'チーター通報 / 不正行為',
      general: '質問があります / ヘルプ'
    },
    'ko': {
      payment: '결제 실패 / 충전 안됨',
      refund: '환불 요청 / 환불해주세요',
      bug: '게임 충돌 / 렉 걸림',
      ban_appeal: '계정 정지 / 정지 해제',
      abuse: '핵 사용자 신고 / 부정행위',
      general: '질문 있습니다 / 도움 필요'
    },
    'es': {
      payment: 'pago falló / no recibí la compra',
      refund: 'quiero reembolso / devolución',
      bug: 'juego se bloquea / congela',
      ban_appeal: 'cuenta suspendida / desbloquear',
      abuse: 'reportar trampa / hacer trampa',
      general: 'pregunta sobre / necesito ayuda'
    },
    'unknown': {
      payment: 'payment issue',
      refund: 'refund request',
      bug: 'game bug',
      ban_appeal: 'ban appeal',
      abuse: 'report abuse',
      general: 'general inquiry'
    }
  };
  
  return examples[language] || examples['en'];
}

/**
 * 构建趋势分析 Prompt
 */
export function buildTrendAnalysisPrompt(
  stats: CruiseStats,
  timeRange: string
): string {
  const categories = Object.entries(stats.categories)
    .map(([cat, count]) => `- ${cat}: ${count} (${((count/stats.total)*100).toFixed(1)}%)`)
    .join('\n');
  
  const languages = Object.entries(stats.languages)
    .map(([lang, count]) => `- ${lang}: ${count}`)
    .join('\n');

  return `你是一名客服数据分析专家。请根据以下巡航统计数据生成趋势分析报告。

## 统计周期
${timeRange}

## 总体数据
- 新增客诉总数: ${stats.total} 条
- 高优先级客诉: ${stats.highPriority} 条

## 分类分布
${categories}

## 语言分布
${languages}

## 输出要求
请用中文生成分析报告，包含以下部分:

### 1. 总体趋势判断
- 客诉量是增长、平稳还是下降？
- 与正常水平相比如何？

### 2. 主要问题类别分析
- 哪些类别占比最高？
- 有什么异常突出的问题？

### 3. 需要关注的高风险项
- 高优先级客诉情况
- 需要立即处理的问题

### 4. 建议采取的措施
- 针对主要问题的建议
- 预防性措施

请用简洁专业的语言，200-400字左右。`;
}

/**
 * 转义 Prompt 内容中的特殊字符
 */
function escapePromptContent(content: string): string {
  // 防止 prompt 注入
  return content
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .substring(0, 2000); // 限制长度
}

/**
 * 获取语言显示名称
 */
function getLanguageDisplayName(language: Language): string {
  const names: Record<Language, string> = {
    'zh-CN': '简体中文',
    'zh-TW': '繁体中文',
    'en': 'English',
    'ja': '日本語',
    'ko': '한국어',
    'es': 'Español',
    'unknown': 'Unknown'
  };
  return names[language] || language;
}
