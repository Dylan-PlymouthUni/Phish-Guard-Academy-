# generate_results.py
import os
import sys
import joblib
import pandas as pd
import numpy as np
from pathlib import Path
from ml.advanced_url_features import AdvancedURLAnalyzer

# ---------- USER CONFIG ----------
MODEL_PATH = "ml/model/url_phishing_rf_trained.joblib"   # change if different
TEST_CSV_PATH = "data/training/url_test_set.csv"         # change if needed
OUTPUT_CSV = "results.csv"
PROB_COL = "y_proba_url"
PRED_COL = "y_pred_url"
URL_COL = "url"
YTRUE_COL = "y_true"  # or use 'label' if that's the name in the test CSV
THRESHOLD = 0.5
# ---------------------------------

def load_model(path):
	m = joblib.load(path)
	if isinstance(m, dict) and 'model' in m and 'feature_names' in m:
		model = m['model']
		feature_names = m['feature_names']
	else:
		model = m
		feature_names = None
	return model, feature_names

def build_feature_vector_from_features(features, feature_names):
	return [features.get(name, 0) for name in feature_names]

def main():
	if not Path(MODEL_PATH).exists():
		print(f"Model not found at {MODEL_PATH}.")
		sys.exit(1)
	if not Path(TEST_CSV_PATH).exists():
		print(f"Test CSV not found at {TEST_CSV_PATH}.")
		sys.exit(1)
	model, feature_names = load_model(MODEL_PATH)
	if feature_names is None:
		if hasattr(model, 'feature_names_in_'):
			feature_names = list(model.feature_names_in_)
		else:
			print("Model does not contain 'feature_names'. Exiting.")
			sys.exit(1)
	df = pd.read_csv(TEST_CSV_PATH)
	input_label_col = YTRUE_COL if YTRUE_COL in df.columns else "label"
	analyzer = AdvancedURLAnalyzer(timeout=3)
	results = []
	for i, row in df.iterrows():
		url = str(row[URL_COL]).strip()
		y_true = int(row[input_label_col]) if input_label_col in row else int(row['label'])
		try:
			feats = analyzer.extract_features(url)
		except Exception as e:
			feats = {}
		feature_vector = build_feature_vector_from_features(feats, feature_names)
		feature_vector = [float(v) if isinstance(v,(int, float, bool)) else 0.0 for v in feature_vector]
		try:
			proba = model.predict_proba([feature_vector])[0][1]
			pred = 1 if proba >= THRESHOLD else 0
		except Exception as e:
			proba = None
			pred = None
		results.append({
			URL_COL: url,
			input_label_col: y_true,
			PRED_COL: int(pred) if pred is not None else -1,
			PROB_COL: float(proba) if proba is not None else None
		})
		if (i+1) % 100 == 0:
			print(f"Processed {i+1} rows")
	out_df = pd.DataFrame(results)
	out_df.to_csv(OUTPUT_CSV, index=False)
	print(f"Wrote results to {OUTPUT_CSV}")
if __name__ == "__main__":
	main()
