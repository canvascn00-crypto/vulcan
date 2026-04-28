"""
Vulcan Core — Python Package Setup
"""

from setuptools import setup, find_packages
from pathlib import Path

here = Path(__file__).parent
long_description = (here / ".." / "docs" / "README.md").read_text(
    encoding="utf-8", errors="replace"
)

setup(
    name="vulcan-ai",
    version="0.1.0",
    description="Vulcan — 下一代 AI Agent 平台（盗火者）",
    long_description=long_description,
    long_description_content_type="text/markdown",
    author="Vulcan Team",
    url="https://github.com/vulcan-ai/vulcan",
    license="MIT",
    packages=find_packages(exclude=["tests", "tests.*"]),
    python_requires=">=3.10",
    install_requires=[
        # Core
        "httpx>=0.25.0",
        "aiofiles>=23.0.0",
        "pydantic>=2.0",
        # Memory
        "chromadb>=0.4.0",
        # Tools
        "playwright>=1.40.0",
        # Observability
        "structlog>=23.0.0",
        # Network
        "socksio>=1.0.0",
    ],
    extras_require={
        "dev": [
            "pytest>=7.4.0",
            "pytest-asyncio>=0.21.0",
            "black>=23.0.0",
            "ruff>=0.1.0",
            "mypy>=1.7.0",
        ],
        "vllm": [
            "vllm>=0.2.0",
        ],
        "gguf": [
            "llama-cpp-python>=0.2.0",
        ],
    },
    entry_points={
        "console_scripts": [
            "vulcan=vulcan:main",
            "vulcan-agent=vulcan.agent.vulcan_agent:main",
        ],
    },
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
    ],
)
