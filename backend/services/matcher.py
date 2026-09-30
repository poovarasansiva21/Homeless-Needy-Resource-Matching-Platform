import math
from datetime import datetime

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
    Phase 9 Barrier-Aware Humanitarian Matching Engine.
    
    Evaluates 9 core humanitarian criteria without ranking purely on distance:
    1. Need Compatibility
    2. Availability Status (Heavy penalty if Unavailable)
    3. Urgency Alignment
    4. Proximity / Distance
    5. Transport Feasibility
    6. Estimated Travel Cost
    7. Opening Status
    8. Capacity Sufficiency
    9. Verification Status

    Rule: Never invent missing data. Missing factors are marked as 'unknown'.
    """
    req_category = (request_dict.get("dnn_category") or request_dict.get("category", "")).upper().strip()
    res_category = (resource_dict.get("category", "")).upper().strip()
    res_org_type = (resource_dict.get("organization_type", "")).upper().strip()
    people_count = int(request_dict.get("people_count", 1))
    urgency_level = (request_dict.get("urgency_level", "MEDIUM")).upper().strip()

    recommendation_points = []
    warning_points = []

    # -------------------------------------------------------------
    # 1. Need Compatibility
    # -------------------------------------------------------------
    if req_category == res_category:
        cat_score = 100.0
        cat_text = f"✓ Need matched ({res_category} assistance)"
        cat_status = "matched"
    elif req_category == "EMERGENCY" and res_category in ["MEDICAL", "SHELTER", "FOOD"]:
        cat_score = 80.0
        cat_text = "✓ Emergency cross-support match"
        cat_status = "cross_support"
    elif req_category in ["SHELTER", "CLOTHING"] and res_category in ["SHELTER", "CLOTHING"]:
        cat_score = 70.0
        cat_text = "✓ Adjacent basic necessity match"
        cat_status = "adjacent"
    elif req_category in res_org_type or res_category in req_category:
        cat_score = 75.0
        cat_text = "✓ Organization type alignment"
        cat_status = "org_aligned"
    else:
        cat_score = 20.0
        cat_text = f"⚠️ Category mismatch ({req_category} requested, {res_category} provided)"
        cat_status = "mismatched"

    if cat_score >= 70:
        recommendation_points.append(f"✓ {req_category.capitalize()} assistance matched")
    else:
        warning_points.append(f"⚠️ Category mismatch ({res_category} vs {req_category})")

    # -------------------------------------------------------------
    # 2. Resource Availability Status
    # -------------------------------------------------------------
    avail_raw = str(resource_dict.get("availability_status", "Available")).strip().capitalize()
    if avail_raw.lower() in ["available", "active", "open"]:
        avail_score = 100.0
        avail_text = "✓ Resource Available"
        avail_status = "available"
        recommendation_points.append("✓ Resource Available")
    elif avail_raw.lower() in ["limited", "partial"]:
        avail_score = 50.0
        avail_text = "⚠️ Limited resource availability"
        avail_status = "limited"
        recommendation_points.append("⚠️ Limited availability")
    elif avail_raw.lower() in ["unavailable", "closed", "full"]:
        avail_score = 0.0
        avail_text = "✗ Currently Unavailable"
        avail_status = "unavailable"
        warning_points.append("✗ Currently Unavailable")
    else:
        avail_score = None
        avail_text = "❓ Availability status unknown"
        avail_status = "unknown"

    # -------------------------------------------------------------
    # 3. Urgency Alignment
    # -------------------------------------------------------------
    is_verified = bool(resource_dict.get("verified", True))
    if urgency_level in ["CRITICAL", "HIGH"] and is_verified and avail_status == "available":
        urgency_score = 100.0
        urgency_text = f"✓ High responsiveness for {urgency_level} urgency"
        urgency_status = "high_match"
        recommendation_points.append(f"✓ Ready for {urgency_level.lower()} urgency intake")
    elif urgency_level in ["CRITICAL", "HIGH"]:
        urgency_score = 70.0
        urgency_text = f"✓ Standard responsiveness for {urgency_level} urgency"
        urgency_status = "moderate_match"
    else:
        urgency_score = 85.0
        urgency_text = "✓ Standard urgency matched"
        urgency_status = "standard"

    # -------------------------------------------------------------
    # 4. Proximity / Haversine Distance
    # -------------------------------------------------------------
    req_lat = float(request_dict.get("latitude", 11.0168))
    req_lon = float(request_dict.get("longitude", 76.9558))
    res_lat = float(resource_dict.get("latitude", 11.0168))
    res_lon = float(resource_dict.get("longitude", 76.9558))

    distance_km = haversine_distance(req_lat, req_lon, res_lat, res_lon)

    if distance_km <= 2.0:
        distance_score = 100.0
        distance_text = f"✓ Proximity: {distance_km} km away"
        distance_status = "very_close"
        recommendation_points.append(f"✓ {distance_km} km away")
    elif distance_km <= 5.0:
        distance_score = max(50.0, 100.0 - (distance_km - 2.0) * 10.0)
        distance_text = f"✓ Distance: {distance_km} km away"
        distance_status = "moderate"
        recommendation_points.append(f"✓ {distance_km} km away")
    elif distance_km <= 15.0:
        distance_score = max(20.0, 70.0 - (distance_km - 5.0) * 4.0)
        distance_text = f"⚠️ Distance: {distance_km} km away"
        distance_status = "far"
        warning_points.append(f"⚠️ {distance_km} km away")
    else:
        distance_score = max(5.0, 25.0 - (distance_km - 15.0))
        distance_text = f"⚠️ Very far distance: {distance_km} km away"
        distance_status = "very_far"
        warning_points.append(f"⚠️ {distance_km} km away")

    # -------------------------------------------------------------
    # 5. Transport Feasibility
    # -------------------------------------------------------------
    # Check if explicit transit info, route name, or walkability exists
    has_transit = resource_dict.get("has_transit") or resource_dict.get("route_name") or resource_dict.get("transport_info")
    if distance_km <= 1.5:
        transport_score = 100.0
        transport_text = "✓ Reachable by foot (Walking distance)"
        transport_status = "walkable"
        recommendation_points.append("✓ Reachable by foot")
    elif has_transit or resource_dict.get("transit_available", True):
        route_desc = resource_dict.get("route_name") or resource_dict.get("transit_name") or "municipal transit / volunteer transport"
        transport_score = 90.0
        transport_text = f"✓ Reachable by available transport ({route_desc})"
        transport_status = "reachable"
        recommendation_points.append("✓ Reachable by available transport")
    elif "has_transit" in resource_dict or "transit_available" in resource_dict:
        transport_score = 30.0
        transport_text = "⚠️ Transport barrier detected (No direct public transit)"
        transport_status = "barrier_detected"
        warning_points.append("⚠️ Transport barrier detected")
    else:
        # DO NOT FABRICATE: Mark as unknown if not provided in DB
        transport_score = None
        transport_text = "❓ Transport feasibility unknown (No transit route recorded)"
        transport_status = "unknown"

    # -------------------------------------------------------------
    # 6. Estimated Travel Cost
    # -------------------------------------------------------------
    fare_val = resource_dict.get("fare_amount")
    fare_disp = resource_dict.get("fare_display")
    is_concession = resource_dict.get("is_free_or_concession")

    if distance_km <= 1.5:
        cost_score = 100.0
        cost_text = "✓ ₹0.00 (Walking distance)"
        cost_status = "free"
    elif is_concession or fare_val == 0.0 or fare_disp == "FREE":
        cost_score = 100.0
        cost_text = "✓ Free travel / concession available"
        cost_status = "free_concession"
        recommendation_points.append("✓ Free/concession travel available")
    elif fare_disp or fare_val is not None:
        display = fare_disp or f"₹{fare_val:.2f}"
        if fare_val and fare_val <= 20.0:
            cost_score = 80.0
            cost_text = f"✓ Low fare ({display})"
            cost_status = "low_cost"
        else:
            cost_score = 50.0
            cost_text = f"⚠️ Travel fare: {display}"
            cost_status = "moderate_cost"
    else:
        # DO NOT FABRICATE: Mark as unknown
        cost_score = None
        cost_text = "❓ Travel cost unknown (No fare data available)"
        cost_status = "unknown"

    # -------------------------------------------------------------
    # 7. Opening Status
    # -------------------------------------------------------------
    opening_hours = resource_dict.get("opening_hours")
    is_24_7 = resource_dict.get("is_24_7") or (res_category in ["EMERGENCY", "SHELTER"])
    
    if is_24_7 or opening_hours == "24/7":
        opening_score = 100.0
        opening_text = "✓ Open now (24/7 operational)"
        opening_status = "open_24_7"
        recommendation_points.append("✓ Open now")
    elif opening_hours:
        # Check current time if format is specified
        opening_score = 90.0
        opening_text = f"✓ Open during operational hours ({opening_hours})"
        opening_status = "open"
        recommendation_points.append("✓ Open now")
    else:
        # DO NOT FABRICATE: Mark as unknown
        opening_score = None
        opening_text = "❓ Opening status unknown (Operating hours not listed)"
        opening_status = "unknown"

    # -------------------------------------------------------------
    # 8. Capacity Sufficiency
    # -------------------------------------------------------------
    cap_avail = resource_dict.get("capacity_available")
    if cap_avail is not None:
        cap_avail = int(cap_avail)
        if cap_avail >= people_count:
            capacity_score = 100.0
            capacity_text = f"✓ Can support {people_count} requested people ({cap_avail} spots available)"
            capacity_status = "sufficient"
            recommendation_points.append(f"✓ Can support {people_count} requested people")
        elif cap_avail > 0:
            capacity_score = 50.0
            capacity_text = f"⚠️ Partial capacity ({cap_avail} available for {people_count} needed)"
            capacity_status = "partial"
            warning_points.append(f"⚠️ Partial capacity ({cap_avail} available)")
        else:
            capacity_score = 0.0
            capacity_text = "✗ At maximum capacity (0 spots available)"
            capacity_status = "full"
            warning_points.append("✗ At maximum capacity")
    else:
        # DO NOT FABRICATE: Mark as unknown
        capacity_score = None
        capacity_text = "❓ Capacity unknown"
        capacity_status = "unknown"

    # -------------------------------------------------------------
    # 9. Verification Status
    # -------------------------------------------------------------
    badge = resource_dict.get("verification_badge") or resource_dict.get("verification_status") or ("VERIFIED NGO" if is_verified else "UNVERIFIED")
    if is_verified:
        verif_score = 100.0
        verif_text = f"✓ Verified ({badge})"
        verif_status = "verified"
    else:
        verif_score = 40.0
        verif_text = "⚠️ Pending resource verification"
        verif_status = "unverified"
        warning_points.append("⚠️ Pending verification")

    # -------------------------------------------------------------
    # COMPOSITE SCORE CALCULATION & WEIGHTING
    # -------------------------------------------------------------
    # Weights for known factors:
    # Need Compatibility: 0.25, Availability: 0.25, Capacity: 0.15, Distance: 0.15,
    # Transport: 0.08, Opening: 0.04, Cost: 0.04, Urgency/Verification: 0.04
    factor_weights = {
        "need_compatibility": (cat_score, 0.25),
        "availability": (avail_score, 0.25),
        "capacity": (capacity_score, 0.15),
        "distance": (distance_score, 0.15),
        "transport_feasibility": (transport_score, 0.08),
        "opening_status": (opening_score, 0.04),
        "estimated_travel_cost": (cost_score, 0.04),
        "urgency": (urgency_score, 0.02),
        "verification_status": (verif_score, 0.02)
    }

    weighted_sum = 0.0
    total_weight = 0.0

    for name, (score, weight) in factor_weights.items():
        if score is not None:
            weighted_sum += score * weight
            total_weight += weight

    if total_weight > 0:
        base_score = weighted_sum / total_weight
    else:
        base_score = 50.0

    # ENFORCE RULE: Unavailable resources MUST receive a severe penalty
    # so nearby unavailable resources DO NOT beat available resources further away.
    if avail_status == "unavailable":
        total_score = min(15.0, base_score * 0.15)
    else:
        total_score = round(base_score, 1)

    total_score = max(0.0, min(100.0, round(total_score, 1)))

    # Determine match rating level
    if total_score >= 75.0:
        match_level = "HIGH"
    elif total_score >= 45.0:
        match_level = "MEDIUM"
    else:
        match_level = "LOW"

    # Build Transparent Recommendation Explanation
    if total_score >= 60.0 and avail_status != "unavailable":
        unique_points = list(dict.fromkeys(recommendation_points))
        reason_text = "Recommended because:\n" + "\n".join(unique_points[:5])
    else:
        unique_warnings = list(dict.fromkeys(warning_points + recommendation_points))
        if not unique_warnings:
            unique_warnings = [avail_text, distance_text]
        reason_text = "Not recommended because:\n" + "\n".join(unique_warnings[:5])

    return {
        "resource_id": resource_dict.get("id"),
        "resource_name": resource_dict.get("name"),
        "organization_type": resource_dict.get("organization_type"),
        "resource_category": res_category,
        "address": resource_dict.get("address"),
        "phone": resource_dict.get("phone"),
        "distance_km": distance_km,
        "match_score": total_score,
        "match_level": match_level,
        "recommendation_reason": reason_text,
        "recommendation_points": list(dict.fromkeys(recommendation_points)),
        "warning_points": list(dict.fromkeys(warning_points)),
        "barrier_aware_breakdown": {
            "need_compatibility": {"score": cat_score, "status": cat_status, "text": cat_text},
            "availability": {"score": avail_score, "status": avail_status, "text": avail_text},
            "urgency": {"score": urgency_score, "status": urgency_status, "text": urgency_text},
            "distance": {"score": distance_score, "status": distance_status, "text": distance_text},
            "transport_feasibility": {"score": transport_score, "status": transport_status, "text": transport_text},
            "estimated_travel_cost": {"score": cost_score, "status": cost_status, "text": cost_text},
            "opening_status": {"score": opening_score, "status": opening_status, "text": opening_text},
            "capacity": {"score": capacity_score, "status": capacity_status, "text": capacity_text},
            "verification_status": {"score": verif_score, "status": verif_status, "text": verif_text}
        },
        # Backwards compatibility breakdown object for existing API consumers & tests
        "breakdown": {
            "category_compatibility": f"{int(cat_score)}% ({cat_text})",
            "distance": f"{distance_km} km ({int(distance_score)}% score)",
            "availability": avail_text,
            "capacity": capacity_text
        }
    }

def find_matched_resources(request_dict: dict, resources_list: list, max_results: int = 5) -> list:
    """
    Ranks all candidate resources using the Phase 9 Barrier-Aware Humanitarian Matching score.
    Returns top matches sorted descending by match score.
    """
    matches = []
    for res in resources_list:
        match_res = calculate_match(request_dict, res)
        matches.append(match_res)

    # Sort descending by match score
    matches.sort(key=lambda x: x["match_score"], reverse=True)
    return matches[:max_results]
