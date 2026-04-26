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
try:
    import cv2
    CV2_AVAILABLE = True
except Exception as e:
    cv2 = None  # Optional dependency
    CV2_AVAILABLE = False
    logging.warning(f"OpenCV not available. Visual analysis will be limited: {e}")

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
        """Initialize model configuration, device selection, and optional OCR reader."""
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
        
        if not CV2_AVAILABLE or cv2 is None:
            result['risk'] = 0
            result['confidence'] = 0.0
            result['findings'] = [
                {
                    'type': 'system',
                    'label': 'Visual analysis unavailable',
                    'detail': 'OpenCV dependencies are not installed on this environment.',
                    'severity': 'low'
                }
            ]
            return result

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
        """Extract enhanced visual features with UI element detection"""
        features = {}
        height, width = img_array.shape[:2]
        
        # Color analysis
        hsv = cv2.cvtColor(img_array, cv2.COLOR_RGB2HSV)
        features['mean_hue'] = float(np.mean(hsv[:, :, 0]))
        features['mean_saturation'] = float(np.mean(hsv[:, :, 1]))
        features['mean_value'] = float(np.mean(hsv[:, :, 2]))
        features['color_variance'] = float(np.var(hsv))
        
        # Detect dominant colors
        pixels = img_array.reshape(-1, 3)
        unique_colors = len(np.unique(pixels, axis=0))
        features['unique_colors'] = min(unique_colors, 1000)
        features['color_diversity'] = unique_colors / pixels.shape[0]
        
        # Edge detection (complexity measure)
        gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        edges = cv2.Canny(gray, 50, 150)
        features['edge_density'] = float(np.sum(edges > 0) / edges.size)
        
        # Texture analysis
        features['texture_std'] = float(np.std(gray))
        features['texture_variance'] = float(np.var(gray))
        
        # Layout features
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
        
        # Enhanced UI element detection
        button_info = self._detect_ui_elements(img_array, hsv)
        features['detected_buttons'] = button_info['buttons']
        features['button_count'] = len(button_info['buttons'])
        features['button_boxes'] = button_info['boxes']
        features['has_suspicious_buttons'] = button_info['suspicious']
        
        # Form field detection
        form_info = self._detect_form_fields(img_array, gray)
        features['detected_form_fields'] = form_info['fields']
        features['form_field_boxes'] = form_info['boxes']
        features['has_login_form'] = form_info['has_login']
        features['has_payment_form'] = form_info['has_payment']
        
        # Logo detection regions
        logo_info = self._detect_logo_regions(img_array)
        features['logo_regions'] = logo_info['regions']
        features['logo_boxes'] = logo_info['boxes']
        
        # Typography consistency
        features['typography_consistency'] = self._analyze_typography(gray)
        
        # Form/button detection (via color clustering)
        features['has_button_colors'] = self._detect_button_colors(hsv)
        
        return features
    
    def _detect_ui_elements(self, img_array: np.ndarray, hsv: np.ndarray) -> Dict[str, Any]:
        """Detect buttons and clickable UI elements"""
        result = {
            'buttons': [],
            'boxes': [],
            'suspicious': False
        }
        
        h = hsv[:, :, 0]
        s = hsv[:, :, 1]
        v = hsv[:, :, 2]
        
        # Blue buttons (common for phishing)
        blue_mask = (h >= 100) & (h <= 130) & (s > 50) & (v > 50)
        green_mask = (h >= 40) & (h <= 80) & (s > 50) & (v > 50)
        red_mask = (((h >= 0) & (h <= 10)) | ((h >= 170) & (h <= 180))) & (s > 50) & (v > 50)
        
        combined_mask = (blue_mask | green_mask | red_mask).astype(np.uint8) * 255
        
        # Find contours
        contours, _ = cv2.findContours(combined_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        h_img, w_img = img_array.shape[:2]
        
        for contour in contours:
            x, y, w, h = cv2.boundingRect(contour)
            area = w * h
            
            # Filter by size (buttons are typically 30-300 pixels wide, 20-60 tall)
            if 600 < area < 15000 and 20 < h < 100:
                result['buttons'].append({
                    'x': int(x),
                    'y': int(y),
                    'width': int(w),
                    'height': int(h),
                    'color': 'blue' if blue_mask[y:y+h, x:x+w].any() else 'red' if red_mask[y:y+h, x:x+w].any() else 'green'
                })
                result['boxes'].append([x, y, x+w, y+h])
        
        # Suspicious if buttons are positioned oddly (bottom-right corner, unusual placement)
        if result['boxes']:
            for box in result['boxes']:
                x1, y1, x2, y2 = box
                # Check if button is in unusual positions (far right/bottom)
                if x2 > w_img * 0.85 or y2 > h_img * 0.9:
                    result['suspicious'] = True
        
        return result
    
    def _detect_form_fields(self, img_array: np.ndarray, gray: np.ndarray) -> Dict[str, Any]:
        """Detect form fields like input boxes and login forms"""
        result = {
            'fields': [],
            'boxes': [],
            'has_login': False,
            'has_payment': False
        }
        
        # Edge detection to find rectangles (typical form field shape)
        edges = cv2.Canny(gray, 50, 150)
        
        # Dilate to connect close edges
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
        dilated = cv2.dilate(edges, kernel, iterations=1)
        
        # Find contours
        contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        h_img, w_img = img_array.shape[:2]
        
        for contour in contours:
            x, y, w, h = cv2.boundingRect(contour)
            area = w * h
            
            # Form fields are typically rectangular and moderately sized
            if 800 < area < 50000 and w > 50 and 20 < h < 50:
                result['fields'].append({
                    'x': int(x),
                    'y': int(y),
                    'width': int(w),
                    'height': int(h)
                })
                result['boxes'].append([x, y, x+w, y+h])
        
        # Heuristic: if many fields stacked vertically = login/password form
        if len(result['boxes']) >= 2:
            result['has_login'] = True
        
        # Check for payment-related indicators (form fields + suspicious text context)
        if len(result['boxes']) >= 3:
            result['has_payment'] = True
        
        return result
    
    def _detect_logo_regions(self, img_array: np.ndarray) -> Dict[str, Any]:
        """Detect potential logo regions in the image"""
        result = {
            'regions': [],
            'boxes': []
        }
        
        # Convert to HSV for color-based logo detection
        hsv = cv2.cvtColor(img_array, cv2.COLOR_RGB2HSV)
        gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        
        h_img, w_img = img_array.shape[:2]
        
        # Logos often have high saturation and distinct colors
        # Look for concentrated color regions in top-left and top-center areas
        s = hsv[:, :, 1]
        high_sat_mask = s > 100
        
        # Focus on top portion of page (where logos typically appear)
        logo_region = high_sat_mask[:int(h_img*0.15), :]
        
        # Find contours in logo region
        contours, _ = cv2.findContours(
            (logo_region.astype(np.uint8) * 255), 
            cv2.RETR_EXTERNAL, 
            cv2.CHAIN_APPROX_SIMPLE
        )
        
        for contour in contours:
            x, y, w, h = cv2.boundingRect(contour)
            area = w * h
            
            # Logo is typically square-ish and moderate size
            if 500 < area < 50000 and 0.5 < w/h < 2.0:
                result['regions'].append({
                    'x': int(x),
                    'y': int(y),
                    'width': int(w),
                    'height': int(h),
                    'saturation': float(np.mean(s[y:y+h, x:x+w]))
                })
                result['boxes'].append([x, y, x+w, y+h])
        
        return result
    
    def _analyze_typography(self, gray: np.ndarray) -> float:
        """Analyze typography consistency (phishing sites often have inconsistent fonts)"""
        # Look at text region variance
        # Higher variance = inconsistent fonts = suspicious
        
        # Simple heuristic: divide image into grid and check variance
        h, w = gray.shape
        grid_h, grid_w = 5, 5
        
        variances = []
        for i in range(grid_h):
            for j in range(grid_w):
                y_start = int(i * h / grid_h)
                y_end = int((i+1) * h / grid_h)
                x_start = int(j * w / grid_w)
                x_end = int((j+1) * w / grid_w)
                
                region = gray[y_start:y_end, x_start:x_end]
                variances.append(np.var(region))
        
        # Consistency score: lower variance = more consistent
        consistency = 1.0 - (np.std(variances) / (np.mean(variances) + 1))
        return float(max(0, min(1, consistency)))
    
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
        """Extract and analyze text from image with enhanced phishing detection"""
        analysis = {
            'extracted_text': '',
            'urls_found': [],
            'suspicious_phrases': [],
            'brand_mentions': [],
            'text_confidence': 0.0,
            'phishing_keywords': [],
            'urgency_level': 'low',
            'credential_requests': [],
            'text_boxes': []
        }
        
        try:
            if self.ocr_reader and OCR_AVAILABLE:
                # Use EasyOCR with position info
                results = self.ocr_reader.readtext(img_array)
                texts = []
                positions = []
                for (bbox, text, conf) in results:
                    texts.append(text)
                    # bbox is a list of 4 corners
                    if bbox:
                        x_coords = [p[0] for p in bbox]
                        y_coords = [p[1] for p in bbox]
                        x_min, x_max = min(x_coords), max(x_coords)
                        y_min, y_max = min(y_coords), max(y_coords)
                        positions.append({
                            'text': text,
                            'box': [int(x_min), int(y_min), int(x_max), int(y_max)],
                            'confidence': float(conf)
                        })
                
                analysis['extracted_text'] = ' '.join(texts)
                analysis['text_boxes'] = positions
                analysis['text_confidence'] = np.mean([conf for _, _, conf in results]) if results else 0.0
            else:
                # Fallback to pytesseract
                import pytesseract
                analysis['extracted_text'] = pytesseract.image_to_string(img_array)
                analysis['text_confidence'] = 0.5
        except Exception as e:
            logger.warning(f"OCR failed: {e}")
            return analysis
        
        text_lower = analysis['extracted_text'].lower()
        
        # Find URLs
        import re
        url_pattern = r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+'
        analysis['urls_found'] = re.findall(url_pattern, analysis['extracted_text'])
        
        # Enhanced suspicious phrases with severity
        high_severity_phrases = [
            'verify account', 'confirm identity', 'verify your identity',
            'suspended account', 'account locked', 'unusual activity detected',
            'click here immediately', 'update payment method',
            'confirm password', 're-enter credentials'
        ]
        
        medium_severity_phrases = [
            'verify', 'confirm', 'unusual activity', 'suspended', 'locked',
            'click here', 'update payment', 'urgent', 'immediate action',
            'expires', 'limited time', 'act now', 'don\'t wait'
        ]
        
        # Find high severity phrases
        for phrase in high_severity_phrases:
            if phrase in text_lower:
                analysis['suspicious_phrases'].append(phrase)
                analysis['phishing_keywords'].append({'phrase': phrase, 'severity': 'high'})
        
        # Find medium severity phrases (if not already caught as high)
        for phrase in medium_severity_phrases:
            if phrase in text_lower and phrase not in analysis['suspicious_phrases']:
                analysis['phishing_keywords'].append({'phrase': phrase, 'severity': 'medium'})
        
        # Credential request detection
        credential_keywords = ['password', 'PIN', 'SSN', 'social security', 'credit card', 'cvv', 'expiration date']
        for keyword in credential_keywords:
            if keyword.lower() in text_lower:
                analysis['credential_requests'].append(keyword)
        
        # Urgency level assessment
        urgency_high = ['immediate', 'urgent', 'immediately', 'now', 'asap', 'don\'t wait']
        urgency_med = ['soon', 'expires', 'limited time', 'act now', 'quickly']
        
        high_urgency_count = sum(1 for u in urgency_high if u in text_lower)
        med_urgency_count = sum(1 for u in urgency_med if u in text_lower)
        
        if high_urgency_count >= 2:
            analysis['urgency_level'] = 'critical'
        elif high_urgency_count >= 1 or med_urgency_count >= 2:
            analysis['urgency_level'] = 'high'
        elif med_urgency_count >= 1:
            analysis['urgency_level'] = 'medium'
        
        # Detect brand mentions with impersonation risk
        brands = {
            'paypal': ['paypal', 'pay pal'],
            'amazon': ['amazon'],
            'apple': ['apple', 'apple id', 'icloud'],
            'microsoft': ['microsoft', 'outlook', 'windows', 'office 365'],
            'google': ['google', 'gmail'],
            'facebook': ['facebook', 'meta'],
            'netflix': ['netflix'],
            'bank': ['bank', 'banking', 'banking service'],
            'irs': ['irs', 'internal revenue'],
            'fedex': ['fedex'],
            'dhl': ['dhl'],
            'ebay': ['ebay'],
            'linkedin': ['linkedin']
        }
        
        for brand, keywords in brands.items():
            for keyword in keywords:
                if keyword in text_lower:
                    analysis['brand_mentions'].append(brand)
                    break
        
        return analysis
    
    def _detect_brand_impersonation(self, img_array: np.ndarray) -> Dict[str, Any]:
        """Detect brand logo impersonation with enhanced matching"""
        analysis = {
            'detected_brands': [],
            'confidence_scores': {},
            'is_suspicious': False,
            'reason': '',
            'logo_locations': []
        }
        
        if not self.brand_templates:
            # No templates loaded, but we can still analyze high-saturation color regions
            hsv = cv2.cvtColor(img_array, cv2.COLOR_RGB2HSV)
            s = hsv[:, :, 1]
            
            # Check if image has brand-like color concentrations
            high_sat_areas = np.sum(s > 150) / s.size
            analysis['is_suspicious'] = high_sat_areas > 0.05  # More than 5% high saturation
            if analysis['is_suspicious']:
                analysis['reason'] = 'High color saturation suggesting logo use'
            
            return analysis
        
        # Convert to grayscale for template matching
        gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        
        # Multi-scale template matching
        h_img, w_img = img_array.shape[:2]
        
        for brand_name, template in self.brand_templates.items():
            best_val = 0
            best_locations = []
            
            # Try multiple scales
            for scale in [0.5, 0.75, 1.0, 1.25, 1.5]:
                template_scaled = cv2.resize(template, None, fx=scale, fy=scale)
                
                # Skip if template is larger than image
                if template_scaled.shape[0] > gray.shape[0] or template_scaled.shape[1] > gray.shape[1]:
                    continue
                
                # Multiple matching methods
                for method in [cv2.TM_CCOEFF_NORMED, cv2.TM_CCORR_NORMED]:
                    try:
                        result = cv2.matchTemplate(gray, template_scaled, method)
                        _, max_val, _, max_loc = cv2.minMaxLoc(result)
                        
                        if max_val > best_val:
                            best_val = max_val
                            h_t, w_t = template_scaled.shape
                            best_locations = [{
                                'x': int(max_loc[0]),
                                'y': int(max_loc[1]),
                                'width': int(w_t),
                                'height': int(h_t),
                                'confidence': float(max_val)
                            }]
                    except:
                        continue
            
            # Accept match if confidence > 0.65 (more lenient for real-world images)
            if best_val > 0.65:
                analysis['detected_brands'].append(brand_name)
                analysis['confidence_scores'][brand_name] = float(best_val)
                analysis['logo_locations'].extend(best_locations)
        
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
        """Calculate overall risk score from all enhanced analyses"""
        risk = 0.0
        
        visual = analysis['visual_features']
        text = analysis['text_analysis']
        brand = analysis['brand_analysis']
        
        # VISUAL INDICATORS (25% weight)
        if visual.get('is_blurry', False):
            risk += 0.10
        if visual.get('color_variance', 0) > 5000:
            risk += 0.08
        if visual.get('edge_density', 0) > 0.05:
            risk += 0.07
        
        # UI ELEMENT ANALYSIS (15% weight)
        button_count = visual.get('button_count', 0)
        if button_count > 0:
            risk += 0.05 * min(button_count, 3)  # Cap at 3 buttons
        if visual.get('has_suspicious_buttons', False):
            risk += 0.10
        
        # FORM FIELD ANALYSIS (15% weight)
        if visual.get('has_login', False):
            risk += 0.12
        if visual.get('has_payment_form', False):
            risk += 0.15
        
        # TEXT ANALYSIS (45% weight - highest priority)
        
        # Credential requests are critical
        if text.get('credential_requests'):
            risk += 0.35
        
        # Urgency language
        urgency = text.get('urgency_level', 'low')
        if urgency == 'critical':
            risk += 0.20
        elif urgency == 'high':
            risk += 0.12
        elif urgency == 'medium':
            risk += 0.05
        
        # Phishing keywords
        if text.get('phishing_keywords'):
            high_severity_keywords = [k for k in text['phishing_keywords'] if k['severity'] == 'high']
            if high_severity_keywords:
                risk += 0.15 + (len(high_severity_keywords) * 0.05)
            else:
                # Medium severity
                risk += 0.08 + (len(text['phishing_keywords']) * 0.02)
        
        # URLs in image
        if text.get('urls_found'):
            risk += 0.10 + (min(len(text['urls_found']), 3) * 0.05)
        
        # BRAND ANALYSIS (15% weight)
        if brand.get('detected_brands'):
            # Logo detected - check if context is suspicious
            if text.get('suspicious_phrases') or text.get('credential_requests'):
                risk += 0.15
            else:
                risk += 0.05  # Just presence is mild concern
        
        if text.get('brand_mentions') and not brand.get('detected_brands'):
            # Brand mentioned but no logo = likely impersonation
            risk += 0.20
        elif text.get('brand_mentions') and brand.get('detected_brands'):
            # Check for mismatch (handled in findings)
            pass
        
        # Typography consistency
        typography = visual.get('typography_consistency', 0.5)
        if typography < 0.4:
            risk += 0.08
        
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
    
    def _generate_findings(self, analysis: Dict) -> List[Dict[str, Any]]:
        """Generate structured findings with visual markup information"""
        findings = []
        
        visual = analysis['visual_features']
        text = analysis['text_analysis']
        brand = analysis['brand_analysis']
        
        # Track boxes for visual markup
        boxes_to_highlight = []
        
        # VISUAL FINDINGS
        if visual.get('is_blurry'):
            findings.append({
                'label': 'Poor Image Quality',
                'detail': 'Image is blurry or low quality (possible screenshot of screenshot)',
                'severity': 'high',
                'type': 'visual',
                'boxes': []
            })
        
        if visual.get('color_variance', 0) > 5000:
            findings.append({
                'label': 'Inconsistent Color Scheme',
                'detail': 'Unusual color patterns detected suggesting design inconsistencies',
                'severity': 'medium',
                'type': 'visual',
                'boxes': []
            })
        
        # Button detection findings
        if visual.get('button_count', 0) > 0:
            finding = {
                'label': f'Clickable Buttons Detected ({visual["button_count"]})',
                'detail': f'Found {visual["button_count"]} button(s). Verify their legitimacy before clicking.',
                'severity': 'medium',
                'type': 'ui-element',
                'boxes': visual.get('button_boxes', [])
            }
            
            if visual.get('has_suspicious_buttons'):
                finding['severity'] = 'high'
                finding['detail'] += ' ⚠️ Buttons positioned in suspicious locations.'
            
            findings.append(finding)
        
        # Form field findings
        if visual.get('detected_form_fields', []):
            finding = {
                'label': f'Form Fields Detected ({len(visual.get("detected_form_fields", []))})',
                'detail': 'Login or input form detected. Do not enter credentials unless you initiated this action.',
                'severity': 'high' if visual.get('has_login') else 'medium',
                'type': 'form',
                'boxes': visual.get('form_field_boxes', [])
            }
            findings.append(finding)
        
        # Logo region findings
        if visual.get('logo_regions', []):
            findings.append({
                'label': f'Logo Regions Detected ({len(visual.get("logo_regions", []))})',
                'detail': 'Potential brand logos found. Verify they match official branding.',
                'severity': 'medium',
                'type': 'logo',
                'boxes': visual.get('logo_boxes', []),
                'regions': visual.get('logo_regions', [])
            })
        
        # TEXT FINDINGS
        if text.get('credential_requests'):
            findings.append({
                'label': '⛔ Credential Request Detected',
                'detail': f'Page requests sensitive information: {", ".join(text["credential_requests"])}. Legitimate companies never ask for this via email/website.',
                'severity': 'critical',
                'type': 'credentials',
                'boxes': []
            })
        
        if text.get('urgency_level') == 'critical':
            findings.append({
                'label': '⚠️ CRITICAL URGENCY LANGUAGE',
                'detail': 'Multiple urgent action requests detected (common phishing tactic to bypass thinking)',
                'severity': 'critical',
                'type': 'urgency',
                'boxes': []
            })
        elif text.get('urgency_level') == 'high':
            findings.append({
                'label': '⚠️ High Urgency Language',
                'detail': 'Urgent language detected. Take time to verify before acting.',
                'severity': 'high',
                'type': 'urgency',
                'boxes': []
            })
        
        if text.get('phishing_keywords'):
            high_severity_keywords = [k for k in text['phishing_keywords'] if k['severity'] == 'high']
            if high_severity_keywords:
                phrases = [k['phrase'] for k in high_severity_keywords]
                findings.append({
                    'label': 'High-Risk Phishing Phrases',
                    'detail': f'Found phrases commonly used in phishing: {", ".join(phrases[:3])}',
                    'severity': 'high',
                    'type': 'phishing-language',
                    'boxes': []
                })
        
        if text.get('urls_found'):
            findings.append({
                'label': f'URLs Detected in Image ({len(text["urls_found"])})',
                'detail': f'Found {len(text["urls_found"])} URL(s) embedded. Suspicious URLs: {", ".join(text["urls_found"][:2])}',
                'severity': 'medium',
                'type': 'url',
                'boxes': []
            })
        
        # BRAND FINDINGS
        if brand.get('detected_brands'):
            findings.append({
                'label': f'Brand Logos Detected ({", ".join(brand["detected_brands"])})',
                'detail': f'Official brand logos detected. Verify the actual URL matches the brand.',
                'severity': 'medium',
                'type': 'lookalike',
                'boxes': brand.get('logo_locations', [])
            })
        
        if text.get('brand_mentions') and not brand.get('detected_brands'):
            findings.append({
                'label': '🎭 Brand Impersonation Risk',
                'detail': f'Page mentions {text["brand_mentions"][0].upper()} but no official logo found. Likely impersonation.',
                'severity': 'high',
                'type': 'impersonation',
                'boxes': []
            })
        elif text.get('brand_mentions') and brand.get('detected_brands'):
            # Logo and mention together - check if matching
            mentioned = set(text.get('brand_mentions', []))
            detected = set(brand.get('detected_brands', []))
            if not mentioned & detected:
                findings.append({
                    'label': '🎭 Brand Mismatch Detected',
                    'detail': f'Mentions {list(mentioned)[0].upper()} but shows {list(detected)[0].upper()} logo. Possible impersonation.',
                    'severity': 'high',
                    'type': 'mismatch',
                    'boxes': brand.get('logo_locations', [])
                })
        
        # Typography consistency
        if visual.get('typography_consistency', 0.5) < 0.4:
            findings.append({
                'label': 'Inconsistent Typography',
                'detail': 'Text formatting varies significantly. May indicate quick/unprofessional design (common in phishing).',
                'severity': 'medium',
                'type': 'typography',
                'boxes': []
            })
        
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
        if CV2_AVAILABLE and cv2 is not None:
            img_array = cv2.cvtColor(img_array, cv2.COLOR_GRAY2RGB)
        else:
            img_array = np.stack([img_array, img_array, img_array], axis=-1)
    elif img_array.shape[2] == 4:
        img_array = img_array[:, :, :3]

    if CV2_AVAILABLE and cv2 is not None:
        # Color features
        hsv = cv2.cvtColor(img_array, cv2.COLOR_RGB2HSV)
        color_variance = float(np.var(hsv))

        # Edge detection
        gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        edges = cv2.Canny(gray, 50, 150)
        edge_density = float(np.sum(edges > 0) / edges.size)

        # Text density (variance)
        text_density = float(np.var(gray))
        image_entropy = float(cv2.calcHist([gray], [0], None, [256], [0, 256]).var())
    else:
        # Lightweight fallback that does not depend on OpenCV.
        gray = (0.299 * img_array[:, :, 0] + 0.587 * img_array[:, :, 1] + 0.114 * img_array[:, :, 2]).astype(np.float32)
        color_variance = float(np.var(img_array))

        grad_x = np.abs(np.diff(gray, axis=1, prepend=gray[:, :1]))
        grad_y = np.abs(np.diff(gray, axis=0, prepend=gray[:1, :]))
        grad = grad_x + grad_y
        edge_density = float(np.mean(grad > 25.0))

        text_density = float(np.var(gray))
        hist, _ = np.histogram(gray, bins=256, range=(0, 255))
        image_entropy = float(np.var(hist))

    return {
        'color_variance': color_variance,
        'edge_density': edge_density,
        'text_density': text_density,
        'mean_brightness': float(np.mean(gray)),
        'image_entropy': image_entropy
    }
