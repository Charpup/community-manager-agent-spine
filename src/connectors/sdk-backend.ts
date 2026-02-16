/**
 * SDK Backend Connector - SDK 后台客诉系统接入
 * 
 * 只读接入 SDK 后台 API，拉取客诉列表和聊天记录
 * ⚠️ 注意：当前版本为只读模式，不支持回复提交
 * 
 * @module connectors/sdk-backend
 */

import { InboxConnector, MessageEvent, Channel } from "../types";

/**
 * SDK 后台客诉话题(工单)类型定义
 * @interface SDKChatTopic
 */
interface SDKChatTopic {
    /** 工单唯一标识 */
    id: number;
    /** 工单状态: 0=新客诉 1=已分配 2=已解决 3=已评分 */
    status: number;
    /** 游戏ID */
    gameid?: number;
    /** 包ID */
    pkgid?: number;
    /** 用户ID */
    uid: string;
    /** 创建时间 */
    created_at?: string;
    /** 更新时间 */
    updated_at?: string;
}

/**
 * SDK 后台聊天消息类型定义
 * @interface SDKChatMessage
 */
interface SDKChatMessage {
    /** 消息唯一标识 */
    id: number;
    /** 所属工单ID */
    topic_id: number;
    /** 消息内容 */
    content: string;
    /** 发送者用户ID */
    from_uid: string;
    /** 接收者用户ID */
    to_uid?: string;
    /** 创建时间 */
    created_at: string;
}

/**
 * SDK 聊天列表 API 响应类型
 * @interface SDKChatListResponse
 */
interface SDKChatListResponse {
    /** 消息数组 */
    data?: SDKChatMessage[];
    /** 总数 */
    total?: number;
}

/**
 * SDK 工单列表 API 响应类型
 * @interface SDKTopicListResponse
 */
interface SDKTopicListResponse {
    /** 包含工单列表和总数的响应数据 */
    data?: {
        /** 工单列表 */
        list?: SDKChatTopic[];
        /** 总数 */
        total?: number;
    };
}

/**
 * SDK 后台连接器类
 * 
 * 提供对 SDK 后台客诉系统的只读访问，包括：
 * - 拉取工单列表
 * - 获取工单聊天消息
 * 
 * ⚠️ 重要安全约束：
 * - NEVER 发送 'give' 参数到 chatlist API (严格禁止)
 * - Token 必须通过环境变量配置
 * - 所有错误必须清晰记录
 * 
 * @class SDKBackendConnector
 * @implements {InboxConnector}
 */
export class SDKBackendConnector implements InboxConnector {
    /** 通道标识符 */
    channel: Channel = "sdk_backend";

    /**
     * 创建 SDK 后台连接器实例
     * 
     * @param {string} token - 认证令牌 (Bearer Token)
     * @param {string} baseUrl - API 基础 URL
     * @param {number} [gameId] - 可选的游戏ID过滤
     * @param {number} [pkgId] - 可选的包ID过滤
     */
    constructor(
        private token: string,
        private baseUrl: string,
        private gameId?: number,
        private pkgId?: number
    ) {
        console.log(`[SDKBackendConnector] Initialized for ${baseUrl}`);
    }

    /**
     * 获取指定时间之后的新消息
     * 
     * 流程：
     * 1. 获取工单列表
     * 2. 遍历每个工单获取聊天消息
     * 3. 过滤出时间戳大于 sinceMs 的消息
     * 4. 按时间戳升序排序
     * 
     * @param {number} sinceMs - 毫秒级时间戳，获取此时间之后的消息
     * @returns {Promise<MessageEvent[]>} 新消息事件数组
     * @throws {Error} 当 Token 过期时抛出特定错误消息
     */
    async fetchNewMessages(sinceMs: number): Promise<MessageEvent[]> {
        const allMessages: MessageEvent[] = [];

        try {
            // Step 1: 获取工单列表
            const tickets = await this.getTicketList();
            console.log(`[SDKBackendConnector] Found ${tickets.length} tickets`);

            for (const ticket of tickets) {
                try {
                    // Step 2: 获取每个工单的聊天消息
                    const messages = await this.getChatMessages(ticket.id);

                    for (const msg of messages) {
                        const timestampMs = new Date(msg.created_at).getTime();

                        // 过滤: 只获取 sinceMs 之后的消息
                        if (timestampMs <= sinceMs) {
                            continue;
                        }

                        allMessages.push({
                            channel: this.channel,
                            threadId: String(ticket.id),
                            messageId: String(msg.id),
                            fromUserId: msg.from_uid,
                            fromName: msg.from_uid === ticket.uid ? `User(${ticket.uid})` : "Support",
                            text: msg.content ?? "",
                            timestampMs,
                            raw: {
                                ticket,
                                message: msg,
                            },
                        });
                    }
                } catch (ticketErr) {
                    console.error(`[SDKBackendConnector] Failed to get messages for ticket ${ticket.id}:`, ticketErr);
                    // 继续处理其他工单
                }
            }

            // 按时间戳升序排序
            allMessages.sort((a, b) => a.timestampMs - b.timestampMs);

            if (allMessages.length > 0) {
                console.log(`[SDKBackendConnector] Fetched ${allMessages.length} new messages since ${new Date(sinceMs).toISOString()}`);
            }

        } catch (err: any) {
            // 处理令牌过期
            if (err.message?.includes("401") || err.message?.includes("Unauthorized")) {
                const errorMessage = "[SDK-BACKEND] Token expired. Please update SDK_BACKEND_TOKEN in .env and restart.";
                console.error(errorMessage);
                throw new Error(errorMessage);
            }
            
            console.error("[SDKBackendConnector] Failed to fetch messages:", err);
            // 返回空数组，不崩溃
        }

        return allMessages;
    }

    /**
     * 发送回复到工单 (只读模式 - 不支持)
     * 
     * ⚠️ 当前版本为只读模式，此操作始终抛出错误
     * 
     * @param {string} _threadId - 工单ID (线程ID)
     * @param {string} _text - 回复文本内容
     * @returns {Promise<void>}
     * @throws {Error} 始终抛出 "SDK Backend reply API not available — read-only mode"
     */
    async sendReply(_threadId: string, _text: string): Promise<void> {
        // 只读模式 - 回复 API 不可用
        throw new Error("SDK Backend reply API not available — read-only mode");
    }

    /**
     * 获取工单列表
     * 
     * 调用 /service/ChatTopic/all 端点获取工单列表
     * 支持按 gameId 和 pkgId 过滤
     * 
     * @private
     * @returns {Promise<SDKChatTopic[]>} 工单数组
     * @throws {Error} 当 API 返回 401 或请求失败时抛出
     */
    private async getTicketList(): Promise<SDKChatTopic[]> {
        const params = new URLSearchParams();
        params.append("page", "1");
        params.append("pageSize", "50");
        if (this.gameId) params.append("gameid", String(this.gameId));
        if (this.pkgId) params.append("pkgid", String(this.pkgId));

        const url = `${this.baseUrl}/service/ChatTopic/all?${params.toString()}`;
        
        const response = await fetch(url, {
            headers: {
                "Authorization": `Bearer ${this.token}`,
                "Accept": "application/json",
            },
        });

        if (response.status === 401) {
            throw new Error("401 Unauthorized - Token expired");
        }

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Failed to get ticket list: ${response.status} ${errorBody}`);
        }

        const data: SDKTopicListResponse = await response.json();
        return data.data?.list ?? [];
    }

    /**
     * 获取指定工单的聊天消息
     * 
     * 调用 /service/ChatTopic/chatlist 端点获取聊天记录
     * ⚠️ 安全约束: NEVER 添加 'give' 参数 - 严格禁止
     * 
     * @private
     * @param {number} ticketId - 工单ID
     * @returns {Promise<SDKChatMessage[]>} 聊天消息数组
     * @throws {Error} 当 API 返回 401 或请求失败时抛出
     */
    private async getChatMessages(ticketId: number): Promise<SDKChatMessage[]> {
        const params = new URLSearchParams();
        params.append("id", String(ticketId));
        // ⚠️ NEVER 添加 'give' 参数 - 严格禁止

        const url = `${this.baseUrl}/service/ChatTopic/chatlist?${params.toString()}`;

        const response = await fetch(url, {
            headers: {
                "Authorization": `Bearer ${this.token}`,
                "Accept": "application/json",
            },
        });

        if (response.status === 401) {
            throw new Error("401 Unauthorized - Token expired");
        }

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Failed to get chat messages: ${response.status} ${errorBody}`);
        }

        const data: SDKChatListResponse = await response.json();
        return data.data ?? [];
    }
}
