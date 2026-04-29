"""
Shield — Security module for Vulcan

Input sanitization, prompt injection detection, rate limiting, blocklist, event logging.
"""

from vulcan.shield.filter import sanitize_input, SanitizeConfig
from vulcan.shield.injection import detect_injection, ThreatLevel, InjectionResult, ThreatMatch
from vulcan.shield.rate_limiter import RateLimiter, RateLimitConfig
from vulcan.shield.routes import router

__all__ = [
    "sanitize_input",
    "SanitizeConfig",
    "detect_injection",
    "ThreatLevel",
    "InjectionResult",
    "ThreatMatch",
    "RateLimiter",
    "RateLimitConfig",
    "router",
]
