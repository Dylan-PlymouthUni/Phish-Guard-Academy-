import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Any
from collections import defaultdict

EVENTS_FILE = Path("data/analytics_events.jsonl")

def log_event(event_type: str, data: Dict[str, Any]) -> None:
    """Log an analytics event"""
    EVENTS_FILE.parent.mkdir(parents=True, exist_ok=True)
    event = {
        "timestamp": datetime.now().isoformat(),
        "type": event_type,
        "data": data
    }
    with open(EVENTS_FILE, 'a') as f:
        f.write(json.dumps(event) + '\n')

def get_events() -> List[Dict[str, Any]]:
    """Get all events"""
    EVENTS_FILE.parent.mkdir(parents=True, exist_ok=True)
    if not EVENTS_FILE.exists():
        return []
    events = []
    try:
        with open(EVENTS_FILE) as f:
            for line in f:
                if line.strip():
                    events.append(json.loads(line))
    except Exception:
        pass
    return events

def get_summary_stats() -> Dict[str, Any]:
    """Get summary statistics"""
    events = get_events()
    
    # Count analyses by type
    analyses = [e for e in events if e.get("type") == "analysis"]
    
    # Calculate risks
    high_risk = sum(1 for e in analyses if e.get("data", {}).get("risk_percent", 0) >= 70)
    medium_risk = sum(1 for e in analyses if 40 <= e.get("data", {}).get("risk_percent", 0) < 70)
    
    return {
        "total_analyses": len(analyses),
        "high_risk_count": high_risk,
        "medium_risk_count": medium_risk,
        "low_risk_count": len(analyses) - high_risk - medium_risk,
        "average_risk_percent": sum(e.get("data", {}).get("risk_percent", 0) for e in analyses) / len(analyses) if analyses else 0
    }

def get_daily_stats(days: int = 30) -> List[Dict[str, Any]]:
    """Get daily statistics"""
    events = get_events()
    daily: Dict[str, Dict[str, Any]] = defaultdict(lambda: {
        "analyses_count": 0,
        "avg_risk_percent": 0,
        "challenges_passed": 0,
        "lessons_completed": 0
    })
    
    now = datetime.now()
    for i in range(days):
        date_key = (now - timedelta(days=i)).date().isoformat()
        daily[date_key] = {
            "date": date_key,
            "analyses_count": 0,
            "avg_risk_percent": 0,
            "challenges_passed": 0,
            "lessons_completed": 0
        }
    
    for event in events:
        try:
            ts = datetime.fromisoformat(event.get("timestamp", ""))
            date_key = ts.date().isoformat()
            if date_key in daily:
                if event.get("type") == "analysis":
                    daily[date_key]["analyses_count"] += 1
                    daily[date_key]["avg_risk_percent"] = event.get("data", {}).get("risk_percent", 0)
                elif event.get("type") == "challenge_passed":
                    daily[date_key]["challenges_passed"] += 1
                elif event.get("type") == "lesson_completed":
                    daily[date_key]["lessons_completed"] += 1
        except Exception:
            pass
    
    return sorted([v for v in daily.values()], key=lambda x: x["date"], reverse=True)

def get_risk_distribution() -> Dict[str, Any]:
    """Get risk distribution"""
    stats = get_summary_stats()
    total = stats["total_analyses"]
    return {
        "high_risk": {"count": stats["high_risk_count"], "percent": (stats["high_risk_count"] / total * 100) if total > 0 else 0},
        "medium_risk": {"count": stats["medium_risk_count"], "percent": (stats["medium_risk_count"] / total * 100) if total > 0 else 0},
        "low_risk": {"count": stats["low_risk_count"], "percent": (stats["low_risk_count"] / total * 100) if total > 0 else 0},
    }

def get_activity_heatmap() -> Dict[str, Any]:
    """Get activity heatmap data"""
    events = get_events()
    heatmap: Dict[str, int] = defaultdict(int)
    
    for event in events:
        try:
            ts = datetime.fromisoformat(event.get("timestamp", ""))
            hour_key = f"{ts.hour:02d}:00"
            heatmap[hour_key] += 1
        except Exception:
            pass
    
    return dict(heatmap)
