#!/bin/bash
# Vulcan Linux 部署脚本

set -e

VULCAN_VERSION="v0.3.0"
PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DOCKER_MODE="${DOCKER_MODE:-docker}"

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

header() {
    echo ""
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}  Vulcan $VULCAN_VERSION — Linux 部署${NC}"
    echo -e "${CYAN}========================================${NC}"
    echo ""
}

check_docker() {
    if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
        echo -e "${GREEN}[OK] Docker 已安装${NC}"
        return 0
    else
        echo -e "${YELLOW}[!] Docker 未安装，将使用 Native 模式${NC}"
        return 1
    fi
}

# ─── Install ──────────────────────────────────────────────────────────────────
do_install() {
    header
    echo -e "${YELLOW}[1/4] 检查系统环境...${NC}"

    if check_docker; then
        DOCKER_MODE="docker"
    else
        DOCKER_MODE="native"
    fi

    if [ "$DOCKER_MODE" = "docker" ]; then
        echo -e "${YELLOW}[2/4] 构建 Docker 镜像...${NC}"
        cd "$PROJECT_ROOT" && docker-compose build

        echo -e "${YELLOW}[3/4] 拉取依赖容器...${NC}"
        docker-compose pull

        echo -e "${GREEN}[4/4] 完成！运行 ./deploy.sh start 启动${NC}"
    else
        echo -e "${YELLOW}[2/6] 检查 Python 3.11+ ...${NC}"
        if command -v python3 >/dev/null 2>&1; then
            PYTHON_VER=$(python3 --version 2>&1 | grep -oP '\d+\.\d+' | head -1)
            echo -e "${GREEN}[OK] Python $PYTHON_VER${NC}"
        else
            echo -e "${RED}[X] 请先安装 Python 3.11+: sudo apt install python3.11 python3.11-venv${NC}"
        fi

        echo -e "${YELLOW}[3/6] 安装系统依赖 (如果需要)...${NC}"
        sudo apt-get update -qq 2>/dev/null || true
        sudo apt-get install -y -qq python3-venv build-essential 2>/dev/null || true

        echo -e "${YELLOW}[4/6] 创建 Python 虚拟环境...${NC}"
        cd "$PROJECT_ROOT/vulcan-core"
        python3 -m venv .venv
        source .venv/bin/activate

        echo -e "${YELLOW}[5/6] 安装后端依赖...${NC}"
        pip install -r requirements.txt -q

        echo -e "${YELLOW}[6/6] 安装前端依赖...${NC}"
        cd "$PROJECT_ROOT/vulcan-webui"
        npm install --legacy-peer-deps

        echo -e "${GREEN}✅ 完成！运行 ./deploy.sh start 启动${NC}"
    fi
}

# ─── Start ────────────────────────────────────────────────────────────────────
do_start() {
    header

    if [ "$DOCKER_MODE" = "docker" ] && docker info >/dev/null 2>&1; then
        echo -e "${YELLOW}启动 Docker 容器...${NC}"
        cd "$PROJECT_ROOT" && docker-compose up -d
        sleep 3
        echo ""
        echo -e "${GREEN}✅ Vulcan 已启动！${NC}"
        echo -e "   ${CYAN}Web UI:   http://localhost:3000${NC}"
        echo -e "   ${CYAN}API:      http://localhost:8000${NC}"
        echo -e "   ${CYAN}API Docs: http://localhost:8000/docs${NC}"
    else
        echo -e "${YELLOW}启动 Native 模式...${NC}"

        # 激活虚拟环境
        VENV="$PROJECT_ROOT/vulcan-core/.venv"
        if [ -f "$VENV/bin/activate" ]; then
            source "$VENV/bin/activate"
        fi

        # 启动后端
        echo -e "  ${CYAN}启动后端 (port 8000)...${NC}"
        cd "$PROJECT_ROOT/vulcan-core"
        nohup python3 vulcan.py --port 8000 > /tmp/vulcan-api.log 2>&1 &
        API_PID=$!

        # 等待后端就绪
        echo -e "  ${CYAN}等待后端就绪...${NC}"
        for i in $(seq 1 30); do
            if curl -sf http://localhost:8000/health >/dev/null 2>&1; then
                echo -e "  ${GREEN}[OK] 后端就绪${NC}"
                break
            fi
            sleep 1
        done

        # 启动前端
        echo -e "  ${CYAN}启动前端 (port 3000)...${NC}"
        cd "$PROJECT_ROOT/vulcan-webui"
        nohup npm run dev > /tmp/vulcan-ui.log 2>&1 &
        UI_PID=$!

        echo ""
        echo -e "${GREEN}✅ Vulcan 已启动！${NC}"
        echo -e "   ${CYAN}Web UI:   http://localhost:3000${NC}"
        echo -e "   ${CYAN}API:      http://localhost:8000${NC}"
        echo -e "   ${CYAN}日志:     /tmp/vulcan-api.log, /tmp/vulcan-ui.log${NC}"
    fi
}

# ─── Stop ─────────────────────────────────────────────────────────────────────
do_stop() {
    header
    echo -e "${YELLOW}停止 Vulcan...${NC}"

    if [ "$DOCKER_MODE" = "docker" ] && docker info >/dev/null 2>&1; then
        cd "$PROJECT_ROOT" && docker-compose down
    else
        pkill -f "vulcan.py.*8000" 2>/dev/null || true
        pkill -f "npm run dev" 2>/dev/null || true
        pkill -f "vite" 2>/dev/null || true
        fuser -k 8000/tcp 2>/dev/null || true
        fuser -k 3000/tcp 2>/dev/null || true
    fi

    echo -e "${GREEN}✅ 已停止${NC}"
}

# ─── Status ───────────────────────────────────────────────────────────────────
do_status() {
    header
    echo -e "Vulcan $VULCAN_VERSION 状态"
    echo ""

    if [ "$DOCKER_MODE" = "docker" ] && docker info >/dev/null 2>&1; then
        echo -e "${CYAN}模式: Docker${NC}"
        docker-compose ps
    else
        echo -e "${CYAN}模式: Native${NC}"

        if curl -sf http://localhost:8000/health >/dev/null 2>&1; then
            echo -e "  ${GREEN}[API]   运行中 (port 8000)${NC}"
        else
            echo -e "  ${RED}[API]   未运行${NC}"
        fi

        if curl -sf http://localhost:3000 >/dev/null 2>&1; then
            echo -e "  ${GREEN}[WebUI] 运行中 (port 3000)${NC}"
        else
            echo -e "  ${RED}[WebUI] 未运行${NC}"
        fi
    fi
}

# ─── Logs ─────────────────────────────────────────────────────────────────────
do_logs() {
    if [ "$DOCKER_MODE" = "docker" ] && docker info >/dev/null 2>&1; then
        cd "$PROJECT_ROOT" && docker-compose logs -f
    else
        echo -e "${YELLOW}查看日志 (Native 模式)，按 Ctrl+C 退出${NC}"
        echo "--- 后端日志 (最后50行) ---"
        tail -50 /tmp/vulcan-api.log 2>/dev/null || echo "(无日志)"
        echo "--- 前端日志 (最后50行) ---"
        tail -50 /tmp/vulcan-ui.log 2>/dev/null || echo "(无日志)"
    fi
}

# ─── Build ────────────────────────────────────────────────────────────────────
do_build() {
    header

    if [ "$DOCKER_MODE" = "docker" ] && docker info >/dev/null 2>&1; then
        echo -e "${YELLOW}构建 Docker 镜像...${NC}"
        cd "$PROJECT_ROOT" && docker-compose build --no-cache
    else
        echo -e "${YELLOW}构建前端...${NC}"
        cd "$PROJECT_ROOT/vulcan-webui" && npm run build
    fi

    echo -e "${GREEN}✅ 构建完成${NC}"
}

# ─── Restart ──────────────────────────────────────────────────────────────────
do_restart() {
    do_stop
    sleep 2
    do_start
}

# ─── Help ─────────────────────────────────────────────────────────────────────
show_help() {
    header
    echo -e "用法: ${CYAN}./deploy.sh <动作>${NC}"
    echo ""
    echo -e "${WHITE}动作:${NC}"
    echo -e "  ${CYAN}install${NC}   安装依赖并构建"
    echo -e "  ${CYAN}start${NC}     启动 Vulcan"
    echo -e "  ${CYAN}stop${NC}      停止 Vulcan"
    echo -e "  ${CYAN}restart${NC}   重启 Vulcan"
    echo -e "  ${CYAN}status${NC}    查看运行状态"
    echo -e "  ${CYAN}logs${NC}      查看日志"
    echo -e "  ${CYAN}build${NC}     构建 Docker 镜像"
    echo -e "  ${CYAN}clean${NC}      清理所有数据"
    echo ""
    echo -e "${WHITE}前提条件:${NC}"
    echo -e "  Docker 模式:    Docker + docker-compose"
    echo -e "  Native 模式:   Python 3.11+, Node.js 18+, npm"
    echo ""
    echo -e "${WHITE}示例:${NC}"
    echo -e "  ${GRAY}./deploy.sh install${NC}"
    echo -e "  ${GRAY}./deploy.sh start${NC}"
    echo -e "  ${GRAY}./deploy.sh status${NC}"
}

# ─── Main ─────────────────────────────────────────────────────────────────────
ACTION="${1:-help}"

case "$ACTION" in
    install)  do_install ;;
    start)    do_start ;;
    stop)     do_stop ;;
    restart)  do_restart ;;
    status)   do_status ;;
    logs)     do_logs ;;
    build)    do_build ;;
    clean)    do_stop; rm -rf "$PROJECT_ROOT/vulcan-webui/dist" 2>/dev/null; echo -e "${GREEN}✅ 清理完成${NC}" ;;
    help|--help|-h) show_help ;;
    *)        echo -e "${RED}[X] 未知动作: $ACTION${NC}"; echo ""; show_help; exit 1 ;;
esac
