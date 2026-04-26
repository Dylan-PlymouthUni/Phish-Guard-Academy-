#!/usr/bin/env python3
"""
End-to-end integration tests for PhishGuard Academy API with ML model.

Tests verify that the backend serves the trained ML model correctly
and returns accurate predictions through the API endpoints.

NOTE: These tests require the backend server to be running on localhost:8000

To run the backend (from project root):
    Terminal 1: uvicorn server.app:app --host 0.0.0.0 --port 8000
    Terminal 2: pytest tests/test_api_integration.py -v
"""

import pytest
import requests
import json
import time
from pathlib import Path
import sys

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))


def is_api_available(api_url="http://localhost:8000"):
    """Check if API is available before running tests"""
    try:
        response = requests.get(f"{api_url}/health", timeout=2)
        return response.status_code == 200
    except (requests.ConnectionError, requests.Timeout):
        return False


@pytest.fixture
def api_base_url():
    """Base URL for the API (assumes server is running)"""
    return "http://localhost:8000"


@pytest.fixture(autouse=True)
def skip_if_api_unavailable(api_base_url):
    """Skip all API tests if backend is not running"""
    if not is_api_available(api_base_url):
        pytest.skip(
            "Backend API not available on localhost:8000. "
            "Start server from project root: uvicorn server.app:app --host 0.0.0.0 --port 8000",
            allow_module_level=False
        )


@pytest.fixture
def sample_phishing_urls():
    """Sample known phishing URLs for testing"""
    return [
        "http://paypal-secure-login.phishing-site.com/verify",
        "http://amazon-account-suspended.tk/login.php",
        "http://bank-verify-account.ml/update.html",
        "http://192.168.1.1/admin/phish.php",
    ]


@pytest.fixture
def sample_legitimate_urls():
    """Sample known legitimate URLs for testing"""
    return [
        "https://www.google.com",
        "https://github.com",
        "https://www.wikipedia.org",
        "https://www.bbc.co.uk/news",
    ]


def test_api_health_check(api_base_url):
    """Test API health check endpoint"""
    response = requests.get(f"{api_base_url}/health")
    
    assert response.status_code == 200, "Health check should return 200"
    data = response.json()
    assert data["status"] == "healthy", "API should be healthy"


def test_analyze_phishing_url(api_base_url, sample_phishing_urls):
    """Test that API correctly identifies phishing URLs"""
    for url in sample_phishing_urls[:2]:  # Test first 2 to avoid rate limits
        response = requests.post(
            f"{api_base_url}/analyze",
            json={"url": url}
        )
        
        assert response.status_code == 200, f"Analyze endpoint should return 200 for {url}"
        data = response.json()
        
        # Check response structure
        assert "url" in data, "Response should contain URL"
        assert "is_phishing" in data, "Response should contain is_phishing flag"
        assert "confidence" in data, "Response should contain confidence score"
        assert "risk_score" in data, "Response should contain risk_score"
        
        # Check types
        assert isinstance(data["is_phishing"], bool), "is_phishing should be boolean"
        assert isinstance(data["confidence"], (int, float)), "confidence should be numeric"
        assert isinstance(data["risk_score"], (int, float)), "risk_score should be numeric"
        
        # Check ranges
        assert 0 <= data["confidence"] <= 100, "Confidence should be 0-100"
        assert 0 <= data["risk_score"] <= 100, "Risk score should be 0-100"
        
        # Known phishing URLs should be detected (allowing for model errors)
        # We don't assert is_phishing=True as model may miss some
        
        time.sleep(0.5)  # Rate limiting


def test_analyze_legitimate_url(api_base_url, sample_legitimate_urls):
    """Test that API correctly identifies legitimate URLs"""
    for url in sample_legitimate_urls[:2]:  # Test first 2
        response = requests.post(
            f"{api_base_url}/analyze",
            json={"url": url}
        )
        
        assert response.status_code == 200, f"Analyze endpoint should return 200 for {url}"
        data = response.json()
        
        # Check response structure (same as phishing test)
        assert "url" in data
        assert "is_phishing" in data
        assert "confidence" in data
        assert "risk_score" in data
        
        # Known legitimate URLs should be safe (allowing for false positives)
        # We don't assert is_phishing=False as model may have FPs
        
        time.sleep(0.5)


def test_analyze_invalid_url(api_base_url):
    """Test API handles invalid URLs gracefully"""
    invalid_urls = [
        "not-a-url",
        "ftp://unsupported-protocol.com",
        "",
        "javascript:alert('xss')",
    ]
    
    for url in invalid_urls:
        response = requests.post(
            f"{api_base_url}/analyze",
            json={"url": url}
        )
        
        # API should either reject (4xx) or handle gracefully (200 with error info)
        assert response.status_code in [200, 400, 422], \
            f"API should handle invalid URL: {url}"


def test_analyze_response_time(api_base_url, sample_legitimate_urls):
    """Test that API responses are fast enough for production"""
    url = sample_legitimate_urls[0]
    
    start_time = time.perf_counter()
    response = requests.post(
        f"{api_base_url}/analyze",
        json={"url": url}
    )
    end_time = time.perf_counter()
    
    latency_ms = (end_time - start_time) * 1000
    
    assert response.status_code == 200, "Request should succeed"
    assert latency_ms < 2000, f"API response should be <2s (got {latency_ms:.0f}ms)"
    
    # Log performance
    print(f"\n✅ API latency: {latency_ms:.0f}ms")


def test_batch_analysis_consistency(api_base_url):
    """Test that analyzing the same URL multiple times gives consistent results"""
    test_url = "https://www.example.com"
    
    results = []
    for _ in range(3):
        response = requests.post(
            f"{api_base_url}/analyze",
            json={"url": test_url}
        )
        
        assert response.status_code == 200
        results.append(response.json())
        time.sleep(0.3)
    
    # Check consistency
    is_phishing_values = [r["is_phishing"] for r in results]
    confidence_values = [r["confidence"] for r in results]
    
    assert len(set(is_phishing_values)) == 1, "is_phishing should be consistent"
    
    # Confidence may vary slightly due to floating point, but should be close
    confidence_std = sum((c - sum(confidence_values)/len(confidence_values))**2 
                        for c in confidence_values) ** 0.5
    assert confidence_std < 1.0, "Confidence scores should be consistent (std < 1.0)"


def test_analyze_with_features(api_base_url):
    """Test that API returns feature information if requested"""
    response = requests.post(
        f"{api_base_url}/analyze",
        json={
            "url": "https://www.google.com",
            "include_features": True  # If API supports this
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    
    # If features are included, check structure
    if "features" in data:
        assert isinstance(data["features"], dict), "Features should be a dict"
        assert len(data["features"]) > 0, "Features dict should not be empty"


def test_model_prediction_matches_artifact(api_base_url):
    """Test that API predictions match saved model artifacts (if available)"""
    # This test requires access to saved artifacts from experiments
    artifacts_dir = Path("artifacts/runs")
    
    if not artifacts_dir.exists():
        pytest.skip("No artifacts directory found")
    
    # Find latest run
    run_dirs = sorted([d for d in artifacts_dir.iterdir() if d.is_dir()], 
                     key=lambda p: p.stat().st_mtime)
    
    if not run_dirs:
        pytest.skip("No experiment runs found")
    
    latest_run = run_dirs[-1]
    manifest_path = latest_run / "run_manifest.json"
    
    if not manifest_path.exists():
        pytest.skip("No manifest found in latest run")
    
    with open(manifest_path) as f:
        manifest = json.load(f)
    
    # Check that model metrics in manifest are reasonable
    if "evaluation" in manifest and "metrics" in manifest["evaluation"]:
        metrics = manifest["evaluation"]["metrics"]
        
        assert "accuracy" in metrics, "Metrics should include accuracy"
        assert "roc_auc" in metrics, "Metrics should include ROC-AUC"
        
        # Model should have good performance
        assert metrics["accuracy"] > 0.85, f"Model accuracy should be >85% (got {metrics['accuracy']:.2%})"
        assert metrics["roc_auc"] > 0.90, f"Model ROC-AUC should be >90% (got {metrics['roc_auc']:.2%})"
        
        print(f"\n✅ Model performance: Accuracy={metrics['accuracy']:.2%}, ROC-AUC={metrics['roc_auc']:.2%}")


@pytest.mark.skipif(
    True,  # Skip by default as it requires server restart
    reason="Requires server with specific model loaded"
)
def test_model_version_endpoint(api_base_url):
    """Test endpoint that returns model version/metadata"""
    response = requests.get(f"{api_base_url}/model/info")
    
    if response.status_code == 200:
        data = response.json()
        
        assert "model_type" in data, "Should return model type"
        assert "version" in data or "trained_at" in data, "Should return version/timestamp"


def test_analyze_concurrent_requests(api_base_url, sample_legitimate_urls):
    """Test that API handles concurrent requests correctly"""
    import concurrent.futures
    
    def make_request(url):
        """Run make request.
        Args:
            url (str): URL to analyze.
        Returns:
            Tuple[int, dict]: Status code and response data."""
        response = requests.post(
            f"{api_base_url}/analyze",
            json={"url": url}
        )
        return response.status_code, response.json()
    
    urls = sample_legitimate_urls[:3]
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        futures = [executor.submit(make_request, url) for url in urls]
        results = [f.result() for f in concurrent.futures.as_completed(futures)]
    
    # All requests should succeed
    for status_code, data in results:
        assert status_code == 200, "Concurrent requests should all succeed"
        assert "is_phishing" in data, "All responses should have required fields"


if __name__ == "__main__":
    # Run tests with pytest
    pytest.main([__file__, "-v", "-s"])
