import { CruiseScheduler, CruiseSchedulerOptions, runSingleCruise } from '../../../src/runtime/cruise-scheduler';
import { InMemoryCaseRepository, ConsoleNotifier, MockInboxConnector, StaticKnowledgeBase } from '../../../src/mocks';
import { CommunityAgent } from '../../../src/agent';
import { CruiseRepository } from '../../../src/repo/cruise-repository';
import { CruiseLog } from '../../../src/types';

// Mock CruiseRepository for testing
class MockCruiseRepository implements CruiseRepository {
  private logs: (CruiseLog & { id: number })[] = [];
  private nextId = 1;

  async saveCruiseLog(log: Omit<CruiseLog, 'id'>): Promise<number> {
    const id = this.nextId++;
    this.logs.push({ ...log, id });
    return id;
  }

  async getCruiseLogs(since: number, limit: number): Promise<CruiseLog[]> {
    return this.logs
      .filter(l => l.timestamp >= since)
      .slice(0, limit)
      .map(({ id, ...log }) => log as CruiseLog);
  }

  async getLatestCruiseLog(): Promise<CruiseLog | null> {
    if (this.logs.length === 0) return null;
    const { id, ...log } = this.logs[this.logs.length - 1];
    return log as CruiseLog;
  }

  getLogs() {
    return this.logs;
  }

  clear() {
    this.logs = [];
    this.nextId = 1;
  }
}

describe('CruiseScheduler', () => {
  let scheduler: CruiseScheduler;
  let mockCaseRepo: InMemoryCaseRepository;
  let mockCruiseRepo: MockCruiseRepository;
  let mockConnector: MockInboxConnector;
  let mockAgent: CommunityAgent;
  let options: CruiseSchedulerOptions;

  beforeEach(() => {
    mockCaseRepo = new InMemoryCaseRepository();
    mockCruiseRepo = new MockCruiseRepository();
    mockConnector = new MockInboxConnector();
    mockAgent = new CommunityAgent(
      mockConnector,
      mockCaseRepo,
      new StaticKnowledgeBase(),
      new ConsoleNotifier()
    );

    options = {
      agent: mockAgent,
      caseRepo: mockCaseRepo,
      cruiseRepo: mockCruiseRepo,
      intervalMs: 1000, // 1 second for testing
      reportLanguage: 'zh-CN',
      batchSize: 100,
    };

    scheduler = new CruiseScheduler(options);
  });

  afterEach(() => {
    scheduler.stop();
    jest.useRealTimers();
  });

  describe('start and stop', () => {
    it('should start and stop correctly', () => {
      expect(scheduler.getIsRunning()).toBe(false);
      
      scheduler.start();
      expect(scheduler.getIsRunning()).toBe(true);
      
      scheduler.stop();
      expect(scheduler.getIsRunning()).toBe(false);
    });

    it('should not start again if already running', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      scheduler.start();
      scheduler.start(); // Try to start again
      
      expect(consoleSpy).toHaveBeenCalledWith('[CruiseScheduler] Already running');
      
      consoleSpy.mockRestore();
    });
  });

  describe('runCruise', () => {
    it('should handle empty ticket list', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await scheduler.runCruise();
      
      expect(consoleSpy).toHaveBeenCalledWith('[Cruise] No tickets to process');
      
      consoleSpy.mockRestore();
    });

    it('should process tickets and save cruise log', async () => {
      // Create a mock case
      await mockCaseRepo.upsertCase({
        caseId: 'case-1',
        channel: 'mock_channel',
        threadId: 'thread-1',
        userId: 'user-1',
        status: 'NEW',
        category: 'payment',
        severity: 'high',
        lastMessageAtMs: Date.now(),
        detected_language: 'zh-CN',
      });

      await scheduler.runCruise();

      const logs = mockCruiseRepo.getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].report_md).toContain('# 客诉巡航报告');
      expect(logs[0].duration_ms).toBeGreaterThanOrEqual(0);
    });

    it('should handle errors gracefully', async () => {
      const errorRepo = {
        ...mockCruiseRepo,
        saveCruiseLog: jest.fn().mockRejectedValue(new Error('DB error')),
      };
      
      const errorScheduler = new CruiseScheduler({
        ...options,
        cruiseRepo: errorRepo as any,
      });

      // Create a mock case first
      await mockCaseRepo.upsertCase({
        caseId: 'case-1',
        channel: 'mock_channel',
        threadId: 'thread-1',
        userId: 'user-1',
        status: 'NEW',
        category: 'payment',
        severity: 'high',
        lastMessageAtMs: Date.now(),
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await errorScheduler.runCruise();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[Cruise] Error during cruise:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('interval behavior', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should run cruise immediately on start', () => {
      const runCruiseSpy = jest.spyOn(scheduler as any, 'runCruise').mockResolvedValue(undefined);
      
      scheduler.start();
      
      expect(runCruiseSpy).toHaveBeenCalledTimes(1);
      
      runCruiseSpy.mockRestore();
    });

    it('should respect interval between runs', async () => {
      jest.useFakeTimers({ doNotFake: ['nextTick'] });
      
      const runCruiseSpy = jest.spyOn(scheduler as any, 'runCruise').mockResolvedValue(undefined);
      
      scheduler.start();
      
      // First call is immediate
      expect(runCruiseSpy).toHaveBeenCalledTimes(1);
      
      // Advance time by interval
      jest.advanceTimersByTime(1000);
      expect(runCruiseSpy).toHaveBeenCalledTimes(2);
      
      // Advance again
      jest.advanceTimersByTime(1000);
      expect(runCruiseSpy).toHaveBeenCalledTimes(3);
      
      runCruiseSpy.mockRestore();
    });
  });
});

describe('runSingleCruise', () => {
  let mockCaseRepo: InMemoryCaseRepository;

  beforeEach(() => {
    mockCaseRepo = new InMemoryCaseRepository();
  });

  it('should return empty report when no tickets', async () => {
    const result = await runSingleCruise({
      caseRepo: mockCaseRepo,
      reportLanguage: 'zh-CN',
      batchSize: 100,
    });

    expect(result.stats.total).toBe(0);
    expect(result.stats.highPriority).toBe(0);
    expect(result.report).toContain('No tickets to process');
  });

  it('should process tickets and return report', async () => {
    // Create some mock cases
    await mockCaseRepo.upsertCase({
      caseId: 'case-1',
      channel: 'mock_channel',
      threadId: 'thread-1',
      userId: 'user-1',
      status: 'NEW',
      category: 'payment',
      severity: 'high',
      lastMessageAtMs: Date.now(),
      detected_language: 'zh-CN',
    });

    await mockCaseRepo.upsertCase({
      caseId: 'case-2',
      channel: 'mock_channel',
      threadId: 'thread-2',
      userId: 'user-2',
      status: 'NEW',
      category: 'bug',
      severity: 'medium',
      lastMessageAtMs: Date.now(),
      detected_language: 'en',
    });

    const result = await runSingleCruise({
      caseRepo: mockCaseRepo,
      reportLanguage: 'en',
      batchSize: 100,
    });

    expect(result.stats.total).toBe(2);
    expect(result.stats.highPriority).toBe(1);
    expect(result.report).toContain('# Ticket Cruise Report');
  });

  it('should respect batchSize', async () => {
    // Create multiple cases
    for (let i = 0; i < 5; i++) {
      await mockCaseRepo.upsertCase({
        caseId: `case-${i}`,
        channel: 'mock_channel',
        threadId: `thread-${i}`,
        userId: `user-${i}`,
        status: 'NEW',
        category: 'general',
        severity: 'low',
        lastMessageAtMs: Date.now(),
      });
    }

    const result = await runSingleCruise({
      caseRepo: mockCaseRepo,
      reportLanguage: 'zh-CN',
      batchSize: 3,
    });

    expect(result.stats.total).toBe(3);
  });
});
