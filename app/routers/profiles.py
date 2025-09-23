# app/routers/profiles.py
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from app.db import get_session
from app.models import StudentProfile

router = APIRouter()

@router.post("/", response_model=StudentProfile)
def create_profile(profile: StudentProfile, session: Session = Depends(get_session)):
    session.add(profile)
    session.commit()
    session.refresh(profile)
    return profile

@router.get("/", response_model=List[StudentProfile])
def list_profiles(q: Optional[str] = Query(None, description="search term"), session: Session = Depends(get_session)):
    stmt = select(StudentProfile)
    if q:
        stmt = select(StudentProfile).where(
            (StudentProfile.name.ilike(f"%{q}%")) | (StudentProfile.bio.ilike(f"%{q}%"))
        )
    results = session.exec(stmt).all()
    return results

@router.get("/{profile_id}", response_model=StudentProfile)
def get_profile(profile_id: int, session: Session = Depends(get_session)):
    profile = session.get(StudentProfile, profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile
