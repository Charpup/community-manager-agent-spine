import {
    MessageEvent,
    NormalizedMessage,
    TriageDecision,
    ReplyDraft,
    EvidencePack,
    InboxConnector,
    CaseRepository,
    KnowledgeBase,
    Notifier,
    CaseRecord,
} from "./types";

export class CommunityAgent {
    constructor(
        private connector: InboxConnector,
        private cases: CaseRepository,
        private kb: KnowledgeBase,
        private notifier: Notifier
    ) { }

    async runPoll(sinceMs: number): Promise<number> {
        const events = await this.connector.fetchNewMessages(sinceMs);
        let maxTs = sinceMs;

        for (const ev of events) {
            maxTs = Math.max(maxTs, ev.timestampMs);
            await this.handleMessage(ev);
        }
        return maxTs;
    }

    private async handleMessage(ev: MessageEvent) {
        console.log(`[Agent] Handling message from thread ${ev.threadId}`);
        const normalized = this.normalize(ev);
        const triage = this.triage(normalized);

        let caseRec = await this.cases.getCaseByThread(ev.channel, ev.threadId);
        if (!caseRec) {
            caseRec = {
                caseId: `${ev.channel}-${ev.threadId}`,
                channel: ev.channel,
                threadId: ev.threadId,
                userId: ev.fromUserId,
                status: "NEW",
                category: triage.category,
                severity: triage.severity,
                lastMessageAtMs: ev.timestampMs,
                assignedTo: triage.autoAllowed ? "agent" : "human",
                notes: [],
            };
        } else {
            caseRec.lastMessageAtMs = ev.timestampMs;
            // If the user replies again, typically we're back in progress.
            if (caseRec.status === "WAITING_USER") {
                caseRec.status = "IN_PROGRESS";
            }
        }

        // Persist the case update and the raw message
        await this.cases.upsertCase(caseRec);
        await this.cases.recordMessage(caseRec.caseId, normalized);

        // Alert on critical categories or high severity
        if (triage.severity === "critical") {
            await this.notifier.alert(
                "Critical community issue detected",
                `Thread=${ev.threadId} Category=${triage.category}`,
                { event: ev, triage }
            );
        }

        // Escalation Path
        if (!triage.autoAllowed) {
            caseRec.status = "ESCALATED";
            caseRec.assignedTo = "human";
            await this.cases.upsertCase(caseRec);
            await this.cases.appendCaseNote(
                caseRec.caseId,
                `Escalated: ${triage.escalationReason ?? "policy gate"}`
            );
            return;
        }

        // Retrieval & Composition
        const evidence = await this.kb.retrieve(triage.category, normalized.text);
        const draft = this.composeReply(normalized, triage, evidence);
        const approved = this.guardrails(draft, triage);

        if (!approved) {
            caseRec.status = "ESCALATED";
            caseRec.assignedTo = "human";
            await this.cases.upsertCase(caseRec);
            await this.cases.appendCaseNote(caseRec.caseId, "Escalated: guardrails rejected reply");
            return;
        }

        // Action Execution
        await this.connector.sendReply(ev.threadId, approved.text);
        caseRec.lastAgentActionAtMs = Date.now();

        // If we asked user for more info, we wait.
        caseRec.status = approved.requiresUserInfo?.length ? "WAITING_USER" : "RESOLVED";
        await this.cases.upsertCase(caseRec);
        await this.cases.appendCaseNote(caseRec.caseId, `Auto-replied. Status=${caseRec.status}`);
    }

    /* -------------------------------------------------------------------------- */
    /*                               Logic Internals                              */
    /* -------------------------------------------------------------------------- */

    private normalize(ev: MessageEvent): NormalizedMessage {
        const text = (ev.text ?? "").trim();
        // Regex entity extraction (Heuristics)
        const orderId = (text.match(/\b(order|订单)\s*#?\s*([A-Z0-9-]{6,})\b/i) ?? [])[2];
        const email = (text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i) ?? [])[0];
        const errorCode = (text.match(/\b(err(or)?|error|报错)\s*[:#]?\s*([A-Z0-9*-]{3,})\b/i) ?? [])[3];

        return {
            ...ev,
            text,
            entities: { orderId, email, errorCode },
        };
    }

    private triage(msg: NormalizedMessage): TriageDecision {
        // Hard gates
        if (/(refund|退款)/i.test(msg.text)) {
            return { category: "refund", severity: "high", autoAllowed: false, escalationReason: "refund requires human approval" };
        }
        if (/(ban|封号|suspend|冻结)/i.test(msg.text)) {
            return { category: "ban_appeal", severity: "high", autoAllowed: false, escalationReason: "account enforcement sensitive" };
        }
        if (/(fuck|idiot|傻逼|辱骂)/i.test(msg.text)) {
            return { category: "abuse", severity: "medium", autoAllowed: true };
        }

        // Heuristics
        if (/(pay|payment|credit|card|充值|支付|扣款)/i.test(msg.text)) {
            return { category: "payment", severity: "high", autoAllowed: true };
        }
        if (/(login|验证码|登录|无法进入|bind|绑定)/i.test(msg.text)) {
            return { category: "login", severity: "medium", autoAllowed: true };
        }
        if (/(bug|crash|闪退|卡死|黑屏|报错)/i.test(msg.text)) {
            return { category: "bug", severity: "high", autoAllowed: true };
        }

        return { category: "general", severity: "low", autoAllowed: true };
    }

    private composeReply(msg: NormalizedMessage, triage: TriageDecision, evidence: EvidencePack): ReplyDraft {
        const greeting = msg.fromName ? `Hi ${msg.fromName},` : `Hi,`;
        const confirm = `Thanks for reaching out. I’m looking into this with you.`;
        const topEvidence = evidence.items[0]?.snippet;
        const base = `${greeting}\n\n${confirm}\n\n`;

        switch (triage.category) {
            case "payment":
                return {
                    text:
                        base +
                        `To help us verify the transaction, could you share:\n` +
                        `1) Payment method (App Store / Google Play / card)\n` +
                        `2) Transaction ID (if available)\n` +
                        `3) Approx. time of purchase and your in-game UID\n\n` +
                        (topEvidence ? `Meanwhile, here’s a quick checklist that solves most payment delays:\n- ${topEvidence}\n\n` : "") +
                        `Once I have the info above, I’ll confirm the status and next steps.`,
                    requiresUserInfo: ["payment_method", "transaction_id", "purchase_time", "uid"],
                };

            case "bug":
                return {
                    text:
                        base +
                        `Sorry about the issue. Please share:\n` +
                        `1) Device model + OS version\n` +
                        `2) Your in-game UID\n` +
                        `3) What you were doing right before it happened\n` +
                        `4) Screenshot/video if possible\n\n` +
                        (msg.entities.errorCode ? `I also saw an error code: ${msg.entities.errorCode}. That helps.\n\n` : "") +
                        (topEvidence ? `Try this first (often works):\n- ${topEvidence}\n\n` : "") +
                        `After you send the details, I’ll either confirm the fix or escalate to engineering with a complete repro.`,
                    requiresUserInfo: ["device", "os", "uid", "steps", "media"],
                };

            case "abuse":
                return {
                    text:
                        base +
                        `I can help, but I need to keep the conversation respectful so we can resolve it efficiently.\n\n` +
                        `Please tell me what happened (one or two sentences is enough), and I’ll take it from there.`,
                    requiresUserInfo: ["issue_summary"],
                };

            default:
                return {
                    text:
                        base +
                        `Could you briefly describe the problem and include your in-game UID (if applicable)?\n\n` +
                        `Once I have that, I’ll point you to the right fix or escalate it.`,
                    requiresUserInfo: ["issue_summary", "uid"],
                };
        }
    }

    private guardrails(draft: ReplyDraft, triage: TriageDecision): ReplyDraft | null {
        const t = draft.text.toLowerCase();

        // Prevent asking for sensitive secrets
        if (/(password|密码|cvv|security code)/i.test(t)) return null;

        // Prevent hard promises
        if (/(guarantee|保证|一定会)/i.test(t)) return null;

        // Some categories should never auto-send (already gated in triage, but double lock)
        if (triage.category === "refund" || triage.category === "ban_appeal") return null;

        return draft;
    }

    async runRescan(nowMs: number) {
        const openCases = await this.cases.listOpenCasesForRescan(nowMs);
        for (const c of openCases) {
            // MVP: if waiting user too long, send a gentle ping once.
            await this.cases.appendCaseNote(c.caseId, `Rescan tick at ${new Date(nowMs).toISOString()}`);
        }
    }

    async runDailyReport(dayStartMs: number, dayEndMs: number) {
        const agg = await this.cases.aggregateDailyReport(dayStartMs, dayEndMs);
        const body =
            `Daily Community Report\n` +
            `Time range: ${new Date(dayStartMs).toISOString()} - ${new Date(dayEndMs).toISOString()}\n\n` +
            `Summary:\n` +
            `- Total threads handled: ${agg.totalThreads}\n` +
            `- Auto-resolved: ${agg.autoResolved}\n` +
            `- Escalated: ${agg.escalated}\n` +
            `- Top categories: ${JSON.stringify(agg.topCategories)}\n\n` +
            `Open items:\n` +
            `${(agg.openCases ?? []).map((x: any) => ` - ${x.caseId} (${x.category}/${x.status})`).join("\n")}\n`;

        await this.notifier.dailyReport("Daily Community Report", body, agg);
    }
}
