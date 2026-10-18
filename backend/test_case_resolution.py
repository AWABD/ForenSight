import os
import sys
import shutil
from pathlib import Path

# Adjust path to import backend modules
sys.path.append(str(Path(__file__).resolve().parent))

# Override settings to use SQLite for isolated verification tests
os.environ["DATABASE_URL"] = "sqlite:///./test_resolution.db"
os.environ["STORAGE_VAULT_PATH"] = "./test_resolution_vault"

from fastapi.testclient import TestClient
from app.main import app
from app.database import engine, Base
from sqlalchemy import text
from app.services.auth_service import get_password_hash

client = TestClient(app)

def clean_test_resources():
    try:
        Base.metadata.drop_all(bind=engine)
    except Exception:
        pass
    test_db = Path("./test_resolution.db")
    if test_db.exists():
        try:
            os.remove(test_db)
        except Exception:
            pass
        
    test_vault = Path("./test_resolution_vault")
    if test_vault.exists():
        try:
            shutil.rmtree(test_vault)
        except Exception:
            pass

def run_tests():
    print("====== RUNNING CASE RESOLUTION & UUID HANDLING TEST SUITE ======")
    
    # 0. Clean and recreate tables
    clean_test_resources()
    Base.metadata.create_all(bind=engine)
    
    try:
        # 1. Register a test Lead Investigator
        reg_payload = {
            "email": "investigator_res@agency.gov",
            "full_name": "Lead Investigator Case Test",
            "role_level": "LeadInvestigator"
        }
        res_reg = client.post("/api/v1/auth/register", json=reg_payload)
        assert res_reg.status_code == 201, f"Registration failed: {res_reg.text}"

        # 2. Approve and set password in database
        with engine.begin() as conn:
            conn.execute(text(
                "UPDATE users SET is_approved = TRUE, "
                "username = 'investigator_res', "
                "generated_passphrase = 'ressecretpass', "
                "password_hash = :hash "
                "WHERE email = 'investigator_res@agency.gov'"
            ), {"hash": get_password_hash("ressecretpass")})

        # 3. Log in
        login_res = client.post("/api/v1/auth/login", json={
            "username": "investigator_res",
            "password": "ressecretpass",
            "selected_role": "LeadInvestigator"
        })
        assert login_res.status_code == 200, f"Login failed: {login_res.json()}"
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("[+] Test user registered and authenticated.")

        # 4. Create a case via API
        case_payload = {
            "title": "Case Identifier Resolution Benchmark",
            "description": "Validation suite for non-UUID case display alias resolution.",
            "reference_number": "REF-RESOLVE-2026-001"
        }
        case_res = client.post("/api/v1/cases/", json=case_payload, headers=headers)
        assert case_res.status_code == 201, f"Case creation failed: {case_res.text}"
        case_data = case_res.json()
        case_uuid = case_data["id"]
        created_case_num = case_data["case_number"]
        print(f"[+] Case created with UUID: {case_uuid}, case_number: {created_case_num}")

        # Update case_number to 'FS-2026-091' to also test the seeded alias 'c1' mapping
        with engine.begin() as conn:
            conn.execute(text(
                "UPDATE cases SET case_number = 'FS-2026-091' WHERE id = :cid"
            ), {"cid": case_uuid})
        print(f"[+] Case number mapped to canonical 'FS-2026-091' (c1 alias target).")

        # TEST 1: Retrieve case by exact UUID
        res_uuid = client.get(f"/api/v1/cases/{case_uuid}", headers=headers)
        assert res_uuid.status_code == 200, f"Expected 200 for UUID, got {res_uuid.status_code}: {res_uuid.text}"
        assert res_uuid.json()["id"] == case_uuid
        print("[+] TEST 1 PASS: Case retrieved via exact UUID.")

        # TEST 2: Retrieve case by display identifier 'c1' (should resolve to FS-2026-091 -> case_uuid)
        res_c1 = client.get("/api/v1/cases/c1", headers=headers)
        assert res_c1.status_code == 200, f"Expected 200 for 'c1', got {res_c1.status_code}: {res_c1.text}"
        assert res_c1.json()["id"] == case_uuid
        print("[+] TEST 2 PASS: Case retrieved via display alias 'c1' (resolved without UUID cast error).")

        # TEST 3: Retrieve case by case_number
        res_num = client.get(f"/api/v1/cases/{created_case_num}", headers=headers)
        assert res_num.status_code == 200, f"Expected 200 for case_number, got {res_num.status_code}: {res_num.text}"
        assert res_num.json()["id"] == case_uuid
        print(f"[+] TEST 3 PASS: Case retrieved via case_number '{created_case_num}'.")

        # TEST 4: Evidence ingestion upload with display alias 'c1'
        sample_file_content = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"
        files = {"file": ("test_resolution_evidence.pdf", sample_file_content, "application/pdf")}
        upload_res = client.post("/api/v1/cases/c1/evidence/upload", files=files, headers=headers)
        assert upload_res.status_code == 202, f"Upload with 'c1' failed: {upload_res.status_code} {upload_res.text}"
        evidence_data = upload_res.json()
        assert evidence_data["case_id"] == case_uuid
        evidence_id = evidence_data["id"]
        print(f"[+] TEST 4 PASS: Evidence ingested using 'c1' alias; mapped to DB UUID: {evidence_data['case_id']}.")

        # TEST 5: Evidence listing via 'c1' and UUID consistency
        list_c1 = client.get("/api/v1/cases/c1/evidence/", headers=headers)
        assert list_c1.status_code == 200
        list_uuid = client.get(f"/api/v1/cases/{case_uuid}/evidence/", headers=headers)
        assert list_uuid.status_code == 200
        assert len(list_c1.json()) == len(list_uuid.json())
        assert list_c1.json()[0]["id"] == list_uuid.json()[0]["id"]
        print("[+] TEST 5 PASS: Evidence list endpoint returns identical records for 'c1' and UUID.")

        # TEST 6: Timeline listing via 'c1' and UUID
        timeline_c1 = client.get("/api/v1/cases/c1/timeline/", headers=headers)
        assert timeline_c1.status_code == 200
        assert len(timeline_c1.json()) >= 1
        print("[+] TEST 6 PASS: Timeline queried successfully using 'c1'.")

        # TEST 7: Audit ledger listing via 'c1' and UUID
        audit_c1 = client.get("/api/v1/cases/c1/audit/", headers=headers)
        assert audit_c1.status_code == 200
        assert len(audit_c1.json()) >= 1
        print("[+] TEST 7 PASS: Audit ledger queried successfully using 'c1'.")

        # TEST 8: Nonexistent case with valid UUID syntax -> 404 Not Found
        nonexistent_uuid = "00000000-0000-0000-0000-000000000000"
        res_404_uuid = client.get(f"/api/v1/cases/{nonexistent_uuid}", headers=headers)
        assert res_404_uuid.status_code == 404, f"Expected 404, got {res_404_uuid.status_code}"
        assert "not found" in res_404_uuid.json()["detail"].lower()
        print("[+] TEST 8 PASS: Nonexistent valid UUID returns HTTP 404 Not Found.")

        # TEST 9: Nonexistent display alias or case number -> 404 Not Found
        res_404_alias = client.get("/api/v1/cases/c999", headers=headers)
        assert res_404_alias.status_code == 404, f"Expected 404, got {res_404_alias.status_code}"

        res_404_num = client.get("/api/v1/cases/FS-9999-999", headers=headers)
        assert res_404_num.status_code == 404, f"Expected 404, got {res_404_num.status_code}"
        print("[+] TEST 9 PASS: Nonexistent display alias 'c999' and case number 'FS-9999-999' return HTTP 404.")

        # TEST 10: Malformed identifier syntax -> HTTP 400 Bad Request
        malformed_inputs = [
            "bad..traversal",
            "' OR 1=1--",
            "c1;DROP",
            "c" * 200,
            "case!alert",
            "invalid@case#id"
        ]
        for bad_id in malformed_inputs:
            res_bad = client.get(f"/api/v1/cases/{bad_id}", headers=headers)
            assert res_bad.status_code == 400, f"Expected 400 for '{bad_id}', got {res_bad.status_code}: {res_bad.text}"
            detail_msg = res_bad.json()["detail"].lower()
            assert any(k in detail_msg for k in ["malformed", "exceeds", "invalid"]), f"Unexpected detail message: {detail_msg}"
            print(f"[+] TEST 10 PASS: Malformed input '{bad_id[:16]}' rejected with HTTP 400.")

        print("\n====== ALL 10 CASE RESOLUTION TESTS PASSED SUCCESSFULLY! ======")

    finally:
        clean_test_resources()

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
