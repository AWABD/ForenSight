import uuid
import re
from typing import Optional
from sqlalchemy import or_
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.case import Case
from app.utils.logging_config import logger

# Canonical mapping of display identifiers to seeded case numbers
DISPLAY_ALIAS_TO_CASE_NUMBER = {
    "c1": "FS-2026-091",
    "c2": "FS-2026-104",
    "c3": "FS-2026-112",
    "c4": "FS-2026-128",
    "c5": "FS-2026-140",
}

class CaseService:
    @staticmethod
    def is_valid_uuid(val: str) -> bool:
        """
        Returns True if val is a valid RFC 4122 UUID string.
        """
        if not val or not isinstance(val, str):
            return False
        clean_val = val.strip()
        try:
            parsed = uuid.UUID(clean_val)
            # Ensure it matches normalized string representation
            return str(parsed).lower() == clean_val.lower()
        except (ValueError, AttributeError, TypeError):
            return False

    @staticmethod
    def validate_identifier_syntax(identifier: str) -> str:
        """
        Validates syntax of an incoming case identifier to block malformed/injected tokens.
        Raises HTTP 400 if empty, contains path traversal, control chars, or invalid symbols.
        Returns the sanitized, stripped string.
        """
        if identifier is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Case identifier is required."
            )
        
        clean = str(identifier).strip()
        if not clean:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Case identifier cannot be empty."
            )

        if len(clean) > 128:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Case identifier exceeds maximum allowed length of 128 characters."
            )

        # Disallow control characters, path traversal markers, SQL comment markers
        if any(c in clean for c in ['\x00', '\n', '\r', '\t', '\\', '/']) or '..' in clean or clean.startswith('--'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Malformed case identifier. Dangerous or unprintable characters detected."
            )

        # Allow alphanumeric, hyphens, underscores, dots, colons
        if not re.match(r'^[a-zA-Z0-9_\-\.:]+$', clean):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Malformed case identifier format. Only alphanumeric characters, hyphens, underscores, and dots are permitted."
            )

        return clean

    @classmethod
    def resolve_case(cls, db: Session, case_identifier: str) -> Case:
        """
        Resolves a case entity from an identifier which may be:
        1. A valid database UUID (e.g. '91ddaa5c-48a7-4822-b3e7-83265af9f251')
        2. A case number (e.g. 'FS-2026-091' or custom case_number)
        3. A reference number (e.g. 'REF-83893-IND')
        4. A display identifier alias (e.g. 'c1', 'c2', 'c3', 'c4', 'c5')

        CRITICAL FOR POSTGRESQL INTEGRITY:
        Guarantees that a non-UUID string is NEVER cast to a UUID in SQL queries,
        preventing 'psycopg.errors.InvalidTextRepresentation: invalid input syntax for type uuid'.

        Returns the resolved Case ORM instance (guaranteeing case.id is a real database UUID).
        Raises HTTP 400 for malformed input, or HTTP 404 if the case does not exist.
        """
        clean_id = cls.validate_identifier_syntax(case_identifier)

        # 1. UUID branch: Only query Case.id if the input is a valid UUID
        if cls.is_valid_uuid(clean_id):
            case = db.query(Case).filter(Case.id == clean_id).first()
            if case:
                return case
            logger.warning(f"Case lookup failed: UUID '{clean_id}' does not exist in database.")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Case with UUID '{clean_id}' not found."
            )

        # 2. Display Alias branch (e.g. 'c1', 'c2', 'c3', 'c4', 'c5')
        norm_id = clean_id.lower()
        if norm_id in DISPLAY_ALIAS_TO_CASE_NUMBER:
            target_case_num = DISPLAY_ALIAS_TO_CASE_NUMBER[norm_id]
            case = db.query(Case).filter(Case.case_number == target_case_num).first()
            if case:
                logger.info(f"Resolved case display alias '{clean_id}' -> case_number '{target_case_num}' (UUID: {case.id})")
                return case

        # 3. Case Number or Reference Number direct lookup
        case = db.query(Case).filter(
            or_(
                Case.case_number == clean_id,
                Case.reference_number == clean_id,
                Case.case_number == clean_id.upper()
            )
        ).first()
        if case:
            logger.info(f"Resolved case by case_number/ref '{clean_id}' -> UUID '{case.id}'")
            return case

        # 4. Fallback for 'c<number>' alias indexing (e.g. 'c1' -> 1st case, 'c2' -> 2nd case)
        alias_match = re.match(r'^c([1-9]\d*)$', norm_id)
        if alias_match:
            index = int(alias_match.group(1)) - 1
            all_cases = db.query(Case).order_by(Case.created_at.asc()).all()
            if 0 <= index < len(all_cases):
                resolved = all_cases[index]
                logger.info(f"Resolved case index alias '{clean_id}' to case '{resolved.case_number}' (UUID: {resolved.id})")
                return resolved

        # 5. Not found
        logger.warning(f"Case lookup failed: Identifier '{clean_id}' not found.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case '{clean_id}' not found."
        )
