from __future__ import annotations
import csv
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.config import Settings
from app.models import Complaint, ComplaintStatus


class ComplaintStore:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.local_path = Path(settings.local_data_path)
        self._firestore_client = None
        if settings.use_firestore:
            try:
                from google.cloud import firestore

                self._firestore_client = firestore.Client(project=settings.google_cloud_project)
            except Exception:
                self._firestore_client = None

    async def list(self) -> list[Complaint]:
        if self._firestore_client:
            docs = self._firestore_client.collection(self.settings.firestore_collection).order_by("created_at").stream()
            return [Complaint.model_validate(doc.to_dict()) for doc in docs]
        return self._read_local()

    async def add(self, complaint: Complaint) -> Complaint:
        complaint.status = ComplaintStatus.routed
        complaint.updated_at = datetime.now(timezone.utc)
        
        # Build initial timeline history
        from app.models import TimelineEvent
        complaint.timeline = [
            TimelineEvent(
                status="new",
                timestamp=complaint.created_at,
                description="Complaint reported by citizen.",
                actor=complaint.reporter_username or "citizen"
            ),
            TimelineEvent(
                status="routed",
                timestamp=complaint.updated_at,
                description=f"Complaint classified as '{complaint.classification.category}' and automatically routed to {complaint.classification.department} department.",
                actor="AI Classifier"
            )
        ]
        
        if self._firestore_client:
            self._firestore_client.collection(self.settings.firestore_collection).document(complaint.id).set(
                complaint.model_dump(mode="json")
            )
            return complaint
        items = self._read_local()
        items.append(complaint)
        self._write_local(items)
        return complaint

    async def update_status(self, complaint_id: str, status: ComplaintStatus) -> Complaint | None:
        items = await self.list()
        updated: Complaint | None = None
        for item in items:
            if item.id == complaint_id:
                item.status = status
                item.updated_at = datetime.now(timezone.utc)
                
                # Append status transition to timeline
                from app.models import TimelineEvent
                desc = f"Action started. Status changed to '{status.value}'."
                if status == ComplaintStatus.in_progress:
                    desc = "Action started. Department personnel initiated resolution work."
                elif status == ComplaintStatus.routed:
                    desc = "Complaint routed back to department queue."
                
                if not hasattr(item, 'timeline') or item.timeline is None:
                    item.timeline = []
                item.timeline.append(TimelineEvent(
                    status=status.value,
                    timestamp=item.updated_at,
                    description=desc,
                    actor="Department Official"
                ))
                
                updated = item
                break
        if not updated:
            return None
        if self._firestore_client:
            self._firestore_client.collection(self.settings.firestore_collection).document(complaint_id).set(
                updated.model_dump(mode="json")
            )
        else:
            self._write_local(items)
        return updated

    async def complete_complaint(
        self, complaint_id: str, filename: str, content_type: str, completed_by: str
    ) -> Complaint | None:
        items = await self.list()
        updated: Complaint | None = None
        for item in items:
            if item.id == complaint_id:
                item.status = ComplaintStatus.resolved
                item.resolution_photo_filename = filename
                item.resolution_photo_content_type = content_type
                item.completed_at = datetime.now(timezone.utc)
                item.completed_by = completed_by
                item.updated_at = datetime.now(timezone.utc)
                
                # Append resolved event to timeline
                from app.models import TimelineEvent
                if not hasattr(item, 'timeline') or item.timeline is None:
                    item.timeline = []
                item.timeline.append(TimelineEvent(
                    status="resolved",
                    timestamp=item.completed_at,
                    description="Grievance resolved successfully with photo proof attached.",
                    actor=completed_by
                ))
                
                updated = item
                break
        if not updated:
            return None
        if self._firestore_client:
            self._firestore_client.collection(self.settings.firestore_collection).document(complaint_id).set(
                updated.model_dump(mode="json")
            )
        else:
            self._write_local(items)
        return updated

    async def add_comment(self, complaint_id: str, comment: str, actor: str) -> Complaint | None:
        items = await self.list()
        updated: Complaint | None = None
        for item in items:
            if item.id == complaint_id:
                from app.models import TimelineEvent
                if not hasattr(item, 'timeline') or item.timeline is None:
                    item.timeline = []
                from app.models import ComplaintStatus
                item.status = ComplaintStatus.in_progress
                item.timeline.append(TimelineEvent(
                    status="in_progress",
                    timestamp=datetime.now(timezone.utc),
                    description=f"Progress Update: {comment.strip()}",
                    actor=actor
                ))
                item.updated_at = datetime.now(timezone.utc)
                updated = item
                break
        if not updated:
            return None
        if self._firestore_client:
            self._firestore_client.collection(self.settings.firestore_collection).document(complaint_id).set(
                updated.model_dump(mode="json")
            )
        else:
            self._write_local(items)
        return updated

    async def delete_complaint(self, complaint_id: str) -> bool:
        items = await self.list()
        filtered = [item for item in items if item.id != complaint_id]
        if len(filtered) == len(items):
            return False
        if self._firestore_client:
            self._firestore_client.collection(self.settings.firestore_collection).document(complaint_id).delete()
        else:
            self._write_local(filtered)
        return True

    async def admin_modify(self, complaint_id: str, payload: Any) -> Complaint | None:
        items = await self.list()
        updated: Complaint | None = None
        for item in items:
            if item.id == complaint_id:
                if payload.text is not None:
                    item.text = payload.text
                if payload.place is not None:
                    item.place = payload.place
                    item.ward = payload.place
                if payload.state is not None:
                    item.state = payload.state
                if payload.status is not None:
                    from app.models import ComplaintStatus
                    item.status = ComplaintStatus(payload.status)
                
                # Classification modifications
                if payload.department is not None:
                    item.classification.department = payload.department
                if payload.priority is not None:
                    item.classification.priority = payload.priority
                if payload.category is not None:
                    from app.models import ComplaintCategory
                    item.classification.category = ComplaintCategory(payload.category)
                
                item.updated_at = datetime.now(timezone.utc)
                
                # Log admin modification in timeline
                from app.models import TimelineEvent
                if not hasattr(item, 'timeline') or item.timeline is None:
                    item.timeline = []
                item.timeline.append(TimelineEvent(
                    status=item.status.value,
                    timestamp=item.updated_at,
                    description="Grievance details updated by System Administrator.",
                    actor="Admin"
                ))
                
                updated = item
                break
        if not updated:
            return None
        if self._firestore_client:
            self._firestore_client.collection(self.settings.firestore_collection).document(updated.id).set(
                updated.model_dump(mode="json")
            )
        else:
            self._write_local(items)
        return updated

    async def update(self, complaint: Complaint) -> Complaint | None:
        items = await self.list()
        updated: Complaint | None = None
        target = complaint.id.strip().lower()
        for i, item in enumerate(items):
            if item.id.strip().lower() == target:
                items[i] = complaint
                updated = complaint
                break
        if not updated:
            return None
        if self._firestore_client:
            self._firestore_client.collection(self.settings.firestore_collection).document(updated.id).set(
                updated.model_dump(mode="json")
            )
        else:
            self._write_local(items)
        return updated

    async def get(self, complaint_id: str) -> Complaint | None:
        items = await self.list()
        target = complaint_id.strip().lower()
        for item in items:
            if item.id.strip().lower() == target:
                return item
        return None

    async def transfer(self, complaint_id: str, new_department: str, reason: str, actor: str) -> Complaint | None:
        items = await self.list()
        updated: Complaint | None = None
        for item in items:
            if item.id == complaint_id:
                old_dept = item.classification.department
                item.classification.department = new_department
                item.updated_at = datetime.now(timezone.utc)
                
                from app.models import TimelineEvent
                if not hasattr(item, 'timeline') or item.timeline is None:
                    item.timeline = []
                item.timeline.append(TimelineEvent(
                    status=item.status.value,
                    timestamp=item.updated_at,
                    description=f"Grievance transferred from {old_dept} to {new_department}. Reason: {reason}",
                    actor=actor
                ))
                updated = item
                break
        if not updated:
            return None
        if self._firestore_client:
            self._firestore_client.collection(self.settings.firestore_collection).document(complaint_id).set(
                updated.model_dump(mode="json")
            )
        else:
            self._write_local(items)
        return updated

    def _read_local(self) -> list[Complaint]:
        if not self.local_path.exists():
            return []
        data = json.loads(self.local_path.read_text(encoding="utf-8"))
        return [Complaint.model_validate(item) for item in data]

    def _write_local(self, items: list[Complaint]) -> None:
        self.local_path.parent.mkdir(parents=True, exist_ok=True)
        payload = [item.model_dump(mode="json") for item in items]
        self.local_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def log_resolved_complaint(complaint: Complaint):
    csv_path = Path("data/resolved_tracker.csv")
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    
    file_exists = csv_path.exists()
    with open(csv_path, mode="a", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        if not file_exists:
            writer.writerow([
                "Complaint ID",
                "Summary",
                "Reporter Username",
                "Contact Phone",
                "Department",
                "Resolution Photo Filename",
                "Resolved By",
                "Resolved At"
            ])
        writer.writerow([
            complaint.id,
            complaint.classification.summary,
            complaint.reporter_username or "citizen",
            complaint.contact or "N/A",
            complaint.classification.department,
            complaint.resolution_photo_filename or "",
            complaint.completed_by or "",
            complaint.completed_at.isoformat() if complaint.completed_at else ""
        ])


class NotificationStore:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.local_path = Path("./data/notifications.json")
        self._firestore_client = None
        if settings.use_firestore:
            try:
                from google.cloud import firestore
                self._firestore_client = firestore.Client(project=settings.google_cloud_project)
            except Exception:
                self._firestore_client = None

    async def list_for_user(self, username: str) -> list[dict]:
        if self._firestore_client:
            docs = self._firestore_client.collection("notifications").where("recipient_username", "==", username).stream()
            return sorted([doc.to_dict() for doc in docs], key=lambda x: x.get("created_at", ""), reverse=True)
        
        filtered = [n for n in self._read_local() if n.get("recipient_username") == username]
        return sorted(filtered, key=lambda x: x.get("created_at", ""), reverse=True)

    async def add(self, notification: dict) -> None:
        if self._firestore_client:
            self._firestore_client.collection("notifications").document(notification["id"]).set(notification)
            return
        items = self._read_local()
        items.append(notification)
        self._write_local(items)

    async def mark_read(self, notification_id: str) -> None:
        if self._firestore_client:
            self._firestore_client.collection("notifications").document(notification_id).update({"read": True})
            return
        items = self._read_local()
        for item in items:
            if item.get("id") == notification_id:
                item["read"] = True
                break
        self._write_local(items)

    def _read_local(self) -> list[dict]:
        if not self.local_path.exists():
            return []
        try:
            return json.loads(self.local_path.read_text(encoding="utf-8"))
        except Exception:
            return []

    def _write_local(self, items: list[dict]) -> None:
        self.local_path.parent.mkdir(parents=True, exist_ok=True)
        self.local_path.write_text(json.dumps(items, indent=2), encoding="utf-8")

