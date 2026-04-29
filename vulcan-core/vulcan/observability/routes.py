"""
Vulcan Observability — Routes

API routes (prefix=/observability) for metrics, traces, health, alerts, dashboard.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional

from vulcan.observability.collector import (
    AlertRule,
    AlertsResponse,
    DashboardData,
    HealthCheckResult,
    HealthResponse,
    MetricsCollector,
    MetricsResponse,
)
from vulcan.observability.tracer import TracesResponse, Tracer

router = APIRouter(prefix="/observability", tags=["observability"])

# Shared instances (module-level singletons)
collector = MetricsCollector()
tracer = Tracer()

# In-memory alert rules
_alert_rules: List[AlertRule] = [
    AlertRule(
        id="default-error-rate",
        metric="error_rate",
        operator="gt",
        threshold=0.05,
        message="Error rate exceeds 5%",
    ),
    AlertRule(
        id="default-latency-p99",
        metric="latency_p99",
        operator="gt",
        threshold=10.0,
        message="P99 latency exceeds 10s",
    ),
]


# ---------- Metrics ----------


@router.get("/metrics", response_model=MetricsResponse)
async def get_metrics(
    from_ts: float = Query(..., description="Start timestamp (epoch seconds)"),
    to_ts: float = Query(..., description="End timestamp (epoch seconds)"),
    step: int = Query(60, description="Step in seconds (default 60)"),
):
    """Return time-series metrics for the given time range."""
    resp = await collector.get_metrics(from_ts, to_ts, step)
    return resp


# ---------- Traces ----------


@router.get("/traces", response_model=TracesResponse)
async def get_traces():
    """Return recent traces."""
    return await tracer.get_traces()


@router.get("/traces/{trace_id}")
async def get_trace(trace_id: str):
    """Return a single trace by ID."""
    detail = await tracer.get_trace(trace_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Trace not found")
    return detail


# ---------- Health ----------


@router.get("/health", response_model=HealthResponse)
async def get_health():
    """Aggregated system health from all subsystems."""
    # Collect health from subsystems (simplified — in production these would
    # call actual subsystem health checks)
    checks: List[HealthCheckResult] = []

    # Check metrics subsystem
    checks.append(
        HealthCheckResult(subsystem="metrics", healthy=True, score=1.0, detail="ok")
    )
    # Check tracing subsystem
    checks.append(
        HealthCheckResult(subsystem="tracing", healthy=True, score=1.0, detail="ok")
    )

    # Compute overall score
    overall = sum(c.score for c in checks) / len(checks) if checks else 1.0

    return HealthResponse(overall_score=overall, checks=checks)


# ---------- Alerts ----------


@router.get("/alerts", response_model=AlertsResponse)
async def get_alerts():
    """Current alert status based on configured rules."""
    from vulcan.observability.collector import AlertStatus

    dashboard = await collector.get_dashboard()
    statuses = []
    for rule in _alert_rules:
        current = _get_rule_metric(rule.metric, dashboard)
        triggered = _evaluate_rule(rule, current)
        statuses.append(
            AlertStatus(
                rule_id=rule.id,
                metric=rule.metric,
                triggered=triggered,
                current_value=current,
                message=rule.message,
            )
        )
    return AlertsResponse(alerts=statuses)


@router.post("/alerts/rules", status_code=201)
async def add_alert_rule(rule: AlertRule):
    """Add a new alert rule."""
    _alert_rules.append(rule)
    return {"ok": True, "rule_id": rule.id}


# ---------- Dashboard ----------


@router.get("/dashboard", response_model=DashboardData)
async def get_dashboard():
    """Pre-aggregated dashboard data."""
    return await collector.get_dashboard()


# ---------- Helpers ----------


def _get_rule_metric(metric: str, dashboard: DashboardData) -> Optional[float]:
    """Extract current value for a metric from dashboard."""
    mapping = {
        "error_rate": dashboard.error_rate,
        "latency_p99": dashboard.latency_p99,
        "latency_p95": dashboard.latency_p95,
        "latency_p50": dashboard.latency_p50,
        "request_count_1m": float(dashboard.request_count_1m),
    }
    return mapping.get(metric)


def _evaluate_rule(rule: AlertRule, current: Optional[float]) -> bool:
    """Evaluate an alert rule against current value."""
    if current is None:
        return False
    ops = {"gt": lambda a, b: a > b, "lt": lambda a, b: a < b, "gte": lambda a, b: a >= b, "lte": lambda a, b: a <= b}
    op = ops.get(rule.operator)
    if not op:
        return False
    return op(current, rule.threshold)
