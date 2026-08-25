# backend/app/ai.py
"""
AI Simplifier & RAG Pipeline — Multi-Provider with Auto-Fallback.

Provider priority (auto-switches when credits exhausted / rate-limited):
  1. Google Gemini (via OpenAI-compatible endpoint)
  2. Groq            (via OpenAI-compatible endpoint)
  3. OpenRouter      (via OpenAI-compatible endpoint)

The medical glossary is loaded from a JSON file and included as context in
the prompt so the LLM can cross-reference test definitions and ranges.
"""

import os
import json
import logging
import re
from typing import Dict, Any, List, Tuple

import openai

from . import crud
from .database import AsyncSessionLocal

logger = logging.getLogger(__name__)

# ------------------------------------------------------------------
# Provider Configuration — ordered by priority
# Each entry: (name, base_url, api_key_env_var, model)
# ------------------------------------------------------------------
PROVIDERS: List[Tuple[str, str, str, str]] = [
    (
        "Groq (Qwen)",
        "https://api.groq.com/openai/v1",
        "GROQ_API_KEY",
        "qwen/qwen3.6-27b",
    ),
    (
        "Groq (Whisper/Fallback)",
        "https://api.groq.com/openai/v1",
        "GROQ_API_KEY",
        "openai/gpt-oss-120b",
    ),
    (
        "OpenRouter (Gemma 31B)",
        "https://openrouter.ai/api/v1",
        "OPENROUTER_API_KEY",
        "google/gemma-4-31b-it:free",
    ),
    (
        "OpenRouter (Nemotron)",
        "https://openrouter.ai/api/v1",
        "OPENROUTER_API_KEY",
        "nvidia/nemotron-3-super-120b-a12b:free",
    ),
    (
        "OpenRouter (Gemma 26B)",
        "https://openrouter.ai/api/v1",
        "OPENROUTER_API_KEY",
        "google/gemma-4-26b-a4b-it:free",
    ),
    (
        "OpenRouter (Auto Router)",
        "https://openrouter.ai/api/v1",
        "OPENROUTER_API_KEY",
        "openrouter/free",
    ),
]

# Errors that indicate we should fall back to the next provider
_FALLBACK_ERRORS = (
    "rate_limit",
    "quota",
    "insufficient_quota",
    "billing",
    "limit exceeded",
    "too many requests",
    "429",
    "402",
    "403",
    "credits",
    "resource_exhausted",
)


def _should_fallback(exc: Exception) -> bool:
    """Return True if the error warrants trying the next provider."""
    msg = str(exc).lower()
    return any(trigger in msg for trigger in _FALLBACK_ERRORS)


def _build_client(base_url: str, api_key: str) -> openai.AsyncOpenAI:
    """Create an OpenAI-compatible async client for any provider."""
    return openai.AsyncOpenAI(
        api_key=api_key,
        base_url=base_url,
        timeout=60.0,
    )


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
1. Translate medical jargon into plain, simple language. Explain each test in 3-4 simple sentences.
2. For each test value, compare it against the safe reference range provided in the glossary below.
3. If a value is OUTSIDE the safe range, explain WHY it matters and what it could indicate. Clearly mark it as **ABNORMAL**.
4. ALWAYS recommend a specialist doctor type based on abnormal values.
5. Provide a full specialist description (what they do, what conditions they treat).
6. Give urgency level (ROUTINE, SOON, or URGENT).
7. Give 3-5 actionable health recommendations.
8. NEVER provide a medical diagnosis or treatment advice. End with a disclaimer in the chosen language.
9. Support the following languages with proper instructions: en (English), hi (Hindi/Devanagari), ta (Tamil), te (Telugu), bn (Bengali), mr (Marathi), gu (Gujarati), kn (Kannada), ml (Malayalam), pa (Punjabi). Translate the ENTIRE output to the requested language.
10. Output MUST be valid JSON matching this exact structure:

{{
  "summary": "Detailed plain-language summary of the report (3-4 sentences per test)",
  "risk_level": "LOW" | "MODERATE" | "HIGH",
  "doctor_advice": {{
    "specialist_type": "Cardiologist",
    "reason": "Your cholesterol levels are above normal range...",
    "urgency": "ROUTINE" | "SOON" | "URGENT",
    "description": "A cardiologist specializes in heart and blood vessel conditions..."
  }},
  "recommendations": [
    "Reduce sugar intake",
    "Exercise 30 minutes daily"
  ]
}}

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
# Core: call LLM with automatic provider fallback
# ------------------------------------------------------------------
async def _call_llm_with_fallback(messages: List[Dict[str, str]]) -> Dict[str, Any]:
    """
    Try each provider in priority order.
    Falls back automatically when a provider fails, is rate-limited, or outputs invalid JSON.
    Returns the parsed JSON dict or raises if all fail.
    """
    last_exc = None

    for provider_name, base_url, key_env, model in PROVIDERS:
        api_key = os.getenv(key_env, "").strip()
        if not api_key:
            logger.warning("[AI Fallback] Skipping %s — no API key set (%s).", provider_name, key_env)
            continue

        logger.info("[AI Fallback] Trying provider: %s (model: %s)", provider_name, model)
        client = _build_client(base_url, api_key)

        try:
            response = await client.chat.completions.create(
                model=model,
                temperature=0.2,
                max_tokens=4096,
                messages=messages,
            )
            content = response.choices[0].message.content
            if content is None:
                raise ValueError("Model returned None content")
            response_text = content.strip()

            # Parse JSON
            match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', response_text, re.DOTALL | re.IGNORECASE)
            if match:
                clean_json = match.group(1)
            else:
                # Fallback: remove think tags and just find the outer braces
                response_text = re.sub(r'<think>.*?</think>', '', response_text, flags=re.DOTALL | re.IGNORECASE)
                start_idx = response_text.find('{')
                end_idx = response_text.rfind('}')
                if start_idx != -1 and end_idx != -1:
                    clean_json = response_text[start_idx:end_idx+1]
                else:
                    clean_json = response_text

            parsed = json.loads(clean_json)

            logger.info("[AI Fallback] Success with provider: %s", provider_name)
            return parsed

        except Exception as exc:
            logger.warning("[AI Fallback] Provider %s failed: %s", provider_name, exc)
            last_exc = exc
            continue

    raise last_exc or Exception("All AI providers failed.")


async def generate_summary(
    report_id: int, raw_text: str, test_values: Dict[str, Any], language: str = "en"
) -> Dict[str, Any]:
    """
    Use an LLM (with fallback) to simplify the report, assign a risk level,
    and suggest medical advice.
    """
    lang_map = {
        "en": "English", "hi": "Hindi", "ta": "Tamil", "te": "Telugu",
        "bn": "Bengali", "mr": "Marathi", "gu": "Gujarati", "kn": "Kannada",
        "ml": "Malayalam", "pa": "Punjabi"
    }
    lang_label = lang_map.get(language, "English")
    test_section = format_test_values(test_values)

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": (
                f"Here is a patient's medical lab report (raw OCR text):\n"
                f"---\n{raw_text}\n---\n\n"
                f"Extracted test values:\n{test_section}\n\n"
                f"Please provide the structured JSON response in {lang_label}. Ensure the output is valid JSON only."
            ),
        },
    ]

    try:
        parsed_json = await _call_llm_with_fallback(messages)
        logger.info("Summary generated successfully for report %s", report_id)
        return parsed_json
    except Exception as e:
        logger.error("Failed to generate/parse AI summary for report %s: %s", report_id, e)
        return {
            "summary": (
                "Error: We were unable to generate a simplified summary at this time. "
                "Please try again later or consult your healthcare provider directly."
            ),
            "risk_level": "MODERATE",
            "doctor_advice": None,
            "recommendations": []
        }
import re
