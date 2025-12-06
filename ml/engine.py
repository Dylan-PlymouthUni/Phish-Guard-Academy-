from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List
from urllib.parse import urlparse
import ipaddress
import logging
import re

import joblib
import numpy as np
import pandas as pd

logger = logging.getLogger("phishguard")
logger.setLevel(logging.INFO)

MODEL_PATH = Path("ml/model/phish_rf_full.joblib")

# --------- Load model bundle ---------
if not MODEL_PATH.exists():
    raise FileNotFoundError(f"ML model bundle not found at {MODEL_PATH}. Run ml/train_model.py first.")

bundle = joblib.load(MODEL_PATH)

# Support both plain model and {"model": ..., "feature_names": [...]} bundle
if isinstance(bundle, dict):
    model = bundle.get("model", None)
    feature_names: List[str] = list(bundle.get("feature_names", []))
else:
    model = bundle
    feature_names = list(getattr(model, "feature_names_in_", []))

if model is None:
    raise RuntimeError("Model not found inside joblib bundle.")

if not feature_names:
    # Fallback: model will still work, but we can't align features by name
    logger.warning("No feature_names found in bundle; using empty list.")
    feature_names = []

logger.info("Loaded ML model bundle from %s with %d features", MODEL_PATH, len(feature_names))


# --------- URL feature helpers (approximation of UCI Phishing Websites URL-level features) ---------
SHORTENERS = {
    "bit.ly", "goo.gl", "t.co", "tinyurl.com", "ow.ly", "is.gd", "buff.ly",
    "cutt.ly", "rebrand.ly", "shorte.st", "lnkd.in",
}


def _parse_url(url: str):
    """Return (url_str, parsed, host, path, query) with some normalization."""
    u = (url or "").strip()
    if not u:
        return "", None, "", "", ""

    # Add scheme if missing, so urlparse behaves
    if not re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*://", u):
        u = "http://" + u

    parsed = urlparse(u)
    host = (parsed.netloc or "").lower()
    path = parsed.path or ""
    query = parsed.query or ""
    return u, parsed, host, path, query


def _is_ip(host: str) -> bool:
    try:
        # Strip port if present
        host_only = host.split(":", 1)[0]
        ipaddress.ip_address(host_only)
        return True
    except Exception:
        return False


def _url_length_flag(u: str) -> int:
    # UCI coding: -1 legitimate, 0 suspicious, 1 phishing
    L = len(u)
    if L < 54:
        return -1
    if 54 <= L <= 75:
        return 0
    return 1


def _subdomain_flag(host: str) -> int:
    # UCI: having_Sub_Domain {-1,0,1}
    if not host:
        return 0
    parts = host.split(".")
    # drop leading www
    if parts and parts[0] in {"www", "www2", "web"}:
        parts = parts[1:]
    if len(parts) <= 2:
        return -1
    if len(parts) == 3:
        return 0
    return 1


def _shortening_flag(host: str) -> int:
    if not host:
        return 0
    return 1 if host in SHORTENERS else -1


def _prefix_suffix_flag(host: str) -> int:
    # Check for '-' inside the registered domain label (e.g. "paypal-secure.com")
    if not host:
        return 0
    # crude split: take second-level + TLD
    parts = host.split(".")
    if len(parts) < 2:
        base = host
    else:
        base = parts[-2]
    return 1 if "-" in base else -1


def _having_at_symbol_flag(u: str) -> int:
    return 1 if "@" in u else -1


def _double_slash_redirect_flag(u: str) -> int:
    # Extra '//' after scheme is suspicious
    # e.g. http://example.com//login
    if u.count("//") > 1:
        return 1
    return -1


def _https_token_flag(u: str, host: str) -> int:
    # "https" appearing in host or path while scheme is http is suspicious
    # e.g. http://https-secure-login.com
    if "https" in host and not u.lower().startswith("https://"):
        return 1
    return -1


def build_url_feature_row(url: str) -> tuple[pd.DataFrame, Dict[str, int], List[str]]:
    """
    Build a single-row DataFrame aligned to 'feature_names'
    using only URL-derived features. Unknown features default to 0.
    Returns (X, feature_values, notes).
    """
    u, parsed, host, path, query = _parse_url(url)
    notes: List[str] = []
    fv: Dict[str, int | float] = {name: 0 for name in feature_names}

    # Map into known UCI-style names if present
    if "having_IP_Address" in fv:
        ip_flag = 1 if _is_ip(host) else -1
        fv["having_IP_Address"] = ip_flag
        if ip_flag == 1:
            notes.append("ML: URL host looks like an IP address.")

    if "URL_Length" in fv:
        fv["URL_Length"] = _url_length_flag(u)
        if fv["URL_Length"] == 1:
            notes.append("ML: URL is unusually long.")

    if "Shortining_Service" in fv or "Shortening_Service" in fv:
        key = "Shortining_Service" if "Shortining_Service" in fv else "Shortening_Service"
        fv[key] = _shortening_flag(host)
        if fv[key] == 1:
            notes.append("ML: URL uses a known shortening service.")

    if "Having_At_Symbol" in fv or "having_At_Symbol" in fv:
        key = "Having_At_Symbol" if "Having_At_Symbol" in fv else "having_At_Symbol"
        fv[key] = _having_at_symbol_flag(u)
        if fv[key] == 1:
            notes.append("ML: URL contains '@' symbol.")

    if "double_slash_redirecting" in fv:
        fv["double_slash_redirecting"] = _double_slash_redirect_flag(u)
        if fv["double_slash_redirecting"] == 1:
            notes.append("ML: URL contains extra '//' suggesting redirection.")

    if "Prefix_Suffix" in fv:
        fv["Prefix_Suffix"] = _prefix_suffix_flag(host)
        if fv["Prefix_Suffix"] == 1:
            notes.append("ML: Domain uses '-' in the core name (possible spoofing).")

    if "having_Sub_Domain" in fv:
        fv["having_Sub_Domain"] = _subdomain_flag(host)
        if fv["having_Sub_Domain"] == 1:
            notes.append("ML: Deeply nested subdomains detected.")

    if "HTTPS_token" in fv:
        fv["HTTPS_token"] = _https_token_flag(u, host)
        if fv["HTTPS_token"] == 1:
            notes.append("ML: 'https' token appears in domain while using HTTP scheme.")

    # Any other features stay at 0 (neutral / unknown)
    used = {k: v for k, v in fv.items() if v != 0}

    if not feature_names:
        # No feature names – pass a generic single-column dummy feature
        X = pd.DataFrame([{"dummy": 0.0}])
    else:
        X = pd.DataFrame([fv], columns=feature_names)

    return X, used, notes


# --------- Public API ---------
def ml_score(url: str) -> Dict[str, Any]:
    """
    Score a URL using the trained RandomForest model.
    Returns:
        {
          "risk": 0-100,
          "confidence": 0.0-1.0,
          "findings": [ ... ]
        }
    """
    url = (url or "").strip()
    if not url:
        return {
            "risk": 0,
            "confidence": 0.0,
            "findings": ["No URL provided for ML engine."],
        }

    try:
        X, used_feats, notes = build_url_feature_row(url)
        proba = model.predict_proba(X)[0]
        classes = getattr(model, "classes_", None)

        # Decide which probability is "phishing"
        phish_idx = 0
        if classes is not None and len(classes) == 2:
            # Prefer label 1 if present (UCI: -1 legit, 1 phishing)
            idx = np.where(classes == 1)[0]
            if idx.size:
                phish_idx = int(idx[0])
            else:
                # Fallback: if string labels, look for 'phishing'
                idx = np.where(classes == "phishing")[0]
                if idx.size:
                    phish_idx = int(idx[0])
                else:
                    # Final fallback: assume higher label index == phishing
                    phish_idx = int(np.argmax(classes))

        phish_prob = float(proba[phish_idx])
        risk = int(round(phish_prob * 100))
        confidence = float(max(proba))

        findings: List[str] = []
        if used_feats:
            findings.append(
                f"ML: Evaluated URL using {len(used_feats)} handcrafted URL features from the training dataset."
            )
        findings.extend(notes)

        return {
            "risk": risk,
            "confidence": confidence,
            "findings": findings,
        }

    except Exception as e:
        logger.exception("ML URL scoring failed: %s", e)
        return {
            "risk": 0,
            "confidence": 0.0,
            "findings": [
                f"ML model error ({type(e).__name__}); URL-only ML disabled for this request."
            ],
        }
