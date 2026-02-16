/**
 * SDK Backend Connector Unit Tests
 * 
 * Comprehensive test coverage for SDKBackendConnector
 * 
 * @module tests/unit/sdk-backend
 */

import { SDKBackendConnector } from "../../src/connectors/sdk-backend";

// Mock fetch globally before importing the module
const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

describe("SDKBackendConnector", () => {
    const mockToken = "test-token-123";
    const mockBaseUrl = "https://api.test.com";
    const mockGameId = 123;
    const mockPkgId = 456;

    let connector: SDKBackendConnector;

    beforeEach(() => {
        jest.clearAllMocks();
        connector = new SDKBackendConnector(mockToken, mockBaseUrl, mockGameId, mockPkgId);
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    describe("constructor", () => {
        it("should initialize with correct channel property", () => {
            expect(connector.channel).toBe("sdk_backend");
        });

        it("should initialize without optional gameId and pkgId", () => {
            const minimalConnector = new SDKBackendConnector(mockToken, mockBaseUrl);
            expect(minimalConnector.channel).toBe("sdk_backend");
        });
    });

    describe("fetchNewMessages", () => {
        it("should return empty array when no tickets found", async () => {
            // Mock empty ticket list response
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({ data: { list: [], total: 0 } }),
            });

            const result = await connector.fetchNewMessages(0);

            expect(result).toEqual([]);
            expect(mockFetch).toHaveBeenCalledTimes(1);
        });

        it("should handle 401 token expired error with specific message", async () => {
            // Mock 401 response for ticket list
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 401,
                text: async () => "Unauthorized",
            });

            await expect(connector.fetchNewMessages(0)).rejects.toThrow(
                "[SDK-BACKEND] Token expired. Please update SDK_BACKEND_TOKEN in .env and restart."
            );
        });

        it("should build correct URL with gameid and pkgid params", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({ data: { list: [], total: 0 } }),
            });

            await connector.fetchNewMessages(0);

            const callUrl = mockFetch.mock.calls[0][0];
            expect(callUrl).toContain("gameid=123");
            expect(callUrl).toContain("pkgid=456");
            expect(callUrl).toContain("page=1");
            expect(callUrl).toContain("pageSize=50");
        });

        it("should build URL without gameid and pkgid when not provided", async () => {
            const minimalConnector = new SDKBackendConnector(mockToken, mockBaseUrl);
            
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({ data: { list: [], total: 0 } }),
            });

            await minimalConnector.fetchNewMessages(0);

            const callUrl = mockFetch.mock.calls[0][0];
            expect(callUrl).not.toContain("gameid=");
            expect(callUrl).not.toContain("pkgid=");
            expect(callUrl).toContain("page=1");
            expect(callUrl).toContain("pageSize=50");
        });

        it("should NEVER include 'give' parameter in chatlist API", async () => {
            // Mock ticket list response with one ticket
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    data: {
                        list: [{ id: 1, status: 0, uid: "user123" }],
                        total: 1,
                    },
                }),
            });

            // Mock chat messages response
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    data: [],
                    total: 0,
                }),
            });

            await connector.fetchNewMessages(0);

            // Check the second call (chatlist endpoint)
            const chatlistUrl = mockFetch.mock.calls[1][0];
            expect(chatlistUrl).not.toContain("give=");
            expect(chatlistUrl).toContain("id=1");
        });

        it("should return messages with correct MessageEvent structure", async () => {
            const now = new Date();
            const sinceMs = now.getTime() - 3600000; // 1 hour ago

            // Mock ticket list response
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    data: {
                        list: [{ id: 1, status: 0, uid: "user123" }],
                        total: 1,
                    },
                }),
            });

            // Mock chat messages response
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    data: [
                        {
                            id: 101,
                            topic_id: 1,
                            content: "Test message content",
                            from_uid: "user123",
                            created_at: new Date(sinceMs + 1000).toISOString(),
                        },
                    ],
                    total: 1,
                }),
            });

            const result = await connector.fetchNewMessages(sinceMs);

            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({
                channel: "sdk_backend",
                threadId: "1",
                messageId: "101",
                fromUserId: "user123",
                fromName: "User(user123)",
                text: "Test message content",
            });
            expect(result[0].timestampMs).toBeDefined();
            const raw = result[0].raw as { ticket: unknown; message: unknown };
            expect(raw.ticket).toBeDefined();
            expect(raw.message).toBeDefined();
        });

        it("should filter messages before sinceMs", async () => {
            const now = new Date();
            const sinceMs = now.getTime();

            // Mock ticket list response
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    data: {
                        list: [{ id: 1, status: 0, uid: "user123" }],
                        total: 1,
                    },
                }),
            });

            // Mock chat messages with old timestamp (1 hour ago)
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    data: [
                        {
                            id: 101,
                            topic_id: 1,
                            content: "Old message",
                            from_uid: "user123",
                            created_at: new Date(sinceMs - 3600000).toISOString(),
                        },
                    ],
                    total: 1,
                }),
            });

            const result = await connector.fetchNewMessages(sinceMs);

            expect(result).toEqual([]);
        });

        it("should identify support agent messages correctly", async () => {
            const now = new Date();
            const sinceMs = now.getTime() - 3600000;

            // Mock ticket list response
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    data: {
                        list: [{ id: 1, status: 0, uid: "user123" }],
                        total: 1,
                    },
                }),
            });

            // Mock chat messages with support response (different from ticket uid)
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    data: [
                        {
                            id: 101,
                            topic_id: 1,
                            content: "Support reply message",
                            from_uid: "support_agent_1",
                            created_at: new Date(sinceMs + 1000).toISOString(),
                        },
                    ],
                    total: 1,
                }),
            });

            const result = await connector.fetchNewMessages(sinceMs);

            expect(result).toHaveLength(1);
            expect(result[0].fromName).toBe("Support");
        });

        it("should sort messages by timestamp ascending", async () => {
            const now = new Date();
            const sinceMs = now.getTime() - 3600000;

            // Mock ticket list response
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    data: {
                        list: [{ id: 1, status: 0, uid: "user123" }],
                        total: 1,
                    },
                }),
            });

            // Mock chat messages with out-of-order timestamps
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    data: [
                        {
                            id: 103,
                            topic_id: 1,
                            content: "Third message",
                            from_uid: "user123",
                            created_at: new Date(sinceMs + 3000).toISOString(),
                        },
                        {
                            id: 101,
                            topic_id: 1,
                            content: "First message",
                            from_uid: "user123",
                            created_at: new Date(sinceMs + 1000).toISOString(),
                        },
                        {
                            id: 102,
                            topic_id: 1,
                            content: "Second message",
                            from_uid: "user123",
                            created_at: new Date(sinceMs + 2000).toISOString(),
                        },
                    ],
                    total: 3,
                }),
            });

            const result = await connector.fetchNewMessages(sinceMs);

            expect(result).toHaveLength(3);
            expect(result[0].messageId).toBe("101");
            expect(result[1].messageId).toBe("102");
            expect(result[2].messageId).toBe("103");
        });

        it("should continue processing other tickets when one fails", async () => {
            const now = new Date();
            const sinceMs = now.getTime() - 3600000;

            // Mock ticket list response with two tickets
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    data: {
                        list: [
                            { id: 1, status: 0, uid: "user1" },
                            { id: 2, status: 0, uid: "user2" },
                        ],
                        total: 2,
                    },
                }),
            });

            // First ticket fails with 500
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                text: async () => "Server Error",
            });

            // Second ticket succeeds
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    data: [
                        {
                            id: 201,
                            topic_id: 2,
                            content: "Message from ticket 2",
                            from_uid: "user2",
                            created_at: new Date(sinceMs + 1000).toISOString(),
                        },
                    ],
                    total: 1,
                }),
            });

            const result = await connector.fetchNewMessages(sinceMs);

            expect(result).toHaveLength(1);
            expect(result[0].threadId).toBe("2");
        });

        it("should handle API errors gracefully and return empty array", async () => {
            // Mock general API error (non-401)
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                text: async () => "Internal Server Error",
            });

            const result = await connector.fetchNewMessages(0);

            expect(result).toEqual([]);
        });

        it("should handle multiple tickets correctly", async () => {
            const now = new Date();
            const sinceMs = now.getTime() - 3600000;

            // Mock ticket list with multiple tickets
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    data: {
                        list: [
                            { id: 1, status: 0, uid: "user1" },
                            { id: 2, status: 1, uid: "user2" },
                        ],
                        total: 2,
                    },
                }),
            });

            // Messages for ticket 1
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    data: [
                        {
                            id: 101,
                            topic_id: 1,
                            content: "Ticket 1 message",
                            from_uid: "user1",
                            created_at: new Date(sinceMs + 1000).toISOString(),
                        },
                    ],
                    total: 1,
                }),
            });

            // Messages for ticket 2
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    data: [
                        {
                            id: 201,
                            topic_id: 2,
                            content: "Ticket 2 message",
                            from_uid: "user2",
                            created_at: new Date(sinceMs + 2000).toISOString(),
                        },
                    ],
                    total: 1,
                }),
            });

            const result = await connector.fetchNewMessages(sinceMs);

            expect(result).toHaveLength(2);
            expect(result.map(m => m.threadId)).toContain("1");
            expect(result.map(m => m.threadId)).toContain("2");
        });
    });

    describe("sendReply", () => {
        it("should throw read-only error", async () => {
            await expect(connector.sendReply("123", "Test reply")).rejects.toThrow(
                "SDK Backend reply API not available — read-only mode"
            );
        });
    });

    describe("Authorization header", () => {
        it("should include correct Authorization header with Bearer token", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({ data: { list: [], total: 0 } }),
            });

            await connector.fetchNewMessages(0);

            const callOptions = mockFetch.mock.calls[0][1];
            expect(callOptions.headers).toMatchObject({
                Authorization: `Bearer ${mockToken}`,
                Accept: "application/json",
            });
        });
    });

    describe("URL construction", () => {
        it("should construct correct ticket list URL", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({ data: { list: [], total: 0 } }),
            });

            await connector.fetchNewMessages(0);

            const callUrl = mockFetch.mock.calls[0][0];
            expect(callUrl).toBe(
                `${mockBaseUrl}/service/ChatTopic/all?page=1&pageSize=50&gameid=123&pkgid=456`
            );
        });

        it("should construct correct chatlist URL", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    data: {
                        list: [{ id: 42, status: 0, uid: "user123" }],
                        total: 1,
                    },
                }),
            });

            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({ data: [], total: 0 }),
            });

            await connector.fetchNewMessages(0);

            const chatlistUrl = mockFetch.mock.calls[1][0];
            expect(chatlistUrl).toBe(`${mockBaseUrl}/service/ChatTopic/chatlist?id=42`);
        });
    });
});
