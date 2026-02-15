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
    };
}

export function validateConfig(config: Config): void {
    if (!config.isTestMode) {
        if (config.channel === "facebook") {
            if (!config.fbPageId) {
                throw new Error("FB_PAGE_ID is required when CHANNEL=facebook");
            }
            if (!config.fbPageAccessToken) {
                throw new Error("FB_PAGE_ACCESS_TOKEN is required when CHANNEL=facebook");
            }
        }
        
        if (config.channel === "sdk_backend") {
            if (!config.sdkBackendToken) {
                throw new Error("SDK_BACKEND_TOKEN is required when CHANNEL=sdk_backend");
            }
        }
    }

    if (config.pollIntervalMs < 5000) {
        console.warn("[Config] pollIntervalMs is very low, may hit rate limits");
    }
    
    if (config.sdkBackendPollIntervalMs < 10000) {
        console.warn("[Config] sdkBackendPollIntervalMs is very low, may hit rate limits");
    }
}
