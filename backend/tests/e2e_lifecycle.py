import os
import sys
import unittest
import json

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import create_app
from models import db, User, Request, Resource, AuditLog, RequestStatusHistory

class TestEndToEndLifecycle(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app()
        cls.app.config["TESTING"] = True
        cls.client = cls.app.test_client()

    def test_complete_college_demo_story(self):
        print("\n" + "="*70)
        print("SAHAAYAA AI - COMPLETE END-TO-END DEMO STORYLINE VERIFICATION")
        print("="*70)

        # 1. Requester logs in
        login_res = self.client.post("/api/auth/login", json={
            "email": "requester@sahaayaa.org",
            "password": "requester123"
        })
        self.assertEqual(login_res.status_code, 200)
        req_token = login_res.get_json()["token"]
        print("[Step 1] Requester authenticated successfully with JWT.")

        # 2. Requester submits emergency food request
        submission_text = "I have two children and no food for tonight."
        req_res = self.client.post(
            "/api/requests",
            headers={"Authorization": f"Bearer {req_token}"},
            json={
                "full_name": "Murugan S.",
                "phone": "+91 91234 44004",
                "description": submission_text,
                "category": "FOOD",
                "people_count": 3,
                "current_situation": "Daily wage laborer halted due to rain; no rations left at home.",
                "address": "Gandhipuram, Coimbatore",
                "latitude": 11.0183,
                "longitude": 76.9634
            }
        )
        self.assertEqual(req_res.status_code, 201)
        req_data = req_res.get_json()
        req_id = req_data["request"]["id"]
        
        # 3. Verify Real TensorFlow model classified it as FOOD
        ai_cat = req_data["ai_analysis"]["dnn_category"]
        confidence = req_data["ai_analysis"]["dnn_confidence"]
        urgency = req_data["ai_analysis"]["urgency_level"]
        print(f"[Step 2] Backend received request #{req_id}.")
        print(f"[Step 3] Real TensorFlow DNN Model Output -> Category: {ai_cat} (Confidence: {confidence*100:.1f}%)")
        print(f"[Step 4] Urgency Detection -> Level: {urgency} (Score: {req_data['ai_analysis']['urgency_score']}/100)")
        self.assertEqual(ai_cat, "FOOD")
        self.assertIn(urgency, ["HIGH", "CRITICAL"])
        self.assertEqual(req_data["request"]["status"], "PENDING_VERIFICATION")

        # 4. Check Matched Demo Resources
        matched = req_data["matched_resources"]
        print(f"[Step 5] Matching Engine found {len(matched)} suitable Coimbatore resources:")
        for m in matched[:2]:
            print(f"         - {m['resource_name']} ({m['distance_km']} km) -> Score: {m['match_score']}%")
        self.assertGreater(len(matched), 0)

        # 5. Admin logs in
        admin_login = self.client.post("/api/auth/login", json={
            "email": "admin@sahaayaa.org",
            "password": "admin123"
        })
        admin_token = admin_login.get_json()["token"]
        print("[Step 6] Admin authenticated.")

        # 6. Admin verifies request
        verify_res = self.client.post(
            f"/api/admin/requests/{req_id}/verify",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"notes": "Field phone verification completed with beneficiary."}
        )
        self.assertEqual(verify_res.status_code, 200)
        self.assertEqual(verify_res.get_json()["request"]["status"], "VERIFIED")
        print(f"[Step 7] Admin verified Request #{req_id} -> Status: VERIFIED.")

        # 7. NGO logs in
        ngo_login = self.client.post("/api/auth/login", json={
            "email": "aravind.ngo@sahaayaa.org",
            "password": "ngo123"
        })
        ngo_token = ngo_login.get_json()["token"]
        print("[Step 8] NGO Coordinator (Aravind Relief Mission) authenticated.")

        # 8. NGO accepts request
        accept_res = self.client.post(
            f"/api/requests/{req_id}/accept",
            headers={"Authorization": f"Bearer {ngo_token}"}
        )
        self.assertEqual(accept_res.status_code, 200)
        self.assertEqual(accept_res.get_json()["request"]["status"], "ACCEPTED")
        print(f"[Step 9] NGO accepted Request #{req_id} -> Status: ACCEPTED.")

        # 9. Status progresses to IN_PROGRESS
        prog_res = self.client.put(
            f"/api/requests/{req_id}/status",
            headers={"Authorization": f"Bearer {ngo_token}"},
            json={"status": "IN_PROGRESS", "notes": "Volunteer team dispatched with 5kg dry ration kit."}
        )
        self.assertEqual(prog_res.status_code, 200)
        self.assertEqual(prog_res.get_json()["request"]["status"], "IN_PROGRESS")
        print(f"[Step 10] Status transitioned -> IN_PROGRESS.")

        # 10. Status progresses to DELIVERED
        deliv_res = self.client.put(
            f"/api/requests/{req_id}/status",
            headers={"Authorization": f"Bearer {ngo_token}"},
            json={"status": "DELIVERED", "notes": "Rations received by family at Gandhipuram."}
        )
        self.assertEqual(deliv_res.status_code, 200)
        self.assertEqual(deliv_res.get_json()["request"]["status"], "DELIVERED")
        print(f"[Step 11] Status transitioned -> DELIVERED.")

        # 11. Request becomes COMPLETED
        comp_res = self.client.put(
            f"/api/requests/{req_id}/status",
            headers={"Authorization": f"Bearer {ngo_token}"},
            json={"status": "COMPLETED", "notes": "Case closed and verified."}
        )
        self.assertEqual(comp_res.status_code, 200)
        self.assertEqual(comp_res.get_json()["request"]["status"], "COMPLETED")
        print(f"[Step 12] Request #{req_id} reached final status -> COMPLETED.")

        # 12. Verify status history audit records
        history_res = self.client.get(f"/api/requests/{req_id}", headers={"Authorization": f"Bearer {req_token}"})
        history = history_res.get_json()["history"]
        print(f"[Step 13] Verified status history trail contains {len(history)} recorded transitions.")
        self.assertGreaterEqual(len(history), 4)

        # 13. Verify Admin Dashboard statistics reflect completion
        dash_res = self.client.get("/api/dashboard/admin", headers={"Authorization": f"Bearer {admin_token}"})
        self.assertEqual(dash_res.status_code, 200)
        metrics = dash_res.get_json()["metrics"]
        print(f"[Step 14] Admin Dashboard verified:")
        print(f"         Total Requests: {metrics['total_requests']}")
        print(f"         Completed: {metrics['completed_requests']}")
        print(f"         Fulfillment Rate: {metrics['fulfillment_rate']}%")
        self.assertGreater(metrics["completed_requests"], 0)

        print("\n" + "="*70)
        print("ALL 14 ACCEPTANCE STEPS PASSED PERFECTLY!")
        print("="*70 + "\n")

if __name__ == "__main__":
    unittest.main()
