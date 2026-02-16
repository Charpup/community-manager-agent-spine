import { categoryKeywords, getKeywordsForCategory, classifyWithKeywords } from '../../../src/i18n/keywords';
import { Category, Language } from '../../../src/types';

describe('keywords', () => {
  describe('categoryKeywords', () => {
    it('should have all 6 categories', () => {
      const categories = Object.keys(categoryKeywords) as Category[];
      expect(categories).toContain('payment');
      expect(categories).toContain('refund');
      expect(categories).toContain('bug');
      expect(categories).toContain('ban_appeal');
      expect(categories).toContain('abuse');
      expect(categories).toContain('general');
      expect(categories.length).toBe(6);
    });

    it('should have all 7 languages for each category (including unknown)', () => {
      const expectedLanguages: Language[] = ['zh-CN', 'zh-TW', 'en', 'ja', 'ko', 'es', 'unknown'];
      
      for (const category of Object.keys(categoryKeywords) as Category[]) {
        const languages = Object.keys(categoryKeywords[category]) as Language[];
        for (const lang of expectedLanguages) {
          expect(languages).toContain(lang);
        }
        expect(languages.length).toBe(7);
      }
    });

    it('should have non-empty keyword arrays', () => {
      for (const category of Object.keys(categoryKeywords) as Category[]) {
        for (const language of Object.keys(categoryKeywords[category]) as Language[]) {
          expect(categoryKeywords[category][language].length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('getKeywordsForCategory', () => {
    it('should return correct keywords for payment/zh-CN', () => {
      const keywords = getKeywordsForCategory('payment', 'zh-CN');
      expect(keywords).toContain('充值');
      expect(keywords).toContain('支付');
      expect(keywords).toContain('到账');
    });

    it('should return correct keywords for refund/en', () => {
      const keywords = getKeywordsForCategory('refund', 'en');
      expect(keywords).toContain('refund');
      expect(keywords).toContain('money back');
    });

    it('should return correct keywords for bug/ja', () => {
      const keywords = getKeywordsForCategory('bug', 'ja');
      expect(keywords).toContain('クラッシュ');
      expect(keywords).toContain('バグ');
    });

    it('should return correct keywords for ban_appeal/ko', () => {
      const keywords = getKeywordsForCategory('ban_appeal', 'ko');
      expect(keywords).toContain('밴');
      expect(keywords).toContain('정지');
    });

    it('should return correct keywords for abuse/es', () => {
      const keywords = getKeywordsForCategory('abuse', 'es');
      expect(keywords).toContain('reportar');
      expect(keywords).toContain('trampa');
    });

    it('should return correct keywords for general/zh-TW', () => {
      const keywords = getKeywordsForCategory('general', 'zh-TW');
      expect(keywords).toContain('問題');
      expect(keywords).toContain('客服');
    });

    it('should throw error for invalid category', () => {
      expect(() => getKeywordsForCategory('invalid' as Category, 'en')).toThrow();
    });

    it('should throw error for invalid language', () => {
      expect(() => getKeywordsForCategory('payment', 'invalid' as Language)).toThrow();
    });
  });

  describe('classifyWithKeywords', () => {
    it('should return 1.0 when all keywords match', () => {
      const content = '充值支付付款扣费到账充值失败没到账';
      const confidence = classifyWithKeywords(content, 'payment', 'zh-CN');
      expect(confidence).toBe(1.0);
    });

    it('should return 0.0 when no keywords match', () => {
      const content = 'hello world this is random text';
      const confidence = classifyWithKeywords(content, 'payment', 'zh-CN');
      expect(confidence).toBe(0.0);
    });

    it('should return correct confidence for partial match', () => {
      const content = 'I want a refund please';
      const confidence = classifyWithKeywords(content, 'refund', 'en');
      // 'refund' matches, so at least 1 out of 4 keywords
      expect(confidence).toBeGreaterThan(0);
      expect(confidence).toBeLessThanOrEqual(1.0);
    });

    it('should be case insensitive', () => {
      const content = 'REFUND Money Back';
      const confidence = classifyWithKeywords(content, 'refund', 'en');
      expect(confidence).toBeGreaterThan(0);
    });

    it('should handle Japanese keywords correctly', () => {
      const content = 'ゲームがクラッシュしてしまいました';
      const confidence = classifyWithKeywords(content, 'bug', 'ja');
      expect(confidence).toBeGreaterThan(0);
    });

    it('should handle Korean keywords correctly', () => {
      const content = '결제가 안됩니다';
      const confidence = classifyWithKeywords(content, 'payment', 'ko');
      expect(confidence).toBeGreaterThan(0);
    });

    it('should handle Spanish keywords correctly', () => {
      const content = 'Necesito un reembolso';
      const confidence = classifyWithKeywords(content, 'refund', 'es');
      expect(confidence).toBeGreaterThan(0);
    });

    it('should throw error for invalid category', () => {
      expect(() => classifyWithKeywords('test', 'invalid' as Category, 'en')).toThrow();
    });

    it('should throw error for invalid language', () => {
      expect(() => classifyWithKeywords('test', 'payment', 'invalid' as Language)).toThrow();
    });
  });
});
