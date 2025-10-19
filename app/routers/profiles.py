# app/routers/profiles.py
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlmodel import Session, select
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timezone
from app.db import get_session
from app.models import (
    StudentProfile,
    User,
    StudentProfileCreate,
    StudentProfileUpdate,
    StudentProfileRead,
)
from app.validators import validate_username

router = APIRouter()

# Reuse the central JWT-based auth from users router to keep a single source of truth.
try:
    from app.routers.users import get_user_from_token as _jwt_current_user  # type: ignore
except Exception:  # Fallback (should not normally happen)
    _jwt_current_user = None  # type: ignore

def _current_user(request: Request, session: Session) -> User:
    if _jwt_current_user is None:
        raise HTTPException(status_code=500, detail="Auth subsystem unavailable")
    return _jwt_current_user(request, session)

# Create profile endpoint is now restricted because profile is auto-created at registration.
@router.post("/", response_model=StudentProfileRead, deprecated=True)
def create_profile(_: StudentProfileCreate, request: Request, session: Session = Depends(get_session)):
    _ = _current_user(request, session)
    raise HTTPException(status_code=409, detail="Profile is created automatically")

@router.get("/", response_model=List[StudentProfileRead])
def list_profiles(
    request: Request,
    session: Session = Depends(get_session),
    q: Optional[str] = Query(None, description="search term"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    only_public: bool = Query(True, description="Return only public profiles")
):
    _ = _current_user(request, session)  # Require auth
    stmt = select(StudentProfile)
    if only_public:
        stmt = stmt.where(StudentProfile.is_public == True)  # noqa: E712
    if q:
        like = f"%{q.lower()}%"
        # Case-insensitive search using lower() where supported; fallback to ILIKE like pattern
        stmt = stmt.where(
            (StudentProfile.name.ilike(like)) |
            (StudentProfile.username.ilike(like)) |
            (StudentProfile.bio.ilike(like)) |
            (StudentProfile.university.ilike(like))
        )
    stmt = stmt.order_by(StudentProfile.id.desc()).offset(offset).limit(limit)
    return session.exec(stmt).all()

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
    # Enforce username rules & normalization
    if 'username' in data and data['username'] is not None:
        uname = data['username'].strip()
        if uname:
            validate_username(uname)
            uname_norm = uname.lower()
            if uname_norm != profile.username:
                # Check uniqueness manually (DB constraint will also enforce)
                existing = session.exec(select(StudentProfile).where(StudentProfile.username == uname_norm)).first()
                if existing and existing.id != profile.id:
                    raise HTTPException(status_code=400, detail="Username already taken")
            data['username'] = uname_norm
        else:
            data['username'] = None
    # Restrict modification of university (system-derived)
    if 'university' in data:
        data.pop('university')
    # Limit bio length (defensive)
    if 'bio' in data and data['bio'] is not None and len(data['bio']) > 1000:
        raise HTTPException(status_code=400, detail="Bio too long (max 1000 chars)")
    for k, v in data.items():
        setattr(profile, k, v)
    profile.updated_at = datetime.now(timezone.utc)
    session.add(profile)
    try:
        session.commit()
    except IntegrityError as e:
        session.rollback()
        raise HTTPException(status_code=400, detail="Constraint violation updating profile") from e
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
    # Soft delete approach: mark non-public & scrub PII fields rather than row removal (future referential integrity)
    profile.is_public = False
    profile.bio = None
    profile.username = None
    profile.specialty = None
    profile.year = None
    profile.avatar_url = None
    profile.name = None
    profile.updated_at = datetime.now(timezone.utc)
    session.add(profile)
    session.commit()
    return None

@router.get("/{profile_id}", response_model=StudentProfileRead)
def get_profile(profile_id: int, request: Request, session: Session = Depends(get_session)):
    _ = _current_user(request, session)
    profile = session.get(StudentProfile, profile_id)
    if not profile or (not profile.is_public):
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile
