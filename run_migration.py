import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set in .env")

engine = create_engine(DATABASE_URL)

def run_migration(sql_file):
    with open(sql_file, 'r') as f:
        sql = f.read()
    
    statements = [s.strip() for s in sql.split(';') if s.strip()]
    
    with engine.begin() as conn:
        for statement in statements:
            try:
                conn.execute(text(statement))
                print(f"✅ Executed: {statement[:60].replace(chr(10), ' ')}...")
            except Exception as e:
                print(f"❌ Error: {e}")
                raise
    
    print(f"\n✅ Migration {sql_file} completed successfully!")

if __name__ == "__main__":
    import sys
    migration_file = sys.argv[1] if len(sys.argv) > 1 else "migrations/001_add_post_interactions.sql"
    run_migration(migration_file)
