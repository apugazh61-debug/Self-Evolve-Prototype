"""
Comprehensive unit & API tests for Enterprise Suite:
- C-Suite Swarm OS (CEO, CTO, CFO, CISO, QA)
- GraphRAG Neuromorphic Knowledge Graph & PageRank
- Monte Carlo Tree Search (MCTS) Engine
- Synthetic DPO Dataset Compiler
- Cryptographic Merkle Audit Vault
- Webhook & GitHub Auto-PR Dispatcher
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.swarm_os import c_suite_swarm_os
from app.graph_rag import graph_rag
from app.mcts_engine import mcts_engine
from app.synthetic_compiler import synthetic_compiler
from app.merkle_vault import merkle_vault
from app.webhook_bot import webhook_bot
from app import memory


@pytest.fixture(autouse=True)
def clean_memory():
    memory.reset_memory()
    yield
    memory.reset_memory()


# ---------------------------------------------------------------------------
# C-Suite Swarm OS Tests
# ---------------------------------------------------------------------------
def test_c_suite_swarm_os_dispatch():
    res = c_suite_swarm_os.dispatch_c_suite("compound_interest", "Audit corporate investment")
    assert len(res["c_suite_council"]) == 5
    assert res["consensus_certified"] is True
    assert res["governance_status"] == "EXECUTIVE_COUNCIL_UNANIMOUS_APPROVAL"


# ---------------------------------------------------------------------------
# GraphRAG Tests
# ---------------------------------------------------------------------------
def test_graph_rag_topology_and_pagerank():
    topo = graph_rag.export_graph_topology()
    assert topo["total_nodes"] >= 10
    assert topo["total_edges"] >= 6
    assert len(topo["top_central_hubs"]) >= 1

    traverse = graph_rag.multi_hop_traverse("concept-percentage", max_hops=2)
    assert traverse["connected_subgraph_size"] >= 1


# ---------------------------------------------------------------------------
# MCTS Tests
# ---------------------------------------------------------------------------
def test_mcts_engine_search():
    res = mcts_engine.search("percentage_discount")
    assert res["simulations_executed"] >= 50
    assert len(res["mcts_tree_stats"]) == 3
    assert res["optimal_solution"] == res["ground_truth"]


# ---------------------------------------------------------------------------
# Synthetic DPO Compiler Tests
# ---------------------------------------------------------------------------
def test_synthetic_dpo_compiler():
    dpo_data = synthetic_compiler.export_jsonl_dataset()
    assert dpo_data["total_pairs"] >= 4
    assert "Direct Preference Optimization" in dpo_data["dataset_format"]
    assert len(dpo_data["sample_jsonl_record"]) > 10


# ---------------------------------------------------------------------------
# Cryptographic Merkle Vault Tests
# ---------------------------------------------------------------------------
def test_merkle_audit_vault_integrity():
    h1 = merkle_vault.record_decision("UNIT_TEST_DECISION", {"status": "SUCCESS", "accuracy": 1.0})
    assert len(h1) == 64  # SHA-256 length

    root = merkle_vault.compute_merkle_root()
    assert len(root) == 64

    integrity = merkle_vault.verify_audit_integrity()
    assert integrity["valid"] is True
    assert "PRISTINE" in integrity["status"]


# ---------------------------------------------------------------------------
# Webhook Auto-PR Tests
# ---------------------------------------------------------------------------
def test_webhook_auto_pr_payload():
    res = webhook_bot.dispatch_github_auto_pr(
        patch_title="Strict Percentage Fix",
        code_diff="- price - discount\n+ price * (1 - discount/100)",
        task_type="percentage_discount",
    )
    assert res["dispatched"] is True
    assert "pr_number" in res["github_pr"]
    assert "OPEN" in res["github_pr"]["status"]


# ---------------------------------------------------------------------------
# Enterprise REST API Tests
# ---------------------------------------------------------------------------
def test_api_swarm_os_dispatch():
    client = TestClient(app)
    res = client.post("/api/swarm-os/dispatch", json={"task_type": "percentage_discount"})
    assert res.status_code == 200
    data = res.json()
    assert data["consensus_certified"] is True
    assert len(data["c_suite_council"]) == 5


def test_api_graph_rag_endpoints():
    client = TestClient(app)
    res_topo = client.get("/api/graph-rag/graph")
    assert res_topo.status_code == 200
    assert res_topo.json()["total_nodes"] >= 10

    res_query = client.get("/api/graph-rag/query?node_id=concept-percentage&max_hops=2")
    assert res_query.status_code == 200


def test_api_mcts_search():
    client = TestClient(app)
    res = client.post("/api/mcts/search", json={"task_type": "km_to_miles", "simulations": 30})
    assert res.status_code == 200
    assert "optimal_solution" in res.json()


def test_api_synthetic_dpo_dataset():
    client = TestClient(app)
    res = client.get("/api/synthetic/dpo-dataset")
    assert res.status_code == 200
    assert res.json()["total_pairs"] >= 4


def test_api_merkle_vault_endpoints():
    client = TestClient(app)
    res_verify = client.get("/api/vault/verify")
    assert res_verify.status_code == 200
    assert res_verify.json()["valid"] is True

    res_chain = client.get("/api/vault/audit-chain")
    assert res_chain.status_code == 200
    assert len(res_chain.json()) >= 1


def test_api_webhook_dispatch_pr():
    client = TestClient(app)
    res = client.post("/api/webhooks/dispatch-pr", json={
        "patch_title": "Automated Exponential Fix",
        "code_diff": "+ p * (1+r/100)**n",
        "task_type": "compound_interest",
    })
    assert res.status_code == 200
    assert res.json()["dispatched"] is True


def test_api_settings_provider():
    client = TestClient(app)
    res = client.post("/api/settings/provider", json={"provider": "mock"})
    assert res.status_code == 200
    assert res.json()["status"] == "success"
    assert res.json()["active_provider"] == "mock"
