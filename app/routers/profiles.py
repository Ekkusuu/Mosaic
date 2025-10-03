# app/routers/profiles.py
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlmodel import Session, select
from app.db import get_session
from app.models import (
    StudentProfile,
    User,
    StudentProfileCreate,
    StudentProfileUpdate,
    StudentProfileRead,
)

router = APIRouter()

def _current_user(request: Request, session: Session) -> User:
    user_id = request.cookies.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = session.get(User, int(user_id))
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

@router.post("/", response_model=StudentProfileRead)
def create_profile(
    payload: StudentProfileCreate,
    request: Request,
    session: Session = Depends(get_session)
):
    user = _current_user(request, session)
    existing = session.exec(select(StudentProfile).where(StudentProfile.user_id == user.id)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Profile already exists")
    profile_data = payload.model_dump(exclude_unset=True)
    profile = StudentProfile(user_id=user.id, **profile_data)
    session.add(profile)
    session.commit()
    session.refresh(profile)
    return profile

@router.get("/", response_model=List[StudentProfileRead])
def list_profiles(q: Optional[str] = Query(None, description="search term"), session: Session = Depends(get_session)):
    stmt = select(StudentProfile)
    if q:
        like = f"%{q}%"
        stmt = select(StudentProfile).where(
            (StudentProfile.name.ilike(like)) |
            (StudentProfile.username.ilike(like)) |
            (StudentProfile.bio.ilike(like)) |
            (StudentProfile.university.ilike(like))
        )
    results = session.exec(stmt).all()
    return results

@router.get("/me", response_model=StudentProfileRead)
def get_own_profile(request: Request, session: Session = Depends(get_session)):
    user = _current_user(request, session)
    profile = session.exec(select(StudentProfile).where(StudentProfile.user_id == user.id)).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile

@router.patch("/me", response_model=StudentProfileRead)
def update_own_profile(
    payload: StudentProfileUpdate,
    request: Request,
    session: Session = Depends(get_session)
):
    user = _current_user(request, session)
    profile = session.exec(select(StudentProfile).where(StudentProfile.user_id == user.id)).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(profile, k, v)
    session.add(profile)
    session.commit()
    session.refresh(profile)
    return profile

@router.delete("/me", status_code=204)
def delete_own_profile(
    request: Request,
    session: Session = Depends(get_session)
):
    user = _current_user(request, session)
    profile = session.exec(select(StudentProfile).where(StudentProfile.user_id == user.id)).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    session.delete(profile)
    session.commit()
    return None

@router.get("/{profile_id}", response_model=StudentProfileRead)
def get_profile(profile_id: int, session: Session = Depends(get_session)):
    profile = session.get(StudentProfile, profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile
