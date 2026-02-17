# Spine API 文档

**版本**: v0.7a  
**基础 URL**: http://localhost:3001/api  
**Content-Type**: application/json

---

## 端点列表

### 1. 健康检查

```http
GET /api/health
```

**响应**:
```json
{
  "status": "ok",
  "timestamp": 1739876543210
}
```

---

### 2. 统计概览

```http
GET /api/stats/overview
```

**响应**:
```json
{
  "totalTickets": 18,
  "pendingHighPriority": 6,
  "categoryDistribution": {
    "payment": 5,
    "bug": 6,
    "refund": 2,
    "general": 5
  },
  "languageDistribution": {
    "zh-CN": 5,
    "en": 5,
    "ja": 2,
    "ko": 2,
    "es": 2,
    "zh-TW": 2
  },
  "timestamp": 1739876543210
}
```

---

### 3. 客诉列表

```http
GET /api/tickets?page=1&limit=10&category=payment&language=zh-CN
```

**参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认 1 |
| limit | number | 否 | 每页数量，默认 10 |
| category | string | 否 | 分类筛选 |
| language | string | 否 | 语言筛选 |

**响应**:
```json
{
  "tickets": [
    {
      "id": "zh-001",
      "text": "我充值了但是没有到账...",
      "category": "payment",
      "severity": "high",
      "detected_language": "zh-CN",
      "status": "open",
      "created_at": "2026-02-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 18,
    "totalPages": 2
  }
}
```

---

### 4. 单条客诉

```http
GET /api/tickets/:id
```

**响应**:
```json
{
  "ticket": {
    "id": "zh-001",
    "text": "我充值了但是没有到账...",
    "category": "payment",
    "severity": "high",
    "detected_language": "zh-CN",
    "status": "open",
    "created_at": "2026-02-15T10:30:00Z"
  }
}
```

**错误响应** (404):
```json
{
  "error": "Ticket not found"
}
```

---

### 5. 巡航报告列表

```http
GET /api/cruise-reports
```

**响应**:
```json
{
  "reports": [
    {
      "id": 1,
      "created_at": "2026-02-17T08:00:00Z",
      "ticket_count": 15,
      "high_priority_count": 3
    }
  ]
}
```

---

### 6. 单份巡航报告

```http
GET /api/cruise-reports/:id
```

**响应**:
```json
{
  "report": {
    "id": 1,
    "created_at": "2026-02-17T08:00:00Z",
    "ticket_count": 15,
    "high_priority_count": 3,
    "content": "# 客诉巡航报告..."
  }
}
```

---

## 错误处理

所有错误返回 JSON 格式：

```json
{
  "error": "错误描述"
}
```

HTTP 状态码:
- 200: 成功
- 404: 资源不存在
- 500: 服务器错误

---

## 使用示例

```bash
# 获取统计
curl http://localhost:3001/api/stats/overview

# 获取客诉列表（分页）
curl "http://localhost:3001/api/tickets?page=1&limit=5"

# 筛选中文 payment 客诉
curl "http://localhost:3001/api/tickets?language=zh-CN&category=payment"

# 获取单条客诉
curl http://localhost:3001/api/tickets/zh-001
```

---

## 集成建议

### 直接调用 API
如果你的后台系统需要客诉数据，可以直接调用上述 API。

### 嵌入 Dashboard
Dashboard 是静态文件，可以部署到任意 Web 服务器，或作为 iframe 嵌入现有系统。

### 数据库直连
如果需要更复杂的数据分析，可以直接读取 SQLite 数据库文件（只读）。
