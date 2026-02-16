import { withRetry } from '../../../src/llm/retry';
import { LLMClassificationError } from '../../../src/llm/client';
import { LLMConfig } from '../../../src/llm/types';
import { Language, CruiseStats } from '../../../src/types';

describe('LLM Infrastructure', () => {
  describe('withRetry', () => {
    it('should return result on first success', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      
      const result = await withRetry(fn, 3, 10);
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('Attempt 1'))
        .mockRejectedValueOnce(new Error('Attempt 2'))
        .mockResolvedValue('success');

      const result = await withRetry(fn, 3, 10);
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should throw error after max retries', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Persistent failure'));

      await expect(withRetry(fn, 2, 10))
        .rejects.toThrow('Persistent failure');

      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should handle non-Error exceptions', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce('string error')
        .mockResolvedValue('success');

      const result = await withRetry(fn, 3, 10);
      expect(result).toBe('success');
    });

    it('should use default parameters', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      
      const result = await withRetry(fn);
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('LLMClassificationError', () => {
    it('should have correct name', () => {
      const error = new LLMClassificationError('Test error');
      expect(error.name).toBe('LLMClassificationError');
      expect(error.message).toBe('Test error');
    });
  });

  describe('LLMConfig type', () => {
    it('should accept valid config', () => {
      const config: LLMConfig = {
        apiKey: 'test-key',
        baseUrl: 'https://api.test.com',
        model: 'gpt-4o-mini',
        timeoutMs: 30000,
        retryCount: 3,
        fallbackEnabled: true,
      };
      
      expect(config.apiKey).toBe('test-key');
      expect(config.timeoutMs).toBe(30000);
    });
  });

  describe('CruiseStats type', () => {
    it('should accept valid stats', () => {
      const stats: CruiseStats = {
        total: 100,
        categories: {
          payment: 40,
          refund: 10,
          bug: 20,
          ban_appeal: 15,
          abuse: 5,
          general: 10,
        },
        languages: {
          'zh-CN': 80,
          'en': 15,
          'ja': 5,
        },
        highPriority: 25,
      };
      
      expect(stats.total).toBe(100);
      expect(stats.categories.payment).toBe(40);
    });
  });
});
