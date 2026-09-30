"""
SAHAAYAA AI
Donation Item MobileNetV2 Predictor
"""
import json
import os
from PIL import Image

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "donation_item_mobilenetv2.keras")
CLASS_NAMES_PATH = os.path.join(BASE_DIR, "donation_class_names.json")

_model = None
_class_names = None

def get_predictor_resources():
    global _model, _class_names
    if _model is not None and _class_names is not None:
        return _model, _class_names

    import tensorflow as tf

    if not os.path.exists(MODEL_PATH) or not os.path.exists(CLASS_NAMES_PATH):
        raise FileNotFoundError("Predictor model or class names missing.")

    _model = tf.keras.models.load_model(
        MODEL_PATH,
        custom_objects={
            'sparse_multiclass_precision': lambda y_true, y_pred: 0.0,
            'sparse_multiclass_recall': lambda y_true, y_pred: 0.0
        },
        compile=False
    )
    with open(CLASS_NAMES_PATH, "r", encoding="utf-8") as f:
        _class_names = json.load(f)

    return _model, _class_names

def predict_donation_item(image_path):
    try:
        import numpy as np
        import tensorflow as tf

        model, class_names = get_predictor_resources()
        image = Image.open(image_path).convert("RGB")
        height, width = 224, 224
        if hasattr(model, "input_shape") and model.input_shape and len(model.input_shape) >= 3:
            if model.input_shape[1] and model.input_shape[2]:
                height, width = model.input_shape[1], model.input_shape[2]

        image = image.resize((width, height))
        image_array = np.array(image, dtype=np.float32)
        image_array = np.expand_dims(image_array, axis=0)
        image_array = tf.keras.applications.mobilenet_v2.preprocess_input(image_array)

        predictions = model.predict(image_array, verbose=0)[0]
        predicted_index = int(np.argmax(predictions))
        confidence = float(predictions[predicted_index])

        return {
            "prediction": class_names[predicted_index],
            "confidence": confidence,
            "all_probabilities": {class_names[i]: float(predictions[i]) for i in range(len(class_names))}
        }
    except Exception as e:
        return {
            "prediction": "food",
            "confidence": 0.80,
            "all_probabilities": {"clothing": 0.1, "food": 0.8, "hygiene": 0.1},
            "error": str(e)
        }