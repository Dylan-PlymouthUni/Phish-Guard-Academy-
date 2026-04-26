"""
Authentication utilities and schemas for PhishGuard Academy
This module provides the necessary functions and data models for handling user authentication, including password hashing, JWT token creation and verification, and Pydantic schemas for user registration, login, and token responses.
The authentication system is designed to be secure and efficient, using industry-standard practices for password management and token-based authentication. It also includes validation to ensure that passwords meet the requirements of the underlying hashing algorithm and that tokens are properly structured and signed. This module serves as the foundation for the authentication endpoints defined in auth_api.py, enabling secure access to the PhishGuard Academy platform and its features.
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
MAX_BCRYPT_BYTES = 72


# Pydantic schemas
class UserCreate(BaseModel):
    """Payload used when registering a new user."""
    email: EmailStr
    password: str
    name: str


class UserLogin(BaseModel):
    """Payload used when authenticating an existing user."""
    email: EmailStr
    password: str


class TokenData(BaseModel):
    """JWT claims extracted after a token is verified."""
    user_id: str
    email: EmailStr


class TokenResponse(BaseModel):
    """Standard token response returned by login/register endpoints."""
    access_token: str
    token_type: str
    user_id: str
    email: EmailStr
    name: Optional[str] = None


class UserProfile(BaseModel):
    """Public profile shape returned to the frontend."""
    user_id: str
    email: EmailStr
    name: str
    created_at: str
    level: int
    xp: int
    streak: int


# Password helpers

def validate_password_length(password: str) -> None:
    """Enforce bcrypt's 72-byte input limit before hashing."""
    if len(password.encode("utf-8")) > MAX_BCRYPT_BYTES:
        raise ValueError(
            "Password cannot be longer than 72 bytes. "
            "Please use a shorter password (first 72 characters)."
        )


def hash_password(password: str) -> str:
    """Hash a plaintext password using the configured passlib context."""
    validate_password_length(password)
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Return True when plaintext password matches stored hash."""
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False


# JWT helpers

def create_access_token(user_id: str, email: str, expires_minutes: Optional[int] = None) -> str:
    """Create and sign a JWT access token for the given user."""
    expire_delta = timedelta(minutes=expires_minutes or ACCESS_TOKEN_EXPIRE_MINUTES)
    expire = datetime.utcnow() + expire_delta
    to_encode = {"sub": str(user_id), "email": email, "exp": expire}
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str) -> Optional[TokenData]:
    """Decode a JWT and return token claims, or None if invalid/expired."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        email = payload.get("email")
        if not user_id or not email:
            return None
        return TokenData(user_id=user_id, email=email)
    except JWTError:
        return None
