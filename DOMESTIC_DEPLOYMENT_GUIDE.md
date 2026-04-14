# 混合云架构部署指南（GitHub Actions + 阿里云OSS）

## 架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│                         国外环境                                │
│  ┌─────────────┐        ┌─────────────┐        ┌─────────────┐ │
│  │  GitHub     │───────▶│  Actions    │───────▶│  阿里云OSS  │ │
│  │  Repository │        │  (美国服务器)│        │  (新加坡节点)│ │
│  └─────────────┘        └─────────────┘        └─────────────┘ │
│                              │                                   │
│                              │ 每5分钟抓取                       │
│                              ▼                                   │
│                       ┌─────────────┐                          │
│                       │  PolyMarket │                          │
│                       │  API        │                          │
│                       └─────────────┘                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS同步（国内可访问）
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         国内环境                                │
│  ┌─────────────┐        ┌─────────────┐        ┌─────────────┐ │
│  │  微信小程序  │◀───────│  NestJS     │◀───────│  OSS数据    │ │
│  │  前端       │        │  后端       │        │  缓存       │ │
│  └─────────────┘        └─────────────┘        └─────────────┘ │
│                               │                                  │
│                               │ 5分钟缓存                        │
└─────────────────────────────────────────────────────────────────┘
```

## 步骤一：配置阿里云OSS

### 1. 创建OSS Bucket

1. 登录阿里云控制台：[https://oss.console.aliyun.com/](https://oss.console.aliyun.com/)
2. 点击"创建Bucket"
3. 填写配置：
   - Bucket名称：`polymarket-data-[你的用户名]`（全局唯一）
   - 区域：**建议选择"新加坡"**（`oss-ap-southeast-1`）
     - 原因：GitHub Actions（美国）到新加坡延迟较低
   - 存储类型：标准存储
   - 读写权限：**公共读**（重要！）

### 2. 获取访问密钥

1. 进入阿里云控制台 -> 右上角头像 -> "AccessKey管理"
2. 创建新的AccessKey
3. 记录以下信息：
   - AccessKey ID
   - AccessKey Secret（**只显示一次，请妥善保存！**）

## 步骤二：配置GitHub Secrets

### 1. 打开仓库设置

在你的GitHub仓库页面：
1. 点击 "Settings"
2. 左侧菜单选择 "Secrets and variables" -> "Actions"

### 2. 添加Secrets

添加以下5个Secrets：

| Secret名称 | 值 |
|------------|-----|
| `OSS_ACCESS_KEY_ID` | 阿里云AccessKey ID |
| `OSS_ACCESS_KEY_SECRET` | 阿里云AccessKey Secret |
| `OSS_BUCKET` | Bucket名称（如：polymarket-data-xxx） |
| `OSS_REGION` | OSS区域（如：oss-ap-southeast-1） |

### 3. 配置工作流文件

GitHub Actions工作流文件已创建在：`.github/workflows/fetch-polymarket.yml`

该工作流每5分钟自动执行：
1. 从美国服务器调用PolyMarket API
2. 转换数据格式
3. 上传到阿里云OSS
4. 设置公共读取权限

## 步骤三：启动国内后端服务

### 1. 配置环境变量

在国内服务器上，创建或修改 `.env` 文件：

```env
# OSS配置（从OSS读取数据）
OSS_REGION=oss-ap-southeast-1
OSS_BUCKET=polymarket-data-xxx
OSS_ACCESS_KEY_ID=你的AccessKeyID
OSS_ACCESS_KEY_SECRET=你的AccessKeySecret

# 可选：如果配置了私有Bucket，需要填写
# OSS_ENDPOINT=https://polymarket-data-xxx.oss-ap-southeast-1.aliyuncs.com
```

### 2. 启动服务

```bash
# 安装依赖
pnpm install

# 构建后端
cd server && pnpm build

# 启动服务
pnpm start:prod
```

## 步骤四：测试数据流

### 1. 测试OSS数据访问

在浏览器访问：
```
https://[你的Bucket名称].[区域].aliyuncs.com/polymarket-data.json
```

例如：
```
https://polymarket-data-xxx.oss-ap-southeast-1.aliyuncs.com/polymarket-data.json
```

如果配置正确，你应该能看到JSON格式的市场数据。

### 2. 测试后端API

```bash
# 查看OSS同步状态
curl http://localhost:3000/api/polymarket-oss/status

# 获取市场列表
curl http://localhost:3000/api/polymarket-oss/markets

# 获取热门市场
curl http://localhost:3000/api/polymarket-oss/markets/hot?limit=10
```

### 3. 手动触发GitHub Actions

1. 进入GitHub仓库
2. 点击 "Actions" 标签
3. 选择 "Fetch Polymarket Data" 工作流
4. 点击 "Run workflow" 手动执行

## API端点说明

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/polymarket-oss/status` | GET | 查看同步状态 |
| `/api/polymarket-oss/markets` | GET | 获取所有市场 |
| `/api/polymarket-oss/markets/:id` | GET | 获取单个市场详情 |
| `/api/polymarket-oss/markets/hot` | GET | 获取热门市场 |
| `/api/polymarket-oss/markets/search?q=关键词` | GET | 搜索市场 |
| `/api/polymarket-oss/markets/category/:category` | GET | 按类别筛选 |
| `/api/polymarket-oss/refresh` | POST | 强制刷新数据 |

## 成本估算

| 项目 | 费用 |
|------|------|
| OSS存储费用 | ~¥1/月（数据量很小） |
| OSS流量费用 | ~¥8-10/月（按国内访问计算） |
| GitHub Actions | **免费**（公开仓库） |
| **总计** | **~¥10/月** |

## 优缺点

### 优点
- ✅ 无需海外服务器
- ✅ 成本极低（¥10/月）
- ✅ 数据接近实时（5分钟延迟）
- ✅ 无限查询（无API限制）
- ✅ 稳定可靠

### 缺点
- ⚠️ 5分钟数据延迟（非秒级实时）
- ⚠️ 需要配置两个平台（GitHub + 阿里云）

## 故障排查

### 问题1：GitHub Actions执行失败

**症状**：Actions显示红色 ❌

**排查步骤**：
1. 点击失败的运行记录
2. 查看"Fetch Polymarket Data"步骤的日志
3. 常见问题：
   - Secrets配置错误 → 重新配置OSS_ACCESS_KEY_ID等
   - PolyMarket API返回空 → 重试或检查网络

### 问题2：OSS数据无法访问

**症状**：访问OSS URL返回403或404

**排查步骤**：
1. 检查Bucket读写权限是否为"公共读"
2. 检查URL格式是否正确
3. 在OSS控制台手动上传测试文件验证

### 问题3：后端获取不到数据

**症状**：API返回空数组

**排查步骤**：
1. 检查后端日志：`[OSS Sync]`相关日志
2. 直接访问OSS URL，确认数据存在
3. 检查环境变量是否正确配置
4. 调用 `/api/polymarket-oss/refresh` 强制刷新

## 升级方案

如果对5分钟延迟不满意，可考虑：

### 方案A：降低同步间隔
修改 `.github/workflows/fetch-polymarket.yml`：
```yaml
on:
  schedule:
    - cron: '*/2 * * * *'  # 改为每2分钟
```

**注意**：GitHub Actions免费版有2000分钟/月限制，每2分钟运行约占用1460分钟/月。

### 方案B：使用Realtime服务
在海外部署Realtime服务，国内通过VPN或专线连接。成本较高但实现秒级实时。

---

**恭喜！** 完成以上步骤后，您就拥有了一个稳定、低成本、无查询限制的PolyMarket数据服务！🎉
