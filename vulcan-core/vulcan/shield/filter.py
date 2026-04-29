"""
Shield — Input Sanitization

HTML/XSS stripping, unicode normalization, max length enforcement.
"""

import re
import unicodedata
from typing import Optional

from pydantic import BaseModel


class SanitizeConfig(BaseModel):
    max_length: int = 10000
    strip_html: bool = True
    strip_xss: bool = True
    normalize_unicode: bool = True

    class Config:
        extra = "allow"


# ─── HTML/XSS Patterns ────────────────────────────────────────────────────────

_HTML_TAG_RE = re.compile(r"<[^>]+>", re.IGNORECASE)
_XSS_PATTERNS = [
    re.compile(r"javascript\s*:", re.IGNORECASE),
    re.compile(r"on\w+\s*=", re.IGNORECASE),  # onclick=, onerror=, etc.
    re.compile(r"<\s*script[^>]*>.*?<\s*/\s*script\s*>", re.IGNORECASE | re.DOTALL),
    re.compile(r"<\s*iframe[^>]*>.*?<\s*/\s*iframe\s*>", re.IGNORECASE | re.DOTALL),
    re.compile(r"<\s*object[^>]*>.*?<\s*/\s*object\s*>", re.IGNORECASE | re.DOTALL),
    re.compile(r"<\s*embed[^>]*>", re.IGNORECASE),
    re.compile(r"expression\s*\(", re.IGNORECASE),
    re.compile(r"data\s*:\s*text/html", re.IGNORECASE),
    re.compile(r"vbscript\s*:", re.IGNORECASE),
]


def sanitize_input(text: str, config: Optional[SanitizeConfig] = None) -> str:
    """Sanitize user input: strip HTML/XSS, normalize unicode, enforce max length."""
    cfg = config or SanitizeConfig()

    # Truncate to max length
    if len(text) > cfg.max_length:
        text = text[: cfg.max_length]

    # Normalize unicode (NFKC form — compatibility decomposition then composition)
    if cfg.normalize_unicode:
        text = unicodedata.normalize("NFKC", text)

    # Strip HTML tags
    if cfg.strip_html:
        text = _HTML_TAG_RE.sub("", text)

    # Strip XSS vectors
    if cfg.strip_xss:
        for pattern in _XSS_PATTERNS:
            text = pattern.sub("", text)

    # Strip leading/trailing whitespace
    text = text.strip()

    return text
