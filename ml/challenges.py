import json
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional

CHALLENGES = [
    {
        "id": "challenge_1",
        "title": "Spot the Phish",
        "description": "Identify which emails are phishing",
        "difficulty": "easy",
        "time_limit": 300,
        "points_reward": 50,
        "passing_score": 70,
        "questions": [
            {
                "id": "q1",
                "question": "Which is likely phishing?",
                "options": [
                    "Email from 'paypa1.com' asking to verify",
                    "Email from 'paypal.com' about login",
                    "Email from 'support@paypal.com' with order",
                    "Email from bank with 2FA code"
                ],
                "correct_answer": "Email from 'paypa1.com' asking to verify",
                "explanation": "Domain: paypa1.com (with 1) not paypal.com"
            },
            {
                "id": "q2",
                "question": "What should you do with suspicious links?",
                "options": [
                    "Click to see where it goes",
                    "Hover to see real URL",
                    "Reply asking if real",
                    "Forward to others"
                ],
                "correct_answer": "Hover to see real URL",
                "explanation": "Always hover without clicking"
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
