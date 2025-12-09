# ... keep everything up to line 20, then replace the security import ...
import os
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# ... rest of file stays the same, but change this section:

security = HTTPBearer()
VALID_API_KEYS = {os.getenv("API_KEY", "demo-key-12345")}

async def verify_api_key(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if credentials.credentials not in VALID_API_KEYS:
        raise HTTPException(status_code=403, detail="Invalid API key")
    return credentials.credentials
