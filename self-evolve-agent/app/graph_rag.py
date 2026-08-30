"""
Neuromorphic GraphRAG Knowledge Graph.
Maintains multi-relational directed graph topology of concepts, error tags, tools, and lessons
with multi-hop causal traversal and PageRank centrality ranking.
"""

from __future__ import annotations

import collections
from typing import Any
from app import memory


class GraphRAGNode:
    def __init__(self, node_id: str, label: str, node_type: str, metadata: dict[str, Any] | None = None):
        self.node_id = node_id
        self.label = label
        self.node_type = node_type  # concept, error_pattern, tool, lesson, formula
        self.metadata = metadata or {}


class GraphRAGEdge:
    def __init__(self, source_id: str, target_id: str, relation: str, weight: float = 1.0):
        self.source_id = source_id
        self.target_id = target_id
        self.relation = relation  # CAUSED_BY, CONTRADICTS, OPTIMIZES, DERIVED_FROM, RESOLVED_BY
        self.weight = weight


class NeuromorphicGraphRAG:
    def __init__(self):
        self.nodes: dict[str, GraphRAGNode] = {}
        self.edges: list[GraphRAGEdge] = []
        self._build_default_knowledge_graph()

    def _build_default_knowledge_graph(self):
        # 1. Concept Nodes
        self.add_node("concept-percentage", "Percentage Discount", "concept")
        self.add_node("concept-compound", "Compound Interest", "concept")
        self.add_node("concept-geometry", "Composite Area", "concept")
        self.add_node("concept-conversion", "Metric Conversion", "concept")

        # 2. Error Pattern Nodes
        self.add_node("error-flat-sub", "Flat Subtraction Fallacy", "error_pattern")
        self.add_node("error-linear-interest", "Linear Multiplier Fallacy", "error_pattern")
        self.add_node("error-rectangle-overlap", "Boundary Double-Counting", "error_pattern")

        # 3. Lesson & Principle Nodes
        self.add_node("lesson-percent-norm", "Multiplicative Normalization (1 - d/100)", "lesson")
        self.add_node("lesson-exp-power", "Exponential Exponentiation P*(1+r)^n", "lesson")
        self.add_node("lesson-circle-half", "Semicircle Area PI*r^2 / 2", "lesson")

        # 4. Tool Nodes
        self.add_node("tool-determinant", "Matrix Determinant Tool", "tool")
        self.add_node("tool-primes", "Prime Factorization Tool", "tool")
        self.add_node("tool-stats", "Statistics Summary Tool", "tool")

        # 5. Edges with causal relations
        self.add_edge("error-flat-sub", "concept-percentage", "CAUSED_BY", 0.9)
        self.add_edge("lesson-percent-norm", "error-flat-sub", "RESOLVED_BY", 1.0)
        self.add_edge("lesson-percent-norm", "concept-percentage", "OPTIMIZES", 0.95)

        self.add_edge("error-linear-interest", "concept-compound", "CAUSED_BY", 0.85)
        self.add_edge("lesson-exp-power", "error-linear-interest", "RESOLVED_BY", 1.0)
        self.add_edge("lesson-exp-power", "concept-compound", "OPTIMIZES", 0.98)

        self.add_edge("error-rectangle-overlap", "concept-geometry", "CAUSED_BY", 0.8)
        self.add_edge("lesson-circle-half", "error-rectangle-overlap", "RESOLVED_BY", 0.95)

    def add_node(self, node_id: str, label: str, node_type: str, metadata: dict | None = None) -> None:
        self.nodes[node_id] = GraphRAGNode(node_id, label, node_type, metadata)

    def add_edge(self, source_id: str, target_id: str, relation: str, weight: float = 1.0) -> None:
        self.edges.append(GraphRAGEdge(source_id, target_id, relation, weight))

    def compute_pagerank(self, iterations: int = 15, damping: float = 0.85) -> dict[str, float]:
        """Computes PageRank centrality scores across knowledge graph nodes."""
        n = len(self.nodes)
        if n == 0:
            return {}
        scores = {nid: 1.0 / n for nid in self.nodes}
        outgoing = collections.defaultdict(list)
        for e in self.edges:
            outgoing[e.source_id].append(e.target_id)

        for _ in range(iterations):
            new_scores = {nid: (1.0 - damping) / n for nid in self.nodes}
            for nid, targets in outgoing.items():
                if not targets:
                    continue
                share = (scores[nid] * damping) / len(targets)
                for t in targets:
                    if t in new_scores:
                        new_scores[t] += share
            scores = new_scores

        return {k: round(v, 4) for k, v in sorted(scores.items(), key=lambda x: x[1], reverse=True)}

    def multi_hop_traverse(self, start_node_id: str, max_hops: int = 2) -> dict[str, Any]:
        """Performs multi-hop causal traversal from a query node."""
        visited = set([start_node_id])
        queue = collections.deque([(start_node_id, 0, [])])
        paths = []

        while queue:
            curr, hops, path = queue.popleft()
            if hops >= max_hops:
                continue

            for e in self.edges:
                if e.source_id == curr and e.target_id not in visited:
                    visited.add(e.target_id)
                    new_path = path + [f"{self.nodes.get(curr, GraphRAGNode(curr, curr, '')).label} --[{e.relation}]--> {self.nodes.get(e.target_id, GraphRAGNode(e.target_id, e.target_id, '')).label}"]
                    paths.append(new_path[-1])
                    queue.append((e.target_id, hops + 1, new_path))

        return {
            "query_node": start_node_id,
            "max_hops": max_hops,
            "connected_subgraph_size": len(visited),
            "causal_reasoning_paths": paths,
        }

    def export_graph_topology(self) -> dict[str, Any]:
        pr = self.compute_pagerank()
        return {
            "total_nodes": len(self.nodes),
            "total_edges": len(self.edges),
            "nodes": [
                {"id": n.node_id, "label": n.label, "type": n.node_type, "pagerank": pr.get(n.node_id, 0.0)}
                for n in self.nodes.values()
            ],
            "edges": [
                {"source": e.source_id, "target": e.target_id, "relation": e.relation, "weight": e.weight}
                for e in self.edges
            ],
            "top_central_hubs": list(pr.items())[:5],
        }


graph_rag = NeuromorphicGraphRAG()
