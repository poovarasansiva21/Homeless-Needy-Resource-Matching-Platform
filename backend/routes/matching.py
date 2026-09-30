from datetime import datetime
from flask import Blueprint, request, jsonify
from models import db, Resource, Request, AIPredictionLog
from services.classifier import classify_text
from services.urgency import analyze_urgency
from services.matcher import find_matched_resources
from services.humanitarian_pipeline import analyze_humanitarian_request, PIPELINE_MODEL_VERSION

matching_bp = Blueprint("matching", __name__)

@matching_bp.route("/find", methods=["POST"])
def match_resources():
    data = request.get_json() or {}
    req_id = data.get("request_id")

    if req_id:
        req_obj = Request.query.get_or_404(req_id)
        req_dict = req_obj.to_dict(is_authorized=True)
    else:
        # Ad-hoc query from UI simulation
        req_dict = {
            "category": data.get("category", "FOOD"),
            "people_count": data.get("people_count", 1),
            "urgency_level": data.get("urgency_level", "HIGH"),
            "latitude": float(data.get("latitude", 11.0168)),
            "longitude": float(data.get("longitude", 76.9558))
        }

    all_resources = Resource.query.all()
    res_dicts = [r.to_dict() for r in all_resources]
    matched = find_matched_resources(req_dict, res_dicts, max_results=6)

    return jsonify({"matches": matched}), 200

@matching_bp.route("/analyze", methods=["POST"])
@matching_bp.route("/classify", methods=["POST"])
def live_ai_analysis_pipeline():
    """
    Phase 2 Advanced Humanitarian Analysis Pipeline Endpoint.
    Invokes real TensorFlow DNN model + NLP feature parsing + Urgency Scoring +
    Transport Barrier analysis + Confidence action determination.
    Logs execution telemetry into database without storing sensitive PII.
    """
    data = request.get_json() or {}
    text = data.get("text", "").strip() or data.get("description", "").strip()

    if not text:
        return jsonify({"error": "Text description is required for pipeline analysis."}), 400

    context_people = int(data.get("people_count", 1))
    context_situation = data.get("situation", "").strip()

    # 1. Execute Full Phase 2 Humanitarian Analysis Pipeline
    pipeline_res = analyze_humanitarian_request(
        text=text,
        context_people_count=context_people,
        context_situation=context_situation
    )

    # 2. Database Logging of Model Version, Prediction & Confidence (No raw PII stored unnecessarily)
    log_entry = AIPredictionLog(
        model_version=pipeline_res["model_version"],
        text_hash=pipeline_res["text_hash"],
        predicted_category=pipeline_res["category"],
        predicted_urgency=pipeline_res["urgency"],
        confidence=pipeline_res["confidence"],
        people_count=pipeline_res["people"],
        transport_barrier=pipeline_res["transport_barrier"],
        transport_reason=pipeline_res["transport_reason"],
        duration_of_need=pipeline_res["duration"],
        confidence_action=pipeline_res["confidence_action"],
        full_analysis=pipeline_res
    )
    try:
        db.session.add(log_entry)
        db.session.commit()
        log_id = log_entry.id
    except Exception as e:
        db.session.rollback()
        print(f"[AILog Error] Failed to persist AI log: {e}")
        log_id = None

    # 3. Resource Matching based on pipeline output
    lat = float(data.get("latitude", 11.0168))
    lon = float(data.get("longitude", 76.9558))

    req_dict = {
        "category": pipeline_res["category"],
        "people_count": pipeline_res["people"],
        "urgency_level": pipeline_res["urgency"],
        "latitude": lat,
        "longitude": lon
    }

    all_resources = Resource.query.all()
    res_dicts = [r.to_dict() for r in all_resources]
    matched_resources = find_matched_resources(req_dict, res_dicts, max_results=4)

    return jsonify({
        "success": True,
        "input_text": text,
        "category": pipeline_res["category"],
        "urgency": pipeline_res["urgency"],
        "people": pipeline_res["people"],
        "duration": pipeline_res["duration"],
        "transport_barrier": pipeline_res["transport_barrier"],
        "transport_reason": pipeline_res["transport_reason"],
        "intent": pipeline_res["intent"],
        "important_entities": pipeline_res["important_entities"],
        "confidence": pipeline_res["confidence"],
        "confidence_percentage": pipeline_res["confidence_percentage"],
        "confidence_action": pipeline_res["confidence_action"],
        "action_note": pipeline_res["action_note"],
        "follow_up_questions": pipeline_res["follow_up_questions"],
        "model_version": pipeline_res["model_version"],
        "log_id": log_id,
        "probabilities": pipeline_res["all_category_probabilities"],
        "disclaimer": pipeline_res["disclaimer"],
        "escalation_required": pipeline_res["escalation_required"],
        "matched_resources": matched_resources
    }), 200

@matching_bp.route("/correct", methods=["POST"])
def submit_human_correction():
    """
    Submits human correction feedback for AI prediction logs.
    Allows admins / field coordinators to correct category or urgency for model fine-tuning.
    """
    data = request.get_json() or {}
    log_id = data.get("log_id")
    corrected_category = data.get("corrected_category", "").upper().strip()
    corrected_urgency = data.get("corrected_urgency", "").upper().strip()
    notes = data.get("notes", "").strip()

    if not log_id:
        return jsonify({"error": "log_id is required for correction feedback."}), 400

    log_entry = AIPredictionLog.query.get(log_id)
    if not log_entry:
        return jsonify({"error": f"Prediction log #{log_id} not found."}), 404

    log_entry.is_corrected = True
    if corrected_category:
        log_entry.human_corrected_category = corrected_category
    if corrected_urgency:
        log_entry.human_corrected_urgency = corrected_urgency
    log_entry.correction_notes = notes
    log_entry.corrected_at = datetime.utcnow()

    db.session.commit()

    return jsonify({
        "message": "Human correction successfully recorded in feedback log.",
        "log": log_entry.to_dict()
    }), 200

@matching_bp.route("/logs", methods=["GET"])
def get_prediction_logs():
    """
    Retrieves telemetry prediction logs for model monitoring and audit.
    """
    limit = int(request.args.get("limit", 50))
    logs = AIPredictionLog.query.order_by(AIPredictionLog.created_at.desc()).limit(limit).all()
    return jsonify({
        "logs": [l.to_dict() for l in logs],
        "count": len(logs),
        "model_version": PIPELINE_MODEL_VERSION
    }), 200
