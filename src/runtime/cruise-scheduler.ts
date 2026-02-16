import { CommunityAgent } from '../agent';
import { generateCruiseReport, calculateCruiseStats } from '../reports/cruise-report';
import { CruiseRepository } from '../repo/cruise-repository';
import { CaseRepository, Ticket, CaseRecord } from '../types';
import { LLMClient } from '../llm/client';
import { loadConfig } from '../config';

export interface CruiseSchedulerOptions {
  agent: CommunityAgent;
  caseRepo: CaseRepository;
  cruiseRepo: CruiseRepository;
  intervalMs: number;
  reportLanguage: string;
  batchSize: number;
  useLLM?: boolean;
  llmClient?: LLMClient;
}

export class CruiseScheduler {
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private llmClient: LLMClient | null = null;

  constructor(private options: CruiseSchedulerOptions) {
    // 如果配置了 LLM，初始化
    const config = loadConfig();
    if (config.llmApiKey && options.useLLM !== false) {
      this.llmClient = new LLMClient({
        apiKey: config.llmApiKey,
        baseUrl: config.llmBaseUrl,
        model: config.llmModel,
        timeoutMs: config.llmTimeoutMs,
        retryCount: config.llmRetryCount,
        fallbackEnabled: config.llmFallbackEnabled
      });
    }
  }

  /**
   * 启动定时巡航
   */
  start(): void {
    if (this.isRunning) {
      console.log('[CruiseScheduler] Already running');
      return;
    }

    console.log(`[CruiseScheduler] Starting with interval ${this.options.intervalMs}ms`);
    this.isRunning = true;

    // 立即执行一次
    this.runCruise();

    // 定时执行
    this.timer = setInterval(() => {
      this.runCruise();
    }, this.options.intervalMs);
  }

  /**
   * 停止定时巡航
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    console.log('[CruiseScheduler] Stopped');
  }

  /**
   * 检查是否正在运行
   */
  getIsRunning(): boolean {
    return this.isRunning;
  }

  /**
   * 执行单次巡航
   */
  async runCruise(): Promise<void> {
    const startTime = Date.now();
    console.log('[Cruise] Starting cruise at', new Date().toISOString());

    try {
      // 1. 获取待处理客诉
      const tickets = await this.fetchTicketsForCruise();

      if (tickets.length === 0) {
        console.log('[Cruise] No tickets to process');
        return;
      }

      console.log(`[Cruise] Processing ${tickets.length} tickets`);

      // 2. 计算统计
      const stats = calculateCruiseStats(tickets);

      // 3. 生成报告
      const report = await generateCruiseReport(tickets, stats, {
        language: this.options.reportLanguage as any,
        useLLM: !!this.llmClient,
        llmClient: this.llmClient || undefined,
      });

      // 4. 存储报告
      await this.options.cruiseRepo.saveCruiseLog({
        timestamp: startTime,
        report_md: report,
        stats_json: JSON.stringify(stats),
        duration_ms: Date.now() - startTime,
      });

      // 5. 输出摘要到控制台
      console.log(`[Cruise] Complete: ${stats.total} tickets, ${stats.highPriority} high priority`);

    } catch (error) {
      console.error('[Cruise] Error during cruise:', error);
    }
  }

  /**
   * 获取待巡航的客诉
   */
  private async fetchTicketsForCruise(): Promise<Ticket[]> {
    // 获取最近 N 条客诉（从 caseRepo 中）
    const nowMs = Date.now();
    const cutoffMs = nowMs - this.options.intervalMs; // 只获取最近一个周期内的客诉

    // 获取待复扫的开放客诉
    const cases = await this.options.caseRepo.listOpenCasesForRescan(nowMs);

    // 转换为 ticket 格式
    // 只取最近一个周期内的客诉，限制数量
    const recentCases = cases
      .filter((c: CaseRecord) => c.lastMessageAtMs >= cutoffMs)
      .slice(0, this.options.batchSize);

    return recentCases.map((c: CaseRecord): Ticket => ({
      id: c.caseId,
      text: c.notes?.join('\n') || '', // 使用 notes 作为文本摘要
      category: c.category,
      severity: c.severity,
      detected_language: c.detected_language,
    }));
  }
}

/**
 * 单次巡航执行器 - 用于 CLI --cruise-once
 */
export async function runSingleCruise(options: {
  caseRepo: CaseRepository;
  reportLanguage: string;
  batchSize: number;
  intervalMs?: number;
  useLLM?: boolean;
  llmClient?: LLMClient;
}): Promise<{ report: string; stats: { total: number; highPriority: number } }> {
  const startTime = Date.now();
  console.log('[Cruise] Running single cruise at', new Date().toISOString());

  // 获取最近处理的客诉
  const allCases = await options.caseRepo.listOpenCasesForRescan(Date.now());

  // 转换为 ticket 格式
  const cutoffMs = startTime - (options.intervalMs || 300000); // 默认5分钟
  const tickets: Ticket[] = allCases
    .filter((c: CaseRecord) => c.lastMessageAtMs >= cutoffMs)
    .slice(0, options.batchSize)
    .map((c: CaseRecord): Ticket => ({
      id: c.caseId,
      text: c.notes?.join('\n') || '',
      category: c.category,
      severity: c.severity,
      detected_language: c.detected_language,
    }));

  if (tickets.length === 0) {
    console.log('[Cruise] No tickets to process in this cycle');
    return {
      report: '# Cruise Report\n\nNo tickets to process.',
      stats: { total: 0, highPriority: 0 },
    };
  }

  console.log(`[Cruise] Processing ${tickets.length} tickets`);

  // 生成报告
  const stats = calculateCruiseStats(tickets);
  const report = await generateCruiseReport(tickets, stats, {
    language: options.reportLanguage as any,
    useLLM: options.useLLM,
    llmClient: options.llmClient,
  });

  console.log(`[Cruise] Complete: ${stats.total} tickets, ${stats.highPriority} high priority (${Date.now() - startTime}ms)`);

  return { report, stats };
}
