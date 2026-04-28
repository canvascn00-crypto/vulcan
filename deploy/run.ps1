# Vulcan 跨平台部署工具
# 自动检测操作系统并调用对应脚本

$ErrorActionPreference = "Stop"

function Get-OS {
    if ($IsMacOS) { return "macos" }
    if ($IsLinux) { return "linux" }
    if ($env:OS -eq "Windows_NT") { return "windows" }
    return "unknown"
}

$os = Get-OS
$deployDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Vulcan — 下一代 AI Agent 平台" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "检测到操作系统: $os" -ForegroundColor Gray

switch ($os) {
    "windows" {
        Write-Host "调用 Windows 部署脚本..." -ForegroundColor Green
        & "$deployDir\windows\deploy.ps1" @args
    }
    "macos" {
        Write-Host "调用 macOS 部署脚本..." -ForegroundColor Green
        bash "$deployDir/macos/deploy.sh" @args
    }
    "linux" {
        Write-Host "调用 Linux 部署脚本..." -ForegroundColor Green
        bash "$deployDir/linux/deploy.sh" @args
    }
    default {
        Write-Host "不支持的操作系统: $os" -ForegroundColor Red
        exit 1
    }
}
