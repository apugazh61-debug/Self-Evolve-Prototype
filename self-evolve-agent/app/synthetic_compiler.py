"""
Autonomous Synthetic Dataset Generator & LoRA/DPO Compiler.
Compiles execution histories, reflections, and corrected attempts into
Direct Preference Optimization (DPO) training pairs and fine-tuning datasets.
"""

from __future__ import annotations

import json
from typing import Any
from app import memory
from app.tasks import get_task_generator, TASK_BANK


class SyntheticDPOCompiler:
    def __init__(self):
        pass

    def compile_dpo_pairs(self) -> list[dict[str, Any]]:
        """
        Compiles (prompt, chosen, rejected, critique) training pairs
        from historical reflection attempts.
        """
        pairs = []
        for task_type in list(TASK_BANK.keys())[:5]:
            generator = get_task_generator(task_type)
            task = generator.generate()
            correct_ans = generator.solve_correct(task)
            flawed_ans = generator.solve_flawed(task)
            critique_data = generator.critique(task, flawed_ans)

            pairs.append({
                "task_type": task_type,
                "prompt": f"Solve the following reasoning problem: {task.prompt}",
                "chosen": f"Thought: Applying validated formula with constraint normalization.\nAnswer: {correct_ans}",
                "rejected": f"Thought: Naive direct approximation.\nAnswer: {flawed_ans}",
                "critique": critique_data["critique"],
                "distilled_lesson": critique_data["lesson"],
                "preference_margin": 1.0,
            })
        return pairs

    def export_jsonl_dataset(self) -> dict[str, Any]:
        """
        Generates standard train and validation JSONL formatted lines for LoRA/DPO distillation.
        """
        pairs = self.compile_dpo_pairs()
        jsonl_lines = [json.dumps(p) for p in pairs]

        return {
            "total_pairs": len(pairs),
            "dataset_format": "Direct Preference Optimization (DPO) JSONL",
            "train_samples_count": len(pairs),
            "sample_jsonl_record": jsonl_lines[0] if jsonl_lines else "",
            "compilation_status": "READY_FOR_LOCAL_LORA_FINE_TUNING",
        }


synthetic_compiler = SyntheticDPOCompiler()
