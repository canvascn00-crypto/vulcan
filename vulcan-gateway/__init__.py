"""
Vulcan Gateway — universal AI messaging gateway.

Inherits all 20 platform adapters from Hermes Agent.
Each adapter is wrapped to route messages to VulcanAgent.
"""

from .adapters import (
    PlatformManager,
    VulcanAdapterMixin,
    create_vulcan_adapter,
    StubAdapter,
)
from .config import (
    HomeChannel,
    Platform,
    PlatformConfig,
    SessionResetPolicy,
    VulcanGatewayConfig,
    load_config,
    save_config,
)
from .manager import PlatformManager

__all__ = [
    # Config
    "Platform",
    "PlatformConfig",
    "HomeChannel",
    "SessionResetPolicy",
    "VulcanGatewayConfig",
    "load_config",
    "save_config",
    # Manager
    "PlatformManager",
    # Adapters
    "create_vulcan_adapter",
    "VulcanAdapterMixin",
    "StubAdapter",
]
