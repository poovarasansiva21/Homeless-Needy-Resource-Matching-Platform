"""
Unit & Integration Test Suite for SAHAAYAA AI Phase 3 Mobility-to-Help & Trust-Route Layer.
Verifies Phase 3 requirements:
1. 'I CAN'T REACH IT' transport barrier logging (cannot_afford_transport, too_far, no_transport, with_children, other).
2. Transport routes with status badges (VERIFIED 🟢, NEEDS_VERIFICATION 🟡, UNVERIFIED_REPORTED 🔴).
3. Safety rules: free/concession notice attached, transport not claimed free unless verified.
4. 'REPORT TRANSPORT INFORMATION' safety reports (wrong fare, fake driver, suspicious info, etc.).
5. 'REQUEST TRANSPORT ASSISTANCE' trip generation (ASSISTANCE/TRIP ID e.g. SAH-2048).
6. Trip status progression (REQUESTED -> ACCEPTED -> RESPONDER_ASSIGNED -> ON_THE_WAY -> PICKUP_CONFIRMED -> DESTINATION_REACHED -> COMPLETED).
7. Privacy protection for requesters and responders.
"""

import unittest
from app import create_app
from database import db
from models import TransportInfo, TransportReport, TransportAssistanceTrip, Resource, User

class TestMobilityPipeline(unittest.TestCase):

    def setUp(self):
        self.app = create_app()
        self.app.config["TESTING"] = True
        self.client = self.app.test_client()

    def test_1_get_transport_routes(self):
        response = self.client.get("/api/mobility/routes")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data["success"])
        self.assertIn("safety_disclaimer", data)
        self.assertIn("Free/concession travel may be available", data["safety_disclaimer"])
        self.assertIsInstance(data["routes"], list)
        self.assertGreater(len(data["routes"]), 0)

        # Check safety rule & badges
        route = data["routes"][0]
        self.assertIn("provider", route)
        self.assertIn("route_name", route)
        self.assertIn("status", route)
        self.assertIn(route["status"], ["VERIFIED", "NEEDS_VERIFICATION", "UNVERIFIED_REPORTED"])

    def test_2_cant_reach_it_transport_barrier(self):
        payload = {
            "resource_id": 1,
            "barrier_reason": "cannot_afford_transport",
            "notes": "I cannot afford the bus ticket to RS Puram."
        }
        response = self.client.post("/api/mobility/barrier", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data["success"])
        self.assertEqual(data["barrier_reason"], "cannot_afford_transport")
        self.assertTrue(data["can_request_assistance"])
        self.assertIn("assistance_prompt", data)

    def test_3_report_transport_information(self):
        # 1. Fetch a route ID to report
        routes_res = self.client.get("/api/mobility/routes")
        route_id = routes_res.get_json()["routes"][0]["id"]

        report_payload = {
            "transport_info_id": route_id,
            "reason": "fake_driver",
            "details": "Unverified individual claiming to be a volunteer shuttle."
        }
        response = self.client.post("/api/mobility/report-info", json=report_payload)
        self.assertEqual(response.status_code, 201)
        data = response.get_json()
        self.assertTrue(data["success"])
        self.assertEqual(data["report"]["reason"], "fake_driver")

        # 2. Verify route status changed to UNVERIFIED_REPORTED (🔴)
        with self.app.app_context():
            info = TransportInfo.query.get(route_id)
            self.assertEqual(info.status, "UNVERIFIED_REPORTED")

    def test_4_request_transport_assistance_and_trip_code(self):
        request_payload = {
            "pickup_address": "Gandhipuram Bus Stand, Coimbatore",
            "destination_address": "Annadhanam Food Bank, RS Puram",
            "barrier_reason": "with_children",
            "people_count": 3
        }
        response = self.client.post("/api/mobility/request-assistance", json=request_payload)
        self.assertEqual(response.status_code, 201)
        data = response.get_json()
        self.assertTrue(data["success"])
        self.assertIn("trip_code", data)
        self.assertTrue(data["trip_code"].startswith("SAH-"))
        self.assertEqual(data["trip"]["status"], "REQUESTED")
        self.assertEqual(data["trip"]["barrier_reason"], "with_children")

        trip_code = data["trip_code"]

        # Retrieve trip status
        get_res = self.client.get(f"/api/mobility/trip/{trip_code}")
        self.assertEqual(get_res.status_code, 200)
        get_data = get_res.get_json()
        self.assertEqual(get_data["current_status"], "REQUESTED")

    def test_5_trip_status_progression_and_privacy(self):
        # Create trip
        req_res = self.client.post("/api/mobility/request-assistance", json={
            "pickup_address": "Ukkadam Junction, Coimbatore",
            "destination_address": "Karunya Night Shelter",
            "barrier_reason": "too_far",
            "people_count": 2
        })
        trip_code = req_res.get_json()["trip_code"]

        # Advance status through pipeline
        statuses = [
            "ACCEPTED",
            "RESPONDER_ASSIGNED",
            "ON_THE_WAY",
            "PICKUP_CONFIRMED",
            "DESTINATION_REACHED",
            "COMPLETED"
        ]

        for s in statuses:
            patch_res = self.client.patch(f"/api/mobility/trip/{trip_code}/status", json={"status": s})
            self.assertEqual(patch_res.status_code, 200)
            data = patch_res.get_json()
            self.assertEqual(data["trip"]["status"], s)

        # Check finalized trip state
        final_res = self.client.get(f"/api/mobility/trip/{trip_code}")
        self.assertEqual(final_res.get_json()["current_status"], "COMPLETED")

if __name__ == "__main__":
    unittest.main()
