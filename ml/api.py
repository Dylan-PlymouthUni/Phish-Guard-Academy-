"""
Lightweight helpers used by tests and simple API-key protection.
This file intentionally keeps minimal dependencies so unit tests don't
require heavy OCR/ML installations.
"""

import os
from typing import List, Tuple
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from PIL import Image, ImageOps

try:  # Optional OCR dependency
    import pytesseract
    HAS_TESSERACT = True
except ImportError:  # pragma: no cover - environment without tesseract
    HAS_TESSERACT = False
    pytesseract = None


# Simple API-key guard (used by legacy endpoints/tests)
security = HTTPBearer()
VALID_API_KEYS = {os.getenv("API_KEY", "demo-key-12345")}


async def verify_api_key(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if credentials.credentials not in VALID_API_KEYS:
        raise HTTPException(status_code=403, detail="Invalid API key")
    return credentials.credentials


def preprocess_image_for_ocr(image: Image.Image) -> Image.Image:
    """Prepare an image for OCR: grayscale + contrast normalization."""
    gray = ImageOps.grayscale(image)
    # autocontrast keeps things simple and dependency-light
    return ImageOps.autocontrast(gray)


def extract_text_and_boxes(image: Image.Image) -> Tuple[str, List[dict]]:
    """Extract text and bounding boxes using pytesseract if available."""
    if not HAS_TESSERACT or pytesseract is None:
        return "", []

    try:
        data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
        text_parts: List[str] = []
        boxes: List[dict] = []
        n = len(data.get("text", []))
        for i in range(n):
            content = data["text"][i].strip()
            if not content:
                continue
            text_parts.append(content)
            boxes.append({
                "text": content,
                "left": int(data.get("left", [0]*n)[i]),
                "top": int(data.get("top", [0]*n)[i]),
                "width": int(data.get("width", [0]*n)[i]),
                "height": int(data.get("height", [0]*n)[i]),
            })
        return " ".join(text_parts), boxes
    except Exception:
        # Fail open for tests; return empty rather than crashing
        return "", []
