# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel
from sqlalchemy import text
from app.db import engine
from app.routers import profiles, files, users  # imports router modules
from app.routers import chatbot

app = FastAPI(title="Student Knowledge Platform - Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+):\d+",  # Allow localhost and local network IPs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(profiles.router, prefix="/profiles", tags=["profiles"])
app.include_router(files.router, prefix="/files", tags=["files"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(chatbot.router, prefix="/chatbot", tags=["chatbot"])

def ensure_email_verification_schema() -> None:
    """
    Ensures the email verification schema is up to date.
    SQLite doesn't support IF NOT EXISTS in ALTER TABLE ADD COLUMN,
    so we need to check if the column exists first.
    """
    with engine.begin() as connection:
        # Check if columns exist
        result = connection.execute(text("PRAGMA table_info(user)"))
        columns = [row[1] for row in result]
        
        if 'is_verified' not in columns:
            connection.execute(text('ALTER TABLE "user" ADD COLUMN is_verified BOOLEAN DEFAULT FALSE'))
        
        if 'student_id' not in columns:
            connection.execute(text('ALTER TABLE "user" ADD COLUMN student_id VARCHAR(100)'))
        
        if 'face_verified' not in columns:
            connection.execute(text('ALTER TABLE "user" ADD COLUMN face_verified BOOLEAN DEFAULT FALSE'))
        
        # Update any NULL values to FALSE
        connection.execute(text('UPDATE "user" SET is_verified = COALESCE(is_verified, FALSE)'))
        connection.execute(text('UPDATE "user" SET face_verified = COALESCE(face_verified, FALSE)'))
        
        # Drop old columns if they exist (SQLite doesn't support DROP COLUMN IF EXISTS easily)
        # These are best handled via proper migrations (Alembic)


@app.on_event("startup")
def on_startup():
    # Create tables automatically on startup (convenient for development)
    SQLModel.metadata.create_all(engine)
    ensure_email_verification_schema()

@app.get("/")
def root():
    return {"msg": "Student platform backend is running. Visit /docs"}
