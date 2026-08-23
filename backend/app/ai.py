# backend/app/ai.py
"""
AI Simplifier & RAG Pipeline.

Uses the OpenAI API directly (via the `openai` Python SDK) for reliability.
The medical glossary is loaded from a JSON file and included as context in
the prompt so the LLM can cross-reference test definitions and ranges.
"""

import os
import json
import logging
from typing import Dict, Any, Optional

import openai

from . import crud
from .database import AsyncSessionLocal

logger = logging.getLogger(__name__)

# ------------------------------------------------------------------
# OpenAI client  (lazy – so the module can be imported without a key)
# ------------------------------------------------------------------
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
_client = None


def _get_client() -> openai.OpenAI:
    global _client
    if _client is None:
        _client = openai.OpenAI(api_key=OPENAI_API_KEY)
    return _client

# ------------------------------------------------------------------
# Load medical glossary
# ------------------------------------------------------------------
GLOSSARY_PATH = os.path.join(os.path.dirname(__file__), "data", "glossary.json")

_DEFAULT_GLOSSARY = [
    {"term": "glucose", "definition": "Blood sugar level", "reference_range": "70-99 mg/dL"},
    {"term": "cholesterol", "definition": "Total cholesterol level", "reference_range": "125-200 mg/dL"},
    {"term": "hemoglobin", "definition": "Hemoglobin in blood", "reference_range": "13.5-17.5 g/dL"},
]

if os.path.exists(GLOSSARY_PATH):
    with open(GLOSSARY_PATH, "r", encoding="utf-8") as _f:
        GLOSSARY = json.load(_f)
else:
    GLOSSARY = _DEFAULT_GLOSSARY
    os.makedirs(os.path.dirname(GLOSSARY_PATH), exist_ok=True)
    with open(GLOSSARY_PATH, "w", encoding="utf-8") as _f:
        json.dump(GLOSSARY, _f, ensure_ascii=False, indent=2)


def _glossary_context() -> str:
    """Format the glossary into a text block the LLM can reference."""
    lines = []
    for entry in GLOSSARY:
        term = entry.get("term", "")
        defn = entry.get("definition", "")
        ref = entry.get("reference_range", "N/A")
        lines.append(f"- {term}: {defn} (Normal range: {ref})")
    return "\n".join(lines)


GLOSSARY_TEXT = _glossary_context()

# ------------------------------------------------------------------
# System prompt
# ------------------------------------------------------------------
SYSTEM_PROMPT = """You are a medical report simplifier designed to help patients understand their lab reports.

RULES – follow every one strictly:
1. Translate medical jargon into plain, simple language (1-2 short sentences per test).
2. For each test value, compare it against the safe reference range provided in the glossary below.
3. If a value is OUTSIDE the safe range, clearly mark it as **ABNORMAL** and append: "⚠️ Please consult your doctor about this result."
4. NEVER provide a medical diagnosis or treatment advice.
5. Always end your response with: "Disclaimer: This is a simplified summary for informational purposes only. Please consult a qualified healthcare professional for medical advice."
6. If the requested language is Hindi, translate the ENTIRE output to Hindi (Devanagari script). If another regional language is requested, translate accordingly.

MEDICAL GLOSSARY (use these reference ranges):
{glossary}
""".format(glossary=GLOSSARY_TEXT)


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------
def format_test_values(test_vals: Dict[str, Any]) -> str:
    """Format parsed test values into a readable block for the LLM."""
    if not test_vals:
        return "(No structured test values extracted)"
    lines = []
    for name, data in test_vals.items():
        val = data.get("value", "?")
        unit = data.get("unit", "")
        ref = data.get("reference_range", "N/A")
        lines.append(f"  {name}: {val} {unit}  (reference range: {ref})")
    return "\n".join(lines)


# ------------------------------------------------------------------
# Main entry point – called from background task after OCR
# ------------------------------------------------------------------
async def generate_summary(
    report_id: int,
    raw_text: str,
    test_values: Dict[str, Any],
    language: str = "en",
) -> None:
    """Call the LLM to produce a plain-language summary, then store it in the DB."""

    lang_label = "Hindi (Devanagari)" if language == "hi" else "English"
    test_section = format_test_values(test_values)

    user_message = (
        f"Here is a patient's medical lab report (raw OCR text):\n"
        f"---\n{raw_text}\n---\n\n"
        f"Extracted test values:\n{test_section}\n\n"
        f"Please simplify this report in {lang_label}."
    )

    # Call OpenAI Chat Completions API
    try:
        response = _get_client().chat.completions.create(
            model="gpt-4o-mini",
            temperature=0.2,
            max_tokens=2048,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
        )
        summary = response.choices[0].message.content.strip()
    except Exception as exc:
        logger.error("OpenAI API call failed: %s", exc)
        summary = (
            "We were unable to generate a simplified summary at this time. "
            "Please try again later or consult your healthcare provider directly."
        )

    # Detect abnormal flags
    has_abnormal = "ABNORMAL" in summary.upper() or "\u26a0" in summary

    # Persist to DB
    async with AsyncSessionLocal() as db:
        await crud.update_report_summary(
            db=db,
            report_id=report_id,
            summary=summary,
            test_values=test_values,
            has_abnormal=has_abnormal,
        )
    logger.info("Summary generated for report %s (abnormal=%s)", report_id, has_abnormal)
