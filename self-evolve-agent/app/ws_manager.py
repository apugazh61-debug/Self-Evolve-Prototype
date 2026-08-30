"""
WebSocket connection manager for the Self-Evolve agent.

Broadcasts real-time agent events to all connected dashboard clients.
Events: agent_start, iteration_begin, attempt_complete, critique_ready,
        lesson_stored, run_complete, error.
"""

from __future__ import annotations

import json
import logging
from typing import List

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connected — {len(self.active_connections)} active")

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(f"WebSocket disconnected — {len(self.active_connections)} active")

    async def broadcast(self, event_type: str, data: dict) -> None:
        """Send a typed event to all connected clients."""
        message = json.dumps({"type": event_type, "data": data})
        dead: List[WebSocket] = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                dead.append(connection)
        for d in dead:
            self.disconnect(d)

    async def send_personal(self, websocket: WebSocket, event_type: str, data: dict) -> None:
        """Send a typed event to one specific client."""
        try:
            await websocket.send_text(json.dumps({"type": event_type, "data": data}))
        except Exception:
            self.disconnect(websocket)

    @property
    def connection_count(self) -> int:
        return len(self.active_connections)


# Singleton instance used across the app
manager = ConnectionManager()
