"""
Learning and challenges API endpoints
"""
from fastapi import APIRouter, HTTPException, Request
from typing import List, Dict, Any
import json
import logging
from datetime import datetime

from ml.challenges import CHALLENGES
from ml.learning import LESSONS
from ml.db_models import SessionLocal, DBChallengeAttempt, DBLessonProgress
from ml.auth import verify_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["learning"])

def get_optional_user(request: Request):
    """Return authenticated token_data if Authorization bearer token is present; otherwise None."""
    auth_header = request.headers.get("Authorization") if request else None
    if not auth_header:
        return None
    parts = auth_header.split(" ")
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    token = parts[1]
    token_data = verify_token(token)
    return token_data


@router.get("/challenges")
async def get_challenges() -> List[Dict[str, Any]]:
    """Get all available challenges"""
    return [
        {
            "id": c["id"],
            "title": c["title"],
            "description": c["description"],
            "difficulty": c["difficulty"],
            "time_limit": c["time_limit"],
            "points": c.get("points_reward", 0),
            "questions": c["questions"],
            "stats": {
                "attempts": 0,
                "passed": 0,
                "best_score": 0
            }
        }
        for c in CHALLENGES
    ]


@router.post("/submit-challenge")
async def submit_challenge(
    data: Dict[str, Any],
    request: Request
) -> Dict[str, Any]:
    """Submit challenge answers and get results"""
    challenge_id = data.get("challenge_id")
    answers = data.get("answers", {})
    time_taken = data.get("time_taken", 0)
    
    # Find challenge
    challenge = next((c for c in CHALLENGES if c["id"] == challenge_id), None)
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    
    # Grade answers
    total = len(challenge["questions"])
    correct = 0
    feedback = []
    
    for q in challenge["questions"]:
        user_answer = answers.get(q["id"], "")
        is_correct = user_answer.lower().strip() == q["correct_answer"].lower().strip()
        if is_correct:
            correct += 1
        feedback.append({
            "question_id": q["id"],
            "correct": is_correct,
            "user_answer": user_answer,
            "correct_answer": q["correct_answer"],
            "explanation": q.get("explanation", "")
        })
    
    score = (correct / total) * 100 if total > 0 else 0
    points_reward = challenge.get("points_reward", 100)
    earned_points = int((correct / total) * points_reward) if total > 0 else 0
    passed = score >= challenge.get("passing_score", 70)

    # Persist attempt if user is authenticated
    token_data = get_optional_user(request)
    if token_data:
        db = SessionLocal()
        try:
            from ml.persistence import get_repositories
            repos = get_repositories(db)
            db_user = repos["users"].get_by_id(token_data.user_id)
            if db_user:
                attempt = DBChallengeAttempt(
                    user_id=db_user.id,
                    challenge_id=challenge_id,
                    score=score,
                    correct_answers=correct,
                    total_questions=total,
                    passed=passed,
                    feedback=json.dumps(feedback)
                )
                db.add(attempt)
                db_user.xp = (db_user.xp or 0) + int(earned_points)
                db_user.level = (db_user.xp // 1000) + 1
                db.commit()
        except Exception as db_err:
            db.rollback()
            logger.error(f"Failed to persist challenge attempt: {db_err}")
        finally:
            db.close()
    
    return {
        "score": score,
        "correct": correct,
        "total": total,
        "points_earned": earned_points,
        "feedback": feedback,
        "passed": passed
    }


@router.get("/lessons")
async def get_lessons() -> List[Dict[str, Any]]:
    """Get all available lessons"""
    return [
        {
            "id": lesson["id"],
            "title": lesson["title"],
            "description": lesson["description"],
            "difficulty": lesson["difficulty"],
            "duration": lesson["duration"],
            "points": lesson.get("points_reward", 0),
            "content": lesson["content"],
            "completed": False
        }
        for lesson in LESSONS
    ]


@router.post("/complete-lesson/{lesson_id}")
async def complete_lesson(
    lesson_id: str,
    request: Request
) -> Dict[str, Any]:
    """Mark lesson as complete and award points"""
    # Find lesson
    lesson = next((l for l in LESSONS if l["id"] == lesson_id), None)
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    points = lesson.get("points_reward", 50)

    # Persist lesson progress if user is authenticated
    token_data = get_optional_user(request)
    print(f"[LESSON_COMPLETE] TokenData: {token_data.user_id if token_data else 'None'}, Lesson: {lesson_id}, Points: {points}")
    if token_data:
        db = SessionLocal()
        try:
            from ml.persistence import get_repositories
            repos = get_repositories(db)
            db_user = repos["users"].get_by_id(token_data.user_id)
            if db_user:
                old_xp = db_user.xp or 0
                existing = next((lp for lp in db_user.lesson_progress if lp.lesson_id == lesson_id), None)
                if not existing:
                    existing = DBLessonProgress(user_id=db_user.id, lesson_id=lesson_id, completed=True, progress_percent=100.0)
                    db.add(existing)
                else:
                    existing.completed = True
                    existing.progress_percent = 100.0
                db_user.xp = (db_user.xp or 0) + int(points)
                db_user.level = (db_user.xp // 1000) + 1
                db.commit()
                db.refresh(db_user)
                print(f"[LESSON_PERSIST] SAVED: {db_user.email} XP: {old_xp} -> {db_user.xp}")
        except Exception as db_err:
            db.rollback()
            logger.error(f"Failed to persist lesson progress: {db_err}")
            print(f"[LESSON_ERROR] {db_err}")
        finally:
            db.close()
    
    return {
        "success": True,
        "points_earned": points,
        "lesson_id": lesson_id
    }


@router.get("/progress")
async def get_progress() -> Dict[str, Any]:
    """Get user progress summary"""
    # This would normally fetch from database
    # For now, return basic structure
    return {
        "total_points": 0,
        "lessons_completed": 0,
        "challenges_passed": 0,
        "achievements": []
    }
