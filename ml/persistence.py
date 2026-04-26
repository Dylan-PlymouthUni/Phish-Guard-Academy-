"""
Persistence layer for user data and analysis history
Handles both SQLite (development) and PostgreSQL (production)
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
import json
from sqlalchemy.orm import Session
from ml.db_models import (
    DBUser, DBAnalysis, DBChallengeAttempt, 
    DBLessonProgress, DBAchievement, SessionLocal
)
from ml.auth import hash_password, verify_password, validate_password_length


class UserRepository:
    """Repository for user operations"""
    
    def __init__(self, db: Session):
        """Store active SQLAlchemy session for user-related operations."""
        self.db = db
    
    def create_user(self, email: str, password: str, name: str) -> Optional[DBUser]:
        """Create a new user"""
        if self.get_by_email(email):
            return None

        validate_password_length(password)
        
        user = DBUser(
            email=email,
            name=name,
            password_hash=hash_password(password),
            level=1,
            xp=0,
            streak=0,
            mfa_enabled=False,
            mfa_secret=None,
            backup_codes=None
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user
    
    def get_by_id(self, user_id: str) -> Optional[DBUser]:
        """Get user by ID"""
        return self.db.query(DBUser).filter(DBUser.id == user_id).first()
    
    def get_by_email(self, email: str) -> Optional[DBUser]:
        """Get user by email"""
        return self.db.query(DBUser).filter(DBUser.email == email).first()
    
    def verify_credentials(self, email: str, password: str) -> Optional[DBUser]:
        """Verify email and password"""
        user = self.get_by_email(email)
        if user and verify_password(password, user.password_hash):
            return user
        return None
    
    def update(self, user_id: str, **kwargs) -> Optional[DBUser]:
        """Update user"""
        user = self.get_by_id(user_id)
        if user:
            for key, value in kwargs.items():
                if hasattr(user, key):
                    setattr(user, key, value)
            user.updated_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(user)
        return user
    
    def add_xp(self, user_id: str, xp: int) -> Optional[DBUser]:
        """Add XP and update level"""
        user = self.get_by_id(user_id)
        if user:
            user.xp += xp
            user.level = (user.xp // 1000) + 1
            user.updated_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(user)
        return user

    # MFA helpers
    def set_mfa_secret(self, user_id: str, secret: str, backup_codes: str):
        """Store MFA secret and backup codes without enabling yet"""
        user = self.get_by_id(user_id)
        if user:
            user.mfa_secret = secret
            user.backup_codes = backup_codes
            user.mfa_enabled = False
            user.updated_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(user)
        return user

    def enable_mfa(self, user_id: str):
        """Mark MFA as enabled for the user"""
        user = self.get_by_id(user_id)
        if user:
            user.mfa_enabled = True
            user.updated_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(user)
        return user

    def disable_mfa(self, user_id: str):
        """Turn off MFA and clear secrets"""
        user = self.get_by_id(user_id)
        if user:
            user.mfa_enabled = False
            user.mfa_secret = None
            user.backup_codes = None
            user.updated_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(user)
        return user

    def consume_backup_code(self, user_id: str, code_hash: str) -> bool:
        """Consume a stored backup code if it exists"""
        user = self.get_by_id(user_id)
        if not user or not user.backup_codes:
            return False
        try:
            codes = json.loads(user.backup_codes)
        except Exception:
            return False
        if code_hash in codes:
            codes.remove(code_hash)
            user.backup_codes = json.dumps(codes)
            user.updated_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(user)
            return True
        return False


class AnalysisRepository:
    """Repository for analysis history"""
    
    def __init__(self, db: Session):
        """Store active SQLAlchemy session for analysis history operations."""
        self.db = db
    
    def save_analysis(
        self,
        user_id: str,
        analysis_type: str,
        risk_score: float,
        findings: str,
        input_url: Optional[str] = None,
        input_text: Optional[str] = None,
        image_path: Optional[str] = None
    ) -> DBAnalysis:
        """Save analysis to database"""
        analysis = DBAnalysis(
            user_id=user_id,
            analysis_type=analysis_type,
            risk_score=risk_score,
            findings=findings,
            input_url=input_url,
            input_text=input_text,
            image_path=image_path
        )
        self.db.add(analysis)
        self.db.commit()
        self.db.refresh(analysis)
        return analysis
    
    def get_by_user(self, user_id: str, limit: int = 100) -> List[DBAnalysis]:
        """Get analyses for user"""
        return self.db.query(DBAnalysis) \
            .filter(DBAnalysis.user_id == user_id) \
            .order_by(DBAnalysis.created_at.desc()) \
            .limit(limit) \
            .all()
    
    def get_by_id(self, analysis_id: str) -> Optional[DBAnalysis]:
        """Get analysis by ID"""
        return self.db.query(DBAnalysis).filter(DBAnalysis.id == analysis_id).first()
    
    def delete(self, analysis_id: str) -> bool:
        """Delete analysis"""
        analysis = self.get_by_id(analysis_id)
        if analysis:
            self.db.delete(analysis)
            self.db.commit()
            return True
        return False
    
    def get_user_stats(self, user_id: str) -> Dict[str, Any]:
        """Get statistics for user"""
        analyses = self.get_by_user(user_id, limit=1000)
        
        if not analyses:
            return {
                "total_analyses": 0,
                "high_risk": 0,
                "medium_risk": 0,
                "low_risk": 0,
                "average_risk": 0.0
            }
        
        high_risk = sum(1 for a in analyses if a.risk_score >= 70)
        medium_risk = sum(1 for a in analyses if 40 <= a.risk_score < 70)
        low_risk = sum(1 for a in analyses if a.risk_score < 40)
        average_risk = sum(a.risk_score for a in analyses) / len(analyses)
        
        return {
            "total_analyses": len(analyses),
            "high_risk": high_risk,
            "medium_risk": medium_risk,
            "low_risk": low_risk,
            "average_risk": average_risk
        }


class ChallengeRepository:
    """Repository for challenge attempts"""
    
    def __init__(self, db: Session):
        """Store active SQLAlchemy session for challenge attempt operations."""
        self.db = db
    
    def save_attempt(
        self,
        user_id: str,
        challenge_id: str,
        score: float,
        correct: int,
        total: int,
        passed: bool,
        time_taken: int,
        feedback: str
    ) -> DBChallengeAttempt:
        """Save challenge attempt"""
        attempt = DBChallengeAttempt(
            user_id=user_id,
            challenge_id=challenge_id,
            score=score,
            correct_answers=correct,
            total_questions=total,
            passed=passed,
            time_taken=time_taken,
            feedback=feedback,
            completed_at=datetime.utcnow()
        )
        self.db.add(attempt)
        self.db.commit()
        self.db.refresh(attempt)
        return attempt
    
    def get_user_attempts(self, user_id: str) -> List[DBChallengeAttempt]:
        """Get all challenge attempts for user"""
        return self.db.query(DBChallengeAttempt) \
            .filter(DBChallengeAttempt.user_id == user_id) \
            .order_by(DBChallengeAttempt.attempted_at.desc()) \
            .all()
    
    def get_challenge_stats(self, user_id: str) -> Dict[str, Any]:
        """Get challenge statistics for user"""
        attempts = self.get_user_attempts(user_id)
        
        if not attempts:
            return {
                "total_attempts": 0,
                "passed": 0,
                "average_score": 0.0
            }
        
        passed = sum(1 for a in attempts if a.passed)
        average_score = sum(a.score for a in attempts) / len(attempts) if attempts else 0
        
        return {
            "total_attempts": len(attempts),
            "passed": passed,
            "average_score": average_score
        }


class LessonRepository:
    """Repository for lesson progress"""
    
    def __init__(self, db: Session):
        """Store active SQLAlchemy session for lesson progress operations."""
        self.db = db
    
    def mark_progress(
        self,
        user_id: str,
        lesson_id: str,
        progress_percent: float,
        completed: bool = False
    ) -> DBLessonProgress:
        """Update or create lesson progress"""
        progress = self.db.query(DBLessonProgress) \
            .filter_by(user_id=user_id, lesson_id=lesson_id) \
            .first()
        
        if not progress:
            progress = DBLessonProgress(
                user_id=user_id,
                lesson_id=lesson_id,
                progress_percent=progress_percent,
                completed=completed
            )
            self.db.add(progress)
        else:
            progress.progress_percent = progress_percent
            if completed:
                progress.completed = True
                progress.completed_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(progress)
        return progress
    
    def get_user_progress(self, user_id: str) -> List[DBLessonProgress]:
        """Get all lesson progress for user"""
        return self.db.query(DBLessonProgress) \
            .filter(DBLessonProgress.user_id == user_id) \
            .all()
    
    def get_lesson_stats(self, user_id: str) -> Dict[str, Any]:
        """Get lesson statistics for user"""
        progress_list = self.get_user_progress(user_id)
        
        completed = sum(1 for p in progress_list if p.completed)
        
        return {
            "total_lessons": len(progress_list),
            "completed": completed,
            "average_progress": sum(p.progress_percent for p in progress_list) / len(progress_list) if progress_list else 0
        }


def get_repositories(db: Session):
    """Get all repositories for a database session"""
    return {
        "users": UserRepository(db),
        "analyses": AnalysisRepository(db),
        "challenges": ChallengeRepository(db),
        "lessons": LessonRepository(db)
    }
