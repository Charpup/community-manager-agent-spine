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
    Category,
    Language,
} from "./types";
import { detectLanguage } from './i18n/detect';
import { classifyWithKeywords } from './i18n/keywords';
import { LLMClient } from './llm/client';
import { LLMClassificationResult } from './llm/types';
import { Config } from './config';

export class CommunityAgent {
    private llmClient: LLMClient | null = null;
    
    constructor(
        private connector: InboxConnector,
        private cases: CaseRepository,
        private kb: KnowledgeBase,
        private notifier: Notifier,
        private config?: Config
    ) {
        // 如果配置了 LLM，初始化客户端
        if (config?.llmApiKey) {
            this.llmClient = new LLMClient({
                apiKey: config.llmApiKey,
                baseUrl: config.llmBaseUrl,
                model: config.llmModel,
                timeoutMs: config.llmTimeoutMs,
                retryCount: config.llmRetryCount,
                fallbackEnabled: config.llmFallbackEnabled
            });
        }
    }

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
        const triage = await this.triage(normalized);

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
                detected_language: triage.detected_language,
                confidence: triage.confidence,
            };
        } else {
            caseRec.lastMessageAtMs = ev.timestampMs;
            // Update detected language and confidence on new messages
            caseRec.detected_language = triage.detected_language;
            caseRec.confidence = triage.confidence;
            // If the user replies again, typically we're back in progress.
            if (caseRec.status === "WAITING_USER") {
                const prevStatus = caseRec.status;
                caseRec.status = "IN_PROGRESS";
                // 审计日志: STATUS_CHANGED (延后到 upsert 后记录)
            }
        }

        // Persist the case update and the raw message
        await this.cases.upsertCase(caseRec);

        // 尝试记录消息，如果是重复消息则跳过处理
        try {
            await this.cases.recordMessage(caseRec.caseId, normalized);
        } catch (err: any) {
            if (err.name === "DuplicateMessageError") {
                console.log(`[Agent] Skipping duplicate message: ${ev.messageId}`);
                return; // 不继续处理，不回复
            }
            throw err; // 其他错误重新抛出
        }

        // 审计日志: TRIAGED
        await this.cases.appendAction(caseRec.caseId, {
            type: "TRIAGED",
            atMs: Date.now(),
            payload: triage,
        });

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
            // 审计日志: ESCALATED
            await this.cases.appendAction(caseRec.caseId, {
                type: "ESCALATED",
                atMs: Date.now(),
                payload: { reason: triage.escalationReason ?? "policy gate" },
            });
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
            // 审计日志: ESCALATED (guardrails)
            await this.cases.appendAction(caseRec.caseId, {
                type: "ESCALATED",
                atMs: Date.now(),
                payload: { reason: "guardrails rejected reply" },
            });
            await this.cases.appendCaseNote(caseRec.caseId, "Escalated: guardrails rejected reply");
            return;
        }

        // Action Execution
        await this.connector.sendReply(ev.threadId, approved.text);
        caseRec.lastAgentActionAtMs = Date.now();

        // 审计日志: AUTO_REPLIED
        await this.cases.appendAction(caseRec.caseId, {
            type: "AUTO_REPLIED",
            atMs: Date.now(),
            payload: { text: approved.text.substring(0, 100) + "..." },
        });

        // If we asked user for more info, we wait.
        const prevStatus = caseRec.status;
        caseRec.status = approved.requiresUserInfo?.length ? "WAITING_USER" : "RESOLVED";
        await this.cases.upsertCase(caseRec);

        // 审计日志: STATUS_CHANGED
        if (prevStatus !== caseRec.status) {
            await this.cases.appendAction(caseRec.caseId, {
                type: "STATUS_CHANGED",
                atMs: Date.now(),
                payload: { from: prevStatus, to: caseRec.status },
            });
        }

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

    private async triage(msg: NormalizedMessage): Promise<TriageDecision> {
        // Step 1: 检测语言 (多语言支持)
        const detected_language = detectLanguage(msg.text);
        console.log(`[Triage] Language detected: ${detected_language}`);

        // Step 2: 尝试 LLM 分类 (传递语言信息以获得更好的多语言分类结果)
        let result: LLMClassificationResult;
        let source: 'llm' | 'keyword';

        if (this.llmClient && this.config?.llmFallbackEnabled !== false) {
            try {
                // 尝试 LLM 分类，传入检测到的语言以优化多语言理解
                const llmResult = await this.llmClient.classifyTicket(
                    msg.text,
                    detected_language
                );

                result = llmResult;
                source = 'llm';

                console.log(`[Triage] LLM classification [${detected_language}]: ${result.category} (${result.confidence})`);

            } catch (error: any) {
                // LLM 失败，降级到多语言关键词匹配
                console.warn(`[Triage] LLM failed, falling back to keywords: ${error.message}`);

                result = this.classifyWithKeywordsFallback(msg.text, detected_language);
                source = 'keyword';
            }
        } else {
            // 未配置 LLM，使用多语言关键词分类
            result = this.classifyWithKeywordsFallback(msg.text, detected_language);
            source = 'keyword';
        }

        // Step 3: 确定严重度和自动回复权限
        const { severity, autoAllowed } = this.getSeverityAndAutoAllow(
            result.category,
            result.confidence
        );

        // Step 4: 多语言分类结果组装
        return {
            category: result.category,
            severity,
            autoAllowed,
            detected_language,
            confidence: result.confidence,
            reasoning: `[${detected_language}] ${result.reasoning}`,
            escalationReason: autoAllowed ? undefined : this.getEscalationReason(result.category),
            source  // 记录分类来源
        };
    }

    /**
     * 关键词降级分类
     */
    private classifyWithKeywordsFallback(
        content: string,
        language: Language
    ): LLMClassificationResult {
        const categories: Category[] = ['payment', 'refund', 'bug', 'ban_appeal', 'abuse', 'general'];
        let bestCategory: Category = 'general';
        let bestConfidence = 0;

        for (const category of categories) {
            const confidence = classifyWithKeywords(content, category, language);
            if (confidence > bestConfidence) {
                bestConfidence = confidence;
                bestCategory = category;
            }
        }

        // 构造 LLMClassificationResult 格式
        return {
            category: bestCategory,
            confidence: bestConfidence,
            reasoning: `Keyword matching (${language})`,
            severity: this.inferSeverity(bestCategory),
            source: 'keyword'
        };
    }

    private inferSeverity(category: Category): 'low' | 'medium' | 'high' | 'critical' {
        switch (category) {
            case 'refund':
            case 'ban_appeal':
                return 'high';
            case 'payment':
            case 'bug':
                return 'high';
            case 'abuse':
                return 'medium';
            default:
                return 'low';
        }
    }

    private getSeverityAndAutoAllow(category: Category, confidence: number): { severity: "low" | "medium" | "high" | "critical", autoAllowed: boolean } {
        // Confidence threshold: must be >= threshold to auto-reply
        // Can be overridden via env var for testing
        const CONFIDENCE_THRESHOLD = parseFloat(process.env.CLASSIFIER_CONFIDENCE_THRESHOLD || '0.7');
        const hasEnoughConfidence = confidence >= CONFIDENCE_THRESHOLD;

        switch (category) {
            case 'refund':
            case 'ban_appeal':
                // These categories always require human handling
                return { severity: 'high', autoAllowed: false };

            case 'payment':
            case 'bug':
                // High severity, auto-allowed only if confidence is high enough
                return { severity: 'high', autoAllowed: hasEnoughConfidence };

            case 'abuse':
                // Medium severity, auto-allowed if confidence is high enough
                return { severity: 'medium', autoAllowed: hasEnoughConfidence };

            case 'general':
            default:
                // Low severity, generally auto-allowed
                return { severity: 'low', autoAllowed: hasEnoughConfidence };
        }
    }

    private getEscalationReason(category: Category): string {
        switch (category) {
            case 'refund':
                return 'refund requires human approval';
            case 'ban_appeal':
                return 'account enforcement sensitive';
            case 'payment':
            case 'bug':
                return 'low confidence in classification';
            case 'abuse':
                return 'potential abuse report needs review';
            case 'general':
            default:
                return 'policy gate';
        }
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
