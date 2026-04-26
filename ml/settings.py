"""Settings utilities for PhishGuard Academy.
This module defines the UserSettings data model and provides functions to load and save user settings for the PhishGuard Academy platform.
The UserSettings model includes fields for theme, notification preferences, difficulty level, language, privacy mode, auto-save settings, and a timestamp for when the settings were last updated. 
The get_settings function loads the settings from a JSON file, while the save_settings function saves the settings back to the file, ensuring that the last_updated timestamp is updated each time the settings are saved. 
This allows users to customize their experience on the platform and have their preferences persist across sessions. 
The settings are stored in a JSON file located at data/user_settings.json, and the module ensures that the necessary directories are created if they do not exist."""

import json
from datetime import datetime
from pathlib import Path
from pydantic import BaseModel, Field
from typing import Optional

class UserSettings(BaseModel):
    """Schema for UserSettings data."""
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
