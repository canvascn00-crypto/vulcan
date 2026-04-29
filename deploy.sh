#!/usr/bin/env bash
# ============================================================
#  Vulcan 一键部署脚本 — 适配 Termux / Ubuntu / Debian / CentOS / AlmaLinux / macOS
#  用法: bash deploy.sh
# ============================================================
set -e

# ---------- 颜色 ----------
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { printf "${GREEN}[✓]${NC} $*\n"; }
warn()  { printf "${YELLOW}[!]${NC} $*\n"; }
fail()  { printf "${RED}[✗]${NC} $*\n"; exit 1; }
step()  { printf "${CYAN}[→]${NC} $*\n"; }

# ---------- 检测环境 ----------
OS="$(uname -s)"
ARCH="$(uname -m)"
IS_TERMUX=false
IS_MACOS=false
PKG_MANAGER=""

if [ -n "$TERMUX_VERSION" ] || [ -d "/data/data/com.termux" ]; then
    IS_TERMUX=true
    info "检测到 Termux 环境"
elif [ "$OS" = "Darwin" ]; then
    IS_MACOS=true
    info "检测到 macOS"
else
    info "检测到 Linux ($ARCH)"
fi

# ---------- 确定项目根目录 ----------
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# ---------- 1. 安装系统依赖 ----------
install_system_deps() {
    step "安装系统依赖..."

    if $IS_TERMUX; then
        pkg update -y 2>/dev/null || true
        pkg install -y python python-pip nodejs git 2>/dev/null || true
    elif $IS_MACOS; then
        if ! command -v brew &>/dev/null; then
            warn "未检测到 Homebrew，跳过系统依赖安装"
        else
            brew install python@3 node git 2>/dev/null || true
        fi
    else
        # Linux — 尝试多个包管理器
        if command -v apt-get &>/dev/null; then
            sudo apt-get update -qq
            sudo apt-get install -y python3 python3-pip python3-venv nodejs npm git curl 2>/dev/null || true
        elif command -v dnf &>/dev/null; then
            sudo dnf install -y python3 python3-pip nodejs npm git curl 2>/dev/null || true
        elif command -v yum &>/dev/null; then
            sudo yum install -y python3 python3-pip nodejs npm git curl 2>/dev/null || true
        elif command -v pacman &>/dev/null; then
            sudo pacman -S --noconfirm python python-pip nodejs npm git curl 2>/dev/null || true
        elif command -v apk &>/dev/null; then
            sudo apk add python3 py3-pip nodejs npm git curl 2>/dev/null || true
        else
            warn "未识别的包管理器，请手动安装: python3, pip, nodejs, npm, git"
        fi
    fi
}

# ---------- 2. 安装后端依赖 ----------
install_backend_deps() {
    step "安装后端 Python 依赖..."

    PYTHON="python3"
    if $IS_TERMUX; then
        PYTHON="python"
    fi

    if ! command -v $PYTHON &>/dev/null; then
        fail "Python3 未安装"
    fi

    # 创建 venv（非 Termux）
    if $IS_TERMUX; then
        VENV_PYTHON="$PYTHON"
        PIP="pip"
    else
        if [ ! -d "venv" ]; then
            $PYTHON -m venv venv
        fi
        source venv/bin/activate
        VENV_PYTHON="python"
        PIP="pip"
    fi

    # 安装核心依赖（跨平台兼容的子集）
    $PIP install --quiet --upgrade pip 2>/dev/null || true
    $PIP install --quiet \
        fastapi "uvicorn[standard]" httpx pydantic pydantic-settings \
        pyyaml aiofiles python-dotenv python-multipart click rich \
        email-validator 2>/dev/null || true

    # 尝试安装可选依赖（装不上不影响运行）
    $PIP install --quiet structlog a2wsgi 2>/dev/null || true

    # 验证 uvicorn 可用
    if ! $PYTHON -c "import uvicorn" 2>/dev/null; then
        warn "uvicorn 未正确安装，尝试用户级安装..."
        $PYTHON -m pip install --user uvicorn fastapi httpx pydantic 2>/dev/null || true
        export PATH="$HOME/.local/bin:$PATH"
    fi

    info "后端依赖安装完成"
}

# ---------- 3. 构建前端 ----------
build_frontend() {
    step "构建前端..."

    if ! command -v node &>/dev/null; then
        warn "Node.js 未安装，跳过前端构建（将使用纯 API 模式）"
        return
    fi

    cd "$SCRIPT_DIR/vulcan-webui"

    if [ ! -d "node_modules" ]; then
        npm install --legacy-peer-deps 2>/dev/null || npm install 2>/dev/null || {
            warn "npm install 失败，跳过前端构建"
            cd "$SCRIPT_DIR"
            return
        }
    fi

    npm run build 2>/dev/null && info "前端构建完成" || warn "前端构建失败（不影响后端）"

    cd "$SCRIPT_DIR"
}

# ---------- 4. 让 FastAPI serve 前端静态文件 ----------
patch_main_to_serve_static() {
    WEBUI_DIR="$SCRIPT_DIR/vulcan-webui/dist"
    MAIN_FILE="$SCRIPT_DIR/vulcan-core/vulcan/main.py"

    # 只有前端 build 成功才 patch
    if [ ! -d "$WEBUI_DIR" ] || [ ! -f "$WEBUI_DIR/index.html" ]; then
        warn "前端 dist 不存在，不挂载静态文件"
        return
    fi

    # 检查是否已经 patch 过
    if grep -q "StaticFiles" "$MAIN_FILE" 2>/dev/null; then
        return
    fi

    cat >> "$MAIN_FILE" << 'STATIC_PATCH'

# --- Auto-mounted frontend static files (deploy.sh) ---
from fastapi.staticfiles import StaticFiles
import os as _os
_webui_dist = _os.path.join(_os.path.dirname(_os.path.dirname(_os.path.dirname(__file__))), "vulcan-webui", "dist")
if _os.path.isdir(_webui_dist) and _os.path.isfile(_os.path.join(_webui_dist, "index.html")):
    from fastapi.responses import FileResponse
    app.mount("/assets", StaticFiles(directory=_os.path.join(_webui_dist, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def _serve_spa(full_path: str):
        """Serve the SPA — fallback to index.html for client-side routing."""
        candidate = _os.path.join(_webui_dist, full_path)
        if full_path and _os.path.isfile(candidate):
            return FileResponse(candidate)
        return FileResponse(_os.path.join(_webui_dist, "index.html"))
STATIC_PATCH

    info "已挂载前端静态文件到 FastAPI"
}

# ---------- 5. 启动服务 ----------
start_server() {
    step "启动 Vulcan..."

    cd "$SCRIPT_DIR/vulcan-core"

    # 构造启动命令
    if $IS_TERMUX; then
        PYTHON="python"
    elif [ -d "$SCRIPT_DIR/venv" ]; then
        source "$SCRIPT_DIR/venv/bin/activate"
        PYTHON="python"
    else
        PYTHON="python3"
    fi

    # 添加 vulcan-core 到 PYTHONPATH
    export PYTHONPATH="$SCRIPT_DIR/vulcan-core:${PYTHONPATH:-}"

    # 最终检查 uvicorn
    if ! $PYTHON -c "import uvicorn" 2>/dev/null; then
        fail "uvicorn 仍未找到，请手动运行: pip install uvicorn"
    fi

    HOST="${VULCAN_HOST:-0.0.0.0}"
    PORT="${VULCAN_PORT:-8000}"

    echo ""
    echo "========================================================"
    echo "  🔥 Vulcan AI Agent Platform"
    echo "  🌐 http://localhost:${PORT}"
    echo "  📡 API: http://localhost:${PORT}/docs"
    echo "  🛑 停止: Ctrl+C"
    echo "========================================================"
    echo ""

    exec $PYTHON -m uvicorn vulcan.main:app --host "$HOST" --port "$PORT"
}

# ============================================================
#  主流程
# ============================================================
main() {
    echo ""
    echo "========================================================"
    echo "  🔥 Vulcan 一键部署"
    echo "========================================================"
    echo ""

    install_system_deps
    install_backend_deps
    build_frontend
    patch_main_to_serve_static
    start_server
}

main
