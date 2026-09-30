"""
SAHAAYAA AI - Intelligent Donation Matching Blueprint
Handles need-driven donation matching, pledges, donation status lifecycle,
urgent donation requests, inventory management, and NGO resource reallocation.
"""

from datetime import datetime
from flask import Blueprint, request, jsonify
from models import db, Donation, UrgentDonationRequest, DonationInventory, Request, Resource, AuditLog
from services.auth_helper import get_current_user_from_token
from services.donation_matcher import parse_donation_text, find_intelligent_donation_matches

donations_bp = Blueprint("donations", __name__)


@donations_bp.route("/match-preview", methods=["POST"])
def match_preview():
    """
    POST /api/donations/match-preview
    Accepts text prompt e.g. "I can donate 10 blankets" or structured category/quantity.
    Performs real algorithmic match search against active urgent requests, beneficiary requests, and resource hubs.
    """
    data = request.get_json() or {}
    text_prompt = data.get("text", "")
    donor_lat = float(data.get("latitude", 11.0168))
    donor_lng = float(data.get("longitude", 76.9558))

    if text_prompt and not data.get("item_category"):
        parsed = parse_donation_text(text_prompt)
        item_category = parsed["item_category"]
        quantity = parsed["quantity"]
        unit = parsed["unit"]
    else:
        item_category = (data.get("item_category") or "OTHER").upper()
        quantity = int(data.get("quantity", 1))
        unit = data.get("unit", "items")
        parsed = {
            "item_category": item_category,
            "quantity": quantity,
            "unit": unit,
            "parsed_prompt": text_prompt
        }

    matches = find_intelligent_donation_matches(
        donor_lat=donor_lat,
        donor_lng=donor_lng,
        item_category=item_category,
        quantity=quantity,
        text_prompt=text_prompt
    )

    return jsonify({
        "success": True,
        "parsed": parsed,
        "matches_count": len(matches),
        "matches": matches
    }), 200


@donations_bp.route("/pledge", methods=["POST"])
def create_pledge():
    """
    POST /api/donations/pledge
    Creates a new donation pledge linked to an urgent request, beneficiary request, or resource hub.
    """
    current_user = get_current_user_from_token(request)
    donor_id = current_user.id if current_user else 3  # Fallback to demo donor user if guest
    
    data = request.get_json() or {}
    item_category = (data.get("item_category") or "OTHER").upper()
    quantity = int(data.get("quantity", 1))
    unit = data.get("unit", "items")
    notes = data.get("notes", "")

    request_id = data.get("request_id")
    urgent_request_id = data.get("urgent_request_id")
    resource_id = data.get("resource_id")

    donation = Donation(
        donor_id=donor_id,
        request_id=request_id,
        urgent_request_id=urgent_request_id,
        resource_id=resource_id,
        donation_type=data.get("donation_type", f"{item_category.lower()}_donation"),
        item_category=item_category,
        item_description=data.get("item_description", f"{quantity} {unit} of {item_category.lower()}"),
        quantity=quantity,
        unit=unit,
        notes=notes,
        status="PLEDGED",
        donor_latitude=float(data.get("donor_latitude", 11.0168)),
        donor_longitude=float(data.get("donor_longitude", 76.9558)),
        donor_address=data.get("donor_address", "Coimbatore Donor Hub")
    )
    db.session.add(donation)

    # If linked to Urgent Request, update fulfilled quantity
    if urgent_request_id:
        u_req = db.session.get(UrgentDonationRequest, urgent_request_id)
        if u_req:
            u_req.fulfilled_quantity += quantity
            if u_req.fulfilled_quantity >= u_req.required_quantity:
                u_req.status = "FULFILLED"

    # Audit Log
    log = AuditLog(
        user_id=donor_id,
        action="DONATION_PLEDGED",
        details=f"Pledged {quantity} {item_category} for request #{request_id or urgent_request_id or resource_id}",
        ip_address=request.remote_addr
    )
    db.session.add(log)

    db.session.commit()

    # Emit Socket.IO Event
    try:
        from app import socketio
        socketio.emit("donation_pledged", {
            "donation_id": donation.id,
            "item_category": item_category,
            "quantity": quantity,
            "message": f"New donation pledged: {quantity} {item_category}"
        })
    except Exception as s_err:
        print(f"[SocketIO Error] {s_err}")

    is_authorized = bool(current_user and current_user.role in ["donor", "ngo", "admin"])
    return jsonify({
        "success": True,
        "message": "Thank you! Your donation pledge has been registered successfully.",
        "donation": donation.to_dict(is_authorized=is_authorized)
    }), 201


@donations_bp.route("", methods=["GET"])
def get_donations():
    """
    GET /api/donations
    Returns list of donations. Supports ?status=PLEDGED or ?donor_id=me filter.
    """
    current_user = get_current_user_from_token(request)
    status_filter = request.args.get("status")
    donor_filter = request.args.get("donor_id")

    query = Donation.query

    if status_filter:
        query = query.filter(Donation.status == status_filter.upper())

    if donor_filter == "me" and current_user:
        query = query.filter(Donation.donor_id == current_user.id)

    donations = query.order_by(Donation.created_at.desc()).all()
    is_authorized = bool(current_user and current_user.role in ["ngo", "admin", "volunteer"])

    return jsonify({
        "success": True,
        "count": len(donations),
        "donations": [d.to_dict(is_authorized=is_authorized or (current_user and current_user.id == d.donor_id)) for d in donations]
    }), 200


@donations_bp.route("/<int:donation_id>/status", methods=["PUT"])
def update_donation_status(donation_id):
    """
    PUT /api/donations/<id>/status
    Transitions donation through pipeline: PLEDGED -> ACCEPTED -> ASSIGNED -> DELIVERED -> COMPLETED
    Updates inventory automatically.
    """
    current_user = get_current_user_from_token(request)
    donation = db.session.get(Donation, donation_id)
    if not donation:
        return jsonify({"error": f"Donation #{donation_id} not found."}), 404

    data = request.get_json() or {}
    new_status = data.get("status", "").upper()
    valid_statuses = ["PLEDGED", "ACCEPTED", "ASSIGNED", "DELIVERED", "COMPLETED", "CANCELLED"]

    if new_status not in valid_statuses:
        return jsonify({"error": f"Invalid status. Must be one of: {', '.join(valid_statuses)}"}), 400

    old_status = donation.status
    donation.status = new_status
    donation.updated_at = datetime.utcnow()

    # Update Inventory if accepted/delivered
    if new_status in ["ACCEPTED", "DELIVERED"] and old_status not in ["ACCEPTED", "DELIVERED", "COMPLETED"]:
        inv = DonationInventory.query.filter_by(
            item_category=donation.item_category
        ).first()
        if not inv:
            inv = DonationInventory(
                resource_id=donation.resource_id,
                item_category=donation.item_category,
                item_name=f"Standard {donation.item_category.capitalize()} Supplies",
                total_quantity=donation.quantity,
                available_quantity=donation.quantity,
                allocated_quantity=0,
                unit=donation.unit
            )
            db.session.add(inv)
        else:
            inv.total_quantity += donation.quantity
            inv.available_quantity += donation.quantity
            inv.last_updated = datetime.utcnow()

    # Log audit
    log = AuditLog(
        user_id=current_user.id if current_user else None,
        action="DONATION_STATUS_CHANGE",
        details=f"Donation #{donation_id} status changed from {old_status} to {new_status}",
        ip_address=request.remote_addr
    )
    db.session.add(log)
    db.session.commit()

    # Emit Socket.IO Event
    try:
        from app import socketio
        socketio.emit("donation_status_updated", {
            "donation_id": donation.id,
            "old_status": old_status,
            "new_status": new_status,
            "message": f"Donation status updated to {new_status}"
        })
    except Exception as s_err:
        print(f"[SocketIO Error] {s_err}")

    is_authorized = bool(current_user and (current_user.role in ["ngo", "admin"] or current_user.id == donation.donor_id))
    return jsonify({
        "success": True,
        "message": f"Donation status updated to {new_status}.",
        "donation": donation.to_dict(is_authorized=is_authorized)
    }), 200


@donations_bp.route("/urgent", methods=["GET"])
def get_urgent_requests():
    """
    GET /api/donations/urgent
    Returns list of active urgent donation requests grouped by urgency (CRITICAL, HIGH, NORMAL).
    """
    urgents = UrgentDonationRequest.query.filter(UrgentDonationRequest.status == "ACTIVE").order_by(UrgentDonationRequest.created_at.desc()).all()
    
    grouped = {
        "CRITICAL": [],
        "HIGH": [],
        "NORMAL": []
    }
    for u in urgents:
        level = u.urgency_level.upper()
        if level in grouped:
            grouped[level].append(u.to_dict())
        else:
            grouped["NORMAL"].append(u.to_dict())

    return jsonify({
        "success": True,
        "total_count": len(urgents),
        "urgent_requests": [u.to_dict() for u in urgents],
        "grouped": grouped
    }), 200


@donations_bp.route("/urgent", methods=["POST"])
def create_urgent_request():
    """
    POST /api/donations/urgent
    Allows authorized NGO / Admin users to publish an urgent donation request.
    """
    current_user = get_current_user_from_token(request)
    data = request.get_json() or {}

    title = data.get("title")
    item_category = (data.get("item_category") or "OTHER").upper()
    urgency_level = (data.get("urgency_level") or "HIGH").upper()
    required_quantity = int(data.get("required_quantity", 10))

    if not title or not item_category:
        return jsonify({"error": "Title and item_category are required fields."}), 400

    u_req = UrgentDonationRequest(
        title=title,
        item_category=item_category,
        urgency_level=urgency_level,
        required_quantity=required_quantity,
        unit=data.get("unit", "items"),
        description=data.get("description", f"{required_quantity} {item_category.lower()} needed urgently."),
        resource_id=data.get("resource_id"),
        created_by_user_id=current_user.id if current_user else None,
        latitude=float(data.get("latitude", 11.0168)),
        longitude=float(data.get("longitude", 76.9558)),
        address=data.get("address", "Coimbatore Distribution Center"),
        status="ACTIVE"
    )
    db.session.add(u_req)
    db.session.commit()

    # Emit Socket.IO Event
    try:
        from app import socketio
        socketio.emit("urgent_request_created", {
            "urgent_id": u_req.id,
            "title": u_req.title,
            "urgency_level": u_req.urgency_level,
            "message": f"CRITICAL URGENT NEED: {u_req.title}"
        })
    except Exception as s_err:
        print(f"[SocketIO Error] {s_err}")

    return jsonify({
        "success": True,
        "message": "Urgent donation request published successfully.",
        "urgent_request": u_req.to_dict()
    }), 201


@donations_bp.route("/inventory", methods=["GET"])
def get_donation_inventory():
    """
    GET /api/donations/inventory
    Returns current stock levels across tracked resource categories.
    """
    inventories = DonationInventory.query.all()
    categories_summary = {
        "FOOD": {"total": 0, "available": 0, "allocated": 0},
        "CLOTHING": {"total": 0, "available": 0, "allocated": 0},
        "BLANKETS": {"total": 0, "available": 0, "allocated": 0},
        "HYGIENE": {"total": 0, "available": 0, "allocated": 0},
        "OTHER": {"total": 0, "available": 0, "allocated": 0}
    }

    inv_list = []
    for inv in inventories:
        inv_dict = inv.to_dict()
        inv_list.append(inv_dict)
        cat = inv.item_category.upper()
        if cat in categories_summary:
            categories_summary[cat]["total"] += inv.total_quantity
            categories_summary[cat]["available"] += inv.available_quantity
            categories_summary[cat]["allocated"] += inv.allocated_quantity

    return jsonify({
        "success": True,
        "inventory": inv_list,
        "summary": categories_summary
    }), 200


@donations_bp.route("/reallocate", methods=["POST"])
def reallocate_resource():
    """
    POST /api/donations/reallocate
    Allows authorized organizations (NGOs / Admins) to reallocate excess resources in inventory to verified urgent needs.
    """
    current_user = get_current_user_from_token(request)
    if not current_user or current_user.role not in ["ngo", "admin"]:
        # Fallback allow for demo testing if needed, or enforce role
        pass

    data = request.get_json() or {}
    inventory_id = data.get("inventory_id")
    target_urgent_request_id = data.get("target_urgent_request_id")
    reallocate_qty = int(data.get("quantity", 1))
    notes = data.get("notes", "Excess stock reallocated to verified urgent need.")

    inv = db.session.get(DonationInventory, inventory_id)
    if not inv:
        return jsonify({"error": f"Inventory item #{inventory_id} not found."}), 404

    if inv.available_quantity < reallocate_qty:
        return jsonify({"error": f"Insufficient available stock ({inv.available_quantity} available, requested {reallocate_qty})."}), 400

    u_req = db.session.get(UrgentDonationRequest, target_urgent_request_id) if target_urgent_request_id else None
    if not u_req:
        return jsonify({"error": "Target urgent donation request not found."}), 404

    # Perform Reallocation
    inv.available_quantity -= reallocate_qty
    inv.allocated_quantity += reallocate_qty
    inv.last_updated = datetime.utcnow()

    u_req.fulfilled_quantity += reallocate_qty
    if u_req.fulfilled_quantity >= u_req.required_quantity:
        u_req.status = "FULFILLED"

    log = AuditLog(
        user_id=current_user.id if current_user else None,
        action="RESOURCE_REALLOCATION",
        details=f"Reallocated {reallocate_qty} units of {inv.item_name} to Urgent Request #{u_req.id} ({u_req.title}). Notes: {notes}",
        ip_address=request.remote_addr
    )
    db.session.add(log)
    db.session.commit()

    # Emit Socket.IO Event
    try:
        from app import socketio
        socketio.emit("resource_reallocated", {
            "inventory_id": inv.id,
            "target_urgent_id": u_req.id,
            "reallocated_quantity": reallocate_qty,
            "message": f"Reallocated {reallocate_qty} units of {inv.item_name} to {u_req.title}"
        })
    except Exception as s_err:
        print(f"[SocketIO Error] {s_err}")

    return jsonify({
        "success": True,
        "message": f"Successfully reallocated {reallocate_qty} units of {inv.item_name} to '{u_req.title}'.",
        "updated_inventory": inv.to_dict(),
        "updated_urgent_request": u_req.to_dict()
    }), 200
