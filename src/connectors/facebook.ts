/**
 * Facebook Inbox Connector - Graph API 实现
 * 
 * 使用 Page Access Token 轮询 Conversations 和 Messages
 */

import { InboxConnector, MessageEvent, Channel } from "../types";

const GRAPH_API_VERSION = "v19.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

interface FacebookConversation {
    id: string;
    updated_time: string;
    participants?: {
        data: Array<{ id: string; name?: string }>;
    };
}

interface FacebookMessage {
    id: string;
    message?: string;
    created_time: string;
    from: {
        id: string;
        name?: string;
    };
}

export class FacebookInboxConnector implements InboxConnector {
    channel: Channel = "facebook";

    constructor(
        private pageId: string,
        private pageAccessToken: string
    ) {
        console.log(`[FacebookConnector] Initialized for page ${pageId}`);
    }

    async fetchNewMessages(sinceMs: number): Promise<MessageEvent[]> {
        const allMessages: MessageEvent[] = [];

        try {
            // Step 1: Get conversations
            const conversations = await this.getConversations();

            for (const conv of conversations) {
                try {
                    // Step 2: Get messages for each conversation
                    const messages = await this.getMessagesForConversation(conv.id, sinceMs);

                    for (const msg of messages) {
                        // Filter: only messages from users (not from page itself)
                        if (msg.from.id === this.pageId) {
                            continue;
                        }

                        const timestampMs = new Date(msg.created_time).getTime();

                        // Filter: only messages after sinceMs
                        if (timestampMs <= sinceMs) {
                            continue;
                        }

                        allMessages.push({
                            channel: this.channel,
                            threadId: conv.id,
                            messageId: msg.id,
                            fromUserId: msg.from.id,
                            fromName: msg.from.name,
                            text: msg.message ?? "",
                            timestampMs,
                            raw: msg,
                        });
                    }
                } catch (convErr) {
                    console.error(`[FacebookConnector] Failed to get messages for conversation ${conv.id}:`, convErr);
                    // Continue with other conversations
                }
            }

            // Sort by timestamp ascending
            allMessages.sort((a, b) => a.timestampMs - b.timestampMs);

            if (allMessages.length > 0) {
                console.log(`[FacebookConnector] Fetched ${allMessages.length} new messages since ${new Date(sinceMs).toISOString()}`);
            }

        } catch (err) {
            console.error("[FacebookConnector] Failed to fetch messages:", err);
            // Return empty array, don't crash
        }

        return allMessages;
    }

    async sendReply(threadId: string, text: string): Promise<void> {
        try {
            const url = `${GRAPH_API_BASE}/${threadId}/messages`;
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    message: text,
                    access_token: this.pageAccessToken,
                }),
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`Failed to send reply: ${response.status} ${errorBody}`);
            }

            const result = await response.json();
            console.log(`[FacebookConnector] REPLY sent to ${threadId}, message_id: ${result.id}`);

        } catch (err) {
            console.error(`[FacebookConnector] Failed to send reply to ${threadId}:`, err);
            throw err;
        }
    }

    private async getConversations(): Promise<FacebookConversation[]> {
        const url = `${GRAPH_API_BASE}/${this.pageId}/conversations?` +
            `fields=id,updated_time,participants` +
            `&access_token=${this.pageAccessToken}` +
            `&limit=50`;

        const response = await fetch(url);

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Failed to get conversations: ${response.status} ${errorBody}`);
        }

        const data = await response.json();
        return data.data ?? [];
    }

    private async getMessagesForConversation(conversationId: string, sinceMs: number): Promise<FacebookMessage[]> {
        // Use 'since' parameter if supported, otherwise filter in code
        const sinceUnix = Math.floor(sinceMs / 1000);

        const url = `${GRAPH_API_BASE}/${conversationId}/messages?` +
            `fields=id,message,created_time,from` +
            `&access_token=${this.pageAccessToken}` +
            `&limit=25`;

        const response = await fetch(url);

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Failed to get messages: ${response.status} ${errorBody}`);
        }

        const data = await response.json();
        return data.data ?? [];
    }
}
