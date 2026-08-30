"""
Comprehensive unit & API tests for Next-Gen Agentic AI modules:
- Tree of Thoughts (ToT) Engine
- Adversarial Debate Arena
- Curiosity Self-Play Engine
- Autonomous Tool Forge & Sandboxed Synthesis
- Next-Gen REST API Endpoints
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.tot_engine import TreeOfThoughtsEngine
from app.debate import DebateArena
from app.self_play import SelfPlayEngine
from app.tool_maker import synthesize_and_register_tool, validate_tool_code_safety, execute_custom_tool
from app import memory


@pytest.fixture(autouse=True)
def clean_memory():
    memory.reset_memory()
    yield
    memory.reset_memory()


# ---------------------------------------------------------------------------
# Tree of Thoughts (ToT) Tests
# ---------------------------------------------------------------------------
def test_tot_engine_structure():
    engine = TreeOfThoughtsEngine(branching_factor=3)
    result = engine.solve("percentage_discount")

    assert "tree_nodes" in result
    assert len(result["tree_nodes"]) >= 4
    assert "winning_node_id" in result
    assert "winning_path" in result
    assert result["tree_stats"]["total_nodes"] >= 4


def test_tot_learning_with_memory():
    # First, store a lesson
    memory.store_lesson(
        "percentage_discount",
        "percent_as_flat_subtraction",
        "Multiply price by (1 - discount/100).",
    )
    engine = TreeOfThoughtsEngine()
    result = engine.solve("percentage_discount")
    assert result["is_correct"] is True
    assert result["tree_stats"]["max_score"] >= 80.0


# ---------------------------------------------------------------------------
# Adversarial Debate Arena Tests
# ---------------------------------------------------------------------------
def test_debate_arena_council():
    arena = DebateArena(rounds=2)
    result = arena.conduct_debate("compound_interest")

    assert "transcript" in result
    assert len(result["transcript"]) == 4  # Round 1 Proposal + Adversary, Round 2 Rebuttal + Judge
    assert result["transcript"][0]["role"] == "proposer"
    assert result["transcript"][1]["role"] == "adversary"
    assert result["transcript"][3]["role"] == "judge"
    assert result["consensus_score"] > 0.5


# ---------------------------------------------------------------------------
# Curiosity Self-Play Tests
# ---------------------------------------------------------------------------
def test_self_play_curiosity_cycle():
    engine = SelfPlayEngine()
    result = engine.run_curiosity_cycle("km_to_miles")

    assert "session_id" in result
    assert result["difficulty"] in ["Novice", "Intermediate", "Advanced", "Grandmaster"]
    assert "prompt" in result
    assert len(result["trace"]) >= 1

    # Check persistence
    history = memory.get_self_play_history()
    assert len(history) >= 1


# ---------------------------------------------------------------------------
# Tool Forge & Synthesis Tests
# ---------------------------------------------------------------------------
def test_tool_safety_ast_validation():
    # Dangerous code
    bad_code = "import os\ndef run_tool(): os.system('calc')"
    safe, msg = validate_tool_code_safety(bad_code)
    assert safe is False
    assert "Prohibited module" in msg

    # Safe code
    good_code = "def run_tool(x, y):\n    return x + y\n"
    safe, msg = validate_tool_code_safety(good_code)
    assert safe is True


def test_tool_synthesizer_and_execution():
    code = """
def run_tool(a, b):
    return int(a) * int(b) + 7
"""
    res = synthesize_and_register_tool(
        name="custom_multiply_add7",
        description="Multiplies two numbers and adds 7",
        code=code,
        parameters={"a": "number", "b": "number"},
        test_input={"a": 3, "b": 4},
    )
    assert res["success"] is True
    assert "tool" in res

    # Test execution
    exec_res = execute_custom_tool("custom_multiply_add7", {"a": 5, "b": 10})
    assert exec_res["success"] is True
    assert exec_res["result"] == 57


# ---------------------------------------------------------------------------
# REST API Tests for Next-Gen Endpoints
# ---------------------------------------------------------------------------
def test_api_tot_run():
    client = TestClient(app)
    res = client.post("/api/tot/run", json={"task_type": "percentage_discount"})
    assert res.status_code == 200
    data = res.json()
    assert "tree_nodes" in data
    assert "winning_path" in data


def test_api_debate_run():
    client = TestClient(app)
    res = client.post("/api/debate/run", json={"task_type": "area_composite", "rounds": 2})
    assert res.status_code == 200
    data = res.json()
    assert "transcript" in data
    assert "consensus_score" in data


def test_api_self_play_step():
    client = TestClient(app)
    res = client.post("/api/self-play/step", json={})
    assert res.status_code == 200
    data = res.json()
    assert "session_id" in data
    assert "difficulty" in data


def test_api_custom_tools_lifecycle():
    client = TestClient(app)
    # 1. List tools
    res = client.get("/api/tools/custom")
    assert res.status_code == 200

    # 2. Create tool
    create_payload = {
        "name": "api_power_tool",
        "description": "Calculates power",
        "code": "def run_tool(base, exp):\n    return int(base) ** int(exp)",
        "parameters": {"base": "int", "exp": "int"},
        "test_input": {"base": 2, "exp": 3},
    }
    res = client.post("/api/tools/create", json=create_payload)
    assert res.status_code == 200

    # 3. Execute tool
    res = client.post("/api/tools/execute", json={"name": "api_power_tool", "arguments": {"base": 3, "exp": 4}})
    assert res.status_code == 200
    assert res.json()["result"] == 81
