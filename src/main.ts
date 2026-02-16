/**
 * Community Manager Agent - 主入口
 * 
 * 支持多种运行模式：
 * - NODE_ENV=test: 使用 Mock 组件进行测试
 * - CHANNEL=sdk_backend: 使用 SDK 后台 Connector
 * - --cruise-once: 执行单次巡航并退出
 * - 默认: 使用真实 Facebook + SQLite 组件
 */

import { CommunityAgent } from "./agent";
import { loadConfig, validateConfig } from "./config";
import { startRescanLoop } from "./scheduler";
import { runSingleCruise } from "./runtime/cruise-scheduler";

// Mock 组件 (测试模式)
import {
    MockInboxConnector,
    InMemoryCaseRepository,
    StaticKnowledgeBase,
    ConsoleNotifier,
} from "./mocks";

// 真实组件 (生产模式)
import { SQLiteCaseRepository } from "./repo/sqlite";
import { FacebookInboxConnector } from "./connectors/facebook";
import { SDKBackendConnector } from "./connectors/sdk-backend";
import { SDKBackendMockConnector } from "./connectors/sdk-backend-mock";
import { startPollLoop } from "./runtime/poller";

async function main() {
    console.log("=== Community Manager Agent ===\n");

    const config = loadConfig();
    console.log(`[Config] Channel: ${config.channel}`);

    // 检查 --cruise-once 参数
    if (process.argv.includes('--cruise-once')) {
        console.log('[Mode] Running single cruise and exiting\n');
        await runCruiseOnceMode(config);
        process.exit(0);
    }

    if (config.isTestMode) {
        console.log("[Mode] Running in TEST mode with mocks\n");
        await runTestMode(config);
    } else {
        console.log("[Mode] Running in PRODUCTION mode with real components\n");
        validateConfig(config);
        await runProductionMode(config);
    }
}

/**
 * 单次巡航模式 - 执行一次巡航并退出
 */
async function runCruiseOnceMode(config: ReturnType<typeof loadConfig>) {
    const cases = config.isTestMode 
        ? new InMemoryCaseRepository() 
        : new SQLiteCaseRepository(config.sqlitePath);

    try {
        const { report } = await runSingleCruise({
            caseRepo: cases,
            reportLanguage: config.cruiseReportLanguage,
            batchSize: config.cruiseBatchSize,
            intervalMs: config.cruiseIntervalMs,
        });

        // 输出报告到 stdout
        console.log('\n' + report);
    } finally {
        if (!config.isTestMode) {
            cases.close();
        }
    }
}

/**
 * 测试模式 - 使用 Mock 组件验证逻辑
 */
async function runTestMode(config: ReturnType<typeof loadConfig>) {
    let connector;
    
    if (config.channel === "sdk_backend") {
        connector = new SDKBackendMockConnector();
        console.log("[TestMode] Using SDK Backend Mock Connector\n");
    } else {
        connector = new MockInboxConnector();
        console.log("[TestMode] Using Generic Mock Connector\n");
    }
    
    const cases = new InMemoryCaseRepository();
    const kb = new StaticKnowledgeBase();
    const notifier = new ConsoleNotifier();

    const agent = new CommunityAgent(connector, cases, kb, notifier);

    // 启动定时复扫
    startRescanLoop(agent, 5 * 60 * 1000);

    if (config.channel === "sdk_backend") {
        // SDK Backend 测试场景
        console.log("--- Test Scenario: SDK Backend Mock Mode ---");
        let lastPoll = 0;
        lastPoll = await agent.runPoll(lastPoll);
        
        const allCases = await cases.listOpenCasesForRescan(Date.now());
        console.log(`\nProcessed ${allCases.length} cases from mock SDK backend`);
        
        // Show category distribution
        const categories: Record<string, number> = {};
        allCases.forEach(c => {
            categories[c.category] = (categories[c.category] || 0) + 1;
        });
        console.log("Category distribution:", categories);
        
        if (allCases.length > 0) {
            console.log("✅ PASS: SDK Backend Mock Connector working");
        } else {
            console.error("❌ FAIL: No cases processed");
        }
    } else {
        // 默认测试场景
        console.log("--- Test Scenario: 'paid' keyword recognition ---");
        (connector as MockInboxConnector).pushMessage({
            threadId: "t-test-1",
            fromUserId: "u-tester",
            fromName: "Tester",
            text: "I paid but didn't receive my item",
        });

        let lastPoll = 0;
        lastPoll = await agent.runPoll(lastPoll);

        const testCase = await cases.getCaseByThread("mock_channel", "t-test-1");
        console.log("Category:", testCase?.category);
        console.log("Status:", testCase?.status);

        if (testCase?.category === "payment") {
            console.log("✅ PASS: Payment keyword recognized");
        } else {
            console.error("❌ FAIL: Payment keyword not recognized");
        }
    }

    console.log("\n=== Test Complete ===");
    setTimeout(() => process.exit(0), 2000);
}

/**
 * 生产模式 - 使用真实 Connectors + SQLite
 */
async function runProductionMode(config: ReturnType<typeof loadConfig>) {
    // 初始化组件
    const cases = new SQLiteCaseRepository(config.sqlitePath);
    
    // 根据 channel 选择 connector
    let connector;
    let intervalMs: number;
    
    if (config.channel === "sdk_backend") {
        connector = new SDKBackendConnector(
            config.sdkBackendToken,
            config.sdkBackendBaseUrl,
            config.sdkBackendGameId,
            config.sdkBackendPkgId
        );
        intervalMs = config.sdkBackendPollIntervalMs;
        console.log(`[Production] Using SDK Backend Connector (${config.sdkBackendBaseUrl})`);
    } else {
        // 默认 Facebook
        connector = new FacebookInboxConnector(config.fbPageId, config.fbPageAccessToken);
        intervalMs = config.pollIntervalMs;
        console.log("[Production] Using Facebook Connector");
    }
    
    const kb = new StaticKnowledgeBase(); // 暂时使用静态 KB
    const notifier = new ConsoleNotifier(); // 暂时使用控制台通知

    const agent = new CommunityAgent(connector, cases, kb, notifier);

    // 启动定时复扫 (5 分钟)
    startRescanLoop(agent, 5 * 60 * 1000);

    // 启动轮询循环
    startPollLoop({
        agent,
        connector,
        intervalMs,
    });

    console.log(`[Agent] Running (poll interval: ${intervalMs}ms)... Press Ctrl+C to stop\n`);

    // 保持进程运行
    process.on("SIGINT", () => {
        console.log("\n[Agent] Shutting down...");
        cases.close();
        process.exit(0);
    });
}

main().catch((err) => {
    console.error("[Fatal Error]", err);
    process.exit(1);
});
