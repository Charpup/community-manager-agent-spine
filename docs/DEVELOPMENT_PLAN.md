# 开发计划 (Development Plan)

## 项目愿景

Community Manager Agent Spine 是一个事件驱动的自动化社区管理系统。通过可插拔的 Connector 架构，支持多平台接入（Facebook、SDK 后台等），实现智能工单分类、自动回复和审计追踪。

## 核心价值

1. **可扩展架构**：基于 `InboxConnector` 接口，轻松接入新平台
2. **智能分类**：自动识别工单类型（支付、Bug、退款等）
3. **安全防护**：多层 Guardrails 确保回复质量
4. **完整审计**：所有操作记录到数据库，可追溯

## 当前状态 (Current Status)

✅ **已完成**：
- Facebook Graph API 集成
- SQLite 数据持久化
- 基于规则的意图识别
- 消息去重机制
- 审计日志系统

## 下一步开发计划

### 阶段一：SDK 后台集成 (Mock 阶段) - 进行中

**目标**：在没有真实 SDK 后台 API 的情况下，通过 Mock Server 验证集成流程。

**任务清单**：
- [ ] 扩展 `Channel` 类型支持 `sdk_backend`
- [ ] 实现 `SDKBackendConnector` (适配 InboxConnector 接口)
- [ ] 实现 `MockSDKServer` (模拟 SDK 后台 HTTP API)
- [ ] 更新 `main.ts` 支持新的运行模式
- [ ] 集成测试：验证 Agent 能处理 SDK 后台工单

**技术方案**：
详见 [SDK 后台集成方案建议书](./sdk_backend_proposal.md)

**预期产出**：
- 完整的 Mock 测试环境
- 可运行的 SDK 后台模式演示
- 集成测试用例

### 阶段二：SDK 后台接口对接 (待 API 文档)

**前置条件**：获得 SDK 后台 API 文档和测试环境

**任务清单**：
- [ ] 对接真实 SDK 后台 API
- [ ] 环境配置支持（.env 变量）
- [ ] 错误处理和重试机制
- [ ] API 认证集成

### 阶段三：双向联调 (待测试环境)

**任务清单**：
- [ ] 接入 SDK 测试服
- [ ] 端到端测试
- [ ] 性能优化
- [ ] 生产环境部署准备

### 阶段四：LLM 增强 (未来规划)

**目标**：从基于规则的分类升级到 LLM 驱动的智能分析

**任务清单**：
- [ ] 集成 LLM API (OpenAI/Claude/本地模型)
- [ ] Prompt Engineering
- [ ] 上下文管理
- [ ] 成本控制策略

### 阶段五：多平台扩展 (未来规划)

**目标**：支持更多社区平台

**候选平台**：
- Discord
- Email (IMAP/SMTP)
- Telegram
- 微信公众号

## 如何参与开发

### 快速上手

1. **克隆仓库**
   ```bash
   git clone https://github.com/Charpup/community-manager-agent-spine.git
   cd community-manager-agent-spine
   npm install
   ```

2. **运行测试模式**
   ```bash
   npm run test
   ```

3. **阅读代码**
   - 从 `src/agent.ts` 开始了解核心逻辑
   - 查看 `src/connectors/facebook.ts` 了解 Connector 实现
   - 参考 `src/mocks.ts` 了解测试模式

### 开发规范

- **代码风格**：TypeScript + 函数式编程优先
- **测试**：每个 Connector 必须有对应的 Mock 实现
- **文档**：重要功能需要在 docs/ 目录添加说明
- **提交**：使用清晰的 commit message

### 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 技术栈

- **运行时**：Node.js 18+
- **语言**：TypeScript
- **数据库**：SQLite (better-sqlite3)
- **API**：Facebook Graph API v19.0
- **测试**：内置 Mock 系统

## 联系方式

- GitHub Issues: [提交问题](https://github.com/Charpup/community-manager-agent-spine/issues)
- 项目维护者：[@Charpup](https://github.com/Charpup)

## 许可证

MIT License - 详见 LICENSE 文件
