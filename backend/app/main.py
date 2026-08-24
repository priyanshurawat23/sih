# backend/app/main.py
"""
FastAPI application entry point.
"""

import os
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
# CORS – allow configured or all frontend origins (e.g., Vercel, localhost)
# ------------------------------------------------------------------
allowed_origins_env = os.getenv("ALLOWED_ORIGINS")
if allowed_origins_env and allowed_origins_env.strip() != "*":
    allowed_origins = [orig.strip() for orig in allowed_origins_env.split(",") if orig.strip()]
    allow_origin_regex = None
    _allow_credentials = True
else:
    allowed_origins = ["*"]
    allow_origin_regex = None
    _allow_credentials = False

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=allow_origin_regex,
    allow_credentials=_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# ------------------------------------------------------------------
# Root & Health check
# ------------------------------------------------------------------
@app.get("/")
async def root():
    return {
        "message": "AI Medical Report Simplifier API is running",
        "status": "ok",
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    return {"status": "ok"}


# ------------------------------------------------------------------
# Include API routes
# ------------------------------------------------------------------
from .api import router as api_router  # noqa: E402

app.include_router(api_router, prefix="/api")

