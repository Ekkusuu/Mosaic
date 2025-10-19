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
import threading

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

# In-process user locks to reduce quota race conditions. Not cross-process.
_user_locks: dict[int, threading.Lock] = {}

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
    compressed = False
    encrypted = False
    nonce: Optional[bytes] = None
    tag: Optional[bytes] = None

    try:
        with os.fdopen(tmp_fd, "wb") as tmp_file:
            # We'll decide compression after sniffing the first chunk
            cstream = None
            should_compress = False

            while True:
                chunk = stream.read(64 * 1024)
                if not chunk:
                    break

                if size == 0:
                    # Capture initial bytes for content-type sniffing
                    first_chunk = chunk[:512]
                    sniff_type = _sniff_magic(first_chunk)
                    # Skip compression for already-compressed image formats
                    if ENABLE_COMPRESSION and not sniff_type.startswith("image/"):
                        should_compress = True
                    # Initialize the output sink based on decision
                    if should_compress:
                        compressor = zstd.ZstdCompressor(level=COMPRESSION_LEVEL)
                        cstream = compressor.stream_writer(tmp_file)
                    else:
                        cstream = tmp_file

                size += len(chunk)
                if size > MAX_SINGLE_UPLOAD_BYTES:
                    raise HTTPException(status_code=413, detail="File too large")
                sha256.update(chunk)
                # cstream is guaranteed to be set after first chunk
                cstream.write(chunk)  # type: ignore[attr-defined]

            # Finalize compressor if used
            if should_compress and cstream is not None:
                try:
                    # Ensure frame is fully flushed and closed
                    cstream.flush(zstd.FLUSH_FRAME)  # type: ignore[attr-defined]
                finally:
                    try:
                        cstream.close()  # type: ignore[attr-defined]
                    except Exception:
                        pass
                compressed = True

        # At this point file on disk has raw or compressed bytes. If encryption enabled, encrypt in-place.
        if ENABLE_ENCRYPTION and AES_GCM:
            with open(tmp_path, 'rb') as rf:
                plaintext = rf.read()
            nonce = secrets.token_bytes(12)
            ciphertext = AES_GCM.encrypt(nonce, plaintext, None)
            # Layout: nonce | ciphertext (AESGCM appends tag to ciphertext)
            with open(tmp_path, 'wb') as wf:
                wf.write(nonce + ciphertext)
            encrypted = True
            tag = ciphertext[-16:]

        # fsync to disk before atomic move
        with open(tmp_path, 'ab') as wf:
            os.fsync(wf.fileno())

        # Sniff type from first chunk for response metadata and validation
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

    # Use per-user in-process lock to reduce quota race between concurrent uploads
    lock = _user_locks.setdefault(user.id, threading.Lock())
    with lock:
        # Recompute used after write to ensure we still have quota
        used_after = _user_storage_bytes(session, user.id)
        if used_after + size > MAX_USER_TOTAL_BYTES:
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
        is_compressed=bool(compressed),
        is_encrypted=bool(encrypted),
        encryption_nonce_hex=(nonce.hex() if nonce else None),
        encryption_tag_hex=(tag.hex() if tag else None),
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

    # For small files, process entirely in memory to avoid streaming
    # exceptions when an error occurs mid-stream. This ensures we only
    # start the response after successful decrypt+decompress.
    MAX_INMEMORY_BYTES = 50 * 1024 * 1024  # 50 MB threshold
    file_size_on_disk = path.stat().st_size
    if file_size_on_disk <= MAX_INMEMORY_BYTES:
        zstd_magic = b"\x28\xB5\x2F\xFD"
        data: bytes
        with open(path, 'rb') as rf:
            if bool(file_obj.is_encrypted):
                if not AES_GCM:
                    raise HTTPException(status_code=500, detail="Encryption key not configured")
                nonce_local = rf.read(12)
                if len(nonce_local) != 12:
                    raise HTTPException(status_code=500, detail="Corrupt encrypted file")
                ciphertext = rf.read()
                try:
                    data = AES_GCM.decrypt(nonce_local, ciphertext, None)
                except Exception:
                    raise HTTPException(status_code=410, detail="Unable to decrypt (key mismatch or corrupt)")
            else:
                data = rf.read()
        # Decompress if needed (by metadata or magic)
        if bool(file_obj.is_compressed) or (file_obj.is_compressed is None and data.startswith(zstd_magic)):
            try:
                dctx = zstd.ZstdDecompressor()
                # Provide an explicit max_output_size to handle frames without known content size
                max_out = file_obj.size or (100 * 1024 * 1024)
                data = dctx.decompress(data, max_output_size=int(max_out))
            except Exception:
                # Fallback: return as-is (still valid to serve compressed bytes)
                pass
        headers = {
            "Content-Disposition": f"attachment; filename=\"{file_obj.filename}\"",
            "X-Checksum-SHA256": file_obj.checksum_sha256 or "",
        }
        return Response(content=data, media_type=file_obj.content_type or 'application/octet-stream', headers=headers)

    # Fallback: streaming pipeline for larger files
    def stream_pipeline():
        zstd_magic = b"\x28\xB5\x2F\xFD"  # standard Zstd magic
        # If encrypted, the on-disk layout is: nonce(12) + ciphertext (with tag at tail)
        with open(path, 'rb') as rf:
            plaintext = None
            # Decide encryption: prefer metadata, but if missing, attempt decrypt and fall back
            encrypted_flag = file_obj.is_encrypted
            attempted_decrypt = False
            if encrypted_flag is True:
                if not AES_GCM:
                    raise HTTPException(status_code=500, detail="Encryption key not configured")
                nonce_local = rf.read(12)
                if len(nonce_local) != 12:
                    raise HTTPException(status_code=500, detail="Corrupt encrypted file")
                ciphertext = rf.read()
                try:
                    plaintext = AES_GCM.decrypt(nonce_local, ciphertext, None)
                except Exception:
                    raise HTTPException(status_code=410, detail="Unable to decrypt (key mismatch or corrupt)")
            elif encrypted_flag is None:
                # Try to decrypt opportunistically; if it fails, treat as unencrypted
                if AES_GCM:
                    pos = rf.tell()
                    nonce_local = rf.read(12)
                    if len(nonce_local) == 12:
                        ciphertext = rf.read()
                        try:
                            plaintext = AES_GCM.decrypt(nonce_local, ciphertext, None)
                            attempted_decrypt = True
                        except Exception:
                            # Not encrypted (or wrong key). Rewind and stream raw
                            rf.seek(0)
                    else:
                        rf.seek(0)
                # else: no key configured, proceed as unencrypted
            # else: encrypted_flag is False -> treat as unencrypted

            # Compression handling based on metadata, with sniff fallback when missing
            compressed_flag = file_obj.is_compressed
            if plaintext is not None:
                # We have plaintext in memory (decrypted or originally unencrypted loaded by attempt)
                if compressed_flag is True or (compressed_flag is None and plaintext.startswith(zstd_magic)):
                    try:
                        dctx = zstd.ZstdDecompressor()
                        decompressed = dctx.decompress(plaintext)
                    except Exception:
                        # Fallback: serve plaintext as-is
                        view = memoryview(plaintext)
                        for offset in range(0, len(view), 64 * 1024):
                            yield view[offset: offset + 64 * 1024]
                        return
                    view = memoryview(decompressed)
                    for offset in range(0, len(view), 64 * 1024):
                        yield view[offset: offset + 64 * 1024]
                    return
                else:
                    view = memoryview(plaintext)
                    for offset in range(0, len(view), 64 * 1024):
                        yield view[offset: offset + 64 * 1024]
                    return
            else:
                # No in-memory plaintext; we are in the unencrypted raw file path
                if compressed_flag is True:
                    dctx = zstd.ZstdDecompressor()
                    with dctx.stream_reader(rf) as reader:
                        while True:
                            chunk = reader.read(64 * 1024)
                            if not chunk:
                                break
                            yield chunk
                    return
                elif compressed_flag is None:
                    # Sniff first 4 bytes for Zstd magic, then reset and choose path
                    pos = rf.tell()
                    head = rf.read(4)
                    rf.seek(pos)
                    if head == zstd_magic:
                        dctx = zstd.ZstdDecompressor()
                        with dctx.stream_reader(rf) as reader:
                            while True:
                                chunk = reader.read(64 * 1024)
                                if not chunk:
                                    break
                                yield chunk
                        return
                # Not compressed: stream raw
                with open(path, 'rb') as rf2:
                    while True:
                        chunk = rf2.read(64 * 1024)
                        if not chunk:
                            break
                        yield chunk

    headers = {
        "Content-Disposition": f"attachment; filename=\"{file_obj.filename}\"",
        "X-Checksum-SHA256": file_obj.checksum_sha256 or "",
    }
    return StreamingResponse(stream_pipeline(), media_type=file_obj.content_type or 'application/octet-stream', headers=headers)
