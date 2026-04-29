"""
Vulcan Observability — Tracer

Request tracing with trace_id per request, spans for sub-operations.
Max 1000 traces stored in-memory.
"""

from __future__ import annotations

import asyncio
import time
import uuid
from dataclasses import dataclass, field
from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class Span(BaseModel):
    span_id: str
    operation: str
    start_time: float
    end_time: Optional[float] = None
    duration_ms: Optional[float] = None
    status: str = "ok"  # ok | error
    metadata: Dict[str, str] = Field(default_factory=dict)


class Trace(BaseModel):
    trace_id: str
    root_operation: str
    start_time: float
    spans: List[Span] = Field(default_factory=list)
    status: str = "ok"


class TracesResponse(BaseModel):
    traces: List[Trace]


class TraceDetail(BaseModel):
    trace: Trace


class Tracer:
    """In-memory request tracer. Max 1000 traces retained."""

    MAX_TRACES = 1000

    def __init__(self):
        self._traces: Dict[str, Trace] = {}
        self._lock = asyncio.Lock()

    async def start_trace(self, root_operation: str) -> str:
        """Create a new trace and return its trace_id."""
        trace_id = uuid.uuid4().hex
        trace = Trace(
            trace_id=trace_id,
            root_operation=root_operation,
            start_time=time.time(),
        )
        async with self._lock:
            self._traces[trace_id] = trace
            # Evict oldest if over limit
            if len(self._traces) > self.MAX_TRACES:
                oldest_key = min(self._traces, key=lambda k: self._traces[k].start_time)
                del self._traces[oldest_key]
        return trace_id

    async def add_span(
        self,
        trace_id: str,
        operation: str,
        start_time: float,
        end_time: float,
        status: str = "ok",
        metadata: Optional[Dict[str, str]] = None,
    ) -> Span:
        """Add a span to an existing trace."""
        span_id = uuid.uuid4().hex[:12]
        duration_ms = (end_time - start_time) * 1000
        span = Span(
            span_id=span_id,
            operation=operation,
            start_time=start_time,
            end_time=end_time,
            duration_ms=round(duration_ms, 2),
            status=status,
            metadata=metadata or {},
        )
        async with self._lock:
            if trace_id in self._traces:
                self._traces[trace_id].spans.append(span)
                if status == "error":
                    self._traces[trace_id].status = "error"
        return span

    async def get_traces(self) -> TracesResponse:
        """Return all recent traces (summary)."""
        async with self._lock:
            traces = list(self._traces.values())
        return TracesResponse(traces=traces)

    async def get_trace(self, trace_id: str) -> Optional[TraceDetail]:
        """Return a single trace by ID."""
        async with self._lock:
            if trace_id in self._traces:
                return TraceDetail(trace=self._traces[trace_id])
        return None
