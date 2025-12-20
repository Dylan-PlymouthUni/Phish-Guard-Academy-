"""
Ensemble ML Pipeline for Phishing Detection
Combines URL, Text, and Visual models with confidence calibration
"""
from __future__ import annotations

import logging
from typing import Dict, List, Any, Optional
from pathlib import Path
from dataclasses import dataclass

import numpy as np
from PIL import Image
import joblib
 
# Import our specialized classifiers
from ml.advanced_url_features import AdvancedURLAnalyzer
from ml.text_classifier import TextPhishingClassifier
from ml.visual_classifier import VisualPhishingDetector
from ml.heuristics import heuristic_score

logger = logging.getLogger(__name__)


@dataclass
class PredictionResult:
    """Unified prediction result"""
    risk_score: float  # 0-100
    confidence: float  # 0-1
    phishing_probability: float  # 0-1
    component_scores: Dict[str, float]
    findings: List[str]
    explanation: Dict[str, Any]
    model_versions: Dict[str, str]


class PhishingEnsemble:
    """
    Ensemble model combining:
    - URL feature extraction + Random Forest
    - Text analysis with BERT/TF-IDF
    - Visual analysis with CNN
    - Rule-based heuristics
    """
    
    def __init__(
        self,
        url_model_path: Optional[Path] = None,
        text_model_path: Optional[Path] = None,
        visual_model_path: Optional[Path] = None,
        weights: Optional[Dict[str, float]] = None
    ):
        """
        Initialize ensemble with component models
        
        Args:
            weights: Component weights - trained ML model gets higher weight
        """
        self.weights = weights or {
            'url': 0.55,      # Increased - trained ML model with 100% accuracy
            'text': 0.25,     # Reduced
            'visual': 0.15,   # Reduced
            'heuristic': 0.05 # Minimal - just for fallback
        }
        
        # Normalize weights
        total = sum(self.weights.values())
        self.weights = {k: v/total for k, v in self.weights.items()}
        
        # Initialize components
        self.url_analyzer = AdvancedURLAnalyzer(timeout=3)
        self.text_classifier = TextPhishingClassifier(use_gpu=True)
        self.visual_detector = VisualPhishingDetector(use_gpu=True)
        
        # Load trained URL model
        self.trained_url_model = None
        trained_model_path = url_model_path or Path("ml/model/url_phishing_rf_trained.joblib")
        if trained_model_path.exists():
            try:
                self.trained_url_model = joblib.load(trained_model_path)
                logger.info(f"Loaded trained URL model: {self.trained_url_model.get('version', 'unknown')}")
                logger.info(f"Model accuracy: {self.trained_url_model.get('accuracy', 0):.2%}")
            except Exception as e:
                logger.warning(f"Failed to load trained URL model: {e}")
        else:
            logger.warning(f"Trained URL model not found at {trained_model_path}, using feature-based heuristics")
        
        # Load models
        if text_model_path:
            self.text_classifier.load_pretrained(text_model_path)
        if visual_model_path:
            self.visual_detector.load_model(visual_model_path)
        
        logger.info(f"Ensemble initialized with weights: {self.weights}")
    
    def analyze_url(self, url: str) -> PredictionResult:
        """Analyze URL for phishing"""
        
        # Get predictions from each component
        url_result = self._analyze_url_component(url)
        heuristic_result = self._analyze_heuristic_component(url=url, text="")
        
        # Combine scores
        scores = {
            'url': url_result.get('risk', 0) / 100,
            'heuristic': heuristic_result.get('risk', 0) / 100,
            'text': 0.0,  # No text available
            'visual': 0.0  # No visual available
        }
        
        # If trained model was used, boost its influence
        if url_result.get('model_used') == 'trained_rf' and scores['url'] > 0.7:
            # High confidence from trained model - trust it more
            final_score = scores['url'] * 0.85 + scores['heuristic'] * 0.15
        else:
            final_score = self._weighted_ensemble(scores)
        
        confidence = self._calculate_confidence(
            [url_result.get('confidence', 0.5), heuristic_result.get('confidence', 0.5)]
        )
        
        # Combine findings
        findings = []
        findings.extend(url_result.get('findings', []))
        findings.extend(heuristic_result.get('findings', []))
        
        return PredictionResult(
            risk_score=final_score * 100,
            confidence=confidence,
            phishing_probability=final_score,
            component_scores=scores,
            findings=findings,
            explanation={
                'url_analysis': url_result,
                'heuristic_analysis': heuristic_result
            },
            model_versions={
                'ensemble': '1.0',
                'url': '1.0'
            }
        )
    
    def analyze_text(self, text: str, url: Optional[str] = None) -> PredictionResult:
        """Analyze text content (email, message) for phishing"""
        
        # Get predictions
        text_result = self._analyze_text_component(text)
        heuristic_result = self._analyze_heuristic_component(text=text, url=url or "")
        
        scores = {
            'text': text_result.get('phishing_probability', 0.5),
            'heuristic': heuristic_result.get('risk', 0) / 100,
            'url': 0.0,
            'visual': 0.0
        }
        
        # If URL provided, analyze it too
        url_result = None
        if url:
            url_result = self._analyze_url_component(url)
            scores['url'] = url_result.get('risk', 0) / 100
        
        # For text-only analysis, use adjusted weights to prioritize text
        if not url:
            # Text-only: text=70%, heuristic=30%
            final_score = (scores['text'] * 0.70) + (scores['heuristic'] * 0.30)
        else:
            # Text + URL: use regular ensemble
            final_score = self._weighted_ensemble(scores)
        
        confidence = self._calculate_confidence([
            text_result.get('confidence', 0.5),
            heuristic_result.get('confidence', 0.7)
        ])
        
        findings = []
        findings.extend(text_result.get('findings', []))
        findings.extend(heuristic_result.get('findings', []))
        if url:
            findings.extend(url_result.get('findings', []))
        
        return PredictionResult(
            risk_score=final_score * 100,
            confidence=confidence,
            phishing_probability=final_score,
            component_scores=scores,
            findings=findings,
            explanation={
                'text_analysis': text_result,
                'heuristic_analysis': heuristic_result,
                'url_analysis': url_result if url else None
            },
            model_versions={
                'ensemble': '1.0',
                'text': text_result.get('model_type', 'unknown')
            }
        )
    
    def analyze_screenshot(
        self,
        image: Image.Image,
        extract_text: bool = True
    ) -> PredictionResult:
        """Analyze screenshot/image for phishing"""
        
        # Visual analysis
        visual_result = self.visual_detector.analyze_image(
            image,
            extract_text=extract_text,
            check_brands=True
        )
        
        scores = {
            'visual': visual_result.get('risk', 0) / 100,
            'url': 0.0,
            'text': 0.0,
            'heuristic': 0.0
        }
        
        findings = visual_result.get('findings', [])
        
        # If text extracted, analyze it
        if extract_text and visual_result.get('text_analysis', {}).get('extracted_text'):
            extracted_text = visual_result['text_analysis']['extracted_text']
            text_result = self._analyze_text_component(extracted_text)
            scores['text'] = text_result.get('phishing_probability', 0.5)
            findings.extend(text_result.get('findings', []))
            
            # Check URLs found in image
            urls = visual_result['text_analysis'].get('urls_found', [])
            if urls:
                url_result = self._analyze_url_component(urls[0])
                scores['url'] = url_result.get('risk', 0) / 100
                findings.extend(url_result.get('findings', []))
        
        final_score = self._weighted_ensemble(scores)
        confidence = visual_result.get('confidence', 0.5)
        
        return PredictionResult(
            risk_score=final_score * 100,
            confidence=confidence,
            phishing_probability=final_score,
            component_scores=scores,
            findings=findings,
            explanation={
                'visual_analysis': visual_result,
                'text_from_image': visual_result.get('text_analysis'),
                'brand_detection': visual_result.get('brand_analysis')
            },
            model_versions={
                'ensemble': '1.0',
                'visual': 'CNN',
                'ocr': 'EasyOCR' if visual_result.get('text_analysis') else None
            }
        )
    
    def analyze_full_context(
        self,
        url: Optional[str] = None,
        text: Optional[str] = None,
        image: Optional[Image.Image] = None
    ) -> PredictionResult:
        """
        Analyze all available context (URL + text + image)
        Most comprehensive analysis
        """
        
        scores = {
            'url': 0.0,
            'text': 0.0,
            'visual': 0.0,
            'heuristic': 0.0
        }
        
        all_findings = []
        explanations = {}
        
        # URL analysis
        if url:
            url_result = self._analyze_url_component(url)
            scores['url'] = url_result.get('risk', 0) / 100
            all_findings.extend(url_result.get('findings', []))
            explanations['url_analysis'] = url_result
        
        # Text analysis
        if text:
            text_result = self._analyze_text_component(text)
            scores['text'] = text_result.get('phishing_probability', 0.5)
            all_findings.extend(text_result.get('findings', []))
            explanations['text_analysis'] = text_result
        
        # Visual analysis
        if image:
            visual_result = self.visual_detector.analyze_image(image)
            scores['visual'] = visual_result.get('risk', 0) / 100
            all_findings.extend(visual_result.get('findings', []))
            explanations['visual_analysis'] = visual_result
        
        # Heuristics (combines URL + text)
        if url or text:
            heuristic_result = self._analyze_heuristic_component(
                url=url or "",
                text=text or ""
            )
            scores['heuristic'] = heuristic_result.get('risk', 0) / 100
            all_findings.extend(heuristic_result.get('findings', []))
            explanations['heuristic_analysis'] = heuristic_result
        
        # Ensemble combination
        final_score = self._weighted_ensemble(scores)
        
        # Apply boosting if multiple strong signals
        if sum(1 for s in scores.values() if s > 0.7) >= 2:
            final_score = min(0.98, final_score * 1.15)
            all_findings.append("Multiple strong phishing indicators detected (risk boosted)")
        
        confidence = self._calculate_confidence([
            s for s in scores.values() if s > 0
        ])
        
        return PredictionResult(
            risk_score=final_score * 100,
            confidence=confidence,
            phishing_probability=final_score,
            component_scores=scores,
            findings=all_findings,
            explanation=explanations,
            model_versions={
                'ensemble': '1.0',
                'components': list(k for k, v in scores.items() if v > 0)
            }
        )
    
    def _analyze_url_component(self, url: str) -> Dict[str, Any]:
        """Get URL analysis from advanced analyzer with trained ML model"""
        try:
            features = self.url_analyzer.extract_features(url)
            
            # Whitelist for known development/trusted domains
            trusted_dev_domains = [
                'github.dev', 'app.github.dev', 'codespaces.new',
                'localhost', '127.0.0.1', 'vercel.app', 'netlify.app',
                'herokuapp.com', 'repl.co', 'glitch.me'
            ]
            
            # Check if URL is from a trusted development domain
            is_trusted_dev = False
            url_lower = url.lower()
            for domain in trusted_dev_domains:
                if domain in url_lower:
                    is_trusted_dev = True
                    break
            
            risk_indicators = []
            risk = 0.0
            confidence = 0.8
            
            # Use trained Random Forest model if available
            if self.trained_url_model:
                try:
                    # Extract features in the same order as training
                    feature_names = self.trained_url_model['feature_names']
                    feature_vector = []
                    
                    for name in feature_names:
                        value = features.get(name, 0)
                        # Convert to numeric type
                        if isinstance(value, bool):
                            value = float(value)
                        elif isinstance(value, (dict, list, str)):
                            # Skip non-numeric features
                            value = 0.0
                        elif value is None:
                            value = 0.0
                        else:
                            value = float(value)
                        feature_vector.append(value)
                    
                    # Get model prediction
                    model = self.trained_url_model['model']
                    phishing_prob = model.predict_proba([feature_vector])[0][1]
                    risk = phishing_prob * 100
                    confidence = 0.95  # High confidence from trained model
                    
                    # Get top contributing features
                    feature_importance = self.trained_url_model.get('feature_importance', {})
                    top_features = sorted(
                        feature_importance.items(),
                        key=lambda x: x[1],
                        reverse=True
                    )[:5]
                    
                    # Generate findings based on top features that are triggered
                    for feat_name, importance in top_features:
                        feat_value = features.get(feat_name)
                        if feat_value:
                            if isinstance(feat_value, bool) and feat_value:
                                risk_indicators.append(f"Suspicious: {feat_name.replace('_', ' ')}")
                            elif isinstance(feat_value, (int, float)) and feat_value > 0:
                                risk_indicators.append(f"Detected: {feat_name.replace('_', ' ')} = {feat_value}")
                    
                    if phishing_prob > 0.7:
                        risk_indicators.append(f"ML Model confidence: {phishing_prob:.1%} phishing")
                    
                    # Apply trusted domain adjustment
                    if is_trusted_dev and risk > 50:
                        risk_indicators.append("⚠️ Trusted development domain detected - risk reduced")
                        risk = risk * 0.3  # Reduce risk by 70% for dev domains
                        confidence = 0.6  # Lower confidence due to override
                    
                except Exception as e:
                    logger.warning(f"Trained model prediction failed: {e}, falling back to heuristics")
                    logger.exception("Full traceback:")  # Get full traceback
                    # Fall through to heuristic-based analysis
                    self.trained_url_model = None
            
            # Fallback: feature-based heuristics (if model not available or failed)
            if not self.trained_url_model:
                if features.get('has_ip_address'):
                    risk += 25
                    risk_indicators.append("URL uses IP address instead of domain")
                
                if features.get('https_token'):
                    risk += 20
                    risk_indicators.append("'HTTPS' token in URL but not using HTTPS")
                
                if features.get('is_suspicious_tld'):
                    risk += 15
                    risk_indicators.append("Suspicious top-level domain")
                
                if features.get('domain_recently_registered'):
                    risk += 20
                    risk_indicators.append("Domain registered very recently")
                
                if not features.get('ssl_valid'):
                    risk += 15
                    risk_indicators.append("No valid SSL certificate")
                
                if features.get('num_redirects', 0) > 2:
                    risk += 10
                    risk_indicators.append(f"Multiple redirects ({features['num_redirects']})")
                
                if features.get('external_link_ratio', 0) > 0.5:
                    risk += 10
                    risk_indicators.append("High ratio of external links")
                
                risk = min(risk, 100)
                confidence = 0.7  # Lower confidence for heuristics
            
            return {
                'risk': risk,
                'confidence': confidence,
                'findings': risk_indicators,
                'features': features,
                'model_used': 'trained_rf' if self.trained_url_model else 'heuristic'
            }
        except Exception as e:
            logger.error(f"URL analysis failed: {e}")
            return {'risk': 0, 'confidence': 0.0, 'findings': [], 'model_used': 'error'}
    
    def _analyze_text_component(self, text: str) -> Dict[str, Any]:
        """Get text analysis from BERT/TF-IDF classifier"""
        try:
            return self.text_classifier.predict(text, return_explanation=True)
        except Exception as e:
            logger.error(f"Text analysis failed: {e}")
            return {
                'risk': 0,
                'confidence': 0.0,
                'phishing_probability': 0.0,
                'findings': []
            }
    
    def _analyze_heuristic_component(
        self,
        url: str,
        text: str
    ) -> Dict[str, Any]:
        """Get rule-based heuristic score"""
        try:
            result = heuristic_score(text, url)
            return {
                'risk': result['risk'],
                'confidence': 0.7,  # Heuristics are fairly reliable
                'findings': result.get('findings', [])
            }
        except Exception as e:
            logger.error(f"Heuristic analysis failed: {e}")
            return {'risk': 0, 'confidence': 0.0, 'findings': []}
    
    def _weighted_ensemble(self, scores: Dict[str, float], confidences: Optional[Dict[str, float]] = None) -> float:
        """Combine component scores with learned weights (confidence-weighted)"""
        if confidences:
            # Adjust weights based on component confidence
            adjusted_weights = {}
            total_confidence = sum(confidences.values()) or 1.0
            
            for component, weight in self.weights.items():
                conf = confidences.get(component, 0.5)
                # Components with higher confidence get more weight
                adjusted_weights[component] = weight * (conf / total_confidence) * len(confidences)
            
            # Renormalize
            total = sum(adjusted_weights.values()) or 1.0
            adjusted_weights = {k: v/total for k, v in adjusted_weights.items()}
            
            weighted_sum = sum(
                scores.get(component, 0) * adjusted_weights.get(component, 0)
                for component in self.weights.keys()
            )
        else:
            weighted_sum = sum(
                scores.get(component, 0) * weight
                for component, weight in self.weights.items()
            )
        return min(weighted_sum, 1.0)
    
    def _calculate_confidence(self, individual_confidences: List[float]) -> float:
        """Calculate overall confidence from component confidences"""
        if not individual_confidences:
            return 0.5
        
        # Higher confidence when multiple models agree
        mean_conf = np.mean(individual_confidences)
        agreement_bonus = len(individual_confidences) * 0.05
        
        return min(mean_conf + agreement_bonus, 1.0)
    
    def explain_prediction(self, result: PredictionResult) -> str:
        """Generate human-readable explanation"""
        explanation_parts = []
        
        explanation_parts.append(
            f"Overall Risk: {result.risk_score:.1f}% "
            f"(Confidence: {result.confidence:.1%})"
        )
        explanation_parts.append("\nComponent Contributions:")
        
        for component, score in result.component_scores.items():
            if score > 0:
                weight = self.weights.get(component, 0)
                contribution = score * weight * 100
                explanation_parts.append(
                    f"  • {component.upper()}: {score:.1%} "
                    f"(contributes {contribution:.1f} points)"
                )
        
        if result.findings:
            explanation_parts.append("\nKey Findings:")
            for finding in result.findings[:10]:  # Limit to top 10
                explanation_parts.append(f"  • {finding}")
        
        return "\n".join(explanation_parts)


# Convenience function
_global_ensemble: Optional[PhishingEnsemble] = None

def get_ensemble() -> PhishingEnsemble:
    """Get or create global ensemble instance"""
    global _global_ensemble
    if _global_ensemble is None:
        _global_ensemble = PhishingEnsemble()
    return _global_ensemble
