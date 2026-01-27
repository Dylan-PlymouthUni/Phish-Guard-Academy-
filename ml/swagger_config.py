"""
Swagger/OpenAPI configuration for PhishGuard API
"""
from fastapi.openapi.utils import get_openapi

def custom_openapi(app):
    if app.openapi_schema:
        return app.openapi_schema
    
    openapi_schema = get_openapi(
        title="PhishGuard Academy API",
        version="1.0.0",
        description="""
        # PhishGuard Academy API
        
        A comprehensive phishing detection and cybersecurity education platform API.
        
        ## Features
        - User authentication with JWT
        - Multi-modal threat analysis (URL, email, screenshot)
        - Gamified learning challenges
        - Comprehensive lesson tracking
        - User analytics and statistics
        - Email sandbox analysis
        
        ## Authentication
        All protected endpoints require a JWT token in the Authorization header:
        ```
        Authorization: Bearer <your-jwt-token>
        ```
        
        ## Getting Started
        1. **Register**: Create a new account at `/api/auth/register`
        2. **Login**: Get a token at `/api/auth/login`
        3. **Analyze**: Start analyzing threats at `/api/analyze`
        """,
        routes=app.routes,
        tags=[
            {
                "name": "auth",
                "description": "User authentication and profile management"
            },
            {
                "name": "analysis",
                "description": "Phishing threat analysis endpoints"
            },
            {
                "name": "email-analysis",
                "description": "Email-specific phishing detection"
            },
            {
                "name": "challenges",
                "description": "Interactive learning challenges"
            },
            {
                "name": "learning",
                "description": "Educational content and lessons"
            }
        ]
    )
    
    # Add security schemes
    openapi_schema["components"] = {
        "securitySchemes": {
            "HTTPBearer": {
                "type": "http",
                "scheme": "bearer",
                "bearerFormat": "JWT",
                "description": "JWT token obtained from login endpoint"
            }
        },
        "schemas": {
            "Finding": {
                "type": "object",
                "properties": {
                    "type": {"type": "string", "description": "Type of finding (url, urgent-language, lookalike, etc)"},
                    "label": {"type": "string", "description": "Short label for the finding"},
                    "detail": {"type": "string", "description": "Detailed explanation"},
                    "severity": {"type": "string", "enum": ["low", "med", "high"]}
                }
            },
            "AnalysisResponse": {
                "type": "object",
                "properties": {
                    "risk": {"type": "integer", "minimum": 0, "maximum": 100, "description": "Risk score 0-100"},
                    "risk_category": {"type": "string", "enum": ["low", "medium", "high"]},
                    "findings": {"type": "array", "items": {"$ref": "#/components/schemas/Finding"}},
                    "analysis_type": {"type": "string"}
                }
            },
            "UserProfile": {
                "type": "object",
                "properties": {
                    "user_id": {"type": "string"},
                    "email": {"type": "string"},
                    "name": {"type": "string"},
                    "created_at": {"type": "string", "format": "date-time"},
                    "level": {"type": "integer"},
                    "xp": {"type": "integer"},
                    "streak": {"type": "integer"}
                }
            }
        }
    }
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema
