
from sqlmodel import Session, text
from app.db import engine

def add_username_column():
    with Session(engine) as session:
        session.exec(text("""
            ALTER TABLE studentprofile 
            ADD COLUMN IF NOT EXISTS username VARCHAR(40) UNIQUE
        """))
        session.commit()
        print("✓ Column 'username' added to 'studentprofile' table successfully!")

if __name__ == "__main__":
    add_username_column()
