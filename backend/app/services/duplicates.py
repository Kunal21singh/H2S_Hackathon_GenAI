from math import asin, cos, radians, sin, sqrt

from app.models import Complaint


def find_duplicates(new_complaint: Complaint, existing: list[Complaint]) -> tuple[str | None, list[str]]:
    matches: list[tuple[str, float]] = []
    new_place = (new_complaint.place or "").strip().lower()
    
    for complaint in existing:
        if hasattr(complaint.status, "value") and complaint.status.value == "resolved":
            continue
        if complaint.classification and new_complaint.classification:
            if complaint.classification.category != new_complaint.classification.category:
                continue

        comp_place = (complaint.place or "").strip().lower()
        # Enforce place match if place is provided and not unassigned
        if new_place and comp_place and new_place != "unassigned" and comp_place != "unassigned":
            if new_place != comp_place and new_place not in comp_place and comp_place not in new_place:
                continue

        distance = _distance_meters(new_complaint.lat, new_complaint.lng, complaint.lat, complaint.lng)
        text_overlap = _jaccard(new_complaint.text, complaint.text)
        
        if distance is not None:
            is_dup = distance <= 500 and text_overlap >= 0.4
        else:
            is_dup = text_overlap >= 0.45

        if is_dup:
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


def find_duplicates_with_scores(
    new_text: str,
    place: str | None = None,
    state: str | None = None,
    lat: float | None = None,
    lng: float | None = None,
    category: str | None = None,
    existing: list[Complaint] = []
) -> list[dict]:
    results = []
    left_tokens = {token for token in new_text.lower().split() if len(token) > 2}
    if not left_tokens:
        return []

    clean_new_place = (place or "").strip().lower()
    clean_new_state = (state or "").strip().lower()

    for complaint in existing:
        # Skip resolved complaints
        if hasattr(complaint.status, "value") and complaint.status.value == "resolved":
            continue
        elif str(complaint.status) == "resolved":
            continue

        # 1. State check: must be in the same state if state is provided
        clean_comp_state = (complaint.state or "").strip().lower()
        if clean_new_state and clean_comp_state and clean_new_state != clean_comp_state:
            continue

        # 2. Distance & Place Location Check
        location_score = 0.0
        location_matched = False

        # If GPS coordinates are available for both
        dist_m = _distance_meters(lat, lng, complaint.lat, complaint.lng)
        if dist_m is not None:
            if dist_m <= 300:  # Within 300 meters
                location_score = 0.4
                location_matched = True
            elif dist_m <= 800:  # Within 800 meters
                location_score = 0.2
                location_matched = True
            elif dist_m > 2000:  # More than 2 km away -> definitely NOT a duplicate!
                continue
        
        # Place string matching
        clean_comp_place = (complaint.place or "").strip().lower()
        if clean_new_place and clean_comp_place and clean_new_place != "unassigned" and clean_comp_place != "unassigned":
            if clean_new_place == clean_comp_place or clean_new_place in clean_comp_place or clean_comp_place in clean_new_place:
                location_score = max(location_score, 0.35)
                location_matched = True

        # If both complaints specify a place/coordinates, BUT neither location matched, skip!
        if (clean_new_place and clean_comp_place and clean_new_place != "unassigned" and clean_comp_place != "unassigned") and not location_matched:
            continue

        # 3. Text overlap check
        right_tokens = {token for token in complaint.text.lower().split() if len(token) > 2}
        if not right_tokens:
            continue

        intersection = left_tokens & right_tokens
        union = left_tokens | right_tokens
        text_jaccard = len(intersection) / len(union) if union else 0.0

        # Require minimum text similarity (>= 30%)
        if text_jaccard < 0.3:
            continue

        # Category match bonus
        category_bonus = 0.0
        comp_cat = complaint.classification.category if complaint.classification else None
        comp_cat_str = comp_cat.value if hasattr(comp_cat, "value") else str(comp_cat)
        if category and comp_cat_str and category == comp_cat_str:
            category_bonus = 0.15

        # Calculate final similarity score
        total_score = min(0.98, (text_jaccard * 0.5) + (location_score * 0.35) + category_bonus + 0.15)
        
        if total_score >= 0.45:
            results.append({
                "id": complaint.id,
                "text": complaint.text,
                "match_percent": int(total_score * 100),
                "department": complaint.classification.department if complaint.classification else "Unassigned",
                "priority": complaint.classification.priority.value if hasattr(complaint.classification.priority, "value") else str(complaint.classification.priority),
                "status": complaint.status.value if hasattr(complaint.status, "value") else str(complaint.status),
                "place": complaint.place,
                "state": complaint.state,
                "upvotes": getattr(complaint, "upvotes", 0)
            })

    results.sort(key=lambda x: x["match_percent"], reverse=True)
    return results[:3]


