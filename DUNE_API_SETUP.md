# 配置Dune Analytics API密钥

## 第一步：注册Dune账号

1. 访问 [Dune Analytics](https://dune.com/)
2. 点击右上角的 "Sign Up" 或 "Log In"
3. 使用邮箱或GitHub账号注册/登录

## 第二步：获取API密钥

1. 登录后，点击右上角的用户头像
2. 选择 "API Keys" 或访问 https://dune.com/docs/api
3. 点击 "Create New API Key"
4. 给API密钥命名（例如：Polymarket App）
5. 复制生成的API密钥

## 第三步：配置环境变量

在项目根目录创建 `.env` 文件：

```bash
# 复制示例文件
cp .env.example .env
```

编辑 `.env` 文件，将你的API密钥粘贴进去：

```env
DUNE_API_KEY=你的API密钥
```

例如：
```env
DUNE_API_KEY=dune_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## 第四步：重启服务

配置完成后，重启后端服务以加载新的环境变量：

```bash
# 停止当前服务
Ctrl+C

# 重新启动
cd /workspace/projects && coze dev
```

## 第五步：验证配置

重启服务后，系统会自动尝试使用Dune API获取真实数据。查看日志：

```bash
# 查看日志，应该看到：
# [Dune] 使用API密钥访问Dune Analytics...
# [Dune] 查询已提交，获取执行ID...
# [Dune] 成功获取 XX 个市场
```

## API密钥使用说明

### 免费计划限制
- 每月500次查询
- 每天最多20次查询
- 查询结果缓存5分钟
- 支持公开查询

### 收费计划
- 每月10000次查询
- 支持私有查询
- 更高的速率限制

## 常见问题

### Q: API密钥不工作怎么办？
A: 检查：
1. API密钥是否正确复制（没有多余的空格）
2. API密钥是否有效（在Dune官网验证）
3. .env文件是否在项目根目录

### Q: 查询失败怎么办？
A: 查看日志中的错误信息：
- 401/403: API密钥无效或权限不足
- 429: 超出API限制
- 500: Dune服务暂时不可用

### Q: 没有获取到数据怎么办？
A: 可能原因：
1. 查询ID不正确
2. 查询需要授权
3. 数据源暂时不可用

系统会自动降级到模拟数据，不会影响使用。

## 测试API密钥

使用curl测试API密钥是否有效：

```bash
curl -X POST https://api.dune.com/api/v1/query/3567471/execute \
  -H "Content-Type: application/json" \
  -H "x-dune-api-key: 你的API密钥"
```

如果返回JSON包含 `execution_id`，说明API密钥有效。

## 查询ID说明

当前使用的查询ID：
- `3567471`: Polymarket活跃市场查询（公开查询）

如果需要自定义查询，可以在Dune上创建查询后使用新的查询ID。

## 安全提醒

⚠️ **重要**: 不要将API密钥提交到Git仓库！
- `.env` 文件已在 `.gitignore` 中
- 仅提交 `.env.example` 示例文件
- 分享代码时删除或隐藏API密钥

## 更多信息

- Dune API文档: https://dune.com/docs/api
- Polymarket数据: https://dune.com/queries
- API限制: https://dune.com/docs/api/basics/rate-limits
