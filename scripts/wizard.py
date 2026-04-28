#!/usr/bin/env python3
"""
Vulcan Setup Wizard — 交互式配置引导
安装后自动运行，引导用户完成 LLM 配置、渠道连接、首次启动
支持: Windows / macOS / Linux
"""

import os
import sys
import json
import time
import subprocess
import urllib.request
import urllib.error

# ─── 跨平台兼容 ───────────────────────────────────────────────────────────────
IS_WINDOWS = sys.platform.startswith("win")
IS_MACOS = sys.platform == "darwin"
IS_LINUX = sys.platform.startswith("linux")
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG_DIR = os.path.expanduser("~/.hermes")
CONFIG_FILE = os.path.join(CONFIG_DIR, "config.json")


# ─── 颜色输出 ─────────────────────────────────────────────────────────────────
class Colors:
    RED = "\033[91m" if not IS_WINDOWS else ""
    GREEN = "\033[92m" if not IS_WINDOWS else ""
    YELLOW = "\033[93m" if not IS_WINDOWS else ""
    CYAN = "\033[96m" if not IS_WINDOWS else ""
    MAGENTA = "\033[95m" if not IS_WINDOWS else ""
    BOLD = "\033[1m" if not IS_WINDOWS else ""
    DIM = "\033[2m" if not IS_WINDOWS else ""
    RESET = "\033[0m" if not IS_WINDOWS else ""
    # Windows CMD 颜色
    WINDOWS_COLORS = {
        "RED": "C", "GREEN": "A", "YELLOW": "E", "CYAN": "B",
        "MAGENTA": "D", "BOLD": "", "DIM": "8", "RESET": "7"
    }


def c(text: str, color: str) -> str:
    """给文字上色"""
    if IS_WINDOWS:
        # Windows CMD: 用 color 命令不方便，直接返回原文
        return text
    return f"{getattr(Colors, color.upper(), '')}{text}{Colors.RESET}"


def clear():
    os.system("cls" if IS_WINDOWS else "clear")


def print_banner():
    banner = f"""
{c('╔══════════════════════════════════════════════════════╗', 'CYAN')}
{c('║                                                      ║', 'CYAN')}
{c('║         🔥 VULCAN  设置向导  v0.4.0 🔥              ║', 'CYAN')}
{c('║         下一代 AI Agent 平台                          ║', 'CYAN')}
{c('║                                                      ║', 'CYAN')}
{c('╚══════════════════════════════════════════════════════╝', 'CYAN')}
"""
    print(banner)


def print_step(current: int, total: int, title: str):
    bar = f"[{'●' * current}{'○' * (total - current)}]"
    print(f"\n{c(bar, 'CYAN')} {c(f'第 {current}/{total} 步', 'YELLOW')} — {c(title, 'BOLD')}")
    print(c("─" * 55, 'DIM'))


def input_(prompt: str, default: str = "", password: bool = False) -> str:
    """跨平台输入提示"""
    suffix = f" [{default}]" if default else ""
    prompt_str = f"{c('➤', 'GREEN')} {prompt}{suffix}: "
    try:
        if password:
            import getpass
            val = getpass.getpass(prompt_str)
        else:
            val = input(prompt_str)
    except (EOFError, KeyboardInterrupt):
        print("\n")
        print(c("已取消设置向导。运行 python scripts/wizard.py 重新启动。", 'YELLOW'))
        sys.exit(0)

    return val.strip() or default


def confirm(prompt: str, default: bool = True) -> bool:
    """Yes/No 确认"""
    suffix = "[Y/n]" if default else "[y/N]"
    while True:
        val = input_(f"{prompt} {c(suffix, 'CYAN')}").lower()
        if val in ("y", "yes"):
            return True
        elif val in ("n", "no"):
            return False
        elif val == "":
            return default
        print(c("  请输入 y 或 n", 'RED'))


def select_(prompt: str, options: list, default: int = 0) -> int:
    """数字选择菜单"""
    print(f"\n{c('➤', 'GREEN')} {prompt}")
    for i, opt in enumerate(options):
        marker = c("▶", 'CYAN') if i == default else " "
        print(f"  {marker} {c(f'[{i+1}]', 'YELLOW')} {opt}")

    while True:
        val = input_(("选择" if not IS_WINDOWS else "选择") + f" [1-{len(options)}]")
        if val == "":
            return default
        try:
            idx = int(val) - 1
            if 0 <= idx < len(options):
                return idx
        except ValueError:
            pass
        print(c(f"  请输入 1-{len(options)} 之间的数字", 'RED'))


def test_url(url: str, timeout: int = 5) -> bool:
    """测试 URL 是否可达"""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Vulcan-Wizard/1.0"})
        urllib.request.urlopen(req, timeout=timeout)
        return True
    except (urllib.error.URLError, urllib.error.HTTPError):
        return False


def run_cmd(cmd: list, timeout: int = 10) -> tuple:
    """运行命令并返回 (returncode, stdout, stderr)"""
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        return result.returncode, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return -1, "", "Timeout"
    except FileNotFoundError:
        return -2, "", "Command not found"


# ─── 配置读写 ─────────────────────────────────────────────────────────────────
def load_config() -> dict:
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE) as f:
            return json.load(f)
    return {}

def save_config(cfg: dict):
    os.makedirs(CONFIG_DIR, exist_ok=True)
    with open(CONFIG_FILE, "w") as f:
        json.dump(cfg, f, indent=2, ensure_ascii=False)
    print(c(f"\n  ✓ 配置已保存至 {CONFIG_FILE}", 'GREEN'))


# ─── 第1步：检查环境 ──────────────────────────────────────────────────────────
def step_prerequisites() -> bool:
    print_step(1, 5, "检查系统环境")

    checks = []

    # Docker
    rc, out, _ = run_cmd(["docker", "info"] if not IS_WINDOWS else ["docker", "info"])
    docker_ok = rc == 0
    checks.append(("Docker", docker_ok, "容器化部署" if docker_ok else "未安装 / 未运行"))

    # Python
    py_ver = sys.version_info
    py_ok = py_ver.major >= 3 and (py_ver.minor >= 11 or py_ver.major > 3)
    checks.append(("Python", py_ok, f"v{py_ver.major}.{py_ver.minor}.{py_ver.micro}"))

    # Node
    rc, out, _ = run_cmd(["node", "--version"])
    node_ok = rc == 0
    node_ver = out.strip() if rc == 0 else "未安装"
    checks.append(("Node.js", node_ok, node_ver))

    # npm
    rc, out, _ = run_cmd(["npm", "--version"])
    npm_ok = rc == 0
    npm_ver = out.strip() if rc == 0 else "未安装"
    checks.append(("npm", npm_ok, npm_ver))

    # Git
    rc, out, _ = run_cmd(["git", "--version"])
    git_ok = rc == 0
    git_ver = out.strip() if rc == 0 else "未安装"
    checks.append(("Git", git_ok, git_ver))

    print()
    all_ok = True
    for name, ok, detail in checks:
        status = c("✓", 'GREEN') if ok else c("✗", 'RED')
        print(f"  {status} {name:<12} {c(detail, 'GREEN' if ok else 'RED')}")
        if not ok:
            all_ok = False

    if all_ok:
        print(c("\n  ✓ 所有依赖已就绪！", 'GREEN'))
        return True
    else:
        print(c("\n  ⚠ 部分依赖缺失，Vulcan 将以 Native 模式运行", 'YELLOW'))
        return False


# ─── 第2步：选择 LLM Provider ─────────────────────────────────────────────────
LLM_PROVIDERS = [
    ("OpenAI", "OpenAI GPT-4o / GPT-4o-mini", "https://api.openai.com/v1"),
    ("Anthropic", "Anthropic Claude 3.5 / Claude 3", "https://api.anthropic.com"),
    ("Google", "Google Gemini 2.0 / 1.5", "https://generativelanguage.googleapis.com/v1beta"),
    ("DeepSeek", "DeepSeek V3 / Coder", "https://api.deepseek.com"),
    ("Groq", "Groq Llama / Mistral (免费高速)", "https://api.groq.com/openai/v1"),
    ("Ollama", "本地模型 (Llama/Qwen 等)", "http://localhost:11434/v1"),
    ("Azure OpenAI", "Azure OpenAI Service", "https://YOUR_RESOURCE.openai.azure.com"),
    ("自定义", "手动输入 API 地址", ""),
]

LLM_MODELS = {
    "OpenAI": ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
    "Anthropic": ["claude-3-5-sonnet-20241022", "claude-3-opus-20240229", "claude-3-haiku-20240307"],
    "Google": ["gemini-2.0-flash-exp", "gemini-1.5-pro", "gemini-1.5-flash"],
    "DeepSeek": ["deepseek-chat", "deepseek-coder"],
    "Groq": ["llama-3.3-70b-versatile", "mixtral-8x7b-32768", "llama-3.1-8b-instant"],
    "Ollama": ["llama3.3", "qwen2.5", "codellama", "mistral"],
    "Azure OpenAI": ["gpt-4o", "gpt-4o-mini", "gpt-35-turbo"],
    "自定义": [],
}


def step_llm_config() -> dict:
    print_step(2, 5, "配置大语言模型")

    print(f"\n  {c('请选择 LLM 服务提供商:', 'BOLD')}\n")
    for i, (name, desc, _) in enumerate(LLM_PROVIDERS):
        print(f"    {c(f'[{i+1}]', 'YELLOW')} {c(name, 'CYAN')} — {desc}")

    idx = select_("选择提供商", [p[0] for p in LLM_PROVIDERS])
    provider_key = LLM_PROVIDERS[idx][0]
    base_url = LLM_PROVIDERS[idx][2]

    print(c(f"\n  已选择: {provider_key}", 'GREEN'))

    # Base URL（如果自定义）
    if provider_key == "自定义":
        base_url = input_("请输入 API Base URL")
        model_list = []
        model = input_("请输入模型名称")
    else:
        model_list = LLM_MODELS.get(provider_key, [])
        if model_list:
            model_idx = select_(f"选择 {provider_key} 模型", model_list)
            model = model_list[model_idx]
        else:
            model = input_("请输入模型名称")

    # API Key
    print(f"\n  {c('API Key', 'BOLD')}（输入时不可见）:")
    api_key = input_("API Key", password=True)
    if not api_key:
        print(c("  ⚠ API Key 不能为空", 'RED'))
        api_key = input_("API Key", password=True)

    # Base URL 微调
    if base_url and provider_key != "自定义":
        adjust_url = confirm(f"API 地址使用默认的 {base_url}", default=True)
        if not adjust_url:
            base_url = input_("请输入 API Base URL", base_url)

    return {
        "provider": provider_key,
        "model": model,
        "api_key": api_key,
        "base_url": base_url,
    }


# ─── 第3步：配置消息渠道 ──────────────────────────────────────────────────────
CHANNELS = [
    ("微信 WeChat", "微信公众号 +草稿箱发布", False),
    ("Telegram Bot", "Telegram Bot 消息收发", False),
    ("微信客服（接口）", "微信客服消息 API", False),
    ("飞书 Feishu", "飞书机器人 + 消息", False),
    ("Slack", "Slack App 消息", False),
    ("跳过", "暂不配置渠道", True),
]


def step_channel_config() -> list:
    print_step(3, 5, "配置消息渠道")

    configured = []

    print(f"\n  {c('选择要启用的消息渠道（可多选）:', 'BOLD')}\n")
    for i, (name, desc, is_skip) in enumerate(CHANNELS):
        print(f"    {c(f'[{i+1}]', 'YELLOW')} {c(name, 'CYAN')} — {desc}")

    print(f"\n  {c('输入数字启用/禁用（如: 1,3,4），回车确认:', 'DIM')}")
    val = input_("选择渠道编号")

    if val.strip() == "":
        print(c("  跳过渠道配置", 'YELLOW'))
        return []

    # 解析选择
    selected = set()
    for v in val.replace(" ", ",").split(","):
        try:
            idx = int(v.strip()) - 1
            if 0 <= idx < len(CHANNELS):
                selected.add(idx)
        except ValueError:
            pass

    skip_selected = any(CHANNELS[i][2] for i in selected)
    if skip_selected:
        print(c("  ✓ 已跳过渠道配置", 'YELLOW'))
        return []

    results = []
    for i in selected:
        name, desc, _ = CHANNELS[i]
        print(c(f"\n  ── 配置 {name} ──", 'CYAN'))
        results.append(configure_channel(name))

    return results


def configure_channel(channel_name: str) -> dict:
    """交互式配置单个渠道"""
    cfg = {"type": channel_name, "enabled": True}

    if "微信" in channel_name and "客服" not in channel_name:
        # 微信公众号
        app_id = input_("AppID")
        app_secret = input_("AppSecret", password=True)
        token = input_("Token（微信公众号后台设置）")
        aes_key = input_("EncodingAESKey（可选）")
        cfg.update({
            "app_id": app_id,
            "app_secret": app_secret,
            "token": token,
            "aes_key": aes_key,
        })
        print(c(f"  ✓ 微信公众号配置完成", 'GREEN'))

    elif "Telegram" in channel_name:
        bot_token = input_("Bot Token（@BotFather 获取）")
        chat_id = input_("Chat ID（可选，私聊则留空）")
        cfg.update({"bot_token": bot_token, "chat_id": chat_id})
        print(c("  ✓ Telegram Bot 配置完成", 'GREEN'))

    elif "飞书" in channel_name:
        app_id = input_("App ID")
        app_secret = input_("App Secret", password=True)
        cfg.update({"app_id": app_id, "app_secret": app_secret})
        print(c("  ✓ 飞书配置完成", 'GREEN'))

    elif "Slack" in channel_name:
        bot_token = input_("Bot Token (xoxb-...)")
        signing_secret = input_("Signing Secret")
        cfg.update({"bot_token": bot_token, "signing_secret": signing_secret})
        print(c("  ✓ Slack 配置完成", 'GREEN'))

    return cfg


# ─── 第4步：测试连接 ───────────────────────────────────────────────────────────
def step_connectivity_test(config: dict, channels: list):
    print_step(4, 5, "测试连接")

    all_ok = True

    # 测试 LLM 连接
    print(f"\n  {c('▶ 测试 LLM 连接...', 'CYAN')}")
    provider = config["provider"]
    base_url = config["base_url"]
    api_key = config["api_key"]
    model = config["model"]

    if provider == "Ollama":
        ok = test_url(base_url.replace("/v1", ""))
        if ok:
            print(c(f"  ✓ Ollama 本地服务正常: {base_url}", 'GREEN'))
        else:
            print(c(f"  ✗ 无法连接 Ollama: {base_url}", 'RED'))
            print(c("    请确保 Ollama 已启动: ollama serve", 'YELLOW'))
            all_ok = False
    elif base_url:
        # 通用的 OpenAI-compatible 测试
        test_url_ok = test_url(base_url)
        if test_url_ok:
            print(c(f"  ✓ API 地址可达: {base_url}", 'GREEN'))
        else:
            print(c(f"  ✗ 无法访问: {base_url}", 'RED'))
            all_ok = False

    # 测试微信（如果配置了）
    wechat_cfg = next((c for c in channels if "微信" in c.get("type", "") and "客服" not in c.get("type", "")), None)
    if wechat_cfg:
        print(f"\n  {c('▶ 测试微信公众号 Token 验证...', 'CYAN')}")
        # Token 验证需要服务器，这里只检查配置完整性
        if wechat_cfg.get("app_id") and wechat_cfg.get("token"):
            print(c(f"  ✓ 微信公众号配置完整 (AppID: {wechat_cfg['app_id'][:8]}...)", 'GREEN'))
        else:
            print(c(f"  ✗ 微信公众号配置不完整", 'RED'))
            all_ok = False

    print()
    if all_ok:
        print(c("  ✓ 所有连接测试通过！", 'GREEN'))
    else:
        print(c("  ⚠ 部分连接测试失败，可先跳过稍后配置", 'YELLOW'))

    return all_ok


# ─── 第5步：启动 Vulcan ──────────────────────────────────────────────────────
def step_start_vulcan(docker_mode: bool):
    print_step(5, 5, "启动 Vulcan")

    # 构建环境变量
    cfg = load_config()
    llm_cfg = cfg.get("llm", {})
    os.environ["LLM_PROVIDER"] = llm_cfg.get("provider", "openai")
    os.environ["LLM_API_KEY"] = llm_cfg.get("api_key", "")
    os.environ["LLM_BASE_URL"] = llm_cfg.get("base_url", "")
    os.environ["LLM_MODEL"] = llm_cfg.get("model", "")

    if docker_mode:
        print(f"\n  {c('▶ 启动 Docker 容器...', 'CYAN')}")
        cmd = ["docker-compose", "-f", os.path.join(PROJECT_ROOT, "docker-compose.yml"), "up", "-d"]
        rc, out, err = run_cmd(cmd, timeout=60)
        if rc == 0:
            print(c("  ✓ Docker 容器已启动", 'GREEN'))
            print(c("  ✓ Vulcan 已运行！", 'GREEN'))
            print(f"\n  {c('─'*50, 'DIM')}")
            print(f"  🌐  Web UI:   {c('http://localhost:3000', 'CYAN')}")
            print(f"  📡  API:      {c('http://localhost:8000', 'CYAN')}")
            print(f"  📖  API Docs: {c('http://localhost:8000/docs', 'CYAN')}")
            print(f"\n  运行 {c('./deploy/run.sh status', 'YELLOW')} 查看状态")
            print(f"  运行 {c('./deploy/run.sh logs', 'YELLOW')} 查看日志")
        else:
            print(c(f"  ✗ Docker 启动失败: {err[:200]}", 'RED'))
    else:
        # Native 模式
        print(f"\n  {c('▶ 启动 Vulcan (Native 模式)...', 'CYAN')}")

        # 启动后端
        backend_dir = os.path.join(PROJECT_ROOT, "vulcan-core")
        venv_python = os.path.join(backend_dir, ".venv", "bin", "python3")
        if not IS_WINDOWS:
            venv_python = os.path.join(backend_dir, ".venv", "bin", "python3")
        else:
            venv_python = os.path.join(backend_dir, ".venv", "Scripts", "python.exe")

        if os.path.exists(venv_python):
            python_bin = venv_python
        else:
            python_bin = "python3" if not IS_WINDOWS else "python"

        print(f"  启动后端 (port 8000)...")
        if not IS_WINDOWS:
            subprocess.Popen(
                [python_bin, "vulcan.py", "--port", "8000"],
                cwd=backend_dir,
                stdout=open("/tmp/vulcan-api.log", "w"),
                stderr=subprocess.STDOUT,
                start_new_session=True
            )
        else:
            subprocess.Popen(
                ["start", "cmd", "/c", f'python "{os.path.join(backend_dir, "vulcan.py")}" --port 8000'],
                shell=True
            )

        # 等待后端
        print("  等待后端就绪...")
        for i in range(30):
            if test_url("http://localhost:8000/health"):
                break
            time.sleep(1)

        # 启动前端
        print(f"  启动前端 (port 3000)...")
        frontend_dir = os.path.join(PROJECT_ROOT, "vulcan-webui")
        if not IS_WINDOWS:
            subprocess.Popen(
                ["npm", "run", "dev"],
                cwd=frontend_dir,
                stdout=open("/tmp/vulcan-ui.log", "w"),
                stderr=subprocess.STDOUT,
                start_new_session=True
            )
        else:
            subprocess.Popen(
                ["start", "cmd", "/c", "npm run dev"],
                cwd=frontend_dir,
                shell=True
            )

        print(c("\n  ✓ Vulcan 已启动！", 'GREEN'))
        print(f"\n  {c('─'*50, 'DIM')}")
        print(f"  🌐  Web UI:   {c('http://localhost:3000', 'CYAN')}")
        print(f"  📡  API:      {c('http://localhost:8000', 'CYAN')}")
        print(f"\n  日志: /tmp/vulcan-api.log, /tmp/vulcan-ui.log")


# ─── 主流程 ───────────────────────────────────────────────────────────────────
def main():
    clear()
    print_banner()

    print(c("  欢迎使用 Vulcan！本向导将帮助您完成初始配置。", 'BOLD'))
    print(c("  按 Ctrl+C 可随时退出，已填写的内容不会丢失。\n", 'DIM'))

    # 第1步：检查环境
    docker_ok = step_prerequisites()
    mode = "docker" if docker_ok else "native"
    print(f"\n  {c(f'将使用 {mode.upper()} 模式部署', 'CYAN')}")

    if not confirm("继续进入 LLM 配置？"):
        print(c("\n  可随时运行 python scripts/wizard.py 重新启动向导", 'YELLOW'))
        return

    # 第2步：LLM 配置
    llm_cfg = step_llm_config()

    if not confirm("继续配置消息渠道？", default=False):
        channels = []
    else:
        channels = step_channel_config()

    # 保存配置
    full_config = load_config()
    full_config["llm"] = llm_cfg
    full_config["channels"] = channels
    full_config["wizard_completed"] = True
    save_config(full_config)

    # 第4步：测试连接
    if confirm("立即测试连接？", default=True):
        step_connectivity_test(llm_cfg, channels)

    # 第5步：启动
    print()
    if confirm("立即启动 Vulcan？"):
        step_start_vulcan(docker_ok)
    else:
        print(c("\n  ✓ 配置已保存！", 'GREEN'))
        print(f"  运行 {c('./deploy/run.sh start', 'YELLOW')} 即可启动 Vulcan")
        print(f"  运行 {c('python scripts/wizard.py', 'YELLOW')} 重新启动向导")


if __name__ == "__main__":
    main()
