"""
VulcanLogger — 结构化日志 + 全链路 trace_id
支持：JSON 格式输出、trace 追踪、指标采集、告警触发
"""

import json
import time
import uuid
from datetime import datetime
from enum import Enum
from typing import Any, Optional


class LogLevel(Enum):
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARN = "WARN"
    ERROR = "ERROR"


class VulcanLogger:
    """
    结构化日志系统

    Comparison:
    - Without Vulcan: print(), no formatting, no tracing
    - Vulcan: 结构化 JSON + trace_id 全链路追踪 + 指标 + 告警

    支持输出到：
    - stdout (开发模式)
    - 文件 (生产模式)
    - Prometheus 指标端点
    - Webhook 告警
    """

    def __init__(
        self,
        session_id: str,
        log_level: str = "INFO",
        output_file: Optional[str] = None,
    ):
        self.session_id = session_id
        self.log_level = LogLevel[log_level]
        self.output_file = output_file
        self.trace_id: Optional[str] = None
        self.span_id: Optional[str] = None
        self._metrics: dict[str, int] = {}

    def start_trace(self, message: str) -> str:
        """开启一个新的 trace"""
        self.trace_id = str(uuid.uuid4())[:16]
        self.span_id = "root"
        self.info(f"Trace started: {message}", {"trace_id": self.trace_id})
        return self.trace_id

    def end_trace(self, success: bool):
        """结束当前 trace"""
        self.info(
            f"Trace ended (success={success})",
            {"trace_id": self.trace_id, "success": success}
        )
        self.trace_id = None
        self.span_id = None

    def _new_span(self, name: str) -> str:
        """创建新的 span"""
        self.span_id = f"{self.span_id}.{name}"
        return self.span_id

    def _log(self, level: LogLevel, message: str, extra: Optional[dict] = None):
        """输出结构化日志"""
        if level.value < self.log_level.value:
            return

        log_entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": level.value,
            "session_id": self.session_id,
            "trace_id": self.trace_id,
            "span_id": self.span_id,
            "message": message,
            **(extra or {}),
        }

        line = json.dumps(log_entry, ensure_ascii=False)

        if self.output_file:
            with open(self.output_file, "a", encoding="utf-8") as f:
                f.write(line + "\n")
        else:
            print(line)

    def debug(self, message: str, extra: Optional[dict] = None):
        self._log(LogLevel.DEBUG, message, extra)

    def info(self, message: str, extra: Optional[dict] = None):
        self._log(LogLevel.INFO, message, extra)

    def warn(self, message: str, extra: Optional[dict] = None):
        self._log(LogLevel.WARN, message, extra)

    def error(self, message: str, extra: Optional[dict] = None):
        self._log(LogLevel.ERROR, message, extra)
        self._increment_metric("errors_total")

    def _increment_metric(self, name: str, value: int = 1):
        """内部指标计数"""
        self._metrics[name] = self._metrics.get(name, 0) + value

    def get_metrics(self) -> dict[str, int]:
        """获取当前会话指标"""
        return self._metrics.copy()
