#!/usr/bin/env python3
"""
Phishing Dataset Collector
Collects real phishing data from multiple sources for model training
"""
import requests
import json
import csv
import time
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class PhishingDatasetCollector:
    """Collect phishing URLs and emails from public sources"""
    
    def __init__(self, output_dir: Path = Path("data/training")):
        self.output_dir = output_dir
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # API endpoints
        self.phishtank_url = "http://data.phishtank.com/data/online-valid.json"
        self.openphish_url = "https://openphish.com/feed.txt"
        
    def collect_phishtank_data(self, limit: int = 10000) -> List[Dict]:
        """Collect phishing URLs from PhishTank (free, no API key needed)"""
        logger.info("Fetching PhishTank data...")
        
        try:
            response = requests.get(self.phishtank_url, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            logger.info(f"Downloaded {len(data)} phishing URLs from PhishTank")
            
            # Extract relevant fields
            phishing_urls = []
            for entry in data[:limit]:
                phishing_urls.append({
                    'url': entry.get('url', ''),
                    'phish_id': entry.get('phish_id'),
                    'target': entry.get('target', 'unknown'),
                    'verified': entry.get('verified', False),
                    'submission_time': entry.get('submission_time'),
                    'source': 'phishtank',
                    'label': 1  # 1 = phishing
                })
            
            # Save to file
            output_file = self.output_dir / f"phishtank_urls_{datetime.now().strftime('%Y%m%d')}.json"
            with open(output_file, 'w') as f:
                json.dump(phishing_urls, f, indent=2)
            
            logger.info(f"Saved {len(phishing_urls)} PhishTank URLs to {output_file}")
            return phishing_urls
            
        except Exception as e:
            logger.error(f"Failed to fetch PhishTank data: {e}")
            return []
    
    def collect_openphish_data(self, limit: int = 5000) -> List[Dict]:
        """Collect phishing URLs from OpenPhish (free feed)"""
        logger.info("Fetching OpenPhish data...")
        
        try:
            response = requests.get(self.openphish_url, timeout=30)
            response.raise_for_status()
            
            urls = response.text.strip().split('\n')
            logger.info(f"Downloaded {len(urls)} phishing URLs from OpenPhish")
            
            phishing_urls = []
            for url in urls[:limit]:
                if url.strip():
                    phishing_urls.append({
                        'url': url.strip(),
                        'source': 'openphish',
                        'label': 1,  # 1 = phishing
                        'collection_date': datetime.now().isoformat()
                    })
            
            # Save to file
            output_file = self.output_dir / f"openphish_urls_{datetime.now().strftime('%Y%m%d')}.json"
            with open(output_file, 'w') as f:
                json.dump(phishing_urls, f, indent=2)
            
            logger.info(f"Saved {len(phishing_urls)} OpenPhish URLs to {output_file}")
            return phishing_urls
            
        except Exception as e:
            logger.error(f"Failed to fetch OpenPhish data: {e}")
            return []
    
    def collect_legitimate_urls(self) -> List[Dict]:
        """Generate legitimate URLs from popular websites"""
        logger.info("Generating legitimate URL dataset...")
        
        # Top legitimate domains (Alexa Top 100 subset)
        legitimate_domains = [
            'google.com', 'youtube.com', 'facebook.com', 'amazon.com', 'wikipedia.org',
            'twitter.com', 'instagram.com', 'linkedin.com', 'reddit.com', 'netflix.com',
            'microsoft.com', 'apple.com', 'github.com', 'stackoverflow.com', 'paypal.com',
            'ebay.com', 'cnn.com', 'bbc.com', 'nytimes.com', 'walmart.com',
            'target.com', 'bestbuy.com', 'chase.com', 'wellsfargo.com', 'bankofamerica.com',
            'citibank.com', 'usps.com', 'fedex.com', 'ups.com', 'adobe.com',
            'salesforce.com', 'zoom.us', 'dropbox.com', 'spotify.com', 'twitch.tv',
            'yahoo.com', 'bing.com', 'craigslist.org', 'etsy.com', 'zillow.com',
            'indeed.com', 'glassdoor.com', 'expedia.com', 'booking.com', 'airbnb.com',
            'uber.com', 'lyft.com', 'doordash.com', 'grubhub.com', 'postmates.com'
        ]
        
        legitimate_urls = []
        
        # Generate various legitimate URL patterns
        for domain in legitimate_domains:
            # Homepage
            legitimate_urls.append({
                'url': f'https://{domain}/',
                'domain': domain,
                'source': 'curated_legitimate',
                'label': 0,  # 0 = legitimate
                'type': 'homepage'
            })
            
            # Login pages (legitimate)
            legitimate_urls.append({
                'url': f'https://{domain}/login',
                'domain': domain,
                'source': 'curated_legitimate',
                'label': 0,
                'type': 'login'
            })
            
            # Account pages
            legitimate_urls.append({
                'url': f'https://{domain}/account',
                'domain': domain,
                'source': 'curated_legitimate',
                'label': 0,
                'type': 'account'
            })
        
        # Add common subdomains
        for domain in legitimate_domains[:20]:  # Limit to top 20
            legitimate_urls.append({
                'url': f'https://www.{domain}/',
                'domain': domain,
                'source': 'curated_legitimate',
                'label': 0,
                'type': 'subdomain'
            })
        
        # Save to file
        output_file = self.output_dir / f"legitimate_urls_{datetime.now().strftime('%Y%m%d')}.json"
        with open(output_file, 'w') as f:
            json.dump(legitimate_urls, f, indent=2)
        
        logger.info(f"Generated {len(legitimate_urls)} legitimate URLs to {output_file}")
        return legitimate_urls
    
    def create_training_csv(self, phishing_urls: List[Dict], legitimate_urls: List[Dict]):
        """Combine datasets into training CSV"""
        logger.info("Creating unified training CSV...")
        
        output_file = self.output_dir / f"url_training_data_{datetime.now().strftime('%Y%m%d')}.csv"
        
        with open(output_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['url', 'label', 'source', 'target'])
            
            # Write phishing URLs
            for entry in phishing_urls:
                writer.writerow([
                    entry.get('url', ''),
                    entry.get('label', 1),
                    entry.get('source', 'unknown'),
                    entry.get('target', 'unknown')
                ])
            
            # Write legitimate URLs
            for entry in legitimate_urls:
                writer.writerow([
                    entry.get('url', ''),
                    entry.get('label', 0),
                    entry.get('source', 'legitimate'),
                    ''
                ])
        
        total_urls = len(phishing_urls) + len(legitimate_urls)
        logger.info(f"Created training CSV with {total_urls} URLs ({len(phishing_urls)} phishing, {len(legitimate_urls)} legitimate)")
        logger.info(f"Saved to {output_file}")
        
        # Print statistics
        phishing_pct = (len(phishing_urls) / total_urls) * 100 if total_urls > 0 else 0
        logger.info(f"Dataset balance: {phishing_pct:.1f}% phishing, {100-phishing_pct:.1f}% legitimate")
        
        return output_file
    
    def collect_all(self, phishing_limit: int = 10000):
        """Collect all datasets"""
        logger.info("=" * 60)
        logger.info("Starting Phishing Dataset Collection")
        logger.info("=" * 60)
        
        # Collect phishing URLs
        phishtank_data = self.collect_phishtank_data(limit=phishing_limit)
        time.sleep(2)  # Be nice to servers
        
        openphish_data = self.collect_openphish_data(limit=phishing_limit // 2)
        time.sleep(2)
        
        # Combine phishing sources
        all_phishing = phishtank_data + openphish_data
        
        # Remove duplicates
        seen_urls = set()
        unique_phishing = []
        for entry in all_phishing:
            url = entry.get('url', '')
            if url and url not in seen_urls:
                seen_urls.add(url)
                unique_phishing.append(entry)
        
        logger.info(f"Total unique phishing URLs: {len(unique_phishing)}")
        
        # Collect legitimate URLs
        legitimate_data = self.collect_legitimate_urls()
        
        # Create training CSV
        csv_file = self.create_training_csv(unique_phishing, legitimate_data)
        
        logger.info("=" * 60)
        logger.info("Dataset Collection Complete!")
        logger.info("=" * 60)
        logger.info(f"Training data saved to: {csv_file}")
        logger.info(f"Total phishing URLs: {len(unique_phishing)}")
        logger.info(f"Total legitimate URLs: {len(legitimate_data)}")
        logger.info(f"Total dataset size: {len(unique_phishing) + len(legitimate_data)}")
        
        return csv_file


class EmailDatasetCollector:
    """Collect phishing email datasets"""
    
    def __init__(self, output_dir: Path = Path("data/training")):
        self.output_dir = output_dir
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
    def generate_phishing_email_templates(self) -> List[Dict]:
        """Generate common phishing email templates based on real patterns"""
        logger.info("Generating phishing email templates...")
        
        templates = [
            # Account verification scams
            {
                'subject': 'Urgent: Verify Your Account',
                'body': 'Your account has been temporarily suspended due to unusual activity. Click here to verify your identity immediately: http://verify-account-now.tk/login',
                'label': 1,
                'category': 'account_verification'
            },
            {
                'subject': 'Action Required: Confirm Your Identity',
                'body': 'We detected suspicious activity on your account. Please confirm your identity within 24 hours to avoid permanent closure. Verify now: http://secure-confirm.ml/',
                'label': 1,
                'category': 'urgent_action'
            },
            
            # Prize/lottery scams
            {
                'subject': 'Congratulations! You\'ve Won $10,000',
                'body': 'You have been selected as the winner of our annual prize draw. Claim your $10,000 prize money now by providing your bank details: http://claim-prize.tk',
                'label': 1,
                'category': 'prize_scam'
            },
            
            # Banking scams
            {
                'subject': 'Security Alert: Unusual Login Detected',
                'body': 'We noticed a login attempt from an unrecognized device. If this wasn\'t you, secure your account immediately: http://secure-banking.cf/verify',
                'label': 1,
                'category': 'banking'
            },
            {
                'subject': 'Your Card Has Been Blocked',
                'body': 'Your credit card has been blocked for security reasons. Update your information now to restore access: http://card-update.xyz',
                'label': 1,
                'category': 'banking'
            },
            
            # Package delivery scams
            {
                'subject': 'Package Delivery Failed',
                'body': 'We attempted to deliver your package but no one was home. Reschedule delivery and pay the $2.99 fee: http://delivery-reschedule.tk',
                'label': 1,
                'category': 'delivery'
            },
            
            # Tax/IRS scams
            {
                'subject': 'IRS: You Have a Pending Refund',
                'body': 'You are eligible for a tax refund of $1,247. Claim your refund by providing your social security number: http://irs-refund.ml',
                'label': 1,
                'category': 'tax_scam'
            },
            
            # Password reset scams
            {
                'subject': 'Password Reset Request',
                'body': 'Someone requested a password reset for your account. If this wasn\'t you, click here immediately: http://reset-password-now.tk',
                'label': 1,
                'category': 'password_reset'
            },
            
            # Tech support scams
            {
                'subject': 'Your Computer is Infected with Viruses',
                'body': 'Our scan detected 23 viruses on your computer. Download our security software immediately to protect your data: http://virus-removal.xyz',
                'label': 1,
                'category': 'tech_support'
            },
            
            # Job offer scams
            {
                'subject': 'Job Offer: Work From Home - $5000/month',
                'body': 'Congratulations! You have been selected for our work-from-home position. Start earning $5000/month. Register now: http://job-registration.tk',
                'label': 1,
                'category': 'job_scam'
            },
        ]
        
        # Save templates
        output_file = self.output_dir / "phishing_email_templates.json"
        with open(output_file, 'w') as f:
            json.dump(templates, f, indent=2)
        
        logger.info(f"Generated {len(templates)} phishing email templates")
        return templates
    
    def generate_legitimate_email_templates(self) -> List[Dict]:
        """Generate legitimate email examples"""
        logger.info("Generating legitimate email templates...")
        
        templates = [
            {
                'subject': 'Your Order Has Been Shipped',
                'body': 'Good news! Your order #12345 has been shipped and will arrive in 3-5 business days. Track your package at https://amazon.com/tracking',
                'label': 0,
                'category': 'order_confirmation'
            },
            {
                'subject': 'Weekly Newsletter - Tech Updates',
                'body': 'Here are this week\'s top tech stories. Read more at https://techcrunch.com. Unsubscribe at any time.',
                'label': 0,
                'category': 'newsletter'
            },
            {
                'subject': 'Meeting Reminder: Team Sync Tomorrow at 2pm',
                'body': 'This is a reminder about our team meeting tomorrow at 2:00 PM. Join via Zoom: https://zoom.us/j/123456789',
                'label': 0,
                'category': 'meeting'
            },
            {
                'subject': 'Your Receipt from Coffee Shop',
                'body': 'Thank you for your purchase! Your receipt is attached. Total: $4.50. Visit us again soon at https://starbucks.com',
                'label': 0,
                'category': 'receipt'
            },
            {
                'subject': 'Welcome to Our Service',
                'body': 'Welcome! Thanks for signing up. Get started by visiting your dashboard at https://example.com/dashboard',
                'label': 0,
                'category': 'welcome'
            },
            {
                'subject': 'Password Changed Successfully',
                'body': 'Your password was changed successfully. If you didn\'t make this change, please contact support at https://support.example.com',
                'label': 0,
                'category': 'security_notification'
            },
            {
                'subject': 'Monthly Account Statement',
                'body': 'Your account statement for October is now available. View online at https://chase.com/statements',
                'label': 0,
                'category': 'statement'
            },
            {
                'subject': 'Event Invitation: Company Holiday Party',
                'body': 'You\'re invited to our annual holiday party on Dec 15th at 6pm. RSVP at https://eventbrite.com/company-party',
                'label': 0,
                'category': 'invitation'
            },
        ]
        
        # Save templates
        output_file = self.output_dir / "legitimate_email_templates.json"
        with open(output_file, 'w') as f:
            json.dump(templates, f, indent=2)
        
        logger.info(f"Generated {len(templates)} legitimate email templates")
        return templates
    
    def create_email_training_csv(self):
        """Create email training dataset"""
        logger.info("Creating email training dataset...")
        
        phishing_emails = self.generate_phishing_email_templates()
        legitimate_emails = self.generate_legitimate_email_templates()
        
        output_file = self.output_dir / f"email_training_data_{datetime.now().strftime('%Y%m%d')}.csv"
        
        with open(output_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['subject', 'body', 'text', 'label', 'category'])
            
            # Write phishing emails
            for email in phishing_emails:
                combined_text = f"{email['subject']} {email['body']}"
                writer.writerow([
                    email['subject'],
                    email['body'],
                    combined_text,
                    email['label'],
                    email['category']
                ])
            
            # Write legitimate emails
            for email in legitimate_emails:
                combined_text = f"{email['subject']} {email['body']}"
                writer.writerow([
                    email['subject'],
                    email['body'],
                    combined_text,
                    email['label'],
                    email['category']
                ])
        
        logger.info(f"Created email training CSV: {output_file}")
        logger.info(f"Total emails: {len(phishing_emails) + len(legitimate_emails)}")
        
        return output_file


def main():
    """Collect all training datasets"""
    print("🎯 Phishing Dataset Collector")
    print("=" * 60)
    
    # Collect URL datasets
    url_collector = PhishingDatasetCollector()
    url_dataset = url_collector.collect_all(phishing_limit=10000)
    
    print()
    
    # Collect email datasets
    email_collector = EmailDatasetCollector()
    email_dataset = email_collector.create_email_training_csv()
    
    print()
    print("=" * 60)
    print("✅ All datasets collected successfully!")
    print("=" * 60)
    print(f"📁 URL Training Data: {url_dataset}")
    print(f"📁 Email Training Data: {email_dataset}")
    print()
    print("Next steps:")
    print("1. Run: python train_url_model.py")
    print("2. Run: python train_text_model.py")
    print("3. Run: python train_visual_model.py")


if __name__ == "__main__":
    main()
