import math

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance between two points 
    on the earth (specified in decimal degrees).
    Returns distance in kilometers.
    """
    R = 6371.0  # Earth radius in kilometers

    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 + 
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * 
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    distance = R * c
    return round(distance, 2)

def calculate_match(request_dict: dict, resource_dict: dict) -> dict:
    """
    Calculates deterministic match score (0-100%) and detailed breakdown
    between a help request and an available resource organization.
    """
    req_category = (request_dict.get("dnn_category") or request_dict.get("category", "")).upper().strip()
    res_category = resource_dict.get("category", "").upper().strip()
    people_count = int(request_dict.get("people_count", 1))

    # 1. Category Compatibility (Weight: 40%)
    if req_category == res_category:
        category_compatibility = 100
        category_text = "Exact category match"
    elif req_category == "EMERGENCY" and res_category in ["MEDICAL", "SHELTER", "FOOD"]:
        category_compatibility = 80
        category_text = "Emergency cross-support match"
    elif req_category in ["SHELTER", "CLOTHING"] and res_category in ["SHELTER", "CLOTHING"]:
        category_compatibility = 70
        category_text = "Adjacent basic necessity match"
    else:
        category_compatibility = 20
        category_text = "General assistance only"

    # 2. Distance Calculation (Weight: 30%)
    req_lat = float(request_dict.get("latitude", 11.0168))
    req_lon = float(request_dict.get("longitude", 76.9558))
    res_lat = float(resource_dict.get("latitude", 11.0168))
    res_lon = float(resource_dict.get("longitude", 76.9558))

    distance_km = haversine_distance(req_lat, req_lon, res_lat, res_lon)

    if distance_km <= 2.0:
        distance_score = 100
    elif distance_km <= 5.0:
        distance_score = max(50, 100 - (distance_km - 2.0) * 10)
    elif distance_km <= 15.0:
        distance_score = max(20, 70 - (distance_km - 5.0) * 4)
    else:
        distance_score = max(5, 25 - (distance_km - 15.0))

    # 3. Resource Availability & Verification (Weight: 15%)
    availability_status = resource_dict.get("availability_status", "Available").lower()
    if availability_status == "available":
        avail_score = 90
        avail_status_text = "Immediately Available"
    elif availability_status == "limited":
        avail_score = 50
        avail_status_text = "Limited Capacity"
    else:
        avail_score = 10
        avail_status_text = "Temporarily Unavailable"

    if resource_dict.get("verified", True):
        avail_score = min(100, avail_score + 10)

    # 4. Capacity Sufficiency (Weight: 15%)
    cap_avail = int(resource_dict.get("capacity_available", 20))
    if cap_avail >= people_count:
        capacity_score = 100
        capacity_status = f"Sufficient ({cap_avail} spots available for {people_count} people)"
    elif cap_avail > 0:
        capacity_score = 55
        capacity_status = f"Partial ({cap_avail} available, {people_count} needed)"
    else:
        capacity_score = 15
        capacity_status = "At maximum capacity"

    # Composite Score
    total_score = (
        (category_compatibility * 0.40) +
        (distance_score * 0.30) +
        (avail_score * 0.15) +
        (capacity_score * 0.15)
    )

    # Urgency multiplier for high/critical requests (slight boost if within reasonable distance)
    urgency_level = request_dict.get("urgency_level", "MEDIUM").upper()
    if urgency_level in ["HIGH", "CRITICAL"] and distance_km <= 10.0 and category_compatibility >= 70:
        total_score = min(100.0, total_score + 5.0)

    total_score = round(total_score, 1)

    return {
        "resource_id": resource_dict.get("id"),
        "resource_name": resource_dict.get("name"),
        "organization_type": resource_dict.get("organization_type"),
        "resource_category": res_category,
        "address": resource_dict.get("address"),
        "phone": resource_dict.get("phone"),
        "distance_km": distance_km,
        "match_score": total_score,
        "breakdown": {
            "category_compatibility": f"{int(category_compatibility)}% ({category_text})",
            "distance": f"{distance_km} km ({int(distance_score)}% score)",
            "availability": avail_status_text,
            "capacity": capacity_status
        }
    }

def find_matched_resources(request_dict: dict, resources_list: list, max_results: int = 5) -> list:
    """
    Ranks all candidate resources using matching score and returns top matches.
    """
    matches = []
    for res in resources_list:
        match_res = calculate_match(request_dict, res)
        matches.append(match_res)

    # Sort descending by match score
    matches.sort(key=lambda x: x["match_score"], reverse=True)
    return matches[:max_results]
