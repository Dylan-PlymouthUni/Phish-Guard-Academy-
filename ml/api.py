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
from fastapi import FastAPI, Request
from PIL import Image

# Try OCR; if Tesseract missing, degrade gracefully
try:
    import pytesseract
    HAS_TESSERACT = True
except Exception:
    HAS_TESSERACT = False

logger = logging.getLogger("phishguard")
logging.basicConfig(level=logging.INFO)

app = FastAPI(title="PhishGuard Hybrid ML + OCR API")

MODEL_PATH = Path("ml/model/phish_rf_full.joblib")
MODEL_BUNDLE = None

# ---------------------- Load ML Model ----------------------
if MODEL_PATH.exists():
    try:
        loaded = joblib.load(MODEL_PATH)
        if isinstance(loaded, dict):
            MODEL_BUNDLE = loaded
        else:
            MODEL_BUNDLE = {"model": loaded}
        logger.info("Loaded ML model bundle from %s", MODEL_PATH)
    except Exception as e:
        logger.exception("Failed to load ML model: %s", e)
else:
    logger.warning("ML model not found — ML scoring disabled.")


# ---------------------- URL Helpers ----------------------
def extract_domain(url: str) -> str:
    url = url.strip() if url else ""
    if not url:
        return ""
    if "://" not in url:
        url = "http://" + url
    parsed = urlparse(url)
    host = parsed.netloc.lower().split(":")[0]
    return host


def is_ip(host: str) -> bool:
    parts = host.split(".")
    if len(parts) != 4:
        return False
    try:
        return all(0 <= int(p) <= 255 for p in parts)
    except Exception:
        return False


def has_homoglyphs(host: str) -> bool:
    return any(ord(c) > 127 for c in host)


def extract_url_features(url: str) -> Dict[str, float]:
    if not url:
        return {}
    if "://" not in url:
        url = "http://" + url
    parsed = urlparse(url)
    domain = parsed.netloc.lower().split(":")[0]
    path = parsed.path or ""
    query = parsed.query or ""

    feats = {
        "url_length": len(url),
        "num_digits": sum(ch.isdigit() for ch in url),
        "num_dots": url.count("."),
        "num_hyphens": url.count("-"),
        "num_subdirs": path.count("/"),
        "query_length": len(query),
        "has_at_symbol": 1 if "@" in url else 0,
        "has_ip": 1 if is_ip(domain) else 0,
        "uses_https": 1 if url.startswith("https://") else 0,
        "domain_length": len(domain),
        "num_params": query.count("&") + (1 if query else 0)
    }

    # Shannon entropy
    counts = {}
    for ch in url:
        counts[ch] = counts.get(ch, 0) + 1
    entropy = 0
    n = len(url) or 1
    for c in counts.values():
        p = c / n
        entropy -= p * math.log2(p)
    feats["url_entropy"] = entropy

    return feats


# ---------------------- Heuristic Engine ----------------------
def heuristic_score(text: str, url: str, ocr_text: str = ""):
    combined = f"{text} {ocr_text}".lower()
    domain = extract_domain(url)
    score = 0
    findings = []

    # URGENCY
    if any(k in combined for k in ["urgent", "immediately", "verify now", "24 hours", "locked"]):
        score += 20
        findings.append("Urgent or threatening language detected.")

    # CREDENTIAL BAIT
    if any(k in combined for k in ["password", "otp", "security code", "verify account"]):
        score += 25
        findings.append("Message requests sensitive credentials.")

    # BRAND MISMATCH
    brands = ["paypal", "microsoft", "amazon", "apple", "google", "netflix"]
    for b in brands:
        if b in combined and domain and b not in domain:
            score += 25
            findings.append(f"Brand '{b}' mentioned but domain '{domain}' does not match.")

    # RAW IP
    if domain and is_ip(domain):
        score += 25
        findings.append(f"URL uses raw IP '{domain}'.")

    # DODGY TLD
    if domain.endswith((".xyz", ".top", ".click", ".icu", ".cn", ".ru")):
        score += 10
        findings.append(f"Domain '{domain}' uses high-risk TLD.")

    # MANY PARAMETERS
    if "?" in url and url.count("&") >= 4:
        score += 10
        findings.append("URL contains many parameters (possible obfuscation).")

    # TOO MANY !!!
    if combined.count("!") >= 3:
        score += 5
        findings.append("Excessive exclamation marks (pressure tactic).")

    score = max(0, min(100, score))

    severity = "high" if score >= 70 else "medium" if score >= 40 else "low"

    return score, severity, findings


# ---------------------- OCR ----------------------
def run_ocr(image_bytes: Optional[bytes]):
    if not image_bytes or not HAS_TESSERACT:
        return "", []
    try:
        img = Image.open(io.BytesIO(image_bytes))
        text = pytesseract.image_to_string(img)
        return text, []
    except Exception as e:
        logger.exception("OCR failed: %s", e)
        return "", []


# ---------------------- ML ----------------------
def ml_score(url: str):
    if not url or MODEL_BUNDLE is None:
        return 0, 0.0, []

    try:
        model = MODEL_BUNDLE.get("model")
        feats = extract_url_features(url)

        if "feature_names" in MODEL_BUNDLE:
            names = MODEL_BUNDLE["feature_names"]
        else:
            names = sorted(feats.keys())

        X = np.array([[feats.get(n, 0) for n in names]])

        if hasattr(model, "predict_proba"):
            p = model.predict_proba(X)[0][1]
        else:
            p = model.predict(X)[0]

        risk = int(p * 100)
        findings = []

        if risk >= 70:
            findings.append("ML model flags URL as high-risk.")
        elif risk >= 40:
            findings.append("ML model flags URL as moderately risky.")

        return risk, float(p), findings

    except Exception as e:
        logger.exception("ML scoring exception: %s", e)
        return 0, 0.0, ["ML model error — using heuristics only."]


# ---------------------- MAIN ENDPOINT ----------------------
@app.post("/analyze")
async def analyze(request: Request):
    ct = request.headers.get("content-type", "") or ""
    text = ""
    url = ""
    image_bytes = None

    if "application/json" in ct:
        data = await request.json()
        text = data.get("text", "") or ""
        url = data.get("url", "") or ""
    else:
        form = await request.form()
        text = form.get("text") or ""
        url = form.get("url") or ""
        file = form.get("image")
        if file and hasattr(file, "read"):
            image_bytes = await file.read()

    ocr_text, boxes = run_ocr(image_bytes)

    h_risk, h_sev, h_findings = heuristic_score(text, url, ocr_text)
    m_risk, m_conf, m_findings = ml_score(url)

    final = max(h_risk, m_risk)
    severity = "high" if final >= 70 else "medium" if final >= 40 else "low"

    return {
        "risk": final,
        "severity": severity,
        "heuristic_risk": h_risk,
        "heuristic_severity": h_sev,
        "ml_risk": m_risk,
        "ml_confidence": m_conf,
        "findings": h_findings + m_findings,
        "ocr_text": ocr_text,
        "boxes": boxes,
        "engine": "hybrid_v3_full"
    }
