# backend/app/schemas.py
"""
Pydantic models for API request / response validation.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# -------------------- Request / upload --------------------
class UploadResponse(BaseModel):
    report_id: int
    message: str = Field(default="Upload accepted, processing started.")


# -------------------- Single report -----------------------
class ReportOut(BaseModel):
    id: int
    raw_text: str
    summary: Optional[str] = None
    test_values: Optional[Dict[str, Any]] = None
    created_at: datetime
    has_abnormal: bool
    doctor_advice: Optional[Dict[str, Any]] = None
    risk_level: Optional[str] = None
    language: str = 'en'

    model_config = {"from_attributes": True}


# -------------------- History -----------------------------
class HistoryResponse(BaseModel):
    user_id: int
    reports: List[ReportOut]
