"""
Task Decomposition Engine for Vulcan
Breaks complex user goals into executable sub-tasks and routes them to appropriate experts.
"""

import uuid
import re
from typing import List, Optional, Dict, Tuple, Any
from pydantic import BaseModel, Field
from enum import Enum


class TaskStatus(str, Enum):
    PENDING = "pending"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


class ComplexityLevel(str, Enum):
    SIMPLE = "simple"
    MODERATE = "moderate"
    COMPLEX = "complex"
    VERY_COMPLEX = "very_complex"


class ExecutionStrategy(str, Enum):
    SEQUENTIAL = "sequential"
    PARALLEL = "parallel"
    HYBRID = "hybrid"


class SubTask(BaseModel):
    """Represents a single executable sub-task."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    description: str
    assigned_expert_id: Optional[str] = None
    assigned_expert_name: Optional[str] = None
    status: TaskStatus = TaskStatus.PENDING
    priority: int = Field(default=3, ge=1, le=5)
    dependencies: List[str] = Field(default_factory=list)
    result: Optional[str] = None
    estimated_tokens: int = 0
    actual_tokens: int = 0
    estimated_duration_sec: int = 0

    class Config:
        use_enum_values = True


class TaskDecomposition(BaseModel):
    """Complete decomposition of a complex goal into sub-tasks."""
    original_goal: str
    sub_tasks: List[SubTask]
    total_experts_needed: int = 0
    estimated_total_tokens: int = 0
    estimated_duration_sec: int = 0
    complexity_level: ComplexityLevel = ComplexityLevel.SIMPLE
    execution_strategy: ExecutionStrategy = ExecutionStrategy.SEQUENTIAL
    summary: str = ""

    class Config:
        use_enum_values = True


# Expert registry for keyword-based matching
EXPERT_REGISTRY: Dict[str, Dict[str, Any]] = {
    "researcher": {
        "name": "Research Expert",
        "keywords": ["研究", "调研", "research", "investigate", "调查", "分析", "analyze", "研究分析", "市场调研", "researcher"],
        "estimated_tokens_per_task": 3000,
        "estimated_duration_sec": 300,
    },
    "coder": {
        "name": "Coding Expert",
        "keywords": ["写", "code", "开发", "build", "编程", "实现", "功能", "feature", "coding", "开发", "coding", "programmer"],
        "estimated_tokens_per_task": 5000,
        "estimated_duration_sec": 600,
    },
    "tester": {
        "name": "Testing Expert",
        "keywords": ["测试", "test", "测试用例", "testing", "验证", "verify", "QA"],
        "estimated_tokens_per_task": 2000,
        "estimated_duration_sec": 300,
    },
    "deployer": {
        "name": "DevOps/Deployment Expert",
        "keywords": ["部署", "deploy", "发布", "release", "上线", "CI/CD", "infrastructure", "devops"],
        "estimated_tokens_per_task": 2500,
        "estimated_duration_sec": 400,
    },
    "analyst": {
        "name": "Data Analysis Expert",
        "keywords": ["分析", "analyze", "analytics", "数据分析", "统计", "statistics", "data", "数据处理", "挖掘", "mining"],
        "estimated_tokens_per_task": 4000,
        "estimated_duration_sec": 400,
    },
    "reporter": {
        "name": "Reporting Expert",
        "keywords": ["报告", "report", "总结", "summary", "文档", "document", "文档编写", "documentation", "撰写"],
        "estimated_tokens_per_task": 2000,
        "estimated_duration_sec": 200,
    },
    "optimizer": {
        "name": "Optimization Expert",
        "keywords": ["优化", "optimize", "性能优化", "调优", "tuning", "improve", "提升", "enhance"],
        "estimated_tokens_per_task": 3500,
        "estimated_duration_sec": 350,
    },
    "designer": {
        "name": "Design Expert",
        "keywords": ["设计", "design", "UI", "UX", "界面", "interface", "原型", "prototype", "wireframe"],
        "estimated_tokens_per_task": 3000,
        "estimated_duration_sec": 400,
    },
    "security": {
        "name": "Security Expert",
        "keywords": ["安全", "security", "漏洞", "vulnerability", "渗透", "penetration", "加密", "encryption"],
        "estimated_tokens_per_task": 4000,
        "estimated_duration_sec": 500,
    },
    "data_engineer": {
        "name": "Data Engineering Expert",
        "keywords": ["数据", "data", "ETL", "pipeline", "数据流", "database", "数据库", "存储", "storage"],
        "estimated_tokens_per_task": 4500,
        "estimated_duration_sec": 500,
    },
}


# Subtask type definitions with their keywords and dependencies
SUBTASK_TYPES: Dict[str, Dict[str, Any]] = {
    "research": {
        "keywords": ["研究", "调研", "research", "investigate", "调查", "research"],
        "description_template": "Conduct research and investigation on: {goal}",
        "priority": 5,
        "depends_on": [],
        "provides": ["research_findings"],
    },
    "data_collection": {
        "keywords": ["收集", "采集", "数据", "data", "获取", "gather", "collect"],
        "description_template": "Collect and gather data for: {goal}",
        "priority": 4,
        "depends_on": ["research"],
        "provides": ["collected_data"],
    },
    "analysis": {
        "keywords": ["分析", "analyze", "分析", "analytics", "分析报告"],
        "description_template": "Analyze data and findings for: {goal}",
        "priority": 4,
        "depends_on": ["research", "data_collection"],
        "provides": ["analysis_results"],
    },
    "coding": {
        "keywords": ["写", "code", "开发", "build", "编程", "实现", "功能", "coding", "开发", "program"],
        "description_template": "Develop and implement code for: {goal}",
        "priority": 3,
        "depends_on": ["research"],
        "provides": ["code_artifact"],
    },
    "testing": {
        "keywords": ["测试", "test", "测试用例", "testing", "验证"],
        "description_template": "Test and verify for: {goal}",
        "priority": 3,
        "depends_on": ["coding"],
        "provides": ["test_results"],
    },
    "deployment": {
        "keywords": ["部署", "deploy", "发布", "release", "上线"],
        "description_template": "Deploy and release for: {goal}",
        "priority": 2,
        "depends_on": ["testing"],
        "provides": ["deployed_artifact"],
    },
    "reporting": {
        "keywords": ["报告", "report", "总结", "summary", "文档", "document"],
        "description_template": "Create report and documentation for: {goal}",
        "priority": 2,
        "depends_on": ["analysis", "testing", "deployment"],
        "provides": ["final_report"],
    },
    "optimization": {
        "keywords": ["优化", "optimize", "性能优化", "调优", "tuning", "提升"],
        "description_template": "Optimize and improve for: {goal}",
        "priority": 3,
        "depends_on": ["analysis", "coding"],
        "provides": ["optimized_artifact"],
    },
    "design": {
        "keywords": ["设计", "design", "UI", "UX", "界面", "原型"],
        "description_template": "Design and prototype for: {goal}",
        "priority": 4,
        "depends_on": ["research"],
        "provides": ["design_artifact"],
    },
    "security_review": {
        "keywords": ["安全", "security", "漏洞", "渗透", "安全检查"],
        "description_template": "Perform security review for: {goal}",
        "priority": 3,
        "depends_on": ["coding"],
        "provides": ["security_report"],
    },
    "data_processing": {
        "keywords": ["数据处理", "统计", "statistics", "ETL", "处理"],
        "description_template": "Process and analyze data for: {goal}",
        "priority": 4,
        "depends_on": ["data_collection"],
        "provides": ["processed_data"],
    },
    "integration": {
        "keywords": ["集成", "integrate", "integration", "对接", "整合"],
        "description_template": "Integrate components for: {goal}",
        "priority": 3,
        "depends_on": ["coding"],
        "provides": ["integrated_system"],
    },
}


class TaskDecomposer:
    """
    Task decomposition engine that breaks complex goals into executable sub-tasks.
    Uses rule-based pattern matching (no LLM required).
    """

    def __init__(self):
        self.expert_registry = EXPERT_REGISTRY
        self.subtask_types = SUBTASK_TYPES

    def decompose(self, goal: str, available_expert_ids: List[str]) -> TaskDecomposition:
        """
        Main entry point for decomposing a goal into sub-tasks.
        
        Args:
            goal: The user's complex goal
            available_expert_ids: List of available expert IDs
            
        Returns:
            TaskDecomposition with all sub-tasks, dependencies, and estimates
        """
        # Step 1: Analyze complexity
        complexity_level, estimated_count = self.analyze_complexity(goal)
        
        # Step 2: Identify required subtask types from keywords
        identified_types = self._identify_subtask_types(goal)
        
        # Step 3: Create sub-task objects
        sub_tasks = self._create_subtasks(goal, identified_types)
        
        # Step 4: Identify dependencies between sub-tasks
        sub_tasks = self.identify_dependencies(sub_tasks)
        
        # Step 5: Assign best-matched experts
        sub_tasks = self._assign_experts(sub_tasks, available_expert_ids)
        
        # Step 6: Determine execution strategy
        execution_strategy = self._determine_execution_strategy(sub_tasks)
        
        # Step 7: Estimate resources
        decomposition = TaskDecomposition(
            original_goal=goal,
            sub_tasks=sub_tasks,
            complexity_level=complexity_level,
            execution_strategy=execution_strategy,
        )
        resources = self.estimate_resources(decomposition)
        decomposition.estimated_total_tokens = resources["estimated_total_tokens"]
        decomposition.estimated_duration_sec = resources["estimated_duration_sec"]
        decomposition.total_experts_needed = len(set(t.assigned_expert_id for t in sub_tasks if t.assigned_expert_id))
        
        # Step 8: Generate summary
        decomposition.summary = self._generate_summary(decomposition)
        
        return decomposition

    def analyze_complexity(self, goal: str) -> Tuple[str, int]:
        """
        Analyze the complexity of a goal.
        
        Returns:
            Tuple of (complexity_level, estimated_subtasks_count)
        """
        goal_lower = goal.lower()
        
        # Count keyword indicators for complexity
        complexity_score = 0
        
        # High complexity indicators
        complex_keywords = [
            "系统", "system", "平台", "platform", "架构", "architecture",
            "完整", "complete", "全面", "comprehensive", "企业", "enterprise",
            "大规模", "large-scale", "复杂", "complex", "多个", "multiple"
        ]
        for kw in complex_keywords:
            if kw in goal_lower:
                complexity_score += 2
        
        # Medium complexity indicators
        medium_keywords = [
            "开发", "develop", "实现", "implement", "创建", "create",
            "分析", "analyze", "研究", "research", "构建", "build"
        ]
        for kw in medium_keywords:
            if kw in goal_lower:
                complexity_score += 1
        
        # Count sub-task type matches
        type_count = len(self._identify_subtask_types(goal))
        complexity_score += type_count
        
        # Determine complexity level
        if complexity_score <= 2:
            return ComplexityLevel.SIMPLE.value, 1
        elif complexity_score <= 4:
            return ComplexityLevel.MODERATE.value, max(2, type_count)
        elif complexity_score <= 7:
            return ComplexityLevel.COMPLEX.value, max(4, type_count)
        else:
            return ComplexityLevel.VERY_COMPLEX.value, max(7, type_count)

    def identify_dependencies(self, sub_tasks: List[SubTask]) -> List[SubTask]:
        """
        Identify dependencies between sub-tasks based on their types.
        
        Logic:
        - Research tasks come first (no dependencies)
        - Data collection depends on research
        - Analysis depends on research and data collection
        - Coding depends on research/design
        - Testing depends on coding
        - Deployment depends on testing
        - Reporting depends on most downstream tasks
        """
        # Build a map of task type to task id
        task_type_map: Dict[str, SubTask] = {}
        for task in sub_tasks:
            task_type = self._get_task_type_from_description(task.description)
            if task_type:
                task_type_map[task_type] = task
        
        # Define dependency rules based on task types
        dependency_rules = {
            "data_collection": ["research"],
            "analysis": ["research", "data_collection"],
            "coding": ["research", "design"],
            "testing": ["coding"],
            "deployment": ["testing"],
            "optimization": ["analysis", "coding"],
            "security_review": ["coding"],
            "integration": ["coding"],
            "data_processing": ["data_collection"],
            "reporting": ["analysis", "testing", "deployment", "optimization"],
        }
        
        # Apply dependency rules
        for task in sub_tasks:
            task_type = self._get_task_type_from_description(task.description)
            if task_type and task_type in dependency_rules:
                for dep_type in dependency_rules[task_type]:
                    if dep_type in task_type_map:
                        dep_task = task_type_map[dep_type]
                        if dep_task.id != task.id and dep_task.id not in task.dependencies:
                            task.dependencies.append(dep_task.id)
        
        # Sort tasks by priority (higher priority first in dependency ordering)
        # Tasks with no dependencies should come first
        return sub_tasks

    def estimate_resources(self, decomposition: TaskDecomposition) -> Dict[str, Any]:
        """
        Estimate total tokens, duration, and cost for the decomposition.
        """
        total_tokens = 0
        total_duration = 0
        
        for task in decomposition.sub_tasks:
            total_tokens += task.estimated_tokens
            total_duration += task.estimated_duration_sec
        
        # Add overhead for coordination (10%)
        total_tokens = int(total_tokens * 1.1)
        total_duration = int(total_duration * 1.1)
        
        # Estimate cost (assuming $0.01 per 1K tokens)
        estimated_cost = (total_tokens / 1000) * 0.01
        
        return {
            "estimated_total_tokens": total_tokens,
            "estimated_duration_sec": total_duration,
            "estimated_cost_usd": round(estimated_cost, 4),
            "task_count": len(decomposition.sub_tasks),
            "expert_count": decomposition.total_experts_needed,
        }

    def _identify_subtask_types(self, goal: str) -> List[str]:
        """Identify which sub-task types are needed based on keyword matching."""
        goal_lower = goal.lower()
        identified = []
        
        for subtask_type, config in self.subtask_types.items():
            for keyword in config["keywords"]:
                if keyword.lower() in goal_lower:
                    if subtask_type not in identified:
                        identified.append(subtask_type)
                    break
        
        # If no specific types identified, default to research + analysis + reporting
        if not identified:
            identified = ["research", "analysis", "reporting"]
        
        return identified

    def _create_subtasks(self, goal: str, identified_types: List[str]) -> List[SubTask]:
        """Create SubTask objects for each identified type."""
        sub_tasks = []
        
        for idx, task_type in enumerate(identified_types):
            config = self.subtask_types[task_type]
            
            # Generate description
            description = config["description_template"].format(goal=goal)
            
            # Get base priority
            priority = config["priority"]
            
            # Estimate resources based on expert type
            estimated_tokens = 3000  # default
            estimated_duration = 300  # default
            
            # Find matching expert info
            for expert_id, expert_config in self.expert_registry.items():
                for kw in expert_config["keywords"]:
                    if kw.lower() in " ".join(config["keywords"]).lower():
                        estimated_tokens = expert_config["estimated_tokens_per_task"]
                        estimated_duration = expert_config["estimated_duration_sec"]
                        break
            
            task = SubTask(
                id=str(uuid.uuid4()),
                description=description,
                priority=priority,
                estimated_tokens=estimated_tokens,
                estimated_duration_sec=estimated_duration,
            )
            sub_tasks.append(task)
        
        return sub_tasks

    def _assign_experts(self, sub_tasks: List[SubTask], available_expert_ids: List[str]) -> List[SubTask]:
        """Assign best-matched experts to each sub-task based on keyword overlap."""
        for task in sub_tasks:
            best_expert_id = None
            best_expert_name = None
            best_score = 0
            
            task_type = self._get_task_type_from_description(task.description)
            
            for expert_id in available_expert_ids:
                if expert_id not in self.expert_registry:
                    continue
                    
                expert_config = self.expert_registry[expert_id]
                expert_keywords = expert_config["keywords"]
                
                # Calculate keyword overlap score
                score = 0
                task_lower = task.description.lower()
                
                for keyword in expert_keywords:
                    if keyword.lower() in task_lower:
                        score += 1
                
                # Bonus for exact task type match
                if task_type:
                    if task_type in expert_id.lower():
                        score += 5
                
                if score > best_score:
                    best_score = score
                    best_expert_id = expert_id
                    best_expert_name = expert_config["name"]
            
            # Fallback: find any expert with any keyword match
            if not best_expert_id:
                for expert_id in available_expert_ids:
                    if expert_id in self.expert_registry:
                        best_expert_id = expert_id
                        best_expert_name = self.expert_registry[expert_id]["name"]
                        break
            
            if best_expert_id:
                task.assigned_expert_id = best_expert_id
                task.assigned_expert_name = best_expert_name
                task.status = TaskStatus.ASSIGNED.value
        
        return sub_tasks

    def _determine_execution_strategy(self, sub_tasks: List[SubTask]) -> str:
        """
        Determine if tasks should run sequentially, in parallel, or hybrid.
        
        - parallel: No tasks depend on each other
        - sequential: All tasks form a linear dependency chain
        - hybrid: Some tasks can run in parallel, some must be sequential
        """
        if not sub_tasks:
            return ExecutionStrategy.SEQUENTIAL.value
        
        # Check if any task has dependencies
        tasks_with_deps = sum(1 for t in sub_tasks if t.dependencies)
        tasks_without_deps = len(sub_tasks) - tasks_with_deps
        
        if tasks_with_deps == 0:
            # All tasks are independent - parallel
            return ExecutionStrategy.PARALLEL.value
        elif tasks_without_deps == 0:
            # All tasks have dependencies - sequential
            return ExecutionStrategy.SEQUENTIAL.value
        else:
            # Mix of dependent and independent tasks - hybrid
            return ExecutionStrategy.HYBRID.value

    def _get_task_type_from_description(self, description: str) -> Optional[str]:
        """Extract the task type from a task description."""
        desc_lower = description.lower()
        
        for task_type, config in self.subtask_types.items():
            for keyword in config["keywords"]:
                if keyword.lower() in desc_lower:
                    return task_type
        
        return None

    def _generate_summary(self, decomposition: TaskDecomposition) -> str:
        """Generate a plain language explanation of the plan."""
        task_count = len(decomposition.sub_tasks)
        expert_count = decomposition.total_experts_needed
        strategy = decomposition.execution_strategy
        
        # Get task types
        task_types = []
        for task in decomposition.sub_tasks:
            tt = self._get_task_type_from_description(task.description)
            if tt:
                task_types.append(tt)
        
        unique_types = list(set(task_types))
        
        summary_parts = [
            f"我将把您的目标分解为 {task_count} 个子任务来执行。",
            f"需要 {expert_count} 位专家参与。",
            f"执行策略: {strategy}。",
            f"任务流程: {' -> '.join(unique_types)}。"
        ]
        
        return " ".join(summary_parts)


# Convenience function for quick decomposition
def decompose_task(goal: str, available_expert_ids: Optional[List[str]] = None) -> TaskDecomposition:
    """
    Quick decomposition function.
    
    Args:
        goal: The user's complex goal
        available_expert_ids: List of available expert IDs (uses default registry if empty)
        
    Returns:
        TaskDecomposition with all sub-tasks
    """
    if available_expert_ids is None:
        available_expert_ids = list(EXPERT_REGISTRY.keys())
    
    decomposer = TaskDecomposer()
    return decomposer.decompose(goal, available_expert_ids)


if __name__ == "__main__":
    # Example usage
    print("=== Task Decomposer Demo ===\n")
    
    # Test with a complex goal
    goal = "开发一个用户分析系统，包括数据收集、分析、可视化和报告"
    print(f"Goal: {goal}\n")
    
    decomposition = decompose_task(goal)
    
    print(f"Complexity: {decomposition.complexity_level}")
    print(f"Execution Strategy: {decomposition.execution_strategy}")
    print(f"Total Experts Needed: {decomposition.total_experts_needed}")
    print(f"Estimated Tokens: {decomposition.estimated_total_tokens}")
    print(f"Estimated Duration: {decomposition.estimated_duration_sec} seconds")
    print(f"\nSummary: {decomposition.summary}")
    print("\n--- Sub-tasks ---")
    
    for i, task in enumerate(decomposition.sub_tasks, 1):
        print(f"\n{i}. {task.description}")
        print(f"   ID: {task.id[:8]}...")
        print(f"   Expert: {task.assigned_expert_name} ({task.assigned_expert_id})")
        print(f"   Priority: {task.priority}")
        print(f"   Dependencies: {task.dependencies}")
        print(f"   Status: {task.status}")
        print(f"   Est. Tokens: {task.estimated_tokens}")
