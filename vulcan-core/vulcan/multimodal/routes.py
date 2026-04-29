"""
Vulcan Multimodal — API Routes

Prefix: /multimodal
Tags: multimodal
"""

import uuid
from typing import Optional

from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel, Field

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

router = APIRouter(prefix="/multimodal", tags=["multimodal"])

# ─── Registry & Queue (singletons) ───────────────────────────────────────────

_registry = CapabilityRegistry()
_queue = JobQueue(_registry)

# Seed default mock processors
for _mod in ModalityType:
    _registry.register(ProcessorInfo(
        name=_mod.value,
        input_type=_mod,
        output_type=_mod,
        status=ProcessorStatus.available,
        description=f"Mock {_mod.value} processor",
    ))

# ─── Pydantic request/response models ────────────────────────────────────────

class ProcessRequest(BaseModel):
    type: str = Field(..., description="Modality type, e.g. text-to-image")
    input: str = Field(..., description="Input data (text prompt or reference)")
    params: Optional[dict] = Field(default_factory=dict, description="Optional parameters")


class JobResponse(BaseModel):
    job_id: str
    status: JobStatus
    result: Optional[dict] = None
    error: Optional[str] = None
    progress: float = 0.0


class JobListResponse(BaseModel):
    jobs: list[JobResponse]


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.get("/capabilities")
def list_capabilities() -> list[ProcessorInfo]:
    """List all registered modality processors."""
    return _registry.list_all()


@router.post("/process", response_model=JobResult)
async def process(req: ProcessRequest) -> JobResult:
    """Submit a multimodal processing job."""
    # Validate modality type
    try:
        modality = ModalityType(req.type)
    except ValueError:
        raise HTTPException(400, f"Unknown modality type: {req.type}")

    job = Job(type=req.type, input=req.input, params=req.params)
    return await _queue.submit(job)


@router.get("/jobs/{job_id}", response_model=JobResponse)
def get_job(job_id: str) -> JobResponse:
    """Get status and result of a specific job."""
    job = _queue.get_job(job_id)
    if not job:
        raise HTTPException(404, f"Job '{job_id}' not found")
    return JobResponse(
        job_id=job.id,
        status=job.status,
        result=job.result,
        error=job.error,
        progress=job.progress,
    )


@router.get("/jobs", response_model=JobListResponse)
def list_jobs() -> JobListResponse:
    """List all jobs."""
    jobs = _queue.list_jobs()
    return JobListResponse(jobs=[
        JobResponse(job_id=j.id, status=j.status, result=j.result, error=j.error, progress=j.progress)
        for j in jobs
    ])


@router.delete("/jobs/{job_id}")
def cancel_job(job_id: str) -> dict:
    """Cancel a pending or running job."""
    ok = _queue.cancel(job_id)
    if not ok:
        raise HTTPException(400, f"Cannot cancel job '{job_id}'")
    return {"ok": True}


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)) -> dict:
    """Upload a file for processing. Returns a reference ID."""
    # In production this would store to object storage; here we just acknowledge.
    ref = uuid.uuid4().hex[:12]
    return {
        "ok": True,
        "reference": ref,
        "filename": file.filename,
        "content_type": file.content_type,
    }
