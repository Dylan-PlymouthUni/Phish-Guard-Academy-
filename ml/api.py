from __future__ import annotations

import io
import logging
import math
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urlparse

import joblib
import numpy as np
from fastapi import FastAPI, Request, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from PIL import Image, ImageDraw, ImageFont

# OCR support
try:
    import pytesseract  # type: ignore
    HAS_TESSERACT = True
except Exception:
    HAS_TESSERACT = False

logger = logging.getLogger("phishguard")
logging.basicConfig(level=logging.INFO)

app = FastAPI(title="PhishGuard OCR + ML + Heuristics API")

MODEL_PATH = Path("ml/model/phish_rf_full.joblib")
MODEL_BUNDLE: Optional[Dict[str, Any]] = None

# -------------------------------------------------------------
# Load ML model
# -------------------------------------------------------------

try:
    MODEL_BUNDLE = joblib.load(MODEL_PATH)
    logger.info(f"Loaded model bundle from {MODEL_PATH}")
except Exception as e:
    logger.warning(f"Failed to load model bundle: {e}")

# -------------------------------------------------------------
# OCR and URL analysis
# -------------------------------------------------------------

def extract_text_and_boxes(pil_img: Image.Image) -> Tuple[str, List[Dict[str, Any]]]:
    """Return OCR text and word-level boxes using pytesseract (if available)."""
    if not HAS_TESSERACT:
        return "", []
    data = pytesseract.image_to_data(pil_img, output_type=pytesseract.Output.DICT)
    text = " ".join([w for w in data.get("text", []) if w.strip()])
    boxes = []
    n = len(data.get("text", []))
    for i in range(n):
        w = data["text"][i].strip()
        if not w:
            continue
        boxes.append({
            "word": w,
            "left": int(data["left"][i]),
            "top": int(data["top"][i]),
            "width": int(data["width"][i]),
            "height": int(data["height"][i]),
            "conf": float(data["conf"][i]) if data["conf"][i].isdigit() else -1,
        })
    return text, boxes

URL_RE = re.compile(
    r"""(?xi)\b((?:https?://|www\.)[^\s'"]+)"""
)

def find_urls(text: str) -> List[str]:
    return list({m.group(0) for m in URL_RE.finditer(text)})

def score_url(url: str) -> float:
    """Simple placeholder scoring. Replace with your ML model call."""
    # If you have MODEL_BUNDLE or a loaded estimator, use it here.
    # Return score in [0,1] with higher = more suspicious.
    if MODEL_BUNDLE and "model" in MODEL_BUNDLE:
        # Example: extract features and call model.predict_proba(...)
        try:
            features = MODEL_BUNDLE.get("featurize_fn", lambda u: [0])(url)
            model = MODEL_BUNDLE["model"]
            prob = float(model.predict_proba([features])[0, 1])
            return prob
        except Exception:
            return 0.0
    # Fallback heuristics
    score = 0.0
    if url.count("-") > 2 or url.count("@") > 0:
        score += 0.4
    if re.search(r"(free|login|verify|secure|account|update)", url, re.I):
        score += 0.4
    if not url.startswith("https"):
        score += 0.2
    return min(1.0, score)

@app.post("/analyze_image")
async def analyze_image(file: UploadFile = File(...)):
    """Return JSON with OCR text, extracted URLs and per-URL suspicion scores."""
    content = await file.read()
    try:
        pil = Image.open(io.BytesIO(content)).convert("RGB")
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid image") from e

    text, boxes = extract_text_and_boxes(pil)
    urls = find_urls(text)
    url_infos = [{"url": u, "score": score_url(u), "suspicious": score_url(u) > 0.5} for u in urls]

    return JSONResponse({
        "text": text,
        "urls": url_infos,
        "word_boxes": boxes,
    })

@app.post("/annotated_image")
async def annotated_image(file: UploadFile = File(...)):
    """Return an annotated PNG where suspicious words (URLs) are boxed."""
    content = await file.read()
    try:
        pil = Image.open(io.BytesIO(content)).convert("RGB")
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid image") from e

    text, boxes = extract_text_and_boxes(pil)
    urls = find_urls(text)
    suspicious_words = set()
    for u in urls:
        suspicious_words.update(re.findall(r"[A-Za-z0-9\-\._]+", u))

    draw = ImageDraw.Draw(pil)
    for b in boxes:
        word = b["word"]
        if any(part in word for part in suspicious_words):
            rect = (b["left"], b["top"], b["left"] + b["width"], b["top"] + b["height"])
            draw.rectangle(rect, outline="red", width=2)

    buf = io.BytesIO()
    pil.save(buf, format="PNG")
    buf.seek(0)
    return StreamingResponse(buf, media_type="image/png")