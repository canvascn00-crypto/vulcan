"""
Multi-Agent Orchestration Engine for Vulcan
Routes tasks to the right experts and coordinates their execution.
"""

import uuid
import time
from typing import List, Optional, Dict, Tuple, Literal
from enum import Enum
from pydantic import BaseModel, Field


# =============================================================================
# Pydantic Models
# =============================================================================

class ExpertStatus(Enum):
    IDLE = "idle"
    BUSY = "busy"
    ERROR = "error"


class ExpertProfile(BaseModel):
    expert_id: str
    name: str
    status: ExpertStatus
    current_task: Optional[str] = None
    tasks_completed: int = 0
    success_rate: float


class TaskResult(BaseModel):
    expert_id: str
    expert_name: str
    task_id: str
    status: str
    result: Optional[str] = None
    output_tokens: int = 0
    execution_time_sec: float = 0.0
    error: Optional[str] = None


class ExecutionPlan(BaseModel):
    plan_id: str
    original_goal: str
    strategy: Literal["single_expert", "parallel_experts", "sequential_chain", "hierarchical"]
    stages: List[Dict]  # Each stage has: stage_id, expert_ids, subtask_ids, can_parallel
    estimated_duration_sec: int = 0
    estimated_tokens: int = 0


class ExecutionResult(BaseModel):
    plan_id: str
    status: Literal["success", "partial", "failed"]
    results: List[TaskResult]
    final_summary: str = ""
    total_execution_time_sec: float = 0.0
    total_tokens: int = 0


# =============================================================================
# Multi-Agent Orchestrator
# =============================================================================

class MultiAgentOrchestrator:
    """
    Orchestrates multi-agent task execution by routing tasks to appropriate
    experts based on intent classification and coordinating their execution.
    """

    def __init__(self, expert_registry, intent_engine, decomposer):
        """
        Initialize the orchestrator with required components.

        Args:
            expert_registry: ExpertRegistry instance for finding/managing experts
            intent_engine: IntentEngine instance for classifying user input
            decomposer: TaskDecomposer instance for breaking down complex tasks
        """
        self.expert_registry = expert_registry
        self.intent_engine = intent_engine
        self.decomposer = decomposer
        self.active_experts: Dict[str, ExpertProfile] = {}
        self.execution_history: List[ExecutionResult] = []

    def process(self, user_input: str) -> Dict:
        """
        Main entry point. Takes user input, returns execution result.

        Pipeline:
        1. IntentEngine.classify() → understand what user wants
        2. ExpertRegistry.find_by_task() → match best experts
        3. TaskDecomposer.decompose() → break into subtasks
        4. Execute via appropriate strategy
        5. Aggregate results and return
        """
        start_time = time.time()

        # Step 1: Classify user intent
        intent = self.intent_engine.classify(user_input)

        # Step 2: Find matching experts using the registry
        matched_experts = self.expert_registry.find_by_task(user_input, top_k=5)
        expert_ids = [exp.id for exp, _ in matched_experts]

        # Step 3: Decompose task into subtasks
        decomposition = self.decomposer.decompose(user_input, expert_ids)

        # Step 4: Create execution plan
        plan = self.create_execution_plan(intent, matched_experts, decomposition)

        # Step 5: Execute the plan
        execution_result = self.execute_plan(plan)

        # Update active experts pool
        self._update_active_experts(matched_experts)

        # Store in execution history
        self.execution_history.append(execution_result)

        return {
            "intent": intent.model_dump(),
            "plan": plan.model_dump(),
            "result": execution_result.model_dump(),
            "execution_time_sec": time.time() - start_time
        }

    def create_execution_plan(
        self,
        intent,
        experts: List[Tuple],
        decomposition
    ) -> ExecutionPlan:
        """
        Build an execution plan from classified intent + matched experts + decomposition.
        """
        # Determine strategy based on intent and decomposition
        strategy = self._determine_strategy(intent, decomposition)

        # Build stages from decomposition
        stages = []
        for idx, subtask in enumerate(decomposition.sub_tasks):
            # Use assigned expert from decomposition, or fall back to matched experts
            if subtask.assigned_expert_id:
                stage_expert_ids = [subtask.assigned_expert_id]
            else:
                # Fall back to top matched expert for this subtask
                stage_expert_ids = [experts[0][0].id] if experts else []

            stage = {
                "stage_id": f"stage_{idx + 1}",
                "expert_ids": stage_expert_ids,
                "subtask_ids": [subtask.id],
                "can_parallel": (
                    len(subtask.dependencies) == 0 and
                    decomposition.execution_strategy != "sequential"
                ),
                "subtask_description": subtask.description,
                "priority": subtask.priority
            }
            stages.append(stage)

        # Calculate estimates
        estimated_duration = sum(
            s.get("estimated_duration_sec", 0) for s in stages
        ) or decomposition.estimated_duration_sec

        estimated_tokens = (
            sum(s.estimated_tokens for s in decomposition.sub_tasks)
            or decomposition.estimated_total_tokens
        )

        plan = ExecutionPlan(
            plan_id=str(uuid.uuid4()),
            original_goal=decomposition.original_goal,
            strategy=strategy,
            stages=stages,
            estimated_duration_sec=estimated_duration,
            estimated_tokens=estimated_tokens
        )

        return plan

    def execute_plan(self, plan: ExecutionPlan) -> ExecutionResult:
        """
        Execute a plan by dispatching subtasks to expert agents.
        """
        results: List[TaskResult] = []
        start_time = time.time()
        total_tokens = 0

        if plan.strategy == "single_expert":
            # Single expert handles all tasks
            if plan.stages:
                first_stage = plan.stages[0]
                for subtask_id in first_stage.get("subtask_ids", []):
                    for expert_id in first_stage.get("expert_ids", []):
                        result = self.execute_single_expert(
                            expert_id,
                            {"id": subtask_id, "description": first_stage.get("subtask_description", "")}
                        )
                        results.append(result)

        elif plan.strategy == "parallel_experts":
            # Multiple experts work simultaneously
            expert_task_pairs = []
            for stage in plan.stages:
                if stage.get("can_parallel"):
                    for expert_id in stage.get("expert_ids", []):
                        for subtask_id in stage.get("subtask_ids", []):
                            expert_task_pairs.append((expert_id, {
                                "id": subtask_id,
                                "description": stage.get("subtask_description", "")
                            }))
            results = self.execute_parallel(expert_task_pairs, can_parallel=True)

        elif plan.strategy == "sequential_chain":
            # Each expert's output feeds into the next
            expert_task_pairs = []
            for stage in plan.stages:
                for expert_id in stage.get("expert_ids", []):
                    for subtask_id in stage.get("subtask_ids", []):
                        expert_task_pairs.append((expert_id, {
                            "id": subtask_id,
                            "description": stage.get("subtask_description", "")
                        }))
            results = self.execute_sequential_chain(expert_task_pairs)

        elif plan.strategy == "hierarchical":
            # Master planner + sub-experts (simplified: execute all as sequential)
            expert_task_pairs = []
            for stage in plan.stages:
                for expert_id in stage.get("expert_ids", []):
                    for subtask_id in stage.get("subtask_ids", []):
                        expert_task_pairs.append((expert_id, {
                            "id": subtask_id,
                            "description": stage.get("subtask_description", "")
                        }))
            results = self.execute_sequential_chain(expert_task_pairs)

        # Calculate totals
        total_tokens = sum(r.output_tokens for r in results)
        total_time = time.time() - start_time

        # Determine overall status
        # "dispatched" is a successful terminal state (expert received the task)
        successful_statuses = {"completed", "dispatched"}
        if all(r.status in successful_statuses for r in results):
            status = "success"
        elif any(r.status in successful_statuses for r in results):
            status = "partial"
        else:
            status = "failed"

        # Aggregate results into summary
        final_summary = self.aggregate_results(results)

        return ExecutionResult(
            plan_id=plan.plan_id,
            status=status,
            results=results,
            final_summary=final_summary,
            total_execution_time_sec=total_time,
            total_tokens=total_tokens
        )

    def execute_single_expert(self, expert_id: str, task: Dict) -> TaskResult:
        """
        Execute a single task with one expert.
        Simulates dispatching to an expert agent.
        """
        expert = self.expert_registry.get_expert_by_id(expert_id)
        if not expert:
            return TaskResult(
                expert_id=expert_id,
                expert_name="Unknown",
                task_id=task.get("id", "unknown"),
                status="failed",
                result=None,
                output_tokens=0,
                execution_time_sec=0.0,
                error=f"Expert {expert_id} not found"
            )

        # Build execution context (what would be sent to the agent)
        execution_context = {
            "expert": expert,
            "task": task,
            "system_prompt_template": self._build_system_prompt(expert),
            "user_prompt": task.get("description", ""),
            "model_preference": expert.model_preference,
        }

        # Simulate execution by building a response
        # In production, this would call the actual agent system
        simulated_result = (
            f"Task dispatched to {expert.name}. "
            f"Expert specialty: {expert.title}. "
            f"Task description: {task.get('description', 'No description')}. "
            f"Expert domain: {expert.domain}. "
            f"Model preference: {expert.model_preference}."
        )

        # Update expert status
        self._update_expert_status(expert_id, ExpertStatus.BUSY, task.get("id"))

        return TaskResult(
            expert_id=expert_id,
            expert_name=expert.name,
            task_id=task.get("id", "unknown"),
            status="dispatched",
            result=simulated_result,
            output_tokens=0,
            execution_time_sec=0.0
        )

    def execute_parallel(
        self,
        expert_task_pairs: List[Tuple[str, Dict]],
        can_parallel: bool = True
    ) -> List[TaskResult]:
        """
        Execute multiple expert-task pairs (potentially in parallel).
        """
        results = []
        for expert_id, task in expert_task_pairs:
            result = self.execute_single_expert(expert_id, task)
            results.append(result)
        return results

    def execute_sequential_chain(
        self,
        expert_task_pairs: List[Tuple[str, Dict]]
    ) -> List[TaskResult]:
        """
        Execute tasks in sequence, passing results to next expert.
        """
        results = []
        previous_result = None

        for expert_id, task in expert_task_pairs:
            # If there's a previous result and the task has a description,
            # we could pass it along as context (simplified here)
            if previous_result:
                task_with_context = {
                    **task,
                    "previous_result": previous_result.result
                }
            else:
                task_with_context = task

            result = self.execute_single_expert(expert_id, task_with_context)
            results.append(result)
            previous_result = result

        return results

    def get_expert_status(self, expert_id: str) -> ExpertProfile:
        """
        Get current status of an expert.
        """
        if expert_id in self.active_experts:
            return self.active_experts[expert_id]

        # Create profile from registry if not tracked
        expert = self.expert_registry.get_expert_by_id(expert_id)
        if expert:
            profile = ExpertProfile(
                expert_id=expert.id,
                name=expert.name,
                status=ExpertStatus.IDLE,
                current_task=None,
                tasks_completed=0,
                success_rate=expert.success_rate
            )
            self.active_experts[expert_id] = profile
            return profile

        raise ValueError(f"Expert {expert_id} not found")

    def list_active_experts(self) -> List[ExpertProfile]:
        """
        List all experts and their current status.
        """
        # Ensure we have profiles for all experts in registry
        all_experts = self.expert_registry.get_all_experts()
        for expert in all_experts:
            if expert.id not in self.active_experts:
                self.active_experts[expert.id] = ExpertProfile(
                    expert_id=expert.id,
                    name=expert.name,
                    status=ExpertStatus.IDLE,
                    current_task=None,
                    tasks_completed=0,
                    success_rate=expert.success_rate
                )

        return list(self.active_experts.values())

    def aggregate_results(self, results: List[TaskResult]) -> str:
        """
        Merge multiple expert results into a coherent final answer.
        """
        if not results:
            return "No results to aggregate."

        successful_results = [r for r in results if r.status in ("completed", "dispatched")]
        failed_results = [r for r in results if r.status == "failed"]

        summary_parts = []

        # Group by expert
        expert_results: Dict[str, List[TaskResult]] = {}
        for result in results:
            if result.expert_id not in expert_results:
                expert_results[result.expert_id] = []
            expert_results[result.expert_id].append(result)

        # Build summary
        for expert_id, expert_results_list in expert_results.items():
            expert_name = expert_results_list[0].expert_name
            task_count = len(expert_results_list)

            if task_count == 1:
                summary_parts.append(
                    f"**{expert_name}** completed 1 task"
                )
            else:
                summary_parts.append(
                    f"**{expert_name}** completed {task_count} tasks"
                )

            for result in expert_results_list:
                if result.result:
                    # Add first 100 chars of each result
                    short_result = result.result[:200] + "..." if len(result.result) > 200 else result.result
                    summary_parts.append(f"  → {short_result}")

        if failed_results:
            summary_parts.append(f"\n**{len(failed_results)} task(s) failed**")
            for failed in failed_results:
                summary_parts.append(f"  → {failed.expert_name}: {failed.error or 'Unknown error'}")

        return "\n".join(summary_parts)

    # =============================================================================
    # Helper Methods
    # =============================================================================

    def _build_system_prompt(self, expert) -> str:
        """
        Build a system prompt for an expert agent based on their profile.
        """
        prompt = f"""You are {expert.name}, a {expert.title}.
Domain: {expert.domain}
Description: {expert.description}

Your skills include: {", ".join(expert.skills)}.
Your preferred model: {expert.model_preference}
Your success rate: {expert.success_rate * 100:.1f}%

When responding:
1. Stay in character as {expert.name}
2. Apply your domain expertise ({expert.domain}) to the task
3. Use your specialized skills: {", ".join(expert.skills[:3])}
4. Aim for high-quality, accurate responses
"""
        return prompt

    def _determine_strategy(self, intent, decomposition) -> str:
        """
        Based on intent classification and decomposition, pick best strategy.
        Strategy selection priority: dependencies > complexity > intent suggestion.
        """
        # Check decomposition for key factors
        sub_tasks = decomposition.sub_tasks
        has_dependencies = any(len(st.dependencies) > 0 for st in sub_tasks)
        complexity = decomposition.complexity_level

        # Critical: if tasks have dependencies, must use sequential
        if has_dependencies:
            return "sequential_chain"

        # Single task → single expert
        if len(sub_tasks) <= 1:
            return "single_expert"

        # Complex multi-domain tasks → hierarchical
        if complexity in ("complex", "very_complex"):
            return "hierarchical"

        # Multiple independent tasks → parallel
        if len(sub_tasks) > 1 and not has_dependencies:
            return "parallel_experts"

        # Fallback: use intent's suggestion
        if hasattr(intent, 'suggested_strategy') and intent.suggested_strategy:
            return intent.suggested_strategy

        return "single_expert"

    def _estimate_execution_time(self, plan: ExecutionPlan) -> int:
        """
        Estimate total execution time for a plan.
        """
        total_time = 0
        for stage in plan.stages:
            # Estimate based on number of expert-task pairs
            num_pairs = len(stage.get("expert_ids", [])) * len(stage.get("subtask_ids", []))
            # Assume average 30 seconds per task
            total_time += num_pairs * 30

        return max(total_time, plan.estimated_duration_sec)

    def _format_results_for_user(
        self,
        results: List[TaskResult],
        strategy: str
    ) -> str:
        """
        Format execution results into a user-friendly summary.
        """
        if not results:
            return "No results available."

        status_icons = {
            "dispatched": "✅",
            "completed": "✅",
            "failed": "❌",
            "pending": "⏳"
        }

        lines = [f"### Execution Summary ({strategy.replace('_', ' ').title()})\n"]

        for result in results:
            icon = status_icons.get(result.status, "📋")
            lines.append(f"{icon} **{result.expert_name}**")

            if result.result:
                # Truncate long results
                display_result = result.result[:500]
                if len(result.result) > 500:
                    display_result += "..."
                lines.append(f"   {display_result}")

            if result.error:
                lines.append(f"   ⚠️ Error: {result.error}")

            lines.append("")

        return "\n".join(lines)

    def _update_expert_status(
        self,
        expert_id: str,
        status: ExpertStatus,
        current_task: Optional[str] = None
    ) -> None:
        """
        Update an expert's status in the active pool.
        """
        if expert_id not in self.active_experts:
            # Create new profile
            expert = self.expert_registry.get_expert_by_id(expert_id)
            if expert:
                self.active_experts[expert_id] = ExpertProfile(
                    expert_id=expert.id,
                    name=expert.name,
                    status=status,
                    current_task=current_task,
                    tasks_completed=0,
                    success_rate=expert.success_rate
                )
        else:
            # Update existing
            profile = self.active_experts[expert_id]
            profile.status = status
            profile.current_task = current_task

            if status == ExpertStatus.IDLE and current_task is None:
                profile.tasks_completed += 1

    def _update_active_experts(self, experts: List[Tuple]) -> None:
        """
        Update the active experts pool with matched experts.
        """
        for expert, score in experts:
            if expert.id not in self.active_experts:
                self.active_experts[expert.id] = ExpertProfile(
                    expert_id=expert.id,
                    name=expert.name,
                    status=ExpertStatus.IDLE,
                    current_task=None,
                    tasks_completed=0,
                    success_rate=expert.success_rate
                )

    def get_execution_history(self) -> List[ExecutionResult]:
        """
        Get all past execution results.
        """
        return self.execution_history

    def clear_history(self) -> None:
        """
        Clear execution history.
        """
        self.execution_history = []
