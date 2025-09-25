# app/db.py
import os
from dotenv import load_dotenv
from sqlmodel import create_engine, Session

load_dotenv()  # loads .env
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set in .env")

# create SQLAlchemy engine (sync)
engine = create_engine(DATABASE_URL, echo=True)

# dependency for FastAPI endpoints
def get_session():
    with Session(engine) as session:
        yield session
