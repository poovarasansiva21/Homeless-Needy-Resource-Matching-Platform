import difflib
from datetime import datetime, timedelta
from .matcher import haversine_distance

def check_duplicate_request(new_request: dict, existing_requests: list) -> dict:
    """
    Evaluates whether a newly submitted request is a probable duplicate
    by examining textual similarity, phone number, proximity, and recency.
    Returns flags and notes for Admin review without rejecting the requester.
    """
    new_text = new_request.get("description", "").lower().strip()
    new_phone = new_request.get("phone", "").strip()
    new_lat = float(new_request.get("latitude", 0.0))
    new_lon = float(new_request.get("longitude", 0.0))
    current_time = datetime.utcnow()

    is_duplicate = False
    duplicate_reasons = []
    matched_request_id = None

    for prev in existing_requests:
        # Ignore completed or rejected requests older than 7 days
        prev_created = prev.get("created_at")
        if isinstance(prev_created, str):
            try:
                prev_time = datetime.fromisoformat(prev_created.replace("Z", ""))
            except Exception:
                prev_time = current_time - timedelta(hours=2)
        elif isinstance(prev_created, datetime):
            prev_time = prev_created
        else:
            prev_time = current_time - timedelta(hours=2)

        time_diff = abs((current_time - prev_time).total_seconds())

        # Check only within 72 hours
        if time_diff > 72 * 3600:
            continue

        prev_phone = prev.get("phone", "").strip()
        prev_text = prev.get("description", "").lower().strip()
        prev_lat = float(prev.get("latitude", 0.0))
        prev_lon = float(prev.get("longitude", 0.0))

        # 1. Phone number match
        same_phone = bool(new_phone and prev_phone and new_phone == prev_phone)

        # 2. Text similarity ratio
        text_sim = difflib.SequenceMatcher(None, new_text, prev_text).ratio()

        # 3. Location proximity
        dist_km = 999.0
        if new_lat and new_lon and prev_lat and prev_lon:
            dist_km = haversine_distance(new_lat, new_lon, prev_lat, prev_lon)

        # Duplicate detection heuristics
        if same_phone and text_sim > 0.65:
            is_duplicate = True
            duplicate_reasons.append(f"Identical contact phone with {int(text_sim * 100)}% matching description within recent hours.")
            matched_request_id = prev.get("id")
            break
        elif text_sim > 0.85 and dist_km <= 1.0:
            is_duplicate = True
            duplicate_reasons.append(f"Very high textual similarity ({int(text_sim * 100)}%) submitted within 1 km of request #{prev.get('id')}.")
            matched_request_id = prev.get("id")
            break
        elif same_phone and time_diff < 1800: # submitted within 30 minutes
            is_duplicate = True
            duplicate_reasons.append(f"Repeated submission from same phone number within 30 minutes of request #{prev.get('id')}.")
            matched_request_id = prev.get("id")
            break

    return {
        "is_flagged_duplicate": is_duplicate,
        "duplicate_notes": "; ".join(duplicate_reasons) if duplicate_reasons else None,
        "matched_request_id": matched_request_id,
        "warning_message": "Possible duplicate request detected. Flagged for administrative review." if is_duplicate else None
    }
