import os
import json

_model = None
_label_map = None
_tf_available = None

CATEGORY_KEYWORDS = {
    "FOOD": [
        "food", "eat", "hungry", "starving", "meal", "meals", "ration", "rations",
        "rice", "groceries", "bread", "kitchen", "dinner", "lunch", "breakfast",
        "water", "nutrition", "feed", "cook", "cooked", "canteen", "starvation", "eating"
    ],
    "SHELTER": [
        "shelter", "roof", "sleep", "night", "homeless", "stay", "blanket", "tent",
        "room", "house", "housing", "bed", "evicted", "eviction", "accommodation"
    ],
    "MEDICAL": [
        "medical", "doctor", "medicine", "hospital", "injury", "injured", "sick",
        "health", "wound", "bleeding", "pain", "clinic", "trauma", "ambulance",
        "patient", "pharma", "pharmacy", "treatment", "fever"
    ],
    "EMERGENCY": [
        "emergency", "disaster", "fire", "flood", "danger", "trap", "trapped",
        "rescue", "crisis", "accident", "critical", "immediate aid"
    ],
    "CLOTHING": [
        "clothes", "clothing", "shirt", "pants", "dress", "shoes", "jacket",
        "sweater", "wear", "uniform", "apparel", "coat", "footwear"
    ],
    "EDUCATION": [
        "school", "books", "education", "study", "fees", "tuition", "student",
        "class", "notebook", "stationery", "college", "learning", "teacher"
    ],
    "EMPLOYMENT": [
        "job", "work", "employment", "earn", "income", "vacancy", "daily wage",
        "labor", "hiring", "joblessness", "unemployed", "salary"
    ]
}

CATEGORIES = ["CLOTHING", "EDUCATION", "EMERGENCY", "EMPLOYMENT", "FOOD", "MEDICAL", "SHELTER"]

def is_tf_available() -> bool:
    global _tf_available
    if _tf_available is not None:
        return _tf_available
    try:
        import tensorflow as tf
        import keras
        import numpy as np
        _tf_available = True
    except Exception:
        _tf_available = False
    return _tf_available

def get_classifier():
    global _model, _label_map
    if _model is not None:
        return _model, _label_map

    if not is_tf_available():
        raise ImportError("TensorFlow/Keras environment not available.")

    import keras

    base_ml_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ml")
    model_path = os.path.join(base_ml_dir, "resource_classifier.keras")
    label_map_path = os.path.join(base_ml_dir, "label_map.json")

    if not os.path.exists(model_path) or not os.path.exists(label_map_path):
        raise FileNotFoundError(f"Model or label map not found in {base_ml_dir}.")

    with open(label_map_path, "r", encoding="utf-8") as f:
        _label_map = json.load(f)

    print(f"[Classifier] Loading real DNN model from {model_path}...")
    _model = keras.models.load_model(model_path)
    print("[Classifier] Model loaded successfully.")
    return _model, _label_map

def classify_text_heuristic(text: str) -> dict:
    """
    Fallback heuristic rule-based NLP classifier when TensorFlow is not installed.
    """
    lower_text = text.lower() if text else ""
    scores = {cat: 0.0 for cat in CATEGORIES}

    for cat, keywords in CATEGORY_KEYWORDS.items():
        for kw in keywords:
            if kw in lower_text:
                scores[cat] += 1.0

    best_cat = max(scores, key=scores.get)
    max_score = scores[best_cat]

    if max_score == 0.0:
        best_cat = "FOOD"
        confidence = 0.50
        probabilities = {cat: (1.0 if cat == "FOOD" else 0.0) for cat in CATEGORIES}
    else:
        total_score = sum(scores.values())
        probabilities = {cat: round(scores[cat] / total_score, 4) for cat in CATEGORIES}
        confidence = round(scores[best_cat] / total_score, 4)
        if confidence < 0.50:
            confidence = 0.75

    return {
        "predicted_category": best_cat,
        "confidence": round(confidence, 4),
        "confidence_percentage": round(confidence * 100, 2),
        "probabilities": probabilities,
        "engine": "Heuristic Rule Classifier"
    }

def classify_text(text: str) -> dict:
    """
    Classifies text using TensorFlow/Keras DNN if available;
    falls back gracefully to heuristic rule engine if TensorFlow is missing or fails.
    """
    if not text or not text.strip():
        return {
            "predicted_category": "FOOD",
            "confidence": 0.50,
            "confidence_percentage": 50.0,
            "probabilities": {cat: (1.0 if cat == "FOOD" else 0.0) for cat in CATEGORIES}
        }

    if is_tf_available():
        try:
            import tensorflow as tf
            import numpy as np

            model, label_map = get_classifier()
            idx2label = {int(k): v for k, v in label_map["idx2label"].items()}

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
                "probabilities": probabilities,
                "engine": "TensorFlow/Keras DNN"
            }
        except Exception as e:
            print(f"[Classifier] Warning: DNN classification failed ({e}). Falling back to heuristic classifier.")

    return classify_text_heuristic(text)
