# app/main.py
from fastapi import FastAPI
from sqlmodel import SQLModel
from app.db import engine
from app.routers import profiles, files, users  # imports router modules

app = FastAPI(title="Student Knowledge Platform - Backend")

app.include_router(profiles.router, prefix="/profiles", tags=["profiles"])
app.include_router(files.router, prefix="/files", tags=["files"])
app.include_router(users.router, prefix="/users", tags=["users"])

@app.on_event("startup")
def on_startup():
    # Create tables automatically on startup (convenient for development)
    SQLModel.metadata.create_all(engine)

@app.get("/")
def root():
    return {"msg": "Student platform backend is running. Visit /docs"}
