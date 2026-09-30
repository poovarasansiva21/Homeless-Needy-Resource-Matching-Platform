import os
import random
import uuid
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
from models import db, Request, Resource, Match, RequestStatusHistory, Notification
from services.auth_helper import optional_token, token_required, role_required
from services.classifier import classify_text
from services.urgency import analyze_urgency
from services.matcher import find_matched_resources
from services.verification import check_duplicate_request

help_reports_bp = Blueprint("help_reports", __name__)

ALLOWED_IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_IMAGE_EXTENSIONS

def emit_socket_event(event_name, payload):
    try:
        from app import socketio
        socketio.emit(event_name, payload)
    except Exception as e:
        print(f"[SocketIO Error] Failed to emit {event_name}: {e}")

@help_reports_bp.route("", methods=["POST"], strict_slashes=False)
@help_reports_bp.route("/", methods=["POST"], strict_slashes=False)
@optional_token
def create_help_report(current_user=None):
    """
    POST /api/help-reports
    Accepts JSON or multipart/form-data for reporting someone needing help.
    Runs DNN text classification, urgency detection, Haversine matching, and real-time SocketIO alerts.
    """
    photo_url = None

    if request.is_json:
        data = request.get_json() or {}
    else:
        data = request.form.to_dict()
        if "photo" in request.files:
            file = request.files["photo"]
            if file and file.filename != "" and allowed_file(file.filename):
                filename = f"help_{uuid.uuid4().hex[:10]}_{secure_filename(file.filename)}"
                upload_dir = current_app.config.get("UPLOAD_FOLDER", os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads"))
                os.makedirs(upload_dir, exist_ok=True)
                save_path = os.path.join(upload_dir, filename)
                file.save(save_path)
                photo_url = f"/uploads/{filename}"

    description = data.get("description", "").strip()
    voice_transcript = data.get("voice_transcript", "").strip()
    
    # If voice transcript is provided and description is empty, use voice transcript
    if not description and voice_transcript:
        description = voice_transcript

    if not description:
        return jsonify({"error": "Description of the situation is required."}), 400

    reporter_name = data.get("reporter_name", "").strip() or (current_user.full_name if current_user else "Good Samaritan Reporter")
    reporter_phone = data.get("reporter_phone", "").strip() or (current_user.phone if current_user and current_user.phone else "+91 90000 00000")
    stated_category = data.get("category", "").strip().upper()
    people_count = int(data.get("people_count", 1))
    current_situation = data.get("current_situation", "Emergency Field Report").strip()
    address = data.get("address", "Coimbatore, Tamil Nadu").strip()
    latitude = float(data.get("latitude", 11.0168))
    longitude = float(data.get("longitude", 76.9558))
    has_permission = str(data.get("has_permission", "true")).lower() == "true"

    if not photo_url and data.get("photo_url"):
        photo_url = data.get("photo_url")

    # 1. DNN Text Classification
    ai_classification = classify_text(description)
    dnn_category = ai_classification["predicted_category"]
    dnn_confidence = ai_classification["confidence"]
    
    # Final category is manual category if valid, else predicted category
    final_category = stated_category if stated_category in ["FOOD", "SHELTER", "CLOTHING", "MEDICAL", "EMERGENCY", "EDUCATION", "EMPLOYMENT"] else dnn_category

    # 2. Urgency Analysis
    urgency_info = analyze_urgency(
        text=description,
        category=dnn_category,
        people_count=people_count,
        situation=current_situation
    )

    # 3. Privacy Jittering for Public Display (~250-500m offset)
    jitter_lat = (random.random() - 0.5) * 0.006
    jitter_lon = (random.random() - 0.5) * 0.006
    approx_lat = round(latitude + jitter_lat, 4)
    approx_lon = round(longitude + jitter_lon, 4)

    # 4. Duplicate Check
    recent_requests = Request.query.order_by(Request.created_at.desc()).limit(50).all()
    recent_dicts = [r.to_dict(is_authorized=True) for r in recent_requests]
    dup_check = check_duplicate_request({
        "phone": reporter_phone,
        "description": description,
        "latitude": latitude,
        "longitude": longitude
    }, recent_dicts)

    new_report = Request(
        requester_id=current_user.id if current_user else None,
        full_name=reporter_name,
        phone=reporter_phone,
        description=description,
        category=final_category,
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
        contact_method="Mobile App",
        photo_url=photo_url,
        status="REPORTED",
        is_flagged_duplicate=dup_check["is_flagged_duplicate"],
        duplicate_notes=dup_check["duplicate_notes"],
        is_help_someone=True,
        has_photo_permission=has_permission,
        voice_transcript=voice_transcript
    )
    db.session.add(new_report)
    db.session.commit()

    # Log Status History
    history_entry = RequestStatusHistory(
        request_id=new_report.id,
        previous_status=None,
        new_status="REPORTED",
        changed_by_user_id=current_user.id if current_user else None,
        notes=f"Emergency Help Someone report created. AI category: {dnn_category} ({dnn_confidence*100:.1f}%), Urgency: {urgency_info['urgency_level']}"
    )
    db.session.add(history_entry)

    # 5. Matching Engine against active resources
    all_resources = Resource.query.all()
    req_dict_for_matching = new_report.to_dict(is_authorized=True)
    res_dicts = [r.to_dict() for r in all_resources]
    matched_resources = find_matched_resources(req_dict_for_matching, res_dicts, max_results=4)

    for m in matched_resources:
        db_match = Match(
            request_id=new_report.id,
            resource_id=m["resource_id"],
            match_score=m["match_score"],
            compatibility_breakdown=m["breakdown"],
            status="suggested"
        )
        db.session.add(db_match)

    # Create Alert Notification for Admins & NGOs
    notification = Notification(
        role_target="ngo",
        title=f"🆘 Emergency Help Request: {dnn_category}",
        message=f"New report nearby ({people_count} person(s), {urgency_info['urgency_level']} urgency) near {address.split(',')[0]}.",
        notification_type="alert" if urgency_info["urgency_level"] in ["CRITICAL", "HIGH"] else "info"
    )
    db.session.add(notification)
    db.session.commit()

    # Emit Real-time Socket.IO Events
    public_rep = new_report.to_dict(is_authorized=False)
    emit_socket_event("new_help_report", {
        "report": public_rep,
        "matched_resources": matched_resources
    })
    emit_socket_event("new_request", {
        "request": public_rep,
        "matched_resources": matched_resources
    })
    emit_socket_event("notification", notification.to_dict())

    return jsonify({
        "success": True,
        "message": "Help Someone report successfully created and transmitted to nearby NGOs.",
        "report": new_report.to_dict(is_authorized=True),
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


@help_reports_bp.route("", methods=["GET"], strict_slashes=False)
@help_reports_bp.route("/", methods=["GET"], strict_slashes=False)
@optional_token
def get_help_reports(current_user):
    category = request.args.get("category")
    urgency = request.args.get("urgency")
    status = request.args.get("status")
    my_only = request.args.get("my_only", "false").lower() == "true"

    query = Request.query.filter(Request.is_help_someone == True)

    if category:
        query = query.filter((Request.category == category.upper()) | (Request.dnn_category == category.upper()))
    if urgency:
        query = query.filter(Request.urgency_level == urgency.upper())
    if status:
        query = query.filter(Request.status == status.upper())
    if my_only and current_user:
        query = query.filter(Request.requester_id == current_user.id)

    reports = query.order_by(Request.created_at.desc()).all()
    is_authorized = bool(current_user and current_user.role in ["admin", "ngo"])

    result = []
    for r in reports:
        user_auth = is_authorized or (current_user and current_user.id == r.requester_id)
        result.append(r.to_dict(is_authorized=user_auth))

    return jsonify({"reports": result, "count": len(result)}), 200


@help_reports_bp.route("/<int:report_id>", methods=["GET"])
@optional_token
def get_help_report_by_id(current_user, report_id):
    rep_obj = Request.query.get_or_404(report_id)
    is_auth = bool(current_user and (current_user.role in ["admin", "ngo"] or current_user.id == rep_obj.requester_id))

    matches = [m.to_dict() for m in rep_obj.matches]
    history = [h.to_dict() for h in rep_obj.status_history]

    return jsonify({
        "report": rep_obj.to_dict(is_authorized=is_auth),
        "matches": matches,
        "history": history
    }), 200


@help_reports_bp.route("/<int:report_id>/accept", methods=["POST"])
@token_required
@role_required("ngo", "admin", "volunteer")
def accept_help_report(current_user, report_id):
    rep_obj = Request.query.get_or_404(report_id)

    if rep_obj.status in ["COMPLETED", "REJECTED", "UNABLE_TO_ASSIST"]:
        return jsonify({"error": f"Cannot accept report already in {rep_obj.status} state"}), 400

    prev_status = rep_obj.status
    rep_obj.status = "ACCEPTED"
    rep_obj.assigned_ngo_id = current_user.id
    rep_obj.updated_at = datetime.utcnow()

    history_entry = RequestStatusHistory(
        request_id=rep_obj.id,
        previous_status=prev_status,
        new_status="ACCEPTED",
        changed_by_user_id=current_user.id,
        notes=f"Help Report accepted by {current_user.full_name} ({current_user.organization_name or current_user.role})"
    )
    db.session.add(history_entry)

    notif = Notification(
        user_id=rep_obj.requester_id,
        title="NGO Accepted Emergency Report!",
        message=f"{current_user.organization_name or current_user.full_name} accepted the report and is responding to the location.",
        notification_type="success"
    )
    db.session.add(notif)
    db.session.commit()

    emit_socket_event("request_status_updated", {
        "request_id": rep_obj.id,
        "previous_status": prev_status,
        "new_status": "ACCEPTED",
        "assigned_ngo": current_user.full_name,
        "timestamp": datetime.utcnow().isoformat()
    })
    emit_socket_event("notification", notif.to_dict())

    return jsonify({
        "message": "Report accepted successfully",
        "report": rep_obj.to_dict(is_authorized=True)
    }), 200


@help_reports_bp.route("/<int:report_id>/start", methods=["POST"])
@token_required
@role_required("ngo", "admin", "volunteer")
def start_help_assistance(current_user, report_id):
    rep_obj = Request.query.get_or_404(report_id)

    prev_status = rep_obj.status
    rep_obj.status = "ASSISTANCE_STARTED"
    rep_obj.updated_at = datetime.utcnow()

    history_entry = RequestStatusHistory(
        request_id=rep_obj.id,
        previous_status=prev_status,
        new_status="ASSISTANCE_STARTED",
        changed_by_user_id=current_user.id,
        notes=f"Field assistance started by {current_user.full_name}"
    )
    db.session.add(history_entry)

    notif = Notification(
        user_id=rep_obj.requester_id,
        title="Assistance Underway",
        message=f"{current_user.full_name} has arrived at the location and initiated assistance.",
        notification_type="success"
    )
    db.session.add(notif)
    db.session.commit()

    emit_socket_event("request_status_updated", {
        "request_id": rep_obj.id,
        "previous_status": prev_status,
        "new_status": "ASSISTANCE_STARTED",
        "assigned_ngo": current_user.full_name,
        "timestamp": datetime.utcnow().isoformat()
    })

    return jsonify({
        "message": "Assistance started successfully",
        "report": rep_obj.to_dict(is_authorized=True)
    }), 200


@help_reports_bp.route("/<int:report_id>/complete", methods=["POST"])
@token_required
@role_required("ngo", "admin", "volunteer")
def complete_help_report(current_user, report_id):
    rep_obj = Request.query.get_or_404(report_id)

    prev_status = rep_obj.status
    rep_obj.status = "COMPLETED"
    rep_obj.updated_at = datetime.utcnow()

    history_entry = RequestStatusHistory(
        request_id=rep_obj.id,
        previous_status=prev_status,
        new_status="COMPLETED",
        changed_by_user_id=current_user.id,
        notes=f"Field assistance completed successfully by {current_user.full_name}"
    )
    db.session.add(history_entry)

    notif = Notification(
        user_id=rep_obj.requester_id,
        title="Assistance Completed! 🎉",
        message=f"The reported situation has been resolved. Thank you for making a difference!",
        notification_type="success"
    )
    db.session.add(notif)
    db.session.commit()

    emit_socket_event("request_status_updated", {
        "request_id": rep_obj.id,
        "previous_status": prev_status,
        "new_status": "COMPLETED",
        "assigned_ngo": current_user.full_name,
        "timestamp": datetime.utcnow().isoformat()
    })

    return jsonify({
        "message": "Assistance marked completed successfully",
        "report": rep_obj.to_dict(is_authorized=True)
    }), 200
