"""
Screenshot fallback analysis utility.

Used when the primary ensemble pipeline is unavailable for image inputs.
"""

from __future__ import annotations

import io
import logging
import re
from typing import Any, Dict, List, Tuple

import numpy as np
from PIL import Image

from ml.visual_classifier import extract_screenshot_features

logger = logging.getLogger(__name__)

try:
    import pytesseract
    HAS_TESSERACT = True
except Exception:
    HAS_TESSERACT = False
    pytesseract = None

URL_RE = re.compile(r"https?://[^\s<>'\"]+")

SUSPICIOUS_PHRASES = [
    "verify your account",
    "confirm your account",
    "account locked",
    "suspended",
    "unusual activity",
    "reset your password",
    "click here",
    "action required",
    "immediate action",
    "payment failed",
    "confirm payment",
    "security alert",
]


def risk_label_from_score(risk_percent: int) -> str:
    if risk_percent >= 70:
        return "likely_phishing"
    if risk_percent >= 40:
        return "needs_verification"
    return "likely_safe"


def risk_summary_from_score(risk_percent: int) -> str:
    if risk_percent >= 70:
        return "Multiple phishing-like signals were detected in this screenshot."
    if risk_percent >= 40:
        return "Some suspicious signals were found. Verify before taking action."
    return "No strong phishing signals were detected in this screenshot."


def _extract_text_and_boxes(image: Image.Image) -> Tuple[str, List[List[int]]]:
    if not HAS_TESSERACT or pytesseract is None:
        return "", []

    try:
        data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
    except Exception as exc:
        logger.debug("OCR failed in screenshot fallback: %s", exc)
        return "", []

    tokens: List[str] = []
    boxes: List[List[int]] = []
    n = len(data.get("text", []))

    for i in range(n):
        token = str(data["text"][i]).strip()
        if not token:
            continue

        left = int(data.get("left", [0] * n)[i])
        top = int(data.get("top", [0] * n)[i])
        width = int(data.get("width", [0] * n)[i])
        height = int(data.get("height", [0] * n)[i])
        tokens.append(token)
        boxes.append([left, top, left + width, top + height])

    return " ".join(tokens), boxes


def _score_url(url: str) -> Tuple[float, List[str]]:
    score = 0.0
    reasons: List[str] = []
    url_l = url.lower()

    if "@" in url_l:
        score += 0.25
        reasons.append("URL uses @ redirection pattern")
    if len(url) > 90:
        score += 0.15
        reasons.append("Unusually long URL")
    if re.search(r"\b\d{1,3}(\.\d{1,3}){3}\b", url_l):
        score += 0.30
        reasons.append("IP address used instead of domain")
    if any(x in url_l for x in ["login", "verify", "secure", "update", "confirm", "wallet"]):
        score += 0.20
        reasons.append("Contains high-risk credential bait keywords")
    if sum(1 for c in url if c in "-_.") > 6:
        score += 0.10
        reasons.append("High punctuation density in URL")

    return min(score, 1.0), reasons


def analyze_screenshot_content(content: bytes) -> Dict[str, Any]:
    if not content:
        raise ValueError("Empty upload")

    image = Image.open(io.BytesIO(content)).convert("RGB")
    text, boxes = _extract_text_and_boxes(image)

    urls = URL_RE.findall(text)
    url_infos = []
    max_url_risk = 0.0
    for url in urls:
        score, reasons = _score_url(url)
        max_url_risk = max(max_url_risk, score)
        url_infos.append({
            "url": url,
            "score": score,
            "suspicious": score >= 0.5,
            "reasons": reasons,
            "ml_risk_percent": int(round(score * 100)),
        })

    text_l = text.lower()
    detected_phrases = [p for p in SUSPICIOUS_PHRASES if p in text_l]

    phrase_risk = 0.0
    if detected_phrases:
        phrase_risk = min(0.75, 0.25 + len(detected_phrases) * 0.10)

    visual_features = extract_screenshot_features(image)
    visual_risk = 0.0
    edge_density = float(visual_features.get("edge_density", 0.0))
    text_density = float(visual_features.get("text_density", 0.0))
    image_entropy = float(visual_features.get("image_entropy", 0.0))
    color_variance = float(visual_features.get("color_variance", 0.0))

    # Calibrated from data/screenshots/{legitimate,phishing} distributions.
    if edge_density >= 0.0195:
        visual_risk += 0.34
    elif edge_density >= 0.0175:
        visual_risk += 0.14

    if image_entropy >= 620_000_000:
        visual_risk += 0.30
    elif image_entropy >= 560_000_000:
        visual_risk += 0.10

    if text_density <= 3600:
        visual_risk += 0.18
    elif text_density <= 4500:
        visual_risk += 0.08

    if 2400 <= color_variance <= 3900:
        visual_risk += 0.12

    visual_risk = min(0.92, visual_risk)

    # Weighted blend. If OCR yields little evidence, rely more on visual signals.
    has_ocr_signals = bool(urls) or bool(detected_phrases)
    if has_ocr_signals:
        overall_risk = (
            (max_url_risk * 0.45) +
            (phrase_risk * 0.35) +
            (visual_risk * 0.20)
        )
    else:
        overall_risk = (
            (visual_risk * 0.70) +
            (max_url_risk * 0.20) +
            (phrase_risk * 0.10)
        )

    if max_url_risk >= 0.45 and phrase_risk >= 0.35:
        overall_risk = min(0.95, overall_risk + 0.12)

    risk_percent = int(round(overall_risk * 100))
    label = risk_label_from_score(risk_percent)

    findings: List[Dict[str, str]] = []
    if max_url_risk >= 0.45:
        findings.append({
            "type": "url",
            "label": "Suspicious URL detected",
            "detail": "One or more extracted links use phishing-like patterns.",
            "severity": "high" if max_url_risk >= 0.65 else "med",
        })
    if detected_phrases:
        findings.append({
            "type": "language",
            "label": "Suspicious language detected",
            "detail": f"Detected phrases: {', '.join(detected_phrases[:4])}",
            "severity": "med" if len(detected_phrases) < 3 else "high",
        })
    if visual_risk >= 0.45:
        findings.append({
            "type": "visual",
            "label": "Suspicious visual pattern",
            "detail": "Layout and rendering signals match known phishing screenshot patterns.",
            "severity": "med" if visual_risk < 0.65 else "high",
        })
    if not findings:
        findings.append({
            "type": "general",
            "label": "No strong phishing cues",
            "detail": "No high-confidence phishing indicators were extracted from this screenshot.",
            "severity": "low",
        })

    return {
        "ocr_text": text,
        "urls": url_infos,
        "detected_phrases": detected_phrases,
        "visual_features": visual_features,
        "url_risk_percent": int(round(max_url_risk * 100)),
        "phrase_risk_percent": int(round(phrase_risk * 100)),
        "visual_risk_percent": int(round(visual_risk * 100)),
        "overall_risk_percent": risk_percent,
        "risk": risk_percent,
        "risk_label": label,
        "risk_summary": risk_summary_from_score(risk_percent),
        "findings": findings,
        "boxes": boxes,
    }
