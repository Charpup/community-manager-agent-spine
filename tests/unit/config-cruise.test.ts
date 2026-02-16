/**
 * Config Cruise Configuration Tests
 * v0.5 新增: 巡航配置测试
 */

import { loadConfig, validateConfig, Config, ConfigValidationError } from '../../src/config';

describe('Config Cruise Configuration', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        // Reset environment variables before each test
        process.env = { ...originalEnv };
    });

    afterAll(() => {
        // Restore original environment
        process.env = originalEnv;
    });

    describe('loadConfig - cruise defaults', () => {
        it('should load default cruise configuration correctly', () => {
            // Clear environment variables to test defaults
            delete process.env.CRUISE_INTERVAL_MS;
            delete process.env.CRUISE_REPORT_LANGUAGE;
            delete process.env.CRUISE_BATCH_SIZE;
            process.env.NODE_ENV = 'production';

            const config = loadConfig();

            expect(config.cruiseIntervalMs).toBe(300000); // 5分钟默认
            expect(config.cruiseReportLanguage).toBe('zh-CN');
            expect(config.cruiseBatchSize).toBe(100);
        });

        it('should load custom cruise environment variables correctly', () => {
            process.env.NODE_ENV = 'production';
            process.env.CRUISE_INTERVAL_MS = '600000'; // 10分钟
            process.env.CRUISE_REPORT_LANGUAGE = 'en';
            process.env.CRUISE_BATCH_SIZE = '50';

            const config = loadConfig();

            expect(config.cruiseIntervalMs).toBe(600000);
            expect(config.cruiseReportLanguage).toBe('en');
            expect(config.cruiseBatchSize).toBe(50);
        });

        it('should load zh-TW as report language', () => {
            process.env.NODE_ENV = 'production';
            process.env.CRUISE_REPORT_LANGUAGE = 'zh-TW';

            const config = loadConfig();

            expect(config.cruiseReportLanguage).toBe('zh-TW');
        });

        it('should load ja as report language', () => {
            process.env.NODE_ENV = 'production';
            process.env.CRUISE_REPORT_LANGUAGE = 'ja';

            const config = loadConfig();

            expect(config.cruiseReportLanguage).toBe('ja');
        });
    });

    describe('validateConfig - cruise validation', () => {
        const baseConfig: Config = {
            fbPageId: 'test_page',
            fbPageAccessToken: 'test_token',
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

        it('should pass with valid cruise config defaults', () => {
            expect(() => validateConfig(baseConfig)).not.toThrow();
        });

        it('should throw ConfigValidationError for cruiseIntervalMs below 10000ms', () => {
            const config: Config = {
                ...baseConfig,
                cruiseIntervalMs: 5000,
            };

            expect(() => validateConfig(config)).toThrow(ConfigValidationError);
            expect(() => validateConfig(config)).toThrow('CRUISE_INTERVAL_MS must be at least 10000ms (10 seconds)');
        });

        it('should throw ConfigValidationError for cruiseIntervalMs exactly at 10000ms boundary', () => {
            // 边界值测试: 9999 应该失败
            const config: Config = {
                ...baseConfig,
                cruiseIntervalMs: 9999,
            };

            expect(() => validateConfig(config)).toThrow(ConfigValidationError);
        });

        it('should pass with cruiseIntervalMs exactly at 10000ms', () => {
            // 边界值测试: 10000 应该通过
            const config: Config = {
                ...baseConfig,
                cruiseIntervalMs: 10000,
            };

            expect(() => validateConfig(config)).not.toThrow();
        });

        it('should throw ConfigValidationError for NaN cruiseIntervalMs', () => {
            const config: Config = {
                ...baseConfig,
                cruiseIntervalMs: NaN,
            };

            expect(() => validateConfig(config)).toThrow(ConfigValidationError);
            expect(() => validateConfig(config)).toThrow('CRUISE_INTERVAL_MS must be at least 10000ms (10 seconds)');
        });

        it('should throw ConfigValidationError for zero cruiseBatchSize', () => {
            const config: Config = {
                ...baseConfig,
                cruiseBatchSize: 0,
            };

            expect(() => validateConfig(config)).toThrow(ConfigValidationError);
            expect(() => validateConfig(config)).toThrow('CRUISE_BATCH_SIZE must be a positive number');
        });

        it('should throw ConfigValidationError for negative cruiseBatchSize', () => {
            const config: Config = {
                ...baseConfig,
                cruiseBatchSize: -10,
            };

            expect(() => validateConfig(config)).toThrow(ConfigValidationError);
            expect(() => validateConfig(config)).toThrow('CRUISE_BATCH_SIZE must be a positive number');
        });

        it('should throw ConfigValidationError for NaN cruiseBatchSize', () => {
            const config: Config = {
                ...baseConfig,
                cruiseBatchSize: NaN,
            };

            expect(() => validateConfig(config)).toThrow(ConfigValidationError);
            expect(() => validateConfig(config)).toThrow('CRUISE_BATCH_SIZE must be a positive number');
        });

        it('should throw ConfigValidationError for invalid cruiseReportLanguage', () => {
            const config: Config = {
                ...baseConfig,
                cruiseReportLanguage: 'fr',
            };

            expect(() => validateConfig(config)).toThrow(ConfigValidationError);
            expect(() => validateConfig(config)).toThrow('CRUISE_REPORT_LANGUAGE must be one of: zh-CN, zh-TW, en, ja');
        });

        it('should throw ConfigValidationError for empty cruiseReportLanguage', () => {
            const config: Config = {
                ...baseConfig,
                cruiseReportLanguage: '',
            };

            expect(() => validateConfig(config)).toThrow(ConfigValidationError);
        });

        it('should pass with all valid report languages', () => {
            const validLanguages = ['zh-CN', 'zh-TW', 'en', 'ja'];
            
            for (const lang of validLanguages) {
                const config: Config = {
                    ...baseConfig,
                    cruiseReportLanguage: lang,
                };
                expect(() => validateConfig(config)).not.toThrow();
            }
        });

        it('should report multiple cruise validation errors at once', () => {
            const config: Config = {
                ...baseConfig,
                cruiseIntervalMs: 5000,
                cruiseBatchSize: 0,
                cruiseReportLanguage: 'invalid',
            };

            expect(() => validateConfig(config)).toThrow(ConfigValidationError);
            
            try {
                validateConfig(config);
            } catch (error: any) {
                expect(error.message).toContain('CRUISE_INTERVAL_MS must be at least 10000ms (10 seconds)');
                expect(error.message).toContain('CRUISE_BATCH_SIZE must be a positive number');
                expect(error.message).toContain('CRUISE_REPORT_LANGUAGE must be one of:');
            }
        });
    });

    describe('Config interface - cruise properties', () => {
        it('should have all cruise properties defined in Config interface', () => {
            const config: Config = {
                fbPageId: 'test',
                fbPageAccessToken: 'test',
                sdkBackendToken: '',
                sdkBackendBaseUrl: '',
                sdkBackendPollIntervalMs: 30000,
                pollIntervalMs: 15000,
                sqlitePath: './test.sqlite',
                isTestMode: true,
                channel: 'facebook',
                cruiseIntervalMs: 300000,
                cruiseReportLanguage: 'zh-CN',
                cruiseBatchSize: 100,
            };

            // TypeScript compile-time check
            expect(config.cruiseIntervalMs).toBeDefined();
            expect(config.cruiseReportLanguage).toBeDefined();
            expect(config.cruiseBatchSize).toBeDefined();
        });
    });
});
