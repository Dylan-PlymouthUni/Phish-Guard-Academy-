#!/usr/bin/env python3
"""
Train URL Phishing Detection Model
Uses Random Forest with advanced features from real phishing URLs
This script trains a Random Forest model for URL phishing detection using a comprehensive set of features extracted from real phishing URLs.
The training data is loaded from a CSV file containing URLs and their corresponding labels (phishing or legitimate). The script extracts features from each URL using the AdvancedURLAnalyzer, builds a feature matrix, and then trains a Random Forest classifier with hyperparameter tuning using GridSearchCV. 
The trained model is evaluated on a validation set, and key metrics such as accuracy, precision, recall, F1-score, ROC-AUC, and average precision are reported. The script also generates a feature importance plot to visualize which features contribute most to the model's predictions. Finally, the trained model and its associated metadata are saved to disk for later use in generating predictions and evaluating performance.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    classification_report, confusion_matrix, roc_auc_score,
    precision_recall_curve, average_precision_score,
    accuracy_score, precision_score, recall_score, f1_score
)
import joblib
import logging
from datetime import datetime
import matplotlib.pyplot as plt
import seaborn as sns

from ml.advanced_url_features import AdvancedURLAnalyzer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class URLModelTrainer:
    """Train Random Forest model on URL features"""
    
    def __init__(self, dataset_path: Path):
        """Initialize class state and store required dependencies."""
        self.dataset_path = dataset_path
        self.analyzer = AdvancedURLAnalyzer(timeout=3)
        self.model = None
        self.feature_names = []
        
    def load_data(self):
        """Load and process URLs"""
        logger.info(f"Loading dataset from {self.dataset_path}")
        df = pd.read_csv(self.dataset_path)
        
        logger.info(f"Dataset shape: {df.shape}")
        logger.info(f"Phishing URLs: {(df['label'] == 1).sum()}")
        logger.info(f"Legitimate URLs: {(df['label'] == 0).sum()}")
        
        return df
    
    def extract_features(self, urls: list, labels: list):
        """Extract features from URLs"""
        logger.info(f"Extracting features from {len(urls)} URLs...")
        
        features_list = []
        valid_labels = []
        
        for i, url in enumerate(urls):
            if i % 500 == 0:
                logger.info(f"Processed {i}/{len(urls)} URLs...")
            
            try:
                features = self.analyzer.extract_features(url)
                
                # Store feature names from first URL
                if not self.feature_names:
                    self.feature_names = list(features.keys())
                
                # Convert to list in consistent order
                feature_vector = [features.get(name, 0) for name in self.feature_names]
                features_list.append(feature_vector)
                valid_labels.append(labels[i])
                
            except Exception as e:
                logger.warning(f"Failed to extract features from {url}: {e}")
                continue
        
        logger.info(f"Successfully extracted features from {len(features_list)} URLs")
        logger.info(f"Total features per URL: {len(self.feature_names)}")
        
        return np.array(features_list), np.array(valid_labels)
    
    def train(self, X_train, y_train, X_val, y_val):
        """Train Random Forest with hyperparameter tuning"""
        logger.info("Training Random Forest model...")
        
        # Grid search for best parameters
        param_grid = {
            'n_estimators': [100, 200, 300],
            'max_depth': [10, 20, 30, None],
            'min_samples_split': [2, 5, 10],
            'min_samples_leaf': [1, 2, 4],
            'class_weight': ['balanced', None]
        }
        
        rf = RandomForestClassifier(random_state=42, n_jobs=-1)
        
        logger.info("Performing grid search (this may take a while)...")
        grid_search = GridSearchCV(
            rf, param_grid, cv=3, scoring='roc_auc',
            n_jobs=-1, verbose=1
        )
        
        grid_search.fit(X_train, y_train)
        
        logger.info(f"Best parameters: {grid_search.best_params_}")
        logger.info(f"Best cross-validation score: {grid_search.best_score_:.4f}")
        
        self.model = grid_search.best_estimator_
        self.grid_search = grid_search  # Store for later access
        
        # Evaluate on validation set
        self.evaluate(X_val, y_val)
        
        return self.model
    
    def evaluate(self, X, y):
        """Evaluate model performance"""
        logger.info("Evaluating model...")
        
        # Predictions
        y_pred = self.model.predict(X)
        y_proba = self.model.predict_proba(X)[:, 1]
        
        # Metrics
        logger.info("\n" + "="*60)
        logger.info("Classification Report:")
        logger.info("\n" + classification_report(y, y_pred, target_names=['Legitimate', 'Phishing']))
        
        # Confusion Matrix
        cm = confusion_matrix(y, y_pred)
        logger.info("\nConfusion Matrix:")
        logger.info(f"TN: {cm[0,0]}, FP: {cm[0,1]}")
        logger.info(f"FN: {cm[1,0]}, TP: {cm[1,1]}")
        
        # Compute all metrics
        accuracy = accuracy_score(y, y_pred)
        precision = precision_score(y, y_pred, zero_division=0)
        recall = recall_score(y, y_pred, zero_division=0)
        f1 = f1_score(y, y_pred, zero_division=0)
        
        # ROC-AUC
        roc_auc = roc_auc_score(y, y_proba)
        logger.info(f"\nROC-AUC Score: {roc_auc:.4f}")
        
        # Average Precision
        avg_precision = average_precision_score(y, y_proba)
        logger.info(f"Average Precision: {avg_precision:.4f}")
        
        # Feature importance
        self.plot_feature_importance()
        
        logger.info("="*60)
        
        return {
            'accuracy': accuracy,
            'precision': precision,
            'recall': recall,
            'f1': f1,
            'roc_auc': roc_auc,
            'avg_precision': avg_precision,
            'confusion_matrix': cm,
            'y_pred': y_pred,
            'y_proba': y_proba
        }
    
    def plot_feature_importance(self, top_n: int = 20):
        """Plot top feature importances"""
        importances = self.model.feature_importances_
        indices = np.argsort(importances)[::-1][:top_n]
        
        plt.figure(figsize=(12, 8))
        plt.title(f"Top {top_n} Most Important Features")
        plt.barh(range(top_n), importances[indices])
        plt.yticks(range(top_n), [self.feature_names[i] for i in indices])
        plt.xlabel("Feature Importance")
        plt.tight_layout()
        
        output_dir = Path("data/training/plots")
        output_dir.mkdir(parents=True, exist_ok=True)
        plt.savefig(output_dir / "url_feature_importance.png")
        logger.info(f"Feature importance plot saved to {output_dir / 'url_feature_importance.png'}")
        plt.close()
    
    def save_model(self, output_path: Path):
        """Save trained model"""
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        model_data = {
            'model': self.model,
            'feature_names': self.feature_names,
            'training_date': datetime.now().isoformat(),
            'n_features': len(self.feature_names)
        }
        
        joblib.dump(model_data, output_path)
        logger.info(f"Model saved to {output_path}")


def main():
    """Main training pipeline"""
    print("🎯 URL Phishing Detection Model Training")
    print("=" * 60)
    
    # Find latest dataset
    data_dir = Path("data/training")
    dataset_files = list(data_dir.glob("url_training_data_*.csv"))
    
    if not dataset_files:
        print("❌ No training data found!")
        print("Run: python collect_training_data.py")
        return
    
    latest_dataset = max(dataset_files, key=lambda p: p.stat().st_mtime)
    print(f"📁 Using dataset: {latest_dataset}")
    
    # Initialize trainer
    trainer = URLModelTrainer(latest_dataset)
    
    # Load data
    df = trainer.load_data()
    
    # Extract features
    X, y = trainer.extract_features(df['url'].tolist(), df['label'].tolist())
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    X_train, X_val, y_train, y_val = train_test_split(
        X_train, y_train, test_size=0.2, random_state=42, stratify=y_train
    )
    
    print(f"\nTraining set: {len(X_train)} samples")
    print(f"Validation set: {len(X_val)} samples")
    print(f"Test set: {len(X_test)} samples")
    
    # Train model
    model = trainer.train(X_train, y_train, X_val, y_val)
    
    # Final evaluation on test set
    print("\n" + "=" * 60)
    print("FINAL TEST SET EVALUATION:")
    print("=" * 60)
    results = trainer.evaluate(X_test, y_test)
    
    # Save model
    output_path = Path("ml/model/url_phish_rf_trained.joblib")
    trainer.save_model(output_path)
    
    print("\n" + "=" * 60)
    print("✅ URL Model Training Complete!")
    print("=" * 60)
    print(f"📊 Test ROC-AUC: {results['roc_auc']:.4f}")
    print(f"📊 Test Avg Precision: {results['avg_precision']:.4f}")
    print(f"💾 Model saved to: {output_path}")
    print("\nNext: python train_text_model.py")


if __name__ == "__main__":
    main()
