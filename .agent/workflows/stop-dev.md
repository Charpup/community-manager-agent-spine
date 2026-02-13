---
description: 停止并清理 Docker 开发环境
---

// turbo-all
1. 停止并移除容器
   运行 `docker compose down` 以停止所有服务并移除容器和网络。
   *注意：数据库数据因为在挂载卷中，所以会被保留。*

2. 验证状态
   运行 `docker ps --filter "name=community-manager-agent-spine"` 确认相关容器已消失。

3. 报告结果
   通知用户开发环境已停止。
