# app/main.py
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel
from sqlalchemy import text, inspect
from app.db import engine, DATABASE_URL
from app.routers import profiles, files, users  # imports router modules
from app.routers import chatbot

app = FastAPI(title="Student Knowledge Platform - Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],  # Vite default ports
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(profiles.router, prefix="/profiles", tags=["profiles"])
app.include_router(files.router, prefix="/files", tags=["files"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(chatbot.router, prefix="/chatbot", tags=["chatbot"])

def ensure_email_verification_schema() -> None:
    """Ensure email verification schema is up to date (PostgreSQL only)"""
    # Skip for SQLite as it doesn't support ALTER TABLE IF NOT EXISTS
    if DATABASE_URL and DATABASE_URL.startswith("sqlite"):
        return
    
    ddl_statements = [
        "ALTER TABLE \"user\" ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE",
        "UPDATE \"user\" SET is_verified = COALESCE(is_verified, FALSE)",
        "ALTER TABLE \"user\" DROP COLUMN IF EXISTS verified_at",
        "ALTER TABLE \"user\" DROP COLUMN IF EXISTS verification_code",
        "ALTER TABLE \"user\" DROP COLUMN IF EXISTS verification_code_hash",
        "ALTER TABLE \"user\" DROP COLUMN IF EXISTS verification_code_expires_at",
    ]
    try:
        with engine.begin() as connection:
            for statement in ddl_statements:
                connection.execute(text(statement))
    except Exception as e:
        print(f"Warning: Could not apply schema migration: {e}")


@app.on_event("startup")
def on_startup():
    # Create tables automatically on startup (convenient for development)
    SQLModel.metadata.create_all(engine)
    ensure_email_verification_schema()

@app.get("/")
def root():
    return {"msg": "Student platform backend is running. Visit /docs"}
