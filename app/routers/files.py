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
import zstandard as zstd
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
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
ENABLE_COMPRESSION = os.getenv("FILE_COMPRESSION", "true").lower() == "true"
COMPRESSION_LEVEL = int(os.getenv("ZSTD_LEVEL", "6"))
ENCRYPTION_KEY_HEX = os.getenv("FILE_ENCRYPTION_KEY")  # 64 hex chars for 32 bytes
ENABLE_ENCRYPTION = bool(ENCRYPTION_KEY_HEX)
if ENABLE_ENCRYPTION:
    try:
        _raw_key = bytes.fromhex(ENCRYPTION_KEY_HEX)
        if len(_raw_key) != 32:
            raise ValueError("Encryption key must be 32 bytes (64 hex chars)")
        AES_GCM = AESGCM(_raw_key)
    except Exception as e:
        raise RuntimeError(f"Invalid FILE_ENCRYPTION_KEY: {e}")
else:
    AES_GCM = None  # type: ignore
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

try:
    from app.routers.users import get_user_from_token as _jwt_current_user  # type: ignore
except Exception:
    _jwt_current_user = None  # type: ignore

def _current_user(request: Request, session: Session) -> User:
    if _jwt_current_user is None:
        raise HTTPException(status_code=500, detail="Auth subsystem unavailable")
    return _jwt_current_user(request, session)

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

def _atomic_write(stream, dest_dir: Path, stored_name: str) -> tuple[Path, int, str, str, bool, bool, Optional[bytes], Optional[bytes]]:
    # Returns (final_path, size, content_type, checksum, compressed, encrypted, nonce, tag)
    tmp_fd, tmp_path = tempfile.mkstemp(dir=dest_dir)
    sha256 = hashlib.sha256()
    size = 0
    first_chunk = b""
    compressor: Optional[zstd.ZstdCompressor] = None
    compressed = False
    encrypted = False
    nonce: Optional[bytes] = None
    tag: Optional[bytes] = None
    try:
        with os.fdopen(tmp_fd, "wb") as tmp_file:
            if ENABLE_COMPRESSION:
                compressor = zstd.ZstdCompressor(level=COMPRESSION_LEVEL)
                cstream = compressor.stream_writer(tmp_file)
            else:
                cstream = tmp_file  # type: ignore
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
                cstream.write(chunk)
            if ENABLE_COMPRESSION:
                cstream.flush(zstd.FLUSH_FRAME)
                compressed = True
            # At this point file on disk has raw or compressed bytes. If encryption enabled, re-open and encrypt in-place to new temp.
        if ENABLE_ENCRYPTION and AES_GCM:
            # Read back original temp contents
            with open(tmp_path, 'rb') as rf:
                plaintext = rf.read()
            nonce = secrets.token_bytes(12)
            ciphertext = AES_GCM.encrypt(nonce, plaintext, None)
            # Layout: nonce | ciphertext
            # (AESGCM in cryptography appends tag automatically to ciphertext tail)
            with open(tmp_path, 'wb') as wf:
                wf.write(nonce + ciphertext)
            encrypted = True
            # Extract tag (last 16 bytes of ciphertext)
            tag = ciphertext[-16:]
        with open(tmp_path, 'ab') as wf:
            os.fsync(wf.fileno())
        # Sniff type from first chunk
        content_type = _sniff_magic(first_chunk)
        _validate_content_type(content_type)
        final_path = dest_dir / stored_name
        os.replace(tmp_path, final_path)  # atomic move
        os.chmod(final_path, stat.S_IRUSR | stat.S_IWUSR)  # 600
        return final_path, size, content_type, sha256.hexdigest(), compressed, encrypted, nonce, tag
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
    final_path, size, content_type, checksum, compressed, encrypted, nonce, tag = _atomic_write(file.file, UPLOAD_DIR, stored_name)

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
        # store flags & encryption metadata encoded in filename path or separate columns (simplest: extend model later if needed)
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

    # Read + fully process BEFORE starting response so errors become proper JSON and
    # not mid-stream 500s caused by generator exceptions.
    try:
        raw = path.read_bytes()
    except Exception:
        raise HTTPException(status_code=500, detail="Could not read file")

    payload = raw

    # Decrypt first (file layout if encrypted: nonce(12) | ciphertext+tag )
    if ENABLE_ENCRYPTION and AES_GCM:
        if len(raw) < 13:
            raise HTTPException(status_code=500, detail="Corrupt encrypted file")
        nonce_local = raw[:12]
        ciphertext = raw[12:]
        try:
            payload = AES_GCM.decrypt(nonce_local, ciphertext, None)
        except Exception:
            # Likely key rotation / mismatch or tampering.
            raise HTTPException(status_code=410, detail="Unable to decrypt (key mismatch or corrupt)")

    # Decompress if enabled (best effort; if fails treat as raw)
    if ENABLE_COMPRESSION:
        try:
            dctx = zstd.ZstdDecompressor()
            payload = dctx.decompress(payload)
        except Exception:
            # If compression flag enabled but data not compressed (legacy file), continue.
            pass

    # Verify checksum (payload should represent original logical content)
    if file_obj.checksum_sha256:
        calc = hashlib.sha256(payload).hexdigest()
        if calc != file_obj.checksum_sha256:
            # Content integrity failed (tamper or corruption after encryption/decompression pipeline)
            raise HTTPException(status_code=500, detail="Checksum verification failed")

    def iterfile():
        view = memoryview(payload)
        for offset in range(0, len(view), 64 * 1024):
            yield view[offset: offset + 64 * 1024]

    headers = {
        "Content-Disposition": f"attachment; filename=\"{file_obj.filename}\"",
        "X-Checksum-SHA256": file_obj.checksum_sha256 or "",
    }
    return StreamingResponse(iterfile(), media_type=file_obj.content_type or 'application/octet-stream', headers=headers)
