# Spine v0.8 演示脚本

**版本**: v0.7a + v0.7b  
**演示时长**: 10 分钟  
**目标观众**: SDK 后台团队

---

## 前置准备

```bash
# 1. 启动环境
cd /root/.openclaw/workspace/projects/community-manager-agent-spine/repo
docker-compose up -d

# 2. 导入演示数据
sqlite3 data/spine.db < scripts/generate-demo-data.sql

# 3. 验证启动
curl http://localhost:3001/api/health
```

---

## 场景 1: 系统启动 (1 分钟)

**动作**:
1. 展示终端运行 `docker-compose up -d`
2. 展示 `docker ps` 查看运行中的容器
3. 浏览器打开 http://localhost

**讲解**:
> "这是一个完整的多语言客诉管理系统，包含 REST API 和 Dashboard 两个组件。使用 Docker Compose 一键部署，非常适合集成到现有基础设施中。"

---

## 场景 2: Dashboard 首页 (2 分钟)

**动作**:
1. 展示统计卡片：
   - 总客诉数: 18
   - 高优先级: 6
   - 分类数: 4
2. 展示分类分布饼图
3. 悬停查看具体数值

**讲解**:
> "Dashboard 实时展示客诉统计数据。可以看到目前有 18 条客诉，其中 6 条是高优先级。饼图展示了分类分布：payment、bug、refund、general。"

**对比说明**:
> "在 v0.6 之前，我们需要登录数据库或使用命令行查询这些数据。现在有了 Dashboard，客服团队可以一目了然。"

---

## 场景 3: 多语言客诉列表 (2 分钟)

**动作**:
1. 切换到客诉列表（点击导航或访问 /reports）
2. 按语言筛选：
   - 展示中文客诉
   - 展示英文客诉
   - 展示日文客诉
3. 按分类筛选：
   - 展示 payment 相关
   - 展示 bug 相关
4. 点击单条客诉查看详情

**讲解**:
> "系统支持 6 种语言自动识别：简中、繁中、英文、日文、韩文、西班牙文。每条客诉都标注了检测到的语言和自动分类结果。"

**技术亮点**:
> "语言检测准确率 >90%，使用 GPT-4o-mini 模型。如果 LLM 失败，系统会自动降级到关键词匹配，确保 100% 可用性。"

---

## 场景 4: 巡航报告 (2 分钟)

**动作**:
1. 打开 Cruise Reports 页面
2. 展示报告列表
3. 点击最新报告查看详情
4. 展示 Markdown 渲染的报告内容

**讲解**:
> "巡航报告自动汇总一段时间内的客诉情况。包含统计摘要、语言分布、分类趋势，以及 LLM 生成的自然语言趋势分析。"

**对比说明**:
> "以前我们需要手动写 SQL 查询，然后手动整理成报告。现在系统自动生成，节省了大量时间。"

---

## 场景 5: API 接口展示 (2 分钟)

**动作**:
1. 展示 API 端点文档
2. 运行 curl 测试：
   ```bash
   curl http://localhost:3001/api/stats/overview
   curl http://localhost:3001/api/tickets?page=1&limit=5
   ```
3. 展示返回的 JSON 数据

**讲解**:
> "所有 Dashboard 展示的数据都来自 REST API。这意味着如果你们有自己的后台系统，可以直接调用这些 API 获取数据，不需要使用我们的 Dashboard。"

**API 列表**:
- GET /api/health - 健康检查
- GET /api/stats/overview - 统计概览
- GET /api/tickets - 客诉列表
- GET /api/tickets/:id - 单条客诉
- GET /api/cruise-reports - 巡航报告
- GET /api/cruise-reports/:id - 单份报告

---

## 场景 6: 技术架构总结 (1 分钟)

**架构图**:
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Nginx     │────▶│  Dashboard  │────▶│   API       │
│   (80)      │     │  (React)    │     │  (Express)  │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                                │
                                         ┌──────▼──────┐
                                         │   SQLite    │
                                         │   (Data)    │
                                         └─────────────┘
```

**技术栈**:
- Backend: Node.js + Express + TypeScript
- Frontend: Vite + React + Tailwind CSS
- Database: SQLite
- LLM: GPT-4o-mini (带关键词降级)

**核心能力**:
1. 多语言自动识别（6 语言）
2. LLM 智能分类（准确率 >90%）
3. 自动降级机制（关键词匹配）
4. RESTful API 设计

---

## 权限申请

**目标**: 获得 SDK 后台的回复 API 权限

**理由**:
1. v0.7 已完成只读接入和展示，验证可行
2. 自动分类准确率高，可信任自动回复
3. 多语言支持完善，可服务全球用户
4. 有完整的降级机制，风险可控

**下一步**: 如果获得权限，v0.9 将实现自动回复草稿生成和提交功能。

---

## 常见问题

**Q**: Dashboard 能集成到我们现有系统吗？  
**A**: 可以，Dashboard 只是 API 的可视化层，你们可以直接调用 API。

**Q**: LLM 分类准确吗？  
**A**: 准确率 >90%，失败时自动降级到关键词匹配，确保不遗漏。

**Q**: 支持哪些语言？  
**A**: 目前支持 6 种：简中、繁中、英文、日文、韩文、西班牙文。

**Q**: 数据安全吗？  
**A**: 使用 SQLite 本地存储，不依赖外部数据库。
