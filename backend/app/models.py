from datetime import datetime, timezone
from enum import Enum
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, Field, model_validator


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


class TimelineEvent(BaseModel):
    status: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    description: str
    actor: str | None = None


class Complaint(BaseModel):
    id: str = Field(default_factory=lambda: f"cmp_{uuid4().hex[:10]}")
    text: str
    timeline: list[TimelineEvent] = Field(default_factory=list)
    voice_transcript: str | None = None
    photo_filename: str | None = None
    photo_content_type: str | None = None
    place: str = "Unassigned"
    ward: str | None = None
    state: str | None = None
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
    resolution_photo_filename: str | None = None
    resolution_photo_content_type: str | None = None
    completed_at: datetime | None = None
    completed_by: str | None = None

    @model_validator(mode="before")
    @classmethod
    def sync_place_and_ward(cls, data: Any) -> Any:
        if isinstance(data, dict):
            ward = data.get("ward")
            place = data.get("place")
            if ward is not None and place is None:
                data["place"] = ward
            elif place is not None and ward is None:
                data["ward"] = place
            elif place is None and ward is None:
                data["place"] = "Unassigned"
                data["ward"] = "Unassigned"
            else:
                if place == "Unassigned" and ward != "Unassigned":
                    data["place"] = ward
                elif ward == "Unassigned" and place != "Unassigned":
                    data["ward"] = place
        return data


class ComplaintCreate(BaseModel):
    text: str
    voice_transcript: str | None = None
    place: str = "Unassigned"
    ward: str | None = None
    state: str | None = None
    lat: float | None = None
    lng: float | None = None
    reporter_name: str | None = None
    reporter_username: str | None = None
    contact: str | None = None

    @model_validator(mode="before")
    @classmethod
    def sync_place_and_ward(cls, data: Any) -> Any:
        if isinstance(data, dict):
            ward = data.get("ward")
            place = data.get("place")
            if ward is not None and place is None:
                data["place"] = ward
            elif place is not None and ward is None:
                data["ward"] = place
            elif place is None and ward is None:
                data["place"] = "Unassigned"
                data["ward"] = "Unassigned"
            else:
                if place == "Unassigned" and ward != "Unassigned":
                    data["place"] = ward
                elif ward == "Unassigned" and place != "Unassigned":
                    data["ward"] = place
        return data


class UserPublic(BaseModel):
    id: str
    username: str
    full_name: str
    phone: str
    user_type: str = "Citizen"
    state: str | None = None
    is_active: bool
    created_at: datetime


class User(UserPublic):
    password_hash: str


class UserRegister(BaseModel):
    username: str = Field(min_length=3, max_length=32, pattern="^[a-zA-Z0-9_]+$")
    full_name: str = Field(min_length=2, max_length=80)
    phone: str = Field(min_length=7, max_length=20)
    password: str = Field(min_length=6, max_length=128)
    user_type: str = "Citizen"
    state: str | None = None


class UserLogin(BaseModel):
    username: str
    password: str
    user_type: str = "Citizen"


class AuthSession(BaseModel):
    token: str
    user: UserPublic


class Hotspot(BaseModel):
    place: str
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


class CommentCreate(BaseModel):
    comment: str
