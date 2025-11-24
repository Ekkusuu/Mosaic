from fastapi import APIRouter, Depends, HTTPException, Response, Request, BackgroundTasks, status, UploadFile, File, Form
from sqlmodel import Session, select
from app.security import hash_password, verify_password
from app.db import get_session
from app.models import (
    User,
    UserCreate,
    UserRead,
    UserLogin,
    StudentProfile,
    EmailVerificationRequest,
    EmailResendRequest,
    PasswordChangeRequest,
    MessageResponse,
    EmailVerification,
    CaptchaResponse,
    CaptchaValidation,
    FaceVerificationRequest,
)
from app.validators import validate_username, validate_password, validate_email_domain
from app.captcha_utils import create_captcha, validate_captcha
from app.face_recognition_utils import verify_faces, detect_face, FaceVerificationError
from app.temp_storage import store_id_photo, get_id_photo, delete_id_photo
from datetime import datetime, timedelta, timezone
import jwt
import os
import secrets
import string
from dotenv import load_dotenv
import time
from typing import Any, Dict
from app.email_utils import send_verification_email

load_dotenv()
SECRET_KEY = os.getenv("JWT_SECRET", "").strip()
ALGORITHM = os.getenv("JWT_ALGORITHM", "").strip()
if not SECRET_KEY or not ALGORITHM:
    # Fail fast so misconfiguration is caught early
    raise RuntimeError("JWT_SECRET or JWT_ALGORITHM missing in environment")

# Token expiration (minutes). Default 4h if not supplied.
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "240"))
if ACCESS_TOKEN_EXPIRE_MINUTES < 5:
    print(f"[WARN] ACCESS_TOKEN_EXPIRE_MINUTES is very low: {ACCESS_TOKEN_EXPIRE_MINUTES} minutes")

# Basic brute force mitigation config (env-tunable)
MAX_FAILED_LOGIN_ATTEMPTS = int(os.getenv("MAX_FAILED_LOGIN_ATTEMPTS", "5"))
ACCOUNT_LOCK_MINUTES = int(os.getenv("ACCOUNT_LOCK_MINUTES", "15"))  # lock duration

# Cache decoded tokens to avoid re-decoding / verifying on every single request.
# NOTE: This introduces a trade-off: revocations (e.g., user deletion) propagate
# only after the cache TTL. Keep TTL modest.
TOKEN_CACHE_TTL_SECONDS = int(os.getenv("JWT_CACHE_TTL_SECONDS", "600"))  # default 10 minutes

# token -> {"user_id": int, "exp": int(epoch seconds), "cached_at": float, "user_obj": User | None}
_TOKEN_CACHE: Dict[str, Dict[str, Any]] = {}

# CAPTCHA storage: captcha_id -> {"text": str, "created_at": float}
# In production, use Redis or a database table with TTL
_CAPTCHA_STORE: Dict[str, Dict[str, Any]] = {}
CAPTCHA_EXPIRATION_SECONDS = 300  # 5 minutes

# Email verification configuration
# Length of numeric verification code and expiration time (in minutes)
VERIFICATION_CODE_LENGTH = int(os.getenv("VERIFICATION_CODE_LENGTH", "6"))
EMAIL_CODE_EXPIRATION_MINUTES = int(os.getenv("EMAIL_CODE_EXPIRATION_MINUTES", "15"))


def create_access_token(*, data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def generate_verification_code(length: int = VERIFICATION_CODE_LENGTH) -> str:
    alphabet = string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def ensure_aware(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def set_auth_cookie(response: Response, token: str) -> None:
    # In production you should set secure=True (HTTPS) and possibly SameSite=Strict depending on CSRF strategy.
    secure_flag = os.getenv("COOKIE_SECURE", "false").lower() == "true"
    same_site = os.getenv("COOKIE_SAMESITE", "lax").lower()
    if same_site not in {"lax", "strict", "none"}:
        same_site = "lax"
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,  # seconds
        samesite=same_site,
        secure=secure_flag,
        path="/",
    )


def delete_auth_cookie(response: Response) -> None:
    response.delete_cookie(key="access_token", path="/")


def get_user_from_token(request: Request, session: Session) -> User:
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    now = time.time()
    cache_entry = _TOKEN_CACHE.get(token)

    # Fast path: use cached decoded token info (primitive values only)
    if cache_entry and (now - cache_entry["cached_at"]) < TOKEN_CACHE_TTL_SECONDS:
        # Check expiration without re-decoding
        if now >= cache_entry["exp"]:
            _TOKEN_CACHE.pop(token, None)
            raise HTTPException(status_code=401, detail="Token expired")
        # Always load fresh ORM object from the provided session to avoid DetachedInstanceError
        user_id = cache_entry.get("user_id")
        if user_id is None:
            _TOKEN_CACHE.pop(token, None)
            raise HTTPException(status_code=401, detail="Invalid token cache entry")
        user_obj = session.exec(select(User).where(User.id == int(user_id))).first()
        if not user_obj:
            _TOKEN_CACHE.pop(token, None)
            raise HTTPException(status_code=401, detail="User not found")
        return user_obj

    # Slow path: decode JWT anew
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        exp = payload.get("exp")
        if user_id is None or exp is None:
            raise HTTPException(status_code=401, detail="Invalid token payload")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = session.exec(select(User).where(User.id == int(user_id))).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    # Store / refresh cache with primitive values only (do not store ORM instances)
    _TOKEN_CACHE[token] = {
        "user_id": int(user_id),
        "exp": int(exp),
        "cached_at": now,
    }
    return user

router = APIRouter()


@router.get("/captcha", response_model=CaptchaResponse)
def get_captcha():
    """
    Generate a new CAPTCHA image and return it with a unique ID.
    The frontend should display the image and send back the ID + user's answer.
    """
    captcha_text, base64_image = create_captcha()
    captcha_id = secrets.token_urlsafe(16)
    
    # Store the CAPTCHA text with timestamp (for expiration)
    _CAPTCHA_STORE[captcha_id] = {
        "text": captcha_text,
        "created_at": time.time()
    }
    
    # Clean up expired CAPTCHAs (simple cleanup on each request)
    current_time = time.time()
    expired_ids = [
        cid for cid, data in _CAPTCHA_STORE.items()
        if current_time - data["created_at"] > CAPTCHA_EXPIRATION_SECONDS
    ]
    for cid in expired_ids:
        del _CAPTCHA_STORE[cid]
    
    return CaptchaResponse(
        captcha_id=captcha_id,
        image_data=f"data:image/png;base64,{base64_image}"
    )


def validate_captcha_submission(captcha_id: str, captcha_text: str) -> None:
    """
    Validate a CAPTCHA submission. Raises HTTPException if invalid.
    """
    if not captcha_id or captcha_id not in _CAPTCHA_STORE:
        raise HTTPException(status_code=400, detail="Invalid or expired CAPTCHA")
    
    captcha_data = _CAPTCHA_STORE[captcha_id]
    
    # Check expiration
    if time.time() - captcha_data["created_at"] > CAPTCHA_EXPIRATION_SECONDS:
        del _CAPTCHA_STORE[captcha_id]
        raise HTTPException(status_code=400, detail="CAPTCHA expired")
    
    # Validate the text
    if not validate_captcha(captcha_text, captcha_data["text"]):
        raise HTTPException(status_code=400, detail="Invalid CAPTCHA text")
    
    # Remove used CAPTCHA (one-time use)
    del _CAPTCHA_STORE[captcha_id]


@router.post("/register", response_model=UserRead)
def register_user(
    user_in: UserCreate, 
    background_tasks: BackgroundTasks,
    response: Response, 
    session: Session = Depends(get_session)
):
    # Normalize email + name trimming
    email = (user_in.email or "").strip().lower()
    name = (user_in.name or "").strip()
    
    if not email or not name:
        raise HTTPException(status_code=400, detail="Email, name, and password are required")

    # Validations (domain + password + username pattern)
    try:
        validate_email_domain(email)
        validate_password(user_in.password)
        validate_username(name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    hashed = hash_password(user_in.password)

    # Derive university from domain (simple heuristic)
    domain_part = email.split('@', 1)[1] if '@' in email else ''
    university = None
    if domain_part:
        fragments = domain_part.split('.')
        if len(fragments) >= 2:
            university = '.'.join(fragments[-2:])

    # Create user but not verified yet
    user = User(email=email, name=name, hashed_password=hashed)
    profile = StudentProfile(user=user, university=university, username=name)
    
    # Single transaction (commit once) avoids orphan profile if failure mid-way
    session.add(user)
    session.add(profile)
    try:
        session.commit()
    except Exception as e:  # likely integrity error for duplicate
        session.rollback()
        # Log the actual error for debugging
        import traceback
        print(f"Registration error: {str(e)}")
        print(traceback.format_exc())
        # Hide raw DB exception details from client
        raise HTTPException(status_code=400, detail=f"Could not register user: {str(e)}") from e
    session.refresh(user)

    # Generate verification code for email (but don't send yet - wait for face verification)
    verification_code = generate_verification_code()
    verification_hash = hash_password(verification_code)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=EMAIL_CODE_EXPIRATION_MINUTES)
    
    verification = EmailVerification(
        user_id=user.id,
        code_hash=verification_hash,
        expires_at=expires_at,
    )
    session.add(verification)
    session.commit()
    
    # Send verification email in background
    background_tasks.add_task(send_verification_email, email, verification_code, name)

    # Don't set auth cookie yet - user needs to verify face AND email first
    return user

@router.post("/login", response_model=UserRead)
def login_user(login_data: UserLogin, response: Response, session: Session = Depends(get_session)):
    email = (login_data.email or "").strip().lower()
    user = session.exec(select(User).where(User.email == email)).first()
    # Uniform error to avoid user enumeration
    invalid_error = HTTPException(status_code=401, detail="Invalid email or password")
    now = datetime.now(timezone.utc)

    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_access_token(data={"sub": str(user.id)})
    set_auth_cookie(response, token)
    return user


@router.post("/verify-email", response_model=UserRead)
def verify_email(
    payload: EmailVerificationRequest,
    response: Response,
    session: Session = Depends(get_session),
) -> UserRead:
    user = session.exec(select(User).where(User.email == payload.email)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.is_verified:
        raise HTTPException(status_code=400, detail="Email already verified")

    verification = session.exec(
        select(EmailVerification).where(EmailVerification.user_id == user.id)
    ).first()

    if not verification:
        raise HTTPException(status_code=400, detail="No verification code found")

    if ensure_aware(verification.expires_at) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Verification code expired")

    if not verify_password(payload.code, verification.code_hash):
        raise HTTPException(status_code=400, detail="Invalid verification code")

    user.is_verified = True

    session.add(user)
    session.delete(verification)
    session.commit()
    session.refresh(user)

    token = create_access_token(data={"sub": str(user.id)})
    set_auth_cookie(response, token)

    return user


@router.post("/resend-verification", response_model=MessageResponse)
def resend_verification(
    payload: EmailResendRequest,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
) -> MessageResponse:
    user = session.exec(select(User).where(User.email == payload.email)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.is_verified:
        raise HTTPException(status_code=400, detail="Email already verified")

    verification_code = generate_verification_code()
    verification_hash = hash_password(verification_code)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=EMAIL_CODE_EXPIRATION_MINUTES)

    verification = session.exec(
        select(EmailVerification).where(EmailVerification.user_id == user.id)
    ).first()

    if verification:
        verification.code_hash = verification_hash
        verification.expires_at = expires_at
        verification.created_at = datetime.now(timezone.utc)
    else:
        verification = EmailVerification(
            user_id=user.id,
            code_hash=verification_hash,
            expires_at=expires_at,
        )
        session.add(verification)

    session.commit()
    session.refresh(user)

    background_tasks.add_task(send_verification_email, user.email, verification_code, user.name)

    return MessageResponse(message="Verification code resent")


@router.post("/change-password", response_model=MessageResponse)
def change_password(
    payload: PasswordChangeRequest,
    request: Request,
    session: Session = Depends(get_session),
) -> MessageResponse:
    user = get_user_from_token(request, session)
    
    if not verify_password(payload.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    try:
        validate_password(payload.new_password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    user.hashed_password = hash_password(payload.new_password)
    session.add(user)
    session.commit()
    
    return MessageResponse(message="Password changed successfully")


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


@router.post("/upload-id-photo")
async def upload_id_photo(
    email: str = Form(...),
    id_photo: UploadFile = File(...)
):
    """
    Upload and temporarily store the student ID photo for later verification.
    The photo will be stored for 10 minutes.
    """
    try:
        id_photo_bytes = await id_photo.read()
        
        if not id_photo_bytes:
            raise HTTPException(status_code=400, detail="ID photo is required")
        
        # Validate file size (max 10MB)
        MAX_FILE_SIZE = 10 * 1024 * 1024
        if len(id_photo_bytes) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="File size too large. Max 10MB.")
        
        # Store the photo temporarily
        store_id_photo(email, id_photo_bytes)
        print(f"Stored ID photo for {email}, size: {len(id_photo_bytes)} bytes")
        
        return {"message": "ID photo uploaded successfully", "email": email}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload ID photo: {str(e)}")


@router.post("/verify-face")
async def verify_face(
    email: str = Form(...),
    id_photo: UploadFile = File(None),
    selfie: UploadFile = File(...),
    student_id: str = Form(None),
    session: Session = Depends(get_session)
):
    """
    Verify face by comparing student ID photo with selfie.
    This must be completed before email verification can proceed.
    
    Args:
        email: User's email address (from registration form)
        student_id: Student ID number
        id_photo: Student ID photo file (optional if already uploaded)
        selfie: User's selfie photo file
    
    Returns:
        Success message if faces match, error otherwise
    """
    print(f"\n=== FACE VERIFICATION REQUEST RECEIVED ===")
    print(f"Email: {email}")
    print(f"Student ID: {student_id}")
    print(f"Timestamp: {datetime.now()}")
    try:
        # Get ID photo - either from upload or from temp storage
        if id_photo and id_photo.filename:
            id_photo_bytes = await id_photo.read()
            print(f"Using ID photo from upload for {email}")
        else:
            # Try to get from temp storage
            print(f"Attempting to retrieve ID photo from storage for {email}")
            id_photo_bytes = get_id_photo(email)
            if not id_photo_bytes:
                print(f"ID photo not found in storage for {email}")
                raise HTTPException(
                    status_code=400,
                    detail="ID photo not found. Please restart the verification process and upload your student ID again."
                )
        
        selfie_bytes = await selfie.read()
        
        # Validate that files are not empty
        if not id_photo_bytes or not selfie_bytes:
            raise HTTPException(status_code=400, detail="Both ID photo and selfie are required")
        
        # Validate file sizes (max 10MB each)
        MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
        if len(id_photo_bytes) > MAX_FILE_SIZE or len(selfie_bytes) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="File size too large. Max 10MB per file.")
        
        # Get the user from database
        user = session.exec(select(User).where(User.email == email)).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found. Please register first.")
        
        # Check if already verified
        if user.face_verified:
            return {"message": "Face already verified", "verified": True}
        
        # Detect faces in both images first (using Detection API)
        try:
            id_detection = detect_face(id_photo_bytes)
            if not id_detection["face_detected"]:
                raise HTTPException(
                    status_code=400, 
                    detail="No face detected in ID photo. Please upload a clear photo of your student ID."
                )
            
            selfie_detection = detect_face(selfie_bytes)
            if not selfie_detection["face_detected"]:
                raise HTTPException(
                    status_code=400, 
                    detail="No face detected in selfie. Please take a clear selfie showing your face."
                )
        except FaceVerificationError as e:
            print(f"FaceVerificationError during detection: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Face detection failed: {str(e)}")
        
        # Verify faces match (using Verification API)
        try:
            verification_result = verify_faces(id_photo_bytes, selfie_bytes, threshold=0.7)
            
            if not verification_result["is_match"]:
                raise HTTPException(
                    status_code=400,
                    detail=f"Face verification failed. The selfie does not match the ID photo. Similarity: {verification_result['similarity']:.2%}"
                )
            
            # Update user record with verification status
            user.student_id = student_id
            user.face_verified = True
            session.add(user)
            session.commit()
            session.refresh(user)
            
            # Clean up stored ID photo
            delete_id_photo(email)
            
            from fastapi.responses import JSONResponse
            return JSONResponse(
                content={
                    "message": "Face verification successful! You may now proceed with email verification.",
                    "verified": True,
                    "similarity": verification_result["similarity"]
                },
                headers={
                    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
                    "Pragma": "no-cache",
                    "Expires": "0"
                }
            )
            
        except FaceVerificationError as e:
            print(f"FaceVerificationError: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Face verification failed: {str(e)}")
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Unexpected error in verify_face: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"An error occurred during face verification: {str(e)}")
