# PolyMarket概率看板 - 快速启动指南

## 部署架构说明

本项目采用**混合云架构**，完美解决国内无法直接访问PolyMarket API的问题：

```
GitHub Actions (美国) → 抓取PolyMarket数据 → 阿里云OSS (新加坡) ← 国内服务器 ← 微信小程序
```

**核心优势**：
- ✅ 无需海外服务器
- ✅ 成本仅¥10/月
- ✅ 数据接近实时（5分钟延迟）
- ✅ 无限查询（无API限制）
- ✅ 100%真实数据（非模拟）

---

## 快速部署（10分钟完成）

### 步骤1：配置阿里云OSS（3分钟）

1. 登录[阿里云OSS控制台](https://oss.console.aliyun.com/)
2. 创建Bucket：
   - 名称：`polymarket-data-你的用户名`（全局唯一）
   - 区域：**新加坡**（`oss-ap-southeast-1`）
   - 读写权限：**公共读**
3. 获取AccessKey：控制台 → AccessKey管理 → 创建AccessKey
   - 记录 `AccessKey ID` 和 `AccessKey Secret`

### 步骤2：配置GitHub Secrets（2分钟）

1. 打开GitHub仓库 → Settings → Secrets and variables → Actions
2. 添加以下Secrets：

| Secret名称 | 值 |
|------------|-----|
| `OSS_ACCESS_KEY_ID` | 阿里云AccessKey ID |
| `OSS_ACCESS_KEY_SECRET` | 阿里云AccessKey Secret |
| `OSS_BUCKET` | Bucket名称 |
| `OSS_REGION` | `oss-ap-southeast-1` |

3. 进入Actions页面，点击"Fetch Polymarket Data" → Run workflow 手动触发一次

### 步骤3：启动国内服务器（5分钟）

```bash
# 1. 配置环境变量
cp .env.example .env
# 编辑 .env，填写OSS相关配置

# 2. 安装依赖
pnpm install

# 3. 构建后端
cd server && pnpm build

# 4. 启动服务
pnpm start:prod
```

### 步骤4：验证部署

```bash
# 测试OSS数据接口
curl http://localhost:3000/api/polymarket-oss/status

# 查看市场列表
curl http://localhost:3000/api/polymarket-oss/markets
```

如果返回数据，恭喜您部署成功！🎉

---

## 前端开发

```bash
# 开发模式（热更新）
cd /workspace/projects && coze dev

# 访问：http://localhost:5000
```

---

## 常见问题

### Q: 为什么使用混合云架构？
**A**: PolyMarket官方API在国内被墙，无法直接访问。混合云架构利用GitHub Actions的海外服务器抓取数据，再通过阿里云OSS同步到国内，完美绕过网络限制。

### Q: 数据更新频率？
**A**: GitHub Actions每5分钟抓取一次数据。如果您需要更实时，可以修改`.github/workflows/fetch-polymarket.yml`中的cron表达式为`*/2 * * * *`（每2分钟），但注意GitHub Actions免费版有2000分钟/月的限制。

### Q: 成本是多少？
**A**: 
- OSS存储：~¥1/月
- OSS流量：~¥8-10/月
- GitHub Actions：**免费**
- **总计：约¥10/月**

### Q: 如果GitHub Actions执行失败怎么办？
**A**: 
1. 检查Secrets配置是否正确
2. 查看Actions日志，确认PolyMarket API是否可用
3. 重试运行

### Q: 能否实现秒级实时？
**A**: 可以，但需要部署海外服务器运行Realtime服务。成本会显著增加，具体可参考 `DEPLOYMENT_SOLUTIONS.md`。

---

## 项目文件说明

| 文件 | 说明 |
|------|------|
| `.github/workflows/fetch-polymarket.yml` | GitHub Actions工作流，每5分钟抓取数据 |
| `server/src/oss-sync/` | OSS数据同步服务（国内服务器） |
| `DOMESTIC_DEPLOYMENT_GUIDE.md` | 详细的部署指南 |
| `.env.example` | 环境变量示例 |

---

## 技术支持

如遇问题，请查看：
1. `DOMESTIC_DEPLOYMENT_GUIDE.md` - 详细故障排查
2. GitHub Actions日志 - 查看执行详情
3. 服务器日志 - 查看 `[OSS Sync]` 相关日志

祝您使用愉快！📊
