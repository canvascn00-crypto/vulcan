"""
Vulcan Gateway — platform configuration.

Supports 20 platforms inherited from Vulcan Agent.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Dict, Optional


class Platform(Enum):
    """Supported messaging platforms."""
    LOCAL = "local"
    TELEGRAM = "telegram"
    DISCORD = "discord"
    WHATSAPP = "whatsapp"
    SLACK = "slack"
    SIGNAL = "signal"
    MATTERMOST = "mattermost"
    MATRIX = "matrix"
    HOMEASSISTANT = "homeassistant"
    EMAIL = "email"
    SMS = "sms"
    DINGTALK = "dingtalk"
    FEISHU = "feishu"
    WECOM = "wecom"
    WEIXIN = "weixin"
    BLUEBUBBLES = "bluebubbles"
    QQBOT = "qqbot"
    API_SERVER = "api_server"
    WEBHOOK = "webhook"


@dataclass
class HomeChannel:
    """Default destination for a platform (cron job fallback)."""
    platform: Platform
    chat_id: str
    name: str

    def to_dict(self) -> Dict[str, Any]:
        return {"platform": self.platform.value, "chat_id": self.chat_id, "name": self.name}

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "HomeChannel":
        return cls(platform=Platform(data["platform"]), chat_id=str(data["chat_id"]), name=data.get("name", "Home"))


@dataclass
class SessionResetPolicy:
    """When sessions lose context."""
    mode: str = "both"  # "daily" | "idle" | "both" | "none"
    at_hour: int = 4
    idle_minutes: int = 1440
    notify: bool = True

    def to_dict(self) -> Dict[str, Any]:
        return {"mode": self.mode, "at_hour": self.at_hour, "idle_minutes": self.idle_minutes, "notify": self.notify}

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "SessionResetPolicy":
        return cls(
            mode=data.get("mode") or "both",
            at_hour=data.get("at_hour") or 4,
            idle_minutes=data.get("idle_minutes") or 1440,
            notify=data.get("notify") if data.get("notify") is not None else True,
        )


@dataclass
class PlatformConfig:
    """Configuration for a single messaging platform."""
    enabled: bool = False
    token: Optional[str] = None
    api_key: Optional[str] = None
    home_channel: Optional[HomeChannel] = None
    reply_to_mode: str = "first"
    extra: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        result = {"enabled": self.enabled, "extra": self.extra, "reply_to_mode": self.reply_to_mode}
        if self.token:
            result["token"] = self.token
        if self.api_key:
            result["api_key"] = self.api_key
        if self.home_channel:
            result["home_channel"] = self.home_channel.to_dict()
        return result

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "PlatformConfig":
        home_channel = None
        if "home_channel" in data:
            home_channel = HomeChannel.from_dict(data["home_channel"])
        return cls(
            enabled=data.get("enabled", False),
            token=data.get("token"),
            api_key=data.get("api_key"),
            home_channel=home_channel,
            reply_to_mode=data.get("reply_to_mode", "first"),
            extra=data.get("extra", {}),
        )


@dataclass
class VulcanGatewayConfig:
    """Root config for Vulcan Gateway."""
    vulcan_home: Path = Path.home() / ".vulcan"
    agent_home: Path = Path.home() / ".hermes"
    platforms: Dict[str, PlatformConfig] = field(default_factory=dict)
    session_policy: SessionResetPolicy = field(default_factory=SessionResetPolicy)
    streaming_enabled: bool = True
    log_level: str = "INFO"

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "VulcanGatewayConfig":
        platforms = {}
        for name, pdata in data.get("platforms", {}).items():
            platforms[name] = PlatformConfig.from_dict(pdata)
        session_policy = SessionResetPolicy.from_dict(data.get("session_policy", {}))
        return cls(
            vulcan_home=Path(data.get("vulcan_home", str(Path.home() / ".vulcan"))),
            agent_home=Path(data.get("agent_home", str(Path.home() / ".hermes"))),
            platforms=platforms,
            session_policy=session_policy,
            streaming_enabled=data.get("streaming_enabled", True),
            log_level=data.get("log_level", "INFO"),
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "vulcan_home": str(self.vulcan_home),
            "agent_home": str(self.agent_home),
            "platforms": {k: v.to_dict() for k, v in self.platforms.items()},
            "session_policy": self.session_policy.to_dict(),
            "streaming_enabled": self.streaming_enabled,
            "log_level": self.log_level,
        }


def load_config(config_path: Optional[Path] = None) -> VulcanGatewayConfig:
    """Load gateway config from YAML or JSON file."""
    import json, yaml

    if config_path is None:
        config_path = Path.home() / ".vulcan" / "gateway.yaml"

    if not config_path.exists():
        return VulcanGatewayConfig()

    with open(config_path) as f:
        raw = f.read()

    try:
        data = yaml.safe_load(raw)
    except Exception:
        try:
            data = json.loads(raw)
        except Exception:
            return VulcanGatewayConfig()

    return VulcanGatewayConfig.from_dict(data or {})


def save_config(config: VulcanGatewayConfig, config_path: Optional[Path] = None) -> None:
    """Save gateway config to YAML file."""
    import yaml

    if config_path is None:
        config_path = Path.home() / ".vulcan" / "gateway.yaml"

    config_path.parent.mkdir(parents=True, exist_ok=True)
    with open(config_path, "w") as f:
        yaml.safe_dump(config.to_dict(), f, default_flow_style=False, allow_unicode=True)
