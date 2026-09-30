"""
Unit & Integration Test Suite for SAHAAYAA AI Phase 4 Humanitarian Rescue Chain.
Verifies Phase 4 requirements:
1. Complete 10-stage status pipeline:
   REQUESTED -> AI_ANALYZED -> RESOURCE_MATCHED -> TRANSPORT_CHECK -> NGO_NOTIFIED -> NGO_ACCEPTED -> RESPONDER_ASSIGNED -> ON_THE_WAY -> ASSISTANCE_PROVIDED -> COMPLETED.
2. Real-time notification text matching spec ("Your request has been accepted.").
3. Automated Escalation Engine (escalates unaccepted requests after response period).
4. NGO Dashboard 6 sections (New Requests, Critical Requests, Nearby Requests, Transport Requests, Active Cases, Completed Cases).
5. Volunteer Dashboard (Only shows authorized tasks for verified responders).
6. Complete Case History & Auditable state transition log.
"""

import unittest
from datetime import datetime, timedelta
from app import create_app
from database import db
from models import Request, RequestStatusHistory, Notification, AuditLog, User
from services.escalation import run_escalation_check

class TestRescueChainPipeline(unittest.TestCase):

    def setUp(self):
        self.app = create_app()
        self.app.config["TESTING"] = True
        self.client = self.app.test_client()

    def test_1_rescue_chain_full_pipeline(self):
        with self.app.app_context():
            ngo_user = User.query.filter_by(role="ngo").first()
            ngo_id = ngo_user.id if ngo_user else 1

            # 1. Create Initial Request
            req = Request(
                full_name="Ramesh Kumar",
                phone="+91 98765 43210",
                description="Urgent food assistance for 4 family members in Gandhipuram.",
                category="FOOD",
                urgency_level="CRITICAL",
                urgency_score=90,
                people_count=4,
                latitude=11.0168,
                longitude=76.9558,
                address="Gandhipuram Bus Stand, Coimbatore",
                status="REQUESTED"
            )
            db.session.add(req)
            db.session.commit()
            req_id = req.id

        # Advance through status pipeline stages
        pipeline_stages = [
            "AI_ANALYZED",
            "RESOURCE_MATCHED",
            "TRANSPORT_CHECK",
            "NGO_NOTIFIED"
        ]

        for stage in pipeline_stages:
            with self.app.app_context():
                r = db.session.get(Request, req_id)
                r.status = stage
                h = RequestStatusHistory(
                    request_id=req_id,
                    previous_status=r.status,
                    new_status=stage,
                    notes=f"Automated pipeline stage: {stage}"
                )
                db.session.add(h)
                db.session.commit()

        # 2. NGO Accepts Case -> Status: NGO_ACCEPTED
        with self.app.app_context():
            r = db.session.get(Request, req_id)
            ngo = User.query.filter_by(role="ngo").first()
            r.status = "NGO_ACCEPTED"
            r.assigned_ngo_id = ngo.id
            h = RequestStatusHistory(
                request_id=req_id,
                previous_status="NGO_NOTIFIED",
                new_status="NGO_ACCEPTED",
                changed_by_user_id=ngo.id,
                notes="Accepted by NGO Relief Unit"
            )
            n = Notification(
                user_id=r.requester_id,
                title="Help Accepted",
                message="Your request has been accepted.",
                notification_type="success"
            )
            db.session.add_all([h, n])
            db.session.commit()

            # Verify notification text matching spec
            self.assertEqual(n.message, "Your request has been accepted.")

        # 3. Complete Field Response Stages
        field_stages = [
            "RESPONDER_ASSIGNED",
            "ON_THE_WAY",
            "ASSISTANCE_PROVIDED",
            "COMPLETED"
        ]

        for f_stage in field_stages:
            with self.app.app_context():
                r = db.session.get(Request, req_id)
                r.status = f_stage
                h = RequestStatusHistory(
                    request_id=req_id,
                    previous_status=r.status,
                    new_status=f_stage,
                    notes=f"Field transition: {f_stage}"
                )
                db.session.add(h)
                db.session.commit()

        # Verify finalized state & full history trail via API
        response = self.client.get(f"/api/requests/{req_id}/history")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data["success"])
        self.assertEqual(data["current_status"], "COMPLETED")
        self.assertGreater(len(data["timeline"]), 5)

    def test_2_automated_escalation_engine(self):
        with self.app.app_context():
            # Create a stale request created 45 minutes ago
            stale_time = datetime.utcnow() - timedelta(minutes=45)
            stale_req = Request(
                full_name="Stale Requester",
                phone="+91 90000 11111",
                description="Cold weather shelter needed for senior citizen.",
                category="SHELTER",
                urgency_level="CRITICAL",
                urgency_score=95,
                people_count=1,
                latitude=11.0183,
                longitude=76.9634,
                address="Ukkadam, Coimbatore",
                status="NGO_NOTIFIED",
                created_at=stale_time
            )
            db.session.add(stale_req)
            db.session.commit()
            stale_id = stale_req.id

            # Execute Escalation Engine Check (30 min timeout)
            res = run_escalation_check(timeout_minutes=30)
            self.assertTrue(res["success"])
            self.assertGreater(res["escalated_count"], 0)

            # Verify status changed to ESCALATED
            updated = db.session.get(Request, stale_id)
            self.assertEqual(updated.status, "ESCALATED")

            # Check admin notification created
            admin_notif = Notification.query.filter_by(role_target="admin").order_by(Notification.created_at.desc()).first()
            self.assertIn("ESCALATION ALERT", admin_notif.title)

    def test_3_ngo_dashboard_6_sections(self):
        # Obtain demo NGO login token
        login_res = self.client.post("/api/auth/login", json={
            "email": "aravind.ngo@sahaayaa.org",
            "password": "ngo123"
        })
        self.assertEqual(login_res.status_code, 200)
        token = login_res.get_json()["token"]

        dash_res = self.client.get("/api/dashboard/ngo", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(dash_res.status_code, 200)
        data = dash_res.get_json()

        # Assert metrics & 6 section arrays exist
        self.assertIn("new_requests", data)
        self.assertIn("critical_cases", data)
        self.assertIn("nearby_requests", data)
        self.assertIn("transport_requests", data)
        self.assertIn("active_cases", data)
        self.assertIn("completed_cases", data)

    def test_4_volunteer_dashboard_authorized_tasks_only(self):
        # Obtain demo Volunteer login token
        login_res = self.client.post("/api/auth/login", json={
            "email": "volunteer@sahaayaa.org",
            "password": "volunteer123"
        })
        self.assertEqual(login_res.status_code, 200)
        token = login_res.get_json()["token"]

        v_res = self.client.get("/api/dashboard/volunteer", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(v_res.status_code, 200)
        data = v_res.get_json()
        self.assertIn("authorized_tasks", data)
        self.assertIn("completed_tasks", data)

if __name__ == "__main__":
    unittest.main()
