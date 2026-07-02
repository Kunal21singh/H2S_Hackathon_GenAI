from functools import lru_cache

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

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
from app.services.storage import ComplaintStore


app = FastAPI(title="CivicPulse API", version="0.1.0")


@lru_cache
def get_store() -> ComplaintStore:
    return ComplaintStore(get_settings())


@lru_cache
def get_user_store() -> UserStore:
    return UserStore(get_settings())


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
    photo_bytes = await photo.read() if photo else None
    classification = await classify_complaint(
        settings=settings,
        text=text,
        voice_transcript=voice_transcript,
        photo_bytes=photo_bytes,
        photo_content_type=photo.content_type if photo else None,
        photo_filename=photo.filename if photo else None,
    )
    complaint = Complaint(
        text=text,
        voice_transcript=voice_transcript,
        photo_filename=photo.filename if photo else None,
        photo_content_type=photo.content_type if photo else None,
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


@app.get("/complaints", response_model=list[Complaint])
async def list_complaints(
    store: ComplaintStore = Depends(get_store),
    current_user: User = Depends(get_current_user),
) -> list[Complaint]:
    return sorted(await store.list(), key=lambda item: item.created_at, reverse=True)


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
    return build_hotspots(await store.list())


@app.post("/analytics/query", response_model=AnalyticsAnswer)
async def analytics(
    payload: AnalyticsQuestion,
    settings: Settings = Depends(get_settings),
    store: ComplaintStore = Depends(get_store),
    current_user: User = Depends(get_current_user),
) -> AnalyticsAnswer:
    return await answer_question(settings, payload.question, await store.list())
