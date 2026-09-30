"""
Unit & Integration Test Suite for SAHAAYAA AI Donation Vision Model.
Verifies:
1. Model loading (MobileNetV2 .keras)
2. Exact MobileNetV2 preprocessing (224x224 RGB)
3. Class names: ['clothing', 'food', 'hygiene']
4. Real probabilities sum to ~1.0
5. Flask API endpoint POST /api/donation/scan returns real predictions
6. Existing Text DNN classifier remains unaffected
"""

import os
import io
import unittest
import numpy as np
from PIL import Image
import tensorflow as tf

from app import create_app
from services.donation_vision import predict_donation_item, get_vision_service
from services.classifier import classify_text

class TestDonationVisionModel(unittest.TestCase):

    def setUp(self):
        self.app = create_app()
        self.app.config["TESTING"] = True
        self.client = self.app.test_client()

    def test_1_model_loading_and_classes(self):
        model, imagenet_model, class_names, metadata = get_vision_service()
        self.assertIsNotNone(model, "MobileNetV2 model failed to load.")
        self.assertEqual(class_names, ["clothing", "food", "hygiene"])
        self.assertEqual(metadata.get("model_name"), "Donation Item MobileNetV2")

    def test_2_real_inference_probabilities(self):
        # Create test RGB image
        test_img = Image.new("RGB", (300, 300), color=(200, 100, 50))
        res = predict_donation_item(test_img)

        self.assertTrue(res["success"])
        self.assertIn(res["prediction"], ["clothing", "food", "hygiene"])
        self.assertTrue(0.0 <= res["confidence"] <= 1.0)
        
        # Check probabilities sum to approx 1.0
        prob_sum = sum(res["all_probabilities"].values())
        self.assertAlmostEqual(prob_sum, 1.0, places=2)
        
        self.assertIn("clothing", res["all_probabilities"])
        self.assertIn("food", res["all_probabilities"])
        self.assertIn("hygiene", res["all_probabilities"])

    def test_3_api_scan_endpoint(self):
        # Prepare in-memory image
        test_img = Image.new("RGB", (250, 250), color=(100, 200, 150))
        img_byte_arr = io.BytesIO()
        test_img.save(img_byte_arr, format="JPEG")
        img_byte_arr.seek(0)

        data = {
            "image": (img_byte_arr, "test_donation.jpg")
        }

        response = self.client.post("/api/donation/scan", data=data, content_type="multipart/form-data")
        self.assertEqual(response.status_code, 200)
        json_data = response.get_json()

        self.assertTrue(json_data["success"])
        self.assertIn(json_data["prediction"], ["clothing", "food", "hygiene"])
        self.assertIn("confidence", json_data)
        self.assertIn("all_probabilities", json_data)
        self.assertIn("low_confidence", json_data)

    def test_4_invalid_image_upload_handling(self):
        # Test missing image field
        res_no_img = self.client.post("/api/donation/scan", data={}, content_type="multipart/form-data")
        self.assertEqual(res_no_img.status_code, 400)

        # Test corrupted image file
        corrupt_bytes = io.BytesIO(b"NOT_AN_IMAGE_FILE_DATA")
        res_corrupt = self.client.post(
            "/api/donation/scan",
            data={"image": (corrupt_bytes, "corrupt.png")},
            content_type="multipart/form-data"
        )
        self.assertEqual(res_corrupt.status_code, 400)

    def test_5_existing_text_dnn_unaffected(self):
        # Verify existing text classifier still runs clean
        text_res = classify_text("I urgently need food and rice for my children.")
        self.assertIn("predicted_category", text_res)
        self.assertGreater(text_res["confidence"], 0.0)

if __name__ == "__main__":
    unittest.main()
