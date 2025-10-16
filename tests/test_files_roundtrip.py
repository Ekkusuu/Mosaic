import os
import io
import tempfile
import pytest

# Set minimal env needed for app imports (DB + JWT). Use a local sqlite file for tests.
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_db.sqlite")
os.environ.setdefault("JWT_SECRET", "testsecretforjwt1234567890")
os.environ.setdefault("JWT_ALGORITHM", "HS256")
# Provide an encryption key for testing (32 bytes hex)
os.environ.setdefault("FILE_ENCRYPTION_KEY", "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef")

from fastapi.testclient import TestClient
import sys
from pathlib import Path

# Ensure repository root is on sys.path so `app` package imports work under pytest
ROOT = str(Path(__file__).resolve().parent.parent)
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from app.main import app
from app.db import engine
from sqlmodel import SQLModel

client = TestClient(app)

@pytest.fixture(scope="session", autouse=True)
def setup_db():
    # Create tables in a temporary sqlite db if using env DATABASE_URL; here we assume configured
    SQLModel.metadata.create_all(engine)
    yield

def make_test_file(content: bytes, suffix: str):
    f = io.BytesIO(content)
    f.name = f"test{suffix}"
    return f

def register_and_login(email: str = "test@example.edu", password: str = "Aa1!aaaa"):
    # register
    resp = client.post("/users/register", json={"email": email, "name": "Tester", "password": password})
    if resp.status_code == 200:
        return resp.json()
    # If already registered, attempt login
    if resp.status_code == 400:
        try:
            detail = resp.json().get("detail", "")
        except Exception:
            detail = ""
        if "already" in detail.lower():
            l = client.post("/users/login", json={"email": email, "password": password})
            assert l.status_code == 200
            return l.json()
    # Otherwise fail the test for other errors
    pytest.fail(f"Could not register or login: {resp.status_code} {resp.text}")

@pytest.mark.parametrize("suffix,content", [
    (".txt", b"hello world"),
    (".png", b"\x89PNG\r\n\x1a\n" + b"PNGDATA"),
    (".jpg", b"\xff\xd8" + b"JPGDATA"),
])
def test_upload_download_roundtrip(suffix, content):
    register_and_login()
    testf = make_test_file(content, suffix)
    files = {"file": (testf.name, testf, "application/octet-stream")}
    resp = client.post("/files/", files=files)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    file_id = data["id"]
    # download
    dl = client.get(f"/files/{file_id}")
    assert dl.status_code == 200
    # compare content: original bytes should be present after decompression/decryption
    assert content in dl.content, f"Downloaded content does not contain original (got {dl.content[:32]!r})"
    # verify checksum header matches
    hdr = dl.headers.get("X-Checksum-SHA256", "")
    import hashlib
    assert hdr == hashlib.sha256(content).hexdigest()
