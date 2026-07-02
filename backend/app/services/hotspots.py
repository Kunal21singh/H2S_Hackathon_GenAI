from collections import defaultdict

from app.models import Complaint, Hotspot


PRIORITY_SCORE = {"low": 1, "medium": 2, "high": 3, "critical": 4}


def build_hotspots(complaints: list[Complaint]) -> list[Hotspot]:
    buckets: dict[tuple[str, str], list[Complaint]] = defaultdict(list)
    for complaint in complaints:
        if complaint.duplicate_of:
            continue
        buckets[(complaint.ward or "Unassigned", complaint.classification.category.value)].append(complaint)

    hotspots: list[Hotspot] = []
    for (ward, _category), items in buckets.items():
        if not items:
            continue
        lat_values = [item.lat for item in items if item.lat is not None]
        lng_values = [item.lng for item in items if item.lng is not None]
        priority = max(items, key=lambda item: PRIORITY_SCORE.get(item.classification.priority, 0)).classification.priority
        hotspots.append(
            Hotspot(
                ward=ward,
                category=items[0].classification.category,
                count=len(items),
                centroid_lat=sum(lat_values) / len(lat_values) if lat_values else None,
                centroid_lng=sum(lng_values) / len(lng_values) if lng_values else None,
                priority=priority,
                complaint_ids=[item.id for item in items],
            )
        )
    return sorted(hotspots, key=lambda item: (item.count, PRIORITY_SCORE.get(item.priority, 0)), reverse=True)

