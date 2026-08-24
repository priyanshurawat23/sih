# backend/app/crud.py
"""
Data-access helpers (CRUD) for Users and Reports.
"""

import logging
from typing import List, Optional

from sqlalchemy import select, desc, update
from sqlalchemy.ext.asyncio import AsyncSession

from . import models

logger = logging.getLogger(__name__)


# ---------- Users ----------
async def get_user_by_email(db: AsyncSession, email: str) -> Optional[models.User]:
    result = await db.execute(select(models.User).where(models.User.email == email))
    return result.scalars().first()


# ---------- Reports ----------
async def create_report(
    db: AsyncSession,
    user_id: int,
    raw_text: str,
) -> models.Report:
    new_report = models.Report(user_id=user_id, raw_text=raw_text)
    db.add(new_report)
    await db.commit()
    await db.refresh(new_report)
    return new_report


async def get_reports_by_user(
    db: AsyncSession,
    user_id: int,
    limit: int = 100,
) -> List[models.Report]:
    stmt = (
        select(models.Report)
        .where(models.Report.user_id == user_id)
        .order_by(desc(models.Report.created_at))
        .limit(limit)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def update_report_raw_text(
    db: AsyncSession,
    report_id: int,
    raw_text: str,
) -> None:
    """Replace the placeholder raw_text with actual OCR content."""
    stmt = (
        update(models.Report)
        .where(models.Report.id == report_id)
        .values(raw_text=raw_text)
    )
    await db.execute(stmt)
    await db.commit()


async def update_report_summary(
    db: AsyncSession,
    report_id: int,
    summary: str,
    test_values: Optional[dict] = None,
    has_abnormal: bool = False,
) -> None:
    """Update the AI-generated summary and test values for a report."""
    values = {
        "summary": summary,
        "has_abnormal": has_abnormal,
    }
    if test_values is not None:
        values["test_values"] = test_values

    stmt = (
        update(models.Report)
        .where(models.Report.id == report_id)
        .values(**values)
    )
    await db.execute(stmt)
    await db.commit()
