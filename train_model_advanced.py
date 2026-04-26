#!/usr/bin/env python3
"""
 LEGACY/EXPERIMENTAL — not used for dissertation results.
Use scripts/run_experiment.py for reproducible dissertation results.

Advanced model training with hyperparameter tuning.
This script trains an advanced Random Forest model for URL phishing detection using a comprehensive set of features extracted from the URLs. 
It includes hyperparameter tuning using GridSearchCV to find the best combination of parameters for optimal performance. 
The script evaluates the model on a test set and reports key metrics such as accuracy and ROC-AUC, as well as feature importance to understand which features contribute most to the model's predictions.
 The trained model and its associated metadata are saved to disk for later use in generating predictions and evaluating performance.
"""

import logging
from pathlib import Path
import numpy as np
import pandas as pd
from scipy.io import arff
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, GridSearchCV, cross_val_score
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix, roc_auc_score
import joblib

logging.basicConfig(level=logging.INFO, format='%(levelname)s - %(message)s')
logger = logging.getLogger("train_advanced")

def main() -> None:
    """Run the main CLI workflow for this module."""
    arff_path = Path("data/combined_features.arff")
    model_path = Path("ml/model/phish_rf_full.joblib")
    
    if not arff_path.exists():
        logger.error(f"ARFF not found: {arff_path}")
        return
    
    # Load data
    logger.info(f"Loading data from {arff_path}...")
    data, meta = arff.loadarff(str(arff_path))
    df = pd.DataFrame(data)
    logger.info(f"Loaded {len(df)} samples with {len(df.columns)} features")
    
    # Encode labels
    label_col = "label"
    if df[label_col].dtype == "object":
        le = LabelEncoder()
        df[label_col] = le.fit_transform(df[label_col])
        logger.info(f"Labels: {dict(enumerate(le.classes_))}")
    
    # Split
    feature_cols = [c for c in df.columns if c != label_col]
    train_df, test_df = train_test_split(df, test_size=0.2, random_state=42, stratify=df[label_col])
    logger.info(f"Train: {len(train_df)}, Test: {len(test_df)}")
    
    X_train, y_train = train_df[feature_cols], train_df[label_col]
    X_test, y_test = test_df[feature_cols], test_df[label_col]
    
    # Hyperparameter tuning
    logger.info("Starting hyperparameter tuning...")
    param_grid = {
        'n_estimators': [100, 200],
        'max_depth': [10, 20, None],
        'min_samples_split': [2, 5],
    }
    
    rf = RandomForestClassifier(random_state=42, n_jobs=-1)
    grid_search = GridSearchCV(rf, param_grid, cv=3, scoring='accuracy', n_jobs=-1, verbose=1)
    grid_search.fit(X_train, y_train)
    
    logger.info(f"Best params: {grid_search.best_params_}")
    logger.info(f"Best CV score: {grid_search.best_score_:.4f}")
    
    clf = grid_search.best_estimator_
    
    # Evaluate
    y_pred = clf.predict(X_test)
    y_pred_proba = clf.predict_proba(X_test)[:, 1]
    
    test_acc = accuracy_score(y_test, y_pred)
    roc_auc = roc_auc_score(y_test, y_pred_proba)
    
    logger.info(f"\n{'='*60}")
    logger.info(f"TEST SET PERFORMANCE")
    logger.info(f"{'='*60}")
    logger.info(f"Accuracy: {test_acc:.4f}")
    logger.info(f"ROC-AUC: {roc_auc:.4f}")
    logger.info(f"\nConfusion Matrix:\n{confusion_matrix(y_test, y_pred)}")
    logger.info(f"\n{classification_report(y_test, y_pred, target_names=['legitimate', 'phishing'])}")
    
    # Feature importance
    feature_importance = pd.DataFrame({
        'feature': feature_cols,
        'importance': clf.feature_importances_
    }).sort_values('importance', ascending=False)
    logger.info(f"\nFeature Importance:\n{feature_importance.to_string(index=False)}")
    
    # Save
    model_path.parent.mkdir(parents=True, exist_ok=True)
    bundle = {
        "model": clf,
        "feature_names": feature_cols,
        "test_accuracy": test_acc,
        "roc_auc": roc_auc,
        "best_params": grid_search.best_params_,
    }
    joblib.dump(bundle, str(model_path))
    logger.info(f"\n✓ Model saved to {model_path}")
    logger.info(f"{'='*60}")
    logger.info("🎉 TRAINING COMPLETE!")
    logger.info(f"{'='*60}\n")

if __name__ == "__main__":
    main()
