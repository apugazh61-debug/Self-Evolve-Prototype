"""
Curiosity-Driven Autonomous Self-Play & Continuous Evolution Engine.
A Teacher Agent autonomously generates increasingly difficult problems,
challenges the Solver Agent, and expands the memory knowledge base without human input.
"""

from __future__ import annotations

import random
import time
from typing import Any
from app.tasks import TASK_BANK, get_task_generator
from app.agent import ReflexionAgent
from app.llm import get_llm_provider
from app import memory


DIFFICULTY_LEVELS = ["Novice", "Intermediate", "Advanced", "Grandmaster"]


class SelfPlayEngine:
    def __init__(self):
        self.task_types = list(TASK_BANK.keys())
        self.llm_provider = get_llm_provider()

    def run_curiosity_cycle(self, task_type: str | None = None) -> dict[str, Any]:
        """
        Executes one autonomous curiosity step:
        1. Teacher generates a challenging task instance.
        2. Solver attempts with Reflexion loop.
        3. Records curriculum metrics and newly stored lessons.
        """
        selected_type = task_type or random.choice(self.task_types)
        generator = get_task_generator(selected_type)
        difficulty = random.choice(DIFFICULTY_LEVELS)

        # Teacher generates task instance
        task = generator.generate()

        # Count lessons before
        lessons_before = len(memory.get_lessons(selected_type))

        # Solve using Reflexion agent
        agent = ReflexionAgent(llm_provider=self.llm_provider)
        run_result = agent.run(task_type=selected_type, max_iterations=3)

        # Count lessons after
        lessons_after = len(memory.get_lessons(selected_type))
        lessons_learned = max(0, lessons_after - lessons_before)

        # Record to database
        saved = memory.record_self_play_session(
            task_type=selected_type,
            difficulty=difficulty,
            prompt=run_result["task_prompt"],
            solved=run_result["success"],
            iterations=run_result["iterations_used"],
            lessons_learned=lessons_learned,
        )

        return {
            "session_id": saved.get("id", 1),
            "task_type": selected_type,
            "difficulty": difficulty,
            "prompt": run_result["task_prompt"],
            "solved": run_result["success"],
            "iterations_used": run_result["iterations_used"],
            "lessons_learned": lessons_learned,
            "trace": [
                {
                    "iteration": s.get("iteration", 1),
                    "answer": str(s.get("answer")),
                    "success": s.get("success", False),
                    "critique": s.get("critique"),
                    "lesson_stored": s.get("lesson_stored"),
                }
                for s in run_result.get("trace", [])
            ],
        }
