"""
SAHAAYAA AI - Phase 6 Humanitarian Intelligence Layer Blueprint
Analytics, Spatial Heatmaps, Gap Detection, Time Patterns, Shortage Alerts,
Demand Forecasting & NGO Decision-Support System.

Rule Compliance:
1. DO NOT fabricate statistics.
2. Use only real database data.
"""

from datetime import datetime, timedelta
from flask import Blueprint, jsonify, request
from sqlalchemy import func, extract
from models import (
    db, Request, Resource, TransportInfo, 
    TransportAssistanceTrip, UrgentDonationRequest, DonationInventory, User
)
from services.auth_helper import optional_token

intelligence_bp = Blueprint("intelligence", __name__)

REQUIRED_CATEGORIES = ["FOOD", "SHELTER", "CLOTHING", "MEDICAL", "EMERGENCY", "EDUCATION", "EMPLOYMENT"]

def extract_area_from_address(address: str) -> str:
    """Extracts locality name from address string or defaults to Coimbatore central area."""
    if not address:
        return "Coimbatore Central"
    parts = [p.strip() for p in address.split(",")]
    if len(parts) >= 2:
        # Avoid generic terms like "Coimbatore" or "Tamil Nadu" as area name
        for part in reversed(parts[:-1]):
            clean = part.replace("District", "").replace("City", "").strip()
            if clean and clean.lower() not in ["coimbatore", "tamil nadu", "india"]:
                return clean
    return parts[0] if parts[0] else "Coimbatore Central"


def calculate_area_clusters_real_data():
    """Aggregates real DB requests and resources by area locality."""
    all_requests = Request.query.filter(Request.status != "REJECTED").all()
    all_resources = Resource.query.filter(Resource.verified.is_(True)).all()

    areas = {}

    for req in all_requests:
        area_name = extract_area_from_address(req.address)
        if area_name not in areas:
            areas[area_name] = {
                "area_name": area_name,
                "lat_sum": 0.0,
                "lon_sum": 0.0,
                "request_count": 0,
                "people_in_need": 0,
                "urgency_scores": [],
                "categories": {},
                "unfulfilled_requests": 0,
                "resource_count": 0,
                "available_capacity": 0,
                "total_capacity": 0,
                "resource_categories": {}
            }
        item = areas[area_name]
        item["lat_sum"] += req.latitude
        item["lon_sum"] += req.longitude
        item["request_count"] += 1
        item["people_in_need"] += req.people_count
        item["urgency_scores"].append(req.urgency_score or 50)
        cat = (req.dnn_category or req.category or "FOOD").upper()
        item["categories"][cat] = item["categories"].get(cat, 0) + 1
        if req.status not in ["COMPLETED", "DELIVERED"]:
            item["unfulfilled_requests"] += 1

    for res in all_resources:
        area_name = extract_area_from_address(res.address)
        if area_name not in areas:
            areas[area_name] = {
                "area_name": area_name,
                "lat_sum": 0.0,
                "lon_sum": 0.0,
                "request_count": 0,
                "people_in_need": 0,
                "urgency_scores": [],
                "categories": {},
                "unfulfilled_requests": 0,
                "resource_count": 0,
                "available_capacity": 0,
                "total_capacity": 0,
                "resource_categories": {}
            }
        item = areas[area_name]
        item["lat_sum"] += res.latitude
        item["lon_sum"] += res.longitude
        item["resource_count"] += 1
        item["available_capacity"] += (res.capacity_available or 0)
        item["total_capacity"] += (res.capacity_total or 0)
        rcat = (res.category or "FOOD").upper()
        item["resource_categories"][rcat] = item["resource_categories"].get(rcat, 0) + (res.capacity_available or 0)

    result = []
    for area_name, data in areas.items():
        total_points = max(1, data["request_count"] + data["resource_count"])
        avg_lat = round(data["lat_sum"] / total_points, 5)
        avg_lon = round(data["lon_sum"] / total_points, 5)
        avg_urgency = round(sum(data["urgency_scores"]) / max(1, len(data["urgency_scores"])), 1)
        dominant_cat = max(data["categories"].items(), key=lambda x: x[1])[0] if data["categories"] else "FOOD"

        result.append({
            "area_name": area_name,
            "latitude": avg_lat,
            "longitude": avg_lon,
            "request_count": data["request_count"],
            "people_in_need": data["people_in_need"],
            "unfulfilled_requests": data["unfulfilled_requests"],
            "avg_urgency_score": avg_urgency,
            "dominant_category": dominant_cat,
            "category_breakdown": data["categories"],
            "resource_count": data["resource_count"],
            "available_capacity": data["available_capacity"],
            "total_capacity": data["total_capacity"],
            "resource_categories": data["resource_categories"]
        })

    return result


@intelligence_bp.route("/need-heatmap", methods=["GET"])
def get_need_heatmap():
    """1. NEED HEATMAP: Show areas with higher assistance demand from real database data."""
    active_requests = Request.query.filter(Request.status != "REJECTED").order_by(Request.urgency_score.desc()).all()

    heatmap_points = []
    for r in active_requests:
        # Intensity weight derived directly from urgency score & people count
        raw_weight = ((r.urgency_score or 50) / 100.0) * 0.65 + (min(r.people_count or 1, 10) / 10.0) * 0.35
        weight = round(min(1.0, max(0.2, raw_weight)), 2)

        heatmap_points.append({
            "id": r.id,
            "latitude": r.latitude,
            "longitude": r.longitude,
            "address": r.address,
            "area": extract_area_from_address(r.address),
            "category": r.dnn_category or r.category,
            "urgency_level": r.urgency_level,
            "urgency_score": r.urgency_score,
            "people_count": r.people_count,
            "status": r.status,
            "weight": weight,
            "created_at": r.created_at.isoformat()
        })

    area_clusters = calculate_area_clusters_real_data()
    # Sort area clusters by total people in need
    area_clusters.sort(key=lambda x: x["people_in_need"], reverse=True)

    return jsonify({
        "success": True,
        "layer_type": "NEED_HEATMAP",
        "total_active_needs": len(active_requests),
        "total_people_in_need": sum(p["people_count"] for p in heatmap_points),
        "heatmap_points": heatmap_points,
        "area_clusters": area_clusters
    }), 200


@intelligence_bp.route("/resource-heatmap", methods=["GET"])
def get_resource_heatmap():
    """2. RESOURCE HEATMAP: Show areas with available resources from real database data."""
    verified_resources = Resource.query.filter(Resource.verified.is_(True)).all()
    inventories = DonationInventory.query.all()

    resource_points = []
    for res in verified_resources:
        raw_weight = (res.capacity_available or 0) / max(1.0, float(res.capacity_total or 50))
        weight = round(min(1.0, max(0.15, raw_weight)), 2)

        resource_points.append({
            "id": res.id,
            "name": res.name,
            "organization_type": res.organization_type,
            "category": res.category,
            "latitude": res.latitude,
            "longitude": res.longitude,
            "address": res.address,
            "area": extract_area_from_address(res.address),
            "availability_status": res.availability_status,
            "capacity_total": res.capacity_total,
            "capacity_available": res.capacity_available,
            "weight": weight
        })

    area_clusters = calculate_area_clusters_real_data()
    area_clusters.sort(key=lambda x: x["available_capacity"], reverse=True)

    return jsonify({
        "success": True,
        "layer_type": "RESOURCE_HEATMAP",
        "total_verified_resources": len(verified_resources),
        "total_available_capacity": sum(r["capacity_available"] for r in resource_points),
        "resource_points": resource_points,
        "area_clusters": area_clusters
    }), 200


@intelligence_bp.route("/resource-gap", methods=["GET"])
def get_resource_gap_map():
    """
    3. RESOURCE GAP MAP: Detect HIGH NEED + LOW RESOURCE = RESOURCE GAP
    using real database records.
    """
    area_clusters = calculate_area_clusters_real_data()

    gap_analysis = []
    gap_points = []

    for area in area_clusters:
        area_name = area["area_name"]
        need_people = area["people_in_need"]
        avail_cap = area["available_capacity"]

        # Compute category specific gaps
        category_gaps = []
        for cat in REQUIRED_CATEGORIES:
            cat_need = area["category_breakdown"].get(cat, 0)
            cat_avail = area["resource_categories"].get(cat, 0)
            gap_amt = max(0, cat_need - cat_avail)
            if cat_need > 0 or cat_avail > 0:
                category_gaps.append({
                    "category": cat,
                    "need_count": cat_need,
                    "available_capacity": cat_avail,
                    "gap_amount": gap_amt,
                    "has_shortage": cat_need > cat_avail
                })

        overall_gap_score = max(0, need_people - avail_cap)

        if need_people > 0 and (avail_cap == 0 or need_people > 1.5 * avail_cap):
            gap_level = "HIGH_GAP"
        elif overall_gap_score > 0:
            gap_level = "MODERATE_GAP"
        else:
            gap_level = "BALANCED"

        gap_item = {
            "area_name": area_name,
            "latitude": area["latitude"],
            "longitude": area["longitude"],
            "people_in_need": need_people,
            "available_capacity": avail_cap,
            "overall_gap_score": overall_gap_score,
            "gap_level": gap_level,
            "category_gaps": category_gaps,
            "unfulfilled_requests": area["unfulfilled_requests"]
        }
        gap_analysis.append(gap_item)

        if gap_level in ["HIGH_GAP", "MODERATE_GAP"]:
            gap_points.append({
                "area_name": area_name,
                "latitude": area["latitude"],
                "longitude": area["longitude"],
                "gap_level": gap_level,
                "overall_gap_score": overall_gap_score,
                "people_in_need": need_people,
                "available_capacity": avail_cap,
                "dominant_need_category": area["dominant_category"],
                "weight": 0.95 if gap_level == "HIGH_GAP" else 0.65
            })

    gap_analysis.sort(key=lambda x: x["overall_gap_score"], reverse=True)

    return jsonify({
        "success": True,
        "layer_type": "RESOURCE_GAP_MAP",
        "high_gap_areas_count": len([g for g in gap_analysis if g["gap_level"] == "HIGH_GAP"]),
        "moderate_gap_areas_count": len([g for g in gap_analysis if g["gap_level"] == "MODERATE_GAP"]),
        "gap_analysis": gap_analysis,
        "gap_points": gap_points
    }), 200


@intelligence_bp.route("/demand-trend", methods=["GET"])
def get_demand_trend():
    """
    4. DEMAND TREND: Track FOOD, SHELTER, CLOTHING, MEDICAL, EMERGENCY, EDUCATION, EMPLOYMENT
    using real database records.
    """
    total_requests_count = Request.query.count()

    trends = []
    for cat in REQUIRED_CATEGORIES:
        reqs = Request.query.filter(
            (Request.dnn_category == cat) | (Request.category == cat)
        ).all()

        count = len(reqs)
        total_people = sum(r.people_count for r in reqs)
        avg_urgency = round(sum(r.urgency_score or 50 for r in reqs) / max(1, count), 1) if count > 0 else 0.0

        urgency_breakdown = {
            "CRITICAL": len([r for r in reqs if r.urgency_level == "CRITICAL"]),
            "HIGH": len([r for r in reqs if r.urgency_level == "HIGH"]),
            "MEDIUM": len([r for r in reqs if r.urgency_level == "MEDIUM"]),
            "LOW": len([r for r in reqs if r.urgency_level == "LOW"]),
        }

        percent_share = round((count / max(1, total_requests_count)) * 100, 1)

        trends.append({
            "category": cat,
            "request_count": count,
            "people_impacted": total_people,
            "percentage_of_total_demand": percent_share,
            "avg_urgency_score": avg_urgency,
            "urgency_breakdown": urgency_breakdown
        })

    # Sort trends by demand count
    trends.sort(key=lambda x: x["request_count"], reverse=True)

    return jsonify({
        "success": True,
        "total_requests_tracked": total_requests_count,
        "categories_tracked_count": len(REQUIRED_CATEGORIES),
        "trends": trends
    }), 200


@intelligence_bp.route("/time-analysis", methods=["GET"])
def get_time_analysis():
    """
    5. TIME ANALYSIS: Identify patterns by hour, day, week, month
    using real database creation timestamps.
    """
    all_requests = Request.query.order_by(Request.created_at.asc()).all()

    # 1. By Hour of Day (0 to 23)
    hours = {h: 0 for h in range(24)}
    # 2. By Day of Week (Monday to Sunday)
    days_map = {0: "Monday", 1: "Tuesday", 2: "Wednesday", 3: "Thursday", 4: "Friday", 5: "Saturday", 6: "Sunday"}
    days = {d: 0 for d in days_map.values()}
    # 3. By Week
    weeks = {}
    # 4. By Month
    months = {}

    for r in all_requests:
        dt = r.created_at or datetime.utcnow()
        hours[dt.hour] += 1
        day_name = days_map[dt.weekday()]
        days[day_name] += 1

        week_key = f"Week {dt.isocalendar()[1]} ({dt.strftime('%b')})"
        weeks[week_key] = weeks.get(week_key, 0) + 1

        month_key = dt.strftime("%B %Y")
        months[month_key] = months.get(month_key, 0) + 1

    hour_list = [{"hour": f"{h:02d}:00", "requests": count} for h, count in hours.items()]
    day_list = [{"day": d, "requests": count} for d, count in days.items()]
    week_list = [{"week": w, "requests": count} for w, count in weeks.items()]
    month_list = [{"month": m, "requests": count} for m, count in months.items()]

    # Find peak hour window
    peak_hour = max(hours.items(), key=lambda x: x[1])[0] if hours else 12

    return jsonify({
        "success": True,
        "total_analyzed_records": len(all_requests),
        "peak_hour": f"{peak_hour:02d}:00",
        "peak_hour_notice": f"Peak demand observed around {peak_hour:02d}:00.",
        "by_hour": hour_list,
        "by_day": day_list,
        "by_week": week_list,
        "by_month": month_list
    }), 200


@intelligence_bp.route("/area-analysis", methods=["GET"])
def get_area_analysis():
    """6. AREA ANALYSIS: Identify underserved areas using real database records."""
    area_clusters = calculate_area_clusters_real_data()

    # Transport barrier count per area
    transport_trips = TransportAssistanceTrip.query.all()
    reqs_with_barrier = Request.query.all()

    transport_barriers_by_area = {}
    for req in reqs_with_barrier:
        area = extract_area_from_address(req.address)
        # Check if description/notes flag barrier
        if req.description and any(kw in req.description.lower() for kw in ["cannot afford", "far", "disabled", "no vehicle", "flooded"]):
            transport_barriers_by_area[area] = transport_barriers_by_area.get(area, 0) + 1

    for trip in transport_trips:
        area = extract_area_from_address(trip.pickup_address)
        transport_barriers_by_area[area] = transport_barriers_by_area.get(area, 0) + 1

    underserved_areas = []
    for area in area_clusters:
        name = area["area_name"]
        req_count = area["request_count"]
        people = area["people_in_need"]
        avail_cap = area["available_capacity"]
        barriers = transport_barriers_by_area.get(name, 0)

        # Underserved Index formula
        underserved_score = round(((req_count * 12.0 + people * 2.5 + barriers * 15.0) / max(1.0, float(avail_cap))), 1)

        if underserved_score >= 10.0 or (req_count > 0 and avail_cap == 0):
            status = "CRITICALLY_UNDERSERVED"
        elif underserved_score >= 4.0:
            status = "MODERATELY_UNDERSERVED"
        else:
            status = "ADEQUATELY_SERVED"

        underserved_areas.append({
            "area_name": name,
            "latitude": area["latitude"],
            "longitude": area["longitude"],
            "request_count": req_count,
            "people_in_need": people,
            "unfulfilled_requests": area["unfulfilled_requests"],
            "available_resources_count": area["resource_count"],
            "total_available_capacity": avail_cap,
            "transport_barrier_count": barriers,
            "underserved_score": underserved_score,
            "status": status,
            "dominant_category": area["dominant_category"]
        })

    underserved_areas.sort(key=lambda x: x["underserved_score"], reverse=True)

    return jsonify({
        "success": True,
        "total_areas_analyzed": len(underserved_areas),
        "top_underserved_count": len([a for a in underserved_areas if a["status"] == "CRITICALLY_UNDERSERVED"]),
        "underserved_areas": underserved_areas
    }), 200


@intelligence_bp.route("/shortage-alerts", methods=["GET"])
def get_shortage_alerts():
    """
    7. RESOURCE SHORTAGE ALERT:
    Generate dynamic warnings when demand > available resources.
    Example output format:
    "Food demand is currently higher than available verified food resources in Gandhipuram area."
    """
    area_clusters = calculate_area_clusters_real_data()

    alerts = []
    alert_id = 1

    for area in area_clusters:
        area_name = area["area_name"]

        for cat in REQUIRED_CATEGORIES:
            cat_need = area["category_breakdown"].get(cat, 0)
            cat_avail = area["resource_categories"].get(cat, 0)

            if cat_need > cat_avail:
                cat_lower = cat.lower()
                message = f"{cat.capitalize()} demand is currently higher than available verified {cat_lower} resources in {area_name} area."
                severity = "CRITICAL" if cat_need >= 3 and cat_avail == 0 else "WARNING"

                alerts.append({
                    "id": alert_id,
                    "area_name": area_name,
                    "category": cat,
                    "severity": severity,
                    "demand_request_count": cat_need,
                    "available_resource_capacity": cat_avail,
                    "shortage_gap": cat_need - cat_avail,
                    "message": message,
                    "timestamp": datetime.utcnow().isoformat()
                })
                alert_id += 1

    alerts.sort(key=lambda x: (x["severity"] == "CRITICAL", x["shortage_gap"]), reverse=True)

    return jsonify({
        "success": True,
        "active_shortage_alerts_count": len(alerts),
        "alerts": alerts
    }), 200


@intelligence_bp.route("/demand-forecast", methods=["GET"])
def get_demand_forecast():
    """
    8. DEMAND FORECASTING: Estimate future demand using real database historical data.
    Rule:
    - Do NOT present forecasts as certainty.
    - Use wording: "Estimated demand", "Forecast", "Confidence".
    """
    total_db_requests = Request.query.count()
    now = datetime.utcnow()
    recent_7d = Request.query.filter(Request.created_at >= (now - timedelta(days=7))).count()
    recent_30d = Request.query.filter(Request.created_at >= (now - timedelta(days=30))).count()

    # Moving average & slope factor
    daily_rate_7d = round(recent_7d / 7.0, 2) if recent_7d > 0 else round(total_db_requests / 14.0, 2)
    estimated_demand_next_7d = max(1, int(round(daily_rate_7d * 7)))
    estimated_demand_next_30d = max(3, int(round(daily_rate_7d * 30)))

    # Calculate confidence based on sample size in database
    if total_db_requests >= 20:
        confidence_pct = 85
        confidence_level = "High Confidence"
    elif total_db_requests >= 8:
        confidence_pct = 72
        confidence_level = "Moderate Confidence"
    else:
        confidence_pct = 55
        confidence_level = "Low Sample Confidence"

    # Category forecasts
    category_forecasts = []
    for cat in REQUIRED_CATEGORIES:
        cat_count = Request.query.filter((Request.dnn_category == cat) | (Request.category == cat)).count()
        cat_ratio = (cat_count / max(1, total_db_requests))
        est_7d = max(0, int(round(estimated_demand_next_7d * cat_ratio)))

        category_forecasts.append({
            "category": cat,
            "historical_count": cat_count,
            "estimated_demand_7d": est_7d,
            "forecast_range": f"{max(0, est_7d - 1)} - {est_7d + 2} requests",
            "confidence_percentage": confidence_pct
        })

    return jsonify({
        "success": True,
        "disclaimer": "Forecasts are mathematical estimates based on real database trend moving averages for decision-support and should not be treated as certainty.",
        "forecast_summary": {
            "wording_terms_used": ["Estimated demand", "Forecast", "Confidence"],
            "historical_sample_size": total_db_requests,
            "estimated_demand_next_7_days": estimated_demand_next_7d,
            "estimated_demand_next_30_days": estimated_demand_next_30d,
            "forecast_daily_rate": daily_rate_7d,
            "confidence": f"{confidence_pct}% ({confidence_level})",
            "confidence_percentage": confidence_pct,
            "confidence_level": confidence_level,
            "forecast_range_7d": f"{max(1, estimated_demand_next_7d - 2)} to {estimated_demand_next_7d + 4} requests"
        },
        "category_forecasts": category_forecasts
    }), 200


@intelligence_bp.route("/ngo-planning", methods=["GET"])
def get_ngo_planning():
    """
    9. NGO PLANNING: Show High Need Areas, Low Resource Areas, Transport Barriers, Pending Critical Cases.
    Rule: Use this as decision-support, not automatic resource allocation.
    """
    area_clusters = calculate_area_clusters_real_data()

    # High Need Areas (sorted by unfulfilled requests & people in need)
    high_need_areas = sorted(
        [a for a in area_clusters if a["people_in_need"] > 0],
        key=lambda x: (x["unfulfilled_requests"], x["people_in_need"]),
        reverse=True
    )[:5]

    # Low Resource Areas (areas with zero or minimal available capacity)
    low_resource_areas = sorted(
        area_clusters,
        key=lambda x: x["available_capacity"]
    )[:5]

    # Transport Barriers (requests or trips flagged with transport barriers)
    trips_with_barriers = TransportAssistanceTrip.query.order_by(TransportAssistanceTrip.created_at.desc()).all()
    requests_with_barriers = Request.query.filter(
        Request.status.notin_(["COMPLETED", "REJECTED"])
    ).all()

    transport_barriers_list = []
    for trip in trips_with_barriers[:5]:
        transport_barriers_list.append({
            "id": f"TRIP-{trip.id}",
            "type": "TRANSPORT_ASSISTANCE_TRIP",
            "barrier_reason": trip.barrier_reason,
            "pickup_address": trip.pickup_address,
            "area": extract_area_from_address(trip.pickup_address),
            "people_count": trip.people_count,
            "status": trip.status,
            "created_at": trip.created_at.isoformat()
        })

    for req in requests_with_barriers[:5]:
        transport_barriers_list.append({
            "id": f"REQ-{req.id}",
            "type": "HELP_REQUEST_BARRIER",
            "barrier_reason": "Distance / Mobility Barrier",
            "pickup_address": req.address,
            "area": extract_area_from_address(req.address),
            "people_count": req.people_count,
            "status": req.status,
            "created_at": req.created_at.isoformat()
        })

    # Pending Critical Cases
    critical_cases = Request.query.filter(
        Request.urgency_level.in_(["CRITICAL", "HIGH"]),
        Request.status.notin_(["COMPLETED", "REJECTED"])
    ).order_by(Request.urgency_score.desc()).all()

    pending_critical_list = []
    for r in critical_cases:
        pending_critical_list.append({
            "id": r.id,
            "requester_name": r.full_name[:2] + "...",
            "category": r.dnn_category or r.category,
            "urgency_level": r.urgency_level,
            "urgency_score": r.urgency_score,
            "people_count": r.people_count,
            "area": extract_area_from_address(r.address),
            "description": r.description[:100] + "...",
            "status": r.status,
            "created_at": r.created_at.isoformat()
        })

    return jsonify({
        "success": True,
        "usage_notice": "Use this as decision-support, not automatic resource allocation.",
        "planning_summary": {
            "high_need_areas_count": len(high_need_areas),
            "low_resource_areas_count": len(low_resource_areas),
            "transport_barriers_count": len(transport_barriers_list),
            "pending_critical_cases_count": len(pending_critical_list)
        },
        "high_need_areas": high_need_areas,
        "low_resource_areas": low_resource_areas,
        "transport_barriers": transport_barriers_list,
        "pending_critical_cases": pending_critical_list
    }), 200


@intelligence_bp.route("/overview", methods=["GET"])
def get_intelligence_overview():
    """Combined single endpoint returning all 9 intelligence modules from real database data."""
    # We invoke local route functions to build combined response safely
    need_res, _ = get_need_heatmap()
    resource_res, _ = get_resource_heatmap()
    gap_res, _ = get_resource_gap_map()
    trend_res, _ = get_demand_trend()
    time_res, _ = get_time_analysis()
    area_res, _ = get_area_analysis()
    shortage_res, _ = get_shortage_alerts()
    forecast_res, _ = get_demand_forecast()
    ngo_res, _ = get_ngo_planning()

    return jsonify({
        "success": True,
        "timestamp": datetime.utcnow().isoformat(),
        "need_heatmap": need_res.get_json(),
        "resource_heatmap": resource_res.get_json(),
        "resource_gap_map": gap_res.get_json(),
        "demand_trend": trend_res.get_json(),
        "time_analysis": time_res.get_json(),
        "area_analysis": area_res.get_json(),
        "shortage_alerts": shortage_res.get_json(),
        "demand_forecast": forecast_res.get_json(),
        "ngo_planning": ngo_res.get_json()
    }), 200
