import os
from datetime import datetime, timedelta
from models import db, User, Request, Resource, Match, Donation, RequestStatusHistory, Verification, Notification, AuditLog

def init_db(app):
    with app.app_context():
        db.create_all()
        seed_data()

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
