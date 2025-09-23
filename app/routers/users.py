# app/routers/users.py
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.database import get_session
from app.models import User
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

router = APIRouter()

@router.post("/", response_model=User)
def create_user(user: User, session: Session = Depends(get_session)):
    # NOTE: in production you'd use a request schema (no hashed_password field sent directly)
    user.hashed_password = pwd_context.hash(user.hashed_password)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user

@router.get("/", response_model=list[User])
def list_users(session: Session = Depends(get_session)):
    return session.exec(select(User)).all()