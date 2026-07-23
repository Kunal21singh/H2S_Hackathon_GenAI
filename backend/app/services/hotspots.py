from __future__ import annotations
from collections import defaultdict

from app.models import Complaint, Hotspot


PRIORITY_SCORE = {"low": 1, "medium": 2, "high": 3, "critical": 4}


def build_hotspots(complaints: list[Complaint]) -> list[Hotspot]:
    print("SERVER build_hotspots complaints:", [(c.id, c.place, c.duplicate_of) for c in complaints])
    buckets: dict[tuple[str, str], list[Complaint]] = defaultdict(list)
    existing_ids = {c.id for c in complaints}
    for complaint in complaints:
        if complaint.duplicate_of and complaint.duplicate_of in existing_ids:
            continue
        buckets[(complaint.place or "Unassigned", complaint.classification.category.value)].append(complaint)

    hotspots: list[Hotspot] = []
    for (place, _category), items in buckets.items():
        if not items:
            continue
        lat_values = [item.lat for item in items if item.lat is not None]
        lng_values = [item.lng for item in items if item.lng is not None]
        priority = max(items, key=lambda item: PRIORITY_SCORE.get(item.classification.priority, 0)).classification.priority
        hotspots.append(
            Hotspot(
                place=place,
                category=items[0].classification.category,
                count=len(items),
                centroid_lat=sum(lat_values) / len(lat_values) if lat_values else None,
                centroid_lng=sum(lng_values) / len(lng_values) if lng_values else None,
                priority=priority,
                complaint_ids=[item.id for item in items],
            )
        )
    return sorted(hotspots, key=lambda item: (item.count, PRIORITY_SCORE.get(item.priority, 0)), reverse=True)

