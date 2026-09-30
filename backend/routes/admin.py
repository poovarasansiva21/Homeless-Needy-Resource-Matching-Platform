from datetime import datetime
from flask import Blueprint, request, jsonify
from models import db, Request, Resource, User, Verification, RequestStatusHistory, AuditLog, Notification, TrustReport, TransportInfo
from services.auth_helper import token_required, role_required

admin_bp = Blueprint("admin", __name__)

def emit_socket_event(event_name, payload):
    try:
        from app import socketio
        socketio.emit(event_name, payload)
    except Exception as e:
        print(f"[SocketIO Error] {e}")

@admin_bp.route("/requests/<int:req_id>/verify", methods=["POST"])
@token_required
@role_required("admin", "ngo")
def verify_request(current_user, req_id):
    req_obj = Request.query.get_or_404(req_id)
    data = request.get_json() or {}
    notes = data.get("notes", "Verified by authorized personnel.").strip()

    prev_status = req_obj.status
    req_obj.status = "VERIFIED"
    req_obj.updated_at = datetime.utcnow()

    # Record verification
    verif = Verification(
        request_id=req_obj.id,
        verified_by_user_id=current_user.id,
        status="VERIFIED",
        notes=notes
    )
    db.session.add(verif)

    # Record history
    history = RequestStatusHistory(
        request_id=req_obj.id,
        previous_status=prev_status,
        new_status="VERIFIED",
        changed_by_user_id=current_user.id,
        notes=notes
    )
    db.session.add(history)

    # Notify requester
    notif = Notification(
        user_id=req_obj.requester_id,
        title="Request Verified",
        message="Your request has been verified by the coordination team and matched with nearby responders.",
        notification_type="success"
    )
    db.session.add(notif)

    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="REQUEST_VERIFIED",
        details=f"Request #{req_obj.id} verified: {notes}",
        ip_address=request.remote_addr
    )
    db.session.add(audit)
    db.session.commit()

    emit_socket_event("request_status_updated", {
        "request_id": req_obj.id,
        "previous_status": prev_status,
        "new_status": "VERIFIED",
        "verified_by": current_user.full_name,
        "timestamp": datetime.utcnow().isoformat()
    })
    emit_socket_event("notification", notif.to_dict())

    return jsonify({
        "message": f"Request #{req_obj.id} verified successfully",
        "request": req_obj.to_dict(is_authorized=True)
    }), 200

@admin_bp.route("/requests/<int:req_id>/reject", methods=["POST"])
@token_required
@role_required("admin", "ngo")
def reject_request(current_user, req_id):
    req_obj = Request.query.get_or_404(req_id)
    data = request.get_json() or {}
    reason = data.get("reason", "Unable to verify request authenticity or criteria not met.").strip()

    prev_status = req_obj.status
    req_obj.status = "REJECTED"
    req_obj.updated_at = datetime.utcnow()

    verif = Verification(
        request_id=req_obj.id,
        verified_by_user_id=current_user.id,
        status="REJECTED",
        notes=reason
    )
    db.session.add(verif)

    history = RequestStatusHistory(
        request_id=req_obj.id,
        previous_status=prev_status,
        new_status="REJECTED",
        changed_by_user_id=current_user.id,
        notes=f"Rejected: {reason}"
    )
    db.session.add(history)

    audit = AuditLog(
        user_id=current_user.id,
        action="REQUEST_REJECTED",
        details=f"Request #{req_obj.id} rejected: {reason}",
        ip_address=request.remote_addr
    )
    db.session.add(audit)
    db.session.commit()

    emit_socket_event("request_status_updated", {
        "request_id": req_obj.id,
        "previous_status": prev_status,
        "new_status": "REJECTED",
        "timestamp": datetime.utcnow().isoformat()
    })

    return jsonify({"message": f"Request #{req_obj.id} marked as rejected."}), 200

@admin_bp.route("/duplicates", methods=["GET"])
@token_required
@role_required("admin")
def get_duplicate_requests(current_user):
    duplicates = Request.query.filter_by(is_flagged_duplicate=True).order_by(Request.created_at.desc()).all()
    return jsonify({
        "duplicates": [d.to_dict(is_authorized=True) for d in duplicates],
        "count": len(duplicates)
    }), 200

@admin_bp.route("/audit-logs", methods=["GET"])
@token_required
@role_required("admin")
def get_audit_logs(current_user):
    logs = AuditLog.query.order_by(AuditLog.timestamp.desc()).limit(100).all()
    return jsonify({
        "audit_logs": [log.to_dict() for log in logs]
    }), 200

@admin_bp.route("/users", methods=["GET"])
@token_required
@role_required("admin")
def list_users(current_user):
    users = User.query.order_by(User.created_at.desc()).all()
    return jsonify({
        "users": [u.to_dict() for u in users],
        "count": len(users)
    }), 200

# RESOURCE VERIFICATION ADMIN ENDPOINTS
@admin_bp.route("/resources/<int:res_id>/verify", methods=["POST"])
@token_required
@role_required("admin")
def verify_resource(current_user, res_id):
    res_obj = Resource.query.get_or_404(res_id)
    res_obj.verified = True
    
    audit = AuditLog(
        user_id=current_user.id,
        action="RESOURCE_VERIFIED",
        details=f"Resource #{res_id} ({res_obj.name}) verified with badge '{res_obj.get_verification_badge()}'",
        ip_address=request.remote_addr
    )
    db.session.add(audit)
    db.session.commit()

    return jsonify({
        "message": f"Resource '{res_obj.name}' verified successfully",
        "resource": res_obj.to_dict()
    }), 200

@admin_bp.route("/resources/<int:res_id>/unverify", methods=["POST"])
@token_required
@role_required("admin")
def unverify_resource(current_user, res_id):
    res_obj = Resource.query.get_or_404(res_id)
    res_obj.verified = False

    audit = AuditLog(
        user_id=current_user.id,
        action="RESOURCE_UNVERIFIED",
        details=f"Resource #{res_id} ({res_obj.name}) verification status revoked",
        ip_address=request.remote_addr
    )
    db.session.add(audit)
    db.session.commit()

    return jsonify({
        "message": f"Resource '{res_obj.name}' verification status revoked",
        "resource": res_obj.to_dict()
    }), 200

# TRANSPORT TRUST VERIFICATION ADMIN ENDPOINTS
@admin_bp.route("/transport/<int:t_id>/status", methods=["POST"])
@token_required
@role_required("admin")
def update_transport_trust_status(current_user, t_id):
    t_obj = TransportInfo.query.get_or_404(t_id)
    data = request.get_json() or {}
    new_status = data.get("status", "VERIFIED").upper().strip()

    if new_status not in ["VERIFIED", "NEEDS VERIFICATION", "NEEDS_VERIFICATION", "REPORTED"]:
        return jsonify({"error": "Invalid transport trust status."}), 400

    if new_status == "NEEDS_VERIFICATION":
        new_status = "NEEDS VERIFICATION"

    prev = t_obj.status
    t_obj.status = new_status
    t_obj.last_verified = datetime.utcnow()

    audit = AuditLog(
        user_id=current_user.id,
        action="TRANSPORT_TRUST_STATUS_UPDATED",
        details=f"Transport #{t_id} ({t_obj.provider}) status changed from '{prev}' to '{new_status}'",
        ip_address=request.remote_addr
    )
    db.session.add(audit)
    db.session.commit()

    return jsonify({
        "message": f"Transport route status updated to {new_status}",
        "transport": t_obj.to_dict()
    }), 200

# TRUST REPORTS MANAGEMENT ENDPOINTS
@admin_bp.route("/reports", methods=["GET"])
@token_required
@role_required("admin")
def list_trust_reports(current_user):
    reports = TrustReport.query.order_by(TrustReport.created_at.desc()).all()
    return jsonify({
        "trust_reports": [r.to_dict() for r in reports],
        "count": len(reports)
    }), 200

@admin_bp.route("/reports/<int:report_id>/status", methods=["PUT"])
@token_required
@role_required("admin")
def update_trust_report_status(current_user, report_id):
    report = TrustReport.query.get_or_404(report_id)
    data = request.get_json() or {}
    new_status = data.get("status", "RESOLVED").upper().strip()
    notes = data.get("notes", "Investigated and resolved by safety officer.").strip()

    report.status = new_status
    report.resolution_notes = notes

    audit = AuditLog(
        user_id=current_user.id,
        action="TRUST_REPORT_RESOLVED",
        details=f"Trust Report #{report_id} marked as {new_status}: {notes}",
        ip_address=request.remote_addr
    )
    db.session.add(audit)
    db.session.commit()

    return jsonify({
        "message": f"Trust report #{report_id} updated to {new_status}",
        "report": report.to_dict()
    }), 200

