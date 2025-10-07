# app/routers/users.py
from fastapi import APIRouter, Depends, HTTPException, Response, Request
from sqlmodel import Session, select
from app.security import hash_password, verify_password
from app.db import get_session
from app.models import User, UserCreate, UserRead, UserLogin
from app.validators import validate_username, validate_password, validate_email_domain
from datetime import datetime, timedelta, timezone
import jwt
import os
from dotenv import load_dotenv

load_dotenv()
SECRET_KEY = os.getenv("JWT_SECRET", "")
ALGORITHM = os.getenv("JWT_ALGORITHM", "")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "1"))


def create_access_token(*, data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",
        secure=False,
        path="/",
    )


def delete_auth_cookie(response: Response) -> None:
    response.delete_cookie(key="access_token", path="/")


def get_user_from_token(request: Request, session: Session) -> User:
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token payload")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = session.exec(select(User).where(User.id == int(user_id))).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

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
        hashed_password=hash_password(user_in.password)
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    
    token = create_access_token(data={"sub": str(user.id)})
    set_auth_cookie(response, token)

    return user

@router.post("/login", response_model=UserRead)
def login_user(login_data: UserLogin, response: Response, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == login_data.email)).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_access_token(data={"sub": str(user.id)})
    set_auth_cookie(response, token)
    
    return user

@router.post("/logout")
def logout_user(response: Response):
    delete_auth_cookie(response)
    return {"message": "Logged out successfully"}

@router.get("/me", response_model=UserRead)
def get_current_user(request: Request, session: Session = Depends(get_session)):
    user = get_user_from_token(request, session)
    return user

@router.get("/", response_model=list[UserRead])
def list_users(session: Session = Depends(get_session)):
    return session.exec(select(User)).all()
