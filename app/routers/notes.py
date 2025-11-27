# app/routers/notes.py
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
from typing import Optional, List
import threading
import io

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
from app.models import File as FileModel, Note as NoteModel, User

# Configuration from environment
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
    """
    Write file atomically with optional compression and encryption.
    Returns (final_path, size, content_type, checksum, compressed, encrypted, nonce, tag)
    """
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

@router.post("/", status_code=201)
def create_note(
    title: str = Form(...),
    subject: str = Form(""),
    visibility: str = Form("private"),
    content: str = Form(...),
    tags: str = Form("[]"),  # JSON array of tags as string
    attachments: List[FastAPIUploadFile] = FastAPIFile(default=[]),
    request: Request = None,
    session: Session = Depends(get_session),
):
    """
    Create a new note with content and optional attachments.
    
    - **title**: Note title (required)
    - **subject**: Note subject/category (optional)
    - **visibility**: Note visibility - "private" or "public" (default: "private")
    - **content**: Markdown content (required) - will be saved as a file with file_type="content"
    - **tags**: JSON array of tag strings (optional)
    - **attachments**: Optional file attachments - will be saved with file_type="attachment"
    """
    user = _current_user(request, session)
    
    # Parse tags from JSON string
    import json
    try:
        tag_list = json.loads(tags) if tags else []
        if not isinstance(tag_list, list):
            tag_list = []
    except:
        tag_list = []
    
    # Validate visibility
    if visibility.lower() not in {"private", "public"}:
        visibility = "private"
    else:
        visibility = visibility.lower()
    
    # Check storage quota
    used = _user_storage_bytes(session, user.id)
    if used >= MAX_USER_TOTAL_BYTES:
        raise HTTPException(status_code=403, detail="Storage quota exceeded")
    
    # Use per-user lock to prevent race conditions
    lock = _user_locks.setdefault(user.id, threading.Lock())
    
    with lock:
        try:
            # Create the note record first (without files)
            note = NoteModel(
                user_id=user.id,
                title=title,
                subject=subject if subject else None,
                visibility=visibility,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            session.add(note)
            session.commit()
            session.refresh(note)
            
            # Now process and save the content as a file
            content_bytes = content.encode('utf-8')
            content_stream = io.BytesIO(content_bytes)
            
            stored_token = secrets.token_urlsafe(16)
            stored_name = f"{stored_token}.md"
            
            final_path, size, content_type, checksum, compressed, encrypted, nonce, tag = _atomic_write(
                content_stream, UPLOAD_DIR, stored_name
            )
            
            # Create file record for content
            content_file = FileModel(
                filename=f"{title}.md",
                filepath=stored_name,
                file_type="content",
                owner_id=user.id,
                note_id=note.id,
                size=size,
                checksum_sha256=checksum,
                is_compressed=bool(compressed),
                is_encrypted=bool(encrypted),
                encryption_nonce_hex=(nonce.hex() if nonce else None),
                encryption_tag_hex=(tag.hex() if tag else None),
                uploaded_at=datetime.utcnow().isoformat() + "Z",
            )
            session.add(content_file)
            
            # Process attachments
            attachment_files = []
            for attachment in attachments:
                if not attachment.filename:
                    continue
                
                # Validate extension
                ext = _validate_extension(attachment.filename)
                
                # Generate unique storage name
                attach_token = secrets.token_urlsafe(16)
                attach_stored_name = f"{attach_token}{ext}"
                
                # Write attachment with compression/encryption
                attach_path, attach_size, attach_type, attach_checksum, attach_compressed, attach_encrypted, attach_nonce, attach_tag = _atomic_write(
                    attachment.file, UPLOAD_DIR, attach_stored_name
                )
                
                # Create file record for attachment
                attachment_file = FileModel(
                    filename=attachment.filename,
                    filepath=attach_stored_name,
                    file_type="attachment",
                    owner_id=user.id,
                    note_id=note.id,
                    size=attach_size,
                    checksum_sha256=attach_checksum,
                    is_compressed=bool(attach_compressed),
                    is_encrypted=bool(attach_encrypted),
                    encryption_nonce_hex=(attach_nonce.hex() if attach_nonce else None),
                    encryption_tag_hex=(attach_tag.hex() if attach_tag else None),
                    uploaded_at=datetime.utcnow().isoformat() + "Z",
                )
                session.add(attachment_file)
                attachment_files.append(attachment_file)
            
            # Create tag records
            from app.models import NoteTag
            tag_records = []
            for tag_name in tag_list:
                tag_name = tag_name.strip()
                if tag_name:  # Skip empty tags
                    tag_record = NoteTag(
                        note_id=note.id,
                        tag=tag_name[:50],  # Limit to 50 chars
                        created_at=datetime.utcnow()
                    )
                    session.add(tag_record)
                    tag_records.append(tag_record)
            
            # Commit all file and tag records
            session.commit()
            
            # Refresh to get IDs
            session.refresh(note)
            session.refresh(content_file)
            for af in attachment_files:
                session.refresh(af)
            
            # Index note if it's public (before encryption, using plain content)
            if visibility == "public":
                try:
                    from app.rag_engine import index_note_from_content
                    
                    # We already have the plain content in memory, no need to decrypt
                    # Just pass it directly for indexing
                    index_note_from_content(
                        note_id=note.id,
                        note_title=note.title,
                        owner_id=user.id,
                        content_text=content,
                        attachments=[]  # Attachments will need separate handling if needed
                    )
                    print(f"Successfully indexed public note {note.id} into RAG")
                except Exception as e:
                    # Don't fail the request if indexing fails
                    print(f"Warning: Failed to index note {note.id}: {e}")
            
            return {
                "id": note.id,
                "title": note.title,
                "subject": note.subject,
                "visibility": note.visibility,
                "content_file_id": content_file.id,
                "attachment_ids": [af.id for af in attachment_files],
                "tags": tag_list,
                "created_at": note.created_at.isoformat(),
                "updated_at": note.updated_at.isoformat(),
                "message": "Note created successfully"
            }
            
        except HTTPException:
            session.rollback()
            raise
        except Exception as e:
            session.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to create note: {str(e)}")


@router.get("/search")
def search_notes(
    request: Request,
    session: Session = Depends(get_session),
    q: str = "",
    limit: int = 50,
    offset: int = 0,
):
    """
    Search public notes by title and tags.
    
    - **q**: Search query (searches in title and tags)
    - **limit**: Maximum number of notes to return
    - **offset**: Number of notes to skip
    """
    from app.models import NoteTag
    
    if not q or not q.strip():
        return {"notes": [], "total": 0}
    
    search_term = f"%{q.strip().lower()}%"
    
    # Search in titles (case-insensitive)
    title_query = select(NoteModel).where(
        NoteModel.visibility == "public",
        NoteModel.title.ilike(search_term)
    )
    
    # Search in tags
    tag_query = select(NoteModel).join(NoteTag).where(
        NoteModel.visibility == "public",
        NoteTag.tag.ilike(search_term)
    )
    
    # Combine results (using union to avoid duplicates)
    notes_from_title = session.exec(title_query).all()
    notes_from_tags = session.exec(tag_query).all()
    
    # Combine and deduplicate by note ID
    note_ids = set()
    unique_notes = []
    for note in list(notes_from_title) + list(notes_from_tags):
        if note.id not in note_ids:
            note_ids.add(note.id)
            unique_notes.append(note)
    
    # Apply pagination
    paginated_notes = unique_notes[offset:offset + limit]
    
    result = []
    for note in paginated_notes:
        # Get associated files
        files = session.exec(
            select(FileModel).where(FileModel.note_id == note.id)
        ).all()
        
        content_file = None
        attachments = []
        for file in files:
            if file.file_type == "content":
                content_file = file
            elif file.file_type == "attachment":
                attachments.append({
                    "id": file.id,
                    "filename": file.filename,
                    "size": file.size
                })
        
        # Get tags
        tags = session.exec(
            select(NoteTag).where(NoteTag.note_id == note.id)
        ).all()
        tag_list = [tag.tag for tag in tags]
        
        # Get author info
        from app.models import User, StudentProfile
        user = session.get(User, note.user_id)
        profile = session.exec(
            select(StudentProfile).where(StudentProfile.user_id == note.user_id)
        ).first()
        
        result.append({
            "id": note.id,
            "title": note.title,
            "subject": note.subject,
            "visibility": note.visibility,
            "content_file_id": content_file.id if content_file else None,
            "attachments": attachments,
            "tags": tag_list,
            "author": {
                "name": profile.name if profile else user.name if user else "Unknown",
                "username": profile.username if profile else None,
            },
            "created_at": note.created_at.isoformat(),
            "updated_at": note.updated_at.isoformat(),
        })
    
    return {"notes": result, "total": len(unique_notes)}


@router.get("/")
def list_notes(
    request: Request,
    session: Session = Depends(get_session),
    visibility: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
):
    """
    List notes for the current user.
    
    - **visibility**: Filter by visibility ("private" or "public")
    - **limit**: Maximum number of notes to return
    - **offset**: Number of notes to skip
    """
    user = _current_user(request, session)
    
    query = select(NoteModel).where(NoteModel.user_id == user.id)
    
    if visibility and visibility.lower() in {"private", "public"}:
        query = query.where(NoteModel.visibility == visibility.lower())
    
    query = query.offset(offset).limit(limit)
    notes = session.exec(query).all()
    
    result = []
    for note in notes:
        # Get associated files
        files = session.exec(
            select(FileModel).where(FileModel.note_id == note.id)
        ).all()
        
        content_file = None
        attachments = []
        for file in files:
            if file.file_type == "content":
                content_file = file
            elif file.file_type == "attachment":
                attachments.append({
                    "id": file.id,
                    "filename": file.filename,
                    "size": file.size
                })
        
        # Get tags
        from app.models import NoteTag
        tags = session.exec(
            select(NoteTag).where(NoteTag.note_id == note.id)
        ).all()
        tag_list = [tag.tag for tag in tags]
        
        result.append({
            "id": note.id,
            "title": note.title,
            "subject": note.subject,
            "visibility": note.visibility,
            "content_file_id": content_file.id if content_file else None,
            "attachments": attachments,
            "tags": tag_list,
            "created_at": note.created_at.isoformat(),
            "updated_at": note.updated_at.isoformat(),
        })
    
    return {"notes": result, "total": len(result)}


@router.get("/{note_id}")
def get_note(
    note_id: int,
    request: Request,
    session: Session = Depends(get_session),
):
    """
    Get a specific note by ID.
    """
    user = _current_user(request, session)
    
    note = session.get(NoteModel, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    # Check authorization
    if note.user_id != user.id and note.visibility != "public":
        raise HTTPException(status_code=403, detail="Not authorized to view this note")
    
    # Get associated files
    files = session.exec(
        select(FileModel).where(FileModel.note_id == note.id)
    ).all()
    
    content_file = None
    attachments = []
    for file in files:
        if file.file_type == "content":
            content_file = file
        elif file.file_type == "attachment":
            attachments.append({
                "id": file.id,
                "filename": file.filename,
                "size": file.size
            })
    
    # Get tags
    from app.models import NoteTag
    tags = session.exec(
        select(NoteTag).where(NoteTag.note_id == note.id)
    ).all()
    tag_list = [tag.tag for tag in tags]
    
    return {
        "id": note.id,
        "title": note.title,
        "subject": note.subject,
        "visibility": note.visibility,
        "content_file_id": content_file.id if content_file else None,
        "attachments": attachments,
        "tags": tag_list,
        "created_at": note.created_at.isoformat(),
        "updated_at": note.updated_at.isoformat(),
    }


@router.delete("/{note_id}")
def delete_note(
    note_id: int,
    request: Request,
    session: Session = Depends(get_session),
):
    """
    Delete a note and all its associated files.
    """
    user = _current_user(request, session)
    
    note = session.get(NoteModel, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    # Check authorization
    if note.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this note")
    
    # Remove from RAG index if it was public
    if note.visibility == "public":
        try:
            from app.rag_engine import remove_note_from_index
            remove_note_from_index(note.id)
            print(f"Removed note {note.id} from RAG index")
        except Exception as e:
            print(f"Warning: Failed to remove note {note.id} from index: {e}")
    
    # Get all associated files
    files = session.exec(
        select(FileModel).where(FileModel.note_id == note.id)
    ).all()
    
    # Delete files from disk and database
    for file in files:
        try:
            full_path = UPLOAD_DIR / file.filepath
            if os.path.exists(full_path):
                os.remove(full_path)
        except OSError:
            pass  # Continue even if file deletion fails
        session.delete(file)
    
    # Delete the note
    session.delete(note)
    session.commit()
    
    return {"message": "Note deleted successfully"}


@router.put("/{note_id}")
def update_note(
    note_id: int,
    title: Optional[str] = Form(None),
    subject: Optional[str] = Form(None),
    visibility: Optional[str] = Form(None),
    content: Optional[str] = Form(None),
    new_attachments: List[FastAPIUploadFile] = FastAPIFile(default=[]),
    request: Request = None,
    session: Session = Depends(get_session),
):
    """
    Update an existing note.
    
    - **title**: New note title
    - **subject**: New subject/category
    - **visibility**: New visibility setting
    - **content**: New markdown content (will replace existing content file)
    - **new_attachments**: Additional attachments to add
    """
    user = _current_user(request, session)
    
    note = session.get(NoteModel, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    # Check authorization
    if note.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this note")
    
    lock = _user_locks.setdefault(user.id, threading.Lock())
    
    with lock:
        try:
            # Update note fields
            if title is not None:
                note.title = title
            
            if subject is not None:
                note.subject = subject
            
            if visibility is not None and visibility.lower() in {"private", "public"}:
                note.visibility = visibility.lower()
            
            note.updated_at = datetime.utcnow()
            
            # Update content if provided
            if content is not None:
                # Find and delete old content file
                old_content = session.exec(
                    select(FileModel).where(
                        FileModel.note_id == note.id,
                        FileModel.file_type == "content"
                    )
                ).first()
                
                if old_content:
                    try:
                        full_path = UPLOAD_DIR / old_content.filepath
                        if os.path.exists(full_path):
                            os.remove(full_path)
                    except OSError:
                        pass
                    session.delete(old_content)
                
                # Create new content file
                content_bytes = content.encode('utf-8')
                content_stream = io.BytesIO(content_bytes)
                
                stored_token = secrets.token_urlsafe(16)
                stored_name = f"{stored_token}.md"
                
                final_path, size, content_type, checksum, compressed, encrypted, nonce, tag = _atomic_write(
                    content_stream, UPLOAD_DIR, stored_name
                )
                
                content_file = FileModel(
                    filename=f"{note.title}.md",
                    filepath=stored_name,
                    file_type="content",
                    owner_id=user.id,
                    note_id=note.id,
                    size=size,
                    checksum_sha256=checksum,
                    is_compressed=bool(compressed),
                    is_encrypted=bool(encrypted),
                    encryption_nonce_hex=(nonce.hex() if nonce else None),
                    encryption_tag_hex=(tag.hex() if tag else None),
                    uploaded_at=datetime.utcnow().isoformat() + "Z",
                )
                session.add(content_file)
            
            # Add new attachments
            for attachment in new_attachments:
                if not attachment.filename:
                    continue
                
                ext = _validate_extension(attachment.filename)
                attach_token = secrets.token_urlsafe(16)
                attach_stored_name = f"{attach_token}{ext}"
                
                attach_path, attach_size, attach_type, attach_checksum, attach_compressed, attach_encrypted, attach_nonce, attach_tag = _atomic_write(
                    attachment.file, UPLOAD_DIR, attach_stored_name
                )
                
                attachment_file = FileModel(
                    filename=attachment.filename,
                    filepath=attach_stored_name,
                    file_type="attachment",
                    owner_id=user.id,
                    note_id=note.id,
                    size=attach_size,
                    checksum_sha256=attach_checksum,
                    is_compressed=bool(attach_compressed),
                    is_encrypted=bool(attach_encrypted),
                    encryption_nonce_hex=(attach_nonce.hex() if attach_nonce else None),
                    encryption_tag_hex=(attach_tag.hex() if attach_tag else None),
                    uploaded_at=datetime.utcnow().isoformat() + "Z",
                )
                session.add(attachment_file)
            
            session.commit()
            session.refresh(note)
            
            # Handle RAG indexing based on visibility changes
            if note.visibility == "public":
                # Index or re-index the note
                try:
                    from app.rag_engine import index_note as rag_index_note
                    
                    # Get content file
                    content_file_db = session.exec(
                        select(FileModel).where(
                            FileModel.note_id == note.id,
                            FileModel.file_type == "content"
                        )
                    ).first()
                    
                    # Get attachments
                    attachments = session.exec(
                        select(FileModel).where(
                            FileModel.note_id == note.id,
                            FileModel.file_type == "attachment"
                        )
                    ).all()
                    
                    attachment_info = []
                    for att in attachments:
                        attachment_info.append({
                            'path': UPLOAD_DIR / att.filepath,
                            'extension': os.path.splitext(att.filename)[1],
                            'encrypted': att.is_encrypted,
                            'compressed': att.is_compressed,
                            'nonce_hex': att.encryption_nonce_hex,
                            'filename': att.filename
                        })
                    
                    if content_file_db:
                        rag_index_note(
                            note_id=note.id,
                            note_title=note.title,
                            owner_id=user.id,
                            content_file_path=UPLOAD_DIR / content_file_db.filepath,
                            content_file_encrypted=content_file_db.is_encrypted,
                            content_file_compressed=content_file_db.is_compressed,
                            content_file_nonce_hex=content_file_db.encryption_nonce_hex,
                            attachment_files=attachment_info if attachment_info else None
                        )
                        print(f"Successfully indexed/updated public note {note.id} in RAG")
                except Exception as e:
                    print(f"Warning: Failed to index note {note.id}: {e}")
            else:
                # If note is now private, remove from index
                try:
                    from app.rag_engine import remove_note_from_index
                    remove_note_from_index(note.id)
                    print(f"Removed note {note.id} from RAG index (now private)")
                except Exception as e:
                    print(f"Warning: Failed to remove note {note.id} from index: {e}")
            
            return {
                "id": note.id,
                "title": note.title,
                "subject": note.subject,
                "visibility": note.visibility,
                "updated_at": note.updated_at.isoformat(),
                "message": "Note updated successfully"
            }
            
        except HTTPException:
            session.rollback()
            raise
        except Exception as e:
            session.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to update note: {str(e)}")
