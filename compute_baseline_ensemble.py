#!/usr/bin/env python3
"""
Compute baseline and ensemble results for phishing detection.
"""
import pandas as pd
import numpy as np
from pathlib import Path
from ml.ensemble import get_ensemble

INPUT_CSV = "results.csv"
OUTPUT_CSV = "results_with_baseline_ensemble.csv"

# Load results
if not Path(INPUT_CSV).exists():
    print(f"Input file {INPUT_CSV} not found.")
    exit(1)

df = pd.read_csv(INPUT_CSV)
ensemble = get_ensemble()

# Compute ensemble and baseline predictions
ensemble_probs = []
baseline_preds = []
for url in df['url']:
    try:
        result = ensemble.analyze_url(url)
        ensemble_probs.append(result.phishing_probability)
        baseline_preds.append(int(result.phishing_probability >= 0.5))
    except Exception as e:
        ensemble_probs.append(None)
        baseline_preds.append(None)

df['ensemble_proba'] = ensemble_probs
df['ensemble_pred'] = baseline_preds

df.to_csv(OUTPUT_CSV, index=False)
print(f"Wrote ensemble results to {OUTPUT_CSV}")
