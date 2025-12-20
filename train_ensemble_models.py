#!/usr/bin/env python3
"""
Train all ensemble models: URL, Text, and Visual classifiers
"""
import logging
import argparse
from pathlib import Path
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics import classification_report, roc_auc_score, confusion_matrix
import joblib

from ml.advanced_url_features import AdvancedURLAnalyzer
from ml.text_classifier import TextPhishingClassifier, create_training_dataset
from ml.visual_classifier import VisualPhishingDetector

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class EnsembleTrainer:
    """Train all components of the ensemble"""
    
    def __init__(self, data_path: Path, output_dir: Path):
        self.data_path = data_path
        self.output_dir = output_dir
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Load dataset
        logger.info(f"Loading dataset from {data_path}")
        self.df = pd.read_csv(data_path)
        logger.info(f"Loaded {len(self.df)} samples")
        logger.info(f"Label distribution:\n{self.df['label'].value_counts()}")
    
    def train_url_model(self):
        """Train URL-based Random Forest model"""
        logger.info("=" * 60)
        logger.info("TRAINING URL MODEL")
        logger.info("=" * 60)
        
        # Extract features from URLs
        logger.info("Extracting URL features (this may take a while)...")
        
        url_analyzer = AdvancedURLAnalyzer(timeout=3)
        features_list = []
        labels = []
        
        for idx, row in self.df.iterrows():
            if idx % 100 == 0:
                logger.info(f"Processing URL {idx}/{len(self.df)}")
            
            try:
                url = row['url']
                label = 1 if row['label'] == 'phishing' else 0
                
                features = url_analyzer.extract_features(url)
                features['label'] = label
                features_list.append(features)
                labels.append(label)
                
            except Exception as e:
                logger.warning(f"Failed to process {url}: {e}")
                continue
        
        # Create dataframe
        features_df = pd.DataFrame(features_list)
        
        # Remove non-numeric columns
        numeric_cols = features_df.select_dtypes(include=[np.number]).columns
        X = features_df[numeric_cols]
        y = features_df['label']
        
        # Remove label from features
        X = X.drop('label', axis=1, errors='ignore')
        
        logger.info(f"Feature matrix shape: {X.shape}")
        logger.info(f"Features: {list(X.columns)}")
        
        # Split
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        # Train Random Forest
        logger.info("Training Random Forest...")
        rf = RandomForestClassifier(
            n_estimators=200,
            max_depth=20,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1,
            verbose=1
        )
        rf.fit(X_train, y_train)
        
        # Evaluate
        y_pred = rf.predict(X_test)
        y_proba = rf.predict_proba(X_test)[:, 1]
        
        logger.info("\n" + "=" * 60)
        logger.info("URL MODEL EVALUATION")
        logger.info("=" * 60)
        logger.info(f"\n{classification_report(y_test, y_pred, target_names=['Legitimate', 'Phishing'])}")
        logger.info(f"ROC-AUC: {roc_auc_score(y_test, y_proba):.4f}")
        logger.info(f"\nConfusion Matrix:\n{confusion_matrix(y_test, y_pred)}")
        
        # Feature importance
        feature_importance = pd.DataFrame({
            'feature': X.columns,
            'importance': rf.feature_importances_
        }).sort_values('importance', ascending=False)
        
        logger.info(f"\nTop 15 Important Features:")
        logger.info(feature_importance.head(15).to_string(index=False))
        
        # Save model
        model_path = self.output_dir / "url_model.joblib"
        joblib.dump({
            'model': rf,
            'feature_names': list(X.columns),
            'test_accuracy': float(np.mean(y_pred == y_test)),
            'roc_auc': float(roc_auc_score(y_test, y_proba)),
            'feature_importance': feature_importance.to_dict('records')
        }, model_path)
        
        logger.info(f"✅ URL model saved to {model_path}")
        return model_path
    
    def train_text_model(
        self,
        use_bert: bool = False,
        epochs: int = 3
    ):
        """Train text classification model"""
        logger.info("=" * 60)
        logger.info("TRAINING TEXT MODEL")
        logger.info(f"Using BERT: {use_bert}")
        logger.info("=" * 60)
        
        # For text training, we need actual email/message content
        # Since we only have URLs, we'll create synthetic text based on URL patterns
        logger.info("Generating synthetic phishing text samples...")
        
        phishing_templates = [
            "URGENT: Your account has been suspended. Click here to verify: {url}",
            "Security Alert: Unusual activity detected on your account. Verify now: {url}",
            "Your payment method has expired. Update immediately: {url}",
            "Account locked due to suspicious activity. Restore access: {url}",
            "Confirm your identity to avoid account closure: {url}",
            "Final warning: Update your security information: {url}"
        ]
        
        legitimate_templates = [
            "Welcome to our service! Get started here: {url}",
            "Your order has been confirmed. Track it here: {url}",
            "Thanks for subscribing! Visit your dashboard: {url}",
            "New features available. Learn more: {url}",
            "Your monthly report is ready: {url}"
        ]
        
        texts = []
        labels = []
        
        for _, row in self.df.iterrows():
            url = row['url']
            label = 1 if row['label'] == 'phishing' else 0
            
            if label == 1:
                template = np.random.choice(phishing_templates)
            else:
                template = np.random.choice(legitimate_templates)
            
            text = template.format(url=url)
            texts.append(text)
            labels.append(label)
        
        # Split
        X_train, X_test, y_train, y_test = train_test_split(
            texts, labels, test_size=0.2, random_state=42, stratify=labels
        )
        
        # Train classifier
        classifier = TextPhishingClassifier(use_gpu=True)
        
        output_dir = self.output_dir / "text_model"
        classifier.train(
            train_texts=X_train,
            train_labels=y_train,
            val_texts=X_test,
            val_labels=y_test,
            output_dir=output_dir,
            epochs=epochs,
            batch_size=16,
            use_bert=use_bert
        )
        
        logger.info(f"✅ Text model saved to {output_dir}")
        return output_dir
    
    def train_visual_model(self):
        """Train visual/screenshot classifier"""
        logger.info("=" * 60)
        logger.info("TRAINING VISUAL MODEL")
        logger.info("=" * 60)
        
        # Check for screenshot data
        screenshot_dir = Path("data/screenshots")
        
        if not screenshot_dir.exists():
            logger.warning("No screenshot data found. Skipping visual model training.")
            logger.info("To train visual model:")
            logger.info("1. Add screenshots to data/screenshots/phishing/")
            logger.info("2. Add screenshots to data/screenshots/legitimate/")
            logger.info("3. Run: python train_screenshot_model.py")
            return None
        
        phishing_dir = screenshot_dir / "phishing"
        legitimate_dir = screenshot_dir / "legitimate"
        
        phishing_count = len(list(phishing_dir.glob("*.png"))) if phishing_dir.exists() else 0
        legitimate_count = len(list(legitimate_dir.glob("*.png"))) if legitimate_dir.exists() else 0
        
        logger.info(f"Found {phishing_count} phishing screenshots")
        logger.info(f"Found {legitimate_count} legitimate screenshots")
        
        if phishing_count < 20 or legitimate_count < 20:
            logger.warning("Insufficient screenshot data (need at least 20 of each)")
            return None
        
        # Visual model training would go here
        # For now, we'll skip it as it requires pre-collected screenshots
        logger.info("Visual model training requires pre-collected screenshots")
        logger.info("Run train_screenshot_model.py separately if you have screenshot data")
        
        return None
    
    def create_ensemble_config(
        self,
        url_model_path: Path,
        text_model_path: Path,
        visual_model_path: Path = None
    ):
        """Create ensemble configuration"""
        logger.info("=" * 60)
        logger.info("CREATING ENSEMBLE CONFIGURATION")
        logger.info("=" * 60)
        
        config = {
            'version': '1.0',
            'created_at': pd.Timestamp.now().isoformat(),
            'models': {
                'url': str(url_model_path),
                'text': str(text_model_path),
                'visual': str(visual_model_path) if visual_model_path else None
            },
            'weights': {
                'url': 0.35,
                'text': 0.35,
                'visual': 0.20 if visual_model_path else 0.0,
                'heuristic': 0.10
            },
            'training_data': {
                'samples': len(self.df),
                'phishing': int((self.df['label'] == 'phishing').sum()),
                'legitimate': int((self.df['label'] == 'legitimate').sum())
            }
        }
        
        # Normalize weights if no visual model
        if not visual_model_path:
            total = sum(config['weights'].values())
            config['weights'] = {k: v/total for k, v in config['weights'].items()}
        
        config_path = self.output_dir / "ensemble_config.json"
        import json
        with open(config_path, 'w') as f:
            json.dump(config, f, indent=2)
        
        logger.info(f"Ensemble config saved to {config_path}")
        logger.info(f"Weights: {config['weights']}")
        
        return config_path


def main():
    parser = argparse.ArgumentParser(description="Train ensemble phishing detection models")
    parser.add_argument(
        "--data",
        type=Path,
        default=Path("data/collected/phishing_dataset.csv"),
        help="Path to training dataset CSV"
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("ml/model/ensemble"),
        help="Output directory for trained models"
    )
    parser.add_argument(
        "--use-bert",
        action="store_true",
        help="Use BERT for text classification (slower but better)"
    )
    parser.add_argument(
        "--epochs",
        type=int,
        default=3,
        help="Number of training epochs for text model"
    )
    parser.add_argument(
        "--skip-text",
        action="store_true",
        help="Skip text model training"
    )
    
    args = parser.parse_args()
    
    if not args.data.exists():
        logger.error(f"Dataset not found: {args.data}")
        logger.info("Run: python ml/data_collector.py first")
        return
    
    trainer = EnsembleTrainer(args.data, args.output)
    
    # Train URL model
    url_model_path = trainer.train_url_model()
    
    # Train text model
    if not args.skip_text:
        text_model_path = trainer.train_text_model(
            use_bert=args.use_bert,
            epochs=args.epochs
        )
    else:
        text_model_path = None
        logger.info("Skipping text model training")
    
    # Train visual model (if data available)
    visual_model_path = trainer.train_visual_model()
    
    # Create ensemble config
    trainer.create_ensemble_config(
        url_model_path=url_model_path,
        text_model_path=text_model_path,
        visual_model_path=visual_model_path
    )
    
    logger.info("\n" + "=" * 60)
    logger.info("✅ TRAINING COMPLETE!")
    logger.info("=" * 60)
    logger.info(f"Models saved to: {args.output}")
    logger.info("\nNext steps:")
    logger.info("1. Test the ensemble: python test_ensemble.py")
    logger.info("2. Update API to use new models")
    logger.info("3. Deploy and monitor performance")


if __name__ == "__main__":
    main()
