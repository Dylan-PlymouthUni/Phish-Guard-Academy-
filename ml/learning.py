import json
from datetime import datetime
from pathlib import Path
from pydantic import BaseModel
from typing import List, Optional

class Achievement(BaseModel):
    id: str
    title: str
    description: str
    icon: str
    points: int
    unlocked: bool = False

class UserProgress(BaseModel):
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

Phishing is a cyber attack where attackers trick you into revealing sensitive information.

## Common Types:
- **Email Phishing**: Fake emails from banks/PayPal
- **Website Phishing**: Fake login pages  
- **Smishing**: Text message phishing

## How to Spot It:
1. Check sender email address
2. Look for spelling errors
3. Be suspicious of urgency
4. Hover over links (don't click!)
5. Verify by calling company"""
    },
    {
        "id": "red_flags",
        "title": "Red Flags & Warning Signs",
        "description": "Identify suspicious indicators",
        "category": "detection",
        "difficulty": "beginner",
        "duration": 8,
        "points_reward": 75,
        "content": """# Red Flags to Watch For

## Email Red Flags:
- Generic greetings ("Dear Customer")
- Suspicious attachments (.exe, .zip)
- Shortened URLs
- Password requests
- Unusual sender addresses
- Threats/urgency

## Website Red Flags:
- Missing HTTPS
- Mismatched domains
- Poor design
- Grammar errors
- Redirects
- Pop-ups for info"""
    },
    {
        "id": "url_analysis",
        "title": "URL Analysis Techniques",
        "description": "Learn to analyze and verify URLs",
        "category": "detection",
        "difficulty": "intermediate",
        "duration": 10,
        "points_reward": 100,
        "content": """# Analyzing URLs

## Key Checks:
1. Protocol: HTTPS vs HTTP
2. Domain: Check full domain name
3. Subdomains: Suspicious subdomains
4. Path: Long/unusual paths
5. Parameters: Extra query params

## Tools:
- Hover to see real URL
- Use URLhaus to check malicious URLs
- WHOIS lookup for domain registration"""
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
