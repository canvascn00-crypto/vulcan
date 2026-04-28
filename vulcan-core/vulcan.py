#!/usr/bin/env python3
"""
Vulcan CLI — 入口文件
支持: python vulcan.py (启动 API) / python vulcan.py chat (交互式对话)
"""

import argparse
import asyncio
import sys
from pathlib import Path

# Ensure vulcan-core package is importable
sys.path.insert(0, str(Path(__file__).parent))

from vulcan.main import app
from vulcan.version import __version__, __brand__, __tagline__


def print_banner():
    print(f"""
╔══════════════════════════════════════╗
║   🔥 {__brand__} — {__tagline__}    ║
║   Version {__version__}                           ║
╚══════════════════════════════════════╝
    """)


def main():
    parser = argparse.ArgumentParser(prog="vulcan", description="Vulcan AI Agent Platform")
    parser.add_argument("--version", action="version", version=f"vulcan {__version__}")
    parser.add_argument("--host", default="0.0.0.0", help="API host (default: 0.0.0.0)")
    parser.add_argument("--port", type=int, default=8000, help="API port (default: 8000)")
    parser.add_argument("--chat", action="store_true", help="Interactive chat mode")
    parser.add_argument("--model", default="claude-sonnet-4", help="Model to use")
    parser.add_argument("--no-observability", action="store_true", help="Disable observability")
    args = parser.parse_args()

    print_banner()

    if args.chat:
        # Interactive chat mode
        from vulcan.agent.vulcan_agent import VulcanAgent, AgentConfig
        config = AgentConfig(
            model=args.model,
            enable_observability=not args.no_observability,
        )
        agent = VulcanAgent(config)
        print("🧑 Starting interactive chat. Type 'exit' to quit.\n")
        while True:
            try:
                user_input = input("You: ")
                if user_input.lower() in ("exit", "quit", "q"):
                    break
                if not user_input.strip():
                    continue
                result = asyncio.run(agent.run_async(user_input))
                print(f"\nVulcan: {result.get('result', result.get('error', 'No result'))}\n")
            except KeyboardInterrupt:
                print("\n\nExiting...")
                break
        print("Goodbye!")
    else:
        # API server mode
        import uvicorn
        print(f"🚀 Starting Vulcan API server on {args.host}:{args.port}")
        uvicorn.run(
            app,
            host=args.host,
            port=args.port,
            log_level="info",
        )


if __name__ == "__main__":
    main()
