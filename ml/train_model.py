"""Train model utilities for PhishGuard Academy.
This module defines the main training script for the machine learning model used in the PhishGuard Academy platform.
 It loads the UCI Phishing Websites dataset from an ARFF file, preprocesses the data, and trains a RandomForestClassifier to detect phishing URLs based on the features provided in the dataset.
  The trained model is then saved as a joblib file for later use by the ML engine. 
  The script includes error handling for missing files and ensures that the model is trained with appropriate parameters for good performance on the phishing detection task."""

from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from scipy.io import arff
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

DATA_PATH = Path("ml/data/Training Dataset.arff")
MODEL_PATH = Path("ml/model/phish_rf_full.joblib")


def load_arff(path: Path) -> pd.DataFrame:
    """Load the UCI phishing ARFF into a pandas DataFrame."""
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        data = arff.loadarff(f)

    df = pd.DataFrame(data[0])

    # Convert bytes -> str for any object columns
    for col in df.select_dtypes(include=["object"]).columns:
        df[col] = df[col].apply(
            lambda x: x.decode("utf-8") if isinstance(x, (bytes, bytearray)) else x
        )

    return df


def main() -> None:
    """Run the main CLI workflow for this module."""
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"ARFF not found at {DATA_PATH}")

    print(f"Loading ARFF from {DATA_PATH} ...")
    df = load_arff(DATA_PATH)

    # UCI phishing dataset normally uses "Result" as target label
    target_col = "Result"
    if target_col not in df.columns:
        raise KeyError(
            f"Expected target column '{target_col}' in ARFF but did not find it. "
            f"Available columns: {list(df.columns)}"
        )

    X = df.drop(columns=[target_col])
    y = df[target_col]

    # Ensure numeric where possible
    X = X.apply(pd.to_numeric, errors="coerce").fillna(0)
    y = pd.to_numeric(y, errors="coerce")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    clf = RandomForestClassifier(
        n_estimators=200,
        max_depth=None,
        random_state=42,
        n_jobs=-1,
    )

    print("Training RandomForest...")
    clf.fit(X_train, y_train)

    print("=== RandomForest on ARFF features ===")
    y_pred = clf.predict(X_test)
    print(classification_report(y_test, y_pred))

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    bundle = {
        "model": clf,
        "feature_names": list(X.columns),
        "target_name": target_col,
    }
    joblib.dump(bundle, MODEL_PATH)
    print(f"Saved model to {MODEL_PATH}")


if __name__ == "__main__":
    main()
