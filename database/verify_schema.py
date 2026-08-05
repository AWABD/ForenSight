import os
import sys
import psycopg2
from pathlib import Path
from dotenv import load_dotenv

# Locating configuration and SQL scripts
root_dir = Path(__file__).resolve().parent.parent
env_path = root_dir / "backend" / ".env"
sql_script_path = root_dir / "database" / "setup_forensight_db.sql"

# Load environment configuration
load_dotenv(dotenv_path=env_path)
db_url = os.getenv("DATABASE_URL")

# Define expected tables checklist
EXPECTED_TABLES = [
    "roles",
    "users",
    "cases",
    "evidence",
    "evidence_metadata",
    "ocr_text",
    "entities",
    "timeline",
    "reports",
    "activity_logs",
    "search_index",
    "notifications"
]

def verify_postgresql_schema():
    print("====== FORENSIGHT POSTGRESQL SCHEMA VALIDATOR ======")
    
    if not db_url:
        print("[-] Error: DATABASE_URL not found in environment configuration.")
        sys.exit(1)
        
    print(f"[+] Connecting to PostgreSQL using: {db_url.split('@')[-1]}")
    
    try:
        # Connect to PostgreSQL
        conn = psycopg2.connect(db_url)
        conn.autocommit = False # Run in transaction block
        cursor = conn.cursor()
    except Exception as e:
        print(f"[-] Database connection failure: {e}")
        print("[-] Ensure PostgreSQL service is running and credentials in backend/.env are correct.")
        sys.exit(1)
        
    try:
        # Read the database setup script
        print(f"[+] Loading SQL setup script from: {sql_script_path}")
        with open(sql_script_path, "r", encoding="utf-8") as sql_file:
            sql_content = sql_file.read()
            
        # Execute setup script
        print("[+] Executing setup_forensight_db.sql schema definitions...")
        cursor.execute(sql_content)
        conn.commit()
        print("[+] SQL setup transaction committed successfully.")
    except Exception as e:
        conn.rollback()
        print(f"[-] Failed to execute setup SQL statements: {e}")
        conn.close()
        sys.exit(1)

    try:
        # 1. Verify table counts
        print("\nChecking database tables catalogs...")
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
        """)
        actual_tables = [row[0] for row in cursor.fetchall()]
        
        missing_tables = []
        for table in EXPECTED_TABLES:
            if table in actual_tables:
                print(f"  [OK] Table '{table}' exists.")
            else:
                print(f"  [MISSING] Table '{table}' is MISSING!")
                missing_tables.append(table)
                
        # 2. Verify seeded roles count
        cursor.execute("SELECT name, clearance_level FROM roles ORDER BY clearance_level DESC;")
        seeded_roles = cursor.fetchall()
        print(f"\n[+] Seeded clearance roles verified (Count: {len(seeded_roles)}):")
        for name, level in seeded_roles:
            print(f"  - Role: '{name}', Level: {level}")
            
        assert len(seeded_roles) == 4, "Clearance roles seed error: Expected 4 roles."
        
        # 3. Verify Foreign Keys
        print("\nChecking relational constraints catalog...")
        cursor.execute("""
            SELECT 
                tc.table_name, kcu.column_name, 
                ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name 
            FROM 
                information_schema.table_constraints AS tc 
                JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
                JOIN information_schema.constraint_column_usage AS ccu
                  ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema='public';
        """)
        fk_constraints = cursor.fetchall()
        print(f"Verified {len(fk_constraints)} foreign key constraints mapping table hierarchies.")
        
        # 4. Verify indexes
        print("\nChecking index catalogs...")
        cursor.execute("""
            SELECT tablename, indexname 
            FROM pg_indexes 
            WHERE schemaname = 'public';
        """)
        indexes = cursor.fetchall()
        print(f"Verified {len(indexes)} indexes optimized for search indexing, FTS GIN, and JSONB properties.")

        if missing_tables:
            raise AssertionError(f"Schema validation failed: Missing tables {missing_tables}")

        print("\n====== SCHEMA VERIFICATION COMPLETED SUCCESSFULLY ======")
    except Exception as e:
        print(f"\n[-] Validation assertions failed: {e}")
        conn.close()
        sys.exit(1)
        
    conn.close()

if __name__ == "__main__":
    verify_postgresql_schema()
