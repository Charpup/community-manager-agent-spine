/**
 * @fileoverview Unit tests for SDKBackendMockConnector
 * TDD-SDD: function_level_unit_tests → SDKBackendMockConnector
 */

import { SDKBackendMockConnector } from '../../src/connectors/sdk-backend-mock';

describe('SDKBackendMockConnector', () => {
  let connector: SDKBackendMockConnector;

  beforeEach(() => {
    connector = new SDKBackendMockConnector();
  });

  describe('constructor', () => {
    it('should initialize with sdk_backend channel', () => {
      expect(connector).toBeDefined();
      expect(connector.channel).toBe('sdk_backend');
    });
  });

  describe('fetchNewMessages', () => {
    it('should generate mock messages on first call', async () => {
      const messages = await connector.fetchNewMessages(0);

      expect(messages.length).toBeGreaterThan(0);
      expect(messages[0].channel).toBe('sdk_backend');
      expect(messages[0].threadId).toBeDefined();
      expect(messages[0].text).toBeDefined();
    });

    it('should return empty array when sinceMs is recent', async () => {
      // First call to initialize
      await connector.fetchNewMessages(0);

      // Second call with recent timestamp
      const recentTimestamp = Date.now();
      const messages = await connector.fetchNewMessages(recentTimestamp);

      expect(messages).toEqual([]);
    });

    it('should include Chinese language samples', async () => {
      const messages = await connector.fetchNewMessages(0);

      const chineseMessages = messages.filter(m =>
        /[\u4e00-\u9fa5]/.test(m.text)
      );

      expect(chineseMessages.length).toBeGreaterThan(0);
    });

    it('should include English language samples', async () => {
      const messages = await connector.fetchNewMessages(0);

      const englishMessages = messages.filter(m =>
        /^[\x00-\x7F]*$/.test(m.text) // ASCII only
      );

      expect(englishMessages.length).toBeGreaterThan(0);
    });

    it('should include payment category messages', async () => {
      const messages = await connector.fetchNewMessages(0);

      const hasPayment = messages.some(m =>
        m.text.toLowerCase().includes('充值') ||
        m.text.toLowerCase().includes('payment') ||
        m.text.toLowerCase().includes('paid')
      );

      expect(hasPayment).toBe(true);
    });

    it('should include refund category messages', async () => {
      const messages = await connector.fetchNewMessages(0);

      const hasRefund = messages.some(m =>
        m.text.includes('退款') ||
        m.text.toLowerCase().includes('refund')
      );

      expect(hasRefund).toBe(true);
    });

    it('should include bug category messages', async () => {
      const messages = await connector.fetchNewMessages(0);

      const hasBug = messages.some(m =>
        m.text.includes('闪退') ||
        m.text.toLowerCase().includes('crash')
      );

      expect(hasBug).toBe(true);
    });

    it('should return messages sorted by timestamp', async () => {
      const messages = await connector.fetchNewMessages(0);

      for (let i = 1; i < messages.length; i++) {
        expect(messages[i].timestampMs).toBeGreaterThanOrEqual(
          messages[i - 1].timestampMs
        );
      }
    });
  });

  describe('sendReply', () => {
    it('should record sent replies', async () => {
      await connector.sendReply('ticket-123', 'Test reply message');

      expect(connector.sentReplies).toHaveLength(1);
      expect(connector.sentReplies[0].threadId).toBe('ticket-123');
      expect(connector.sentReplies[0].text).toBe('Test reply message');
    });

    it('should store multiple replies', async () => {
      await connector.sendReply('ticket-1', 'Reply 1');
      await connector.sendReply('ticket-2', 'Reply 2');

      expect(connector.sentReplies).toHaveLength(2);
    });
  });

  describe('pushMessage', () => {
    it('should allow injecting custom messages', async () => {
      connector.pushMessage({
        threadId: 'custom-ticket',
        fromUserId: 'custom-user',
        text: 'Custom test message',
      });

      const messages = await connector.fetchNewMessages(0);

      const customMessage = messages.find(
        m => m.text === 'Custom test message'
      );

      expect(customMessage).toBeDefined();
      expect(customMessage?.threadId).toBe('custom-ticket');
    });
  });
});
