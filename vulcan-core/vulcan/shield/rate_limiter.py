"""
Shield — Per-IP Sliding Window Rate Limiter
"""

import time
import threading
from typing import Dict, Optional, Tuple

from pydantic import BaseModel


class RateLimitConfig(BaseModel):
    max_requests: int = 100
    window_seconds: int = 60
    enabled: bool = True


class RateLimitEntry:
    """Tracks request timestamps for a single IP."""

    def __init__(self):
        self.timestamps: list[float] = []

    def add(self, timestamp: float):
        self.timestamps.append(timestamp)

    def prune(self, window_start: float):
        self.timestamps = [t for t in self.timestamps if t > window_start]

    @property
    def count(self) -> int:
        return len(self.timestamps)


class RateLimiter:
    """Thread-safe per-IP sliding window rate limiter."""

    def __init__(self, config: Optional[RateLimitConfig] = None):
        self.config = config or RateLimitConfig()
        self._entries: Dict[str, RateLimitEntry] = {}
        self._lock = threading.Lock()

    def check(self, ip: str) -> Tuple[bool, int]:
        """
        Check if request from IP is allowed.
        Returns (allowed, retry_after_seconds).
        """
        if not self.config.enabled:
            return True, 0

        now = time.monotonic()
        window_start = now - self.config.window_seconds

        with self._lock:
            entry = self._entries.get(ip)
            if entry is None:
                entry = RateLimitEntry()
                self._entries[ip] = entry

            entry.prune(window_start)

            if entry.count >= self.config.max_requests:
                # Calculate retry-after
                oldest = entry.timestamps[0] if entry.timestamps else now
                retry_after = max(1, int(oldest - window_start + 1))
                return False, retry_after

            entry.add(now)
            return True, 0

    def reset(self, ip: str):
        """Reset rate limit for a specific IP."""
        with self._lock:
            self._entries.pop(ip, None)

    def get_config(self) -> RateLimitConfig:
        return self.config

    def update_config(self, max_requests: Optional[int] = None, window_seconds: Optional[int] = None):
        """Update rate limit configuration."""
        if max_requests is not None:
            self.config.max_requests = max_requests
        if window_seconds is not None:
            self.config.window_seconds = window_seconds

    def stats(self) -> dict:
        """Return rate limiter statistics."""
        with self._lock:
            active_ips = len(self._entries)
            total_tracked = sum(e.count for e in self._entries.values())
        return {
            "active_ips": active_ips,
            "total_tracked_requests": total_tracked,
            "max_requests": self.config.max_requests,
            "window_seconds": self.config.window_seconds,
            "enabled": self.config.enabled,
        }
