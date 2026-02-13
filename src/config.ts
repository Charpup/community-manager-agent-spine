/**
 * 配置模块 - 从环境变量读取配置
 */

export interface Config {
    // Facebook
    fbPageId: string;
    fbPageAccessToken: string;

    // Polling
    pollIntervalMs: number;

    // Database
    sqlitePath: string;

    // Runtime mode
    isTestMode: boolean;
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

    return {
        fbPageId: isTestMode ? "test_page_id" : getEnvRequired("FB_PAGE_ID"),
        fbPageAccessToken: isTestMode ? "test_token" : getEnvRequired("FB_PAGE_ACCESS_TOKEN"),
        pollIntervalMs: parseInt(getEnvOrDefault("POLL_INTERVAL_MS", "15000"), 10),
        sqlitePath: getEnvOrDefault("SQLITE_PATH", "./data/cm_agent.sqlite"),
        isTestMode,
    };
}

export function validateConfig(config: Config): void {
    if (!config.isTestMode) {
        if (!config.fbPageId) {
            throw new Error("FB_PAGE_ID is required in production mode");
        }
        if (!config.fbPageAccessToken) {
            throw new Error("FB_PAGE_ACCESS_TOKEN is required in production mode");
        }
    }

    if (config.pollIntervalMs < 5000) {
        console.warn("[Config] pollIntervalMs is very low, may hit rate limits");
    }
}
