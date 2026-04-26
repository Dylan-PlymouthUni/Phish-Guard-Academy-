"""Learning utilities for PhishGuard Academy.
This module defines the core learning components of the PhishGuard Academy platform, including the lessons, challenges, and achievements that users can engage with to improve their phishing detection skills."""

import json
from datetime import datetime
from pathlib import Path
from pydantic import BaseModel
from typing import List, Optional

class Achievement(BaseModel):
    """Schema for Achievement data."""
    id: str
    title: str
    description: str
    icon: str
    points: int
    unlocked: bool = False

class UserProgress(BaseModel):
    """Schema for UserProgress data."""
    total_points: int = 0
    lessons_completed: int = 0
    challenges_passed: int = 0
    achievements: List[Achievement] = []
    last_updated: Optional[str] = None

# Learning data
LESSONS = [
    {
        "id": "phishing_101",
        "title": "Phishing 101: The Basics",
        "description": "Learn what phishing is and how it works",
        "category": "fundamentals",
        "difficulty": "beginner",
        "duration": 5,
        "points_reward": 50,
        "content": """# What is Phishing?

Phishing is a cyber attack where attackers trick you into revealing sensitive information like passwords, credit card numbers, or personal data by pretending to be a trustworthy entity.

## Common Types of Phishing:

### 1. **Email Phishing**
The most common type - fake emails from banks, PayPal, Amazon, etc.

### 2. **Website Phishing (Pharming)**
Fake login pages that look identical to legitimate sites

### 3. **Smishing (SMS Phishing)**
Text message phishing with malicious links

### 4. **Vishing (Voice Phishing)**
Phone calls from fake "IT support" or "bank representatives"

### 5. **Spear Phishing**
Targeted attacks against specific individuals using personal information

## How to Spot Phishing:

1. ✅ **Check sender email address** - Look for misspellings or suspicious domains
2. ✅ **Look for spelling/grammar errors** - Professional companies proofread their communications
3. ✅ **Be suspicious of urgency** - "Act now or lose access!" is a red flag
4. ✅ **Hover over links** (don't click!) - Verify the actual URL destination
5. ✅ **Verify by calling the company** - Use a phone number you find independently, not one in the email

## Remember:
- Banks never ask for passwords via email
- Legitimate companies don't threaten to close accounts via email
- If it seems too good to be true, it probably is!
"""
    },
    {
        "id": "red_flags",
        "title": "Red Flags & Warning Signs",
        "description": "Identify suspicious indicators in emails and websites",
        "category": "detection",
        "difficulty": "beginner",
        "duration": 8,
        "points_reward": 75,
        "content": """# Red Flags to Watch For

## Email Red Flags 🚩:

### 1. Generic Greetings
- "Dear Customer" instead of your name
- "Dear User"
- "To whom it may concern"

### 2. Suspicious Attachments
- .exe, .zip, .scr files
- Unexpected invoices or receipts
- "View document.pdf.exe"

### 3. Shortened URLs
- bit.ly, tinyurl.com links
- Hide the real destination
- Often used to bypass filters

### 4. Requests for Sensitive Information
- Password requests
- Social Security numbers
- Credit card details

### 5. Mismatched Email Addresses
- Display name says "PayPal" but email is from "paypa1-security@random.com"

### 6. Threats and Urgency
- "Account will be closed in 24 hours!"
- "Suspicious activity detected - verify NOW"
- "You've won! Claim immediately!"

### 7. Poor Grammar/Spelling
- Professional companies proofread emails
- Unusual phrasing or word choices
- Machine translation artifacts

## Website Red Flags 🚩:

### 1. Missing HTTPS
- Look for the padlock icon
- Note: Phishing sites can also use HTTPS!

### 2. Mismatched Domains
- amaz0n.com instead of amazon.com
- paypal-security.com instead of paypal.com

### 3. Poor Design Quality
- Blurry logos
- Misaligned elements
- Outdated design

### 4. Grammar Errors on Website
- Spelling mistakes on login pages
- Broken English in support text

### 5. Suspicious Redirects
- Multiple redirects before reaching login
- URLs changing in address bar

### 6. Pop-ups for Sensitive Info
- Legitimate sites don't use pop-ups for passwords
- "Verify your identity" pop-ups

## Trust Your Instincts!
If something feels off, it probably is. Take a moment to verify before acting.
"""
    },
    {
        "id": "url_analysis",
        "title": "Advanced URL Analysis",
        "description": "Master the art of analyzing and verifying URLs",
        "category": "detection",
        "difficulty": "intermediate",
        "duration": 12,
        "points_reward": 100,
        "content": """# Analyzing URLs Like a Pro

## URL Anatomy:
```
https://subdomain.example.com:443/path/to/page?param=value#section
└─┬─┘  └───┬───┘ └──┬──┘ └┬┘ └────┬────┘ └────┬─────┘ └──┬──┘
Protocol Subdomain Domain Port    Path      Query      Fragment
```

## Key Checks:

### 1. Protocol (https:// vs http://)
- ✅ HTTPS = Encrypted connection
- ❌ HTTP = Unencrypted (avoid for sensitive data)
- ⚠️ HTTPS doesn't guarantee the site is legitimate!

### 2. Domain Name
This is the MOST IMPORTANT part!

**Real domain:** `example.com`
**Phishing:** `example.com.malicious.com` (malicious.com is the actual domain)

**Real domain:** `login.microsoft.com`
**Phishing:** `microsoft.com-login.net` (the real domain is login.net)

### 3. Subdomains
- Legitimate: `mail.google.com`, `drive.google.com`
- Suspicious: `google.secure-verify.com` (real domain is secure-verify.com)

### 4. Look for Homoglyphs
Characters that look similar:
- 0 (zero) vs O (letter)
- 1 (one) vs l (lowercase L)
- rn vs m
- paypa1.com, g00gle.com, arnazon.com

### 5. Extra Characters/Words
- paypal-security.com (real PayPal doesn't use this)
- amazon-login.com (fake)
- bank-verify.com (suspicious)

### 6. Country Code Top-Level Domains (ccTLDs)
- Some attackers use foreign domains
- .tk, .ml, .ga, .cf, .gq are often free and abused
- Not all foreign domains are bad! Context matters.

## URL Shorteners:
Services like bit.ly, tinyurl.com hide the real destination.
- Use URL preview services (CheckShortURL)
- Or add a "+" to bit.ly links: bit.ly/abc123+ shows preview

## Tools for URL Analysis:
1. **VirusTotal** - Scan URLs for malware
2. **URLhaus** - Database of malicious URLs
3. **WHOIS lookup** - See domain registration info
4. **Google Safe Browsing** - Check if URL is flagged

## Hovering Technique:
On desktop: Hover over links without clicking to see the real URL (usually bottom-left of browser or in a tooltip)

## Practice Exercise:
Which URLs are legitimate for Microsoft Office 365 login?

✅ `login.microsoftonline.com`
✅ `office.com`
❌ `microsoft-office-login.com`
❌ `office365.secure-login.com`
❌ `login-microsoft.com`

The legitimate ones have "microsoftonline.com" or "office.com" as the actual domain!
"""
    },
    {
        "id": "social_engineering",
        "title": "Social Engineering Tactics",
        "description": "Understand psychological manipulation techniques",
        "category": "psychology",
        "difficulty": "intermediate",
        "duration": 15,
        "points_reward": 120,
        "content": """# Social Engineering: The Human Hack

Social engineering exploits human psychology rather than technical vulnerabilities.

## Key Psychological Principles:

### 1. Authority
People tend to obey authority figures
- Impersonating CEO, IT admin, police
- Official-looking logos and signatures
- **Defense:** Verify through independent channels

### 2. Urgency
Creating time pressure to prevent careful thinking
- "Act within 24 hours or lose access"
- "Suspicious activity detected - verify NOW"
- **Defense:** Slow down and verify. Legitimate companies give reasonable time.

### 3. Fear
Triggering emotional responses
- "Your account has been compromised"
- "Legal action will be taken"
- **Defense:** Stay calm, verify the claim independently

### 4. Curiosity
Making you want to click
- "See who viewed your profile"
- "You won't believe this"
- **Defense:** If unsolicited, ignore it

### 5. Greed
Too-good-to-be-true offers
- "You've won $1,000,000!"
- "Free iPhone - click here"
- **Defense:** If you didn't enter a contest, you didn't win

### 6. Trust
Exploiting relationships
- Impersonating colleagues
- Using information from social media
- **Defense:** Verify unusual requests through secondary channels

### 7. Social Proof
"Everyone's doing it"
- "10,000 people already claimed this"
- **Defense:** Popular doesn't mean legitimate

## Common Social Engineering Tactics:

### Pretexting
Creating a fabricated scenario
- Example: "I'm from IT, I need your password to fix an issue"
- **Reality:** IT never asks for passwords

### Baiting
Offering something to infect devices
- Free USB drives (loaded with malware)
- "Free movie download"
- **Defense:** Never use unknown USB drives, verify download sources

### Quid Pro Quo
Promising a service in exchange for information
- "Give me your login and I'll give you tech support"
- **Defense:** Legitimate services don't work this way

### Tailgating (Physical)
Following authorized people into restricted areas
- **Defense:** Don't hold doors for strangers in secure areas

## Real-World Examples:

### CEO Fraud (Whaling)
Email appearing to be from CEO: "Buy $5,000 in gift cards urgently for client gifts"
- **Red flags:** Unusual request, urgency, payment method
- **Response:** Call CEO directly to verify

### Tech Support Scam
Call from "Microsoft" about computer virus
- **Red flags:** Unsolicited call, requests remote access
- **Response:** Hang up. Microsoft doesn't cold-call

### Shipping Notification
Text: "Package couldn't be delivered, click here to reschedule"
- **Red flags:** Unexpected, shortened URL
- **Response:** Check shipping company's official app/website directly

## Defending Against Social Engineering:

1. ✅ **Verify identities** through independent channels
2. ✅ **Question unusual requests**, even from authority figures
3. ✅ **Slow down** - Don't let urgency bypass your judgment
4. ✅ **Protect personal information** on social media
5. ✅ **Use multi-factor authentication** (MFA)
6. ✅ **Report suspicious attempts** to IT/security
7. ✅ **Stay educated** - Tactics constantly evolve

## Remember:
The best defense against social engineering is awareness and a healthy skepticism. When in doubt, verify!
"""
    },
    {
        "id": "email_security",
        "title": "Email Security Best Practices",
        "description": "Learn to secure and authenticate emails",
        "category": "technical",
        "difficulty": "advanced",
        "duration": 18,
        "points_reward": 150,
        "content": """# Email Security Deep Dive

## Email Authentication Protocols:

### SPF (Sender Policy Framework)
**What it does:** Specifies which mail servers can send email for a domain

**How it works:**
1. Domain owner publishes SPF record in DNS
2. Receiving server checks if sending server is authorized
3. Fails if email comes from unauthorized server

**Example SPF record:**
```
v=spf1 include:_spf.google.com ~all
```

### DKIM (DomainKeys Identified Mail)
**What it does:** Adds digital signature to verify email wasn't altered

**How it works:**
1. Sending server signs email with private key
2. Public key published in DNS
3. Receiving server verifies signature

### DMARC (Domain-based Message Authentication, Reporting & Conformance)
**What it does:** Tells servers what to do with emails that fail SPF/DKIM

**Policies:**
- `none` - Monitor only
- `quarantine` - Send to spam
- `reject` - Block entirely

## Reading Email Headers:

Email headers contain valuable information:

```
From: support@paypal.com
To: victim@example.com
Subject: Verify Your Account
Return-Path: phisher@evil.com  ← Red flag!
Received: from unknown.com [192.0.2.1]  ← Red flag!
```

### Key Headers to Check:

1. **Return-Path** - Where replies go (can reveal real sender)
2. **Received** - Chain of mail servers (read bottom to top)
3. **Authentication-Results** - SPF, DKIM, DMARC results
4. **Reply-To** - May differ from From address

## Viewing Headers:

**Gmail:** More → Show original
**Outlook:** File → Properties
**Apple Mail:** View → Message → Long Headers

## Email Spoofing:

Attackers can forge the "From" field:
```
From: ceo@company.com  ← Spoofed!
Actual sender: attacker@evil.com
```

**Why it works:** SMTP protocol doesn't verify sender by default

**Prevention:** SPF, DKIM, DMARC

## Advanced Phishing Techniques:

### Homograph Attacks
Using Unicode characters that look identical:
- аpple.com (Cyrillic 'а') vs apple.com (Latin 'a')
- Modern browsers show punycode: xn--pple-43d.com

### Subdomain Tricks
- legitcompany.com.evil.com (evil.com is real domain)
- The rightmost part is the actual domain!

### Email Forwarding Exploits
- Attacker controls compromised@company.com
- Sets up forwarding to victim
- Victim sees email "from" legitimate company domain

## Best Practices:

### For Individuals:
1. ✅ Enable **2FA/MFA** on all accounts
2. ✅ Use **unique passwords** for each account
3. ✅ Be suspicious of **unexpected attachments**
4. ✅ **Verify senders** through separate channels
5. ✅ Use **email filters** and spam protection
6. ✅ Never **disable security warnings**
7. ✅ Keep software **updated**

### For Organizations:
1. ✅ Implement **SPF, DKIM, DMARC**
2. ✅ Use **email security gateways**
3. ✅ Conduct **phishing simulations**
4. ✅ Provide **security awareness training**
5. ✅ Enable **external email warnings**
6. ✅ Implement **DMARC at reject policy**
7. ✅ Use **email encryption** for sensitive data

## Reporting Phishing:

### Gmail:
Click 3 dots → Report phishing

### Outlook:
Report message → Phishing

### Forward to:
- **reportphishing@apwg.org** (Anti-Phishing Working Group)
- **spam@uce.gov** (FTC)
- Your organization's security team

## Tools for Email Security:

1. **MXToolbox** - Check SPF, DKIM, DMARC
2. **Google Admin Toolbox** - Header analyzer
3. **PhishTank** - Report and check known phishing sites
4. **Have I Been Pwned** - Check if email in data breach

## Remember:
Email was designed for convenience, not security. Always verify, especially for sensitive requests!
"""
    },
    {
        "id": "mobile_security",
        "title": "Mobile Phishing Defense",
        "description": "Protect yourself on mobile devices",
        "category": "mobile",
        "difficulty": "intermediate",
        "duration": 10,
        "points_reward": 100,
        "content": """# Mobile Phishing: The Hidden Threat

Mobile devices are prime targets because:
- Smaller screens make verification harder
- Users are often distracted/multitasking
- Hard to hover over links
- Perceived urgency on-the-go

## Types of Mobile Phishing:

### 1. Smishing (SMS Phishing)
Text messages with malicious links

**Examples:**
- "Package delivery failed. Reschedule: [link]"
- "Your bank account suspended. Verify: [link]"
- "You won! Claim prize: [link]"

### 2. App-based Phishing
Fake apps that steal credentials
- Fake banking apps
- Fake cryptocurrency wallets
- Malicious games requesting permissions

### 3. QR Code Phishing
Malicious QR codes leading to phishing sites
- On fake posters
- In emails
- At public places

### 4. Social Media Phishing
Fake messages on WhatsApp, Instagram, Facebook
- Impersonating friends/brands
- Fake giveaways
- "Verify your account" messages

## Mobile-Specific Red Flags:

### SMS/Text Messages:
🚩 From short codes or unknown numbers
🚩 Shortened URLs (bit.ly, etc.)
🚩 Poor grammar
🚩 Unexpected prizes/threats
🚩 Requests to click immediately

### Apps:
🚩 Requesting excessive permissions
🚩 Poor reviews or few downloads
🚩 Misspelled app names (Whatsapp instead of WhatsApp)
🚩 Not from official store

### QR Codes:
🚩 From untrusted sources
🚩 On unsolicited mail
🚩 Covering existing QR codes

## Best Practices for Mobile Security:

### General:
1. ✅ Don't click links in unexpected texts/messages
2. ✅ Verify sender before responding
3. ✅ Manually type URLs instead of clicking
4. ✅ Use official apps from trusted stores
5. ✅ Enable two-factor authentication
6. ✅ Keep OS and apps updated
7. ✅ Be cautious on public Wi-Fi

### For Links:
1. ✅ Long-press links to preview URL (iOS/Android)
2. ✅ Use URL preview services
3. ✅ Verify domain carefully
4. ✅ Look for HTTPS

### For Apps:
1. ✅ Only download from official stores
2. ✅ Check reviews and developer info
3. ✅ Review permissions carefully
4. ✅ Avoid apps requesting unnecessary access

### For QR Codes:
1. ✅ Preview URL before visiting
2. ✅ Only scan codes from trusted sources
3. ✅ Use QR scanner with preview feature

## Mobile Security Tools:

### iOS:
- Safari Fraudulent Website Warning
- Two-factor authentication
- App Store security

### Android:
- Google Play Protect
- Two-factor authentication
- Verified apps badge

### Third-party:
- Lookout (security app)
- Norton Mobile Security
- Malwarebytes

## What to Do If Compromised:

1. 🚨 **Disconnect** from internet
2. 🚨 **Change passwords** (from different device)
3. 🚨 **Enable/check 2FA** on accounts
4. 🚨 **Scan device** with security app
5. 🚨 **Contact bank** if financial info exposed
6. 🚨 **Report** to carrier and authorities
7. 🚨 **Monitor** accounts for suspicious activity

## Smishing Examples:

### Package Delivery Scam:
```
"UPS: Package delivery failed
Reschedule: bit.ly/12abc"
```
**Red flags:** Unexpected, shortened URL, not from official number

### Bank Alert Scam:
```
"ALERT: Suspicious activity on account
ending 1234. Verify: [link]"
```
**Red flags:** Not from known number, generic message, suspicious link

### COVID-19 Scam:
```
"Your vaccine appointment is confirmed.
Download certificate: [link]"
```
**Red flags:** Unexpected, requests download, suspicious link

## Remember:
When in doubt:
1. Don't click the link
2. Go directly to the official app/website
3. Contact the company through official channels
4. Report the suspicious message

Your mobile device is your digital life - protect it!
"""
    },
    {
        "id": "incident_response",
        "title": "Phishing Incident Response",
        "description": "What to do if you fall victim",
        "category": "response",
        "difficulty": "advanced",
        "duration": 12,
        "points_reward": 130,
        "content": """# What to Do If You've Been Phished

## Immediate Actions (First 15 Minutes):

### 1. STOP and DON'T PANIC ⏸️
Staying calm helps you think clearly

### 2. DISCONNECT from Internet 🔌
- Turn off Wi-Fi
- Disable mobile data
- Unplug ethernet cable
- Prevents further data transmission

### 3. DOCUMENT Everything 📸
Take screenshots of:
- The phishing email/message
- Any websites you visited
- Any information you provided
- Time and date

### 4. ASSESS What Information Was Compromised 🔍
- Login credentials (username/password)?
- Financial information (credit card, bank account)?
- Personal information (SSN, DOB, address)?
- Work-related credentials or data?

## Next Steps (First Hour):

### If You Shared Passwords:

1. ✅ **Change passwords immediately** (from different device)
   - Start with email account
   - Then banking/financial accounts
   - Then other important accounts

2. ✅ **Enable 2FA/MFA** if not already enabled

3. ✅ **Check for unauthorized access**
   - Review recent login history
   - Check for password reset emails
   - Look for unauthorized purchases

### If You Shared Financial Information:

1. ✅ **Contact your bank/credit card company**
   - Report fraudulent charges
   - Request card cancellation/replacement
   - Set up fraud alerts

2. ✅ **Monitor your accounts** closely
   - Check daily for suspicious activity
   - Set up transaction alerts

3. ✅ **Consider credit freeze**
   - Contact credit bureaus (Equifax, Experian, TransUnion)
   - Place fraud alert or credit freeze

### If You Shared Personal Information:

1. ✅ **Report identity theft**
   - IdentityTheft.gov
   - Local police (get report number)
   - FTC at ftc.gov/complaint

2. ✅ **Monitor credit reports**
   - Get free reports from annualcreditreport.com
   - Look for unauthorized accounts

## Reporting:

### Report to Your Organization (If Work-Related):
1. Contact IT/Security team IMMEDIATELY
2. Don't try to "fix it yourself"
3. Follow company incident response procedures
4. Be honest and detailed

### Report to Authorities:
1. **FBI IC3** - ic3.gov (Internet Crime Complaint Center)
2. **FTC** - reportfraud.ftc.gov
3. **APWG** - reportphishing@apwg.org
4. **Google Safe Browsing** - safebrowsing.google.com/safebrowsing/report_phish/

### Report to Email Provider:
- Gmail: Report as phishing
- Outlook: Report → Phishing
- Yahoo: Report spam
- Apple: Report junk

### Report to Impersonated Company:
Most companies have security/abuse contact:
- Amazon: stop-spoofing@amazon.com
- PayPal: phishing@paypal.com
- Apple: reportphishing@apple.com
- Microsoft: phish@office365.microsoft.com

## Computer/Device Cleanup:

### 1. Run Security Scans 🔒
- Update antivirus definitions
- Run full system scan
- Use malware removal tools (Malwarebytes, etc.)

### 2. Check for Malware Signs
- Unexpected pop-ups
- Slow performance
- Unknown programs running
- Changed browser homepage
- New browser toolbars

### 3. Consider Professional Help
If you suspect malware infection, consider:
- Professional IT support
- Computer repair shop
- In severe cases, full system wipe/reinstall

## Long-term Actions:

### Week 1:
- ✅ Monitor all accounts daily
- ✅ Change security questions
- ✅ Review account permissions
- ✅ Check for unauthorized app access

### Month 1-3:
- ✅ Continue monitoring accounts weekly
- ✅ Review credit reports
- ✅ Watch for suspicious emails/calls
- ✅ Be alert for follow-up attacks

### Ongoing:
- ✅ Use password manager
- ✅ Enable 2FA on all accounts
- ✅ Use unique passwords everywhere
- ✅ Stay educated on new threats

## Prevention for Future:

### Technical Measures:
1. ✅ Password manager (LastPass, 1Password, Bitwarden)
2. ✅ Two-factor authentication (2FA/MFA)
3. ✅ Antivirus with real-time protection
4. ✅ Browser with phishing protection
5. ✅ Email filters and spam protection
6. ✅ VPN for public Wi-Fi

### Behavioral Measures:
1. ✅ Verify before clicking links
2. ✅ Hover over links to check URL
3. ✅ Go directly to websites (don't click email links)
4. ✅ Be skeptical of urgency
5. ✅ Verify requests through secondary channels
6. ✅ Keep software updated

### Organizational Measures:
1. ✅ Security awareness training
2. ✅ Simulated phishing exercises
3. ✅ Clear reporting procedures
4. ✅ No blame culture (encourage reporting)
5. ✅ Email authentication (SPF, DKIM, DMARC)
6. ✅ External email warnings

## Key Contacts:

### Credit Bureaus:
- **Equifax:** 1-800-685-1111 | equifax.com
- **Experian:** 1-888-397-3742 | experian.com
- **TransUnion:** 1-800-916-8800 | transunion.com

### Report Fraud:
- **FTC:** 1-877-FTC-HELP | identitytheft.gov
- **FBI IC3:** ic3.gov

### Financial:
- Your bank's fraud department
- Credit card issuer fraud department

## Remember:
- ✅ **Don't be embarrassed** - Phishing works on everyone
- ✅ **Report quickly** - Time is critical
- ✅ **Be thorough** - Check everything
- ✅ **Stay vigilant** - Monitor for follow-up attacks
- ✅ **Learn from it** - Use it to improve security practices

### You're not alone - millions fall for phishing. What matters is how quickly and effectively you respond!
"""
    }
]

ACHIEVEMENTS = [
    {
        "id": "first_analysis",
        "title": "First Analysis",
        "description": "Complete your first analysis",
        "icon": "🎯",
        "points": 10
    },
    {
        "id": "lesson_master",
        "title": "Lesson Master",
        "description": "Complete 5 lessons",
        "icon": "📚",
        "points": 50
    },
    {
        "id": "challenge_champion",
        "title": "Challenge Champion",
        "description": "Pass 3 challenges",
        "icon": "🏆",
        "points": 100
    }
]

PHISHING_EXAMPLES = []

PROGRESS_FILE = Path("data/user_progress.json")

def get_user_progress() -> UserProgress:
    """Load user progress from file"""
    PROGRESS_FILE.parent.mkdir(parents=True, exist_ok=True)
    if PROGRESS_FILE.exists():
        try:
            with open(PROGRESS_FILE) as f:
                data = json.load(f)
                return UserProgress(**data)
        except Exception:
            pass
    return UserProgress()

def save_user_progress(progress: UserProgress) -> UserProgress:
    """Save user progress to file"""
    PROGRESS_FILE.parent.mkdir(parents=True, exist_ok=True)
    progress.last_updated = datetime.now().isoformat()
    with open(PROGRESS_FILE, 'w') as f:
        json.dump(json.loads(progress.model_dump_json()), f, indent=2)
    return progress

def add_points(points: int, reason: str = "") -> UserProgress:
    """Add points to user progress"""
    progress = get_user_progress()
    progress.total_points += points
    return save_user_progress(progress)
