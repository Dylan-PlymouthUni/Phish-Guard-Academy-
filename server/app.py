from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import re
import sys
import os
from PIL import Image
import io
import logging

# Add ml directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from ml.challenges import CHALLENGES
from ml.learning import LESSONS
from ml.ensemble import PhishingEnsemble
from ml.text_classifier import TextPhishingClassifier
from ml.visual_classifier import VisualPhishingDetector

logger = logging.getLogger(__name__)

# Initialize ML models (lazy load)
_ensemble = None

def get_ensemble() -> PhishingEnsemble:
    """Get or initialize ensemble model"""
    global _ensemble
    if _ensemble is None:
        logger.info("Initializing Phishing Ensemble...")
        _ensemble = PhishingEnsemble()
    return _ensemble

app = FastAPI(title="PhishGuard API", version="0.1")

# CORS for Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Finding(BaseModel):
    type: str
    label: str
    detail: str
    severity: str  # "low" | "med" | "high"

class AnalysisResponse(BaseModel):
    risk: int  # 0..100
    findings: List[Finding]
    boxes: List[dict] = []  # image regions if any

URL_RE = re.compile(r"https?://[^\s]+", re.I)
LOOKALIKE_RE = re.compile(r"(paypaI|rnicrosoft|faceb00k|app1e|goog1e)", re.I)
URGENT_RE = re.compile(r"(urgent|immediately|24\s*hours|verify now|account (locked|closed))", re.I)

def score_from_signals(has_url: bool, urgent: bool, lookalike: bool) -> int:
    base = 5
    if urgent: base += 40
    if has_url: base += 20
    if lookalike: base += 30
    return max(5, min(98, base))

@app.get("/api/health")
def health():
    return {"ok": True}

@app.post("/api/analyze", response_model=AnalysisResponse)
async def analyze(
    text: Optional[str] = Form(default=""),
    url: Optional[str] = Form(default=""),
    image: Optional[UploadFile] = File(default=None),
):
    """
    Enhanced phishing analysis using ML ensemble
    Combines URL analysis, text classification, and image detection
    """
    try:
        ensemble = get_ensemble()
        findings: List[Finding] = []
        boxes: List[dict] = []
        
        # Parse image if provided
        pil_image = None
        if image:
            try:
                image_bytes = await image.read()
                pil_image = Image.open(io.BytesIO(image_bytes))
                logger.info(f"Image loaded: {pil_image.size}")
            except Exception as e:
                logger.error(f"Failed to load image: {e}")
        
        # Use ensemble for comprehensive analysis
        if url and text and pil_image:
            # Full analysis with all components
            result = ensemble.analyze_full_context(
                url=url,
                text=text,
                screenshot=pil_image
            )
        elif url and text:
            # URL + text analysis (pass text as context to analyze_text)
            result = ensemble.analyze_text(text=text, url=url)
        elif url:
            # URL only
            result = ensemble.analyze_url(url=url)
        elif text:
            # Text only
            result = ensemble.analyze_text(text=text)
        elif pil_image:
            # Image only
            result = ensemble.analyze_screenshot(screenshot=pil_image)
        else:
            # No input provided
            return AnalysisResponse(
                risk=0,
                findings=[Finding(
                    type="general",
                    label="No input provided",
                    detail="Please provide a URL, text, or image to analyze.",
                    severity="low"
                )],
                boxes=[]
            )
        
        # Convert findings to API format
        for finding in result.findings:
            # Map severity from risk score
            if "high risk" in finding.lower() or "phishing" in finding.lower():
                severity = "high"
            elif "suspicious" in finding.lower() or "warning" in finding.lower():
                severity = "med"
            else:
                severity = "low"
            
            # Categorize finding type
            if any(word in finding.lower() for word in ['url', 'domain', 'link']):
                finding_type = "url"
            elif any(word in finding.lower() for word in ['urgent', 'pressure', 'immediate']):
                finding_type = "urgent-language"
            elif any(word in finding.lower() for word in ['brand', 'logo', 'impersonation']):
                finding_type = "lookalike"
            elif any(word in finding.lower() for word in ['password', 'credential', 'login']):
                finding_type = "credentials"
            elif any(word in finding.lower() for word in ['image', 'visual', 'screenshot']):
                finding_type = "visual"
            else:
                finding_type = "general"
            
            findings.append(Finding(
                type=finding_type,
                label=finding.split(':')[0] if ':' in finding else "Security Finding",
                detail=finding,
                severity=severity
            ))
        
        # Add component score details as findings
        if result.component_scores:
            for component, score in result.component_scores.items():
                if score > 0.5:  # Only show high-scoring components
                    findings.append(Finding(
                        type="analysis",
                        label=f"{component.title()} Analysis",
                        detail=f"{component.title()} component detected {score*100:.0f}% risk",
                        severity="high" if score > 0.7 else "med"
                    ))
        
        risk = int(result.risk_score)
        
        return AnalysisResponse(
            risk=risk,
            findings=findings if findings else [Finding(
                type="general",
                label="Analysis Complete",
                detail=f"No significant phishing indicators detected. Confidence: {result.confidence:.0%}",
                severity="low"
            )],
            boxes=boxes
        )
    
    except Exception as e:
        logger.error(f"Analysis error: {e}", exc_info=True)
        # Fallback to simple heuristics
        base = " ".join([text or "", url or ""]).strip()
        has_url = bool(URL_RE.search(base))
        urgent = bool(URGENT_RE.search(base))
        lookalike = bool(LOOKALIKE_RE.search(base))

        findings = []
        if lookalike:
            findings.append(Finding(
                type="lookalike",
                label="Lookalike brand",
                detail="Possible homoglyphs detected in brand/domain.",
                severity="high",
            ))
        if has_url:
            findings.append(Finding(
                type="links",
                label="Contains links",
                detail="Verify destination domain matches the expected owner.",
                severity="high" if urgent else "med",
            ))
        if urgent:
            findings.append(Finding(
                type="urgent-language",
                label="Urgent language",
                detail="Pressure to act quickly detected.",
                severity="med",
            ))

        if not findings:
            findings.append(Finding(
                type="general",
                label="No strong cues",
                detail="No obvious phishing signals detected (ML analysis unavailable).",
                severity="low",
            ))

        risk = score_from_signals(has_url, urgent, lookalike)
        return AnalysisResponse(risk=risk, findings=findings, boxes=[])

# Challenges endpoints
@app.get("/api/challenges")
def get_challenges():
    return [
        {
            "id": c["id"],
            "title": c["title"],
            "description": c["description"],
            "difficulty": c["difficulty"],
            "points": c.get("points_reward", 100),
            "time_limit": c.get("time_limit", 600),
            "questions": [
                {
                    "id": q["id"],
                    "question": q["question"],
                    "type": q.get("type", "multiple_choice"),
                    "options": q.get("options", [])
                }
                for q in c["questions"]
            ]
        }
        for c in CHALLENGES
    ]

@app.post("/api/submit-challenge")
async def submit_challenge(data: Dict[str, Any]):
    challenge_id = data.get("challenge_id")
    answers = data.get("answers", {})
    
    challenge = next((c for c in CHALLENGES if c["id"] == challenge_id), None)
    if not challenge:
        return {"error": "Challenge not found"}
    
    correct = 0
    total = len(challenge["questions"])
    feedback = []
    
    for q in challenge["questions"]:
        user_answer = answers.get(q["id"], "")
        is_correct = user_answer.lower().strip() == q["correct_answer"].lower().strip()
        if is_correct:
            correct += 1
        feedback.append({
            "question_id": q["id"],
            "correct": is_correct,
            "user_answer": user_answer,
            "correct_answer": q["correct_answer"],
            "explanation": q.get("explanation", "")
        })
    
    score = (correct / total) * 100 if total > 0 else 0
    points_reward = challenge.get("points_reward", 100)
    earned_points = int((correct / total) * points_reward) if total > 0 else 0
    
    return {
        "score": score,
        "correct": correct,
        "total": total,
        "points_earned": earned_points,
        "feedback": feedback,
        "passed": score >= challenge.get("passing_score", 70)
    }

# Learning endpoints
@app.get("/api/lessons")
def get_lessons():
    return [
        {
            "id": lesson["id"],
            "title": lesson["title"],
            "description": lesson["description"],
            "duration": lesson.get("duration", 10),
            "difficulty": lesson.get("difficulty", "beginner"),
            "points": lesson.get("points_reward", 50),
            "content": lesson.get("content", "")
        }
        for lesson in LESSONS
    ]

@app.get("/api/progress")
def get_progress():
    # Mock progress data
    return {
        "completed_lessons": [],
        "completed_challenges": [],
        "total_points": 0,
        "streak_days": 0,
        "lessons_completed": 0,
        "challenges_passed": 0,
        "achievements": [],
        "level": 1,
        "experience": 0
    }

@app.post("/api/complete-lesson/{lesson_id}")
async def complete_lesson(lesson_id: str):
    lesson = next((l for l in LESSONS if l["id"] == lesson_id), None)
    if not lesson:
        return {"error": "Lesson not found"}
    
    return {
        "success": True,
        "points_earned": lesson.get("points_reward", 50),
        "lesson_id": lesson_id
    }

# Analytics endpoints
@app.get("/api/analytics/summary")
def get_analytics_summary():
    return {
        "total_analyses": 0,
        "phishing_detected": 0,
        "average_risk": 0,
        "last_analysis": None
    }

@app.get("/api/analytics/daily")
def get_daily_analytics(days: int = 30):
    return {"daily_stats": []}

@app.get("/api/analytics/distribution")
def get_risk_distribution():
    return {
        "low": 0,
        "medium": 0,
        "high": 0
    }

# Settings endpoints
@app.get("/api/settings")
def get_settings():
    return {
        "notifications": True,
        "email_alerts": False,
        "difficulty_preference": "medium",
        "theme": "system",
        "auto_save": True
    }

@app.post("/api/settings")
async def update_settings(settings: Dict[str, Any]):
    return {"success": True, "settings": settings}

@app.post("/api/settings/reset")
async def reset_settings():
    return {"success": True}

# History endpoints
@app.get("/api/analyses")
def get_analyses(limit: int = 100):
    return []

@app.delete("/api/analyses/{analysis_id}")
async def delete_analysis(analysis_id: str):
    return {"success": True}
