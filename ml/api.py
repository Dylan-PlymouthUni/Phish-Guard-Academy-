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

# Try OCR; if it fails just disable OCR
try:
    import pytesseract  # type: ignore
    HAS_TESSERACT = True
except Exception:
    HAS_TESSERACT = False

logger = logging.getLogger("phishguard")
logging.basicConfig(level=logging.INFO)

app = FastAPI(title="PhishGuard Hybrid ML + OCR API")

MODEL_PATH = Path("ml/model/phish_rf_full.joblib")
MODEL_BUNDLE: Optional[Dict[str, Any]] = None

if MODEL_PATH.exists():
    try:
        loaded = joblib.load(MODEL_PATH)
        # We expect a dict-like bundle, but handle raw model too
        if isinstance(loaded, dict):
            MODEL_BUNDLE = loaded
            logger.info(
                "Loaded ML model bundle from %s with keys: %s",
                MODEL_PATH,
                list(MODEL_BUNDLE.keys()),
            )
        else:
            MODEL_BUNDLE = {"model": loaded}
            logger.info(
                "Loaded ML model object from %s (type=%s)",
                MODEL_PATH,
                type(loaded),
            )
    except Exception as e:
        logger.exception("Failed to load model bundle: %s", e)
        MODEL_BUNDLE = None
else:
    logger.warning("Model file not found at %s; ML scoring disabled.", MODEL_PATH)


# ------------------------ URL / TEXT HELPERS ------------------------


def extract_domain(url: str) -> str:
    url = (url or "").strip()
    if not url:
        return ""
    if "://" not in url:
        url = "http://" + url
    parsed = urlparse(url)
    host = parsed.netloc.lower()
    host = host.split(":")[0]
    return host


def is_ip(host: str) -> bool:
    parts = host.split(".")
    if len(parts) != 4:
        return False
    try:
        return all(0 <= int(p) <= 255 for p in parts)
    except ValueError:
        return False


def has_homoglyphs(host: str) -> bool:
    # crude: any non-ASCII char
    return any(ord(c) > 127 for c in host)


def extract_url_features(url: str) -> Dict[str, float]:
    """Lightweight lexical URL features for RF model."""
    url = (url or "").strip()
    if "://" not in url:
        full = "http://" + url if url else ""
    else:
        full = url

    parsed = urlparse(full)
    domain = (parsed.netloc or "").lower().split(":")[0]
    path = parsed.path or ""
    query = parsed.query or ""

    feats: Dict[str, float] = {}
    feats["url_length"] = float(len(full))
    feats["num_digits"] = float(sum(ch.isdigit() for ch in full))
    feats["num_dots"] = float(full.count("."))
    feats["num_hyphens"] = float(full.count("-"))
    feats["num_subdirs"] = float(path.count("/"))
    feats["query_length"] = float(len(query))
    feats["has_at_symbol"] = 1.0 if "@" in full else 0.0
    feats["has_ip"] = 1.0 if is_ip(domain) else 0.0
    feats["uses_https"] = 1.0 if full.startswith("https://") else 0.0
    feats["domain_length"] = float(len(domain))
    feats["num_params"] = float(query.count("&") + (1 if query else 0))

    # Shannon entropy over URL chars
    counts: Dict[str, int] = {}
    for ch in full:
        counts[ch] = counts.get(ch, 0) + 1
    entropy = 0.0
    n = float(len(full)) or 1.0
    for c in counts.values():
        p = c / n
        entropy -= p * math.log2(p)
    feats["url_entropy"] = float(entropy)

    return feats


# ------------------------ HEURISTIC ENGINE ------------------------


def heuristic_score(text: str, url: str, ocr_text: str = "") -> Tuple[int, str, List[str]]:
    full_text = " ".join(
        p for p in [(text or ""), (ocr_text or "")] if p
    ).lower()
    url_l = (url or "").lower()
    domain = extract_domain(url_l)

    score = 0
    findings: List[str] = []

    # 1) Urgency / threat
    urgency_keywords = [
        "urgent",
        "immediately",
        "asap",
        "verify now",
        "act now",
        "suspended",
        "locked",
        "deactivated",
        "last warning",
        "final notice",
        "within 24 hours",
    ]
    if any(k in full_text for k in urgency_keywords):
        score += 15
        findings.append("Urgent or threatening language detected in text/OCR.")

    # 2) Credential / sensitive info
    sensitive_terms = [
        "password",
        "passcode",
        "otp",
        "one-time code",
        "security code",
        "ssn",
        "sort code",
        "bank account",
        "routing number",
        "cvv",
        "card number",
        "login details",
        "credentials",
        "2fa",
        "mfa",
    ]
    if any(k in full_text for k in sensitive_terms):
        score += 20
        findings.append("Message requests sensitive credentials or financial information.")

    # 3) Brand vs domain mismatch
    brands = [
        "paypal",
        "microsoft",
        "outlook",
        "office 365",
        "amazon",
        "apple",
        "google",
        "instagram",
        "facebook",
        "netflix",
        "docusign",
    ]
    for b in brands:
        if b in full_text:
            if domain and b not in domain:
                score += 25
                findings.append(
                    f"Brand '{b.title()}' appears but domain '{domain or 'unknown'}' does not align."
                )
            break

    # 4) Suspicious TLDs
    bad_tlds = [".xyz", ".top", ".icu", ".bid", ".click", ".info", ".cn", ".ru"]
    if domain and any(domain.endswith(tld) for tld in bad_tlds):
        score += 10
        findings.append(f"Domain '{domain}' uses a high-risk top-level domain.")

    # 5) Raw IP in URL
    if domain and is_ip(domain):
        score += 25
        findings.append(
            f"URL uses raw IP '{domain}' instead of a legitimate domain."
        )

    # 6) Homoglyphs / non-ASCII
    if domain and has_homoglyphs(domain):
        score += 15
        findings.append("Domain contains non-standard characters (possible homoglyph attack).")

    # 7) Redirect / params
    if "?" in url_l:
        query_part = url_l.split("?", 1)[1]
        param_count = query_part.count("&") + 1
        if param_count >= 5:
            score += 5
            findings.append("URL contains an unusually high number of parameters.")
        if any(k in query_part for k in ["redirect=", "url=", "dest=", "next="]):
            score += 10
            findings.append("URL contains redirect parameters that can hide final destination.")

    # 8) Encoded content
    base64_like = re.findall(r"[A-Za-z0-9+/]{40,}={0,2}", full_text)
    if base64_like:
        score += 15
        findings.append("Encoded or obfuscated content detected in message/OCR.")

    # 9) Attachment bait
    doc_bait = [
        "attached invoice",
        "invoice attached",
        "payroll update",
        "salary slip",
        "remittance",
        "wire transfer",
        "document attached",
        "open the attachment",
        "download the file",
    ]
    if any(k in full_text for k in doc_bait):
        score += 10
        findings.append("References to common phishing lures (invoices, payroll, transfers).")

    # 10) Login / verification + URL
    login_words = [
        "login",
        "log in",
        "sign in",
        "verify account",
        "account verification",
        "confirm your account",
    ]
    if any(k in full_text for k in login_words) and url_l:
        score += 15
        findings.append("Login/verification language combined with a clickable URL.")

    # 11) Exclamation overuse
    if full_text.count("!") >= 3:
        score += 5
        findings.append("Message uses excessive exclamation marks (pressure tactic).")

    score = max(0, min(100, score))

    if score >= 70:
        severity = "high"
    elif score >= 40:
        severity = "medium"
    else:
        severity = "low"

    return score, severity, findings


# ------------------------ OCR PIPELINE ------------------------


def run_ocr(image_bytes: Optional[bytes]) -> Tuple[str, List[Dict[str, Any]]]:
    """Extract text from screenshot; boxes reserved for future overlay."""
    if not image_bytes or not HAS_TESSERACT:
        return "", []
    try:
        img = Image.open(io.BytesIO(image_bytes))
        text = pytesseract.image_to_string(img)
        boxes: List[Dict[str, Any]] = []
        return text, boxes
    except Exception as e:
        logger.exception("OCR failed: %s", e)
        return "", []


# ------------------------ ML PIPELINE ------------------------


def ml_score(url: str) -> Tuple[int, float, List[str]]:
    """Score URL with RF model if available."""
    if not url or MODEL_BUNDLE is None:
        return 0, 0.0, []

    try:
        model = MODEL_BUNDLE.get("model") if isinstance(MODEL_BUNDLE, dict) else MODEL_BUNDLE
        if model is None:
            return 0, 0.0, ["ML bundle has no 'model'; skipping."]

        feats = extract_url_features(url)

        # Determine feature order
        if isinstance(MODEL_BUNDLE, dict) and "feature_names" in MODEL_BUNDLE:
            names = list(MODEL_BUNDLE["feature_names"])
        else:
            names = sorted(feats.keys())

        X = np.array([[feats.get(name, 0.0) for name in names]], dtype=float)

        if hasattr(model, "predict_proba"):
            proba = model.predict_proba(X)[0]
            if len(proba) == 2:
                p_phish = float(proba[1])
            else:
                p_phish = float(max(proba))
        elif hasattr(model, "predict"):
            pred = model.predict(X)[0]
            p_phish = 1.0 if pred == 1 else 0.0
        else:
            return 0, 0.0, ["ML model has no predict/predict_proba; skipping."]

        risk = int(round(p_phish * 100))
        conf = float(p_phish)

        findings: List[str] = []
        if risk >= 70:
            findings.append("ML model flags this URL as high-risk phishing.")
        elif risk >= 40:
            findings.append("ML model flags this URL as moderately suspicious.")

        return risk, conf, findings

    except Exception as e:
        logger.exception("ML scoring failed: %s", e)
        return 0, 0.0, ["ML model error; using heuristics only."]


# ------------------------ MAIN ENDPOINT ------------------------


@app.post("/analyze")
async def analyze(request: Request) -> Dict[str, Any]:
    """
    Unified endpoint:
    - JSON: { "text": "...", "url": "..." }
    - multipart/form-data: text, url, image (screenshot)
    """
    ct = request.headers.get("content-type", "") or ""
    text = ""
    url = ""
    image_bytes: Optional[bytes] = None

    if "application/json" in ct:
        data = await request.json()
        text = str(data.get("text") or "")
        url = str(data.get("url") or "")
    else:
        form = await request.form()
        text = str(form.get("text") or "")
        url = str(form.get("url") or "")
        file = form.get("image")
        # FastAPI form file object has .read()
        if hasattr(file, "read"):
            image_bytes = await file.read()

    ocr_text, boxes = run_ocr(image_bytes)
    heuristic_risk, heuristic_severity, heuristic_findings = heuristic_score(
        text, url, ocr_text
    )
    ml_risk, ml_conf, ml_findings = ml_score(url)

    # Fusion rule: take the stronger of heuristic and ML
    final_risk = max(heuristic_risk, ml_risk)
    if final_risk >= 70:
        severity = "high"
    elif final_risk >= 40:
        severity = "medium"
    else:
        severity = "low"

    findings: List[str] = []
    findings.extend(heuristic_findings)
    findings.extend(ml_findings)

    return {
        "risk": final_risk,
        "severity": severity,
        "ml_risk": ml_risk,
        "ml_confidence": ml_conf,
        "heuristic_risk": heuristic_risk,
        "heuristic_severity": heuristic_severity,
        "findings": findings,
        "ocr_text": ocr_text,
        "boxes": boxes,
        "engine": "hybrid_v3_full",
    }
