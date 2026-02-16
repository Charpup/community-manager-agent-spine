import { CommunityAgent } from '../../src/agent';
import { MockInboxConnector, InMemoryCaseRepository, StaticKnowledgeBase, ConsoleNotifier } from '../../src/mocks';
import { Config } from '../../src/config';

describe('Fallback Mechanism', () => {
    let agent: CommunityAgent;
    let connector: MockInboxConnector;
    let cases: InMemoryCaseRepository;

    beforeEach(() => {
        connector = new MockInboxConnector();
        cases = new InMemoryCaseRepository();
    });

    it('should handle LLM timeout gracefully', async () => {
        const config: Partial<Config> = {
            llmApiKey: 'test-key',
            llmBaseUrl: 'https://api.apiyi.com/v1',
            llmModel: 'gpt-4o-mini',
            llmTimeoutMs: 1000,
            llmRetryCount: 1,
            llmFallbackEnabled: true,
        };

        agent = new CommunityAgent(
            connector,
            cases,
            new StaticKnowledgeBase(),
            new ConsoleNotifier(),
            config as Config
        );

        // 模拟 LLM 超时
        const mockClient = {
            classifyTicket: jest.fn().mockRejectedValue(new Error('Request timeout')),
        };
        (agent as any).llmClient = mockClient;

        connector.pushMessage({
            threadId: 'test-timeout',
            fromUserId: 'user-1',
            text: '充值了但没到账',
        });

        await agent.runPoll(Date.now() - 1000);

        const caseRec = await cases.getCaseByThread('mock_channel', 'test-timeout');
        expect(caseRec).not.toBeNull();
        expect(caseRec?.category).toBe('payment'); // 应该通过关键词降级成功分类
    });

    it('should handle LLM API error gracefully', async () => {
        const config: Partial<Config> = {
            llmApiKey: 'test-key',
            llmBaseUrl: 'https://api.apiyi.com/v1',
            llmModel: 'gpt-4o-mini',
            llmTimeoutMs: 30000,
            llmRetryCount: 2,
            llmFallbackEnabled: true,
        };

        agent = new CommunityAgent(
            connector,
            cases,
            new StaticKnowledgeBase(),
            new ConsoleNotifier(),
            config as Config
        );

        // 模拟 LLM API 错误
        const mockClient = {
            classifyTicket: jest.fn().mockRejectedValue(new Error('API rate limit exceeded')),
        };
        (agent as any).llmClient = mockClient;

        connector.pushMessage({
            threadId: 'test-api-error',
            fromUserId: 'user-1',
            text: '游戏闪退',
        });

        await agent.runPoll(Date.now() - 1000);

        const caseRec = await cases.getCaseByThread('mock_channel', 'test-api-error');
        expect(caseRec).not.toBeNull();
        expect(caseRec?.category).toBe('bug'); // 应该通过关键词降级成功分类
    });

    it('should handle LLM invalid response gracefully', async () => {
        const config: Partial<Config> = {
            llmApiKey: 'test-key',
            llmBaseUrl: 'https://api.apiyi.com/v1',
            llmModel: 'gpt-4o-mini',
            llmTimeoutMs: 30000,
            llmRetryCount: 1,
            llmFallbackEnabled: true,
        };

        agent = new CommunityAgent(
            connector,
            cases,
            new StaticKnowledgeBase(),
            new ConsoleNotifier(),
            config as Config
        );

        // 模拟 LLM 返回无效响应
        const mockClient = {
            classifyTicket: jest.fn().mockRejectedValue(new Error('Invalid response format')),
        };
        (agent as any).llmClient = mockClient;

        connector.pushMessage({
            threadId: 'test-invalid-response',
            fromUserId: 'user-1',
            text: '我要退款',
        });

        await agent.runPoll(Date.now() - 1000);

        const caseRec = await cases.getCaseByThread('mock_channel', 'test-invalid-response');
        expect(caseRec).not.toBeNull();
        expect(caseRec?.category).toBe('refund'); // 应该通过关键词降级成功分类
    });

    it('should use keywords when llmFallbackEnabled is false', async () => {
        const config: Partial<Config> = {
            llmApiKey: 'test-key',
            llmBaseUrl: 'https://api.apiyi.com/v1',
            llmModel: 'gpt-4o-mini',
            llmTimeoutMs: 30000,
            llmRetryCount: 3,
            llmFallbackEnabled: false, // 禁用 LLM
        };

        agent = new CommunityAgent(
            connector,
            cases,
            new StaticKnowledgeBase(),
            new ConsoleNotifier(),
            config as Config
        );

        // 即使配置了 LLM，但 fallbackEnabled=false 时应该使用关键词
        expect((agent as any).llmClient).not.toBeNull();

        connector.pushMessage({
            threadId: 'test-no-fallback',
            fromUserId: 'user-1',
            text: '我要退款',
        });

        await agent.runPoll(Date.now() - 1000);

        const caseRec = await cases.getCaseByThread('mock_channel', 'test-no-fallback');
        expect(caseRec).not.toBeNull();
        expect(caseRec?.category).toBe('refund');
    });

    it('should classifyWithKeywordsFallback return correct format', async () => {
        agent = new CommunityAgent(
            connector,
            cases,
            new StaticKnowledgeBase(),
            new ConsoleNotifier()
        );

        // 测试 classifyWithKeywordsFallback 方法
        const result = (agent as any).classifyWithKeywordsFallback('充值失败', 'zh-CN');
        
        expect(result).toHaveProperty('category');
        expect(result).toHaveProperty('confidence');
        expect(result).toHaveProperty('reasoning');
        expect(result).toHaveProperty('severity');
        expect(result).toHaveProperty('source');
        expect(result.source).toBe('keyword');
        expect(result.reasoning).toContain('Keyword matching');
    });

    it('should inferSeverity return correct values', async () => {
        agent = new CommunityAgent(
            connector,
            cases,
            new StaticKnowledgeBase(),
            new ConsoleNotifier()
        );

        // 测试 inferSeverity 方法
        expect((agent as any).inferSeverity('refund')).toBe('high');
        expect((agent as any).inferSeverity('ban_appeal')).toBe('high');
        expect((agent as any).inferSeverity('payment')).toBe('high');
        expect((agent as any).inferSeverity('bug')).toBe('high');
        expect((agent as any).inferSeverity('abuse')).toBe('medium');
        expect((agent as any).inferSeverity('general')).toBe('low');
    });

    it('should track classification source in TriageDecision', async () => {
        // 创建没有 LLM 的 agent，确保使用关键词
        agent = new CommunityAgent(
            connector,
            cases,
            new StaticKnowledgeBase(),
            new ConsoleNotifier()
        );

        connector.pushMessage({
            threadId: 'test-source',
            fromUserId: 'user-1',
            text: '游戏卡顿',
        });

        await agent.runPoll(Date.now() - 1000);

        const caseRec = await cases.getCaseByThread('mock_channel', 'test-source');
        expect(caseRec).not.toBeNull();
        
        // 获取审计日志验证 source 字段
        const actions = (cases as any).actionsByCaseId.get(caseRec!.caseId);
        const triageAction = actions.find((a: any) => a.type === 'TRIAGED');
        expect(triageAction).toBeDefined();
        expect(triageAction.payload.source).toBe('keyword');
    });
});
