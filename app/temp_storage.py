# Temporary file-based storage for ID photos during verification
# Survives server reloads, unlike in-memory storage
import os
import time
import hashlib
from pathlib import Path

# Create temp directory for storing ID photos
TEMP_DIR = Path("temp_id_photos")
TEMP_DIR.mkdir(exist_ok=True)

STORAGE_TTL_SECONDS = 600  # 10 minutes

def _get_file_path(email: str) -> Path:
    """Get file path for email's ID photo"""
    # Use hash of email as filename for privacy
    email_hash = hashlib.sha256(email.encode()).hexdigest()
    return TEMP_DIR / f"{email_hash}.jpg"

def _get_timestamp_path(email: str) -> Path:
    """Get file path for timestamp"""
    email_hash = hashlib.sha256(email.encode()).hexdigest()
    return TEMP_DIR / f"{email_hash}.timestamp"

def store_id_photo(email: str, photo_bytes: bytes) -> None:
    """Store ID photo temporarily for face verification"""
    file_path = _get_file_path(email)
    timestamp_path = _get_timestamp_path(email)
    
    # Write photo to disk
    with open(file_path, 'wb') as f:
        f.write(photo_bytes)
    
    # Write timestamp
    with open(timestamp_path, 'w') as f:
        f.write(str(time.time()))
    
    # Clean up old entries
    cleanup_expired()

def get_id_photo(email: str) -> bytes | None:
    """Retrieve stored ID photo"""
    cleanup_expired()
    file_path = _get_file_path(email)
    
    if not file_path.exists():
        return None
    
    # Read and return photo
    with open(file_path, 'rb') as f:
        return f.read()

def cleanup_expired() -> None:
    """Remove expired entries"""
    current_time = time.time()
    
    for timestamp_file in TEMP_DIR.glob("*.timestamp"):
        try:
            with open(timestamp_file, 'r') as f:
                stored_time = float(f.read().strip())
            
            if current_time - stored_time > STORAGE_TTL_SECONDS:
                # Delete both timestamp and photo files
                timestamp_file.unlink()
                photo_file = timestamp_file.with_suffix('.jpg')
                if photo_file.exists():
                    photo_file.unlink()
        except (ValueError, FileNotFoundError):
            # Invalid timestamp file, remove it
            timestamp_file.unlink()

def delete_id_photo(email: str) -> None:
    """Delete ID photo after successful verification"""
    file_path = _get_file_path(email)
    timestamp_path = _get_timestamp_path(email)
    
    if file_path.exists():
        file_path.unlink()
    if timestamp_path.exists():
        timestamp_path.unlink()
