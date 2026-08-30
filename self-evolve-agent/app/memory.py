"""
Persistent episodic memory for the Self-Evolve agent, backed by SQLite.

Three tables:
  - lessons:  distilled, reusable "what went wrong / how to fix it" notes,
              keyed by (task_type, error_tag). Includes scoring fields to
              track how effective each lesson is in practice.
  - attempts: full audit log of every execute/critique step.
  - meta_lessons: higher-order insights about agent failure patterns.
"""

from __future__ import annotations

import json
import os
import sqlite3
from collections import defaultdict
from contextlib import contextmanager
from datetime import datetime, timezone

DB_PATH = os.environ.get(
    "SELF_EVOLVE_DB",
    os.path.join(os.path.dirname(__file__), "..", "data.db"),
)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@contextmanager
def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Schema init / migrations
# ---------------------------------------------------------------------------

def init_db() -> None:
    with get_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS lessons (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                task_type  TEXT NOT NULL,
                error_tag  TEXT NOT NULL,
                lesson_text TEXT NOT NULL,
                created_at TEXT NOT NULL,
                times_used INTEGER NOT NULL DEFAULT 0,
                times_helped INTEGER NOT NULL DEFAULT 0,
                UNIQUE(task_type, error_tag)
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS attempts (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                run_id        TEXT NOT NULL,
                task_type     TEXT NOT NULL,
                task_id       TEXT NOT NULL,
                iteration     INTEGER NOT NULL,
                agent_mode    TEXT NOT NULL DEFAULT 'single',
                prompt        TEXT,
                answer        TEXT,
                correct_answer TEXT,
                success       INTEGER NOT NULL,
                confidence    REAL NOT NULL DEFAULT 0.5,
                critique      TEXT,
                lessons_used  INTEGER NOT NULL DEFAULT 0,
                created_at    TEXT NOT NULL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS meta_lessons (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                pattern_tag TEXT NOT NULL UNIQUE,
                insight     TEXT NOT NULL,
                created_at  TEXT NOT NULL
            )
        """)

        # ---- Migrations: add columns if they don't exist yet ----
        _add_column_if_missing(conn, "lessons", "times_used", "INTEGER NOT NULL DEFAULT 0")
        _add_column_if_missing(conn, "lessons", "times_helped", "INTEGER NOT NULL DEFAULT 0")
        _add_column_if_missing(conn, "attempts", "agent_mode", "TEXT NOT NULL DEFAULT 'single'")
        _add_column_if_missing(conn, "attempts", "confidence", "REAL NOT NULL DEFAULT 0.5")


def _add_column_if_missing(conn, table: str, column: str, definition: str) -> None:
    existing = {row[1] for row in conn.execute(f"PRAGMA table_info({table})")}
    if column not in existing:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")


# ---------------------------------------------------------------------------
# Lesson CRUD
# ---------------------------------------------------------------------------

def store_lesson(task_type: str, error_tag: str, lesson_text: str) -> dict:
    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO lessons (task_type, error_tag, lesson_text, created_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(task_type, error_tag) DO NOTHING
            """,
            (task_type, error_tag, lesson_text, _now()),
        )
        row = conn.execute(
            "SELECT * FROM lessons WHERE task_type = ? AND error_tag = ?",
            (task_type, error_tag),
        ).fetchone()
        return dict(row) if row else {}


def get_lessons(task_type: str) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM lessons WHERE task_type = ? ORDER BY created_at ASC",
            (task_type,),
        ).fetchall()
        return [dict(r) for r in rows]


def get_all_lessons() -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM lessons ORDER BY created_at DESC"
        ).fetchall()
        return [_lesson_with_score(dict(r)) for r in rows]


def get_lesson_by_id(lesson_id: int) -> dict | None:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM lessons WHERE id = ?", (lesson_id,)
        ).fetchone()
        return _lesson_with_score(dict(row)) if row else None


def delete_lesson(lesson_id: int) -> bool:
    with get_conn() as conn:
        cur = conn.execute("DELETE FROM lessons WHERE id = ?", (lesson_id,))
        return cur.rowcount > 0


def update_lesson_usage(task_type: str, success: bool) -> None:
    """Increment times_used and optionally times_helped for all lessons of this task type."""
    with get_conn() as conn:
        if success:
            conn.execute(
                """
                UPDATE lessons
                SET times_used = times_used + 1,
                    times_helped = times_helped + 1
                WHERE task_type = ?
                """,
                (task_type,),
            )
        else:
            conn.execute(
                "UPDATE lessons SET times_used = times_used + 1 WHERE task_type = ?",
                (task_type,),
            )


def prune_ineffective_lessons(min_uses: int = 5, max_effectiveness: float = 0.0) -> int:
    """Delete lessons that have been used ≥ min_uses times but never helped."""
    with get_conn() as conn:
        cur = conn.execute(
            """
            DELETE FROM lessons
            WHERE times_used >= ? AND times_helped <= ?
            """,
            (min_uses, int(max_effectiveness)),
        )
        return cur.rowcount


def _lesson_with_score(lesson: dict) -> dict:
    used = lesson.get("times_used", 0)
    helped = lesson.get("times_helped", 0)
    lesson["effectiveness"] = round(helped / used, 3) if used > 0 else 0.0
    return lesson


# ---------------------------------------------------------------------------
# Memory export / import
# ---------------------------------------------------------------------------

def export_lessons() -> list[dict]:
    return get_all_lessons()


def import_lessons(lessons: list[dict]) -> int:
    """Bulk-import lessons. Skips duplicates. Returns count of imported."""
    count = 0
    for lesson in lessons:
        task_type = lesson.get("task_type", "")
        error_tag = lesson.get("error_tag", "")
        lesson_text = lesson.get("lesson_text", "")
        if task_type and error_tag and lesson_text:
            with get_conn() as conn:
                cur = conn.execute(
                    """
                    INSERT OR IGNORE INTO lessons (task_type, error_tag, lesson_text, created_at)
                    VALUES (?, ?, ?, ?)
                    """,
                    (task_type, error_tag, lesson_text, _now()),
                )
                if cur.rowcount:
                    count += 1
    return count


# ---------------------------------------------------------------------------
# Attempt logging
# ---------------------------------------------------------------------------

def store_attempt(
    run_id: str,
    task_type: str,
    task_id: str,
    iteration: int,
    prompt: str,
    answer,
    correct_answer,
    success: bool,
    critique: str | None,
    lessons_used: int,
    confidence: float = 0.5,
    agent_mode: str = "single",
) -> None:
    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO attempts
                (run_id, task_type, task_id, iteration, agent_mode, prompt, answer,
                 correct_answer, success, confidence, critique, lessons_used, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                run_id, task_type, task_id, iteration, agent_mode,
                prompt, str(answer), str(correct_answer),
                1 if success else 0, confidence, critique, lessons_used, _now(),
            ),
        )


# ---------------------------------------------------------------------------
# Stats / analytics
# ---------------------------------------------------------------------------

def get_stats() -> dict:
    """First-attempt success rate over successive runs, grouped by task_type."""
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT task_type, success, confidence, created_at
            FROM attempts WHERE iteration = 1
            ORDER BY created_at ASC
            """
        ).fetchall()

    grouped: dict[str, list[dict]] = defaultdict(list)
    for r in rows:
        tt = r["task_type"]
        grouped[tt].append({
            "run_index": len(grouped[tt]) + 1,
            "success": bool(r["success"]),
            "confidence": r["confidence"],
            "created_at": r["created_at"],
        })
    return dict(grouped)


def get_summary() -> dict:
    with get_conn() as conn:
        total_runs = conn.execute(
            "SELECT COUNT(DISTINCT run_id) AS c FROM attempts"
        ).fetchone()["c"]
        total_lessons = conn.execute("SELECT COUNT(*) AS c FROM lessons").fetchone()["c"]
        total_attempts = conn.execute("SELECT COUNT(*) AS c FROM attempts").fetchone()["c"]
        successes = conn.execute(
            "SELECT COUNT(*) AS c FROM attempts WHERE success = 1"
        ).fetchone()["c"]
        first_try_successes = conn.execute(
            "SELECT COUNT(*) AS c FROM attempts WHERE success = 1 AND iteration = 1"
        ).fetchone()["c"]
        first_try_total = conn.execute(
            "SELECT COUNT(*) AS c FROM attempts WHERE iteration = 1"
        ).fetchone()["c"]
    return {
        "total_runs": total_runs,
        "total_lessons": total_lessons,
        "total_attempts": total_attempts,
        "overall_success_rate": round(successes / total_attempts, 3) if total_attempts else 0.0,
        "first_attempt_success_rate": round(first_try_successes / first_try_total, 3) if first_try_total else 0.0,
    }


def get_failure_patterns() -> list[dict]:
    """Aggregate failure data per task type for meta-analysis."""
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT task_type,
                   COUNT(DISTINCT run_id) as total_runs,
                   SUM(CASE WHEN iteration = 1 AND success = 0 THEN 1 ELSE 0 END) as first_fail
            FROM attempts
            GROUP BY task_type
            ORDER BY first_fail DESC
            """
        ).fetchall()
    patterns = []
    for r in rows:
        total = r["total_runs"] or 1
        patterns.append({
            "task_type": r["task_type"],
            "total_runs": r["total_runs"],
            "first_attempt_failures": r["first_fail"],
            "failure_rate": round(r["first_fail"] / total, 3),
        })
    return patterns


# ---------------------------------------------------------------------------
# Reset
# ---------------------------------------------------------------------------

def reset_memory() -> None:
    with get_conn() as conn:
        conn.execute("DELETE FROM lessons")
        conn.execute("DELETE FROM attempts")
        conn.execute("DELETE FROM meta_lessons")
