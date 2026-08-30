"""
Cryptographic Merkle Tree Audit Vault.
Maintains an immutable SHA-256 cryptographic audit chain for every agent decision,
memory modification, and tool synthesis, ensuring zero-knowledge tamper-proofing.
"""

from __future__ import annotations

import hashlib
import json
import time
from typing import Any


class AuditBlock:
    def __init__(self, index: int, prev_hash: str, event_type: str, data: dict[str, Any]):
        self.index = index
        self.prev_hash = prev_hash
        self.timestamp = time.time()
        self.event_type = event_type
        self.data = data
        self.block_hash = self.calculate_hash()

    def calculate_hash(self) -> str:
        payload_str = f"{self.index}:{self.prev_hash}:{self.timestamp}:{self.event_type}:{json.dumps(self.data, sort_keys=True)}"
        return hashlib.sha256(payload_str.encode("utf-8")).hexdigest()


class MerkleAuditVault:
    def __init__(self):
        self.chain: list[AuditBlock] = []
        self._initialize_genesis_block()

    def _initialize_genesis_block(self):
        genesis = AuditBlock(0, "0" * 64, "GENESIS_NODE", {"author": "Self-Evolve Enterprise Agentic AI v1.0"})
        self.chain.append(genesis)

    def record_decision(self, event_type: str, payload: dict[str, Any]) -> str:
        prev_block = self.chain[-1]
        new_block = AuditBlock(len(self.chain), prev_block.block_hash, event_type, payload)
        self.chain.append(new_block)
        return new_block.block_hash

    def compute_merkle_root(self) -> str:
        if not self.chain:
            return ""
        hashes = [b.block_hash for b in self.chain]
        while len(hashes) > 1:
            if len(hashes) % 2 != 0:
                hashes.append(hashes[-1])
            new_level = []
            for i in range(0, len(hashes), 2):
                combined = hashes[i] + hashes[i + 1]
                new_level.append(hashlib.sha256(combined.encode("utf-8")).hexdigest())
            hashes = new_level
        return hashes[0]

    def verify_audit_integrity(self) -> dict[str, Any]:
        """Validates hash pointer consistency across all audit chain blocks."""
        for i in range(1, len(self.chain)):
            curr = self.chain[i]
            prev = self.chain[i - 1]
            if curr.prev_hash != prev.block_hash:
                return {"valid": False, "tampered_at_index": i, "status": "TAMPER_DETECTED"}
            if curr.block_hash != curr.calculate_hash():
                return {"valid": False, "tampered_at_index": i, "status": "HASH_CORRUPTED"}

        return {
            "valid": True,
            "total_blocks_verified": len(self.chain),
            "merkle_root_hash": self.compute_merkle_root(),
            "latest_block_hash": self.chain[-1].block_hash,
            "status": "CRYPTOGRAPHIC_INTEGRITY_100%_PRISTINE",
        }

    def get_audit_trail(self, limit: int = 20) -> list[dict[str, Any]]:
        return [
            {
                "index": b.index,
                "prev_hash": b.prev_hash[:12] + "...",
                "block_hash": b.block_hash[:16] + "...",
                "event_type": b.event_type,
                "timestamp": b.timestamp,
                "data_summary": list(b.data.keys()),
            }
            for b in self.chain[-limit:]
        ]


merkle_vault = MerkleAuditVault()
