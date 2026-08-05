from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.schemas.user import UserOut

class AuditOut(BaseModel):
    block_id: str
    operator_id: Optional[str] = None
    operator: Optional[UserOut] = None
    action_type: str
    associated_item_id: Optional[str] = None
    record_timestamp: datetime
    previous_block_hash: str
    active_block_hash: str
    signature_proof: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
