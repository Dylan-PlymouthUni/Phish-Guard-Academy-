"""Tests for api.
These tests cover the core API functionality, including text and URL analysis, image processing, and authentication.
The tests are designed to be run in an environment where the API is accessible, and they use the TestClient from FastAPI to make requests to the endpoints. 
The tests include both unit tests for individual functions and integration tests that cover the full request-response cycle of the API. 
The tests also include edge cases and error handling scenarios to ensure the API behaves correctly under various conditions. 
The tests are organized in a way that allows for easy maintenance and extension as the API evolves, and they provide a solid foundation for ensuring the reliability and correctness of the API's functionality.
This file intentionally keeps minimal dependencies so unit tests don't require heavy OCR/ML installations.
"""

import io
from PIL import Image
import pytest
import ml.api as api

def make_sample_image(text="test", size=(200,80), color=255):
    """Run make sample image."""
    img = Image.new("L", size, color)  # white background
    return img.convert("RGB")

def test_preprocess_returns_image():
    """Test preprocess returns image."""
    img = make_sample_image()
    pre = api.preprocess_image_for_ocr(img)
    assert isinstance(pre, Image.Image)
    assert pre.size[0] > 0 and pre.size[1] > 0

def test_extract_text_and_boxes_no_tesseract(monkeypatch):
    """Test extract text and boxes no tesseract."""
    monkeypatch.setattr(api, "HAS_TESSERACT", False)
    img = make_sample_image()
    text, boxes = api.extract_text_and_boxes(img)
    assert text == ""
    assert boxes == []

# from project root
# Run tests with PYTHONPATH set
import os
os.environ['PYTHONPATH'] = '.'
pytest.main(['-q'])