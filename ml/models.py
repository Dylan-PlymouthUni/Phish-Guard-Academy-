"""Lightweight local data models and JSONL-backed helper utilities.
This module defines the AnalysisResult data model, which represents a single phishing analysis record with fields for ID, timestamp, type, risk percentage, status, OCR text, and URLs.
It also provides utility functions to save analysis results to a JSONL file, retrieve user statistics based on the saved analyses, and get recent analysis records for display in the user profile. 
The data is stored in a JSONL file located at data/analyses.jsonl, and the utilities ensure that the file is created if it doesn't exist and that the data is read and written in a structured format using Pydantic for validation.
 This allows the platform to maintain a history of analyses and provide"""

import json
from datetime import datetime
from pathlib import Path
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class AnalysisResult(BaseModel):
    """Normalized schema for one saved phishing analysis record."""
    id: Optional[str] = None
    timestamp: Optional[float] = None
    type: str
    risk_percent: int
    status: str
    ocr_text: str = ""
    urls: List[str] = []

ANALYSES_FILE = Path("data/analyses.jsonl")

def save_analysis(analysis: AnalysisResult) -> None:
    """Append one analysis record to the JSONL history file."""
    ANALYSES_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(ANALYSES_FILE, 'a') as f:
        f.write(json.dumps(analysis.model_dump(default=str)) + '\n')

def get_user_stats() -> Dict[str, Any]:
    """Summarize saved analyses into low/medium/high risk buckets."""
    if not ANALYSES_FILE.exists():
        return {
            "total_analyses": 0,
            "high_risk_count": 0,
            "medium_risk_count": 0,
            "low_risk_count": 0
        }
    high = medium = low = 0
    count = 0
    try:
        with open(ANALYSES_FILE) as f:
            for line in f:
                if line.strip():
                    analysis = json.loads(line)
                    count += 1
                    risk = analysis.get("risk_percent", 0)
                    if risk >= 70:
                        high += 1
                    elif risk >= 40:
                        medium += 1
                    else:
                        low += 1
    except Exception:
        pass
    return {
        "total_analyses": count,
        "high_risk_count": high,
        "medium_risk_count": medium,
        "low_risk_count": low
    }

def update_user_stats(stats: Dict[str, Any]) -> None:
    """Placeholder for persisted user stats updates (not implemented)."""
    pass

def get_recent_analyses(limit: int = 20) -> List[AnalysisResult]:
    """Return up to `limit` most recent analysis entries from JSONL storage."""
    ANALYSES_FILE.parent.mkdir(parents=True, exist_ok=True)
    if not ANALYSES_FILE.exists():
        return []
    analyses = []
    try:
        with open(ANALYSES_FILE) as f:
            for line in reversed(list(f)):
                if line.strip():
                    analyses.append(AnalysisResult(**json.loads(line)))
                    if len(analyses) >= limit:
                        break
    except Exception:
        pass
    return analyses
