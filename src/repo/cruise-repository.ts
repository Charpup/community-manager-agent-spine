/**
 * Cruise Repository - 巡航日志数据库操作封装
 * v0.5 新增
 */

import { CruiseLog } from '../types';

/**
 * 巡航日志仓储接口
 */
export interface CruiseRepository {
    /**
     * 保存巡航日志
     * @param log 巡航日志数据 (不含 id)
     * @returns 新创建记录的 id
     */
    saveCruiseLog(log: Omit<CruiseLog, 'id'>): Promise<number>;
    
    /**
     * 获取指定时间戳之后的巡航日志
     * @param since 起始时间戳 (毫秒)
     * @param limit 最大返回数量
     * @returns 巡航日志列表
     */
    getCruiseLogs(since: number, limit: number): Promise<CruiseLog[]>;
    
    /**
     * 获取最新的巡航日志
     * @returns 最新的巡航日志，如果没有则返回 null
     */
    getLatestCruiseLog(): Promise<CruiseLog | null>;
}

/**
 * SQLite 实现的巡航日志仓储
 * 可以集成到 SQLiteCaseRepository 中或单独使用
 */
export class SQLiteCruiseRepository implements CruiseRepository {
    // 此实现可以稍后添加到 SQLiteCaseRepository 中
    // 或作为独立模块使用
    
    constructor() {
        // 构造函数将在集成时实现
        throw new Error('SQLiteCruiseRepository not yet implemented - integrate into SQLiteCaseRepository or implement separately');
    }
    
    async saveCruiseLog(_log: Omit<CruiseLog, 'id'>): Promise<number> {
        throw new Error('Method not implemented');
    }
    
    async getCruiseLogs(_since: number, _limit: number): Promise<CruiseLog[]> {
        throw new Error('Method not implemented');
    }
    
    async getLatestCruiseLog(): Promise<CruiseLog | null> {
        throw new Error('Method not implemented');
    }
}

/**
 * 巡航仓储工厂函数
 * 可以在需要时创建实例
 */
export function createCruiseRepository(/* db: Database.Database */): CruiseRepository {
    // 返回适当的实现
    // 如果集成到 SQLiteCaseRepository，可以返回其 cruise 相关方法
    throw new Error('CruiseRepository factory not yet implemented');
}
