from datetime import datetime, timezone
from enum import Enum
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, Field


class ComplaintCategory(str, Enum):
    pothole = "pothole"
    garbage = "garbage"
    water_leak = "water_leak"
    streetlight = "streetlight"
    drainage = "drainage"
    traffic_signal = "traffic_signal"
    other = "other"


class ComplaintStatus(str, Enum):
    new = "new"
    routed = "routed"
    in_progress = "in_progress"
    resolved = "resolved"


class Classification(BaseModel):
    category: ComplaintCategory
    department: str
    priority: str = Field(pattern="^(low|medium|high|critical)$")
    summary: str
    tags: list[str] = []
    confidence: float = Field(ge=0, le=1)


class Complaint(BaseModel):
    id: str = Field(default_factory=lambda: f"cmp_{uuid4().hex[:10]}")
    text: str
    voice_transcript: str | None = None
    photo_filename: str | None = None
    photo_content_type: str | None = None
    ward: str = "Unassigned"
    lat: float | None = None
    lng: float | None = None
    reporter_name: str | None = None
    reporter_username: str | None = None
    contact: str | None = None
    status: ComplaintStatus = ComplaintStatus.new
    classification: Classification
    duplicate_of: str | None = None
    nearby_duplicate_ids: list[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ComplaintCreate(BaseModel):
    text: str
    voice_transcript: str | None = None
    ward: str = "Unassigned"
    lat: float | None = None
    lng: float | None = None
    reporter_name: str | None = None
    reporter_username: str | None = None
    contact: str | None = None


class UserPublic(BaseModel):
    id: str
    username: str
    full_name: str
    phone: str
    is_active: bool
    created_at: datetime


class User(UserPublic):
    password_hash: str


class UserRegister(BaseModel):
    username: str = Field(min_length=3, max_length=32, pattern="^[a-zA-Z0-9_]+$")
    full_name: str = Field(min_length=2, max_length=80)
    phone: str = Field(min_length=7, max_length=20)
    password: str = Field(min_length=6, max_length=128)


class UserLogin(BaseModel):
    username: str
    password: str


class AuthSession(BaseModel):
    token: str
    user: UserPublic


class Hotspot(BaseModel):
    ward: str
    category: ComplaintCategory
    count: int
    centroid_lat: float | None = None
    centroid_lng: float | None = None
    priority: str
    complaint_ids: list[str]


class AnalyticsQuestion(BaseModel):
    question: str


class AnalyticsAnswer(BaseModel):
    question: str
    answer: str
    sql: str | None = None
    rows: list[dict[str, Any]] = []
    source: str
