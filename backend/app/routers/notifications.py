from __future__ import annotations
from fastapi import APIRouter, Depends
from app.models import User
from app.services.storage import NotificationStore
from app.dependencies import get_notification_store, get_current_user

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.get("")
async def list_notifications(
    current_user: User = Depends(get_current_user),
    notification_store: NotificationStore = Depends(get_notification_store),
) -> list[dict]:
    return await notification_store.list_for_user(current_user.username)

@router.post("/{notification_id}/read")
async def read_notification(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    notification_store: NotificationStore = Depends(get_notification_store),
) -> dict:
    await notification_store.mark_read(notification_id)
    return {"status": "ok"}
