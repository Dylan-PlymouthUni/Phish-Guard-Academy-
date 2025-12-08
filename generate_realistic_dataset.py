#!/usr/bin/env python3
"""Generate realistic phishing dataset based on actual attack patterns."""

import random
import pandas as pd
from pathlib import Path
import re
from urllib.parse import urlparse

# Real legitimate domains
LEGITIMATE_DOMAINS = [
    "google.com", "github.com", "microsoft.com", "amazon.com", 
    "facebook.com", "apple.com", "twitter.com", "linkedin.com",
    "youtube.com", "wikipedia.org", "reddit.com", "stackoverflow.com",
    "paypal.com", "netflix.com", "dropbox.com", "zoom.us",
    "slack.com", "gmail.com", "outlook.com", "espn.com",
    "cnn.com", "bbc.com", "nytimes.com", "walmart.com"
]

# Real phishing patterns (typosquatting, homograph, subdomain abuse)
PHISHING_TEMPLATES = [
    # Typosquatting
    "paypa1.com", "g00gle.com", "micros0ft.com", "arnaz0n.com",
    # Subdomain abuse  
    "paypal.verify-account.com", "login.microsoft-secure.net",
    "apple.id-verify.com", "amazon.refund-center.co",
    # Suspicious TLDs
    "paypal-secure.tk", "bank-login.xyz", "verify-account.top",
    # Homograph/lookalike
    "rnicrosoft.com", "paypa1-secure.com", "goog1e-login.com",
    # IP-based
    "192.168.1.100", "10.0.0.1/login",
]

def generate_legitimate_url() -> str:
    """Generate realistic legitimate URL."""
    domain = random.choice(LEGITIMATE_DOMAINS)
    use_https = random.random() < 0.95  # 95% use HTTPS
    
    paths = ["", "/about", "/products", "/contact", "/help", "/docs", "/blog"]
    path = random.choice(paths)
    
    protocol = "https://" if use_https else "http://"
    return f"{protocol}{domain}{path}"

def generate_phishing_url() -> str:
    """Generate realistic phishing URL."""
    patterns = [
        lambda: f"http://{random.choice(PHISHING_TEMPLATES)}",
        lambda: f"http://verify-{random.choice(['paypal', 'bank', 'account'])}{random.randint(1,999)}.tk",
        lambda: f"http://{random.choice(['secure', 'login', 'verify'])}-{random.choice(['paypal', 'microsoft', 'apple'])}.co",
        lambda: f"http://{random.choice(['paypal', 'amazon', 'apple'])}-{random.choice(['secure', 'verify', 'update'])}.{random.choice(['tk', 'xyz', 'top', 'co'])}",
    ]
    
    url = random.choice(patterns)()
    
    # Add suspicious paths
    if random.random() > 0.4:
        suspicious_paths = ["/login", "/verify", "/secure", "/account/update", "/confirm"]
        url += random.choice(suspicious_paths)
        if random.random() > 0.5:
            url += f"?id={''.join(random.choices('0123456789abcdef', k=16))}"
    
    return url

def extract_features(url: str, is_phishing: bool) -> dict:
    """Extract features from URL (same as api.py)."""
    u = url.strip().rstrip('.,;:)\'"')
    parsed = urlparse(u if u.startswith("http") else ("http://" + u))
    host = (parsed.hostname or "").lower()
    path = parsed.path or ""
    
    return {
        "url_length": len(u),
        "domain_length": len(host),
        "subdomain_count": host.count(".") - 1 if host else 0,
        "has_https": 1 if u.lower().startswith("https") else 0,
        "has_suspicious_tokens": 1 if re.search(r"(login|verify|secure|account|update|confirm|bank|paypal|free|urgent|reward)", u, re.I) else 0,
        "special_char_count": u.count("-") + u.count("_"),
        "digit_count": sum(c.isdigit() for c in u),
        "path_length": len(path),
        "label": "phishing" if is_phishing else "legitimate"
    }

def generate_dataset(n_samples: int = 3000) -> pd.DataFrame:
    """Generate balanced dataset."""
    data = []
    
    # Generate legitimate samples
    for _ in range(n_samples // 2):
        url = generate_legitimate_url()
        data.append(extract_features(url, is_phishing=False))
    
    # Generate phishing samples
    for _ in range(n_samples // 2):
        url = generate_phishing_url()
        data.append(extract_features(url, is_phishing=True))
    
    df = pd.DataFrame(data)
    return df.sample(frac=1, random_state=42).reset_index(drop=True)

if __name__ == "__main__":
    print("🔧 Generating realistic phishing dataset...")
    df = generate_dataset(n_samples=3000)
    
    print(f"✓ Generated {len(df)} samples")
    print(f"  - Legitimate: {len(df[df['label'] == 'legitimate'])}")
    print(f"  - Phishing: {len(df[df['label'] == 'phishing'])}")
    
    print("\n📊 Feature Statistics:")
    print(df.groupby('label').mean().round(2))
    
    print("\n🔍 Sample URLs:")
    print("\nLegitimate examples:")
    print(df[df['label'] == 'legitimate'].head(5)[['url_length', 'has_https', 'special_char_count', 'has_suspicious_tokens']])
    print("\nPhishing examples:")
    print(df[df['label'] == 'phishing'].head(5)[['url_length', 'has_https', 'special_char_count', 'has_suspicious_tokens']])
    
    # Save CSV
    csv_path = Path("data/phishing_dataset.csv")
    df.to_csv(csv_path, index=False)
    print(f"\n✓ Saved to {csv_path}")
    
    # Save ARFF
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
    
    print(f"✓ Saved to {arff_path}")
    print("\n🎉 Realistic dataset generation complete!")
