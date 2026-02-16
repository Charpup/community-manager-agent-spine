export type Channel = "facebook" | "mock_channel" | "sdk_backend";

// 新增: 语言类型
export type Language = 'zh-CN' | 'zh-TW' | 'en' | 'ja' | 'ko' | 'es' | 'unknown';

// 新增: 分类类型 (限定6大分类)
export type Category = 'payment' | 'refund' | 'bug' | 'ban_appeal' | 'abuse' | 'general';

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

// 扩展: NormalizedMessage 确保 language 字段使用 Language 类型
export type NormalizedMessage = MessageEvent & {
    language?: Language;
    entities: {
        orderId?: string;
        email?: string;
        deviceId?: string;
        errorCode?: string;
        [key: string]: string | undefined;
    };
};

// 扩展: TriageDecision 新增字段
export type TriageDecision = {
    category: Category;
    severity: "low" | "medium" | "high" | "critical";
    autoAllowed: boolean;
    escalationReason?: string;
    detected_language?: Language;  // 新增: 检测到的语言
    confidence?: number;           // 新增: 置信度 0-1
};

// 新增: CruiseLog 类型
export type CruiseLog = {
    id: number;
    timestamp: number;
    report_md: string;
    stats_json: string;  // 存储 { total, categories: {}, languages: {} }
    duration_ms: number;
};

// 新增: 巡航统计类型
export type CruiseStats = {
    total: number;
    categories: Record<Category, number>;
    languages: Record<Language, number>;
    highPriority: number;
};

// 新增: Ticket 类型 (用于巡航报告)
export type Ticket = {
    id: string;
    text: string;
    detected_language?: Language;
    category: Category;
    severity: 'low' | 'medium' | 'high' | 'critical';
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
    // v0.5 新增: 语言检测和置信度
    detected_language?: Language;
    confidence?: number;
};

// 操作审计日志类型
export type CaseAction =
    | { type: "TRIAGED"; atMs: number; payload: any }
    | { type: "AUTO_REPLIED"; atMs: number; payload: { text: string } }
    | { type: "ESCALATED"; atMs: number; payload: { reason: string } }
    | { type: "STATUS_CHANGED"; atMs: number; payload: { from: string; to: string } };

export interface InboxConnector {
    channel: Channel;
    fetchNewMessages(sinceMs: number): Promise<MessageEvent[]>;
    sendReply(threadId: string, text: string): Promise<void>;
}

export interface CaseRepository {
    getCaseByThread(channel: Channel, threadId: string): Promise<CaseRecord | null>;
    upsertCase(rec: CaseRecord): Promise<void>;
    appendCaseNote(caseId: string, note: string): Promise<void>;
    appendAction(caseId: string, action: CaseAction): Promise<void>;  // 审计日志
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
