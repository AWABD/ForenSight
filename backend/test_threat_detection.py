import os
import sys
import shutil
from pathlib import Path

# Adjust path to import backend modules
sys.path.append(str(Path(__file__).resolve().parent))

# Override settings to use SQLite for isolated verification tests
os.environ["DATABASE_URL"] = "sqlite:///./test_threat.db"
os.environ["STORAGE_VAULT_PATH"] = "./test_threat_vault"

from fastapi.testclient import TestClient
from app.main import app
from app.database import engine, Base
from sqlalchemy import text
from app.services.auth_service import get_password_hash
from app.services.threat_service import ThreatService

client = TestClient(app)

def clean_test_resources():
    try:
        Base.metadata.drop_all(bind=engine)
    except Exception:
        pass
    test_db = Path("./test_threat.db")
    if test_db.exists():
        try:
            os.remove(test_db)
        except Exception:
            pass
        
    test_vault = Path("./test_threat_vault")
    if test_vault.exists():
        try:
            shutil.rmtree(test_vault)
        except Exception:
            pass

def run_tests():
    print("====== RUNNING FORENSIC THREAT & CRIME SCENE DETECTION TEST SUITE ======")
    clean_test_resources()
    Base.metadata.create_all(bind=engine)
    
    try:
        # -------------------------------------------------------------
        # UNIT TESTS FOR ThreatService
        # -------------------------------------------------------------
        print("\n--- 1. Testing ThreatService Unit Logic ---")
        
        # Test 1A: Plain text death threat
        death_threat_text = "I have located your address. I will shoot and kill you tonight. Say your prayers."
        res1 = ThreatService.analyze_text_content(death_threat_text, "threat_note.txt")
        assert res1["has_threats"] is True
        assert res1["threat_level"] == "CRITICAL"
        assert any(a["type"] == "VIOLENT_THREAT_DETECTED" and a["severity"] == "CRITICAL" for a in res1["anomalies"])
        print("[+] PASS: Explicit death threat identified as CRITICAL VIOLENT_THREAT_DETECTED.")

        # Test 1B: Weapons contraband detection
        weapons_text = "The package contains an AK-47 rifle, a Glock 9mm pistol, and two magazine clips."
        res2 = ThreatService.analyze_text_content(weapons_text, "weapons_manifest.txt")
        assert res2["has_threats"] is True
        assert any(a["type"] == "WEAPON_CONTRABAND_FLAG" for a in res2["anomalies"])
        print("[+] PASS: Firearms contraband identified with WEAPON_CONTRABAND_FLAG.")

        # Test 1C: Extortion & ransom threat
        extortion_text = "Transfer 50,000 cash or we will kill your brother. We are holding him hostage."
        res3 = ThreatService.analyze_text_content(extortion_text, "ransom_demand.txt")
        assert res3["has_threats"] is True
        assert any(a["type"] == "CRIMINAL_EXTORTION" for a in res3["anomalies"])
        print("[+] PASS: Extortion & kidnapping ultimatum identified as CRIMINAL_EXTORTION.")

        # Test 1D: Benign text (should have 0 threats)
        benign_text = "Meeting scheduled for Monday at 10 AM regarding the annual audit report."
        res4 = ThreatService.analyze_text_content(benign_text, "memo.txt")
        assert res4["has_threats"] is False
        assert res4["threat_level"] == "NONE"
        assert len(res4["anomalies"]) == 0
        print("[+] PASS: Benign document text returns 0 threat anomalies.")

        # Test 1E: Media type classification
        class_scene = ThreatService.classify_media_type("cctv_shooting_frame_04.jpg", ".jpg", "", 0)
        assert class_scene["media_class"] == "CRIME_SCENE_MEDIA"
        assert class_scene["ocr_applicable"] is False
        print("[+] PASS: Shooting CCTV image correctly classified as CRIME_SCENE_MEDIA (OCR bypassed).")

        class_doc = ThreatService.classify_media_type("receipt_scan.png", ".png", "Total: $440", 5)
        assert class_doc["media_class"] == "DOCUMENT_TEXT_IMAGE"
        assert class_doc["ocr_applicable"] is True
        print("[+] PASS: Document screenshot classified as DOCUMENT_TEXT_IMAGE (OCR applicable).")

        # -------------------------------------------------------------
        # END-TO-END INGESTION TESTS VIA API
        # -------------------------------------------------------------
        print("\n--- 2. Testing End-to-End Ingestion via API ---")
        
        # Setup authenticated user
        client.post("/api/v1/auth/register", json={
            "email": "threat_investigator@agency.gov",
            "full_name": "Senior Investigator Vance",
            "role_level": "LeadInvestigator"
        })
        with engine.begin() as conn:
            conn.execute(text(
                "UPDATE users SET is_approved = TRUE, "
                "username = 'threat_vance', "
                "generated_passphrase = 'vancepass123', "
                "password_hash = :hash "
                "WHERE email = 'threat_investigator@agency.gov'"
            ), {"hash": get_password_hash("vancepass123")})

        login_res = client.post("/api/v1/auth/login", json={
            "username": "threat_vance",
            "password": "vancepass123",
            "selected_role": "LeadInvestigator"
        })
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Create test case
        case_res = client.post("/api/v1/cases/", json={
            "title": "Homicide Threat & Violent Scene Investigation",
            "description": "Case testing violent threat detection and crime scene media parsing",
            "reference_number": "REF-THREAT-2026-001"
        }, headers=headers)
        case_id = case_res.json()["id"]

        # Ingestion Test A: Upload .txt file written to kill someone
        threat_file_bytes = b"Listen carefully. You owe us. I will shoot and kill you tonight if you go to the police. You are a dead man."
        files_threat = {"file": ("suspect_threat_letter.txt", threat_file_bytes, "text/plain")}
        res_upload_threat = client.post(f"/api/v1/cases/{case_id}/evidence/upload", files=files_threat, headers=headers)
        assert res_upload_threat.status_code == 202, f"Upload failed: {res_upload_threat.text}"
        ev_threat_data = res_upload_threat.json()
        
        # Verify anomaly was added
        anom_types = [a["type"] for a in ev_threat_data["anomalies"]]
        assert "VIOLENT_THREAT_DETECTED" in anom_types, f"Expected VIOLENT_THREAT_DETECTED in {anom_types}"
        print("[+] PASS: Uploaded death threat .txt file flagged with CRITICAL VIOLENT_THREAT_DETECTED anomaly.")

        # Ingestion Test B: Check timeline for THREAT_ALERT event
        res_timeline = client.get(f"/api/v1/cases/{case_id}/timeline/", headers=headers)
        assert res_timeline.status_code == 200
        timeline_events = res_timeline.json()
        threat_events = [e for e in timeline_events if e["event_type"] == "THREAT_ALERT"]
        assert len(threat_events) >= 1
        assert threat_events[0]["severity"] == "CRITICAL"
        print("[+] PASS: High-priority THREAT_ALERT timeline event logged with CRITICAL severity.")

        # Ingestion Test C: Upload crime scene image (e.g., shooting scene)
        crime_scene_filename = "shooting_scene_cctv_frame.jpg"
        # Minimum valid JPEG header (magic number FF D8 FF E0)
        jpeg_header = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c $.' \",#\x1c\x1c(7),01444\x1f'9=82<.342\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00\xff\xda\x00\x08\x01\x01\x00\x00?\x00\xbf\x00\xff\xd9"
        files_scene = {"file": (crime_scene_filename, jpeg_header, "image/jpeg")}
        res_upload_scene = client.post(f"/api/v1/cases/{case_id}/evidence/upload", files=files_scene, headers=headers)
        assert res_upload_scene.status_code == 202, f"Upload failed: {res_upload_scene.text}"
        ev_scene_data = res_upload_scene.json()
        
        scene_anom_types = [a["type"] for a in ev_scene_data["anomalies"]]
        assert "CRIME_SCENE_MEDIA" in scene_anom_types, f"Expected CRIME_SCENE_MEDIA in {scene_anom_types}"
        print("[+] PASS: Crime scene image flagged with CRIME_SCENE_MEDIA anomaly (OCR bypassed).")

        print("\n====== ALL FORENSIC THREAT & CRIME SCENE TESTS PASSED SUCCESSFULLY! ======")

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
        print(f"[-] Unexpected Error: {e}")
        clean_test_resources()
        sys.exit(1)
