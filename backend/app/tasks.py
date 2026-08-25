# backend/app/tasks.py
"""
Background task that orchestrates: OCR → test-value parsing → AI summary.
"""

import asyncio
import math
import os
import re
import logging
from typing import Dict, Any

from fastapi import BackgroundTasks

from . import crud, ai
from .ocr import extract_text_from_file
from .database import AsyncSessionLocal

logger = logging.getLogger(__name__)

# ------------------------------------------------------------------
# Regex-based test-value parser
# Matches patterns like:
#   Glucose : 110 mg/dL (70-99)
#   Hemoglobin  14.5 g/dL  (13.5-17.5)
#   SGPT: 45 U/L (7-56)
# ------------------------------------------------------------------
TEST_REGEX = re.compile(
    r"(?P<name>[A-Za-z][A-Za-z0-9 ]{1,30})"   # test name (letters, maybe digits/spaces)
    r"\s*[:=]?\s*"                               # optional colon/equals separator
    r"(?P<value>\d+\.?\d*)"                      # numeric value
    r"\s*"
    r"(?P<unit>[a-zA-Z/%]+(?:/[a-zA-Z]+)?)"      # unit (mg/dL, %, g/dL, etc.)
    r"\s*"
    r"[\(\[]?\s*(?P<range>\d+\.?\d*\s*[-\u2013\u2014]\s*\d+\.?\d*)\s*[\)\]]?",  # reference range in parens/brackets
    re.IGNORECASE,
)

# Secondary pattern: value on same line as name but no range given
TEST_REGEX_SIMPLE = re.compile(
    r"(?P<name>[A-Za-z][A-Za-z0-9 ]{1,30})"
    r"\s*[:=]\s*"
    r"(?P<value>\d+\.?\d*)"
    r"\s*"
    r"(?P<unit>[a-zA-Z/%]+(?:/[a-zA-Z]+)?)",
    re.IGNORECASE,
)

# Regex for splitting a reference range like "70-99", "13.5-17.5", "-5-5"
_RANGE_RE = re.compile(r"^\s*(-?\d+\.?\d*)\s*[-\u2013\u2014]\s*(-?\d+\.?\d*)\s*$")


def _normalise_range(raw_range: str) -> str:
    """Replace en-dash/em-dash with a regular hyphen."""
    return raw_range.replace("\u2013", "-").replace("\u2014", "-").strip()


def _is_value_abnormal(value: float, ref_range: str) -> bool:
    """Check whether *value* falls outside *ref_range* (e.g. '70-99')."""
    try:
        m = _RANGE_RE.match(ref_range)
        if not m:
            return False
        lo, hi = float(m.group(1)), float(m.group(2))
        return value < lo or value > hi
    except Exception:
        return False


def parse_test_values(raw_text: str) -> Dict[str, Any]:
    """Extract test name → {value, unit, reference_range, abnormal} from OCR text."""
    results: Dict[str, Any] = {}

    # First pass: patterns with reference ranges
    for m in TEST_REGEX.finditer(raw_text):
        name = m.group("name").strip().lower()
        value = float(m.group("value"))
        if not math.isfinite(value):
            continue
        unit = m.group("unit").strip()
        ref = _normalise_range(m.group("range"))
        abnormal = _is_value_abnormal(value, ref)
        results[name] = {
            "value": value,
            "unit": unit,
            "reference_range": ref,
            "abnormal": abnormal,
        }

    # Second pass: simple name:value pairs without ranges (skip if already found)
    for m in TEST_REGEX_SIMPLE.finditer(raw_text):
        name = m.group("name").strip().lower()
        if name in results:
            continue
        value = float(m.group("value"))
        if not math.isfinite(value):
            continue
        unit = m.group("unit").strip()
        # Try to find a reference range from the glossary
        ref = _lookup_glossary_range(name)
        abnormal = _is_value_abnormal(value, ref) if ref else False
        results[name] = {
            "value": value,
            "unit": unit,
            "reference_range": ref or "N/A",
            "abnormal": abnormal,
        }

    return results


def _lookup_glossary_range(test_name: str) -> str | None:
    """Look up a reference range from the glossary for a given test name."""
    for entry in ai.GLOSSARY:
        if entry["term"].lower() in test_name or test_name in entry["term"].lower():
            return entry.get("reference_range")
    return None


# ------------------------------------------------------------------
# The actual background coroutine
# ------------------------------------------------------------------
async def process_report_task(
    report_id: int,
    file_path: str,
    content_type: str,
    language: str = "en",
) -> None:
    """Run OCR → parse → AI summary and persist results."""
    try:
        # 1. OCR
        logger.info("OCR starting for report %s …", report_id)
        # 60 second timeout for OCR to prevent infinite hangs
        raw_text = await asyncio.wait_for(
            asyncio.to_thread(extract_text_from_file, file_path, content_type),
            timeout=60.0
        )
        logger.info("OCR done for report %s (%d chars)", report_id, len(raw_text))

        # 2. Parse test values
        test_vals = parse_test_values(raw_text)
        logger.info("Parsed %d test values for report %s", len(test_vals), report_id)

        # 3. Persist raw OCR text + parsed values immediately
        async with AsyncSessionLocal() as db:
            await crud.update_report_raw_text(db=db, report_id=report_id, raw_text=raw_text)
            await crud.update_report_summary(
                db=db,
                report_id=report_id,
                summary="Processing…",
                test_values=test_vals,
                has_abnormal=any(v.get("abnormal") for v in test_vals.values()),
            )

        # 4. AI summary (calls OpenAI)
        ai_res = await ai.generate_summary(
            report_id=report_id,
            raw_text=raw_text,
            test_values=test_vals,
            language=language,
        )
        
        # 5. Persist the AI summary and extra fields
        async with AsyncSessionLocal() as db:
            
            # Optionally append recommendations to the summary or store them if we had a recommendations column
            # Since there is no recommendations column explicitly asked for, we will append to the summary
            final_summary = ai_res.get("summary", "")
            recommendations = ai_res.get("recommendations")
            if recommendations and isinstance(recommendations, list):
                final_summary += "\n\nRecommendations:\n- " + "\n- ".join(recommendations)
                
            await crud.update_report_summary(
                db=db,
                report_id=report_id,
                summary=final_summary,
                test_values=test_vals,
                has_abnormal=any(v.get("abnormal") for v in test_vals.values()),
                doctor_advice=ai_res.get("doctor_advice"),
                risk_level=ai_res.get("risk_level"),
                language=language,
            )

    except Exception:
        logger.exception("Failed to process report %s", report_id)
        # Store an error message so the frontend knows something went wrong
        async with AsyncSessionLocal() as db:
            await crud.update_report_summary(
                db=db,
                report_id=report_id,
                summary="Error: could not process this report. Please try uploading again.",
                test_values=None,
                has_abnormal=False,
            )

    finally:
        # 5. Cleanup temp file
        try:
            os.remove(file_path)
        except OSError:
            pass


# ------------------------------------------------------------------
# FastAPI BackgroundTasks launcher
# ------------------------------------------------------------------
def launch_processing(
    background: BackgroundTasks,
    report_id: int,
    file_path: str,
    content_type: str,
    language: str = "en",
) -> None:
    """Schedule the processing pipeline as a FastAPI background task."""
    background.add_task(process_report_task, report_id, file_path, content_type, language)
