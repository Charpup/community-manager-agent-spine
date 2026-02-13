/**
 * Rescan Scheduler - 定时复扫调度器
 * 
 * 每隔固定时间间隔执行 agent.runRescan()，用于检查超时未回复的 Case。
 * 错误不会导致进程崩溃。
 */

import { setInterval } from "node:timers";

export function startRescanLoop(agent: { runRescan: (nowMs: number) => Promise<void> }, intervalMs: number) {
    console.log(`[Scheduler] Rescan loop started (interval: ${intervalMs}ms)`);

    setInterval(async () => {
        const now = Date.now();
        try {
            await agent.runRescan(now);
            console.log(`[Scheduler] Rescan tick completed at ${new Date(now).toISOString()}`);
        } catch (e) {
            console.error("[Scheduler] Rescan tick failed:", e);
            // 不抛出错误，确保进程不会崩溃
        }
    }, intervalMs);
}
