#!/usr/bin/env python3
"""Standalone model training script (no FastAPI overhead)."""

import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("train_model")

def main() -> None:
    """Train RandomForest on phishing ARFF dataset."""
    from scipy.io import arff
    import pandas as pd
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.model_selection import train_test_split
    from sklearn.preprocessing import LabelEncoder
    from sklearn.metrics import classification_report, accuracy_score
    import joblib

    arff_path = Path("data/combined_features.arff")
    model_path = Path("ml/model/phish_rf_full.joblib")

    # Check ARFF exists
    if not arff_path.exists():
        logger.error(f"ARFF file not found at {arff_path}")
        logger.info("Create data/combined_features.arff first")
        return

    logger.info(f"Loading ARFF from {arff_path}...")
    try:
        data, meta = arff.loadarff(str(arff_path))
        df = pd.DataFrame(data)
        logger.info(f"Loaded {len(df)} samples with {len(df.columns)} features")
    except Exception as e:
        logger.error(f"Failed to load ARFF: {e}")
        return

    # Encode labels
    label_col = "label"
    if label_col not in df.columns:
        logger.error(f"Label column '{label_col}' not found. Columns: {df.columns.tolist()}")
        return

    if df[label_col].dtype == "object":
        le = LabelEncoder()
        df[label_col] = le.fit_transform(df[label_col])
        logger.info(f"Encoded labels: {dict(enumerate(le.classes_))}")

    # Train/test split
    feature_cols = [c for c in df.columns if c != label_col]
    logger.info(f"Using {len(feature_cols)} features for training")

    try:
        train_df, test_df = train_test_split(
            df, test_size=0.2, random_state=42, stratify=df[label_col]
        )
        logger.info(f"Train/test split: {len(train_df)} train, {len(test_df)} test")
    except Exception as e:
        logger.error(f"Failed to split data: {e}")
        return

    X_train, y_train = train_df[feature_cols], train_df[label_col]
    X_test, y_test = test_df[feature_cols], test_df[label_col]

    # Train RandomForest
    logger.info("Training RandomForest (n_estimators=100)...")
    try:
        clf = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
        clf.fit(X_train, y_train)
        logger.info("✓ Model trained")
    except Exception as e:
        logger.error(f"Failed to train: {e}")
        return

    # Evaluate
    logger.info("Evaluating on test set...")
    try:
        y_pred = clf.predict(X_test)
        acc = accuracy_score(y_test, y_pred)
        logger.info(f"Test Accuracy: {acc:.4f}")
        logger.info("\nClassification Report:")
        logger.info(classification_report(y_test, y_pred))
    except Exception as e:
        logger.error(f"Failed to evaluate: {e}")
        return

    # Save
    logger.info(f"Saving model to {model_path}...")
    model_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        bundle = {
            "model": clf,
            "feature_names": feature_cols,
            "target_name": label_col,
            "test_accuracy": acc,
        }
        joblib.dump(bundle, str(model_path))
        logger.info(f"✓ Model saved to {model_path}")
    except Exception as e:
        logger.error(f"Failed to save: {e}")
        return

    logger.info("🎉 Training complete!")

if __name__ == "__main__":
    main()
