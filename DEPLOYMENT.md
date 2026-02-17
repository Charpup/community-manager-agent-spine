# Spine 部署指南

**版本**: v0.8  
**部署方式**: Docker Compose  
**预计时间**: 5 分钟

---

## 前置要求

- Docker >= 20.0
- Docker Compose >= 2.0
- 2GB 可用内存
- 10GB 可用磁盘空间

---

## 快速开始

### 1. 克隆代码

```bash
git clone https://github.com/Charpup/community-manager-agent-spine.git
cd community-manager-agent-spine
```

### 2. 启动服务

```bash
docker-compose up -d
```

### 3. 导入演示数据（可选）

```bash
# 等待服务启动
sleep 5

# 导入演示数据
docker exec -i spine-api sqlite3 /data/spine.db < scripts/generate-demo-data.sql
```

### 4. 访问系统

- Dashboard: http://localhost
- API: http://localhost:3001

---

## 服务说明

| 服务 | 端口 | 说明 |
|------|------|------|
| spine-api | 3001 | REST API 服务 |
| dashboard | 3000 | Dashboard UI（通过 Nginx 代理）|
| nginx | 80 | 反向代理，统一入口 |

---

## 环境变量

### API 服务

| 变量 | 默认值 | 说明 |
|------|--------|------|
| API_PORT | 3001 | API 服务端口 |
| SQLITE_PATH | /data/spine.db | 数据库路径 |
| CRUISE_INTERVAL_MS | 300000 | 巡航间隔（毫秒）|
| CRUISE_REPORT_LANGUAGE | zh-CN | 巡航报告语言 |

### Dashboard

| 变量 | 默认值 | 说明 |
|------|--------|------|
| API_URL | http://spine-api:3001 | API 地址 |

---

## 常用命令

```bash
# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 查看状态
docker-compose ps

# 进入 API 容器
docker exec -it spine-api sh

# 备份数据库
docker exec spine-api sqlite3 /data/spine.db ".backup /data/backup.db"
```

---

## 故障排除

### 问题：端口被占用

**解决**：修改 docker-compose.yml 中的端口映射

```yaml
ports:
  - "8080:80"  # 将 80 改为 8080
```

### 问题：数据库权限错误

**解决**：检查数据卷权限

```bash
docker-compose down
rm -rf data/
docker-compose up -d
```

### 问题：API 无法访问

**检查**：
```bash
# 检查容器状态
docker-compose ps

# 查看 API 日志
docker-compose logs spine-api

# 测试健康检查
curl http://localhost:3001/api/health
```

---

## 生产环境建议

1. **使用外部数据库**: 替换 SQLite 为 PostgreSQL
2. **配置 HTTPS**: 使用反向代理（Nginx/Traefik）配置 SSL
3. **监控**: 添加 Prometheus/Grafana 监控
4. **备份**: 定期备份数据库

---

## 开发模式

```bash
# 启动开发服务器（热重载）
cd dashboard
npm install
npm run dev

# 启动 API 开发模式
npm run dev
```
