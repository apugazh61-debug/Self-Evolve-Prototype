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
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from . import memory
from . import meta_learner
from .agent import ReflexionAgent
from .llm import get_llm_provider
from .schemas import (
    ExportData, LessonOut, MetaAnalysis, RunRequest, RunResponse, TaskTypeOut,
    ToTRequest, ToTResponse, DebateRequest, DebateResponse,
    SelfPlayRequest, SelfPlayResponse, CustomToolCreateRequest, CustomToolExecuteRequest, CustomToolOut,
)
from . import tasks as task_bank
from .tot_engine import TreeOfThoughtsEngine
from .debate import DebateArena
from .self_play import SelfPlayEngine
from .tool_maker import synthesize_and_register_tool, execute_custom_tool, seed_default_synthesized_tools
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
    title="Self-Evolve API v1.0",
    description="Autonomous Agentic AI platform with Tree-of-Thoughts, Multi-Agent Debate Arena, Curiosity Self-Play, and Tool Forge.",
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
    }


# ---------------------------------------------------------------------------
# Tasks
# ---------------------------------------------------------------------------
@app.get("/api/tasks", response_model=list[TaskTypeOut])
def list_tasks():
    return [{"id": k, "description": v} for k, v in task_bank.TASK_DESCRIPTIONS.items()]


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
                on_event=on_event,
            )
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
# Tree-of-Thoughts (ToT)
# ---------------------------------------------------------------------------
@app.post("/api/tot/run", response_model=ToTResponse)
async def run_tree_of_thoughts(req: ToTRequest):
    if req.task_type not in task_bank.GENERATORS:
        raise HTTPException(status_code=400, detail=f"Unknown task_type '{req.task_type}'")
    await ws_manager.broadcast("tot_start", {"task_type": req.task_type})
    result = tot_engine.solve(req.task_type)
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
    result = debate_arena.conduct_debate(req.task_type)
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
