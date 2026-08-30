import os
import sys
import tempfile

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

_tmp_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
os.environ["SELF_EVOLVE_DB"] = _tmp_db.name
os.environ["LLM_PROVIDER"] = "mock"

from fastapi.testclient import TestClient  # noqa: E402
from app.main import app  # noqa: E402

client = TestClient(app)


def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"
    assert "llm_provider" in res.json()


def test_list_tasks():
    res = client.get("/api/tasks")
    assert res.status_code == 200
    ids = [t["id"] for t in res.json()]
    assert len(ids) == 10
    assert "percentage_discount" in ids
    assert "compound_interest" in ids
    assert "roman_numeral" in ids


def test_run_endpoint():
    res = client.post("/api/run", json={"task_type": "percentage_discount", "max_iterations": 3})
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert len(data["trace"]) >= 1


def test_run_endpoint_multi_agent():
    res = client.post("/api/run", json={"task_type": "km_to_miles", "max_iterations": 3, "agent_mode": "multi"})
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["agent_mode"] == "multi"


def test_run_endpoint_unknown_task_type():
    res = client.post("/api/run", json={"task_type": "not_a_real_task", "max_iterations": 3})
    assert res.status_code == 400


def test_memory_and_reset_endpoints():
    client.post("/api/run", json={"task_type": "last_n_index", "max_iterations": 3})
    res = client.get("/api/memory")
    assert res.status_code == 200
    assert len(res.json()) >= 1

    res = client.post("/api/memory/reset")
    assert res.status_code == 200
    res = client.get("/api/memory")
    assert res.json() == []


def test_semantic_search_and_export_import():
    client.post("/api/run", json={"task_type": "compound_interest", "max_iterations": 3})
    
    # Semantic search
    res = client.get("/api/memory/semantic-search?q=interest+rate")
    assert res.status_code == 200
    assert "results" in res.json()

    # Export
    res = client.get("/api/memory/export")
    assert res.status_code == 200
    export_data = res.json()
    assert "lessons" in export_data

    # Import
    res = client.post("/api/memory/import", json=export_data)
    assert res.status_code == 200
    assert "count" in res.json()


def test_meta_analysis_endpoint():
    client.post("/api/run", json={"task_type": "binary_to_decimal", "max_iterations": 3})
    res = client.get("/api/meta")
    assert res.status_code == 200
    data = res.json()
    assert "total_runs" in data
    assert "recommendations" in data
