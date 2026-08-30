"""
Meta-Learner for the Self-Evolve agent.

Analyses the attempt history and lesson effectiveness to:
  - Identify which task types the agent fails on most
  - Score each lesson's practical utility
  - Generate human-readable improvement recommendations
  - Auto-prune lessons that have been used many times without helping
"""

from __future__ import annotations

from . import memory


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def analyze() -> dict:
    """Return a full meta-analysis of agent performance and lesson quality."""
    summary = memory.get_summary()
    patterns = memory.get_failure_patterns()
    all_lessons = memory.get_all_lessons()

    lesson_efficiency = []
    for lesson in all_lessons:
        used = lesson.get("times_used", 0)
        helped = lesson.get("times_helped", 0)
        effectiveness = lesson.get("effectiveness", 0.0)
        lesson_efficiency.append({
            "lesson_id":    lesson["id"],
            "task_type":    lesson["task_type"],
            "error_tag":    lesson["error_tag"],
            "lesson_text":  lesson["lesson_text"],
            "times_used":   used,
            "times_helped": helped,
            "effectiveness": effectiveness,
            "should_prune": used >= 5 and helped == 0,
        })

    recommendations = _generate_recommendations(patterns, lesson_efficiency, summary)

    return {
        "total_runs":           summary["total_runs"],
        "total_lessons":        summary["total_lessons"],
        "overall_success_rate": summary["overall_success_rate"],
        "failure_patterns":     patterns,
        "lesson_efficiency":    lesson_efficiency,
        "recommendations":      recommendations,
        "pruned_lessons":       0,
    }


def auto_prune(min_uses: int = 5) -> int:
    """
    Remove lessons that have been used ≥ min_uses times but never helped.
    Returns the number of pruned lessons.
    """
    return memory.prune_ineffective_lessons(min_uses=min_uses, max_effectiveness=0.0)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _generate_recommendations(
    patterns: list[dict],
    lesson_efficiency: list[dict],
    summary: dict,
) -> list[str]:
    recs: list[str] = []

    if summary["total_runs"] == 0:
        recs.append("No runs yet — start by running the agent on any task to begin learning.")
        return recs

    # Worst-performing task type
    worst = max(patterns, key=lambda p: p["failure_rate"], default=None)
    if worst and worst["failure_rate"] > 0.5:
        recs.append(
            f"'{worst['task_type']}' has a {worst['failure_rate']*100:.0f}% first-attempt "
            f"failure rate. Consider running it more to build memory."
        )

    # Best-performing task type
    best = min(patterns, key=lambda p: p["failure_rate"], default=None)
    if best and best["failure_rate"] == 0.0 and best["total_runs"] >= 3:
        recs.append(
            f"'{best['task_type']}' now succeeds on the first attempt every time — "
            f"memory is working perfectly for this task type! 🎉"
        )

    # Ineffective lessons
    ineffective = [l for l in lesson_efficiency if l["should_prune"]]
    if ineffective:
        recs.append(
            f"{len(ineffective)} lesson(s) used 5+ times without ever helping. "
            f"Use 'Auto-Prune' to clean them up."
        )

    # High overall success rate
    if summary["first_attempt_success_rate"] >= 0.8 and summary["total_runs"] >= 5:
        recs.append(
            f"Agent first-attempt success rate is {summary['first_attempt_success_rate']*100:.0f}% — "
            f"excellent improvement through memory! 🚀"
        )

    # No lessons yet but runs exist
    if summary["total_lessons"] == 0 and summary["total_runs"] > 0:
        recs.append(
            "No lessons stored yet. This means all runs succeeded on the first try, "
            "or something went wrong. Try resetting and re-running."
        )

    # Low overall success rate with no lessons
    if summary["overall_success_rate"] < 0.4 and summary["total_lessons"] < 3:
        recs.append(
            "Low success rate and few lessons. Run the same task type multiple times "
            "to accumulate memory and watch the rate improve."
        )

    if not recs:
        recs.append(
            f"Agent is learning steadily ({summary['total_lessons']} lessons stored). "
            f"Keep running tasks to build richer memory."
        )

    return recs
