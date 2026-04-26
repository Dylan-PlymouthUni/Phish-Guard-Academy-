"""
Deep Learning Text Classifier for Phishing Detection
Uses BERT/DistilBERT for email and message analysis
This module defines the TextPhishingClassifier class, which implements a deep learning-based text classifier for detecting phishing content in emails and messages.
 The classifier can be trained using a BERT-based model or a simpler TF-IDF + Logistic Regression approach as a fallback.
"""
from __future__ import annotations

import re
import logging
from typing import Dict, List, Any, Optional, Tuple
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, roc_auc_score
import joblib

try:
    import torch
    from transformers import (
        AutoTokenizer, 
        AutoModelForSequenceClassification,
        Trainer,
        TrainingArguments,
        pipeline
    )
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False
    torch = None  # Optional dependency; fallback to CPU/TF-IDF
    logging.warning("Transformers not installed. Run: pip install -r requirements-ml.txt")

logger = logging.getLogger(__name__)


class TextPhishingClassifier:
    """Phishing detection for email/text content using deep learning"""
    
    def __init__(
        self, 
        model_name: str = "distilbert-base-uncased",
        use_gpu: bool = True
    ):
        """Configure model loading strategy and runtime device (GPU/CPU)."""
        self.model_name = model_name
        if use_gpu and TRANSFORMERS_AVAILABLE and torch and torch.cuda.is_available():
            self.device = "cuda"
        else:
            self.device = "cpu"
        
        self.tokenizer: Optional[AutoTokenizer] = None
        self.model: Optional[Any] = None
        self.classifier_pipeline: Optional[Any] = None
        
        # Fallback TF-IDF model
        self.tfidf_vectorizer: Optional[TfidfVectorizer] = None
        self.tfidf_model: Optional[LogisticRegression] = None
    
    def load_pretrained(self, model_path: Path):
        """Load fine-tuned model"""
        if not TRANSFORMERS_AVAILABLE:
            logger.warning("Transformers not available, loading TF-IDF fallback")
            self._load_tfidf_fallback(model_path)
            return
        
        try:
            self.tokenizer = AutoTokenizer.from_pretrained(model_path)
            self.model = AutoModelForSequenceClassification.from_pretrained(model_path)
            self.model.to(self.device)
            self.model.eval()
            
            self.classifier_pipeline = pipeline(
                "text-classification",
                model=self.model,
                tokenizer=self.tokenizer,
                device=0 if self.device == "cuda" else -1,
                return_all_scores=True
            )
            
            logger.info(f"Loaded BERT model from {model_path}")
        except Exception as e:
            logger.warning(f"Failed to load BERT model: {e}, using TF-IDF fallback")
            self._load_tfidf_fallback(model_path)
    
    def _load_tfidf_fallback(self, model_path: Path):
        """Load simple TF-IDF + Logistic Regression model"""
        tfidf_path = model_path.parent / "text_tfidf_model.joblib"
        if tfidf_path.exists():
            bundle = joblib.load(tfidf_path)
            self.tfidf_vectorizer = bundle['vectorizer']
            self.tfidf_model = bundle['model']
            logger.info(f"Loaded TF-IDF fallback model from {tfidf_path}")
    
    def train(
        self,
        train_texts: List[str],
        train_labels: List[int],
        val_texts: Optional[List[str]] = None,
        val_labels: Optional[List[int]] = None,
        output_dir: Path = Path("ml/model/text_classifier"),
        epochs: int = 3,
        batch_size: int = 16,
        use_bert: bool = True
    ):
        """Train text classifier"""
        
        if use_bert and TRANSFORMERS_AVAILABLE:
            self._train_bert(
                train_texts, train_labels,
                val_texts, val_labels,
                output_dir, epochs, batch_size
            )
        else:
            self._train_tfidf(
                train_texts, train_labels,
                val_texts, val_labels,
                output_dir
            )
    
    def _train_bert(
        self,
        train_texts: List[str],
        train_labels: List[int],
        val_texts: Optional[List[str]],
        val_labels: Optional[List[int]],
        output_dir: Path,
        epochs: int,
        batch_size: int
    ):
        """Train BERT-based classifier"""
        logger.info("Training BERT classifier...")
        
        # Load pre-trained model
        self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
        self.model = AutoModelForSequenceClassification.from_pretrained(
            self.model_name,
            num_labels=2
        )
        self.model.to(self.device)
        
        # Tokenize
        train_encodings = self.tokenizer(
            train_texts,
            truncation=True,
            padding=True,
            max_length=512,
            return_tensors="pt"
        )
        
        # Create dataset
        class PhishingDataset(torch.utils.data.Dataset):
            """Tiny dataset wrapper used by HuggingFace Trainer."""
            def __init__(self, encodings, labels):
                """Store tokenized tensors and their matching labels."""
                self.encodings = encodings
                self.labels = labels
            
            def __getitem__(self, idx):
                """Return one encoded training sample by index."""
                item = {key: val[idx] for key, val in self.encodings.items()}
                item['labels'] = torch.tensor(self.labels[idx])
                return item
            
            def __len__(self):
                """Return the number of items managed by this object."""
                return len(self.labels)
        
        train_dataset = PhishingDataset(train_encodings, train_labels)
        
        val_dataset = None
        if val_texts and val_labels:
            val_encodings = self.tokenizer(
                val_texts,
                truncation=True,
                padding=True,
                max_length=512,
                return_tensors="pt"
            )
            val_dataset = PhishingDataset(val_encodings, val_labels)
        
        # Training arguments
        training_args = TrainingArguments(
            output_dir=str(output_dir),
            num_train_epochs=epochs,
            per_device_train_batch_size=batch_size,
            per_device_eval_batch_size=batch_size,
            warmup_steps=500,
            weight_decay=0.01,
            logging_dir=str(output_dir / "logs"),
            logging_steps=10,
            evaluation_strategy="epoch" if val_dataset else "no",
            save_strategy="epoch",
            load_best_model_at_end=True if val_dataset else False,
        )
        
        # Train
        trainer = Trainer(
            model=self.model,
            args=training_args,
            train_dataset=train_dataset,
            eval_dataset=val_dataset,
        )
        
        trainer.train()
        
        # Save
        output_dir.mkdir(parents=True, exist_ok=True)
        self.model.save_pretrained(output_dir)
        self.tokenizer.save_pretrained(output_dir)
        
        logger.info(f"BERT model saved to {output_dir}")
    
    def _train_tfidf(
        self,
        train_texts: List[str],
        train_labels: List[int],
        val_texts: Optional[List[str]],
        val_labels: Optional[List[int]],
        output_dir: Path
    ):
        """Train TF-IDF + Logistic Regression classifier"""
        logger.info("Training TF-IDF classifier...")
        
        # Vectorize
        self.tfidf_vectorizer = TfidfVectorizer(
            max_features=5000,
            ngram_range=(1, 3),
            min_df=2,
            max_df=0.95
        )
        
        X_train = self.tfidf_vectorizer.fit_transform(train_texts)
        
        # Train
        self.tfidf_model = LogisticRegression(
            max_iter=1000,
            class_weight='balanced',
            C=1.0
        )
        self.tfidf_model.fit(X_train, train_labels)
        
        # Evaluate
        if val_texts and val_labels:
            X_val = self.tfidf_vectorizer.transform(val_texts)
            y_pred = self.tfidf_model.predict(X_val)
            y_proba = self.tfidf_model.predict_proba(X_val)[:, 1]
            
            logger.info("\nTF-IDF Model Performance:")
            logger.info(classification_report(val_labels, y_pred))
            logger.info(f"ROC-AUC: {roc_auc_score(val_labels, y_proba):.4f}")
        
        # Save
        output_dir.mkdir(parents=True, exist_ok=True)
        tfidf_path = output_dir / "text_tfidf_model.joblib"
        joblib.dump({
            'vectorizer': self.tfidf_vectorizer,
            'model': self.tfidf_model
        }, tfidf_path)
        
        logger.info(f"TF-IDF model saved to {tfidf_path}")
    
    def extract_features(self, text: str) -> Dict[str, Any]:
        """Extract text features for analysis (works without trained model)"""
        text_lower = text.lower()
        
        # Suspicious keywords
        phishing_keywords = [
            'verify', 'confirm', 'urgent', 'suspended', 'locked',
            'unusual activity', 'click here', 'limited time', 
            'act now', 'update required', 'security alert', 'account',
            'password', 'reset', 'expire', 'validate', 'credential'
        ]
        suspicious_phrases = [kw for kw in phishing_keywords if kw in text_lower]
        
        # Threats and extortion
        threat_keywords = [
            'kill', 'murder', 'harm', 'hurt', 'die', 'death', 'attack',
            'ransom', 'pay me', 'give me money', 'send money', 'wire transfer',
            'family safe', 'or else', 'consequences', 'regret', 'blackmail'
        ]
        threat_count = sum(1 for tk in threat_keywords if tk in text_lower)
        has_threats = threat_count > 0
        
        # Urgency indicators
        urgency_words = ['urgent', 'immediately', 'asap', 'now', 'expire', 'today', 'within 24']
        urgency_count = sum(1 for uw in urgency_words if uw in text_lower)
        urgency_score = min(urgency_count / 3.0, 1.0)  # Normalize to 0-1
        
        # Credential requests
        cred_words = ['password', 'username', 'login', 'account', 'pin', 'ssn', 'credit card']
        cred_count = sum(1 for cw in cred_words if cw in text_lower)
        
        # Monetary references
        monetary_pattern = r'[\$€£]\s*\d+|\d+\s*(usd|eur|gbp|dollar)'
        has_money = bool(re.search(monetary_pattern, text_lower))
        
        # URLs and links
        url_count = len(re.findall(r'http[s]?://', text))
        
        # Linguistic patterns
        exclamation_count = text.count('!')
        question_count = text.count('?')
        caps_words = len(re.findall(r'\b[A-Z]{3,}\b', text))
        
        # Length features
        word_count = len(text.split())
        char_count = len(text)
        
        return {
            'suspicious_phrases': suspicious_phrases,
            'suspicious_phrase_count': len(suspicious_phrases),
            'threat_keywords': [tk for tk in threat_keywords if tk in text_lower],
            'threat_count': threat_count,
            'has_threats': has_threats,
            'urgency_score': urgency_score,
            'urgency_count': urgency_count,
            'credential_requests': cred_count,
            'has_monetary_reference': has_money,
            'url_count': url_count,
            'exclamation_count': exclamation_count,
            'question_count': question_count,
            'caps_word_count': caps_words,
            'word_count': word_count,
            'char_count': char_count,
            'avg_word_length': char_count / max(word_count, 1)
        }
    
    def predict(
        self, 
        text: str, 
        return_explanation: bool = False
    ) -> Dict[str, Any]:
        """Predict if text is phishing"""
        
        # Preprocess
        text = self._preprocess_text(text)
        
        # Use BERT if available
        if self.classifier_pipeline is not None:
            result = self._predict_bert(text)
        elif self.tfidf_model is not None:
            result = self._predict_tfidf(text)
        else:
            # Fallback to heuristic analysis when no trained model
            result = self._predict_heuristic(text)
        
        # Add explanation
        if return_explanation:
            result['explanation'] = self._explain_prediction(text, result)
        
        return result
    
    def _predict_bert(self, text: str) -> Dict[str, Any]:
        """Predict using BERT"""
        try:
            outputs = self.classifier_pipeline(text[:512])[0]  # Truncate to max length
            
            # Assume label 1 is phishing
            phishing_score = next(
                (s['score'] for s in outputs if s['label'] == 'LABEL_1'),
                0.5
            )
            
            return {
                'risk': int(phishing_score * 100),
                'confidence': max(s['score'] for s in outputs),
                'phishing_probability': phishing_score,
                'findings': [f'BERT model confidence: {phishing_score:.2%}'],
                'model_type': 'BERT'
            }
        except Exception as e:
            logger.error(f"BERT prediction failed: {e}")
            return {
                'risk': 0,
                'confidence': 0.0,
                'phishing_probability': 0.0,
                'findings': [f'Prediction error: {str(e)}']
            }
    
    def _predict_tfidf(self, text: str) -> Dict[str, Any]:
        """Predict using TF-IDF"""
        try:
            X = self.tfidf_vectorizer.transform([text])
            phishing_prob = self.tfidf_model.predict_proba(X)[0][1]
            
            return {
                'risk': int(phishing_prob * 100),
                'confidence': max(self.tfidf_model.predict_proba(X)[0]),
                'phishing_probability': phishing_prob,
                'findings': [f'TF-IDF model confidence: {phishing_prob:.2%}'],
                'model_type': 'TF-IDF'
            }
        except Exception as e:
            logger.error(f"TF-IDF prediction failed: {e}")
            return {
                'risk': 0,
                'confidence': 0.0,
                'phishing_probability': 0.0,
                'findings': [f'Prediction error: {str(e)}']
            }
    
    def _predict_heuristic(self, text: str) -> Dict[str, Any]:
        """Fallback heuristic analysis when no trained model available"""
        features = self.extract_features(text)
        
        risk_score = 0.0
        findings = []
        
        # Threats are EXTREMELY suspicious
        if features['has_threats']:
            risk_score += 0.60  # 60% just for threats
            findings.append(f"🚨 Contains threat language ({features['threat_count']} threats)")
        
        # Money + threats = extortion
        if features['has_monetary_reference'] and features['has_threats']:
            risk_score += 0.30  # Additional 30% for extortion pattern
            findings.append("💰 Extortion pattern: money demand + threats")
        
        # Suspicious phrases
        if features['suspicious_phrase_count'] > 0:
            phrase_score = min(features['suspicious_phrase_count'] * 0.10, 0.40)
            risk_score += phrase_score
            findings.append(f"⚠️ {features['suspicious_phrase_count']} suspicious phrases")
        
        # Urgency
        if features['urgency_score'] > 0.5:
            urgency_boost = features['urgency_score'] * 0.20
            risk_score += urgency_boost
            findings.append(f"⏰ High urgency language")
        
        # Credential requests
        if features['credential_requests'] > 0:
            risk_score += min(features['credential_requests'] * 0.10, 0.25)
            findings.append(f"🔐 Requests credentials")
        
        # URLs in text
        if features['url_count'] > 0:
            risk_score += min(features['url_count'] * 0.08, 0.20)
            findings.append(f"🔗 Contains {features['url_count']} URLs")
        
        # Linguistic red flags
        if features['exclamation_count'] > 3:
            risk_score += 0.05
            findings.append("❗ Excessive punctuation")
        
        if features['caps_word_count'] > 3:
            risk_score += 0.05
            findings.append("🔠 ALL CAPS WORDS")
        
        # Cap at 100%
        risk_score = min(risk_score, 1.0)
        
        if not findings:
            findings.append("✅ No obvious threats detected")
        
        return {
            'risk': int(risk_score * 100),
            'confidence': 0.7 if risk_score > 0.5 else 0.5,  # Medium confidence for heuristics
            'phishing_probability': risk_score,
            'findings': findings,
            'model_type': 'Heuristic (no trained model)',
            'features': features
        }
    
    def _explain_prediction(self, text: str, result: Dict) -> Dict[str, Any]:
        """Generate explanation for prediction"""
        explanation = {
            'suspicious_keywords': [],
            'urgency_indicators': [],
            'credential_requests': [],
            'linguistic_patterns': []
        }
        
        text_lower = text.lower()
        
        # Suspicious keywords
        phishing_keywords = [
            'verify', 'confirm', 'urgent', 'suspended', 'locked',
            'unusual activity', 'click here', 'limited time', 
            'act now', 'update required', 'security alert'
        ]
        explanation['suspicious_keywords'] = [
            kw for kw in phishing_keywords if kw in text_lower
        ]
        
        # Urgency
        urgency_words = ['urgent', 'immediately', 'asap', 'now', 'expire']
        explanation['urgency_indicators'] = [
            uw for uw in urgency_words if uw in text_lower
        ]
        
        # Credential requests
        cred_words = ['password', 'username', 'login', 'account', 'pin', 'ssn']
        explanation['credential_requests'] = [
            cw for cw in cred_words if cw in text_lower
        ]
        
        # Linguistic patterns
        if text.count('!') > 2:
            explanation['linguistic_patterns'].append('Excessive exclamation marks')
        if len(re.findall(r'[A-Z]{3,}', text)) > 3:
            explanation['linguistic_patterns'].append('Excessive capitalization')
        if any(x in text_lower for x in ['$', '€', '£', 'usd', 'eur']):
            explanation['linguistic_patterns'].append('Contains monetary references')
        
        return explanation
    
    @staticmethod
    def _preprocess_text(text: str) -> str:
        """Clean and normalize text"""
        # Remove extra whitespace
        text = ' '.join(text.split())
        
        # Remove HTML tags
        text = re.sub(r'<[^>]+>', '', text)
        
        # Normalize URLs
        text = re.sub(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', 
                     '[URL]', text)
        
        # Normalize emails
        text = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
                     '[EMAIL]', text)
        
        return text


def create_training_dataset(
    legitimate_texts: List[str],
    phishing_texts: List[str]
) -> Tuple[List[str], List[int]]:
    """Create balanced training dataset"""
    texts = legitimate_texts + phishing_texts
    labels = [0] * len(legitimate_texts) + [1] * len(phishing_texts)
    
    # Shuffle
    indices = np.random.permutation(len(texts))
    texts = [texts[i] for i in indices]
    labels = [labels[i] for i in indices]
    
    return texts, labels
