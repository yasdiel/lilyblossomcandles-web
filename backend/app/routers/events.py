from __future__ import annotations

from typing import Any

from fastapi import APIRouter

from ..database import get_db
from ..schemas import EventProductOut
from ..serializers import event_to_dict

router = APIRouter(prefix="/api/events", tags=["eventos"])


@router.get("", response_model=list[EventProductOut])
def list_events() -> list[dict[str, Any]]:
    documents = get_db().events.find({"activo": True}).sort("_id", 1)
    return [event_to_dict(document) for document in documents]
