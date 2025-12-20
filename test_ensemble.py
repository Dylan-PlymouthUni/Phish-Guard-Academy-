#!/usr/bin/env python3
"""
Test the ensemble phishing detection system
"""
import sys
from pathlib import Path
import logging

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from ml.ensemble import get_ensemble
from PIL import Image

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def test_url_analysis():
    """Test URL analysis"""
    print("\n" + "=" * 70)
    print("TEST 1: URL ANALYSIS")
    print("=" * 70)
    
    ensemble = get_ensemble()
    
    test_urls = [
        ("https://paypal-secure-login.tk/verify", "Obvious phishing"),
        ("https://192.168.1.1/admin", "IP address URL"),
        ("https://google.com", "Legitimate"),
        ("http://bit.ly/xYz123", "URL shortener"),
        ("https://account-verification-required-now.com", "Suspicious domain"),
    ]
    
    for url, description in test_urls:
        print(f"\n📍 Testing: {description}")
        print(f"   URL: {url}")
        
        try:
            result = ensemble.analyze_url(url)
            print(f"   ⚠️  Risk Score: {result.risk_score:.1f}%")
            print(f"   🎯 Confidence: {result.confidence:.1%}")
            print(f"   📊 Component Scores:")
            for component, score in result.component_scores.items():
                if score > 0:
                    print(f"      • {component}: {score:.1%}")
            
            if result.findings:
                print(f"   🔍 Key Findings:")
                for finding in result.findings[:3]:
                    print(f"      • {finding}")
        except Exception as e:
            print(f"   ❌ Error: {e}")
    
    print("\n" + "=" * 70)


def test_text_analysis():
    """Test text analysis"""
    print("\n" + "=" * 70)
    print("TEST 2: TEXT ANALYSIS")
    print("=" * 70)
    
    ensemble = get_ensemble()
    
    test_texts = [
        (
            "URGENT: Your account will be suspended unless you verify your identity immediately. Click here: http://verify-account.com",
            "Phishing email"
        ),
        (
            "Thanks for your order! Your package will arrive in 2-3 business days. Track it here: https://amazon.com/orders",
            "Legitimate notification"
        ),
        (
            "ACTION REQUIRED: We detected unusual activity. Confirm your password and credit card details now or your account will be locked.",
            "Strong phishing indicators"
        ),
    ]
    
    for text, description in test_texts:
        print(f"\n📝 Testing: {description}")
        print(f"   Text: {text[:80]}...")
        
        try:
            result = ensemble.analyze_text(text)
            print(f"   ⚠️  Risk Score: {result.risk_score:.1f}%")
            print(f"   🎯 Confidence: {result.confidence:.1%}")
            
            if result.findings:
                print(f"   🔍 Findings:")
                for finding in result.findings[:3]:
                    print(f"      • {finding}")
        except Exception as e:
            print(f"   ❌ Error: {e}")
    
    print("\n" + "=" * 70)


def test_full_context():
    """Test full context analysis"""
    print("\n" + "=" * 70)
    print("TEST 3: FULL CONTEXT ANALYSIS")
    print("=" * 70)
    
    ensemble = get_ensemble()
    
    # Simulated phishing scenario
    url = "https://paypal-security-check.tk/login"
    text = """
    URGENT SECURITY ALERT
    
    We have detected suspicious activity on your PayPal account.
    Please verify your identity immediately to avoid account suspension.
    
    Click here to confirm: https://paypal-security-check.tk/login
    
    This is a final warning. Your account will be locked in 24 hours.
    """
    
    print("\n🎭 Scenario: Phishing Email with URL")
    print(f"   URL: {url}")
    print(f"   Text: {text[:100]}...")
    
    try:
        result = ensemble.analyze_full_context(
            url=url,
            text=text,
            image=None
        )
        
        print(f"\n   ⚠️  FINAL RISK SCORE: {result.risk_score:.1f}%")
        print(f"   🎯 Confidence: {result.confidence:.1%}")
        print(f"   🔮 Phishing Probability: {result.phishing_probability:.1%}")
        
        print(f"\n   📊 Component Breakdown:")
        for component, score in result.component_scores.items():
            weight = ensemble.weights.get(component, 0)
            contribution = score * weight * 100
            print(f"      • {component.upper():12} {score:5.1%} × {weight:.2f} = {contribution:5.1f} pts")
        
        print(f"\n   🔍 All Findings ({len(result.findings)} total):")
        for i, finding in enumerate(result.findings[:8], 1):
            print(f"      {i}. {finding}")
        
        print(f"\n   📖 Detailed Explanation:")
        explanation = ensemble.explain_prediction(result)
        for line in explanation.split('\n')[:15]:
            print(f"   {line}")
            
    except Exception as e:
        print(f"   ❌ Error: {e}")
        import traceback
        traceback.print_exc()
    
    print("\n" + "=" * 70)


def test_model_info():
    """Display model information"""
    print("\n" + "=" * 70)
    print("MODEL INFORMATION")
    print("=" * 70)
    
    ensemble = get_ensemble()
    
    print(f"\n📦 Ensemble Configuration:")
    print(f"   Weights:")
    for component, weight in ensemble.weights.items():
        print(f"      • {component:12} {weight:.2%}")
    
    print(f"\n🔧 Component Status:")
    components = {
        'URL Analyzer': ensemble.url_analyzer is not None,
        'Text Classifier': ensemble.text_classifier is not None,
        'Visual Detector': ensemble.visual_detector is not None,
    }
    
    for name, available in components.items():
        status = "✅ Available" if available else "❌ Not loaded"
        print(f"      • {name:20} {status}")
    
    print("\n" + "=" * 70)


def main():
    """Run all tests"""
    print("\n🚀 ENSEMBLE PHISHING DETECTOR - TEST SUITE")
    print("=" * 70)
    
    try:
        # Show model info
        test_model_info()
        
        # Run tests
        test_url_analysis()
        test_text_analysis()
        test_full_context()
        
        print("\n✅ ALL TESTS COMPLETED")
        print("=" * 70)
        print("\nNext steps:")
        print("1. Train models if not done: python train_ensemble_models.py")
        print("2. Collect more data: python ml/data_collector.py")
        print("3. Fine-tune weights in ml/ensemble.py")
        print("4. Integrate with API: Update ml/api.py")
        
    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
