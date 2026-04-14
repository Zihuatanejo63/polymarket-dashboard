#!/bin/bash

# Dune API 配置测试脚本

echo "========================================="
echo "Dune Analytics API 配置测试"
echo "========================================="
echo ""

# 检查.env文件是否存在
if [ ! -f ".env" ]; then
    echo "❌ 错误: .env 文件不存在"
    echo "请先运行: cp .env.example .env"
    echo ""
    exit 1
fi

# 读取API密钥
DUNE_API_KEY=$(grep "^DUNE_API_KEY=" .env | cut -d'=' -f2)

if [ -z "$DUNE_API_KEY" ] || [ "$DUNE_API_KEY" = "your_dune_api_key_here" ]; then
    echo "⚠️  警告: 未配置有效的DUNE_API_KEY"
    echo ""
    echo "请编辑 .env 文件，设置正确的API密钥："
    echo "  DUNE_API_KEY=你的实际API密钥"
    echo ""
    echo "获取API密钥: https://dune.com/docs/api"
    echo ""
    echo "如果不配置API密钥，系统将使用模拟数据。"
    echo ""
    exit 0
fi

echo "✅ 找到API密钥: ${DUNE_API_KEY:0:10}..."
echo ""

# 测试API
echo "测试API连接..."
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "https://api.dune.com/api/v1/query/3567471/execute" \
  -H "Content-Type: application/json" \
  -H "x-dune-api-key: $DUNE_API_KEY")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

echo "HTTP状态码: $HTTP_CODE"
echo ""

# 检查响应
if [ "$HTTP_CODE" = "200" ]; then
    # 检查是否包含execution_id
    if echo "$BODY" | grep -q "execution_id"; then
        echo "✅ API密钥有效！"
        echo ""
        echo "响应示例:"
        echo "$BODY" | head -c 200
        echo "..."
        echo ""
        echo "✅ Dune Analytics配置成功！"
        echo "系统将能够获取真实的Polymarket数据。"
        exit 0
    else
        echo "⚠️  响应格式异常"
        echo "响应: $BODY"
        exit 1
    fi
elif [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
    echo "❌ 认证失败"
    echo ""
    echo "请检查："
    echo "1. API密钥是否正确"
    echo "2. API密钥是否有效（在Dune官网验证）"
    echo "3. .env文件格式是否正确"
    exit 1
elif [ "$HTTP_CODE" = "429" ]; then
    echo "⚠️  超出API限制"
    echo ""
    echo "请等待一段时间后再试，或升级到付费计划。"
    exit 1
else
    echo "❌ API请求失败"
    echo "HTTP状态码: $HTTP_CODE"
    echo "响应: $BODY"
    exit 1
fi
