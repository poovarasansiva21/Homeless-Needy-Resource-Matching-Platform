"""
Automated Escalation Engine for SAHAAYAA AI Humanitarian Rescue Chain (Phase 4).
Scans active requests that have not been accepted within a configured response period (e.g. 30 minutes)
and automatically escalates them to secondary verified NGOs and Central Directorate Admins.
"""

from datetime import datetime, timedelta
from models import db, Request, RequestStatusHistory, Notification, AuditLog, User

def emit_socket_event(event_name, payload):
    try:
        from app import socketio
        socketio.emit(event_name, payload)
    except Exception as e:
        print(f"[SocketIO Escalation Error] {e}")

def run_escalation_check(timeout_minutes: int = 30):
    """
    Checks for unaccepted requests exceeding timeout_minutes.
    Escalates status, logs auditable history, creates admin notifications, and broadcasts real-time alerts.
    """
    cutoff_time = datetime.utcnow() - timedelta(minutes=timeout_minutes)
    
    stale_statuses = [
        "REQUESTED", "AI_ANALYZED", "RESOURCE_MATCHED", 
        "TRANSPORT_CHECK", "NGO_NOTIFIED", "PENDING_VERIFICATION"
    ]

    stale_requests = Request.query.filter(
        Request.status.in_(stale_statuses),
        Request.created_at <= cutoff_time,
        Request.assigned_ngo_id.is_(None)
    ).all()

    escalated_count = 0
    escalated_records = []

    for req in stale_requests:
        prev_status = req.status
        req.status = "ESCALATED"
        req.updated_at = datetime.utcnow()

        # 1. Complete Auditable Status History
        history = RequestStatusHistory(
            request_id=req.id,
            previous_status=prev_status,
            new_status="ESCALATED",
            changed_by_user_id=None,  # System AI Engine
            notes=f"AUTOMATED ESCALATION: Request passed configured response period ({timeout_minutes}m) without NGO acceptance. Re-routed to Central Directorate."
        )
        db.session.add(history)

        # 2. Audit Log
        audit = AuditLog(
            user_id=None,
            action="AUTOMATED_ESCALATION",
            details=f"Request #{req.id} ({req.category}, {req.urgency_level} Priority) escalated after {timeout_minutes}m timeout.",
            ip_address="SYSTEM_ENGINE"
        )
        db.session.add(audit)

        # 3. Notification to Admin & Secondary NGOs
        admin_notif = Notification(
            user_id=None,
            role_target="admin",
            title=f"🚨 ESCALATION ALERT: Request #{req.id}",
            message=f"Urgent {req.category} request #{req.id} ({req.urgency_level}) exceeded {timeout_minutes}m response period. Re-routed to Central Directorate.",
            notification_type="alert"
        )
        db.session.add(admin_notif)

        # 4. Notification to Requester (No sensitive PII exposed)
        requester_notif = Notification(
            user_id=req.requester_id,
            role_target="requester" if req.requester_id else None,
            title="Sahaayaa Priority Escalation",
            message="Your request has been escalated to our Central Directorate for immediate priority dispatch.",
            notification_type="info"
        )
        db.session.add(requester_notif)

        escalated_count += 1
        escalated_records.append({
            "request_id": req.id,
            "category": req.category,
            "urgency": req.urgency_level,
            "previous_status": prev_status,
            "escalated_at": req.updated_at.isoformat()
        })

        # Broadcast Socket.IO Real-Time Escalation Event
        emit_socket_event("request_escalated", {
            "request_id": req.id,
            "category": req.category,
            "urgency_level": req.urgency_level,
            "message": f"Escalation Alert: Request #{req.id} unaccepted after {timeout_minutes}m response period.",
            "timestamp": datetime.utcnow().isoformat()
        })

    if escalated_count > 0:
        db.session.commit()
        print(f"[EscalationEngine] Successfully escalated {escalated_count} stale requests.")

    return {
        "success": True,
        "escalated_count": escalated_count,
        "records": escalated_records,
        "checked_at": datetime.utcnow().isoformat()
    }
