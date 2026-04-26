#!/usr/bin/env python3
"""
Step 1-4: Acquire, format, and merge legitimate URLs with phishing dataset
This script collects legitimate URLs from the Majestic Million dataset, formats them, and merges them with a phishing dataset to create a comprehensive training dataset for the URL phishing detection model.
The script checks for existing datasets to avoid redundant work, and it includes fallback mechanisms to ensure that
a sufficient number of legitimate URLs are included in the final dataset. The resulting dataset is saved as url_dataset_full.csv, which is used for training the ML models in subsequent steps.
"""
import pandas as pd
import os

def main():
    """Run the main CLI workflow for this module."""
    print("=" * 70)
    print("STEP 1-4: Dataset Preparation")
    print("=" * 70)
    
    # Check if we need to download more legitimate URLs
    tranco_file = "tranco_top.csv"
    majestic_file = "majestic_million.csv"
    legit_raw = "legitimate_urls_raw.txt"
    
    # Check current dataset
    if os.path.exists("data/training/url_dataset_full.csv"):
        df_current = pd.read_csv("data/training/url_dataset_full.csv")
        print(f"\n📊 Current dataset: {len(df_current)} total URLs")
        print(df_current['label'].value_counts())
        
        legit_count = (df_current['label'] == 0).sum()
        phish_count = (df_current['label'] == 1).sum()
        
        print(f"\n   Legitimate (label=0): {legit_count}")
        print(f"   Phishing (label=1): {phish_count}")
        
        if legit_count >= 100:
            print("\n✅ Already have sufficient legitimate URLs!")
            return df_current
    
    # Step 1: Acquire legitimate URLs from Majestic Million
    print(f"\n📥 Step 1: Acquiring legitimate URLs...")
    
    if os.path.exists(majestic_file):
        print(f"   Using existing {majestic_file}")
        try:
            majestic_df = pd.read_csv(majestic_file)
            # Extract top 500 domains (skip header row if needed)
            if 'Domain' in majestic_df.columns:
                domains = majestic_df['Domain'].head(500).tolist()
            else:
                # Assume third column is domain
                domains = majestic_df.iloc[:500, 2].tolist()
            
            # Format as URLs
            urls = [f"https://{d}" if not d.startswith('http') else d for d in domains]
            
            with open(legit_raw, 'w') as f:
                for url in urls:
                    f.write(f"{url}\n")
            
            print(f"   ✅ Extracted {len(urls)} legitimate URLs to {legit_raw}")
        except Exception as e:
            print(f"   ⚠️  Error reading Majestic file: {e}")
            print("   Using fallback curated list...")
            create_fallback_list(legit_raw)
    else:
        print(f"   {majestic_file} not found, using fallback curated list...")
        create_fallback_list(legit_raw)
    
    # Step 2: Format and label legitimate URLs
    print(f"\n📝 Step 2: Formatting and labeling legitimate URLs...")
    
    with open(legit_raw, 'r') as f:
        urls = [line.strip() for line in f if line.strip()]
    
    # Ensure URLs are properly formatted
    urls = [url if url.startswith('http') else f'https://{url}' for url in urls]
    
    legit_df = pd.DataFrame({'url': urls, 'label': 0})
    legit_df.to_csv('data/training/legitimate_urls.csv', index=False)
    print(f"   ✅ Created legitimate_urls.csv with {len(legit_df)} entries")
    
    # Step 3-4: Merge with phishing dataset
    print(f"\n🔗 Step 3-4: Merging with phishing dataset...")
    
    # Find phishing data
    phishing_sources = [
        'data/training/phishing_urls.csv',
        'data/training/url_dataset.csv',
        'data/phishing_dataset.csv',
        'data/real_phishing_dataset.csv'
    ]
    
    phishing_df = None
    for source in phishing_sources:
        if os.path.exists(source):
            try:
                temp_df = pd.read_csv(source)
                if 'label' in temp_df.columns:
                    phishing_df = temp_df[temp_df['label'] == 1]
                    if len(phishing_df) > 0:
                        print(f"   Loaded {len(phishing_df)} phishing URLs from {source}")
                        break
                elif 'url' in temp_df.columns:
                    # Assume all are phishing
                    temp_df['label'] = 1
                    phishing_df = temp_df
                    print(f"   Loaded {len(phishing_df)} phishing URLs from {source}")
                    break
            except Exception as e:
                print(f"   ⚠️  Couldn't read {source}: {e}")
                continue
    
    if phishing_df is None or len(phishing_df) == 0:
        print("   ⚠️  No phishing data found. Creating sample phishing URLs...")
        phishing_df = create_sample_phishing()
    
    # Combine datasets
    combined_df = pd.concat([phishing_df[['url', 'label']], legit_df], ignore_index=True)
    
    # Shuffle
    combined_df = combined_df.sample(frac=1, random_state=42).reset_index(drop=True)
    
    # Save
    combined_df.to_csv('data/training/url_dataset_full.csv', index=False)
    
    print(f"\n✅ Created url_dataset_full.csv with {len(combined_df)} total URLs")
    print("\n   Label distribution:")
    print(combined_df['label'].value_counts())
    
    return combined_df


def create_fallback_list(filename):
    """Create a curated list of safe domains"""
    legitimate_domains = [
        # Major tech companies
        "google.com", "youtube.com", "facebook.com", "wikipedia.org", "amazon.com",
        "twitter.com", "instagram.com", "linkedin.com", "reddit.com", "apple.com",
        "microsoft.com", "github.com", "stackoverflow.com", "medium.com", "netflix.com",
        
        # UK sites
        "bbc.co.uk", "nhs.uk", "gov.uk", "theguardian.com", "bbc.com",
        
        # General websites
        "cnn.com", "nytimes.com", "wsj.com", "reuters.com", "bloomberg.com",
        
        # Education
        "mit.edu", "stanford.edu", "harvard.edu", "ox.ac.uk", "cam.ac.uk",
        
        # E-commerce
        "ebay.com", "walmart.com", "target.com", "bestbuy.com", "etsy.com",
        
        # Tech & Development
        "python.org", "nodejs.org", "docker.com", "kubernetes.io", "gitlab.com",
        "npmjs.com", "pypi.org", "ubuntu.com", "debian.org", "mozilla.org",
        
        # Cloud services
        "aws.amazon.com", "azure.microsoft.com", "cloud.google.com", "heroku.com",
        
        # Financial (legitimate)
        "paypal.com", "stripe.com", "bankofamerica.com", "chase.com", "wellsfargo.com",
        
        # Social & Communication
        "zoom.us", "slack.com", "discord.com", "telegram.org", "whatsapp.com",
        
        # Search & Browsers
        "bing.com", "yahoo.com", "duckduckgo.com", "brave.com", "opera.com",
        
        # Entertainment
        "spotify.com", "twitch.tv", "hulu.com", "disneyplus.com", "hbomax.com",
        
        # Shopping
        "alibaba.com", "aliexpress.com", "shopify.com", "squarespace.com",
        
        # Government & Organizations
        "whitehouse.gov", "irs.gov", "usa.gov", "un.org", "who.int",
        
        # Additional popular sites
        "pinterest.com", "tumblr.com", "wordpress.com", "blogger.com", "wix.com",
        "dropbox.com", "box.com", "onedrive.live.com", "icloud.com",
        "adobe.com", "canva.com", "figma.com", "notion.so", "trello.com",
        "salesforce.com", "oracle.com", "ibm.com", "cisco.com", "intel.com",
        "samsung.com", "sony.com", "lg.com", "hp.com", "dell.com",
        
        # More UK sites
        "sky.com", "bt.com", "vodafone.co.uk", "tesco.com", "sainsburys.co.uk",
        
        # Educational resources
        "coursera.org", "udemy.com", "khanacademy.org", "edx.org", "udacity.com",
        
        # Science & Research
        "nature.com", "sciencedirect.com", "pubmed.gov", "arxiv.org", "scholar.google.com",
        
        # More domains to reach 100+
        "vimeo.com", "soundcloud.com", "bandcamp.com", "mixcloud.com",
        "researchgate.net", "academia.edu", "mendeley.com", "orcid.org",
        "ieee.org", "acm.org", "springer.com", "wiley.com", "elsevier.com",
        "booking.com", "airbnb.com", "tripadvisor.com", "expedia.com",
        "imdb.com", "rottentomatoes.com", "metacritic.com", "gamespot.com",
        "ign.com", "polygon.com", "kotaku.com", "eurogamer.net",
        "weather.com", "accuweather.com", "wunderground.com",
        "maps.google.com", "openstreetmap.org", "mapquest.com",
    ]
    
    with open(filename, 'w') as f:
        for domain in legitimate_domains:
            url = f"https://{domain}" if not domain.startswith('http') else domain
            f.write(f"{url}\n")
    
    print(f"   ✅ Created fallback list with {len(legitimate_domains)} domains")


def create_sample_phishing():
    """Create sample phishing URLs as fallback"""
    sample_phishing = [
        "http://secure-paypaI.com/verify",  # PayPal with capital i
        "https://amaz0n-security.com/update",
        "http://appleid-unlock.tk/account",
        "https://microsoft-support.xyz/login",
        "http://chase-secure.ml/verify",
        "https://wellsfargo-alert.ga/confirm",
    ]
    return pd.DataFrame({'url': sample_phishing, 'label': 1})


if __name__ == "__main__":
    df = main()
    print("\n" + "=" * 70)
    print("Dataset preparation complete!")
    print("=" * 70)
