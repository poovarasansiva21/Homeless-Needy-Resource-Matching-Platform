from flask import Blueprint, request, jsonify
from models import db, Resource, AuditLog
from services.auth_helper import token_required, role_required
from services.matcher import haversine_distance

resources_bp = Blueprint("resources", __name__)

@resources_bp.route("", methods=["GET"])
def get_resources():
    category = request.args.get("category")
    lat_str = request.args.get("lat")
    lon_str = request.args.get("lon")
    radius_km = request.args.get("radius", type=float)

    query = Resource.query

    if category:
        query = query.filter_by(category=category.upper())

    resources_list = query.order_by(Resource.name).all()
    res_dicts = [r.to_dict() for r in resources_list]

    if lat_str and lon_str:
        try:
            user_lat = float(lat_str)
            user_lon = float(lon_str)
            for r in res_dicts:
                r["distance_km"] = haversine_distance(user_lat, user_lon, r["latitude"], r["longitude"])
            if radius_km:
                res_dicts = [r for r in res_dicts if r["distance_km"] <= radius_km]
            res_dicts.sort(key=lambda x: x.get("distance_km", 999))
        except ValueError:
            pass

    return jsonify({"resources": res_dicts, "count": len(res_dicts)}), 200

@resources_bp.route("/<int:res_id>", methods=["GET"])
def get_resource(res_id):
    res_obj = Resource.query.get_or_404(res_id)
    return jsonify({"resource": res_obj.to_dict()}), 200

@resources_bp.route("", methods=["POST"])
@token_required
@role_required("admin", "ngo")
def create_resource(current_user):
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    category = data.get("category", "").upper().strip()
    org_type = data.get("organization_type", "NGO").strip()
    address = data.get("address", "").strip()
    phone = data.get("phone", "").strip()

    if not name or not category or not address or not phone:
        return jsonify({"error": "Name, category, address, and phone are required."}), 400

    new_res = Resource(
        name=name,
        organization_type=org_type,
        category=category,
        description=data.get("description", ""),
        phone=phone,
        email=data.get("email"),
        latitude=float(data.get("latitude", 11.0168)),
        longitude=float(data.get("longitude", 76.9558)),
        address=address,
        availability_status=data.get("availability_status", "Available"),
        capacity_total=int(data.get("capacity_total", 50)),
        capacity_available=int(data.get("capacity_available", 25)),
        verified=True if current_user.role == "admin" else False,
        is_demo=False
    )
    db.session.add(new_res)
    db.session.commit()

    return jsonify({
        "message": "Resource created successfully",
        "resource": new_res.to_dict()
    }), 201
