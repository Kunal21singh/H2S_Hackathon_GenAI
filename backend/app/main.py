from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from uuid import uuid4

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from app.config import Settings, get_settings
from app.models import (
    AnalyticsAnswer,
    AnalyticsQuestion,
    AuthSession,
    Complaint,
    ComplaintStatus,
    Hotspot,
    User,
    UserLogin,
    UserPublic,
    UserRegister,
)
from app.services.ai import classify_complaint
from app.services.analytics import answer_question
from app.services.auth import UserStore
from app.services.duplicates import find_duplicates
from app.services.hotspots import build_hotspots
from app.services.storage import ComplaintStore, NotificationStore, log_resolved_complaint


app = FastAPI(title="CivicPulse API", version="0.1.0")


@lru_cache
def get_store() -> ComplaintStore:
    return ComplaintStore(get_settings())


@lru_cache
def get_user_store() -> UserStore:
    return UserStore(get_settings())


@lru_cache
def get_notification_store() -> NotificationStore:
    return NotificationStore(get_settings())


def get_current_user(
    authorization: str | None = Header(None),
    user_store: UserStore = Depends(get_user_store),
) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Login required.")
    token = authorization.split(" ", 1)[1].strip()
    return user_store.user_from_token(token)


settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health(settings: Settings = Depends(get_settings)) -> dict[str, str | bool]:
    return {
        "status": "ok",
        "environment": settings.app_env,
        "gemini_configured": bool(settings.google_api_key),
        "firestore_enabled": settings.use_firestore,
    }


@app.post("/auth/register", response_model=AuthSession)
async def register(payload: UserRegister, user_store: UserStore = Depends(get_user_store)) -> AuthSession:
    public_user = user_store.register(payload)
    user = user_store.get_by_username(public_user.username)
    return AuthSession(token=user_store.create_token(user), user=public_user)


@app.post("/auth/login", response_model=AuthSession)
async def login(payload: UserLogin, user_store: UserStore = Depends(get_user_store)) -> AuthSession:
    user = user_store.login(payload)
    return AuthSession(token=user_store.create_token(user), user=UserPublic(**user.model_dump(exclude={"password_hash"})))


@app.get("/auth/me", response_model=UserPublic)
async def me(current_user: User = Depends(get_current_user)) -> UserPublic:
    return UserPublic(**current_user.model_dump(exclude={"password_hash"}))


@app.post("/complaints", response_model=Complaint)
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
    return await store.add(complaint)


def _filter_by_user_department(complaints: list[Complaint], user_type: str) -> list[Complaint]:
    user_type = user_type or "Citizen"
    if user_type == "Citizen":
        return complaints
        
    user_type_lower = user_type.lower()
    if "water" in user_type_lower:
        departments = ["Water Works", "Drainage"]
    elif "road" in user_type_lower:
        departments = ["Roads"]
    elif "fire" in user_type_lower:
        departments = ["Fire Department", "Traffic"]
    elif "sanitation" in user_type_lower:
        departments = ["Sanitation"]
    elif "electrical" in user_type_lower:
        departments = ["Electrical"]
    else:
        departments = []
        
    return [c for c in complaints if c.classification.department in departments]


@app.get("/complaints", response_model=list[Complaint])
async def list_complaints(
    store: ComplaintStore = Depends(get_store),
    current_user: User = Depends(get_current_user),
) -> list[Complaint]:
    user_type = getattr(current_user, "user_type", "Citizen")
    filtered = _filter_by_user_department(await store.list(), user_type)
    return sorted(filtered, key=lambda item: item.created_at, reverse=True)


@app.patch("/complaints/{complaint_id}/status", response_model=Complaint)
async def update_status(
    complaint_id: str,
    status: ComplaintStatus,
    store: ComplaintStore = Depends(get_store),
    current_user: User = Depends(get_current_user),
) -> Complaint:
    complaint = await store.update_status(complaint_id, status)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return complaint


@app.get("/hotspots", response_model=list[Hotspot])
async def hotspots(
    store: ComplaintStore = Depends(get_store),
    current_user: User = Depends(get_current_user),
) -> list[Hotspot]:
    user_type = getattr(current_user, "user_type", "Citizen")
    all_complaints = await store.list()
    active = [c for c in all_complaints if c.status != ComplaintStatus.resolved]
    filtered = _filter_by_user_department(active, user_type)
    return build_hotspots(filtered)


@app.post("/analytics/query", response_model=AnalyticsAnswer)
async def analytics(
    payload: AnalyticsQuestion,
    settings: Settings = Depends(get_settings),
    store: ComplaintStore = Depends(get_store),
    current_user: User = Depends(get_current_user),
) -> AnalyticsAnswer:
    user_type = getattr(current_user, "user_type", "Citizen")
    filtered = _filter_by_user_department(await store.list(), user_type)
    return await answer_question(settings, payload.question, filtered)


@app.get("/uploads/{filename}")
async def get_uploaded_file(filename: str):
    file_path = Path("data/uploads") / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    media_type = "image/jpeg"
    if filename.lower().endswith(".png"):
        media_type = "image/png"
    elif filename.lower().endswith(".gif"):
        media_type = "image/gif"
    elif filename.lower().endswith(".webp"):
        media_type = "image/webp"
        
    return FileResponse(file_path, media_type=media_type)


@app.post("/complaints/{complaint_id}/complete", response_model=Complaint)
async def complete_complaint(
    complaint_id: str,
    resolution_photo: UploadFile = File(...),
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
        except Exception as e:
            print(f"Error creating notification: {e}")
            
    return complaint


@app.get("/notifications")
async def list_notifications(
    current_user: User = Depends(get_current_user),
    notification_store: NotificationStore = Depends(get_notification_store),
) -> list[dict]:
    return await notification_store.list_for_user(current_user.username)


@app.post("/notifications/{notification_id}/read")
async def read_notification(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    notification_store: NotificationStore = Depends(get_notification_store),
) -> dict:
    await notification_store.mark_read(notification_id)
    return {"status": "ok"}
