"""
Planner — 任务规划器（思考核）
负责：理解意图、分解步骤、选择模型、验证结果
"""

import json
from dataclasses import dataclass, field
from typing import Any, Optional

from vulcan.agent.observability.logger import VulcanLogger


@dataclass
class Plan:
    goal: str
    steps: list[tuple[str, str]] = field(default_factory=list)  # [(step_name, action), ...]
    done: bool = False
    final_result: Any = None
    summary: str = ""
    reasoning: str = ""
    on_error: str = "stop"  # "stop" | "retry" | "skip"


class Planner:
    """
    Planner：根据 goal + context 生成执行计划。

    支持两种模式：
    1. LLM模式（推荐）：调用大模型生成结构化计划
    2. 规则模式（降级）：当 LLM 不可用时，使用启发式规则快速分解
    """

    def __init__(
        self,
        model: str = "claude-sonnet-4",
        provider: str = "anthropic",
        api_key: str = None,
        base_url: str = None,
        temperature: float = 0.3,
        logger: VulcanLogger = None,
    ):
        self.model = model
        self.provider = provider
        self.api_key = api_key
        self.base_url = base_url
        self.temperature = temperature
        self.logger = logger or VulcanLogger(session_id="Planner")

    async def plan(self, goal: str, context: dict, step_number: int = 0) -> Plan:
        """
        根据目标生成计划。

        context 包含：
        - task_id, current_step, completed_steps, available_tools, memory
        """
        available_tools = context.get("available_tools", [])
        completed = context.get("completed_steps", [])

        # 构建 system prompt
        system_prompt = self._build_system_prompt(available_tools, completed)
        user_prompt = self._build_user_prompt(goal, step_number, completed)

        # 尝试调用 LLM
        try:
            plan_data = await self._call_llm(system_prompt, user_prompt)
            if plan_data:
                return self._parse_plan(goal, plan_data)
        except Exception as e:
            self.logger.warning(f"Planner LLM call failed, using rule-based: {e}")

        # 降级：规则引擎
        return self._rule_based_plan(goal, available_tools)

    def _build_system_prompt(self, available_tools: list, completed: list) -> str:
        tool_list = "\n".join(
            f"- {t['name']}: {t['description'][:80]}" for t in available_tools[:20]
        )
        return f"""You are Vulcan Planner. Your job is to break down user goals into concrete action steps.

Available tools:
{tool_list}

Completed steps (do NOT repeat these):
{json.dumps(completed, ensure_ascii=False)}

Output format (JSON):
{{
  "steps": [["step_name", "tool_name{{arg1: value1}}"], ...],
  "done": false,
  "summary": "what we concluded (if done)",
  "reasoning": "why we chose these steps",
  "on_error": "stop"
}}

Rules:
- Use the most specific tool for each step
- Include all required arguments as JSON
- Do NOT repeat already-completed steps
- Maximum 5 steps per plan
"""

    def _build_user_prompt(self, goal: str, step_number: int, completed: list) -> str:
        return f"Goal: {goal}\nCurrent step: {step_number}\nCompleted: {len(completed)}\nWhat should we do next?"

    async def _call_llm(self, system_prompt: str, user_prompt: str) -> Optional[dict]:
        """调用 LLM API，返回结构化 JSON。"""
        import httpx

        api_key = self.api_key or ""
        headers = {
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }

        if self.provider == "anthropic":
            url = (self.base_url or "https://api.anthropic.com") + "/v1/messages"
            payload = {
                "model": self.model,
                "max_tokens": 1024,
                "temperature": self.temperature,
                "system": system_prompt,
                "messages": [{"role": "user", "content": user_prompt}],
            }
        else:
            # OpenAI compatible
            url = (self.base_url or "https://api.openai.com") + "/v1/chat/completions"
            headers["authorization"] = f"Bearer {api_key}"
            payload = {
                "model": self.model,
                "temperature": self.temperature,
                "max_tokens": 1024,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
            }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()

        if self.provider == "anthropic":
            content = data["content"][0]["text"]
        else:
            content = data["choices"][0]["message"]["content"]

        # Parse JSON from response
        # Find JSON block
        start = content.find("{")
        end = content.rfind("}") + 1
        if start != -1 and end > start:
            return json.loads(content[start:end])
        return None

    def _parse_plan(self, goal: str, data: dict) -> Plan:
        steps = []
        for s in data.get("steps", []):
            if isinstance(s, list) and len(s) == 2:
                steps.append((s[0], s[1]))
        return Plan(
            goal=goal,
            steps=steps,
            done=data.get("done", False),
            final_result=data.get("summary"),
            reasoning=data.get("reasoning", ""),
            on_error=data.get("on_error", "stop"),
        )

    def _rule_based_plan(self, goal: str, available_tools: list) -> Plan:
        """
        规则引擎降级方案。
        当 LLM 不可用时，根据关键词快速分解任务。
        """
        tool_map = {t["name"]: t for t in available_tools}

        steps = []
        g = goal.lower()

        # 关键词 → 工具映射
        if "搜索" in g or "search" in g or "查" in g:
            if "web_search" in tool_map:
                steps.append(("Web search", f'web_search{{"query": "{goal}"}}'))
        if "写文件" in g or "write" in g or "创建" in g:
            if "write_file" in tool_map:
                steps.append(("Write file", f'write_file{{"path": "/tmp/vulcan_output.txt", "content": ""}}'))
        if "代码" in g or "code" in g or "terminal" in g:
            if "terminal" in tool_map:
                steps.append(("Run command", f'terminal{{"command": "echo done"}}'))
        if "浏览器" in g or "web" in g:
            if "browser_navigate" in tool_map:
                steps.append(("Open browser", f'browser_navigate{{"url": "https://example.com"}}'))

        # 默认：简单 echo
        if not steps:
            steps.append(("Echo goal", f'terminal{{"command": "echo {goal}"}}'))

        return Plan(goal=goal, steps=steps, reasoning="Rule-based fallback plan")
