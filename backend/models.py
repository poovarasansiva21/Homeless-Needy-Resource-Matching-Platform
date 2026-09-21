import os
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
import bcrypt

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    full_name = db.Column(db.String(120), nullable=False)
    role = db.Column(db.String(30), nullable=False, default="requester")  # requester, donor, ngo, admin, volunteer
    phone = db.Column(db.String(30), nullable=True)
    organization_name = db.Column(db.String(150), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    requests = db.relationship("Request", backref="requester", lazy=True, foreign_keys="Request.requester_id")
    donations = db.relationship("Donation", backref="donor", lazy=True)
    notifications = db.relationship("Notification", backref="user", lazy=True)

    def set_password(self, password: str):
        salt = bcrypt.gensalt()
        self.password_hash = bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

    def check_password(self, password: str) -> bool:
        if not self.password_hash:
            return False
        return bcrypt.checkpw(password.encode("utf-8"), self.password_hash.encode("utf-8"))

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "full_name": self.full_name,
            "role": self.role,
            "phone": self.phone,
            "organization_name": self.organization_name,
            "created_at": self.created_at.isoformat()
        }


class Request(db.Model):
    __tablename__ = "requests"

    id = db.Column(db.Integer, primary_key=True)
    requester_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    full_name = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(30), nullable=False)
    description = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(50), nullable=False)  # User stated category
    dnn_category = db.Column(db.String(50), nullable=True)  # AI predicted category
    dnn_confidence = db.Column(db.Float, default=0.0)
    urgency_level = db.Column(db.String(30), default="MEDIUM")  # CRITICAL, HIGH, MEDIUM, LOW
    urgency_score = db.Column(db.Integer, default=50)
    people_count = db.Column(db.Integer, default=1)
    current_situation = db.Column(db.String(255), nullable=True)
    latitude = db.Column(db.Float, nullable=False, default=11.0168)
    longitude = db.Column(db.Float, nullable=False, default=76.9558)
    approx_latitude = db.Column(db.Float, nullable=False, default=11.0168)
    approx_longitude = db.Column(db.Float, nullable=False, default=76.9558)
    address = db.Column(db.String(255), nullable=False)
    contact_method = db.Column(db.String(50), default="Phone")
    photo_url = db.Column(db.String(255), nullable=True)
    status = db.Column(db.String(40), default="PENDING_VERIFICATION")
    # Status Pipeline: SUBMITTED -> AI_ANALYZED -> PENDING_VERIFICATION -> VERIFIED -> MATCHING -> MATCHED -> ACCEPTED -> IN_PROGRESS -> DELIVERED -> COMPLETED / REJECTED
    is_flagged_duplicate = db.Column(db.Boolean, default=False)
    duplicate_notes = db.Column(db.Text, nullable=True)
    assigned_ngo_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    status_history = db.relationship("RequestStatusHistory", backref="request", lazy=True, cascade="all, delete-orphan")
    matches = db.relationship("Match", backref="request", lazy=True, cascade="all, delete-orphan")
    donations = db.relationship("Donation", backref="request", lazy=True)
    verifications = db.relationship("Verification", backref="request", lazy=True, cascade="all, delete-orphan")

    def mask_phone(self, phone: str) -> str:
        if not phone or len(phone) < 7:
            return "***-***-****"
        return phone[:3] + " *** ** " + phone[-2:]

    def to_dict(self, is_authorized: bool = False):
        data = {
            "id": self.id,
            "requester_id": self.requester_id,
            "full_name": self.full_name if is_authorized else self.full_name[:2] + "...",
            "description": self.description,
            "category": self.category,
            "dnn_category": self.dnn_category,
            "dnn_confidence": round(self.dnn_confidence, 2),
            "urgency_level": self.urgency_level,
            "urgency_score": self.urgency_score,
            "people_count": self.people_count,
            "current_situation": self.current_situation,
            "contact_method": self.contact_method,
            "photo_url": self.photo_url,
            "status": self.status,
            "is_flagged_duplicate": self.is_flagged_duplicate,
            "duplicate_notes": self.duplicate_notes if is_authorized else None,
            "assigned_ngo_id": self.assigned_ngo_id,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }

        if is_authorized:
            data["phone"] = self.phone
            data["address"] = self.address
            data["latitude"] = self.latitude
            data["longitude"] = self.longitude
        else:
            data["phone"] = self.mask_phone(self.phone)
            # Public/non-authorized only sees generalized locality and perturbed coordinates
            data["address"] = self.address.split(",")[-1].strip() if "," in self.address else "Coimbatore Locality"
            data["latitude"] = self.approx_latitude
            data["longitude"] = self.approx_longitude

        return data


class Resource(db.Model):
    __tablename__ = "resources"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    organization_type = db.Column(db.String(100), nullable=False)  # Food Bank, Shelter, Community Kitchen, Medical NGO
    category = db.Column(db.String(50), nullable=False)
    description = db.Column(db.Text, nullable=True)
    phone = db.Column(db.String(50), nullable=False)
    email = db.Column(db.String(120), nullable=True)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    address = db.Column(db.String(255), nullable=False)
    availability_status = db.Column(db.String(50), default="Available")  # Available, Limited, Unavailable
    capacity_total = db.Column(db.Integer, default=50)
    capacity_available = db.Column(db.Integer, default=25)
    verified = db.Column(db.Boolean, default=True)
    is_demo = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    matches = db.relationship("Match", backref="resource", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "organization_type": self.organization_type,
            "category": self.category,
            "description": self.description,
            "phone": self.phone,
            "email": self.email,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "address": self.address,
            "availability_status": self.availability_status,
            "capacity_total": self.capacity_total,
            "capacity_available": self.capacity_available,
            "verified": self.verified,
            "is_demo": self.is_demo,
            "created_at": self.created_at.isoformat()
        }


class Match(db.Model):
    __tablename__ = "matches"

    id = db.Column(db.Integer, primary_key=True)
    request_id = db.Column(db.Integer, db.ForeignKey("requests.id"), nullable=False)
    resource_id = db.Column(db.Integer, db.ForeignKey("resources.id"), nullable=False)
    match_score = db.Column(db.Float, nullable=False)
    compatibility_breakdown = db.Column(db.JSON, nullable=True)
    status = db.Column(db.String(50), default="suggested")  # suggested, accepted, declined
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "request_id": self.request_id,
            "resource_id": self.resource_id,
            "resource_name": self.resource.name if self.resource else None,
            "resource_category": self.resource.category if self.resource else None,
            "match_score": self.match_score,
            "compatibility_breakdown": self.compatibility_breakdown,
            "status": self.status,
            "created_at": self.created_at.isoformat()
        }


class Donation(db.Model):
    __tablename__ = "donations"

    id = db.Column(db.Integer, primary_key=True)
    donor_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    request_id = db.Column(db.Integer, db.ForeignKey("requests.id"), nullable=False)
    donation_type = db.Column(db.String(80), nullable=False)  # food_package, clothing, financial_support, volunteer_delivery
    notes = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(50), default="pledged")  # pledged, completed, cancelled
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "donor_id": self.donor_id,
            "donor_name": self.donor.full_name if self.donor else "Anonymous Donor",
            "request_id": self.request_id,
            "donation_type": self.donation_type,
            "notes": self.notes,
            "status": self.status,
            "created_at": self.created_at.isoformat()
        }


class RequestStatusHistory(db.Model):
    __tablename__ = "request_status_history"

    id = db.Column(db.Integer, primary_key=True)
    request_id = db.Column(db.Integer, db.ForeignKey("requests.id"), nullable=False)
    previous_status = db.Column(db.String(50), nullable=True)
    new_status = db.Column(db.String(50), nullable=False)
    changed_by_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    changed_by = db.relationship("User", foreign_keys=[changed_by_user_id])

    def to_dict(self):
        return {
            "id": self.id,
            "request_id": self.request_id,
            "previous_status": self.previous_status,
            "new_status": self.new_status,
            "changed_by": self.changed_by.full_name if self.changed_by else "System/AI",
            "notes": self.notes,
            "timestamp": self.timestamp.isoformat()
        }


class Verification(db.Model):
    __tablename__ = "verifications"

    id = db.Column(db.Integer, primary_key=True)
    request_id = db.Column(db.Integer, db.ForeignKey("requests.id"), nullable=False)
    verified_by_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    status = db.Column(db.String(50), nullable=False)  # VERIFIED, REJECTED
    notes = db.Column(db.Text, nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    verified_by = db.relationship("User", foreign_keys=[verified_by_user_id])

    def to_dict(self):
        return {
            "id": self.id,
            "request_id": self.request_id,
            "verified_by": self.verified_by.full_name if self.verified_by else "Admin",
            "status": self.status,
            "notes": self.notes,
            "timestamp": self.timestamp.isoformat()
        }


class Notification(db.Model):
    __tablename__ = "notifications"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    role_target = db.Column(db.String(30), nullable=True)  # donor, ngo, admin, all
    title = db.Column(db.String(150), nullable=False)
    message = db.Column(db.Text, nullable=False)
    notification_type = db.Column(db.String(50), default="info")  # success, warning, alert, info
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "role_target": self.role_target,
            "title": self.title,
            "message": self.message,
            "notification_type": self.notification_type,
            "is_read": self.is_read,
            "created_at": self.created_at.isoformat()
        }


class AuditLog(db.Model):
    __tablename__ = "audit_logs"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    action = db.Column(db.String(100), nullable=False)
    details = db.Column(db.Text, nullable=True)
    ip_address = db.Column(db.String(50), nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", foreign_keys=[user_id])

    def to_dict(self):
        return {
            "id": self.id,
            "user": self.user.full_name if self.user else "Anonymous/Guest",
            "action": self.action,
            "details": self.details,
            "ip_address": self.ip_address,
            "timestamp": self.timestamp.isoformat()
        }
