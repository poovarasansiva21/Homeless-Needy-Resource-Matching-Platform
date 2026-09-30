import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from services.matcher import calculate_match, find_matched_resources, haversine_distance

class TestPhase9BarrierAwareMatching(unittest.TestCase):
    
    def test_example_scenario_unavailable_vs_available(self):
        """
        Tests prompt requirement:
        RESOURCE A: 1 km, Unavailable -> Match Score: Low
        RESOURCE B: 2 km, Available, Transport available -> Match Score: High
        Recommend Resource B over Resource A!
        """
        request_input = {
            "category": "FOOD",
            "people_count": 3,
            "urgency_level": "HIGH",
            "latitude": 11.0183,
            "longitude": 76.9634
        }

        # Resource A (1 km away, but Unavailable)
        resource_a = {
            "id": 101,
            "name": "Resource A (Nearby Food Bank)",
            "organization_type": "Food Bank",
            "category": "FOOD",
            "address": "1 km Away St.",
            "latitude": 11.0183,
            "longitude": 76.9534, # ~1 km
            "availability_status": "Unavailable", # UNAVAILABLE!
            "capacity_available": 0,
            "verified": True
        }

        # Resource B (2 km away, Available, Transport Available)
        resource_b = {
            "id": 102,
            "name": "Resource B (Available Food Hub)",
            "organization_type": "Food Bank",
            "category": "FOOD",
            "address": "2 km Away Blvd.",
            "latitude": 11.0000,
            "longitude": 76.9634, # ~2 km
            "availability_status": "Available", # AVAILABLE!
            "capacity_available": 50,
            "verified": True,
            "has_transit": True,
            "route_name": "Route 11 Bus",
            "is_free_or_concession": True,
            "is_24_7": True
        }

        match_a = calculate_match(request_input, resource_a)
        match_b = calculate_match(request_input, resource_b)

        # Assert Resource A is Low match score due to unavailability penalty
        self.assertLessEqual(match_a["match_score"], 25.0)
        self.assertEqual(match_a["match_level"], "LOW")

        # Assert Resource B is High match score
        self.assertGreaterEqual(match_b["match_score"], 80.0)
        self.assertEqual(match_b["match_level"], "HIGH")

        # Assert find_matched_resources ranks Resource B first
        ranked = find_matched_resources(request_input, [resource_a, resource_b])
        self.assertEqual(ranked[0]["resource_id"], 102) # Resource B recommended!

        # Assert transparent recommendation explanation exists
        self.assertIn("Recommended because:", match_b["recommendation_reason"])
        self.assertIn("Resource Available", match_b["recommendation_reason"])

    def test_missing_data_marked_as_unknown(self):
        """
        Tests rule: Never invent missing data. If a factor is unavailable, mark as unknown.
        """
        req = {
            "category": "MEDICAL",
            "people_count": 1,
            "latitude": 11.0183,
            "longitude": 76.9634
        }
        res_sparse = {
            "id": 201,
            "name": "Sparse Medical Center",
            "category": "MEDICAL",
            "latitude": 11.0600,
            "longitude": 76.9634,
            "availability_status": "Available",
            "verified": True
            # missing opening_hours, missing transit, missing fare_amount
        }

        match_res = calculate_match(req, res_sparse)
        breakdown = match_res["barrier_aware_breakdown"]

        self.assertEqual(breakdown["opening_status"]["status"], "unknown")
        self.assertIn("unknown", breakdown["opening_status"]["text"].lower())

        self.assertEqual(breakdown["estimated_travel_cost"]["status"], "unknown")
        self.assertIn("unknown", breakdown["estimated_travel_cost"]["text"].lower())

if __name__ == "__main__":
    unittest.main()
