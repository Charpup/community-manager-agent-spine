import { loadConfig, validateConfig, Config, ConfigValidationError } from '../../src/config';

describe('Config Module', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        // Reset environment variables before each test
        process.env = { ...originalEnv };
    });

    afterAll(() => {
        // Restore original environment
        process.env = originalEnv;
    });

    describe('loadConfig', () => {
        it('should load default configuration correctly', () => {
            // Clear environment variables to test defaults
            delete process.env.FB_PAGE_ID;
            delete process.env.FB_PAGE_ACCESS_TOKEN;
            delete process.env.SDK_BACKEND_TOKEN;
            delete process.env.SDK_BACKEND_BASE_URL;
            delete process.env.SDK_BACKEND_POLL_INTERVAL_MS;
            delete process.env.POLL_INTERVAL_MS;
            delete process.env.SQLITE_PATH;
            delete process.env.CHANNEL;
            process.env.NODE_ENV = 'production';

            const config = loadConfig();

            expect(config.fbPageId).toBe('');
            expect(config.fbPageAccessToken).toBe('');
            expect(config.sdkBackendToken).toBe('');
            expect(config.sdkBackendBaseUrl).toBe('https://xyhy-admin.xiaoyuehy.com');
            expect(config.sdkBackendPollIntervalMs).toBe(30000);
            expect(config.pollIntervalMs).toBe(15000);
            expect(config.sqlitePath).toBe('./data/cm_agent.sqlite');
            expect(config.isTestMode).toBe(false);
            expect(config.channel).toBe('facebook');
            expect(config.sdkBackendGameId).toBeUndefined();
            expect(config.sdkBackendPkgId).toBeUndefined();
        });

        it('should load test mode configuration correctly', () => {
            process.env.NODE_ENV = 'test';
            delete process.env.FB_PAGE_ID;
            delete process.env.FB_PAGE_ACCESS_TOKEN;

            const config = loadConfig();

            expect(config.isTestMode).toBe(true);
            expect(config.fbPageId).toBe('test_page_id');
            expect(config.fbPageAccessToken).toBe('test_token');
        });

        it('should load custom environment variables correctly', () => {
            process.env.NODE_ENV = 'production';
            process.env.FB_PAGE_ID = 'custom_page_id';
            process.env.FB_PAGE_ACCESS_TOKEN = 'custom_access_token';
            process.env.SDK_BACKEND_TOKEN = 'custom_sdk_token';
            process.env.SDK_BACKEND_BASE_URL = 'https://custom.backend.com';
            process.env.SDK_BACKEND_POLL_INTERVAL_MS = '45000';
            process.env.SDK_BACKEND_GAME_ID = '123';
            process.env.SDK_BACKEND_PKG_ID = '456';
            process.env.POLL_INTERVAL_MS = '20000';
            process.env.SQLITE_PATH = '/custom/path/db.sqlite';
            process.env.CHANNEL = 'sdk_backend';

            const config = loadConfig();

            expect(config.fbPageId).toBe('custom_page_id');
            expect(config.fbPageAccessToken).toBe('custom_access_token');
            expect(config.sdkBackendToken).toBe('custom_sdk_token');
            expect(config.sdkBackendBaseUrl).toBe('https://custom.backend.com');
            expect(config.sdkBackendPollIntervalMs).toBe(45000);
            expect(config.sdkBackendGameId).toBe(123);
            expect(config.sdkBackendPkgId).toBe(456);
            expect(config.pollIntervalMs).toBe(20000);
            expect(config.sqlitePath).toBe('/custom/path/db.sqlite');
            expect(config.channel).toBe('sdk_backend');
        });

        it('should load mock_channel as channel', () => {
            process.env.NODE_ENV = 'production';
            process.env.CHANNEL = 'mock_channel';

            const config = loadConfig();

            expect(config.channel).toBe('mock_channel');
        });
    });

    describe('validateConfig', () => {
        it('should pass with valid facebook channel config', () => {
            const config: Config = {
                fbPageId: 'valid_page_id',
                fbPageAccessToken: 'valid_token',
                sdkBackendToken: '',
                sdkBackendBaseUrl: 'https://xyhy-admin.xiaoyuehy.com',
                sdkBackendPollIntervalMs: 30000,
                pollIntervalMs: 15000,
                sqlitePath: './data/cm_agent.sqlite',
                isTestMode: false,
                channel: 'facebook',
                cruiseIntervalMs: 300000,
                cruiseReportLanguage: 'zh-CN',
                cruiseBatchSize: 100,
            };

            expect(() => validateConfig(config)).not.toThrow();
        });

        it('should pass with valid sdk_backend channel config', () => {
            const config: Config = {
                fbPageId: '',
                fbPageAccessToken: '',
                sdkBackendToken: 'valid_sdk_token',
                sdkBackendBaseUrl: 'https://xyhy-admin.xiaoyuehy.com',
                sdkBackendPollIntervalMs: 30000,
                pollIntervalMs: 15000,
                sqlitePath: './data/cm_agent.sqlite',
                isTestMode: false,
                channel: 'sdk_backend',
                cruiseIntervalMs: 300000,
                cruiseReportLanguage: 'zh-CN',
                cruiseBatchSize: 100,
            };

            expect(() => validateConfig(config)).not.toThrow();
        });

        it('should pass with valid mock_channel config', () => {
            const config: Config = {
                fbPageId: '',
                fbPageAccessToken: '',
                sdkBackendToken: '',
                sdkBackendBaseUrl: 'https://xyhy-admin.xiaoyuehy.com',
                sdkBackendPollIntervalMs: 30000,
                pollIntervalMs: 15000,
                sqlitePath: './data/cm_agent.sqlite',
                isTestMode: false,
                channel: 'mock_channel',
                cruiseIntervalMs: 300000,
                cruiseReportLanguage: 'zh-CN',
                cruiseBatchSize: 100,
            };

            expect(() => validateConfig(config)).not.toThrow();
        });

        it('should pass in test mode even with missing values', () => {
            const config: Config = {
                fbPageId: '',
                fbPageAccessToken: '',
                sdkBackendToken: '',
                sdkBackendBaseUrl: '',
                sdkBackendPollIntervalMs: 30000,
                pollIntervalMs: 15000,
                sqlitePath: './data/cm_agent.sqlite',
                isTestMode: true,
                channel: 'facebook',
                cruiseIntervalMs: 300000,
                cruiseReportLanguage: 'zh-CN',
                cruiseBatchSize: 100,
            };

            expect(() => validateConfig(config)).not.toThrow();
        });

        it('should pass with optional sdkBackendGameId and sdkBackendPkgId', () => {
            const config: Config = {
                fbPageId: '',
                fbPageAccessToken: '',
                sdkBackendToken: 'valid_token',
                sdkBackendBaseUrl: 'https://xyhy-admin.xiaoyuehy.com',
                sdkBackendPollIntervalMs: 30000,
                sdkBackendGameId: 123,
                sdkBackendPkgId: 456,
                pollIntervalMs: 15000,
                sqlitePath: './data/cm_agent.sqlite',
                isTestMode: false,
                channel: 'sdk_backend',
                cruiseIntervalMs: 300000,
                cruiseReportLanguage: 'zh-CN',
                cruiseBatchSize: 100,
            };

            expect(() => validateConfig(config)).not.toThrow();
        });
    });

    describe('validateConfig - error cases', () => {
        it('should throw ConfigValidationError for missing facebook credentials when channel=facebook', () => {
            const config: Config = {
                fbPageId: '',
                fbPageAccessToken: '',
                sdkBackendToken: '',
                sdkBackendBaseUrl: 'https://xyhy-admin.xiaoyuehy.com',
                sdkBackendPollIntervalMs: 30000,
                pollIntervalMs: 15000,
                sqlitePath: './data/cm_agent.sqlite',
                isTestMode: false,
                channel: 'facebook',
                cruiseIntervalMs: 300000,
                cruiseReportLanguage: 'zh-CN',
                cruiseBatchSize: 100,
            };

            expect(() => validateConfig(config)).toThrow(ConfigValidationError);
            expect(() => validateConfig(config)).toThrow('FB_PAGE_ID is required when CHANNEL=facebook');
        });

        it('should throw ConfigValidationError for missing fbPageAccessToken when channel=facebook', () => {
            const config: Config = {
                fbPageId: 'valid_page_id',
                fbPageAccessToken: '',
                sdkBackendToken: '',
                sdkBackendBaseUrl: 'https://xyhy-admin.xiaoyuehy.com',
                sdkBackendPollIntervalMs: 30000,
                pollIntervalMs: 15000,
                sqlitePath: './data/cm_agent.sqlite',
                isTestMode: false,
                channel: 'facebook',
                cruiseIntervalMs: 300000,
                cruiseReportLanguage: 'zh-CN',
                cruiseBatchSize: 100,
            };

            expect(() => validateConfig(config)).toThrow(ConfigValidationError);
            expect(() => validateConfig(config)).toThrow('FB_PAGE_ACCESS_TOKEN is required when CHANNEL=facebook');
        });

        it('should throw ConfigValidationError for missing sdk_backend token when channel=sdk_backend', () => {
            const config: Config = {
                fbPageId: '',
                fbPageAccessToken: '',
                sdkBackendToken: '',
                sdkBackendBaseUrl: 'https://xyhy-admin.xiaoyuehy.com',
                sdkBackendPollIntervalMs: 30000,
                pollIntervalMs: 15000,
                sqlitePath: './data/cm_agent.sqlite',
                isTestMode: false,
                channel: 'sdk_backend',
                cruiseIntervalMs: 300000,
                cruiseReportLanguage: 'zh-CN',
                cruiseBatchSize: 100,
            };

            expect(() => validateConfig(config)).toThrow(ConfigValidationError);
            expect(() => validateConfig(config)).toThrow('SDK_BACKEND_TOKEN is required when CHANNEL=sdk_backend');
        });

        it('should throw ConfigValidationError for missing sdk_backend baseUrl when channel=sdk_backend', () => {
            const config: Config = {
                fbPageId: '',
                fbPageAccessToken: '',
                sdkBackendToken: 'valid_token',
                sdkBackendBaseUrl: '',
                sdkBackendPollIntervalMs: 30000,
                pollIntervalMs: 15000,
                sqlitePath: './data/cm_agent.sqlite',
                isTestMode: false,
                channel: 'sdk_backend',
                cruiseIntervalMs: 300000,
                cruiseReportLanguage: 'zh-CN',
                cruiseBatchSize: 100,
            };

            expect(() => validateConfig(config)).toThrow(ConfigValidationError);
            expect(() => validateConfig(config)).toThrow('SDK_BACKEND_BASE_URL is required when CHANNEL=sdk_backend');
        });

        it('should throw ConfigValidationError for invalid pollIntervalMs', () => {
            const config: Config = {
                fbPageId: 'valid_page_id',
                fbPageAccessToken: 'valid_token',
                sdkBackendToken: '',
                sdkBackendBaseUrl: 'https://xyhy-admin.xiaoyuehy.com',
                sdkBackendPollIntervalMs: 30000,
                pollIntervalMs: NaN,
                sqlitePath: './data/cm_agent.sqlite',
                isTestMode: false,
                channel: 'facebook',
                cruiseIntervalMs: 300000,
                cruiseReportLanguage: 'zh-CN',
                cruiseBatchSize: 100,
            };

            expect(() => validateConfig(config)).toThrow(ConfigValidationError);
            expect(() => validateConfig(config)).toThrow('POLL_INTERVAL_MS must be a positive number');
        });

        it('should throw ConfigValidationError for zero pollIntervalMs', () => {
            const config: Config = {
                fbPageId: 'valid_page_id',
                fbPageAccessToken: 'valid_token',
                sdkBackendToken: '',
                sdkBackendBaseUrl: 'https://xyhy-admin.xiaoyuehy.com',
                sdkBackendPollIntervalMs: 30000,
                pollIntervalMs: 0,
                sqlitePath: './data/cm_agent.sqlite',
                isTestMode: false,
                channel: 'facebook',
                cruiseIntervalMs: 300000,
                cruiseReportLanguage: 'zh-CN',
                cruiseBatchSize: 100,
            };

            expect(() => validateConfig(config)).toThrow(ConfigValidationError);
            expect(() => validateConfig(config)).toThrow('POLL_INTERVAL_MS must be a positive number');
        });

        it('should throw ConfigValidationError for invalid sdkBackendPollIntervalMs', () => {
            const config: Config = {
                fbPageId: '',
                fbPageAccessToken: '',
                sdkBackendToken: 'valid_token',
                sdkBackendBaseUrl: 'https://xyhy-admin.xiaoyuehy.com',
                sdkBackendPollIntervalMs: NaN,
                pollIntervalMs: 15000,
                sqlitePath: './data/cm_agent.sqlite',
                isTestMode: false,
                channel: 'sdk_backend',
                cruiseIntervalMs: 300000,
                cruiseReportLanguage: 'zh-CN',
                cruiseBatchSize: 100,
            };

            expect(() => validateConfig(config)).toThrow(ConfigValidationError);
            expect(() => validateConfig(config)).toThrow('SDK_BACKEND_POLL_INTERVAL_MS must be a positive number');
        });

        it('should throw ConfigValidationError for negative sdkBackendPollIntervalMs', () => {
            const config: Config = {
                fbPageId: '',
                fbPageAccessToken: '',
                sdkBackendToken: 'valid_token',
                sdkBackendBaseUrl: 'https://xyhy-admin.xiaoyuehy.com',
                sdkBackendPollIntervalMs: -1000,
                pollIntervalMs: 15000,
                sqlitePath: './data/cm_agent.sqlite',
                isTestMode: false,
                channel: 'sdk_backend',
                cruiseIntervalMs: 300000,
                cruiseReportLanguage: 'zh-CN',
                cruiseBatchSize: 100,
            };

            expect(() => validateConfig(config)).toThrow(ConfigValidationError);
            expect(() => validateConfig(config)).toThrow('SDK_BACKEND_POLL_INTERVAL_MS must be a positive number');
        });

        it('should throw ConfigValidationError for invalid channel value', () => {
            const config: Config = {
                fbPageId: '',
                fbPageAccessToken: '',
                sdkBackendToken: '',
                sdkBackendBaseUrl: 'https://xyhy-admin.xiaoyuehy.com',
                sdkBackendPollIntervalMs: 30000,
                pollIntervalMs: 15000,
                sqlitePath: './data/cm_agent.sqlite',
                isTestMode: false,
                channel: 'invalid_channel' as any,
                cruiseIntervalMs: 300000,
                cruiseReportLanguage: 'zh-CN',
                cruiseBatchSize: 100,
            };

            expect(() => validateConfig(config)).toThrow(ConfigValidationError);
            expect(() => validateConfig(config)).toThrow("Invalid CHANNEL 'invalid_channel'");
        });

        it('should report multiple validation errors at once', () => {
            const config: Config = {
                fbPageId: '',
                fbPageAccessToken: '',
                sdkBackendToken: '',
                sdkBackendBaseUrl: '',
                sdkBackendPollIntervalMs: NaN,
                pollIntervalMs: NaN,
                sqlitePath: './data/cm_agent.sqlite',
                isTestMode: false,
                channel: 'sdk_backend',
                cruiseIntervalMs: 300000,
                cruiseReportLanguage: 'zh-CN',
                cruiseBatchSize: 100,
            };

            expect(() => validateConfig(config)).toThrow(ConfigValidationError);
            
            try {
                validateConfig(config);
            } catch (error: any) {
                expect(error.message).toContain('SDK_BACKEND_TOKEN is required when CHANNEL=sdk_backend');
                expect(error.message).toContain('SDK_BACKEND_BASE_URL is required when CHANNEL=sdk_backend');
                expect(error.message).toContain('POLL_INTERVAL_MS must be a positive number');
                expect(error.message).toContain('SDK_BACKEND_POLL_INTERVAL_MS must be a positive number');
            }
        });
    });

    describe('validateConfig - warnings', () => {
        let consoleWarnSpy: jest.SpyInstance;

        beforeEach(() => {
            consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
        });

        afterEach(() => {
            consoleWarnSpy.mockRestore();
        });

        it('should warn when pollIntervalMs is very low', () => {
            const config: Config = {
                fbPageId: 'valid_page_id',
                fbPageAccessToken: 'valid_token',
                sdkBackendToken: '',
                sdkBackendBaseUrl: 'https://xyhy-admin.xiaoyuehy.com',
                sdkBackendPollIntervalMs: 30000,
                pollIntervalMs: 4000,
                sqlitePath: './data/cm_agent.sqlite',
                isTestMode: false,
                channel: 'facebook',
                cruiseIntervalMs: 300000,
                cruiseReportLanguage: 'zh-CN',
                cruiseBatchSize: 100,
            };

            validateConfig(config);

            expect(consoleWarnSpy).toHaveBeenCalledWith('[Config] pollIntervalMs is very low, may hit rate limits');
        });

        it('should warn when sdkBackendPollIntervalMs is very low', () => {
            const config: Config = {
                fbPageId: '',
                fbPageAccessToken: '',
                sdkBackendToken: 'valid_token',
                sdkBackendBaseUrl: 'https://xyhy-admin.xiaoyuehy.com',
                sdkBackendPollIntervalMs: 5000,
                pollIntervalMs: 15000,
                sqlitePath: './data/cm_agent.sqlite',
                isTestMode: false,
                channel: 'sdk_backend',
                cruiseIntervalMs: 300000,
                cruiseReportLanguage: 'zh-CN',
                cruiseBatchSize: 100,
            };

            validateConfig(config);

            expect(consoleWarnSpy).toHaveBeenCalledWith('[Config] sdkBackendPollIntervalMs is very low, may hit rate limits');
        });

        it('should warn when both poll intervals are very low', () => {
            const config: Config = {
                fbPageId: 'valid_page_id',
                fbPageAccessToken: 'valid_token',
                sdkBackendToken: '',
                sdkBackendBaseUrl: 'https://xyhy-admin.xiaoyuehy.com',
                sdkBackendPollIntervalMs: 5000,
                pollIntervalMs: 4000,
                sqlitePath: './data/cm_agent.sqlite',
                isTestMode: false,
                channel: 'facebook',
                cruiseIntervalMs: 300000,
                cruiseReportLanguage: 'zh-CN',
                cruiseBatchSize: 100,
            };

            validateConfig(config);

            expect(consoleWarnSpy).toHaveBeenCalledWith('[Config] pollIntervalMs is very low, may hit rate limits');
            expect(consoleWarnSpy).toHaveBeenCalledWith('[Config] sdkBackendPollIntervalMs is very low, may hit rate limits');
        });
    });
});
