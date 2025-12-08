#!/usr/bin/env python3
"""Train screenshot phishing detector."""

import os
import json
from pathlib import Path
from PIL import Image
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
import joblib
from ml.api import extract_screenshot_features

PHISHING_DIR = Path("data/screenshots/phishing")
LEGITIMATE_DIR = Path("data/screenshots/legitimate")
MODEL_PATH = Path("ml/model/screenshot_phish_rf.joblib")

def load_screenshots(directory, label):
    """Load all PNG screenshots and extract features."""
    features_list = []
    for img_path in directory.glob("*.png"):
        try:
            img = Image.open(img_path)
            features = extract_screenshot_features(img)
            features["label"] = label
            features_list.append(features)
            print(f"✓ {img_path.name}")
        except Exception as e:
            print(f"✗ {img_path.name}: {e}")
    return features_list

print("Loading phishing screenshots...")
phishing_features = load_screenshots(PHISHING_DIR, "phishing")

print("Loading legitimate screenshots...")
legitimate_features = load_screenshots(LEGITIMATE_DIR, "legitimate")

if len(phishing_features) < 5 or len(legitimate_features) < 5:
    print(f"❌ Need at least 5 screenshots each. Got {len(phishing_features)} phishing, {len(legitimate_features)} legitimate")
    print("Add more screenshots to data/screenshots/[phishing|legitimate]/ and try again")
    exit(1)

# Create DataFrame
all_features = phishing_features + legitimate_features
df = pd.DataFrame(all_features)

print(f"\n📊 Dataset: {len(phishing_features)} phishing + {len(legitimate_features)} legitimate")
print(f"Features: {list(df.columns)}")

# Split & train
X = df.drop("label", axis=1)
y = df["label"]

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

print("Training RandomForest on screenshot features...")
clf = RandomForestClassifier(n_estimators=50, random_state=42)
clf.fit(X_train, y_train)

# Evaluate
y_pred = clf.predict(X_test)
acc = accuracy_score(y_test, y_pred)
print(f"\n✓ Test accuracy: {acc:.2%}")
print("\nClassification Report:")
print(classification_report(y_test, y_pred))

# Save
MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
model_bundle = {
    "model": clf,
    "feature_names": list(X.columns),
    "test_accuracy": acc,
    "type": "screenshot",
}
joblib.dump(model_bundle, MODEL_PATH)
print(f"✓ Model saved to {MODEL_PATH}")
