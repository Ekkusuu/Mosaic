# app/main.py
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from sqlmodel import SQLModel
from sqlalchemy import text
from app.db import engine
from app.routers import profiles, files, users, posts, notes  # imports router modules
from app.routers import chatbot
from app.routers import rag
import os
from dotenv import load_dotenv

load_dotenv()

# Security configuration from environment
ENABLE_HSTS = os.getenv("ENABLE_HSTS", "false").lower() == "true"
IS_PRODUCTION = os.getenv("IS_PRODUCTION", "false").lower() == "true"

# CSP Policy Configuration
# Development CSP - more permissive for React HMR and Vite dev tools
DEV_CSP_POLICY = (
    "default-src 'self'; "
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "  # Required for Vite HMR
    "style-src 'self' 'unsafe-inline'; "  # Required for CSS-in-JS
    "img-src 'self' data: blob:; "  # Removed https: wildcard for stricter CSP
    "font-src 'self' data:; "
    "connect-src 'self' http://localhost:* ws://localhost:* wss://localhost:*; "
    "frame-ancestors 'self'; "
    "form-action 'self'; "  # Restricts form submissions
    "base-uri 'self'; "  # Restricts <base> tag
    "object-src 'none';"  # Blocks plugins like Flash
)

# Production CSP - strict policy (remove unsafe-inline/eval after build optimization)
PROD_CSP_POLICY = (
    "default-src 'self'; "
    "script-src 'self'; "  # No unsafe-inline/eval in production
    "style-src 'self' 'unsafe-inline'; "  # May still need for some CSS
    "img-src 'self' data: blob:; "  # No wildcards in production
    "font-src 'self' data:; "
    "connect-src 'self'; "
    "frame-ancestors 'self'; "
    "form-action 'self'; "
    "base-uri 'self'; "
    "object-src 'none'; "
    "upgrade-insecure-requests;"  # Upgrade HTTP to HTTPS
)

# Use environment variable or fall back to dev/prod default
CSP_POLICY = os.getenv("CSP_POLICY", PROD_CSP_POLICY if IS_PRODUCTION else DEV_CSP_POLICY)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware to add security headers to all responses.
    Addresses OWASP ZAP findings:
    - Content Security Policy (CSP) Header Not Set
    - Missing Anti-clickjacking Header (X-Frame-Options)
    - X-Content-Type-Options Header Missing
    - Strict-Transport-Security Header Not Set
    """
    
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        
        # Content Security Policy - Prevents XSS and data injection attacks
        response.headers["Content-Security-Policy"] = CSP_POLICY
        
        # X-Frame-Options - Prevents clickjacking attacks
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        
        # X-Content-Type-Options - Prevents MIME type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"
        
        # X-XSS-Protection - Additional XSS protection for older browsers
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        # Referrer-Policy - Controls referrer information
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # Permissions-Policy - Controls browser features
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        
        # HSTS - Only enable in production with HTTPS
        if ENABLE_HSTS:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        # Remove server version header to prevent information disclosure
        if "server" in response.headers:
            del response.headers["server"]
        
        return response


app = FastAPI(
    title="Student Knowledge Platform - Backend",
    # Disable docs in production for security (uncomment in production)
    # docs_url=None,
    # redoc_url=None,
)

# Add security headers middleware FIRST (before CORS)
app.add_middleware(SecurityHeadersMiddleware)

app.add_middleware(
    CORSMiddleware,
    # Specific origins only - no wildcards for security
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
    expose_headers=["X-Request-ID"],
)

app.include_router(profiles.router, prefix="/profiles", tags=["profiles"])
app.include_router(files.router, prefix="/files", tags=["files"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(posts.router, prefix="/posts", tags=["posts"])
app.include_router(notes.router, prefix="/notes", tags=["notes"])
app.include_router(chatbot.router, prefix="/chatbot", tags=["chatbot"])
app.include_router(rag.router, prefix="/rag", tags=["rag"])

def ensure_email_verification_schema() -> None:
    ddl_statements = [
        "ALTER TABLE \"user\" ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE",
        "UPDATE \"user\" SET is_verified = COALESCE(is_verified, FALSE)",
        "ALTER TABLE \"user\" DROP COLUMN IF EXISTS verified_at",
        "ALTER TABLE \"user\" DROP COLUMN IF EXISTS verification_code",
        "ALTER TABLE \"user\" DROP COLUMN IF EXISTS verification_code_hash",
        "ALTER TABLE \"user\" DROP COLUMN IF EXISTS verification_code_expires_at",
    ]
    with engine.begin() as connection:
        for statement in ddl_statements:
            connection.execute(text(statement))


@app.on_event("startup")
def on_startup():
    # Create tables automatically on startup (convenient for development)
    SQLModel.metadata.create_all(engine)
    ensure_email_verification_schema()

@app.get("/")
def root():
    return {"msg": "Student platform backend is running. Visit /docs"}
