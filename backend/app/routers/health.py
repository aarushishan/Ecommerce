from fastapi import APIRouter, status
from app.core.config import settings
from app.core.database import check_database_connection
from app.schemas.health import HealthResponse, DatabaseHealth

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse, status_code=status.HTTP_200_OK)
def get_system_health():
    """
    Returns platform health status, application metadata, and database connectivity.
    """
    db_status = check_database_connection()
    return HealthResponse(
        status="ok" if db_status.get("reachable") else "degraded",
        app_name=settings.APP_NAME,
        version=settings.APP_VERSION,
        environment=settings.ENVIRONMENT,
        database=DatabaseHealth(
            status=db_status.get("status", "unknown"),
            database=db_status.get("database", "unknown"),
            reachable=db_status.get("reachable", False),
            error=db_status.get("error")
        )
    )
