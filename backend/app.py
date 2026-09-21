import os
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
from config import Config
from models import db
from database import init_db

# Blueprints
from routes.auth import auth_bp
from routes.requests import requests_bp
from routes.resources import resources_bp
from routes.matching import matching_bp
from routes.admin import admin_bp
from routes.dashboard import dashboard_bp

socketio = SocketIO()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Ensure upload folder exists
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

    # Initialize extensions
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    db.init_app(app)
    socketio.init_app(app, cors_allowed_origins="*", async_mode="threading")

    # Register Blueprints
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(requests_bp, url_prefix="/api/requests")
    app.register_blueprint(resources_bp, url_prefix="/api/resources")
    app.register_blueprint(matching_bp, url_prefix="/api/matching")
    app.register_blueprint(matching_bp, url_prefix="/api/ai", name="ai_demo")  # For /api/ai/classify
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    app.register_blueprint(dashboard_bp, url_prefix="/api/dashboard")

    # Health Check
    @app.route("/api/health", methods=["GET"])
    def health_check():
        return jsonify({
            "status": "healthy",
            "service": "SAHAAYAA AI Core API",
            "version": "1.0.0",
            "real_time_socket": True,
            "tf_model_loaded": True
        }), 200

    # Serve uploads
    @app.route("/uploads/<path:filename>", methods=["GET"])
    def serve_upload(filename):
        return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

    # Global Clean Error Handlers
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Requested resource was not found."}), 404

    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({"error": "Bad request format or missing required fields."}), 400

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({"error": "An internal server error occurred. Please try again later."}), 500

    # Initialize Database & Demo Seeds
    init_db(app)

    return app

app = create_app()

# Socket.IO Event Handlers
@socketio.on("connect")
def handle_connect():
    print("[SocketIO] Client connected to live events channel.")
    emit("connection_ack", {"status": "connected", "message": "Subscribed to SAHAAYAA AI real-time updates."})

@socketio.on("disconnect")
def handle_disconnect():
    print("[SocketIO] Client disconnected.")

@socketio.on("subscribe_role")
def handle_role_subscription(data):
    role = data.get("role")
    if role:
        join_room(role)
        print(f"[SocketIO] Client joined room for role: {role}")

if __name__ == "__main__":
    print("\n" + "="*60)
    print("  SAHAAYAA AI - Backend Server Starting")
    print("  AI-Powered Homeless & Needy Resource Matching Platform")
    print("  URL: http://127.0.0.1:5000")
    print("="*60 + "\n")
    socketio.run(app, host="127.0.0.1", port=5000, debug=False, allow_unsafe_werkzeug=True)
