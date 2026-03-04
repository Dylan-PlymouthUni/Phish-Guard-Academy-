"""
Analysis endpoints that integrate with persistence layer
"""
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import Optional, List
import json
import logging
from urllib.parse import urlparse

from ml.auth_api import get_current_user
from ml.auth import verify_token
from ml.db_models import get_db
from ml.persistence import get_repositories
from ml.ensemble import PhishingEnsemble
from ml.threat_intel import threat_intel
from ml.behavioral_analysis import behavior_analyzer
from ml.limiter import limiter

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["analysis"])

# Initialize ensemble
_ensemble = None


def _identify_actor(request: Request) -> str:
    """Return an identifier for behavioral tracking."""
    actor = "anonymous"

    auth_header = request.headers.get("authorization")
    if auth_header:
        try:
            scheme, token = auth_header.split()
            if scheme.lower() == "bearer":
                token_data = verify_token(token)
                if token_data:
                    actor = token_data.email or token_data.user_id or actor
        except Exception:
            # Fail open for anonymous tracking only
            pass

    if actor == "anonymous" and request.client:
        actor = f"anon:{request.client.host}"

    return actor

def get_ensemble() -> PhishingEnsemble:
    """Get or initialize ensemble model"""
    global _ensemble
    if _ensemble is None:
        logger.info("Initializing Phishing Ensemble...")
        _ensemble = PhishingEnsemble()
    return _ensemble


@router.post("/analyze")
@limiter.limit("30/minute")
async def analyze_with_persistence(
    request: Request,
    text: Optional[str] = Form(default=""),
    url: Optional[str] = Form(default=""),
    image: Optional[UploadFile] = File(default=None)
):
    """
    Analyze phishing threats - no auth required for basic analysis
    """
    try:
        actor = _identify_actor(request)
        analysis_mode = "unknown"
        fallback_used = False
        response_payload = None

        # Try ML ensemble first
        try:
            ensemble = get_ensemble()
            
            # Determine analysis type and run analysis
            if url and text and image:
                # Load image
                import io
                from PIL import Image
                image_bytes = await image.read()
                pil_image = Image.open(io.BytesIO(image_bytes))
                result = ensemble.analyze_full_context(url=url, text=text, screenshot=pil_image)
                analysis_mode = "full"
            elif url and text:
                result = ensemble.analyze_text(text=text, url=url)
                analysis_mode = "url+text"
            elif url:
                result = ensemble.analyze_url(url=url)
                analysis_mode = "url"
            elif text:
                result = ensemble.analyze_text(text=text)
                analysis_mode = "text"
            elif image:
                # Load image
                import io
                from PIL import Image
                image_bytes = await image.read()
                pil_image = Image.open(io.BytesIO(image_bytes))
                result = ensemble.analyze_screenshot(screenshot=pil_image)
                analysis_mode = "screenshot"
            else:
                raise HTTPException(status_code=400, detail="No input provided")
            
            # Format findings for frontend
            formatted_findings = []
            all_boxes = []
            
            for finding in result.findings:
                # Handle new structured finding format
                if isinstance(finding, dict):
                    # New format with structured data
                    formatted_findings.append({
                        "type": finding.get('type', 'general'),
                        "label": finding.get('label', 'Security Finding'),
                        "detail": finding.get('detail', ''),
                        "severity": finding.get('severity', 'low'),
                        "boxes": finding.get('boxes', [])
                    })
                    # Collect all boxes for highlighting
                    if finding.get('boxes'):
                        all_boxes.extend(finding.get('boxes', []))
                else:
                    # Legacy string format - parse it
                    finding_str = str(finding)
                    if any(word in finding_str.lower() for word in ['url', 'domain', 'link']):
                        finding_type = "url"
                    elif any(word in finding_str.lower() for word in ['urgent', 'pressure', 'immediate']):
                        finding_type = "urgent-language"
                    elif any(word in finding_str.lower() for word in ['brand', 'logo', 'impersonation']):
                        finding_type = "lookalike"
                    elif any(word in finding_str.lower() for word in ['password', 'credential', 'login']):
                        finding_type = "credentials"
                    else:
                        finding_type = "general"
                    
                    # Determine severity
                    if "critical" in finding_str.lower() or "high risk" in finding_str.lower():
                        severity = "high"
                    elif "suspicious" in finding_str.lower() or "warning" in finding_str.lower():
                        severity = "med"
                    else:
                        severity = "low"
                    
                    formatted_findings.append({
                        "type": finding_type,
                        "label": finding_str.split(':')[0] if ':' in finding_str else "Security Finding",
                        "detail": finding_str,
                        "severity": severity,
                        "boxes": []
                    })
            
            response_payload = {
                "risk": int(result.risk_score),
                "findings": formatted_findings,
                "boxes": all_boxes
            }
            
        except Exception as ml_error:
            logger.warning(f"ML ensemble failed, using fallback with threat intel: {ml_error}")
            # Fallback to simple heuristics + threat intelligence
            import re
            fallback_used = True
            
            combined = f"{text} {url}".lower()
            findings = []
            risk = 5
            
            # THREAT INTELLIGENCE CHECK (HIGH PRIORITY)
            if url:
                try:
                    threat_result = threat_intel.check_url(url)
                    if threat_result['is_threat']:
                        findings.append({
                            "type": "threat-intel",
                            "label": f"⚠️ Known Threat ({', '.join(threat_result['sources'])})",
                            "detail": f"This URL is flagged as {threat_result['threat_level']} risk by security databases",
                            "severity": "high" if threat_result['threat_level'] in ['high', 'critical'] else "med"
                        })
                        risk += 50  # Major risk boost for known threats
                        
                        # Add details from each source
                        for detail in threat_result.get('details', []):
                            if detail.get('reason'):
                                findings.append({
                                    "type": "threat-detail",
                                    "label": f"{detail['source']}",
                                    "detail": detail['reason'],
                                    "severity": "med"
                                })
                    
                    # Check domain reputation
                    parsed = urlparse(url)
                    domain = parsed.netloc or parsed.path.split('/')[0]
                    domain_check = threat_intel.check_domain_reputation(domain)
                    if domain_check['is_suspicious']:
                        for reason in domain_check['reasons']:
                            findings.append({
                                "type": "domain-reputation",
                                "label": "Suspicious Domain",
                                "detail": reason,
                                "severity": "med"
                            })
                            risk += 15
                            
                except Exception as e:
                    logger.error(f"Threat intel check failed: {e}")
            
            # Check for urgent language
            if re.search(r'urgent|immediately|24\s*hours|verify now|account (locked|closed)', combined):
                findings.append({
                    "type": "urgent-language",
                    "label": "Urgent language",
                    "detail": "Pressure to act quickly detected",
                    "severity": "med"
                })
                risk += 40
            
            # Check for lookalike domains
            if re.search(r'paypa1|rnicrosoft|faceb00k|app1e|goog1e', combined):
                findings.append({
                    "type": "lookalike",
                    "label": "Lookalike brand",
                    "detail": "Possible homoglyphs detected in brand/domain",
                    "severity": "high"
                })
                risk += 30
            
            # Check for URLs
            if re.search(r'https?://', combined):
                findings.append({
                    "type": "url",
                    "label": "Contains links",
                    "detail": "Verify destination domain matches the expected owner",
                    "severity": "med" if risk > 40 else "low"
                })
                risk += 20
            
            if not findings:
                findings.append({
                    "type": "general",
                    "label": "No strong cues",
                    "detail": "No obvious phishing signals detected (ML analysis unavailable)",
                    "severity": "low"
                })
            
            response_payload = {
                "risk": min(98, max(5, risk)),
                "findings": findings,
                "boxes": []
            }
    
        if response_payload:
            behavior_analyzer.log_activity(actor, "analysis", {
                "mode": analysis_mode,
                "risk": response_payload.get("risk"),
                "fallback": fallback_used,
                "url_present": bool(url),
                "text_present": bool(text),
                "image_present": image is not None
            })
            behavior_analyzer.update_baseline(actor)

            # Persist analysis if user is authenticated
            auth_header = request.headers.get("Authorization") if request else None
            if auth_header:
                parts = auth_header.split(" ")
                if len(parts) == 2 and parts[0].lower() == "bearer":
                    token = parts[1]
                    from ml.auth import verify_token
                    token_data = verify_token(token)
                    if token_data:
                        from ml.db_models import SessionLocal, DBAnalysis
                        db = SessionLocal()
                        try:
                            from ml.persistence import get_repositories
                            repos = get_repositories(db)
                            db_user = repos["users"].get_by_id(token_data.user_id)
                            logger.info(f"[ANALYSIS_PERSIST] Found user: {db_user.email if db_user else 'NOT FOUND'}")
                            if db_user:
                                old_xp = db_user.xp or 0
                                analysis_record = DBAnalysis(
                                    user_id=db_user.id,
                                    analysis_type=analysis_mode,
                                    input_text=text or "",
                                    input_url=url or "",
                                    risk_score=response_payload.get("risk", 0),
                                    findings=json.dumps(response_payload.get("findings", []))
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
                            logger.error(f"[ANALYSIS_PERSIST] Failed: {db_err}", exc_info=True)
                        finally:
                            db.close()

            return response_payload

    except Exception as e:
        logger.error(f"Analysis error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analyses")
async def get_user_analyses(
    limit: int = 100,
    user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's analysis history"""
    repos = get_repositories(db)
    analyses = repos["analyses"].get_by_user(user.id, limit=limit)
    
    return {
        "total": len(analyses),
        "analyses": [
            {
                "id": a.id,
                "type": a.analysis_type,
                "risk_score": a.risk_score,
                "created_at": a.created_at.isoformat(),
                "url": a.input_url,
                "text_preview": a.input_text[:100] if a.input_text else None
            }
            for a in analyses
        ]
    }


@router.delete("/analyses/{analysis_id}")
async def delete_analysis(
    analysis_id: str,
    user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an analysis"""
    repos = get_repositories(db)
    analysis = repos["analyses"].get_by_id(analysis_id)
    
    if not analysis or analysis.user_id != user.id:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    repos["analyses"].delete(analysis_id)
    
    return {"success": True, "deleted": analysis_id}


@router.get("/behavior/insights")
async def get_behavior_insights(user = Depends(get_current_user)):
    """Return behavioral risk and recent anomalies for the user."""
    actor = getattr(user, "email", None) or str(user.id)
    behavior_analyzer.update_baseline(actor)

    return {
        "risk": behavior_analyzer.get_risk_score(actor),
        "anomalies": behavior_analyzer.detect_anomalies(actor),
        "stats": behavior_analyzer.get_user_stats(actor),
        "timeline": behavior_analyzer.get_activity_timeline(actor)
    }


@router.get("/analytics/summary")
async def get_analytics_summary(
    user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get analytics summary for user"""
    # Refresh user object from database to get latest stats
    db.refresh(user)
    
    repos = get_repositories(db)
    
    analysis_stats = repos["analyses"].get_user_stats(user.id)
    challenge_stats = repos["challenges"].get_challenge_stats(user.id)
    lesson_stats = repos["lessons"].get_lesson_stats(user.id)

    latest_analysis = repos["analyses"].get_by_user(user.id, limit=1)
    last_analysis_ts = latest_analysis[0].created_at.isoformat() if latest_analysis else None

    # Structured response for new UI plus legacy fields for compatibility
    return {
        "analyses": analysis_stats,
        "challenges": challenge_stats,
        "lessons": lesson_stats,
        "user": {
            "level": user.level,
            "xp": user.xp,
            "streak": user.streak
        },
        "user_stats": {
            "xp": user.xp,
            "level": user.level,
            "streak": user.streak
        },
        # Legacy flat fields expected by Analytics page
        "total_analyses": analysis_stats.get("total_analyses", 0),
        "phishing_detected": analysis_stats.get("high_risk", 0),
        "average_risk": round(analysis_stats.get("average_risk", 0.0), 1) if analysis_stats else 0,
        "last_analysis": last_analysis_ts,
        "high_risk_count": analysis_stats.get("high_risk", 0),
        "medium_risk_count": analysis_stats.get("medium_risk", 0),
        "low_risk_count": analysis_stats.get("low_risk", 0),
        "challenges_passed": challenge_stats.get("passed", 0),
        "total_lessons": lesson_stats.get("completed", 0)
    }


@router.get("/analytics/distribution")
async def get_risk_distribution(
    user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    repos = get_repositories(db)
    analyses = repos["analyses"].get_by_user(user.id, limit=1000)
    if not analyses:
        return {"low": 0, "medium": 0, "high": 0}
    return {
        "low": sum(1 for a in analyses if a.risk_score < 40),
        "medium": sum(1 for a in analyses if 40 <= a.risk_score < 70),
        "high": sum(1 for a in analyses if a.risk_score >= 70)
    }


@router.get("/analytics/daily")
async def get_daily_analytics(
    days: int = 30,
    user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    repos = get_repositories(db)
    analyses = repos["analyses"].get_by_user(user.id, limit=1000)
    if not analyses:
        return {"daily_stats": []}
    daily = {}
    for a in analyses:
        date_key = a.created_at.date().isoformat()
        if date_key not in daily:
            daily[date_key] = {"date": date_key, "count": 0, "high_risk": 0}
        daily[date_key]["count"] += 1
        if a.risk_score >= 70:
            daily[date_key]["high_risk"] += 1
    sorted_days = [v for _, v in sorted(daily.items())][-days:]
    return {"daily_stats": sorted_days}
