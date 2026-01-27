"""
SQLAlchemy ORM models for PhishGuard Academy database
"""
from sqlalchemy import Column, String, Integer, Float, DateTime, Boolean, Text, ForeignKey, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
from datetime import datetime
import os
import uuid

Base = declarative_base()

class DBUser(Base):
    """User account model"""
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # MFA fields
    mfa_enabled = Column(Boolean, default=False)
    mfa_secret = Column(String(32), nullable=True)  # TOTP secret
    backup_codes = Column(Text, nullable=True)  # JSON array of hashed backup codes
    
    # Gamification
    level = Column(Integer, default=1)
    xp = Column(Integer, default=0)
    streak = Column(Integer, default=0)
    last_activity = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    analyses = relationship("DBAnalysis", back_populates="user", cascade="all, delete-orphan")
    challenge_attempts = relationship("DBChallengeAttempt", back_populates="user", cascade="all, delete-orphan")
    lesson_progress = relationship("DBLessonProgress", back_populates="user", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<DBUser {self.email}>"


class DBAnalysis(Base):
    """Phishing analysis history model"""
    __tablename__ = "analyses"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    
    analysis_type = Column(String(50), nullable=False)  # "url", "email", "screenshot", "multi"
    input_text = Column(Text)
    input_url = Column(String(2048))
    image_path = Column(String(255))
    
    risk_score = Column(Float, nullable=False)
    findings = Column(Text)  # JSON string
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    user = relationship("DBUser", back_populates="analyses")
    
    def __repr__(self):
        return f"<DBAnalysis {self.id} - Risk: {self.risk_score}>"


class DBChallengeAttempt(Base):
    """Challenge attempt history model"""
    __tablename__ = "challenge_attempts"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    
    challenge_id = Column(String(50), nullable=False)
    score = Column(Float, nullable=False)  # 0-100
    correct_answers = Column(Integer, default=0)
    total_questions = Column(Integer, default=0)
    passed = Column(Boolean, default=False)
    
    time_taken = Column(Integer)  # seconds
    feedback = Column(Text)  # JSON string
    
    attempted_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime)
    
    # Relationship
    user = relationship("DBUser", back_populates="challenge_attempts")
    
    def __repr__(self):
        return f"<DBChallengeAttempt {self.challenge_id} - Score: {self.score}>"


class DBLessonProgress(Base):
    """Lesson completion progress model"""
    __tablename__ = "lesson_progress"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    
    lesson_id = Column(String(50), nullable=False)
    completed = Column(Boolean, default=False)
    progress_percent = Column(Float, default=0.0)  # 0-100
    
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    
    # Relationship
    user = relationship("DBUser", back_populates="lesson_progress")
    
    def __repr__(self):
        return f"<DBLessonProgress {self.lesson_id} - {self.progress_percent}%>"


class DBAchievement(Base):
    """Achievement/badge model"""
    __tablename__ = "achievements"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    
    achievement_id = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    icon = Column(String(255))
    
    unlocked_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    def __repr__(self):
        return f"<DBAchievement {self.achievement_id}>"


# Database setup
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./phishguard.db"  # Default to SQLite for development
)

engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    """Initialize database tables"""
    Base.metadata.create_all(bind=engine)

def get_db():
    """Dependency for getting database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
