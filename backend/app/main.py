from __future__ import annotations
from pathlib import Path
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from app.config import Settings, get_settings
from app.routers import auth, complaints, analytics, hotspots, notifications, ai

app = FastAPI(title="CivicPulse API", version="0.1.0")

# Register CORS middleware
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Main health endpoint
@app.get("/health")
async def health(settings: Settings = Depends(get_settings)) -> dict[str, str | bool]:
    return {
        "status": "ok",
        "environment": settings.app_env,
        "gemini_configured": bool(settings.google_api_key),
        "firestore_enabled": settings.use_firestore,
    }

# Serving uploaded file attachments
@app.get("/uploads/{filename}")
async def get_uploaded_file(filename: str):
    file_path = Path("data/uploads") / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    media_type = "image/jpeg"
    filename_lower = filename.lower()
    if filename_lower.endswith(".png"):
        media_type = "image/png"
    elif filename_lower.endswith(".gif"):
        media_type = "image/gif"
    elif filename_lower.endswith(".webp"):
        media_type = "image/webp"
        
    return FileResponse(file_path, media_type=media_type)

# Include all modular routers
app.include_router(auth.router)
app.include_router(complaints.router)
app.include_router(analytics.router)
app.include_router(hotspots.router)
app.include_router(notifications.router)
app.include_router(ai.router)
