from math import asin, cos, radians, sin, sqrt

from app.models import Complaint


def find_duplicates(new_complaint: Complaint, existing: list[Complaint]) -> tuple[str | None, list[str]]:
    matches: list[tuple[str, float]] = []
    for complaint in existing:
        if complaint.classification.category != new_complaint.classification.category:
            continue
        distance = _distance_meters(new_complaint.lat, new_complaint.lng, complaint.lat, complaint.lng)
        text_overlap = _jaccard(new_complaint.text, complaint.text)
        if (distance is not None and distance <= 250) or text_overlap >= 0.45:
            score = (1 / max(distance or 1, 1)) + text_overlap
            matches.append((complaint.id, score))

    matches.sort(key=lambda item: item[1], reverse=True)
    nearby = [item[0] for item in matches[:5]]
    duplicate_of = nearby[0] if matches and matches[0][1] > 0.5 else None
    return duplicate_of, nearby


def _distance_meters(lat1: float | None, lng1: float | None, lat2: float | None, lng2: float | None) -> float | None:
    if None in (lat1, lng1, lat2, lng2):
        return None
    radius = 6371000
    dlat = radians(lat2 - lat1)
    dlng = radians(lng2 - lng1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng / 2) ** 2
    return 2 * radius * asin(sqrt(a))


def _jaccard(left: str, right: str) -> float:
    left_tokens = {token for token in left.lower().split() if len(token) > 3}
    right_tokens = {token for token in right.lower().split() if len(token) > 3}
    if not left_tokens or not right_tokens:
        return 0
    return len(left_tokens & right_tokens) / len(left_tokens | right_tokens)

