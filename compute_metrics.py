"""Compute metrics utilities for PhishGuard Academy.
This script computes various performance metrics for the phishing detection models, including accuracy, precision, recall, F1-score, ROC-AUC, and average precision.
It reads the predictions and true labels from results_with_baseline_ensemble.csv, calculates the metrics for both the random forest model and the ensemble model, and saves a summary of the metrics to metrics_summary.json.
It also generates confusion matrices in markdown format and saves ROC and Precision-Recall curves as images for visual analysis of model performance. The script is designed to be run after the results have been generated and provides a comprehensive evaluation of the models' performance on the test set.
"""

import pandas as pd
import numpy as np
import json
import matplotlib.pyplot as plt
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score, confusion_matrix,
    roc_auc_score, average_precision_score, RocCurveDisplay, PrecisionRecallDisplay
)

# Load data
csv_path = "results_with_baseline_ensemble.csv"
df = pd.read_csv(csv_path)

# Auto-detect columns
label_col = 'label'
rf_pred_col = 'y_pred_url'
rf_proba_col = 'y_proba_url'
ensemble_pred_col = 'ensemble_pred'
ensemble_proba_col = 'ensemble_proba'

# Prepare arrays
labels = df[label_col].values
rf_preds = df[rf_pred_col].values
rf_probas = df[rf_proba_col].values
ensemble_preds = df[ensemble_pred_col].values
ensemble_probas = df[ensemble_proba_col].values

# Metrics function
def compute_metrics(y_true, y_pred, y_proba):
    """Compute metrics."""
    acc = accuracy_score(y_true, y_pred)
    prec = precision_score(y_true, y_pred, zero_division=0)
    rec = recall_score(y_true, y_pred, zero_division=0)
    f1 = f1_score(y_true, y_pred, zero_division=0)
    cm = confusion_matrix(y_true, y_pred).tolist()
    try:
        roc_auc = roc_auc_score(y_true, y_proba)
    except Exception:
        roc_auc = None
    try:
        avg_prec = average_precision_score(y_true, y_proba)
    except Exception:
        avg_prec = None
    return acc, prec, rec, f1, cm, roc_auc, avg_prec

rf_metrics = compute_metrics(labels, rf_preds, rf_probas)
ensemble_metrics = compute_metrics(labels, ensemble_preds, ensemble_probas)

# Save metrics
metrics = {
    "rf": {
        "accuracy": rf_metrics[0],
        "precision": rf_metrics[1],
        "recall": rf_metrics[2],
        "f1": rf_metrics[3],
        "roc_auc": rf_metrics[5],
        "average_precision": rf_metrics[6],
        "confusion_matrix": rf_metrics[4]
    },
    "ensemble": {
        "accuracy": ensemble_metrics[0],
        "precision": ensemble_metrics[1],
        "recall": ensemble_metrics[2],
        "f1": ensemble_metrics[3],
        "roc_auc": ensemble_metrics[5],
        "average_precision": ensemble_metrics[6],
        "confusion_matrix": ensemble_metrics[4]
    }
}

with open("metrics_summary.json", "w") as f:
    json.dump(metrics, f, indent=2)

# Print markdown confusion matrices
print("\nRandom Forest Confusion Matrix:")
print("|        | Pred 0 | Pred 1 |")
print("|--------|--------|--------|")
print(f"| True 0 | {rf_metrics[4][0][0]}      | {rf_metrics[4][0][1]}      |")
print(f"| True 1 | {rf_metrics[4][1][0]}      | {rf_metrics[4][1][1]}      |\n")

print("Ensemble Confusion Matrix:")
print("|        | Pred 0 | Pred 1 |")
print("|--------|--------|--------|")
print(f"| True 0 | {ensemble_metrics[4][0][0]}      | {ensemble_metrics[4][0][1]}      |")
print(f"| True 1 | {ensemble_metrics[4][1][0]}      | {ensemble_metrics[4][1][1]}      |\n")

# Print all scores
print("Random Forest Metrics:")
print(f"Accuracy: {rf_metrics[0]:.4f}")
print(f"Precision: {rf_metrics[1]:.4f}")
print(f"Recall: {rf_metrics[2]:.4f}")
print(f"F1-score: {rf_metrics[3]:.4f}")
print(f"ROC-AUC: {rf_metrics[5]}")
print(f"Average Precision: {rf_metrics[6]}")

print("\nEnsemble Metrics:")
print(f"Accuracy: {ensemble_metrics[0]:.4f}")
print(f"Precision: {ensemble_metrics[1]:.4f}")
print(f"Recall: {ensemble_metrics[2]:.4f}")
print(f"F1-score: {ensemble_metrics[3]:.4f}")
print(f"ROC-AUC: {ensemble_metrics[5]}")
print(f"Average Precision: {ensemble_metrics[6]}")

# ROC and PR curves
fig, ax = plt.subplots()
RocCurveDisplay.from_predictions(labels, rf_probas, name="Random Forest", ax=ax)
RocCurveDisplay.from_predictions(labels, ensemble_probas, name="Ensemble", ax=ax)
plt.title("ROC Curve")
plt.savefig("roc_curve.png")
print("Saved: roc_curve.png")
plt.close()

fig, ax = plt.subplots()
PrecisionRecallDisplay.from_predictions(labels, rf_probas, name="Random Forest", ax=ax)
PrecisionRecallDisplay.from_predictions(labels, ensemble_probas, name="Ensemble", ax=ax)
plt.title("Precision-Recall Curve")
plt.savefig("pr_curve.png")
print("Saved: pr_curve.png")
plt.close()
