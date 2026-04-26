#!/usr/bin/env python3
"""
Collect Real Phishing Data from Multiple Sources
- PhishTank API
- OpenPhish feed
- URLhaus (abuse.ch)
- Legitimate URLs from Alexa/Tranco top sites
This script collects real phishing URLs from multiple sources and saves them to files for training.
It also collects a set of legitimate URLs to balance the dataset. The collected data is saved in a structured format for easy use in training ML models.
"""
import sys
import requests
import json
import csv
import time
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Tuple
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Data directories
DATA_DIR = Path("data/training")
DATA_DIR.mkdir(parents=True, exist_ok=True)

class PhishingDataCollector:
    """Collect phishing and legitimate URLs from multiple sources"""
    
    def __init__(self):
        """Initialize class state and store required dependencies."""
        self.phishing_urls = []
        self.legitimate_urls = []
        
    def collect_phishtank(self, limit: int = 1000) -> List[str]:
        """Collect from PhishTank (free, no API key needed for online data)"""
        logger.info("Collecting from PhishTank...")
        
        try:
            # PhishTank online JSON feed (last 1 hour)
            url = "http://data.phishtank.com/data/online-valid.json"
            
            logger.info(f"Downloading from {url}...")
            response = requests.get(url, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                urls = [entry['url'] for entry in data[:limit]]
                logger.info(f"✅ Collected {len(urls)} phishing URLs from PhishTank")
                return urls
            else:
                logger.warning(f"PhishTank returned status {response.status_code}")
                return []
                
        except Exception as e:
            logger.error(f"Failed to collect from PhishTank: {e}")
            return []
    
    def collect_openphish(self, limit: int = 1000) -> List[str]:
        """Collect from OpenPhish feed"""
        logger.info("Collecting from OpenPhish...")
        
        try:
            url = "https://openphish.com/feed.txt"
            response = requests.get(url, timeout=30)
            
            if response.status_code == 200:
                urls = response.text.strip().split('\n')[:limit]
                logger.info(f"✅ Collected {len(urls)} phishing URLs from OpenPhish")
                return urls
            else:
                logger.warning(f"OpenPhish returned status {response.status_code}")
                return []
                
        except Exception as e:
            logger.error(f"Failed to collect from OpenPhish: {e}")
            return []
    
    def collect_urlhaus(self, limit: int = 500) -> List[str]:
        """Collect from URLhaus (malware/phishing URLs)"""
        logger.info("Collecting from URLhaus...")
        
        try:
            url = "https://urlhaus.abuse.ch/downloads/csv_recent/"
            response = requests.get(url, timeout=30)
            
            if response.status_code == 200:
                lines = response.text.strip().split('\n')
                urls = []
                
                for line in lines:
                    if line.startswith('#') or not line.strip():
                        continue
                    try:
                        parts = line.split(',')
                        if len(parts) > 2:
                            url_field = parts[2].strip('"')
                            if url_field.startswith('http'):
                                urls.append(url_field)
                    except:
                        continue
                
                urls = urls[:limit]
                logger.info(f"✅ Collected {len(urls)} malicious URLs from URLhaus")
                return urls
            else:
                logger.warning(f"URLhaus returned status {response.status_code}")
                return []
                
        except Exception as e:
            logger.error(f"Failed to collect from URLhaus: {e}")
            return []
    
    def collect_legitimate_tranco(self, limit: int = 5000) -> List[str]:
        """Collect legitimate URLs from Tranco top sites list"""
        logger.info("Collecting legitimate URLs from Tranco...")
        
        try:
            # Tranco top 1M sites (updated daily)
            url = "https://tranco-list.eu/download/JJPQ/1000000"
            response = requests.get(url, timeout=60)
            
            if response.status_code == 200:
                lines = response.text.strip().split('\n')
                domains = []
                
                for line in lines[:limit]:
                    try:
                        rank, domain = line.split(',')
                        # Add https by default
                        domains.append(f"https://{domain.strip()}")
                    except:
                        continue
                
                logger.info(f"✅ Collected {len(domains)} legitimate URLs from Tranco")
                return domains
            else:
                logger.warning(f"Tranco returned status {response.status_code}")
                return []
                
        except Exception as e:
            logger.error(f"Failed to collect from Tranco: {e}")
            return []
    
    def collect_legitimate_common(self) -> List[str]:
        """Fallback: Common legitimate domains"""
        logger.info("Using common legitimate domains as fallback...")
        
        common_sites = [
            "https://google.com", "https://youtube.com", "https://facebook.com",
            "https://amazon.com", "https://wikipedia.org", "https://twitter.com",
            "https://instagram.com", "https://linkedin.com", "https://reddit.com",
            "https://netflix.com", "https://github.com", "https://stackoverflow.com",
            "https://microsoft.com", "https://apple.com", "https://ebay.com",
            "https://cnn.com", "https://bbc.com", "https://nytimes.com",
            "https://yahoo.com", "https://bing.com", "https://paypal.com",
        ]
        
        # Generate variations
        urls = []
        for site in common_sites:
            urls.append(site)
            urls.append(site + "/home")
            urls.append(site + "/about")
            urls.append(site + "/contact")
        
        logger.info(f"✅ Generated {len(urls)} legitimate URLs")
        return urls
    
    def collect_all(self) -> Tuple[List[str], List[str]]:
        """Collect from all sources"""
        logger.info("=" * 60)
        logger.info("Starting data collection from all sources...")
        logger.info("=" * 60)
        
        # Collect phishing URLs
        phishing = []
        phishing.extend(self.collect_phishtank(limit=1000))
        time.sleep(2)  # Be nice to servers
        
        phishing.extend(self.collect_openphish(limit=1000))
        time.sleep(2)
        
        phishing.extend(self.collect_urlhaus(limit=500))
        
        # Remove duplicates
        phishing = list(set(phishing))
        logger.info(f"\n📊 Total phishing URLs collected: {len(phishing)}")
        
        # Collect legitimate URLs
        legitimate = self.collect_legitimate_tranco(limit=5000)
        
        if len(legitimate) < 100:
            logger.warning("Tranco collection failed, using fallback...")
            legitimate = self.collect_legitimate_common()
        
        legitimate = list(set(legitimate))
        logger.info(f"📊 Total legitimate URLs collected: {len(legitimate)}")
        
        self.phishing_urls = phishing
        self.legitimate_urls = legitimate
        
        return phishing, legitimate
    
    def save_datasets(self, phishing: List[str], legitimate: List[str]):
        """Save datasets to files"""
        logger.info("\nSaving datasets...")
        
        # Save raw URLs
        phishing_file = DATA_DIR / "phishing_urls.txt"
        with open(phishing_file, 'w') as f:
            f.write('\n'.join(phishing))
        logger.info(f"✅ Saved {len(phishing)} phishing URLs to {phishing_file}")
        
        legitimate_file = DATA_DIR / "legitimate_urls.txt"
        with open(legitimate_file, 'w') as f:
            f.write('\n'.join(legitimate))
        logger.info(f"✅ Saved {len(legitimate)} legitimate URLs to {legitimate_file}")
        
        # Save combined CSV for training
        csv_file = DATA_DIR / "url_dataset.csv"
        with open(csv_file, 'w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(['url', 'label'])  # header
            
            for url in phishing:
                writer.writerow([url, 1])  # 1 = phishing
            
            for url in legitimate:
                writer.writerow([url, 0])  # 0 = legitimate
        
        logger.info(f"✅ Saved combined dataset to {csv_file}")
        
        # Save metadata
        metadata = {
            'collection_date': datetime.now().isoformat(),
            'total_phishing': len(phishing),
            'total_legitimate': len(legitimate),
            'total_samples': len(phishing) + len(legitimate),
            'sources': ['PhishTank', 'OpenPhish', 'URLhaus', 'Tranco'],
            'files': {
                'phishing': str(phishing_file),
                'legitimate': str(legitimate_file),
                'combined_csv': str(csv_file)
            }
        }
        
        metadata_file = DATA_DIR / "collection_metadata.json"
        with open(metadata_file, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        logger.info(f"✅ Saved metadata to {metadata_file}")


def main():
    """Run the main CLI workflow for this module."""
    print("🎣 Phish Guard Data Collection Pipeline")
    print("=" * 60)
    
    collector = PhishingDataCollector()
    
    try:
        # Collect data
        phishing, legitimate = collector.collect_all()
        
        if not phishing or not legitimate:
            logger.error("❌ Failed to collect sufficient data")
            sys.exit(1)
        
        # Save datasets
        collector.save_datasets(phishing, legitimate)
        
        print("\n" + "=" * 60)
        print("✅ Data collection complete!")
        print(f"📊 Dataset Summary:")
        print(f"   • Phishing URLs: {len(phishing)}")
        print(f"   • Legitimate URLs: {len(legitimate)}")
        print(f"   • Total samples: {len(phishing) + len(legitimate)}")
        print(f"   • Saved to: {DATA_DIR}")
        print("\n💡 Next step: Run train_url_model.py to train on this data")
        print("=" * 60)
        
    except KeyboardInterrupt:
        logger.info("\n⚠️  Collection interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"❌ Collection failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
