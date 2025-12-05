from __future__ import annotations

from typing import List, Dict, Any
from urllib.parse import urlparse
from datetime import datetime
import re

from fastapi import FastAPI
from pydantic import BaseModel

from ml.engine import ml_score

app = FastAPI(title="PhishGuard Hybrid API")


# ---------- Models ----------

class AnalyzeRequest(BaseModel):
    text: str | None = None
    url: str | None = None
    # Optional image filename (e.g., screenshot of email)
    image_name: str | None = None


class AnalyzeResponse(BaseModel):
    risk: int
    severity: str
    ml_risk: int
    ml_confidence: float
    heuristic_risk: int
    heuristic_severity: str
    findings: List[str]
    engine: str


class StatsResponse(BaseModel):
    total_requests: int
    high_risk: int
    medium_risk: int
    low_risk: int
    avg_risk: float


# ---------- In-memory stats & history ----------

STATS: Dict[str, float] = {
    "total": 0,
    "high": 0,
    "medium": 0,
    "low": 0,
    "sum_risk": 0.0,
}

HISTORY: List[Dict[str, Any]] = []  # last N analyses, for Analytics UI


# ---------- URL helpers ----------

def extract_domain(url: str) -> str:
    if not url:
        return ""
    parsed = urlparse(url)
    if parsed.netloc:
        return parsed.netloc.lower()
    return url.lower()


def is_ip(host: str) -> bool:
    parts = host.split(":")[0].split(".")
    if len(parts) != 4:
        return False
    try:
        return all(0 <= int(p) <= 255 for p in parts)
    except ValueError:
        return False


def has_homoglyphs(host: str) -> bool:
    # very simple: any non-ASCII char in host
    return any(ord(c) > 127 for c in host)


def is_shortener(host: str) -> bool:
    """Detect common URL shorteners (bit.ly, tinyurl, etc.)."""
    if not host:
        return False
    shorteners = [
        "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly",
        "buff.ly", "is.gd", "cutt.ly", "lnkd.in", "rebrand.ly",
    ]
    return any(host.endswith(s) for s in shorteners)


# ---------- Heuristics: text + URL ----------

def calc_text_url_heuristics(text: str, url: str) -> Dict[str, Any]:
    text_l = (text or "").lower()
    url_l = (url or "").lower()
    domain = extract_domain(url_l)

    score = 0
    findings: List[str] = []

    # 1. Urgency / threat language
    urgency_keywords = [
        "urgent", "immediately", "asap", "verify now", "act now",
        "suspended", "locked", "deactivated", "last warning", "final notice",
    ]
    if any(k in text_l for k in urgency_keywords):
        score += 10
        findings.append("Urgent or threatening language detected in the message.")

    # 2. Sensitive credential / info request
    sensitive_terms = [
        "password", "passcode", "otp", "one-time code",
        "security code", "ssn", "sort code", "bank account",
        "cvv", "card number", "login details", "credentials",
    ]
    if any(k in text_l for k in sensitive_terms):
        score += 20
        findings.append("Message asks for sensitive credentials or financial information.")

    # 3. Brand mismatch (text mentions brand, domain doesn’t match)
    brands = [
        "paypal", "microsoft", "outlook", "office 365",
        "amazon", "apple", "google", "instagram", "facebook", "netflix",
    ]
    for b in brands:
        if b in text_l and domain and b not in domain:
            score += 25
            findings.append(
                f"Brand '{b.title()}' mentioned but domain '{domain}' does not match that brand."
            )
            break

    # 4. Suspicious TLDs
    bad_tlds = [".xyz", ".top", ".icu", ".bid", ".click", ".info", ".cn", ".ru"]
    if domain and any(domain.endswith(tld) for tld in bad_tlds):
        score += 15
        findings.append(f"Domain '{domain}' uses a high-risk top-level domain.")

    # 5. URL uses raw IP address
    if domain and is_ip(domain):
        score += 30
        findings.append(
            f"URL uses a raw IP address ('{domain}') instead of a normal domain name."
        )

    # 6. Homoglyph / non-ASCII characters in domain
    if domain and has_homoglyphs(domain):
        score += 20
        findings.append(
            "Domain contains non-standard characters (possible homoglyph attack)."
        )

    # 7. Subdomain depth (e.g. login.secure.account.paypal.com.evil.com)
    if domain:
        labels = domain.split(".")
        if len(labels) >= 5:
            score += 10
            findings.append(
                f"Domain '{domain}' has an unusually deep subdomain chain."
            )

    # 8. Hyphen spam in domain (paypa1-security-login-update.com)
    if domain and domain.count("-") >= 3:
        score += 10
        findings.append(
            f"Domain '{domain}' contains many hyphens, a common obfuscation pattern."
        )

    # 9. URL shortener usage
    if domain and is_shortener(domain):
        score += 15
        findings.append(
            f"Domain '{domain}' is a known URL shortener (destination may be hidden)."
        )

    # 10. Excessive URL parameters / redirect chains
    if "?" in url_l:
        query_part = url_l.split("?", 1)[1]
        param_count = query_part.count("&") + 1
        if param_count >= 5:
            score += 10
            findings.append("URL contains an unusually high number of parameters.")
        if any(k in query_part for k in ["redirect=", "url=", "dest=", "next="]):
            score += 10
            findings.append(
                "URL contains redirect parameters, which can hide the final destination."
            )

    # 11. Encoded content presence (e.g. base64)
    base64_like = re.findall(r"[A-Za-z0-9+/]{40,}={0,2}", text or "")
    if base64_like:
        score += 20
        findings.append(
            "Encoded content detected in the message (possible obfuscated payload)."
        )

    # 12. Attachment / document bait phrases
    doc_bait = [
        "attached invoice", "payroll update", "salary slip", "remittance", "wire transfer",
        "document attached", "open the attachment", "download the file",
    ]
    if any(k in text_l for k in doc_bait):
        score += 10
        findings.append(
            "Email references attachments commonly used in phishing (e.g., invoices, payroll)."
        )

    # 13. Suspicious login / verification phrases tied to URL
    login_words = ["login", "log in", "sign in", "verify account", "account verification"]
    if any(k in text_l for k in login_words) and url_l:
        score += 15
        findings.append(
            "Login/verification language combined with a clickable URL."
        )

    # Light bonus: exclamation overuse
    if text and text.count("!") >= 3:
        score += 5
        findings.append("Message uses excessive exclamation marks (pressure tactic).")

    # Clamp score
    score = max(0, min(score, 100))

    if score >= 70:
        severity = "high"
    elif score >= 40:
        severity = "medium"
    else:
        severity = "low"

    return {
        "risk": score,
        "severity": severity,
        "findings": findings,
    }


# ---------- Heuristics: image filename only ----------

def calc_image_heuristics(image_name: str) -> Dict[str, Any]:
    """Heuristic scoring based only on the image filename (no OCR yet)."""
    if not image_name:
        return {"risk": 0, "findings": []}

    name_l = image_name.lower()
    score = 0
    findings: List[str] = []

    # Bait keywords commonly used in phishing attachments
    bait_keywords = [
        "invoice", "remittance", "payment", "payroll", "salary",
        "dhl", "ups", "fedex", "delivery", "parcel", "hmrc",
        "bank", "statement", "secure", "verification", "paypal",
    ]
    if any(k in name_l for k in bait_keywords):
        score += 20
        findings.append(
            f"Image filename '{image_name}' contains high-risk bait terms (e.g. invoice/payment/delivery)."
        )

    # Suspicious double extensions: e.g. X.pdf.html, X.pdf.exe
    double_ext_patterns = [
        ".pdf.html", ".pdf.htm", ".doc.html", ".xls.html",
        ".pdf.exe", ".doc.exe", ".htm.exe", ".html.exe",
    ]
    if any(name_l.endswith(p) for p in double_ext_patterns):
        score += 25
        findings.append(
            f"Image filename '{image_name}' looks like a disguised document (double extension pattern)."
        )

    # Screenshot/login-like names
    screenshot_keywords = ["login", "signin", "account", "security", "verification"]
    if any(k in name_l for k in screenshot_keywords):
        score += 10
        findings.append(
            "Image name suggests a login or security screen (possible fake portal screenshot)."
        )

    score = max(0, min(score, 40))  # image contributes but doesn’t dominate
    return {"risk": score, "findings": findings}


# ---------- API endpoints ----------

@app.get("/")
def root() -> Dict[str, Any]:
    return {
        "message": "PhishGuard ML/heuristic API",
        "endpoints": ["/analyze", "/stats", "/history"],
    }


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest) -> AnalyzeResponse:
    text = req.text or ""
    url = req.url or ""
    image_name = req.image_name or ""

    # Heuristic layer (text + URL)
    h = calc_text_url_heuristics(text, url)
    h_risk = int(h["risk"])
    h_sev = str(h["severity"])
    findings: List[str] = list(h.get("findings", []))

    # Image heuristics
    img = calc_image_heuristics(image_name)
    img_risk = int(img.get("risk", 0))
    img_findings = img.get("findings", [])
    if img_findings:
        findings.extend(img_findings)

    # ML layer (safe wrapper – currently zero-weight in final risk)
    m = ml_score(url)
    ml_risk = int(m.get("risk", 0))
    ml_conf = float(m.get("confidence", 0.0))
    ml_findings = m.get("findings", [])
    if ml_findings:
        findings.extend(ml_findings)

    # Hybrid combination
    combined_risk = int(round(0.7 * h_risk + 0.3 * img_risk + 0.0 * ml_risk))
    combined_risk = max(0, min(combined_risk, 100))

    if combined_risk >= 70:
        severity = "high"
        STATS["high"] += 1
    elif combined_risk >= 40:
        severity = "medium"
        STATS["medium"] += 1
    else:
        severity = "low"
        STATS["low"] += 1

    STATS["total"] += 1
    STATS["sum_risk"] += combined_risk

    # Append to in-memory history (last 50)
    preview = (text[:120] + "…") if len(text) > 120 else text
    HISTORY.append(
        {
            "id": int(STATS["total"]),
            "ts": datetime.utcnow().isoformat() + "Z",
            "text_preview": preview,
            "url": url,
            "image_name": image_name,
            "risk": combined_risk,
            "severity": severity,
            "engine": "hybrid_v1_image",
        }
    )
    if len(HISTORY) > 50:
        HISTORY.pop(0)

    return AnalyzeResponse(
        risk=combined_risk,
        severity=severity,
        ml_risk=ml_risk,
        ml_confidence=ml_conf,
        heuristic_risk=h_risk,
        heuristic_severity=h_sev,
        findings=findings,
        engine="hybrid_v1_image",
    )


@app.get("/stats", response_model=StatsResponse)
def stats() -> StatsResponse:
    total = int(STATS["total"])
    avg = float(STATS["sum_risk"] / total) if total else 0.0
    return StatsResponse(
        total_requests=total,
        high_risk=int(STATS["high"]),
        medium_risk=int(STATS["medium"]),
        low_risk=int(STATS["low"]),
        avg_risk=avg,
    )


@app.get("/history")
def history() -> Dict[str, Any]:
    """Return the last N analyses for use in the Analytics tab."""
    return {"items": HISTORY}
