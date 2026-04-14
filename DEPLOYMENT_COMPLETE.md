# 🎉 腾讯云COS混合云架构部署完成！

## 架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│  GitHub Actions (美国服务器)                                     │
│  ├── 每5分钟自动抓取 PolyMarket API                             │
│  ├── 转换数据格式                                               │
│  └── 上传到腾讯云COS                                            │
└──────────────────────────────────┬──────────────────────────────┘
                                   │ HTTPS (国内可访问)
                                   ▼
┌──────────────────────────────────┴──────────────────────────────┐
│  腾讯云COS (新加坡/香港节点)                                      │
│  └── polymarket-data.json (公共读取)                            │
└──────────────────────────────────┬──────────────────────────────┘
                                   │ HTTP API
                                   ▼
┌──────────────────────────────────┴──────────────────────────────┐
│  国内服务器 (NestJS后端)                                         │
│  ├── 每5分钟自动同步COS数据                                      │
│  ├── 内存缓存（支持无限查询）                                    │
│  └── API端点: /api/polymarket-oss/*                            │
└──────────────────────────────────┬──────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────┴──────────────────────────────┐
│  微信小程序前端                                                  │
│  └── 展示真实市场数据                                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 已完成的配置

### ✅ 1. GitHub Actions 工作流
- **文件**：`.github/workflows/fetch-polymarket.yml`
- **功能**：每5分钟自动抓取PolyMarket数据并上传到腾讯云COS
- **SDK**：`cos-nodejs-sdk-v5`

### ✅ 2. COS同步服务
- **文件**：`server/src/oss-sync/oss-sync.service.ts`
- **功能**：国内服务器从腾讯云COS读取数据
- **包含**：自动刷新、内存缓存、数据过滤/搜索/分类

### ✅ 3. COS同步API端点
- `GET /api/polymarket-oss/status` - 查看同步状态
- `GET /api/polymarket-oss/markets` - 获取所有市场
- `GET /api/polymarket-oss/markets/:id` - 获取单个市场详情
- `GET /api/polymarket-oss/markets/hot?limit=10` - 获取热门市场
- `GET /api/polymarket-oss/markets/search?q=关键词` - 搜索市场
- `GET /api/polymarket-oss/markets/category/:category` - 按类别筛选
- `POST /api/polymarket-oss/refresh` - 强制刷新数据

### ✅ 4. 前端集成
- 首页和详情页已更新，使用COS同步端点

---

## 您的下一步操作

### 1️⃣ 配置腾讯云COS（必须）

1. 登录[腾讯云COS控制台](https://console.cloud.tencent.com/cos)
2. 创建存储桶：
   - 名称：`polymarket-data-你的用户名`（全局唯一）
   - 地域：**新加坡**（`ap-singapore`）或**香港**（`ap-hongkong`）
   - 访问权限：**公有读私有写**
3. 获取密钥：
   - 进入「密钥管理」→「API密钥管理」
   - 创建新密钥，记录 `SecretId` 和 `SecretKey`

### 2️⃣ 配置GitHub Secrets（必须）

在GitHub仓库设置中添加：

| Secret名称 | 值 |
|------------|-----|
| `COS_SECRET_ID` | 腾讯云SecretId |
| `COS_SECRET_KEY` | 腾讯云SecretKey |
| `COS_BUCKET` | 存储桶名称 |
| `COS_REGION` | `ap-singapore` 或 `ap-hongkong` |

### 3️⃣ 手动触发GitHub Actions

1. 进入GitHub仓库 → Actions → "Fetch Polymarket Data"
2. 点击 "Run workflow"
3. 等待执行完成（约30秒）

### 4️⃣ 验证COS数据

在浏览器访问：
```
https://[Bucket名称].cos.[区域].myqcloud.com/polymarket-data.json
```

例如：
```
https://polymarket-data-xxx.cos.ap-singapore.myqcloud.com/polymarket-data.json
```

### 5️⃣ 配置国内服务器环境变量

```bash
cd /workspace/projects
# 创建 .env 文件
```

内容：
```env
# 腾讯云COS配置
COS_REGION=ap-singapore
COS_BUCKET=polymarket-data-xxx
```

### 6️⃣ 启动服务

```bash
# 安装依赖（如未安装）
pnpm install

# 构建后端
cd server && pnpm build

# 启动服务
pnpm start:prod
```

### 7️⃣ 验证服务

```bash
# 测试COS同步状态
curl http://localhost:3000/api/polymarket-oss/status

# 查看市场列表
curl http://localhost:3000/api/polymarket-oss/markets
```

---

## 腾讯云 vs 阿里云对比

| 对比项 | 腾讯云COS | 阿里云OSS |
|--------|-----------|-----------|
| 国内访问速度 | ✅ 优秀 | ✅ 优秀 |
| 海外节点 | 新加坡、香港 | 新加坡、香港 |
| 价格 | ~¥10/月 | ~¥10/月 |
| 免费额度 | 50GB/月 | 无 |
| API体验 | ✅ 文档清晰 | ✅ 文档清晰 |
| GitHub Actions集成 | ✅ 支持 | ✅ 支持 |

**腾讯云COS优势**：新用户有50GB/月免费流量，适合初期测试！

---

## 预期结果

### 成功后，API响应示例：

```json
{
  "code": 200,
  "data": {
    "total": 150,
    "lastFetch": "2025-01-15T10:30:00.000Z",
    "dataTime": "2025-01-15T10:25:00.000Z",
    "source": "polymarket-gamma-api",
    "cacheValid": true,
    "nextRefresh": "2025-01-15T10:35:00.000Z"
  }
}
```

### 市场数据格式示例：

```json
{
  "code": 200,
  "data": [
    {
      "id": "12345",
      "question": "Will Bitcoin exceed $100,000 by 2025?",
      "probability": 75,
      "volume": 1500000,
      "liquidity": 500000,
      "outcomes": ["NO", "YES"],
      "outcomePrices": [0.25, 0.75],
      "tags": ["crypto", "bitcoin"],
      "active": true,
      "updatedAt": "2025-01-15T10:25:00.000Z"
    }
  ],
  "total": 150,
  "source": "cos-cache"
}
```

---

## 成本估算（腾讯云）

| 项目 | 月费用 |
|------|--------|
| COS存储（<1GB） | ~¥0.5 |
| COS流量（50GB内） | **免费**（新用户） |
| COS流量（超出50GB） | ~¥0.5/GB |
| GitHub Actions | **免费** |
| **总计** | **¥0-10/月** |

**腾讯云COS新用户首年每月50GB免费流量！**

---

## 故障排查

### 问题1：GitHub Actions失败
```bash
# 查看Actions日志
# GitHub仓库 → Actions → 选择失败的运行 → 查看日志

# 常见问题：
# - Secrets名称错误（注意是COS_SECRET_ID不是OSS_）
# - Bucket名称或Region错误
```

### 问题2：COS数据无法访问
```bash
# 检查COS配置
curl -I https://[Bucket].cos.ap-singapore.myqcloud.com/polymarket-data.json

# 应该返回 200 OK
```

### 问题3：后端获取不到数据
```bash
# 查看后端日志
# 搜索 [COS Sync] 相关日志
tail -f /tmp/server.log | grep "COS Sync"

# 强制刷新
curl -X POST http://localhost:3000/api/polymarket-oss/refresh
```

---

## 优势对比

| 方案 | 成本 | 实时性 | 查询限制 | 国内部署 |
|------|------|--------|----------|----------|
| Dune API | 免费 | 5分钟 | 500次/月 | ✅ 支持 |
| Realtime海外 | $20+/月 | 秒级 | 无限 | ❌ 需海外 |
| **腾讯云COS** | **¥0-10/月** | **5分钟** | **无限** | **✅ 支持** |

**您选择的腾讯云COS是性价比最高的方案！** 🎯

---

## 参考文档

- `QUICK_START.md` - 快速启动指南
- `TENCENT_COS_GUIDE.md` - 腾讯云COS详细指南
- `.env.example` - 环境变量示例

祝您使用愉快！📊✨
