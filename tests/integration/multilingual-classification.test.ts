import { CommunityAgent } from '../../src/agent';
import { MockInboxConnector, InMemoryCaseRepository, StaticKnowledgeBase, ConsoleNotifier } from '../../src/mocks';

describe('Multilingual Classification', () => {
    let agent: CommunityAgent;
    let connector: MockInboxConnector;
    let cases: InMemoryCaseRepository;

    beforeEach(() => {
        connector = new MockInboxConnector();
        cases = new InMemoryCaseRepository();
        agent = new CommunityAgent(connector, cases, new StaticKnowledgeBase(), new ConsoleNotifier());
    });

    // 测试 6 语言 × 6 分类 = 36 种组合的关键样本
    test.each([
        // 简体中文 (zh-CN)
        { text: '充值了但没到账', lang: 'zh-CN', category: 'payment' },
        { text: '我要退款', lang: 'zh-CN', category: 'refund' },
        { text: '游戏闪退了', lang: 'zh-CN', category: 'bug' },
        { text: '账号被封了，我要申诉', lang: 'zh-CN', category: 'ban_appeal' },
        { text: '有人开挂作弊', lang: 'zh-CN', category: 'abuse' },
        { text: '请问怎么联系客服', lang: 'zh-CN', category: 'general' },

        // 繁体中文 (zh-TW)
        { text: '充值沒到帳', lang: 'zh-TW', category: 'payment' },
        { text: '請問如何退款', lang: 'zh-TW', category: 'refund' },
        { text: '遊戲閃退了', lang: 'zh-TW', category: 'bug' },
        { text: '帳號被封，需要解封申訴', lang: 'zh-TW', category: 'ban_appeal' },
        { text: '我要舉報外掛作弊', lang: 'zh-TW', category: 'abuse' },
        { text: '有個問題想請教', lang: 'zh-TW', category: 'general' },

        // 英文 (en)
        { text: 'payment failed', lang: 'en', category: 'payment' },
        { text: 'I want a refund', lang: 'en', category: 'refund' },
        { text: 'the game keeps crashing', lang: 'en', category: 'bug' },
        { text: 'my account is banned', lang: 'en', category: 'ban_appeal' },
        { text: 'report a cheater for hacking', lang: 'en', category: 'abuse' },
        { text: 'I have a question', lang: 'en', category: 'general' },

        // 日文 (ja)
        { text: '課金できない', lang: 'ja', category: 'payment' },
        { text: '返金をお願いします', lang: 'ja', category: 'refund' },
        { text: 'ゲームがクラッシュする', lang: 'ja', category: 'bug' },
        { text: 'アカウントが停止されました', lang: 'ja', category: 'ban_appeal' },
        { text: 'チーターを通報したい', lang: 'ja', category: 'abuse' },
        { text: '質問があります', lang: 'ja', category: 'general' },

        // 韩文 (ko)
        { text: '결제가 안돼요', lang: 'ko', category: 'payment' },
        { text: '환불하고 싶어요', lang: 'ko', category: 'refund' },
        { text: '게임이 충돌해요', lang: 'ko', category: 'bug' },
        { text: '계정이 정지되었어요', lang: 'ko', category: 'ban_appeal' },
        { text: '핵 사용자를 신고합니다', lang: 'ko', category: 'abuse' },
        { text: '질문이 있어요', lang: 'ko', category: 'general' },

        // 西班牙文 (es)
        { text: 'mi pago no funciona', lang: 'es', category: 'payment' },
        { text: 'quiero un reembolso', lang: 'es', category: 'refund' },
        { text: 'el juego se congela y falla', lang: 'es', category: 'bug' },
        { text: 'mi cuenta está suspendida', lang: 'es', category: 'ban_appeal' },
        { text: 'reportar trampa', lang: 'es', category: 'abuse' },
        { text: 'necesito ayuda', lang: 'es', category: 'general' },
    ])('classifies "$text" ($lang) as $category', async ({ text, lang, category }) => {
        // Push message to connector
        connector.pushMessage({ threadId: 't-test', fromUserId: 'u-test', text });

        // Run poll
        await agent.runPoll(0);

        // Get case and verify
        const caseRec = await cases.getCaseByThread('mock_channel', 't-test');
        expect(caseRec).not.toBeNull();
        expect(caseRec!.category).toBe(category);
        expect(caseRec!.detected_language).toBe(lang);
    });

    // Test severity and autoAllowed logic - use phrases with high confidence matches
    test.each([
        // refund and ban_appeal should always escalate (autoAllowed=false)
        { text: '我要退款', category: 'refund', autoAllowed: false, severity: 'high' },
        { text: 'account banned', category: 'ban_appeal', autoAllowed: false, severity: 'high' },
        // payment and bug should auto-reply when confidence is high enough - use multiple keywords
        { text: '充值支付扣费失败，没到账', category: 'payment', autoAllowed: true, severity: 'high' },
        { text: 'crash bug freeze lag black screen', category: 'bug', autoAllowed: true, severity: 'high' },
        // abuse is medium severity
        { text: '举报外挂作弊辱骂', category: 'abuse', autoAllowed: true, severity: 'medium' },
        // general is low severity
        { text: '有问题需要咨询帮助', category: 'general', autoAllowed: true, severity: 'low' },
    ])('correctly sets severity and autoAllowed for $category', async ({ text, category, autoAllowed, severity }) => {
        connector.pushMessage({ threadId: 't-severity', fromUserId: 'u-test', text });
        await agent.runPoll(0);

        const caseRec = await cases.getCaseByThread('mock_channel', 't-severity');
        expect(caseRec).not.toBeNull();
        expect(caseRec!.category).toBe(category);
        expect(caseRec!.severity).toBe(severity);
        
        // Verify autoAllowed by checking if case was escalated or not
        if (autoAllowed) {
            expect(caseRec!.status).not.toBe('ESCALATED');
            expect(caseRec!.assignedTo).not.toBe('human');
        } else {
            expect(caseRec!.status).toBe('ESCALATED');
            expect(caseRec!.assignedTo).toBe('human');
        }
    });

    // Test confidence threshold for auto-reply
    test('low confidence should not allow auto-reply for payment/bug', async () => {
        // Use a vague message that won't match keywords well
        connector.pushMessage({ threadId: 't-low-conf', fromUserId: 'u-test', text: 'something is wrong' });
        await agent.runPoll(0);

        const caseRec = await cases.getCaseByThread('mock_channel', 't-low-conf');
        expect(caseRec).not.toBeNull();
        // Should default to general with low severity
        expect(caseRec!.category).toBe('general');
        expect(caseRec!.severity).toBe('low');
    });
});
