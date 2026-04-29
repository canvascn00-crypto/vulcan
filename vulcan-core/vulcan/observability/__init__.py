"""
Vulcan Observability Module

Metrics collection, request tracing, health aggregation, and alert rules.
"""

from vulcan.observability.collector import (
    AlertRule,
    AlertsResponse,
    DashboardData,
    HealthCheckResult,
    HealthResponse,
    MetricPoint,
    MetricSeries,
    MetricsCollector,
    MetricsResponse,
)
from vulcan.observability.tracer import Span, Trace, Tracer, TraceDetail, TracesResponse
from vulcan.observability.routes import router

__all__ = [
    # Collector
    "MetricsCollector",
    "MetricPoint",
    "MetricSeries",
    "MetricsResponse",
    "AlertRule",
    "AlertsResponse",
    "DashboardData",
    "HealthCheckResult",
    "HealthResponse",
    # Tracer
    "Tracer",
    "Span",
    "Trace",
    "TraceDetail",
    "TracesResponse",
    # Router
    "router",
]
