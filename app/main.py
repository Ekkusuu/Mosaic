# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel
from sqlalchemy import text
from app.db import engine
from app.routers import profiles, files, users, posts  # imports router modules
from app.routers import chatbot
from app.routers import rag

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
app.include_router(posts.router, prefix="/posts", tags=["posts"])
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
