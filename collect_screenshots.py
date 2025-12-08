#!/usr/bin/env python3
"""Collect phishing/legitimate screenshots for training."""

import os
import json
from pathlib import Path
from PIL import Image
import numpy as np

PHISHING_SCREENSHOTS_DIR = Path("data/screenshots/phishing")
LEGITIMATE_SCREENSHOTS_DIR = Path("data/screenshots/legitimate")

PHISHING_SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)
LEGITIMATE_SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)

print("""
To build an accurate screenshot detector, we need:

1. **Phishing Screenshots** (examples):
   - Fake login pages (PayPal, Amazon, Gmail, Bank sites)
   - Scam alerts ("Your account is locked!")
   - Fake payment screens
   - Phishing emails with suspicious sender info
   
   Sources:
   - PhishTank (has some screenshots)
   - FBI IC3 reports
   - University phishing kits
   - Internal test cases

2. **Legitimate Screenshots** (examples):
   - Real PayPal, Amazon, Gmail login pages
   - Bank dashboards
   - Real payment confirmations
   - Official app interfaces
   
   Sources:
   - Live legitimate sites (Selenium)
   - Official app stores
   - Company official sites

Place screenshots in:
  - {PHISHING_SCREENSHOTS_DIR}/*.png (phishing)
  - {LEGITIMATE_SCREENSHOTS_DIR}/*.png (legitimate)

Then run:
  python train_screenshot_model.py
""")

# Example: Create synthetic test screenshots for demo
def create_fake_phishing_screenshot():
    """Create a simple synthetic phishing screenshot."""
    img = Image.new("RGB", (800, 600), color=(240, 240, 250))
    pixels = img.load()
    
    # Add some fake form elements
    for y in range(200, 400):
        for x in range(100, 700):
            if 200 <= y <= 250 or 300 <= y <= 350:
                pixels[x, y] = (200, 200, 220)  # Form fields
    
    return img

def create_fake_legitimate_screenshot():
    """Create a synthetic legitimate screenshot."""
    img = Image.new("RGB", (800, 600), color=(255, 255, 255))
    pixels = img.load()
    
    # Consistent, clean design
    for y in range(0, 80):
        for x in range(0, 800):
            pixels[x, y] = (0, 102, 204)  # Blue header (like real apps)
    
    for y in range(150, 250):
        for x in range(50, 750):
            pixels[x, y] = (245, 245, 245)  # Clean form
    
    return img

# Create demo screenshots
phishing_demo = create_fake_phishing_screenshot()
phishing_demo.save(PHISHING_SCREENSHOTS_DIR / "demo_phishing_1.png")

legitimate_demo = create_fake_legitimate_screenshot()
legitimate_demo.save(LEGITIMATE_SCREENSHOTS_DIR / "demo_legitimate_1.png")

print(f"\n✓ Created demo screenshots in {PHISHING_SCREENSHOTS_DIR} and {LEGITIMATE_SCREENSHOTS_DIR}")
print(f"Add more real screenshots, then train with: python train_screenshot_model.py")
