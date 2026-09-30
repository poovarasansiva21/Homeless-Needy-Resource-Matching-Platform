"""
SAHAAYAA AI - Donation Vision API Blueprint
Handles image uploads, camera scan requests, image validation,
and invokes MobileNetV2 prediction service.
"""

import os
import io
from flask import Blueprint, request, jsonify
from PIL import Image
from services.donation_vision import predict_donation_item
from services.matcher import find_matched_resources
from models import Resource

donation_vision_bp = Blueprint("donation_vision", __name__)

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}
MAX_FILE_SIZE_BYTES = 16 * 1024 * 1024  # 16 MB limit

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

@donation_vision_bp.route("/scan", methods=["POST"])
def scan_donation_image():
    """
    POST /api/donation/scan
    Accepts multipart/form-data with 'image' file field.
    Executes real TensorFlow/Keras MobileNetV2 inference.
    """
    # 1. Image Presence Validation
    if "image" not in request.files:
        return jsonify({"error": "No image provided. Please upload an image using the 'image' field."}), 400

    file = request.files["image"]
    if not file or file.filename == "":
        return jsonify({"error": "No selected file. Please choose an image to analyze."}), 400

    # 2. Extension & MIME Validation
    if not allowed_file(file.filename):
        return jsonify({"error": "Invalid file type. Supported formats are JPG, JPEG, PNG, WEBP."}), 400

    # 3. Size Validation
    file.seek(0, os.SEEK_END)
    file_length = file.tell()
    file.seek(0)
    if file_length > MAX_FILE_SIZE_BYTES:
        return jsonify({"error": "File size exceeds maximum limit of 16MB."}), 400

    if file_length == 0:
        return jsonify({"error": "Uploaded image file is empty."}), 400

    # 4. PIL Integrity & RGB Conversion
    try:
        image_bytes = file.read()
        pil_image = Image.open(io.BytesIO(image_bytes))
        pil_image.verify()  # Verify integrity
        # Re-open for conversion as verify destroys image pointer state
        pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception as e:
        return jsonify({"error": "Corrupted or unsupported image file. Could not decode image."}), 400

    # 5. Real MobileNetV2 Inference
    try:
        prediction_result = predict_donation_item(pil_image)
    except Exception as e:
        print(f"[DonationVision API Error] {e}")
        return jsonify({"error": f"Model inference failed: {str(e)}"}), 500

    # 6. Fetch Matching Resources for Detected Category
    try:
        detected_category = prediction_result["prediction"].upper()
        all_resources = Resource.query.all()
        res_dicts = [r.to_dict() for r in all_resources]
        
        req_dict = {
            "category": detected_category,
            "people_count": 1,
            "urgency_level": "MEDIUM",
            "latitude": float(request.form.get("latitude", 11.0168)),
            "longitude": float(request.form.get("longitude", 76.9558))
        }
        matched_resources = find_matched_resources(req_dict, res_dicts, max_results=4)
    except Exception as m_err:
        print(f"[DonationVision Matching Warning] {m_err}")
        matched_resources = []

    # 7. Construct Clean Response
    return jsonify({
        "success": True,
        "prediction": prediction_result["prediction"],
        "confidence": prediction_result["confidence"],
        "confidence_percentage": prediction_result["confidence_percentage"],
        "all_probabilities": prediction_result["all_probabilities"],
        "low_confidence": prediction_result["low_confidence"],
        "confidence_threshold": prediction_result["confidence_threshold"],
        "matched_resources": matched_resources,
        "model_metadata": prediction_result["model_metadata"]
    }), 200
