import os
from datetime import datetime, timedelta
from models import db, User, Request, Resource, Match, Donation, RequestStatusHistory, Verification, Notification, AuditLog, TransportInfo, TransportReport, TransportAssistanceTrip, UrgentDonationRequest, DonationInventory

def init_db(app):
    with app.app_context():
        try:
            db.create_all()
            # Migration logic for new requests & donations columns if table already existed
            with db.engine.connect() as conn:
                from sqlalchemy import text
                for table_name, col_def in [
                    ("requests", ("is_help_someone", "BOOLEAN DEFAULT 0")),
                    ("requests", ("has_photo_permission", "BOOLEAN DEFAULT 0")),
                    ("requests", ("voice_transcript", "TEXT")),
                    ("donations", ("urgent_request_id", "INTEGER")),
                    ("donations", ("resource_id", "INTEGER")),
                    ("donations", ("item_category", "VARCHAR(50) DEFAULT 'OTHER'")),
                    ("donations", ("item_description", "TEXT")),
                    ("donations", ("quantity", "INTEGER DEFAULT 1")),
                    ("donations", ("unit", "VARCHAR(30) DEFAULT 'items'")),
                    ("donations", ("donor_latitude", "FLOAT DEFAULT 11.0168")),
                    ("donations", ("donor_longitude", "FLOAT DEFAULT 76.9558")),
                    ("donations", ("donor_address", "VARCHAR(255)")),
                    ("donations", ("reallocated_from_id", "INTEGER")),
                    ("donations", ("updated_at", "DATETIME"))
                ]:
                    try:
                        conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {col_def[0]} {col_def[1]}"))
                        conn.commit()
                    except Exception:
                        pass  # Column already exists

                # Recreate donations table if request_id has NOT NULL constraint
                try:
                    table_info = conn.execute(text("PRAGMA table_info(donations)")).fetchall()
                    for col in table_info:
                        if col[1] == "request_id" and col[3] == 1:
                            conn.execute(text("ALTER TABLE donations RENAME TO donations_old"))
                            db.create_all()
                            conn.execute(text("INSERT INTO donations (id, donor_id, request_id, donation_type, notes, status, created_at) SELECT id, donor_id, request_id, donation_type, notes, status, created_at FROM donations_old"))
                            conn.execute(text("DROP TABLE donations_old"))
                            conn.commit()
                            break
                except Exception as mig_err:
                    print(f"[Database Migration Info] {mig_err}")
            seed_data()
            seed_transport_info_if_needed()
            seed_urgent_and_inventory_if_needed()
            seed_humanitarian_data_if_needed()
        except Exception as db_init_err:
            print(f"[Database Init Notice] DB init handled gracefully: {db_init_err}")



def seed_data():
    # Only seed if no users exist
    if User.query.first():
        return

    print("[Database] Seeding initial demo users, resources, and requests...")

    # 1. Demo Users
    users_data = [
        {"email": "admin@sahaayaa.org", "pass": "admin123", "name": "Dr. V. Rajesh (Admin)", "role": "admin", "org": "Sahaayaa Central Directorate", "phone": "+91 94430 11001"},
        {"email": "aravind.ngo@sahaayaa.org", "pass": "ngo123", "name": "Aravind Relief Mission", "role": "ngo", "org": "Aravind Community Trust", "phone": "+91 98422 22002"},
        {"email": "donor@sahaayaa.org", "pass": "donor123", "name": "Kavitha Sundaram (Donor)", "role": "donor", "org": None, "phone": "+91 97890 33003"},
        {"email": "requester@sahaayaa.org", "pass": "requester123", "name": "Murugan S.", "role": "requester", "org": None, "phone": "+91 91234 44004"},
        {"email": "volunteer@sahaayaa.org", "pass": "volunteer123", "name": "Praveen Kumar (Volunteer)", "role": "volunteer", "org": "City Youth Volunteers", "phone": "+91 96555 55005"}
    ]

    users_map = {}
    for u in users_data:
        user = User(
            email=u["email"],
            full_name=u["name"],
            role=u["role"],
            organization_name=u["org"],
            phone=u["phone"]
        )
        user.set_password(u["pass"])
        db.session.add(user)
        users_map[u["role"]] = user

    db.session.commit()

    # 2. Demo Coimbatore Resources (Explicitly marked as DEMO DATA)
    resources_data = [
        {
            "name": "[DEMO] Coimbatore Annadhanam Food Bank",
            "organization_type": "Food Bank",
            "category": "FOOD",
            "description": "Daily food distribution center providing hot meals, dry grocery kits, and infant milk supplements.",
            "phone": "+91 422 2541001",
            "email": "foodbank@annadhanam-demo.org",
            "latitude": 11.0092,
            "longitude": 76.9482,
            "address": "42, D.B. Road, RS Puram, Coimbatore, Tamil Nadu 641002",
            "availability_status": "Available",
            "capacity_total": 150,
            "capacity_available": 95,
            "verified": True,
            "is_demo": True
        },
        {
            "name": "[DEMO] Karunya Night Shelter & Crisis Care",
            "organization_type": "Shelter",
            "category": "SHELTER",
            "description": "Clean, secure overnight lodging for homeless families, women with children, and abandoned senior citizens.",
            "phone": "+91 422 2529002",
            "email": "shelter@karunya-demo.org",
            "latitude": 11.0183,
            "longitude": 76.9634,
            "address": "15, Cross Cut Road, Gandhipuram, Coimbatore, Tamil Nadu 641012",
            "availability_status": "Available",
            "capacity_total": 60,
            "capacity_available": 22,
            "verified": True,
            "is_demo": True
        },
        {
            "name": "[DEMO] Shanti Community Medical Dispensary",
            "organization_type": "Medical NGO",
            "category": "MEDICAL",
            "description": "Free outpatient clinic providing primary health consultations, emergency dressings, and vital life-saving medicines.",
            "phone": "+91 422 2573003",
            "email": "health@shantimed-demo.org",
            "latitude": 11.0012,
            "longitude": 77.0215,
            "address": "Trichy Road, Near Bus Stand, Singanallur, Coimbatore, Tamil Nadu 641005",
            "availability_status": "Available",
            "capacity_total": 100,
            "capacity_available": 60,
            "verified": True,
            "is_demo": True
        },
        {
            "name": "[DEMO] Anbu Illam Warmth & Clothing Bank",
            "organization_type": "Clothing Center",
            "category": "CLOTHING",
            "description": "Community collection hub distributing clean clothing, blankets, footwear, and rain gear to street dwellers.",
            "phone": "+91 422 2445004",
            "email": "clothing@anbuillam-demo.org",
            "latitude": 11.0289,
            "longitude": 76.9421,
            "address": "NSR Road, Saibaba Colony, Coimbatore, Tamil Nadu 641011",
            "availability_status": "Available",
            "capacity_total": 200,
            "capacity_available": 140,
            "verified": True,
            "is_demo": True
        },
        {
            "name": "[DEMO] Coimbatore Emergency Disaster Response Taskforce",
            "organization_type": "Disaster Relief NGO",
            "category": "EMERGENCY",
            "description": "24/7 rapid response unit for flash floods, building collapses, severe accidents, and evacuation.",
            "phone": "+91 422 2596005",
            "email": "emergency@coimbatorerescue-demo.org",
            "latitude": 11.0264,
            "longitude": 77.0125,
            "address": "Avinashi Road, Peelamedu, Coimbatore, Tamil Nadu 641004",
            "availability_status": "Available",
            "capacity_total": 50,
            "capacity_available": 35,
            "verified": True,
            "is_demo": True
        },
        {
            "name": "[DEMO] Vidya Mandir Community Study Center",
            "organization_type": "Education Center",
            "category": "EDUCATION",
            "description": "Educational NGO offering free tutoring, textbooks, school uniforms, and digital literacy classes.",
            "phone": "+91 422 2397006",
            "email": "study@vidyamandir-demo.org",
            "latitude": 10.9968,
            "longitude": 76.9602,
            "address": "Big Bazaar Street, Town Hall, Coimbatore, Tamil Nadu 641001",
            "availability_status": "Available",
            "capacity_total": 80,
            "capacity_available": 40,
            "verified": True,
            "is_demo": True
        },
        {
            "name": "[DEMO] Udhayam Vocational & Livelihood Guild",
            "organization_type": "Employment NGO",
            "category": "EMPLOYMENT",
            "description": "Vocational training and job placement assistance for daily wagers, domestic workers, and destitute youth.",
            "phone": "+91 422 2518007",
            "email": "livelihood@udhayam-demo.org",
            "latitude": 11.0391,
            "longitude": 76.9782,
            "address": "Sathy Main Road, Ganapathy, Coimbatore, Tamil Nadu 641006",
            "availability_status": "Available",
            "capacity_total": 70,
            "capacity_available": 30,
            "verified": True,
            "is_demo": True
        },
        {
            "name": "[DEMO] Karunalaya Mother & Child Shelter",
            "organization_type": "Shelter",
            "category": "SHELTER",
            "description": "Safe haven providing long-term shelter, nutritious food, and child education support for destitute women.",
            "phone": "+91 422 2341008",
            "email": "shelter@karunalaya-demo.org",
            "latitude": 10.9912,
            "longitude": 76.9587,
            "address": "Near Ukkadam Bus Stand, Coimbatore, Tamil Nadu 641001",
            "availability_status": "Available",
            "capacity_total": 60,
            "capacity_available": 15,
            "verified": True,
            "is_demo": True
        }
    ]

    saved_resources = []
    for r in resources_data:
        res = Resource(**r)
        db.session.add(res)
        saved_resources.append(res)

    db.session.commit()

    # 3. Seed Realistic Requests in Different Pipeline States
    req1 = Request(
        requester_id=users_map["requester"].id,
        full_name="Murugan S.",
        phone="+91 91234 44004",
        description="I have two children and we have not had food since yesterday. No rations left at home.",
        category="FOOD",
        dnn_category="FOOD",
        dnn_confidence=0.99,
        urgency_level="HIGH",
        urgency_score=75,
        people_count=3,
        current_situation="Daily wage labor halted due to rain; family hungry.",
        latitude=11.0180,
        longitude=76.9630,
        approx_latitude=11.020,
        approx_longitude=76.965,
        address="12 Railway Pavement Lane, Gandhipuram, Coimbatore",
        contact_method="Phone",
        status="VERIFIED",
        created_at=datetime.utcnow() - timedelta(hours=3)
    )
    db.session.add(req1)

    req2 = Request(
        requester_id=None,
        full_name="Selvi R.",
        phone="+91 98401 55667",
        description="Elderly grandmother and small baby evicted from rented room. Sitting in rain, urgently need shelter tonight.",
        category="SHELTER",
        dnn_category="SHELTER",
        dnn_confidence=0.98,
        urgency_level="CRITICAL",
        urgency_score=85,
        people_count=3,
        current_situation="Eviction notice executed today; sleeping outside.",
        latitude=11.0105,
        longitude=76.9490,
        approx_latitude=11.012,
        approx_longitude=76.951,
        address="Near Flower Market, RS Puram, Coimbatore",
        contact_method="In-Person",
        status="PENDING_VERIFICATION",
        created_at=datetime.utcnow() - timedelta(minutes=45)
    )
    db.session.add(req2)

    req3 = Request(
        requester_id=None,
        full_name="Karthik V.",
        phone="+91 97892 88990",
        description="Child suffering from acute bronchial asthma attack. Nebulizer and pediatric inhaler urgently needed.",
        category="MEDICAL",
        dnn_category="MEDICAL",
        dnn_confidence=0.97,
        urgency_level="HIGH",
        urgency_score=70,
        people_count=1,
        current_situation="Father unemployed, unable to purchase medicine from pharmacy.",
        latitude=11.0020,
        longitude=77.0200,
        approx_latitude=11.005,
        approx_longitude=77.022,
        address="Slum Quarters, Singanallur, Coimbatore",
        contact_method="Phone",
        status="ACCEPTED",
        assigned_ngo_id=users_map["ngo"].id,
        created_at=datetime.utcnow() - timedelta(hours=6)
    )
    db.session.add(req3)

    db.session.commit()

    # Seed Request Status History
    h1 = RequestStatusHistory(
        request_id=req1.id,
        previous_status="SUBMITTED",
        new_status="VERIFIED",
        changed_by_user_id=users_map["admin"].id,
        notes="Verified via direct phone call with requester.",
        timestamp=datetime.utcnow() - timedelta(hours=2)
    )
    db.session.add(h1)

    h2 = RequestStatusHistory(
        request_id=req3.id,
        previous_status="VERIFIED",
        new_status="ACCEPTED",
        changed_by_user_id=users_map["ngo"].id,
        notes="Aravind Relief Mission accepted case and dispatched field volunteer.",
        timestamp=datetime.utcnow() - timedelta(hours=4)
    )
    db.session.add(h2)

    # Seed Initial Notifications
    n1 = Notification(
        user_id=None,
        role_target="all",
        title="Welcome to SAHAAYAA AI",
        message="AI-Powered Homeless & Needy Resource Matching Platform is live in Coimbatore.",
        notification_type="info"
    )
    db.session.add(n1)

    # Seed Audit Log
    log = AuditLog(
        user_id=users_map["admin"].id,
        action="SYSTEM_INIT",
        details="Initial system deployment, demo resources seeded.",
        ip_address="127.0.0.1"
    )
    db.session.add(log)

    db.session.commit()
    print("[Database] Seeding successfully completed.")

def seed_transport_info_if_needed():
    if TransportInfo.query.first():
        return

    print("[Database] Seeding verified transport mobility routes...")
    resources = {r.name: r for r in Resource.query.all()}

    transport_seeds = [
        {
            "resource_name": "[DEMO] Coimbatore Annadhanam Food Bank",
            "provider": "TNSTC Coimbatore (Route 11)",
            "route_name": "Gandhipuram Central Stand ➔ D.B. Road RS Puram",
            "fare_amount": 15.0,
            "fare_display": "₹15.00",
            "is_free_or_concession": True,
            "eligibility": "General Public / Free for Senior Citizens with Social Welfare Card",
            "source": "TNSTC Official Municipal Transit Directory",
            "status": "VERIFIED",
            "safety_notice": "Free/concession travel may be available for eligible users. Verify eligibility before travelling."
        },
        {
            "resource_name": "[DEMO] Karunya Night Shelter & Crisis Care",
            "provider": "TNSTC Coimbatore (Route 70)",
            "route_name": "Ukkadam Bus Stand ➔ Gandhipuram Cross Cut Road",
            "fare_amount": 12.0,
            "fare_display": "₹12.00",
            "is_free_or_concession": True,
            "eligibility": "General Public / Concession with Govt Social Pass",
            "source": "District Homeless Welfare Board Transit Registry",
            "status": "VERIFIED",
            "safety_notice": "Free/concession travel may be available for eligible users. Verify eligibility before travelling."
        },
        {
            "resource_name": "[DEMO] Shanti Community Medical Dispensary",
            "provider": "TNSTC Coimbatore (Route 45B)",
            "route_name": "Coimbatore Junction ➔ Singanallur Trichy Road",
            "fare_amount": 18.0,
            "fare_display": "₹18.00",
            "is_free_or_concession": False,
            "eligibility": "General Public / Senior Citizen Tariff Discount",
            "source": "Coimbatore Transport Board Directory",
            "status": "NEEDS_VERIFICATION",
            "safety_notice": "Free/concession travel may be available for eligible users. Verify eligibility before travelling."
        },
        {
            "resource_name": None,
            "provider": "Sahaayaa Relief Transit Network (Volunteer Van)",
            "route_name": "On-Demand Emergency Transit to Local Shelters",
            "fare_amount": 0.0,
            "fare_display": "FREE (Sponsor Covered)",
            "is_free_or_concession": True,
            "eligibility": "Verified Needy Requesters with Children or Mobility Barriers",
            "source": "Sahaayaa Verified Relief Network",
            "status": "VERIFIED",
            "safety_notice": "Free/concession travel may be available for eligible users. Verify eligibility before travelling."
        }
    ]

    for item in transport_seeds:
        res_obj = resources.get(item["resource_name"]) if item["resource_name"] else None
        t_info = TransportInfo(
            resource_id=res_obj.id if res_obj else None,
            provider=item["provider"],
            route_name=item["route_name"],
            fare_amount=item["fare_amount"],
            fare_display=item["fare_display"],
            is_free_or_concession=item["is_free_or_concession"],
            eligibility=item["eligibility"],
            source=item["source"],
            status=item["status"],
            safety_notice=item["safety_notice"],
            last_verified=datetime.utcnow() - timedelta(days=2),
            review_expiry_date=datetime.utcnow() + timedelta(days=180)
        )
        db.session.add(t_info)

    db.session.commit()
    print("[Database] Transport mobility seed info created.")


def seed_urgent_and_inventory_if_needed():
    if UrgentDonationRequest.query.first():
        return

    print("[Database] Seeding urgent donation requests and resource inventory...")
    resources = {r.name: r for r in Resource.query.all()}
    admin = User.query.filter_by(role="admin").first()

    shelter_res = resources.get("[DEMO] Karunya Night Shelter & Crisis Care")
    food_res = resources.get("[DEMO] Coimbatore Annadhanam Food Bank")
    clothing_res = resources.get("[DEMO] Anbu Illam Warmth & Clothing Bank")
    medical_res = resources.get("[DEMO] Shanti Community Medical Dispensary")

    # 1. Seed Urgent Donation Requests (CRITICAL, HIGH, NORMAL as per Phase 5 spec)
    urgents = [
        {
            "resource_id": shelter_res.id if shelter_res else None,
            "title": "Night Shelter Cold Relief Blanket Drive",
            "item_category": "BLANKETS",
            "urgency_level": "CRITICAL",
            "required_quantity": 20,
            "unit": "blankets",
            "description": "20 thermal blankets required for cold weather protection for unhoused families.",
            "latitude": shelter_res.latitude if shelter_res else 11.0183,
            "longitude": shelter_res.longitude if shelter_res else 76.9634,
            "address": shelter_res.address if shelter_res else "Gandhipuram, Coimbatore",
            "created_by_user_id": admin.id if admin else None
        },
        {
            "resource_id": food_res.id if food_res else None,
            "title": "Emergency Daily Meal Relief Kitchen",
            "item_category": "FOOD",
            "urgency_level": "HIGH",
            "required_quantity": 50,
            "unit": "meals",
            "description": "50 cooked nutritious meals required for daily wagers affected by monsoon heavy rain.",
            "latitude": food_res.latitude if food_res else 11.0092,
            "longitude": food_res.longitude if food_res else 76.9482,
            "address": food_res.address if food_res else "RS Puram, Coimbatore",
            "created_by_user_id": admin.id if admin else None
        },
        {
            "resource_id": clothing_res.id if clothing_res else None,
            "title": "Monsoon Raincoats & Clothing Collection",
            "item_category": "CLOTHING",
            "urgency_level": "NORMAL",
            "required_quantity": 30,
            "unit": "items",
            "description": "Clean dry clothing and rain gear required for street dwellers.",
            "latitude": clothing_res.latitude if clothing_res else 11.0289,
            "longitude": clothing_res.longitude if clothing_res else 76.9421,
            "address": clothing_res.address if clothing_res else "Saibaba Colony, Coimbatore",
            "created_by_user_id": admin.id if admin else None
        }
    ]

    for u_data in urgents:
        db.session.add(UrgentDonationRequest(**u_data))

    # 2. Seed Donation Inventories
    inventories = [
        {
            "resource_id": shelter_res.id if shelter_res else None,
            "item_category": "BLANKETS",
            "item_name": "Heavy Thermal Blankets",
            "total_quantity": 25,
            "allocated_quantity": 15,
            "available_quantity": 10,
            "unit": "blankets"
        },
        {
            "resource_id": food_res.id if food_res else None,
            "item_category": "FOOD",
            "item_name": "Dry Grocery & Meal Kits",
            "total_quantity": 60,
            "allocated_quantity": 10,
            "available_quantity": 50,
            "unit": "kits"
        },
        {
            "resource_id": clothing_res.id if clothing_res else None,
            "item_category": "CLOTHING",
            "item_name": "Warm Jackets & Rain Coats",
            "total_quantity": 35,
            "allocated_quantity": 5,
            "available_quantity": 30,
            "unit": "packages"
        },
        {
            "resource_id": medical_res.id if medical_res else None,
            "item_category": "HYGIENE",
            "item_name": "First Aid & Hygiene Kits",
            "total_quantity": 22,
            "allocated_quantity": 2,
            "available_quantity": 20,
            "unit": "kits"
        }
    ]

    for inv_data in inventories:
        db.session.add(DonationInventory(**inv_data))

    db.session.commit()
    print("[Database] Urgent donation requests and inventory seeded successfully.")


def seed_humanitarian_data_if_needed():
    if Request.query.count() > 8:
        return

    print("[Database] Seeding multi-category humanitarian intelligence test dataset...")
    now = datetime.utcnow()

    seeds = [
        # FOOD
        {
            "full_name": "Ramu & Family", "phone": "+91 94421 11223",
            "description": "5 daily wagers stranded without food rations after heavy downpour.",
            "category": "FOOD", "dnn_category": "FOOD", "dnn_confidence": 0.98,
            "urgency_level": "HIGH", "urgency_score": 78, "people_count": 5,
            "current_situation": "No income for 3 days due to rain",
            "latitude": 11.0185, "longitude": 76.9635, "address": "14 Bus Stand Road, Gandhipuram, Coimbatore",
            "status": "VERIFIED", "created_at": now - timedelta(hours=2)
        },
        {
            "full_name": "Deepa M.", "phone": "+91 98425 22334",
            "description": "Mother with 2 small children needing dry food packets.",
            "category": "FOOD", "dnn_category": "FOOD", "dnn_confidence": 0.95,
            "urgency_level": "CRITICAL", "urgency_score": 88, "people_count": 3,
            "current_situation": "Hungry for 24 hours",
            "latitude": 11.0190, "longitude": 76.9640, "address": "Gandhipuram Market Lane, Coimbatore",
            "status": "PENDING_VERIFICATION", "created_at": now - timedelta(hours=5)
        },
        {
            "full_name": "Velu S.", "phone": "+91 97891 33445",
            "description": "Community of 12 migrant workers requiring hot cooked meals.",
            "category": "FOOD", "dnn_category": "FOOD", "dnn_confidence": 0.99,
            "urgency_level": "HIGH", "urgency_score": 75, "people_count": 12,
            "current_situation": "Worksite closed",
            "latitude": 11.0175, "longitude": 76.9620, "address": "Cross Cut Road, Gandhipuram, Coimbatore",
            "status": "VERIFIED", "created_at": now - timedelta(days=1, hours=4)
        },

        # SHELTER
        {
            "full_name": "Govindaraj K.", "phone": "+91 96551 44556",
            "description": "Evicted senior citizen couple seeking overnight shelter.",
            "category": "SHELTER", "dnn_category": "SHELTER", "dnn_confidence": 0.96,
            "urgency_level": "CRITICAL", "urgency_score": 90, "people_count": 2,
            "current_situation": "Sleeping on pavement in rain",
            "latitude": 11.0110, "longitude": 76.9495, "address": "DB Road, RS Puram, Coimbatore",
            "status": "VERIFIED", "created_at": now - timedelta(hours=8)
        },
        {
            "full_name": "Lakshmi P.", "phone": "+91 91235 55667",
            "description": "Single mother with infant evicted from rental room.",
            "category": "SHELTER", "dnn_category": "SHELTER", "dnn_confidence": 0.97,
            "urgency_level": "CRITICAL", "urgency_score": 92, "people_count": 2,
            "current_situation": "No temporary accommodation",
            "latitude": 11.0100, "longitude": 76.9480, "address": "Flower Market Street, RS Puram, Coimbatore",
            "status": "PENDING_VERIFICATION", "created_at": now - timedelta(days=2, hours=3)
        },

        # CLOTHING
        {
            "full_name": "Manickam T.", "phone": "+91 98402 66778",
            "description": "Family of 4 lost clothing and blankets in waterlogging.",
            "category": "CLOTHING", "dnn_category": "CLOTHING", "dnn_confidence": 0.94,
            "urgency_level": "MEDIUM", "urgency_score": 60, "people_count": 4,
            "current_situation": "Clothes soaked in floodwater",
            "latitude": 11.0295, "longitude": 76.9425, "address": "Saibaba Colony Slums, Coimbatore",
            "status": "VERIFIED", "created_at": now - timedelta(days=1, hours=10)
        },
        {
            "full_name": "Palanisamy V.", "phone": "+91 97893 77889",
            "description": "Warm clothing and footwear needed for 3 elderly residents.",
            "category": "CLOTHING", "dnn_category": "CLOTHING", "dnn_confidence": 0.92,
            "urgency_level": "MEDIUM", "urgency_score": 55, "people_count": 3,
            "current_situation": "Cold weather exposure",
            "latitude": 11.0280, "longitude": 76.9415, "address": "NSR Road, Saibaba Colony, Coimbatore",
            "status": "VERIFIED", "created_at": now - timedelta(days=3, hours=2)
        },

        # MEDICAL
        {
            "full_name": "Senthil Kumar", "phone": "+91 96552 88990",
            "description": "Diabetic patient needing insulin refills and dressing support.",
            "category": "MEDICAL", "dnn_category": "MEDICAL", "dnn_confidence": 0.98,
            "urgency_level": "HIGH", "urgency_score": 82, "people_count": 1,
            "current_situation": "Insulin exhausted",
            "latitude": 11.0025, "longitude": 77.0205, "address": "Trichy Road, Singanallur, Coimbatore",
            "status": "VERIFIED", "created_at": now - timedelta(hours=14)
        },
        {
            "full_name": "Anitha B.", "phone": "+91 94422 99001",
            "description": "Pregnant woman requiring vital prenatal checkup and nutrition supplements.",
            "category": "MEDICAL", "dnn_category": "MEDICAL", "dnn_confidence": 0.96,
            "urgency_level": "HIGH", "urgency_score": 80, "people_count": 2,
            "current_situation": "Anemic and weak",
            "latitude": 11.0015, "longitude": 77.0220, "address": "Singanallur Slum Colony, Coimbatore",
            "status": "ACCEPTED", "created_at": now - timedelta(days=2, hours=6)
        },

        # EMERGENCY
        {
            "full_name": "Kannan M.", "phone": "+91 91236 00112",
            "description": "Flash flood water entering 3 huts near canal bank. Urgent rescue needed.",
            "category": "EMERGENCY", "dnn_category": "EMERGENCY", "dnn_confidence": 0.99,
            "urgency_level": "CRITICAL", "urgency_score": 98, "people_count": 8,
            "current_situation": "Water level rising",
            "latitude": 11.0268, "longitude": 77.0130, "address": "Canal Bank Road, Peelamedu, Coimbatore",
            "status": "VERIFIED", "created_at": now - timedelta(hours=1)
        },

        # EDUCATION
        {
            "full_name": "Revathi G.", "phone": "+91 98403 11223",
            "description": "School notebooks and uniform support for 2 orphan children.",
            "category": "EDUCATION", "dnn_category": "EDUCATION", "dnn_confidence": 0.91,
            "urgency_level": "LOW", "urgency_score": 40, "people_count": 2,
            "current_situation": "Unable to buy school supplies",
            "latitude": 10.9970, "longitude": 76.9605, "address": "Town Hall Main Road, Coimbatore",
            "status": "VERIFIED", "created_at": now - timedelta(days=4, hours=5)
        },
        {
            "full_name": "Suresh B.", "phone": "+91 97894 22334",
            "description": "Basic study table and digital device support for 3 underprivileged students.",
            "category": "EDUCATION", "dnn_category": "EDUCATION", "dnn_confidence": 0.89,
            "urgency_level": "LOW", "urgency_score": 35, "people_count": 3,
            "current_situation": "Preparing for board exams",
            "latitude": 10.9960, "longitude": 76.9595, "address": "Big Bazaar Street, Town Hall, Coimbatore",
            "status": "VERIFIED", "created_at": now - timedelta(days=6, hours=1)
        },

        # EMPLOYMENT
        {
            "full_name": "Natarajan P.", "phone": "+91 96553 33445",
            "description": "Daily wage laborer seeking placement or tool kit support.",
            "category": "EMPLOYMENT", "dnn_category": "EMPLOYMENT", "dnn_confidence": 0.90,
            "urgency_level": "MEDIUM", "urgency_score": 50, "people_count": 1,
            "current_situation": "Unemployed for 2 weeks",
            "latitude": 11.0395, "longitude": 76.9785, "address": "Sathy Road, Ganapathy, Coimbatore",
            "status": "VERIFIED", "created_at": now - timedelta(days=5, hours=8)
        },
        {
            "full_name": "Mallika R.", "phone": "+91 94423 44556",
            "description": "Destitute widow seeking tailoring work or self-employment guild enrollment.",
            "category": "EMPLOYMENT", "dnn_category": "EMPLOYMENT", "dnn_confidence": 0.93,
            "urgency_level": "MEDIUM", "urgency_score": 52, "people_count": 1,
            "current_situation": "Sole earner for family",
            "latitude": 11.0385, "longitude": 76.9775, "address": "Ganapathy Post Office Street, Coimbatore",
            "status": "VERIFIED", "created_at": now - timedelta(days=7, hours=3)
        }
    ]

    for data in seeds:
        req = Request(**data)
        db.session.add(req)

    db.session.commit()
    print(f"[Database] Successfully seeded {len(seeds)} multi-category humanitarian requests.")


