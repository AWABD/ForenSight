import os
import hashlib
import re
from pathlib import Path
from fastapi import UploadFile
from app.config import settings
from app.utils.logging_config import logger

class FileService:
    @staticmethod
    def sanitize_filename(filename: str) -> str:
        """
        Sanitizes a filename to protect against path traversal and directory escapes.
        Removes directory paths, relative markers (..), and filters special symbols.
        """
        # Get only the base name
        base_name = os.path.basename(filename)
        # Strip leading/trailing dots or spaces
        base_name = base_name.strip(". ")
        # Remove any path traversal patterns (e.g. "../" or "..\\")
        base_name = re.sub(r'\.\.[/\\]', '', base_name)
        # Retain only safe characters (alphanumeric, dashes, underscores, dots)
        sanitized = re.sub(r'[^a-zA-Z0-9_\-\.]', '_', base_name)
        # Default fallback name if sanitized is empty
        return sanitized if sanitized else "secured_evidence_bytes.bin"

    @staticmethod
    def validate_file_magic_number(filename: str, header_bytes: bytes) -> bool:
        """
        Inspects the binary header (magic number) of a file to check for spoofing.
        Also explicitly bans executable payload signatures (like PE, ELF, or script shebangs).
        """
        ext = Path(filename).suffix.lower()
        
        # 1. Reject explicit executable headers to prevent webshells / raw binaries execution
        # MZ header (Windows PE EXE)
        if header_bytes.startswith(b"MZ"):
            logger.warning(f"File signature validation rejected: Executable PE EXE signature ('MZ') detected in '{filename}'")
            return False
        # ELF header (Linux Executable)
        if header_bytes.startswith(b"\x7fELF"):
            logger.warning(f"File signature validation rejected: ELF Executable binary signature detected in '{filename}'")
            return False
        # Script Shebang (e.g., #!/usr/bin/env php or similar script executions)
        if header_bytes.startswith(b"#!"):
            logger.warning(f"File signature validation rejected: Script shebang execution header ('#!') detected in '{filename}'")
            return False

        # 2. Match specific extension headers
        if ext in [".jpg", ".jpeg"]:
            # Jpeg start marker: FF D8 FF
            if not header_bytes.startswith(b"\xff\xd8\xff"):
                logger.warning(f"File signature mismatch: Jpeg extension with mismatching header on '{filename}'")
                return False
        elif ext == ".png":
            # Png signature: 89 50 4E 47 0D 0A 1A 0A
            if not header_bytes.startswith(b"\x89\x50\x4e\x47\x0d\x0a\x1a\x0a"):
                logger.warning(f"File signature mismatch: Png extension with mismatching header on '{filename}'")
                return False
        elif ext in [".db", ".sqlite"]:
            # SQLite format 3: 53 51 4c 69 74 65 20 66 6f 72 6d 61 74 20 33 00
            if not header_bytes.startswith(b"SQLite format 3\x00"):
                logger.warning(f"File signature mismatch: SQLite database with mismatching header on '{filename}'")
                return False
        elif ext in [".log", ".txt", ".csv", ".eml"]:
            # Ensure text formats contain clean printable characters, no binary control nulls
            if b"\x00" in header_bytes[:512]:
                logger.warning(f"File signature mismatch: Text/log/eml extension with binary null bytes detected on '{filename}'")
                return False
        elif ext == ".pdf":
            # PDF header starts with %PDF
            if not header_bytes.startswith(b"%PDF"):
                logger.warning(f"File signature mismatch: PDF extension with mismatching header on '{filename}'")
                return False
        elif ext in [".zip", ".docx"]:
            # PKWare Zip format header (PK\x03\x04)
            if not header_bytes.startswith(b"PK\x03\x04"):
                logger.warning(f"File signature mismatch: Zip/Docx archive extension with mismatching header on '{filename}'")
                return False
        elif ext == ".msg":
            # Microsoft Outlook MSG format header
            if not header_bytes.startswith(b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"):
                logger.warning(f"File signature mismatch: Outlook MSG extension with mismatching header on '{filename}'")
                return False
                
        return True

    @staticmethod
    def save_and_hash_file(case_id: str, upload_file: UploadFile) -> tuple:
        """
        Saves an uploaded file to the local case directory in the storage vault,
        while checking file signature headers and concurrently hashing contents.
        
        Returns:
            tuple: (absolute_file_path, file_size_bytes, sha256_hash_hex, sha3_hash_hex)
        """
        # Sanitize filename first to prevent path traversal
        sanitized_name = FileService.sanitize_filename(upload_file.filename)
        
        # Create case-specific vault directory
        case_vault = Path(settings.STORAGE_VAULT_PATH) / case_id
        case_vault.mkdir(parents=True, exist_ok=True)

        target_file_path = case_vault / sanitized_name
        
        # Initialize hash contexts
        sha256_hasher = hashlib.sha256()
        sha3_hasher = hashlib.sha3_256() # Built-in since Python 3.6
        
        total_size = 0
        logger.info(f"Starting secure streamed upload processing: '{upload_file.filename}' -> '{sanitized_name}'")

        try:
            # Read first 1024 bytes (header) to validate signature
            header_chunk = upload_file.file.read(1024)
            if not FileService.validate_file_magic_number(sanitized_name, header_chunk):
                raise ValueError("File type signature mismatch. Binary magic number verification failed.")
            
            with open(target_file_path, "wb") as out_file:
                # Write and hash the first header chunk
                if header_chunk:
                    out_file.write(header_chunk)
                    sha256_hasher.update(header_chunk)
                    sha3_hasher.update(header_chunk)
                    total_size += len(header_chunk)
                
                # Read the remaining file in 1MB chunks
                while chunk := upload_file.file.read(1024 * 1024):
                    out_file.write(chunk)
                    sha256_hasher.update(chunk)
                    sha3_hasher.update(chunk)
                    total_size += len(chunk)
            
            logger.info(f"Secure streamed upload completed. Path: {target_file_path}, Size: {total_size} bytes")
        except Exception as e:
            logger.error(f"Error occurred during secure file saving and hashing: {e}")
            if target_file_path.exists():
                os.remove(target_file_path)
            raise e

        return (
            str(target_file_path),
            total_size,
            sha256_hasher.hexdigest(),
            sha3_hasher.hexdigest()
        )

    @staticmethod
    def extract_forensic_metadata(file_name: str, file_path: str) -> dict:
        """
        Mock metadata parser to inspect file headers or extension properties.
        In later phases, this binds to PyTorch/spaCy.
        For now, it returns mock data matching the frontend's expected properties.
        """
        # Ensure we check the sanitized filename
        clean_name = FileService.sanitize_filename(file_name)
        extension = Path(clean_name).suffix.lower()
        metadata = {
            "exif": None,
            "anomalies": []
        }

        # Handle Mock EXIF data for images
        if extension in [".jpg", ".jpeg", ".png"]:
            metadata["exif"] = {
                "camera": "iPhone 13" if "exif" in clean_name.lower() else "Unknown camera body",
                "gps": "28.6139, 77.2090 (New Delhi)" if "exif" in clean_name.lower() else "34.0522, -118.2437 (Los Angeles)",
                "timestamp": "2026-07-28T08:12:00Z"
            }
        elif extension == ".pdf":
            metadata["exif"] = {
                "camera": "Adobe Acrobat PDF Parser",
                "gps": "N/A (Document Metadata)",
                "timestamp": "2026-07-28T09:30:15Z"
            }
        elif extension in [".zip", ".docx"]:
            metadata["exif"] = {
                "camera": "Zip Archive Inspector v1.0",
                "gps": "N/A (Logical Archive)",
                "timestamp": "2026-07-28T10:14:02Z"
            }
        elif extension in [".eml", ".msg"]:
            metadata["exif"] = {
                "camera": "Internet Message Headers Parser",
                "gps": "IP: 192.168.12.93 (Origin)",
                "timestamp": "2026-07-28T08:10:00Z"
            }

        # Mock Anomalies detection matching frontend templates
        file_name_lower = clean_name.lower()
        if "tamper" in file_name_lower:
            metadata["anomalies"].append({
                "type": "METADATA_TAMPERING",
                "severity": "HIGH",
                "message": "EXIF timestamps set 6 years retroactively. File creation date discrepancy."
            })
            metadata["anomalies"].append({
                "type": "IMAGE_FORGERY",
                "severity": "CRITICAL",
                "message": "Double-quantization matrix deviation maps identify clone-stamp modification in bounding box [140, 220, 290, 310]"
            })
        elif "compromised" in file_name_lower or "auth" in file_name_lower:
            metadata["anomalies"].append({
                "type": "FAILED_LOGINS",
                "severity": "CRITICAL",
                "message": "Brute-force signature: 142 failed log-in requests from IP 192.168.12.93 in 2 minutes"
            })
        elif "deepfake" in file_name_lower:
            metadata["anomalies"].append({
                "type": "DEEPFAKE_AUDIO",
                "severity": "CRITICAL",
                "message": "Spectral analysis tags: 98% synthetic voice match with GAN audio generator signature. High similarity index in phase shifts."
            })
        elif "sqlite" in file_name_lower or "db" in file_name_lower:
            metadata["anomalies"].append({
                "type": "DELETED_RECORDS",
                "severity": "HIGH",
                "message": "12 database rows deleted on 2026-07-28 08:14:10 UTC"
            })
        elif "suspicious" in file_name_lower:
            metadata["anomalies"].append({
                "type": "SUSPICIOUS_HEADER",
                "severity": "HIGH",
                "message": "Anomalous byte offsets detected in header stream."
            })

        return metadata
