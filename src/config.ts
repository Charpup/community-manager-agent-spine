/**
 * 配置模块 - 从环境变量读取配置
 */

export interface Config {
    // Facebook
    fbPageId: string;
    fbPageAccessToken: string;

    // SDK Backend
    sdkBackendToken: string;
    sdkBackendBaseUrl: string;
    sdkBackendPollIntervalMs: number;
    sdkBackendGameId?: number;
    sdkBackendPkgId?: number;

    // Polling
    pollIntervalMs: number;

    // Database
    sqlitePath: string;

    // Runtime mode
    isTestMode: boolean;

    // Channel selection
    channel: "facebook" | "sdk_backend" | "mock_channel";

    // v0.5 新增: 巡航配置
    cruiseIntervalMs: number;
    cruiseReportLanguage: string;
    cruiseBatchSize: number;

    // LLM 配置 (v0.6)
    llmApiKey: string;
    llmBaseUrl: string;
    llmModel: string;
    llmTimeoutMs: number;
    llmRetryCount: number;
    llmFallbackEnabled: boolean;
}

function getEnvOrDefault(key: string, defaultValue: string): string {
    return process.env[key] ?? defaultValue;
}

function getEnvRequired(key: string): string {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
}

export function loadConfig(): Config {
    const isTestMode = process.env.NODE_ENV === "test";
    const channel = (process.env.CHANNEL || "facebook") as Config["channel"];

    return {
        fbPageId: isTestMode ? "test_page_id" : getEnvOrDefault("FB_PAGE_ID", ""),
        fbPageAccessToken: isTestMode ? "test_token" : getEnvOrDefault("FB_PAGE_ACCESS_TOKEN", ""),
        
        // SDK Backend
        sdkBackendToken: getEnvOrDefault("SDK_BACKEND_TOKEN", ""),
        sdkBackendBaseUrl: getEnvOrDefault("SDK_BACKEND_BASE_URL", "https://xyhy-admin.xiaoyuehy.com"),
        sdkBackendPollIntervalMs: parseInt(getEnvOrDefault("SDK_BACKEND_POLL_INTERVAL_MS", "30000"), 10),
        sdkBackendGameId: process.env.SDK_BACKEND_GAME_ID ? parseInt(process.env.SDK_BACKEND_GAME_ID, 10) : undefined,
        sdkBackendPkgId: process.env.SDK_BACKEND_PKG_ID ? parseInt(process.env.SDK_BACKEND_PKG_ID, 10) : undefined,
        
        pollIntervalMs: parseInt(getEnvOrDefault("POLL_INTERVAL_MS", "15000"), 10),
        sqlitePath: getEnvOrDefault("SQLITE_PATH", "./data/cm_agent.sqlite"),
        isTestMode,
        channel,
        
        // v0.5 新增
        cruiseIntervalMs: parseInt(getEnvOrDefault("CRUISE_INTERVAL_MS", "300000"), 10), // 5分钟
        cruiseReportLanguage: getEnvOrDefault("CRUISE_REPORT_LANGUAGE", "zh-CN"),
        cruiseBatchSize: parseInt(getEnvOrDefault("CRUISE_BATCH_SIZE", "100"), 10),

        // LLM 配置 (v0.6)
        llmApiKey: getEnvOrDefault('LLM_API_KEY', ''),
        llmBaseUrl: getEnvOrDefault('LLM_BASE_URL', 'https://api.apiyi.com/v1'),
        llmModel: getEnvOrDefault('LLM_MODEL', 'gpt-4o-mini'),
        llmTimeoutMs: parseInt(getEnvOrDefault('LLM_TIMEOUT_MS', '30000'), 10),
        llmRetryCount: parseInt(getEnvOrDefault('LLM_RETRY_COUNT', '3'), 10),
        llmFallbackEnabled: getEnvOrDefault('LLM_FALLBACK_ENABLED', 'true') === 'true',
    };
}

export class ConfigValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ConfigValidationError";
    }
}

export function validateConfig(config: Config): void {
    const errors: string[] = [];

    if (!config.isTestMode) {
        // Channel-specific validation
        if (config.channel === "facebook") {
            if (!config.fbPageId) {
                errors.push("FB_PAGE_ID is required when CHANNEL=facebook");
            }
            if (!config.fbPageAccessToken) {
                errors.push("FB_PAGE_ACCESS_TOKEN is required when CHANNEL=facebook");
            }
        }
        
        if (config.channel === "sdk_backend") {
            if (!config.sdkBackendToken) {
                errors.push("SDK_BACKEND_TOKEN is required when CHANNEL=sdk_backend");
            }
            if (!config.sdkBackendBaseUrl) {
                errors.push("SDK_BACKEND_BASE_URL is required when CHANNEL=sdk_backend");
            }
        }

        // Validate channel value
        const validChannels = ["facebook", "sdk_backend", "mock_channel"];
        if (!validChannels.includes(config.channel)) {
            errors.push(`Invalid CHANNEL '${config.channel}'. Must be one of: ${validChannels.join(", ")}`);
        }
    }

    // Numeric validations
    if (isNaN(config.pollIntervalMs) || config.pollIntervalMs <= 0) {
        errors.push("POLL_INTERVAL_MS must be a positive number");
    }
    if (isNaN(config.sdkBackendPollIntervalMs) || config.sdkBackendPollIntervalMs <= 0) {
        errors.push("SDK_BACKEND_POLL_INTERVAL_MS must be a positive number");
    }

    // v0.5 新增验证
    if (isNaN(config.cruiseIntervalMs) || config.cruiseIntervalMs < 10000) {
        errors.push("CRUISE_INTERVAL_MS must be at least 10000ms (10 seconds)");
    }
    
    if (isNaN(config.cruiseBatchSize) || config.cruiseBatchSize <= 0) {
        errors.push("CRUISE_BATCH_SIZE must be a positive number");
    }
    
    const validReportLanguages = ['zh-CN', 'zh-TW', 'en', 'ja'];
    if (!validReportLanguages.includes(config.cruiseReportLanguage)) {
        errors.push(`CRUISE_REPORT_LANGUAGE must be one of: ${validReportLanguages.join(', ')}`);
    }

    // LLM 配置验证 (仅在配置了 API key 时验证)
    if (config.llmApiKey) {
        if (!config.llmBaseUrl) {
            errors.push('LLM_BASE_URL is required when LLM_API_KEY is set');
        }
        if (isNaN(config.llmTimeoutMs) || config.llmTimeoutMs < 5000) {
            errors.push('LLM_TIMEOUT_MS must be at least 5000ms');
        }
        if (isNaN(config.llmRetryCount) || config.llmRetryCount < 0) {
            errors.push('LLM_RETRY_COUNT must be a non-negative number');
        }
    }

    // Throw if any errors found
    if (errors.length > 0) {
        throw new ConfigValidationError(
            `Configuration validation failed:\n  - ${errors.join("\n  - ")}`
        );
    }

    // Warnings for potentially problematic values
    if (config.pollIntervalMs < 5000) {
        console.warn("[Config] pollIntervalMs is very low, may hit rate limits");
    }
    
    if (config.sdkBackendPollIntervalMs < 10000) {
        console.warn("[Config] sdkBackendPollIntervalMs is very low, may hit rate limits");
    }
}
