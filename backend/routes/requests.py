import random
from datetime import datetime
from flask import Blueprint, request, jsonify
from models import db, Request, Resource, Match, Donation, RequestStatusHistory, Notification, AuditLog
from services.auth_helper import token_required, optional_token, role_required
from services.classifier import classify_text
from services.urgency import analyze_urgency
from services.matcher import find_matched_resources
from services.verification import check_duplicate_request
from services.rate_limiter import rate_limit

requests_bp = Blueprint("requests", __name__)

def emit_socket_event(event_name, payload):
    try:
        from app import socketio
        socketio.emit(event_name, payload)
    except Exception as e:
        print(f"[SocketIO Error] Failed to emit {event_name}: {e}")

@requests_bp.route("", methods=["POST"])
@optional_token
@rate_limit(max_requests=10, window_seconds=60, bucket_name="create_request")
def create_request(current_user):
    data = request.get_json() or {}
    is_help_someone = data.get("is_help_someone", False) or bool(data.get("voice_transcript"))
    full_name = (data.get("full_name") or "").strip()
    if not full_name:
        full_name = current_user.full_name if current_user else "Good Samaritan Reporter"

    phone = (data.get("phone") or "").strip()
    if not phone:
        phone = current_user.phone if (current_user and current_user.phone) else "+91 90000 00000"

    description = (data.get("description") or "").strip() or (data.get("voice_transcript") or "").strip()

    if not description:
        return jsonify({"error": "Request description is required."}), 400

    stated_category = (data.get("category") or "FOOD").strip().upper()
    people_count = int(data.get("people_count", 1))
    current_situation = (data.get("current_situation") or "").strip()
    address = (data.get("address") or "Coimbatore, Tamil Nadu").strip()
    latitude = float(data.get("latitude", 11.0168))
    longitude = float(data.get("longitude", 76.9558))
    contact_method = data.get("contact_method", "Phone")
    photo_url = data.get("photo_url")
    has_permission = str(data.get("has_permission", "true")).lower() == "true"
    voice_transcript = (data.get("voice_transcript") or "").strip()

    # 1. REAL DNN Classification
    ai_classification = classify_text(description)
    dnn_category = ai_classification["predicted_category"]
    dnn_confidence = ai_classification["confidence"]

    # 2. Urgency Analysis
    urgency_info = analyze_urgency(
        text=description, 
        category=dnn_category, 
        people_count=people_count, 
        situation=current_situation
    )

    # 3. Approximate Geolocation for Public Privacy (jitter by ~250m - 500m)
    jitter_lat = (random.random() - 0.5) * 0.006
    jitter_lon = (random.random() - 0.5) * 0.006
    approx_lat = round(latitude + jitter_lat, 4)
    approx_lon = round(longitude + jitter_lon, 4)

    # 4. Duplicate Check
    recent_requests = Request.query.order_by(Request.created_at.desc()).limit(50).all()
    recent_dicts = [r.to_dict(is_authorized=True) for r in recent_requests]
    dup_check = check_duplicate_request({
        "phone": phone,
        "description": description,
        "latitude": latitude,
        "longitude": longitude
    }, recent_dicts)

    new_request = Request(
        requester_id=current_user.id if current_user else None,
        full_name=full_name,
        phone=phone,
        description=description,
        category=stated_category,
        dnn_category=dnn_category,
        dnn_confidence=dnn_confidence,
        urgency_level=urgency_info["urgency_level"],
        urgency_score=urgency_info["urgency_score"],
        people_count=people_count,
        current_situation=current_situation,
        latitude=latitude,
        longitude=longitude,
        approx_latitude=approx_lat,
        approx_longitude=approx_lon,
        address=address,
        contact_method=contact_method,
        photo_url=photo_url,
        status="PENDING_VERIFICATION",
        is_flagged_duplicate=dup_check["is_flagged_duplicate"],
        duplicate_notes=dup_check["duplicate_notes"]
    )
    db.session.add(new_request)
    db.session.commit()

    # Log initial status history
    status_entry = RequestStatusHistory(
        request_id=new_request.id,
        previous_status=None,
        new_status="PENDING_VERIFICATION",
        changed_by_user_id=current_user.id if current_user else None,
        notes=f"Request submitted. DNN classified as {dnn_category} ({dnn_confidence*100:.1f}%), Urgency: {urgency_info['urgency_level']}"
    )
    db.session.add(status_entry)

    # 5. Run Matching Engine against all active resources
    all_resources = Resource.query.all()
    req_dict_for_matching = new_request.to_dict(is_authorized=True)
    res_dicts = [r.to_dict() for r in all_resources]
    matched_resources = find_matched_resources(req_dict_for_matching, res_dicts, max_results=4)

    for m in matched_resources:
        db_match = Match(
            request_id=new_request.id,
            resource_id=m["resource_id"],
            match_score=m["match_score"],
            compatibility_breakdown=m["breakdown"],
            status="suggested"
        )
        db.session.add(db_match)

    # Create Notification
    notification = Notification(
        role_target="admin",
        title="New Request Submitted",
        message=f"Request #{new_request.id} ({dnn_category}, {urgency_info['urgency_level']} urgency) waiting for verification.",
        notification_type="alert" if urgency_info["urgency_level"] in ["CRITICAL", "HIGH"] else "info"
    )
    db.session.add(notification)
    db.session.commit()

    # Emit Real-time Socket.IO Event
    public_req = new_request.to_dict(is_authorized=False)
    emit_socket_event("new_request", {
        "request": public_req,
        "matched_resources": matched_resources
    })
    emit_socket_event("notification", notification.to_dict())

    return jsonify({
        "message": "Request submitted and AI analyzed successfully",
        "request": new_request.to_dict(is_authorized=True),
        "ai_analysis": {
            "dnn_category": dnn_category,
            "dnn_confidence": dnn_confidence,
            "all_probabilities": ai_classification["probabilities"],
            "urgency_level": urgency_info["urgency_level"],
            "urgency_score": urgency_info["urgency_score"],
            "indicators": urgency_info["indicators"],
            "disclaimer": urgency_info["disclaimer"],
            "escalation_required": urgency_info["escalation_required"]
        },
        "matched_resources": matched_resources,
        "duplicate_detection": dup_check
    }), 201

@requests_bp.route("/help-someone", methods=["POST"])
@optional_token
def create_help_someone(current_user):
    from routes.help_reports import create_help_report
    return create_help_report(current_user)

@requests_bp.route("", methods=["GET"])
@optional_token
def get_requests(current_user):
    category = request.args.get("category")
    urgency = request.args.get("urgency")
    status = request.args.get("status")
    assigned_ngo = request.args.get("assigned_ngo")
    my_only = request.args.get("my_only", "false").lower() == "true"

    query = Request.query

    if category:
        query = query.filter((Request.category == category.upper()) | (Request.dnn_category == category.upper()))
    if urgency:
        query = query.filter(Request.urgency_level == urgency.upper())
    if status:
        query = query.filter(Request.status == status.upper())
    if assigned_ngo and assigned_ngo.isdigit():
        query = query.filter(Request.assigned_ngo_id == int(assigned_ngo))

    if my_only and current_user:
        query = query.filter(Request.requester_id == current_user.id)

    requests_list = query.order_by(Request.created_at.desc()).all()

    # Privacy filtering: Only admin and assigned NGO (or verified NGO) see full details
    is_authorized = bool(current_user and current_user.role in ["admin", "ngo"])

    result = []
    for r in requests_list:
        # If the requester themselves requested it, they see full details
        user_auth = is_authorized or (current_user and current_user.id == r.requester_id)
        result.append(r.to_dict(is_authorized=user_auth))

    return jsonify({"requests": result, "count": len(result)}), 200

@requests_bp.route("/<int:req_id>", methods=["GET"])
@optional_token
def get_request_by_id(current_user, req_id):
    req_obj = Request.query.get_or_404(req_id)
    is_auth = bool(current_user and (current_user.role in ["admin", "ngo"] or current_user.id == req_obj.requester_id))

    matches = [m.to_dict() for m in req_obj.matches]
    history = [h.to_dict() for h in req_obj.status_history]
    donations = [d.to_dict() for d in req_obj.donations]

    return jsonify({
        "request": req_obj.to_dict(is_authorized=is_auth),
        "matches": matches,
        "history": history,
        "donations": donations
    }), 200

@requests_bp.route("/<int:req_id>/status", methods=["PUT"])
@token_required
def update_status(current_user, req_id):
    req_obj = Request.query.get_or_404(req_id)
    data = request.get_json() or {}
    new_status = data.get("status", "").upper().strip()
    notes = data.get("notes", "").strip()

    valid_statuses = [
        "REQUESTED", "AI_ANALYZED", "RESOURCE_MATCHED", "TRANSPORT_CHECK", 
        "NGO_NOTIFIED", "NGO_ACCEPTED", "RESPONDER_ASSIGNED", "ON_THE_WAY", 
        "ASSISTANCE_PROVIDED", "COMPLETED", "ESCALATED", "REJECTED", "UNABLE_TO_ASSIST",
        "SUBMITTED", "PENDING_VERIFICATION", "VERIFIED", "MATCHING", "MATCHED", "ACCEPTED", "IN_PROGRESS", "DELIVERED"
    ]

    if new_status not in valid_statuses:
        return jsonify({"error": f"Invalid status '{new_status}'"}), 400

    # Role checks
    if current_user.role not in ["admin", "ngo", "volunteer"]:
        return jsonify({"error": "Unauthorized to modify request status"}), 403

    prev_status = req_obj.status
    req_obj.status = new_status
    req_obj.updated_at = datetime.utcnow()

    # Record history for full auditable case trail
    history_entry = RequestStatusHistory(
        request_id=req_obj.id,
        previous_status=prev_status,
        new_status=new_status,
        changed_by_user_id=current_user.id,
        notes=notes or f"Status transitioned from {prev_status} to {new_status}"
    )
    db.session.add(history_entry)

    # Auditable Log
    audit = AuditLog(
        user_id=current_user.id,
        action="STATUS_TRANSITION",
        details=f"Request #{req_obj.id} transitioned from {prev_status} to {new_status}. {notes}",
        ip_address=request.remote_addr
    )
    db.session.add(audit)

    # Notification text matching Phase 4 specs
    notif_msg = f"Your request status is now {new_status.replace('_', ' ')}."
    if new_status in ["NGO_ACCEPTED", "ACCEPTED"]:
        notif_msg = "Your request has been accepted."
    elif new_status == "ON_THE_WAY":
        notif_msg = "A verified responder is on the way to your location."
    elif new_status == "ASSISTANCE_PROVIDED":
        notif_msg = "Field assistance has been provided to your request location."

    notif = Notification(
        user_id=req_obj.requester_id,
        role_target="requester" if req_obj.requester_id else "all",
        title=f"Request #{req_obj.id} Update",
        message=notif_msg,
        notification_type="success" if new_status in ["NGO_ACCEPTED", "ACCEPTED", "ASSISTANCE_PROVIDED", "COMPLETED"] else "info"
    )
    db.session.add(notif)
    db.session.commit()

    # Emit real-time update via Socket.IO
    emit_socket_event("request_status_updated", {
        "request_id": req_obj.id,
        "previous_status": prev_status,
        "new_status": new_status,
        "changed_by": current_user.full_name,
        "notes": notes,
        "timestamp": datetime.utcnow().isoformat()
    })
    emit_socket_event("notification", notif.to_dict())

    return jsonify({
        "message": f"Status successfully updated to {new_status}",
        "request": req_obj.to_dict(is_authorized=True)
    }), 200

@requests_bp.route("/<int:req_id>/accept", methods=["POST"])
@token_required
@role_required("ngo", "admin", "volunteer")
def accept_request(current_user, req_id):
    req_obj = db.session.get(Request, req_id)
    if not req_obj:
        return jsonify({"error": f"Request #{req_id} not found."}), 404
    
    if req_obj.status in ["DELIVERED", "COMPLETED", "REJECTED"]:
        return jsonify({"error": f"Cannot accept a request that is already {req_obj.status}"}), 400

    prev_status = req_obj.status
    req_obj.status = "NGO_ACCEPTED"
    req_obj.assigned_ngo_id = current_user.id
    req_obj.updated_at = datetime.utcnow()

    history_entry = RequestStatusHistory(
        request_id=req_obj.id,
        previous_status=prev_status,
        new_status="NGO_ACCEPTED",
        changed_by_user_id=current_user.id,
        notes=f"Accepted by {current_user.full_name} ({current_user.organization_name or current_user.role})"
    )
    db.session.add(history_entry)

    audit = AuditLog(
        user_id=current_user.id,
        action="NGO_ACCEPT_CASE",
        details=f"Request #{req_obj.id} accepted by NGO {current_user.full_name}.",
        ip_address=request.remote_addr
    )
    db.session.add(audit)

    # Required Phase 4 notification text: "Your request has been accepted."
    notif = Notification(
        user_id=req_obj.requester_id,
        title="Help Is On The Way!",
        message="Your request has been accepted.",
        notification_type="success"
    )
    db.session.add(notif)
    db.session.commit()

    emit_socket_event("request_status_updated", {
        "request_id": req_obj.id,
        "previous_status": prev_status,
        "new_status": "NGO_ACCEPTED",
        "assigned_ngo": current_user.full_name,
        "timestamp": datetime.utcnow().isoformat()
    })
    emit_socket_event("notification", notif.to_dict())

    return jsonify({
        "message": "Your request has been accepted.",
        "request": req_obj.to_dict(is_authorized=True)
    }), 200

@requests_bp.route("/escalate-check", methods=["POST"])
@optional_token
def trigger_escalation_check(current_user):
    """
    Triggers the automated escalation engine.
    If a configured response period (e.g. 30 mins) passes without acceptance, notifies secondary NGO / admin.
    """
    from services.escalation import run_escalation_check
    data = request.get_json() or {}
    timeout = int(data.get("timeout_minutes", 30))
    res = run_escalation_check(timeout_minutes=timeout)
    return jsonify(res), 200

@requests_bp.route("/<int:req_id>/history", methods=["GET"])
@optional_token
def get_request_history(current_user, req_id):
    """Returns complete auditable state transition timeline for a request."""
    req_obj = db.session.get(Request, req_id)
    if not req_obj:
        return jsonify({"error": f"Request #{req_id} not found."}), 404

    history = RequestStatusHistory.query.filter_by(request_id=req_id).order_by(RequestStatusHistory.timestamp.asc()).all()
    return jsonify({
        "success": True,
        "request_id": req_id,
        "current_status": req_obj.status,
        "timeline": [h.to_dict() for h in history]
    }), 200


@requests_bp.route("/<int:req_id>/donate", methods=["POST"])
@token_required
@role_required("donor", "admin")
def pledge_donation(current_user, req_id):
    req_obj = Request.query.get_or_404(req_id)
    data = request.get_json() or {}
    
    donation_type = data.get("donation_type", "food_package")
    notes = data.get("notes", "").strip()

    donation = Donation(
        donor_id=current_user.id,
        request_id=req_obj.id,
        donation_type=donation_type,
        notes=notes,
        status="pledged"
    )
    db.session.add(donation)

    # Record history
    history = RequestStatusHistory(
        request_id=req_obj.id,
        previous_status=req_obj.status,
        new_status=req_obj.status,
        changed_by_user_id=current_user.id,
        notes=f"Donor {current_user.full_name} pledged assistance: {donation_type}"
    )
    db.session.add(history)

    notif = Notification(
        user_id=req_obj.requester_id,
        title="Donation Pledged!",
        message=f"A generous donor pledged support ({donation_type.replace('_', ' ')}).",
        notification_type="success"
    )
    db.session.add(notif)
    db.session.commit()

    emit_socket_event("donation_pledged", {
        "request_id": req_obj.id,
        "donor_name": current_user.full_name,
        "donation_type": donation_type
    })
    emit_socket_event("notification", notif.to_dict())

    return jsonify({
        "message": "Donation pledged successfully",
        "donation": donation.to_dict()
    }), 201
