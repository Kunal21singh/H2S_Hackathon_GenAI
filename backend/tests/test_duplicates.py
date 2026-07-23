from app.models import Complaint, ComplaintClassification, ComplaintStatus, Category, Priority
from app.services.duplicates import find_duplicates, find_duplicates_with_scores, _distance_meters, _jaccard

def test_jaccard_similarity():
    # Should ignore capitalization and match token length > 2
    assert _jaccard("Broken water pipe leaking", "Leaking broken water pipes") > 0.4
    assert _jaccard("Pothole in the middle of road", "Broken traffic light signal") < 0.1

def test_distance_meters():
    # Test distance calculations (approx 300m for this coordinate delta)
    lat1, lng1 = 22.5726, 88.3639
    lat2, lng2 = 22.5746, 88.3659
    dist = _distance_meters(lat1, lng1, lat2, lng2)
    assert dist is not None
    assert 250 < dist < 400

def test_find_duplicates_no_gps():
    c1 = Complaint(
        text="A large pothole has formed on Sector 5 main road, blocking traffic.",
        place="Sector 5",
        classification=ComplaintClassification(category=Category.roads, priority=Priority.medium, department="Department of Public Works", confidence=0.9, tags=["pothole"]),
    )
    c2 = Complaint(
        text="There is a big pothole on Sector 5 main road causing traffic blocks.",
        place="Sector 5",
        classification=ComplaintClassification(category=Category.roads, priority=Priority.medium, department="Department of Public Works", confidence=0.9, tags=["pothole"]),
    )
    c1.id = "cmp_1"
    c2.id = "cmp_2"
    
    dup, nearby = find_duplicates(c2, [c1])
    assert dup == "cmp_1"
    assert "cmp_1" in nearby

def test_find_duplicates_different_categories():
    c1 = Complaint(
        text="Water pipe broken and leaking on the street.",
        place="Sector 5",
        classification=ComplaintClassification(category=Category.water_waste, priority=Priority.medium, department="Department of Urban Development and Municipal Affairs", confidence=0.9, tags=["water"]),
    )
    c2 = Complaint(
        text="Water pipe broken and leaking on the street.",
        place="Sector 5",
        classification=ComplaintClassification(category=Category.roads, priority=Priority.medium, department="Department of Public Works", confidence=0.9, tags=["pothole"]),
    )
    c1.id = "cmp_1"
    c2.id = "cmp_2"
    
    dup, nearby = find_duplicates(c2, [c1])
    assert dup is None  # Different categories should not match

def test_find_duplicates_with_scores():
    c1 = Complaint(
        text="Street light is completely broken and not working since a week.",
        place="Sector 5",
        state="West Bengal",
        classification=ComplaintClassification(category=Category.electrical, priority=Priority.medium, department="Department of Power", confidence=0.9, tags=["electricity"]),
    )
    c1.id = "cmp_1"
    
    results = find_duplicates_with_scores(
        new_text="The street light is not working and broken",
        place="Sector 5",
        state="West Bengal",
        category="electrical",
        existing=[c1]
    )
    assert len(results) > 0
    assert results[0]["id"] == "cmp_1"
    assert results[0]["match_percent"] > 50
