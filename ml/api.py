from __future__ import annotations

import io, logging, math, re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urlparse

import joblib, numpy as np
from fastapi import FastAPI, Request
from PIL import Image

try:
    import pytesseract
    HAS_TESSERACT = True
except:
    HAS_TESSERACT = False

logger = logging.getLogger("phishguard")
logging.basicConfig(level=logging.INFO)

app = FastAPI(title="PhishGuard Hybrid ML + OCR API")

MODEL_PATH = Path("ml/model/phish_rf_full.joblib")
MODEL_BUNDLE = None

if MODEL_PATH.exists():
    try:
        loaded = joblib.load(MODEL_PATH)
        MODEL_BUNDLE = loaded if isinstance(loaded, dict) else {"model": loaded}
    except:
        MODEL_BUNDLE = None

# ------------------ URL HELPERS ------------------

def extract_domain(url: str) -> str:
    if "://" not in url:
        url = "http://" + url
    host = urlparse(url).netloc.lower().split(":")[0]
    return host

def is_ip(host: str) -> bool:
    parts = host.split(".")
    if len(parts) != 4: return False
    try: return all(0 <= int(p) <= 255 for p in parts)
    except: return False

def extract_url_features(url: str) -> Dict[str, float]:
    if "://" not in url:
        url = "http://" + url
    p = urlparse(url)
    domain = p.netloc.lower().split(":")[0]
    path = p.path or ""
    query = p.query or ""

    feats = {
        "url_length": len(url),
        "num_digits": sum(c.isdigit() for c in url),
        "num_dots": url.count("."),
        "num_hyphens": url.count("-"),
        "num_subdirs": path.count("/"),
        "query_length": len(query),
        "has_ip": 1.0 if is_ip(domain) else 0.0,
        "uses_https": 1.0 if url.startswith("https://") else 0.0,
        "domain_length": len(domain),
        "num_params": query.count("&") + (1 if query else 0),
    }

    # entropy
    counts = {}
    for ch in url:
        counts[ch] = counts.get(ch, 0) + 1
    entropy = 0
    n = len(url) or 1
    for c in counts.values():
        p = c / n
        entropy -= p * math.log2(p)
    feats["url_entropy"] = entropy

    return {k: float(v) for k, v in feats.items()}

# ------------------ HEURISTICS ------------------

def heuristic_score(text: str, url: str, ocr_text: str = ""):
    full = (text + " " + ocr_text).lower()
    domain = extract_domain(url)

    score = 0
    findings = []

    if any(k in full for k in ["urgent", "verify", "immediately", "locked", "suspended"]):
        score += 20; findings.append("Urgency detected.")

    if any(k in full for k in ["password", "otp", "code", "bank", "account", "login"]):
        score += 25; findings.append("Sensitive credential request detected.")

    brands = ["paypal","microsoft","amazon","apple","google","facebook","instagram"]
    for b in brands:
        if b in full and b not in domain:
            score += 25
            findings.append(f"Brand '{b}' does not match domain '{domain}'.")
            break

    if is_ip(domain):
        score += 30
        findings.append(f"URL uses raw IP '{domain}'.")

    if full.count("!") >= 3:
        score += 5
        findings.append("Excessive exclamation marks.")

    score = max(0, min(100, score))
    severity = "high" if score >= 70 else "medium" if score >= 40 else "low"
    return score, severity, findings

# ------------------ OCR ------------------

def run_ocr(image_bytes):
    if not image_bytes or not HAS_TESSERACT:
        return "", []
    try:
        img = Image.open(io.BytesIO(image_bytes))
        txt = pytesseract.image_to_string(img)
        return txt, []
    except:
        return "", []

# ------------------ ML ------------------

def ml_score(url: str):
    if not MODEL_BUNDLE or not url:
        return 0, 0.0, []

    try:
        model = MODEL_BUNDLE.get("model")
        feats = extract_url_features(url)

        names = MODEL_BUNDLE.get("feature_names") or sorted(feats.keys())
        X = np.array([[feats.get(n, 0.0) for n in names]])

        if hasattr(model, "predict_proba"):
            p = model.predict_proba(X)[0]
            phish = float(p[1]) if len(p) == 2 else float(max(p))
        else:
            phish = float(model.predict(X)[0])

        risk = int(phish * 100)
        f = []
        if risk >= 70: f.append("ML: high phishing probability.")
        elif risk >= 40: f.append("ML: moderately suspicious URL.")
        return risk, phish, f

    except:
        return 0, 0.0, ["ML error; fallback active."]

# ------------------ API ------------------

@app.post("/analyze")
async def analyze(request: Request):
    ct = request.headers.get("content-type","")

    text = ""
    url = ""
    image_bytes = None

    if "application/json" in ct:
        data = await request.json()
        text = data.get("text","")
        url = data.get("url","")
    else:
        form = await request.form()
        text = form.get("text","")
        url = form.get("url","")
        file = form.get("image")
        if hasattr(file, "read"):
            image_bytes = await file.read()

    ocr_text, boxes = run_ocr(image_bytes)
    h_score, h_sev, h_finds = heuristic_score(text, url, ocr_text)
    ml_risk, ml_conf, ml_finds = ml_score(url)

    final = max(h_score, ml_risk)
    sev = "high" if final >= 70 else "medium" if final >= 40 else "low"

    return {
        "risk": final,
        "severity": sev,
        "ml_risk": ml_risk,
        "ml_confidence": ml_conf,
        "heuristic_risk": h_score,
        "heuristic_severity": h_sev,
        "findings": h_finds + ml_finds,
        "ocr_text": ocr_text,
        "boxes": boxes,
        "engine": "hybrid_v3_full"
    }

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
