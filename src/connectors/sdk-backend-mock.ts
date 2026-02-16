/**
 * SDK Backend Mock Connector - 模拟 SDK 后台客诉数据
 * 
 * 提供多语言模拟客诉数据，用于测试模式
 */

import { InboxConnector, MessageEvent, Channel } from "../types";

// 模拟客诉数据模板
const MOCK_TICKETS = [
    {
        id: 1001,
        uid: "user_001",
        category: "payment",
        messages: [
            { content: "充值了648元但是钻石没到账，请帮忙看一下", fromUser: true },
            { content: "订单号：202402150001", fromUser: true },
        ],
    },
    {
        id: 1002,
        uid: "user_002",
        category: "refund",
        messages: [
            { content: "想申请退款，昨天不小心充错了", fromUser: true },
            { content: "能帮我处理一下吗", fromUser: true },
        ],
    },
    {
        id: 1003,
        uid: "user_003",
        category: "bug",
        messages: [
            { content: "游戏一直闪退，根本进不去", fromUser: true },
            { content: "手机是iPhone 14，系统iOS 17", fromUser: true },
        ],
    },
    {
        id: 1004,
        uid: "user_004",
        category: "ban_appeal",
        messages: [
            { content: "为什么我的账号被封了？我没有开挂啊", fromUser: true },
            { content: "ID: DragonSlayer2024", fromUser: true },
        ],
    },
    {
        id: 1005,
        uid: "user_005",
        category: "payment",
        messages: [
            { content: "I paid for the monthly pass but didn't receive the rewards", fromUser: true },
            { content: "Transaction ID: GPA.1234-5678-9012-34567", fromUser: true },
        ],
    },
    {
        id: 1006,
        uid: "user_006",
        category: "bug",
        messages: [
            { content: "Game crashes when I open the guild menu", fromUser: true },
            { content: "This started happening after the latest update", fromUser: true },
        ],
    },
    {
        id: 1007,
        uid: "user_007",
        category: "general",
        messages: [
            { content: "请问活动什么时候结束？", fromUser: true },
        ],
    },
    {
        id: 1008,
        uid: "user_008",
        category: "refund",
        messages: [
            { content: "Can I get a refund for my purchase yesterday?", fromUser: true },
            { content: "I accidentally bought the wrong pack", fromUser: true },
        ],
    },
];

export class SDKBackendMockConnector implements InboxConnector {
    channel: Channel = "sdk_backend";
    public sentReplies: { threadId: string; text: string }[] = [];
    private mockMessages: MessageEvent[] = [];
    private isInitialized = false;

    constructor() {
        console.log("[SDKBackendMockConnector] Initialized");
    }

    async fetchNewMessages(sinceMs: number): Promise<MessageEvent[]> {
        // Initialize mock data on first call
        if (!this.isInitialized) {
            this.initializeMockData();
            this.isInitialized = true;
        }

        // Return messages newer than sinceMs
        const batch = this.mockMessages.filter((m) => m.timestampMs > sinceMs);
        
        if (batch.length > 0) {
            console.log(`[SDKBackendMockConnector] Returning ${batch.length} mock messages`);
        }

        return batch;
    }

    async sendReply(threadId: string, text: string): Promise<void> {
        console.log(`[SDKBackendMockConnector] REPLY to ticket ${threadId}: "${text.substring(0, 50)}..."`);
        this.sentReplies.push({ threadId, text });
    }

    // Test helper to inject additional messages
    pushMessage(msg: Partial<MessageEvent> & { text: string; threadId: string; fromUserId: string }) {
        this.mockMessages.push({
            channel: this.channel,
            messageId: `mock-${Date.now()}-${Math.random()}`,
            timestampMs: Date.now(),
            fromName: msg.fromUserId,
            ...msg,
        });
    }

    private initializeMockData() {
        const now = Date.now();
        
        MOCK_TICKETS.forEach((ticket, index) => {
            ticket.messages.forEach((msg, msgIndex) => {
                this.mockMessages.push({
                    channel: this.channel,
                    threadId: String(ticket.id),
                    messageId: `mock-${ticket.id}-${msgIndex}`,
                    fromUserId: ticket.uid,
                    fromName: msg.fromUser ? `User(${ticket.uid})` : "Support",
                    text: msg.content,
                    timestampMs: now - (MOCK_TICKETS.length - index) * 60000 + msgIndex * 1000,
                    raw: {
                        ticketId: ticket.id,
                        category: ticket.category,
                        uid: ticket.uid,
                    },
                });
            });
        });

        console.log(`[SDKBackendMockConnector] Generated ${this.mockMessages.length} mock messages from ${MOCK_TICKETS.length} tickets`);
    }
}
