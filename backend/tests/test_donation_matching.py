"""
SAHAAYAA AI - Unit Tests for Phase 5 Intelligent Donation Matching
Tests:
1. Natural language donation parsing ("I can donate 10 blankets")
2. Algorithmic multi-factor matching (DONATION + NEED + RESOURCE + LOCATION)
3. Donation state lifecycle (PLEDGED -> ACCEPTED -> ASSIGNED -> DELIVERED -> COMPLETED)
4. Urgent donation requests (CRITICAL, HIGH, NORMAL)
5. Inventory stock management & authorized resource reallocation
6. Privacy protection enforcement (PII masking)
"""

import unittest
from app import create_app
from models import db, User, Request, Resource, UrgentDonationRequest, DonationInventory, Donation
from services.donation_matcher import parse_donation_text, find_intelligent_donation_matches


class TestIntelligentDonationMatching(unittest.TestCase):

    def setUp(self):
        self.app = create_app()
        self.app.config["TESTING"] = True
        self.app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
        self.client = self.app.test_client()

        with self.app.app_context():
            db.create_all()
            self._seed_test_data()

    def _seed_test_data(self):
        # 1. Fetch or create users
        admin = User.query.filter_by(role="admin").first()
        if not admin:
            admin = User(email="admin_test@sahaayaa.org", full_name="Admin User", role="admin", phone="+91 94430 00000")
            admin.set_password("admin123")
            db.session.add(admin)

        donor = User.query.filter_by(role="donor").first()
        if not donor:
            donor = User(email="donor_test@sahaayaa.org", full_name="Kavitha Donor", role="donor", phone="+91 97890 00000")
            donor.set_password("donor123")
            db.session.add(donor)

        ngo = User.query.filter_by(role="ngo").first()
        if not ngo:
            ngo = User(email="ngo_test@sahaayaa.org", full_name="Relief NGO", role="ngo", organization_name="Relief Mission", phone="+91 98422 00000")
            ngo.set_password("ngo123")
            db.session.add(ngo)

        db.session.commit()

        # 2. Resource Centers
        shelter = Resource(
            name="Karunya Night Shelter",
            organization_type="Shelter",
            category="SHELTER",
            description="Emergency Night Shelter",
            phone="+91 422 2529002",
            address="15 Cross Cut Road, Gandhipuram, Coimbatore",
            latitude=11.0183,
            longitude=76.9634,
            verified=True
        )
        food_bank = Resource(
            name="Coimbatore Food Bank",
            organization_type="Food Bank",
            category="FOOD",
            description="Daily Food Relief",
            phone="+91 422 2541001",
            address="42 D.B. Road, RS Puram, Coimbatore",
            latitude=11.0092,
            longitude=76.9482,
            verified=True
        )
        db.session.add_all([shelter, food_bank])
        db.session.commit()

        # 3. Beneficiary Need Request
        req = Request(
            full_name="Secret Requester PII",
            phone="+91 99999 12345",
            description="Hungry family needs meals urgently",
            category="FOOD",
            urgency_level="HIGH",
            people_count=4,
            latitude=11.0100,
            longitude=76.9500,
            address="Secret Private Door 12, RS Puram, Coimbatore",
            status="VERIFIED"
        )
        db.session.add(req)

        # 4. Urgent Donation Request (CRITICAL)
        u_req = UrgentDonationRequest(
            resource_id=shelter.id,
            created_by_user_id=admin.id,
            title="Cold Relief Thermal Blanket Drive",
            item_category="BLANKETS",
            urgency_level="CRITICAL",
            required_quantity=20,
            unit="blankets",
            description="20 blankets needed for cold wave relief",
            latitude=11.0183,
            longitude=76.9634,
            address="Gandhipuram Relief Center, Coimbatore",
            status="ACTIVE"
        )
        db.session.add(u_req)

        # 5. Inventory
        inv = DonationInventory.query.filter_by(item_category="BLANKETS").first()
        if not inv:
            inv = DonationInventory(
                resource_id=shelter.id,
                item_category="BLANKETS",
                item_name="Thermal Blankets",
                total_quantity=25,
                allocated_quantity=15,
                available_quantity=10,
                unit="blankets"
            )
            db.session.add(inv)

        db.session.commit()

    def test_01_parse_donation_natural_language(self):
        """Test parsing of donor prompts like 'I can donate 10 blankets'"""
        parsed1 = parse_donation_text("I can donate 10 blankets")
        self.assertEqual(parsed1["item_category"], "BLANKETS")
        self.assertEqual(parsed1["quantity"], 10)

        parsed2 = parse_donation_text("Providing fifty hot meals for street dwellers")
        self.assertEqual(parsed2["item_category"], "FOOD")
        self.assertEqual(parsed2["quantity"], 50)

    def test_02_intelligent_matching_algorithm(self):
        """Test algorithmic match construction (DONATION + NEED + RESOURCE + LOCATION)"""
        with self.app.app_context():
            matches = find_intelligent_donation_matches(
                donor_lat=11.0168,
                donor_lng=76.9558,
                item_category="BLANKETS",
                quantity=10,
                text_prompt="I can donate 10 blankets"
            )
            self.assertTrue(len(matches) > 0)
            top_match = matches[0]
            
            # Check structure fields
            self.assertIn("donation", top_match)
            self.assertIn("current_need", top_match)
            self.assertIn("resource", top_match)
            self.assertIn("location", top_match)

            # Check exact category & urgent request linkage
            self.assertEqual(top_match["donation"]["item_category"], "BLANKETS")
            self.assertEqual(top_match["current_need"]["urgency_level"], "CRITICAL")
            
            # Verify Privacy Protection: address is anonymized locality, no private street address
            self.assertNotIn("Secret Private Door", top_match["location"]["address"])

    def test_03_donation_pledge_and_status_pipeline(self):
        """Test pledge creation and state pipeline (PLEDGED -> ACCEPTED -> ASSIGNED -> DELIVERED -> COMPLETED)"""
        # 1. Create Pledge
        res = self.client.post("/api/donations/pledge", json={
            "item_category": "BLANKETS",
            "quantity": 10,
            "unit": "blankets",
            "notes": "Pledging 10 wool blankets",
            "urgent_request_id": 1
        })
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        self.assertTrue(data["success"])
        donation_id = data["donation"]["id"]
        self.assertEqual(data["donation"]["status"], "PLEDGED")

        # 2. Update to ACCEPTED
        res2 = self.client.put(f"/api/donations/{donation_id}/status", json={"status": "ACCEPTED"})
        self.assertEqual(res2.status_code, 200)
        self.assertEqual(res2.get_json()["donation"]["status"], "ACCEPTED")

        # 3. Update to ASSIGNED
        res3 = self.client.put(f"/api/donations/{donation_id}/status", json={"status": "ASSIGNED"})
        self.assertEqual(res3.status_code, 200)
        self.assertEqual(res3.get_json()["donation"]["status"], "ASSIGNED")

        # 4. Update to DELIVERED
        res4 = self.client.put(f"/api/donations/{donation_id}/status", json={"status": "DELIVERED"})
        self.assertEqual(res4.status_code, 200)
        self.assertEqual(res4.get_json()["donation"]["status"], "DELIVERED")

        # 5. Update to COMPLETED
        res5 = self.client.put(f"/api/donations/{donation_id}/status", json={"status": "COMPLETED"})
        self.assertEqual(res5.status_code, 200)
        self.assertEqual(res5.get_json()["donation"]["status"], "COMPLETED")

    def test_04_urgent_donation_requests_grouping(self):
        """Test urgent donation request creation and grouping by CRITICAL, HIGH, NORMAL"""
        res = self.client.get("/api/donations/urgent")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        self.assertIn("CRITICAL", data["grouped"])
        self.assertTrue(len(data["grouped"]["CRITICAL"]) >= 1)

    def test_05_donation_inventory_and_reallocation(self):
        """Test authorized resource reallocation from inventory to urgent request"""
        with self.app.app_context():
            inv = db.session.get(DonationInventory, 1)
            init_avail = inv.available_quantity
            init_alloc = inv.allocated_quantity

        res = self.client.post("/api/donations/reallocate", json={
            "inventory_id": 1,
            "target_urgent_request_id": 1,
            "quantity": 5,
            "notes": "Reallocating surplus shelter stock"
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        self.assertEqual(data["updated_inventory"]["available_quantity"], init_avail - 5)
        self.assertEqual(data["updated_inventory"]["allocated_quantity"], init_alloc + 5)

    def test_06_privacy_protection_check(self):
        """Test that unauthenticated or donor users never receive vulnerable requester PII"""
        res = self.client.post("/api/donations/match-preview", json={
            "text": "I can donate 5 meals",
            "latitude": 11.0168,
            "longitude": 76.9558
        })
        self.assertEqual(res.status_code, 200)
        matches = res.get_json()["matches"]
        for m in matches:
            res_info = m["resource"]
            loc_info = m["location"]
            # Assert private PII phone / street address of beneficiary is masked
            self.assertNotIn("Secret Requester PII", str(m))
            self.assertNotIn("+91 99999 12345", str(m))
            self.assertNotIn("Secret Private Door", str(loc_info))


if __name__ == "__main__":
    unittest.main()
