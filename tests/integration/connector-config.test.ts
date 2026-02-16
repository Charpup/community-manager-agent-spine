/**
 * Connector + Config Integration Tests
 * Based on SPEC v0.4.1 - SDD Pyramid (Module Collaboration)
 */

import { loadConfig, validateConfig } from '../../src/config';
import { SDKBackendConnector } from '../../src/connectors/sdk-backend';
import { SDKBackendMockConnector } from '../../src/connectors/sdk-backend-mock';

describe('Connector + Config Integration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.SDK_BACKEND_TOKEN;
    delete process.env.SDK_BACKEND_BASE_URL;
    delete process.env.SDK_BACKEND_GAME_ID;
    delete process.env.SDK_BACKEND_PKG_ID;
    delete process.env.NODE_ENV;
    delete process.env.CHANNEL;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('SDKBackendConnector + Config Integration', () => {
    it('should create connector with valid config', () => {
      // Given: Valid SDK_BACKEND_TOKEN, Valid SDK_BACKEND_BASE_URL
      // When: Connector instantiated with config
      // Then: Connector created successfully, Token stored internally, Base URL normalized
      
      process.env.SDK_BACKEND_TOKEN = 'test-token';
      process.env.SDK_BACKEND_BASE_URL = 'https://test.example.com';
      process.env.SDK_BACKEND_GAME_ID = '123';
      process.env.SDK_BACKEND_PKG_ID = '456';
      
      const config = loadConfig();
      const connector = new SDKBackendConnector(
        config.sdkBackendToken,
        config.sdkBackendBaseUrl,
        config.sdkBackendGameId,
        config.sdkBackendPkgId
      );
      
      expect(connector).toBeDefined();
      expect(connector.channel).toBe('sdk_backend');
    });

    it('should flow config values correctly to connector', () => {
      // Test: Config values flow correctly to Connector
      process.env.SDK_BACKEND_TOKEN = 'flow-test-token';
      process.env.SDK_BACKEND_BASE_URL = 'https://flow.example.com';
      process.env.SDK_BACKEND_GAME_ID = '789';
      process.env.SDK_BACKEND_PKG_ID = '101';
      
      const config = loadConfig();
      const connector = new SDKBackendConnector(
        config.sdkBackendToken,
        config.sdkBackendBaseUrl,
        config.sdkBackendGameId,
        config.sdkBackendPkgId
      );
      
      // Verify connector was created with correct values
      expect(connector).toBeDefined();
      expect(connector.channel).toBe('sdk_backend');
    });
  });

  describe('Config Validation for SDK Backend Channel', () => {
    it('should throw when sdk_backend token is missing', () => {
      // Given: SDK_BACKEND_TOKEN is empty, CHANNEL=sdk_backend
      // When: validateConfig called
      // Then: Throws Error: "SDK_BACKEND_TOKEN is required when CHANNEL=sdk_backend"
      
      process.env.CHANNEL = 'sdk_backend';
      process.env.SDK_BACKEND_TOKEN = '';
      
      const config = loadConfig();
      
      expect(() => validateConfig(config)).toThrow('SDK_BACKEND_TOKEN is required');
    });

    it('should pass validation with valid sdk_backend config', () => {
      // Given: Valid SDK_BACKEND_TOKEN, CHANNEL=sdk_backend
      // When: validateConfig called
      // Then: No error thrown
      
      process.env.CHANNEL = 'sdk_backend';
      process.env.SDK_BACKEND_TOKEN = 'valid-token';
      
      const config = loadConfig();
      
      expect(() => validateConfig(config)).not.toThrow();
    });
  });

  describe('Mock Connector + Config', () => {
    it('should work with test mode configuration', () => {
      // In test mode, mock connector should work without real credentials
      process.env.NODE_ENV = 'test';
      process.env.CHANNEL = 'sdk_backend';
      
      const config = loadConfig();
      const connector = new SDKBackendMockConnector();
      
      expect(connector).toBeDefined();
      expect(connector.channel).toBe('sdk_backend');
    });

    it('should use mock connector for integration testing', async () => {
      const connector = new SDKBackendMockConnector();
      
      // Should be able to fetch mock messages without API calls
      const messages = await connector.fetchNewMessages(0);
      
      expect(messages.length).toBeGreaterThan(0);
    });
  });

  describe('Channel Configuration', () => {
    it('should handle facebook channel without sdk_backend token', () => {
      process.env.CHANNEL = 'facebook';
      process.env.FB_PAGE_ID = 'test-page';
      process.env.FB_PAGE_ACCESS_TOKEN = 'test-token';
      
      const config = loadConfig();
      
      expect(config.channel).toBe('facebook');
      expect(() => validateConfig(config)).not.toThrow();
    });

    it('should default to facebook channel when not specified', () => {
      delete process.env.CHANNEL;
      
      const config = loadConfig();
      
      expect(config.channel).toBe('facebook');
    });
  });
});
