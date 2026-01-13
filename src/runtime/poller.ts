/**
 * Poll Loop - 增量轮询运行时
 * 
 * 定时调用 agent.runPoll() 获取新消息并处理
 */

import { CommunityAgent } from "../agent";
import { InboxConnector } from "../types";

export interface PollLoopOptions {
    agent: CommunityAgent;
    connector: InboxConnector;
    intervalMs: number;
}

export function startPollLoop(opts: PollLoopOptions): void {
    // 首次启动时，从 5 分钟前开始拉取
    let sinceMs = Date.now() - 5 * 60 * 1000;

    console.log(`[PollLoop] Started with interval ${opts.intervalMs}ms, initial sinceMs: ${new Date(sinceMs).toISOString()}`);

    // 立即执行一次
    runPoll();

    // 然后定时执行
    setInterval(runPoll, opts.intervalMs);

    async function runPoll() {
        try {
            const newSinceMs = await opts.agent.runPoll(sinceMs);
            if (newSinceMs > sinceMs) {
                sinceMs = newSinceMs;
            }
        } catch (e) {
            console.error("[PollLoop] Poll failed:", e);
            // 不崩溃，继续下一次轮询
        }
    }
}
