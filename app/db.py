# app/db.py
import os
from dotenv import load_dotenv
from sqlmodel import create_engine, Session

load_dotenv()  # loads .env
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set in .env")

# create SQLAlchemy engine (sync)
# For SQLite, add connect_args to enable check_same_thread=False
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, echo=True, connect_args=connect_args)

# dependency for FastAPI endpoints
def get_session():
    with Session(engine) as session:
        yield session
