"""
TaskQueue — 任务队列 + 步骤级反馈
支持：优先级排队、步骤中断、结果验证、重试
"""

import asyncio
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Optional
from collections import deque
import heapq


class TaskStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    DONE = "done"
    FAILED = "failed"
    CANCELLED = "cancelled"


class StepStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    DONE = "done"
    FAILED = "failed"
    SKIPPED = "skipped"


@dataclass
class Step:
    id: str
    name: str
    status: StepStatus = StepStatus.PENDING
    result: Any = None
    error: str = None
    started_at: float = None
    finished_at: float = None

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "status": self.status.value,
            "result": self.result,
            "error": self.error,
            "started_at": self.started_at,
            "finished_at": self.finished_at,
        }


@dataclass
class Task:
    id: str
    goal: str
    status: TaskStatus = TaskStatus.PENDING
    steps: list[Step] = field(default_factory=list)
    current_step: int = 0
    result: Any = None
    error: str = None
    priority: int = 0
    created_at: float = field(default_factory=0)
    started_at: float = None
    finished_at: float = None
    metadata: dict = field(default_factory=dict)
    on_step_done: Callable = None  # Step-level feedback callback

    def add_step(self, name: str) -> Step:
        step = Step(id=str(uuid.uuid4())[:8], name=name)
        self.steps.append(step)
        return step

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "goal": self.goal,
            "status": self.status.value,
            "steps": [s.to_dict() for s in self.steps],
            "current_step": self.current_step,
            "result": self.result,
            "error": self.error,
            "priority": self.priority,
            "created_at": self.created_at,
        }


class TaskQueue:
    """
    优先级任务队列，支持步骤级反馈。
    """

    def __init__(self):
        self._heap: list[Task] = []
        self._tasks: dict[str, Task] = {}
        self._lock = asyncio.Lock()
        self._event = asyncio.Event()

    async def enqueue(self, task: Task) -> str:
        async with self._lock:
            task.created_at = self._now()
            heapq.heappush(self._heap, (-task.priority, task.created_at, task.id))
            self._tasks[task.id] = task
            self._event.set()
        return task.id

    async def dequeue(self) -> Optional[Task]:
        async with self._lock:
            while self._heap:
                _, _, task_id = heapq.heappop(self._heap)
                task = self._tasks.get(task_id)
                if task and task.status == TaskStatus.PENDING:
                    task.status = TaskStatus.RUNNING
                    task.started_at = self._now()
                    return task
            self._event.clear()
        return None

    async def wait_for_task(self) -> Task:
        """阻塞直到有新任务。"""
        while True:
            task = await self.dequeue()
            if task:
                return task
            await self._event.wait()

    async def mark_step_done(
        self, task_id: str, step_id: str, result: Any = None, error: str = None
    ) -> bool:
        """标记步骤完成，触发 on_step_done 回调。"""
        async with self._lock:
            task = self._tasks.get(task_id)
            if not task:
                return False
            step = next((s for s in task.steps if s.id == step_id), None)
            if not step:
                return False
            step.status = StepStatus.FAILED if error else StepStatus.DONE
            step.result = result
            step.error = error
            step.finished_at = self._now()
            # Advance to next step
            task.current_step = min(task.current_step + 1, len(task.steps) - 1)
            # Fire feedback callback
            if task.on_step_done:
                await task.on_step_done(task, step)
        return True

    async def complete_task(self, task_id: str, result: Any = None, error: str = None):
        async with self._lock:
            task = self._tasks.get(task_id)
            if not task:
                return
            task.status = TaskStatus.FAILED if error else TaskStatus.DONE
            task.result = result
            task.error = error
            task.finished_at = self._now()

    async def get_task(self, task_id: str) -> Optional[Task]:
        return self._tasks.get(task_id)

    async def cancel_task(self, task_id: str) -> bool:
        async with self._lock:
            task = self._tasks.get(task_id)
            if not task or task.status != TaskStatus.PENDING:
                return False
            task.status = TaskStatus.CANCELLED
            return True

    async def list_tasks(self, status: TaskStatus = None) -> list[Task]:
        tasks = list(self._tasks.values())
        if status:
            tasks = [t for t in tasks if t.status == status]
        return sorted(tasks, key=lambda t: t.created_at, reverse=True)

    @staticmethod
    def _now() -> float:
        import time

        return time.time()
