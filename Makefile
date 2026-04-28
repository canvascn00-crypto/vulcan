.PHONY: help install dev backend frontend up down restart logs build clean test lint

help:
	@echo "Vulcan — 下一代 AI Agent 平台"
	@echo "================================"
	@echo "make install    # 安装依赖（后端+前端）"
	@echo "make dev        # 开发模式（后端+前端热重载）"
	@echo "make up         # Docker Compose 启动"
	@echo "make down        # 停止 Docker Compose"
	@echo "make restart    # 重启"
	@echo "make logs       # 查看日志"
	@echo "make build      # 构建 Docker 镜像"
	@echo "make clean      # 清理构建产物"

install:
	@echo "安装后端依赖..."
	cd vulcan-core && pip install -r requirements.txt
	@echo "安装前端依赖..."
	cd vulcan-webui && npm install

dev:
	@echo "启动后端 (port 8000)..."
	cd vulcan-core && python vulcan.py --port 8000 &
	@echo "启动前端 (port 3000)..."
	cd vulcan-webui && npm run dev

up:
	docker-compose up -d
	@echo "Vulcan 已启动: http://localhost:3000"

down:
	docker-compose down

restart: down up

logs:
	docker-compose logs -f

build:
	docker-compose build

clean:
	docker-compose down -v --rmi local
	rm -rf vulcan-webui/node_modules
	rm -rf vulcan-core/__pycache__
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true

test:
	cd vulcan-core && python -m pytest -v

lint:
	cd vulcan-core && ruff check vulcan/
	cd vulcan-webui && npm run build

# 默认目标
all: install up
