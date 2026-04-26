#!/usr/bin/env python3
"""Final validation script for dissertation artifacts and model outputs.

This script checks that required files exist, dataset splits are consistent,
and key result columns/accuracy thresholds look sane before reporting.
The script provides a clear report of any issues found and a final verdict on whether the data is ready for analysis and reporting in the dissertation.
It also summarizes key metrics that should be reported in the dissertation results section, such as dataset size and model accuracies.
"""
import pandas as pd
import json
from pathlib import Path

print("╔" + "═" * 68 + "╗")
print("║" + " " * 20 + "VALIDATION REPORT" + " " * 31 + "║")
print("╚" + "═" * 68 + "╝")

validation_passed = True
errors = []

# 1. Check required files exist
required_files = {
    "data/training/url_dataset_full.csv": "Full dataset",
    "data/training/url_train_set.csv": "Training set",
    "data/training/url_test_set.csv": "Test set",
    "ml/model/url_phish_rf_trained.joblib": "Trained model",
    "results.csv": "RF predictions",
    "results_with_baseline_ensemble.csv": "Ensemble predictions",
    "roc_curve.png": "ROC curve",
    "pr_curve.png": "Precision-Recall curve",
}

print("\n✓ FILE VALIDATION:")
for file_path, description in required_files.items():
    if Path(file_path).exists():
        size = Path(file_path).stat().st_size
        print(f"  ✓ {description:25s} ({file_path})")
    else:
        print(f"  ✗ {description:25s} MISSING!")
        validation_passed = False
        errors.append(f"Missing file: {file_path}")

# 2. Validate dataset
print("\n✓ DATASET VALIDATION:")
try:
    df_full = pd.read_csv("data/training/url_dataset_full.csv")
    df_train = pd.read_csv("data/training/url_train_set.csv")
    df_test = pd.read_csv("data/training/url_test_set.csv")
    
    print(f"  ✓ Full dataset has {len(df_full)} URLs")
    print(f"  ✓ Train + Test = {len(df_train) + len(df_test)} URLs")
    
    if len(df_train) + len(df_test) == len(df_full):
        print(f"  ✓ Train/test split adds up correctly")
    else:
        errors.append("Train/test split doesn't match full dataset size")
        validation_passed = False
    
    # Check both classes present in test set
    test_classes = df_test['label'].unique()
    if len(test_classes) == 2:
        print(f"  ✓ Both classes present in test set")
    else:
        errors.append("Test set missing one class")
        validation_passed = False
    
    # Check minimum samples per class
    test_counts = df_test['label'].value_counts()
    if test_counts.min() >= 20:
        print(f"  ✓ Test set has {test_counts.min()}+ samples per class (min: 20)")
    else:
        errors.append(f"Test set has only {test_counts.min()} samples for one class")
        validation_passed = False
        
except Exception as e:
    print(f"  ✗ Error validating dataset: {e}")
    validation_passed = False
    errors.append(str(e))

# 3. Validate results
print("\n✓ RESULTS VALIDATION:")
try:
    df_results = pd.read_csv("results_with_baseline_ensemble.csv")
    
    required_cols = ['url', 'label', 'y_pred_url', 'y_proba_url', 'ensemble_pred', 'ensemble_proba']
    missing_cols = [col for col in required_cols if col not in df_results.columns]
    
    if not missing_cols:
        print(f"  ✓ All required columns present")
    else:
        print(f"  ✗ Missing columns: {missing_cols}")
        validation_passed = False
        errors.append(f"Missing columns: {missing_cols}")
    
    # Check for NaN values
    nan_counts = df_results[required_cols].isna().sum()
    if nan_counts.sum() == 0:
        print(f"  ✓ No NaN values in results")
    else:
        print(f"  ⚠ Warning: Found {nan_counts.sum()} NaN values")
    
    # Validate metrics
    rf_acc = (df_results['label'] == df_results['y_pred_url']).sum() / len(df_results)
    ens_acc = (df_results['label'] == df_results['ensemble_pred']).sum() / len(df_results)
    
    print(f"  ✓ Random Forest Accuracy: {rf_acc:.4f}")
    print(f"  ✓ Ensemble Accuracy: {ens_acc:.4f}")
    
    if rf_acc > 0.8 and ens_acc > 0.8:
        print(f"  ✓ Both models exceed 80% accuracy threshold")
    else:
        errors.append("One or both models below 80% accuracy")
        validation_passed = False
        
except Exception as e:
    print(f"  ✗ Error validating results: {e}")
    validation_passed = False
    errors.append(str(e))

# 4. Final verdict
print("\n" + "═" * 70)
if validation_passed:
    print("✅ ALL VALIDATION CHECKS PASSED!")
    print("\nYour dissertation data is complete and ready for analysis.")
    print("\nKey metrics to report:")
    print(f"  • Dataset size: {len(df_full)} URLs")
    print(f"  • Test set size: {len(df_test)} URLs")
    print(f"  • Random Forest Accuracy: {rf_acc*100:.2f}%")
    print(f"  • Ensemble Accuracy: {ens_acc*100:.2f}%")
else:
    print("⚠️  VALIDATION FAILED")
    print("\nErrors found:")
    for i, error in enumerate(errors, 1):
        print(f"  {i}. {error}")
    print("\nPlease fix these issues before proceeding.")

print("═" * 70)
