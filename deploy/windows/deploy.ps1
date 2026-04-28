# Vulcan Windows 部署脚本
# 支持 Docker 和 Native 两种模式

param(
    [ValidateSet("install", "start", "stop", "restart", "status", "logs", "build", "clean", "help")]
    [string]$Action = "help",
    [ValidateSet("docker", "native")]
    [string]$Mode = "docker"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$VULCAN_VERSION = "v0.3.0"

function Write-Header {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Vulcan $VULCAN_VERSION — Windows 部署" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
}

function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Get-DockerStatus {
    try {
        $null = docker info 2>$null
        return $true
    } catch { return $false }
}

# ─── Install ─────────────────────────────────────────────────────────────────
function Invoke-Install {
    Write-Header
    Write-Host "[1/4] 检查系统环境..." -ForegroundColor Yellow

    # 检查 Docker
    $dockerOk = Get-DockerStatus
    if ($dockerOk) {
        Write-Host "  [OK] Docker 已安装" -ForegroundColor Green
    } else {
        Write-Host "  [!] Docker 未安装，将使用 Native 模式" -ForegroundColor Yellow
        $script:Mode = "native"
    }

    if ($Mode -eq "docker") {
        Write-Host "[2/4] 构建 Docker 镜像..." -ForegroundColor Yellow
        docker-compose build
        Write-Host "[3/4] 拉取依赖容器..." -ForegroundColor Yellow
        docker-compose pull
        Write-Host "[4/4] 完成！运行 .\deploy.ps1 -Action start 启动" -ForegroundColor Green
    } else {
        # Native 模式
        Write-Host "[2/5] 安装 Python 3.11+ ..." -ForegroundColor Yellow
        python --version 2>$null || python3 --version 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  [X] 请先安装 Python 3.11+: https://python.org" -ForegroundColor Red
            return
        }

        Write-Host "[3/5] 安装后端依赖..." -ForegroundColor Yellow
        Push-Location "$ProjectRoot\vulcan-core"
        pip install -r requirements.txt -q
        Pop-Location

        Write-Host "[4/5] 安装前端依赖..." -ForegroundColor Yellow
        Push-Location "$ProjectRoot\vulcan-webui"
        npm install --legacy-peer-deps 2>$null
        Pop-Location

        Write-Host "[5/5] 完成！运行 .\deploy.ps1 -Action start 启动" -ForegroundColor Green
    }
}

# ─── Start ───────────────────────────────────────────────────────────────────
function Invoke-Start {
    Write-Header
    $dockerOk = Get-DockerStatus

    if ($Mode -eq "docker" -and $dockerOk) {
        Write-Host "启动 Docker 容器..." -ForegroundColor Yellow
        docker-compose up -d
        Start-Sleep -Seconds 3
        Write-Host ""
        Write-Host "✅ Vulcan 已启动！" -ForegroundColor Green
        Write-Host "   Web UI:   http://localhost:3000" -ForegroundColor Cyan
        Write-Host "   API:      http://localhost:8000" -ForegroundColor Cyan
        Write-Host "   API Docs: http://localhost:8000/docs" -ForegroundColor Cyan
    } else {
        Write-Host "启动 Native 模式..." -ForegroundColor Yellow

        # 启动后端
        Write-Host "  启动后端 (port 8000)..." -ForegroundColor Gray
        Push-Location "$ProjectRoot\vulcan-core"
        $backendJob = Start-Job -ScriptBlock {
            param($dir)
            Set-Location $dir
            python vulcan.py --port 8000
        } -ArgumentList (Get-Location)
        Pop-Location

        # 等待后端就绪
        $attempts = 0
        while ($attempts -lt 30) {
            try {
                $null = Invoke-RestMethod "http://localhost:8000/health" -TimeoutSec 2 -ErrorAction SilentlyContinue
                if ($LASTEXITCODE -eq 0) { break }
            } catch {}
            Start-Sleep -Seconds 1
            $attempts++
        }

        # 启动前端
        Write-Host "  启动前端 (port 3000)..." -ForegroundColor Gray
        Push-Location "$ProjectRoot\vulcan-webui"
        Start-Job -ScriptBlock {
            param($dir)
            Set-Location $dir
            npm run dev
        } -ArgumentList (Get-Location) | Out-Null
        Pop-Location

        Write-Host ""
        Write-Host "✅ Vulcan 已启动！" -ForegroundColor Green
        Write-Host "   Web UI:   http://localhost:3000" -ForegroundColor Cyan
        Write-Host "   API:      http://localhost:8000" -ForegroundColor Cyan
    }
}

# ─── Stop ────────────────────────────────────────────────────────────────────
function Invoke-Stop {
    Write-Header
    $dockerOk = Get-DockerStatus

    if ($Mode -eq "docker" -and $dockerOk) {
        Write-Host "停止 Docker 容器..." -ForegroundColor Yellow
        docker-compose down
        Write-Host "✅ 已停止" -ForegroundColor Green
    } else {
        Write-Host "停止 Vulcan 进程..." -ForegroundColor Yellow
        Get-Job | Stop-Job -ErrorAction SilentlyContinue
        Get-Job | Remove-Job -ErrorAction SilentlyContinue
        # 杀死占用端口的进程
        $port8000 = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
        $port3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
        if ($port8000) { Stop-Process -Id $port8000.OwningProcess -Force -ErrorAction SilentlyContinue }
        if ($port3000) { Stop-Process -Id $port3000.OwningProcess -Force -ErrorAction SilentlyContinue }
        Write-Host "✅ 已停止" -ForegroundColor Green
    }
}

# ─── Status ───────────────────────────────────────────────────────────────────
function Invoke-Status {
    Write-Header
    $dockerOk = Get-DockerStatus

    Write-Host "Vulcan $VULCAN_VERSION 状态" -ForegroundColor White

    if ($Mode -eq "docker" -and $dockerOk) {
        Write-Host "模式: Docker" -ForegroundColor Gray
        $containers = docker-compose ps --format json 2>$null | ConvertFrom-Json
        if ($containers) {
            foreach ($c in $containers) {
                $color = if ($c.State -eq "running") { "Green" } else { "Red" }
                Write-Host "  [$($c.Name)] $($c.State)" -ForegroundColor $color
            }
        } else {
            Write-Host "  容器未运行，运行 .\deploy.ps1 -Action start 启动" -ForegroundColor Yellow
        }
    } else {
        Write-Host "模式: Native" -ForegroundColor Gray
        $api = try { Invoke-RestMethod "http://localhost:8000/health" -TimeoutSec 3 } catch { $null }
        $ui = try { Invoke-WebRequest "http://localhost:3000" -TimeoutSec 3 -UseBasicParsing -ErrorAction SilentlyContinue } catch { $null }

        if ($api) { Write-Host "  [API]   运行中 (port 8000)" -ForegroundColor Green }
        else { Write-Host "  [API]   未运行" -ForegroundColor Red }

        if ($ui) { Write-Host "  [WebUI] 运行中 (port 3000)" -ForegroundColor Green }
        else { Write-Host "  [WebUI] 未运行" -ForegroundColor Red }
    }
}

# ─── Logs ────────────────────────────────────────────────────────────────────
function Invoke-Logs {
    $dockerOk = Get-DockerStatus
    if ($Mode -eq "docker" -and $dockerOk) {
        docker-compose logs -f
    } else {
        Write-Host "查看日志 (Native 模式)，按 Ctrl+C 退出" -ForegroundColor Yellow
        Write-Host "--- 后端日志 ---" -ForegroundColor Gray
        Get-Job | Where-Object { $_.State -eq "Running" } | Receive-Job
        Start-Sleep -Seconds 5
    }
}

# ─── Build ────────────────────────────────────────────────────────────────────
function Invoke-Build {
    Write-Header
    $dockerOk = Get-DockerStatus
    if ($Mode -eq "docker" -and $dockerOk) {
        Write-Host "构建 Docker 镜像..." -ForegroundColor Yellow
        docker-compose build --no-cache
        Write-Host "✅ 构建完成" -ForegroundColor Green
    } else {
        Write-Host "构建前端..." -ForegroundColor Yellow
        Push-Location "$ProjectRoot\vulcan-webui"
        npm run build
        Pop-Location
        Write-Host "✅ 构建完成" -ForegroundColor Green
    }
}

# ─── Restart ──────────────────────────────────────────────────────────────────
function Invoke-Restart {
    & "$PSCommandPath" -Action stop -Mode $Mode
    Start-Sleep -Seconds 2
    & "$PSCommandPath" -Action start -Mode $Mode
}

# ─── Help ─────────────────────────────────────────────────────────────────────
function Show-Help {
    Write-Header
    Write-Host "用法: .\deploy.ps1 -Action <动作> [-Mode docker|native]" -ForegroundColor White
    Write-Host ""
    Write-Host "动作:" -ForegroundColor White
    Write-Host "  install   安装依赖并构建" -ForegroundColor Cyan
    Write-Host "  start     启动 Vulcan" -ForegroundColor Cyan
    Write-Host "  stop      停止 Vulcan" -ForegroundColor Cyan
    Write-Host "  restart   重启 Vulcan" -ForegroundColor Cyan
    Write-Host "  status    查看运行状态" -ForegroundColor Cyan
    Write-Host "  logs      查看日志" -ForegroundColor Cyan
    Write-Host "  build     构建 Docker 镜像" -ForegroundColor Cyan
    Write-Host "  clean     清理所有数据" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "模式 (默认 docker):" -ForegroundColor White
    Write-Host "  -Mode docker   使用 Docker 容器运行 (推荐)" -ForegroundColor Cyan
    Write-Host "  -Mode native   直接在系统运行 (无需 Docker)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "示例:" -ForegroundColor White
    Write-Host "  .\deploy.ps1 -Action install -Mode docker" -ForegroundColor Gray
    Write-Host "  .\deploy.ps1 -Action start" -ForegroundColor Gray
    Write-Host "  .\deploy.ps1 -Action status -Mode native" -ForegroundColor Gray
    Write-Host ""
    Write-Host "前提条件:" -ForegroundColor White
    Write-Host "  Docker 模式:    Docker Desktop for Windows" -ForegroundColor Gray
    Write-Host "  Native 模式:   Python 3.11+ , Node.js 18+ , npm" -ForegroundColor Gray
}

# ─── Main ─────────────────────────────────────────────────────────────────────
switch ($Action) {
    "install"  { Invoke-Install }
    "start"    { Invoke-Start }
    "stop"     { Invoke-Stop }
    "restart"  { Invoke-Restart }
    "status"   { Invoke-Status }
    "logs"     { Invoke-Logs }
    "build"    { Invoke-Build }
    "clean"    { Invoke-Stop; Write-Host "清理构建产物..." -ForegroundColor Yellow; Remove-Item "$ProjectRoot\vulcan-webui\dist" -Recurse -ErrorAction SilentlyContinue; docker-compose down -v --rmi local -ErrorAction SilentlyContinue; Write-Host "✅ 清理完成" -ForegroundColor Green }
    "help"     { Show-Help }
}
