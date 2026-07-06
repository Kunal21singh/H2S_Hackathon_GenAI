import urllib.request
import urllib.parse
import json
from app.config import Settings
from app.models import Complaint

def send_telegram_notification(user_chat_id: str | None, complaint: Complaint, event_type: str, settings: Settings):
    """
    Sends a Telegram notification to the citizen who filed the grievance.
    event_type can be "created", "updated", or "resolved".
    """
    if not settings.telegram_bot_token or not user_chat_id:
        print(f"Telegram notification skipped (token: {bool(settings.telegram_bot_token)}, chat_id: {user_chat_id})")
        return

    # Generate the tracking URL
    tracking_url = f"{settings.frontend_url}/?track={complaint.id}"
    
    # Format message based on event type
    status_emoji = "🆕"
    if event_type == "updated":
        status_emoji = "🔄"
    elif event_type == "resolved":
        status_emoji = "✅"

    message = f"🚨 *CivicPulse Grievance Update* {status_emoji}\n\n"
    
    if event_type == "created":
        message += f"Your complaint has been successfully registered!\n\n"
    elif event_type == "updated":
        message += f"Your complaint has received an administrative update.\n\n"
    elif event_type == "resolved":
        message += f"🎉 *Good news!* Your complaint has been resolved by city officials.\n\n"

    message += f"📌 *ID*: `{complaint.id}`\n"
    message += f"📝 *Issue*: {complaint.classification.summary}\n"
    message += f"📍 *Location*: {complaint.place}\n"
    message += f"🏷️ *Category*: `{complaint.classification.category.value}`\n"
    message += f"🏢 *Department*: {complaint.classification.department}\n"
    message += f"⚡ *Status*: *{complaint.status.value.upper()}*\n\n"
    message += f"🔍 [Track Status Directly]({tracking_url})"

    # Telegram API endpoint
    url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage"
    payload = {
        "chat_id": user_chat_id,
        "text": message,
        "parse_mode": "Markdown",
        "disable_web_page_preview": False
    }

    try:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            url, 
            data=data, 
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            res_data = response.read().decode("utf-8")
            print(f"Telegram notification sent successfully to chat_id {user_chat_id}: {res_data}")
    except Exception as e:
        print(f"Failed to send Telegram notification: {e}")
