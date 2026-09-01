"""
Multi-Agent orchestration pipeline for the Self-Evolve system.

Three specialized agents collaborate on each task:
  SolverAgent  — attempts the task using the configured LLM
  CriticAgent  — evaluates the answer and generates a critique with confidence
  MemoryAgent  — retrieves relevant lessons, stores new ones, scores effectiveness

OrchestratorAgent coordinates all three and produces a structured trace
compatible with the standard single-agent trace format.
"""

from __future__ import annotations

from . import memory as mem
from . import tasks as task_bank
from .llm import BaseLLM


# ===========================================================================
# SolverAgent
# ===========================================================================
class SolverAgent:
    """Attempts the task using the configured LLM + retrieved lessons."""

    def solve(self, task: task_bank.Task, lessons: list[dict], llm: BaseLLM) -> dict:
        result = llm.attempt(task, lessons)
        confidence = self._estimate_confidence(result, lessons)
        return {
            "answer":      result["answer"],
            "reasoning":   result.get("reasoning", ""),
            "lessons_used": result.get("lessons_used", 0),
            "confidence":  confidence,
            "tool_calls":  [],
        }

    @staticmethod
    def _estimate_confidence(result: dict, lessons: list) -> float:
        base = 0.40
        if lessons:
            base += 0.30
        try:
            float(result["answer"])
            base += 0.15
        except (TypeError, ValueError):
            base -= 0.10
        return round(min(max(base, 0.10), 0.97), 2)


# ===========================================================================
# CriticAgent
# ===========================================================================
class CriticAgent:
    """Verifies the solver's answer against the task's ground-truth verifier."""

    def evaluate(self, task: task_bank.Task, answer) -> dict:
        is_correct = task.verify(answer)
        critique = None if is_correct else task_bank.CRITIQUES.get(task.type, "Answer is incorrect.")
        return {
            "is_correct":  is_correct,
            "critique":    critique,
            "confidence":  0.97 if is_correct else 0.91,
        }


# ===========================================================================
# MemoryAgent
# ===========================================================================
class MemoryAgent:
    """Manages lesson retrieval, storage, and quality scoring."""

    def retrieve(self, task_type: str) -> list[dict]:
        return mem.get_lessons(task_type)

    def store(self, task_type: str, error_tag: str, lesson_text: str) -> dict:
        return mem.store_lesson(task_type, error_tag, lesson_text)

    def score(self, task_type: str, success: bool) -> None:
        mem.update_lesson_usage(task_type, success)


# ===========================================================================
# OrchestratorAgent
# ===========================================================================
class OrchestratorAgent:
    """Coordinates Solver → Critic → Memory in a Reflexion loop."""

    def __init__(self, llm_provider: BaseLLM):
        self.solver = SolverAgent()
        self.critic = CriticAgent()
        self.memory_agent = MemoryAgent()
        self.llm = llm_provider

    def run(
        self,
        task_type: str,
        max_iterations: int = 3,
        force_learn: bool = False,
        on_event=None,
    ) -> dict:
        import uuid

        run_id = str(uuid.uuid4())
        task = task_bank.generate_task(task_type)
        trace: list[dict] = []
        success = False

        if on_event:
            on_event({
                "type": "agent_start",
                "data": {
                    "run_id": run_id,
                    "task_type": task_type,
                    "task_prompt": task.prompt,
                    "agent_mode": "multi",
                    "max_iterations": max_iterations,
                },
            })

        for iteration in range(1, max_iterations + 1):
            if on_event:
                on_event({"type": "iteration_begin", "data": {"iteration": iteration}})

            # ── Memory Agent: retrieve lessons ─────────────────────────────
            lessons = [] if (force_learn and iteration == 1) else self.memory_agent.retrieve(task_type)
            if on_event:
                on_event({
                    "type": "lessons_retrieved",
                    "data": {"count": len(lessons), "agent": "memory"},
                })

            # ── Solver Agent: attempt ──────────────────────────────────────
            if on_event:
                on_event({"type": "solver_thinking", "data": {"agent": "solver"}})
            solver_result = self.solver.solve(task, lessons, self.llm)
            if on_event:
                on_event({
                    "type": "attempt_complete",
                    "data": {
                        "agent": "solver",
                        "answer": solver_result["answer"],
                        "confidence": solver_result["confidence"],
                    },
                })

            # ── Critic Agent: evaluate ─────────────────────────────────────
            if on_event:
                on_event({"type": "critic_thinking", "data": {"agent": "critic"}})
            critic_result = self.critic.evaluate(task, solver_result["answer"])
            if on_event:
                on_event({
                    "type": "critique_ready",
                    "data": {
                        "agent": "critic",
                        "is_correct": critic_result["is_correct"],
                        "critique": critic_result["critique"],
                    },
                })

            # ── Build step dict ────────────────────────────────────────────
            step: dict = {
                "iteration":          iteration,
                "prompt":             task.prompt,
                "answer":             solver_result["answer"],
                "correct_answer":     task.correct_answer,
                "success":            critic_result["is_correct"],
                "confidence":         solver_result["confidence"],
                "reasoning":          solver_result["reasoning"],
                "lessons_available":  [l["lesson_text"] for l in lessons],
                "critique":           critic_result["critique"],
                "lesson_stored":      None,
                "tool_calls":         solver_result.get("tool_calls", []),
                "agent_mode":         "multi",
                "solver": {
                    "answer":      solver_result["answer"],
                    "reasoning":   solver_result["reasoning"],
                    "confidence":  solver_result["confidence"],
                    "tool_calls":  solver_result.get("tool_calls", []),
                    "lessons_used": solver_result.get("lessons_used", 0),
                },
                "critic": {
                    "is_correct": critic_result["is_correct"],
                    "critique":   critic_result["critique"],
                    "confidence": critic_result["confidence"],
                },
                "memory_agent": {
                    "lessons_retrieved": len(lessons),
                    "lesson_stored":     None,
                },
            }

            mem.store_attempt(
                run_id=run_id,
                task_type=task_type,
                task_id=task.id,
                iteration=iteration,
                prompt=task.prompt,
                answer=solver_result["answer"],
                correct_answer=task.correct_answer,
                success=critic_result["is_correct"],
                critique=critic_result["critique"],
                lessons_used=solver_result.get("lessons_used", 0),
                confidence=solver_result["confidence"],
                agent_mode="multi",
            )

            if critic_result["is_correct"]:
                success = True
                self.memory_agent.score(task_type, True)
                trace.append(step)
                if on_event:
                    on_event({"type": "run_complete", "data": {"success": True, "iterations": iteration}})
                break

            # ── Reflect & store lesson ─────────────────────────────────────
            error_tag, lesson_text = self.llm.reflect(task, solver_result["answer"], critic_result["critique"])
            stored = self.memory_agent.store(task_type, error_tag, lesson_text)
            step["lesson_stored"] = stored.get("lesson_text", lesson_text)
            step["memory_agent"]["lesson_stored"] = step["lesson_stored"]

            if on_event:
                on_event({
                    "type": "lesson_stored",
                    "data": {"agent": "memory", "lesson": step["lesson_stored"]},
                })

            trace.append(step)

        if not success:
            self.memory_agent.score(task_type, False)
            if on_event:
                on_event({"type": "run_complete", "data": {"success": False, "iterations": len(trace)}})

        return {
            "run_id":          run_id,
            "task_type":       task_type,
            "task_id":         task.id,
            "task_prompt":     task.prompt,
            "correct_answer":  task.correct_answer,
            "success":         success,
            "iterations_used": len(trace),
            "agent_mode":      "multi",
            "trace":           trace,
        }
