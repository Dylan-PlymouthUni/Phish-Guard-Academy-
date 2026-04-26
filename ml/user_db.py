"""
Simple in-memory user database (will be replaced with PostgreSQL)
For now, this stores user data in memory with persistence to JSON file
This is a lightweight implementation for demonstration purposes.
 In production, this would be replaced with a robust database solution like PostgreSQL, along with proper ORM models and secure password handling.
"""
import json
import os
from typing import Optional, Dict, Any
from datetime import datetime
import uuid
from ml.auth import hash_password, verify_password, validate_password_length

USERS_FILE = "data/users.json"

class UserDatabase:
    """In-memory user database with JSON persistence"""
    
    def __init__(self):
        """Initialize class state and store required dependencies."""
        self.users: Dict[str, Dict[str, Any]] = {}
        self.load_from_file()
    
    def load_from_file(self):
        """Load users from JSON file"""
        if os.path.exists(USERS_FILE):
            try:
                with open(USERS_FILE, 'r') as f:
                    self.users = json.load(f)
            except Exception as e:
                print(f"Error loading users file: {e}")
                self.users = {}
    
    def save_to_file(self):
        """Save users to JSON file"""
        os.makedirs(os.path.dirname(USERS_FILE) or ".", exist_ok=True)
        try:
            with open(USERS_FILE, 'w') as f:
                json.dump(self.users, f, indent=2)
        except Exception as e:
            print(f"Error saving users file: {e}")
    
    def create_user(self, email: str, password: str, name: str) -> Optional[Dict[str, Any]]:
        """Create a new user"""
        # Check if user already exists
        if any(u["email"] == email for u in self.users.values()):
            return None

        validate_password_length(password)
        
        user_id = str(uuid.uuid4())
        user = {
            "user_id": user_id,
            "email": email,
            "name": name,
            "password_hash": hash_password(password),
            "created_at": datetime.utcnow().isoformat(),
            "level": 1,
            "xp": 0,
            "streak": 0,
            "last_activity": datetime.utcnow().isoformat(),
            "mfa_enabled": False,
            "mfa_secret": None,
            "backup_codes": None
        }
        
        self.users[user_id] = user
        self.save_to_file()
        return user
    
    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user by email"""
        for user in self.users.values():
            if user["email"] == email:
                return user
        return None
    
    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID"""
        return self.users.get(user_id)
    
    def verify_user(self, email: str, password: str) -> Optional[Dict[str, Any]]:
        """Verify user credentials"""
        user = self.get_user_by_email(email)
        if user and verify_password(password, user["password_hash"]):
            return user
        return None
    
    def update_user(self, user_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update user data"""
        user = self.get_user_by_id(user_id)
        if user:
            user.update(updates)
            user["last_activity"] = datetime.utcnow().isoformat()
            self.save_to_file()
            return user
        return None
    
    def update_xp(self, user_id: str, xp_gained: int) -> Optional[Dict[str, Any]]:
        """Update user XP and level"""
        user = self.get_user_by_id(user_id)
        if user:
            user["xp"] += xp_gained
            # Level up every 1000 XP
            user["level"] = (user["xp"] // 1000) + 1
            self.save_to_file()
            return user
        return None
    
    def update_user_mfa(self, email: str, mfa_enabled: bool = None, mfa_secret: str = None, backup_codes: str = None) -> Optional[Dict[str, Any]]:
        """Update user MFA settings"""
        user = self.get_user_by_email(email)
        if user:
            if mfa_enabled is not None:
                user["mfa_enabled"] = mfa_enabled
            if mfa_secret is not None:
                user["mfa_secret"] = mfa_secret
            if backup_codes is not None:
                user["backup_codes"] = backup_codes
            user["last_activity"] = datetime.utcnow().isoformat()
            self.save_to_file()
            return user
        return None

# Global database instance
db = UserDatabase()

# Convenience functions
def update_user_mfa(email: str, **kwargs):
    """Update user mfa and persist changes.

Args: email, **kwargs."""
    return db.update_user_mfa(email, **kwargs)
