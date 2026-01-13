import { CommunityAgent } from "./agent";
import {
    MockInboxConnector,
    InMemoryCaseRepository,
    StaticKnowledgeBase,
    ConsoleNotifier,
} from "./mocks";
import { startRescanLoop } from "./scheduler";

async function main() {
    console.log("=== Starting Community Agent Spine Verification (V2) ===\n");

    // 1. Setup Infrastructure
    const connector = new MockInboxConnector();
    const cases = new InMemoryCaseRepository();
    const kb = new StaticKnowledgeBase();
    const notifier = new ConsoleNotifier();

    const agent = new CommunityAgent(connector, cases, kb, notifier);

    // 启动定时复扫调度器 (5 分钟间隔，但这里只是演示)
    // 注意: 在测试脚本中我们不会等待 5 分钟，只是验证启动不报错
    startRescanLoop(agent, 5 * 60 * 1000);

    // 2. Scenario 1: 测试 "paid" 关键词修复 (核心验收项)
    console.log("--- Scenario 1: 测试 'paid' 关键词识别 ---");
    const threadId1 = "t-201";
    connector.pushMessage({
        threadId: threadId1,
        fromUserId: "u-charlie",
        fromName: "Charlie",
        text: "I paid but didn't receive my item",
    });

    let lastPoll = 0;
    lastPoll = await agent.runPoll(lastPoll);

    const case1 = await cases.getCaseByThread("mock_channel", threadId1);
    console.log("Case Category:", case1?.category); // 应该是 payment
    console.log("Case Status:", case1?.status);     // 应该是 WAITING_USER
    if (case1?.category === "payment") {
        console.log("✅ PASS: 'paid' 正确识别为 payment");
    } else {
        console.error("❌ FAIL: 'paid' 未被识别为 payment，实际:", case1?.category);
    }

    // 3. Scenario 2: 原有场景 - 用户提供信息后状态变更
    console.log("\n--- Scenario 2: 用户提供支付信息 ---");
    connector.pushMessage({
        threadId: threadId1,
        fromUserId: "u-charlie",
        fromName: "Charlie",
        text: "It was Google Play, Transaction GPA.9999-ABCD.",
    });
    await agent.runPoll(lastPoll);

    const case1Updated = await cases.getCaseByThread("mock_channel", threadId1);
    console.log("Case Status after user reply:", case1Updated?.status); // 应该是 IN_PROGRESS -> WAITING_USER

    // 4. Scenario 3: 升级场景 - 退款请求
    console.log("\n--- Scenario 3: 用户请求退款 (应升级) ---");
    connector.pushMessage({
        threadId: "t-202",
        fromUserId: "u-david",
        text: "I want a refund immediately!",
    });

    await agent.runPoll(lastPoll);

    const case2 = await cases.getCaseByThread("mock_channel", "t-202");
    console.log("Case 2 Status:", case2?.status);    // 应该是 ESCALATED
    console.log("Case 2 Category:", case2?.category); // 应该是 refund
    if (case2?.status === "ESCALATED") {
        console.log("✅ PASS: 退款请求正确升级");
    } else {
        console.error("❌ FAIL: 退款请求未升级");
    }

    // 5. 日报生成
    console.log("\n--- 生成日报 ---");
    const now = Date.now();
    const dayStart = now - 24 * 3600 * 1000;
    await agent.runDailyReport(dayStart, now);

    console.log("\n=== Verification Complete (V2) ===");

    // 退出进程 (否则 setInterval 会让进程一直运行)
    console.log("\n[Info] 测试完成，3 秒后退出...");
    setTimeout(() => process.exit(0), 3000);
}

main().catch((err) => console.error(err));

