"""
Email-specific phishing analysis endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
from pydantic import BaseModel
import logging

from ml.auth_api import get_current_user
from ml.db_models import get_db
from ml.persistence import get_repositories
from ml.text_classifier import TextPhishingClassifier

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/email", tags=["email-analysis"])

class EmailAnalysisRequest(BaseModel):
    sender: Optional[str] = None
    subject: str
    body: str


@router.post("/analyze")
async def analyze_email(
    request: EmailAnalysisRequest,
    user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Analyze email for phishing indicators
    """
    try:
        # Initialize text classifier
        classifier = TextPhishingClassifier()
        
        # Combine email components for analysis
        email_content = f"Subject: {request.subject}\n\nFrom: {request.sender or 'Unknown'}\n\n{request.body}"
        
        # Analyze with ML model
        result = classifier.analyze(email_content)
        
        # Extract findings
        findings = {
            "urgency_language": _check_urgency_language(email_content),
            "suspicious_links": _check_suspicious_links(email_content),
            "credential_requests": _check_credential_requests(email_content),
            "impersonation": _check_impersonation(request.sender or "Unknown", request.subject),
            "spoofed_domain": _check_spoofed_domain(request.sender or "Unknown"),
            "malicious_attachments": _check_attachment_indicators(email_content),
        }
        
        # Save to database
        repos = get_repositories(db)
        analysis = repos["analyses"].save_analysis(
            user_id=user.id,
            analysis_type="email",
            risk_score=result.get("risk_score", 50),
            findings=str(findings),
            input_text=email_content[:500]
        )
        
        # Award XP
        repos["users"].add_xp(user.id, 15)
        
        return {
            "analysis_id": analysis.id,
            "risk_score": int(result.get("risk_score", 50)),
            "risk_category": _categorize_risk(result.get("risk_score", 50)),
            "is_phishing": result.get("is_phishing", False),
            "confidence": result.get("confidence", 0.5),
            "findings": findings,
            "recommendations": _get_recommendations(findings)
        }
    
    except Exception as e:
        logger.error(f"Email analysis error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/check-links")
async def check_email_links(body: str, user = Depends(get_current_user)):
    """Extract and check links in email"""
    import re
    
    # Extract URLs
    url_pattern = r'https?://[^\s]+'
    urls = re.findall(url_pattern, body, re.IGNORECASE)
    
    findings = []
    for url in urls:
        findings.append({
            "url": url,
            "is_shortened": _is_shortened_url(url),
            "is_suspicious": _is_suspicious_url(url),
            "domain": _extract_domain(url)
        })
    
    return {"links": findings, "total": len(findings)}


@router.post("/sandbox/{email_id}")
async def get_sandbox_email(email_id: str, user = Depends(get_current_user)):
    """Get email from sandbox for practice"""
    # This would retrieve pre-set email examples from the sandbox
    # For now, returning empty as sandbox is client-side
    raise HTTPException(status_code=501, detail="Use frontend sandbox")


# Helper functions
def _check_urgency_language(content: str) -> Dict[str, Any]:
    """Check for urgent language patterns"""
    urgency_patterns = [
        r"urgent",
        r"immediately",
        r"act now",
        r"verify now",
        r"24 hours?",
        r"verify (your|your) (account|identity)",
        r"confirm (your|your) (account|identity)",
        r"locked|suspended|limited|disabled",
        r"click here|click (below|link)",
    ]
    
    matches = []
    for pattern in urgency_patterns:
        import re
        if re.search(pattern, content, re.IGNORECASE):
            matches.append(pattern)
    
    return {
        "found": len(matches) > 0,
        "patterns_matched": matches,
        "severity": "high" if len(matches) > 3 else "medium" if len(matches) > 1 else "low"
    }


def _check_suspicious_links(content: str) -> Dict[str, Any]:
    """Check for suspicious link patterns"""
    import re
    
    suspicious_patterns = [
        r"bit\.ly",
        r"tinyurl",
        r"goo\.gl",
        r"https?://\d+\.\d+\.\d+\.\d+",  # IP addresses
        r"href=['\"]javascript:",  # JavaScript URLs
    ]
    
    matches = []
    for pattern in suspicious_patterns:
        if re.search(pattern, content, re.IGNORECASE):
            matches.append(pattern)
    
    return {
        "found": len(matches) > 0,
        "patterns_matched": matches,
        "severity": "high" if len(matches) > 0 else "low"
    }


def _check_credential_requests(content: str) -> Dict[str, Any]:
    """Check for credential/password requests"""
    import re
    
    patterns = [
        r"password",
        r"confirm (password|credentials)",
        r"verify (account|identity)",
        r"social.security|ssn",
        r"credit.?card",
        r"banking.?(info|details)",
    ]
    
    matches = []
    for pattern in patterns:
        if re.search(pattern, content, re.IGNORECASE):
            matches.append(pattern)
    
    return {
        "found": len(matches) > 0,
        "patterns_matched": matches,
        "severity": "high" if len(matches) > 0 else "low"
    }


def _check_impersonation(sender: str, subject: str) -> Dict[str, Any]:
    """Check for brand impersonation"""
    brands = ["paypal", "amazon", "apple", "microsoft", "google", "bank", "irs", "apple"]
    content = f"{sender} {subject}".lower()
    
    matches = []
    for brand in brands:
        if brand in content:
            matches.append(brand)
    
    return {
        "found": len(matches) > 0,
        "brands_impersonated": matches,
        "severity": "high" if len(matches) > 0 else "low"
    }


def _check_spoofed_domain(sender: str) -> Dict[str, Any]:
    """Check for domain spoofing"""
    import re
    
    # Look for common brand variations
    spoofing_patterns = [
        r"paypa[1l]",  # paypal vs paypa1
        r"amaz[0o]n",  # amazon vs amaz0n
        r"app[1l]e",  # apple vs app1e
        r"[0o]ffice",  # office vs 0ffice
        r"g[0o]ogle",  # google vs g0ogle
    ]
    
    matches = []
    for pattern in spoofing_patterns:
        if re.search(pattern, sender, re.IGNORECASE):
            matches.append(pattern)
    
    return {
        "found": len(matches) > 0,
        "patterns_matched": matches,
        "severity": "high" if len(matches) > 0 else "low"
    }


def _check_attachment_indicators(content: str) -> Dict[str, Any]:
    """Check for malicious attachment indicators"""
    import re
    
    suspicious_extensions = [r"\.exe", r"\.scr", r"\.bat", r"\.cmd", r"\.zip", r"\.rar"]
    
    matches = []
    for ext in suspicious_extensions:
        if re.search(ext, content, re.IGNORECASE):
            matches.append(ext)
    
    return {
        "found": len(matches) > 0,
        "suspicious_extensions": matches,
        "severity": "high" if len(matches) > 0 else "low"
    }


def _is_shortened_url(url: str) -> bool:
    """Check if URL is shortened"""
    shortened_services = ["bit.ly", "tinyurl", "goo.gl", "short.link"]
    return any(service in url.lower() for service in shortened_services)


def _is_suspicious_url(url: str) -> bool:
    """Check if URL is suspicious"""
    import re
    
    return bool(
        re.search(r"^\d+\.\d+\.\d+\.\d+", url) or  # IP address
        re.search(r"javascript:", url) or  # JavaScript protocol
        re.search(r"data:", url)  # Data protocol
    )


def _extract_domain(url: str) -> str:
    """Extract domain from URL"""
    import re
    
    match = re.search(r"https?://([^/]+)", url)
    return match.group(1) if match else url


def _categorize_risk(score: float) -> str:
    """Categorize risk score"""
    if score >= 70:
        return "high"
    elif score >= 40:
        return "medium"
    else:
        return "low"


def _get_recommendations(findings: Dict[str, Any]) -> list:
    """Get recommendations based on findings"""
    recommendations = []
    
    if findings.get("urgency_language", {}).get("found"):
        recommendations.append("Be cautious of emails demanding immediate action. Legitimate companies rarely pressure you.")
    
    if findings.get("suspicious_links", {}).get("found"):
        recommendations.append("Avoid clicking on shortened or suspicious links. Hover over links to verify the real destination.")
    
    if findings.get("credential_requests", {}).get("found"):
        recommendations.append("Never provide passwords or sensitive info via email. Legitimate companies won't ask this.")
    
    if findings.get("impersonation", {}).get("found"):
        recommendations.append("Verify the sender's email domain. Phishers often use look-alike domains.")
    
    if findings.get("spoofed_domain", {}).get("found"):
        recommendations.append("Check the sender's email domain carefully for typos or homoglyphs.")
    
    if not recommendations:
        recommendations.append("This email appears legitimate, but always remain cautious.")
    
    return recommendations
