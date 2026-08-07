# ForenSight - Project Overview, Status, & Workflow

ForenSight is an advanced, sovereign, AI-powered digital forensics investigation platform designed to operate securely in air-gapped environments. Its main goals are to ingest digital evidence payloads, isolate structural anomalies, perform multi-engine document analysis (OCR), and enforce a strict, cryptographically chained audit ledger establishing an immutable Chain of Custody (CoC).

---

## 1. Project Purpose

In digital forensic investigations, the integrity of evidence is paramount. If a file is tampered with, spoofed, or its ingestion history is modified, the evidence becomes inadmissible in court. 

**ForenSight** resolves this by combining high-speed forensic ingestion with deep analysis:
*   **Tamper-Proof Ingestion:** Enforces real-time binary magic signature validation to reject spoofed files and shebang/PE binaries.
*   **Cryptographic Custody:** Computers parallel SHA-256 and SHA3-256 hash digests concurrently before storing files in a case-specific vault.
*   **Immutable Audit Ledger:** Registers every operation (case creation, file upload, login, OCR scan) in a hash-chained ledger block (resembling a private blockchain) where each block references the hash of the preceding entry.
*   **Multi-Engine AI Analysis:** Compares different AI models (like EasyOCR vs PaddleOCR) side-by-side, analyzing speed and accuracy ratings to extract structured Text, Tables, Numbers, and Dates from evidentiary documents.

---

## 2. Project Architecture & Workflow

The platform follows a strict logical flow to guarantee evidentiary safety and compliance:

```mermaid
graph TD
    A[Investigator Login] -->|JWT Access & Refresh Token| B[Case File Selection]
    B -->|Case Assigned| C[Evidence Upload Console]
    C -->|Drag & Drop File Ingest| D{Ingest Validation Gateway}
    D -->|Fail: Spoofed/Executable| E[File Deleted & 400 Blocked]
    D -->|Pass: Valid Signature| F[Parallel Hashing SHA-256 & SHA3]
    F --> G[Write to Secure Vault Storage]
    G --> H[Register Chain of Custody block]
    H --> I[Timeline Event Appended]
    I --> J[OCR & AI Analysis workspaces]
    J -->|EasyOCR / PaddleOCR Comparison| K[Extract Text, Tables, Numbers, Dates]
    K --> L[Save OCR Result to PostgreSQL]
```

### **Detailed Ingestion Pipeline Steps:**
1.  **Identity Handshake:** Forensic examiners log in securely via JWT. The system issues short-lived Access tokens and rotates long-lived Refresh tokens.
2.  **Ingestion Gatekeeper:** When a file is dropped, the backend inspects the first 1024 bytes (Magic Numbers check) to match the file's extension, preventing executable shebangs (`#!`) or Windows PE executables (`MZ`) from being uploaded disguised as log files.
3.  **Sanitization:** Filenames are stripped of path traversal parameters (`../`) to guarantee containment within the case-vault directory.
4.  **Double Hashing:** Calculates both SHA-256 and SHA3-256 concurrently inside CPU vector lanes.
5.  **Chain of Custody Sealing:** An audit block is appended to the database containing:
    $$\text{Block\_Hash} = \text{SHA-256}(\text{Action} + \text{Previous\_Block\_Hash})$$
    This makes the historical chain immutable.
6.  **Multi-Engine OCR Scanning:** Runs EasyOCR (PyTorch) and PaddleOCR (PaddlePaddle) side-by-side on images and documents, saving the parsed results in the database and rendering speed/accuracy comparisons for the investigator.

---

## 3. Current Project Status (Phases Completed)

All backend database configurations, API route modules, security controls, and frontend visual workspaces have been successfully implemented and pushed to the repository:

### **Phase 3 & 4: Backend REST APIs & PostgreSQL Database Design**
*   Created a fully normalized, indexed database catalog containing 12 key tables (`users`, `cases`, `evidence_files`, `ocr_text`, `timeline_events`, `audit_ledger`, etc.).
*   Developed a FastAPI MVC architecture (FastAPI as controller, SQLAlchemy as database mapper, Pydantic as verification schema).

### **Phase 5: Authentication & Security Hardening**
*   Implemented **Refresh Token Rotation (RTR)** and revocation on logout to secure user sessions.
*   Added an in-memory, thread-safe sliding window **Rate Limiter** protecting authentication and upload routes.
*   Added filename path traversal sanitization and binary magic-number checks.

### **Phase 6: Evidence Ingest Console**
*   Designed a React drag-and-drop workspace supporting preview states:
    *   *Images:* Renders file thumbnails.
    *   *Logs/Text:* Reads and displays the first 800 characters in a terminal console.
    *   *PDF/ZIP/DOCX:* Displays custom file format cards with size calculations.

### **Phase 7: OCR Engine & Examiner workspace**
*   Developed the backend comparison engine executing and measuring `EasyOCR` vs `PaddleOCR`.
*   Implemented regex parsers to isolate dates, numbers, and tabular tables.
*   Created the **OCR Scanner Tab** in the React evidence viewer displaying comparative speed/accuracy meters and structured details.

---

## 4. How to Run the Project

Ensure your local PostgreSQL server is active at `postgresql://postgres:0747@localhost:5432/forensight` (configured in environment).

### **1. Run the FastAPI Backend:**
```bash
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### **2. Run the React Frontend:**
```bash
cd frontend
npm install
npm run dev
```
Open **`http://localhost:5173/`** to view the application.

### **3. Run Automated Security & Ingestion Tests:**
```bash
python backend/verify_backend.py
```
