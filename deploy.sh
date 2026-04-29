#!/usr/bin/env bash
# ╔══════════════════════════════════════════════════════════════╗
# ║  Vulcan AI — 一键部署脚本 (Termux / Linux)                  ║
# ║  用法: bash deploy.sh                                        ║
# ╚══════════════════════════════════════════════════════════════╝
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  Vulcan AI — 盗火者  一键部署            ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"

# ── 1. 检测环境 ──
IS_TERMUX=false
if [ -n "$TERMUX_VERSION" ] || [ -d "/data/data/com.termux" ]; then
    IS_TERMUX=true
    echo -e "${YELLOW}[i] Termux 环境检测${NC}"
fi

# ── 2. 安装系统依赖 ──
echo -e "${GREEN}[1/6] 安装系统依赖...${NC}"
if [ "$IS_TERMUX" = true ]; then
    pkg update -y 2>/dev/null || true
    pkg install -y python git nodejs 2>/dev/null || true
else
    if command -v apt &>/dev/null; then
        apt update -y && apt install -y python3 python3-pip python3-venv git nodejs npm 2>/dev/null || true
    elif command -v yum &>/dev/null; then
        yum install -y python3 python3-pip git nodejs npm 2>/dev/null || true
    fi
fi

# ── 3. 克隆仓库 ──
VULCAN_DIR="$HOME/vulcan"
if [ ! -d "$VULCAN_DIR/.git" ]; then
    echo -e "${GREEN}[2/6] 克隆 Vulcan 仓库...${NC}"
    git clone https://github.com/canvascn00-crypto/vulcan.git "$VULCAN_DIR"
else
    echo -e "${GREEN}[2/6] 更新 Vulcan 仓库...${NC}"
    cd "$VULCAN_DIR" && git pull origin master || true
fi
cd "$VULCAN_DIR"

# ── 4. 安装 Python 依赖 ──
echo -e "${GREEN}[3/6] 安装 Python 依赖...${NC}"
if [ ! -d "venv" ]; then
    python3 -m venv venv 2>/dev/null || python -m venv venv
fi
source venv/bin/activate
pip install --upgrade pip -q
pip install -r vulcan-core/requirements-minimal.txt -q 2>/dev/null || \
    pip install fastapi uvicorn httpx aiofiles pyyaml pydantic python-dotenv python-multipart -q

# ── 5. 构建前端 ──
echo -e "${GREEN}[4/6] 构建前端...${NC}"
cd vulcan-webui
if [ ! -d "node_modules" ]; then
    npm install 2>/dev/null || npm install --legacy-peer-deps
fi
npm run build

# ── 6. 启动后端 ──
echo -e "${GREEN}[5/6] 启动 Vulcan 后端...${NC}"
cd "$VULCAN_DIR/vulcan-core"

# 杀掉旧的
fuser -k 8000/tcp 2>/dev/null || true

# 设置环境变量
export HOME="${HOME:-/root}"
export VULCAN_HOME="$HOME/.vulcan"
mkdir -p "$VULCAN_HOME/skills"

echo -e "${GREEN}[6/6] Vulcan 启动中...${NC}"
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✅ Vulcan 已就绪！${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  📱 打开浏览器访问: ${YELLOW}http://localhost:8000${NC}"
echo -e "  🔑 首次启动请查看终端输出的 API Key"
echo -e "  🛑 停止: Ctrl+C"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

uvicorn vulcan.main:app --host 0.0.0.0 --port 8000
