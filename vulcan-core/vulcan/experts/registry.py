from dataclasses import dataclass
from typing import List, Dict, Optional, Tuple
import re
import yaml
import os

@dataclass
class Expert:
    id: str
    name: str
    title: str
    domain: str
    skills: List[str]
    keywords: List[str]
    description: str
    model_preference: str
    tier: str  # elite/expert/proficient/associate
    success_rate: float
    avg_response_time_sec: int
    icon: str


class ExpertRegistry:
    def __init__(self):
        self.experts = self._load_experts()

    def _load_experts(self) -> List[Expert]:
        """Load experts from YAML configuration file."""
        config_path = os.path.join(os.path.dirname(__file__), 'experts.yaml')
        with open(config_path, 'r', encoding='utf-8') as f:
            data = yaml.safe_load(f)
        return [Expert(**e) for e in data['experts']]


# Singleton instance
expert_registry = ExpertRegistry()
