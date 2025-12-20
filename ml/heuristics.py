from __future__ import annotations

from typing import Dict, List, Any
from urllib.parse import urlparse
import re

# Brand domain mappings for mismatch detection
BRAND_DOMAINS = {
    'paypal': ['paypal.com', 'paypal.co.uk', 'paypal.me'],
    'amazon': ['amazon.com', 'amazon.co.uk', 'amazon.de', 'amazon.fr'],
    'apple': ['apple.com', 'icloud.com', 'me.com'],
    'microsoft': ['microsoft.com', 'live.com', 'outlook.com', 'office.com', 'xbox.com'],
    'google': ['google.com', 'gmail.com', 'youtube.com'],
    'facebook': ['facebook.com', 'fb.com', 'instagram.com'],
    'netflix': ['netflix.com'],
    'ebay': ['ebay.com', 'ebay.co.uk'],
    'bank': ['lloyds.com', 'barclays.co.uk', 'hsbc.co.uk', 'natwest.com'],
}

# Expanded suspicious TLD list
SUSPICIOUS_TLDS = [
    '.tk', '.ml', '.ga', '.cf', '.gq',  # Free domains - heavily abused
    '.xyz', '.top', '.work', '.click', '.link', '.date', '.review',  # Common phishing
    '.icu', '.bid', '.stream', '.download', '.loan', '.racing',  # High-risk
    '.info', '.cn', '.ru',  # Often used for spam
]


def heuristic_score(text: str, url: str) -> Dict[str, Any]:
    text_l = (text or "").lower()
    url_l = (url or "").lower()
    domain = urlparse(url_l).netloc.lower() if url_l else ""

    score = 0
    findings: List[str] = []

    # Brand mismatch detection (HIGH PRIORITY)
    brand_mismatch, brand_name = _check_brand_mismatch(text_l, domain)
    if brand_mismatch:
        score += 35
        findings.append(f"⚠️ Brand mismatch: Message mentions '{brand_name}' but URL domain doesn't match official {brand_name} domains.")

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

    # 4. Risky TLDs (expanded list)
    if domain and any(domain.endswith(t) for t in SUSPICIOUS_TLDS):
        tld = next((t for t in SUSPICIOUS_TLDS if domain.endswith(t)), '')
        score += 20
        findings.append(f"⚠️ Suspicious domain extension: '{domain}' uses high-risk TLD '{tld}' (commonly used for phishing).")

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


def _check_brand_mismatch(text: str, domain: str) -> tuple[bool, str]:
    """Check if text mentions a brand but URL domain doesn't match official domains."""
    if not domain:
        return False, ""
    
    for brand, legit_domains in BRAND_DOMAINS.items():
        # Check if brand mentioned in text
        if brand in text or brand.replace(' ', '') in text:
            # Check if domain matches any legitimate domain for that brand
            if not any(legit in domain for legit in legit_domains):
                return True, brand
    
    return False, ""
