"""
Multi-Factor Authentication API Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
import json

from ml.mfa_service import mfa_service
from ml.auth_api import get_current_user
from ml.auth import verify_password
from ml.db_models import get_db
from ml.persistence import get_repositories

router = APIRouter(prefix="/api/mfa", tags=["mfa"])

class MFASetupResponse(BaseModel):
    secret: str
    qr_code: str
    backup_codes: List[str]

class MFAVerifyRequest(BaseModel):
    token: str

class MFADisableRequest(BaseModel):
    password: str
    token: Optional[str] = None

class MFABackupCodeRequest(BaseModel):
    code: str

@router.post("/setup", response_model=MFASetupResponse)
async def setup_mfa(current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Initialize MFA for the user
    Returns QR code and backup codes
    """
    try:
        repos = get_repositories(db)
        user = repos["users"].get_by_id(current_user.id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        if getattr(user, 'mfa_enabled', False):
            raise HTTPException(
                status_code=400, 
                detail="MFA already enabled. Disable first to reset."
            )
        
        # Generate new secret
        secret = mfa_service.generate_secret()
        
        # Generate QR code
        qr_code = mfa_service.generate_qr_code(
            username=user.email,
            secret=secret
        )
        
        # Generate backup codes
        backup_codes = mfa_service.generate_backup_codes()
        
        # Hash backup codes for storage
        hashed_codes = [mfa_service.hash_backup_code(code) for code in backup_codes]
        
        # Store secret and hashed backup codes (not enabled yet)
        repos["users"].set_mfa_secret(
            user_id=user.id,
            secret=secret,
            backup_codes=json.dumps(hashed_codes)
        )
        
        return MFASetupResponse(
            secret=secret,
            qr_code=qr_code,
            backup_codes=backup_codes
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"MFA setup failed: {str(e)}")

@router.post("/verify")
async def verify_and_enable_mfa(
    request: MFAVerifyRequest,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Verify TOTP token and enable MFA
    """
    try:
        repos = get_repositories(db)
        user = repos["users"].get_by_id(current_user.id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        if not user.mfa_secret:
            raise HTTPException(
                status_code=400,
                detail="MFA not set up. Call /setup first."
            )
        
        # Verify the token
        is_valid = mfa_service.verify_token(user.mfa_secret, request.token)
        
        if not is_valid:
            raise HTTPException(
                status_code=400,
                detail="Invalid verification code"
            )
        
        # Enable MFA
        repos["users"].enable_mfa(user.id)
        
        return {
            "success": True,
            "message": "MFA enabled successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Verification failed: {str(e)}")

@router.post("/disable")
async def disable_mfa(
    request: MFADisableRequest,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Disable MFA (requires current token or password)
    """
    try:
        repos = get_repositories(db)
        user = repos["users"].get_by_id(current_user.id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        if not getattr(user, 'mfa_enabled', False):
            raise HTTPException(status_code=400, detail="MFA not enabled")
        
        # Verify password
        if not verify_password(request.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid password")
        
        # If token provided, verify it
        if request.token:
            is_valid = mfa_service.verify_token(user.mfa_secret, request.token)
            if not is_valid:
                raise HTTPException(status_code=400, detail="Invalid token")
        
        # Disable MFA and clear secrets
        repos["users"].disable_mfa(user.id)
        
        return {
            "success": True,
            "message": "MFA disabled successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Disable MFA failed: {str(e)}")

@router.post("/verify-backup-code")
async def verify_backup_code(
    request: MFABackupCodeRequest,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Verify and consume a backup code
    """
    try:
        repos = get_repositories(db)
        user = repos["users"].get_by_id(current_user.id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        if not getattr(user, 'mfa_enabled', False) or not user.backup_codes:
            raise HTTPException(status_code=400, detail="MFA not enabled")
        
        # Check if any code matches
        code_hash = mfa_service.hash_backup_code(request.code)
        if repos["users"].consume_backup_code(user.id, code_hash):
            remaining = 0
            try:
                remaining = len(json.loads(user.backup_codes))
            except Exception:
                remaining = 0
            return {
                "success": True,
                "message": "Backup code verified",
                "remaining_codes": remaining
            }
        else:
            raise HTTPException(status_code=400, detail="Invalid backup code")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Backup code verification failed: {str(e)}")

@router.get("/status")
async def get_mfa_status(current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Get user's MFA status
    """
    try:
        repos = get_repositories(db)
        user = repos["users"].get_by_id(current_user.id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        backup_codes_count = 0
        if user.backup_codes:
            try:
                backup_codes_count = len(json.loads(user.backup_codes))
            except Exception:
                backup_codes_count = 0
        
        return {
            "mfa_enabled": getattr(user, 'mfa_enabled', False),
            "backup_codes_remaining": backup_codes_count,
            "setup_complete": getattr(user, 'mfa_enabled', False) and user.mfa_secret is not None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Status check failed: {str(e)}")
