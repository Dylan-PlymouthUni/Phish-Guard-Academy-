"""
Advanced Visual Phishing Detection using CNNs
Detects phishing through logo recognition, layout analysis, and brand impersonation
"""
from __future__ import annotations

import logging
from typing import Dict, List, Any, Optional, Tuple
from pathlib import Path
from io import BytesIO

import numpy as np
from PIL import Image
import cv2

try:
    import torch
    import torch.nn as nn
    import torchvision.models as models
    import torchvision.transforms as transforms
    from torchvision.models import ResNet50_Weights, EfficientNet_B0_Weights
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    torch = None  # Optional dependency
    logging.warning("PyTorch not installed. Run: pip install -r requirements-ml.txt")

try:
    import easyocr
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False
    logging.warning("EasyOCR not installed. Using pytesseract fallback")

logger = logging.getLogger(__name__)


class VisualPhishingDetector:
    """CNN-based visual phishing detection"""
    
    def __init__(
        self,
        model_name: str = "resnet50",
        use_gpu: bool = True
    ):
        self.model_name = model_name
        if use_gpu and TORCH_AVAILABLE and torch and torch.cuda.is_available():
            self.device = "cuda"
        else:
            self.device = "cpu"
        
        self.model: Optional[nn.Module] = None
        self.transform: Optional[transforms.Compose] = None
        self.ocr_reader: Optional[Any] = None
        
        # Known brand logos for comparison
        self.brand_templates: Dict[str, np.ndarray] = {}
        
        # Initialize OCR
        if OCR_AVAILABLE:
            self.ocr_reader = easyocr.Reader(['en'], gpu=use_gpu)
    
    def load_model(self, model_path: Optional[Path] = None):
        """Load pre-trained or fine-tuned model"""
        if not TORCH_AVAILABLE:
            logger.warning("PyTorch not available, visual detection limited")
            return
        
        if model_path and model_path.exists():
            # Load fine-tuned model
            self._load_custom_model(model_path)
        else:
            # Load pre-trained ImageNet model for feature extraction
            self._load_pretrained_model()
    
    def _load_pretrained_model(self):
        """Load pre-trained model"""
        logger.info(f"Loading pre-trained {self.model_name} model")
        
        if self.model_name == "resnet50":
            self.model = models.resnet50(weights=ResNet50_Weights.IMAGENET1K_V2)
            # Remove final FC layer for feature extraction
            self.model = nn.Sequential(*list(self.model.children())[:-1])
        elif self.model_name == "efficientnet":
            self.model = models.efficientnet_b0(weights=EfficientNet_B0_Weights.IMAGENET1K_V1)
            self.model = nn.Sequential(*list(self.model.children())[:-1])
        else:
            raise ValueError(f"Unknown model: {self.model_name}")
        
        self.model.to(self.device)
        self.model.eval()
        
        # Standard ImageNet transforms
        self.transform = transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225]
            )
        ])
    
    def _load_custom_model(self, model_path: Path):
        """Load fine-tuned model"""
        logger.info(f"Loading custom model from {model_path}")
        
        checkpoint = torch.load(model_path, map_location=self.device)
        self.model = checkpoint['model']
        self.model.to(self.device)
        self.model.eval()
        
        self.transform = checkpoint.get('transform', self._get_default_transform())
    
    def analyze_image(
        self, 
        image: Image.Image,
        extract_text: bool = True,
        check_brands: bool = True
    ) -> Dict[str, Any]:
        """Comprehensive image analysis"""
        
        result = {
            'visual_features': {},
            'text_analysis': {},
            'brand_analysis': {},
            'risk': 0,
            'confidence': 0.0,
            'findings': []
        }
        
        # Convert to numpy for OpenCV operations
        img_array = np.array(image)
        if len(img_array.shape) == 2:  # Grayscale
            img_array = cv2.cvtColor(img_array, cv2.COLOR_GRAY2RGB)
        elif img_array.shape[2] == 4:  # RGBA
            img_array = cv2.cvtColor(img_array, cv2.COLOR_RGBA2RGB)
        
        # Extract visual features
        result['visual_features'] = self._extract_visual_features(img_array, image)
        
        # OCR and text analysis
        if extract_text:
            result['text_analysis'] = self._analyze_text_content(img_array)
        
        # Brand detection
        if check_brands:
            result['brand_analysis'] = self._detect_brand_impersonation(img_array)
        
        # Deep learning features
        if self.model is not None and TORCH_AVAILABLE:
            dl_features = self._extract_deep_features(image)
            result['deep_learning_features'] = dl_features
        
        # Calculate risk score
        risk_score = self._calculate_risk_score(result)
        result['risk'] = int(risk_score * 100)
        result['confidence'] = self._calculate_confidence(result)
        
        # Generate findings
        result['findings'] = self._generate_findings(result)
        
        return result
    
    def _extract_visual_features(
        self, 
        img_array: np.ndarray,
        pil_image: Image.Image
    ) -> Dict[str, Any]:
        """Extract handcrafted visual features"""
        features = {}
        
        # Color analysis
        hsv = cv2.cvtColor(img_array, cv2.COLOR_RGB2HSV)
        features['mean_hue'] = float(np.mean(hsv[:, :, 0]))
        features['mean_saturation'] = float(np.mean(hsv[:, :, 1]))
        features['mean_value'] = float(np.mean(hsv[:, :, 2]))
        features['color_variance'] = float(np.var(hsv))
        
        # Detect dominant colors
        pixels = img_array.reshape(-1, 3)
        unique_colors = len(np.unique(pixels, axis=0))
        features['unique_colors'] = min(unique_colors, 1000)  # Cap for efficiency
        features['color_diversity'] = unique_colors / pixels.shape[0]
        
        # Edge detection (complexity measure)
        gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        edges = cv2.Canny(gray, 50, 150)
        features['edge_density'] = float(np.sum(edges > 0) / edges.size)
        
        # Texture analysis
        features['texture_std'] = float(np.std(gray))
        features['texture_variance'] = float(np.var(gray))
        
        # Layout features
        height, width = img_array.shape[:2]
        features['aspect_ratio'] = width / height
        features['image_size_pixels'] = height * width
        
        # Detect text regions (approximate)
        _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        features['white_ratio'] = float(np.sum(binary == 255) / binary.size)
        features['black_ratio'] = float(np.sum(binary == 0) / binary.size)
        
        # Blur detection (phishing sites often have poor quality images)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        features['blur_score'] = float(laplacian_var)
        features['is_blurry'] = laplacian_var < 100
        
        # Form/button detection (via color clustering)
        # Common button colors: blue, green, red
        features['has_button_colors'] = self._detect_button_colors(hsv)
        
        return features
    
    def _detect_button_colors(self, hsv: np.ndarray) -> bool:
        """Detect presence of common button colors"""
        h = hsv[:, :, 0]
        s = hsv[:, :, 1]
        v = hsv[:, :, 2]
        
        # Blue buttons (hue 100-130)
        blue_mask = (h >= 100) & (h <= 130) & (s > 50) & (v > 50)
        
        # Green buttons (hue 40-80)
        green_mask = (h >= 40) & (h <= 80) & (s > 50) & (v > 50)
        
        # Red buttons (hue 0-10 or 170-180)
        red_mask = (((h >= 0) & (h <= 10)) | ((h >= 170) & (h <= 180))) & (s > 50) & (v > 50)
        
        button_pixels = np.sum(blue_mask | green_mask | red_mask)
        return button_pixels > (hsv.size / 100)  # At least 1% of image
    
    def _analyze_text_content(self, img_array: np.ndarray) -> Dict[str, Any]:
        """Extract and analyze text from image"""
        analysis = {
            'extracted_text': '',
            'urls_found': [],
            'suspicious_phrases': [],
            'brand_mentions': [],
            'text_confidence': 0.0
        }
        
        try:
            if self.ocr_reader and OCR_AVAILABLE:
                # Use EasyOCR
                results = self.ocr_reader.readtext(img_array)
                analysis['extracted_text'] = ' '.join([text for _, text, _ in results])
                analysis['text_confidence'] = np.mean([conf for _, _, conf in results]) if results else 0.0
            else:
                # Fallback to pytesseract
                import pytesseract
                analysis['extracted_text'] = pytesseract.image_to_string(img_array)
                analysis['text_confidence'] = 0.5  # No confidence from pytesseract
        except Exception as e:
            logger.warning(f"OCR failed: {e}")
            return analysis
        
        text_lower = analysis['extracted_text'].lower()
        
        # Find URLs
        import re
        url_pattern = r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+'
        analysis['urls_found'] = re.findall(url_pattern, analysis['extracted_text'])
        
        # Detect suspicious phrases
        suspicious = [
            'verify account', 'confirm identity', 'unusual activity',
            'suspended', 'locked', 'click here', 'update payment',
            'urgent', 'immediate action', 'expires', 'limited time'
        ]
        analysis['suspicious_phrases'] = [p for p in suspicious if p in text_lower]
        
        # Detect brand mentions
        brands = [
            'paypal', 'amazon', 'apple', 'microsoft', 'google',
            'facebook', 'netflix', 'bank', 'irs', 'fedex', 'dhl'
        ]
        analysis['brand_mentions'] = [b for b in brands if b in text_lower]
        
        return analysis
    
    def _detect_brand_impersonation(self, img_array: np.ndarray) -> Dict[str, Any]:
        """Detect brand logo impersonation"""
        analysis = {
            'detected_brands': [],
            'confidence_scores': {},
            'is_suspicious': False,
            'reason': ''
        }
        
        if not self.brand_templates:
            # No templates loaded
            return analysis
        
        # Convert to grayscale for template matching
        gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        
        for brand_name, template in self.brand_templates.items():
            # Template matching
            result = cv2.matchTemplate(gray, template, cv2.TM_CCOEFF_NORMED)
            _, max_val, _, max_loc = cv2.minMaxLoc(result)
            
            if max_val > 0.7:  # High confidence match
                analysis['detected_brands'].append(brand_name)
                analysis['confidence_scores'][brand_name] = float(max_val)
        
        return analysis
    
    def _extract_deep_features(self, image: Image.Image) -> Dict[str, Any]:
        """Extract deep learning features using CNN"""
        if not TORCH_AVAILABLE or self.model is None:
            return {}
        
        try:
            # Transform and run through model
            img_tensor = self.transform(image).unsqueeze(0).to(self.device)
            
            with torch.no_grad():
                features = self.model(img_tensor)
            
            # Flatten features
            features = features.squeeze().cpu().numpy()
            
            return {
                'feature_vector_size': len(features),
                'mean_activation': float(np.mean(features)),
                'max_activation': float(np.max(features)),
                'std_activation': float(np.std(features)),
                # Store top 10 features for analysis
                'top_activations': features.argsort()[-10:][::-1].tolist()
            }
        except Exception as e:
            logger.error(f"Deep feature extraction failed: {e}")
            return {}
    
    def _calculate_risk_score(self, analysis: Dict) -> float:
        """Calculate overall risk score from all analyses"""
        risk = 0.0
        
        visual = analysis['visual_features']
        text = analysis['text_analysis']
        brand = analysis['brand_analysis']
        
        # Visual indicators (30% weight) - More aggressive
        if visual.get('is_blurry', False):
            risk += 0.20  # Increased from 0.15
        if visual.get('color_variance', 0) > 5000:
            risk += 0.15  # Increased from 0.10
        if visual.get('edge_density', 0) > 0.05:
            risk += 0.10  # Increased from 0.05
        
        # Text indicators (50% weight) - Significantly increased
        if text.get('suspicious_phrases'):
            # More weight for suspicious phrases
            risk += 0.30 + (len(text['suspicious_phrases']) * 0.08)  # Increased from 0.20 and 0.05
        if text.get('urls_found'):
            risk += 0.25  # Increased from 0.15
        if text.get('brand_mentions') and not brand.get('detected_brands'):
            # Brand mentioned but no logo = likely impersonation
            risk += 0.35  # Increased from 0.25
        
        # Brand indicators (20% weight)
        if brand.get('detected_brands'):
            # If brand logo detected, check if context is suspicious
            if text.get('suspicious_phrases'):
                risk += 0.40  # Increased from 0.30
        
        return min(risk, 1.0)
    
    def _calculate_confidence(self, analysis: Dict) -> float:
        """Calculate confidence in the prediction"""
        confidence_factors = []
        
        # OCR confidence
        if analysis['text_analysis'].get('text_confidence'):
            confidence_factors.append(analysis['text_analysis']['text_confidence'])
        
        # Brand detection confidence
        if analysis['brand_analysis'].get('confidence_scores'):
            confidence_factors.append(
                max(analysis['brand_analysis']['confidence_scores'].values())
            )
        
        # Visual feature completeness
        if analysis['visual_features']:
            confidence_factors.append(0.8)
        
        return np.mean(confidence_factors) if confidence_factors else 0.5
    
    def _generate_findings(self, analysis: Dict) -> List[str]:
        """Generate human-readable findings"""
        findings = []
        
        visual = analysis['visual_features']
        text = analysis['text_analysis']
        brand = analysis['brand_analysis']
        
        # Visual findings
        if visual.get('is_blurry'):
            findings.append("Image quality is poor (possible screenshot of screenshot)")
        if visual.get('color_variance', 0) > 5000:
            findings.append("Inconsistent color scheme detected")
        
        # Text findings
        if text.get('suspicious_phrases'):
            findings.append(
                f"Found {len(text['suspicious_phrases'])} suspicious phrases: "
                f"{', '.join(text['suspicious_phrases'][:3])}"
            )
        if text.get('urls_found'):
            findings.append(f"Detected {len(text['urls_found'])} URLs in image")
        
        # Brand findings
        if brand.get('detected_brands'):
            findings.append(
                f"Brand logos detected: {', '.join(brand['detected_brands'])}"
            )
        if text.get('brand_mentions') and not brand.get('detected_brands'):
            findings.append(
                f"Brand mentioned ({text['brand_mentions'][0]}) but no official logo found"
            )
        
        return findings
    
    def load_brand_template(self, brand_name: str, template_path: Path):
        """Load a brand logo template for matching"""
        try:
            template = cv2.imread(str(template_path), cv2.IMREAD_GRAYSCALE)
            self.brand_templates[brand_name] = template
            logger.info(f"Loaded template for {brand_name}")
        except Exception as e:
            logger.error(f"Failed to load template {template_path}: {e}")


def extract_screenshot_features(image: Image.Image) -> Dict[str, float]:
    """
    Extract basic visual features from screenshot (compatibility function)
    This maintains backward compatibility with existing code
    """
    img_array = np.array(image)
    
    # Ensure RGB
    if len(img_array.shape) == 2:
        img_array = cv2.cvtColor(img_array, cv2.COLOR_GRAY2RGB)
    elif img_array.shape[2] == 4:
        img_array = cv2.cvtColor(img_array, cv2.COLOR_RGBA2RGB)
    
    # Color features
    hsv = cv2.cvtColor(img_array, cv2.COLOR_RGB2HSV)
    color_variance = float(np.var(hsv))
    
    # Edge detection
    gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
    edges = cv2.Canny(gray, 50, 150)
    edge_density = float(np.sum(edges > 0) / edges.size)
    
    # Text density (variance)
    text_density = float(np.var(gray))
    
    return {
        'color_variance': color_variance,
        'edge_density': edge_density,
        'text_density': text_density,
        'mean_brightness': float(np.mean(gray)),
        'image_entropy': float(cv2.calcHist([gray], [0], None, [256], [0, 256]).var())
    }
