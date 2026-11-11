import os
import sys
import hashlib
import shutil
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent))

os.environ["DATABASE_URL"] = "sqlite:///./test_ocr_e2e.db"
os.environ["STORAGE_VAULT_PATH"] = "./test_ocr_vault"

from PIL import Image, ImageDraw, ImageFont
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.main import app
from app.database import engine, Base
from app.services.auth_service import get_password_hash
from app.services.ocr_service import OCRService

client = TestClient(app)


def clean_test_resources():
    try:
        Base.metadata.drop_all(bind=engine)
    except Exception:
        pass
    try:
        engine.dispose()
    except Exception:
        pass
    for db_name in ("./test_ocr_e2e.db",):
        p = Path(db_name)
        if p.exists():
            try:
                os.remove(p)
            except Exception:
                pass
    for dir_name in ("./test_ocr_vault", "./test_ocr_fixtures"):
        p = Path(dir_name)
        if p.exists():
            try:
                shutil.rmtree(p)
            except Exception:
                pass


def generate_synthetic_receipt_image(out_path: Path):
    """Generates a clean receipt image and a matching image-only scanned PDF for portable testing."""
    img = Image.new("RGB", (900, 620), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    try:
        font_lg = ImageFont.truetype("arial.ttf", 30)
        font_md = ImageFont.truetype("arial.ttf", 22)
    except Exception:
        font_lg = ImageFont.load_default()
        font_md = ImageFont.load_default()

    lines = [
        ("Transaction Successful", font_lg),
        ("01:23 AM on 07 Oct 2026", font_md),
        ("Paid to: Mr Debasish Swain", font_md),
        ("Amount: Rs. 440.00", font_lg),
        ("UPI ID: xxxxxx2972@slc", font_md),
        ("Transaction ID: T2610070123513253398771", font_md),
        ("Debited from: XXXXXXXX2570", font_md),
        ("UTR: 639280496028", font_md),
    ]
    y = 40
    for txt, fnt in lines:
        draw.text((45, y), txt, fill=(15, 23, 42), font=fnt)
        y += 65

    img.save(out_path, format="PNG")
    pdf_path = out_path.with_suffix(".pdf")
    img.save(pdf_path, format="PDF", resolution=150.0)
    return out_path, pdf_path


def run_tests():
    print("====== RUNNING GENUINE OCR & ENDPOINT E2E VERIFICATION ======")
    clean_test_resources()
    Base.metadata.create_all(bind=engine)

    fixtures_dir = Path("./test_ocr_fixtures")
    fixtures_dir.mkdir(parents=True, exist_ok=True)
    synth_png, synth_pdf = generate_synthetic_receipt_image(fixtures_dir / "synthetic_receipt.png")

    real_exs = Path(__file__).resolve().parent / "storage_vault" / "91ddaa5c-48a7-4822-b3e7-83265af9f251" / "exs.jpeg"
    real_gpay = Path(__file__).resolve().parent / "storage_vault" / "91ddaa5c-48a7-4822-b3e7-83265af9f251" / "1.png"

    try:
        # -----------------------------------------------------------------
        # 1. UNIT TEST: Real PhonePe Screenshot (exs.jpeg) Quick + Full OCR
        # -----------------------------------------------------------------
        if real_exs.exists():
            print("\n--- 1. Testing Real PhonePe Screenshot (exs.jpeg) ---")
            fast_res = OCRService.run_ocr_pipeline(str(real_exs), "exs.jpeg", fast_mode=True)
            txt_fast = fast_res["extracted_text"]
            ent_fast = fast_res["extracted_data"]
            assert fast_res["comparison"]["paddleocr"]["status"] == "SUCCESS", fast_res["comparison"]
            assert fast_res["comparison"]["easyocr"]["status"] == "DEFERRED"
            assert "440" in txt_fast, f"Expected 440 in fast OCR: {txt_fast}"
            assert "T2610070123513253398771" in txt_fast
            assert "639280496028" in txt_fast
            assert "Port 8080" not in txt_fast and "96.15" not in txt_fast
            assert any("Debasish Swain" in p for p in ent_fast["people"]), ent_fast["people"]
            assert any("2972@slc" in u.lower() for u in ent_fast["upi_ids"]), ent_fast["upi_ids"]
            assert any("639280496028" in i for i in ent_fast["ids"]), ent_fast["ids"]
            print(f"[+] PASS: exs.jpeg Quick-Ingest OCR extracted {len(txt_fast.splitlines())} lines cleanly in {fast_res['comparison']['paddleocr']['inference_time_seconds']}s.")

            full_res = OCRService.run_ocr_pipeline(str(real_exs), "exs.jpeg", fast_mode=False)
            txt_full = full_res["extracted_text"]
            assert full_res["comparison"]["paddleocr"]["status"] == "SUCCESS"
            assert "Transaction Successful" in txt_full, f"Missing banner text in full PaddleOCR: {txt_full}"
            assert "440" in txt_full
            if full_res["comparison"]["easyocr"]["status"] == "SUCCESS":
                assert full_res["cross_engine_agreement"] is not None
            print(f"[+] PASS: exs.jpeg Full Dual-Engine OCR succeeded (agreement={full_res['cross_engine_agreement']}%).")

        # -----------------------------------------------------------------
        # 2. UNIT TEST: Real Google Pay Screenshot (1.png) Quick-Ingest
        # -----------------------------------------------------------------
        if real_gpay.exists():
            print("\n--- 2. Testing Real Google Pay Screenshot (1.png) ---")
            gpay_res = OCRService.run_ocr_pipeline(str(real_gpay), "1.png", fast_mode=True)
            txt_gpay = gpay_res["extracted_text"]
            ent_gpay = gpay_res["extracted_data"]
            assert "Anyadike Emmanue" in txt_gpay, f"Expected recipient in 1.png: {txt_gpay}"
            assert "50,000" in txt_gpay, f"Expected 50,000 in 1.png: {txt_gpay}"
            assert "muktadagm-1@okicici" in txt_gpay.lower(), f"Expected UPI handle in 1.png: {txt_gpay}"
            assert ent_gpay["tables"] == [], f"Unexpected false CSV table generated: {ent_gpay['tables']}"
            assert any("50,000" in a for a in ent_gpay["amounts"]), f"Amounts missing: {ent_gpay['amounts']}"
            assert any("014216081991" in i for i in ent_gpay["ids"]), f"UPI Txn ID missing: {ent_gpay['ids']}"
            assert any("CICAgKCxt-eCTw" in i for i in ent_gpay["ids"]), f"Google Txn ID missing: {ent_gpay['ids']}"
            assert "Port 8080" not in txt_gpay
            print("[+] PASS: 1.png Google Pay entities extracted accurately with 0 false tables.")

        # -----------------------------------------------------------------
        # 3. UNIT TEST: Image-Only Scanned PDF Raster OCR Fallback
        # -----------------------------------------------------------------
        print("\n--- 3. Testing Image-Only Scanned PDF OCR ---")
        pdf_res = OCRService.run_ocr_pipeline(str(synth_pdf), "synthetic_receipt.pdf", fast_mode=True)
        pdf_txt = pdf_res["extracted_text"]
        pdf_ent = pdf_res["extracted_data"]
        assert pdf_res["comparison"]["paddleocr"]["status"] == "SUCCESS", pdf_res["comparison"]
        assert "Debasish Swain" in pdf_txt or "Transaction" in pdf_txt, f"Expected text from scanned PDF, got: {pdf_txt}"
        assert any("2972@slc" in u.lower() for u in pdf_ent["upi_ids"]) or any("639280496028" in i for i in pdf_ent["ids"]), pdf_ent
        print(f"[+] PASS: Image-only PDF rasterized and OCR'd via pypdfium2 ({len(pdf_txt)} chars).")

        # -----------------------------------------------------------------
        # 4. END-TO-END API TEST: Upload -> GET /ocr -> GET /content -> POST /ocr -> 404 safety
        # -----------------------------------------------------------------
        print("\n--- 4. Testing End-to-End API Flow ---")
        client.post("/api/v1/auth/register", json={
            "email": "ocr_verifier@agency.gov",
            "full_name": "OCR Verifier",
            "role_level": "LeadInvestigator"
        })
        with engine.begin() as conn:
            conn.execute(text(
                "UPDATE users SET is_approved = TRUE, username = 'ocr_verifier', "
                "generated_passphrase = 'ocrpass123', password_hash = :hash "
                "WHERE email = 'ocr_verifier@agency.gov'"
            ), {"hash": get_password_hash("ocrpass123")})

        login_res = client.post("/api/v1/auth/login", json={
            "username": "ocr_verifier",
            "password": "ocrpass123",
            "selected_role": "LeadInvestigator"
        })
        headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

        c1_id = client.post("/api/v1/cases/", json={
            "title": "OCR Case 1",
            "description": "Testing genuine OCR ingestion and retrieval",
            "reference_number": "REF-OCR-001"
        }, headers=headers).json()["id"]

        c2_id = client.post("/api/v1/cases/", json={
            "title": "OCR Case 2",
            "description": "Testing global SHA256 duplicate handling",
            "reference_number": "REF-OCR-002"
        }, headers=headers).json()["id"]

        upload_src = real_exs if real_exs.exists() else synth_png
        upload_mime = "image/jpeg" if upload_src.suffix.lower() in (".jpg", ".jpeg") else "image/png"
        upload_bytes = upload_src.read_bytes()
        expected_sha256 = hashlib.sha256(upload_bytes).hexdigest()

        up_res = client.post(
            f"/api/v1/cases/{c1_id}/evidence/upload",
            files={"file": (upload_src.name, upload_bytes, upload_mime)},
            headers=headers
        )
        assert up_res.status_code == 202, up_res.text
        ev = up_res.json()
        ev_id = ev["id"]
        assert ev["sha256_hash"] == expected_sha256
        assert "iPhone 13" not in str(ev.get("exif")), f"Fabricated EXIF found: {ev.get('exif')}"

        # Auto-OCR should already be saved immediately after upload
        ocr_get = client.get(f"/api/v1/cases/{c1_id}/evidence/{ev_id}/ocr", headers=headers)
        assert ocr_get.status_code == 200
        ocr_list = ocr_get.json()
        assert len(ocr_list) == 1
        assert "Debasish Swain" in ocr_list[0]["extracted_text"]
        assert ocr_list[0]["extracted_data"]["file_sha256"] == expected_sha256
        assert "engine_comparison" in ocr_list[0]["extracted_data"]
        print("[+] PASS: Upload automatically populated GET /ocr with genuine text & telemetry.")

        # Content preview endpoint should return exact raw bytes
        content_res = client.get(f"/api/v1/cases/{c1_id}/evidence/{ev_id}/content", headers=headers)
        assert content_res.status_code == 200
        assert hashlib.sha256(content_res.content).hexdigest() == expected_sha256
        print("[+] PASS: GET /content streamed exact immutable evidence bytes.")

        # Duplicate SHA256 into Case 2 should cleanly return HTTP 400 and leave zero orphan files on disk
        dup_res = client.post(
            f"/api/v1/cases/{c2_id}/evidence/upload",
            files={"file": (upload_src.name, upload_bytes, upload_mime)},
            headers=headers
        )
        assert dup_res.status_code == 400, f"Expected 400 on duplicate SHA256, got {dup_res.status_code}: {dup_res.text}"
        c2_vault_dir = Path(os.environ["STORAGE_VAULT_PATH"]) / c2_id
        if c2_vault_dir.exists():
            assert list(c2_vault_dir.iterdir()) == [], f"Orphan file left after duplicate 400: {list(c2_vault_dir.iterdir())}"
        print("[+] PASS: Global SHA-256 duplicate across cases rejected cleanly with HTTP 400 and 0 orphan files.")

        # Remove vault file on disk to simulate ephemeral storage reset -> POST /ocr must 404 without overwriting GET /ocr!
        vault_file = Path(ev["storage_vault_key"])
        if vault_file.exists():
            os.remove(vault_file)
        post_missing = client.post(f"/api/v1/cases/{c1_id}/evidence/{ev_id}/ocr", headers=headers)
        assert post_missing.status_code == 404, f"Expected 404 when vault file missing, got {post_missing.status_code}"
        ocr_after = client.get(f"/api/v1/cases/{c1_id}/evidence/{ev_id}/ocr", headers=headers).json()
        assert len(ocr_after) == 1
        assert "Debasish Swain" in ocr_after[0]["extracted_text"]
        print("[+] PASS: Missing vault file returns 404 on POST /ocr and preserves existing OCR records.")

        print("\n====== ALL REAL OCR E2E TESTS PASSED SUCCESSFULLY! ======")
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
