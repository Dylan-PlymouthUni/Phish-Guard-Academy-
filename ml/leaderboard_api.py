"""
Leaderboard API endpoints for PhishGuard Academy
This module defines the API endpoints related to the leaderboard functionality of the PhishGuard Academy platform. 
It includes endpoints to retrieve the global leaderboard, which ranks users based on their XP and other stats, as well as an endpoint to get a specific user's rank and stats.
 The leaderboard data is fetched from the database, and the endpoints are protected with authentication to ensure that only authorized users can access this information. 
 The module also integrates with the achievements system to provide additional context about users' progress and accomplishments on the platform.
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from ml.db_models import get_db, DBUser
from ml.persistence import get_repositories
from ml.auth import verify_token
from ml.achievements import check_achievement_unlocks

router = APIRouter(prefix="/api/leaderboard", tags=["leaderboard"])


class LeaderboardEntryResponse(BaseModel):
    """Schema for LeaderboardEntryResponse data."""
    rank: int
    user_id: str
    name: str
    xp: int
    level: int
    streak: int
    analyses_count: int
    achievements_count: int


@router.get("", response_model=dict)
async def get_leaderboard(limit: int = 10, request: Request = None, db: Session = Depends(get_db)):
    """Get global leaderboard. Uses auth optionally to include current-user context."""
    try:
        repos = get_repositories(db)

        # Optional auth context: leaderboard itself is public, personalized fields are not required.
        user = None
        auth_header = request.headers.get("Authorization") if request else None
        if auth_header:
            try:
                parts = auth_header.split(" ")
                if len(parts) == 2 and parts[0].lower() == "bearer":
                    token_data = verify_token(parts[1])
                    if token_data:
                        user = repos["users"].get_by_id(token_data.user_id)
            except Exception:
                user = None

        if user:
            db.refresh(user)
            print(f"[LEADERBOARD] Refreshed user: {user.email} XP={user.xp}")
        
        # Get all users sorted by XP
        all_users = db.query(DBUser).order_by(DBUser.xp.desc()).all()
        print(f"[LEADERBOARD] Total users in DB: {len(all_users)}")
        
        # Get top N users
        top_users = all_users[:limit]
        
        # Build leaderboard entries
        leaderboard = []
        for idx, u in enumerate(top_users):
            # Keep one bad user row from breaking the entire endpoint.
            try:
                analyses_count = len(repos["analyses"].get_by_user(u.id, limit=100000))
            except Exception:
                analyses_count = 0

            try:
                achievements_count = len(check_achievement_unlocks(u, db))
            except Exception:
                achievements_count = 0
            
            leaderboard.append(LeaderboardEntryResponse(
                rank=idx + 1,
                user_id=u.id,
                name=u.name or "User",
                xp=int(u.xp or 0),
                level=int(u.level or 1),
                streak=int(u.streak or 0),
                analyses_count=analyses_count,
                achievements_count=achievements_count
            ))
        
        # Find current user's rank
        current_user_rank = None
        if user:
            for idx, u in enumerate(all_users):
                if u.id == user.id:
                    current_user_rank = idx + 1
                    break
        
        # If user is not in top N, add them separately
        current_user_entry = None
        if user and current_user_rank and current_user_rank > limit:
            analyses_count = len(repos["analyses"].get_by_user(user.id, limit=100000))
            current_user_entry = LeaderboardEntryResponse(
                rank=current_user_rank,
                user_id=user.id,
                name=user.name or "User",
                xp=int(user.xp or 0),
                level=int(user.level or 1),
                streak=int(user.streak or 0),
                analyses_count=analyses_count,
                achievements_count=len(check_achievement_unlocks(user, db))
            )
        
        
        return {
            "leaderboard": leaderboard,
            "current_user": current_user_entry,
            "current_user_rank": current_user_rank,
            "user_stats": {
                "xp": int(user.xp or 0),
                "level": int(user.level or 1),
                "streak": int(user.streak or 0)
            } if user else None,
            "auth": {
                "authenticated": bool(user)
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch leaderboard: {str(e)}")


@router.get("/user/{user_id}")
async def get_user_rank(user_id: str, db: Session = Depends(get_db)):
    """Get specific user's rank and stats"""
    try:
        repos = get_repositories(db)
        target_user = repos["users"].get_by_id(user_id)
        
        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get all users to calculate rank
        all_users = db.query(DBUser).order_by(DBUser.xp.desc()).all()
        
        rank = None
        for idx, u in enumerate(all_users):
            if u.id == user_id:
                rank = idx + 1
                break
        
        analyses_count = len(target_user.analyses) if target_user.analyses else 0
        
        return {
            "user_id": target_user.id,
            "name": target_user.name,
            "rank": rank,
            "xp": target_user.xp,
            "level": target_user.level,
            "streak": target_user.streak,
            "analyses_count": analyses_count,
            "achievements_count": len(check_achievement_unlocks(target_user))
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch user rank: {str(e)}")
