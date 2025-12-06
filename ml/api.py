from _future_ import annotations

import io
import logging
import re
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

import joblib
from fastapi import FastAPI, UploadFile, File, Form
from PIL import Image

# Try OCR. If missing, disable gracefully.
try:
    import pytesseract
    HAS_TESSERACT = True
except Exception:
    HAS_TESSERACT = False

logger = logging.getLogger("phishguard")
logging.basicConfig(level=logging.INFO)

app = FastAPI(title="PhishGuard Hybrid ML + OCR API")

# -------------------------------------------------------------------
# Load ML Model
# -------------------------------------------------------------------
MODEL_PATH = Path("ml/model/phish_rf_full.joblib")
if MODEL_PATH.exists():
    model_bundle = joblib.load(MODEL_PATH)
    MODEL = model_bundle["model"]
    VECTORIZER = model_bundle["vectorizer"]
    logger.info("Loaded ML model bundle from %s", MODEL_PATH)
else:
    MODEL = None
    VECTORIZER = None
    logger.warning("ML model NOT FOUND, ML disabled.")

# -------------------------------------------------------------------
# OCR Function
# -------------------------------------------------------------------
def extract_ocr_text(image_bytes: bytes) -> str:
    if not HAS_TESSERACT:
        return ""
    try:
        img = Image.open(io.BytesIO(image_bytes))
        return pytesseract.image_to_string(img)
    except Exception as e:
        logger.error("OCR failed: %s", e)
        return ""

# -------------------------------------------------------------------
# Heuristic Engine
# -------------------------------------------------------------------
def heuristic_score(text: str, url: str = "") -> Dict[str, Any]:
    text_lower = text.lower()
    url_lower = url.lower()

    risk = 0
    findings = []

    if "urgent" in text_lower or "immediately" in text_lower or "verify" in text_lower:
        risk += 35
        findings.append("Urgent or threatening language detected.")

    if "paypal" in text_lower and "paypal.com" not in url_lower:
        risk += 20
        findings.append("Brand mismatch between text and URL.")

    if re.match(r"\d{1,3}(\.\d{1,3}){3}", url_lower):
        risk += 30
        findings.append("URL uses raw IP address.")

    return {
        "heuristic_risk": min(risk, 100),
        "findings": findings
    }

# -------------------------------------------------------------------
# API ROUTE
# -------------------------------------------------------------------
@app.post("/analyze")
async def analyze(
    text: str = Form(""),
    url: str = Form(""),
    image: Optional[UploadFile] = File(None),
):
    ocr_text = ""
    if image:
        img_bytes = await image.read()
        ocr_text = extract_ocr_text(img_bytes)

    combined_text = f"{text}\n{ocr_text}".strip()

    # Heuristic pass
    heur = heuristic_score(combined_text, url)

    # ML pass
    ml_risk = 0
    ml_conf = 0.0
    if MODEL and VECTORIZER:
        X = VECTORIZER.transform([combined_text])
        ml_risk = int(MODEL.predict_proba(X)[0][1] * 100)
        ml_conf = float(MODEL.predict_proba(X)[0][1])

    final = int((ml_risk * 0.6) + (heur["heuristic_risk"] * 0.4))

    return {
        "risk": final,
        "severity": "high" if final >= 70 else "medium" if final >= 40 else "low",
        "ml_risk": ml_risk,
        "ml_confidence": ml_conf,
        "heuristic_risk": heur["heuristic_risk"],
        "heuristic_findings": heur["findings"],
        "ocr_text": ocr_text,
        "engine": "hybrid_v2_ocr"
    }
