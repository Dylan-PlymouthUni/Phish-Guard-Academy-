import json
from datetime import datetime
from pathlib import Path
from pydantic import BaseModel, Field
from typing import Optional

class UserSettings(BaseModel):
    theme: str = "dark"
    notifications_enabled: bool = True
    email_notifications: bool = False
    difficulty_level: str = "beginner"
    language: str = "en"
    privacy_mode: bool = False
    auto_save_enabled: bool = True
    last_updated: Optional[str] = None

DEFAULT_SETTINGS = UserSettings()
SETTINGS_FILE = Path("data/user_settings.json")

def get_settings() -> UserSettings:
    """Load user settings"""
    SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
    if SETTINGS_FILE.exists():
        try:
            with open(SETTINGS_FILE) as f:
                data = json.load(f)
                return UserSettings(**data)
        except Exception as e:
            print(f"Error loading settings: {e}")
    return UserSettings(last_updated=datetime.now().isoformat())

def save_settings(settings: UserSettings) -> UserSettings:
    """Save user settings"""
    SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
    settings.last_updated = datetime.now().isoformat()
    with open(SETTINGS_FILE, 'w') as f:
        json.dump(json.loads(settings.model_dump_json()), f, indent=2)
    return settings
