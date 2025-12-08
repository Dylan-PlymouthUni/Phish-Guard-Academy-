#!/usr/bin/env python3
"""Generate a comprehensive phishing dataset with realistic features."""

import random
import pandas as pd
from pathlib import Path

# Legitimate domains (trusted)
LEGITIMATE_URLS = [
    "https://google.com", "https://github.com", "https://microsoft.com",
    "https://amazon.com", "https://facebook.com", "https://apple.com",
    "https://twitter.com", "https://linkedin.com", "https://youtube.com",
    "https://wikipedia.org", "https://reddit.com", "https://stackoverflow.com",
    "https://paypal.com", "https://netflix.com", "https://dropbox.com",
    "https://zoom.us", "https://slack.com", "https://gmail.com",
]

# Phishing patterns (suspicious)
PHISHING_PATTERNS = [
    "http://paypal-secure{}.co", "http://verify-account{}.tk",
    "http://bank-update{}.com", "http://login-secure{}.net",
    "http://urgent-verify{}.xyz", "http://confirm-identity{}.top",
    "http://free-prize{}.win", "http://amazon-refund{}.co",
    "http://apple-verify{}.info", "http://microsoft-login{}.online",
    "http://facebook-security{}.work", "http://paypal{}-verify.ru",
]

def extract_features(url: str, is_phishing: bool) -> dict:
    """Extract comprehensive features from URL."""
    import re
    from urllib.parse import urlparse
    
    parsed = urlparse(url)
    host = (parsed.hostname or "").lower()
    path = parsed.path or ""
    
    # Add noise to make dataset realistic
    if is_phishing:
        # Phishing URLs have more suspicious characteristics
        url_length = len(url) + random.randint(10, 50)
        domain_length = len(host) + random.randint(5, 15)
        subdomain_count = host.count(".") + random.randint(0, 2)
        has_https = 0 if random.random() < 0.8 else 1
        has_suspicious_tokens = 1 if random.random() < 0.9 else 0
        special_char_count = url.count("-") + url.count("_") + random.randint(2, 8)
        digit_count = sum(c.isdigit() for c in url) + random.randint(1, 5)
        path_length = len(path) + random.randint(20, 80)
    else:
        # Legitimate URLs are cleaner
        url_length = len(url) + random.randint(-5, 10)
        domain_length = len(host) + random.randint(-2, 5)
        subdomain_count = host.count(".")
        has_https = 1 if random.random() < 0.9 else 0
        has_suspicious_tokens = 0 if random.random() < 0.9 else 1
        special_char_count = url.count("-") + url.count("_")
        digit_count = sum(c.isdigit() for c in url)
        path_length = len(path)
    
    return {
        "url_length": max(10, url_length),
        "domain_length": max(5, domain_length),
        "subdomain_count": max(0, subdomain_count),
        "has_https": has_https,
        "has_suspicious_tokens": has_suspicious_tokens,
        "special_char_count": max(0, special_char_count),
        "digit_count": max(0, digit_count),
        "path_length": max(0, path_length),
    }

def generate_dataset(n_samples: int = 2000) -> pd.DataFrame:
    """Generate balanced dataset with phishing and legitimate URLs."""
    data = []
    
    # Generate legitimate samples
    for _ in range(n_samples // 2):
        url = random.choice(LEGITIMATE_URLS)
        if random.random() > 0.3:
            url += "/" + "".join(random.choices("abcdefghijklmnopqrstuvwxyz", k=random.randint(5, 15)))
        features = extract_features(url, is_phishing=False)
        features["label"] = "legitimate"
        data.append(features)
    
    # Generate phishing samples
    for _ in range(n_samples // 2):
        pattern = random.choice(PHISHING_PATTERNS)
        url = pattern.format(random.randint(1, 999))
        if random.random() > 0.4:
            url += "/verify?id=" + "".join(random.choices("0123456789abcdef", k=16))
        features = extract_features(url, is_phishing=True)
        features["label"] = "phishing"
        data.append(features)
    
    return pd.DataFrame(data)

if __name__ == "__main__":
    print("🔧 Generating comprehensive phishing dataset...")
    df = generate_dataset(n_samples=2000)
    
    # Shuffle
    df = df.sample(frac=1, random_state=42).reset_index(drop=True)
    
    print(f"✓ Generated {len(df)} samples")
    print(f"  - Legitimate: {len(df[df['label'] == 'legitimate'])}")
    print(f"  - Phishing: {len(df[df['label'] == 'phishing'])}")
    print("\nSample data (first 10 rows):")
    print(df.head(10).to_string(index=False))
    
    # Save as CSV
    csv_path = Path("data/phishing_dataset.csv")
    df.to_csv(csv_path, index=False)
    print(f"\n✓ Saved CSV to {csv_path}")
    
    # Convert to ARFF format
    arff_path = Path("data/combined_features.arff")
    
    with open(arff_path, 'w') as f:
        f.write("@relation phishing\n\n")
        f.write("@attribute url_length numeric\n")
        f.write("@attribute domain_length numeric\n")
        f.write("@attribute subdomain_count numeric\n")
        f.write("@attribute has_https {0,1}\n")
        f.write("@attribute has_suspicious_tokens {0,1}\n")
        f.write("@attribute special_char_count numeric\n")
        f.write("@attribute digit_count numeric\n")
        f.write("@attribute path_length numeric\n")
        f.write("@attribute label {legitimate,phishing}\n\n")
        f.write("@data\n")
        
        for _, row in df.iterrows():
            f.write(f"{row['url_length']},{row['domain_length']},{row['subdomain_count']},")
            f.write(f"{row['has_https']},{row['has_suspicious_tokens']},")
            f.write(f"{row['special_char_count']},{row['digit_count']},{row['path_length']},")
            f.write(f"{row['label']}\n")
    
    print(f"✓ Saved ARFF to {arff_path}")
    print("\n🎉 Dataset generation complete!")
