import {
    InboxConnector,
    CaseRepository,
    KnowledgeBase,
    Notifier,
    Channel,
    MessageEvent,
    CaseRecord,
    NormalizedMessage,
    EvidencePack,
    CaseStatus,
    CaseAction,
} from "./types";

/* -------------------------------------------------------------------------- */
/*                            Mock Inbox Connector                            */
/* -------------------------------------------------------------------------- */
export class MockInboxConnector implements InboxConnector {
    channel: Channel = "mock_channel";
    private incomingQueue: MessageEvent[] = [];
    public sentReplies: { threadId: string; text: string }[] = [];

    constructor() { }

    // Test helper to inject messages
    pushMessage(msg: Partial<MessageEvent> & { text: string; threadId: string; fromUserId: string }) {
        this.incomingQueue.push({
            channel: this.channel,
            messageId: `msg-${Date.now()}-${Math.random()}`,
            timestampMs: Date.now(),
            ...msg,
        });
    }

    async fetchNewMessages(sinceMs: number): Promise<MessageEvent[]> {
        const batch = this.incomingQueue.filter((m) => m.timestampMs > sinceMs);
        // In a real mock, we might clear or mark read. Here we just return them.
        // For the loop simplicity, let's assume we consume them so we don't loop forever on same msgs
        // if the 'sinceMs' doesn't advance perfectly. But the agent relies on timestamps.
        // Let's just return what matches and rely on external time advancement in test.
        return batch;
    }

    async sendReply(threadId: string, text: string): Promise<void> {
        console.log(`[MockInbox] REPLY to ${threadId}: "${text.replace(/\n/g, "\\n")}"`);
        this.sentReplies.push({ threadId, text });
    }
}

/* -------------------------------------------------------------------------- */
/*                         In-Memory Case Repository                          */
/* -------------------------------------------------------------------------- */
export class InMemoryCaseRepository implements CaseRepository {
    private cases = new Map<string, CaseRecord>();
    private messageLog = new Map<string, NormalizedMessage[]>();
    private actionsByCaseId = new Map<string, CaseAction[]>();

    async getCaseByThread(channel: Channel, threadId: string): Promise<CaseRecord | null> {
        const key = `${channel}-${threadId}`;
        return this.cases.get(key) || null;
    }

    async upsertCase(rec: CaseRecord): Promise<void> {
        console.log(`[CaseRepo] UPSERT Case ${rec.caseId} Status=${rec.status}`);
        this.cases.set(rec.caseId, rec);
    }

    async appendCaseNote(caseId: string, note: string): Promise<void> {
        const c = this.cases.get(caseId);
        if (c) {
            c.notes = c.notes || [];
            c.notes.push(note);
            console.log(`[CaseRepo] NOTE on ${caseId}: ${note}`);
        }
    }

    async appendAction(caseId: string, action: CaseAction): Promise<void> {
        const actions = this.actionsByCaseId.get(caseId) || [];
        actions.push(action);
        this.actionsByCaseId.set(caseId, actions);
        console.log(`[CaseRepo] ACTION on ${caseId}: ${action.type}`);
    }

    async recordMessage(caseId: string, msg: NormalizedMessage): Promise<void> {
        const msgs = this.messageLog.get(caseId) || [];
        msgs.push(msg);
        this.messageLog.set(caseId, msgs);
    }

    async listOpenCasesForRescan(nowMs: number): Promise<CaseRecord[]> {
        return Array.from(this.cases.values()).filter(
            (c) => c.status !== "CLOSED" && c.status !== "RESOLVED"
        );
    }

    async aggregateDailyReport(dayStartMs: number, dayEndMs: number): Promise<any> {
        const all = Array.from(this.cases.values());
        const relevant = all.filter((c) => c.lastMessageAtMs >= dayStartMs && c.lastMessageAtMs <= dayEndMs);

        // Group by category
        const cats: Record<string, number> = {};
        for (const c of relevant) {
            cats[c.category] = (cats[c.category] || 0) + 1;
        }

        return {
            totalThreads: relevant.length,
            autoResolved: relevant.filter((c) => c.status === "RESOLVED" || c.status === "WAITING_USER").length,
            escalated: relevant.filter((c) => c.status === "ESCALATED").length,
            topCategories: cats,
            openCases: relevant.filter((c) => c.status !== "CLOSED" && c.status !== "RESOLVED"),
        };
    }
}

/* -------------------------------------------------------------------------- */
/*                            Static Knowledge Base                           */
/* -------------------------------------------------------------------------- */
export class StaticKnowledgeBase implements KnowledgeBase {
    private data: Record<string, string> = {
        payment: "Check your purchase history in the platform store (Apple/Google). Transactions can take up to 24h.",
        bug: "Clear cache and restart the app. Ensure you are on v1.2.0.",
    };

    async retrieve(category: string, query: string): Promise<EvidencePack> {
        const snippet = this.data[category] || "";
        if (!snippet) return { items: [] };

        return {
            items: [{ title: "FAQ", snippet, sourceId: "faq-1" }],
        };
    }
}

/* -------------------------------------------------------------------------- */
/*                              Console Notifier                              */
/* -------------------------------------------------------------------------- */
export class ConsoleNotifier implements Notifier {
    async alert(title: string, details: string, payload?: any): Promise<void> {
        console.error(`\n[ALERT] ${title}\nDetails: ${details}\nPayload: ${JSON.stringify(payload)}\n`);
    }

    async dailyReport(title: string, body: string, payload?: any): Promise<void> {
        console.log(`\n=== ${title} ===\n${body}\n(Payload size: ${JSON.stringify(payload).length} chars)\n`);
    }
}
