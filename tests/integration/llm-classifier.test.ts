import { CommunityAgent } from '../../src/agent';
import { MockInboxConnector, InMemoryCaseRepository, StaticKnowledgeBase, ConsoleNotifier } from '../../src/mocks';
import { Config } from '../../src/config';

describe('LLM Classifier Integration', () => {
    describe('with LLM configured', () => {
        it('should use LLM classification when available', async () => {
            // 配置 LLM
            const config: Partial<Config> = {
                llmApiKey: 'test-key',
                llmBaseUrl: 'https://api.apiyi.com/v1',
                llmModel: 'gpt-4o-mini',
                llmTimeoutMs: 30000,
                llmRetryCount: 3,
                llmFallbackEnabled: true,
            };

            const connector = new MockInboxConnector();
            const agent = new CommunityAgent(
                connector,
                new InMemoryCaseRepository(),
                new StaticKnowledgeBase(),
                new ConsoleNotifier(),
                config as Config
            );

            // 验证 LLMClient 被初始化
            expect((agent as any).llmClient).not.toBeNull();
            expect((agent as any).config).toBeDefined();
            expect((agent as any).config.llmApiKey).toBe('test-key');
        });

        it('should fallback to keywords when LLM fails', async () => {
            // 配置无效 LLM key (模拟失败)
            const config: Partial<Config> = {
                llmApiKey: 'invalid-key',
                llmBaseUrl: 'https://api.apiyi.com/v1',
                llmModel: 'gpt-4o-mini',
                llmTimeoutMs: 1000,
                llmRetryCount: 1,
                llmFallbackEnabled: true,
            };

            const connector = new MockInboxConnector();
            const cases = new InMemoryCaseRepository();
            const agent = new CommunityAgent(
                connector,
                cases,
                new StaticKnowledgeBase(),
                new ConsoleNotifier(),
                config as Config
            );

            // 模拟 LLM 调用失败
            const mockClient = {
                classifyTicket: jest.fn().mockRejectedValue(new Error('API Error')),
            };
            (agent as any).llmClient = mockClient;

            // 注入支付相关消息
            connector.pushMessage({
                threadId: 'test-fallback',
                fromUserId: 'user-1',
                text: '充值了但没到账，订单号是 ORDER123456',
            });

            // 运行轮询
            await agent.runPoll(Date.now() - 1000);

            // 获取 case 并验证
            const caseRec = await cases.getCaseByThread('mock_channel', 'test-fallback');
            expect(caseRec).not.toBeNull();
            expect(caseRec?.category).toBe('payment');
        });
    });

    describe('without LLM configured', () => {
        it('should use keywords directly', async () => {
            const connector = new MockInboxConnector();
            const cases = new InMemoryCaseRepository();
            const agent = new CommunityAgent(
                connector,
                cases,
                new StaticKnowledgeBase(),
                new ConsoleNotifier()
                // 无 config
            );

            // 验证 LLMClient 未初始化
            expect((agent as any).llmClient).toBeNull();

            // 注入退款相关消息
            connector.pushMessage({
                threadId: 'test-no-llm',
                fromUserId: 'user-1',
                text: '我要退款，申请退钱',
            });

            // 运行轮询
            await agent.runPoll(Date.now() - 1000);

            // 获取 case 并验证
            const caseRec = await cases.getCaseByThread('mock_channel', 'test-no-llm');
            expect(caseRec).not.toBeNull();
            expect(caseRec?.category).toBe('refund');
        });

        it('should classify different categories correctly', async () => {
            const connector = new MockInboxConnector();
            const cases = new InMemoryCaseRepository();
            const agent = new CommunityAgent(
                connector,
                cases,
                new StaticKnowledgeBase(),
                new ConsoleNotifier()
            );

            const testCases = [
                { text: '游戏闪退，卡顿严重', expected: 'bug' },
                { text: '账号被封了，我要申诉', expected: 'ban_appeal' },
                { text: '有人开挂，我要举报', expected: 'abuse' },
                { text: '请问游戏怎么玩？', expected: 'general' },
            ];

            for (let i = 0; i < testCases.length; i++) {
                const { text, expected } = testCases[i];
                const threadId = `test-keyword-${i}`;
                
                connector.pushMessage({
                    threadId,
                    fromUserId: 'user-1',
                    text,
                });

                await agent.runPoll(Date.now() - 1000);

                const caseRec = await cases.getCaseByThread('mock_channel', threadId);
                expect(caseRec?.category).toBe(expected);
            }
        });
    });
});
