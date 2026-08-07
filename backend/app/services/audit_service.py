import hashlib
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session
from app.models.audit import AuditLedger
from app.utils.logging_config import logger

class AuditService:
    @staticmethod
    def append_audit_event(
        db: Session,
        action_type: str,
        operator_id: Optional[str] = None,
        associated_item_id: Optional[str] = None
    ) -> AuditLedger:
        """
        Calculates the cryptographic block hash link for a new forensic transaction
        and appends it to the immutable audit ledger.
        
        Formula:
            H(B_n) = SHA-256(Data_n || H(B_{n-1}) || Timestamp)
        """
        # Fetch the previous block to construct the hash chain link
        prev_block = db.query(AuditLedger).order_by(AuditLedger.record_timestamp.desc()).first()
        prev_hash = prev_block.active_block_hash if prev_block else "0000000000000000000000000000000000000000"
        
        timestamp = datetime.utcnow()
        timestamp_str = timestamp.isoformat()
        
        # Prepare content string for hashing
        payload = f"{action_type}|{operator_id or ''}|{associated_item_id or ''}|{timestamp_str}|{prev_hash}"
        
        # Compute SHA-256 block hash
        sha = hashlib.sha256()
        sha.update(payload.encode("utf-8"))
        active_hash = sha.hexdigest()

        # Digital signature stub (for court verification compliance)
        signature_proof = hashlib.sha256(f"signature_key_{active_hash}".encode("utf-8")).hexdigest()

        new_block = AuditLedger(
            operator_id=operator_id,
            action_type=action_type,
            associated_item_id=associated_item_id,
            record_timestamp=timestamp,
            previous_block_hash=prev_hash,
            active_block_hash=active_hash,
            signature_proof=signature_proof
        )

        db.add(new_block)
        db.commit()
        db.refresh(new_block)
        
        logger.info(f"Appended block to cryptographic audit ledger: action={action_type}, hash={active_hash[:12]}...")
        return new_block

    @staticmethod
    def verify_ledger_chain(db: Session) -> dict:
        """
        Sequentially iterates through the entire audit ledger chain,
        recomputing the block hashes to verify integrity and detect tampering.
        """
        # Fetch all blocks ordered by timestamp ascending
        blocks = db.query(AuditLedger).order_by(AuditLedger.record_timestamp.asc()).all()
        
        total_blocks = len(blocks)
        verified_blocks = []
        violations = []
        is_valid = True
        
        expected_prev_hash = "0000000000000000000000000000000000000000"
        
        for idx, block in enumerate(blocks):
            block_id = str(block.block_id)
            stored_hash = block.active_block_hash
            prev_hash = block.previous_block_hash
            
            # 1. Check link connection
            link_valid = prev_hash == expected_prev_hash
            if not link_valid:
                violations.append(
                    f"Block {idx} ({block_id}): Chain link broken. "
                    f"Expected previous hash pointer '{expected_prev_hash[:12]}...', "
                    f"but stored previous hash pointer is '{prev_hash[:12]}...'"
                )
                is_valid = False
            
            # 2. Recompute active block hash
            timestamp_str = block.record_timestamp.isoformat()
            payload = f"{block.action_type}|{block.operator_id or ''}|{block.associated_item_id or ''}|{timestamp_str}|{prev_hash}"
            
            sha = hashlib.sha256()
            sha.update(payload.encode("utf-8"))
            recomputed_hash = sha.hexdigest()
            
            payload_valid = stored_hash == recomputed_hash
            if not payload_valid:
                violations.append(
                    f"Block {idx} ({block_id}): Integrity mismatch. "
                    f"Stored active hash is '{stored_hash[:12]}...', "
                    f"but recomputed hash is '{recomputed_hash[:12]}...'"
                )
                is_valid = False
            
            block_valid = link_valid and payload_valid
            
            verified_blocks.append({
                "block_id": block_id,
                "action_type": block.action_type,
                "previous_hash": prev_hash,
                "stored_hash": stored_hash,
                "recomputed_hash": recomputed_hash,
                "is_valid": block_valid
            })
            
            # Update expected pointer for the next iteration to current block's active_block_hash
            expected_prev_hash = stored_hash
            
        return {
            "is_valid": is_valid,
            "total_blocks": total_blocks,
            "verified_blocks": verified_blocks,
            "violations": violations
        }
