#!/usr/bin/env python3
"""
Evaluate PhishGuard predictions and print metrics.
"""
import sys
import pandas as pd
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score

if len(sys.argv) < 2:
    print("Usage: python evaluate_phishguard.py <results.csv>")
    sys.exit(1)

csv_path = sys.argv[1]
df = pd.read_csv(csv_path)

# Use y_true/label and y_pred_url/ensemble_pred if available
label_col = 'y_true' if 'y_true' in df.columns else 'label'
pred_col = 'ensemble_pred' if 'ensemble_pred' in df.columns else 'y_pred_url'
proba_col = 'ensemble_proba' if 'ensemble_proba' in df.columns else 'y_proba_url'

y_true = df[label_col]
y_pred = df[pred_col]

print("\nClassification Report:")
print(classification_report(y_true, y_pred, target_names=['Legitimate', 'Phishing']))

print("\nConfusion Matrix:")
cm = confusion_matrix(y_true, y_pred)
print(cm)

if proba_col in df.columns:
    roc_auc = roc_auc_score(y_true, df[proba_col])
    print(f"\nROC-AUC Score: {roc_auc:.4f}")
