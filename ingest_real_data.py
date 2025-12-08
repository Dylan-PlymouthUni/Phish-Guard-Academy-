#!/usr/bin/env python3
"""Ingest real phishing/benign URLs from public feeds."""

import requests
import pandas as pd
from pathlib import Path
import time

def fetch_openphish_urls(limit=1000):
    """Fetch recent phishing URLs from OpenPhish."""
    try:
        resp = requests.get("https://openphish.com/feed.txt", timeout=10)
        urls = resp.text.strip().split('\n')[:limit]
        return [(u, "phishing") for u in urls if u and u.startswith(("http://", "https://"))]
    except Exception as e:
        print(f"OpenPhish fetch failed: {e}")
        return []

def fetch_alexa_benign_urls(limit=1000):
    """Fetch benign URLs from Cisco Umbrella top 1M (free, no auth needed)."""
    try:
        # Cisco Umbrella 1M list (public, no auth)
        resp = requests.get("https://s3-us-west-1.amazonaws.com/umbrella-static/top-1m.csv.zip", timeout=15)
        import zipfile
        import io
        
        zf = zipfile.ZipFile(io.BytesIO(resp.content))
        with zf.open("top-1m.csv") as f:
            lines = f.read().decode("utf-8").strip().split('\n')[:limit]
        
        # Format: rank,domain
        urls = [f"https://{line.split(',')[1]}" for line in lines[1:] if ',' in line]
        return [(u, "legitimate") for u in urls if u]
    except Exception as e:
        print(f"Umbrella fetch failed: {e}, trying fallback...")
        # Fallback: use common legitimate domains
        fallback = [
            "https://google.com", "https://github.com", "https://microsoft.com",
            "https://amazon.com", "https://facebook.com", "https://apple.com",
            "https://twitter.com", "https://linkedin.com", "https://youtube.com",
            "https://wikipedia.org", "https://reddit.com", "https://stackoverflow.com",
            "https://paypal.com", "https://netflix.com", "https://dropbox.com",
            "https://zoom.us", "https://slack.com", "https://gmail.com",
            "https://outlook.com", "https://espn.com", "https://cnn.com",
        ]
        return [(u, "legitimate") for u in fallback]

if __name__ == "__main__":
    print("Fetching real phishing/benign data...")
    phishing = fetch_openphish_urls(1500)
    benign = fetch_alexa_benign_urls(1500)
    
    print(f"✓ Fetched {len(phishing)} phishing URLs")
    print(f"✓ Fetched {len(benign)} benign URLs")
    
    if not phishing or not benign:
        print("❌ Failed to fetch data")
        exit(1)
    
    data = phishing + benign
    df = pd.DataFrame(data, columns=["url", "label"])
    
    # Extract features
    print("Extracting features...")
    from ml.api import extract_url_features
    features = df["url"].apply(extract_url_features)
    features_df = pd.DataFrame(list(features))
    features_df["label"] = df["label"]
    
    # Save dataset
    Path("data").mkdir(parents=True, exist_ok=True)
    features_df.to_csv("data/real_phishing_dataset.csv", index=False)
    print(f"✓ Saved {len(features_df)} samples to data/real_phishing_dataset.csv")
    print(f"  Phishing: {len(features_df[features_df['label']=='phishing'])}")
    print(f"  Benign: {len(features_df[features_df['label']=='legitimate'])}")
    
    # Show stats
    print("\n📊 Feature statistics:")
    print(features_df.groupby("label")[["url_length", "has_https", "has_suspicious_tokens"]].mean().round(2))
