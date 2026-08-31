from datetime import datetime
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

# In order to support running verification/tests out of the box even if local PG is down,
# we can support fallback to SQLite for local development, but default to settings.DATABASE_URL.
db_url = settings.DATABASE_URL

# For SQLite, use connect_args to allow multithreading access
connect_args = {}
if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    db_url,
    connect_args=connect_args,
    pool_pre_ping=True  # Automatically checks if connection is alive before using it
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def migrate_database(db_engine):
    """
    Checks the users table schema and dynamically appends 'is_approved', 'secret_code',
    'username', and 'generated_passphrase' columns to prevent PostgreSQL startup crashes
    on existing schemas. Seeds 1-2 operators for all 4 clearance levels.
    """
    with db_engine.begin() as conn:
        is_postgres = "postgresql" in str(db_engine.url)
        
        # 1. Schema Migration (Columns check)
        if is_postgres:
            # Check for is_approved
            res_approved = conn.execute(text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name='users' AND column_name='is_approved'"
            )).fetchone()
            if not res_approved:
                conn.execute(text("ALTER TABLE users ADD COLUMN is_approved BOOLEAN DEFAULT FALSE NOT NULL"))
                conn.execute(text("ALTER TABLE users ADD COLUMN secret_code VARCHAR(50) UNIQUE"))
                conn.execute(text("UPDATE users SET is_approved = TRUE"))
                
            # Check for username
            res_uname = conn.execute(text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name='users' AND column_name='username'"
            )).fetchone()
            if not res_uname:
                conn.execute(text("ALTER TABLE users ADD COLUMN username VARCHAR(100) UNIQUE"))
                conn.execute(text("ALTER TABLE users ADD COLUMN generated_passphrase VARCHAR(255)"))
                conn.execute(text("ALTER TABLE users ALTER COLUMN email DROP NOT NULL"))
        else:
            # SQLite fallback
            res = conn.execute(text("PRAGMA table_info(users)")).fetchall()
            columns = [r[1] for r in res]
            if "is_approved" not in columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN is_approved BOOLEAN DEFAULT FALSE NOT NULL"))
                conn.execute(text("ALTER TABLE users ADD COLUMN secret_code VARCHAR(50) UNIQUE"))
                conn.execute(text("UPDATE users SET is_approved = TRUE"))
            if "username" not in columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN username VARCHAR(100) UNIQUE"))
                conn.execute(text("ALTER TABLE users ADD COLUMN generated_passphrase VARCHAR(255)"))

        # 2. Database Pre-seeding
        seeds = [
            # Level 4 - SysAdmin
            ("admin_root", "sysadminsecret", "System Administrator Root", "SysAdmin", "admin_root@agency.gov"),
            ("sysadmin_ops", "sysadminsecret", "SysAdmin Operations", "SysAdmin", "sysadmin_ops@agency.gov"),
            # Level 3 - LeadInvestigator
            ("investigator_sharma", "leadsecretpass", "Lead Investigator Sharma", "LeadInvestigator", "sharma.forensics@agency.gov"),
            ("lead_examiner", "leadsecretpass", "Lead Examiner Vance", "LeadInvestigator", "lead_examiner@agency.gov"),
            # Level 2 - Analyst
            ("analyst_connor", "analystsecret", "Analyst Sarah Connor", "Analyst", "analyst@agency.gov"),
            ("analyst_01", "analystsecret", "Analyst Protyush B.", "Analyst", "analyst_01@agency.gov"),
            # Level 1 - LegalAuditor
            ("auditor_legal", "auditorsecret", "Legal Auditor Observer", "LegalAuditor", "auditor@agency.gov"),
            ("auditor_01", "auditorsecret", "Auditor Gary", "LegalAuditor", "auditor_01@agency.gov")
        ]

        from app.services.auth_service import get_password_hash
        import uuid
        
        for username, plain_pass, name, role, email in seeds:
            exists = conn.execute(text("SELECT id FROM users WHERE username = :uname"), {"uname": username}).fetchone()
            if not exists:
                uid = str(uuid.uuid4())
                pass_hash = get_password_hash(plain_pass)
                conn.execute(text(
                    "INSERT INTO users (id, email, username, password_hash, generated_passphrase, full_name, role_level, is_approved, created_at) "
                    "VALUES (:id, :email, :username, :pass_hash, :gen_pass, :name, :role, TRUE, :created)"
                ), {
                    "id": uid,
                    "email": email,
                    "username": username,
                    "pass_hash": pass_hash,
                    "gen_pass": plain_pass,
                    "name": name,
                    "role": role,
                    "created": datetime.utcnow()
                })

def get_db():
    """
    Database session dependency yield provider.
    Ensures that database session is closed after request lifetime.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
