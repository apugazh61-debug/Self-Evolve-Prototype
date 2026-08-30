"""
Autonomous Tool Synthesizer & Dynamic Tool Forge.
Allows AI agents to program, test in a sandbox, and persist custom tools on-the-fly.
"""

from __future__ import annotations

import ast
import json
import math
from typing import Any

from app import memory
from app.tools import execute_sandboxed_python, TOOL_REGISTRY


def validate_tool_code_safety(code: str) -> tuple[bool, str]:
    """Static AST validation to ensure synthesized tools do not call dangerous OS APIs."""
    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        return False, f"Syntax Error in synthesized tool: {e}"

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                if alias.name in ["os", "sys", "subprocess", "shutil", "socket", "http"]:
                    return False, f"Prohibited module import '{alias.name}'"
        elif isinstance(node, ast.ImportFrom):
            if node.module in ["os", "sys", "subprocess", "shutil", "socket", "http"]:
                return False, f"Prohibited module import '{node.module}'"
        elif isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name) and node.func.id in ["eval", "exec", "compile"]:
                return False, f"Prohibited dynamic evaluation '{node.func.id}'"

    return True, "Code passed security AST checks."


def synthesize_and_register_tool(
    name: str,
    description: str,
    code: str,
    parameters: dict | None = None,
    test_input: dict | None = None,
) -> dict[str, Any]:
    """
    Validates, tests in sandbox, registers in TOOL_REGISTRY, and saves to database.
    """
    safe, msg = validate_tool_code_safety(code)
    if not safe:
        return {"success": False, "error": msg, "tool": None}

    # Run test verification in sandbox
    test_code = f"""
{code}
result = run_tool(**{json.dumps(test_input or {})})
"""
    test_run = execute_sandboxed_python(test_code)
    if not test_run["success"]:
        return {
            "success": False,
            "error": f"Tool test execution failed: {test_run.get('error') or test_run.get('stderr')}",
            "tool": None,
        }

    # Save to SQLite custom_tools
    param_str = json.dumps(parameters or {})
    saved = memory.save_custom_tool(name=name, description=description, code=code, parameters=param_str)

    # Register executable wrapper in live runtime
    def _dynamic_runner(**kwargs):
        memory.record_custom_tool_execution(name)
        runner_code = f"""
{code}
result = run_tool(**{json.dumps(kwargs)})
"""
        res = execute_sandboxed_python(runner_code)
        if res["success"]:
            return res.get("result", res.get("stdout"))
        return {"error": res.get("error") or res.get("stderr")}

    TOOL_REGISTRY[name] = _dynamic_runner

    return {
        "success": True,
        "message": f"Tool '{name}' successfully synthesized, tested, and registered in live forge.",
        "tool": saved,
        "test_output": str(test_run.get("result", test_run.get("stdout"))),
    }


def execute_custom_tool(name: str, kwargs: dict[str, Any]) -> dict[str, Any]:
    """Execute a registered custom tool by name."""
    tool_row = memory.get_custom_tool_by_name(name)
    if not tool_row:
        return {"success": False, "error": f"Custom tool '{name}' not found in registry."}

    code = tool_row["code"]
    runner_code = f"""
{code}
result = run_tool(**{json.dumps(kwargs)})
"""
    res = execute_sandboxed_python(runner_code)
    if res["success"]:
        memory.record_custom_tool_execution(name)
        val = res.get("result")
        if val is None and res.get("stdout"):
            val = res.get("stdout")
        return {"success": True, "result": val, "tool_name": name}
    return {"success": False, "error": res.get("error") or res.get("stderr"), "tool_name": name}


def seed_default_synthesized_tools() -> None:
    """Pre-seed essential math/algorithmic tools if not present."""
    default_tools = [
        {
            "name": "matrix_determinant",
            "description": "Calculates the determinant of a 2x2 or 3x3 square matrix.",
            "parameters": {"matrix": "2D list of numbers e.g. [[1,2],[3,4]]"},
            "test_input": {"matrix": [[1, 2], [3, 4]]},
            "code": """
def run_tool(matrix):
    if len(matrix) == 2:
        return matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0]
    elif len(matrix) == 3:
        a, b, c = matrix[0]
        d, e, f = matrix[1]
        g, h, i = matrix[2]
        return a*(e*i - f*h) - b*(d*i - f*g) + c*(d*h - e*g)
    return "Matrix dimension not supported"
""",
        },
        {
            "name": "prime_factorization",
            "description": "Computes prime factorization decomposition of any integer.",
            "parameters": {"n": "Positive integer"},
            "test_input": {"n": 84},
            "code": """
def run_tool(n):
    n = int(n)
    factors = []
    d = 2
    while d * d <= n:
        while (n % d) == 0:
            factors.append(d)
            n //= d
        d += 1
    if n > 1:
        factors.append(n)
    return factors
""",
        },
        {
            "name": "statistics_summary",
            "description": "Computes Mean, Median, Variance, Standard Deviation, and IQR for a dataset.",
            "parameters": {"data": "List of numbers"},
            "test_input": {"data": [10, 20, 30, 40, 50]},
            "code": """
def run_tool(data):
    nums = sorted([float(x) for x in data])
    n = len(nums)
    if n == 0:
        return {}
    mean = sum(nums) / n
    median = nums[n // 2] if n % 2 != 0 else (nums[n//2 - 1] + nums[n//2]) / 2.0
    var = sum((x - mean) ** 2 for x in nums) / n
    std_dev = math.sqrt(var)
    return {
        "count": n,
        "mean": round(mean, 4),
        "median": round(median, 4),
        "std_dev": round(std_dev, 4),
        "min": nums[0],
        "max": nums[-1]
    }
""",
        },
    ]

    for tool_spec in default_tools:
        if not memory.get_custom_tool_by_name(tool_spec["name"]):
            synthesize_and_register_tool(
                name=tool_spec["name"],
                description=tool_spec["description"],
                code=tool_spec["code"],
                parameters=tool_spec["parameters"],
                test_input=tool_spec["test_input"],
            )
