"""Pydantic schemas for the Self-Evolve API."""
from __future__ import annotations
from typing import Any, List, Optional, Dict
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------

class RunRequest(BaseModel):
    task_type: str
    max_iterations: int = Field(default=3, ge=1, le=10)
    agent_mode: str = Field(default="single", pattern="^(single|multi)$")


class ToTRequest(BaseModel):
    task_type: str
    branching_factor: int = Field(default=3, ge=2, le=5)


class DebateRequest(BaseModel):
    task_type: str
    rounds: int = Field(default=2, ge=1, le=4)


class SelfPlayRequest(BaseModel):
    task_type: Optional[str] = None


class CustomToolCreateRequest(BaseModel):
    name: str
    description: str
    code: str
    parameters: Optional[Dict[str, Any]] = None
    test_input: Optional[Dict[str, Any]] = None


class CustomToolExecuteRequest(BaseModel):
    name: str
    arguments: Dict[str, Any] = {}


# ---------------------------------------------------------------------------
# Tool schemas
# ---------------------------------------------------------------------------

class ToolCallOut(BaseModel):
    tool: str
    input: str
    output: Any
    success: bool


class CustomToolOut(BaseModel):
    id: int
    name: str
    description: str
    code: str
    parameters: str
    times_executed: int
    created_at: str


# ---------------------------------------------------------------------------
# Agent trace schemas
# ---------------------------------------------------------------------------

class SolverResult(BaseModel):
    answer: Any
    reasoning: str
    confidence: float
    tool_calls: List[ToolCallOut] = []
    lessons_used: int = 0


class CriticResult(BaseModel):
    is_correct: bool
    critique: Optional[str] = None
    confidence: float = 0.95


class MemoryAgentResult(BaseModel):
    lessons_retrieved: int = 0
    lesson_stored: Optional[str] = None


class IterationTrace(BaseModel):
    iteration: int
    prompt: str
    answer: Any
    correct_answer: Any
    success: bool
    confidence: float = 0.5
    reasoning: str = ""
    lessons_available: List[str] = []
    critique: Optional[str] = None
    lesson_stored: Optional[str] = None
    tool_calls: List[ToolCallOut] = []
    agent_mode: str = "single"
    solver: Optional[SolverResult] = None
    critic: Optional[CriticResult] = None
    memory_agent: Optional[MemoryAgentResult] = None


# ---------------------------------------------------------------------------
# Run response
# ---------------------------------------------------------------------------

class RunResponse(BaseModel):
    run_id: str
    task_type: str
    task_id: str
    task_prompt: str
    correct_answer: Any
    success: bool
    iterations_used: int
    agent_mode: str = "single"
    trace: List[IterationTrace] = []


# ---------------------------------------------------------------------------
# Tree of Thoughts Schemas
# ---------------------------------------------------------------------------

class ThoughtNodeOut(BaseModel):
    id: str
    parent_id: Optional[str] = None
    thought: str
    depth: int
    score: float
    status: str
    output_val: Optional[str] = None
    reasoning_type: str


class ToTResponse(BaseModel):
    task_id: str
    task_type: str
    task_prompt: str
    final_answer: Any
    correct_answer: Any
    is_correct: bool
    winning_node_id: str
    winning_path: List[str]
    tree_nodes: List[ThoughtNodeOut]
    tree_stats: Dict[str, Any]


# ---------------------------------------------------------------------------
# Debate Schemas
# ---------------------------------------------------------------------------

class DebateMessageOut(BaseModel):
    speaker: str
    role: str
    message: str
    confidence: float
    stage: str


class DebateResponse(BaseModel):
    task_id: str
    task_type: str
    task_prompt: str
    final_answer: Any
    correct_answer: Any
    is_correct: bool
    transcript: List[DebateMessageOut]
    rounds: int
    consensus_score: float


# ---------------------------------------------------------------------------
# Self Play Schemas
# ---------------------------------------------------------------------------

class SelfPlayResponse(BaseModel):
    session_id: int
    task_type: str
    difficulty: str
    prompt: str
    solved: bool
    iterations_used: int
    lessons_learned: int
    trace: List[Dict[str, Any]]


# ---------------------------------------------------------------------------
# Lesson / memory schemas
# ---------------------------------------------------------------------------

class LessonOut(BaseModel):
    id: int
    task_type: str
    error_tag: str
    lesson_text: str
    created_at: str
    times_used: int = 0
    times_helped: int = 0
    effectiveness: float = 0.0


class LessonScoreOut(BaseModel):
    lesson_id: int
    times_used: int
    times_helped: int
    effectiveness: float


class SemanticSearchResult(BaseModel):
    lesson_text: str
    task_type: str
    error_tag: str
    similarity_score: float


class TaskTypeOut(BaseModel):
    id: str
    description: str


class FailurePattern(BaseModel):
    task_type: str
    total_runs: int
    first_attempt_failures: int
    failure_rate: float


class LessonEfficiency(BaseModel):
    lesson_id: int
    task_type: str
    error_tag: str
    lesson_text: str
    times_used: int
    times_helped: int
    effectiveness: float
    should_prune: bool


class MetaAnalysis(BaseModel):
    total_runs: int
    total_lessons: int
    overall_success_rate: float
    failure_patterns: List[FailurePattern]
    lesson_efficiency: List[LessonEfficiency]
    recommendations: List[str]
    pruned_lessons: int = 0


class VisionRequest(BaseModel):
    image_data: Optional[str] = None
    problem_hint: str = ""


class VisionResponse(BaseModel):
    image_parsed: bool
    inferred_task_type: str
    detected_visual_elements: List[str]
    extracted_problem_statement: str
    parameters: Dict[str, Any]
    solution_steps: List[str]
    final_answer: Any
    correct_answer: Any
    is_correct: bool
    confidence: float


class PatchBenchmarkRequest(BaseModel):
    target_area: str = "percentage_discount"


class SwarmRequest(BaseModel):
    goal: str = "Enterprise Quantitative Audit"


class RouterRequest(BaseModel):
    task_type: str = "percentage_discount"
    prompt: str = ""
    max_latency_ms: int = 500


class ReplayForkRequest(BaseModel):
    task_type: str = "percentage_discount"
    target_step: int = 1
    injected_lesson: str = "Always verify fractional percentages with pre-multiplication."


class CSuiteRequest(BaseModel):
    task_type: str = "compound_interest"
    goal_brief: str = "Corporate Financial Audit"


class MCTSRequest(BaseModel):
    task_type: str = "percentage_discount"
    simulations: int = 50


class WebhookPRRequest(BaseModel):
    patch_title: str = "Patch #01: Strict Decimal Normalization"
    code_diff: str = "- price - discount\n+ price * (1 - discount/100)"
    task_type: str = "percentage_discount"


class ProviderSettingsRequest(BaseModel):
    provider: str = "mock"
    api_key: Optional[str] = None
    ollama_url: Optional[str] = None


class ExportData(BaseModel):
    version: str = "1.0"
    lessons: List[LessonOut]
    metadata: dict = {}
