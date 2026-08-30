import os
import sys
import tempfile

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Use a throwaway DB file for tests, isolated from the real one.
_tmp_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
os.environ["SELF_EVOLVE_DB"] = _tmp_db.name

from app import memory, tasks as task_bank  # noqa: E402
from app.agent import ReflexionAgent  # noqa: E402
from app.llm import MockLLM  # noqa: E402
from app.tools import execute_tool  # noqa: E402


@pytest.fixture(autouse=True)
def clean_db():
    memory.init_db()
    memory.reset_memory()
    yield
    memory.reset_memory()


def test_task_generation_is_verifiable():
    for task_type in task_bank.GENERATORS:
        task = task_bank.generate_task(task_type)
        assert task.verify(task.correct_answer) is True
        assert task.verify(task.correct_answer + 10_000) is False


def test_flawed_solver_differs_from_correct_solver():
    for task_type, solver in task_bank.SOLVERS.items():
        task = task_bank.generate_task(task_type)
        flawed = solver(task.params, apply_lesson=False)
        corrected = solver(task.params, apply_lesson=True)
        assert corrected == pytest.approx(task.correct_answer, abs=task.tolerance)
        # the flawed solver must actually be wrong for this to be a meaningful demo
        assert abs(flawed - task.correct_answer) > task.tolerance


def test_agent_fails_first_then_self_corrects():
    agent = ReflexionAgent(llm_provider=MockLLM())
    result = agent.run("percentage_discount", max_iterations=3)

    assert result["success"] is True
    assert result["iterations_used"] >= 2  # must fail once before correcting
    assert result["trace"][0]["success"] is False
    assert result["trace"][-1]["success"] is True
    assert result["trace"][0]["lesson_stored"] is not None


def test_lesson_persists_and_helps_future_runs():
    agent = ReflexionAgent(llm_provider=MockLLM())

    first = agent.run("km_to_miles", max_iterations=3)
    assert first["success"] is True
    assert first["iterations_used"] >= 2

    # a brand new task instance of the SAME type should now succeed
    # on the very first attempt, because the lesson is already in memory
    second = agent.run("km_to_miles", max_iterations=3)
    assert second["success"] is True
    assert second["iterations_used"] == 1
    assert second["trace"][0]["success"] is True


def test_multi_agent_mode_runs_successfully():
    agent = ReflexionAgent(llm_provider=MockLLM())
    result = agent.run("percentage_discount", max_iterations=3, agent_mode="multi")

    assert result["success"] is True
    assert result["agent_mode"] == "multi"
    assert result["trace"][0]["solver"] is not None
    assert result["trace"][0]["critic"] is not None


def test_reset_memory_clears_lessons():
    agent = ReflexionAgent(llm_provider=MockLLM())
    agent.run("last_n_index", max_iterations=3)
    assert len(memory.get_all_lessons()) > 0

    memory.reset_memory()
    assert len(memory.get_all_lessons()) == 0


def test_all_10_task_types_eventually_succeed():
    agent = ReflexionAgent(llm_provider=MockLLM())
    assert len(task_bank.GENERATORS) == 10
    for task_type in task_bank.GENERATORS:
        result = agent.run(task_type, max_iterations=3)
        assert result["success"] is True


def test_tools_execution():
    calc = execute_tool("calculator", "10 * 5 + 2")
    assert calc["success"] is True
    assert calc["output"] == "52"

    py = execute_tool("python_exec", "result = sum([1, 2, 3, 4, 5])")
    assert py["success"] is True
    assert py["output"] == "15"
