# backend/app/main.py
"""
FastAPI application entry point.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import engine
from . import models

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ------------------------------------------------------------------
# Lifespan – create DB tables on startup
# ------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: auto-create tables
    async with engine.begin() as conn:
        await conn.run_sync(models.Base.metadata.create_all)
    logger.info("Database tables created / verified.")
    yield
    # Shutdown: nothing to do
    logger.info("Application shutting down.")


app = FastAPI(
    title="AI Medical Report Simplifier",
    version="0.1.0",
    description="FastAPI backend: OCR → RAG → plain-language medical summary.",
    lifespan=lifespan,
)

# ------------------------------------------------------------------
# CORS – allow all origins for development
# ------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------------------------------
# Include API routes
# ------------------------------------------------------------------
from .api import router as api_router  # noqa: E402

app.include_router(api_router, prefix="/api")


# ------------------------------------------------------------------
# Health check
# ------------------------------------------------------------------
@app.get("/health")
async def health_check():
    return {"status": "ok"}
