import sys
import os

# Ensure the parent backend directory is in python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.services.audit_service import AuditService

def main():
    print("======================================================================")
    print("           ForenSight Cryptographic Audit Ledger Verification          ")
    print("======================================================================")
    print("[*] Connecting to PostgreSQL database...")
    
    db = SessionLocal()
    try:
        print("[*] Retrieving ledger blocks and recomputing SHA-256 chain...")
        report = AuditService.verify_ledger_chain(db)
        
        total = report["total_blocks"]
        is_valid = report["is_valid"]
        verified_blocks = report["verified_blocks"]
        violations = report["violations"]
        
        print(f"[*] Total Blocks Found: {total}")
        print("----------------------------------------------------------------------")
        
        for idx, detail in enumerate(verified_blocks):
            status_str = "VALID" if detail["is_valid"] else "INVALID / TAMPERED"
            print(f"Block #{idx:03d} | ID: {detail['block_id']} | Action: {detail['action_type']:<24} | Stored: {detail['stored_hash'][:12]}... | Recomputed: {detail['recomputed_hash'][:12]}... | [{status_str}]")
            
        print("----------------------------------------------------------------------")
        if is_valid:
            print("\033[92m[+] SUCCESS: Cryptographic Chain of Custody is 100% intact and verified.\033[0m")
            print("======================================================================")
            sys.exit(0)
        else:
            print("\033[91m[!] CRITICAL ERROR: Ledger chain corruption detected!\033[0m")
            for violation in violations:
                print(f"  - \033[91m{violation}\033[0m")
            print("======================================================================")
            sys.exit(1)
            
    except Exception as e:
        print(f"\033[91m[!] Error running ledger verification: {str(e)}\033[0m")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    main()
