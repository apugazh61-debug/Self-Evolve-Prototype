"""
Comprehensive unit & API tests for Enterprise Backend Modules:
- Asynchronous Dynamic DAG Agent Swarm
- 4-Tier Cognitive Long-Term Memory (H-LTM) & Ebbinghaus Decay
- Multi-LLM Dynamic Router & Cascading Failover
- Time-Travel Replay & Snapshot Debugger
- Adversarial Red-Team Stress Fuzzer
"""

import asyncio
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.swarm_dag import SwarmOrchestrator
from app.cognitive_memory import cognitive_memory
from app.llm_router import llm_router
from app.time_travel import time_travel_debugger
from app.fuzzer import adversarial_fuzzer
from app import memory


@pytest.fixture(autouse=True)
def clean_memory():
    memory.reset_memory()
    yield
    memory.reset_memory()


# ---------------------------------------------------------------------------
# Swarm DAG Tests
# ---------------------------------------------------------------------------
def test_swarm_dag_parallel_execution():
    orchestrator = SwarmOrchestrator()
    res = asyncio.run(orchestrator.plan_and_execute(goal="Quarterly Audit"))

    assert res["total_agents"] == 4
    assert len(res["execution_waves"]) == 3
    assert "node-1" in res["node_outputs"]
    assert "node-4" in res["node_outputs"]
    assert res["total_latency_ms"] >= 0


# ---------------------------------------------------------------------------
# 4-Tier Cognitive Memory Tests
# ---------------------------------------------------------------------------
def test_cognitive_memory_tiers():
    cognitive_memory.set_working("scratchpad_calc_1", 420.50)
    assert cognitive_memory.get_working("scratchpad_calc_1") == 420.50

    status = cognitive_memory.get_system_status()
    assert "tier_1_working_memory" in status
    assert "tier_2_episodic_memory" in status
    assert "tier_3_semantic_memory" in status
    assert "tier_4_procedural_memory" in status
    assert status["ebbinghaus_metrics"]["forgetting_curve_active"] is True

    # Consolidate
    cons = cognitive_memory.consolidate()
    assert cons["consolidated"] is True
    assert cognitive_memory.get_working("scratchpad_calc_1") is None


# ---------------------------------------------------------------------------
# Multi-LLM Router Tests
# ---------------------------------------------------------------------------
def test_llm_dynamic_router():
    # Simple task -> local_fast
    res_simple = llm_router.evaluate_and_route("km_to_miles", "Convert 10 km")
    assert res_simple["assigned_tier"] == "local_fast"

    # Complex task -> frontier_deep
    res_complex = llm_router.evaluate_and_route("area_composite", "Composite semicircle with rectangle")
    assert res_complex["assigned_tier"] == "frontier_deep"
    assert len(res_complex["failover_cascade"]) == 2


# ---------------------------------------------------------------------------
# Time-Travel Replay & Snapshot Tests
# ---------------------------------------------------------------------------
def test_time_travel_replay_and_fork():
    snap_id = time_travel_debugger.record_checkpoint(1, "percentage_discount", "Price $250, 20% off", {"answer": 230})
    assert snap_id.startswith("SNAP-")

    fork_res = time_travel_debugger.fork_timeline("percentage_discount", target_step=1)
    assert fork_res["fork_id"].startswith("FORK-")
    assert fork_res["timeline_comparison"]["divergence_observed"] is True
    assert fork_res["timeline_comparison"]["accuracy_in_forked_timeline"] == "100% (SOLVED)"


# ---------------------------------------------------------------------------
# Adversarial Red-Team Fuzzer Tests
# ---------------------------------------------------------------------------
def test_adversarial_stress_fuzzer():
    res = adversarial_fuzzer.run_stress_suite()
    assert res["total_fuzz_vectors"] >= 4
    assert res["passed_safely"] == res["total_fuzz_vectors"]
    assert res["resilience_score"] == "100%"


# ---------------------------------------------------------------------------
# REST API Tests for Enterprise Endpoints
# ---------------------------------------------------------------------------
def test_api_swarm_execute():
    client = TestClient(app)
    res = client.post("/api/swarm/execute", json={"goal": "Global Supply Audit"})
    assert res.status_code == 200
    data = res.json()
    assert data["total_agents"] == 4
    assert "node_outputs" in data


def test_api_cognitive_memory_endpoints():
    client = TestClient(app)
    # Status
    res_status = client.get("/api/cognitive-memory/status")
    assert res_status.status_code == 200
    assert "tier_1_working_memory" in res_status.json()

    # Consolidate
    res_cons = client.post("/api/cognitive-memory/consolidate")
    assert res_cons.status_code == 200
    assert res_cons.json()["consolidated"] is True


def test_api_router_evaluate():
    client = TestClient(app)
    res = client.post("/api/router/evaluate", json={"task_type": "compound_interest"})
    assert res.status_code == 200
    assert "assigned_tier" in res.json()


def test_api_replay_fork():
    client = TestClient(app)
    res = client.post("/api/replay/fork", json={"task_type": "percentage_discount", "target_step": 1})
    assert res.status_code == 200
    assert res.json()["timeline_comparison"]["divergence_observed"] is True


def test_api_fuzzer_run():
    client = TestClient(app)
    res = client.post("/api/fuzzer/run")
    assert res.status_code == 200
    assert res.json()["resilience_score"] == "100%"
