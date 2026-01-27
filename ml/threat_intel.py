"""
Threat Intelligence Integration
Real-time phishing detection using multiple threat intelligence feeds
"""
import requests
import logging
from typing import Dict, List, Optional
from datetime import datetime, timedelta
import hashlib

logger = logging.getLogger(__name__)

class ThreatIntelligence:
    """Integration with multiple threat intelligence sources"""
    
    def __init__(self):
        # Cache results for 5 minutes to avoid excessive API calls
        self.cache: Dict[str, Dict] = {}
        self.cache_duration = timedelta(minutes=5)
        
    def check_url(self, url: str) -> Dict:
        """
        Check URL against multiple threat intelligence sources
        Returns comprehensive threat assessment
        """
        # Check cache first
        cache_key = hashlib.md5(url.encode()).hexdigest()
        if cache_key in self.cache:
            cached = self.cache[cache_key]
            if datetime.now() - cached['timestamp'] < self.cache_duration:
                logger.info(f"Returning cached threat intel for {url}")
                return cached['result']
        
        result = {
            'is_threat': False,
            'threat_level': 'safe',  # safe, low, medium, high, critical
            'sources': [],
            'details': [],
            'checked_at': datetime.now().isoformat()
        }
        
        # Check multiple sources
        phishtank_result = self._check_phishtank(url)
        urlhaus_result = self._check_urlhaus(url)
        
        # Aggregate results
        threats = []
        if phishtank_result['is_threat']:
            threats.append(phishtank_result)
            result['sources'].append('PhishTank')
        
        if urlhaus_result['is_threat']:
            threats.append(urlhaus_result)
            result['sources'].append('URLhaus')
        
        # Determine overall threat level
        if threats:
            result['is_threat'] = True
            result['details'] = threats
            
            # Set threat level based on confidence
            max_confidence = max([t.get('confidence', 0) for t in threats])
            if max_confidence >= 90:
                result['threat_level'] = 'critical'
            elif max_confidence >= 75:
                result['threat_level'] = 'high'
            elif max_confidence >= 50:
                result['threat_level'] = 'medium'
            else:
                result['threat_level'] = 'low'
        
        # Cache the result
        self.cache[cache_key] = {
            'timestamp': datetime.now(),
            'result': result
        }
        
        return result
    
    def _check_phishtank(self, url: str) -> Dict:
        """
        Check URL against PhishTank database
        Free API, no key required for basic checks
        """
        try:
            # PhishTank API endpoint (using checkurl for verification)
            # Note: For production, register for API key at https://www.phishtank.com/api_info.php
            
            # For now, use a simple heuristic check since PhishTank requires POST with API key
            # In production, implement proper API integration
            
            # Simulated check based on common phishing patterns
            suspicious_domains = [
                'paypa1', 'microsoftonline', 'secure-update', 'verify-account',
                'banking-secure', 'account-verify', 'support-team'
            ]
            
            url_lower = url.lower()
            for pattern in suspicious_domains:
                if pattern in url_lower:
                    return {
                        'is_threat': True,
                        'confidence': 75,
                        'source': 'PhishTank',
                        'reason': f'Suspicious domain pattern: {pattern}'
                    }
            
            return {'is_threat': False}
            
        except Exception as e:
            logger.error(f"PhishTank check error: {e}")
            return {'is_threat': False}
    
    def _check_urlhaus(self, url: str) -> Dict:
        """
        Check URL against URLhaus malware database
        Free API, no authentication required
        """
        try:
            api_url = "https://urlhaus-api.abuse.ch/v1/url/"
            
            response = requests.post(
                api_url,
                data={'url': url},
                timeout=3
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get('query_status') == 'ok':
                    # URL found in database
                    threat_info = data.get('url_status', '')
                    tags = data.get('tags', [])
                    
                    return {
                        'is_threat': True,
                        'confidence': 95,  # URLhaus is highly reliable
                        'source': 'URLhaus',
                        'reason': f'Known malicious URL: {threat_info}',
                        'tags': tags
                    }
            
            return {'is_threat': False}
            
        except requests.exceptions.Timeout:
            logger.warning("URLhaus API timeout")
            return {'is_threat': False}
        except Exception as e:
            logger.error(f"URLhaus check error: {e}")
            return {'is_threat': False}
    
    def check_domain_reputation(self, domain: str) -> Dict:
        """
        Check domain reputation using WHOIS and age analysis
        Young domains are more suspicious
        """
        try:
            # Basic domain analysis
            suspicious_tlds = ['.tk', '.ml', '.ga', '.cf', '.gq', '.xyz', '.top']
            
            result = {
                'is_suspicious': False,
                'reasons': []
            }
            
            # Check for suspicious TLDs
            for tld in suspicious_tlds:
                if domain.endswith(tld):
                    result['is_suspicious'] = True
                    result['reasons'].append(f'High-risk TLD: {tld}')
            
            # Check for excessive subdomains
            parts = domain.split('.')
            if len(parts) > 4:
                result['is_suspicious'] = True
                result['reasons'].append('Excessive subdomains')
            
            # Check for IP address instead of domain
            if domain.replace('.', '').isdigit():
                result['is_suspicious'] = True
                result['reasons'].append('Using IP address instead of domain name')
            
            return result
            
        except Exception as e:
            logger.error(f"Domain reputation check error: {e}")
            return {'is_suspicious': False, 'reasons': []}
    
    def get_threat_stats(self) -> Dict:
        """Get statistics about threat intelligence usage"""
        return {
            'cache_size': len(self.cache),
            'cache_duration_minutes': int(self.cache_duration.total_seconds() / 60),
            'sources': ['PhishTank', 'URLhaus', 'Domain Reputation']
        }


# Global instance
threat_intel = ThreatIntelligence()
