"""
Authentication utilities and schemas for PhishGuard Academy
"""
import os
from datetime import datetime, timedelta
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr

# Config
SECRET_KEY = os.getenv("AUTH_SECRET_KEY", "super-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "43200"))  # 30 days by default

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# Pydantic schemas
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenData(BaseModel):
    user_id: str
    email: EmailStr


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user_id: str
    email: EmailStr
    name: Optional[str] = None


class UserProfile(BaseModel):
    user_id: str
    email: EmailStr
    name: str
    created_at: str
    level: int
    xp: int
    streak: int


# Password helpers

def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False


# JWT helpers

def create_access_token(user_id: str, email: str, expires_minutes: Optional[int] = None) -> str:
    expire_delta = timedelta(minutes=expires_minutes or ACCESS_TOKEN_EXPIRE_MINUTES)
    expire = datetime.utcnow() + expire_delta
    to_encode = {"sub": str(user_id), "email": email, "exp": expire}
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str) -> Optional[TokenData]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        email = payload.get("email")
        if not user_id or not email:
            return None
        return TokenData(user_id=user_id, email=email)
    except JWTError:
        return None
