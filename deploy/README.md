# Vulkan Cross-Platform Deployment

## 快速开始

### Windows (PowerShell)
```powershell
.\deploy\windows\deploy.ps1 -Action install
.\deploy\windows\deploy.ps1 -Action start
```

### macOS / Linux
```bash
./deploy/run.sh install
./deploy/run.sh start
```

或直接调用对应平台脚本:
```bash
./deploy/macos/deploy.sh install   # macOS
./deploy/linux/deploy.sh install   # Linux
```

---

## 支持的模式

| 模式 | 说明 | 需要 |
|------|------|------|
| **Docker** (推荐) | 容器化部署，隔离环境 | Docker Desktop |
| **Native** | 直接在系统运行 | Python 3.11+, Node.js 18+ |

默认优先使用 Docker 模式，如未安装 Docker 则自动降级为 Native 模式。

---

## 动作列表

| 动作 | 说明 |
|------|------|
| `install` | 安装依赖并构建 |
| `start` | 启动 Vulcan |
| `stop` | 停止 Vulcan |
| `restart` | 重启 Vulcan |
| `status` | 查看运行状态 |
| `logs` | 查看日志 |
| `build` | 构建 Docker 镜像 |
| `clean` | 清理所有数据 |

---

## 前置要求

### Docker 模式
- **Windows**: [Docker Desktop for Windows](https://docs.docker.com/desktop/install/windows-install/)
- **macOS**: [Docker Desktop for Mac](https://docs.docker.com/desktop/install/mac-install/)
- **Linux**: Docker Engine + docker-compose

### Native 模式
| 组件 | 版本要求 | 安装方式 |
|------|---------|---------|
| Python | 3.11+ | [python.org](https://python.org) / `brew install python@3.11` |
| Node.js | 18+ | [nodejs.org](https://nodejs.org) / `brew install node` |
| npm | 9+ | 随 Node.js 一起安装 |

---

## 端口说明

| 端口 | 服务 | 说明 |
|------|------|------|
| 3000 | Web UI | Vulcan 控制台 |
| 8000 | API | Vulcan 后端 API |
| 8000/docs | API Docs | Swagger API 文档 |

---

## Windows 详细说明

### 方式一：PowerShell 脚本（推荐）
```powershell
# 安装
.\deploy\windows\deploy.ps1 -Action install

# 启动
.\deploy\windows\deploy.ps1 -Action start

# 查看状态
.\deploy\windows\deploy.ps1 -Action status
```

### 方式二：Docker Desktop
```powershell
docker-compose up -d
```

### 方式三：WSL2 + Linux 脚本
如果你已安装 WSL2，可以直接使用 Linux 脚本:
```bash
bash ./deploy/linux/deploy.sh install
```

---

## macOS 详细说明

### 前置条件
```bash
# 安装 Homebrew（如果没有）
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 安装 Docker Desktop
brew install --cask docker

# 或者安装 Python 和 Node（Native 模式）
brew install python@3.11 node
```

### 部署
```bash
./deploy/macos/deploy.sh install
./deploy/macos/deploy.sh start
```

---

## Linux 详细说明

### 前置条件
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y docker.io docker-compose python3.11 python3.11-venv nodejs npm

# AlmaLinux/RHEL/CentOS
sudo dnf install -y docker python3.11 nodejs npm
sudo systemctl enable --now docker
```

### 部署
```bash
./deploy/linux/deploy.sh install
./deploy/linux/deploy.sh start
```

---

## 统一启动器

`deploy/run.sh` 会自动检测操作系统并调用对应脚本:

```bash
./deploy/run.sh install   # 自动检测 Windows/macOS/Linux
./deploy/run.sh start
./deploy/run.sh status
```

---

## 故障排查

### Windows: 执行策略错误
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\deploy\windows\deploy.ps1 -Action install
```

### macOS: 权限不足
```bash
chmod +x ./deploy/macos/deploy.sh
chmod +x ./deploy/run.sh
```

### Linux: Docker 无权限
```bash
sudo usermod -aG docker $USER
# 重新登录使配置生效
```

### 端口被占用
```bash
# Linux/macOS
lsof -i :3000
lsof -i :8000
kill -9 <PID>

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```
