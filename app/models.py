# app/models.py
from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str
    hashed_password: str

    profiles: List["StudentProfile"] = Relationship(back_populates="user")
    files: List["File"] = Relationship(back_populates="owner")


class StudentProfile(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    name: str
    major: Optional[str] = None
    bio: Optional[str] = None

    user: Optional[User] = Relationship(back_populates="profiles")


class File(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    filename: str
    filepath: str
    owner_id: Optional[int] = Field(default=None, foreign_key="user.id")

    owner: Optional[User] = Relationship(back_populates="files")
