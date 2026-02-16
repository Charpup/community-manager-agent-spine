# v0.5 黄金三角执行计划 — 子代理任务分配

> **目标**: 使用黄金三角 (planning-with-files + task-workflow + tdd-sdd) 完成 v0.5 多语言版本开发  
> **预计工期**: 3-4 天  
> **并行度**: 4 个子代理  

---

## 🎯 黄金三角执行概览

```
┌─────────────────────────────────────────────────────────────────┐
│                    黄金三角 v0.5 执行流程                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Phase 1: PLANNING (planning-with-files)                        │
│  ├── task_plan_v0.5.md      ✅ 已创建                           │
│  ├── SPEC.v0.5.yaml         ✅ 已创建                           │
│  └── task_board_v0.5.json   ✅ 已创建                           │
│                              ↓                                  │
│  Phase 2: DEVELOPMENT (TDD-SDD)                                 │
│  ├── 子代理并行开发 (4个批次)                                    │
│  │   ├── v05-sub1-i18n      → i18n模块                          │
│  │   ├── v05-sub2-classifier→ 分类器重构                        │
│  │   ├── v05-sub3-reports   → 报告系统                          │
│  │   └── v05-sub4-scheduler → 调度+配置                         │
│  └── 主代理协调 + 集成                                          │
│                              ↓                                  │
│  Phase 3: INTEGRATION                                           │
│  ├── 集成测试                                                    │
│  ├── 验收标准检查                                                │
│  └── 合并到 master                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 👥 子代理任务分配

### 批次 1: 基础设施层 (并行)
**触发条件**: 立即执行，无依赖

| 子代理 | 标签 | 任务 | 文件 |
|--------|------|------|------|
| **v05-sub1-i18n** | `v05-sub1-i18n` | 多语言关键词 + 语言检测 | `src/i18n/keywords.ts`, `src/i18n/detect.ts` |
| **v05-sub4-scheduler** | `v05-sub4-scheduler` | 数据库迁移 + 配置扩展 | `src/repo/migrations.sql`, `src/config.ts` |

**子代理 1 任务详情**:
```yaml
label: "v05-sub1-i18n"
task: |
  实现 v0.5 多语言支持模块:
  
  1. 创建 src/i18n/keywords.ts:
     - 实现 categoryKeywords 映射表
     - 支持6语言: zh-CN, zh-TW, en, ja, ko, es
     - 6分类: payment, refund, bug, ban_appeal, abuse
     - 实现 getKeywordsForCategory(category, language) 函数
     - 实现 classifyWithKeywords(content, category, language) 函数
  
  2. 创建 src/i18n/detect.ts:
     - 实现 detectLanguage(content): string 函数
     - 使用简单 heuristics 或 cld3 库
     - 返回语言代码: 'zh-CN' | 'zh-TW' | 'en' | 'ja' | 'ko' | 'es' | 'unknown'
     - 准确率目标 > 90% for P0 语言
  
  3. 创建对应单元测试:
     - tests/unit/i18n/keywords.test.ts
     - tests/unit/i18n/detect.test.ts
  
  4. 按 SPEC.v0.5.yaml 执行 TDD 流程:
     - RED: 先写测试，运行确认失败
     - GREEN: 实现代码，测试通过
     - REFACTOR: 优化代码质量
  
  工作目录: /root/.openclaw/workspace/projects/community-manager-agent-spine/repo
  先读取 SPEC.v0.5.yaml 了解测试要求
```

**子代理 4 (批次1) 任务详情**:
```yaml
label: "v05-sub4-scheduler"
task: |
  实现 v0.5 基础设施:
  
  1. 更新 src/repo/migrations.sql:
     - 添加 CREATE TABLE cruise_logs (id, timestamp, report_md, stats_json, duration_ms)
     - 添加 ALTER TABLE tickets: detected_language, category_confidence
  
  2. 更新 src/config.ts:
     - 添加 CRUISE_INTERVAL_MS (default: 300000)
     - 添加 CRUISE_REPORT_LANGUAGE (default: 'zh-CN')
     - 添加 CRUISE_BATCH_SIZE (default: 100)
     - 更新 loadConfig() 和 validateConfig()
  
  3. 更新 src/types.ts:
     - 添加 Category 类型
     - 添加 Language 类型  
     - 添加 CruiseLog 类型
     - 更新 Ticket 类型
  
  4. 更新 .env.example
  
  5. 创建对应单元测试
  
  工作目录: /root/.openclaw/workspace/projects/community-manager-agent-spine/repo
  先读取 SPEC.v0.5.yaml 了解类型定义要求
```

---

### 批次 2: 核心功能层 (并行)
**触发条件**: 批次 1 完成后
**依赖**: v05-001 ✅, v05-002 ✅, v05-006 ✅, v05-008 ✅

| 子代理 | 标签 | 任务 | 文件 |
|--------|------|------|------|
| **v05-sub2-classifier** | `v05-sub2-classifier` | 分类器重构 | `src/agent.ts` |
| **v05-sub3-reports** | `v05-sub3-reports` | 报告系统 | `src/reports/*.ts` |

**子代理 2 任务详情**:
```yaml
label: "v05-sub2-classifier"
task: |
  重构 agent.ts 实现多语言分类:
  
  1. 更新 src/agent.ts 的 triage():
     - 集成 i18n/detect.ts 进行语言检测
     - 集成 i18n/keywords.ts 进行关键词匹配
     - 返回类型: { category, confidence, detected_language }
     - 降级策略: keywords → general
  
  2. 更新 src/types.ts:
     - 确保类型定义与 agent.ts 一致
  
  3. 创建集成测试:
     - tests/integration/multilingual-classification.test.ts
     - 测试 4 P0 语言 × 6 分类 = 24 种组合
  
  4. 验证:
     - 简中/繁中/英文准确率 > 85%
     - 日文准确率 > 75%
  
  依赖: v05-sub1-i18n 已完成 (i18n/* 已就绪)
  工作目录: /root/.openclaw/workspace/projects/community-manager-agent-spine/repo
```

**子代理 3 任务详情**:
```yaml
label: "v05-sub3-reports"
task: |
  实现巡航报告系统:
  
  1. 创建 src/reports/cruise-report.ts:
     - generateCruiseReport(tickets, options): string
     - 生成 Markdown 格式报告
     - 包含: 摘要、语言分布、分类统计、高优先级队列
  
  2. 创建 src/reports/formatters.ts:
     - formatDuration(ms): string (e.g., "1h 32m")
     - formatPercentage(count, total): string
     - formatTimestamp(ts): string (CST timezone)
  
  3. 创建 src/reports/templates.ts:
     - 报告模板定义
     - 支持可配置输出语言
  
  4. 创建 src/i18n/reports.ts:
     - 报告标题、表头的多语言模板
     - 支持 zh-CN, zh-TW, en, ja
  
  5. 创建单元测试:
     - tests/unit/reports/cruise-report.test.ts
  
  工作目录: /root/.openclaw/workspace/projects/community-manager-agent-spine/repo
```

---

### 批次 3: 集成层 (并行)
**触发条件**: 批次 2 完成后
**依赖**: v05-003 ✅, v05-004 ✅, v05-005 ✅

| 子代理 | 标签 | 任务 | 文件 |
|--------|------|------|------|
| **v05-sub4-scheduler** | `v05-sub4-scheduler` | 调度器 + CLI | `src/runtime/cruise-scheduler.ts`, `src/main.ts` |

**子代理 4 (批次3) 任务详情**:
```yaml
label: "v05-sub4-scheduler"
task: |
  实现定时巡航调度器和CLI:
  
  1. 创建 src/runtime/cruise-scheduler.ts:
     - CruiseScheduler 类
     - start(): 启动定时调度
     - stop(): 停止调度
     - 使用 setInterval 实现
     - 调用 reports/cruise-report.ts 生成报告
     - 存储结果到 cruise_logs 表
  
  2. 更新 src/main.ts:
     - 添加 --cruise-once 参数处理
     - 单次执行模式: 执行一次巡航并输出报告到 stdout
     - 定时模式: 启动 CruiseScheduler
  
  3. 创建验收测试:
     - tests/acceptance/cruise-workflow.test.ts
     - 测试完整巡航流程
  
  依赖: v05-sub2-classifier 和 v05-sub3-reports 已完成
  工作目录: /root/.openclaw/workspace/projects/community-manager-agent-spine/repo
```

---

### 批次 4: 验证层
**触发条件**: 批次 3 完成后
**依赖**: 全部前置任务 ✅

| 执行者 | 任务 | 内容 |
|--------|------|------|
| **Galatea (主代理)** | 集成测试 + 验收 | 端到端验证、覆盖率检查、合并 |

---

## 📊 执行时间线

```
Day 1 (Today)
├── 00:00-02:00  Phase 1: Planning ✅ 已完成
│   └── task_plan_v0.5.md, SPEC.v0.5.yaml, task_board_v0.5.json
├── 02:00-08:00  Phase 2 Batch 1: 基础设施
│   ├── v05-sub1-i18n 并行执行
│   └── v05-sub4-scheduler 并行执行
└── 08:00-12:00  集成检查 + 批次1验收

Day 2
├── 00:00-08:00  Phase 2 Batch 2: 核心功能
│   ├── v05-sub2-classifier 并行
│   └── v05-sub3-reports 并行
└── 08:00-12:00  集成检查 + 批次2验收

Day 3
├── 00:00-06:00  Phase 2 Batch 3: 集成层
│   └── v05-sub4-scheduler 执行
└── 06:00-12:00  集成检查 + 批次3验收

Day 4
├── 00:00-06:00  Phase 3: 验证层
│   ├── 端到端测试
│   ├── 多语言准确率验证
│   └── 覆盖率检查 (>70%)
└── 06:00-12:00  合并到 master, 打 tag v0.5.0
```

---

## 🚀 启动命令

### 启动批次 1 (现在可执行)

```javascript
// 子代理 1: i18n 模块
sessions_spawn({
  label: "v05-sub1-i18n",
  task: "实现 v0.5 多语言支持模块..." // 详见上文
});

// 子代理 4: 基础设施
sessions_spawn({
  label: "v05-sub4-scheduler",
  task: "实现 v0.5 基础设施..." // 详见上文
});
```

### 检查批次 1 完成状态

```bash
cd /root/.openclaw/workspace/projects/community-manager-agent-spine/repo

# 检查文件是否存在
ls -la src/i18n/
ls -la tests/unit/i18n/

# 运行测试
npm test -- --testPathPattern=i18n
```

---

## ✅ 验收检查清单

### 批次 1 验收
- [ ] src/i18n/keywords.ts 存在且编译通过
- [ ] src/i18n/detect.ts 存在且编译通过
- [ ] tests/unit/i18n/*.test.ts 全部通过
- [ ] src/repo/migrations.sql 包含 cruise_logs
- [ ] src/config.ts 包含 CRUISE_* 配置

### 批次 2 验收
- [ ] src/agent.ts triage() 返回多语言结果
- [ ] tests/integration/multilingual-classification.test.ts 通过
- [ ] src/reports/cruise-report.ts 生成有效 Markdown
- [ ] 分类准确率: 简中/繁中/en > 85%, ja > 75%

### 批次 3 验收
- [ ] --cruise-once 参数正常工作
- [ ] 定时巡航每 N 分钟执行
- [ ] 报告存入 cruise_logs 表

### 最终验收
- [ ] 整体测试覆盖率 > 70%
- [ ] 端到端测试通过
- [ ] 代码审查通过

---

## 📁 交付物清单

| 类别 | 文件 | 负责 |
|------|------|------|
| 规划 | task_plan_v0.5.md | Galatea ✅ |
| 规划 | SPEC.v0.5.yaml | Galatea ✅ |
| 规划 | task_board_v0.5.json | Galatea ✅ |
| 规划 | subagent_plan_v0.5.md | Galatea ✅ |
| 源码 | src/i18n/*.ts | v05-sub1-i18n |
| 源码 | src/reports/*.ts | v05-sub3-reports |
| 源码 | src/runtime/cruise-scheduler.ts | v05-sub4-scheduler |
| 源码 | src/agent.ts (更新) | v05-sub2-classifier |
| 源码 | src/config.ts (更新) | v05-sub4-scheduler |
| 源码 | src/repo/migrations.sql (更新) | v05-sub4-scheduler |
| 测试 | tests/unit/**/*.test.ts | 各子代理 |
| 测试 | tests/integration/*.test.ts | 各子代理 |
| 测试 | tests/acceptance/*.test.ts | v05-sub4-scheduler |

---

**状态**: Phase 1 规划完成 ✅，等待批准启动 Phase 2 开发

**下一步**: 批准后立即启动 4 个子代理并行开发
