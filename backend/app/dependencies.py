from functools import lru_cache
from fastapi import Depends, Header, HTTPException
from app.config import Settings, get_settings
from app.models import User
from app.services.auth import UserStore
from app.services.storage import ComplaintStore, NotificationStore

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
