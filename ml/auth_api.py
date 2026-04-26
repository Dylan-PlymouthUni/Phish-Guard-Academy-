"""
Authentication API endpoints for PhishGuard Academy
This module defines the API endpoints related to user authentication and profile management for the PhishGuard Academy platform. It includes endpoints for user registration, login (with optional MFA), profile retrieval and updates, XP management, token verification, and achievement status. 
The endpoints are protected with JWT-based authentication and include rate limiting to prevent abuse. 
The module also integrates with the behavior analysis system to log relevant user activities for security monitoring and personalized feedback.
"""
from fastapi import APIRouter, HTTPException, Depends, Header, Request
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from ml.auth import (
    UserCreate, UserLogin, TokenResponse, UserProfile,
    create_access_token, verify_token, validate_password_length
)
from ml.db_models import get_db
from ml.persistence import get_repositories
from ml.mfa_service import mfa_service
from ml.limiter import limiter
from ml.behavioral_analysis import behavior_analyzer
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginResponse(BaseModel):
    """Schema for LoginResponse data."""
    access_token: Optional[str] = None
    token_type: Optional[str] = None
    user_id: Optional[str] = None
    email: Optional[str] = None
    name: Optional[str] = None
    mfa_required: bool = False


class MFALoginRequest(BaseModel):
    """Schema for MFALoginRequest data."""
    email: str
    token: str
    backup_code: Optional[str] = None


def get_current_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    """Dependency to get current user from JWT token"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")
    
    # Extract token from "Bearer <token>"
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid auth scheme")
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    # Verify token
    token_data = verify_token(token)
    if not token_data:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    # Get user from database
    repos = get_repositories(db)
    user = repos["users"].get_by_id(token_data.user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user


@router.get("/me", response_model=UserProfile)
async def get_current_user_profile(user = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get current user profile with fresh stats"""
    db.refresh(user)
    return UserProfile(
        user_id=user.id,
        email=user.email,
        name=user.name,
        created_at=user.created_at.isoformat(),
        level=user.level,
        xp=user.xp,
        streak=user.streak
    )


@router.post("/register", response_model=TokenResponse)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
    try:
        repos = get_repositories(db)
        # Check if email already exists
        if repos["users"].get_by_email(user_data.email):
            raise HTTPException(status_code=400, detail="Email already registered")

        # Validate password length (bcrypt limit)
        try:
            validate_password_length(user_data.password)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

        # Create user
        user = repos["users"].create_user(
            email=user_data.email,
            password=user_data.password,
            name=user_data.name
        )

        if not user:
            raise HTTPException(status_code=400, detail="Failed to create user")

        # Create token
        token = create_access_token(user.id, user.email)
        behavior_analyzer.log_activity(user.email, "register", {"source": "api"})
        behavior_analyzer.update_baseline(user.email)

        return TokenResponse(
            access_token=token,
            token_type="bearer",
            user_id=user.id,
            email=user.email,
            name=user.name
        )
    except HTTPException:
        # Propagate expected API errors
        raise
    except Exception as e:
        # Ensure JSON error responses for unexpected failures
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")


@router.post("/login/mfa", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login_mfa(request: Request, body: MFALoginRequest, db: Session = Depends(get_db)):
    """Verify MFA token or backup code and issue JWT"""
    try:
        repos = get_repositories(db)
        user = repos["users"].get_by_email(body.email)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        if not getattr(user, "mfa_enabled", False) or not user.mfa_secret:
            raise HTTPException(status_code=400, detail="MFA not enabled for this account")

        # Prefer TOTP token verification
        if body.token:
            if not mfa_service.verify_token(user.mfa_secret, body.token):
                # If token fails and backup_code provided, try backup
                if body.backup_code:
                    code_hash = mfa_service.hash_backup_code(body.backup_code)
                    if not repos["users"].consume_backup_code(user.id, code_hash):
                        raise HTTPException(status_code=400, detail="Invalid code")
                else:
                    raise HTTPException(status_code=400, detail="Invalid token")
        elif body.backup_code:
            code_hash = mfa_service.hash_backup_code(body.backup_code)
            if not repos["users"].consume_backup_code(user.id, code_hash):
                raise HTTPException(status_code=400, detail="Invalid code")
        else:
            raise HTTPException(status_code=400, detail="Token or backup code required")

        token = create_access_token(user.id, user.email)
        behavior_analyzer.log_activity(user.email, "login", {"mfa_required": False, "used_backup_code": bool(body.backup_code)})
        behavior_analyzer.update_baseline(user.email)
        return TokenResponse(
            access_token=token,
            token_type="bearer",
            user_id=user.id,
            email=user.email,
            name=user.name
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"MFA login failed: {str(e)}")


@router.post("/login", response_model=LoginResponse)
@limiter.limit("10/minute")
async def login(request: Request, credentials: UserLogin, db: Session = Depends(get_db)):
    """Login with email and password"""
    try:
        repos = get_repositories(db)

        # Verify credentials
        user = repos["users"].verify_credentials(credentials.email, credentials.password)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        # Update streak on login
        if user.last_activity:
            now = datetime.utcnow()
            last_activity = user.last_activity
            time_diff = (now - last_activity).days
            
            if time_diff == 0:
                # Same day, don't change streak
                pass
            elif time_diff == 1:
                # One day later, increment streak
                user.streak += 1
            else:
                # More than 1 day, reset streak
                user.streak = 1
        else:
            # First login
            user.streak = 1
        
        user.last_activity = datetime.utcnow()
        db.commit()
        db.refresh(user)

        # If MFA is enabled, require OTP before issuing token
        if getattr(user, "mfa_enabled", False):
            behavior_analyzer.log_activity(user.email, "login", {"mfa_required": True})
            behavior_analyzer.update_baseline(user.email)
            return {
                "mfa_required": True,
                "user_id": user.id,
                "email": user.email,
                "name": user.name
            }

        # Create token
        token = create_access_token(user.id, user.email)
        behavior_analyzer.log_activity(user.email, "login", {"mfa_required": False})
        behavior_analyzer.update_baseline(user.email)

        return TokenResponse(
            access_token=token,
            token_type="bearer",
            user_id=user.id,
            email=user.email,
            name=user.name
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")


@router.get("/profile", response_model=UserProfile)
async def get_profile(user = Depends(get_current_user)):
    """Get current user profile"""
    return UserProfile(
        user_id=user.id,
        email=user.email,
        name=user.name,
        created_at=user.created_at.isoformat(),
        level=user.level,
        xp=user.xp,
        streak=user.streak
    )


@router.put("/profile")
async def update_profile(
    name: Optional[str] = None,
    user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user profile"""
    repos = get_repositories(db)
    
    updates = {}
    if name:
        updates["name"] = name
    
    updated_user = repos["users"].update(user.id, **updates)
    if not updated_user:
        raise HTTPException(status_code=400, detail="Failed to update profile")
    
    return UserProfile(
        user_id=updated_user.id,
        email=updated_user.email,
        name=updated_user.name,
        created_at=updated_user.created_at.isoformat(),
        level=updated_user.level,
        xp=updated_user.xp,
        streak=updated_user.streak
    )


@router.post("/add-xp")
async def add_xp(xp: int, user = Depends(get_current_user), db: Session = Depends(get_db)):
    """Add XP to user"""
    if xp <= 0:
        raise HTTPException(status_code=400, detail="XP must be positive")
    
    repos = get_repositories(db)
    updated_user = repos["users"].add_xp(user.id, xp)
    if not updated_user:
        raise HTTPException(status_code=400, detail="Failed to add XP")
    
    return {
        "xp": updated_user.xp,
        "level": updated_user.level
    }


@router.post("/verify-token")
async def verify_jwt_token(authorization: Optional[str] = Header(None)):
    """Verify if a JWT token is valid"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")
    
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid auth scheme")
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token_data = verify_token(token)
    if not token_data:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    return {
        "valid": True,
        "user_id": token_data.user_id,
        "email": token_data.email
    }

@router.get("/achievements")
async def get_achievements(user = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get user's achievement status"""
    from ml.achievements import ACHIEVEMENTS, check_achievement_unlocks
    
    try:
        # Refresh user object from database to get latest stats
        db.refresh(user)
        # Ensure relationships are fresh or use direct DB counts
        unlocked_ids = check_achievement_unlocks(user, db)
        
        return {
            "total_achievements": len(ACHIEVEMENTS),
            "unlocked_count": len(unlocked_ids),
            "user_stats": {
                "xp": user.xp,
                "level": user.level,
                "streak": user.streak
            },
            "achievements": [
                {
                    "id": a["id"],
                    "title": a["title"],
                    "description": a["description"],
                    "icon": a["icon"],
                    "points": a["points"],
                    "unlocked": a["id"] in unlocked_ids
                }
                for a in ACHIEVEMENTS
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch achievements: {str(e)}")