#!/usr/bin/env ts-node
/**
 * LLM vs 关键词分类器对比测试脚本
 * 
 * 用法:
 *   npm run compare
 * 或:
 *   npx ts-node src/scripts/compare-classifiers.ts
 */

import { LLMClient } from '../llm/client';
import { classifyWithKeywords } from '../i18n/keywords';
import { loadConfig } from '../config';
import { Category, Language } from '../types';

// 测试数据集: 50 条多语言客诉 (6 语言 × 6 分类 + 混合)
const testTickets: Array<{ text: string; language: Language; expectedCategory: Category }> = [
  // 简体中文 (zh-CN) - 6 分类
  { text: '充值了但没到账', language: 'zh-CN', expectedCategory: 'payment' },
  { text: '我要退款', language: 'zh-CN', expectedCategory: 'refund' },
  { text: '游戏闪退了', language: 'zh-CN', expectedCategory: 'bug' },
  { text: '账号被封了，我要申诉', language: 'zh-CN', expectedCategory: 'ban_appeal' },
  { text: '有人开挂作弊', language: 'zh-CN', expectedCategory: 'abuse' },
  { text: '请问怎么联系客服', language: 'zh-CN', expectedCategory: 'general' },
  { text: '支付宝付款失败', language: 'zh-CN', expectedCategory: 'payment' },
  { text: '购买的东西没收到', language: 'zh-CN', expectedCategory: 'payment' },
  
  // 繁体中文 (zh-TW) - 6 分类
  { text: '充值沒到帳', language: 'zh-TW', expectedCategory: 'payment' },
  { text: '請問如何退款', language: 'zh-TW', expectedCategory: 'refund' },
  { text: '遊戲閃退了', language: 'zh-TW', expectedCategory: 'bug' },
  { text: '帳號被封了要申訴', language: 'zh-TW', expectedCategory: 'ban_appeal' },
  { text: '舉報有人開掛作弊', language: 'zh-TW', expectedCategory: 'abuse' },
  { text: '有個問題想問客服', language: 'zh-TW', expectedCategory: 'general' },
  { text: '儲值失敗怎麼辦', language: 'zh-TW', expectedCategory: 'payment' },
  { text: '遊戲一直卡頓', language: 'zh-TW', expectedCategory: 'bug' },
  
  // 英文 (en) - 6 分类
  { text: 'payment failed', language: 'en', expectedCategory: 'payment' },
  { text: 'I want a refund', language: 'en', expectedCategory: 'refund' },
  { text: 'game keeps crashing', language: 'en', expectedCategory: 'bug' },
  { text: 'my account is banned', language: 'en', expectedCategory: 'ban_appeal' },
  { text: 'report a cheater', language: 'en', expectedCategory: 'abuse' },
  { text: 'I have a question', language: 'en', expectedCategory: 'general' },
  { text: 'I was charged but did not receive item', language: 'en', expectedCategory: 'payment' },
  { text: 'purchase not showing up', language: 'en', expectedCategory: 'payment' },
  
  // 日文 (ja) - 6 分类
  { text: '課金できない', language: 'ja', expectedCategory: 'payment' },
  { text: '返金をお願いします', language: 'ja', expectedCategory: 'refund' },
  { text: 'ゲームがクラッシュする', language: 'ja', expectedCategory: 'bug' },
  { text: 'アカウントが停止されました', language: 'ja', expectedCategory: 'ban_appeal' },
  { text: 'チーターを通報したい', language: 'ja', expectedCategory: 'abuse' },
  { text: '質問があります', language: 'ja', expectedCategory: 'general' },
  { text: '支払いが失敗しました', language: 'ja', expectedCategory: 'payment' },
  { text: 'ゲームがフリーズする', language: 'ja', expectedCategory: 'bug' },
  
  // 韩文 (ko) - 6 分类
  { text: '결제가 안돼요', language: 'ko', expectedCategory: 'payment' },
  { text: '환불하고 싶어요', language: 'ko', expectedCategory: 'refund' },
  { text: '게임이 충돌해요', language: 'ko', expectedCategory: 'bug' },
  { text: '계정이 정지되었습니다', language: 'ko', expectedCategory: 'ban_appeal' },
  { text: '핵 사용자 신고합니다', language: 'ko', expectedCategory: 'abuse' },
  { text: '질문이 있어요', language: 'ko', expectedCategory: 'general' },
  { text: '구매했는데 안 왔어요', language: 'ko', expectedCategory: 'payment' },
  { text: '게임이 멈춰요', language: 'ko', expectedCategory: 'bug' },
  
  // 西班牙文 (es) - 6 分类
  { text: 'mi pago no funciona', language: 'es', expectedCategory: 'payment' },
  { text: 'quiero un reembolso', language: 'es', expectedCategory: 'refund' },
  { text: 'el juego se bloquea', language: 'es', expectedCategory: 'bug' },
  { text: 'mi cuenta está suspendida', language: 'es', expectedCategory: 'ban_appeal' },
  { text: 'reportar a un tramposo', language: 'es', expectedCategory: 'abuse' },
  { text: 'tengo una pregunta', language: 'es', expectedCategory: 'general' },
  { text: 'no recibí mi compra', language: 'es', expectedCategory: 'payment' },
  { text: 'el juego falla constantemente', language: 'es', expectedCategory: 'bug' },
  
  // 额外边界测试用例 (2条)
  { text: '充值失败，请退款', language: 'zh-CN', expectedCategory: 'refund' },
  { text: 'my payment failed, I need refund', language: 'en', expectedCategory: 'refund' },
];

interface ComparisonResult {
  total: number;
  llm: {
    correct: number;
    accuracy: number;
    avgLatency: number;
  };
  keyword: {
    correct: number;
    accuracy: number;
    avgLatency: number;
  };
  byCategory: Record<Category, {
    llmCorrect: number;
    keywordCorrect: number;
    total: number;
  }>;
  byLanguage: Record<Language, {
    llmCorrect: number;
    keywordCorrect: number;
    total: number;
  }>;
}

// 初始化统计结构
export function initStats(): { byCategory: ComparisonResult['byCategory']; byLanguage: ComparisonResult['byLanguage'] } {
  const categories: Category[] = ['payment', 'refund', 'bug', 'ban_appeal', 'abuse', 'general'];
  const languages: Language[] = ['zh-CN', 'zh-TW', 'en', 'ja', 'ko', 'es'];
  
  const byCategory = {} as Record<Category, { llmCorrect: number; keywordCorrect: number; total: number }>;
  const byLanguage = {} as Record<Language, { llmCorrect: number; keywordCorrect: number; total: number }>;
  
  for (const cat of categories) {
    byCategory[cat] = { llmCorrect: 0, keywordCorrect: 0, total: 0 };
  }
  
  for (const lang of languages) {
    byLanguage[lang] = { llmCorrect: 0, keywordCorrect: 0, total: 0 };
  }
  
  return { byCategory, byLanguage };
}

// 关键词分类：返回最佳匹配的分类
export function classifyWithKeywordsBest(content: string, language: Language): Category {
  const categories: Category[] = ['payment', 'refund', 'bug', 'ban_appeal', 'abuse', 'general'];
  let bestCategory: Category = 'general';
  let bestConfidence = -1;
  
  for (const cat of categories) {
    const conf = classifyWithKeywords(content, cat, language);
    if (conf > bestConfidence) {
      bestConfidence = conf;
      bestCategory = cat;
    }
  }
  
  return bestCategory;
}

export async function runComparison(): Promise<ComparisonResult> {
  const config = loadConfig();
  
  if (!config.llmApiKey) {
    console.error('错误: 未配置 LLM_API_KEY，无法进行对比测试');
    process.exit(1);
  }
  
  const llmClient = new LLMClient({
    apiKey: config.llmApiKey,
    baseUrl: config.llmBaseUrl,
    model: config.llmModel,
    timeoutMs: config.llmTimeoutMs,
    retryCount: config.llmRetryCount,
    fallbackEnabled: false, // 对比测试时不降级
  });
  
  const { byCategory, byLanguage } = initStats();
  
  const result: ComparisonResult = {
    total: testTickets.length,
    llm: { correct: 0, accuracy: 0, avgLatency: 0 },
    keyword: { correct: 0, accuracy: 0, avgLatency: 0 },
    byCategory,
    byLanguage,
  };
  
  let llmTotalLatency = 0;
  let keywordTotalLatency = 0;
  let llmFailures = 0;
  
  console.log(`\n开始对比测试: ${testTickets.length} 条客诉\n`);
  
  for (let i = 0; i < testTickets.length; i++) {
    const ticket = testTickets[i];
    console.log(`[${i + 1}/${testTickets.length}] ${ticket.language}: ${ticket.text.substring(0, 40)}...`);
    
    // 初始化统计（如果还没有）
    if (!result.byCategory[ticket.expectedCategory]) {
      result.byCategory[ticket.expectedCategory] = { llmCorrect: 0, keywordCorrect: 0, total: 0 };
    }
    if (!result.byLanguage[ticket.language]) {
      result.byLanguage[ticket.language] = { llmCorrect: 0, keywordCorrect: 0, total: 0 };
    }
    
    result.byCategory[ticket.expectedCategory].total++;
    result.byLanguage[ticket.language].total++;
    
    // LLM 分类
    const llmStart = Date.now();
    let llmCorrect = false;
    try {
      const llmResult = await llmClient.classifyTicket(ticket.text, ticket.language);
      const llmLatency = Date.now() - llmStart;
      llmTotalLatency += llmLatency;
      
      llmCorrect = llmResult.category === ticket.expectedCategory;
      if (llmCorrect) {
        result.llm.correct++;
        result.byCategory[ticket.expectedCategory].llmCorrect++;
        result.byLanguage[ticket.language].llmCorrect++;
      }
      
      console.log(`  LLM: ${llmResult.category} ${llmCorrect ? '✓' : '✗'} (${llmLatency}ms)`);
    } catch (error: any) {
      llmFailures++;
      llmTotalLatency += Date.now() - llmStart;
      console.error(`  LLM 失败: ${error.message}`);
    }
    
    // 关键词分类
    const keywordStart = Date.now();
    const keywordCategory = classifyWithKeywordsBest(ticket.text, ticket.language);
    const keywordLatency = Date.now() - keywordStart;
    keywordTotalLatency += keywordLatency;
    
    const keywordCorrect = keywordCategory === ticket.expectedCategory;
    if (keywordCorrect) {
      result.keyword.correct++;
      result.byCategory[ticket.expectedCategory].keywordCorrect++;
      result.byLanguage[ticket.language].keywordCorrect++;
    }
    
    console.log(`  Key: ${keywordCategory} ${keywordCorrect ? '✓' : '✗'} (${keywordLatency}ms)`);
    
    // 延迟一小段时间避免 rate limit
    if (i < testTickets.length - 1) {
      await new Promise(r => setTimeout(r, 100));
    }
  }
  
  // 计算准确率
  const validTests = result.total - llmFailures;
  result.llm.accuracy = validTests > 0 ? result.llm.correct / validTests : 0;
  result.keyword.accuracy = result.keyword.correct / result.total;
  result.llm.avgLatency = llmTotalLatency / result.total;
  result.keyword.avgLatency = keywordTotalLatency / result.total;
  
  if (llmFailures > 0) {
    console.log(`\n⚠️  LLM 失败: ${llmFailures} 次`);
  }
  
  return result;
}

export function printReport(result: ComparisonResult): void {
  console.log('\n========================================');
  console.log('   LLM vs 关键词分类器对比报告');
  console.log('========================================\n');
  
  console.log(`测试总数: ${result.total} 条\n`);
  
  console.log('整体准确率:');
  console.log(`  LLM:     ${(result.llm.accuracy * 100).toFixed(1)}% (${result.llm.correct}/${result.total})`);
  console.log(`  关键词:  ${(result.keyword.accuracy * 100).toFixed(1)}% (${result.keyword.correct}/${result.total})`);
  const improvement = (result.llm.accuracy - result.keyword.accuracy) * 100;
  console.log(`  提升:    ${improvement > 0 ? '+' : ''}${improvement.toFixed(1)}%\n`);
  
  console.log('平均延迟:');
  console.log(`  LLM:     ${result.llm.avgLatency.toFixed(0)}ms`);
  console.log(`  关键词:  ${result.keyword.avgLatency.toFixed(0)}ms`);
  const speedRatio = result.llm.avgLatency / (result.keyword.avgLatency || 1);
  console.log(`  倍数:    ${speedRatio.toFixed(1)}x\n`);
  
  // 按类别统计
  console.log('按类别准确率:');
  console.log('  分类        | LLM    | 关键词 | 测试数');
  console.log('  ------------|--------|--------|-------');
  const categoryNames: Record<Category, string> = {
    payment: '支付问题',
    refund: '退款诉求',
    bug: '技术问题',
    ban_appeal: '封号申诉',
    abuse: '举报作弊',
    general: '一般咨询',
  };
  const categories: Category[] = ['payment', 'refund', 'bug', 'ban_appeal', 'abuse', 'general'];
  for (const cat of categories) {
    const stat = result.byCategory[cat];
    if (stat && stat.total > 0) {
      const llmAcc = ((stat.llmCorrect / stat.total) * 100).toFixed(0);
      const keyAcc = ((stat.keywordCorrect / stat.total) * 100).toFixed(0);
      console.log(`  ${categoryNames[cat].padEnd(10)} | ${llmAcc.padStart(5)}% | ${keyAcc.padStart(5)}% | ${stat.total.toString().padStart(3)}`);
    }
  }
  
  // 按语言统计
  console.log('\n按语言准确率:');
  console.log('  语言    | LLM    | 关键词 | 测试数');
  console.log('  --------|--------|--------|-------');
  const languageNames: Record<string, string> = {
    'zh-CN': '简体中文',
    'zh-TW': '繁体中文',
    'en': '英文',
    'ja': '日文',
    'ko': '韩文',
    'es': '西班牙文',
  };
  const languages: Language[] = ['zh-CN', 'zh-TW', 'en', 'ja', 'ko', 'es'];
  for (const lang of languages) {
    const stat = result.byLanguage[lang];
    if (stat && stat.total > 0) {
      const llmAcc = ((stat.llmCorrect / stat.total) * 100).toFixed(0);
      const keyAcc = ((stat.keywordCorrect / stat.total) * 100).toFixed(0);
      console.log(`  ${languageNames[lang].padEnd(6)} | ${llmAcc.padStart(5)}% | ${keyAcc.padStart(5)}% | ${stat.total.toString().padStart(3)}`);
    }
  }
  
  console.log('\n========================================');
  console.log(result.llm.accuracy > result.keyword.accuracy 
    ? '✅ LLM 分类器准确率更高' 
    : '⚠️  关键词分类器准确率更高');
  console.log('========================================\n');
}

export async function main() {
  console.log('🚀 分类器对比测试开始...\n');
  
  const result = await runComparison();
  printReport(result);
  
  // 验证目标
  if (result.llm.accuracy < 0.90) {
    console.error('❌ 未达目标: LLM 准确率 < 90%');
    process.exit(1);
  }
  
  if (result.llm.accuracy <= result.keyword.accuracy) {
    console.error('❌ 未达目标: LLM 准确率未超过关键词');
    process.exit(1);
  }
  
  console.log('✅ 所有目标达成！');
  process.exit(0);
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(error => {
    console.error('错误:', error);
    process.exit(1);
  });
}
