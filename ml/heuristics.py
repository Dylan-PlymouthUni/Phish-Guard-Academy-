from __future__ import annotations

from typing import Dict, List, Any
from urllib.parse import urlparse


def heuristic_score(text: str, url: str) -> Dict[str, Any]:
    text_l = (text or "").lower()
    url_l = (url or "").lower()
    domain = urlparse(url_l).netloc.lower() if url_l else ""

    score = 0
    findings: List[str] = []

    # 1. Urgent / threatening language
    urgency_keywords = [
        "urgent", "immediately", "asap", "verify now",
        "suspended", "locked", "deactivated", "final notice", "last warning"
    ]
    if any(k in text_l for k in urgency_keywords):
        score += 20
        findings.append("Urgent or threatening language detected in the message.")

    # 2. Requests for credentials / sensitive info
    sensitive_terms = [
        "password", "passcode", "otp", "security code", "login details",
        "credentials", "card number", "cvv", "bank account", "sort code"
    ]
    if any(k in text_l for k in sensitive_terms):
        score += 20
        findings.append("Message requests sensitive credentials or financial information.")

    # 3. Login / verification + URL present
    login_terms = ["log in", "login", "sign in", "verify account", "account verification"]
    if any(k in text_l for k in login_terms) and url_l:
        score += 20
        findings.append("Login/verification language combined with a clickable URL.")

    # 4. Risky TLDs
    bad_tlds = [".xyz", ".top", ".icu", ".bid", ".click", ".info", ".cn", ".ru"]
    if domain and any(domain.endswith(t) for t in bad_tlds):
        score += 15
        findings.append(f"Domain '{domain}' uses a high-risk top-level domain.")

    # 5. Many URL parameters (obfuscation)
    if url_l.count("&") >= 5:
        score += 10
        findings.append("URL contains an unusually high number of query parameters.")

    # 6. Exclamation spam (pressure tactic)
    if text and text.count("!") >= 3:
        score += 5
        findings.append("Message uses excessive exclamation marks (pressure tactic).")

    # Normalise
    if score < 0:
        score = 0
    if score > 100:
        score = 100

    # Map to severity (heuristic-only view)
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
