import json
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional

CHALLENGES = [
    {
        "id": "challenge_1",
        "title": "Phishing Basics",
        "description": "Learn to identify common phishing indicators in emails",
        "difficulty": "easy",
        "time_limit": 300,
        "points_reward": 50,
        "passing_score": 70,
        "questions": [
            {
                "id": "q1",
                "question": "Which email is most likely a phishing attempt?",
                "options": [
                    "Email from 'paypa1.com' asking to verify account urgently",
                    "Email from 'paypal.com' about a recent transaction",
                    "Email from 'support@paypal.com' with order confirmation",
                    "Email from your bank with a 2FA code"
                ],
                "correct_answer": "Email from 'paypa1.com' asking to verify account urgently",
                "explanation": "The domain 'paypa1.com' uses a number '1' instead of letter 'l', a common typosquatting technique. Combined with urgency, this is a clear phishing indicator."
            },
            {
                "id": "q2",
                "question": "What should you do when you encounter a suspicious link?",
                "options": [
                    "Click to see where it goes",
                    "Hover over the link to see the real URL without clicking",
                    "Reply to the email asking if it's legitimate",
                    "Forward it to friends to get their opinion"
                ],
                "correct_answer": "Hover over the link to see the real URL without clicking",
                "explanation": "Always hover over links without clicking to reveal the actual destination URL. This helps identify mismatched or suspicious domains."
            },
            {
                "id": "q3",
                "question": "Which greeting is a common phishing red flag?",
                "options": [
                    "Hello John Smith,",
                    "Dear Valued Customer,",
                    "Hi John,",
                    "Good morning Mr. Smith,"
                ],
                "correct_answer": "Dear Valued Customer,",
                "explanation": "Generic greetings like 'Dear Customer' or 'Dear User' indicate the sender doesn't know your name, a common sign of mass phishing campaigns."
            }
        ]
    },
    {
        "id": "challenge_2",
        "title": "URL Detective",
        "description": "Master the art of analyzing suspicious URLs",
        "difficulty": "medium",
        "time_limit": 420,
        "points_reward": 100,
        "passing_score": 75,
        "questions": [
            {
                "id": "q1",
                "question": "Which URL is most suspicious?",
                "options": [
                    "https://www.amazon.com/orders",
                    "http://amaz0n-security.com/verify",
                    "https://smile.amazon.com/gp/css/order-history",
                    "https://www.amazon.co.uk/account"
                ],
                "correct_answer": "http://amaz0n-security.com/verify",
                "explanation": "Multiple red flags: uses HTTP (not HTTPS), contains '0' instead of 'o' in amazon, and has a suspicious subdomain 'security' which legitimate sites don't typically use."
            },
            {
                "id": "q2",
                "question": "What does 'https://' at the beginning of a URL indicate?",
                "options": [
                    "The website is guaranteed safe from phishing",
                    "The connection is encrypted, but doesn't guarantee legitimacy",
                    "Only banks use this protocol",
                    "The site has been verified by authorities"
                ],
                "correct_answer": "The connection is encrypted, but doesn't guarantee legitimacy",
                "explanation": "HTTPS only means the connection is encrypted. Phishing sites can also use HTTPS. Always verify the domain name itself."
            },
            {
                "id": "q3",
                "question": "What is typosquatting?",
                "options": [
                    "Typing mistakes in emails",
                    "Using similar-looking domain names to trick users",
                    "Squatting on expired domains",
                    "A type of malware"
                ],
                "correct_answer": "Using similar-looking domain names to trick users",
                "explanation": "Typosquatting is when attackers register domain names that look similar to legitimate ones (e.g., g00gle.com instead of google.com) to trick users."
            },
            {
                "id": "q4",
                "question": "Which domain is legitimate for Microsoft login?",
                "options": [
                    "microsoft-login.com",
                    "login.microsoft.com",
                    "microsoft.secure-login.com",
                    "ms-office-login.com"
                ],
                "correct_answer": "login.microsoft.com",
                "explanation": "The legitimate domain is 'login.microsoft.com' where 'microsoft.com' is the main domain. Others use microsoft in the subdomain, which is a common phishing tactic."
            }
        ]
    },
    {
        "id": "challenge_3",
        "title": "Social Engineering Tactics",
        "description": "Recognize psychological manipulation techniques",
        "difficulty": "medium",
        "time_limit": 480,
        "points_reward": 150,
        "passing_score": 80,
        "questions": [
            {
                "id": "q1",
                "question": "Which tactic creates a false sense of urgency?",
                "options": [
                    "Your account will be closed in 24 hours unless you verify",
                    "Your order has been shipped",
                    "Thank you for your recent purchase",
                    "Your subscription renewal is coming up next month"
                ],
                "correct_answer": "Your account will be closed in 24 hours unless you verify",
                "explanation": "Creating artificial urgency is a classic social engineering tactic designed to make you act without thinking carefully."
            },
            {
                "id": "q2",
                "question": "What is 'pretexting' in social engineering?",
                "options": [
                    "Sending test emails before the real attack",
                    "Creating a fabricated scenario to extract information",
                    "Texting before calling someone",
                    "Using fake caller ID"
                ],
                "correct_answer": "Creating a fabricated scenario to extract information",
                "explanation": "Pretexting involves creating a believable story or scenario (like pretending to be IT support) to trick victims into providing sensitive information."
            },
            {
                "id": "q3",
                "question": "Which email subject line uses fear tactics?",
                "options": [
                    "Your package is ready for pickup",
                    "URGENT: Suspicious activity detected on your account!",
                    "Your monthly statement is available",
                    "Welcome to our newsletter"
                ],
                "correct_answer": "URGENT: Suspicious activity detected on your account!",
                "explanation": "This combines urgency (URGENT) with fear (suspicious activity) to pressure you into clicking without careful consideration."
            },
            {
                "id": "q4",
                "question": "Why do phishers often impersonate authority figures?",
                "options": [
                    "They have more email addresses",
                    "People are more likely to comply with authority",
                    "It's easier to guess their passwords",
                    "They have access to more databases"
                ],
                "correct_answer": "People are more likely to comply with authority",
                "explanation": "Authority bias makes people more likely to follow instructions from perceived authority figures (CEO, IT admin, bank manager) without questioning them."
            },
            {
                "id": "q5",
                "question": "What is 'spear phishing'?",
                "options": [
                    "Using fishing metaphors in emails",
                    "Targeting specific individuals with personalized attacks",
                    "Sending many emails at once",
                    "Phishing for passwords only"
                ],
                "correct_answer": "Targeting specific individuals with personalized attacks",
                "explanation": "Spear phishing is a targeted attack where the attacker researches specific individuals and crafts personalized messages, making them more convincing."
            }
        ]
    },
    {
        "id": "challenge_4",
        "title": "Email Header Analysis",
        "description": "Learn to examine email headers for authenticity",
        "difficulty": "hard",
        "time_limit": 600,
        "points_reward": 200,
        "passing_score": 85,
        "questions": [
            {
                "id": "q1",
                "question": "What does SPF stand for in email authentication?",
                "options": [
                    "Secure Password Format",
                    "Sender Policy Framework",
                    "Spam Prevention Filter",
                    "Security Protocol Framework"
                ],
                "correct_answer": "Sender Policy Framework",
                "explanation": "SPF (Sender Policy Framework) is an email authentication method that helps prevent email spoofing by verifying that incoming mail from a domain comes from an authorized IP address."
            },
            {
                "id": "q2",
                "question": "Which email header field shows the actual origin server?",
                "options": [
                    "From:",
                    "To:",
                    "Received:",
                    "Subject:"
                ],
                "correct_answer": "Received:",
                "explanation": "The 'Received:' header chain shows the actual path the email took through mail servers. The 'From:' field can be easily spoofed."
            },
            {
                "id": "q3",
                "question": "What is email spoofing?",
                "options": [
                    "Sending spam emails",
                    "Forging the sender address to make it appear from someone else",
                    "Encrypting email content",
                    "Using multiple email accounts"
                ],
                "correct_answer": "Forging the sender address to make it appear from someone else",
                "explanation": "Email spoofing is when an attacker forges the 'From' address to make an email appear to come from someone else, often a trusted source."
            },
            {
                "id": "q4",
                "question": "Which authentication protocol helps prevent email spoofing?",
                "options": [
                    "HTTP",
                    "FTP",
                    "DMARC",
                    "SMTP"
                ],
                "correct_answer": "DMARC",
                "explanation": "DMARC (Domain-based Message Authentication, Reporting & Conformance) works with SPF and DKIM to prevent email spoofing and phishing."
            }
        ]
    },
    {
        "id": "challenge_5",
        "title": "Real-World Scenarios",
        "description": "Apply your knowledge to realistic phishing scenarios",
        "difficulty": "hard",
        "time_limit": 720,
        "points_reward": 250,
        "passing_score": 85,
        "questions": [
            {
                "id": "q1",
                "question": "You receive an email claiming to be from your CEO asking you to buy gift cards urgently. What should you do?",
                "options": [
                    "Buy the gift cards immediately - it's from the CEO",
                    "Verify by calling the CEO through a known phone number",
                    "Reply to the email asking for confirmation",
                    "Forward it to colleagues to see if they got it too"
                ],
                "correct_answer": "Verify by calling the CEO through a known phone number",
                "explanation": "This is a common CEO fraud/whaling attack. Always verify unusual requests through a separate, trusted communication channel."
            },
            {
                "id": "q2",
                "question": "An email claims your cloud storage is full and provides a link to 'upgrade'. What's the safest action?",
                "options": [
                    "Click the link to check your storage",
                    "Log into your account directly through your browser to check storage",
                    "Reply with your payment information",
                    "Delete the email immediately without checking"
                ],
                "correct_answer": "Log into your account directly through your browser to check storage",
                "explanation": "Never click links in unexpected emails. Instead, manually navigate to the official website through your browser to verify the claim."
            },
            {
                "id": "q3",
                "question": "You receive a call from 'IT support' asking for your password to fix an issue. What should you do?",
                "options": [
                    "Provide your password since they're IT",
                    "Give them a hint about your password",
                    "Refuse and report it - legitimate IT never asks for passwords",
                    "Ask them to send an email first"
                ],
                "correct_answer": "Refuse and report it - legitimate IT never asks for passwords",
                "explanation": "Legitimate IT departments NEVER ask for passwords. This is a vishing (voice phishing) attack. Hang up and report it immediately."
            },
            {
                "id": "q4",
                "question": "What should you do if you accidentally clicked a phishing link?",
                "options": [
                    "Nothing - wait and see what happens",
                    "Immediately disconnect from internet, change passwords, and report to IT",
                    "Delete your browsing history",
                    "Restart your computer"
                ],
                "correct_answer": "Immediately disconnect from internet, change passwords, and report to IT",
                "explanation": "Quick action is critical: disconnect to stop potential data transfer, change passwords (especially if you entered credentials), and report to IT/security team immediately."
            },
            {
                "id": "q5",
                "question": "Which is the BEST long-term defense against phishing?",
                "options": [
                    "Never clicking any links in emails",
                    "Continuous education, security awareness, and using MFA",
                    "Only using mobile devices",
                    "Changing passwords every day"
                ],
                "correct_answer": "Continuous education, security awareness, and using MFA",
                "explanation": "A comprehensive approach combining ongoing education, security awareness training, multi-factor authentication (MFA), and good security practices provides the best defense."
            },
            {
                "id": "q6",
                "question": "You receive a package delivery notification from an unknown courier. The email contains your name and address. Is it safe?",
                "options": [
                    "Yes, it has your personal details so it must be real",
                    "No, personal details can be obtained from data breaches",
                    "Yes, if it has tracking number",
                    "Only safe if it has company logo"
                ],
                "correct_answer": "No, personal details can be obtained from data breaches",
                "explanation": "Attackers often use information from data breaches to make phishing emails more convincing. Having your personal details doesn't guarantee legitimacy."
            }
        ]
    },
    {
        "id": "challenge_6",
        "title": "Mobile Phishing",
        "description": "Identify phishing attempts on mobile devices",
        "difficulty": "medium",
        "time_limit": 360,
        "points_reward": 120,
        "passing_score": 75,
        "questions": [
            {
                "id": "q1",
                "question": "What is 'smishing'?",
                "options": [
                    "Phishing through SMS text messages",
                    "Smiling while fishing",
                    "A type of computer virus",
                    "Phishing through smart watches"
                ],
                "correct_answer": "Phishing through SMS text messages",
                "explanation": "Smishing (SMS + phishing) uses text messages to trick victims into clicking malicious links or providing sensitive information."
            },
            {
                "id": "q2",
                "question": "Why is phishing more effective on mobile devices?",
                "options": [
                    "Mobile devices have worse security",
                    "Smaller screens make it harder to verify URLs",
                    "Mobile OS are less secure",
                    "Apps can't be trusted"
                ],
                "correct_answer": "Smaller screens make it harder to verify URLs",
                "explanation": "On mobile devices, it's harder to hover over links or see full URLs, making it easier for attackers to hide malicious links."
            },
            {
                "id": "q3",
                "question": "You receive a text with a shortened URL claiming you won a prize. What should you do?",
                "options": [
                    "Click to claim your prize",
                    "Don't click - shortened URLs can hide malicious sites",
                    "Forward it to friends",
                    "Reply STOP"
                ],
                "correct_answer": "Don't click - shortened URLs can hide malicious sites",
                "explanation": "Shortened URLs (bit.ly, tinyurl) hide the real destination. Combined with prize claims, this is almost certainly a smishing attempt."
            }
        ]
    }
]

ATTEMPTS_FILE = Path("data/challenge_attempts.jsonl")

def get_challenge(challenge_id: str) -> Optional[Dict[str, Any]]:
    return next((c for c in CHALLENGES if c["id"] == challenge_id), None)

def get_all_challenges() -> List[Dict[str, Any]]:
    return CHALLENGES

def save_attempt(attempt: Dict[str, Any]) -> None:
    ATTEMPTS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(ATTEMPTS_FILE, 'a') as f:
        f.write(json.dumps(attempt, default=str) + '\n')

def get_user_attempts() -> List[Dict[str, Any]]:
    ATTEMPTS_FILE.parent.mkdir(parents=True, exist_ok=True)
    if not ATTEMPTS_FILE.exists():
        return []
    attempts = []
    try:
        with open(ATTEMPTS_FILE) as f:
            for line in f:
                if line.strip():
                    attempts.append(json.loads(line))
    except Exception:
        pass
    return attempts

def get_challenge_stats(challenge_id: str) -> Dict[str, Any]:
    attempts = get_user_attempts()
    challenge_attempts = [a for a in attempts if a.get("challenge_id") == challenge_id]
    if not challenge_attempts:
        return {"attempts": 0, "passed": 0, "best_score": 0}
    return {
        "attempts": len(challenge_attempts),
        "passed": sum(1 for a in challenge_attempts if a.get("passed")),
        "best_score": max([a.get("score", 0) for a in challenge_attempts], default=0)
    }
