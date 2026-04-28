"""
Vulcan Gateway integration — bridges PlatformManager to VulcanAgent.

This module provides the gateway_integration() function that sets up
the full Vulcan messaging gateway with all platform adapters.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)


async def gateway_integration(
    vulcan_agent: Any,
    config: Optional[Any] = None,
) -> "GatewayIntegration":
    """
    Set up the full Vulcan messaging gateway.

    This:
      1. Loads the gateway config (platforms, home channels, etc.)
      2. Creates a PlatformManager
      3. Wires VulcanAgent as the handler for all platforms
      4. Starts all enabled platforms

    Returns the GatewayIntegration object.
    """
    # Lazy import to avoid circular dependency
    from vulcan_gateway import PlatformManager, load_config

    if config is None:
        config = load_config()

    manager = PlatformManager(config, vulcan_agent)
    await manager.start_all()

    return GatewayIntegration(manager)


class GatewayIntegration:
    """
    Manages the lifecycle of the Vulcan messaging gateway.

    Created by :func:`gateway_integration`.
    Use :meth:`stop` to shut down all platform adapters.
    """

    def __init__(self, manager: "PlatformManager"):
        self._manager = manager

    @property
    def manager(self) -> "PlatformManager":
        """The underlying PlatformManager."""
        return self._manager

    @property
    def is_running(self) -> bool:
        return self._manager.is_running

    async def stop(self) -> None:
        """Stop all platform adapters."""
        await self._manager.stop_all()

    async def send_message(
        self,
        platform: str,
        chat_id: str,
        content: str,
        **kwargs
    ) -> Any:
        """Send a message via a specific platform."""
        return await self._manager.send_message(platform, chat_id, content, **kwargs)

    async def send_image(
        self,
        platform: str,
        chat_id: str,
        image_url: str,
        **kwargs
    ) -> Any:
        """Send an image via a specific platform."""
        return await self._manager.send_image(platform, chat_id, image_url, **kwargs)
