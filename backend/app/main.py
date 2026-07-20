from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from uuid import uuid4

from pydantic import BaseModel

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from app.config import Settings, get_settings
from app.models import (
    AdminComplaintUpdate,
    AnalyticsAnswer,
    AnalyticsQuestion,
    AuthSession,
    CommentCreate,
    ComplaintTransfer,
    Complaint,
    ComplaintStatus,
    Hotspot,
    User,
    UserLogin,
    UserPublic,
    UserRegister,
)
from app.services.ai import DEPARTMENTS, classify_complaint
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


@app.post("/ai/analyze-image")
async def analyze_image(
    photo: UploadFile = File(...),
    settings: Settings = Depends(get_settings),
) -> dict[str, str]:
    photo_bytes = await photo.read()

    # 1. Try Vertex AI Gemini (Uses GCP Credits)
    if settings.google_cloud_project:
        try:
            import vertexai
            from vertexai.generative_models import GenerativeModel, Part

            vertexai.init(project=settings.google_cloud_project, location="us-central1")
            model = GenerativeModel("gemini-2.5-flash")
            
            prompt = (
                "Describe the civic grievance, municipal issue, infrastructure damage, or public disturbance shown in this image. "
                "Act as a citizen reporting this issue to their local municipal corporation. "
                "Write a concise, professional description of 1 to 3 sentences detailing the problem (e.g. 'A deep pothole has formed on the road lane, filled with rain water and causing vehicle hazards. It needs urgent paving.'). "
                "Return only the plain description text without any markdown or conversational filler."
            )
            
            payload = [
                prompt,
                Part.from_data(data=photo_bytes, mime_type=photo.content_type or "image/jpeg")
            ]
            
            response = await model.generate_content_async(payload)
            return {"description": response.text.strip()}
        except Exception as e:
            print(f"Vertex AI image analysis failed: {e}")

    # 2. Try Google AI Studio Gemini API
    if settings.google_api_key:
        try:
            import google.generativeai as genai

            genai.configure(api_key=settings.google_api_key)
            model = genai.GenerativeModel("gemini-2.5-flash")
            
            prompt = (
                "Describe the civic grievance, municipal issue, infrastructure damage, or public disturbance shown in this image. "
                "Act as a citizen reporting this issue to their local municipal corporation. "
                "Write a concise, professional description of 1 to 3 sentences detailing the problem (e.g. 'A deep pothole has formed on the road lane, filled with rain water and causing vehicle hazards. It needs urgent paving.'). "
                "Return only the plain description text without any markdown or conversational filler."
            )
            
            payload = [
                prompt,
                {
                    "mime_type": photo.content_type or "image/jpeg",
                    "data": photo_bytes,
                }
            ]
            
            response = await model.generate_content_async(payload)
            return {"description": response.text.strip()}
        except Exception as e:
            return {"description": f"Failed to auto-describe image with AI Studio: {str(e)}"}

    return {"description": "Upload successful. (Auto-description requires Vertex AI or Google AI key)"}



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

@app.post("/complaints/check-duplicate")
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


@app.post("/complaints/{complaint_id}/upvote")
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
    
    from app.models import TimelineEvent
    complaint.timeline.append(TimelineEvent(
        status=complaint.status.value if hasattr(complaint.status, "value") else str(complaint.status),
        timestamp=datetime.now(timezone.utc),
        description=f"Priority upvoted by citizen (@{current_user.username}). Total votes: {complaint.upvotes}.",
        actor=current_user.username
    ))
    
    updated = await store.update(complaint)
    return updated


class AIChatRequest(BaseModel):
    message: str

@app.post("/ai/chat")
async def ai_assistant_chat(
    body: AIChatRequest,
    store: ComplaintStore = Depends(get_store),
    current_user: User = Depends(get_current_user),
):
    user_msg = body.message.strip()
    if not user_msg:
        raise HTTPException(status_code=400, detail="Empty query.")
    
    complaints = await store.list()
    user_complaints = [c for c in complaints if c.reporter_username == current_user.username]
    total_count = len(complaints)
    active_count = len([c for c in complaints if c.status.value != "resolved" and not c.duplicate_of])
    resolved_count = len([c for c in complaints if c.status.value == "resolved"])
    
    user_msg_lower = user_msg.lower()
    
    if "my complaint" in user_msg_lower or "my status" in user_msg_lower or "my report" in user_msg_lower:
        if not user_complaints:
            reply = f"Hello @{current_user.username}! You currently have no filed complaints in the system. Use the '+ New Complaint' button to report an issue!"
        else:
            latest = user_complaints[-1]
            dept = latest.classification.department if latest.classification else "Unassigned"
            reply = f"Hello @{current_user.username}! Your most recent grievance is #{latest.id} ('{latest.text[:50]}...').\n• Status: {latest.status.value.upper()}\n• Department: {dept}\n• Date: {latest.created_at.strftime('%b %d, %Y')}"
            if latest.status.value == "resolved":
                reply += f"\n• Resolution Proof verified by @{latest.completed_by or 'Officer'}."

    elif "resolution rate" in user_msg_lower or "best state" in user_msg_lower or "performance" in user_msg_lower:
        states_map = {}
        for c in complaints:
            st = c.state or "West Bengal"
            if st not in states_map:
                states_map[st] = {"total": 0, "resolved": 0}
            states_map[st]["total"] += 1
            if c.status.value == "resolved":
                states_map[st]["resolved"] += 1
        
        top_state = None
        best_rate = -1
        for st, counts in states_map.items():
            rate = round((counts["resolved"] / max(counts["total"], 1)) * 100, 1)
            if rate > best_rate:
                best_rate = rate
                top_state = st
        
        reply = f"📊 System Performance Overview:\n• Total Complaints: {total_count}\n• Active Cases: {active_count}\n• Resolved Cases: {resolved_count}\n• Top Performing State: {top_state or 'West Bengal'} ({best_rate}% resolution rate)."

    elif "how to report" in user_msg_lower or "file" in user_msg_lower or "help" in user_msg_lower:
        reply = "💡 How to file a civic grievance:\n1. Click '+ New Complaint' in your dashboard.\n2. Type your grievance description or click the Microphone 🎙️ to dictate using voice-to-text.\n3. (Optional) Attach photo evidence.\n4. CivicPulse AI auto-classifies department, detects duplicates, and assigns priority!"

    elif "department" in user_msg_lower or "public works" in user_msg_lower or "water" in user_msg_lower:
        dept_counts = {}
        for c in complaints:
            d = c.classification.department if c.classification else "Other"
            dept_counts[d] = dept_counts.get(d, 0) + 1
        top_dept = max(dept_counts.items(), key=lambda x: x[1])[0] if dept_counts else "Public Works"
        reply = f"🏛️ Department Insights:\n• Most active department: {top_dept} ({dept_counts.get(top_dept, 0)} cases).\n• Total monitored departments: 27.\n• AI auto-routes all incoming complaints to the responsible authority with high precision."

    else:
        reply = f"🤖 Civic AI Assistant:\nI processed your query: '{user_msg}'. Currently monitoring {total_count} civic complaints ({active_count} active, {resolved_count} resolved). You can ask me about your complaint status, department performance, or how to file a grievance!"

    return {"response": reply, "timestamp": datetime.now(timezone.utc).isoformat()}


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


@app.get("/complaints", response_model=list[Complaint])
async def list_complaints(
    store: ComplaintStore = Depends(get_store),
    current_user: User = Depends(get_current_user),
) -> list[Complaint]:
    filtered = _filter_complaints_for_user(await store.list(), current_user)
    return sorted(filtered, key=complaint_sort_key, reverse=True)


@app.patch("/complaints/{complaint_id}/status", response_model=Complaint)
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


@app.post("/complaints/{complaint_id}/comments", response_model=Complaint)
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


@app.post("/complaints/{complaint_id}/transfer", response_model=Complaint)
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


@app.get("/hotspots", response_model=list[Hotspot])
async def hotspots(
    store: ComplaintStore = Depends(get_store),
    current_user: User = Depends(get_current_user),
) -> list[Hotspot]:
    all_complaints = await store.list()
    active = [c for c in all_complaints if c.status != ComplaintStatus.resolved]
    filtered = _filter_complaints_for_user(active, current_user)
    return build_hotspots(filtered)


@app.post("/analytics/query", response_model=AnalyticsAnswer)
async def analytics(
    payload: AnalyticsQuestion,
    settings: Settings = Depends(get_settings),
    store: ComplaintStore = Depends(get_store),
    current_user: User = Depends(get_current_user),
) -> AnalyticsAnswer:
    filtered = _filter_complaints_for_user(await store.list(), current_user)
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


@app.get("/auth/users", response_model=list[UserPublic])
async def list_users(
    user_store: UserStore = Depends(get_user_store),
    current_user: User = Depends(get_current_user),
) -> list[UserPublic]:
    if getattr(current_user, "user_type", "Citizen") != "Admin":
        raise HTTPException(status_code=403, detail="Only admins can list users.")
    return user_store.list_users()


@app.delete("/auth/users/{username}")
async def delete_user(
    username: str,
    user_store: UserStore = Depends(get_user_store),
    current_user: User = Depends(get_current_user),
):
    if getattr(current_user, "user_type", "Citizen") != "Admin":
        raise HTTPException(status_code=403, detail="Only admins can delete users.")
    success = user_store.delete_user(username)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted successfully."}


@app.delete("/complaints/{complaint_id}")
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


@app.patch("/complaints/{complaint_id}", response_model=Complaint)
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
