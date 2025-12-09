#!/usr/bin/env python3
"""Collect real phishing/legitimate screenshots using Selenium."""

import time
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

PHISHING_DIR = Path("data/screenshots/phishing")
LEGITIMATE_DIR = Path("data/screenshots/legitimate")

PHISHING_DIR.mkdir(parents=True, exist_ok=True)
LEGITIMATE_DIR.mkdir(parents=True, exist_ok=True)

def setup_driver():
    """Setup headless Chrome for screenshots."""
    options = Options()
    options.add_argument("--headless")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=1280,800")
    options.add_argument("--disable-gpu")
    
    service = Service(ChromeDriverManager().install())
    return webdriver.Chrome(service=service, options=options)

def take_screenshot(driver, url, output_path):
    """Take screenshot of URL."""
    try:
        print(f"  Capturing: {url}...")
        driver.get(url)
        time.sleep(3)  # Wait for page load
        driver.save_screenshot(str(output_path))
        print(f"  ✓ Saved {output_path.name}")
        return True
    except Exception as e:
        print(f"  ✗ Failed: {e}")
        return False

# LEGITIMATE SITES (known safe, for training)
LEGITIMATE_URLS = [
    "https://www.paypal.com",
    "https://www.amazon.com",
    "https://www.google.com/accounts",
    "https://www.microsoft.com/account",
    "https://www.apple.com/shop",
    "https://www.facebook.com",
    "https://www.linkedin.com",
    "https://github.com/login",
    "https://www.netflix.com",
    "https://www.dropbox.com",
]

# PHISHING-LIKE URLs (for demo - use real phishing URLs from PhishTank in production)
DEMO_PHISHING_URLS = [
    "http://paypal-verify.tk",
    "http://amazon-secure.ml",
    "http://account-recovery.ga",
    "http://login-verify.cf",
    "http://secure-paypal.gq",
]

if __name__ == "__main__":
    print("=== PhishGuard Screenshot Collector (Selenium) ===\n")
    print("Setting up Chrome driver...")
    
    try:
        driver = setup_driver()
        print("✓ Chrome driver ready\n")
        
        # Collect legitimate screenshots
        print("Collecting LEGITIMATE screenshots...")
        legit_count = 0
        for i, url in enumerate(LEGITIMATE_URLS):
            if take_screenshot(driver, url, LEGITIMATE_DIR / f"legitimate_{i}.png"):
                legit_count += 1
            time.sleep(1)
        
        # Collect phishing screenshots (demo URLs - replace with real ones)
        print("\nCollecting PHISHING screenshots (demo URLs)...")
        phish_count = 0
        for i, url in enumerate(DEMO_PHISHING_URLS):
            if take_screenshot(driver, url, PHISHING_DIR / f"phishing_{i}.png"):
                phish_count += 1
            time.sleep(1)
        
        driver.quit()
        
        print(f"\n📊 Total screenshots collected:")
        print(f"  Legitimate: {legit_count}")
        print(f"  Phishing (demo): {phish_count}")
        
        if legit_count + phish_count >= 10:
            print("\n✅ Ready to train! Run: python train_screenshot_model.py")
        else:
            print(f"\n⚠️  Need at least 10 total. Got {legit_count + phish_count}")
        
    except Exception as e:
        print(f"❌ Setup failed: {e}")
        print("\nTrying alternative: manually add screenshots to data/screenshots/")
