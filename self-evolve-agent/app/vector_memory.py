"""
Semantic vector memory for the Self-Evolve agent.

Uses ChromaDB + sentence-transformers (all-MiniLM-L6-v2) when available,
falls back to difflib keyword similarity when the optional packages are
not installed — so the app works out-of-the-box with zero extras.

Enable full vector memory:
    pip install chromadb sentence-transformers
"""

from __future__ import annotations

import logging
import os
from pathlib import Path

logger = logging.getLogger(__name__)

VECTOR_MEMORY_ENABLED = False
_collection = None
_encoder = None

# ---------------------------------------------------------------------------
# Optional imports
# ---------------------------------------------------------------------------
try:
    import chromadb
    from sentence_transformers import SentenceTransformer

    _CHROMA_PATH = os.environ.get(
        "CHROMA_DB_PATH",
        str(Path(__file__).resolve().parent.parent / "chroma_db"),
    )
    _client = chromadb.PersistentClient(path=_CHROMA_PATH)
    _collection = _client.get_or_create_collection(
        "lessons",
        metadata={"hnsw:space": "cosine"},
    )
    _encoder = SentenceTransformer("all-MiniLM-L6-v2")
    VECTOR_MEMORY_ENABLED = True
    logger.info("[vector_memory] ChromaDB + sentence-transformers loaded ✓")
except Exception as exc:
    logger.info(f"[vector_memory] Falling back to keyword similarity ({exc})")


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def upsert_lesson(lesson_id: int, task_type: str, error_tag: str, lesson_text: str) -> None:
    """Add or update a lesson in the vector store."""
    if not VECTOR_MEMORY_ENABLED:
        return
    try:
        embedding = _encoder.encode(lesson_text).tolist()
        _collection.upsert(
            ids=[str(lesson_id)],
            embeddings=[embedding],
            documents=[lesson_text],
            metadatas=[{"task_type": task_type, "error_tag": error_tag}],
        )
    except Exception as exc:
        logger.warning(f"[vector_memory] upsert failed: {exc}")


def delete_lesson(lesson_id: int) -> None:
    """Remove a lesson from the vector store."""
    if not VECTOR_MEMORY_ENABLED:
        return
    try:
        _collection.delete(ids=[str(lesson_id)])
    except Exception as exc:
        logger.warning(f"[vector_memory] delete failed: {exc}")


def semantic_search(query: str, top_k: int = 5) -> list[dict]:
    """
    Find the most semantically similar lessons to `query`.
    Returns list of dicts with lesson fields + `similarity_score`.
    """
    if VECTOR_MEMORY_ENABLED:
        return _vector_search(query, top_k)
    return _keyword_search(query, top_k)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _vector_search(query: str, top_k: int) -> list[dict]:
    try:
        embedding = _encoder.encode(query).tolist()
        results = _collection.query(
            query_embeddings=[embedding],
            n_results=min(top_k, _collection.count() or 1),
            include=["documents", "metadatas", "distances"],
        )
        output = []
        for doc, meta, dist in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        ):
            output.append({
                "lesson_text": doc,
                "task_type": meta.get("task_type", ""),
                "error_tag": meta.get("error_tag", ""),
                "similarity_score": round(1.0 - dist, 4),  # cosine → similarity
            })
        return output
    except Exception as exc:
        logger.warning(f"[vector_memory] query failed: {exc}")
        return []


def _keyword_search(query: str, top_k: int) -> list[dict]:
    """Fallback: difflib-based keyword similarity over SQLite lessons."""
    from difflib import SequenceMatcher
    from . import memory as mem

    all_lessons = mem.get_all_lessons()
    if not all_lessons:
        return []

    scored = []
    q = query.lower()
    for lesson in all_lessons:
        text = lesson.get("lesson_text", "").lower()
        ratio = SequenceMatcher(None, q, text).ratio()
        scored.append((ratio, lesson))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [
        {**lesson, "similarity_score": round(score, 4)}
        for score, lesson in scored[:top_k]
    ]
