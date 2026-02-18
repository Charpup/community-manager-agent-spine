# Spine v0.8 部署问题排查指南

**版本**: v0.8  
**最后更新**: 2026-02-18  
**适用环境**: Docker / Podman

---

## 快速开始（修复后版本）

```bash
# 克隆代码
git clone https://github.com/Charpup/community-manager-agent-spine.git
cd community-manager-agent-spine

# 启动服务（自动应用所有修复）
docker compose up -d

# 或 Podman
podman-compose up -d

# 等待服务启动
sleep 10

# 验证 API
curl http://localhost:3001/api/health
# 输出: {"status":"ok","timestamp":...}

# 导入演示数据
docker exec -i spine-api sqlite3 /data/spine.db < scripts/generate-demo-data.sql
# 或 Podman
podman exec -i spine-api sqlite3 /data/spine.db < scripts/generate-demo-data.sql

# 插入 cases 数据（如需）
docker exec -i spine-api sqlite3 /data/spine.db "INSERT INTO cases ..."

# 访问 Dashboard
open http://localhost
```

---

## 已知卡点及解决方案

### 卡点 #1: Docker Daemon 未运行

**症状**:
```
Cannot connect to the Docker daemon at unix:///var/run/docker.sock. 
Is the docker daemon running?
```

**原因**: Linux 宿主机限制，Docker daemon 无法启动

**解决方案 - 使用 Podman**:
```bash
# 安装 Podman（如未安装）
# CentOS/RHEL: sudo yum install podman podman-compose
# Ubuntu: sudo apt install podman podman-compose

# 使用 Podman 替代 Docker
podman-compose up -d
```

---

### 卡点 #2: Nginx 镜像短名称解析失败

**症状**:
```
Error: creating build container: short-name resolution enforced but cannot prompt without a TTY
ERROR:podman_compose:Build command failed
```

**原因**: Podman 默认启用短名称解析，无法确定 `nginx:alpine` 的完整地址

**解决方案** - 修改 `dashboard/Dockerfile`:
```dockerfile
# ❌ 错误
FROM nginx:alpine

# ✅ 正确
FROM docker.io/library/nginx:alpine
```

---

### 卡点 #3: nginx.conf 路径错误

**症状**:
```
Error: building at STEP "COPY nginx.conf /etc/nginx/conf.d/default.conf": 
checking on sources under "/.../dashboard": copier: stat: "/nginx.conf": no such file or directory
```

**原因**: Dashboard Dockerfile 尝试从父目录复制 nginx.conf，但构建上下文只在 dashboard 目录

**解决方案** - 创建 `dashboard/nginx-simple.conf`:
```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
}
```

修改 `dashboard/Dockerfile`:
```dockerfile
# ❌ 错误
COPY nginx.conf /etc/nginx/conf.d/default.conf

# ✅ 正确
COPY nginx-simple.conf /etc/nginx/conf.d/default.conf
```

---

### 卡点 #4: Dashboard 容器启动后退出

**症状**:
```
"events" directive is not allowed here in /etc/nginx/conf.d/default.conf:1
nginx: [emerg] "events" directive is not allowed here
```

**原因**: 使用了完整的 nginx.conf（包含 events/http 块），但 Alpine Nginx 只需要 server 块配置

**解决方案**: 使用简化版 `nginx-simple.conf`（见卡点 #3）

---

### 卡点 #5: API 缺少环境变量

**症状**:
```
[Fatal Error] ConfigValidationError: Configuration validation failed:
  - FB_PAGE_ID is required when CHANNEL=facebook
  - FB_PAGE_ACCESS_TOKEN is required when CHANNEL=facebook
```

**原因**: 默认 `CHANNEL=facebook`，需要 Facebook 相关配置

**解决方案** - 修改 `docker-compose.yml`:
```yaml
environment:
  - NODE_ENV=production
  - CHANNEL=sdk_backend          # ✅ 指定使用 SDK Backend
  - API_PORT=3001
  - SQLITE_PATH=/data/spine.db
  - SDK_BACKEND_TOKEN=demo_token  # ✅ SDK Backend 配置
  - SDK_BACKEND_BASE_URL=http://localhost:8080
```

---

### 卡点 #6: migrations.sql 文件缺失

**症状**:
```
[Fatal Error] Error: ENOENT: no such file or directory, open '/app/dist/repo/migrations.sql'
```

**原因**: TypeScript 编译后，migrations.sql 未被复制到 dist 目录

**解决方案** - 修改 `Dockerfile`:
```dockerfile
# 在 Stage 2 中添加
COPY --from=builder /app/src/repo/migrations.sql ./dist/repo/migrations.sql
```

---

### 卡点 #7: 容器内缺少 sqlite3

**症状**:
```
Error: crun: executable file `sqlite3` not found in $PATH: No such file or directory
```

**原因**: Node Alpine 镜像不包含 sqlite3 命令行工具

**解决方案** - 修改 `Dockerfile`:
```dockerfile
FROM node:20-alpine

# 添加 sqlite
RUN apk add --no-cache sqlite

WORKDIR /app
```

---

### 卡点 #8: 数据库表名不匹配

**症状**:
```
GET /api/stats/overview
{ "totalTickets": 0, "pendingHighPriority": 0, "categoryDistribution": {} }
```

**原因**: 
- 演示数据插入到 `tickets` 表
- API 查询 `cases` 表
- 表结构完全不同

**解决方案**: 插入正确格式的数据到 `cases` 表:
```sql
INSERT INTO cases (case_id, channel, thread_id, user_id, status, category, severity, last_message_at_ms, created_at_ms, updated_at_ms) 
VALUES 
('case-001', 'sdk_backend', 'thread-001', 'user-001', 'NEW', 'payment', 'high', 1771418000000, 1771418000000, 1771418000000),
('case-002', 'sdk_backend', 'thread-002', 'user-002', 'TRIAGED', 'bug', 'critical', 1771418100000, 1771418100000, 1771418100000);
```

---

## 修复后的文件清单

以下文件已修复，确保使用最新版本：

| 文件 | 修改内容 |
|------|----------|
| `Dockerfile` | 添加 `apk add sqlite` 和 `COPY migrations.sql` |
| `dashboard/Dockerfile` | 使用完整镜像地址，使用 `nginx-simple.conf` |
| `dashboard/nginx-simple.conf` | **新增文件** - 简化版 Nginx 配置 |
| `docker-compose.yml` | 添加 `CHANNEL=sdk_backend` 环境变量 |

---

## 环境变量参考

### 必需环境变量

| 变量 | 说明 | 示例值 |
|------|------|--------|
| `NODE_ENV` | 运行环境 | `production` |
| `CHANNEL` | 消息渠道 | `sdk_backend` |
| `API_PORT` | API 端口 | `3001` |
| `SQLITE_PATH` | 数据库路径 | `/data/spine.db` |
| `SDK_BACKEND_TOKEN` | SDK Token | `demo_token` |
| `SDK_BACKEND_BASE_URL` | SDK URL | `http://localhost:8080` |

### 可选环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `CRUISE_INTERVAL_MS` | 巡航间隔 | `300000` (5分钟) |
| `CRUISE_REPORT_LANGUAGE` | 报告语言 | `zh-CN` |

---

## 常用命令

### 查看日志
```bash
# Docker
docker logs -f spine-api
docker logs -f spine-dashboard
docker logs -f spine-nginx

# Podman
podman logs -f spine-api
podman logs -f spine-dashboard
podman logs -f spine-nginx
```

### 重启服务
```bash
# Docker
docker compose restart

# Podman
podman-compose restart
```

### 进入容器调试
```bash
# Docker
docker exec -it spine-api sh
docker exec -it spine-api sqlite3 /data/spine.db

# Podman
podman exec -it spine-api sh
podman exec -it spine-api sqlite3 /data/spine.db
```

### 数据库操作
```bash
# 查看表结构
podman exec -i spine-api sqlite3 /data/spine.db ".schema"

# 查询数据
podman exec -i spine-api sqlite3 /data/spine.db "SELECT * FROM cases LIMIT 5;"

# 统计数据
podman exec -i spine-api sqlite3 /data/spine.db "SELECT COUNT(*) FROM cases;"
```

---

## 验证检查清单

部署完成后，使用以下清单验证：

- [ ] 容器状态: `docker ps` 或 `podman ps` 显示 3 个容器 UP
- [ ] API Health: `curl http://localhost:3001/api/health` 返回 `{"status":"ok"}`
- [ ] Stats API: `curl http://localhost:3001/api/stats/overview` 返回统计数据
- [ ] Tickets API: `curl http://localhost:3001/api/tickets` 返回列表
- [ ] Dashboard: 浏览器访问 `http://localhost` 显示页面

---

## 联系支持

如遇其他问题，请检查：
1. 本文档是否已覆盖该问题
2. 是否使用了最新版本的代码
3. 日志输出是否有明确错误信息
