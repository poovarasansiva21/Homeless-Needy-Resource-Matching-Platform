import os
import json
import numpy as np
import tensorflow as tf
import keras

_model = None
_label_map = None

def get_classifier():
    global _model, _label_map
    if _model is not None:
        return _model, _label_map

    base_ml_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ml")
    model_path = os.path.join(base_ml_dir, "resource_classifier.keras")
    label_map_path = os.path.join(base_ml_dir, "label_map.json")

    if not os.path.exists(model_path) or not os.path.exists(label_map_path):
        raise FileNotFoundError(f"Model or label map not found in {base_ml_dir}. Please run train.py first.")

    with open(label_map_path, "r", encoding="utf-8") as f:
        _label_map = json.load(f)

    print(f"[Classifier] Loading real DNN model from {model_path}...")
    _model = keras.models.load_model(model_path)
    print("[Classifier] Model loaded successfully.")
    return _model, _label_map

def classify_text(text: str) -> dict:
    """
    Real TensorFlow/Keras NLP inference on raw text.
    Returns predicted category, confidence, and all category probabilities.
    """
    if not text or not text.strip():
        return {
            "predicted_category": "FOOD",
            "confidence": 0.50,
            "confidence_percentage": 50.0,
            "probabilities": {}
        }

    model, label_map = get_classifier()
    idx2label = {int(k): v for k, v in label_map["idx2label"].items()}

    # Run inference directly through Keras model with tf.constant
    tensor_input = tf.constant([text.strip()])
    pred_tensor = model(tensor_input)
    pred_probs = pred_tensor.numpy()[0]

    best_idx = int(np.argmax(pred_probs))
    confidence = float(pred_probs[best_idx])
    predicted_category = idx2label.get(best_idx, "FOOD")

    probabilities = {}
    for idx, prob in enumerate(pred_probs):
        cat_name = idx2label.get(idx, f"CLASS_{idx}")
        probabilities[cat_name] = round(float(prob), 4)

    return {
        "predicted_category": predicted_category,
        "confidence": round(confidence, 4),
        "confidence_percentage": round(confidence * 100, 2),
        "probabilities": probabilities
    }
