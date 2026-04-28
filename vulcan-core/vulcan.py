#!/usr/bin/env python3
"""
Vulcan CLI — 入口文件

支持模式:
  python vulcan.py              # API server (FastAPI + Gateway)
  python vulcan.py --chat       # 交互式对话
  python vulcan.py --gateway    # 仅启动 Gateway（无 API）
  python vulcan.py --port 9000  # 自定义端口
"""

import argparse
import asyncio
import sys
from pathlib import Path

# Ensure vulcan-core package is importable
sys.path.insert(0, str(Path(__file__).parent))

from vulcan.version import __version__, __brand__, __tagline__


def print_banner():
    print(f"""
╔═══════════════════════════════════════════╗
║   🔥 {__brand__} — {__tagline__}    ║
║   Version {__version__}                             ║
╚═══════════════════════════════════════════╝
    """)


async def start_gateway():
    """Start gateway + agent without FastAPI server."""
    from vulcan.agent.vulcan_agent import VulcanAgent, AgentConfig
    from vulcan.gateway_integration import gateway_integration
    from vulcan.agent.observability.logger import VulcanLogger, LogLevel

    logger = VulcanLogger(session_id="Vulcan", log_level="INFO")
    config = AgentConfig(enable_observability=True, enable_memory=True)
    agent = VulcanAgent(config)
    logger.info("VulcanAgent initialized")

    try:
        gateway = await gateway_integration(vulcan_agent=agent)
        logger.info("Vulcan Gateway started — all platforms connected")
        logger.info("Platforms: %s", gateway.manager.list_adapters())

        # Keep running
        while True:
            await asyncio.sleep(3600)
    except KeyboardInterrupt:
        logger.info("Shutting down...")
    finally:
        await gateway.stop()
        await agent.shutdown()
        logger.info("Vulcan stopped")


def main():
    parser = argparse.ArgumentParser(prog="vulcan", description="Vulcan AI Agent Platform")
    parser.add_argument("--version", action="version", version=f"vulcan {__version__}")
    parser.add_argument("--host", default="0.0.0.0", help="API host (default: 0.0.0.0)")
    parser.add_argument("--port", type=int, default=8000, help="API port (default: 8000)")
    parser.add_argument("--chat", action="store_true", help="Interactive chat mode")
    parser.add_argument("--gateway", action="store_true", help="Start gateway only (no API server)")
    parser.add_argument("--model", default="claude-sonnet-4", help="Model to use")
    parser.add_argument("--no-observability", action="store_true", help="Disable observability")
    parser.add_argument("--log-level", default="INFO", help="Log level")
    args = parser.parse_args()

    print_banner()

    if args.gateway:
        # Gateway-only mode (no FastAPI)
        print("🔌 Starting Vulcan Gateway (no API server)...\n")
        asyncio.run(start_gateway())

    elif args.chat:
        # Interactive chat mode
        from vulcan.agent.vulcan_agent import VulcanAgent, AgentConfig
        config = AgentConfig(
            model=args.model,
            enable_observability=not args.no_observability,
        )
        agent = VulcanAgent(config)
        print("🧑 Starting interactive chat. Type 'exit' to quit.\n")
        try:
            while True:
                user_input = input("You: ")
                if user_input.lower() in ("exit", "quit", "q"):
                    break
                if not user_input.strip():
                    continue
                result = asyncio.run(agent.run_async(user_input))
                print(f"\nVulcan: {result.get('result', result.get('error', 'No result'))}\n")
        except KeyboardInterrupt:
            print("\n\nExiting...")
        print("Goodbye!")

    else:
        # API server mode (FastAPI + Gateway integrated via lifespan)
        import uvicorn
        from vulcan.main import app
        print(f"🚀 Starting Vulcan API server on {args.host}:{args.port}")
        print(f"📡 Gateway auto-started via lifespan (all platforms)\n")
        uvicorn.run(
            app,
            host=args.host,
            port=args.port,
            log_level=args.log_level.lower(),
        )


if __name__ == "__main__":
    main()
