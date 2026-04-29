"""
Vulcan Platform Adapters — inherit platform adapters, drive with VulcanAgent.

Each adapter wraps the platform adapter and overrides only the
message-handling layer to route events to VulcanAgent instead of VulcanAgent.

Supported platforms (supported by Vulcan):
  WeChat, Telegram, Discord, WhatsApp, Slack, Signal, Mattermost,
  Matrix, DingTalk, FeiShu, WeCom, QQBot, SMS, Email, HomeAssistant,
  BlueBubbles, Webhook
"""

from __future__ import annotations

import asyncio
import logging
import uuid
from typing import Any, Callable, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)


# Re-export the platform base classes so Vulcan adapters can inherit them.
# These are set up by _ensure_agent_path() below.
BasePlatformAdapter = None
MessageEvent = None
SendResult = None
MessageType = None
SessionSource = None


def _ensure_agent_path() -> bool:
    """Add Vulcan Agent to sys.path if not already present."""
    import sys
    from pathlib import Path

    agent_home = Path.home() / ".hermes" / "hermes-agent"
    if not agent_home.exists():
        logger.warning("Vulcan Agent not found at %s — Vulcan adapters will use stubs", agent_home)
        return False

    str_path = str(agent_home)
    if str_path not in sys.path:
        sys.path.insert(0, str_path)

    return True


def _import_agent_base() -> bool:
    """Import platform base classes. Returns True if successful."""
    global BasePlatformAdapter, MessageEvent, SendResult, MessageType, SessionSource
    try:
        from gateway.platforms.base import (
            BasePlatformAdapter as _Base,
            MessageEvent as _ME,
            SendResult as _SR,
            MessageType as _MT,
        )
        from gateway.session import SessionSource as _SS
        BasePlatformAdapter = _Base
        MessageEvent = _ME
        SendResult = _SR
        MessageType = _MT
        SessionSource = _SS
        return True
    except ImportError as e:
        logger.warning("Could not import platform base classes: %s", e)
        return False


_AGENT_LOADED = _ensure_agent_path() and _import_agent_base()


# ---------------------------------------------------------------------------
# Message handler type
# ---------------------------------------------------------------------------
VulcanMessageHandler = Callable[["VulcanAdapterMixin", MessageEvent], Any]


class VulcanAdapterMixin:
    """
    Thin mixin that overrides the message-handling hook to route events to
    VulcanAgent instead of VulcanAgent.

    Usage:
        class VulcanWeixinAdapter(VulcanAdapterMixin, WeixinAdapter):
            pass

    The mixin overrides `_process_message_background` (the internal background
    task that calls the AI).  All platform-specific logic (login, long-poll,
    media download, send, typing indicators) is inherited unchanged from the
    platform adapter.
    """

    # Set by PlatformManager when the adapter is registered
    vulcan_agent: Optional[Any] = None
    vulcan_session_store: Optional[Any] = None

    async def _vulcan_handle(self, event: MessageEvent) -> Optional[str]:
        """
        Route a MessageEvent to VulcanAgent and return the response string.

        This is called from the overridden _process_message_background.
        Returns the text reply, or None if VulcanAgent produced no text.
        """
        if self.vulcan_agent is None:
            logger.error("[%s] VulcanAgent not set on adapter — cannot process message", self.name)
            return "VulcanAgent is not configured. Please restart the gateway."

        try:
            # Build session_key (same formula)
            session_key = self._build_session_key(event)

            # Wrap platform MessageEvent → Vulcan chat message format
            vulcan_event = {
                "text": event.text or "",
                "message_id": event.message_id or str(uuid.uuid4()),
                "chat_id": event.source.chat_id if event.source else session_key,
                "platform": self.name,
                "session_key": session_key,
                "media_urls": event.media_urls,
                "media_types": event.media_types,
                "reply_to": event.reply_to_message_id,
                "reply_to_text": event.reply_to_text,
                "timestamp": event.timestamp.isoformat() if event.timestamp else None,
                "internal": event.internal,
            }

            # Call VulcanAgent
            response: Any = await self.vulcan_agent.run(vulcan_event)

            # Extract text reply
            if response is None:
                return None
            if hasattr(response, "reply"):
                return response.reply
            if isinstance(response, str):
                return response
            if isinstance(response, dict):
                return response.get("reply") or response.get("text")
            return str(response)

        except asyncio.CancelledError:
            raise
        except Exception as e:
            logger.error("[%s] VulcanAgent error: %s", self.name, e, exc_info=True)
            return f"Sorry, I encountered an error: {type(e).__name__}: {e}"

    def _build_session_key(self, event: MessageEvent) -> str:
        """Build session key for this platform (mirrors platform logic)."""
        parts = [self.name]
        if event.source:
            if event.source.user_id:
                parts.append(event.source.user_id)
            elif event.source.chat_id:
                parts.append(event.source.chat_id)
            if event.source.thread_id:
                parts.append(event.source.thread_id)
        return ":".join(parts)


# ---------------------------------------------------------------------------
# Stub base classes when agent runtime is not available
# ---------------------------------------------------------------------------
if not _AGENT_LOADED:
    logger.warning("Vulcan Agent not found — Vulcan will run without platform adapters.")

    class MessageEvent:
        text: str = ""
        message_type: Any = None
        source: Any = None
        raw_message: Any = None
        message_id: Optional[str] = None
        media_urls: List[str] = field(default_factory=list)
        media_types: List[str] = field(default_factory=list)
        reply_to_message_id: Optional[str] = None
        reply_to_text: Optional[str] = None
        internal: bool = False
        timestamp: Any = None

        def is_command(self) -> bool:
            return self.text.startswith("/")

        def get_command(self) -> Optional[str]:
            if not self.is_command():
                return None
            parts = self.text.split(maxsplit=1)
            raw = parts[0][1:].lower() if parts else None
            if raw and "@" in raw:
                raw = raw.split("@", 1)[0]
            return raw

        def get_command_args(self) -> str:
            if not self.is_command():
                return self.text
            parts = self.text.split(maxsplit=1)
            return parts[1] if len(parts) > 1 else ""

    class MessageType:
        TEXT = "text"

    class SendResult:
        success: bool = False
        message_id: Optional[str] = None
        error: Optional[str] = None
        raw_response: Any = None
        retryable: bool = False

    class SessionSource:
        pass

    class BasePlatformAdapter:
        name: str = "stub"
        config: Any = None
        _message_handler: Optional[Callable] = None

        def set_message_handler(self, handler: Callable) -> None:
            self._message_handler = handler

        async def connect(self) -> bool:
            return True

        async def disconnect(self) -> None:
            pass

        async def send(self, chat_id: str, content: str, **kwargs) -> SendResult:
            return SendResult(success=False, error="stub adapter")

        async def send_image(self, chat_id: str, image_url: str, **kwargs) -> SendResult:
            return SendResult(success=False, error="stub adapter")

        async def send_typing(self, chat_id: str, **kwargs) -> None:
            pass

        async def stop_typing(self, chat_id: str, **kwargs) -> None:
            pass

    class VulcanAdapterMixin:
        vulcan_agent = None
        vulcan_session_store = None

        async def _vulcan_handle(self, event: MessageEvent) -> Optional[str]:
            return "Platform adapters not available."

        def _build_session_key(self, event: MessageEvent) -> str:
            return f"stub:{getattr(event, 'source', None)}"


# ---------------------------------------------------------------------------
# Adapter factory — creates Vulcan-wrapped adapters for each platform
# ---------------------------------------------------------------------------
_ADAPTER_REGISTRY: Dict[str, type] = {}


def _register_adapter(platform: str, cls: type) -> None:
    _ADAPTER_REGISTRY[platform.lower()] = cls


async def create_vulcan_adapter(
    platform: str,
    config: Any,
    vulcan_agent: Any,
) -> Optional[Any]:
    """
    Create a Vulcan-wrapped adapter for *platform*.

    Priority:
      1. WeChat — VulcanWeixinAdapter (full override)
      2. Telegram — VulcanTelegramAdapter
      3. Discord — VulcanDiscordAdapter
      4. Generic — VulcanAdapterMixin + platform adapter (if agent loaded)
      5. Stub — BasePlatformAdapter (if agent not loaded)
    """
    platform = platform.lower()

    # Try platform adapter first
    if _AGENT_LOADED:
        adapter_cls = _get_adapter_cls(platform)
        if adapter_cls is not None:
            # Wrap with Vulcan mixin
            VulcanCls = _make_vulcan_adapter(platform, adapter_cls)
            adapter = adapter_cls.__new__(adapter_cls)
            # Re-run __init__ with config
            try:
                adapter_cls.__init__(adapter, config)
            except TypeError:
                # Some adapters don't take config in __init__
                pass
            adapter.vulcan_agent = vulcan_agent
            adapter.vulcan_session_store = None
            adapter.name = platform
            _register_adapter(platform, VulcanCls)
            return adapter

    # Fall back to stub
    logger.warning("No adapter for platform '%s' — using stub", platform)
    stub = StubAdapter(platform, config)
    stub.vulcan_agent = vulcan_agent
    return stub


def _get_adapter_cls(platform: str) -> Optional[type]:
    """Import and return the platform adapter class for the given platform."""
    mapping = {
        "weixin": ("gateway.platforms.weixin", "WeixinAdapter"),
        "telegram": ("gateway.platforms.telegram", "TelegramAdapter"),
        "discord": ("gateway.platforms.discord", "DiscordAdapter"),
        "whatsapp": ("gateway.platforms.whatsapp", "WhatsAppAdapter"),
        "slack": ("gateway.platforms.slack", "SlackAdapter"),
        "signal": ("gateway.platforms.signal", "SignalAdapter"),
        "mattermost": ("gateway.platforms.mattermost", "MattermostAdapter"),
        "matrix": ("gateway.platforms.matrix", "MatrixAdapter"),
        "dingtalk": ("gateway.platforms.dingtalk", "DingTalkAdapter"),
        "feishu": ("gateway.platforms.feishu", "FeishuAdapter"),
        "wecom": ("gateway.platforms.wecom", "WeComAdapter"),
        "qqbot": ("gateway.platforms.qqbot", "QQAdapter"),
        "bluebubbles": ("gateway.platforms.bluebubbles", "BlueBubblesAdapter"),
        "sms": ("gateway.platforms.sms", "SMSAdapter"),
        "email": ("gateway.platforms.email", "EmailAdapter"),
        "homeassistant": ("gateway.platforms.homeassistant", "HomeAssistantAdapter"),
        "webhook": ("gateway.platforms.webhook", "WebhookAdapter"),
    }

    if platform not in mapping:
        return None

    module_path, cls_name = mapping[platform]
    try:
        from importlib import import_module
        mod = import_module(module_path)
        return getattr(mod, cls_name, None)
    except ImportError:
        return None


def _make_vulcan_adapter(platform: str, AdapterCls: type) -> type:
    """Create a Vulcan-aware subclass of a platform adapter."""

    # Check registry first
    if platform in _ADAPTER_REGISTRY:
        return _ADAPTER_REGISTRY[platform]

    # Capture the parent's _process_message_background before we override it
    _parent_process = getattr(AdapterCls, "_process_message_background", None)

    class VulcanAdapter(VulcanAdapterMixin, AdapterCls):  # type: ignore[misc]
        """platform adapter + VulcanAgent message routing."""

        def __init__(self, config: Any = None):
            # Skip AdapterCls.__init__ and init the base ourselves
            # to avoid calling into agent full init
            from dataclasses import fields
            # Initialize base fields to defaults
            self.config = config
            self.name = platform

        async def _process_message_background(self, event: MessageEvent, session_key: str) -> None:
            """
            Override: route message to VulcanAgent instead of VulcanAgent.

            Keeps ALL inherited behavior:
            - Typing indicators
            - TTS playback
            - Media extraction & delivery
            - Error handling
            - Pending message drain
            """
            if self.vulcan_agent is None:
                logger.error("[%s] vulcan_agent not set", self.name)
                return

            # Call VulcanAgent
            try:
                response_text: Optional[str] = await self._vulcan_handle(event)

                if response_text:
                    from pathlib import Path
                    import re

                    # Extract MEDIA: files (from TTS etc.)
                    media_files: List[Tuple[str, bool]] = []
                    if "MEDIA:" in response_text:
                        media_files = self.extract_media(response_text)[0]
                        response_text = self.extract_media(response_text)[1]

                    # Extract images
                    images, text_content = self.extract_images(response_text)
                    text_content = text_content.replace("[[audio_as_voice]]", "").strip()
                    text_content = re.sub(r"MEDIA:\s*\S+", "", text_content).strip()

                    # Extract local files
                    local_files, text_content = self.extract_local_files(text_content)

                    # Send text
                    if text_content:
                        logger.info("[%s] Sending response (%d chars)", self.name, len(text_content))
                        await self._send_with_retry(
                            chat_id=event.source.chat_id,
                            content=text_content,
                            reply_to=event.message_id,
                        )

                    # Send images
                    for image_url, alt_text in images:
                        await self.send_image(
                            chat_id=event.source.chat_id,
                            image_url=image_url,
                            caption=alt_text or None,
                        )

                    # Send local files
                    _IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
                    _VIDEO_EXTS = {".mp4", ".mov", ".avi", ".mkv", ".webm", ".3gp"}
                    for file_path in local_files:
                        ext = Path(file_path).suffix.lower()
                        if ext in _IMAGE_EXTS:
                            await self.send_image_file(chat_id=event.source.chat_id, image_path=file_path)
                        elif ext in _VIDEO_EXTS:
                            await self.send_video(chat_id=event.source.chat_id, video_path=file_path)
                        else:
                            await self.send_document(chat_id=event.source.chat_id, file_path=file_path)

            except asyncio.CancelledError:
                raise
            except Exception as e:
                logger.error("[%s] _process_message_background error: %s", self.name, e, exc_info=True)
                try:
                    await self.send(
                        chat_id=event.source.chat_id,
                        content=f"Sorry, I encountered an error: {type(e).__name__}: {e}",
                    )
                except Exception:
                    pass

    VulcanCls = VulcanAdapter
    _register_adapter(platform, VulcanCls)
    return VulcanCls


class StubAdapter(BasePlatformAdapter if _AGENT_LOADED else object):
    """Fallback adapter when agent runtime is not available."""

    def __init__(self, platform: str, config: Any = None):
        self.name = platform
        self.config = config
        self.vulcan_agent = None
        self.vulcan_session_store = None

    async def connect(self) -> bool:
        logger.info("[stub] %s adapter connecting (stub mode)", self.name)
        return True

    async def disconnect(self) -> None:
        logger.info("[stub] %s adapter disconnecting", self.name)

    async def _process_message_background(self, event: MessageEvent, session_key: str) -> None:
        if self.vulcan_agent is None:
            return
        response: Optional[str] = await self._vulcan_handle(event)
        if response:
            await self.send(chat_id=event.source.chat_id if event.source else session_key, content=response)
