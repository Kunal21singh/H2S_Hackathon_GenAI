from __future__ import annotations
from datetime import datetime, timezone
from pathlib import Path
from pydantic import BaseModel
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.config import Settings, get_settings
from app.models import User
from app.services.storage import ComplaintStore
from app.services.ai import DEPARTMENTS
from app.dependencies import get_store, get_current_user

router = APIRouter(prefix="/ai", tags=["ai"])

@router.post("/analyze-image")
async def analyze_image(
    photo: UploadFile = File(...),
    settings: Settings = Depends(get_settings),
) -> dict[str, str]:
    photo_bytes = await photo.read()

    # 1. Try Vertex AI Gemini (Uses GCP Credits)
    if settings.google_cloud_project:
        try:
            import vertexai
            from vertexai.generative_models import GenerativeModel, Part

            vertexai.init(project=settings.google_cloud_project, location="us-central1")
            model = GenerativeModel("gemini-2.5-flash")
            
            prompt = (
                "Describe the civic grievance, municipal issue, infrastructure damage, or public disturbance shown in this image. "
                "Act as a citizen reporting this issue to their local municipal corporation. "
                "Write a concise, professional description of 1 to 3 sentences detailing the problem (e.g. 'A deep pothole has formed on the road lane, filled with rain water and causing vehicle hazards. It needs urgent paving.'). "
                "Return only the plain description text without any markdown or conversational filler."
            )
            
            payload = [
                prompt,
                Part.from_data(data=photo_bytes, mime_type=photo.content_type or "image/jpeg")
            ]
            
            response = await model.generate_content_async(payload)
            return {"description": response.text.strip()}
        except Exception as e:
            print(f"Vertex AI image analysis failed: {e}")

    # 2. Try Google AI Studio Gemini API
    if settings.google_api_key:
        try:
            import google.generativeai as genai

            genai.configure(api_key=settings.google_api_key)
            model = genai.GenerativeModel("gemini-2.5-flash")
            
            prompt = (
                "Describe the civic grievance, municipal issue, infrastructure damage, or public disturbance shown in this image. "
                "Act as a citizen reporting this issue to their local municipal corporation. "
                "Write a concise, professional description of 1 to 3 sentences detailing the problem (e.g. 'A deep pothole has formed on the road lane, filled with rain water and causing vehicle hazards. It needs urgent paving.'). "
                "Return only the plain description text without any markdown or conversational filler."
            )
            
            payload = [
                prompt,
                {
                    "mime_type": photo.content_type or "image/jpeg",
                    "data": photo_bytes,
                }
            ]
            
            response = await model.generate_content_async(payload)
            return {"description": response.text.strip()}
        except Exception as e:
            return {"description": f"Failed to auto-describe image with AI Studio: {str(e)}"}

    return {"description": "Upload successful. (Auto-description requires Vertex AI or Google AI key)"}


class AIChatRequest(BaseModel):
    message: str

@router.post("/chat")
async def ai_assistant_chat(
    body: AIChatRequest,
    store: ComplaintStore = Depends(get_store),
    current_user: User = Depends(get_current_user),
):
    user_msg = body.message.strip()
    if not user_msg:
        raise HTTPException(status_code=400, detail="Empty query.")
    
    complaints = await store.list()
    user_complaints = [c for c in complaints if c.reporter_username == current_user.username]
    total_count = len(complaints)
    active_count = len([c for c in complaints if c.status.value != "resolved" and not c.duplicate_of])
    resolved_count = len([c for c in complaints if c.status.value == "resolved"])
    
    user_msg_lower = user_msg.lower()
    
    # 1. Check if asking about complaints or status
    if "complaint" in user_msg_lower or "status" in user_msg_lower or "report" in user_msg_lower or "ticket" in user_msg_lower:
        # Search by exact ticket ID if mentioned
        words = user_msg.replace("#", " ").split()
        target_cmp = None
        for w in words:
            if w.lower().startswith("cmp_"):
                matching = [c for c in complaints if c.id.lower() == w.lower()]
                if matching:
                    target_cmp = matching[0]
                    break
        
        if target_cmp:
            dept = target_cmp.classification.department if target_cmp.classification else "Unassigned"
            st = target_cmp.place + (f", {target_cmp.state}" if target_cmp.state else "")
            reply = (
                f"📋 Ticket #{target_cmp.id} Details:\n"
                f"• Summary: '{target_cmp.text[:70]}...'\n"
                f"• Status: {target_cmp.status.value.upper()}\n"
                f"• Location: {st}\n"
                f"• Department: {dept}\n"
                f"• Filed Date: {target_cmp.created_at.strftime('%b %d, %Y')}"
            )
            return {"response": reply, "timestamp": datetime.now(timezone.utc).isoformat()}

        # Search by location/place mentioned in query
        matched_by_location = []
        found_loc_name = None
        
        # Check place & state fields in DB against user query
        for c in complaints:
            c_place = (c.place or "").strip().lower()
            c_state = (c.state or "").strip().lower()
            if c_place and c_place != "unassigned" and c_place in user_msg_lower:
                matched_by_location.append(c)
                found_loc_name = c.place
            elif c_state and c_state in user_msg_lower:
                matched_by_location.append(c)
                found_loc_name = c.state

        # Check regex for 'in <location>' pattern
        if not matched_by_location:
            import re
            m = re.search(r'\bin\s+([a-zA-Z0-9\s]+)(\?|\.|$)', user_msg, re.IGNORECASE)
            if m:
                loc_target = m.group(1).strip().lower()
                ignore_words = {"my", "the", "a", "an", "this", "that", "general", "india"}
                if loc_target and loc_target not in ignore_words:
                    found_loc_name = loc_target
                    matched_by_location = [
                        c for c in complaints 
                        if (c.place and loc_target in c.place.lower()) 
                        or (c.state and loc_target in c.state.lower())
                        or (loc_target in c.text.lower())
                    ]

        if matched_by_location:
            user_matched = [c for c in matched_by_location if c.reporter_username == current_user.username]
            target_list = user_matched if user_matched else matched_by_location
            latest = target_list[-1]
            dept = latest.classification.department if latest.classification else "Unassigned"
            loc = latest.place + (f", {latest.state}" if latest.state else "")
            
            reply = (
                f"📍 Complaint Status for {found_loc_name or latest.place}:\n"
                f"• Ticket #{latest.id}: '{latest.text[:65]}...'\n"
                f"• Status: {latest.status.value.upper()}\n"
                f"• Department: {dept}\n"
                f"• Location: {loc}\n"
                f"• Filed Date: {latest.created_at.strftime('%b %d, %Y')}"
            )
            if len(target_list) > 1:
                reply += f"\n\n(Total {len(target_list)} complaints found for location '{found_loc_name or latest.place}')."
            
            return {"response": reply, "timestamp": datetime.now(timezone.utc).isoformat()}

        # General user recent complaint fallback
        if not user_complaints:
            reply = f"Hello @{current_user.username}! You currently have no filed complaints in the system. Use the '+ New Complaint' button to report an issue!"
        else:
            latest = user_complaints[-1]
            dept = latest.classification.department if latest.classification else "Unassigned"
            reply = f"Hello @{current_user.username}! Your most recent grievance is #{latest.id} ('{latest.text[:50]}...').\n• Status: {latest.status.value.upper()}\n• Department: {dept}\n• Location: {latest.place}\n• Date: {latest.created_at.strftime('%b %d, %Y')}"
            if latest.status.value == "resolved":
                reply += f"\n• Resolution Proof verified by @{latest.completed_by or 'Officer'}."

        return {"response": reply, "timestamp": datetime.now(timezone.utc).isoformat()}

    elif "resolution rate" in user_msg_lower or "best state" in user_msg_lower or "performance" in user_msg_lower:
        states_map = {}
        for c in complaints:
            st = c.state or "West Bengal"
            if st not in states_map:
                states_map[st] = {"total": 0, "resolved": 0}
            states_map[st]["total"] += 1
            if c.status.value == "resolved":
                states_map[st]["resolved"] += 1
        
        top_state = None
        best_rate = -1
        for st, counts in states_map.items():
            rate = round((counts["resolved"] / max(counts["total"], 1)) * 100, 1)
            if rate > best_rate:
                best_rate = rate
                top_state = st
        
        reply = f"📊 System Performance Overview:\n• Total Complaints: {total_count}\n• Active Cases: {active_count}\n• Resolved Cases: {resolved_count}\n• Top Performing State: {top_state or 'West Bengal'} ({best_rate}% resolution rate)."

    elif "how to report" in user_msg_lower or "file" in user_msg_lower or "help" in user_msg_lower:
        reply = "💡 How to file a civic grievance:\n1. Click '+ New Complaint' in your dashboard.\n2. Type your grievance description or click the Microphone 🎙️ to dictate using voice-to-text.\n3. (Optional) Attach photo evidence.\n4. CivicPulse AI auto-classifies department, detects duplicates, and assigns priority!"

    elif "department" in user_msg_lower or "public works" in user_msg_lower or "water" in user_msg_lower:
        dept_counts = {}
        for c in complaints:
            d = c.classification.department if c.classification else "Other"
            dept_counts[d] = dept_counts.get(d, 0) + 1
        top_dept = max(dept_counts.items(), key=lambda x: x[1])[0] if dept_counts else "Public Works"
        reply = f"🏛️ Department Insights:\n• Most active department: {top_dept} ({dept_counts.get(top_dept, 0)} cases).\n• Total monitored departments: 27.\n• AI auto-routes all incoming complaints to the responsible authority with high precision."

    else:
        reply = f"🤖 Civic AI Assistant:\nI processed your query: '{user_msg}'. Currently monitoring {total_count} civic complaints ({active_count} active, {resolved_count} resolved). You can ask me about your complaint status, department performance, or how to file a grievance!"

    return {"response": reply, "timestamp": datetime.now(timezone.utc).isoformat()}
