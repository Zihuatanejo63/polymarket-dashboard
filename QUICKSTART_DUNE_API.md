# 使用Dune API获取真实Poly Market数据 - 快速指南

## 概述

本项目已集成了Dune Analytics API，可以获取真实的Poly Market预测市场数据。

## 配置步骤

### 1. 创建环境变量文件

```bash
cp .env.example .env
```

### 2. 获取Dune API密钥

1. 访问 https://dune.com/
2. 注册或登录账号
3. 访问 https://dune.com/docs/api
4. 创建API密钥

### 3. 配置API密钥

编辑 `.env` 文件：

```env
DUNE_API_KEY=dune_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 4. 测试配置

```bash
# 运行测试脚本
bash scripts/test-dune-api.sh
```

### 5. 重启服务

```bash
# 停止当前服务
Ctrl+C

# 重新启动
coze dev
```

## 数据获取流程

```
用户请求
  ↓
系统检查是否有DUNE_API_KEY
  ↓
有密钥 → 调用Dune API → 获取真实数据
  ↓
无密钥/失败 → 降级到模拟数据
  ↓
返回数据给前端
```

## 查看日志

配置成功后，日志会显示：

```
[Dune] 使用API密钥访问Dune Analytics...
[Dune] 查询已提交，获取执行ID...
[Dune] 轮询查询结果 (1/30)...
[Dune] 查询完成，获取到 XX 条记录
[Dune] 成功获取 XX 个市场
[MarketService] 成功使用 Dune Analytics 真实数据，共 XX 个事件
```

## API限制

### 免费计划
- 每月500次查询
- 每天最多20次查询
- 查询结果缓存5分钟

### 系统优化
- 5分钟缓存机制，减少API调用
- 自动降级到模拟数据
- 智能重试机制

## 数据源优先级

系统会按以下顺序尝试获取数据：

1. **Dune Analytics** (如果配置了API密钥)
2. **Goldsky API**
3. **The Graph API**
4. **Polymarket官方API**
5. **模拟数据** (降级方案)

## 常见问题

### Q: 没有API密钥怎么办？

A: 不影响使用，系统会自动使用高质量模拟数据。所有功能都能正常工作。

### Q: API密钥在哪里配置？

A: 在项目根目录的 `.env` 文件中：

```env
DUNE_API_KEY=你的API密钥
```

### Q: 如何测试API是否工作？

A: 运行测试脚本：

```bash
bash scripts/test-dune-api.sh
```

### Q: 如何查看是否使用了真实数据？

A: 查看日志，如果看到：

```
[Dune] 成功获取 XX 个市场
[MarketService] 成功使用 Dune Analytics 真实数据
```

说明正在使用真实数据。

如果看到：

```
[MarketService] 使用模拟数据作为降级方案
```

说明正在使用模拟数据。

## 获取真实数据的好处

1. **准确性**: 真实的市场概率和交易数据
2. **及时性**: 数据每5分钟更新一次
3. **完整性**: 包含所有活跃市场
4. **可靠性**: 数据来自权威平台

## 不使用真实数据的影响

如果使用模拟数据：
- ✅ 所有功能正常工作
- ✅ 用户体验不受影响
- ⚠️  数据为模拟，非真实市场数据
- ⚠️  仅供演示和学习使用

## 更多信息

- [详细配置指南](./DUNE_API_SETUP.md)
- [数据源说明](./POLYMARKET_DATA_SOLUTIONS.md)
- [Dune API文档](https://dune.com/docs/api)
- [项目README](./README.md)

## 示例API响应

成功调用Dune API后，返回的数据格式：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "markets": [
      {
        "id": "0x...",
        "question": "Will Bitcoin reach $100,000 by end of 2024?",
        "probability": 45.5,
        "volume": 1234567,
        "liquidity": 234567
      }
    ],
    "total": 50
  }
}
```
