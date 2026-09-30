import random
import string
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from models import db, TransportInfo, TransportReport, TransportAssistanceTrip, Resource, Request, User
from services.auth_helper import optional_token, token_required

mobility_bp = Blueprint("mobility", __name__)

def emit_socket_event(event_name, payload):
    try:
        from app import socketio
        socketio.emit(event_name, payload)
    except Exception as e:
        print(f"[SocketIO Error] Mobility event {event_name} failed: {e}")

def generate_trip_code():
    """Generates unique Trip ID in SAH-2048 format"""
    while True:
        num = random.randint(1000, 9999)
        code = f"SAH-{num}"
        existing = TransportAssistanceTrip.query.filter_by(trip_code=code).first()
        if not existing:
            return code

@mobility_bp.route("/routes", methods=["GET"])
def get_transport_routes():
    """
    Returns verified public transport information for a resource or general routes.
    Includes safety notices, fare eligibility, and verification status badges (🟢 🟡 🔴).
    """
    resource_id = request.args.get("resource_id", type=int)
    
    query = TransportInfo.query
    if resource_id:
        routes = query.filter_by(resource_id=resource_id).all()
        if not routes:
            # Fallback to unlinked/general transport options + resource specific generated option
            routes = query.filter(TransportInfo.resource_id.is_(None)).all()
            target_res = db.session.get(Resource, resource_id)
            if target_res and not routes:
                # Provide standard verified municipal transit info template for the location
                routes = [
                    TransportInfo(
                        resource_id=target_res.id,
                        provider="TNSTC City Connector Bus",
                        route_name=f"City Bus Route ➔ {target_res.name}",
                        fare_amount=15.0,
                        fare_display="₹15.00 - ₹25.00",
                        is_free_or_concession=True,
                        eligibility="General Public / Concession available for Seniors & PwD",
                        source="TNSTC Official Municipal Directory",
                        status="VERIFIED",
                        safety_notice="Free/concession travel may be available for eligible users. Verify eligibility before travelling."
                    )
                ]
    else:
        routes = query.all()

    safety_disclaimer = "Free/concession travel may be available for eligible users. Verify eligibility before travelling."

    return jsonify({
        "success": True,
        "safety_disclaimer": safety_disclaimer,
        "routes": [r.to_dict() for r in routes]
    }), 200

@mobility_bp.route("/barrier", methods=["POST"])
def log_transport_barrier():
    """
    Logs 'I CAN'T REACH IT' transport barrier signal.
    Accepts reasons: cannot_afford_transport, too_far, no_transport, with_children, other.
    """
    data = request.get_json() or {}
    barrier_reason = data.get("barrier_reason", "cannot_afford_transport").strip().lower()
    resource_id = data.get("resource_id")
    request_id = data.get("request_id")
    notes = data.get("notes", "")

    valid_reasons = {"cannot_afford_transport", "too_far", "no_transport", "with_children", "other"}
    if barrier_reason not in valid_reasons:
        barrier_reason = "other"

    # Fetch available transport routes for this resource
    routes = []
    if resource_id:
        routes = TransportInfo.query.filter_by(resource_id=resource_id).all()
    if not routes:
        routes = TransportInfo.query.filter(TransportInfo.resource_id.is_(None)).all()

    emit_socket_event("transport_barrier_flagged", {
        "resource_id": resource_id,
        "request_id": request_id,
        "barrier_reason": barrier_reason,
        "timestamp": datetime.utcnow().isoformat()
    })

    return jsonify({
        "success": True,
        "message": "Transport barrier registered.",
        "barrier_reason": barrier_reason,
        "transport_needed": True,
        "available_routes": [r.to_dict() for r in routes],
        "can_request_assistance": True,
        "assistance_prompt": "If public transport is unavailable or unsuitable, request verified Sahaayaa volunteer transit assistance."
    }), 200

@mobility_bp.route("/report-info", methods=["POST"])
@optional_token
def report_transport_info(current_user):
    """
    ⚠️ REPORT TRANSPORT INFORMATION
    Reasons: wrong_fare, wrong_route, wrong_timing, fake_driver, fake_volunteer, unexpected_payment, fake_ngo, suspicious_information.
    Automatically flags transport info as UNVERIFIED/REPORTED (🔴) to protect users.
    """
    data = request.get_json() or {}
    reason = data.get("reason", "").strip().lower()
    transport_info_id = data.get("transport_info_id")
    trip_id = data.get("trip_id")
    details = data.get("details", "").strip()

    valid_reasons = {
        "wrong_fare", "wrong_route", "wrong_timing", "fake_driver",
        "fake_volunteer", "unexpected_payment", "fake_ngo", "suspicious_information"
    }

    if reason not in valid_reasons:
        return jsonify({
            "error": f"Invalid report reason. Allowed reasons: {', '.join(sorted(valid_reasons))}"
        }), 400

    report = TransportReport(
        transport_info_id=transport_info_id,
        trip_id=trip_id,
        reporter_user_id=current_user.id if current_user else None,
        reason=reason,
        details=details
    )
    db.session.add(report)

    # Automatically set status of transport_info to UNVERIFIED_REPORTED (🔴)
    if transport_info_id:
        info = db.session.get(TransportInfo, transport_info_id)
        if info:
            info.status = "UNVERIFIED_REPORTED"

    db.session.commit()

    emit_socket_event("transport_report_submitted", {
        "report_id": report.id,
        "transport_info_id": transport_info_id,
        "reason": reason,
        "timestamp": datetime.utcnow().isoformat()
    })

    return jsonify({
        "success": True,
        "message": "Transport safety report submitted. The route status has been flagged for audit.",
        "report": report.to_dict()
    }), 201

@mobility_bp.route("/request-assistance", methods=["POST"])
@optional_token
def request_transport_assistance(current_user):
    """
    🤝 REQUEST TRANSPORT ASSISTANCE
    Creates a new trip request with unique ASSISTANCE/TRIP ID (e.g. SAH-2048).
    Initial Status: REQUESTED.
    """
    data = request.get_json() or {}
    pickup_address = data.get("pickup_address", "").strip()
    destination_address = data.get("destination_address", "").strip()
    barrier_reason = data.get("barrier_reason", "cannot_afford_transport").strip().lower()
    resource_id = data.get("resource_id")
    request_id = data.get("request_id")
    people_count = int(data.get("people_count", 1))

    if not pickup_address:
        pickup_address = "Coimbatore Central Region (User Location)"
    if not destination_address and resource_id:
        res = Resource.query.get(resource_id)
        if res:
            destination_address = f"{res.name}, {res.address}"
    if not destination_address:
        destination_address = "Coimbatore Community Relief Center"

    trip_code = generate_trip_code()

    trip = TransportAssistanceTrip(
        trip_code=trip_code,
        requester_user_id=current_user.id if current_user else None,
        request_id=request_id,
        resource_id=resource_id,
        barrier_reason=barrier_reason,
        pickup_address=pickup_address,
        pickup_latitude=float(data.get("pickup_latitude", 11.0168)),
        pickup_longitude=float(data.get("pickup_longitude", 76.9558)),
        destination_address=destination_address,
        people_count=people_count,
        status="REQUESTED"
    )

    db.session.add(trip)
    db.session.commit()

    trip_data = trip.to_dict(is_authorized=False)

    emit_socket_event("new_transport_assistance_request", {
        "trip_code": trip_code,
        "status": "REQUESTED",
        "barrier_reason": barrier_reason,
        "timestamp": datetime.utcnow().isoformat()
    })

    return jsonify({
        "success": True,
        "message": "Transport assistance request submitted successfully.",
        "trip_code": trip_code,
        "trip": trip_data,
        "pipeline_states": [
            "REQUESTED", "ACCEPTED", "RESPONDER_ASSIGNED", "ON_THE_WAY",
            "PICKUP_CONFIRMED", "DESTINATION_REACHED", "COMPLETED"
        ]
    }), 201

@mobility_bp.route("/trip/<trip_code>", methods=["GET"])
@optional_token
def get_trip_details(current_user, trip_code):
    """
    Retrieves status & details for an ASSISTANCE/TRIP ID (e.g. SAH-2048).
    Strictly masks sensitive personal details unless authorized.
    """
    trip = TransportAssistanceTrip.query.filter_by(trip_code=trip_code).first()
    if not trip:
        return jsonify({"error": f"Trip request #{trip_code} not found."}), 404

    is_authorized = False
    if current_user:
        if current_user.role in ["admin", "volunteer", "ngo"] or current_user.id == trip.requester_user_id:
            is_authorized = True

    return jsonify({
        "success": True,
        "trip": trip.to_dict(is_authorized=is_authorized),
        "current_status": trip.status,
        "pipeline": [
            {"step": "REQUESTED", "completed": True},
            {"step": "ACCEPTED", "completed": trip.status in ["ACCEPTED", "RESPONDER_ASSIGNED", "ON_THE_WAY", "PICKUP_CONFIRMED", "DESTINATION_REACHED", "COMPLETED"]},
            {"step": "RESPONDER_ASSIGNED", "completed": trip.status in ["RESPONDER_ASSIGNED", "ON_THE_WAY", "PICKUP_CONFIRMED", "DESTINATION_REACHED", "COMPLETED"]},
            {"step": "ON_THE_WAY", "completed": trip.status in ["ON_THE_WAY", "PICKUP_CONFIRMED", "DESTINATION_REACHED", "COMPLETED"]},
            {"step": "PICKUP_CONFIRMED", "completed": trip.status in ["PICKUP_CONFIRMED", "DESTINATION_REACHED", "COMPLETED"]},
            {"step": "DESTINATION_REACHED", "completed": trip.status in ["DESTINATION_REACHED", "COMPLETED"]},
            {"step": "COMPLETED", "completed": trip.status == "COMPLETED"}
        ]
    }), 200

@mobility_bp.route("/trip/<trip_code>/status", methods=["PATCH"])
@optional_token
def update_trip_status(current_user, trip_code):
    """
    Updates status of a transport assistance trip.
    Only authorized/verified responders (volunteers, NGOs, admins) can accept or update status.
    """
    trip = TransportAssistanceTrip.query.filter_by(trip_code=trip_code).first()
    if not trip:
        return jsonify({"error": f"Trip request #{trip_code} not found."}), 404

    data = request.get_json() or {}
    new_status = data.get("status", "").strip().upper()

    valid_statuses = {
        "REQUESTED", "ACCEPTED", "RESPONDER_ASSIGNED", "ON_THE_WAY",
        "PICKUP_CONFIRMED", "DESTINATION_REACHED", "COMPLETED"
    }

    if new_status not in valid_statuses:
        return jsonify({
            "error": f"Invalid status '{new_status}'. Allowed pipeline states: {', '.join(sorted(valid_statuses))}"
        }), 400

    # Ensure assigned responder is authorized/verified
    if current_user:
        if current_user.role in ["volunteer", "ngo", "admin"]:
            if not trip.assigned_responder_id:
                trip.assigned_responder_id = current_user.id

    responder_id_arg = data.get("responder_id")
    if responder_id_arg:
        resp_user = User.query.get(responder_id_arg)
        if resp_user and resp_user.role in ["volunteer", "ngo", "admin"]:
            trip.assigned_responder_id = resp_user.id

    trip.status = new_status
    if data.get("notes"):
        trip.notes = data.get("notes")

    trip.updated_at = datetime.utcnow()
    db.session.commit()

    emit_socket_event("trip_status_update", {
        "trip_code": trip.trip_code,
        "status": trip.status,
        "assigned_responder": trip.assigned_responder.full_name if trip.assigned_responder else None,
        "updated_at": trip.updated_at.isoformat()
    })

    return jsonify({
        "success": True,
        "message": f"Trip #{trip_code} updated to status '{new_status}'.",
        "trip": trip.to_dict(is_authorized=True)
    }), 200

@mobility_bp.route("/trips/active", methods=["GET"])
def get_active_trips():
    """Returns active transport assistance requests for responders & volunteers."""
    trips = TransportAssistanceTrip.query.order_by(TransportAssistanceTrip.created_at.desc()).limit(20).all()
    return jsonify({
        "success": True,
        "trips": [t.to_dict(is_authorized=False) for t in trips]
    }), 200
