"""
Vulcan Gateway Manager — starts/stops all platform adapters.

Manages the lifecycle of all messaging platform adapters,
routes messages to VulcanAgent, and provides a clean API for the gateway.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any, Dict, List, Optional

from .adapters import create_vulcan_adapter
from .config import PlatformConfig, VulcanGatewayConfig, load_config

logger = logging.getLogger(__name__)


class PlatformManager:
    """
    Manages all messaging platform adapters for Vulcan.

    Usage:
        config = load_config()
        manager = PlatformManager(config, vulcan_agent)
        await manager.start_all()
        # ... run forever ...
        await manager.stop_all()
    """

    def __init__(
        self,
        config: Optional[VulcanGatewayConfig] = None,
        vulcan_agent: Optional[Any] = None,
    ):
        if config is None:
            config = load_config()
        self.config = config
        self.vulcan_agent = vulcan_agent

        # Live adapters: platform_name -> adapter instance
        self._adapters: Dict[str, Any] = {}

        # Lock to prevent concurrent start/stop
        self._lock = asyncio.Lock()
        self._running = False

    # ------------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------------

    async def start_all(self) -> None:
        """Connect all enabled platform adapters."""
        async with self._lock:
            if self._running:
                logger.warning("PlatformManager already running")
                return

            logger.info("Starting Vulcan Gateway...")
            tasks = []
            for name, pconfig in self.config.platforms.items():
                if pconfig.enabled:
                    tasks.append(self._start_platform(name, pconfig))

            if tasks:
                results = await asyncio.gather(*tasks, return_exceptions=True)
                for name, result in zip([n for n, c in self.config.platforms.items() if c.enabled], results):
                    if isinstance(result, Exception):
                        logger.error("Failed to start platform '%s': %s", name, result)

            self._running = True
            logger.info("Vulcan Gateway started with %d platform(s)", len(self._adapters))

    async def stop_all(self) -> None:
        """Disconnect all platform adapters gracefully."""
        async with self._lock:
            if not self._running:
                return

            logger.info("Stopping Vulcan Gateway...")
            tasks = [adapter.disconnect() for adapter in self._adapters.values()]
            if tasks:
                await asyncio.gather(*tasks, return_exceptions=True)
            self._adapters.clear()
            self._running = False
            logger.info("Vulcan Gateway stopped")

    async def _start_platform(self, name: str, pconfig: PlatformConfig) -> None:
        """Start a single platform adapter."""
        try:
            adapter = await create_vulcan_adapter(name, pconfig, self.vulcan_agent)
            if adapter is None:
                logger.warning("No adapter available for platform '%s'", name)
                return

            # Wire up the message handler to call VulcanAgent
            adapter.set_message_handler(self._make_handler(adapter))

            connected = await adapter.connect()
            if connected:
                self._adapters[name] = adapter
                logger.info("Platform '%s' connected", name)
            else:
                logger.warning("Platform '%s' failed to connect", name)

        except Exception as e:
            logger.error("Error starting platform '%s': %s", name, e, exc_info=True)

    def _make_handler(self, adapter: Any):
        """Create the message handler closure for an adapter."""
        async def handler(event):
            # The adapter's _process_message_background will call our handler,
            # which calls _vulcan_handle → VulcanAgent.
            # We return None because the adapter sends the reply itself.
            return None
        return handler

    # ------------------------------------------------------------------------
    # Adapters
    # ------------------------------------------------------------------------

    def get_adapter(self, platform: str) -> Optional[Any]:
        """Get a live adapter by platform name."""
        return self._adapters.get(platform.lower())

    def list_adapters(self) -> List[str]:
        """List all live adapter names."""
        return list(self._adapters.keys())

    @property
    def is_running(self) -> bool:
        return self._running

    # ------------------------------------------------------------------------
    # Send API (for VulcanAgent to send outbound messages)
    # ------------------------------------------------------------------------

    async def send_message(
        self,
        platform: str,
        chat_id: str,
        content: str,
        **kwargs
    ) -> Any:
        """Send a message via a specific platform."""
        adapter = self._adapters.get(platform.lower())
        if adapter is None:
            logger.error("No live adapter for platform '%s'", platform)
            return None
        return await adapter.send(chat_id=chat_id, content=content, **kwargs)

    async def send_image(
        self,
        platform: str,
        chat_id: str,
        image_url: str,
        **kwargs
    ) -> Any:
        """Send an image via a specific platform."""
        adapter = self._adapters.get(platform.lower())
        if adapter is None:
            return None
        return await adapter.send_image(chat_id=chat_id, image_url=image_url, **kwargs)

    async def send_typing(
        self,
        platform: str,
        chat_id: str,
        **kwargs
    ) -> None:
        """Send typing indicator via a specific platform."""
        adapter = self._adapters.get(platform.lower())
        if adapter:
            await adapter.send_typing(chat_id=chat_id, **kwargs)

    async def stop_typing(self, platform: str, chat_id: str, **kwargs) -> None:
        """Stop typing indicator via a specific platform."""
        adapter = self._adapters.get(platform.lower())
        if adapter:
            await adapter.stop_typing(chat_id=chat_id, **kwargs)

    # ------------------------------------------------------------------------
    # Home channels (for cron job delivery)
    # ------------------------------------------------------------------------

    def get_home_channel(self, platform: str) -> Optional[tuple]:
        """Return (platform, chat_id) for the home channel of a platform."""
        pconfig = self.config.platforms.get(platform.lower())
        if pconfig and pconfig.home_channel:
            return (pconfig.home_channel.platform.value, pconfig.home_channel.chat_id)
        return None

    def resolve_destination(self, delivery_target: str) -> tuple:
        """
        Resolve a delivery target string to (platform, chat_id).

        delivery_target formats:
          - "weixin"           → home channel
          - "telegram"        → home channel
          - "weixin:username"  → specific user
          - "telegram:123456" → specific chat
          - "local"           → local file only
        """
        if ":" in delivery_target:
            platform, chat_id = delivery_target.split(":", 1)
        else:
            platform = delivery_target
            home = self.get_home_channel(platform)
            if home is None:
                raise ValueError(f"No home channel configured for platform '{platform}'")
            return home

        return (platform, chat_id)
