# Community Manager Agent Spine — v0.6 LLM 增强分类

> **版本**: v0.6.0  
> **代号**: LLM Enhanced  
> **目标**: LLM 驱动分类 + 智能巡航报告  
> **开发模式**: 黄金三角 (planning-with-files + task-workflow + tdd-sdd)  
> **预计工期**: 2-3 天  

---

## 🎯 核心目标

1. **LLM 分类引擎**: 使用 GPT-4o-mini 进行多语言客诉分类
2. **降级策略**: LLM 故障/超时时自动降级到 v0.5 关键词匹配
3. **智能报告**: LLM 生成自然语言趋势分析和建议
4. **对比验证**: 同一批客诉用 LLM 和关键词分别分类，输出准确率对比

---

## 🤖 LLM 配置

```yaml
base_url: https://api.apiyi.com/v1
api_key: ${LLM_API_KEY}  # 从环境变量读取，不要硬编码
model: gpt-4o-mini  # 推荐: 性价比高，多语言能力强

# Token 限制 (已确认):
# - Context Window: 128K tokens
# - Max Output: 16,384 tokens
# - 单批次 10 条客诉远低于上限

# 批次策略:
# - 分类: 单条调用 (prompt ~500 tokens, output ~200 tokens)
# - 趋势分析: 批量调用 (prompt ~2000 tokens, output ~1000 tokens)
```

---

## 📦 模块设计

### 新增模块

```
src/
├── llm/                           # 新增: LLM 核心
│   ├── client.ts                  # LLM API 封装
│   ├── prompts.ts                 # Prompt 模板
│   └── retry.ts                   # 重试机制
├── agent.ts                       # 修改: triage() LLM 重构
├── reports/cruise-report.ts       # 修改: 集成 LLM 趋势分析
└── scripts/                       # 新增: 对比测试
    └── compare-classifiers.ts
```

---

## 🔤 LLM 分类设计

### 分类 Prompt 模板

```typescript
const classifyPrompt = `
你是一个游戏客服分类助手。请分析以下客诉内容，选择最合适的分类。

客诉内容: "{{content}}"
检测语言: {{language}}

可选分类:
1. payment - 充值/支付问题 (如: 充值失败、扣费未到账)
2. refund - 退款诉求 (如: 要求退款、退钱)
3. bug - 游戏技术问题 (如: 闪退、卡顿、黑屏)
4. ban_appeal - 封号/解封申诉 (如: 账号被封、误封)
5. abuse - 举报/作弊 (如: 外挂、辱骂、作弊)
6. general - 其他一般咨询

请输出 JSON 格式:
{
  "category": "分类名称",
  "confidence": 0.95,
  "reasoning": "简要分类理由(1-2句)",
  "severity": "low|medium|high|critical"
}

注意:
- confidence 必须是 0-1 之间的数字
- 如果涉及退款或封号，severity 应为 high
- 仅用上述6个分类之一
`;
```

### 降级策略

```
┌─────────────────────────────────────────────────────────────┐
│                    triage() 流程                            │
├─────────────────────────────────────────────────────────────┤
│  Step 1: 检测语言 (i18n/detect.ts)                          │
│       ↓                                                     │
│  Step 2: 尝试 LLM 分类                                      │
│       ├─ 成功 ──→ 返回 LLM 结果                             │
│       └─ 失败 ──→ 降级到关键词匹配 (v0.5)                   │
│                      ↓                                      │
│              返回关键词结果                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 智能巡航报告

### LLM 趋势分析 Prompt

```typescript
const trendAnalysisPrompt = `
你是一名客服数据分析专家。请根据以下巡航统计数据生成趋势分析。

统计周期: {{timeRange}}
新增客诉: {{total}} 条
分类分布: {{categoryStats}}
语言分布: {{languageStats}}
高优先级: {{highPriority}} 条

请生成中文分析报告，包含:
1. 总体趋势判断（增长/平稳/下降）
2. 主要问题类别分析
3. 需要关注的高风险项
4. 建议采取的措施

输出格式:
## 趋势分析
{{analysis}}

## 建议关注
{{recommendations}}
`;
```

---

## ✅ 验收标准

### 功能验收

- [ ] LLM 分类支持 6 语言 (简中/繁中/英文/日文/韩文/西班牙文)
- [ ] 分类准确率 > 90% (高于 v0.5 关键词的 85%)
- [ ] LLM 故障时 100% 降级到关键词，不中断服务
- [ ] 巡航报告包含自然语言趋势分析
- [ ] 对比脚本可运行并输出准确率对比表

### 性能验收

- [ ] 单次 LLM 分类 < 2 秒
- [ ] 支持批量分类 (10 条/批次)
- [ ] LLM 超时处理 (30 秒超时 → 降级)

### 测试验收

- [ ] LLM client 单元测试 ( mock + 真实 API )
- [ ] 降级策略测试
- [ ] 对比测试脚本验证准确率提升

---

## 📝 环境变量

```bash
# v0.6 新增
LLM_API_KEY=sk-ArcTL2YXC3saNNWq92A303339a944b2fAd28477f9413Cb80
LLM_BASE_URL=https://api.apiyi.com/v1
LLM_MODEL=gpt-4o-mini
LLM_TIMEOUT_MS=30000           # LLM 调用超时
LLM_RETRY_COUNT=3              # 重试次数
LLM_FALLBACK_ENABLED=true      # 是否启用降级
```

---

## 🏗️ 子代理任务分配

### 批次 1: LLM 基础设施 (并行)

| 子代理 | 任务 | 文件 |
|--------|------|------|
| v06-sub1-llm-client | LLM Client + 重试 | `src/llm/client.ts`, `src/llm/retry.ts` |
| v06-sub2-prompts | Prompt 模板 | `src/llm/prompts.ts` |

### 批次 2: 核心集成 (并行)

| 子代理 | 任务 | 文件 |
|--------|------|------|
| v06-sub3-classifier | triage() 重构 | `src/agent.ts` |
| v06-sub4-reports | 报告 LLM 增强 | `src/reports/cruise-report.ts` |

### 批次 3: 验证工具

| 子代理 | 任务 | 文件 |
|--------|------|------|
| v06-sub5-compare | 对比测试脚本 | `src/scripts/compare-classifiers.ts` |

---

*Planning Date: 2026-02-16*  
*Golden Triangle: planning-with-files + task-workflow + tdd-sdd*
