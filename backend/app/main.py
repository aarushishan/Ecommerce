from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import Base, engine, SessionLocal
from app.models.user import Role
from app.routers import health, categories, products, auth, users, cart, wishlist, orders, payments, seller, admin, ai
from app.utils.seed_data import seed_catalog_if_empty
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("shopsphere")


def initialize_default_roles():
    """Seed baseline roles (CUSTOMER, SELLER, ADMIN) if they don't exist."""
    db = SessionLocal()
    try:
        default_roles = [
            {"id": 1, "name": "CUSTOMER", "description": "Standard buying customer"},
            {"id": 2, "name": "SELLER", "description": "Verified merchant seller"},
            {"id": 3, "name": "ADMIN", "description": "Platform administrator"},
        ]
        for role_data in default_roles:
            existing = db.query(Role).filter(Role.name == role_data["name"]).first()
            if not existing:
                role = Role(
                    id=role_data["id"],
                    name=role_data["name"],
                    description=role_data["description"]
                )
                db.add(role)
        db.commit()
        logger.info("Baseline roles verified.")
    except Exception as e:
        logger.error(f"Error seeding baseline roles: {e}")
        db.rollback()
    finally:
        db.close()


def initialize_seed_catalog():
    """Seed realistic initial products if database is currently empty."""
    db = SessionLocal()
    try:
        seed_catalog_if_empty(db)
    except Exception as e:
        logger.error(f"Error during catalog seeding: {e}")
    finally:
        db.close()


def ensure_schema_migrations():
    """Ensure missing columns in existing SQLite tables are cleanly added."""
    with engine.connect() as conn:
        try:
            from sqlalchemy import text
            res = conn.execute(text("PRAGMA table_info(shipments)")).fetchall()
            cols = [r[1] for r in res]
            if "current_location" not in cols:
                conn.execute(text("ALTER TABLE shipments ADD COLUMN current_location VARCHAR(128) DEFAULT 'Central Fulfillment Center, Bengaluru'"))
            if "timeline" not in cols:
                conn.execute(text("ALTER TABLE shipments ADD COLUMN timeline JSON DEFAULT '[]'"))
            conn.commit()
        except Exception as e:
            logger.warning(f"Schema migration notice: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables are created, default roles exist, and catalog is seeded
    logger.info("Initializing ShopSphere database schema...")
    Base.metadata.create_all(bind=engine)
    ensure_schema_migrations()
    initialize_default_roles()
    initialize_seed_catalog()
    logger.info("ShopSphere startup sequence complete.")
    yield
    # Shutdown
    logger.info("ShopSphere server shutting down.")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="ShopSphere Enterprise E-Commerce API Engine",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

from app.core.security_middleware import SecurityHeadersMiddleware, RateLimitingMiddleware

# Security Hardening & Rate Limiting Middlewares
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitingMiddleware)

# CORS Middleware setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers under /api/v1
app.include_router(health.router, prefix=settings.API_V1_PREFIX)
app.include_router(categories.router, prefix=settings.API_V1_PREFIX)
app.include_router(products.router, prefix=settings.API_V1_PREFIX)
app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(users.router, prefix=settings.API_V1_PREFIX)
app.include_router(cart.router, prefix=settings.API_V1_PREFIX)
app.include_router(wishlist.router, prefix=settings.API_V1_PREFIX)
app.include_router(orders.router, prefix=settings.API_V1_PREFIX)
app.include_router(payments.router, prefix=settings.API_V1_PREFIX)
app.include_router(seller.router, prefix=settings.API_V1_PREFIX)
app.include_router(admin.router, prefix=settings.API_V1_PREFIX)
app.include_router(ai.router, prefix=settings.API_V1_PREFIX)


@app.get("/")
def read_root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "online",
        "docs": "/docs",
        "health": f"{settings.API_V1_PREFIX}/health"
    }
