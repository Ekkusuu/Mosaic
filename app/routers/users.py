# app/routers/users.py
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from passlib.hash import bcrypt
from app.db import get_session
from app.models import User, UserCreate, UserRead

router = APIRouter()

@router.post("/", response_model=UserRead)
def create_user(user_in: UserCreate, session: Session = Depends(get_session)):
    # check if email exists
    existing = session.exec(select(User).where(User.email == user_in.email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(email=user_in.email, hashed_password=bcrypt.hash(user_in.password))
    session.add(user)
    session.commit()
    session.refresh(user)
    return user

@router.get("/", response_model=list[UserRead])
def list_users(session: Session = Depends(get_session)):
    return session.exec(select(User)).all()
