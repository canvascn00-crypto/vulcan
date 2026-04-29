"""
Vulcan Observability — Collector

In-memory time-series metrics collection with 1-min granularity and 24h retention.
Tracks: request counts, latency percentiles (p50/p95/p99), error rates, token usage per model.
"""

from __future__ import annotations

import asyncio
import math
import time
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

from pydantic import BaseModel, Field


# ---------- Pydantic response models ----------

class MetricPoint(BaseModel):
    timestamp: float
    value: float


class MetricSeries(BaseModel):
    metric_name: str
    points: List[MetricPoint]


class MetricsResponse(BaseModel):
    series: List[MetricSeries]


class HealthCheckResult(BaseModel):
    subsystem: str
    healthy: bool
    score: float = 1.0  # 0.0 – 1.0
    detail: str = ""


class HealthResponse(BaseModel):
    overall_score: float
    checks: List[HealthCheckResult]


class AlertRule(BaseModel):
    id: str
    metric: str  # e.g. "error_rate", "latency_p99"
    operator: str  # "gt", "lt", "gte", "lte"
    threshold: float
    message: str = ""


class AlertStatus(BaseModel):
    rule_id: str
    metric: str
    triggered: bool
    current_value: Optional[float] = None
    message: str = ""


class AlertsResponse(BaseModel):
    alerts: List[AlertStatus]


class DashboardData(BaseModel):
    request_count_1m: int = 0
    request_count_1h: int = 0
    request_count_24h: int = 0
    error_rate: float = 0.0
    latency_p50: float = 0.0
    latency_p95: float = 0.0
    latency_p99: float = 0.0
    tokens_per_model: Dict[str, int] = Field(default_factory=dict)
    active_traces: int = 0
    health_score: float = 1.0


# ---------- Internal data structures ----------

# One-minute bucket
@dataclass
class _Bucket:
    timestamp: float  # start of bucket (epoch seconds)
    request_count: int = 0
    error_count: int = 0
    latency_values: List[float] = field(default_factory=list)
    token_usage: Dict[str, int] = field(default_factory=dict)  # model -> tokens


class MetricsCollector:
    """
    In-memory time-series metrics collector.
    1-minute granularity, 24-hour retention.
    Thread-safe via asyncio.Lock.
    """

    RETENTION_BUCKETS = 24 * 60  # 1440 one-minute buckets

    def __init__(self):
        self._buckets: List[_Bucket] = []
        self._lock = asyncio.Lock()
        self._total_requests = 0
        self._total_errors = 0

    # ---- write path ----

    async def record_request(
        self,
        latency_s: float,
        is_error: bool = False,
        token_usage: Optional[Dict[str, int]] = None,
    ):
        """Record a single request observation."""
        now = time.time()
        async with self._lock:
            self._total_requests += 1
            if is_error:
                self._total_errors += 1
            bucket = self._current_bucket(now)
            bucket.request_count += 1
            if is_error:
                bucket.error_count += 1
            bucket.latency_values.append(latency_s)
            if token_usage:
                for model, tokens in token_usage.items():
                    bucket.token_usage[model] = bucket.token_usage.get(model, 0) + tokens

    async def expire_old(self):
        """Drop buckets older than 24h."""
        cutoff = time.time() - self.RETENTION_BUCKETS * 60
        async with self._lock:
            self._buckets = [b for b in self._buckets if b.timestamp > cutoff]

    # ---- read path ----

    async def get_metrics(
        self, from_ts: float, to_ts: float, step: int = 60
    ) -> MetricsResponse:
        """
        Return metrics for [from_ts, to_ts] at the given step (seconds).
        step=60 → 1-min granularity (default).
        """
        series_req: List[MetricSeries] = []
        async with self._lock:
            # filter buckets in range
            relevant = [b for b in self._buckets if from_ts <= b.timestamp <= to_ts]

            # request_count series
            req_points = [
                MetricPoint(timestamp=b.timestamp, value=b.request_count) for b in relevant
            ]
            series_req.append(MetricSeries(metric_name="request_count", points=req_points))

            # error_rate series
            err_points = []
            for b in relevant:
                rate = b.error_count / b.request_count if b.request_count > 0 else 0.0
                err_points.append(MetricPoint(timestamp=b.timestamp, value=rate))
            series_req.append(MetricSeries(metric_name="error_rate", points=err_points))

            # latency percentiles
            for pctl in (50, 95, 99):
                lat_points = []
                for b in relevant:
                    val = self._percentile(b.latency_values, pctl)
                    lat_points.append(MetricPoint(timestamp=b.timestamp, value=val))
                series_req.append(
                    MetricSeries(metric_name=f"latency_p{pctl}", points=lat_points)
                )

            # token_usage per model (latest bucket's cumulative)
            for b in relevant:
                for model, tokens in b.token_usage.items():
                    series_req.append(
                        MetricSeries(
                            metric_name=f"tokens_{model}",
                            points=[MetricPoint(timestamp=b.timestamp, value=tokens)],
                        )
                    )

        return MetricsResponse(series=series_req)

    async def get_dashboard(self) -> DashboardData:
        """Pre-aggregated dashboard data."""
        now = time.time()
        async with self._lock:
            buckets_1m = [b for b in self._buckets if b.timestamp > now - 60]
            buckets_1h = [b for b in self._buckets if b.timestamp > now - 3600]
            buckets_24h = [b for b in self._buckets if b.timestamp > now - 86400]

            count_1m = sum(b.request_count for b in buckets_1m)
            count_1h = sum(b.request_count for b in buckets_1h)
            count_24h = sum(b.request_count for b in buckets_24h)

            # error rate from 1h window
            errs_1h = sum(b.error_count for b in buckets_1h)
            err_rate = errs_1h / count_1h if count_1h > 0 else 0.0

            # latency percentiles from 1h
            all_lat: List[float] = []
            for b in buckets_1h:
                all_lat.extend(b.latency_values)
            p50 = self._percentile(all_lat, 50)
            p95 = self._percentile(all_lat, 95)
            p99 = self._percentile(all_lat, 99)

            # token usage (aggregate per model across 24h)
            tok: Dict[str, int] = {}
            for b in buckets_24h:
                for model, tokens in b.token_usage.items():
                    tok[model] = tok.get(model, 0) + tokens

        return DashboardData(
            request_count_1m=count_1m,
            request_count_1h=count_1h,
            request_count_24h=count_24h,
            error_rate=err_rate,
            latency_p50=p50,
            latency_p95=p95,
            latency_p99=p99,
            tokens_per_model=tok,
            health_score=1.0 - err_rate,  # simplified
            active_traces=0,  # filled by tracer
        )

    # ---- helpers ----

    def _current_bucket(self, now: float) -> _Bucket:
        """Return or create the bucket for the current minute."""
        ts = math.floor(now / 60) * 60
        for b in self._buckets:
            if b.timestamp == ts:
                return b
        bucket = _Bucket(timestamp=ts)
        self._buckets.append(bucket)
        return bucket

    @staticmethod
    def _percentile(values: List[float], p: int) -> float:
        if not values:
            return 0.0
        s = sorted(values)
        idx = max(0, int(len(s) * p / 100) - 1)
        return s[idx]
