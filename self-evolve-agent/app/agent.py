"""
The Self-Evolve Reflexion agent loop.

Two modes:
  "single" (default) — single ReflexionAgent loop (original behaviour)
  "multi"             — three-agent orchestration (Solver + Critic + Memory)

Both modes share the same trace format and on_event callback interface.
"""

from __future__ import annotations

import uuid
from typing import Callable, Optional

from . import memory
from . import tasks as task_bank
from .llm import BaseLLM
from .multi_agent import OrchestratorAgent


# ---------------------------------------------------------------------------
# Confidence estimator (single-agent mode)
# ---------------------------------------------------------------------------
def _estimate_confidence(lessons: list, answer, lessons_required: bool = False) -> float:
    base = 0.40
    if lessons:
        base += 0.30
    try:
        float(answer)
        base += 0.15
    except (TypeError, ValueError):
        base -= 0.10
    return round(min(max(base, 0.10), 0.97), 2)


# ---------------------------------------------------------------------------
# ReflexionAgent — single-agent mode
# ---------------------------------------------------------------------------
class ReflexionAgent:
    def __init__(self, llm_provider: BaseLLM):
        self.llm = llm_provider

    def run(
        self,
        task_type: str,
        max_iterations: int = 3,
        agent_mode: str = "single",
        force_learn: bool = False,
        on_event: Optional[Callable[[dict], None]] = None,
    ) -> dict:
        if task_type not in task_bank.GENERATORS:
            raise ValueError(f"Unknown task type: {task_type}")

        # Delegate to multi-agent orchestrator
        if agent_mode == "multi":
            orch = OrchestratorAgent(self.llm)
            return orch.run(task_type=task_type, max_iterations=max_iterations, force_learn=force_learn, on_event=on_event)

        # ── Single-agent Reflexion loop ────────────────────────────────────
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
                    "agent_mode": "single",
                    "max_iterations": max_iterations,
                },
            })

        for iteration in range(1, max_iterations + 1):
            if on_event:
                on_event({"type": "iteration_begin", "data": {"iteration": iteration}})

            # Retrieve lessons from memory (or simulate fresh encounter if force_learn on iteration 1)
            lessons = [] if (force_learn and iteration == 1) else memory.get_lessons(task_type)
            if on_event:
                on_event({
                    "type": "lessons_retrieved",
                    "data": {"count": len(lessons)},
                })

            # Attempt the task
            result = self.llm.attempt(task, lessons)
            answer = result["answer"]
            confidence = _estimate_confidence(lessons, answer)

            if on_event:
                on_event({
                    "type": "attempt_complete",
                    "data": {"answer": answer, "confidence": confidence},
                })

            # Self-critique
            is_correct = task.verify(answer)
            critique = None if is_correct else task_bank.CRITIQUES[task_type]

            if on_event:
                on_event({
                    "type": "critique_ready",
                    "data": {"is_correct": is_correct, "critique": critique},
                })

            step: dict = {
                "iteration":         iteration,
                "prompt":            task.prompt,
                "answer":            answer,
                "reasoning":         result.get("reasoning", ""),
                "correct_answer":    task.correct_answer,
                "success":           is_correct,
                "confidence":        confidence,
                "lessons_available": [l["lesson_text"] for l in lessons],
                "critique":          critique,
                "lesson_stored":     None,
                "tool_calls":        [],
                "agent_mode":        "single",
                "solver":            None,
                "critic":            None,
                "memory_agent":      None,
            }

            memory.store_attempt(
                run_id=run_id,
                task_type=task_type,
                task_id=task.id,
                iteration=iteration,
                prompt=task.prompt,
                answer=answer,
                correct_answer=task.correct_answer,
                success=is_correct,
                critique=critique,
                lessons_used=result.get("lessons_used", 0),
                confidence=confidence,
                agent_mode="single",
            )

            if is_correct:
                success = True
                memory.update_lesson_usage(task_type, True)
                trace.append(step)
                if on_event:
                    on_event({"type": "run_complete", "data": {"success": True, "iterations": iteration}})
                break

            # Reflect and store a lesson
            error_tag, lesson_text = self.llm.reflect(task, answer, critique)
            stored = memory.store_lesson(task_type, error_tag, lesson_text)
            step["lesson_stored"] = stored.get("lesson_text", lesson_text)

            if on_event:
                on_event({
                    "type": "lesson_stored",
                    "data": {"lesson": step["lesson_stored"]},
                })

            trace.append(step)

        if not success:
            memory.update_lesson_usage(task_type, False)
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
            "agent_mode":      agent_mode,
            "trace":           trace,
        }
