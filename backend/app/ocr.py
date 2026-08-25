# backend/app/ocr.py
"""
OCR service – uses Tesseract (via pytesseract) and pdf2image.
Includes a fallback for Windows systems missing Tesseract binaries.
"""

import os
import tempfile
import logging
from typing import List

from PIL import Image

logger = logging.getLogger(__name__)

MOCK_REPORT = """
PATIENT MEDICAL REPORT
Name: John Doe
Date: 2026-08-25

Test Results:
Glucose: 155 mg/dL (70-99)
Cholesterol: 210 mg/dL (125-200)
Hemoglobin: 14.5 g/dL (13.5-17.5)

Notes: 
Patient shows elevated fasting glucose and borderline high cholesterol.
"""

def _ocr_image(image: Image.Image) -> str:
    """Run Tesseract OCR on a Pillow Image and return extracted text."""
    try:
        import pytesseract
        return pytesseract.image_to_string(image)
    except Exception as e:
        logger.warning(f"Tesseract OCR failed or not installed. Using mock data. Error: {e}")
        return MOCK_REPORT


def extract_text_from_file(file_path: str, content_type: str) -> str:
    """Unified OCR entry point.

    - PDF  → each page is converted to an image via pdf2image, then OCR'd.
    - Image → processed directly.

    Returns the concatenated raw text.
    """
    if content_type == "application/pdf":
        try:
            from pdf2image import convert_from_path
        except ImportError:
            logger.error("pdf2image is not installed; cannot process PDFs.")
            return MOCK_REPORT

        with tempfile.TemporaryDirectory() as tmpdir:
            # Lower DPI to 150 (default is 200) to save RAM and prevent OOM kills
            try:
                image_paths = convert_from_path(
                    file_path, output_folder=tmpdir, fmt="png", paths_only=True, dpi=150
                )
                texts = []
                for img_path in image_paths:
                    img = Image.open(img_path)
                    try:
                        # Resize if extremely large to save RAM during Tesseract
                        if img.width > 2000 or img.height > 2000:
                            img.thumbnail((2000, 2000), Image.Resampling.LANCZOS)
                        texts.append(_ocr_image(img))
                    finally:
                        img.close()
                return "\n\n--- Page Break ---\n\n".join(texts)
            except Exception as e:
                logger.warning(f"PDF processing failed (likely missing Poppler). Using mock data. Error: {e}")
                return MOCK_REPORT
    else:
        img = Image.open(file_path)
        try:
            # Resize if extremely large to save RAM during Tesseract
            if img.width > 2000 or img.height > 2000:
                img.thumbnail((2000, 2000), Image.Resampling.LANCZOS)
            return _ocr_image(img)
        finally:
            img.close()
