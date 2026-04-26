"""Shared pytest fixtures and test configuration.
This file defines fixtures that can be used across multiple test modules in the tests/ directory.
Fixtures include:
- `client`: A TestClient instance for making requests to the FastAPI app.
- `threat_intel`: An instance of the ThreatIntelligence class for testing threat intelligence functionality.
- `sample_image`: A sample image file for testing OCR and image analysis endpoints.
- `sample_url`: A sample URL for testing URL analysis endpoints.
- `sample_text`: A sample text string for testing text analysis endpoints.
- `valid_api_key`: A valid API key for authentication in tests.
- `invalid_api_key`: An invalid API key for testing authentication failure cases.
- `mock_ml_model`: A mock ML model that can be used to simulate predictions in tests without relying on the actual trained model.
- `mock_threat_intel`: A mock Threat Intelligence instance that can be used to simulate threat intelligence responses in tests without making real API calls.
- `mock_ocr`: A mock OCR function that can be used to simulate OCR results in tests without requiring the actual OCR engine to be installed.
- `mock_url_features`: A mock function to simulate 
URL feature extraction for testing URL analysis without relying on the actual feature extraction logic.
- `mock_url_model`: A mock URL model that can be used to simulate URL analysis predictions in tests without relying on the actual trained model.
- `mock_threat_intel_cache`: A mock cache for threat intelligence results to test caching behavior without making real API calls.
This file intentionally keeps minimal dependencies so unit tests don't require heavy OCR/ML installations.
"""

import sys
import warnings
from pathlib import Path

from sklearn.exceptions import InconsistentVersionWarning

# ensure project root is on sys.path so tests can import ml.api
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

# Silence noisy third-party warnings that don't affect test expectations
warnings.filterwarnings("ignore", category=InconsistentVersionWarning)
warnings.filterwarnings(
	"ignore",
	message=".*find_loader.*",  # pytesseract legacy loader warning
	category=DeprecationWarning,
)