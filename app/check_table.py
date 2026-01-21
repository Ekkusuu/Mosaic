from .db import engine
from sqlalchemy import text

def check_tables():
    with engine.connect() as conn:
        print("Comment table columns:")
        result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'comment'"))
        print([row[0] for row in result])
        
        print("\nPost table columns:")
        result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'post'"))
        print([row[0] for row in result])

if __name__ == "__main__":
    check_tables()
