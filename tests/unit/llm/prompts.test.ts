import { buildClassifyPrompt, buildTrendAnalysisPrompt } from '../../../src/llm/prompts';

describe('prompts', () => {
  describe('buildClassifyPrompt', () => {
    it('should include all 6 categories', () => {
      const prompt = buildClassifyPrompt('test', 'zh-CN');
      expect(prompt).toContain('payment');
      expect(prompt).toContain('refund');
      expect(prompt).toContain('bug');
      expect(prompt).toContain('ban_appeal');
      expect(prompt).toContain('abuse');
      expect(prompt).toContain('general');
    });

    it('should include content', () => {
      const prompt = buildClassifyPrompt('充值失败', 'zh-CN');
      expect(prompt).toContain('充值失败');
    });

    it('should use Chinese examples for zh-CN', () => {
      const prompt = buildClassifyPrompt('test', 'zh-CN');
      expect(prompt).toContain('充值了但没到账');
    });

    it('should use English examples for en', () => {
      const prompt = buildClassifyPrompt('test', 'en');
      expect(prompt).toContain('payment failed');
    });

    it('should escape special characters', () => {
      const prompt = buildClassifyPrompt('{"hack": true}', 'zh-CN');
      // Should not break JSON
      expect(prompt).toBeDefined();
    });

    it('should truncate very long content', () => {
      const longContent = 'a'.repeat(5000);
      const prompt = buildClassifyPrompt(longContent, 'zh-CN');
      expect(prompt.length).toBeLessThan(3000);
    });
  });

  describe('buildTrendAnalysisPrompt', () => {
    it('should include stats', () => {
      const stats = {
        total: 100,
        categories: { payment: 50, refund: 30, bug: 20, ban_appeal: 0, abuse: 0, general: 0 },
        languages: { 'zh-CN': 60, 'en': 40, 'zh-TW': 0, 'ja': 0, 'ko': 0, 'es': 0, 'unknown': 0 },
        highPriority: 10
      };
      const prompt = buildTrendAnalysisPrompt(stats, '2024-01-01 to 2024-01-31');
      expect(prompt).toContain('100');
      expect(prompt).toContain('payment');
      expect(prompt).toContain('高优先级');
    });

    it('should include time range', () => {
      const prompt = buildTrendAnalysisPrompt({
        total: 10,
        categories: { payment: 0, refund: 0, bug: 0, ban_appeal: 0, abuse: 0, general: 10 },
        languages: { 'zh-CN': 0, 'zh-TW': 0, 'en': 0, 'ja': 0, 'ko': 0, 'es': 0, 'unknown': 10 },
        highPriority: 0
      }, 'Last 24 hours');
      expect(prompt).toContain('Last 24 hours');
    });
  });
});
