# backend/app/database.py
"""
Async database connection via SQLAlchemy.
Supports both PostgreSQL (asyncpg) and SQLite (aiosqlite) for local dev.
Handles both local and Render-provided DATABASE_URL formats.
"""

import os
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# ------------------------------------------------------------------
# Database URL – auto-detect driver
# ------------------------------------------------------------------
_raw_url = os.getenv(
    "DATABASE_URL",
    "sqlite+aiosqlite:///./medical.db",  # default to SQLite for local dev
)

DATABASE_URL = _raw_url

# Convert postgres:// → postgresql+asyncpg://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgresql://") and "+asyncpg" not in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

# SQLite needs check_same_thread=False
_connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    _connect_args = {"check_same_thread": False}

# Async engine & session factory
engine: AsyncEngine = create_async_engine(
    DATABASE_URL,
    echo=False,
    future=True,
    connect_args=_connect_args,
)

AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

Base = declarative_base()


# Dependency for FastAPI routes
async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
