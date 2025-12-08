import io
from PIL import Image
import pytest
import ml.api as api

def make_sample_image(text="test", size=(200,80), color=255):
    img = Image.new("L", size, color)  # white background
    return img.convert("RGB")

def test_preprocess_returns_image():
    img = make_sample_image()
    pre = api.preprocess_image_for_ocr(img)
    assert isinstance(pre, Image.Image)
    assert pre.size[0] > 0 and pre.size[1] > 0

def test_extract_text_and_boxes_no_tesseract(monkeypatch):
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