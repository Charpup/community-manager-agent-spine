import { generateCruiseReport, calculateCruiseStats, CruiseReportOptions } from '../../../src/reports/cruise-report';
import { Ticket, CruiseStats, Language, Category } from '../../../src/types';

describe('Cruise Report Generator', () => {
    describe('calculateCruiseStats', () => {
        it('should calculate stats for empty ticket array', () => {
            const stats = calculateCruiseStats([]);
            
            expect(stats.total).toBe(0);
            expect(Object.keys(stats.categories)).toHaveLength(0);
            expect(Object.keys(stats.languages)).toHaveLength(0);
            expect(stats.highPriority).toBe(0);
        });

        it('should calculate total count correctly', () => {
            const tickets: Ticket[] = [
                { id: '1', text: 'test1', category: 'general', severity: 'low', detected_language: 'zh-CN' },
                { id: '2', text: 'test2', category: 'payment', severity: 'medium', detected_language: 'en' },
                { id: '3', text: 'test3', category: 'bug', severity: 'high', detected_language: 'ja' },
            ];
            
            const stats = calculateCruiseStats(tickets);
            expect(stats.total).toBe(3);
        });

        it('should calculate category distribution correctly', () => {
            const tickets: Ticket[] = [
                { id: '1', text: 'test1', category: 'payment', severity: 'low', detected_language: 'zh-CN' },
                { id: '2', text: 'test2', category: 'payment', severity: 'medium', detected_language: 'en' },
                { id: '3', text: 'test3', category: 'bug', severity: 'high', detected_language: 'ja' },
                { id: '4', text: 'test4', category: 'general', severity: 'low', detected_language: 'ko' },
            ];
            
            const stats = calculateCruiseStats(tickets);
            expect(stats.categories['payment']).toBe(2);
            expect(stats.categories['bug']).toBe(1);
            expect(stats.categories['general']).toBe(1);
        });

        it('should calculate language distribution correctly', () => {
            const tickets: Ticket[] = [
                { id: '1', text: 'test1', category: 'general', severity: 'low', detected_language: 'zh-CN' },
                { id: '2', text: 'test2', category: 'payment', severity: 'medium', detected_language: 'zh-CN' },
                { id: '3', text: 'test3', category: 'bug', severity: 'high', detected_language: 'en' },
            ];
            
            const stats = calculateCruiseStats(tickets);
            expect(stats.languages['zh-CN']).toBe(2);
            expect(stats.languages['en']).toBe(1);
        });

        it('should handle tickets without detected_language', () => {
            const tickets: Ticket[] = [
                { id: '1', text: 'test1', category: 'general', severity: 'low' },
                { id: '2', text: 'test2', category: 'payment', severity: 'medium', detected_language: 'en' },
            ];
            
            const stats = calculateCruiseStats(tickets);
            expect(stats.languages['en']).toBe(1);
            expect(Object.keys(stats.languages)).toHaveLength(1);
        });

        it('should count high priority and critical tickets', () => {
            const tickets: Ticket[] = [
                { id: '1', text: 'test1', category: 'general', severity: 'low' },
                { id: '2', text: 'test2', category: 'payment', severity: 'high' },
                { id: '3', text: 'test3', category: 'bug', severity: 'critical' },
                { id: '4', text: 'test4', category: 'refund', severity: 'medium' },
                { id: '5', text: 'test5', category: 'abuse', severity: 'high' },
            ];
            
            const stats = calculateCruiseStats(tickets);
            expect(stats.highPriority).toBe(3);
        });
    });

    describe('generateCruiseReport', () => {
        const mockTickets: Ticket[] = [
            { id: 'T001', text: '充值未到账，请尽快处理', category: 'payment', severity: 'high', detected_language: 'zh-CN' },
            { id: 'T002', text: '申请退款', category: 'refund', severity: 'medium', detected_language: 'zh-CN' },
            { id: 'T003', text: 'Game bug report', category: 'bug', severity: 'low', detected_language: 'en' },
            { id: 'T004', text: 'アカウントがBANされました', category: 'ban_appeal', severity: 'critical', detected_language: 'ja' },
        ];

        const mockStats: CruiseStats = {
            total: 4,
            categories: {
                'payment': 1,
                'refund': 1,
                'bug': 1,
                'ban_appeal': 1,
                'abuse': 0,
                'general': 0
            },
            languages: {
                'zh-CN': 2,
                'zh-TW': 0,
                'en': 1,
                'ja': 1,
                'ko': 0,
                'es': 0,
                'unknown': 0
            },
            highPriority: 2
        };

        it('should generate report with correct title in zh-CN', async () => {
            const options: CruiseReportOptions = { language: 'zh-CN' };
            const report = await generateCruiseReport(mockTickets, mockStats, options);
            
            expect(report).toContain('# 客诉巡航报告');
            expect(report).toContain('执行摘要');
        });

        it('should generate report with correct title in en', async () => {
            const options: CruiseReportOptions = { language: 'en' };
            const report = await generateCruiseReport(mockTickets, mockStats, options);
            
            expect(report).toContain('# Ticket Cruise Report');
            expect(report).toContain('Executive Summary');
        });

        it('should generate report with correct title in ja', async () => {
            const options: CruiseReportOptions = { language: 'ja' };
            const report = await generateCruiseReport(mockTickets, mockStats, options);
            
            expect(report).toContain('# 問い合わせ巡航レポート');
            expect(report).toContain('概要');
        });

        it('should include executive summary with correct stats', async () => {
            const options: CruiseReportOptions = { language: 'zh-CN' };
            const report = await generateCruiseReport(mockTickets, mockStats, options);
            
            expect(report).toContain('新增客诉: 4');
            expect(report).toContain('高优先级: 2');
        });

        it('should include language distribution table', async () => {
            const options: CruiseReportOptions = { language: 'zh-CN' };
            const report = await generateCruiseReport(mockTickets, mockStats, options);
            
            expect(report).toContain('## 语言分布');
            expect(report).toContain('| 简体中文 | 2 | 50.0% |');
            expect(report).toContain('| 英文 | 1 | 25.0% |');
        });

        it('should include category statistics table', async () => {
            const options: CruiseReportOptions = { language: 'zh-CN' };
            const report = await generateCruiseReport(mockTickets, mockStats, options);
            
            expect(report).toContain('## 分类统计');
            expect(report).toContain('💰 充值/支付');
            expect(report).toContain('🔄 退款');
            expect(report).toContain('🐛 游戏Bug');
            expect(report).toContain('🔒 封号申诉');
        });

        it('should include high priority queue section', async () => {
            const options: CruiseReportOptions = { language: 'zh-CN' };
            const report = await generateCruiseReport(mockTickets, mockStats, options);
            
            expect(report).toContain('## 高优先级队列');
            expect(report).toContain('| T001 | zh-CN | payment |');
            expect(report).toContain('| T004 | ja | ban_appeal |');
        });

        it('should limit high priority tickets to 10', async () => {
            const manyHighPriorityTickets: Ticket[] = Array.from({ length: 15 }, (_, i) => ({
                id: `T${String(i + 1).padStart(3, '0')}`,
                text: `High priority ticket ${i + 1}`,
                category: 'payment' as Category,
                severity: 'high',
                detected_language: 'zh-CN'
            }));
            
            const stats: CruiseStats = {
                total: 15,
                categories: { 'payment': 15, 'refund': 0, 'bug': 0, 'ban_appeal': 0, 'abuse': 0, 'general': 0 },
                languages: { 'zh-CN': 15, 'zh-TW': 0, 'en': 0, 'ja': 0, 'ko': 0, 'es': 0, 'unknown': 0 },
                highPriority: 15
            };
            
            const options: CruiseReportOptions = { language: 'zh-CN' };
            const report = await generateCruiseReport(manyHighPriorityTickets, stats, options);
            
            // Should only contain up to T010, not T011
            expect(report).toContain('T010');
            expect(report).not.toContain('T011');
        });

        it('should not include high priority queue when no high priority tickets', async () => {
            const lowPriorityTickets: Ticket[] = [
                { id: 'T001', text: 'General question', category: 'general', severity: 'low' },
                { id: 'T002', text: 'Another question', category: 'general', severity: 'medium' },
            ];
            
            const stats: CruiseStats = {
                total: 2,
                categories: { 'payment': 0, 'refund': 0, 'bug': 0, 'ban_appeal': 0, 'abuse': 0, 'general': 2 },
                languages: { 'zh-CN': 0, 'zh-TW': 0, 'en': 0, 'ja': 0, 'ko': 0, 'es': 0, 'unknown': 0 },
                highPriority: 0
            };
            
            const options: CruiseReportOptions = { language: 'zh-CN' };
            const report = await generateCruiseReport(lowPriorityTickets, stats, options);
            
            expect(report).not.toContain('## 高优先级队列');
        });

        it('should include footer with version', async () => {
            const options: CruiseReportOptions = { language: 'zh-CN' };
            const report = await generateCruiseReport(mockTickets, mockStats, options);
            
            expect(report).toContain('Generated by Community Manager Agent Spine v0.6.0');
        });

        it('should handle tickets without language gracefully', async () => {
            const ticketsWithoutLang: Ticket[] = [
                { id: 'T001', text: 'Test', category: 'general', severity: 'high' },
            ];
            
            const stats: CruiseStats = {
                total: 1,
                categories: { 'payment': 0, 'refund': 0, 'bug': 0, 'ban_appeal': 0, 'abuse': 0, 'general': 1 },
                languages: { 'zh-CN': 0, 'zh-TW': 0, 'en': 0, 'ja': 0, 'ko': 0, 'es': 0, 'unknown': 0 },
                highPriority: 1
            };
            
            const options: CruiseReportOptions = { language: 'zh-CN' };
            const report = await generateCruiseReport(ticketsWithoutLang, stats, options);
            
            expect(report).toContain('| T001 | - | general |');
        });

        it('should fallback to en when language is unknown', async () => {
            const options: CruiseReportOptions = { language: 'unknown' as Language };
            const report = await generateCruiseReport(mockTickets, mockStats, options);
            
            expect(report).toContain('# Ticket Cruise Report');
        });
    });
});
