from __future__ import annotations

import asyncio
import json
import os
import threading
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from . import memory
from . import meta_learner
from .agent import ReflexionAgent
from .llm import get_llm_provider
from .schemas import (
    ExportData, LessonOut, MetaAnalysis, RunRequest, RunResponse, TaskTypeOut,
    ToTRequest, ToTResponse, DebateRequest, DebateResponse,
    SelfPlayRequest, SelfPlayResponse, CustomToolCreateRequest, CustomToolExecuteRequest, CustomToolOut,
    VisionRequest, VisionResponse, PatchBenchmarkRequest,
    SwarmRequest, RouterRequest, ReplayForkRequest,
    CSuiteRequest, MCTSRequest, WebhookPRRequest,
    ProviderSettingsRequest,
)
from . import tasks as task_bank
from .tot_engine import TreeOfThoughtsEngine
from .debate import DebateArena
from .self_play import SelfPlayEngine
from .tool_maker import synthesize_and_register_tool, execute_custom_tool, seed_default_synthesized_tools
from .vision_agent import VisionDiagramAgent
from .code_patcher import SelfCodePatcher
from .report_gen import generate_executive_report_html
from .swarm_dag import SwarmOrchestrator
from .cognitive_memory import cognitive_memory
from .llm_router import llm_router
from .time_travel import time_travel_debugger
from .fuzzer import adversarial_fuzzer
from .swarm_os import c_suite_swarm_os
from .graph_rag import graph_rag
from .mcts_engine import mcts_engine
from .synthetic_compiler import synthetic_compiler
from .merkle_vault import merkle_vault
from .webhook_bot import webhook_bot
from .vector_memory import semantic_search, VECTOR_MEMORY_ENABLED
from .ws_manager import manager as ws_manager

BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = BASE_DIR / "static"


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    memory.init_db()
    seed_default_synthesized_tools()
    yield


app = FastAPI(
    title="Self-Evolve Enterprise OS API v1.0",
    description="Autonomous Agentic AI Platform featuring C-Suite Swarm OS, GraphRAG Knowledge Graph, MCTS AlphaGo Engine, Merkle Audit Vault, and Auto-PR Bot.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

llm_provider = get_llm_provider()
agent = ReflexionAgent(llm_provider=llm_provider)
tot_engine = TreeOfThoughtsEngine()
debate_arena = DebateArena()
self_play_engine = SelfPlayEngine()
vision_agent = VisionDiagramAgent()
code_patcher = SelfCodePatcher()
swarm_orchestrator = SwarmOrchestrator()


# ---------------------------------------------------------------------------
# Static files & SPA root
# ---------------------------------------------------------------------------
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.get("/")
def root():
    index = STATIC_DIR / "index.html"
    if index.exists():
        return FileResponse(index)
    return {"message": "Self-Evolve API is running. See /docs for the API."}


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------
@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "llm_provider": llm_provider.name,
        "vector_memory": VECTOR_MEMORY_ENABLED,
        "ws_connections": ws_manager.connection_count,
        "custom_tools_count": len(memory.get_custom_tools()),
        "merkle_vault_blocks": len(merkle_vault.chain),
    }


# ---------------------------------------------------------------------------
# Tasks
# ---------------------------------------------------------------------------
@app.get("/api/tasks", response_model=list[TaskTypeOut])
def list_tasks():
    meta = getattr(task_bank, "TASK_METADATA", {})
    return [
        {
            "id": k,
            "description": meta.get(k, {}).get("description", v),
            "category": meta.get(k, {}).get("category", "General Reasoning"),
            "formula": meta.get(k, {}).get("formula", ""),
            "pitfall": meta.get(k, {}).get("pitfall", ""),
            "lesson_preview": meta.get(k, {}).get("lesson_preview", ""),
        }
        for k, v in task_bank.TASK_DESCRIPTIONS.items()
    ]


# ---------------------------------------------------------------------------
# Agent run — standard
# ---------------------------------------------------------------------------
@app.post("/api/run")
async def run_agent(req: RunRequest):
    if req.task_type not in task_bank.GENERATORS:
        raise HTTPException(status_code=400, detail=f"Unknown task_type '{req.task_type}'")

    queue: asyncio.Queue = asyncio.Queue()
    loop = asyncio.get_running_loop()

    def on_event(event: dict):
        loop.call_soon_threadsafe(queue.put_nowait, event)

    def run_sync():
        try:
            result = agent.run(
                task_type=req.task_type,
                max_iterations=req.max_iterations,
                agent_mode=req.agent_mode,
                force_learn=req.force_learn,
                on_event=on_event,
            )
            is_success = result.get("success", False) if isinstance(result, dict) else getattr(result, "success", False)
            merkle_vault.record_decision("AGENT_RUN_COMPLETED", {"task_type": req.task_type, "success": is_success})
            loop.call_soon_threadsafe(queue.put_nowait, {"type": "_result", "data": result})
        except Exception as exc:
            loop.call_soon_threadsafe(queue.put_nowait, {"type": "_error", "data": str(exc)})

    thread = threading.Thread(target=run_sync, daemon=True)
    thread.start()

    result = None
    while True:
        event = await queue.get()
        asyncio.create_task(ws_manager.broadcast(event["type"], event.get("data", {})))
        if event["type"] == "_result":
            result = event["data"]
            break
        if event["type"] == "_error":
            raise HTTPException(status_code=500, detail=event["data"])

    return result


# ---------------------------------------------------------------------------
# C-Suite Executive Swarm OS
# ---------------------------------------------------------------------------
@app.post("/api/swarm-os/dispatch")
async def dispatch_c_suite_os(req: CSuiteRequest):
    await ws_manager.broadcast("c_suite_start", {"task_type": req.task_type})
    res = c_suite_swarm_os.dispatch_c_suite(req.task_type, req.goal_brief)
    merkle_vault.record_decision("C_SUITE_DISPATCH", {"task_type": req.task_type, "certified": res["consensus_certified"]})
    await ws_manager.broadcast("c_suite_complete", {"task_type": req.task_type, "certified": res["consensus_certified"]})
    return res


# ---------------------------------------------------------------------------
# GraphRAG Knowledge Graph
# ---------------------------------------------------------------------------
@app.get("/api/graph-rag/graph")
def get_graph_rag_topology():
    return graph_rag.export_graph_topology()


@app.get("/api/graph-rag/query")
def query_graph_rag(node_id: str = "concept-percentage", max_hops: int = 2):
    return graph_rag.multi_hop_traverse(node_id, max_hops)


# ---------------------------------------------------------------------------
# Monte Carlo Tree Search (MCTS)
# ---------------------------------------------------------------------------
@app.post("/api/mcts/search")
def search_mcts(req: MCTSRequest):
    return mcts_engine.search(req.task_type)


# ---------------------------------------------------------------------------
# Synthetic Dataset & DPO Compiler
# ---------------------------------------------------------------------------
@app.get("/api/synthetic/dpo-dataset")
def export_synthetic_dpo_dataset():
    return synthetic_compiler.export_jsonl_dataset()


# ---------------------------------------------------------------------------
# Cryptographic Merkle Audit Vault
# ---------------------------------------------------------------------------
@app.get("/api/vault/audit-chain")
def get_audit_chain(limit: int = 20):
    return merkle_vault.get_audit_trail(limit=limit)


@app.get("/api/vault/verify")
def verify_audit_vault():
    return merkle_vault.verify_audit_integrity()


# ---------------------------------------------------------------------------
# Webhook & GitHub Auto-PR Dispatcher
# ---------------------------------------------------------------------------
@app.post("/api/webhooks/dispatch-pr")
def dispatch_github_pr(req: WebhookPRRequest):
    return webhook_bot.dispatch_github_auto_pr(
        patch_title=req.patch_title,
        code_diff=req.code_diff,
        task_type=req.task_type,
    )


# ---------------------------------------------------------------------------
# Asynchronous Dynamic DAG Agent Swarm
# ---------------------------------------------------------------------------
@app.post("/api/swarm/execute")
async def execute_swarm(req: SwarmRequest):
    await ws_manager.broadcast("swarm_start", {"goal": req.goal})
    res = await swarm_orchestrator.plan_and_execute(req.goal)
    await ws_manager.broadcast("swarm_complete", {"agents": res["total_agents"], "latency_ms": res["total_latency_ms"]})
    return res


# ---------------------------------------------------------------------------
# 4-Tier Cognitive Long-Term Memory (H-LTM)
# ---------------------------------------------------------------------------
@app.get("/api/cognitive-memory/status")
def get_cognitive_memory_status():
    return cognitive_memory.get_system_status()


@app.post("/api/cognitive-memory/consolidate")
def consolidate_cognitive_memory():
    return cognitive_memory.consolidate()


# ---------------------------------------------------------------------------
# Multi-LLM Dynamic Router & Cost Optimizer
# ---------------------------------------------------------------------------
@app.post("/api/router/evaluate")
def evaluate_llm_routing(req: RouterRequest):
    return llm_router.evaluate_and_route(task_type=req.task_type, prompt=req.prompt, max_latency_ms=req.max_latency_ms)


# ---------------------------------------------------------------------------
# Time-Travel Replay & Snapshot Debugger
# ---------------------------------------------------------------------------
@app.post("/api/replay/fork")
def fork_time_travel_timeline(req: ReplayForkRequest):
    return time_travel_debugger.fork_timeline(
        task_type=req.task_type,
        target_step=req.target_step,
        injected_lesson=req.injected_lesson,
    )


# ---------------------------------------------------------------------------
# Adversarial Red-Team Stress Fuzzer
# ---------------------------------------------------------------------------
@app.post("/api/fuzzer/run")
def run_adversarial_fuzzer():
    return adversarial_fuzzer.run_stress_suite()


# ---------------------------------------------------------------------------
# Multi-Modal Vision & Diagram Solver
# ---------------------------------------------------------------------------
@app.post("/api/vision/solve", response_model=VisionResponse)
async def solve_vision_diagram(req: VisionRequest):
    await ws_manager.broadcast("vision_analysis_start", {"hint": req.problem_hint})
    result = vision_agent.analyze_and_solve(image_data=req.image_data, problem_hint=req.problem_hint)
    await ws_manager.broadcast("vision_analysis_complete", {"task_type": result["inferred_task_type"], "is_correct": result["is_correct"]})
    return result


# ---------------------------------------------------------------------------
# Self-Modifying Code Patcher & Benchmarker
# ---------------------------------------------------------------------------
@app.post("/api/patcher/benchmark")
def benchmark_patch(req: PatchBenchmarkRequest):
    return code_patcher.analyze_and_benchmark(req.target_area)


@app.get("/api/patcher/patches")
def list_patches():
    return code_patcher.list_available_patches()


# ---------------------------------------------------------------------------
# Executive Report Generator
# ---------------------------------------------------------------------------
@app.get("/api/report/export")
def export_executive_report():
    html_content = generate_executive_report_html()
    return HTMLResponse(content=html_content)


# ---------------------------------------------------------------------------
# Tree-of-Thoughts (ToT)
# ---------------------------------------------------------------------------
@app.post("/api/tot/run", response_model=ToTResponse)
async def run_tree_of_thoughts(req: ToTRequest):
    if req.task_type not in task_bank.GENERATORS:
        raise HTTPException(status_code=400, detail=f"Unknown task_type '{req.task_type}'")
    await ws_manager.broadcast("tot_start", {"task_type": req.task_type, "branching_factor": req.branching_factor})
    result = tot_engine.solve(req.task_type, branching_factor=req.branching_factor)
    await ws_manager.broadcast("tot_complete", {"task_type": req.task_type, "is_correct": result["is_correct"]})
    return result


# ---------------------------------------------------------------------------
# Adversarial Debate Arena
# ---------------------------------------------------------------------------
@app.post("/api/debate/run", response_model=DebateResponse)
async def run_debate_arena(req: DebateRequest):
    if req.task_type not in task_bank.GENERATORS:
        raise HTTPException(status_code=400, detail=f"Unknown task_type '{req.task_type}'")
    await ws_manager.broadcast("debate_start", {"task_type": req.task_type, "rounds": req.rounds})
    result = debate_arena.conduct_debate(req.task_type, rounds=req.rounds)
    await ws_manager.broadcast("debate_complete", {"task_type": req.task_type, "is_correct": result["is_correct"]})
    return result


# ---------------------------------------------------------------------------
# Curiosity-Driven Self-Play (Autopilot)
# ---------------------------------------------------------------------------
@app.post("/api/self-play/step", response_model=SelfPlayResponse)
async def run_self_play_step(req: SelfPlayRequest):
    await ws_manager.broadcast("self_play_step_start", {"task_type": req.task_type or "auto"})
    result = self_play_engine.run_curiosity_cycle(req.task_type)
    await ws_manager.broadcast("self_play_step_complete", {
        "task_type": result["task_type"],
        "solved": result["solved"],
        "difficulty": result["difficulty"],
        "lessons_learned": result["lessons_learned"],
    })
    return result


@app.get("/api/self-play/history")
def get_self_play_history(limit: int = 20):
    return memory.get_self_play_history(limit=limit)


# ---------------------------------------------------------------------------
# Autonomous Tool Forge
# ---------------------------------------------------------------------------
@app.get("/api/tools/custom", response_model=list[CustomToolOut])
def get_custom_tools():
    return memory.get_custom_tools()


@app.post("/api/tools/create")
def create_custom_tool(req: CustomToolCreateRequest):
    res = synthesize_and_register_tool(
        name=req.name,
        description=req.description,
        code=req.code,
        parameters=req.parameters,
        test_input=req.test_input,
    )
    if not res["success"]:
        raise HTTPException(status_code=400, detail=res["error"])
    return res


@app.post("/api/tools/execute")
def execute_tool_endpoint(req: CustomToolExecuteRequest):
    res = execute_custom_tool(name=req.name, kwargs=req.arguments)
    if not res["success"]:
        raise HTTPException(status_code=400, detail=res["error"])
    return res


# ---------------------------------------------------------------------------
# Memory endpoints
# ---------------------------------------------------------------------------
@app.get("/api/memory", response_model=list[LessonOut])
def get_memory():
    return memory.get_all_lessons()


@app.delete("/api/lessons/{lesson_id}")
def delete_lesson(lesson_id: int):
    from .vector_memory import delete_lesson as vm_delete
    ok = memory.delete_lesson(lesson_id)
    if not ok:
        raise HTTPException(status_code=404, detail=f"Lesson {lesson_id} not found")
    vm_delete(lesson_id)
    return {"status": "deleted", "lesson_id": lesson_id}


@app.post("/api/memory/reset")
async def reset_memory():
    memory.reset_memory()
    await ws_manager.broadcast("memory_reset", {})
    return {"status": "reset"}


@app.get("/api/memory/export")
def export_memory():
    lessons = memory.export_lessons()
    return {"version": "1.0", "lessons": lessons, "metadata": {"count": len(lessons)}}


@app.post("/api/memory/import")
def import_memory(body: dict):
    lessons = body.get("lessons", [])
    if not isinstance(lessons, list):
        raise HTTPException(status_code=400, detail="'lessons' must be a list")
    count = memory.import_lessons(lessons)
    return {"status": "imported", "count": count}


@app.get("/api/memory/semantic-search")
def semantic_search_endpoint(q: str, top_k: int = 5):
    if not q.strip():
        raise HTTPException(status_code=400, detail="Query 'q' is required")
    results = semantic_search(q, top_k=min(top_k, 20))
    return {"query": q, "results": results, "vector_search": VECTOR_MEMORY_ENABLED}


@app.post("/api/memory/prune")
def prune_lessons(min_uses: int = 5):
    count = memory.prune_ineffective_lessons(min_uses=min_uses)
    return {"status": "pruned", "count": count}


# ---------------------------------------------------------------------------
# Provider Settings & Dynamic Switching
# ---------------------------------------------------------------------------
@app.post("/api/settings/provider")
def update_provider_settings(req: ProviderSettingsRequest):
    global llm_provider, agent
    if req.provider == "gemini":
        if req.api_key:
            os.environ["GEMINI_API_KEY"] = req.api_key
        from .llm import GeminiLLM
        key = req.api_key or os.environ.get("GEMINI_API_KEY", "")
        llm_provider = GeminiLLM(api_key=key) if key else llm_provider
    elif req.provider == "openai":
        if req.api_key:
            os.environ["OPENAI_API_KEY"] = req.api_key
        from .llm import OpenAILLM
        key = req.api_key or os.environ.get("OPENAI_API_KEY", "")
        llm_provider = OpenAILLM(api_key=key) if key else llm_provider
    elif req.provider == "anthropic":
        if req.api_key:
            os.environ["ANTHROPIC_API_KEY"] = req.api_key
        from .llm import AnthropicLLM
        key = req.api_key or os.environ.get("ANTHROPIC_API_KEY", "")
        llm_provider = AnthropicLLM(api_key=key) if key else llm_provider
    elif req.provider == "ollama":
        url = req.ollama_url or "http://localhost:11434"
        os.environ["OLLAMA_BASE_URL"] = url
        from .llm import OllamaLLM
        llm_provider = OllamaLLM(base_url=url)
    else:
        from .llm import MockLLM
        llm_provider = MockLLM()

    agent.llm = llm_provider
    return {
        "status": "success",
        "active_provider": llm_provider.name,
        "message": f"Successfully activated '{llm_provider.name}' provider.",
    }


# ---------------------------------------------------------------------------
# Stats & Meta-analysis
# ---------------------------------------------------------------------------
@app.get("/api/stats")
def stats():
    return {
        "by_task_type": memory.get_stats(),
        "summary": memory.get_summary(),
    }


@app.get("/api/meta")
def meta_analysis():
    return meta_learner.analyze()


@app.post("/api/meta/auto-prune")
def auto_prune(min_uses: int = 5):
    count = meta_learner.auto_prune(min_uses=min_uses)
    return {"status": "pruned", "count": count}


# ---------------------------------------------------------------------------
# WebSocket
# ---------------------------------------------------------------------------
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        await ws_manager.send_personal(websocket, "connected", {
            "llm_provider": llm_provider.name,
            "vector_memory": VECTOR_MEMORY_ENABLED,
            "task_count": len(task_bank.GENERATORS),
            "custom_tools": len(memory.get_custom_tools()),
            "merkle_blocks": len(merkle_vault.chain),
        })
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await ws_manager.send_personal(websocket, "pong", {})
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=int(os.environ.get("PORT", 8000)), reload=True)
