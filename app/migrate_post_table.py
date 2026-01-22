from sqlmodel import Session
from sqlalchemy import text
from .db import engine

def migrate_post_table():
    print("🔄 Starting database migration for post table...")
    
    with engine.begin() as conn:
        print("  → Dropping existing post table...")
        conn.execute(text("DROP TABLE IF EXISTS post CASCADE"))
        
        print("  → Creating new post table...")
        conn.execute(text("""
            CREATE TABLE post (
                id SERIAL PRIMARY KEY,
                title VARCHAR(500) NOT NULL,
                body VARCHAR(50000) NOT NULL,
                author_id INTEGER NOT NULL REFERENCES "user"(id),
                author_name VARCHAR(120),
                tags VARCHAR(500) NOT NULL DEFAULT '[]',
                views INTEGER NOT NULL DEFAULT 0,
                likes INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE NOT NULL,
                updated_at TIMESTAMP WITH TIME ZONE NOT NULL
            )
        """))
        
        print("  → Creating indexes...")
        conn.execute(text("CREATE INDEX idx_post_author_id ON post(author_id)"))
        conn.execute(text("CREATE INDEX idx_post_created_at ON post(created_at DESC)"))
        
    print("✅ Migration completed successfully!")
    print("   Post table is now ready to use.")

if __name__ == "__main__":
    migrate_post_table()
