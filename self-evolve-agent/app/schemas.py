"""Pydantic schemas for the Self-Evolve API."""
from __future__ import annotations
from typing import Any, List, Optional
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------

class RunRequest(BaseModel):
    task_type: str
    max_iterations: int = Field(default=3, ge=1, le=10)
    agent_mode: str = Field(default="single", pattern="^(single|multi)$")


# ---------------------------------------------------------------------------
# Tool schemas
# ---------------------------------------------------------------------------

class ToolCallOut(BaseModel):
    tool: str
    input: str
    output: Any
    success: bool


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
    # Multi-agent specific (populated when agent_mode == "multi")
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


# ---------------------------------------------------------------------------
# Task type schema
# ---------------------------------------------------------------------------

class TaskTypeOut(BaseModel):
    id: str
    description: str


# ---------------------------------------------------------------------------
# Meta-analysis schemas
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Export / Import schemas
# ---------------------------------------------------------------------------

class ExportData(BaseModel):
    version: str = "2.0"
    lessons: List[LessonOut]
    metadata: dict = {}
