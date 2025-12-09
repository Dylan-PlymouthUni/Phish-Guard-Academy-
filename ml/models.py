import json
from datetime import datetime
from pathlib import Path
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class AnalysisResult(BaseModel):
    id: Optional[str] = None
    timestamp: Optional[float] = None
    type: str
    risk_percent: int
    status: str
    ocr_text: str = ""
    urls: List[str] = []

ANALYSES_FILE = Path("data/analyses.jsonl")

def save_analysis(analysis: AnalysisResult) -> None:
    ANALYSES_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(ANALYSES_FILE, 'a') as f:
        f.write(json.dumps(analysis.model_dump(default=str)) + '\n')

def get_user_stats() -> Dict[str, Any]:
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
    pass

def get_recent_analyses(limit: int = 20) -> List[AnalysisResult]:
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
