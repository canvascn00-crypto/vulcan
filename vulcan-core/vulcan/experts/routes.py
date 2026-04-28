"""
Expert System API Routes
100 AI Experts + Adaptive Intent Recognition + Task Decomposition + Multi-Agent Orchestration
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict
import uuid
import time

from vulcan.experts.registry import expert_registry, ExpertRegistry
from vulcan.experts.intent_engine import IntentEngine
from vulcan.experts.decomposer import TaskDecomposer
from vulcan.experts.orchestrator import MultiAgentOrchestrator

router = APIRouter(prefix="/experts", tags=["experts"])

# Initialize components
_intent_engine = IntentEngine()
_task_decomposer = TaskDecomposer()
_orchestrator = MultiAgentOrchestrator(
    expert_registry=expert_registry,
    intent_engine=_intent_engine,
    decomposer=_task_decomposer
)


# ─── Request/Response Models ────────────────────────────────────────────

class ProcessRequest(BaseModel):
    user_input: str
    force_strategy: Optional[str] = None  # override auto-selection


class ExpertMatchResponse(BaseModel):
    expert_id: str
    name: str
    title: str
    domain: str
    match_score: float
    reason: str
    tier: str
    model_preference: str


class IntentResponse(BaseModel):
    raw_input: str
    language: str
    primary_intent: str
    secondary_intents: List[str]
    confidence: float
    intent_keywords: List[str]
    task_complexity: str
    decomposition_needed: bool
    suggested_strategy: str
    suggested_experts: List[ExpertMatchResponse]


class SubTaskResponse(BaseModel):
    id: str
    description: str
    assigned_expert_id: Optional[str]
    assigned_expert_name: Optional[str]
    status: str
    priority: int
    dependencies: List[str]


class DecompositionResponse(BaseModel):
    original_goal: str
    sub_tasks: List[SubTaskResponse]
    total_experts_needed: int
    estimated_total_tokens: int
    estimated_duration_sec: int
    complexity_level: str
    execution_strategy: str
    summary: str


class ExecutionStageResponse(BaseModel):
    stage_id: str
    expert_ids: List[str]
    subtask_ids: List[str]
    can_parallel: bool


class ExecutionPlanResponse(BaseModel):
    plan_id: str
    original_goal: str
    strategy: str
    stages: List[ExecutionStageResponse]
    estimated_duration_sec: int
    estimated_tokens: int


class TaskResultResponse(BaseModel):
    expert_id: str
    expert_name: str
    task_id: str
    status: str
    result: Optional[str]
    output_tokens: int
    execution_time_sec: float
    error: Optional[str]


class ExecutionResultResponse(BaseModel):
    plan_id: str
    status: str
    results: List[TaskResultResponse]
    final_summary: str
    total_execution_time_sec: float
    total_tokens: int


class ExpertProfileResponse(BaseModel):
    expert_id: str
    name: str
    title: str
    domain: str
    status: str
    current_task: Optional[str]
    tasks_completed: int
    success_rate: float
    tier: str


class DomainStatsResponse(BaseModel):
    domain: str
    count: int
    avg_success_rate: float
    tier_breakdown: Dict[str, int]


# ─── Expert Registry Routes ──────────────────────────────────────────────

@router.get("/", response_model=List[ExpertMatchResponse])
async def list_experts(domain: Optional[str] = None, top_k: int = 20):
    """List all experts, optionally filtered by domain"""
    if domain:
        experts = expert_registry.find_by_domain(domain, top_k=top_k)
        return [
            ExpertMatchResponse(
                expert_id=e.id,
                name=e.name,
                title=e.title,
                domain=e.domain,
                match_score=1.0,
                reason=f"Domain expert in {e.domain}",
                tier=e.tier,
                model_preference=e.model_preference
            )
            for e in experts
        ]
    all_experts = expert_registry.get_all_experts()[:top_k]
    return [
        ExpertMatchResponse(
            expert_id=e.id,
            name=e.name,
            title=e.title,
            domain=e.domain,
            match_score=1.0,
            reason=e.description[:100],
            tier=e.tier,
            model_preference=e.model_preference
        )
        for e in all_experts
    ]


@router.get("/domains")
async def list_domains():
    """List all available domains"""
    stats = expert_registry.get_domain_stats()
    return {
        "domains": [
            {"name": d, "count": stats[d]["count"], "avg_success": stats[d]["avg_success_rate"]}
            for d in stats
        ],
        "total_experts": 100
    }


@router.get("/domain-stats")
async def domain_stats():
    """Get statistics per domain"""
    stats = expert_registry.get_domain_stats()
    return {
        "domains": [
            DomainStatsResponse(
                domain=d,
                count=v["count"],
                avg_success_rate=v["avg_success_rate"],
                tier_breakdown=v.get("tier_breakdown", {})
            )
            for d, v in stats.items()
        ]
    }


@router.get("/{expert_id}")
async def get_expert(expert_id: str):
    """Get a specific expert by ID"""
    expert = expert_registry.get_expert_by_id(expert_id)
    if not expert:
        raise HTTPException(status_code=404, detail=f"Expert {expert_id} not found")
    return {
        "expert_id": expert.id,
        "name": expert.name,
        "title": expert.title,
        "domain": expert.domain,
        "skills": expert.skills,
        "keywords": expert.keywords,
        "description": expert.description,
        "model_preference": expert.model_preference,
        "tier": expert.tier,
        "success_rate": expert.success_rate,
        "avg_response_time_sec": expert.avg_response_time_sec,
    }


@router.get("/match/search")
async def search_experts(q: str, top_k: int = 5):
    """Search experts by keyword/query"""
    results = expert_registry.find_by_keywords(q, top_k=top_k)
    return [
        ExpertMatchResponse(
            expert_id=e.id,
            name=e.name,
            title=e.title,
            domain=e.domain,
            match_score=score,
            reason=f"Keyword match for: {q}",
            tier=e.tier,
            model_preference=e.model_preference
        )
        for e, score in results
    ]


@router.post("/match/task")
async def match_task(task_description: str, top_k: int = 5):
    """Find best expert match for a task"""
    results = expert_registry.find_by_task(task_description, top_k=top_k)
    return [
        ExpertMatchResponse(
            expert_id=e.id,
            name=e.name,
            title=e.title,
            domain=e.domain,
            match_score=score,
            reason=f"Best match for task: {task_description[:50]}",
            tier=e.tier,
            model_preference=e.model_preference
        )
        for e, score in results
    ]


# ─── Intent Recognition Routes ──────────────────────────────────────────

@router.post("/intent/classify", response_model=IntentResponse)
async def classify_intent(user_input: str):
    """Classify user input and identify matching experts"""
    result = _intent_engine.classify(user_input)
    suggested_experts = []
    for exp_dict in result.suggested_experts[:5]:
        expert = expert_registry.get_expert_by_id(exp_dict["expert_id"])
        if expert:
            suggested_experts.append(ExpertMatchResponse(
                expert_id=expert.id,
                name=expert.name,
                title=expert.title,
                domain=expert.domain,
                match_score=exp_dict["match_score"],
                reason=exp_dict["reason"],
                tier=expert.tier,
                model_preference=expert.model_preference
            ))
    return IntentResponse(
        raw_input=result.raw_input,
        language=result.language,
        primary_intent=result.primary_intent,
        secondary_intents=result.secondary_intents,
        confidence=result.confidence,
        intent_keywords=result.intent_keywords,
        task_complexity=result.task_complexity,
        decomposition_needed=result.decomposition_needed,
        suggested_strategy=result.suggested_strategy,
        suggested_experts=suggested_experts
    )


# ─── Task Decomposition Routes ─────────────────────────────────────────

@router.post("/decompose", response_model=DecompositionResponse)
async def decompose_task(goal: str):
    """Decompose a complex goal into subtasks"""
    all_expert_ids = [e.id for e in expert_registry.get_all_experts()]
    decomposition = _task_decomposer.decompose(goal, all_expert_ids)
    return DecompositionResponse(
        original_goal=decomposition.original_goal,
        sub_tasks=[
            SubTaskResponse(
                id=st.id,
                description=st.description,
                assigned_expert_id=st.assigned_expert_id,
                assigned_expert_name=st.assigned_expert_name,
                status=st.status,
                priority=st.priority,
                dependencies=st.dependencies
            )
            for st in decomposition.sub_tasks
        ],
        total_experts_needed=decomposition.total_experts_needed,
        estimated_total_tokens=decomposition.estimated_total_tokens,
        estimated_duration_sec=decomposition.estimated_duration_sec,
        complexity_level=decomposition.complexity_level,
        execution_strategy=decomposition.execution_strategy,
        summary=decomposition.summary
    )


# ─── Multi-Agent Orchestration Routes ───────────────────────────────────

@router.post("/orchestrate/process", response_model=ExecutionResultResponse)
async def orchestrate_process(req: ProcessRequest):
    """Full pipeline: classify → match experts → decompose → execute"""
    result = _orchestrator.process(req.user_input)
    return ExecutionResultResponse(
        plan_id=result.plan_id,
        status=result.status,
        results=[
            TaskResultResponse(
                expert_id=r.expert_id,
                expert_name=r.expert_name,
                task_id=r.task_id,
                status=r.status,
                result=r.result,
                output_tokens=r.output_tokens,
                execution_time_sec=r.execution_time_sec,
                error=r.error
            )
            for r in result.results
        ],
        final_summary=result.final_summary,
        total_execution_time_sec=result.total_execution_time_sec,
        total_tokens=result.total_tokens
    )


@router.post("/orchestrate/plan", response_model=ExecutionPlanResponse)
async def create_plan(user_input: str):
    """Create an execution plan without running it"""
    intent = _intent_engine.classify(user_input)
    all_expert_ids = [e.id for e in expert_registry.get_all_experts()]
    decomposition = _task_decomposer.decompose(user_input, all_expert_ids)
    
    # Get matched experts
    matched = expert_registry.find_by_task(user_input, top_k=5)
    matched_ids = [e.id for e, _ in matched]
    
    plan = _orchestrator.create_execution_plan(intent, matched_ids, decomposition)
    return ExecutionPlanResponse(
        plan_id=plan.plan_id,
        original_goal=plan.original_goal,
        strategy=plan.strategy,
        stages=[
            ExecutionStageResponse(
                stage_id=s["stage_id"],
                expert_ids=s["expert_ids"],
                subtask_ids=s["subtask_ids"],
                can_parallel=s["can_parallel"]
            )
            for s in plan.stages
        ],
        estimated_duration_sec=plan.estimated_duration_sec,
        estimated_tokens=plan.estimated_tokens
    )


@router.get("/orchestrate/experts")
async def list_active_experts():
    """List all experts and their current status"""
    profiles = _orchestrator.list_active_experts()
    return {
        "active_count": len(profiles),
        "experts": [
            {
                "expert_id": p.expert_id,
                "name": p.name,
                "status": p.status.value,
                "current_task": p.current_task,
                "tasks_completed": p.tasks_completed,
                "success_rate": p.success_rate
            }
            for p in profiles
        ]
    }


@router.get("/orchestrate/expert/{expert_id}")
async def get_expert_status(expert_id: str):
    """Get status of a specific expert"""
    profile = _orchestrator.get_expert_status(expert_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Expert not found")
    return {
        "expert_id": profile.expert_id,
        "name": profile.name,
        "status": profile.status.value,
        "current_task": profile.current_task,
        "tasks_completed": profile.tasks_completed,
        "success_rate": profile.success_rate
    }


# ─── Health ─────────────────────────────────────────────────────────────

@router.get("/health")
async def experts_health():
    """Health check"""
    return {
        "status": "ok",
        "total_experts": len(expert_registry.get_all_experts()),
        "active_experts": len(_orchestrator.list_active_experts()),
        "domains": len(expert_registry.get_domain_stats())
    }
