# app/routers/files.py
import os
import shutil
from uuid import uuid4
from fastapi import APIRouter, UploadFile as FastAPIUploadFile, File as FastAPIFile, Form, Depends
from sqlmodel import Session
from app.db import get_session
from app.models import File as FileModel
import os
import stat
import tempfile
import hashlib
import secrets
from datetime import datetime
from pathlib import Path
from uuid import uuid4
from typing import Optional

from fastapi import (
    APIRouter,
    UploadFile as FastAPIUploadFile,
    File as FastAPIFile,
    Form,
    Depends,
    HTTPException,
    Response,
    Request,
)
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select
from app.db import get_session
from app.models import File as FileModel, User

MAX_SINGLE_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_SIZE", str(25 * 1024 * 1024)))  # 25 MB default
MAX_USER_TOTAL_BYTES = int(os.getenv("MAX_USER_STORAGE", str(200 * 1024 * 1024)))   # 200 MB per user
ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".txt", ".md"}
ALLOWED_MIME_PREFIXES = {"image/", "text/", "application/pdf"}

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "./uploads")).resolve()

# Ensure upload dir exists with owner-only perms (700 / rwx------)
def _ensure_upload_dir():
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    try:
        os.chmod(UPLOAD_DIR, stat.S_IRWXU)
    except Exception:
        pass  # Ignore on platforms that don't support

_ensure_upload_dir()

def _current_user(request: Request, session: Session) -> User:
    # Expect access_token cookie decoded elsewhere; minimal stub for now
    token_user_id = request.cookies.get("user_id")
    if not token_user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = session.get(User, int(token_user_id))
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

def _user_storage_bytes(session: Session, user_id: int) -> int:
    total = 0
    for f in session.exec(select(FileModel).where(FileModel.owner_id == user_id)).all():
        if f.size:
            total += f.size
        else:
            try:
                total += os.path.getsize(f.filepath)
            except OSError:
                pass
    return total

def _validate_extension(filename: str):
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Extension not allowed")
    return ext

def _validate_content_type(sniffed: str):
    if not any(sniffed.startswith(pref) for pref in ALLOWED_MIME_PREFIXES):
        raise HTTPException(status_code=400, detail="Content type not allowed")

def _sniff_magic(data: bytes) -> str:
    # Minimal magic sniff (extend as needed)
    if data.startswith(b"%PDF"):
        return "application/pdf"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if data.startswith(b"\xff\xd8"):
        return "image/jpeg"
    # Fallback naive text detection
    if all((32 <= b <= 126) or b in (9, 10, 13) for b in data[:128]):
        return "text/plain"
    return "application/octet-stream"

def _atomic_write(stream, dest_dir: Path, stored_name: str) -> tuple[Path, int, str, str]:
    # Returns (final_path, size, content_type, checksum)
    tmp_fd, tmp_path = tempfile.mkstemp(dir=dest_dir)
    sha256 = hashlib.sha256()
    size = 0
    first_chunk = b""
    try:
        with os.fdopen(tmp_fd, "wb") as tmp_file:
            # Read in chunks
            while True:
                chunk = stream.read(64 * 1024)
                if not chunk:
                    break
                if not first_chunk:
                    first_chunk = chunk[:512]
                size += len(chunk)
                if size > MAX_SINGLE_UPLOAD_BYTES:
                    raise HTTPException(status_code=413, detail="File too large")
                sha256.update(chunk)
                tmp_file.write(chunk)
            tmp_file.flush()
            os.fsync(tmp_file.fileno())
        # Sniff type from first chunk
        content_type = _sniff_magic(first_chunk)
        _validate_content_type(content_type)
        final_path = dest_dir / stored_name
        os.replace(tmp_path, final_path)  # atomic move
        os.chmod(final_path, stat.S_IRUSR | stat.S_IWUSR)  # 600
        return final_path, size, content_type, sha256.hexdigest()
    except Exception:
        try:
            os.remove(tmp_path)
        except OSError:
            pass
        raise

router = APIRouter()
@router.post("/", response_model=FileModel)
def upload_file(
    file: FastAPIUploadFile = FastAPIFile(...),
    visibility: str = Form("private"),
    request: Request = None,
    session: Session = Depends(get_session),
):
    user = _current_user(request, session)

    # Limit total user storage
    used = _user_storage_bytes(session, user.id)
    if used >= MAX_USER_TOTAL_BYTES:
        raise HTTPException(status_code=403, detail="Storage quota exceeded")

    # Basic client-provided length check (Content-Length header)
    cl_header = request.headers.get("content-length")
    if cl_header:
        try:
            cl = int(cl_header)
            if cl > MAX_SINGLE_UPLOAD_BYTES:
                raise HTTPException(status_code=413, detail="File too large (header)")
        except ValueError:
            pass

    original_name = file.filename or "unnamed"
    ext = _validate_extension(original_name)
    stored_token = secrets.token_urlsafe(16)
    stored_name = f"{stored_token}{ext}"

    # Stream + atomic write
    final_path, size, content_type, checksum = _atomic_write(file.file, UPLOAD_DIR, stored_name)

    if used + size > MAX_USER_TOTAL_BYTES:
        # Rollback file if quota exceeded mid-upload
        try:
            os.remove(final_path)
        except OSError:
            pass
        raise HTTPException(status_code=403, detail="Storage quota exceeded")

    db_file = FileModel(
        filename=original_name,
        filepath=str(final_path),
        owner_id=user.id,
        content_type=content_type,
        size=size,
        checksum_sha256=checksum,
        visibility=visibility if visibility in {"private", "public", "unlisted"} else "private",
        uploaded_at=datetime.utcnow().isoformat() + "Z",
    )
    try:
        session.add(db_file)
        session.commit()
        session.refresh(db_file)
    except Exception:
        # Metadata failed; remove file to avoid orphan
        try:
            os.remove(final_path)
        except OSError:
            pass
        raise
    return db_file

def _authorize_file_access(user: User, file_obj: FileModel):
    if file_obj.visibility == "public":
        return
    if file_obj.owner_id == user.id:
        return
    raise HTTPException(status_code=403, detail="Not authorized")

@router.get("/{file_id}")
def download_file(file_id: int, request: Request, session: Session = Depends(get_session)):
    user = _current_user(request, session)
    file_obj = session.get(FileModel, file_id)
    if not file_obj:
        raise HTTPException(status_code=404, detail="File not found")
    _authorize_file_access(user, file_obj)
    path = Path(file_obj.filepath)
    if not path.exists():
        raise HTTPException(status_code=410, detail="File missing")

    def iterfile():
        with path.open('rb') as f:
            while True:
                chunk = f.read(64 * 1024)
                if not chunk:
                    break
                yield chunk

    headers = {
        "Content-Disposition": f"attachment; filename=\"{file_obj.filename}\"",
        "X-Checksum-SHA256": file_obj.checksum_sha256 or "",
    }
    return StreamingResponse(iterfile(), media_type=file_obj.content_type or 'application/octet-stream', headers=headers)
