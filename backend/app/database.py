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

        # 3. Pre-seed Default Cases & Evidence Files if database is empty
        case_check = conn.execute(text("SELECT id FROM cases LIMIT 1")).fetchone()
        if not case_check:
            sysadmin_user = conn.execute(text("SELECT id FROM users WHERE role_level='SysAdmin' LIMIT 1")).fetchone()
            admin_id = sysadmin_user[0] if sysadmin_user else str(uuid.uuid4())
            
            c1_id = str(uuid.uuid4())
            c2_id = str(uuid.uuid4())
            
            conn.execute(text(
                "INSERT INTO cases (id, case_number, title, description, status, reference_number, assigned_to_id, created_at) "
                "VALUES (:id, :cnum, :title, :desc, 'ACTIVE', :ref, :aid, :created)"
            ), {
                "id": c1_id,
                "cnum": "FS-2026-091",
                "title": "Financial Embezzlement & Wire Fraud",
                "desc": "Corporate financial forensic audit regarding unapproved transactions from the staging deployment portal.",
                "ref": "REF-83893-IND",
                "aid": admin_id,
                "created": datetime.utcnow()
            })
            
            conn.execute(text(
                "INSERT INTO cases (id, case_number, title, description, status, reference_number, assigned_to_id, created_at) "
                "VALUES (:id, :cnum, :title, :desc, 'ACTIVE', :ref, :aid, :created)"
            ), {
                "id": c2_id,
                "cnum": "FS-2026-104",
                "title": "Deepfake Tampering & IP Theft",
                "desc": "Investigation of manipulated verification records, compromised source systems, and EXIF spoofing vectors.",
                "ref": "REF-92384-US",
                "aid": admin_id,
                "created": datetime.utcnow()
            })

            # Seed evidence files with anomaly tags
            evidence_seeds = [
                (c1_id, "db_ledger_dump.sqlite", 42100000, "Database", "f8c3c4d1de0ba3f1a0e1c6b54a8e2bc70c67feaa11223344", "f8c3c4d1de0ba3f1a0e1c6b54a8e2bc70c67feaa11223344", [
                    {"type": "METADATA_SPOOFING", "severity": "HIGH", "message": "12 database rows deleted on 2026-07-28 08:14:10 UTC"}
                ]),
                (c1_id, "auth_syslog.log", 1240000, "System Log", "a9c3c4d1de0ba3f1a0e1c6b54a8e2bc70c67feaa55667788", "a9c3c4d1de0ba3f1a0e1c6b54a8e2bc70c67feaa55667788", [
                    {"type": "ACCESS_VIOLATION_LOGS", "severity": "CRITICAL", "message": "Brute-force signature: 142 failed log-in requests from IP 192.168.12.93 in 2 minutes"}
                ]),
                (c2_id, "employee_record_tampered.jpg", 852000, "Image Scan", "b7c3c4d1de0ba3f1a0e1c6b54a8e2bc70c67feaa99001122", "b7c3c4d1de0ba3f1a0e1c6b54a8e2bc70c67feaa99001122", [
                    {"type": "METADATA_SPOOFING", "severity": "HIGH", "message": "EXIF timestamps set 6 years retroactively. File creation date discrepancy."},
                    {"type": "DEEPFAKE_MEDIA", "severity": "CRITICAL", "message": "Double-quantization matrix deviation maps identify clone-stamp modification"}
                ]),
                (c2_id, "ceo_audio_statement.mp3", 12400000, "Audio Recording", "c8c3c4d1de0ba3f1a0e1c6b54a8e2bc70c67feaa33445566", "c8c3c4d1de0ba3f1a0e1c6b54a8e2bc70c67feaa33445566", [
                    {"type": "DEEPFAKE_MEDIA", "severity": "CRITICAL", "message": "Spectral analysis tags: 98% synthetic voice match with GAN audio generator signature."}
                ]),
                (c2_id, "source_repository_logs.csv", 4500000, "Audit Log", "d9c3c4d1de0ba3f1a0e1c6b54a8e2bc70c67feaa77889900", "d9c3c4d1de0ba3f1a0e1c6b54a8e2bc70c67feaa77889900", [
                    {"type": "ACCESS_VIOLATION_LOGS", "severity": "WARNING", "message": "Token bypass credentials used on repo path `/security/kms`"}
                ])
            ]

            import json
            for cid, fname, fsize, ftype, h256, h3, anomalies in evidence_seeds:
                conn.execute(text(
                    "INSERT INTO evidence_files (id, case_id, file_name, file_size_bytes, file_type, sha256_hash, sha3_hash, storage_vault_key, anomalies, ingested_at) "
                    "VALUES (:id, :cid, :fname, :fsize, :ftype, :h256, :h3, :key, :anom, :created)"
                ), {
                    "id": str(uuid.uuid4()),
                    "cid": cid,
                    "fname": fname,
                    "fsize": fsize,
                    "ftype": ftype,
                    "h256": h256,
                    "h3": h3,
                    "key": fname,
                    "anom": json.dumps(anomalies) if is_postgres else anomalies,
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
