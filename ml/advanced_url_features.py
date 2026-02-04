"""
Advanced URL Feature Extractor for Phishing Detection
Implements 30+ sophisticated features beyond basic heuristics
"""
from __future__ import annotations

import re
import socket
import ssl
import requests
from datetime import datetime
from typing import Dict, List, Any, Optional
from urllib.parse import urlparse, parse_qs
import logging

try:
    import whois
    import dns.resolver
    import tldextract
    from bs4 import BeautifulSoup
    ADVANCED_LIBS_AVAILABLE = True
except ImportError:
    ADVANCED_LIBS_AVAILABLE = False
    logging.warning("Advanced URL analysis libraries not installed. Run: pip install -r requirements-ml.txt")

logger = logging.getLogger(__name__)


class AdvancedURLAnalyzer:
    """Extract comprehensive features from URLs for ML models"""
    
    def __init__(self, timeout: int = 1):  # Reduced for speed
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
    
    def extract_features(self, url: str) -> Dict[str, Any]:
        """Extract all features from URL"""
        features = {}
        
        # Parse URL
        parsed = urlparse(url if url.startswith('http') else f'http://{url}')
        domain_info = tldextract.extract(url) if ADVANCED_LIBS_AVAILABLE else None
        
        # Basic URL structure features
        features.update(self._url_structure_features(url, parsed))
        
        # Domain features
        features.update(self._domain_features(parsed.netloc, domain_info))
        
        # SSL/TLS features
        if parsed.scheme == 'https':
            features.update(self._ssl_features(parsed.netloc))
        else:
            features.update(self._default_ssl_features())
        
        # DNS features
        features.update(self._dns_features(parsed.netloc))
        
        # WHOIS features
        features.update(self._whois_features(parsed.netloc))
        
        # Content features (fetch and analyze page)
        features.update(self._content_features(url))
        
        # Redirect chain analysis
        features.update(self._redirect_features(url))
        
        return features
    
    def _url_structure_features(self, url: str, parsed) -> Dict:
        """Extract URL structure features"""
        return {
            # Length features
            'url_length': len(url),
            'domain_length': len(parsed.netloc),
            'path_length': len(parsed.path),
            'query_length': len(parsed.query),
            
            # Character counts
            'num_dots': url.count('.'),
            'num_hyphens': url.count('-'),
            'num_underscores': url.count('_'),
            'num_slashes': url.count('/'),
            'num_question_marks': url.count('?'),
            'num_equals': url.count('='),
            'num_at': url.count('@'),
            'num_ampersand': url.count('&'),
            'num_percent': url.count('%'),
            
            # Special patterns
            'has_ip_address': self._is_ip_address(parsed.netloc),
            'has_port': ':' in parsed.netloc.split('@')[-1],
            'has_subdomain': parsed.netloc.count('.') > 1,
            'subdomain_level': parsed.netloc.count('.'),
            
            # Suspicious patterns
            'double_slash_in_path': '//' in parsed.path,
            'http_in_domain': 'http' in parsed.netloc.lower(),
            'https_token': 'https' in parsed.netloc.lower() and parsed.scheme == 'http',
            
            # Query parameters
            'num_query_params': len(parse_qs(parsed.query)),
            'has_suspicious_params': any(
                p in parsed.query.lower() 
                for p in ['login', 'verify', 'update', 'secure', 'account']
            ),
        }
    
    def _domain_features(self, netloc: str, domain_info) -> Dict:
        """Extract domain-level features"""
        features = {
            'domain_has_numbers': bool(re.search(r'\d', netloc)),
            'domain_has_hyphens': '-' in netloc,
            'domain_entropy': self._calculate_entropy(netloc),
        }
        
        if domain_info and ADVANCED_LIBS_AVAILABLE:
            domain = domain_info.domain
            tld = domain_info.suffix
            subdomain = domain_info.subdomain
            
            features.update({
                'tld_length': len(tld),
                'domain_token_count': len(domain.split('-')) + len(domain.split('.')),
                'subdomain_length': len(subdomain),
                'is_suspicious_tld': tld in [
                    'tk', 'ml', 'ga', 'cf', 'gq', 'xyz', 'top', 'icu', 
                    'bid', 'click', 'loan', 'work', 'date'
                ],
                'subdomain_count': len(subdomain.split('.')) if subdomain else 0,
            })
        
        return features
    
    def _ssl_features(self, netloc: str) -> Dict:
        """Extract SSL certificate features"""
        try:
            context = ssl.create_default_context()
            with socket.create_connection((netloc.split(':')[0], 443), timeout=self.timeout) as sock:
                with context.wrap_socket(sock, server_hostname=netloc.split(':')[0]) as ssock:
                    cert = ssock.getpeercert()
                    
                    # Parse dates
                    not_before = datetime.strptime(cert['notBefore'], '%b %d %H:%M:%S %Y %Z')
                    not_after = datetime.strptime(cert['notAfter'], '%b %d %H:%M:%S %Y %Z')
                    now = datetime.now()
                    
                    return {
                        'ssl_valid': True,
                        'ssl_age_days': (now - not_before).days,
                        'ssl_expiry_days': (not_after - now).days,
                        'ssl_lifetime_days': (not_after - not_before).days,
                        'ssl_recently_created': (now - not_before).days < 30,
                        'ssl_expires_soon': (not_after - now).days < 30,
                        'ssl_long_validity': (not_after - not_before).days > 365,
                        'ssl_issuer_trusted': 'Let\'s Encrypt' not in str(cert.get('issuer', '')),
                    }
        except Exception as e:
            logger.debug(f"SSL check failed for {netloc}: {e}")
            return self._default_ssl_features()
    
    def _default_ssl_features(self) -> Dict:
        """Default SSL features when check fails"""
        return {
            'ssl_valid': False,
            'ssl_age_days': -1,
            'ssl_expiry_days': -1,
            'ssl_lifetime_days': -1,
            'ssl_recently_created': False,
            'ssl_expires_soon': False,
            'ssl_long_validity': False,
            'ssl_issuer_trusted': False,
        }
    
    def _dns_features(self, netloc: str) -> Dict:
        """Extract DNS-related features"""
        features = {
            'has_dns_record': False,
            'num_dns_records': 0,
            'has_mx_record': False,
            'num_ns_records': 0,
        }
        
        if not ADVANCED_LIBS_AVAILABLE:
            return features
        
        try:
            hostname = netloc.split(':')[0]
            
            # A records
            try:
                answers = dns.resolver.resolve(hostname, 'A', lifetime=self.timeout)
                features['has_dns_record'] = True
                features['num_dns_records'] = len(answers)
            except:
                pass
            
            # MX records (legitimate sites usually have email)
            try:
                answers = dns.resolver.resolve(hostname, 'MX', lifetime=self.timeout)
                features['has_mx_record'] = True
            except:
                pass
            
            # NS records
            try:
                answers = dns.resolver.resolve(hostname, 'NS', lifetime=self.timeout)
                features['num_ns_records'] = len(answers)
            except:
                pass
                
        except Exception as e:
            logger.debug(f"DNS lookup failed for {netloc}: {e}")
        
        return features
    
    def _whois_features(self, netloc: str) -> Dict:
        """Extract WHOIS features"""
        # DISABLED FOR SPEED
        return {
            'domain_age_days': -1,
            'domain_expires_days': -1,
            'whois_privacy': False,
            'domain_recently_registered': False,
        }
    
    
    def _content_features(self, url: str) -> Dict:
        """Fetch and analyze page content with phishing pattern detection"""
        # DISABLED FOR SPEED
        return {
            'page_title_length': 0,
            'num_links': 0,
            'num_external_links': 0,
            'external_link_ratio': 0.0,
            'has_forms': False,
            'num_forms': 0,
            'num_input_fields': 0,
            'has_password_field': False,
            'num_images': 0,
            'num_scripts': 0,
            'has_iframes': False,
            'page_size_kb': 0,
            'has_login_keywords': False,
            'suspicious_form_action': False,
            'hidden_elements_count': 0,
            'obfuscated_javascript': False,
            'fake_address_bar': False,
        }
    
    
    def _redirect_features(self, url: str) -> Dict:
        """Analyze redirect chain"""
        # DISABLED FOR SPEED
        return {
            'num_redirects': 0,
            'has_redirects': False,
            'redirect_chain_length': 0,
            'cross_domain_redirect': False,
            'multiple_redirects': False,
        }
    
    
    def _is_ip_address(self, netloc: str) -> bool:
        """Check if netloc is an IP address"""
        hostname = netloc.split(':')[0]
        pattern = r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$'
        return bool(re.match(pattern, hostname))
    
    @staticmethod
    def _calculate_entropy(text: str) -> float:
        """Calculate Shannon entropy of text"""
        from collections import Counter
        import math
        
        if not text:
            return 0.0
        
        counts = Counter(text)
        length = len(text)
        entropy = -sum(
            (count / length) * math.log2(count / length) 
            for count in counts.values()
        )
        return entropy


# Convenience function
def extract_advanced_url_features(url: str, timeout: int = 5) -> Dict[str, Any]:
    """Extract advanced features from URL"""
    analyzer = AdvancedURLAnalyzer(timeout=timeout)
    return analyzer.extract_features(url)
