from datetime import datetime, timedelta
from flask import Blueprint, jsonify
from sqlalchemy import func
from models import db, Request, Resource, User, Match, Donation, Notification
from services.auth_helper import token_required, optional_token

dashboard_bp = Blueprint("dashboard", __name__)

@dashboard_bp.route("/impact", methods=["GET"])
def get_public_impact():
    """Return aggregate, non-sensitive figures for the public landing page."""
    return jsonify({
        "impact": {
            "total_requests": Request.query.count(),
            "verified_requests": Request.query.filter(
                Request.status.notin_(["PENDING_VERIFICATION", "REJECTED"])
            ).count(),
            "resources_available": Resource.query.filter(
                Resource.availability_status.in_(["Available", "Limited"]),
                Resource.verified.is_(True)
            ).count(),
            "completed_requests": Request.query.filter_by(status="COMPLETED").count()
        }
    }), 200

@dashboard_bp.route("/admin", methods=["GET"])
@token_required
def get_admin_dashboard(current_user):
    total_requests = Request.query.count()
    verified_requests = Request.query.filter_by(status="VERIFIED").count()
    pending_verification = Request.query.filter_by(status="PENDING_VERIFICATION").count()
    critical_requests = Request.query.filter(Request.urgency_level.in_(["CRITICAL", "HIGH"])).count()
    active_matches = Match.query.filter_by(status="suggested").count()
    completed_requests = Request.query.filter_by(status="COMPLETED").count()
    registered_ngos = User.query.filter_by(role="ngo").count()
    registered_donors = User.query.filter_by(role="donor").count()

    fulfillment_rate = round((completed_requests / total_requests * 100), 1) if total_requests > 0 else 0.0

    # Category breakdown
    cat_counts = db.session.query(Request.dnn_category, func.count(Request.id)).group_by(Request.dnn_category).all()
    categories_data = [{"category": cat or "FOOD", "count": count} for cat, count in cat_counts]

    # Urgency breakdown
    urgency_counts = db.session.query(Request.urgency_level, func.count(Request.id)).group_by(Request.urgency_level).all()
    urgency_data = [{"level": lvl or "MEDIUM", "count": count} for lvl, count in urgency_counts]

    # Status breakdown
    status_counts = db.session.query(Request.status, func.count(Request.id)).group_by(Request.status).all()
    status_data = [{"status": st, "count": count} for st, count in status_counts]

    # Recent 7 days timeline
    now = datetime.utcnow()
    timeline_data = []
    for i in range(6, -1, -1):
        day_date = (now - timedelta(days=i)).date()
        start = datetime.combine(day_date, datetime.min.time())
        end = datetime.combine(day_date, datetime.max.time())
        count = Request.query.filter(Request.created_at >= start, Request.created_at <= end).count()
        timeline_data.append({
            "date": day_date.strftime("%b %d"),
            "requests": count
        })

    return jsonify({
        "metrics": {
            "total_requests": total_requests,
            "verified_requests": verified_requests,
            "pending_verification": pending_verification,
            "critical_requests": critical_requests,
            "active_matches": active_matches,
            "completed_requests": completed_requests,
            "registered_ngos": registered_ngos,
            "registered_donors": registered_donors,
            "fulfillment_rate": fulfillment_rate
        },
        "charts": {
            "by_category": categories_data,
            "by_urgency": urgency_data,
            "by_status": status_data,
            "timeline": timeline_data
        }
    }), 200

@dashboard_bp.route("/ngo", methods=["GET"])
@token_required
def get_ngo_dashboard(current_user):
    incoming_verified = Request.query.filter_by(status="VERIFIED").order_by(Request.urgency_score.desc()).all()
    critical_requests = Request.query.filter(
        Request.urgency_level.in_(["CRITICAL", "HIGH"]),
        Request.status.in_(["VERIFIED", "PENDING_VERIFICATION", "ACCEPTED"])
    ).order_by(Request.urgency_score.desc()).all()
    
    assigned_to_me = Request.query.filter_by(assigned_ngo_id=current_user.id).order_by(Request.updated_at.desc()).all()
    completed_by_me = Request.query.filter_by(assigned_ngo_id=current_user.id, status="COMPLETED").all()
    
    my_resources = Resource.query.filter(Resource.verified == True).all()

    return jsonify({
        "metrics": {
            "verified_incoming_count": len(incoming_verified),
            "critical_cases_count": len(critical_requests),
            "assigned_active_count": len([r for r in assigned_to_me if r.status != "COMPLETED"]),
            "completed_count": len(completed_by_me)
        },
        "incoming_verified": [r.to_dict(is_authorized=True) for r in incoming_verified[:10]],
        "critical_cases": [r.to_dict(is_authorized=True) for r in critical_requests[:6]],
        "assigned_requests": [r.to_dict(is_authorized=True) for r in assigned_to_me],
        "available_resources": [res.to_dict() for res in my_resources]
    }), 200

@dashboard_bp.route("/donor", methods=["GET"])
@token_required
def get_donor_dashboard(current_user):
    # Verified requests that are awaiting donations or assistance
    open_verified = Request.query.filter(
        Request.status.in_(["VERIFIED", "MATCHED", "ACCEPTED"])
    ).order_by(Request.urgency_score.desc()).all()

    my_donations = Donation.query.filter_by(donor_id=current_user.id).order_by(Donation.created_at.desc()).all()
    completed_donations = [d for d in my_donations if d.status == "completed"]

    total_people_impacted = sum(d.request.people_count for d in my_donations if d.request)

    return jsonify({
        "metrics": {
            "active_verified_needs": len(open_verified),
            "my_total_donations": len(my_donations),
            "completed_assistance": len(completed_donations),
            "people_impacted": total_people_impacted
        },
        "verified_requests": [r.to_dict(is_authorized=False) for r in open_verified[:12]],
        "my_donations": [d.to_dict() for d in my_donations]
    }), 200

@dashboard_bp.route("/notifications", methods=["GET"])
@optional_token
def get_notifications(current_user):
    query = Notification.query
    if current_user:
        query = query.filter(
            (Notification.user_id == current_user.id) | 
            (Notification.role_target == current_user.role) | 
            (Notification.role_target == "all")
        )
    else:
        query = query.filter((Notification.role_target == "all") | (Notification.role_target == None))

    notifs = query.order_by(Notification.created_at.desc()).limit(20).all()
    return jsonify({
        "notifications": [n.to_dict() for n in notifs]
    }), 200

@dashboard_bp.route("/notifications/<int:notif_id>/read", methods=["PUT"])
def mark_notification_read(notif_id):
    n = Notification.query.get_or_404(notif_id)
    n.is_read = True
    db.session.commit()
    return jsonify({"success": True}), 200
