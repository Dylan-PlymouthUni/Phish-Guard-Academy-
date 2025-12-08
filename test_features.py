#!/usr/bin/env python3
"""Debug feature extraction for ML model."""

import re
from urllib.parse import urlparse

def extract_url_features(url: str) -> dict:
    """Extract comprehensive features from URL for ML model prediction."""
    u = url.strip().rstrip('.,;:)\'"')
    parsed = urlparse(u if u.startswith("http") else ("http://" + u))
    host = (parsed.hostname or "").lower()
    path = parsed.path or ""
    
    return {
        "url_length": len(u),
        "domain_length": len(host),
        "subdomain_count": host.count(".") - 1 if host else 0,
        "has_https": 1 if u.lower().startswith("https") else 0,
        "has_suspicious_tokens": 1 if re.search(r"(login|verify|secure|account|update|confirm|bank|paypal|free|urgent|reward)", u, re.I) else 0,
        "special_char_count": u.count("-") + u.count("_"),
        "digit_count": sum(c.isdigit() for c in u),
        "path_length": len(path),
    }

# Test URLs
test_urls = [
    "http://paypal-secure.co",
    "https://github.com/awesome", 
    "http://verify-account123.tk/login?id=urgent"
]

print("Feature Extraction Debug\n" + "="*60)
for url in test_urls:
    print(f"\nURL: {url}")
    features = extract_url_features(url)
    for k, v in features.items():
        print(f"  {k:25s}: {v}")
    
    # Calculate expected risk based on features
    risk_score = 0
    if features["has_https"] == 0:
        risk_score += 20
    if features["special_char_count"] > 1:
        risk_score += 15
    if features["has_suspicious_tokens"] == 1:
        risk_score += 30
    if features["subdomain_count"] > 1:
        risk_score += 15
    if features["digit_count"] > 3:
        risk_score += 10
    
    print(f"  Expected risk (heuristic): {min(100, risk_score)}%")

# Now load the trained model and check predictions
print("\n" + "="*60)
print("Model Predictions\n" + "="*60)

import joblib
import pandas as pd
from pathlib import Path

model_path = Path("ml/model/phish_rf_full.joblib")
if not model_path.exists():
    print("❌ Model not found!")
else:
    bundle = joblib.load(model_path)
    model = bundle["model"]
    feature_names = bundle["feature_names"]
    
    print(f"Model feature names: {feature_names}")
    print(f"Test accuracy: {bundle.get('test_accuracy', 'N/A')}")
    
    for url in test_urls:
        features_dict = extract_url_features(url)
        features_df = pd.DataFrame([{name: features_dict.get(name, 0) for name in feature_names}])
        
        pred_proba = model.predict_proba(features_df)[0]
        pred_class = model.predict(features_df)[0]
        
        print(f"\nURL: {url}")
        print(f"  Features: {features_dict}")
        print(f"  Predicted class: {pred_class} (0=legit, 1=phishing)")
        print(f"  Probability [legit, phishing]: {pred_proba}")
        print(f"  ML risk: {int(pred_proba[1] * 100)}%")
