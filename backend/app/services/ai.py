from __future__ import annotations
import json
from typing import Any

from app.config import Settings
from app.models import Classification, ComplaintCategory


DEPARTMENTS = [
    "Department of Agriculture",
    "Department of Environment",
    "Department of Finance",
    "Department of Fisheries",
    "Department of Forests",
    "Department of Home and Hill Affairs",
    "Department of Information Technology and Electronics",
    "Department of Law",
    "Department of Parliamentary Affairs",
    "Department of Power",
    "Department of Public Enterprises & Industrial Reconstruction",
    "Department of Public Works",
    "Department of School Education",
    "Department of Sundarban Affairs",
    "Department of Technical Education, Training and Skill Development",
    "Department of Transport",
    "Department of Urban Development and Municipal Affairs",
    "Department of Industry, Commerce & Enterprises",
    "Department of Health & Family Welfare",
    "Department of Information & Cultural Affairs",
    "Department of Labour",
    "Department of Land & Land Reforms",
    "Department of Minority Affairs & Madrasah Education",
    "Department of North Bengal Development",
    "Department of Personnel & Administrative Reforms",
    "Department of Tourism",
    "Department of Women and Child Development and Social Welfare",
]

CATEGORY_RULES: list[tuple[ComplaintCategory, str, list[str], str]] = [
    (ComplaintCategory.water_leak, "Department of Urban Development and Municipal Affairs", ["water", "leak", "pipe", "tap", "sewage overflow"], "high"),
    (ComplaintCategory.garbage, "Department of Urban Development and Municipal Affairs", ["garbage", "trash", "waste", "dump", "bin"], "medium"),
    (ComplaintCategory.pothole, "Department of Public Works", ["pothole", "road", "crater", "asphalt", "broken street"], "high"),
    (ComplaintCategory.streetlight, "Department of Power", ["streetlight", "lamp", "dark", "light pole"], "medium"),
    (ComplaintCategory.drainage, "Department of Urban Development and Municipal Affairs", ["drain", "clog", "flood", "stormwater"], "high"),
    (ComplaintCategory.traffic_signal, "Department of Transport", ["signal", "traffic light", "junction"], "high"),
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
                translated_text=text,
            )
    return Classification(
        category=ComplaintCategory.other,
        department="Department of Urban Development and Municipal Affairs",
        priority="low",
        summary=_summary(text, voice_transcript),
        tags=[],
        confidence=0.45,
        translated_text=text,
    )


def _summary(text: str, voice_transcript: str | None) -> str:
    source = voice_transcript or text
    source = " ".join(source.split())
    return source[:157] + "..." if len(source) > 160 else source


def find_matching_department(detected: str) -> str:
    detected_lower = detected.strip().lower()
    if not detected_lower:
        return "Department of Urban Development and Municipal Affairs"

    # 1. Exact match
    for d in DEPARTMENTS:
        if d.lower() == detected_lower:
            return d

    # 2. Substring match (e.g. "Public Works" matches "Department of Public Works")
    for d in DEPARTMENTS:
        clean_d = d.lower().replace("department of", "").strip()
        if detected_lower in clean_d or clean_d in detected_lower:
            if len(detected_lower) > 3 and detected_lower not in ["department", "dept"]:
                return d

    return "Department of Urban Development and Municipal Affairs"


async def classify_complaint(
    settings: Settings,
    text: str,
    voice_transcript: str | None,
    photo_bytes: bytes | None,
    photo_content_type: str | None,
    photo_filename: str | None,
) -> Classification:
    dept_options = ", ".join(DEPARTMENTS)
    prompt = (
        "Classify this civic grievance. If the grievance is written or spoken in a regional language (like Hindi, Bengali, Tamil, etc.), "
        "automatically translate it to English. Return only JSON with keys category, department, priority, summary, tags, confidence, translated_text. "
        "translated_text should be the translated English text, or the original English text if no translation was needed. "
        "Allowed categories: pothole, garbage, water_leak, streetlight, drainage, traffic_signal, other. "
        "Allowed priorities: low, medium, high, critical. "
        f"Allowed departments (you MUST choose exactly one from this list): {dept_options}"
    )

    # 1. Try Vertex AI Gemini (Uses GCP Credits)
    if settings.google_cloud_project:
        try:
            import vertexai
            from vertexai.generative_models import GenerativeModel, Part

            vertexai.init(project=settings.google_cloud_project, location="us-central1")
            model = GenerativeModel("gemini-2.5-flash")
            
            payload = [
                prompt,
                f"Text: {text}",
            ]
            if voice_transcript:
                payload.append(f"Voice transcript: {voice_transcript}")
            if photo_bytes and photo_content_type:
                payload.append(
                    Part.from_data(data=photo_bytes, mime_type=photo_content_type)
                )

            response = await model.generate_content_async(payload)
            data = _extract_json(response.text)
            
            # Post-validate department name to ensure it matches the standardized list
            matched_dept = find_matching_department(data.get("department", ""))

            return Classification(
                category=ComplaintCategory(data.get("category", "other")),
                department=matched_dept,
                priority=data.get("priority", "medium"),
                summary=data.get("summary") or _summary(text, voice_transcript),
                tags=data.get("tags") or [],
                confidence=float(data.get("confidence", 0.7)),
                translated_text=data.get("translated_text") or text,
            )
        except Exception as e:
            print(f"Vertex AI classification failed, checking AI Studio: {e}")

    # 2. Try Google AI Studio Gemini API
    if settings.google_api_key:
        try:
            import google.generativeai as genai

            genai.configure(api_key=settings.google_api_key)
            model = genai.GenerativeModel("gemini-2.5-flash")
            payload = [
                prompt,
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
            
            # Post-validate department name to ensure it matches the standardized list
            matched_dept = find_matching_department(data.get("department", ""))

            return Classification(
                category=ComplaintCategory(data.get("category", "other")),
                department=matched_dept,
                priority=data.get("priority", "medium"),
                summary=data.get("summary") or _summary(text, voice_transcript),
                tags=data.get("tags") or [],
                confidence=float(data.get("confidence", 0.7)),
                translated_text=data.get("translated_text") or text,
            )
        except Exception as e:
            print(f"AI Studio classification failed: {e}")

    return _local_classify(text, voice_transcript, photo_filename)


def _extract_json(raw: str) -> dict[str, Any]:
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        cleaned = cleaned.removeprefix("json").strip()
    return json.loads(cleaned)
