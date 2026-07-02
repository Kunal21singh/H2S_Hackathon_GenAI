import asyncio

from app.config import get_settings
from app.models import Classification, Complaint, ComplaintCategory
from app.services.storage import ComplaintStore


SAMPLES = [
    ("Large pothole outside metro gate causing traffic slowdown", "Metro Gate 12", 28.6139, 77.2090, ComplaintCategory.pothole, "Roads", "high"),
    ("Garbage pile has not been collected near market road", "Market Road 09", 28.6202, 77.2150, ComplaintCategory.garbage, "Sanitation", "medium"),
    ("Water pipe leak flooding the service lane", "Metro Gate 12", 28.6142, 77.2088, ComplaintCategory.water_leak, "Water Works", "high"),
    ("Streetlight not working at the park entrance", "Park Entrance 04", 28.6005, 77.2210, ComplaintCategory.streetlight, "Electrical", "medium"),
]


async def main() -> None:
    store = ComplaintStore(get_settings())
    existing = await store.list()
    if existing:
        print(f"Seed skipped: {len(existing)} complaint(s) already present")
        return
    for text, place, lat, lng, category, department, priority in SAMPLES:
        await store.add(
            Complaint(
                text=text,
                place=place,
                lat=lat,
                lng=lng,
                classification=Classification(
                    category=category,
                    department=department,
                    priority=priority,
                    summary=text,
                    tags=[],
                    confidence=0.9,
                ),
            )
        )
    print("Seeded demo complaints")


if __name__ == "__main__":
    asyncio.run(main())

