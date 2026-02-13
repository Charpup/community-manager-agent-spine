---
description: 启动 Docker 开发环境并确认热重载状态
---

// turbo-all
1. 检查 Docker 守护进程是否可用
   运行 `docker info` 确认 Docker 已启动。

2. 启动项目容器
   运行 `docker compose up agent -d` 以后台模式启动 Agent 容器。

3. 验证运行状态
   运行 `docker ps` 确认 `community-manager-agent-spine-agent-1` 容器正在运行。

4. 确认热重载就绪
   运行 `docker compose logs agent --tail 20` 并在日志中确认看到 `[INFO] ts-node-dev ver.` 相关信息。

5. 报告结果
   向用户反馈开发环境已就绪。
