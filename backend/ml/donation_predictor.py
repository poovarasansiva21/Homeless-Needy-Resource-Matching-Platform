"""
SAHAAYAA AI
Donation Item MobileNetV2 Predictor
"""
import json
import os
import numpy as np
import tensorflow as tf
from PIL import Image

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "donation_item_mobilenetv2.keras")
CLASS_NAMES_PATH = os.path.join(BASE_DIR, "donation_class_names.json")

# Load model maps
model = tf.keras.models.load_model(
    MODEL_PATH,
    custom_objects={
        \'sparse_multiclass_precision': lambda y_true, y_pred: 0.0,
        \'sparse_multiclass_recall': lambda y_true, y_pred: 0.0
    }
)

with open(CLASS_NAMES_PATH, "r", encoding="utf-8") as f:
    CLASS_NAMES = json.load(f)

def predict_donation_item(image_path):
    image = Image.open(image_path).convert("RGB")
    height, width = model.input_shape[1], model.input_shape[2]
    image = image.resize((width, height))
    
    image_array = np.array(image, dtype=np.float32)
    image_array = np.expand_dims(image_array, axis=0)
    image_array = tf.keras.applications.mobilenet_v2.preprocess_input(image_array)
    
    predictions = model.predict(image_array, verbose=0)[0]
    predicted_index = int(np.argmax(predictions))
    confidence = float(predictions[predicted_index])
    
    return {
        "prediction": CLASS_NAMES[predicted_index],
        "confidence": confidence,
        "all_probabilities": {CLASS_NAMES[i]: float(predictions[i]) for i in range(len(CLASS_NAMES))}
    }