import { CommunityAgent } from "./agent";
import {
    MockInboxConnector,
    InMemoryCaseRepository,
    StaticKnowledgeBase,
    ConsoleNotifier,
} from "./mocks";

async function main() {
    console.log("=== Starting Community Agent Spine Verification ===\n");

    // 1. Setup Infrastructure
    const connector = new MockInboxConnector();
    const cases = new InMemoryCaseRepository();
    const kb = new StaticKnowledgeBase();
    const notifier = new ConsoleNotifier();

    const agent = new CommunityAgent(connector, cases, kb, notifier);

    // 2. Scenario 1: A User reports a bug (Payment issue)
    console.log("--- Scenario 1: User reports Payment Issue ---");
    const threadId = "t-101";
    const userId = "u-alice";

    connector.pushMessage({
        threadId,
        fromUserId: userId,
        fromName: "Alice",
        text: "I paid $10 but didn't get my gems. My internet is fine.",
    });

    // Run the poll loop (simulating T=1)
    let lastPoll = 0;
    lastPoll = await agent.runPoll(lastPoll);

    console.log("\n[Checkpoint] Checking logic after first run...");
    const case1 = await cases.getCaseByThread("mock_channel", threadId);
    console.log("Case Status:", case1?.status); // Should be WAITING_USER (asking for info)
    console.log("Case Category:", case1?.category); // Should be payment
    // Verify reply
    if (connector.sentReplies.length > 0) {
        console.log("Last Reply:", connector.sentReplies[connector.sentReplies.length - 1].text.substring(0, 50) + "...");
    } else {
        console.error("ERROR: No reply sent!");
    }

    // 3. Scenario 2: User replies with info
    console.log("\n--- Scenario 2: User provides info ---");
    connector.pushMessage({
        threadId,
        fromUserId: userId,
        fromName: "Alice",
        text: "It was Google Play, Transaction GPA.1234-5678.",
    });

    // Run the poll loop (simulating T=2)
    await agent.runPoll(lastPoll);

    const case1Updated = await cases.getCaseByThread("mock_channel", threadId);
    console.log("Case Status:", case1Updated?.status); // Should be IN_PROGRESS (back to agent)

    // 4. Scenario 3: High Risk / Escalation
    console.log("\n--- Scenario 3: User demands refund (Escalation) ---");
    connector.pushMessage({
        threadId: "t-102",
        fromUserId: "u-bob",
        text: "I want a refund immediately! You scammers!",
    });

    await agent.runPoll(lastPoll); // Using same 'lastPoll' just to fetch everything new

    const case2 = await cases.getCaseByThread("mock_channel", "t-102");
    console.log("Case 2 Status:", case2?.status); // Should be ESCALATED
    console.log("Case 2 Category:", case2?.category); // Should be refund (or abuse if matched first, but likely refund)

    // 5. Daily Report
    console.log("\n--- Generating Daily Report ---");
    const now = Date.now();
    const dayStart = now - 24 * 3600 * 1000;
    await agent.runDailyReport(dayStart, now);

    console.log("\n=== Verification Complete ===");
}

main().catch((err) => console.error(err));
