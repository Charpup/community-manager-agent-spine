/**
 * SQLite Case Repository - 持久化存储实现
 */

import Database from "better-sqlite3";
import * as fs from "fs";
import * as path from "path";
import {
    CaseRepository,
    CaseRecord,
    NormalizedMessage,
    CaseAction,
    Channel,
} from "../types";

// 自定义错误类型用于去重检测
export class DuplicateMessageError extends Error {
    constructor(messageId: string) {
        super(`Duplicate message: ${messageId}`);
        this.name = "DuplicateMessageError";
    }
}

export class SQLiteCaseRepository implements CaseRepository {
    private db: Database.Database;

    constructor(dbPath: string) {
        // 确保目录存在
        const dir = path.dirname(dbPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        this.db = new Database(dbPath);
        this.db.pragma("journal_mode = WAL");
        this.runMigrations();
        console.log(`[SQLiteRepo] Database initialized at ${dbPath}`);
    }

    private runMigrations(): void {
        const migrationsPath = path.join(__dirname, "migrations.sql");
        const sql = fs.readFileSync(migrationsPath, "utf-8");
        this.db.exec(sql);
        console.log("[SQLiteRepo] Migrations completed");
    }

    async getCaseByThread(channel: Channel, threadId: string): Promise<CaseRecord | null> {
        const row = this.db
            .prepare("SELECT * FROM cases WHERE channel = ? AND thread_id = ?")
            .get(channel, threadId) as any;

        if (!row) return null;

        return {
            caseId: row.case_id,
            channel: row.channel as Channel,
            threadId: row.thread_id,
            userId: row.user_id,
            status: row.status,
            category: row.category,
            severity: row.severity,
            lastMessageAtMs: row.last_message_at_ms,
            lastAgentActionAtMs: row.last_agent_action_at_ms ?? undefined,
            assignedTo: row.assigned_to ?? undefined,
            notes: row.notes_json ? JSON.parse(row.notes_json) : [],
        };
    }

    async upsertCase(rec: CaseRecord): Promise<void> {
        const now = Date.now();
        const existing = this.db
            .prepare("SELECT case_id FROM cases WHERE case_id = ?")
            .get(rec.caseId);

        if (existing) {
            this.db
                .prepare(`
                    UPDATE cases SET
                        status = ?,
                        category = ?,
                        severity = ?,
                        last_message_at_ms = ?,
                        last_agent_action_at_ms = ?,
                        assigned_to = ?,
                        notes_json = ?,
                        updated_at_ms = ?
                    WHERE case_id = ?
                `)
                .run(
                    rec.status,
                    rec.category,
                    rec.severity,
                    rec.lastMessageAtMs,
                    rec.lastAgentActionAtMs ?? null,
                    rec.assignedTo ?? null,
                    JSON.stringify(rec.notes ?? []),
                    now,
                    rec.caseId
                );
        } else {
            this.db
                .prepare(`
                    INSERT INTO cases (
                        case_id, channel, thread_id, user_id, status, category, severity,
                        last_message_at_ms, last_agent_action_at_ms, assigned_to, notes_json,
                        created_at_ms, updated_at_ms
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `)
                .run(
                    rec.caseId,
                    rec.channel,
                    rec.threadId,
                    rec.userId,
                    rec.status,
                    rec.category,
                    rec.severity,
                    rec.lastMessageAtMs,
                    rec.lastAgentActionAtMs ?? null,
                    rec.assignedTo ?? null,
                    JSON.stringify(rec.notes ?? []),
                    now,
                    now
                );
        }

        console.log(`[SQLiteRepo] UPSERT Case ${rec.caseId} Status=${rec.status}`);
    }

    async appendCaseNote(caseId: string, note: string): Promise<void> {
        const row = this.db
            .prepare("SELECT notes_json FROM cases WHERE case_id = ?")
            .get(caseId) as any;

        if (row) {
            const notes: string[] = row.notes_json ? JSON.parse(row.notes_json) : [];
            notes.push(note);
            this.db
                .prepare("UPDATE cases SET notes_json = ?, updated_at_ms = ? WHERE case_id = ?")
                .run(JSON.stringify(notes), Date.now(), caseId);
            console.log(`[SQLiteRepo] NOTE on ${caseId}: ${note.substring(0, 50)}...`);
        }
    }

    async appendAction(caseId: string, action: CaseAction): Promise<void> {
        this.db
            .prepare(`
                INSERT INTO actions (case_id, type, at_ms, payload_json)
                VALUES (?, ?, ?, ?)
            `)
            .run(caseId, action.type, action.atMs, JSON.stringify(action.payload));

        console.log(`[SQLiteRepo] ACTION on ${caseId}: ${action.type}`);
    }

    async recordMessage(caseId: string, msg: NormalizedMessage): Promise<void> {
        try {
            this.db
                .prepare(`
                    INSERT INTO messages (
                        message_id, case_id, thread_id, user_id, text, timestamp_ms, raw_json, created_at_ms
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `)
                .run(
                    msg.messageId,
                    caseId,
                    msg.threadId,
                    msg.fromUserId,
                    msg.text,
                    msg.timestampMs,
                    msg.raw ? JSON.stringify(msg.raw) : null,
                    Date.now()
                );
        } catch (err: any) {
            // SQLite UNIQUE constraint violation
            if (err.code === "SQLITE_CONSTRAINT_PRIMARYKEY" || err.message?.includes("UNIQUE constraint failed")) {
                throw new DuplicateMessageError(msg.messageId);
            }
            throw err;
        }
    }

    async listOpenCasesForRescan(nowMs: number): Promise<CaseRecord[]> {
        const rows = this.db
            .prepare(`
                SELECT * FROM cases 
                WHERE status NOT IN ('CLOSED', 'RESOLVED') 
                ORDER BY last_message_at_ms DESC
            `)
            .all() as any[];

        return rows.map((row) => ({
            caseId: row.case_id,
            channel: row.channel as Channel,
            threadId: row.thread_id,
            userId: row.user_id,
            status: row.status,
            category: row.category,
            severity: row.severity,
            lastMessageAtMs: row.last_message_at_ms,
            lastAgentActionAtMs: row.last_agent_action_at_ms ?? undefined,
            assignedTo: row.assigned_to ?? undefined,
            notes: row.notes_json ? JSON.parse(row.notes_json) : [],
        }));
    }

    async aggregateDailyReport(dayStartMs: number, dayEndMs: number): Promise<any> {
        const totalThreads = this.db
            .prepare(`
                SELECT COUNT(*) as count FROM cases 
                WHERE last_message_at_ms >= ? AND last_message_at_ms <= ?
            `)
            .get(dayStartMs, dayEndMs) as any;

        const autoResolved = this.db
            .prepare(`
                SELECT COUNT(*) as count FROM cases 
                WHERE last_message_at_ms >= ? AND last_message_at_ms <= ?
                AND status IN ('RESOLVED', 'WAITING_USER')
            `)
            .get(dayStartMs, dayEndMs) as any;

        const escalated = this.db
            .prepare(`
                SELECT COUNT(*) as count FROM cases 
                WHERE last_message_at_ms >= ? AND last_message_at_ms <= ?
                AND status = 'ESCALATED'
            `)
            .get(dayStartMs, dayEndMs) as any;

        const categoryRows = this.db
            .prepare(`
                SELECT category, COUNT(*) as count FROM cases 
                WHERE last_message_at_ms >= ? AND last_message_at_ms <= ?
                GROUP BY category
            `)
            .all(dayStartMs, dayEndMs) as any[];

        const topCategories: Record<string, number> = {};
        for (const row of categoryRows) {
            topCategories[row.category] = row.count;
        }

        const openRows = this.db
            .prepare(`
                SELECT * FROM cases 
                WHERE status NOT IN ('CLOSED', 'RESOLVED')
                ORDER BY last_message_at_ms DESC
                LIMIT 20
            `)
            .all() as any[];

        const openCases = openRows.map((row) => ({
            caseId: row.case_id,
            category: row.category,
            status: row.status,
        }));

        return {
            totalThreads: totalThreads?.count ?? 0,
            autoResolved: autoResolved?.count ?? 0,
            escalated: escalated?.count ?? 0,
            topCategories,
            openCases,
        };
    }

    close(): void {
        this.db.close();
    }
}
