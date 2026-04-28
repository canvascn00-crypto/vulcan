#!/bin/bash
# Vulcan Quickstart Script
# 一键启动 Vulcan

set -e

echo "🔥 Vulcan 盗火者 — 启动中..."

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装，请先安装 Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose 未安装"
    exit 1
fi

# 检查 .env
if [ ! -f .env ]; then
    echo "📝 创建 .env 配置文件..."
    cp .env.example .env
    echo "⚠️  请编辑 .env 填入必要的配置（LLM_API_KEY 等）"
fi

# 构建并启动
echo "🚀 构建 Docker 镜像..."
docker-compose build

echo "✅ 启动 Vulcan 服务..."
docker-compose up -d

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔥 Vulcan 启动成功！"
echo ""
echo "  WebUI:   http://localhost:3000"
echo "  API:     http://localhost:8000"
echo "  Docs:    http://localhost:8000/docs"
echo ""
echo "查看日志: docker-compose logs -f"
echo "停止服务: docker-compose down"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
