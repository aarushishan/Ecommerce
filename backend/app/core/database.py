import logging
from typing import Generator
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.core.config import settings

logger = logging.getLogger(__name__)

# Determine connection arguments based on database engine
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
    echo=settings.DEBUG and not settings.DATABASE_URL.startswith("sqlite")
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency that provides a database session per request
    and ensures proper closing after execution.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_database_connection() -> dict:
    """
    Validates that the database is reachable and returns connectivity metrics.
    """
    try:
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            scalar_res = result.scalar()
            return {
                "status": "connected",
                "database": engine.dialect.name,
                "reachable": scalar_res == 1
            }
    except Exception as e:
        logger.error(f"Database connection error: {str(e)}")
        return {
            "status": "error",
            "database": engine.dialect.name,
            "error": str(e),
            "reachable": False
        }
