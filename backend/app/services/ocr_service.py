import os
import time
import re
import hashlib
import tempfile
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
    from rapidocr import RapidOCR as RapidEngine
    RAPIDOCR_AVAILABLE = True
except ImportError:
    RAPIDOCR_AVAILABLE = False

try:
    import pypdf
    PYPDF_AVAILABLE = True
except ImportError:
    PYPDF_AVAILABLE = False

try:
    import pypdfium2
    PYPDFIUM_AVAILABLE = True
except ImportError:
    PYPDFIUM_AVAILABLE = False

try:
    import docx
    DOCX_AVAILABLE = True
except ImportError:
    DOCX_AVAILABLE = False


def _to_json_native(obj: Any) -> Any:
    """Recursively converts numpy scalars/arrays to native Python primitives for JSON persistence."""
    if hasattr(obj, "tolist"):
        return obj.tolist()
    if isinstance(obj, dict):
        return {k: _to_json_native(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_to_json_native(v) for v in obj]
    if isinstance(obj, (int, float, str, bool)) or obj is None:
        return obj
    if hasattr(obj, "item"):
        return obj.item()
    return str(obj)


class OCRService:
    _easyocr_reader = None
    _paddle_ocr = None
    _rapid_ocr = None

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
            # Disable heavy document orientation/unwarping models (UVDoc) so receipts & banners aren't cropped
            try:
                cls._paddle_ocr = PaddleEngine(
                    lang='en',
                    use_doc_orientation_classify=False,
                    use_doc_unwarping=False,
                    use_textline_orientation=False,
                    enable_mkldnn=False
                )
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

    @classmethod
    def _get_rapid_ocr(cls):
        """Initializes or returns cached RapidOCR (PP-OCRv6 ONNX) reader."""
        if cls._rapid_ocr is None and RAPIDOCR_AVAILABLE:
            try:
                cls._rapid_ocr = RapidEngine()
            except Exception as e:
                logger.error(f"Failed to initialize RapidOCR reader: {e}")
                cls._rapid_ocr = None
        return cls._rapid_ocr

    @classmethod
    def _run_paddle_on_image(cls, image_path: str) -> Dict[str, Any]:
        """Executes PaddleOCR on a single image path and returns standardized metrics."""
        ocr = cls._get_paddle_ocr()
        if ocr is None:
            return {"status": "FAILED", "time": 0.0, "conf": 0.0, "lines": [], "boxes": [], "scores": [], "uncertain": [], "error": "PaddleOCR engine instance failed to initialize", "engine_name": "PaddleOCR (Primary Engine)"}

        t0 = time.perf_counter()
        paddle_raw = ocr.predict(image_path) if hasattr(ocr, "predict") else ocr.ocr(image_path)
        paddle_time = round(time.perf_counter() - t0, 3)

        p_lines, p_scores, p_boxes, uncertain = [], [], [], []
        if paddle_raw and len(paddle_raw) > 0:
            r0 = paddle_raw[0]
            # PaddleOCR 3.x / PaddleX OCRResult format
            if hasattr(r0, 'keys') and 'rec_texts' in r0:
                rec_texts = r0['rec_texts']
                rec_scores = r0['rec_scores']
                rec_boxes = r0.get('rec_boxes', [])
                for idx, (t, s) in enumerate(zip(rec_texts, rec_scores)):
                    t_clean = str(t).strip()
                    if t_clean:
                        s_float = float(s)
                        p_lines.append(t_clean)
                        p_scores.append(s_float)
                        box_coords = _to_json_native(rec_boxes[idx]) if idx < len(rec_boxes) else []
                        p_boxes.append({"text": t_clean, "confidence": round(s_float, 3), "box": box_coords})
                        if s_float < 0.60:
                            uncertain.append({"text": t_clean, "confidence": round(s_float * 100, 1), "engine": "PaddleOCR"})
            # Legacy PaddleOCR format: [ [ [box], (text, score) ], ... ]
            elif isinstance(r0, list):
                for item in r0:
                    if len(item) >= 2 and isinstance(item[1], (tuple, list)):
                        t_clean = str(item[1][0]).strip()
                        if t_clean:
                            s_float = float(item[1][1])
                            p_lines.append(t_clean)
                            p_scores.append(s_float)
                            p_boxes.append({"text": t_clean, "confidence": round(s_float, 3), "box": _to_json_native(item[0])})
                            if s_float < 0.60:
                                uncertain.append({"text": t_clean, "confidence": round(s_float * 100, 1), "engine": "PaddleOCR"})

        mean_conf = round(sum(p_scores) / len(p_scores) * 100, 2) if p_scores else 0.0
        return {
            "engine_name": "PaddleOCR (Primary Engine)",
            "status": "SUCCESS",
            "time": paddle_time,
            "conf": mean_conf,
            "lines": p_lines,
            "boxes": p_boxes,
            "scores": p_scores,
            "uncertain": uncertain,
            "error": None
        }

    @classmethod
    def _run_rapid_on_image(cls, image_path: str, engine_label: str = "PaddleOCR (RapidOCR ONNX Engine)") -> Dict[str, Any]:
        """Executes RapidOCR (lightweight PaddleOCR ONNX weights) on a single image path."""
        rapid = cls._get_rapid_ocr()
        if rapid is None:
            return {"status": "FAILED", "time": 0.0, "conf": 0.0, "lines": [], "boxes": [], "scores": [], "uncertain": [], "error": "RapidOCR engine instance failed to initialize", "engine_name": engine_label}

        t0 = time.perf_counter()
        res = rapid(image_path)
        rapid_time = round(time.perf_counter() - t0, 3)

        r_lines, r_scores, r_boxes, uncertain = [], [], [], []
        txts = getattr(res, "txts", None)
        scores = getattr(res, "scores", None)
        boxes = getattr(res, "boxes", None)

        if txts is not None:
            for idx, t in enumerate(txts):
                t_clean = str(t).strip()
                if t_clean:
                    s_float = float(scores[idx]) if (scores is not None and idx < len(scores)) else 0.0
                    r_lines.append(t_clean)
                    r_scores.append(s_float)
                    box_coords = _to_json_native(boxes[idx]) if (boxes is not None and idx < len(boxes)) else []
                    r_boxes.append({"text": t_clean, "confidence": round(s_float, 3), "box": box_coords})
                    if s_float < 0.60:
                        uncertain.append({"text": t_clean, "confidence": round(s_float * 100, 1), "engine": "RapidOCR (PaddleOCR ONNX)"})

        mean_conf = round(sum(r_scores) / len(r_scores) * 100, 2) if r_scores else 0.0
        return {
            "engine_name": engine_label,
            "status": "SUCCESS",
            "time": rapid_time,
            "conf": mean_conf,
            "lines": r_lines,
            "boxes": r_boxes,
            "scores": r_scores,
            "uncertain": uncertain,
            "error": None
        }

    @classmethod
    def _run_easy_on_image(cls, image_path: str) -> Dict[str, Any]:
        """Executes EasyOCR on a single image path and returns standardized metrics."""
        reader = cls._get_easyocr_reader()
        if reader is None:
            return {"status": "FAILED", "time": 0.0, "conf": 0.0, "lines": [], "boxes": [], "scores": [], "uncertain": [], "error": "EasyOCR reader instance failed to initialize", "engine_name": "EasyOCR (Secondary / Verification)"}

        t0 = time.perf_counter()
        easy_raw = reader.readtext(image_path)
        easy_time = round(time.perf_counter() - t0, 3)

        e_lines, e_scores, e_boxes, uncertain = [], [], [], []
        for item in easy_raw:
            t_clean = str(item[1]).strip()
            if t_clean:
                s_float = float(item[2])
                e_lines.append(t_clean)
                e_scores.append(s_float)
                e_boxes.append({"text": t_clean, "confidence": round(s_float, 3), "box": _to_json_native(item[0])})
                if s_float < 0.60:
                    uncertain.append({"text": t_clean, "confidence": round(s_float * 100, 1), "engine": "EasyOCR"})

        mean_conf = round(sum(e_scores) / len(e_scores) * 100, 2) if e_scores else 0.0
        return {
            "engine_name": "EasyOCR (Secondary / Verification)",
            "status": "SUCCESS",
            "time": easy_time,
            "conf": mean_conf,
            "lines": e_lines,
            "boxes": e_boxes,
            "scores": e_scores,
            "uncertain": uncertain,
            "error": None
        }

    @staticmethod
    def _resolve_file_path(file_path: str, file_name: str, case_id: Optional[str] = None) -> Optional[str]:
        """Resolves file path to an absolute path on disk with strict per-case isolation."""
        if not file_path:
            return None
        if os.path.isabs(file_path) and os.path.exists(file_path):
            return file_path
        
        # Check relative to current working directory
        if os.path.exists(file_path):
            return os.path.abspath(file_path)
        
        vault_root = Path(settings.STORAGE_VAULT_PATH)
        potential_path = vault_root / file_path
        if potential_path.exists():
            return str(potential_path.resolve())

        # Determine scoped case folder from explicit case_id or parent folder in storage_vault_key
        parent_name = Path(file_path).parent.name
        scoped_dir = case_id or (parent_name if parent_name and parent_name not in (".", vault_root.name) else None)
        stored_basename = Path(file_path).name

        if vault_root.exists() and scoped_dir:
            case_dir = vault_root / scoped_dir
            for candidate_name in dict.fromkeys(filter(None, [stored_basename, file_name])):
                candidate = case_dir / candidate_name
                if candidate.exists():
                    return str(candidate.resolve())
            return None

        # Legacy bare-filename fallback only when no case directory scope exists
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
        
        # 1. Dates (e.g. "07 Oct 2026", "2026-10-07", "07/10/2026", "09-01-2026", "October 7, 2026")
        date_pattern = r'\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4}\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{2,4}\b|\b\d{4}[-/.]\d{2}[-/.]\d{2}\b|\b\d{2}[-/.]\d{2}[-/.]\d{4}\b'
        dates = re.findall(date_pattern, full_text, re.IGNORECASE)
        dates = list(dict.fromkeys([d.strip() for d in dates if len(d.strip()) >= 6]))

        # 2. Times (e.g. "01:23 AM", "4.39 PM", "23:46", "01:23:45 PM")
        time_pattern = r'\b(?:0?[1-9]|1[0-2])[:.][0-5][0-9](?:[:.][0-5][0-9])?\s*(?:AM|PM|am|pm)\b|\b(?:[01]\d|2[0-3]):[0-5][0-9](?::[0-5][0-9])?\b'
        times = re.findall(time_pattern, full_text)
        times = list(dict.fromkeys([t.strip() for t in times]))

        # 3. Currency Amounts (e.g. "₹440", "Rs. 440", "$150.00", "€85", "440.00 INR", or standalone formatted "50,000" in payment context)
        amount_pattern = r'(?:[₹$€£]|Rs\.?|INR)\s*[\d,]+(?:\.\d{1,2})?|\b[\d,]+(?:\.\d{1,2})?\s*(?:INR|rupees|dollars|cents|eur|usd|gbp)\b'
        amounts = re.findall(amount_pattern, full_text, re.IGNORECASE)
        has_txn_context = bool(re.search(r'(?:Paid\s+to|Sent\s+to|Debited\s+from|Credited|Transaction|UTR|UPI\s*ID|Payment\s+started)', full_text, re.IGNORECASE))
        for line in lines:
            l_strip = line.strip()
            m = re.search(r'^[₹$€£]\s*[\d,]+(?:\.\d{1,2})?$', l_strip)
            if m:
                amounts.append(m.group(0).strip())
            elif has_txn_context:
                m_paid = re.match(r'^Paid\s*[₹$€£]?\s*([\d,]{3,}(?:\.\d{1,2})?)$', l_strip, re.IGNORECASE)
                m_fmt = re.match(r'^(\d{1,3}(?:,\d{2,3})+(?:\.\d{1,2})?)$', l_strip)
                if m_paid:
                    val = m_paid.group(1).strip()
                    if any(ch.isdigit() for ch in val):
                        amounts.append(val)
                elif m_fmt:
                    amounts.append(m_fmt.group(1).strip())
        # Normalize duplicates where currency-prefixed form already covers bare numeric form
        cleaned_amounts = []
        for a in [a.strip() for a in amounts if re.search(r'\d', a)]:
            if a not in cleaned_amounts:
                cleaned_amounts.append(a)
        amounts = cleaned_amounts

        # 4. People / Beneficiaries / Names (same-line labeled + multi-line lookahead + salutations)
        people = []
        non_person_re = re.compile(r'UPI|Transaction|Google\s+Transaction|Payment|Account\s*No|Receipt|Support|UNIFIED\s+PAYMENTS|Interface', re.IGNORECASE)
        label_only_person_re = re.compile(r'^(?:Paid\s+to|Sent\s+to|Banking\s+Name|Beneficiary|Received\s+from|Payee|Payer|From|To)\s*:?\s*$', re.IGNORECASE)

        for idx, line in enumerate(lines):
            line_str = line.strip()
            # Same-line labeled: require ':' on bare From/To to avoid false positives like "...agree to the..."
            m = re.search(
                r'(?:(?:Paid\s+to|Sent\s+to|Banking\s+Name|Beneficiary|Received\s+from|Payee|Payer)\s*:?\s+|(?:From|To)\s*:\s*)([A-Za-z][A-Za-z\s\.\-\(\)]{2,55})',
                line_str,
                re.IGNORECASE
            )
            if m:
                val = m.group(1).strip(" :-,•·")
                if val and len(val) >= 3 and not non_person_re.search(val):
                    people.append(val)

            # Multi-line lookahead: "Paid to" -> "Anyadike Emmanuel" or ("MS" badge -> "Mr Debasish Swain")
            if label_only_person_re.match(line_str):
                for j in range(idx + 1, min(idx + 3, len(lines))):
                    cand = lines[j].strip().lstrip(":•·- ").strip()
                    if not cand or re.match(r'^[A-Z]{1,3}$', cand) or cand.upper() == 'UPI':
                        continue
                    if '@' in cand or re.match(r'^[\d₹$€£,\.\-\s]+$', cand):
                        break
                    if non_person_re.search(cand):
                        break
                    if 3 <= len(cand) <= 55 and re.search(r'[A-Za-z]{2,}', cand):
                        people.append(cand)
                        break

            # Salutations: "Mr Debasish Swain", "Dr. A. Sharma"
            m_sal = re.search(r'\b(?:Mr|Mrs|Ms|Dr|Prof)\.?\s+[A-Za-z]+(?:\s+[A-Za-z]+)+', line_str)
            if m_sal:
                val = m_sal.group(0).strip(" :-,•·")
                if val and len(val) >= 4 and not non_person_re.search(val):
                    people.append(val)

        # Deduplicate people cleanly preserving richer name variants
        dedup_people = []
        for p in people:
            p_clean = p.strip(" :-,•·")
            if p_clean and p_clean not in dedup_people:
                dedup_people.append(p_clean)
        people = dedup_people

        # 5. Transaction IDs, Reference Numbers, and UTRs (with multi-line label/value pairing)
        ids = []
        paired_values = set()
        id_label_only_re = re.compile(
            r'^(?:PhonePe\s+Transaction\s*ID|Google\s+Transaction\s*ID|UPI\s+Transaction\s*ID|Transaction\s*ID|Txn\s*ID|TxnId|Ref(?:erence)?\s*(?:ID|No)|Order\s*ID|UTR(?:\s*(?:No|Number))?)\s*:?\s*$',
            re.IGNORECASE
        )
        id_inline_re = re.compile(
            r'(?:PhonePe\s+Transaction\s*ID|Google\s+Transaction\s*ID|UPI\s+Transaction\s*ID|Transaction\s*ID|Txn\s*ID|TxnId|Ref(?:erence)?\s*(?:ID|No)|Order\s*ID)\s*:?\s*([A-Za-z0-9\-_]{6,})',
            re.IGNORECASE
        )

        for idx, line in enumerate(lines):
            line_str = line.strip()
            m_inline = id_inline_re.search(line_str)
            if m_inline:
                ids.append(line_str)
                paired_values.add(m_inline.group(1))
            elif id_label_only_re.match(line_str):
                label_clean = line_str.rstrip(': ').strip()
                best_val = None
                for j in range(idx + 1, min(idx + 4, len(lines))):
                    nxt = lines[j].strip()
                    if re.match(r'^[A-Za-z0-9\-_]{8,40}$', nxt) and not non_person_re.search(nxt) and '@' not in nxt:
                        best_val = nxt
                        break
                if best_val:
                    ids.append(f"{label_clean}: {best_val}")
                    paired_values.add(best_val)
            elif re.search(r'\bUTR[:\s]*([0-9A-Za-z]{10,22})\b', line_str, re.IGNORECASE):
                m_utr = re.search(r'\bUTR[:\s]*([0-9A-Za-z]{10,22})\b', line_str, re.IGNORECASE)
                ids.append(line_str)
                if m_utr:
                    paired_values.add(m_utr.group(1))
            elif re.search(r'\bT\d{18,25}\b', line_str) and line_str not in paired_values:
                ids.append(f"Transaction ID: {line_str}")
                paired_values.add(line_str)
            elif re.search(r'^\d{12}$', line_str) and line_str not in paired_values:
                ids.append(f"UTR: {line_str}")
                paired_values.add(line_str)
        ids = list(dict.fromkeys(ids))

        # 6. UPI IDs (handles lowercase masked 'xxxxxx2972@slc' as well as 'muktadagm-1@okicici')
        upi_pattern = r'[a-zA-Z0-9.\-_Xx*]{2,50}@[a-zA-Z0-9]{2,20}\b'
        upi_candidates = re.findall(upi_pattern, full_text)
        email_tlds = ('.com', '.org', '.net', '.edu', '.gov', '.io', '.in', '.co')
        real_upi = [u for u in upi_candidates if not any(u.lower().endswith(dom) for dom in email_tlds)]
        # Prefer fuller handle when a shorter suffix like '2972@slc' is a strict suffix of 'xxxxxx2972@slc'
        filtered_upi = []
        unique_upi = list(dict.fromkeys(real_upi))
        for u in unique_upi:
            if any((other != u and other.lower().endswith(u.lower())) for other in unique_upi):
                continue
            filtered_upi.append(u)
        upi_ids = filtered_upi

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
        for idx, line in enumerate(lines):
            line_str = line.strip()
            if re.search(r'(?:Debited\s+from|Credited\s+to|Account\s+No|A/c|Bank|YES\s+BANK|HDFC|ICICI|SBI|Axis|Kotak)', line_str, re.IGNORECASE):
                if len(line_str) <= 65 and not any(p in line_str for p in ("Support", "Privacy", "Terms")):
                    # Pair masked account number on next line if label only
                    if re.match(r'^(?:Debited\s+from|Credited\s+to)\s*:?\s*$', line_str, re.IGNORECASE):
                        for j in range(idx + 1, min(idx + 3, len(lines))):
                            nxt = lines[j].strip()
                            if re.match(r'^[Xx*\d]{6,24}$', nxt):
                                banking_details.append(f"{line_str}: {nxt}")
                                break
                        else:
                            banking_details.append(line_str)
                    else:
                        banking_details.append(line_str)
            elif re.match(r'^[Xx*]{4,}\d{4}$', line_str):
                # Masked account number XXXXXXXXXX2570 if not already paired
                if not any(line_str in b for b in banking_details):
                    banking_details.append(line_str)
        banking_details = list(dict.fromkeys(banking_details))

        # 10. Status Signals
        status_signals = []
        status_keywords = (
            "Transaction Successful", "Payment Successful", "Payment Failed", "Transaction Failed",
            "Payment Processing", "Transfer Successful", "Paid Successfully",
            "Payment started", "Payment processed", "Money deposited"
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

        # 12. Tables (Genuine multi-column CSV/delimited rows only; ignore thousands-separator commas in currency!)
        tables = []
        csv_candidates = []
        for l in lines:
            no_num_commas = re.sub(r'(?<=\d),(?=\d{3}\b)', '', l)
            if ',' in no_num_commas:
                cols = [c.strip() for c in no_num_commas.split(',')]
                if len(cols) >= 3:
                    csv_candidates.append(cols)
        if len(csv_candidates) >= 2:
            col_len = len(csv_candidates[0])
            consistent_rows = [r for r in csv_candidates if len(r) == col_len]
            if len(consistent_rows) >= 2:
                tables.append({"headers": consistent_rows[0], "rows": consistent_rows[1:10]})

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
    def run_ocr_pipeline(file_path: str, file_name: str, fast_mode: bool = False, case_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Executes genuine OCR extraction on target evidence file using PaddleOCR/RapidOCR and EasyOCR.
        Never fabricates or hallucinates data.
        Args:
            file_path: Storage vault path on disk.
            file_name: Evidence filename.
            fast_mode: When True (used during synchronous upload ingest), uses RapidOCR ONNX (~1.5s)
                       and skips heavy dual-engine PyTorch EasyOCR pass unless primary fails/empties.
            case_id: Optional case UUID to enforce strict per-case storage resolution.
        """
        logger.info(f"Initiating genuine OCR pipeline for '{file_name}' (path: '{file_path}', fast_mode={fast_mode})")
        
        resolved_path = OCRService._resolve_file_path(file_path, file_name, case_id=case_id)
        file_sha256 = OCRService._calculate_file_sha256(resolved_path)

        ext = os.path.splitext(file_name)[1].lower() if file_name else ""
        exists = resolved_path is not None and os.path.exists(resolved_path)

        paddle_data = {"engine_name": "PaddleOCR (Primary Engine)", "status": "NOT_AVAILABLE", "time": 0.0, "conf": 0.0, "lines": [], "boxes": [], "scores": [], "error": None}
        easy_data = {"engine_name": "EasyOCR (Secondary / Verification)", "status": "NOT_AVAILABLE", "time": 0.0, "conf": 0.0, "lines": [], "boxes": [], "scores": [], "error": None}
        uncertain_extractions = []

        is_image = ext in ('.jpg', '.jpeg', '.png', '.bmp', '.webp', '.tiff', '.gif')

        if not exists:
            err_msg = f"Evidence file '{file_name}' not found at path '{file_path}'"
            logger.error(err_msg)
            comparison = {
                "paddleocr": {"engine_name": "PaddleOCR (Primary Engine)", "status": "FAILED", "inference_time_seconds": 0.0, "confidence_score": 0.0, "detected_blocks_count": 0, "error_message": err_msg},
                "easyocr": {"engine_name": "EasyOCR (Secondary / Verification)", "status": "FAILED", "inference_time_seconds": 0.0, "confidence_score": 0.0, "detected_blocks_count": 0, "error_message": err_msg}
            }
            return {
                "extracted_text": "Error: Evidence file could not be located in storage vault.",
                "bounding_boxes": [],
                "confidence_score": 0.0,
                "file_sha256": file_sha256,
                "cross_engine_agreement": None,
                "raw_paddle_text": "",
                "raw_easy_text": "",
                "extracted_data": {
                    "dates": [], "times": [], "amounts": [], "people": [], "ids": [],
                    "upi_ids": [], "emails": [], "urls": [], "banking_details": [],
                    "status_signals": [], "numbers": [], "tables": [],
                    "uncertain_extractions": [], "file_sha256": file_sha256,
                    "engine_comparison": comparison,
                    "cross_engine_agreement": None,
                    "raw_paddle_text": "",
                    "raw_easy_text": "",
                },
                "comparison": comparison
            }

        raw_paddle_text = ""
        raw_easy_text = ""
        cross_agreement = None
        chosen_lines = []
        chosen_boxes = []
        primary_conf = 0.0

        # =========================================================================
        # 1. IMAGE OCR EXTRACTION (PADDLEOCR / RAPIDOCR & EASYOCR)
        # =========================================================================
        if is_image:
            # --- Engine 1 (Primary): RapidOCR (fast_mode or cloud) / PaddleOCR (full mode) ---
            if fast_mode and RAPIDOCR_AVAILABLE:
                try:
                    paddle_data = OCRService._run_rapid_on_image(resolved_path, "PaddleOCR (RapidOCR ONNX Quick-Ingest)")
                    uncertain_extractions.extend(paddle_data.get("uncertain", []))
                    logger.info(f"RapidOCR quick-ingest completed: {len(paddle_data['lines'])} blocks in {paddle_data['time']}s")
                except Exception as e:
                    logger.error(f"RapidOCR quick-ingest error on '{file_name}': {e}", exc_info=True)
                    paddle_data = {"engine_name": "PaddleOCR (RapidOCR ONNX Quick-Ingest)", "status": "FAILED", "time": 0.0, "conf": 0.0, "lines": [], "boxes": [], "scores": [], "error": str(e)}
            elif PADDLEOCR_AVAILABLE:
                try:
                    paddle_data = OCRService._run_paddle_on_image(resolved_path)
                    uncertain_extractions.extend(paddle_data.get("uncertain", []))
                    logger.info(f"PaddleOCR completed: {len(paddle_data['lines'])} blocks, mean conf: {paddle_data['conf']}%, time: {paddle_data['time']}s")
                    if paddle_data["status"] != "SUCCESS" and RAPIDOCR_AVAILABLE:
                        logger.warning(f"PaddleOCR failed ({paddle_data.get('error')}), falling back to RapidOCR ONNX.")
                        paddle_data = OCRService._run_rapid_on_image(resolved_path, "PaddleOCR (RapidOCR ONNX Fallback)")
                        uncertain_extractions.extend(paddle_data.get("uncertain", []))
                except Exception as e:
                    logger.error(f"PaddleOCR execution error on '{file_name}': {e}", exc_info=True)
                    if RAPIDOCR_AVAILABLE:
                        try:
                            paddle_data = OCRService._run_rapid_on_image(resolved_path, "PaddleOCR (RapidOCR ONNX Fallback)")
                            uncertain_extractions.extend(paddle_data.get("uncertain", []))
                        except Exception as re_err:
                            paddle_data = {"engine_name": "PaddleOCR (Primary Engine)", "status": "FAILED", "time": 0.0, "conf": 0.0, "lines": [], "boxes": [], "scores": [], "error": f"{e} | RapidOCR fallback: {re_err}"}
                    else:
                        paddle_data = {"engine_name": "PaddleOCR (Primary Engine)", "status": "FAILED", "time": 0.0, "conf": 0.0, "lines": [], "boxes": [], "scores": [], "error": str(e)}
            elif RAPIDOCR_AVAILABLE:
                try:
                    paddle_data = OCRService._run_rapid_on_image(resolved_path, "PaddleOCR (RapidOCR ONNX Engine)")
                    uncertain_extractions.extend(paddle_data.get("uncertain", []))
                    logger.info(f"RapidOCR (ONNX) completed: {len(paddle_data['lines'])} blocks, mean conf: {paddle_data['conf']}%, time: {paddle_data['time']}s")
                except Exception as e:
                    logger.error(f"RapidOCR execution error on '{file_name}': {e}", exc_info=True)
                    paddle_data = {"engine_name": "PaddleOCR (RapidOCR ONNX Engine)", "status": "FAILED", "time": 0.0, "conf": 0.0, "lines": [], "boxes": [], "scores": [], "error": str(e)}
            else:
                paddle_data["status"] = "NOT_CONFIGURED"
                paddle_data["error"] = "Neither PaddleOCR nor RapidOCR library is installed in environment."

            # --- Engine 2 (Secondary / Verification): EasyOCR ---
            should_run_easy = (not fast_mode) or (paddle_data["status"] != "SUCCESS") or (not paddle_data["lines"])
            if fast_mode and not should_run_easy:
                easy_data = {
                    "engine_name": "EasyOCR (Secondary / Verification)",
                    "status": "DEFERRED",
                    "time": 0.0,
                    "conf": 0.0,
                    "lines": [],
                    "boxes": [],
                    "scores": [],
                    "error": "Skipped during quick ingest; run Forensic OCR Scanner in Evidence Viewer for dual-engine comparison."
                }
            elif EASYOCR_AVAILABLE:
                try:
                    easy_data = OCRService._run_easy_on_image(resolved_path)
                    for u in easy_data.get("uncertain", []):
                        if not any(x["text"] == u["text"] for x in uncertain_extractions):
                            uncertain_extractions.append(u)
                    logger.info(f"EasyOCR completed: {len(easy_data['lines'])} blocks, mean conf: {easy_data['conf']}%, time: {easy_data['time']}s")
                except Exception as e:
                    logger.error(f"EasyOCR execution error on '{file_name}': {e}", exc_info=True)
                    easy_data = {"engine_name": "EasyOCR (Secondary / Verification)", "status": "FAILED", "time": 0.0, "conf": 0.0, "lines": [], "boxes": [], "scores": [], "error": str(e)}
            else:
                easy_data = {
                    "engine_name": "EasyOCR (Secondary / Verification)",
                    "status": "NOT_AVAILABLE",
                    "time": 0.0,
                    "conf": 0.0,
                    "lines": [],
                    "boxes": [],
                    "scores": [],
                    "error": "EasyOCR is not installed in this runtime environment (Engine 1 PaddleOCR/RapidOCR handled OCR)."
                }

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
        # 2. DOCUMENT PARSING (PDF [with scanned-PDF OCR fallback], DOCX, TXT, BINARY)
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

                if pages_text:
                    parsed_time = round(time.perf_counter() - t0, 3)
                    extracted_text = "\n\n".join(pages_text)
                    primary_conf = 100.0
                    paddle_data = {"engine_name": "PDF Digital Text Stream", "status": "SUCCESS", "time": parsed_time, "conf": primary_conf, "lines": extracted_text.splitlines(), "boxes": [], "scores": [], "error": None}
                    easy_data = {"engine_name": "EasyOCR (Secondary / Verification)", "status": "NOT_AVAILABLE", "time": 0.0, "conf": 0.0, "lines": [], "boxes": [], "scores": [], "error": "Direct embedded PDF text extracted without pixel OCR."}
                    raw_paddle_text, raw_easy_text, cross_agreement, chosen_boxes = extracted_text, "", None, []
                elif PYPDFIUM_AVAILABLE and (RAPIDOCR_AVAILABLE or PADDLEOCR_AVAILABLE or EASYOCR_AVAILABLE):
                    # Scanned / image-only PDF fallback: render pages & run visual OCR
                    pdf_doc = pypdfium2.PdfDocument(resolved_path)
                    scanned_pages, all_page_scores, all_page_boxes = [], [], []
                    try:
                        max_pages = min(len(pdf_doc), 8)
                        for p_idx in range(max_pages):
                            tmp_png = None
                            try:
                                page_obj = pdf_doc[p_idx]
                                bitmap = page_obj.render(scale=2.0)
                                pil_img = bitmap.to_pil()
                                with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tf:
                                    tmp_png = tf.name
                                pil_img.save(tmp_png, format="PNG")
                                if RAPIDOCR_AVAILABLE and (fast_mode or not PADDLEOCR_AVAILABLE):
                                    p_res = OCRService._run_rapid_on_image(tmp_png, "PaddleOCR (RapidOCR ONNX PDF-OCR)")
                                elif PADDLEOCR_AVAILABLE:
                                    p_res = OCRService._run_paddle_on_image(tmp_png)
                                else:
                                    p_res = OCRService._run_easy_on_image(tmp_png)
                                if p_res["lines"]:
                                    scanned_pages.append(f"[Page {p_idx+1}]\n" + "\n".join(p_res["lines"]))
                                    all_page_scores.extend(p_res["scores"])
                                    all_page_boxes.extend(p_res["boxes"])
                                    uncertain_extractions.extend(p_res.get("uncertain", []))
                            finally:
                                if tmp_png and os.path.exists(tmp_png):
                                    try:
                                        os.remove(tmp_png)
                                    except Exception:
                                        pass
                    finally:
                        try:
                            pdf_doc.close()
                        except Exception:
                            pass
                    parsed_time = round(time.perf_counter() - t0, 3)
                    extracted_text = "\n\n".join(scanned_pages) if scanned_pages else "No typographical text detected across rendered PDF pages."
                    primary_conf = round(sum(all_page_scores) / len(all_page_scores) * 100, 2) if all_page_scores else 0.0
                    all_lines = [l for p in scanned_pages for l in p.splitlines()]
                    paddle_data = {"engine_name": "PDF Visual Page OCR", "status": "SUCCESS", "time": parsed_time, "conf": primary_conf, "lines": all_lines, "boxes": all_page_boxes, "scores": all_page_scores, "error": None}
                    easy_data = {"engine_name": "EasyOCR (Secondary / Verification)", "status": "NOT_AVAILABLE", "time": 0.0, "conf": 0.0, "lines": [], "boxes": [], "scores": [], "error": "Single-pass PDF page raster OCR completed."}
                    raw_paddle_text, raw_easy_text, cross_agreement, chosen_boxes = extracted_text, "", None, all_page_boxes
                    chosen_lines = all_lines
                else:
                    parsed_time = round(time.perf_counter() - t0, 3)
                    extracted_text = "No extractable digital text found in PDF document (may be a scanned image)."
                    primary_conf = 0.0
                    paddle_data = {"engine_name": "PDF Digital Text Stream", "status": "SUCCESS", "time": parsed_time, "conf": 0.0, "lines": [], "boxes": [], "scores": [], "error": "PDF contains no selectable text stream."}
                    easy_data = {"engine_name": "EasyOCR (Secondary / Verification)", "status": "NOT_AVAILABLE", "time": 0.0, "conf": 0.0, "lines": [], "boxes": [], "scores": [], "error": "pypdfium2 not installed for PDF page rasterization."}
                    raw_paddle_text, raw_easy_text, cross_agreement, chosen_boxes = "", "", None, []
            except Exception as e:
                extracted_text = f"Error reading PDF document: {e}"
                primary_conf, cross_agreement, chosen_boxes = 0.0, None, []
                paddle_data["status"] = "FAILED"
                paddle_data["error"] = str(e)

        elif ext == '.docx' and DOCX_AVAILABLE:
            t0 = time.perf_counter()
            try:
                doc = docx.Document(resolved_path)
                paras = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
                parsed_time = round(time.perf_counter() - t0, 3)
                extracted_text = "\n".join(paras) if paras else "Empty Word document."
                primary_conf = 100.0 if paras else 0.0
                paddle_data = {"engine_name": "DOCX Stream Parser", "status": "SUCCESS", "time": parsed_time, "conf": primary_conf, "lines": paras, "boxes": [], "scores": [], "error": None}
                easy_data = {"engine_name": "EasyOCR (Secondary / Verification)", "status": "NOT_AVAILABLE", "time": 0.0, "conf": 0.0, "lines": [], "boxes": [], "scores": [], "error": "Direct DOCX stream extracted"}
                raw_paddle_text, raw_easy_text, cross_agreement, chosen_boxes = extracted_text, "", None, []
            except Exception as e:
                extracted_text = f"Error reading Word document: {e}"
                primary_conf, cross_agreement, chosen_boxes = 0.0, None, []
                paddle_data["status"] = "FAILED"
                paddle_data["error"] = str(e)

        elif ext in ('.txt', '.log', '.csv', '.json', '.sql', '.xml', '.html', '.md', '.eml', '.msg', '.py', '.js', '.conf', '.cfg'):
            t0 = time.perf_counter()
            try:
                with open(resolved_path, 'r', encoding='utf-8', errors='ignore') as f:
                    extracted_text = f.read(65536) # Read up to 64KB text
                parsed_time = round(time.perf_counter() - t0, 3)
                primary_conf = 100.0 if extracted_text else 0.0
                paddle_data = {"engine_name": "Direct Plain Text Stream", "status": "SUCCESS", "time": parsed_time, "conf": primary_conf, "lines": extracted_text.splitlines(), "boxes": [], "scores": [], "error": None}
                easy_data = {"engine_name": "EasyOCR (Secondary / Verification)", "status": "NOT_AVAILABLE", "time": 0.0, "conf": 0.0, "lines": [], "boxes": [], "scores": [], "error": "Direct text file stream extracted"}
                raw_paddle_text, raw_easy_text, cross_agreement, chosen_boxes = extracted_text, "", None, []
            except Exception as e:
                extracted_text = f"Error reading text document: {e}"
                primary_conf, cross_agreement, chosen_boxes = 0.0, None, []
                paddle_data["status"] = "FAILED"
                paddle_data["error"] = str(e)

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
                paddle_data = {"engine_name": "Binary ASCII Extractor", "status": "SUCCESS", "time": parsed_time, "conf": primary_conf, "lines": ascii_strings[:200], "boxes": [], "scores": [], "error": None}
                easy_data = {"engine_name": "EasyOCR (Secondary / Verification)", "status": "NOT_AVAILABLE", "time": 0.0, "conf": 0.0, "lines": [], "boxes": [], "scores": [], "error": "Raw binary ASCII dump"}
                raw_paddle_text, raw_easy_text, cross_agreement, chosen_boxes = extracted_text, "", None, []
            except Exception as e:
                extracted_text = f"Error reading binary payload: {e}"
                primary_conf, cross_agreement, chosen_boxes = 0.0, None, []
                paddle_data["status"] = "FAILED"
                paddle_data["error"] = str(e)

        # Extract structured entities genuinely from combined text lines across both engines
        all_unique_lines = []
        for l in (paddle_data["lines"] + easy_data["lines"] + [line.strip() for line in extracted_text.split('\n')]):
            l_clean = l.strip()
            if l_clean and l_clean not in all_unique_lines:
                all_unique_lines.append(l_clean)

        combined_search_text = (extracted_text + "\n" + raw_paddle_text + "\n" + raw_easy_text).strip()
        any_engine_succeeded = (paddle_data["status"] == "SUCCESS") or (easy_data["status"] == "SUCCESS")

        # Only parse entities & threat intelligence if we actually extracted content (not an engine-unavailable error message!)
        from app.services.threat_service import ThreatService
        if any_engine_succeeded and (not is_image or chosen_lines):
            entities = OCRService._extract_entities(combined_search_text, all_unique_lines)
            threat_analysis = ThreatService.analyze_text_content(combined_search_text, file_name)
        else:
            entities = {
                "dates": [], "times": [], "amounts": [], "people": [], "ids": [],
                "upi_ids": [], "emails": [], "urls": [], "banking_details": [],
                "status_signals": [], "numbers": [], "tables": []
            }
            threat_analysis = ThreatService.analyze_text_content("", file_name)

        media_class_info = ThreatService.classify_media_type(
            file_name=file_name,
            ext=ext,
            extracted_text=extracted_text if any_engine_succeeded else "",
            ocr_lines_count=len(paddle_data.get("lines", [])) + len(easy_data.get("lines", []))
        )

        # Distinguish genuine non-text photos vs missing/failed OCR engines!
        if is_image and not chosen_lines:
            if not any_engine_succeeded:
                err_details = " | ".join(filter(None, [paddle_data.get("error"), easy_data.get("error")]))
                extracted_text = f"OCR Engine Unavailable: Could not scan image text ({err_details or 'No OCR engine configured'})."
                media_class_info = {
                    "media_class": "OCR_ENGINE_UNAVAILABLE",
                    "label": "OCR Engine Unavailable / Failed",
                    "is_text_based": False,
                    "ocr_applicable": True,
                    "ocr_explanation": err_details or "Image OCR engines failed or were not available in this environment."
                }
            elif media_class_info["media_class"] == "CRIME_SCENE_MEDIA":
                extracted_text = "Visual Physical Crime Scene Media: Suspected shooting / weapon / physical assault evidence. No typography detected — Optical Character Recognition (OCR) is bypassed for physical scene media."
            else:
                extracted_text = "Visual Scene Photograph (Non-Document): No typographical text detected in image. Optical Character Recognition (OCR) is designed for documents, receipts, and text screenshots, not physical scene photographs."

        comparison = {
            "paddleocr": {
                "engine_name": paddle_data.get("engine_name") or "PaddleOCR (Primary Engine)",
                "status": paddle_data["status"],
                "inference_time_seconds": paddle_data["time"],
                "confidence_score": paddle_data["conf"],
                "detected_blocks_count": len(paddle_data["lines"]),
                "error_message": paddle_data["error"]
            },
            "easyocr": {
                "engine_name": easy_data.get("engine_name") or "EasyOCR (Secondary / Verification)",
                "status": easy_data["status"],
                "inference_time_seconds": easy_data["time"],
                "confidence_score": easy_data["conf"],
                "detected_blocks_count": len(easy_data["lines"]),
                "error_message": easy_data["error"]
            }
        }

        entities["threat_intelligence"] = threat_analysis
        entities["media_classification"] = media_class_info
        entities["threats"] = threat_analysis["flagged_excerpts"]
        entities["uncertain_extractions"] = uncertain_extractions
        entities["file_sha256"] = file_sha256
        entities["engine_comparison"] = comparison
        entities["cross_engine_agreement"] = cross_agreement
        entities["raw_paddle_text"] = raw_paddle_text
        entities["raw_easy_text"] = raw_easy_text

        return _to_json_native({
            "extracted_text": extracted_text,
            "bounding_boxes": chosen_boxes,
            "confidence_score": primary_conf,
            "file_sha256": file_sha256,
            "cross_engine_agreement": cross_agreement,
            "raw_paddle_text": raw_paddle_text,
            "raw_easy_text": raw_easy_text,
            "extracted_data": entities,
            "comparison": comparison
        })
