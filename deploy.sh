#!/usr/bin/env bash
# ============================================================
#  Vulcan 一键部署 — 一条命令搞定，前后端合一，自动后台运行
#  用法: bash deploy.sh
#  适配: Termux / Ubuntu / Debian / CentOS / AlmaLinux / macOS
# ============================================================
set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { printf "${GREEN}[✓]${NC} $*\n"; }
warn()  { printf "${YELLOW}[!]${NC} $*\n"; }
fail()  { printf "${RED}[✗]${NC} $*\n"; exit 1; }
step()  { printf "${CYAN}[→]${NC} $*\n"; }

# ---------- 检测环境 ----------
IS_TERMUX=false
[ -n "$TERMUX_VERSION" ] || [ -d "/data/data/com.termux" ] && IS_TERMUX=true

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"
PYTHON="python"
$IS_TERMUX || PYTHON="python3"

echo ""
echo "========================================================"
echo "  🔥 Vulcan 一键部署"
echo "========================================================"
echo ""

# ---------- 1. 系统依赖 ----------
step "安装系统依赖..."
if $IS_TERMUX; then
    pkg update -y 2>/dev/null || true
    pkg install -y python python-pip nodejs git 2>/dev/null || true
    PYTHON="python"
elif [ "$(uname -s)" = "Darwin" ]; then
    command -v brew &>/dev/null && brew install python3 node git 2>/dev/null || true
else
    if command -v apt-get &>/dev/null; then
        sudo apt-get update -qq && sudo apt-get install -y python3 python3-pip python3-venv nodejs npm git 2>/dev/null || true
    elif command -v dnf &>/dev/null; then
        sudo dnf install -y python3 python3-pip nodejs npm git 2>/dev/null || true
    elif command -v yum &>/dev/null; then
        sudo yum install -y python3 python3-pip nodejs npm git 2>/dev/null || true
    elif command -v pacman &>/dev/null; then
        sudo pacman -S --noconfirm python python-pip nodejs npm git 2>/dev/null || true
    elif command -v apk &>/dev/null; then
        sudo apk add python3 py3-pip nodejs npm git 2>/dev/null || true
    fi
fi

# ---------- 2. Python 依赖 ----------
step "安装 Python 依赖..."

if $IS_TERMUX; then
    PIP="pip"
    # Termux 不支持 pydantic v2 编译，用 v1
    pip install --quiet "pydantic<2" uvicorn fastapi httpx pyyaml aiofiles python-dotenv python-multipart click rich email-validator 2>/dev/null || true
else
    if [ ! -d "venv" ]; then
        $PYTHON -m venv venv
    fi
    source venv/bin/activate
    PIP="pip"
    pip install --quiet --upgrade pip 2>/dev/null || true
    pip install --quiet fastapi "uvicorn[standard]" httpx pydantic pydantic-settings pyyaml aiofiles python-dotenv python-multipart click rich email-validator structlog 2>/dev/null || true
fi

# 验证 uvicorn
$PYTHON -c "import uvicorn" 2>/dev/null || {
    warn "uvicorn 安装失败，尝试用户级安装..."
    $PYTHON -m pip install --user uvicorn fastapi httpx pydantic 2>/dev/null || true
    export PATH="$HOME/.local/bin:$PATH"
    $PYTHON -c "import uvicorn" 2>/dev/null || fail "uvicorn 安装失败，请手动: pip install uvicorn"
}
info "Python 依赖完成"

# ---------- 3. 构建前端 ----------
step "构建前端..."
if command -v node &>/dev/null; then
    cd "$SCRIPT_DIR/vulcan-webui"
    [ -d "node_modules" ] || npm install --legacy-peer-deps 2>/dev/null || npm install 2>/dev/null || true
    npm run build 2>/dev/null && info "前端构建完成" || warn "前端构建失败（不影响 API）"
    cd "$SCRIPT_DIR"
else
    warn "未安装 Node.js，跳过前端（仅 API 模式）"
fi

# ---------- 4. 启动 ----------
HOST="${VULCAN_HOST:-0.0.0.0}"
PORT="${VULCAN_PORT:-8000}"
PIDFILE="$SCRIPT_DIR/.vulcan.pid"
LOGFILE="$SCRIPT_DIR/vulcan.log"

# 停掉旧实例
if [ -f "$PIDFILE" ]; then
    OLD_PID=$(cat "$PIDFILE" 2>/dev/null)
    kill "$OLD_PID" 2>/dev/null || true
    rm -f "$PIDFILE"
fi

export PYTHONPATH="$SCRIPT_DIR/vulcan-core:${PYTHONPATH:-}"

if $IS_TERMUX; then
    # Termux: nohup 后台运行
    nohup $PYTHON -m uvicorn vulcan.main:app --host "$HOST" --port "$PORT" > "$LOGFILE" 2>&1 &
    echo $! > "$PIDFILE"
else
    if [ -d "venv" ]; then
        source venv/bin/activate
    fi
    nohup $PYTHON -m uvicorn vulcan.main:app --host "$HOST" --port "$PORT" > "$LOGFILE" 2>&1 &
    echo $! > "$PIDFILE"
fi

sleep 2

# 验证启动
if kill -0 $(cat "$PIDFILE" 2>/dev/null) 2>/dev/null; then
    echo ""
    echo "========================================================"
    echo "  🔥 Vulcan 已启动 (PID: $(cat $PIDFILE))"
    echo "  🌐 http://localhost:${PORT}        ← 前端页面"
    echo "  📡 http://localhost:${PORT}/docs   ← API 文档"
    echo "  📋 日志: tail -f ${LOGFILE}"
    echo "  🛑 停止: kill \$(cat ${PIDFILE})"
    echo "========================================================"
    echo ""
else
    fail "启动失败，查看日志: cat ${LOGFILE}"
fi
