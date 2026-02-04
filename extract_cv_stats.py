#!/usr/bin/env python3
"""
Extract cross-validation and feature importance stats from model artifacts.
"""
import json
import joblib
from pathlib import Path
import pandas as pd

MODEL_PATH = "ml/model/url_phishing_rf_trained.joblib"
METRICS_PATH = "metrics_summary.json"
FEATURES_PATH = "feature_importances.csv"

if not Path(MODEL_PATH).exists():
    print(f"Model file {MODEL_PATH} not found.")
    exit(1)

model_obj = joblib.load(MODEL_PATH)

metrics = {}
if isinstance(model_obj, dict):
    metrics['test_accuracy'] = model_obj.get('test_accuracy')
    metrics['roc_auc'] = model_obj.get('roc_auc')
    feature_importance = model_obj.get('feature_importance')
    if feature_importance is not None:
        # Handle dict or list of dicts
        if isinstance(feature_importance, dict):
            # Convert dict to DataFrame with columns 'feature', 'importance'
            fi_df = pd.DataFrame(list(feature_importance.items()), columns=['feature', 'importance'])
        elif isinstance(feature_importance, list):
            # Already a list of dicts
            fi_df = pd.DataFrame(feature_importance)
        else:
            print("Unknown feature_importance format, skipping CSV export.")
            fi_df = None
        if fi_df is not None:
            fi_df.to_csv(FEATURES_PATH, index=False)
            print(f"Wrote feature importances to {FEATURES_PATH}")
else:
    print("Model object does not contain metrics or feature importances.")

with open(METRICS_PATH, 'w') as f:
    json.dump(metrics, f, indent=2)
    print(f"Wrote metrics summary to {METRICS_PATH}")
