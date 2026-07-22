from fastapi import APIRouter, Depends
from app.config import Settings, get_settings
from app.models import AnalyticsQuestion, AnalyticsAnswer, User
from app.services.storage import ComplaintStore
from app.services.analytics import answer_question
from app.dependencies import get_store, get_current_user
from app.routers.complaints import _filter_complaints_for_user

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.post("/query", response_model=AnalyticsAnswer)
async def analytics(
    payload: AnalyticsQuestion,
    settings: Settings = Depends(get_settings),
    store: ComplaintStore = Depends(get_store),
    current_user: User = Depends(get_current_user),
) -> AnalyticsAnswer:
    filtered = _filter_complaints_for_user(await store.list(), current_user)
    return await answer_question(settings, payload.question, filtered)
