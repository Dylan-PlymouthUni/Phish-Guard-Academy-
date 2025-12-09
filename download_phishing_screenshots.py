#!/usr/bin/env python3
"""Download phishing screenshots from PhishTank API."""

import requests
import json
import time
from pathlib import Path
from PIL import Image
import io

PHISHING_DIR = Path("data/screenshots/phishing")
LEGITIMATE_DIR = Path("data/screenshots/legitimate")

PHISHING_DIR.mkdir(parents=True, exist_ok=True)
LEGITIMATE_DIR.mkdir(parents=True, exist_ok=True)

def download_phishtank_screenshots(limit=20):
    """Download phishing screenshots from PhishTank."""
    print("Fetching phishing URLs from PhishTank...")
    
    # PhishTank verified phish feed (JSON)
    url = "http://data.phishtank.com/data/online-valid.json"
    headers = {"User-Agent": "PhishGuard-Research/1.0"}
    
    try:
        resp = requests.get(url, headers=headers, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        
        print(f"✓ Fetched {len(data)} verified phishing URLs")
        
        # Take screenshots using screenshot service
        count = 0
        for entry in data[:limit]:
            if count >= limit:
                break
                
            phish_url = entry.get("url", "")
            phish_id = entry.get("phish_id", count)
            
            if not phish_url:
                continue
            
            # Use screenshot.rocks API (free, no auth required)
            screenshot_url = f"https://api.screenshot.rocks/v1/web?url={requests.utils.quote(phish_url)}&width=1280&height=800"
            
            try:
                print(f"Downloading screenshot {count+1}/{limit}: {phish_url[:50]}...")
                img_resp = requests.get(screenshot_url, timeout=20)
                img_resp.raise_for_status()
                
                # Save screenshot
                img = Image.open(io.BytesIO(img_resp.content))
                img.save(PHISHING_DIR / f"phishing_{phish_id}.png")
                print(f"  ✓ Saved phishing_{phish_id}.png")
                count += 1
                
                time.sleep(2)  # Rate limiting
                
            except Exception as e:
                print(f"  ✗ Failed: {e}")
                continue
        
        print(f"\n✓ Downloaded {count} phishing screenshots")
        return count
        
    except Exception as e:
        print(f"❌ PhishTank fetch failed: {e}")
        return 0

def create_legitimate_screenshots(limit=20):
    """Create screenshots of legitimate sites."""
    legitimate_sites = [
        "https://www.paypal.com",
        "https://www.amazon.com",
        "https://www.google.com",
        "https://www.microsoft.com",
        "https://www.apple.com",
        "https://www.facebook.com",
        "https://www.twitter.com",
        "https://www.linkedin.com",
        "https://www.github.com",
        "https://www.stackoverflow.com",
        "https://www.reddit.com",
        "https://www.wikipedia.org",
        "https://www.youtube.com",
        "https://www.netflix.com",
        "https://www.spotify.com",
        "https://www.dropbox.com",
        "https://www.zoom.us",
        "https://www.slack.com",
        "https://www.adobe.com",
        "https://www.salesforce.com",
    ]
    
    print("\nDownloading legitimate site screenshots...")
    count = 0
    
    for i, site in enumerate(legitimate_sites[:limit]):
        screenshot_url = f"https://api.screenshot.rocks/v1/web?url={requests.utils.quote(site)}&width=1280&height=800"
        
        try:
            print(f"Downloading {i+1}/{min(limit, len(legitimate_sites))}: {site}...")
            resp = requests.get(screenshot_url, timeout=20)
            resp.raise_for_status()
            
            img = Image.open(io.BytesIO(resp.content))
            img.save(LEGITIMATE_DIR / f"legitimate_{i}.png")
            print(f"  ✓ Saved legitimate_{i}.png")
            count += 1
            
            time.sleep(2)  # Rate limiting
            
        except Exception as e:
            print(f"  ✗ Failed: {e}")
            continue
    
    print(f"\n✓ Downloaded {count} legitimate screenshots")
    return count

if __name__ == "__main__":
    print("=== PhishGuard Screenshot Collector ===\n")
    
    phishing_count = download_phishtank_screenshots(limit=10)
    legitimate_count = create_legitimate_screenshots(limit=10)
    
    print(f"\n📊 Total screenshots collected:")
    print(f"  Phishing: {phishing_count}")
    print(f"  Legitimate: {legitimate_count}")
    
    if phishing_count >= 5 and legitimate_count >= 5:
        print("\n✅ Ready to train! Run: python train_screenshot_model.py")
    else:
        print(f"\n⚠️  Need at least 5 of each. Got {phishing_count} phishing, {legitimate_count} legitimate")
