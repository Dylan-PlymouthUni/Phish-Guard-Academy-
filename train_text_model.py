#!/usr/bin/env python3
"""
⚠️  LEGACY/EXPERIMENTAL — not used for dissertation results.
Use scripts/run_experiment.py for reproducible dissertation results.

Train Text/Email Phishing Detection Model
Fine-tunes BERT on phishing email dataset
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, roc_auc_score, confusion_matrix
import logging
from datetime import datetime

from ml.text_classifier import TextPhishingClassifier, create_training_dataset

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class TextModelTrainer:
    """Train BERT model on phishing emails"""
    
    def __init__(self, dataset_path: Path, use_bert: bool = True):
        self.dataset_path = dataset_path
        self.use_bert = use_bert
        self.classifier = TextPhishingClassifier(use_gpu=True)
        
    def load_data(self):
        """Load email dataset"""
        logger.info(f"Loading dataset from {self.dataset_path}")
        df = pd.read_csv(self.dataset_path)
        
        logger.info(f"Dataset shape: {df.shape}")
        logger.info(f"Phishing emails: {(df['label'] == 1).sum()}")
        logger.info(f"Legitimate emails: {(df['label'] == 0).sum()}")
        
        # Use combined text (subject + body)
        texts = df['text'].tolist()
        labels = df['label'].tolist()
        
        return texts, labels
    
    def augment_data(self, texts: list, labels: list, multiplier: int = 5):
        """
        Augment training data by creating variations
        This is crucial since we have limited email templates
        """
        logger.info("Augmenting training data...")
        
        augmented_texts = []
        augmented_labels = []
        
        # Common variations for phishing emails
        phishing_variations = [
            ("immediately", "right away"),
            ("click here", "click the link"),
            ("verify", "confirm"),
            ("account", "profile"),
            ("suspended", "locked"),
            ("urgent", "immediate"),
            ("within 24 hours", "within 48 hours"),
            ("unusual activity", "suspicious activity"),
            (".tk", ".ml"),
            (".ml", ".ga"),
            ("http://", "https://"),
        ]
        
        for text, label in zip(texts, labels):
            # Add original
            augmented_texts.append(text)
            augmented_labels.append(label)
            
            # Create variations
            if label == 1:  # Phishing - create more variations
                for _ in range(multiplier):
                    varied_text = text
                    # Apply random substitutions
                    for old, new in np.random.choice(len(phishing_variations), 
                                                     size=min(3, len(phishing_variations)), 
                                                     replace=False):
                        if phishing_variations[old][0] in varied_text:
                            varied_text = varied_text.replace(
                                phishing_variations[old][0],
                                phishing_variations[old][1]
                            )
                    
                    if varied_text != text:  # Only add if actually changed
                        augmented_texts.append(varied_text)
                        augmented_labels.append(label)
            else:  # Legitimate - create fewer variations
                for _ in range(multiplier // 2):
                    augmented_texts.append(text)
                    augmented_labels.append(label)
        
        logger.info(f"Augmented dataset: {len(texts)} → {len(augmented_texts)} samples")
        return augmented_texts, augmented_labels
    
    def train(self, train_texts, train_labels, val_texts, val_labels):
        """Train BERT or TF-IDF model"""
        logger.info(f"Training {'BERT' if self.use_bert else 'TF-IDF'} model...")
        
        output_dir = Path("ml/model/text_classifier_trained")
        
        self.classifier.train(
            train_texts=train_texts,
            train_labels=train_labels,
            val_texts=val_texts,
            val_labels=val_labels,
            output_dir=output_dir,
            epochs=5,  # Increase for better results
            batch_size=8,  # Smaller batch for memory
            use_bert=self.use_bert
        )
        
        logger.info(f"Model saved to {output_dir}")
        return output_dir
    
    def evaluate(self, test_texts, test_labels):
        """Evaluate trained model"""
        logger.info("Evaluating model on test set...")
        
        predictions = []
        probabilities = []
        
        for text in test_texts:
            result = self.classifier.predict(text)
            predictions.append(1 if result['risk'] > 50 else 0)
            probabilities.append(result['phishing_probability'])
        
        # Metrics
        logger.info("\n" + "="*60)
        logger.info("Classification Report:")
        logger.info("\n" + classification_report(
            test_labels, predictions,
            target_names=['Legitimate', 'Phishing']
        ))
        
        # Confusion Matrix
        cm = confusion_matrix(test_labels, predictions)
        logger.info("\nConfusion Matrix:")
        logger.info(f"TN: {cm[0,0]}, FP: {cm[0,1]}")
        logger.info(f"FN: {cm[1,0]}, TP: {cm[1,1]}")
        
        # ROC-AUC
        roc_auc = roc_auc_score(test_labels, probabilities)
        logger.info(f"\nROC-AUC Score: {roc_auc:.4f}")
        logger.info("="*60)
        
        return {
            'roc_auc': roc_auc,
            'confusion_matrix': cm
        }


def main():
    """Main training pipeline"""
    print("📧 Email/Text Phishing Detection Model Training")
    print("=" * 60)
    
    # Find latest dataset
    data_dir = Path("data/training")
    dataset_files = list(data_dir.glob("email_training_data_*.csv"))
    
    if not dataset_files:
        print("❌ No training data found!")
        print("Run: python collect_training_data.py")
        return
    
    latest_dataset = max(dataset_files, key=lambda p: p.stat().st_mtime)
    print(f"📁 Using dataset: {latest_dataset}")
    
    # Choose model type (BERT requires GPU and time, TF-IDF is faster)
    import torch
    use_bert = torch.cuda.is_available()
    
    if use_bert:
        print("🚀 GPU detected - Training BERT model (better accuracy)")
    else:
        print("⚡ No GPU - Training TF-IDF model (faster, good baseline)")
    
    # Initialize trainer
    trainer = TextModelTrainer(latest_dataset, use_bert=use_bert)
    
    # Load data
    texts, labels = trainer.load_data()
    
    # Augment data (critical for small dataset)
    texts, labels = trainer.augment_data(texts, labels, multiplier=10)
    
    # Split data
    train_texts, test_texts, train_labels, test_labels = train_test_split(
        texts, labels, test_size=0.2, random_state=42, stratify=labels
    )
    
    train_texts, val_texts, train_labels, val_labels = train_test_split(
        train_texts, train_labels, test_size=0.2, random_state=42, stratify=train_labels
    )
    
    print(f"\nTraining set: {len(train_texts)} samples")
    print(f"Validation set: {len(val_texts)} samples")
    print(f"Test set: {len(test_texts)} samples")
    
    # Train model
    model_dir = trainer.train(train_texts, train_labels, val_texts, val_labels)
    
    # Load trained model
    trainer.classifier.load_pretrained(model_dir)
    
    # Evaluate
    print("\n" + "=" * 60)
    print("FINAL TEST SET EVALUATION:")
    print("=" * 60)
    results = trainer.evaluate(test_texts, test_labels)
    
    print("\n" + "=" * 60)
    print("✅ Text Model Training Complete!")
    print("=" * 60)
    print(f"📊 Test ROC-AUC: {results['roc_auc']:.4f}")
    print(f"💾 Model saved to: {model_dir}")
    print("\nNext: Integrate trained models into ensemble!")


if __name__ == "__main__":
    main()
