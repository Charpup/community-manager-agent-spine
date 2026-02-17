-- 演示数据生成脚本
-- 运行: sqlite3 data/spine.db < scripts/generate-demo-data.sql

-- 清空现有数据（可选）
-- DELETE FROM tickets;

-- 简体中文 - Payment (充值失败)
INSERT INTO tickets (id, text, category, severity, detected_language, status, created_at) VALUES
('zh-001', '我充值了但是没有到账，订单号是123456', 'payment', 'high', 'zh-CN', 'open', datetime('now', '-2 days')),
('zh-002', '充值失败，钱扣了但是游戏币没到账', 'payment', 'high', 'zh-CN', 'open', datetime('now', '-1 day')),
('zh-003', '请问充值可以退款吗？我不小心充错了', 'refund', 'medium', 'zh-CN', 'open', datetime('now', '-3 days'));

-- 简体中文 - Bug (闪退)
INSERT INTO tickets (id, text, category, severity, detected_language, status, created_at) VALUES
('zh-004', '游戏总是闪退，iPhone 14 Pro', 'bug', 'high', 'zh-CN', 'open', datetime('now', '-1 day')),
('zh-005', '登录后黑屏，无法进入游戏', 'bug', 'critical', 'zh-CN', 'open', datetime('now'));

-- 繁体中文 - Bug
INSERT INTO tickets (id, text, category, severity, detected_language, status, created_at) VALUES
('zh-TW-001', '遊戲會閃退，請問怎麼解決？', 'bug', 'high', 'zh-TW', 'open', datetime('now', '-2 days')),
('zh-TW-002', '無法登入，顯示連線錯誤', 'bug', 'medium', 'zh-TW', 'open', datetime('now', '-1 day'));

-- 英文 - Payment/Refund
INSERT INTO tickets (id, text, category, severity, detected_language, status, created_at) VALUES
('en-001', 'I paid but didn''t receive my items, order #123456', 'payment', 'high', 'en', 'open', datetime('now', '-2 days')),
('en-002', 'Payment failed but money was deducted from my account', 'payment', 'high', 'en', 'open', datetime('now', '-1 day')),
('en-003', 'Can I get a refund? I accidentally purchased the wrong item', 'refund', 'medium', 'en', 'open', datetime('now', '-3 days')),
('en-004', 'How do I request a refund for my purchase?', 'refund', 'low', 'en', 'open', datetime('now', '-2 days'));

-- 英文 - Bug
INSERT INTO tickets (id, text, category, severity, detected_language, status, created_at) VALUES
('en-005', 'Game keeps crashing on my Samsung Galaxy S23', 'bug', 'high', 'en', 'open', datetime('now', '-1 day'));

-- 日文 - Payment
INSERT INTO tickets (id, text, category, severity, detected_language, status, created_at) VALUES
('ja-001', '課金しましたが、アイテムが届きません', 'payment', 'high', 'ja', 'open', datetime('now', '-2 days')),
('ja-002', '課金履歴を確認したいです', 'payment', 'low', 'ja', 'open', datetime('now', '-3 days'));

-- 日文 - Bug
INSERT INTO tickets (id, text, category, severity, detected_language, status, created_at) VALUES
('ja-003', 'ゲームがクラッシュします。iPhone 15です', 'bug', 'high', 'ja', 'open', datetime('now', '-1 day'));

-- 韩文 - Payment
INSERT INTO tickets (id, text, category, severity, detected_language, status, created_at) VALUES
('ko-001', '결제했는데 아이템을 받지 못했습니다', 'payment', 'high', 'ko', 'open', datetime('now', '-2 days'));

-- 韩文 - Bug
INSERT INTO tickets (id, text, category, severity, detected_language, status, created_at) VALUES
('ko-002', '게임이 강제 종료됩니다. 해결해주세요', 'bug', 'high', 'ko', 'open', datetime('now', '-1 day'));

-- 西班牙文
INSERT INTO tickets (id, text, category, severity, detected_language, status, created_at) VALUES
('es-001', 'Pagé pero no recibí mis artículos', 'payment', 'high', 'es', 'open', datetime('now', '-2 days')),
('es-002', 'El juego se cierra repentinamente', 'bug', 'medium', 'es', 'open', datetime('now', '-1 day'));

-- 通用咨询
INSERT INTO tickets (id, text, category, severity, detected_language, status, created_at) VALUES
('general-001', '请问游戏什么时候更新新版本？', 'general', 'low', 'zh-CN', 'open', datetime('now', '-3 days')),
('general-002', 'How can I contact customer support?', 'general', 'low', 'en', 'open', datetime('now', '-2 days'));

-- 创建巡航报告示例
INSERT INTO cruise_reports (id, created_at, ticket_count, high_priority_count, content) VALUES
(1, datetime('now', '-1 day'), 15, 3, '# 客诉巡航报告 - 2026-02-17

## 统计概览
- 总客诉: 15 条
- 高优先级: 3 条
- 分类分布: payment(5), bug(6), refund(2), general(2)

## 语言分布
- 简体中文: 5 条
- 英文: 5 条
- 日文: 2 条
- 韩文: 2 条
- 西班牙文: 2 条

## 趋势分析
充值相关客诉占比较高，建议优先处理支付渠道问题。');
