"""
SAHAAYAA AI - Intelligent Donation Matcher Service
Performs natural language parsing and multi-factor matching for need-driven donations:
DONATION + CURRENT NEED + RESOURCE + LOCATION
"""

import math
import re
from models import db, Request, Resource, UrgentDonationRequest, DonationInventory

CATEGORY_KEYWORDS = {
    "BLANKETS": ["blanket", "blankets", "bedsheet", "bedsheets", "quilt", "quilts", "shawl", "shawls", "warmth", "bedding"],
    "FOOD": ["food", "meal", "meals", "rice", "grocery", "rations", "ration", "eat", "eating", "bread", "fruit", "milk"],
    "CLOTHING": ["cloth", "clothes", "clothing", "dress", "dresses", "shirt", "shirts", "pant", "pants", "jacket", "jackets", "coat", "raincoat"],
    "HYGIENE": ["soap", "soaps", "towel", "towels", "sanitary", "hygiene", "toothpaste", "brush", "first aid", "bandage", "sanitizer"],
}

def parse_donation_text(text: str):
    """
    Extracts item category, quantity, and unit from natural language prompt.
    Example: "I can donate 10 blankets" -> {category: 'BLANKETS', quantity: 10, unit: 'blankets'}
    """
    if not text:
        return {"item_category": "OTHER", "quantity": 1, "unit": "items"}

    text_lower = text.lower()

    # 1. Detect Category
    detected_category = "OTHER"
    for cat, keywords in CATEGORY_KEYWORDS.items():
        for kw in keywords:
            if re.search(r'\b' + re.escape(kw) + r'\b', text_lower):
                detected_category = cat
                break
        if detected_category != "OTHER":
            break

    # 2. Detect Quantity (digits or written numbers)
    digit_match = re.search(r'\b(\d+)\b', text_lower)
    if digit_match:
        quantity = int(digit_match.group(1))
    else:
        word_numbers = {
            "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
            "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
            "twenty": 20, "fifty": 50, "hundred": 100
        }
        quantity = 1
        for word, val in word_numbers.items():
            if re.search(r'\b' + word + r'\b', text_lower):
                quantity = val
                break

    # 3. Detect Unit
    unit_map = {
        "BLANKETS": "blankets",
        "FOOD": "meals",
        "CLOTHING": "items",
        "HYGIENE": "kits",
        "OTHER": "items"
    }
    unit = unit_map.get(detected_category, "items")

    return {
        "item_category": detected_category,
        "quantity": quantity,
        "unit": unit,
        "parsed_prompt": text
    }


def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculates distance between two lat/lng points in km."""
    R = 6371.0  # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)


def find_intelligent_donation_matches(donor_lat: float, donor_lng: float, item_category: str, quantity: int, text_prompt: str = None, max_results: int = 5):
    """
    Algorithmic matching of donor pledges against REAL active urgent requests, verified beneficiary requests, and resource hubs.
    Matches follow strict structure:
    DONATION + CURRENT NEED + RESOURCE + LOCATION
    """
    matches = []
    item_category = item_category.upper()

    # 1. Match against Urgent Donation Requests (highest priority)
    urgent_requests = UrgentDonationRequest.query.filter(
        UrgentDonationRequest.status == "ACTIVE",
        UrgentDonationRequest.item_category == item_category
    ).all()

    for u_req in urgent_requests:
        dist_km = haversine_distance(donor_lat, donor_lng, u_req.latitude, u_req.longitude)
        
        # Urgency scoring
        urgency_weight = 35 if u_req.urgency_level == "CRITICAL" else (25 if u_req.urgency_level == "HIGH" else 15)
        dist_weight = max(0, 15 - dist_km)  # Up to 15 points for proximity
        
        score = min(99.0, round(50.0 + urgency_weight + dist_weight, 1))
        
        res_obj = u_req.resource
        res_info = {
            "id": res_obj.id if res_obj else None,
            "name": res_obj.name if res_obj else "Community Distribution Hub",
            "organization_type": res_obj.organization_type if res_obj else "Relief Center",
            "phone": res_obj.phone if res_obj else None,
            "address": res_obj.address if res_obj else u_req.address
        }

        # Locality privacy safe string
        locality = u_req.address.split(",")[-1].strip() if "," in u_req.address else "Coimbatore Locality"

        matches.append({
            "match_id": f"urgent-{u_req.id}",
            "match_type": "URGENT_REQUEST",
            "match_score": score,
            "donation": {
                "item_category": item_category,
                "quantity": quantity,
                "description": text_prompt or f"{quantity} {item_category.lower()}"
            },
            "current_need": {
                "urgent_request_id": u_req.id,
                "title": u_req.title,
                "item_category": u_req.item_category,
                "urgency_level": u_req.urgency_level,
                "required_quantity": u_req.required_quantity,
                "fulfilled_quantity": u_req.fulfilled_quantity,
                "remaining_quantity": max(0, u_req.required_quantity - u_req.fulfilled_quantity),
                "description": u_req.description
            },
            "resource": res_info,
            "location": {
                "distance_km": dist_km,
                "locality": locality,
                "address": locality  # Anonymized address for donor privacy
            }
        })

    # 2. Match against active verified Requesters in database
    active_requests = Request.query.filter(
        Request.status.in_(["VERIFIED", "PENDING_VERIFICATION", "MATCHING", "ACCEPTED"]),
        Request.category == item_category
    ).all()

    for req in active_requests:
        dist_km = haversine_distance(donor_lat, donor_lng, req.latitude, req.longitude)
        urgency_weight = 30 if req.urgency_level == "CRITICAL" else (20 if req.urgency_level == "HIGH" else 10)
        dist_weight = max(0, 15 - dist_km)
        
        score = min(98.0, round(45.0 + urgency_weight + dist_weight, 1))
        
        # Link to assigned NGO or closest resource
        assigned_res = Resource.query.filter_by(category=item_category).first()
        res_info = {
            "id": assigned_res.id if assigned_res else None,
            "name": assigned_res.name if assigned_res else "Local Humanitarian Distribution Center",
            "organization_type": assigned_res.organization_type if assigned_res else "Shelter Hub",
            "phone": assigned_res.phone if assigned_res else None,
            "address": assigned_res.address if assigned_res else "Coimbatore Central Distribution Center"
        }

        locality = req.address.split(",")[-1].strip() if "," in req.address else "Coimbatore Locality"

        matches.append({
            "match_id": f"request-{req.id}",
            "match_type": "BENEFICIARY_REQUEST",
            "match_score": score,
            "donation": {
                "item_category": item_category,
                "quantity": quantity,
                "description": text_prompt or f"{quantity} {item_category.lower()}"
            },
            "current_need": {
                "request_id": req.id,
                "title": f"Verified Need: {req.category} Assistance for {req.people_count} People",
                "item_category": req.category,
                "urgency_level": req.urgency_level,
                "required_quantity": req.people_count,
                "description": req.description
            },
            "resource": res_info,
            "location": {
                "distance_km": dist_km,
                "locality": locality,
                "address": locality  # Anonymized address for donor privacy (never expose street address/phone)
            }
        })

    # 3. Match against verified Resource Hub Inventory needs
    resource_hubs = Resource.query.filter(
        Resource.category == item_category,
        Resource.verified == True
    ).all()

    for r_hub in resource_hubs:
        dist_km = haversine_distance(donor_lat, donor_lng, r_hub.latitude, r_hub.longitude)
        dist_weight = max(0, 15 - dist_km)
        score = min(92.0, round(50.0 + dist_weight, 1))

        locality = r_hub.address.split(",")[-1].strip() if "," in r_hub.address else "Coimbatore Locality"

        matches.append({
            "match_id": f"resource-{r_hub.id}",
            "match_type": "RESOURCE_HUB",
            "match_score": score,
            "donation": {
                "item_category": item_category,
                "quantity": quantity,
                "description": text_prompt or f"{quantity} {item_category.lower()}"
            },
            "current_need": {
                "resource_id": r_hub.id,
                "title": f"Shelter Supply Replenishment: {r_hub.name}",
                "item_category": item_category,
                "urgency_level": "NORMAL",
                "required_quantity": quantity,
                "description": f"Direct inventory contribution to {r_hub.organization_type}."
            },
            "resource": {
                "id": r_hub.id,
                "name": r_hub.name,
                "organization_type": r_hub.organization_type,
                "phone": r_hub.phone,
                "address": r_hub.address
            },
            "location": {
                "distance_km": dist_km,
                "locality": locality,
                "address": locality
            }
        })

    # Sort matches by match_score descending
    matches.sort(key=lambda x: x["match_score"], reverse=True)
    return matches[:max_results]
