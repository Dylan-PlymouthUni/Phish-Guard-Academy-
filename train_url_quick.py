#!/usr/bin/env python3
"""
⚠️  LEGACY/EXPERIMENTAL — not used for dissertation results.
Use scripts/run_experiment.py for reproducible dissertation results.

Quick URL Model Trainer - Uses collected data
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score
import joblib
from tqdm import tqdm

from ml.advanced_url_features import AdvancedURLAnalyzer

print("🎯 URL Model Quick Training")
print("=" * 60)

# Load dataset
csv_file = Path("data/training/url_dataset.csv")
if not csv_file.exists():
    print("❌ Dataset not found! Run collect_phishing_data.py first")
    sys.exit(1)

df = pd.read_csv(csv_file)
print(f"✅ Loaded {len(df)} URLs")
print(f"   • Phishing: {(df['label'] == 1).sum()}")
print(f"   • Legitimate: {(df['label'] == 0).sum()}")

# Balance dataset
phishing = df[df['label'] == 1]
legitimate = df[df['label'] == 0]

# Match the smaller class
min_samples = min(len(phishing), len(legitimate))
print(f"\n⚖️  Balancing to {min_samples} samples per class...")

phishing = phishing.sample(n=min_samples, random_state=42)
legitimate = legitimate.sample(n=min_samples, random_state=42)
df_balanced = pd.concat([phishing, legitimate]).sample(frac=1, random_state=42)

print(f"✅ Balanced dataset: {len(df_balanced)} total samples")

# Extract features
print("\n🔧 Extracting features (this may take a few minutes)...")
analyzer = AdvancedURLAnalyzer(timeout=2)

features_list = []
labels_list = []

for idx, row in tqdm(df_balanced.iterrows(), total=len(df_balanced), desc="Processing"):
    try:
        url = row['url']
        label = row['label']
        
        features = analyzer.extract_features(url)
        
        # Keep only numeric features
        numeric_features = {}
        for key, value in features.items():
            if isinstance(value, (int, float, bool)):
                numeric_features[key] = float(value)
        
        if numeric_features:
            features_list.append(numeric_features)
            labels_list.append(label)
    
    except Exception as e:
        continue

# Convert to DataFrame
df_features = pd.DataFrame(features_list)
df_features = df_features.fillna(0)

X = df_features.values
y = np.array(labels_list)
feature_names = list(df_features.columns)

print(f"\n✅ Extracted {len(feature_names)} features from {len(X)} URLs")

# Split dataset
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

print(f"\n📊 Training: {len(X_train)}, Testing: {len(X_test)}")

# Train Random Forest
print("\n🤖 Training Random Forest...")
model = RandomForestClassifier(
    n_estimators=100,
    max_depth=15,
    min_samples_split=5,
    n_jobs=-1,
    random_state=42
)

model.fit(X_train, y_train)
print("✅ Training complete!")

# Evaluate
print("\n📊 Evaluating...")
y_pred = model.predict(X_test)
y_proba = model.predict_proba(X_test)[:, 1]

print("\n" + "=" * 60)
print("Classification Report:")
print("=" * 60)
print(classification_report(y_test, y_pred, target_names=['Legitimate', 'Phishing']))

print("\nConfusion Matrix:")
cm = confusion_matrix(y_test, y_pred)
print(cm)
print(f"\nTrue Negatives: {cm[0][0]}, False Positives: {cm[0][1]}")
print(f"False Negatives: {cm[1][0]}, True Positives: {cm[1][1]}")

roc_auc = roc_auc_score(y_test, y_proba)
print(f"\n🎯 ROC-AUC Score: {roc_auc:.4f}")

# Feature importance
print("\n🔝 Top 15 Important Features:")
importance_df = pd.DataFrame({
    'feature': feature_names,
    'importance': model.feature_importances_
}).sort_values('importance', ascending=False)

for idx, row in importance_df.head(15).iterrows():
    print(f"   {row['feature']:30s} {row['importance']:.4f}")

# Save model
model_dir = Path("ml/model")
model_dir.mkdir(parents=True, exist_ok=True)

model_file = model_dir / "url_phishing_rf_trained.joblib"

# Create proper feature importance dict (feature_name -> importance_score)
feature_importance_dict = dict(zip(feature_names, model.feature_importances_))

model_bundle = {
    'model': model,
    'feature_names': feature_names,
    'feature_importance': feature_importance_dict,
    'version': '2.0.0-trained',
    'n_samples': len(X),
    'accuracy': (y_pred == y_test).mean(),
    'roc_auc': roc_auc
}

joblib.dump(model_bundle, model_file)

print(f"\n💾 Model saved to: {model_file}")
print("\n" + "=" * 60)
print("✅ URL MODEL TRAINING COMPLETE!")
print(f"🎯 Test Accuracy: {(y_pred == y_test).mean():.2%}")
print(f"🎯 ROC-AUC: {roc_auc:.4f}")
print("\n💡 Update ensemble.py to use this trained model!")
print("=" * 60)
