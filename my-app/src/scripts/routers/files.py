# app/routers/files.py
import os
import shutil
from uuid import uuid4
from fastapi import APIRouter, UploadFile as FastAPIUploadFile, File as FastAPIFile, Form, Depends
from sqlmodel import Session
from app.db import get_session
from app.models import File as FileModel

router = APIRouter()

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/", response_model=FileModel)
def upload_file(
    file: FastAPIUploadFile = FastAPIFile(...),
    owner_id: int = Form(...),
    session: Session = Depends(get_session),
):
    ext = os.path.splitext(file.filename)[1]
    fname = f"{uuid4().hex}{ext}"
    dest = os.path.join(UPLOAD_DIR, fname)
    with open(dest, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    db_file = FileModel(filename=file.filename, filepath=dest, owner_id=owner_id)
    session.add(db_file)
    session.commit()
    session.refresh(db_file)
    return db_file
