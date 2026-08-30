#!/usr/bin/env python3
"""
Self-Evolve (Agentic AI v1.0) — Terminal Interactive CLI.
Run autonomous agentic reasoning, MCTS, Swarm OS, and Reflexion directly from the command line.
"""

import argparse
import asyncio
import io
import json
import sys
import time

# Ensure UTF-8 output on Windows consoles
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

from app.agent import ReflexionAgent
from app.llm import get_llm_provider
from app.tot_engine import TreeOfThoughtsEngine
from app.debate import DebateArena
from app.swarm_os import c_suite_swarm_os
from app.mcts_engine import mcts_engine
from app.swarm_dag import SwarmOrchestrator
from app.vision_agent import VisionDiagramAgent
from app.code_patcher import SelfCodePatcher
from app.fuzzer import adversarial_fuzzer
from app.merkle_vault import merkle_vault
from app.tasks import TASK_DESCRIPTIONS
from app import memory


BANNER = r"""
  ____       _  __      _____           _            
 / ___|  ___| |/ _|    | ____|_   _____ | |_   _____ 
 \___ \ / _ \ | |_ ____|  _| \ \ / / _ \| \ \ / / _ \
  ___) |  __/ |  _|____| |___ \ V / (_) | |\ V /  __/
 |____/ \___|_|_|      |_____| \_/ \___/|_| \_/ \___|
               Agentic AI Platform v1.0
"""


def print_header(title: str):
    print("\n" + "=" * 70)
    print(f"  [*] {title.upper()}")
    print("=" * 70)


def run_cli():
    parser = argparse.ArgumentParser(description="Self-Evolve Agentic AI CLI")
    parser.add_argument(
        "--mode",
        choices=["reflexion", "tot", "debate", "swarm", "csuite", "mcts", "vision", "patcher", "fuzzer", "vault"],
        default="reflexion",
        help="Execution mode (default: reflexion)",
    )
    parser.add_argument(
        "--task",
        default="percentage_discount",
        help="Task type to execute (e.g. percentage_discount, compound_interest, km_to_miles)",
    )
    parser.add_argument("--iter", type=int, default=3, help="Max iterations for Reflexion loop")
    args = parser.parse_args()

    print(BANNER)
    memory.init_db()

    print(f"[*] Mode: {args.mode.upper()}")
    print(f"[*] Task Target: {args.task}")

    if args.mode == "reflexion":
        print_header("Reflexion Self-Improvement Loop")
        agent = ReflexionAgent(llm_provider=get_llm_provider())
        res = agent.run(task_type=args.task, max_iterations=args.iter)
        print(f"\n[+] Task Prompt: {res.task_prompt}")
        print(f"[+] Status: {'SOLVED (100%)' if res.success else 'FAILED'}")
        print(f"[+] Iterations Used: {res.iterations_used}")
        for s in res.trace:
            print(f"\n  ── Iteration {s.iteration} ──")
            print(f"  Output Answer: {s.answer} (Correct: {s.correct_answer})")
            print(f"  Confidence: {int((s.confidence or 0.5) * 100)}%")
            if s.critique:
                print(f"  Critique: {s.critique}")
            if s.lesson_stored:
                print(f"  [!] Saved Lesson: {s.lesson_stored}")

    elif args.mode == "tot":
        print_header("Tree of Thoughts (ToT) Multi-Branch Reasoning")
        engine = TreeOfThoughtsEngine()
        res = engine.solve(args.task)
        print(f"[+] Prompt: {res['task_prompt']}")
        print(f"[+] Winner Node: {res['winning_node_id']} (Score: {res['tree_stats']['max_score']})")
        print(f"[+] Final Answer: {res['final_answer']} (Ground Truth: {res['correct_answer']})")

    elif args.mode == "debate":
        print_header("Adversarial Multi-Agent Debate Arena")
        arena = DebateArena()
        res = arena.conduct_debate(args.task)
        print(f"[+] Consensus Score: {int(res['consensus_score'] * 100)}%")
        print(f"[+] Final Answer: {res['final_answer']}")
        for m in res["transcript"]:
            print(f"\n[{m['speaker'].upper()}] ({m['stage']}):")
            print(f"  {m['message']}")

    elif args.mode == "csuite":
        print_header("Autonomous C-Suite Swarm OS")
        res = c_suite_swarm_os.dispatch_c_suite(args.task)
        print(f"[+] Governance Status: {res['governance_status']}")
        print(f"[+] Final Answer: {res['final_answer']}")
        for exec_agent in res["c_suite_council"]:
            print(f"\n  [*] {exec_agent['role']}:")
            print(f"     Action: {exec_agent.get('directive') or exec_agent.get('action') or exec_agent.get('audit_check') or exec_agent.get('assertion')}")

    elif args.mode == "mcts":
        print_header("Monte Carlo Tree Search (MCTS) AlphaGo Engine")
        res = mcts_engine.search(args.task)
        print(f"[+] Simulations: {res['simulations_executed']}")
        print(f"[+] Optimal Answer: {res['optimal_solution']} (Confidence: {res['mcts_convergence_confidence']})")

    elif args.mode == "swarm":
        print_header("Asynchronous DAG Swarm Orchestration")
        orchestrator = SwarmOrchestrator()
        res = asyncio.run(orchestrator.plan_and_execute())
        print(f"[+] Total Agents in DAG: {res['total_agents']}")
        print(f"[+] Total Parallel Latency: {res['total_latency_ms']}ms")
        print(f"[+] Verdict: {res['consensus_verdict']}")

    elif args.mode == "vision":
        print_header("Multi-Modal Vision & Diagram Reasoning")
        agent = VisionDiagramAgent()
        res = agent.analyze_and_solve(problem_hint=args.task)
        print(f"[+] Inferred Task: {res['inferred_task_type']}")
        print(f"[+] Detected Entities: {', '.join(res['detected_visual_elements'])}")
        print(f"[+] Answer: {res['final_answer']} (Confidence: {int(res['confidence'] * 100)}%)")

    elif args.mode == "patcher":
        print_header("Self-Modifying Code Patcher & Benchmarker")
        patcher = SelfCodePatcher()
        res = patcher.analyze_and_benchmark(args.task)
        print(f"[+] Patch ID: {res['patch_id']} - {res['title']}")
        print(f"[+] Accuracy Gain: {res['benchmark_results']['accuracy_gain']}")
        print(f"[+] AST Security: {res['benchmark_results']['ast_safety_check']}")

    elif args.mode == "fuzzer":
        print_header("Adversarial Red-Team Stress Fuzzer")
        res = adversarial_fuzzer.run_stress_suite()
        print(f"[+] Resilience Score: {res['resilience_score']}")
        print(f"[+] Status: {res['overall_status']}")

    elif args.mode == "vault":
        print_header("Cryptographic Merkle Tree Audit Vault")
        integrity = merkle_vault.verify_audit_integrity()
        print(f"[+] Verified Blocks: {integrity['total_blocks_verified']}")
        print(f"[+] Merkle Root Hash: {integrity['merkle_root_hash']}")
        print(f"[+] Audit Status: {integrity['status']}")

    print("\n" + "=" * 70 + "\n")


if __name__ == "__main__":
    run_cli()
