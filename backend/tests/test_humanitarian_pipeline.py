"""
Unit & Integration Test Suite for SAHAAYAA AI Advanced Humanitarian Analysis Pipeline.
Verifies Phase 2 requirements:
1. 8-point structured output (Category, Urgency, People, Duration, Transport Barrier, Reason, Intent, Entities, Confidence)
2. Exact evaluation of sample prompt:
   "I have two children and we have not eaten since yesterday. The food centre is far and I cannot afford the bus."
   -> CATEGORY: FOOD, URGENCY: CRITICAL, PEOPLE: 3, DURATION: 1 DAY, TRANSPORT_BARRIER: TRUE, TRANSPORT_REASON: COST
3. Confidence handling (CONTINUE, ASK_CLARIFICATION, HUMAN_REVIEW)
4. AI follow-up questions generation
5. Model versioning & prediction logging
6. Human correction endpoint POST /api/ai/correct
"""

import unittest
from app import create_app
from database import db
from models import AIPredictionLog
from services.humanitarian_pipeline import analyze_humanitarian_request, PIPELINE_MODEL_VERSION

class TestHumanitarianPipeline(unittest.TestCase):

    def setUp(self):
        self.app = create_app()
        self.app.config["TESTING"] = True
        self.client = self.app.test_client()

    def test_1_sample_distress_prompt_pipeline(self):
        sample_input = "I have two children and we have not eaten since yesterday. The food centre is far and I cannot afford the bus."
        res = analyze_humanitarian_request(sample_input)

        # 1. Category
        self.assertEqual(res["category"], "FOOD")

        # 2. Urgency
        self.assertEqual(res["urgency"], "CRITICAL")

        # 3. People affected (me + 2 children = 3)
        self.assertEqual(res["people"], 3)

        # 4. Duration
        self.assertEqual(res["duration"], "1 DAY")

        # 5. Transport barrier & reason
        self.assertTrue(res["transport_barrier"])
        self.assertEqual(res["transport_reason"], "COST")

        # 6. Intent
        self.assertEqual(res["intent"], "SEEK_FOOD_RATIONS_OR_MEALS")

        # 7. Important Entities
        self.assertIn("two children", res["important_entities"]["dependents"])
        self.assertEqual(res["important_entities"]["timeframe"], "since yesterday")

        # 8. Confidence & Version
        self.assertGreaterEqual(res["confidence"], 0.0)
        self.assertEqual(res["model_version"], PIPELINE_MODEL_VERSION)

    def test_2_confidence_action_flow(self):
        # High confidence text
        high_res = analyze_humanitarian_request("I need urgent food rations for my family.")
        self.assertIn(high_res["confidence_action"], ["CONTINUE", "ASK_CLARIFICATION", "HUMAN_REVIEW"])

        # Check follow up questions generated when needed
        if high_res["confidence_action"] == "ASK_CLARIFICATION":
            self.assertGreater(len(high_res["follow_up_questions"]), 0)

    def test_3_api_analyze_and_logging_endpoint(self):
        payload = {
            "text": "I have two children and we have not eaten since yesterday. The food centre is far and I cannot afford the bus.",
            "people_count": 3
        }

        response = self.client.post("/api/ai/analyze", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.get_json()

        self.assertTrue(data["success"])
        self.assertEqual(data["category"], "FOOD")
        self.assertEqual(data["urgency"], "CRITICAL")
        self.assertEqual(data["people"], 3)
        self.assertEqual(data["duration"], "1 DAY")
        self.assertTrue(data["transport_barrier"])
        self.assertEqual(data["transport_reason"], "COST")
        self.assertEqual(data["model_version"], PIPELINE_MODEL_VERSION)
        self.assertIn("log_id", data)

        log_id = data["log_id"]

        # Test human correction endpoint POST /api/ai/correct
        correction_payload = {
            "log_id": log_id,
            "corrected_category": "FOOD",
            "corrected_urgency": "CRITICAL",
            "notes": "Verified by field audit coordinator."
        }
        corr_res = self.client.post("/api/ai/correct", json=correction_payload)
        self.assertEqual(corr_res.status_code, 200)
        corr_data = corr_res.get_json()
        self.assertTrue(corr_data["log"]["is_corrected"])
        self.assertEqual(corr_data["log"]["human_corrected_category"], "FOOD")

if __name__ == "__main__":
    unittest.main()
