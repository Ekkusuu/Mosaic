"""Application data models (SQLModel).

Enhancements added:
* Unique index + constraint on User.email (race-safe uniqueness)
* Timestamps: created_at, last_login_at
* Auth security fields: failed_login_attempts, locked_until (basic brute-force mitigation)

NOTE: SQLModel's create_all will NOT auto-migrate existing tables. If the
database already exists you must run a proper migration (e.g., Alembic) to add
the new columns & constraints. For fresh dev databases this is fine.
"""
from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Integer, Boolean, ForeignKey


def utcnow() -> datetime:
    # Always store timezone-aware UTC timestamps
    return datetime.now(timezone.utc)

class UserBase(SQLModel):
    # email kept case-insensitive; we will normalize to lowercase on write.
    email: str
    name: str

class User(UserBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    # Unique + indexed email column (race-safe uniqueness)
    email: str = Field(sa_column=Column(String(255), unique=True, index=True, nullable=False))  # override parent
    hashed_password: str
    # Email verification flag (column ensured at startup via DDL in app.main)
    is_verified: bool = Field(default=False, sa_column=Column(Boolean, nullable=False, server_default="0"))
    created_at: datetime = Field(default_factory=utcnow, sa_column=Column(DateTime(timezone=True), nullable=False))
    last_login_at: Optional[datetime] = Field(default=None, sa_column=Column(DateTime(timezone=True), nullable=True))
    failed_login_attempts: int = Field(default=0, sa_column=Column(Integer, nullable=False, default=0))
    locked_until: Optional[datetime] = Field(default=None, sa_column=Column(DateTime(timezone=True), nullable=True))

    profiles: List["StudentProfile"] = Relationship(back_populates="user")
    files: List["File"] = Relationship(back_populates="owner")
    verification: Optional["EmailVerification"] = Relationship(
        back_populates="user", sa_relationship_kwargs={"uselist": False}
    )

class UserCreate(UserBase):
    password: str  # raw password from request

class UserLogin(SQLModel):
    email: str
    password: str

class UserRead(UserBase):
    id: int
    is_verified: bool

class StudentProfile(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    # Enforce one-to-one with User via unique constraint; race-safe uniqueness
    # Use SQLAlchemy ForeignKey inside sa_column instead of passing both foreign_key and sa_column
    user_id: int = Field(sa_column=Column(Integer, ForeignKey("user.id"), unique=True, index=True, nullable=False))
    # Display name (can differ from account 'name')
    name: Optional[str] = Field(default=None, sa_column=Column(String(120), nullable=True))
    # Username: normalized, unique, used for mentions / future friendly URLs
    username: Optional[str] = Field(default=None, sa_column=Column(String(40), unique=True, index=True, nullable=True))
    # University and searchable academic affiliation (indexed)
    university: Optional[str] = Field(default=None, sa_column=Column(String(255), index=True, nullable=True))
    year: Optional[str] = Field(default=None, sa_column=Column(String(50), nullable=True))
    specialty: Optional[str] = Field(default=None, sa_column=Column(String(120), nullable=True))
    # Bio length limited to avoid overly large rows (further server-side validation too)
    bio: Optional[str] = Field(default=None, sa_column=Column(String(1000), nullable=True))
    avatar_url: Optional[str] = Field(default=None, sa_column=Column(String(500), nullable=True))
    # Visibility flag for future public/private profile controls
    is_public: bool = Field(default=True, sa_column=Column(Boolean, nullable=False, default=True))
    created_at: datetime = Field(default_factory=utcnow, sa_column=Column(DateTime(timezone=True), nullable=False))
    updated_at: datetime = Field(default_factory=utcnow, sa_column=Column(DateTime(timezone=True), nullable=False))
    user: Optional[User] = Relationship(back_populates="profiles")

class StudentProfileCreate(SQLModel):
    # All optional; creation is mostly automatic
    name: Optional[str] = None
    username: Optional[str] = None
    year: Optional[str] = None
    specialty: Optional[str] = None
    bio: Optional[str] = None

class StudentProfileUpdate(SQLModel):
    name: Optional[str] = None
    username: Optional[str] = None
    year: Optional[str] = None
    specialty: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None

class StudentProfileRead(SQLModel):
    id: int
    user_id: int
    name: Optional[str] = None
    username: Optional[str] = None
    university: Optional[str] = None
    year: Optional[str] = None
    specialty: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None

class File(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    filename: str  # original user-provided filename (not trusted for storage path)
    filepath: str  # absolute or configured storage path
    owner_id: int = Field(foreign_key="user.id")
    content_type: Optional[str] = None
    size: Optional[int] = None  # bytes
    checksum_sha256: Optional[str] = None
    # New metadata for storage pipeline
    is_compressed: bool = Field(default=False)
    is_encrypted: bool = Field(default=False)
    # nonce/tag stored as hex so it can be persisted easily
    encryption_nonce_hex: Optional[str] = None
    encryption_tag_hex: Optional[str] = None
    encryption_key_id: Optional[str] = None
    visibility: str = Field(default="private")  # private|public|unlisted
    uploaded_at: Optional[str] = None  # ISO timestamp
    owner: Optional[User] = Relationship(back_populates="files")

# Email verification models
class EmailVerificationRequest(SQLModel):
    email: str
    code: str

class EmailResendRequest(SQLModel):
    email: str


class MessageResponse(SQLModel):
    message: str


class EmailVerification(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", unique=True)
    code_hash: str = Field(max_length=255)
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    user: Optional[User] = Relationship(back_populates="verification")
