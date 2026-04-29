"""
Shield — Prompt Injection Detection

Regex + keyword scoring with threat levels: none / low / medium / high / critical.
"""

import re
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel


class ThreatLevel(str, Enum):
    NONE = "none"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ThreatMatch(BaseModel):
    pattern: str
    match: str
    score: int


class InjectionResult(BaseModel):
    threat_level: ThreatLevel
    threats: List[ThreatMatch]
    score: int
    sanitized: str


# ─── Injection Detection Patterns ─────────────────────────────────────────────

_INJECTION_PATTERNS: List[tuple[str, int]] = [
    # High-score patterns (clear injection attempts)
    (r"ignore\s+(all\s+)?previous\s+(instructions?|prompts?)", 10),
    (r"disregard\s+(all\s+)?previous\s+(instructions?|prompts?)", 10),
    (r"forget\s+(all\s+)?previous\s+(instructions?|prompts?)", 10),
    (r"you\s+are\s+now\s+a", 8),
    (r"pretend\s+(you\s+are|to\s+be)", 8),
    (r"act\s+as\s+(if\s+)?you\s+(are|were)", 8),
    (r"jailbreak", 9),
    (r"DAN\s+mode", 9),
    (r"system\s*:\s*", 7),
    (r"new\s+instructions?\s*:", 7),
    (r"override\s+(safety|security|filter)", 9),
    (r"bypass\s+(safety|security|filter)", 9),
    # Medium-score patterns (suspicious)
    (r"reveal\s+(your|the)\s+(system|initial|original)\s+prompt", 7),
    (r"show\s+(your|the)\s+(system|initial|original)\s+prompt", 7),
    (r"what\s+(are|were)\s+your\s+instructions", 6),
    (r"repeat\s+(your|the)\s+(system|initial|original)\s+prompt", 7),
    (r"output\s+the\s+(system|initial|original)\s+prompt", 7),
    # Low-score patterns (potentially suspicious)
    (r"roleplay\s+(as|that)", 4),
    (r"simulate\s+(a|an|being)", 4),
    (r"do\s+anything\s+(now|else)", 5),
    (r"unrestricted\s+mode", 8),
    (r"developer\s+mode", 7),
    (r"hack\s+(the|your)\s+(system|prompt)", 8),
]

_KEYWORD_SCORES: dict[str, int] = {
    "jailbreak": 9,
    "DAN": 9,
    "override": 6,
    "bypass": 6,
    "ignore": 5,
    "disregard": 5,
    "unrestricted": 7,
    "hack": 7,
    "exploit": 6,
    "malicious": 5,
}


def detect_injection(text: str) -> InjectionResult:
    """Analyze text for prompt injection threats using regex + keyword scoring."""
    text_lower = text.lower()
    threats: List[ThreatMatch] = []
    total_score = 0

    # Regex pattern matching
    for pattern_str, score in _INJECTION_PATTERNS:
        match = re.search(pattern_str, text_lower)
        if match:
            matched_text = match.group(0)
            threats.append(ThreatMatch(pattern=pattern_str, match=matched_text, score=score))
            total_score += score

    # Keyword bonus scoring
    for keyword, kw_score in _KEYWORD_SCORES.items():
        if keyword.lower() in text_lower:
            # Only add if not already matched by a regex (dedup)
            already = any(
                keyword.lower() in t.match.lower()
                for t in threats
            )
            if not already:
                total_score += kw_score

    # Determine threat level from score
    if total_score >= 20:
        level = ThreatLevel.CRITICAL
    elif total_score >= 12:
        level = ThreatLevel.HIGH
    elif total_score >= 6:
        level = ThreatLevel.MEDIUM
    elif total_score >= 1:
        level = ThreatLevel.LOW
    else:
        level = ThreatLevel.NONE

    return InjectionResult(
        threat_level=level,
        threats=threats,
        score=total_score,
        sanitized=text,
    )
