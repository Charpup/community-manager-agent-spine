export type Channel = "facebook" | "mock_channel";

export type MessageEvent = {
    channel: Channel;
    threadId: string;
    messageId: string;
    fromUserId: string;
    fromName?: string;
    text: string;
    timestampMs: number;
    raw?: unknown;
};

export type NormalizedMessage = MessageEvent & {
    language?: string;
    entities: {
        orderId?: string;
        email?: string;
        deviceId?: string;
        errorCode?: string;
        [key: string]: string | undefined;
    };
};

export type TriageDecision = {
    category:
    | "payment"
    | "login"
    | "bug"
    | "ban_appeal"
    | "refund"
    | "abuse"
    | "general"
    | "unknown";
    severity: "low" | "medium" | "high" | "critical";
    autoAllowed: boolean;
    escalationReason?: string;
};

export type Evidence = { title: string; snippet: string; sourceId: string };
export type EvidencePack = { items: Evidence[] };

export type ReplyDraft = {
    text: string;
    requiresUserInfo?: string[]; // list of fields we ask the user for
    riskFlags?: string[];
};

export type CaseStatus =
    | "NEW"
    | "WAITING_USER"
    | "IN_PROGRESS"
    | "RESOLVED"
    | "CLOSED"
    | "ESCALATED"
    | "HUMAN_PENDING"
    | "HUMAN_DONE";

export type CaseRecord = {
    caseId: string;
    channel: Channel;
    threadId: string;
    userId: string;
    status: CaseStatus;
    category: TriageDecision["category"];
    severity: TriageDecision["severity"];
    lastMessageAtMs: number;
    lastAgentActionAtMs?: number;
    assignedTo?: "agent" | "human";
    notes?: string[];
};

export interface InboxConnector {
    channel: Channel;
    fetchNewMessages(sinceMs: number): Promise<MessageEvent[]>;
    sendReply(threadId: string, text: string): Promise<void>;
}

export interface CaseRepository {
    getCaseByThread(channel: Channel, threadId: string): Promise<CaseRecord | null>;
    upsertCase(rec: CaseRecord): Promise<void>;
    appendCaseNote(caseId: string, note: string): Promise<void>;
    recordMessage(caseId: string, msg: NormalizedMessage): Promise<void>;
    listOpenCasesForRescan(nowMs: number): Promise<CaseRecord[]>;
    aggregateDailyReport(dayStartMs: number, dayEndMs: number): Promise<any>;
}

export interface KnowledgeBase {
    retrieve(category: string, query: string): Promise<EvidencePack>;
}

export interface Notifier {
    alert(title: string, details: string, payload?: any): Promise<void>;
    dailyReport(title: string, body: string, payload?: any): Promise<void>;
}
