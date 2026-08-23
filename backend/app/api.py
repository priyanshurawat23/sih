# backend/app/api.py
"""
FastAPI route definitions.
"""

import os
import uuid
import logging

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from sqlalchemy.ext.asyncio import AsyncSession

from . import crud, models, schemas, tasks
from .database import get_db

logger = logging.getLogger(__name__)
router = APIRouter()

# Temp directory for uploaded files (inside the package so Docker can reach it)
TMP_UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "tmp_uploads")
os.makedirs(TMP_UPLOAD_DIR, exist_ok=True)


# ------------------------------------------------------------------
# Demo user helper (no real auth in MVP)
# ------------------------------------------------------------------
async def get_demo_user(db: AsyncSession = Depends(get_db)) -> models.User:
    demo_email = "demo@example.com"
    user = await crud.get_user_by_email(db, demo_email)
    if not user:
        user = models.User(email=demo_email, hashed_password="not_used")
        db.add(user)
        await db.commit()
        await db.refresh(user)
    return user


# ------------------------------------------------------------------
# POST /upload – accept PDF or image, kick off background processing
# ------------------------------------------------------------------
ALLOWED_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/tiff",
    "image/jpg",
}


@router.post(
    "/upload",
    response_model=schemas.UploadResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def upload_report(
    background: BackgroundTasks,
    file: UploadFile = File(...),
    language: str = Query("en", description="Output language: 'en' or 'hi'"),
    db: AsyncSession = Depends(get_db),
    user: models.User = Depends(get_demo_user),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{file.content_type}'. Upload a PDF or image.",
        )

    # Save to temp file
    ext = os.path.splitext(file.filename or "upload")[1] or ".bin"
    temp_name = f"{uuid.uuid4()}{ext}"
    temp_path = os.path.join(TMP_UPLOAD_DIR, temp_name)

    content = await file.read()
    with open(temp_path, "wb") as f:
        f.write(content)

    # Create DB placeholder
    report = await crud.create_report(
        db=db,
        user_id=user.id,
        raw_text=f"[Processing {file.filename} …]",
    )

    # Launch OCR → AI pipeline in background
    tasks.launch_processing(
        background=background,
        report_id=report.id,
        file_path=temp_path,
        content_type=file.content_type,
        language=language,
    )

    logger.info("Upload accepted: report_id=%s, file=%s", report.id, file.filename)
    return schemas.UploadResponse(report_id=report.id)


# ------------------------------------------------------------------
# GET /report/{report_id} – fetch a single report (for polling)
# ------------------------------------------------------------------
@router.get(
    "/report/{report_id}",
    response_model=schemas.ReportOut,
    status_code=status.HTTP_200_OK,
)
async def get_report(
    report_id: int,
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select

    result = await db.execute(
        select(models.Report).where(models.Report.id == report_id)
    )
    report = result.scalars().first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


# ------------------------------------------------------------------
# GET /history/{user_id} – all reports for a user
# ------------------------------------------------------------------
@router.get(
    "/history/{user_id}",
    response_model=schemas.HistoryResponse,
    status_code=status.HTTP_200_OK,
)
async def get_history(
    user_id: int,
    db: AsyncSession = Depends(get_db),
):
    reports = await crud.get_reports_by_user(db, user_id)
    return schemas.HistoryResponse(user_id=user_id, reports=reports)
