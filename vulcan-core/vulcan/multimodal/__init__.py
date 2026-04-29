"""
Vulcan Multimodal — Capability Registry, Processing Pipeline & Queue Management

Exposes:
  - processor.py  — ProcessorInfo, Job, CapabilityRegistry, JobQueue, mock processors
  - routes.py     — FastAPI router (prefix=/multimodal)
"""

from .processor import (
    CapabilityRegistry,
    Job,
    JobQueue,
    JobResult,
    JobStatus,
    ModalityType,
    ProcessorInfo,
    ProcessorStatus,
)
from .routes import router

__all__ = [
    "CapabilityRegistry",
    "Job",
    "JobQueue",
    "JobResult",
    "JobStatus",
    "ModalityType",
    "ProcessorInfo",
    "ProcessorStatus",
    "router",
]
