# backend/app/ocr.py
"""
OCR service – uses Tesseract (via pytesseract) and pdf2image.
"""

import os
import tempfile
import logging
from typing import List

from PIL import Image
import pytesseract

logger = logging.getLogger(__name__)


def _ocr_image(image: Image.Image) -> str:
    """Run Tesseract OCR on a Pillow Image and return extracted text."""
    return pytesseract.image_to_string(image)


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
            return "[ERROR: pdf2image not available]"

        with tempfile.TemporaryDirectory() as tmpdir:
            image_paths = convert_from_path(
                file_path, output_folder=tmpdir, fmt="png", paths_only=True
            )
            texts = []
            for img_path in image_paths:
                img = Image.open(img_path)
                try:
                    texts.append(_ocr_image(img))
                finally:
                    img.close()
            return "\n\n--- Page Break ---\n\n".join(texts)
    else:
        img = Image.open(file_path)
        try:
            return _ocr_image(img)
        finally:
            img.close()
