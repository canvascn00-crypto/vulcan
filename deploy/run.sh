#!/bin/bash
# Vulcan 统一启动器 — 自动检测操作系统
# 用法: ./run.sh <动作>
#   或双击自动检测

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DEPLOY_DIR="$SCRIPT_DIR/deploy"

# 检测操作系统
detect_os() {
    case "$(uname -s)" in
        Linux*)     echo "linux" ;;
        Darwin*)    echo "macos" ;;
        MINGW*|MSYS*|CYGWIN*) echo "windows" ;;
        *)          echo "unknown" ;;
    esac
}

OS="$(detect_os)"
ACTION="${1:-help}"

echo "========================================"
echo "  Vulcan — 下一代 AI Agent 平台"
echo "========================================"
echo "检测到操作系统: $OS"
echo ""

case "$OS" in
    linux)
        echo "调用 Linux 部署脚本..."
        bash "$DEPLOY_DIR/linux/deploy.sh" "$ACTION"
        ;;
    macos)
        echo "调用 macOS 部署脚本..."
        bash "$DEPLOY_DIR/macos/deploy.sh" "$ACTION"
        ;;
    windows)
        echo "调用 Windows 部署脚本 (PowerShell)..."
        powershell.exe -ExecutionPolicy Bypass -File "$DEPLOY_DIR/windows/deploy.ps1" -Action "$ACTION"
        ;;
    *)
        echo "[X] 不支持的操作系统: $OS"
        echo ""
        echo "支持的操作系统:"
        echo "  - Linux  (Ubuntu, Debian, CentOS, AlmaLinux 等)"
        echo "  - macOS  (Apple Silicon / Intel)"
        echo "  - Windows (PowerShell 5.1+)"
        exit 1
        ;;
esac
