"""
Tool executor for the Self-Evolve agent.

Provides sandboxed tool execution:
  - calculator   : safe math expression evaluator
  - python_exec  : sandboxed Python code runner
  - web_search   : mock structured web search results
"""

from __future__ import annotations

import io
import math
import sys
from typing import Any


# ---------------------------------------------------------------------------
# Tool implementations
# ---------------------------------------------------------------------------

def run_calculator(expression: str) -> dict:
    """Evaluate a math expression safely."""
    safe_names: dict[str, Any] = {k: v for k, v in math.__dict__.items() if not k.startswith("__")}
    safe_names.update({"abs": abs, "round": round, "min": min, "max": max, "sum": sum, "pow": pow})

    forbidden = ["import", "exec", "eval", "open", "__", "os", "sys", "subprocess"]
    for token in forbidden:
        if token in expression:
            return {"tool": "calculator", "input": expression,
                    "output": f"Forbidden token: '{token}'", "success": False}
    try:
        result = eval(expression, {"__builtins__": {}}, safe_names)
        return {"tool": "calculator", "input": expression, "output": str(result), "success": True}
    except Exception as exc:
        return {"tool": "calculator", "input": expression, "output": f"Error: {exc}", "success": False}


def execute_sandboxed_python(code: str) -> dict[str, Any]:
    """Execute Python code in a restricted namespace, capturing stdout and stderr."""
    forbidden = ["import os", "import sys", "open(", "subprocess", "__import__",
                 "exec(", "eval(", "compile(", "globals(", "locals("]
    for token in forbidden:
        if token in code:
            return {"success": False, "stdout": "", "stderr": f"Forbidden token: '{token}'", "error": f"Forbidden token: '{token}'"}

    safe_builtins = {
        "print": print, "range": range, "len": len, "int": int, "float": float,
        "str": str, "list": list, "dict": dict, "set": set, "tuple": tuple,
        "sum": sum, "abs": abs, "round": round, "min": min, "max": max,
        "sorted": sorted, "enumerate": enumerate, "zip": zip,
        "math": math, "True": True, "False": False, "None": None, "json": __import__("json"),
    }

    old_stdout = sys.stdout
    old_stderr = sys.stderr
    sys.stdout = out_buffer = io.StringIO()
    sys.stderr = err_buffer = io.StringIO()
    try:
        local_ns: dict = {}
        exec(code, {"__builtins__": safe_builtins}, local_ns)
        stdout_val = out_buffer.getvalue().strip()
        stderr_val = err_buffer.getvalue().strip()
        return {
            "success": True,
            "stdout": stdout_val,
            "stderr": stderr_val,
            "result": local_ns.get("result", None),
        }
    except Exception as exc:
        return {
            "success": False,
            "stdout": out_buffer.getvalue().strip(),
            "stderr": str(exc),
            "error": f"{type(exc).__name__}: {exc}",
        }
    finally:
        sys.stdout = old_stdout
        sys.stderr = old_stderr


def run_python_exec(code: str) -> dict:
    """Execute a small Python snippet in a restricted namespace."""
    res = execute_sandboxed_python(code)
    if res["success"]:
        output = res["stdout"] or str(res.get("result", "(no output)"))
        return {"tool": "python_exec", "input": code, "output": output, "success": True}
    return {"tool": "python_exec", "input": code, "output": res.get("error", "Error"), "success": False}


def run_web_search(query: str) -> dict:
    """Return mock structured search results (no real HTTP calls needed)."""
    results = [
        {
            "rank": 1,
            "title": f"Understanding {query} — A Complete Guide",
            "snippet": f"Learn everything about {query} with worked examples, formulas, and common pitfalls to avoid.",
            "url": f"https://docs.example.com/{query.lower().replace(' ', '-')}",
        },
        {
            "rank": 2,
            "title": f"{query} — Wikipedia",
            "snippet": f"{query} is a fundamental concept used in mathematics, science and engineering.",
            "url": f"https://en.wikipedia.org/wiki/{query.replace(' ', '_')}",
        },
        {
            "rank": 3,
            "title": f"Common mistakes in {query} problems",
            "snippet": f"Avoid the top 5 mistakes people make when solving {query} problems. Step-by-step solutions included.",
            "url": f"https://mathhelp.example.com/{query.lower().replace(' ', '-')}-mistakes",
        },
    ]
    return {"tool": "web_search", "input": query, "output": results, "success": True}


# ---------------------------------------------------------------------------
# Registry & dispatcher
# ---------------------------------------------------------------------------

TOOLS: dict[str, Any] = {
    "calculator": run_calculator,
    "python_exec": run_python_exec,
    "web_search": run_web_search,
}

TOOL_REGISTRY = TOOLS

TOOL_DESCRIPTIONS = {
    "calculator": "Evaluate a safe mathematical expression (e.g. '2 ** 10', 'math.sqrt(144)')",
    "python_exec": "Run a small Python snippet in a sandboxed namespace; set 'result' to return a value",
    "web_search": "Search the web for a query string; returns top-3 mock results",
}


def execute_tool(tool_name: str, tool_input: str) -> dict:
    """Dispatch to the named tool. Returns a structured result dict."""
    if tool_name not in TOOLS:
        return {"tool": tool_name, "input": tool_input,
                "output": f"Unknown tool '{tool_name}'. Available: {list(TOOLS)}", "success": False}
    return TOOLS[tool_name](tool_input)
