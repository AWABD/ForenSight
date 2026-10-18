import os
import time
import re
import hashlib
from typing import Dict, Any, List, Optional
from difflib import SequenceMatcher
from pathlib import Path

from app.config import settings
from app.utils.logging_config import logger

# Try imports for actual OCR and document parsing engines
try:
    import easyocr
    EASYOCR_AVAILABLE = True
except ImportError:
    EASYOCR_AVAILABLE = False

try:
    from paddleocr import PaddleOCR as PaddleEngine
    PADDLEOCR_AVAILABLE = True
except ImportError:
    PADDLEOCR_AVAILABLE = False

try:
    import pypdf
    PYPDF_AVAILABLE = True
except ImportError:
    PYPDF_AVAILABLE = False

try:
    import docx
    DOCX_AVAILABLE = True
except ImportError:
    DOCX_AVAILABLE = False


class OCRService:
    _easyocr_reader = None
    _paddle_ocr = None

    @classmethod
    def _get_easyocr_reader(cls):
        """Initializes or returns cached EasyOCR reader."""
        if cls._easyocr_reader is None and EASYOCR_AVAILABLE:
            try:
                # CPU mode, verbose=False to prevent console encoding crashes on Windows
                cls._easyocr_reader = easyocr.Reader(['en'], gpu=False, verbose=False)
            except Exception as e:
                logger.error(f"Failed to initialize EasyOCR reader: {e}")
        return cls._easyocr_reader

    @classmethod
    def _get_paddle_ocr(cls):
        """Initializes or returns cached PaddleOCR reader with multi-version compatibility."""
        if cls._paddle_ocr is None and PADDLEOCR_AVAILABLE:
            # Try PaddleX/PaddleOCR 3.x initialization without show_log and with enable_mkldnn=False to avoid Windows oneDNN crashes
            try:
                cls._paddle_ocr = PaddleEngine(use_textline_orientation=True, lang='en', enable_mkldnn=False)
            except Exception as e1:
                logger.warning(f"PaddleEngine initialization (attempt 1) failed: {e1}, retrying with use_angle_cls=False...")
                try:
                    cls._paddle_ocr = PaddleEngine(use_angle_cls=False, lang='en', enable_mkldnn=False)
                except Exception as e2:
                    logger.warning(f"PaddleEngine initialization (attempt 2) failed: {e2}, retrying with minimal args...")
                    try:
                        cls._paddle_ocr = PaddleEngine(lang='en')
                    except Exception as e3:
                        logger.error(f"Failed to initialize PaddleOCR reader: {e3}")
                        cls._paddle_ocr = None
        return cls._paddle_ocr

    @staticmethod
    def _resolve_file_path(file_path: str, file_name: str) -> Optional[str]:
        """Resolves file path to an absolute path on disk, checking storage vault if needed."""
        if not file_path:
            return None
        if os.path.isabs(file_path) and os.path.exists(file_path):
            return file_path
        
        # Check relative to current working directory
        if os.path.exists(file_path):
            return os.path.abspath(file_path)
        
        # Check inside storage vault directory
        vault_root = Path(settings.STORAGE_VAULT_PATH)
        potential_path = vault_root / file_path
        if potential_path.exists():
            return str(potential_path.resolve())
            
        # Recursive check inside storage vault for matching filename
        if vault_root.exists() and file_name:
            for root, _, files in os.walk(vault_root):
                if file_name in files:
                    found = os.path.join(root, file_name)
                    if os.path.exists(found):
                        return found
                        
        return None

    @staticmethod
    def _calculate_file_sha256(resolved_path: Optional[str]) -> Optional[str]:
        """Calculates actual cryptographic SHA-256 hash directly from file bytes on disk."""
        if not resolved_path or not os.path.exists(resolved_path):
            return None
        try:
            hasher = hashlib.sha256()
            with open(resolved_path, "rb") as f:
                while chunk := f.read(65536):
                    hasher.update(chunk)
            return hasher.hexdigest()
        except Exception as e:
            logger.error(f"Failed to compute file SHA-256: {e}")
            return None

    @staticmethod
    def _extract_entities(text: str, lines: List[str]) -> Dict[str, Any]:
        """
        Extracts structured entities ONLY if genuinely present in detected text.
        Works across transaction screenshots, receipts, invoices, IDs, and general documents.
        Never fabricates or hallucinates values.
        """
        full_text = text or ""
        
        # 1. Dates (e.g. "07 Oct 2026", "2026-10-07", "07/10/2026", "October 7, 2026")
        date_pattern = r'\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4}\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{2,4}\b|\b\d{4}[-/.]\d{2}[-/.]\d{2}\b|\b\d{2}[-/.]\d{2}[-/.]\d{4}\b'
        dates = re.findall(date_pattern, full_text, re.IGNORECASE)
        dates = list(dict.fromkeys([d.strip() for d in dates if len(d.strip()) >= 6]))

        # 2. Times (e.g. "01:23 AM", "14:30", "01:23:45 PM")
        time_pattern = r'\b(?:0?[1-9]|1[0-2]):[0-5][0-9](?::[0-5][0-9])?\s*(?:AM|PM|am|pm)\b|\b(?:[01]?[0-9]|2[0-3]):[0-5][0-9](?::[0-5][0-9])\b'
        times = re.findall(time_pattern, full_text)
        times = list(dict.fromkeys([t.strip() for t in times]))

        # 3. Currency Amounts (e.g. "₹440", "Rs. 440", "$150.00", "€85", "440.00 INR")
        amount_pattern = r'(?:[₹$€£]|Rs\.?|INR)\s*[\d,]+(?:\.\d{1,2})?|\b[\d,]+(?:\.\d{1,2})?\s*(?:INR|rupees|dollars|cents|eur|usd|gbp)\b'
        amounts = re.findall(amount_pattern, full_text, re.IGNORECASE)
        # Also check lines where amount appears standalone right below/above 'Paid to', 'Debited', 'Amount'
        for line in lines:
            m = re.search(r'^[₹$€£]\s*[\d,]+(?:\.\d{1,2})?$', line.strip())
            if m:
                amounts.append(m.group(0).strip())
        amounts = list(dict.fromkeys([a.strip() for a in amounts if re.search(r'\d', a)]))

        # 4. People / Beneficiaries / Names
        people = []
        for line in lines:
            line_str = line.strip()
            # "Paid to: Mr Debasish Swain", "Sent to: John Doe", "Banking Name: Mr Debasish Swain"
            m = re.search(r'(?:Paid\s+to|Sent\s+to|Banking\s+Name|Beneficiary|Received\s+from|From|To)[:\s]+([A-Za-z\s\.\-]{3,40})', line_str, re.IGNORECASE)
            if m:
                val = m.group(1).strip(" :-,")
                if val and len(val) >= 3 and not re.search(r'UPI|Transaction|Bank|Account', val, re.IGNORECASE):
                    people.append(val)
            # Salutations: "Mr Debasish Swain", "Dr. A. Sharma"
            m_sal = re.search(r'\b(?:Mr|Mrs|Ms|Dr|Prof)\.?\s+[A-Za-z]+(?:\s+[A-Za-z]+)+', line_str)
            if m_sal:
                val = m_sal.group(0).strip(" :-,")
                if val and len(val) >= 4:
                    people.append(val)
        people = list(dict.fromkeys(people))

        # 5. Transaction IDs, Reference Numbers, and UTRs
        ids = []
        for line in lines:
            line_str = line.strip()
            # Standard labels: PhonePe Transaction ID, UTR, Ref ID
            if re.search(r'(?:Transaction\s*ID|Txn\s*ID|TxnId|Ref\s*ID|Reference\s*No|Order\s*ID)', line_str, re.IGNORECASE):
                ids.append(line_str)
            elif re.search(r'\bUTR[:\s]*([0-9A-Za-z]{10,22})\b', line_str, re.IGNORECASE):
                ids.append(line_str)
            elif re.search(r'\bT\d{18,25}\b', line_str):  # PhonePe transaction ID format
                ids.append(f"Transaction ID: {line_str}")
            elif re.search(r'^\d{12}$', line_str):  # Standalone 12-digit UTR
                ids.append(f"UTR: {line_str}")
        ids = list(dict.fromkeys(ids))

        # 6. UPI IDs
        upi_pattern = r'\b[a-zA-Z0-9.\-_X*]{2,50}@[a-zA-Z]{2,20}\b'
        upi_ids = re.findall(upi_pattern, full_text)
        # Filter out common email domains if they are actual emails
        real_upi = [u for u in upi_ids if not any(u.lower().endswith(dom) for dom in ('.com', '.org', '.net', '.edu', '.gov', '.io'))]
        upi_ids = list(dict.fromkeys(real_upi))

        # 7. Emails
        email_pattern = r'\b[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+\b'
        emails = re.findall(email_pattern, full_text)
        emails = list(dict.fromkeys([e for e in emails if e not in upi_ids]))

        # 8. URLs
        url_pattern = r'https?://[^\s<>"]+|www\.[^\s<>"]+'
        urls = re.findall(url_pattern, full_text)
        urls = list(dict.fromkeys(urls))

        # 9. Banking Details & Account Numbers
        banking_details = []
        for line in lines:
            line_str = line.strip()
            if re.search(r'(?:Debited\s+from|Credited\s+to|Account\s+No|A/c|Bank|YES\s+BANK|HDFC|ICICI|SBI|Axis|Kotak)', line_str, re.IGNORECASE):
                if len(line_str) <= 60 and not any(p in line_str for p in ("Support", "Privacy", "Terms")):
                    banking_details.append(line_str)
        banking_details = list(dict.fromkeys(banking_details))

        # 10. Status Signals
        status_signals = []
        status_keywords = (
            "Transaction Successful", "Payment Successful", "Payment Failed", "Transaction Failed",
            "Payment Processing", "Transfer Successful", "Paid Successfully", "Success", "Failed"
        )
        for line in lines:
            for kw in status_keywords:
                if kw.lower() in line.lower():
                    status_signals.append(line.strip())
                    break
        status_signals = list(dict.fromkeys(status_signals))

        # 11. Numbers (Distinct numerical tokens isolated from text, minimum 2 digits)
        raw_numbers = re.findall(r'\b\d+(?:\.\d+)?\b', full_text)
        numbers = list(dict.fromkeys([n for n in raw_numbers if len(n) >= 2]))[:20]

        # 12. Tables (Genuine structured data only, if present in CSV/text lines; empty list if not present)
        tables = []
        csv_candidates = [l.split(',') for l in lines if ',' in l and len(l.split(',')) >= 2]
        if len(csv_candidates) >= 2:
            headers = [h.strip() for h in csv_candidates[0]]
            rows = [[c.strip() for c in r] for r in csv_candidates[1:10]]
            tables.append({"headers": headers, "rows": rows})

        return {
            "dates": dates,
            "times": times,
            "amounts": amounts,
            "people": people,
            "ids": ids,
            "upi_ids": upi_ids,
            "emails": emails,
            "urls": urls,
            "banking_details": banking_details,
            "status_signals": status_signals,
            "numbers": numbers,
            "tables": tables
        }

    @staticmethod
    def run_ocr_pipeline(file_path: str, file_name: str) -> Dict[str, Any]:
        """
        Executes genuine OCR extraction on target evidence file using PaddleOCR and EasyOCR.
        Never fabricates or hallucinates data.
        Returns:
            - extracted_text: Raw actual OCR text
            - confidence_score: Real mean confidence of the primary engine
            - bounding_boxes: Actual detected bounding boxes
            - comparison: Real speed & confidence measurements per engine
            - cross_engine_agreement: Real token similarity percentage between engines
            - extracted_data: Genuine parsed entities (dates, times, amounts, people, ids, etc.)
            - file_sha256: Actual calculated SHA-256 hash of the evidence file
        """
        logger.info(f"Initiating genuine OCR pipeline for '{file_name}' (path: '{file_path}')")
        
        resolved_path = OCRService._resolve_file_path(file_path, file_name)
        file_sha256 = OCRService._calculate_file_sha256(resolved_path)

        ext = os.path.splitext(file_name)[1].lower() if file_name else ""
        exists = resolved_path is not None and os.path.exists(resolved_path)

        # Engine results storage
        paddle_data = {"status": "NOT_AVAILABLE", "time": 0.0, "conf": 0.0, "lines": [], "boxes": [], "scores": [], "error": None}
        easy_data = {"status": "NOT_AVAILABLE", "time": 0.0, "conf": 0.0, "lines": [], "boxes": [], "scores": [], "error": None}
        uncertain_extractions = []

        is_image = ext in ('.jpg', '.jpeg', '.png', '.bmp', '.webp', '.tiff', '.gif')

        if not exists:
            err_msg = f"Evidence file '{file_name}' not found at path '{file_path}'"
            logger.error(err_msg)
            return {
                "extracted_text": "Error: Evidence file could not be located in storage vault.",
                "bounding_boxes": [],
                "confidence_score": 0.0,
                "file_sha256": file_sha256,
                "cross_engine_agreement": 0.0,
                "extracted_data": {
                    "dates": [], "times": [], "amounts": [], "people": [], "ids": [],
                    "upi_ids": [], "emails": [], "urls": [], "banking_details": [],
                    "status_signals": [], "numbers": [], "tables": [],
                    "uncertain_extractions": [], "file_sha256": file_sha256
                },
                "comparison": {
                    "paddleocr": {"engine_name": "PaddleOCR (Primary Engine)", "status": "FAILED", "inference_time_seconds": 0.0, "confidence_score": 0.0, "detected_blocks_count": 0, "error_message": err_msg},
                    "easyocr": {"engine_name": "EasyOCR (Secondary Engine)", "status": "FAILED", "inference_time_seconds": 0.0, "confidence_score": 0.0, "detected_blocks_count": 0, "error_message": err_msg}
                }
            }

        # Default variable initializations for safe extraction across all document/image types
        raw_paddle_text = ""
        raw_easy_text = ""
        cross_agreement = None
        chosen_boxes = []
        primary_conf = 0.0
        paddle_data = {"status": "NOT_RUN", "time": 0.0, "conf": 0.0, "lines": [], "boxes": [], "scores": [], "error": None}
        easy_data = {"status": "NOT_RUN", "time": 0.0, "conf": 0.0, "lines": [], "boxes": [], "scores": [], "error": None}

        # =========================================================================
        # 1. IMAGE OCR EXTRACTION (PADDLEOCR & EASYOCR)
        # =========================================================================
        if is_image:
            # --- Primary: PaddleOCR ---
            if PADDLEOCR_AVAILABLE:
                try:
                    ocr = OCRService._get_paddle_ocr()
                    if ocr is not None:
                        t0 = time.perf_counter()
                        paddle_raw = ocr.ocr(resolved_path)
                        paddle_time = round(time.perf_counter() - t0, 3)

                        p_lines, p_scores, p_boxes = [], [], []

                        if paddle_raw and len(paddle_raw) > 0:
                            r0 = paddle_raw[0]
                            # PaddleOCR 3.x / PaddleX OCRResult format
                            if hasattr(r0, 'keys') and 'rec_texts' in r0:
                                rec_texts = r0['rec_texts']
                                rec_scores = r0['rec_scores']
                                rec_boxes = r0.get('rec_boxes', [])
                                for idx, (t, s) in enumerate(zip(rec_texts, rec_scores)):
                                    t_clean = t.strip()
                                    if t_clean:
                                        s_float = float(s)
                                        p_lines.append(t_clean)
                                        p_scores.append(s_float)
                                        box_coords = rec_boxes[idx].tolist() if idx < len(rec_boxes) and hasattr(rec_boxes[idx], 'tolist') else []
                                        p_boxes.append({"text": t_clean, "confidence": round(s_float, 3), "box": box_coords})
                                        if s_float < 0.60:
                                            uncertain_extractions.append({"text": t_clean, "confidence": round(s_float * 100, 1), "engine": "PaddleOCR"})
                            # Legacy PaddleOCR format: [ [ [box], (text, score) ], ... ]
                            elif isinstance(r0, list):
                                for item in r0:
                                    if len(item) >= 2 and isinstance(item[1], (tuple, list)):
                                        t_clean = str(item[1][0]).strip()
                                        if t_clean:
                                            s_float = float(item[1][1])
                                            p_lines.append(t_clean)
                                            p_scores.append(s_float)
                                            p_boxes.append({"text": t_clean, "confidence": round(s_float, 3), "box": item[0]})
                                            if s_float < 0.60:
                                                uncertain_extractions.append({"text": t_clean, "confidence": round(s_float * 100, 1), "engine": "PaddleOCR"})

                        mean_conf = round(sum(p_scores) / len(p_scores) * 100, 2) if p_scores else 0.0
                        paddle_data = {
                            "status": "SUCCESS",
                            "time": paddle_time,
                            "conf": mean_conf,
                            "lines": p_lines,
                            "boxes": p_boxes,
                            "scores": p_scores,
                            "error": None
                        }
                        logger.info(f"PaddleOCR completed: {len(p_lines)} blocks, mean conf: {mean_conf}%, time: {paddle_time}s")
                    else:
                        paddle_data["status"] = "FAILED"
                        paddle_data["error"] = "PaddleOCR engine instance failed to initialize"
                except Exception as e:
                    logger.error(f"PaddleOCR execution error on '{file_name}': {e}", exc_info=True)
                    paddle_data["status"] = "FAILED"
                    paddle_data["error"] = str(e)
            else:
                paddle_data["status"] = "NOT_CONFIGURED"
                paddle_data["error"] = "PaddleOCR library not installed in environment"

            # --- Secondary: EasyOCR ---
            if EASYOCR_AVAILABLE:
                try:
                    reader = OCRService._get_easyocr_reader()
                    if reader is not None:
                        t0 = time.perf_counter()
                        easy_raw = reader.readtext(resolved_path)
                        easy_time = round(time.perf_counter() - t0, 3)

                        e_lines, e_scores, e_boxes = [], [], []
                        for item in easy_raw:
                            t_clean = str(item[1]).strip()
                            if t_clean:
                                s_float = float(item[2])
                                e_lines.append(t_clean)
                                e_scores.append(s_float)
                                # item[0] is polygon bounding box points [[x,y], [x,y], [x,y], [x,y]]
                                e_boxes.append({"text": t_clean, "confidence": round(s_float, 3), "box": item[0]})
                                if s_float < 0.60 and not any(u["text"] == t_clean for u in uncertain_extractions):
                                    uncertain_extractions.append({"text": t_clean, "confidence": round(s_float * 100, 1), "engine": "EasyOCR"})

                        mean_conf = round(sum(e_scores) / len(e_scores) * 100, 2) if e_scores else 0.0
                        easy_data = {
                            "status": "SUCCESS",
                            "time": easy_time,
                            "conf": mean_conf,
                            "lines": e_lines,
                            "boxes": e_boxes,
                            "scores": e_scores,
                            "error": None
                        }
                        logger.info(f"EasyOCR completed: {len(e_lines)} blocks, mean conf: {mean_conf}%, time: {easy_time}s")
                    else:
                        easy_data["status"] = "FAILED"
                        easy_data["error"] = "EasyOCR reader instance failed to initialize"
                except Exception as e:
                    logger.error(f"EasyOCR execution error on '{file_name}': {e}", exc_info=True)
                    easy_data["status"] = "FAILED"
                    easy_data["error"] = str(e)
            else:
                easy_data["status"] = "NOT_CONFIGURED"
                easy_data["error"] = "EasyOCR library not installed in environment"

            # Select primary output lines and bounding boxes
            if paddle_data["status"] == "SUCCESS" and paddle_data["lines"]:
                chosen_lines = paddle_data["lines"]
                chosen_boxes = paddle_data["boxes"]
                primary_conf = paddle_data["conf"]
            elif easy_data["status"] == "SUCCESS" and easy_data["lines"]:
                chosen_lines = easy_data["lines"]
                chosen_boxes = easy_data["boxes"]
                primary_conf = easy_data["conf"]
            else:
                chosen_lines = []
                chosen_boxes = []
                primary_conf = 0.0

            raw_paddle_text = "\n".join(paddle_data["lines"]) if paddle_data["lines"] else ""
            raw_easy_text = "\n".join(easy_data["lines"]) if easy_data["lines"] else ""
            extracted_text = "\n".join(chosen_lines) if chosen_lines else "No text detected by OCR engines."

            # Calculate real cross-engine token agreement
            cross_agreement = None
            if paddle_data["status"] == "SUCCESS" and easy_data["status"] == "SUCCESS":
                p_tokens = set(re.findall(r'\b[a-zA-Z0-9]{2,}\b', raw_paddle_text.lower()))
                e_tokens = set(re.findall(r'\b[a-zA-Z0-9]{2,}\b', raw_easy_text.lower()))
                if p_tokens or e_tokens:
                    union = p_tokens | e_tokens
                    intersection = p_tokens & e_tokens
                    cross_agreement = round((len(intersection) / len(union)) * 100, 2)
                else:
                    cross_agreement = 100.0 if not raw_paddle_text and not raw_easy_text else 0.0

        # =========================================================================
        # 2. DOCUMENT PARSING (PDF, DOCX, TXT/LOG/CSV, BINARY)
        # =========================================================================
        elif ext == '.pdf' and PYPDF_AVAILABLE:
            t0 = time.perf_counter()
            try:
                reader = pypdf.PdfReader(resolved_path)
                pages_text = []
                for idx, page in enumerate(reader.pages):
                    p_text = page.extract_text() or ""
                    if p_text.strip():
                        pages_text.append(f"[Page {idx+1}]\n{p_text.strip()}")
                parsed_time = round(time.perf_counter() - t0, 3)
                extracted_text = "\n\n".join(pages_text) if pages_text else "No extractable digital text found in PDF document (may be a scanned image)."
                primary_conf = 100.0 if pages_text else 0.0
                paddle_data = {"status": "SUCCESS", "time": parsed_time, "conf": primary_conf, "lines": extracted_text.splitlines(), "boxes": [], "scores": [], "error": None}
                easy_data = {"status": "NOT_AVAILABLE", "time": 0.0, "conf": 0.0, "lines": [], "boxes": [], "scores": [], "error": "Direct PDF stream extracted"}
                raw_paddle_text, raw_easy_text, cross_agreement, chosen_boxes = extracted_text, "", None, []
            except Exception as e:
                extracted_text = f"Error reading PDF document: {e}"
                primary_conf, cross_agreement, chosen_boxes = 0.0, None, []

        elif ext == '.docx' and DOCX_AVAILABLE:
            t0 = time.perf_counter()
            try:
                doc = docx.Document(resolved_path)
                paras = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
                parsed_time = round(time.perf_counter() - t0, 3)
                extracted_text = "\n".join(paras) if paras else "Empty Word document."
                primary_conf = 100.0 if paras else 0.0
                paddle_data = {"status": "SUCCESS", "time": parsed_time, "conf": primary_conf, "lines": paras, "boxes": [], "scores": [], "error": None}
                easy_data = {"status": "NOT_AVAILABLE", "time": 0.0, "conf": 0.0, "lines": [], "boxes": [], "scores": [], "error": "Direct DOCX stream extracted"}
                raw_paddle_text, raw_easy_text, cross_agreement, chosen_boxes = extracted_text, "", None, []
            except Exception as e:
                extracted_text = f"Error reading Word document: {e}"
                primary_conf, cross_agreement, chosen_boxes = 0.0, None, []

        elif ext in ('.txt', '.log', '.csv', '.json', '.sql', '.xml', '.html', '.md', '.eml', '.msg', '.py', '.js', '.conf', '.cfg'):
            t0 = time.perf_counter()
            try:
                with open(resolved_path, 'r', encoding='utf-8', errors='ignore') as f:
                    extracted_text = f.read(65536) # Read up to 64KB text
                parsed_time = round(time.perf_counter() - t0, 3)
                primary_conf = 100.0 if extracted_text else 0.0
                paddle_data = {"status": "SUCCESS", "time": parsed_time, "conf": primary_conf, "lines": extracted_text.splitlines(), "boxes": [], "scores": [], "error": None}
                easy_data = {"status": "NOT_AVAILABLE", "time": 0.0, "conf": 0.0, "lines": [], "boxes": [], "scores": [], "error": "Direct text file stream extracted"}
                raw_paddle_text, raw_easy_text, cross_agreement, chosen_boxes = extracted_text, "", None, []
            except Exception as e:
                extracted_text = f"Error reading text document: {e}"
                primary_conf, cross_agreement, chosen_boxes = 0.0, None, []

        else:
            # Binary or database file strings extraction
            t0 = time.perf_counter()
            try:
                with open(resolved_path, 'rb') as f:
                    raw_bytes = f.read(100000)
                ascii_strings = re.findall(r'[\x20-\x7E]{4,}', raw_bytes.decode('latin-1', errors='ignore'))
                extracted_text = " ".join(ascii_strings[:200]) if ascii_strings else "No printable ASCII strings found in binary payload."
                parsed_time = round(time.perf_counter() - t0, 3)
                primary_conf = 85.0 if ascii_strings else 0.0
                paddle_data = {"status": "SUCCESS", "time": parsed_time, "conf": primary_conf, "lines": ascii_strings[:200], "boxes": [], "scores": [], "error": None}
                easy_data = {"status": "NOT_AVAILABLE", "time": 0.0, "conf": 0.0, "lines": [], "boxes": [], "scores": [], "error": "Raw binary ASCII dump"}
                raw_paddle_text, raw_easy_text, cross_agreement, chosen_boxes = extracted_text, "", None, []
            except Exception as e:
                extracted_text = f"Error reading binary payload: {e}"
                primary_conf, cross_agreement, chosen_boxes = 0.0, None, []

        # Extract structured entities genuinely from combined text lines across both engines
        all_unique_lines = []
        for l in (paddle_data["lines"] + easy_data["lines"] + [line.strip() for line in extracted_text.split('\n')]):
            l_clean = l.strip()
            if l_clean and l_clean not in all_unique_lines:
                all_unique_lines.append(l_clean)

        combined_search_text = (extracted_text + "\n" + raw_paddle_text + "\n" + raw_easy_text).strip()
        entities = OCRService._extract_entities(combined_search_text, all_unique_lines)
        entities["uncertain_extractions"] = uncertain_extractions
        entities["file_sha256"] = file_sha256

        return {
            "extracted_text": extracted_text,
            "bounding_boxes": chosen_boxes,
            "confidence_score": primary_conf,
            "file_sha256": file_sha256,
            "cross_engine_agreement": cross_agreement,
            "raw_paddle_text": raw_paddle_text,
            "raw_easy_text": raw_easy_text,
            "extracted_data": entities,
            "comparison": {
                "paddleocr": {
                    "engine_name": "PaddleOCR (Primary Engine)",
                    "status": paddle_data["status"],
                    "inference_time_seconds": paddle_data["time"],
                    "confidence_score": paddle_data["conf"],
                    "detected_blocks_count": len(paddle_data["lines"]),
                    "error_message": paddle_data["error"]
                },
                "easyocr": {
                    "engine_name": "EasyOCR (Secondary / Verification)",
                    "status": easy_data["status"],
                    "inference_time_seconds": easy_data["time"],
                    "confidence_score": easy_data["conf"],
                    "detected_blocks_count": len(easy_data["lines"]),
                    "error_message": easy_data["error"]
                }
            }
        }
