"""
SAHAAYAA AI - Phase 7 Trust, Safety & Privacy Blueprint
Handles Trust Reports, Anonymous Reporting, Resource Badging, Transport Trust,
and Privacy Controls.
"""

from datetime import datetime
from flask import Blueprint, request, jsonify
from models import db, TrustReport, Resource, TransportInfo, Request, AuditLog, User
from services.auth_helper import optional_token, token_required, role_required
from services.rate_limiter import rate_limit

trust_bp = Blueprint("trust", __name__)

@trust_bp.route("/report", methods=["POST"])
@optional_token
@rate_limit(max_requests=10, window_seconds=60, bucket_name="trust_report")
def create_trust_report(current_user):
    """
    Files a trust or safety report for a Resource, Transport Route, or Request.
    Supports Anonymous Reporting!
    """
    data = request.get_json() or {}

    report_type = data.get("report_type", "SUSPICIOUS_REQUEST").upper().strip()
    target_id = data.get("target_id")
    target_title = data.get("target_title", "Unspecified Target").strip()
    reason = data.get("reason", "OTHER").strip()
    details = data.get("details", "").strip()
    is_anonymous = bool(data.get("is_anonymous", False) or not current_user)

    if not reason:
        return jsonify({"error": "Report reason is required."}), 400

    reporter_id = None if is_anonymous else (current_user.id if current_user else None)

    report = TrustReport(
        report_type=report_type,
        target_id=target_id,
        target_title=target_title,
        reporter_user_id=reporter_id,
        is_anonymous=is_anonymous,
        reason=reason,
        details=details,
        status="PENDING"
    )
    db.session.add(report)

    # Log audit event
    audit_user_desc = "Anonymous User" if is_anonymous else (current_user.full_name if current_user else "Guest")
    audit = AuditLog(
        user_id=reporter_id,
        action=f"TRUST_REPORT_FILED_{report_type}",
        details=f"{report_type} report filed by {audit_user_desc} for target #{target_id} ({reason})",
        ip_address=request.remote_addr
    )
    db.session.add(audit)
    db.session.commit()

    return jsonify({
        "message": "Trust report received. Our safety & verification team will investigate.",
        "report": report.to_dict()
    }), 201


@trust_bp.route("/verifications", methods=["GET"])
def get_verifications_directory():
    """
    Public API returning directory of verified NGOs, Shelters, Food Resources,
    and Verified Transport Routes.
    """
    verified_resources = Resource.query.filter(Resource.verified.is_(True)).all()
    verified_transports = TransportInfo.query.filter(TransportInfo.status == "VERIFIED").all()
    verified_ngos = User.query.filter(User.role == "ngo").all()

    shelters = [r.to_dict() for r in verified_resources if r.get_verification_badge() == "VERIFIED SHELTER"]
    food_resources = [r.to_dict() for r in verified_resources if r.get_verification_badge() == "VERIFIED FOOD RESOURCE"]
    ngos = [r.to_dict() for r in verified_resources if r.get_verification_badge() == "VERIFIED NGO"]

    return jsonify({
        "success": True,
        "summary": {
            "verified_ngos_count": len(verified_ngos),
            "verified_shelters_count": len(shelters),
            "verified_food_resources_count": len(food_resources),
            "verified_transport_routes_count": len(verified_transports)
        },
        "verified_shelters": shelters,
        "verified_food_resources": food_resources,
        "verified_ngos": ngos,
        "verified_transports": [t.to_dict() for t in verified_transports]
    }), 200


@trust_bp.route("/privacy-policy", methods=["GET"])
def get_privacy_controls_policy():
    """Returns platform privacy matrix and disclosure guarantees."""
    return jsonify({
        "success": True,
        "privacy_guarantees": {
            "anonymous_reporting": "Users and guest reporters can flag suspicious items or unsafe conditions anonymously without disclosing PII.",
            "approximate_location": "Public maps and donor dashboards render perturbed coordinates (~200m offset) and locality-level addresses only.",
            "optional_photos": "Photo uploads for distress reports are optional. Permission checkboxes explicitly control photo disclosure.",
            "role_based_access_control": {
                "GUEST_DONOR": "Sees anonymized names (e.g. 'Mu... S.'), masked phone numbers ('+91 91*** **04'), and approximate locations.",
                "VOLUNTEER": "Sees exact location and contact info ONLY for tasks explicitly assigned to them or accepted by them.",
                "NGO": "Sees case details for requests within their authorized service zone or assigned to their organization.",
                "ADMIN": "Full platform oversight, verification authority, report resolution, and security audit logs."
            }
        }
    }), 200
