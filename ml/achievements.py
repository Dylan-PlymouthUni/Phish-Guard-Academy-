"""
Achievements system for PhishGuard Academy
"""
from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from ml.db_models import DBAnalysis, DBChallengeAttempt, DBLessonProgress
from pydantic import BaseModel

class AchievementDef(BaseModel):
    id: str
    title: str
    description: str
    icon: str
    points: int
    condition: str  # human-readable trigger

ACHIEVEMENTS = [
    {
        "id": "first_analysis",
        "title": "First Steps",
        "description": "Perform your first phishing analysis",
        "icon": "🚀",
        "points": 10,
        "condition": "analyses_count >= 1"
    },
    {
        "id": "hundred_analyses",
        "title": "Analysis Master",
        "description": "Complete 100 phishing analyses",
        "icon": "🎯",
        "points": 100,
        "condition": "analyses_count >= 100"
    },
    {
        "id": "first_challenge",
        "title": "Challenge Accepted",
        "description": "Complete your first challenge",
        "icon": "⚔️",
        "points": 25,
        "condition": "challenge_attempts >= 1"
    },
    {
        "id": "all_challenges",
        "title": "Challenge Master",
        "description": "Complete all 6 challenges",
        "icon": "👑",
        "points": 150,
        "condition": "challenges_passed >= 6"
    },
    {
        "id": "seven_day_streak",
        "title": "On Fire",
        "description": "Maintain a 7-day activity streak",
        "icon": "🔥",
        "points": 50,
        "condition": "streak >= 7"
    },
    {
        "id": "level_10",
        "title": "Rising Star",
        "description": "Reach level 10",
        "icon": "⭐",
        "points": 75,
        "condition": "level >= 10"
    },
    {
        "id": "level_25",
        "title": "Cyber Guardian",
        "description": "Reach level 25",
        "icon": "🛡️",
        "points": 200,
        "condition": "level >= 25"
    },
    {
        "id": "first_lesson",
        "title": "Knowledge Seeker",
        "description": "Complete your first lesson",
        "icon": "📚",
        "points": 20,
        "condition": "lessons_completed >= 1"
    },
    {
        "id": "all_lessons",
        "title": "Master Educator",
        "description": "Complete all 7 lessons",
        "icon": "🎓",
        "points": 180,
        "condition": "lessons_completed >= 7"
    },
    {
        "id": "perfect_challenge",
        "title": "Perfect Score",
        "description": "Achieve 100% on a challenge",
        "icon": "💯",
        "points": 80,
        "condition": "perfect_challenge_score"
    }
]


def check_achievement_unlocks(user, db: Optional[Session] = None) -> List[str]:
    """
    Check which achievements a user should have unlocked.
    Returns list of achievement IDs that are now unlocked.
    """
    unlocked = []
    
    # Get user stats (prefer fresh DB queries if session provided)
    if db is not None:
        analyses_count = db.query(DBAnalysis).filter(DBAnalysis.user_id == user.id).count()
        challenge_attempts = db.query(DBChallengeAttempt).filter(DBChallengeAttempt.user_id == user.id).count()
        lessons_completed = db.query(DBLessonProgress).filter(
            DBLessonProgress.user_id == user.id, DBLessonProgress.completed == True
        ).count()
        challenges_passed = db.query(DBChallengeAttempt).filter(
            DBChallengeAttempt.user_id == user.id, DBChallengeAttempt.passed == True
        ).count()
        perfect_challenge = db.query(DBChallengeAttempt).filter(
            DBChallengeAttempt.user_id == user.id, DBChallengeAttempt.score >= 99.9
        ).count() > 0
    else:
        analyses_count = len(user.analyses) if getattr(user, 'analyses', None) else 0
        challenge_attempts = len(user.challenge_attempts) if getattr(user, 'challenge_attempts', None) else 0
        lessons_completed = sum(1 for l in getattr(user, 'lesson_progress', []) if getattr(l, "completed", False)) if getattr(user, 'lesson_progress', None) else 0
        challenges_passed = sum(1 for c in getattr(user, 'challenge_attempts', []) if getattr(c, 'passed', False)) if getattr(user, 'challenge_attempts', None) else 0
        perfect_challenge = any((getattr(c, 'score', 0) or 0) >= 99.9 for c in getattr(user, 'challenge_attempts', [])) if getattr(user, 'challenge_attempts', None) else 0
    
    # Check each achievement
    for achievement in ACHIEVEMENTS:
        achievement_id = achievement["id"]
        
        # Skip if already unlocked (would check achievements table in production)
        
        # Evaluate condition
        if achievement_id == "first_analysis" and analyses_count >= 1:
            unlocked.append(achievement_id)
        elif achievement_id == "hundred_analyses" and analyses_count >= 100:
            unlocked.append(achievement_id)
        elif achievement_id == "first_challenge" and challenge_attempts >= 1:
            unlocked.append(achievement_id)
        elif achievement_id == "all_challenges" and challenges_passed >= 6:
            unlocked.append(achievement_id)
        elif achievement_id == "seven_day_streak" and user.streak >= 7:
            unlocked.append(achievement_id)
        elif achievement_id == "level_10" and user.level >= 10:
            unlocked.append(achievement_id)
        elif achievement_id == "level_25" and user.level >= 25:
            unlocked.append(achievement_id)
        elif achievement_id == "first_lesson" and lessons_completed >= 1:
            unlocked.append(achievement_id)
        elif achievement_id == "all_lessons" and lessons_completed >= 7:
            unlocked.append(achievement_id)
        elif achievement_id == "perfect_challenge" and perfect_challenge:
            unlocked.append(achievement_id)
    
    return unlocked
