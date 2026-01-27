"""
Multi-Factor Authentication (MFA) System
TOTP-based 2FA with QR code generation
"""
import pyotp
import qrcode
import io
import base64
from typing import Optional, Dict
from datetime import datetime
import secrets

class MFAService:
    """Handle TOTP-based Multi-Factor Authentication"""
    
    @staticmethod
    def generate_secret() -> str:
        """Generate a new TOTP secret for a user"""
        return pyotp.random_base32()
    
    @staticmethod
    def generate_qr_code(username: str, secret: str, issuer: str = "PhishGuard Academy") -> str:
        """
        Generate QR code for authenticator apps
        Returns base64-encoded PNG image
        """
        # Create TOTP URI
        totp = pyotp.TOTP(secret)
        uri = totp.provisioning_uri(
            name=username,
            issuer_name=issuer
        )
        
        # Generate QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(uri)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convert to base64
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        img_str = base64.b64encode(buffer.getvalue()).decode()
        
        return f"data:image/png;base64,{img_str}"
    
    @staticmethod
    def verify_token(secret: str, token: str) -> bool:
        """
        Verify a TOTP token
        Returns True if valid, False otherwise
        """
        try:
            totp = pyotp.TOTP(secret)
            # Allow 1 time step tolerance (30 seconds before/after)
            return totp.verify(token, valid_window=1)
        except Exception:
            return False
    
    @staticmethod
    def generate_backup_codes(count: int = 8) -> list[str]:
        """
        Generate backup codes for account recovery
        Returns list of 8-digit codes
        """
        codes = []
        for _ in range(count):
            # Generate 8-digit backup code
            code = ''.join([str(secrets.randbelow(10)) for _ in range(8)])
            # Format as XXXX-XXXX
            formatted = f"{code[:4]}-{code[4:]}"
            codes.append(formatted)
        return codes
    
    @staticmethod
    def hash_backup_code(code: str) -> str:
        """Hash backup code for secure storage"""
        import hashlib
        # Remove dash for hashing
        clean_code = code.replace('-', '')
        return hashlib.sha256(clean_code.encode()).hexdigest()
    
    @staticmethod
    def verify_backup_code(code: str, hashed_code: str) -> bool:
        """Verify a backup code against its hash"""
        return MFAService.hash_backup_code(code) == hashed_code
    
    @staticmethod
    def get_current_token(secret: str) -> str:
        """Get current TOTP token (for testing)"""
        totp = pyotp.TOTP(secret)
        return totp.now()


# Global instance
mfa_service = MFAService()
