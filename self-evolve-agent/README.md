# Self-Evolve — Self-Improving Agentic AI System

**Team Red-Ant** (Pugazhenthi S, Alfiya A) — DeepSprint Hackathon

A working prototype of a **Reflexion-style self-improving AI agent**: it
attempts a task, critiques its own answer, reflects on *why* it was wrong,
stores a reusable lesson in long-term memory, and retries — getting better
over time **without any model retraining or fine-tuning**.

```
Execute → Self-Critique → Reflect → Store → Retrieve & Retry
```

This is a full, runnable prototype (FastAPI backend + SQLite memory +
a small web UI), not a slide-only concept. It works out of the box with
**zero API keys** (a deterministic "mock LLM" mode), and can optionally be
pointed at the real Claude API for a live demo.

---

## Quick start

Requirements: Python 3.10+

```bash
cd self-evolve-agent
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate.bat
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Or just run the helper script:

```bash
./run.sh          # macOS / Linux
run.bat           # Windows
```

Then open **http://localhost:8000** in your browser.

---

## What to click, to see the point of the project

1. Pick a task type (e.g. "Percentage discount word problems") and click
   **Run Agent**.
2. Watch **iteration 1 fail** — the agent has no lesson yet and makes a
   realistic mistake (e.g. treating a discount % as a flat subtraction).
3. Watch the **Reflect & store** box appear — the agent writes a lesson to
   memory.
4. Watch **iteration 2 succeed**, because the agent retrieves that lesson
   before retrying.
5. Click **Run Agent** again (same task type, new random numbers). It now
   succeeds on **iteration 1** — proof the improvement is persistent, not
   just a lucky retry.
6. Check the **memory panel** — the exact lesson text the agent is reusing.
7. Check the **improvement chart** — first-attempt success rate across runs.

---

## Architecture

```
self-evolve-agent/
├── app/
│   ├── main.py       FastAPI app + REST endpoints
│   ├── agent.py       ReflexionAgent — the core loop
│   ├── llm.py          LLM provider abstraction (mock / anthropic)
│   ├── memory.py     SQLite-backed episodic memory (lessons + attempts log)
│   ├── tasks.py         Verifiable task bank (3 task types, flawed/correct solvers)
│   └── schemas.py     Pydantic request/response models
├── static/                Vanilla JS/HTML/CSS demo UI
├── tests/                  pytest unit + API tests
├── requirements.txt
├── run.sh / run.bat
└── .env.example
```

### Why "mock" mode and it's still an honest demo

The default `LLM_PROVIDER=mock` doesn't call any external API. Instead,
each task type ships with a **flawed solver** (a realistic, common mistake)
and a **corrected solver**. The agent's self-critique step is a real
ground-truth verifier (not a rigged check), and the memory/reflection loop
that decides *which* solver path to take is the actual production
mechanism — the exact same code path is used whether the "attempt" comes
from the mock solver or a real LLM. This makes the core hackathon claim
(persistent, retraining-free self-improvement via memory) fully testable
and demoable offline, with `pytest` proving it.

### Using a real LLM instead

```bash
cp .env.example .env
# edit .env:
#   LLM_PROVIDER=anthropic
#   ANTHROPIC_API_KEY=sk-ant-...
```

With this enabled, the **attempt** and **reflection** steps are generated
live by Claude (via direct HTTPS calls to the Messages API — no SDK
dependency needed); the task verifier is still used as the objective critic,
mirroring how real coding/tool-use agents use test suites as their critic.

---

## API reference

| Method | Path                | Description                                   |
|--------|---------------------|------------------------------------------------|
| GET    | `/api/health`        | Health check + active LLM provider            |
| GET    | `/api/tasks`          | List available task types                      |
| POST   | `/api/run`             | Run the agent on a new task instance           |
| GET    | `/api/memory`        | List all stored lessons                        |
| POST   | `/api/memory/reset` | Wipe all lessons + attempt history (demo reset)|
| GET    | `/api/stats`           | First-attempt success rate over time           |

Interactive API docs (Swagger UI) are auto-generated at **`/docs`**.

Example:

```bash
curl -X POST http://localhost:8000/api/run \
  -H "Content-Type: application/json" \
  -d '{"task_type": "percentage_discount", "max_iterations": 3}'
```

---

## Running the tests

```bash
pip install -r requirements.txt
pytest -v
```

Tests cover: task generation/verification, that the flawed solver is
actually wrong, that the agent fails-then-corrects within a run, that
lessons persist and help *future* runs succeed on the first try, memory
reset, and all API endpoints.

---

## Mapping to the pitch deck

| Pitch deck section | Where it lives in this prototype |
|---|---|
| Problem | Iteration-1 failures in mock mode reproduce the "agents repeat mistakes" problem directly |
| Solution | `app/agent.py` — the 5-step Reflexion loop |
| Validation (Prototype: YES, TRL 3) | This running FastAPI app + passing pytest suite |
| IP / Novelty | `app/memory.py` (structured episodic memory) + `app/llm.py` (model-agnostic provider interface — swap in any LLM without touching the agent loop) |

---

## Next steps (post-hackathon)

- Swap the task bank for real coding/tool-use tasks (e.g. failing unit tests as the critic).
- Add OpenAI/other provider backends alongside `AnthropicLLM`.
- Vector-similarity lesson retrieval instead of exact task-type matching, for generalizing lessons across *related* task types.
- Multi-user memory namespaces for a real SaaS deployment.
