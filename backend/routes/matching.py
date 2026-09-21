from flask import Blueprint, request, jsonify
from models import Resource, Request
from services.classifier import classify_text
from services.urgency import analyze_urgency
from services.matcher import find_matched_resources

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

@matching_bp.route("/classify", methods=["POST"])
def live_ai_classification():
    """
    Live AI demonstration endpoint for DNN presentation.
    Invokes genuine TensorFlow model and returns complete analysis.
    """
    data = request.get_json() or {}
    text = data.get("text", "").strip()

    if not text:
        return jsonify({"error": "Text is required for classification."}), 400

    # 1. Genuine TensorFlow / Keras Model Inference
    ai_result = classify_text(text)
    predicted_category = ai_result["predicted_category"]
    confidence = ai_result["confidence"]

    # 2. Urgency Analysis
    urgency_result = analyze_urgency(
        text=text, 
        category=predicted_category, 
        people_count=int(data.get("people_count", 1)),
        situation=data.get("situation", "")
    )

    # 3. Geo coordinates (default Coimbatore center if not passed)
    lat = float(data.get("latitude", 11.0168))
    lon = float(data.get("longitude", 76.9558))

    req_dict = {
        "category": predicted_category,
        "people_count": int(data.get("people_count", 1)),
        "urgency_level": urgency_result["urgency_level"],
        "latitude": lat,
        "longitude": lon
    }

    # 4. Suitable matched resources
    all_resources = Resource.query.all()
    res_dicts = [r.to_dict() for r in all_resources]
    matched_resources = find_matched_resources(req_dict, res_dicts, max_results=4)

    return jsonify({
        "success": True,
        "input_text": text,
        "category": predicted_category,
        "confidence": confidence,
        "confidence_percentage": round(confidence * 100, 1),
        "probabilities": ai_result["probabilities"],
        "urgency": urgency_result["urgency_level"],
        "urgency_score": urgency_result["urgency_score"],
        "indicators": urgency_result["indicators"],
        "disclaimer": urgency_result["disclaimer"],
        "escalation_required": urgency_result["escalation_required"],
        "matched_resources": matched_resources
    }), 200
