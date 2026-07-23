from __future__ import annotations
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4
from pydantic import BaseModel
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.config import Settings, get_settings
from app.models import (
    AdminComplaintUpdate,
    CommentCreate,
    ComplaintTransfer,
    Complaint,
    ComplaintStatus,
    User,
    TimelineEvent,
)
from app.services.ai import DEPARTMENTS, classify_complaint
from app.services.duplicates import find_duplicates, find_duplicates_with_scores
from app.services.storage import ComplaintStore, NotificationStore, log_resolved_complaint
from app.dependencies import get_store, get_user_store, get_notification_store, get_current_user

router = APIRouter(prefix="/complaints", tags=["complaints"])

def _filter_complaints_for_user(complaints: list[Complaint], user: User) -> list[Complaint]:
    user_type = getattr(user, "user_type", "Citizen")
    
    if user_type in ("Prime Minister", "Admin"):
        return complaints
        
    if user_type == "Chief Minister":
        user_state = getattr(user, "state", None)
        if not user_state:
            return []
        return [c for c in complaints if c.state and c.state.strip().lower() == user_state.strip().lower()]
        
    if user_type == "Citizen":
        user_username = getattr(user, "username", "").strip().lower()
        return [
            c for c in complaints 
            if (c.reporter_username and c.reporter_username.strip().lower() == user_username)
            or any(evt.actor and evt.actor.strip().lower() == user_username for evt in (c.timeline or []))
        ]
        
    user_type_lower = user_type.lower()
    departments = []
    
    # 1. Direct / exact name check
    for dept in DEPARTMENTS:
        if dept.lower() in user_type_lower:
            departments.append(dept)
            
    # 2. Smarter substring mapping for fallback / keyword checks
    if not departments:
        # Check clean names without prefix
        for dept in DEPARTMENTS:
            clean_dept = dept.lower().replace("department of", "").strip()
            if clean_dept in user_type_lower or user_type_lower in clean_dept:
                if len(user_type_lower) > 3:
                    departments.append(dept)

        # Keyword mappings for legacy / custom names
        if not departments:
            if "water" in user_type_lower or "drainage" in user_type_lower:
                departments = ["Department of Urban Development and Municipal Affairs"]
            elif "road" in user_type_lower or "public works" in user_type_lower:
                departments = ["Department of Public Works"]
            elif "power" in user_type_lower or "electrical" in user_type_lower:
                departments = ["Department of Power"]
            elif "transport" in user_type_lower or "traffic" in user_type_lower:
                departments = ["Department of Transport"]
            elif "environment" in user_type_lower:
                departments = ["Department of Environment"]
            elif "home" in user_type_lower:
                departments = ["Department of Home and Hill Affairs"]
        
    user_state = getattr(user, "state", None)
    if not user_state:
        return []
    return [
        c for c in complaints 
        if c.classification.department in departments 
        and c.state and c.state.strip().lower() == user_state.strip().lower()
    ]


PRIORITY_WEIGHTS = {"critical": 4, "high": 3, "medium": 2, "low": 1}
STATUS_WEIGHTS = {"in_progress": 3, "routed": 2, "new": 2, "resolved": 1}

def complaint_sort_key(item: Complaint):
    status_str = item.status.value if hasattr(item.status, "value") else str(item.status)
    s_weight = STATUS_WEIGHTS.get(status_str.lower(), 1)
    
    p_str = item.classification.priority.value if (item.classification and hasattr(item.classification.priority, "value")) else str(item.classification.priority if item.classification else "medium")
    p_weight = PRIORITY_WEIGHTS.get(p_str.lower(), 2)
    
    upvotes = getattr(item, "upvotes", 0) or 0
    
    ts = item.created_at.timestamp() if hasattr(item.created_at, "timestamp") else 0
    
    return (s_weight, p_weight, upvotes, ts)


@router.post("", response_model=Complaint)
async def create_complaint(
    text: str = Form(...),
    place: str = Form("Unassigned"),
    state: str | None = Form(None),
    lat: float | None = Form(None),
    lng: float | None = Form(None),
    reporter_name: str | None = Form(None),
    contact: str | None = Form(None),
    voice_transcript: str | None = Form(None),
    photo: UploadFile | None = File(None),
    settings: Settings = Depends(get_settings),
    store: ComplaintStore = Depends(get_store),
    current_user: User = Depends(get_current_user),
) -> Complaint:
    photo_filename = None
    photo_content_type = None
    photo_bytes = None
    if photo and photo.filename:
        photo_bytes = await photo.read()
        ext = Path(photo.filename).suffix or ".jpg"
        photo_filename = f"photo_{uuid4().hex[:10]}{ext}"
        uploads_dir = Path("data/uploads")
        uploads_dir.mkdir(parents=True, exist_ok=True)
        (uploads_dir / photo_filename).write_bytes(photo_bytes)
        photo_content_type = photo.content_type

    classification = await classify_complaint(
        settings=settings,
        text=text,
        voice_transcript=voice_transcript,
        photo_bytes=photo_bytes,
        photo_content_type=photo_content_type,
        photo_filename=photo_filename,
    )
    complaint = Complaint(
        text=text,
        voice_transcript=voice_transcript,
        photo_filename=photo_filename,
        photo_content_type=photo_content_type,
        place=place,
        state=state,
        lat=lat,
        lng=lng,
        reporter_name=reporter_name or current_user.full_name,
        reporter_username=current_user.username,
        contact=contact or current_user.phone,
        classification=classification,
    )
    existing = await store.list()
    duplicate_of, nearby = find_duplicates(complaint, existing)
    complaint.duplicate_of = duplicate_of
    complaint.nearby_duplicate_ids = nearby
    added_complaint = await store.add(complaint)
    
    # Notify reporter
    if getattr(current_user, "telegram_chat_id", None):
        try:
            from app.services.telegram_notifier import send_telegram_notification
            send_telegram_notification(current_user.telegram_chat_id, added_complaint, "created", settings)
        except Exception as e:
            print(f"Telegram create notification trigger error: {e}")
            
    return added_complaint


class DuplicateCheckRequest(BaseModel):
    text: str
    place: str | None = None
    state: str | None = None
    lat: float | None = None
    lng: float | None = None
    category: str | None = None


@router.post("/check-duplicate")
async def check_duplicate_complaint(
    body: DuplicateCheckRequest,
    store: ComplaintStore = Depends(get_store),
    current_user: User = Depends(get_current_user),
):
    from app.services.duplicates import find_duplicates_with_scores
    existing = await store.list()
    matches = find_duplicates_with_scores(
        new_text=body.text,
        place=body.place,
        state=body.state,
        lat=body.lat,
        lng=body.lng,
        category=body.category,
        existing=existing
    )
    return {"has_duplicates": len(matches) > 0, "matches": matches}


@router.post("/{complaint_id}/upvote")
async def upvote_complaint(
    complaint_id: str,
    store: ComplaintStore = Depends(get_store),
    current_user: User = Depends(get_current_user),
):
    complaint = await store.get(complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found.")
    
    complaint.upvotes = getattr(complaint, "upvotes", 0) + 1
    if not complaint.timeline:
        complaint.timeline = []
    
    complaint.timeline.append(TimelineEvent(
        status=complaint.status.value if hasattr(complaint.status, "value") else str(complaint.status),
        timestamp=datetime.now(timezone.utc),
        description=f"Priority upvoted by citizen (@{current_user.username}). Total votes: {complaint.upvotes}.",
        actor=current_user.username
    ))
    
    updated = await store.update(complaint)
    return updated


@router.get("", response_model=list[Complaint])
async def list_complaints(
    store: ComplaintStore = Depends(get_store),
    current_user: User = Depends(get_current_user),
) -> list[Complaint]:
    filtered = _filter_complaints_for_user(await store.list(), current_user)
    return sorted(filtered, key=complaint_sort_key, reverse=True)


@router.patch("/{complaint_id}/status", response_model=Complaint)
async def update_status(
    complaint_id: str,
    status: ComplaintStatus,
    settings: Settings = Depends(get_settings),
    store: ComplaintStore = Depends(get_store),
    current_user: User = Depends(get_current_user),
) -> Complaint:
    complaint = await store.update_status(complaint_id, status)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
        
    # Notify reporter
    if complaint.reporter_username:
        try:
            from app.dependencies import get_user_store
            user_store = get_user_store()
            reporter = user_store.get_by_username(complaint.reporter_username)
            if reporter and reporter.telegram_chat_id:
                from app.services.telegram_notifier import send_telegram_notification
                send_telegram_notification(
                    reporter.telegram_chat_id, 
                    complaint, 
                    "resolved" if status == ComplaintStatus.resolved else "updated", 
                    settings
                )
        except Exception as e:
            print(f"Telegram status update notification error: {e}")
            
    return complaint


@router.post("/{complaint_id}/comments", response_model=Complaint)
async def add_complaint_comment(
    complaint_id: str,
    payload: CommentCreate,
    settings: Settings = Depends(get_settings),
    store: ComplaintStore = Depends(get_store),
    current_user: User = Depends(get_current_user),
) -> Complaint:
    user_type = getattr(current_user, "user_type", "Citizen")
    if user_type in ("Citizen", "Chief Minister", "Prime Minister"):
        raise HTTPException(status_code=403, detail="Only department officials can add comments.")
        
    complaint = await store.add_comment(complaint_id, payload.comment, current_user.username)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
        
    # Notify reporter
    if complaint.reporter_username:
        try:
            from app.dependencies import get_user_store
            user_store = get_user_store()
            reporter = user_store.get_by_username(complaint.reporter_username)
            if reporter and reporter.telegram_chat_id:
                from app.services.telegram_notifier import send_telegram_notification
                send_telegram_notification(
                    reporter.telegram_chat_id, 
                    complaint, 
                    "updated", 
                    settings
                )
        except Exception as e:
            print(f"Telegram comment update notification error: {e}")
            
    return complaint


@router.post("/{complaint_id}/transfer", response_model=Complaint)
async def transfer_complaint_dept(
    complaint_id: str,
    payload: ComplaintTransfer,
    settings: Settings = Depends(get_settings),
    store: ComplaintStore = Depends(get_store),
    current_user: User = Depends(get_current_user),
) -> Complaint:
    complaint = await store.get(complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
        
    # Verify permission: Admin or Officer belonging to the complaint's CURRENT department
    is_admin = getattr(current_user, "user_type", "") == "Admin"
    is_authorized = is_admin
    
    if not is_authorized:
        user_type_lower = current_user.user_type.lower()
        curr_dept = complaint.classification.department.lower()
        clean_curr = curr_dept.replace("department of", "").strip()
        if clean_curr in user_type_lower:
            is_authorized = True
            
    if not is_authorized:
        raise HTTPException(status_code=403, detail="Not authorized to transfer this complaint.")
        
    updated_complaint = await store.transfer(
        complaint_id, 
        payload.new_department, 
        payload.reason, 
        current_user.username
    )
    if not updated_complaint:
        raise HTTPException(status_code=404, detail="Complaint not found during update")

    # Notify reporter
    if updated_complaint.reporter_username:
        try:
            from app.dependencies import get_user_store
            user_store = get_user_store()
            reporter = user_store.get_by_username(updated_complaint.reporter_username)
            if reporter and reporter.telegram_chat_id:
                from app.services.telegram_notifier import send_telegram_notification
                send_telegram_notification(
                    reporter.telegram_chat_id, 
                    updated_complaint, 
                    "updated", 
                    settings
                )
        except Exception as e:
            print(f"Telegram transfer notification error: {e}")
            
    return updated_complaint


@router.post("/{complaint_id}/complete", response_model=Complaint)
async def complete_complaint(
    complaint_id: str,
    resolution_photo: UploadFile = File(...),
    settings: Settings = Depends(get_settings),
    store: ComplaintStore = Depends(get_store),
    notification_store: NotificationStore = Depends(get_notification_store),
    current_user: User = Depends(get_current_user),
) -> Complaint:
    user_type = getattr(current_user, "user_type", "Citizen")
    if user_type == "Citizen":
        raise HTTPException(status_code=403, detail="Citizens cannot resolve complaints.")
        
    photo_bytes = await resolution_photo.read()
    ext = Path(resolution_photo.filename).suffix or ".jpg"
    filename = f"resolution_{uuid4().hex[:10]}{ext}"
    uploads_dir = Path("data/uploads")
    uploads_dir.mkdir(parents=True, exist_ok=True)
    (uploads_dir / filename).write_bytes(photo_bytes)
    
    complaint = await store.complete_complaint(
        complaint_id=complaint_id,
        filename=filename,
        content_type=resolution_photo.content_type,
        completed_by=current_user.username
    )
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
        
    # Log to tracking CSV file
    try:
        log_resolved_complaint(complaint)
    except Exception as e:
        print(f"Error logging to CSV: {e}")
        
    # Send/store notification for the reporter
    if complaint.reporter_username:
        try:
            notification = {
                "id": f"not_{uuid4().hex[:10]}",
                "recipient_username": complaint.reporter_username,
                "title": "Complaint Resolved",
                "message": f"Your complaint regarding '{complaint.classification.summary}' has been marked as completed by @{current_user.username}.",
                "complaint_id": complaint.id,
                "photo_filename": filename,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "read": False
            }
            await notification_store.add(notification)
            
            # Send Telegram notification
            try:
                from app.dependencies import get_user_store
                user_store = get_user_store()
                reporter = user_store.get_by_username(complaint.reporter_username)
                if reporter and reporter.telegram_chat_id:
                    from app.services.telegram_notifier import send_telegram_notification
                    send_telegram_notification(
                        reporter.telegram_chat_id, 
                        complaint, 
                        "resolved", 
                        settings
                    )
            except Exception as tg_err:
                print(f"Telegram complete notification trigger error: {tg_err}")
        except Exception as e:
            print(f"Error creating notification: {e}")
            
    return complaint


@router.delete("/{complaint_id}")
async def delete_complaint(
    complaint_id: str,
    store: ComplaintStore = Depends(get_store),
    current_user: User = Depends(get_current_user),
):
    if getattr(current_user, "user_type", "Citizen") != "Admin":
        raise HTTPException(status_code=403, detail="Only admins can delete complaints.")
    success = await store.delete_complaint(complaint_id)
    if not success:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return {"message": "Complaint deleted successfully."}


@router.patch("/{complaint_id}", response_model=Complaint)
async def admin_modify_complaint(
    complaint_id: str,
    payload: AdminComplaintUpdate,
    settings: Settings = Depends(get_settings),
    store: ComplaintStore = Depends(get_store),
    current_user: User = Depends(get_current_user),
) -> Complaint:
    if getattr(current_user, "user_type", "Citizen") != "Admin":
        raise HTTPException(status_code=403, detail="Only admins can modify complaints.")
    
    complaint = await store.admin_modify(complaint_id, payload)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
        
    # Notify reporter
    if complaint.reporter_username:
        try:
            from app.dependencies import get_user_store
            user_store = get_user_store()
            reporter = user_store.get_by_username(complaint.reporter_username)
            if reporter and reporter.telegram_chat_id:
                from app.services.telegram_notifier import send_telegram_notification
                send_telegram_notification(
                    reporter.telegram_chat_id, 
                    complaint, 
                    "updated", 
                    settings
                )
        except Exception as e:
            print(f"Telegram admin_modify notification error: {e}")
            
    return complaint
