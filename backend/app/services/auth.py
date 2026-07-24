from __future__ import annotations
import base64
import hashlib
import hmac
import json
import secrets
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, status

from app.config import Settings
from app.models import User, UserLogin, UserPublic, UserRegister


class UserStore:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.local_path = Path(settings.local_users_path)
        self._firestore_client = None
        if settings.use_firestore:
            try:
                from google.cloud import firestore
                self._firestore_client = firestore.Client(project=settings.google_cloud_project)
            except Exception:
                self._firestore_client = None

    def register(self, payload: UserRegister) -> UserPublic:
        username = _normalize_username(payload.username)
        
        if self._firestore_client:
            doc_ref = self._firestore_client.collection("users").document(username)
            if doc_ref.get().exists:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username is already taken.")
        else:
            users = self._read_users()
            if any(user.username.lower() == username for user in users):
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username is already taken.")

        user = User(
            id=f"usr_{uuid4().hex[:10]}",
            username=username,
            full_name=payload.full_name.strip(),
            phone=_normalize_phone(payload.phone),
            user_type=payload.user_type,
            state=payload.state,
            telegram_chat_id=payload.telegram_chat_id,
            is_active=True,
            password_hash=_hash_password(payload.password),
            created_at=datetime.now(timezone.utc),
        )
        
        if self._firestore_client:
            self._firestore_client.collection("users").document(username).set(
                user.model_dump(mode="json")
            )
        else:
            users.append(user)
            self._write_users(users)
            
        return _public_user(user)

    def login(self, payload: UserLogin) -> User:
        username = _normalize_username(payload.username)
        if self._firestore_client:
            doc = self._firestore_client.collection("users").document(username).get()
            if doc.exists:
                user = User.model_validate(doc.to_dict())
                if _verify_password(payload.password, user.password_hash):
                    if not user.is_active:
                        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is not active.")
                    return user
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password.")
            
        for user in self._read_users():
            if user.username.lower() == username and _verify_password(payload.password, user.password_hash):
                if not user.is_active:
                    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is not active.")
                return user
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password.")

    def get_by_username(self, username: str) -> User:
        normalized = _normalize_username(username)
        if self._firestore_client:
            doc = self._firestore_client.collection("users").document(normalized).get()
            if doc.exists:
                user = User.model_validate(doc.to_dict())
                if not user.is_active:
                    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is not active.")
                return user
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired session.")
            
        for user in self._read_users():
            if user.username.lower() == normalized:
                if not user.is_active:
                    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is not active.")
                return user
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired session.")

    def create_token(self, user: User) -> str:
        payload = f"{user.username}:{int(datetime.now(timezone.utc).timestamp())}"
        signature = hmac.new(self.settings.auth_secret.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()
        token = f"{payload}:{signature}"
        return base64.urlsafe_b64encode(token.encode("utf-8")).decode("ascii")

    def user_from_token(self, token: str) -> User:
        try:
            decoded = base64.urlsafe_b64decode(token.encode("ascii")).decode("utf-8")
            username, issued_at, signature = decoded.rsplit(":", 2)
        except Exception as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session token.") from exc

        payload = f"{username}:{issued_at}"
        expected = hmac.new(self.settings.auth_secret.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session token.")
        return self.get_by_username(username)

    def list_users(self) -> list[UserPublic]:
        return [_public_user(u) for u in self._read_users()]

    def delete_user(self, username: str) -> bool:
        normalized = _normalize_username(username)
        if self._firestore_client:
            doc_ref = self._firestore_client.collection("users").document(normalized)
            if doc_ref.get().exists:
                doc_ref.delete()
                return True
            return False
            
        users = self._read_users()
        updated = [u for u in users if u.username.lower() != normalized]
        if len(updated) == len(users):
            return False
        self._write_users(updated)
        return True

    def update_profile(self, username: str, full_name: str | None, phone: str | None, state: str | None, telegram_chat_id: str | None) -> UserPublic:
        normalized = _normalize_username(username)
        users = self._read_users()
        target_user: User | None = None
        
        for user in users:
            if user.username.lower() == normalized:
                if full_name and full_name.strip():
                    user.full_name = full_name.strip()
                if phone and phone.strip():
                    user.phone = _normalize_phone(phone)
                if state is not None:
                    user.state = state.strip() if state else None
                if telegram_chat_id is not None:
                    user.telegram_chat_id = telegram_chat_id.strip() if telegram_chat_id else None
                target_user = user
                break
                
        if not target_user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
            
        self._write_users(users)
        return _public_user(target_user)

    def change_password(self, username: str, old_password: str, new_password: str) -> UserPublic:
        normalized = _normalize_username(username)
        users = self._read_users()
        target_user: User | None = None
        
        for user in users:
            if user.username.lower() == normalized:
                if not _verify_password(old_password, user.password_hash):
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect.")
                user.password_hash = _hash_password(new_password)
                target_user = user
                break
                
        if not target_user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
            
        self._write_users(users)
        return _public_user(target_user)

    def _read_users(self) -> list[User]:
        if self._firestore_client:
            docs = self._firestore_client.collection("users").stream()
            return [User.model_validate(doc.to_dict()) for doc in docs]
        if not self.local_path.exists():
            return []
        data = json.loads(self.local_path.read_text(encoding="utf-8"))
        return [User.model_validate(item) for item in data]

    def _write_users(self, users: list[User]) -> None:
        if self._firestore_client:
            for user in users:
                self._firestore_client.collection("users").document(user.username.lower()).set(
                    user.model_dump(mode="json")
                )
            return
        self.local_path.parent.mkdir(parents=True, exist_ok=True)
        payload = [user.model_dump(mode="json") for user in users]
        self.local_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def _hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 120000).hex()
    return f"pbkdf2_sha256${salt}${digest}"


def _verify_password(password: str, stored_hash: str) -> bool:
    try:
        algorithm, salt, digest = stored_hash.split("$", 2)
    except ValueError:
        return False
    if algorithm != "pbkdf2_sha256":
        return False
    candidate = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 120000).hex()
    return hmac.compare_digest(candidate, digest)


def _normalize_username(username: str) -> str:
    return username.strip().lower()


def _normalize_phone(phone: str) -> str:
    cleaned = "".join(char for char in phone.strip() if char.isdigit() or char == "+")
    if len(cleaned) < 7:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Enter a valid phone number.")
    return cleaned


def _public_user(user: User) -> UserPublic:
    return UserPublic(**user.model_dump(exclude={"password_hash"}))

