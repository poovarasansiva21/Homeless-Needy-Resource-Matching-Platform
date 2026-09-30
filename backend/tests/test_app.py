import os
import sys
import unittest

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import create_app
from models import db, User, Request, Resource
from services.classifier import classify_text
from services.urgency import analyze_urgency
from services.matcher import haversine_distance, calculate_match, find_matched_resources
from services.verification import check_duplicate_request

from datetime import datetime, timedelta

class TestSahaayaaBackend(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app()
        cls.app.config["TESTING"] = True
        cls.client = cls.app.test_client()

    def test_1_real_dnn_classification(self):
        """Test real TensorFlow Keras NLP inference on actual inputs"""
        test_text = "I have two children and we have not had food since yesterday."
        result = classify_text(test_text)
        print("\n[TEST ML] Text:", test_text)
        print("[TEST ML] Result:", result)
        self.assertEqual(result["predicted_category"], "FOOD")
        self.assertGreater(result["confidence"], 0.70)
        self.assertIn("probabilities", result)

    def test_2_urgency_analyzer(self):
        """Test multi-factor urgency scoring and safety disclaimer"""
        critical_input = "Fire broke out in our slum, people trapped and bleeding tonight!"
        urgency = analyze_urgency(critical_input, category="EMERGENCY", people_count=4)
        print("\n[TEST Urgency] Result:", urgency)
        self.assertIn(urgency["urgency_level"], ["CRITICAL", "HIGH"])
        self.assertGreaterEqual(urgency["urgency_score"], 70)
        self.assertTrue(urgency["escalation_required"])
        self.assertTrue(len(urgency["disclaimer"]) > 0)

    def test_3_matcher_and_haversine(self):
        """Test distance calculation and resource matching compatibility"""
        # Coimbatore Gandhipuram to RS Puram ~ 2.5 km
        dist = haversine_distance(11.0183, 76.9634, 11.0092, 76.9482)
        print(f"\n[TEST Matcher] Calculated distance: {dist} km")
        self.assertGreater(dist, 1.5)
        self.assertLess(dist, 4.0)

        req = {
            "category": "FOOD",
            "people_count": 3,
            "latitude": 11.0183,
            "longitude": 76.9634,
            "urgency_level": "HIGH"
        }
        res = {
            "id": 1,
            "name": "Coimbatore Food Bank",
            "organization_type": "Food Bank",
            "category": "FOOD",
            "address": "RS Puram",
            "phone": "+91 422 2541001",
            "latitude": 11.0092,
            "longitude": 76.9482,
            "availability_status": "Available",
            "capacity_available": 50,
            "verified": True
        }
        match_res = calculate_match(req, res)
        self.assertGreaterEqual(match_res["match_score"], 80)
        self.assertIn("100%", match_res["breakdown"]["category_compatibility"])

    def test_4_duplicate_detection(self):
        """Test duplicate request heuristics"""
        existing = [{
            "id": 101,
            "phone": "+91 99999 11111",
            "description": "Starving family needing cooked food and groceries urgently tonight",
            "latitude": 11.0180,
            "longitude": 76.9630,
            "created_at": (datetime.utcnow() - timedelta(hours=2)).isoformat()
        }]
        new_duplicate = {
            "phone": "+91 99999 11111",
            "description": "Starving family needing cooked food and groceries urgently tonight",
            "latitude": 11.0180,
            "longitude": 76.9630
        }
        dup_res = check_duplicate_request(new_duplicate, existing)
        print("\n[TEST Duplicate] Result:", dup_res)
        self.assertTrue(dup_res["is_flagged_duplicate"])

    def test_5_api_endpoints_and_pipeline(self):
        """Test auth login, request submission, and verification status transition"""
        # 1. Login as Admin
        login_resp = self.client.post("/api/auth/login", json={
            "email": "admin@sahaayaa.org",
            "password": "admin123"
        })
        self.assertEqual(login_resp.status_code, 200)
        admin_token = login_resp.get_json()["token"]
        auth_headers = {"Authorization": f"Bearer {admin_token}"}

        # 2. Submit new request
        req_resp = self.client.post("/api/requests", json={
            "full_name": "Test Requester",
            "phone": "+91 98765 43210",
            "description": "I have two children and we have not had food since yesterday.",
            "category": "FOOD",
            "people_count": 3,
            "current_situation": "Stranded near Gandhipuram bus stop with no money.",
            "address": "Gandhipuram Bus Stand, Coimbatore",
            "latitude": 11.0183,
            "longitude": 76.9634
        })
        self.assertEqual(req_resp.status_code, 201)
        req_data = req_resp.get_json()
        req_id = req_data["request"]["id"]
        self.assertEqual(req_data["ai_analysis"]["dnn_category"], "FOOD")
        self.assertEqual(req_data["request"]["status"], "PENDING_VERIFICATION")

        # 3. Admin verifies request
        verify_resp = self.client.post(f"/api/admin/requests/{req_id}/verify", headers=auth_headers, json={
            "notes": "Verified by phone inquiry."
        })
        self.assertEqual(verify_resp.status_code, 200)
        self.assertEqual(verify_resp.get_json()["request"]["status"], "VERIFIED")

        # 4. Update status to IN_PROGRESS and then COMPLETED
        prog_resp = self.client.put(f"/api/requests/{req_id}/status", headers=auth_headers, json={
            "status": "IN_PROGRESS",
            "notes": "Relief kit dispatched."
        })
        self.assertEqual(prog_resp.status_code, 200)

        comp_resp = self.client.put(f"/api/requests/{req_id}/status", headers=auth_headers, json={
            "status": "COMPLETED",
            "notes": "Ration kit delivered directly to the family."
        })
        self.assertEqual(comp_resp.status_code, 200)
        self.assertEqual(comp_resp.get_json()["request"]["status"], "COMPLETED")

        # 5. Live AI Demo endpoint test
        ai_demo_resp = self.client.post("/api/ai/classify", json={
            "text": "Evicted from apartment, mother and baby sleeping on pavement in cold rain.",
            "people_count": 2
        })
        self.assertEqual(ai_demo_resp.status_code, 200)
        demo_data = ai_demo_resp.get_json()
        self.assertEqual(demo_data["category"], "SHELTER")
        self.assertGreater(len(demo_data["matched_resources"]), 0)

if __name__ == "__main__":
    unittest.main()
