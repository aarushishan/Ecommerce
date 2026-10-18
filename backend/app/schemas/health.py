from datetime import datetime, timezone
from typing import Dict, Any
from pydantic import BaseModel, Field


class DatabaseHealth(BaseModel):
    status: str
    database: str
    reachable: bool
    error: str | None = None


class HealthResponse(BaseModel):
    status: str = "ok"
    app_name: str
    version: str
    environment: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    database: DatabaseHealth
