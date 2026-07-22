from fastapi import APIRouter, Depends
from app.models import Hotspot, User, ComplaintStatus
from app.services.storage import ComplaintStore
from app.services.hotspots import build_hotspots
from app.dependencies import get_store, get_current_user
from app.routers.complaints import _filter_complaints_for_user

router = APIRouter(prefix="/hotspots", tags=["hotspots"])

@router.get("", response_model=list[Hotspot])
async def hotspots(
    store: ComplaintStore = Depends(get_store),
    current_user: User = Depends(get_current_user),
) -> list[Hotspot]:
    all_complaints = await store.list()
    active = [c for c in all_complaints if c.status != ComplaintStatus.resolved]
    filtered = _filter_complaints_for_user(active, current_user)
    return build_hotspots(filtered)
