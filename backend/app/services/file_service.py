import os
import hashlib
from pathlib import Path
from fastapi import UploadFile
from app.config import settings
from app.utils.logging_config import logger

class FileService:
    @staticmethod
    def save_and_hash_file(case_id: str, upload_file: UploadFile) -> tuple:
        """
        Saves an uploaded file to the local case directory in the storage vault,
        while simultaneously calculating both SHA-256 and SHA3-256 hashes
        in a streaming fashion to prevent high memory usage.
        
        Returns:
            tuple: (absolute_file_path, file_size_bytes, sha256_hash_hex, sha3_hash_hex)
        """
        # Create case-specific vault directory
        case_vault = Path(settings.STORAGE_VAULT_PATH) / case_id
        case_vault.mkdir(parents=True, exist_ok=True)

        target_file_path = case_vault / upload_file.filename
        
        # Initialize hash contexts
        sha256_hasher = hashlib.sha256()
        sha3_hasher = hashlib.sha3_256() # Built-in since Python 3.6
        
        total_size = 0
        logger.info(f"Starting streamed upload processing for: '{upload_file.filename}'")

        try:
            with open(target_file_path, "wb") as out_file:
                # Read file in 1MB chunks
                while chunk := upload_file.file.read(1024 * 1024):
                    out_file.write(chunk)
                    sha256_hasher.update(chunk)
                    sha3_hasher.update(chunk)
                    total_size += len(chunk)
            
            logger.info(f"Streamed upload completed. Path: {target_file_path}, Size: {total_size} bytes")
        except Exception as e:
            logger.error(f"Error occurred during file saving and hashing: {e}")
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
        extension = Path(file_name).suffix.lower()
        metadata = {
            "exif": None,
            "anomalies": []
        }

        # Handle Mock EXIF data for images
        if extension in [".jpg", ".jpeg", ".png"]:
            metadata["exif"] = {
                "camera": "iPhone 13" if "exif" in file_name.lower() else "Unknown camera body",
                "gps": "28.6139, 77.2090 (New Delhi)" if "exif" in file_name.lower() else "34.0522, -118.2437 (Los Angeles)",
                "timestamp": "2026-07-28T08:12:00Z"
            }

        # Mock Anomalies detection matching frontend templates
        file_name_lower = file_name.lower()
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
