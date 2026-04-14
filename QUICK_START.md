# PolyMarket概率看板 - 快速启动指南（腾讯云COS版）

## 部署架构说明

本项目采用**腾讯云COS混合云架构**，完美解决国内无法直接访问PolyMarket API的问题：

```
GitHub Actions (美国) → 抓取PolyMarket数据 → 腾讯云COS (新加坡) ← 国内服务器 ← 微信小程序
```

**核心优势**：
- ✅ 无需海外服务器
- ✅ 成本仅¥0-10/月（腾讯云COS新用户每月50GB免费流量）
- ✅ 数据接近实时（5分钟延迟）
- ✅ 无限查询（无API限制）
- ✅ 100%真实数据（非模拟）

---

## 快速部署（10分钟完成）

### 步骤1：配置腾讯云COS（3分钟）

1. 登录[腾讯云COS控制台](https://console.cloud.tencent.com/cos)
2. 创建存储桶：
   - 名称：`polymarket-data-你的用户名`（全局唯一，小写字母+数字）
   - 地域：**新加坡**（`ap-singapore`）或**香港**（`ap-hongkong`）
   - 访问权限：**公有读私有写**
3. 获取API密钥：
   - 进入「访问管理」→「API密钥管理」
   - 创建新密钥
   - 记录 `SecretId` 和 `SecretKey`（**SecretKey只显示一次！**）

### 步骤2：配置GitHub Secrets（2分钟）

1. 打开GitHub仓库 → Settings → Secrets and variables → Actions
2. 添加以下Secrets：

| Secret名称 | 值 | 说明 |
|------------|-----|------|
| `COS_SECRET_ID` | 腾讯云SecretId | 用于GitHub Actions上传 |
| `COS_SECRET_KEY` | 腾讯云SecretKey | 用于GitHub Actions上传 |
| `COS_BUCKET` | 存储桶名称 | 例如：`polymarket-data-xxx` |
| `COS_REGION` | `ap-singapore` | 新加坡节点 |

### 步骤3：手动触发GitHub Actions（1分钟）

1. 进入GitHub仓库 → Actions → "Fetch Polymarket Data"
2. 点击 "Run workflow" 手动执行
3. 等待执行完成（约30秒）

### 步骤4：验证COS数据（1分钟）

在浏览器访问：
```
https://[Bucket名称].cos.[区域].myqcloud.com/polymarket-data.json
```

例如：
```
https://polymarket-data-xxx.cos.ap-singapore.myqcloud.com/polymarket-data.json
```

如果看到JSON数据，说明COS配置成功！

### 步骤5：启动国内服务器（3分钟）

```bash
# 1. 配置环境变量
cd /workspace/projects
cp .env.example .env

# 编辑 .env，填写：
# COS_REGION=ap-singapore
# COS_BUCKET=你的Bucket名称

# 2. 安装依赖
pnpm install

# 3. 构建后端
cd server && pnpm build

# 4. 启动服务
pnpm start:prod
```

### 步骤6：验证部署

```bash
# 测试COS同步状态
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
**A**: PolyMarket官方API在国内被墙，无法直接访问。混合云架构利用GitHub Actions的海外服务器抓取数据，再通过腾讯云COS同步到国内，完美绕过网络限制。

### Q: 腾讯云COS和阿里云OSS有什么区别？
**A**: 两者功能类似，腾讯云COS新用户有每月50GB免费流量（价值¥25），更适合初期测试。阿里云OSS没有免费流量额度。

### Q: 数据更新频率？
**A**: GitHub Actions每5分钟抓取一次数据。如需更实时，可以修改`.github/workflows/fetch-polymarket.yml`中的cron表达式为`*/2 * * * *`（每2分钟），但注意GitHub Actions免费版有2000分钟/月限制。

### Q: 成本是多少？
**A**: 
- COS存储：~¥0.5/月
- COS流量：**免费50GB/月**（新用户），超出后~¥0.5/GB
- GitHub Actions：**免费**
- **首年总计：¥0-10/月**

### Q: 如果GitHub Actions执行失败怎么办？
**A**: 
1. 检查Secrets名称是否正确（是COS_SECRET_ID不是OSS_）
2. 查看Actions日志，确认PolyMarket API是否可用
3. 检查Bucket名称和Region是否正确
4. 重试运行

### Q: 能否实现秒级实时？
**A**: 可以，但需要部署海外服务器运行Realtime服务。成本会显著增加。

---

## 项目文件说明

| 文件 | 说明 |
|------|------|
| `.github/workflows/fetch-polymarket.yml` | GitHub Actions工作流，每5分钟抓取数据上传到COS |
| `server/src/oss-sync/` | COS数据同步服务（国内服务器） |
| `DEPLOYMENT_COMPLETE.md` | 部署完成总结 |
| `.env.example` | 环境变量示例 |

---

## 技术支持

如遇问题，请查看：
1. `DEPLOYMENT_COMPLETE.md` - 详细故障排查
2. GitHub Actions日志 - 查看执行详情
3. 服务器日志 - 查看 `[COS Sync]` 相关日志

祝您使用愉快！📊
