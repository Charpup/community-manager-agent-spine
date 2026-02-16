import OpenAI from 'openai';
import { withRetry } from './retry';
import { LLMConfig, LLMClassificationResult } from './types';
import { Language, Category, CruiseStats } from '../types';

export class LLMClient {
  private openai: OpenAI;
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
    this.openai = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
      timeout: config.timeoutMs,
    });
  }

  /**
   * 使用 LLM 对客诉进行分类
   */
  async classifyTicket(
    content: string,
    language: Language
  ): Promise<LLMClassificationResult> {
    return withRetry(async () => {
      const response = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: [
          { role: 'system', content: this.getSystemPrompt() },
          { role: 'user', content: this.buildClassifyPrompt(content, language) }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3, // 低温度确保一致性
        max_tokens: 500,
      });

      const content_response = response.choices[0].message.content;
      if (!content_response) {
        throw new LLMClassificationError('Empty response from LLM');
      }

      // 解析 JSON 响应
      const result = JSON.parse(content_response);
      
      // 验证返回格式
      this.validateClassificationResult(result);
      
      return {
        ...result,
        source: 'llm',
      };
    }, this.config.retryCount);
  }

  /**
   * 生成趋势分析
   */
  async analyzeTrends(stats: CruiseStats): Promise<string> {
    return withRetry(async () => {
      const response = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: [
          { role: 'system', content: '你是客服数据分析专家' },
          { role: 'user', content: this.buildTrendPrompt(stats) }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        return '暂无趋势分析数据';
      }

      return content;
    }, this.config.retryCount);
  }

  private getSystemPrompt(): string {
    return `你是游戏客服分类助手。请分析客诉内容并选择最合适的分类。

可选分类:
- payment: 充值/支付问题
- refund: 退款诉求  
- bug: 游戏技术问题
- ban_appeal: 封号/解封申诉
- abuse: 举报/作弊
- general: 其他一般咨询

输出 JSON 格式: { "category": "...", "confidence": 0.95, "reasoning": "...", "severity": "..." }`;
  }

  private buildClassifyPrompt(content: string, language: Language): string {
    return `客诉内容: "${content}"
检测语言: ${language}

请输出 JSON 格式的分类结果。`;
  }

  private buildTrendPrompt(stats: CruiseStats): string {
    return `请分析以下客服数据统计，提供趋势分析和建议：

总客诉数: ${stats.total}
各分类统计:
- payment (支付问题): ${stats.categories.payment || 0}
- refund (退款诉求): ${stats.categories.refund || 0}
- bug (技术问题): ${stats.categories.bug || 0}
- ban_appeal (封号申诉): ${stats.categories.ban_appeal || 0}
- abuse (举报作弊): ${stats.categories.abuse || 0}
- general (一般咨询): ${stats.categories.general || 0}

语言分布:
${Object.entries(stats.languages).map(([lang, count]) => `- ${lang}: ${count}`).join('\n')}

高优先级客诉: ${stats.highPriority}

请提供：
1. 主要问题类型分布分析
2. 需要关注的异常趋势
3. 改进建议`;
  }

  private validateClassificationResult(result: any): void {
    // 验证必要字段存在
    if (!result || typeof result !== 'object') {
      throw new LLMClassificationError('Invalid result format: expected object');
    }

    const requiredFields = ['category', 'confidence', 'reasoning', 'severity'];
    for (const field of requiredFields) {
      if (!(field in result)) {
        throw new LLMClassificationError(`Missing required field: ${field}`);
      }
    }

    // 验证 category 在允许列表中
    const validCategories: Category[] = ['payment', 'refund', 'bug', 'ban_appeal', 'abuse', 'general'];
    if (!validCategories.includes(result.category)) {
      throw new LLMClassificationError(`Invalid category: ${result.category}`);
    }

    // 验证 confidence 在 0-1 之间
    if (typeof result.confidence !== 'number' || result.confidence < 0 || result.confidence > 1) {
      throw new LLMClassificationError(`Invalid confidence: ${result.confidence}, expected 0-1`);
    }

    // 验证 severity 在允许列表中
    const validSeverities = ['low', 'medium', 'high', 'critical'];
    if (!validSeverities.includes(result.severity)) {
      throw new LLMClassificationError(`Invalid severity: ${result.severity}`);
    }

    // 验证 reasoning 为字符串且非空
    if (typeof result.reasoning !== 'string' || result.reasoning.trim().length === 0) {
      throw new LLMClassificationError('Invalid reasoning: expected non-empty string');
    }
  }
}

// 错误类型
export class LLMClassificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LLMClassificationError';
  }
}

export class LLMTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LLMTimeoutError';
  }
}
