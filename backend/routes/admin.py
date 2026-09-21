from datetime import datetime
from flask import Blueprint, request, jsonify
from models import db, Request, Resource, User, Verification, RequestStatusHistory, AuditLog, Notification
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
