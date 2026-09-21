from flask import Blueprint, request, jsonify
from models import db, User, AuditLog
from services.auth_helper import generate_token, token_required

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    full_name = data.get("full_name", "").strip()
    role = data.get("role", "requester").strip().lower()
    phone = data.get("phone", "").strip()
    organization_name = data.get("organization_name", "").strip() or None

    if not email or not password or not full_name:
        return jsonify({"error": "Full name, email, and password are required."}), 400

    if role not in ["requester", "donor", "ngo", "admin", "volunteer"]:
        return jsonify({"error": "Invalid role specified."}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "An account with this email already exists."}), 400

    new_user = User(
        email=email,
        full_name=full_name,
        role=role,
        phone=phone,
        organization_name=organization_name
    )
    new_user.set_password(password)
    db.session.add(new_user)
    db.session.commit()

    token = generate_token(new_user)

    # Audit log
    audit = AuditLog(
        user_id=new_user.id,
        action="USER_REGISTER",
        details=f"Registered new {role} account: {email}",
        ip_address=request.remote_addr
    )
    db.session.add(audit)
    db.session.commit()

    return jsonify({
        "message": "Registration successful",
        "token": token,
        "user": new_user.to_dict()
    }), 201

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "Email and password are required."}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid email or password credentials."}), 401

    token = generate_token(user)

    audit = AuditLog(
        user_id=user.id,
        action="USER_LOGIN",
        details=f"User logged in: {user.role}",
        ip_address=request.remote_addr
    )
    db.session.add(audit)
    db.session.commit()

    return jsonify({
        "message": "Login successful",
        "token": token,
        "user": user.to_dict()
    }), 200

@auth_bp.route("/me", methods=["GET"])
@token_required
def get_me(current_user):
    return jsonify({
        "user": current_user.to_dict()
    }), 200

@auth_bp.route("/demo-users", methods=["GET"])
def get_demo_users():
    """Returns available demo credentials for presentation."""
    return jsonify({
        "demo_accounts": [
            {"role": "admin", "email": "admin@sahaayaa.org", "label": "Admin Dashboard", "name": "Dr. V. Rajesh (Admin)"},
            {"role": "ngo", "email": "aravind.ngo@sahaayaa.org", "label": "NGO Portal", "name": "Aravind Relief Mission"},
            {"role": "donor", "email": "donor@sahaayaa.org", "label": "Donor Portal", "name": "Kavitha Sundaram (Donor)"},
            {"role": "requester", "email": "requester@sahaayaa.org", "label": "Requester / Needy", "name": "Murugan S."},
            {"role": "volunteer", "email": "volunteer@sahaayaa.org", "label": "Field Volunteer", "name": "Praveen Kumar"}
        ]
    }), 200
