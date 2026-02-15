/**
 * SDK Backend Connector - SDK 后台客诉系统接入
 * 
 * 只读接入 SDK 后台 API，拉取客诉列表和聊天记录
 * ⚠️ 注意：当前版本为只读模式，不支持回复提交
 */

import { InboxConnector, MessageEvent, Channel } from "../types";

// SDK 后台 API 响应类型定义
interface SDKChatTopic {
    id: number;
    status: number;  // 0=新客诉 1=已分配 2=已解决 3=已评分
    gameid?: number;
    pkgid?: number;
    uid: string;
    created_at?: string;
    updated_at?: string;
}

interface SDKChatMessage {
    id: number;
    topic_id: number;
    content: string;
    from_uid: string;
    to_uid?: string;
    created_at: string;
}

interface SDKChatListResponse {
    data?: SDKChatMessage[];
    total?: number;
}

interface SDKTopicListResponse {
    data?: {
        list?: SDKChatTopic[];
        total?: number;
    };
}

export class SDKBackendConnector implements InboxConnector {
    channel: Channel = "sdk_backend";

    constructor(
        private token: string,
        private baseUrl: string,
        private gameId?: number,
        private pkgId?: number
    ) {
        console.log(`[SDKBackendConnector] Initialized for ${baseUrl}`);
    }

    async fetchNewMessages(sinceMs: number): Promise<MessageEvent[]> {
        const allMessages: MessageEvent[] = [];

        try {
            // Step 1: Get ticket list
            const tickets = await this.getTicketList();
            console.log(`[SDKBackendConnector] Found ${tickets.length} tickets`);

            for (const ticket of tickets) {
                try {
                    // Step 2: Get chat messages for each ticket
                    const messages = await this.getChatMessages(ticket.id);

                    for (const msg of messages) {
                        const timestampMs = new Date(msg.created_at).getTime();

                        // Filter: only messages after sinceMs
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
                    // Continue with other tickets
                }
            }

            // Sort by timestamp ascending
            allMessages.sort((a, b) => a.timestampMs - b.timestampMs);

            if (allMessages.length > 0) {
                console.log(`[SDKBackendConnector] Fetched ${allMessages.length} new messages since ${new Date(sinceMs).toISOString()}`);
            }

        } catch (err: any) {
            // Handle token expiration
            if (err.message?.includes("401") || err.message?.includes("Unauthorized")) {
                console.error("[SDK-BACKEND] Token expired. Please update SDK_BACKEND_TOKEN in .env and restart.");
                throw new Error("[SDK-BACKEND] Token expired. Please update SDK_BACKEND_TOKEN in .env and restart.");
            }
            
            console.error("[SDKBackendConnector] Failed to fetch messages:", err);
            // Return empty array, don't crash
        }

        return allMessages;
    }

    async sendReply(_threadId: string, _text: string): Promise<void> {
        // Read-only mode - reply API not available
        throw new Error("SDK Backend reply API not available — read-only mode");
    }

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

    private async getChatMessages(ticketId: number): Promise<SDKChatMessage[]> {
        const params = new URLSearchParams();
        params.append("id", String(ticketId));
        // ⚠️ NEVER add 'give' parameter - strictly prohibited

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
