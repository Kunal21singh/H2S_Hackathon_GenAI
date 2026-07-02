import json
from typing import Any

from app.config import Settings
from app.models import Classification, ComplaintCategory


CATEGORY_RULES: list[tuple[ComplaintCategory, str, list[str], str]] = [
    (ComplaintCategory.water_leak, "Water Works", ["water", "leak", "pipe", "tap", "sewage overflow"], "high"),
    (ComplaintCategory.garbage, "Sanitation", ["garbage", "trash", "waste", "dump", "bin"], "medium"),
    (ComplaintCategory.pothole, "Roads", ["pothole", "road", "crater", "asphalt", "broken street"], "high"),
    (ComplaintCategory.streetlight, "Electrical", ["streetlight", "lamp", "dark", "light pole"], "medium"),
    (ComplaintCategory.drainage, "Drainage", ["drain", "clog", "flood", "stormwater"], "high"),
    (ComplaintCategory.traffic_signal, "Traffic", ["signal", "traffic light", "junction"], "high"),
]


def _local_classify(text: str, voice_transcript: str | None, photo_filename: str | None) -> Classification:
    haystack = " ".join(filter(None, [text, voice_transcript, photo_filename])).lower()
    for category, department, keywords, priority in CATEGORY_RULES:
        if any(keyword in haystack for keyword in keywords):
            return Classification(
                category=category,
                department=department,
                priority=priority,
                summary=_summary(text, voice_transcript),
                tags=[keyword for keyword in keywords if keyword in haystack][:4],
                confidence=0.76,
            )
    return Classification(
        category=ComplaintCategory.other,
        department="Citizen Services",
        priority="low",
        summary=_summary(text, voice_transcript),
        tags=[],
        confidence=0.45,
    )


def _summary(text: str, voice_transcript: str | None) -> str:
    source = voice_transcript or text
    source = " ".join(source.split())
    return source[:157] + "..." if len(source) > 160 else source


async def classify_complaint(
    settings: Settings,
    text: str,
    voice_transcript: str | None,
    photo_bytes: bytes | None,
    photo_content_type: str | None,
    photo_filename: str | None,
) -> Classification:
    if not settings.google_api_key:
        return _local_classify(text, voice_transcript, photo_filename)

    try:
        import google.generativeai as genai

        genai.configure(api_key=settings.google_api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        payload: list[Any] = [
            "Classify this civic grievance. Return only JSON with keys category, department, priority, summary, tags, confidence. "
            "Allowed categories: pothole, garbage, water_leak, streetlight, drainage, traffic_signal, other. "
            "Allowed priorities: low, medium, high, critical.",
            f"Text: {text}",
        ]
        if voice_transcript:
            payload.append(f"Voice transcript: {voice_transcript}")
        if photo_bytes and photo_content_type:
            payload.append(
                {
                    "mime_type": photo_content_type,
                    "data": photo_bytes,
                }
            )

        response = await model.generate_content_async(payload)
        data = _extract_json(response.text)
        return Classification(
            category=ComplaintCategory(data.get("category", "other")),
            department=data.get("department", "Citizen Services"),
            priority=data.get("priority", "medium"),
            summary=data.get("summary") or _summary(text, voice_transcript),
            tags=data.get("tags") or [],
            confidence=float(data.get("confidence", 0.7)),
        )
    except Exception:
        return _local_classify(text, voice_transcript, photo_filename)


def _extract_json(raw: str) -> dict[str, Any]:
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        cleaned = cleaned.removeprefix("json").strip()
    return json.loads(cleaned)
