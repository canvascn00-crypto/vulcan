#!/usr/bin/env python3
"""
Vulcan — 下一代 AI Agent 平台入口
盗火者：将 AI 智能之火带给每个人
"""

import argparse
import asyncio
import sys
from pathlib import Path

# 添加 vulcan-core 到路径
sys.path.insert(0, str(Path(__file__).parent))

from vulcan.agent.vulcan_agent import VulcanAgent
from vulcan.version import __version__


def main():
    parser = argparse.ArgumentParser(
        prog="vulcan",
        description="Vulcan — 下一代 AI Agent 平台 (盗火者)"
    )
    parser.add_argument("--version", action="version", version=f"vulcan {__version__}")
    parser.add_argument("--mode", choices=["cli", "gateway", "api"], default="cli",
                        help="运行模式")
    parser.add_argument("--model", default="claude-sonnet-4",
                        help="默认模型")
    parser.add_argument("--provider", default="anthropic",
                        help="默认 Provider")
    parser.add_argument("--session", help="指定会话 ID 恢复对话")
    args = parser.parse_args()

    print(f"🔥 Vulcan {__version__} — 盗火者")
    print(f"   模式: {args.mode}")
    print(f"   模型: {args.provider}/{args.model}")
    print()

    if args.mode == "cli":
        asyncio.run(cli_loop(args))
    elif args.mode == "gateway":
        asyncio.run(start_gateway(args))
    elif args.mode == "api":
        asyncio.run(start_api(args))


async def cli_loop(args):
    """CLI 交互模式"""
    agent = VulcanAgent(
        model=args.model,
        provider=args.provider,
        session_id=args.session
    )

    print("输入消息开始对话，输入 /exit 退出，输入 /clear 清空记忆")
    print("=" * 50)

    while True:
        try:
            user_input = input("\n👤 你: ").strip()
            if not user_input:
                continue
            if user_input == "/exit":
                print("👋 再见！")
                break
            if user_input == "/clear":
                await agent.memory.clear_session()
                print("✅ 记忆已清空")
                continue

            response = await agent.run(user_input)
            print(f"\n🔥 Vulcan: {response}")

        except KeyboardInterrupt:
            print("\n👋 再见！")
            break
        except Exception as e:
            print(f"❌ 错误: {e}")


async def start_gateway(args):
    """启动网关模式（28 平台消息接入）"""
    from vulcan.gateway.run import run_gateway
    print("⚠️  网关模式开发中...")
    await run_gateway()


async def start_api(args):
    """启动 API Server 模式"""
    from vulcan.api.main import run_api
    print("⚠️  API Server 开发中...")
    await run_api()


if __name__ == "__main__":
    main()
