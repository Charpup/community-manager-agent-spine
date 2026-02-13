/**
 * Community Manager Agent - 主入口
 * 
 * 支持两种运行模式：
 * - NODE_ENV=test: 使用 Mock 组件进行测试
 * - 默认: 使用真实 Facebook + SQLite 组件
 */

import { CommunityAgent } from "./agent";
import { loadConfig, validateConfig } from "./config";
import { startRescanLoop } from "./scheduler";

// Mock 组件 (测试模式)
import {
    MockInboxConnector,
    InMemoryCaseRepository,
    StaticKnowledgeBase,
    ConsoleNotifier,
} from "./mocks";

// 真实组件使用动态导入 (避免在测试模式加载原生模块)

async function main() {
    console.log("=== Community Manager Agent ===\n");

    const config = loadConfig();

    if (config.isTestMode) {
        console.log("[Mode] Running in TEST mode with mocks\n");
        await runTestMode();
    } else {
        console.log("[Mode] Running in PRODUCTION mode with real components\n");
        validateConfig(config);
        await runProductionMode(config);
    }
}

/**
 * 测试模式 - 使用 Mock 组件验证逻辑
 */
async function runTestMode() {
    const connector = new MockInboxConnector();
    const cases = new InMemoryCaseRepository();
    const kb = new StaticKnowledgeBase();
    const notifier = new ConsoleNotifier();

    const agent = new CommunityAgent(connector, cases, kb, notifier);

    // 启动定时复扫
    startRescanLoop(agent, 5 * 60 * 1000);

    // 测试场景
    console.log("--- Test Scenario: 'paid' keyword recognition ---");
    connector.pushMessage({
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

    console.log("\n=== Test Complete ===");
    setTimeout(() => process.exit(0), 2000);
}

/**
 * 生产模式 - 使用真实 Facebook + SQLite
 */
async function runProductionMode(config: ReturnType<typeof loadConfig>) {
    // 动态导入真实组件 (避免在测试模式加载原生模块)
    const { SQLiteCaseRepository } = await import("./repo/sqlite");
    const { FacebookInboxConnector } = await import("./connectors/facebook");
    const { startPollLoop } = await import("./runtime/poller");

    // 初始化组件
    const cases = new SQLiteCaseRepository(config.sqlitePath);
    const connector = new FacebookInboxConnector(config.fbPageId, config.fbPageAccessToken);
    const kb = new StaticKnowledgeBase(); // 暂时使用静态 KB
    const notifier = new ConsoleNotifier(); // 暂时使用控制台通知

    const agent = new CommunityAgent(connector, cases, kb, notifier);

    // 启动定时复扫 (5 分钟)
    startRescanLoop(agent, 5 * 60 * 1000);

    // 启动轮询循环
    startPollLoop({
        agent,
        connector,
        intervalMs: config.pollIntervalMs,
    });

    console.log("[Agent] Running... Press Ctrl+C to stop\n");

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
