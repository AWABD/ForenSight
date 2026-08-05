import os
import sys
import json
import shutil
from pathlib import Path

# Adjust path to import backend modules
sys.path.append(str(Path(__file__).resolve().parent))

# Override settings to use SQLite for isolated verification tests
os.environ["DATABASE_URL"] = "sqlite:///./verification_test.db"
os.environ["STORAGE_VAULT_PATH"] = "./verification_vault"

from fastapi.testclient import TestClient
from app.main import app
from app.database import engine, Base

client = TestClient(app)

def clean_test_resources():
    # Remove SQLite test file if possible
    test_db = Path("./verification_test.db")
    if test_db.exists():
        try:
            os.remove(test_db)
        except PermissionError:
            pass # Engine is holding connection, will clear tables using metadata instead
        
    # Remove test vault folder
    test_vault = Path("./verification_vault")
    if test_vault.exists():
        try:
            shutil.rmtree(test_vault)
        except Exception:
            pass

def run_tests():
    print("====== STARTING BACKEND VERIFICATION TEST SUITE ======")
    
    # 0. Clean and recreate tables
    Base.metadata.drop_all(bind=engine)
    clean_test_resources()
    Base.metadata.create_all(bind=engine)
    print("[+] SQLite Test Database and schemas created/cleared successfully.")

    # 1. Register users with different roles
    # Role hierarchy: SysAdmin (4), LeadInvestigator (3), Analyst (2), LegalAuditor (1)
    
    sysadmin_payload = {
        "email": "sysadmin@agency.gov",
        "full_name": "System Admin operator",
        "role_level": "SysAdmin",
        "password": "sysadminsecret"
    }
    
    lead_payload = {
        "email": "sharma.forensics@agency.gov",
        "full_name": "Lead Investigator Dr. Sharma",
        "role_level": "LeadInvestigator",
        "password": "leadsecretpass"
    }

    analyst_payload = {
        "email": "analyst@agency.gov",
        "full_name": "Analyst Connor",
        "role_level": "Analyst",
        "password": "analystsecret"
    }

    auditor_payload = {
        "email": "auditor@agency.gov",
        "full_name": "Auditor Legal",
        "role_level": "LegalAuditor",
        "password": "auditorsecret"
    }

    # Test Registration
    for payload in [sysadmin_payload, lead_payload, analyst_payload, auditor_payload]:
        response = client.post("/api/v1/auth/register", json=payload)
        assert response.status_code == 201, f"Reg failed: {response.json()}"
        print(f"[+] Successfully registered user: {payload['email']} ({payload['role_level']})")

    # Test Login & Token Generation
    tokens = {}
    for payload in [sysadmin_payload, lead_payload, analyst_payload, auditor_payload]:
        login_payload = {
            "email": payload["email"],
            "password": payload["password"]
        }
        response = client.post("/api/v1/auth/login", json=login_payload)
        assert response.status_code == 200, f"Login failed: {response.json()}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == payload["email"]
        tokens[payload["role_level"]] = data["access_token"]
        print(f"[+] Successfully logged in: {payload['email']}. Token received.")

    # Setup auth headers
    sysadmin_headers = {"Authorization": f"Bearer {tokens['SysAdmin']}"}
    lead_headers = {"Authorization": f"Bearer {tokens['LeadInvestigator']}"}
    analyst_headers = {"Authorization": f"Bearer {tokens['Analyst']}"}
    auditor_headers = {"Authorization": f"Bearer {tokens['LegalAuditor']}"}

    # 2. Case Management API Tests
    # Create Case as Lead (Allowed)
    case_payload = {
        "title": "Financial Embezzlement & Wire Fraud Test",
        "description": "Verification test case for financial transaction audits.",
        "reference_number": "REF-83893-TEST"
    }
    response = client.post("/api/v1/cases/", json=case_payload, headers=lead_headers)
    assert response.status_code == 201, f"Case creation failed: {response.json()}"
    case_data = response.json()
    case_id = case_data["id"]
    assert case_data["title"] == case_payload["title"]
    assert case_data["case_number"].startswith("FS-2026-")
    print(f"[+] Lead Investigator created Case: {case_data['case_number']} (UUID: {case_id})")

    # Attempt Case creation as Analyst (Should be Forbidden)
    response = client.post("/api/v1/cases/", json=case_payload, headers=analyst_headers)
    assert response.status_code == 403, f"Analyst should be forbidden to create case: {response.status_code}"
    print("[+] Role-Based Access Control verified: Analyst forbidden from creating cases.")

    # List cases as Auditor (Allowed read)
    response = client.get("/api/v1/cases/", headers=auditor_headers)
    assert response.status_code == 200
    cases_list = response.json()
    assert len(cases_list) >= 1
    print(f"[+] Legal Auditor retrieved cases index list. Items count: {len(cases_list)}")

    # 3. Evidence Upload API Tests (Lead Investigator)
    # Test uploading a file
    dummy_file_content = b"FORENSIC BYTES: unapproved transaction details and deleted records."
    files = {"file": ("db_ledger_tampered.sqlite", dummy_file_content, "application/octet-stream")}
    
    response = client.post(f"/api/v1/cases/{case_id}/evidence/upload", files=files, headers=lead_headers)
    assert response.status_code == 202, f"Evidence upload failed: {response.json()}"
    evidence_data = response.json()
    evidence_id = evidence_data["id"]
    assert evidence_data["file_name"] == "db_ledger_tampered.sqlite"
    assert len(evidence_data["sha256_hash"]) == 64
    assert len(evidence_data["sha3_hash"]) == 64
    # Check that anomalies were mock-flagged based on name 'tamper'
    assert len(evidence_data["anomalies"]) > 0
    print(f"[+] Ingested file: {evidence_data['file_name']}. SHA256: {evidence_data['sha256_hash']}")
    print(f"[+] Extracted Mock Anomalies: {json.dumps(evidence_data['anomalies'], indent=2)}")

    # Test uploading duplicate file (Should be Rejected)
    files_dup = {"file": ("db_ledger_tampered_dup.sqlite", dummy_file_content, "application/octet-stream")}
    response = client.post(f"/api/v1/cases/{case_id}/evidence/upload", files=files_dup, headers=lead_headers)
    assert response.status_code == 400
    print("[+] Duplicate upload check verified: Prevented duplicate hashing upload.")

    # 4. Timeline Analyzer API Tests
    # Get timeline as Analyst
    response = client.get(f"/api/v1/cases/{case_id}/timeline/", headers=analyst_headers)
    assert response.status_code == 200
    timeline = response.json()
    assert len(timeline) >= 1
    assert timeline[0]["event_type"] == "FILE_INGEST"
    print(f"[+] Analyst fetched Case Timeline. Events count: {len(timeline)} (Event: {timeline[0]['description']})")

    # Add custom timeline event as Analyst
    custom_event_payload = {
        "event_timestamp": "2026-07-28T08:14:10Z",
        "timestamp_source": "NTFS File Headers",
        "event_type": "SUSPICIOUS_WRITE",
        "description": "Examiner manually annotated anomalous byte patterns.",
        "severity": "HIGH",
        "evidence_file_id": evidence_id
    }
    response = client.post(f"/api/v1/cases/{case_id}/timeline/event", json=custom_event_payload, headers=analyst_headers)
    assert response.status_code == 201
    print("[+] Analyst added custom timeline event annotation successfully.")

    # 5. Cryptographic Chain of Custody Audit Ledger tests
    # Fetch audit logs as Legal Auditor
    response = client.get(f"/api/v1/cases/{case_id}/audit/", headers=auditor_headers)
    assert response.status_code == 200
    audit_trail = response.json()
    assert len(audit_trail) >= 3 # registrations, logins, case creation, upload, custom event
    print(f"[+] Legal Auditor retrieved verification audit ledger. Total blocks: {len(audit_trail)}")
    
    # Verify cryptographic block chaining
    # B_n.previous_block_hash == B_{n-1}.active_block_hash
    for i in range(1, len(audit_trail)):
        prev_block = audit_trail[i-1]
        curr_block = audit_trail[i]
        assert curr_block["previous_block_hash"] == prev_block["active_block_hash"], \
            f"Cryptographic hash chain broken at block {i}!"
    print("[+] Cryptographic Chain of Custody integrity validated successfully. All blocks chained correctly.")

    # 6. Admin Metrics API Tests
    # Fetch system metrics as SysAdmin (Allowed)
    response = client.get("/api/v1/admin/metrics", headers=sysadmin_headers)
    assert response.status_code == 200
    metrics = response.json()
    assert metrics["database"] == "HEALTHY"
    assert metrics["total_cases_count"] == 1
    assert metrics["total_evidence_files_count"] == 1
    print(f"[+] SysAdmin retrieved dashboard metrics: {json.dumps(metrics, indent=2)}")

    # Attempt to fetch metrics as Lead Investigator (Should be Forbidden)
    response = client.get("/api/v1/admin/metrics", headers=lead_headers)
    assert response.status_code == 403
    print("[+] Admin security scope verified: Lead Investigator forbidden from Admin metrics.")

    print("\n====== ALL VERIFICATION TESTS PASSED SUCCESSFULLY! ======")
    
    # Clean database test assets
    clean_test_resources()
    print("[+] Temporary verification resources cleaned.")

if __name__ == "__main__":
    try:
        run_tests()
    except AssertionError as e:
        print(f"[-] Assertion Error: {e}")
        clean_test_resources()
        sys.exit(1)
    except Exception as e:
        print(f"[-] Verification Error: {e}")
        clean_test_resources()
        sys.exit(1)
