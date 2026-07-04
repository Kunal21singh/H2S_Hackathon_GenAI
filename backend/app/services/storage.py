import csv
import json
from datetime import datetime, timezone
from pathlib import Path

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
                updated = item
                break
        if not updated:
            return None
        if self._firestore_client:
            self._firestore_client.collection(self.settings.firestore_collection).document(complaint_id).update(
                {"status": status.value, "updated_at": updated.updated_at.isoformat()}
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
                updated = item
                break
        if not updated:
            return None
        if self._firestore_client:
            self._firestore_client.collection(self.settings.firestore_collection).document(complaint_id).update(
                {
                    "status": ComplaintStatus.resolved.value,
                    "resolution_photo_filename": filename,
                    "resolution_photo_content_type": content_type,
                    "completed_at": updated.completed_at.isoformat(),
                    "completed_by": completed_by,
                    "updated_at": updated.updated_at.isoformat()
                }
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

