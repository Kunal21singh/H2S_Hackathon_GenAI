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

    def _read_local(self) -> list[Complaint]:
        if not self.local_path.exists():
            return []
        data = json.loads(self.local_path.read_text(encoding="utf-8"))
        return [Complaint.model_validate(item) for item in data]

    def _write_local(self, items: list[Complaint]) -> None:
        self.local_path.parent.mkdir(parents=True, exist_ok=True)
        payload = [item.model_dump(mode="json") for item in items]
        self.local_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

