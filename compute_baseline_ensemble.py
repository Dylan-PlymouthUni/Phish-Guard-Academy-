#!/usr/bin/env python3
"""
Compute baseline and ensemble results for phishing detection.
This script reads the initial model predictions from results.csv, applies a simple ensemble method using the get_ensemble() function, and writes the combined results to results_with_baseline_ensemble.csv.
The ensemble method can be configured with an environment variable PHISHGUARD_ENSEMBLE_THRESHOLD
to adjust the decision threshold for classifying a URL as phishing based on the ensemble's probability output.
"""
import pandas as pd
import numpy as np
from pathlib import Path
import os
from ml.ensemble import get_ensemble

INPUT_CSV = "results.csv"
OUTPUT_CSV = "results_with_baseline_ensemble.csv"


def get_ensemble_threshold() -> float:
    """Return ensemble decision threshold with env override."""
    raw = os.getenv("PHISHGUARD_ENSEMBLE_THRESHOLD", "0.66")
    try:
        value = float(raw)
    except ValueError:
        value = 0.66
    return min(0.99, max(0.01, value))

# Load results
if not Path(INPUT_CSV).exists():
    print(f"Input file {INPUT_CSV} not found.")
    exit(1)

df = pd.read_csv(INPUT_CSV)
ensemble = get_ensemble()
threshold = get_ensemble_threshold()
print(f"Using ensemble threshold: {threshold:.2f}")

# Compute ensemble and baseline predictions
ensemble_probs = []
baseline_preds = []
for url in df['url']:
    try:
        result = ensemble.analyze_url(url)
        ensemble_probs.append(result.phishing_probability)
        baseline_preds.append(int(result.phishing_probability >= threshold))
    except Exception as e:
        ensemble_probs.append(None)
        baseline_preds.append(None)

df['ensemble_proba'] = ensemble_probs
df['ensemble_pred'] = baseline_preds

df.to_csv(OUTPUT_CSV, index=False)
print(f"Wrote ensemble results to {OUTPUT_CSV}")
