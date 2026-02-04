from fastapi import FastAPI, UploadFile, File, Form, Request, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import re
import sys
import os
import json
from PIL import Image
import io
import logging
from ml.auth import verify_token

# Add ml directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from ml.challenges import CHALLENGES
from ml.learning import LESSONS
from ml.ensemble import PhishingEnsemble
from ml.text_classifier import TextPhishingClassifier
from ml.visual_classifier import VisualPhishingDetector
from ml.auth_api import router as auth_router, get_current_user
from ml.analysis_api import router as analysis_router
from ml.email_analysis_api import router as email_router
from ml.learning_api import router as learning_router
from ml.mfa_api import router as mfa_router
from ml.leaderboard_api import router as leaderboard_router
from ml.db_models import init_db, SessionLocal, DBAnalysis, DBChallengeAttempt, DBLessonProgress
from ml.swagger_config import custom_openapi
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from ml.limiter import limiter

logger = logging.getLogger(__name__)

# Initialize database
init_db()

# Initialize ML models (lazy load)
_ensemble = None


def get_optional_user(request: Request):
    """Return token_data if Authorization bearer token is present; otherwise None."""
    auth_header = request.headers.get("Authorization") if request else None
    if not auth_header:
        return None
    parts = auth_header.split(" ")
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    token = parts[1]
    token_data = verify_token(token)
    return token_data

def get_ensemble() -> PhishingEnsemble:
    """Get or initialize ensemble model"""
    global _ensemble
    if _ensemble is None:
        logger.info("Initializing Phishing Ensemble...")
        _ensemble = PhishingEnsemble()
    return _ensemble

app = FastAPI(
    title="PhishGuard Academy API",
    version="1.0.0",
    description="Comprehensive phishing detection and cybersecurity education platform",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# Rate limiting middleware
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    """Add basic security headers to every response."""
    response = await call_next(request)
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
    return response

# Include routers
app.include_router(auth_router)
app.include_router(analysis_router)
app.include_router(email_router)
app.include_router(learning_router)
app.include_router(mfa_router)
app.include_router(leaderboard_router)

# CORS for Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Swagger/OpenAPI
app.openapi = lambda: custom_openapi(app)

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

@app.get("/")
def root():
    """Root endpoint - API info"""
    return {
        "service": "PhishGuard Academy API",
        "version": "1.0.0",
        "status": "online",
        "docs": "/api/docs"
    }

@app.get("/api/health")
@limiter.limit("60/minute")
def health(request: Request):
    return {"ok": True}

@app.get("/health")
@limiter.limit("60/minute")
def health_root(request: Request):
    """Health check endpoint without /api prefix for monitoring tools"""
    return {"ok": True}

@app.post("/api/analyze", response_model=AnalysisResponse)
@limiter.limit("30/minute")
async def analyze(
    request: Request,
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

        # Persist analysis if user is authenticated
        token_data = get_optional_user(request)
        logger.info(f"[ANALYSIS_PERSIST] Auth check: token_data={'present' if token_data else 'NONE'}")
        if token_data:
            db = SessionLocal()
            try:
                from ml.persistence import get_repositories
                repos = get_repositories(db)
                db_user = repos["users"].get_by_id(token_data.user_id)
                if db_user:
                    old_xp = db_user.xp or 0
                    analysis_record = DBAnalysis(
                        user_id=db_user.id,
                        analysis_type=("multi" if url and text and pil_image else "url" if url else "text" if text else "screenshot"),
                        input_text=text or "",
                        input_url=url or "",
                        risk_score=risk,
                        findings=json.dumps([f.__dict__ for f in findings])
                    )
                    db.add(analysis_record)
                    db_user.xp = old_xp + 10
                    db_user.level = (db_user.xp // 1000) + 1
                    db.commit()
                    logger.info(f"[ANALYSIS_PERSIST] SAVED: {db_user.email} XP: {old_xp} → {db_user.xp}")
                else:
                    logger.error(f"[ANALYSIS_PERSIST] User not found for token: {token_data.user_id}")
            except Exception as db_err:
                db.rollback()
                logger.error(f"Failed to persist analysis: {db_err}", exc_info=True)
            finally:
                db.close()

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

# NOTE: Challenges, lessons, and analytics endpoints are now handled by routers
# (ml/learning_api.py and ml/analysis_api.py) to avoid duplication and ensure
# persistence logic is centralized

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
