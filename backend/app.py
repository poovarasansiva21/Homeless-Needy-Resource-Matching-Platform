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
from routes.donation_vision import donation_vision_bp
from routes.help_reports import help_reports_bp
from routes.mobility import mobility_bp
from routes.donations import donations_bp
from routes.intelligence import intelligence_bp
from routes.trust import trust_bp

socketio = SocketIO()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Ensure upload folder exists safely
    try:
        os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
    except Exception as upload_err:
        print(f"[Upload Folder Warning] {upload_err}")

    # Initialize extensions
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    db.init_app(app)
    try:
        socketio.init_app(app, cors_allowed_origins="*", async_mode="threading")
    except Exception as io_err:
        print(f"[SocketIO Warning] Socket.IO initialization notice: {io_err}")

    # Register Blueprints
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(requests_bp, url_prefix="/api/requests")
    app.register_blueprint(resources_bp, url_prefix="/api/resources")
    app.register_blueprint(matching_bp, url_prefix="/api/matching")
    app.register_blueprint(matching_bp, url_prefix="/api/ai", name="ai_demo")  # For /api/ai/classify
    app.register_blueprint(donation_vision_bp, url_prefix="/api/donation")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    app.register_blueprint(dashboard_bp, url_prefix="/api/dashboard")
    app.register_blueprint(help_reports_bp, url_prefix="/api/help-reports")
    app.register_blueprint(mobility_bp, url_prefix="/api/mobility")
    app.register_blueprint(donations_bp, url_prefix="/api/donations")
    app.register_blueprint(intelligence_bp, url_prefix="/api/intelligence")
    app.register_blueprint(trust_bp, url_prefix="/api/trust")




    # Health Check
    @app.route("/api/health", methods=["GET"])
    @app.route("/health", methods=["GET"])
    def health_check():
        db_status = "ok"
        try:
            from sqlalchemy import text
            db.session.execute(text("SELECT 1"))
        except Exception:
            db_status = "degraded"

        from services.classifier import is_tf_available
        tf_status = is_tf_available()

        return jsonify({
            "status": "healthy" if db_status == "ok" else "degraded",
            "service": "SAHAAYAA AI Core API",
            "version": "1.0.0",
            "database": db_status,
            "real_time_socket": True,
            "tf_model_loaded": tf_status
        }), 200

    # Serve uploads
    @app.route("/uploads/<path:filename>", methods=["GET"])
    def serve_upload(filename):
        return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

    # Global Clean Error Handlers
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"success": False, "error": "Requested resource was not found."}), 404

    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({"success": False, "error": "Bad request format or missing required fields."}), 400

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({"success": False, "error": "An internal server error occurred. Please try again later."}), 500

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
    socketio.run(app, host="127.0.0.1", port=5000, debug=True, allow_unsafe_werkzeug=True)
