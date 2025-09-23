# app/models.py (update)
from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List

class UserBase(SQLModel):
    email: str

class User(UserBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    hashed_password: str
    profiles: List["StudentProfile"] = Relationship(back_populates="user")
    files: List["File"] = Relationship(back_populates="owner")

class UserCreate(UserBase):
    password: str  # raw password from request

class UserRead(UserBase):
    id: int

class StudentProfile(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    name: str
    major: Optional[str] = None
    bio: Optional[str] = None
    user: Optional[User] = Relationship(back_populates="profiles")

class File(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    filename: str
    filepath: str
    owner_id: int = Field(foreign_key="user.id")
    owner: Optional[User] = Relationship(back_populates="files")
