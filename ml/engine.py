from __future__ import annotations
from typing import Dict, Any


def ml_score(url: str) -> Dict[str, Any]:
    """
    Placeholder ML scoring function.

    In the next phase this will:
    - Load the trained RandomForest from ml/model/phish_rf_full.joblib
    - Extract URL features (length, dots, special chars, etc.)
    - Return a calibrated phishing probability.

    For now it returns zero risk but the correct shape.
    """
    return {
        "risk": 0,
        "confidence": 0.0,
        "findings": [],
    }
