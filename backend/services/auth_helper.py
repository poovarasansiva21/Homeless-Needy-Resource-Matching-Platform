import functools
import jwt
from datetime import datetime, timedelta
from flask import request, jsonify, current_app
from models import User

def generate_token(user: User, expires_in_days: int = 7) -> str:
    payload = {
        "user_id": user.id,
        "email": user.email,
        "role": user.role,
        "full_name": user.full_name,
        "exp": datetime.utcnow() + timedelta(days=expires_in_days),
        "iat": datetime.utcnow()
    }
    return jwt.encode(payload, current_app.config["JWT_SECRET_KEY"], algorithm="HS256")

def decode_token(token: str) -> dict:
    return jwt.decode(token, current_app.config["JWT_SECRET_KEY"], algorithms=["HS256"])

def token_required(f):
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

        if not token:
            return jsonify({"error": "Authentication token missing or invalid"}), 401

        try:
            payload = decode_token(token)
            current_user = User.query.get(payload["user_id"])
            if not current_user:
                return jsonify({"error": "User account no longer exists"}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token has expired, please log in again"}), 401
        except Exception:
            return jsonify({"error": "Invalid authentication token"}), 401

        return f(current_user, *args, **kwargs)
    return decorated

def optional_token(f):
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        current_user = None
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            try:
                payload = decode_token(token)
                current_user = User.query.get(payload["user_id"])
            except Exception:
                current_user = None
        return f(current_user, *args, **kwargs)
    return decorated

def role_required(*allowed_roles):
    def decorator(f):
        @functools.wraps(f)
        def decorated(current_user, *args, **kwargs):
            if current_user.role not in allowed_roles and current_user.role != "admin":
                return jsonify({"error": f"Access denied. Requires one of roles: {', '.join(allowed_roles)}"}), 403
            return f(current_user, *args, **kwargs)
        return decorated
    return decorator
