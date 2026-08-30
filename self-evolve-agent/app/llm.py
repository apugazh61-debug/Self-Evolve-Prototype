"""
LLM provider abstraction for the Self-Evolve agent.

Supported providers (set via LLM_PROVIDER env var):
  mock      — deterministic offline demo (default, zero API key)
  anthropic — Claude via Anthropic Messages API
  openai    — GPT-4o / GPT-4o-mini via OpenAI Chat Completions API
  gemini    — Gemini 2.0 Flash via Google Generative Language API
  ollama    — Local Ollama models (llama3.2, mistral, etc.)

All providers share the same attempt() / reflect() interface so
app/agent.py never needs to know which backend is active.
"""

from __future__ import annotations

import os
import re
from abc import ABC, abstractmethod

from . import tasks as task_bank


class BaseLLM(ABC):
    name: str = "base"

    @abstractmethod
    def attempt(self, task: task_bank.Task, lessons: list[dict]) -> dict:
        """Return {"answer": ..., "reasoning": str, "lessons_used": int}"""

    def reflect(self, task: task_bank.Task, answer, critique: str) -> tuple[str, str]:
        """Return (error_tag, lesson_text). Default: canonical lesson lookup."""
        return task_bank.LESSONS[task.type]


# ---------------------------------------------------------------------------
# Shared helper: extract ANSWER: <number> from LLM output
# ---------------------------------------------------------------------------
def _extract_answer(text: str) -> float:
    match = re.search(r"ANSWER:\s*(-?\d+(?:\.\d+)?)", text)
    return float(match.group(1)) if match else float("nan")


# ---------------------------------------------------------------------------
# Shared prompt builders (used by all real LLM providers)
# ---------------------------------------------------------------------------
def _build_attempt_prompt(task: task_bank.Task, lessons: list[dict]) -> tuple[str, str]:
    relevant = [l for l in lessons if l.get("task_type") == task.type] if lessons else []
    lesson_block = (
        "\n".join(f"- {l['lesson_text']}" for l in relevant)
        if relevant else "(none yet)"
    )
    system = (
        "You are a precise problem-solving agent. You are given a task and a list of "
        "lessons learned from past mistakes on this type of task. Apply any relevant "
        "lessons carefully. Show your reasoning, then end with a final line in the "
        "exact format: ANSWER: <number>"
    )
    user = f"Lessons for this task type:\n{lesson_block}\n\nTask:\n{task.prompt}"
    return system, user


def _build_reflect_prompt(task: task_bank.Task, answer, critique: str) -> tuple[str, str]:
    system = (
        "You are an agent reflecting on a mistake to avoid repeating it. Write ONE "
        "concise, general, reusable lesson (1-2 sentences) that would help you solve "
        "this *type* of problem correctly next time. Do not restate the specific numbers."
    )
    user = (
        f"Task:\n{task.prompt}\n\n"
        f"Your answer: {answer}\n"
        f"Correct answer: {task.correct_answer}\n"
        f"Critique: {critique}"
    )
    return system, user


# ===========================================================================
# MockLLM — deterministic, offline, zero-dependency
# ===========================================================================
class MockLLM(BaseLLM):
    name = "mock"

    def attempt(self, task: task_bank.Task, lessons: list[dict]) -> dict:
        relevant = [l for l in lessons if l.get("task_type") == task.type] if lessons else []
        apply_lesson = len(relevant) > 0
        solver = task_bank.SOLVERS[task.type]
        answer = solver(task.params, apply_lesson=apply_lesson)
        reasoning = (
            f'Applied stored lesson: "{relevant[0]["lesson_text"]}"'
            if apply_lesson
            else "No prior lesson available — solving from first principles."
        )
        return {"answer": answer, "reasoning": reasoning, "lessons_used": len(relevant)}


# ===========================================================================
# AnthropicLLM — Claude via Messages API (no SDK needed)
# ===========================================================================
class AnthropicLLM(BaseLLM):
    name = "anthropic"

    def __init__(self, api_key: str, model: str = "claude-sonnet-4-6"):
        self.api_key = api_key
        self.model = model

    def _call(self, system: str, user: str) -> str:
        import httpx
        resp = httpx.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": self.api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": self.model,
                "max_tokens": 512,
                "system": system,
                "messages": [{"role": "user", "content": user}],
            },
            timeout=30,
        )
        resp.raise_for_status()
        return "".join(b.get("text", "") for b in resp.json().get("content", []))

    def attempt(self, task: task_bank.Task, lessons: list[dict]) -> dict:
        relevant = [l for l in lessons if l.get("task_type") == task.type] if lessons else []
        system, user = _build_attempt_prompt(task, lessons)
        text = self._call(system, user)
        return {"answer": _extract_answer(text), "reasoning": text.strip(), "lessons_used": len(relevant)}

    def reflect(self, task: task_bank.Task, answer, critique: str) -> tuple[str, str]:
        system, user = _build_reflect_prompt(task, answer, critique)
        lesson_text = self._call(system, user).strip()
        error_tag, _ = task_bank.LESSONS[task.type]
        return error_tag, lesson_text


# ===========================================================================
# OpenAILLM — GPT-4o / GPT-4o-mini via Chat Completions
# ===========================================================================
class OpenAILLM(BaseLLM):
    name = "openai"

    def __init__(self, api_key: str, model: str = "gpt-4o-mini"):
        self.api_key = api_key
        self.model = model

    def _call(self, system: str, user: str) -> str:
        import httpx
        resp = httpx.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {self.api_key}",
                     "Content-Type": "application/json"},
            json={
                "model": self.model,
                "temperature": 0.2,
                "max_tokens": 512,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
            },
            timeout=30,
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]

    def attempt(self, task: task_bank.Task, lessons: list[dict]) -> dict:
        relevant = [l for l in lessons if l.get("task_type") == task.type] if lessons else []
        system, user = _build_attempt_prompt(task, lessons)
        text = self._call(system, user)
        return {"answer": _extract_answer(text), "reasoning": text.strip(), "lessons_used": len(relevant)}

    def reflect(self, task: task_bank.Task, answer, critique: str) -> tuple[str, str]:
        system, user = _build_reflect_prompt(task, answer, critique)
        lesson_text = self._call(system, user).strip()
        error_tag, _ = task_bank.LESSONS[task.type]
        return error_tag, lesson_text


# ===========================================================================
# GeminiLLM — Gemini via Google Generative Language API
# ===========================================================================
class GeminiLLM(BaseLLM):
    name = "gemini"

    def __init__(self, api_key: str, model: str = "gemini-2.0-flash"):
        self.api_key = api_key
        self.model = model

    def _call(self, system: str, user: str) -> str:
        import httpx
        resp = httpx.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent",
            params={"key": self.api_key},
            headers={"Content-Type": "application/json"},
            json={
                "contents": [{"parts": [{"text": f"{system}\n\n{user}"}]}],
                "generationConfig": {"maxOutputTokens": 512, "temperature": 0.2},
            },
            timeout=30,
        )
        resp.raise_for_status()
        candidates = resp.json().get("candidates", [])
        if candidates:
            return candidates[0]["content"]["parts"][0]["text"]
        return ""

    def attempt(self, task: task_bank.Task, lessons: list[dict]) -> dict:
        relevant = [l for l in lessons if l.get("task_type") == task.type] if lessons else []
        system, user = _build_attempt_prompt(task, lessons)
        text = self._call(system, user)
        return {"answer": _extract_answer(text), "reasoning": text.strip(), "lessons_used": len(relevant)}

    def reflect(self, task: task_bank.Task, answer, critique: str) -> tuple[str, str]:
        system, user = _build_reflect_prompt(task, answer, critique)
        lesson_text = self._call(system, user).strip()
        error_tag, _ = task_bank.LESSONS[task.type]
        return error_tag, lesson_text


# ===========================================================================
# OllamaLLM — Local models via Ollama REST API
# ===========================================================================
class OllamaLLM(BaseLLM):
    name = "ollama"

    def __init__(self, base_url: str = "http://localhost:11434", model: str = "llama3.2"):
        self.base_url = base_url.rstrip("/")
        self.model = model

    def _call(self, system: str, user: str) -> str:
        import httpx
        resp = httpx.post(
            f"{self.base_url}/api/generate",
            json={
                "model": self.model,
                "prompt": f"SYSTEM: {system}\n\nUSER: {user}",
                "stream": False,
                "options": {"temperature": 0.2, "num_predict": 512},
            },
            timeout=120,
        )
        resp.raise_for_status()
        return resp.json().get("response", "")

    def attempt(self, task: task_bank.Task, lessons: list[dict]) -> dict:
        relevant = [l for l in lessons if l.get("task_type") == task.type] if lessons else []
        system, user = _build_attempt_prompt(task, lessons)
        text = self._call(system, user)
        return {"answer": _extract_answer(text), "reasoning": text.strip(), "lessons_used": len(relevant)}

    def reflect(self, task: task_bank.Task, answer, critique: str) -> tuple[str, str]:
        system, user = _build_reflect_prompt(task, answer, critique)
        lesson_text = self._call(system, user).strip()
        error_tag, _ = task_bank.LESSONS[task.type]
        return error_tag, lesson_text


# ===========================================================================
# Factory
# ===========================================================================
def get_llm_provider() -> BaseLLM:
    provider = os.environ.get("LLM_PROVIDER", "mock").lower()

    if provider == "anthropic":
        key = os.environ.get("ANTHROPIC_API_KEY")
        if not key:
            print("[self-evolve] ANTHROPIC_API_KEY missing — falling back to mock.")
            return MockLLM()
        return AnthropicLLM(key, os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-4-6"))

    if provider == "openai":
        key = os.environ.get("OPENAI_API_KEY")
        if not key:
            print("[self-evolve] OPENAI_API_KEY missing — falling back to mock.")
            return MockLLM()
        return OpenAILLM(key, os.environ.get("OPENAI_MODEL", "gpt-4o-mini"))

    if provider == "gemini":
        key = os.environ.get("GEMINI_API_KEY")
        if not key:
            print("[self-evolve] GEMINI_API_KEY missing — falling back to mock.")
            return MockLLM()
        return GeminiLLM(key, os.environ.get("GEMINI_MODEL", "gemini-2.0-flash"))

    if provider == "ollama":
        base_url = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
        model = os.environ.get("OLLAMA_MODEL", "llama3.2")
        return OllamaLLM(base_url=base_url, model=model)

    return MockLLM()
