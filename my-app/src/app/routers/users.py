# app/routers/users.py
from fastapi import APIRouter, Depends, HTTPException, Response, Request
from sqlmodel import Session, select
from passlib.hash import bcrypt
from app.db import get_session
from app.models import User, UserCreate, UserRead, UserLogin
from app.validators import validate_username, validate_password, validate_email_domain

router = APIRouter()

@router.post("/register", response_model=UserRead)
def register_user(user_in: UserCreate, response: Response, session: Session = Depends(get_session)):
    # check if email exists
    existing = session.exec(select(User).where(User.email == user_in.email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # validations
    try:
        validate_username(user_in.name)
        validate_password(user_in.password)
        validate_email_domain(user_in.email)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    user = User(
        email=user_in.email,
        name=user_in.name,
        hashed_password=bcrypt.hash(user_in.password)
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    
    response.set_cookie(
        key="user_id", 
        value=str(user.id), 
        httponly=True,
        max_age=86400  # 24 hours
    )
    
    return user

@router.post("/login", response_model=UserRead)
def login_user(login_data: UserLogin, response: Response, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == login_data.email)).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not bcrypt.verify(login_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Set a simple session cookie
    response.set_cookie(
        key="user_id", 
        value=str(user.id), 
        httponly=True,
        max_age=86400  # 24 hours
    )
    
    return user

@router.post("/logout")
def logout_user(response: Response):
    response.delete_cookie(key="user_id")
    return {"message": "Logged out successfully"}

@router.get("/me", response_model=UserRead)
def get_current_user(request: Request, session: Session = Depends(get_session)):
    user_id = request.cookies.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user = session.exec(select(User).where(User.id == int(user_id))).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user

@router.get("/", response_model=list[UserRead])
def list_users(session: Session = Depends(get_session)):
    return session.exec(select(User)).all()
