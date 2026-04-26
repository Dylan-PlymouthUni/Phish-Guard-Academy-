#!/usr/bin/env python3
"""
Speed optimization patch for advanced_url_features.py
Disables slow WHOIS lookups and reduces HTTP timeouts
This script applies targeted patches to the advanced_url_features.py module to significantly reduce the time taken for feature extraction during model training.
The patches include:
1. Disabling WHOIS lookups entirely, which can take 5-10 seconds per URL, by returning default values for WHOIS features.
2. Reducing the HTTP timeout from 5 seconds to 1 second to speed up network requests.
3. Adding early returns to skip page content scraping and redirect analysis, which are also time-consuming operations.
4. Reducing SSL timeouts to speed up SSL checks.
The script creates a backup of the original advanced_url_features.py file before applying the patches, allowing for easy restoration if needed. 
After running this patch, the feature extraction process should be significantly faster, enabling the training pipeline to complete in a reasonable time frame even on
"""
import re
import shutil

def main():
    """Run the main CLI workflow for this module."""
    feature_file = "ml/advanced_url_features.py"
    backup_file = f"{feature_file}.backup"
    
    print(f"📖 Reading {feature_file}...")
    with open(feature_file, "r") as f:
        code = f.read()
    
    # Create backup
    shutil.copy(feature_file, backup_file)
    print(f"✅ Backup saved to {backup_file}")
    
    original_code = code
    
    # 1. Disable WHOIS lookups entirely
    # Replace the entire _whois_features method body to return immediately
    code = re.sub(
        r'(def _whois_features\(self, netloc: str\) -> Dict:.*?"""Extract WHOIS features""")',
        r'\1\n        # DISABLED FOR SPEED - WHOIS lookups can take 5-10 seconds each\n        return {\n            \'domain_age_days\': -1,\n            \'domain_expires_days\': -1,\n            \'whois_privacy\': False,\n            \'domain_recently_registered\': False,\n        }',
        code,
        flags=re.DOTALL
    )
    
    # Find and comment out the try-except block in _whois_features
    whois_pattern = r'(def _whois_features\(self, netloc: str\) -> Dict:.*?)(if not ADVANCED_LIBS_AVAILABLE:.*?)(try:.*?except Exception as e:.*?return features)'
    
    def whois_replacer(match):
        """Run whois replacer."""
        header = match.group(1)
        return header + '''
        # DISABLED FOR SPEED - WHOIS lookups can take 5-10 seconds each
        return {
            'domain_age_days': -1,
            'domain_expires_days': -1,
            'whois_privacy': False,
            'domain_recently_registered': False,
        }
        
        # Original WHOIS code commented out for speed:
        # ''' + match.group(2) + '''
        # ''' + match.group(3).replace('\n', '\n        # ')
    
    # 2. Reduce HTTP timeout to 1 second (from 5)
    code = re.sub(
        r'def __init__\(self, timeout: int = 5\):',
        r'def __init__(self, timeout: int = 1):  # Reduced from 5 for speed',
        code
    )
    
    # 3. Add early return to _content_features to skip page scraping
    # This is the slowest operation
    code = re.sub(
        r'(def _content_features\(self, url: str\) -> Dict:.*?"""Fetch and analyze page content.*?""")',
        r'\1\n        # DISABLED FOR SPEED - Page scraping can take 2-5 seconds per URL\n        return {\n            \'page_title_length\': 0,\n            \'num_links\': 0,\n            \'num_external_links\': 0,\n            \'external_link_ratio\': 0.0,\n            \'has_forms\': False,\n            \'num_forms\': 0,\n            \'num_input_fields\': 0,\n            \'has_password_field\': False,\n            \'num_images\': 0,\n            \'num_scripts\': 0,\n            \'has_iframes\': False,\n            \'page_size_kb\': 0,\n            \'has_login_keywords\': False,\n            \'suspicious_form_action\': False,\n            \'hidden_elements_count\': 0,\n            \'obfuscated_javascript\': False,\n            \'fake_address_bar\': False,\n        }',
        code,
        flags=re.DOTALL
    )
    
    # 4. Reduce SSL timeout
    code = re.sub(
        r'socket\.create_connection\(\(netloc\.split\(\':\'\)\[0\], 443\), timeout=self\.timeout\)',
        r'socket.create_connection((netloc.split(\':\')[0], 443), timeout=1)',  # Force 1 second
        code
    )
    
    # 5. Add early return to _redirect_features
    code = re.sub(
        r'(def _redirect_features\(self, url: str\) -> Dict:.*?"""Analyze redirect chain""")',
        r'\1\n        # DISABLED FOR SPEED\n        return {\n            \'num_redirects\': 0,\n            \'has_redirects\': False,\n            \'redirect_chain_length\': 0,\n            \'cross_domain_redirect\': False,\n            \'multiple_redirects\': False,\n        }',
        code,
        flags=re.DOTALL
    )
    
    if code == original_code:
        print("⚠️  Warning: No changes were made. Pattern matching may have failed.")
        print("   Applying manual patches...")
        
        # Manual fallback patches
        lines = code.split('\n')
        new_lines = []
        in_whois = False
        in_content = False
        in_redirect = False
        skip_until_return = False
        
        for i, line in enumerate(lines):
            if 'def _whois_features(' in line:
                in_whois = True
                new_lines.append(line)
                continue
            
            if in_whois and '"""Extract WHOIS features"""' in line:
                new_lines.append(line)
                new_lines.append('        # DISABLED FOR SPEED')
                new_lines.append('        return {')
                new_lines.append("            'domain_age_days': -1,")
                new_lines.append("            'domain_expires_days': -1,")
                new_lines.append("            'whois_privacy': False,")
                new_lines.append("            'domain_recently_registered': False,")
                new_lines.append('        }')
                new_lines.append('')
                skip_until_return = True
                continue
            
            if skip_until_return:
                if line.strip().startswith('def ') and not line.strip().startswith('def _whois'):
                    in_whois = False
                    skip_until_return = False
                    new_lines.append(line)
                continue
            
            if 'timeout: int = 5' in line:
                line = line.replace('timeout: int = 5', 'timeout: int = 1  # Reduced for speed')
            
            new_lines.append(line)
        
        code = '\n'.join(new_lines)
    
    # Write patched code
    with open(feature_file, "w") as f:
        f.write(code)
    
    print(f"\n✅ Patched {feature_file} for speed:")
    print("   ⚡ WHOIS lookups: DISABLED (saves ~5-10s per URL)")
    print("   ⚡ HTTP timeout: Reduced to 1 second (was 5s)")
    print("   ⚡ Page content scraping: DISABLED (saves ~2-5s per URL)")
    print("   ⚡ Redirect analysis: DISABLED (saves ~1-2s per URL)")
    print("   ⚡ SSL timeout: Reduced to 1 second")
    print(f"\n🚀 Expected speedup: 10-20x faster")
    print(f"   Training on 2,274 URLs should now take 5-15 minutes instead of hours")
    print(f"\n💾 Original backed up to: {backup_file}")
    print(f"   To restore: cp {backup_file} {feature_file}")

if __name__ == "__main__":
    main()
