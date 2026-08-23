# backend/tests/test_tasks.py
"""
Unit tests for the OCR text parsing logic (no database or network needed).
"""

import sys
import os

# Allow importing backend.app modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.tasks import parse_test_values


def test_parse_standard_format():
    """Pattern: TestName: Value Unit (Low-High)"""
    raw = "Glucose: 110 mg/dL (70-99)\nHemoglobin: 14.5 g/dL (13.5-17.5)"
    result = parse_test_values(raw)
    assert "glucose" in result
    assert result["glucose"]["value"] == 110.0
    assert result["glucose"]["unit"] == "mg/dL"
    assert result["glucose"]["abnormal"] is True   # 110 > 99

    assert "hemoglobin" in result
    assert result["hemoglobin"]["value"] == 14.5
    assert result["hemoglobin"]["abnormal"] is False  # within range


def test_parse_low_value_flagged():
    """A value below the low end of the reference range should be flagged."""
    raw = "Hemoglobin: 10.0 g/dL (13.5-17.5)"
    result = parse_test_values(raw)
    assert "hemoglobin" in result
    assert result["hemoglobin"]["abnormal"] is True


def test_parse_normal_value():
    """A value within the reference range should NOT be flagged."""
    raw = "Cholesterol: 180 mg/dL (125-200)"
    result = parse_test_values(raw)
    assert "cholesterol" in result
    assert result["cholesterol"]["abnormal"] is False


def test_parse_empty_string():
    """Empty text should return an empty dict."""
    assert parse_test_values("") == {}


def test_parse_no_match():
    """Text with no recognisable test patterns returns empty dict."""
    raw = "This is a random sentence with no medical data."
    assert parse_test_values(raw) == {}


def test_parse_multiple_tests():
    """Several tests in one block."""
    raw = """
    Glucose: 95 mg/dL (70-99)
    Cholesterol: 220 mg/dL (125-200)
    Hemoglobin: 15.0 g/dL (13.5-17.5)
    Creatinine: 1.5 mg/dL (0.7-1.3)
    """
    result = parse_test_values(raw)
    assert len(result) >= 4
    assert result["glucose"]["abnormal"] is False
    assert result["cholesterol"]["abnormal"] is True   # 220 > 200
    assert result["hemoglobin"]["abnormal"] is False
    assert result["creatinine"]["abnormal"] is True    # 1.5 > 1.3


if __name__ == "__main__":
    test_parse_standard_format()
    test_parse_low_value_flagged()
    test_parse_normal_value()
    test_parse_empty_string()
    test_parse_no_match()
    test_parse_multiple_tests()
    print("All tests passed!")
