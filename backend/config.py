import os
import shutil

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

def resolve_database_uri():
    db_url = os.environ.get("DATABASE_URL")
    if db_url and db_url.strip():
        db_url = db_url.strip()
        if db_url.startswith("postgres://"):
            db_url = db_url.replace("postgres://", "postgresql://", 1)
        return db_url

    is_serverless = bool(os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"))
    if is_serverless:
        tmp_db = "/tmp/sahaayaa.db"
        orig_db = os.path.join(BASE_DIR, "sahaayaa.db")
        if not os.path.exists(tmp_db) and os.path.exists(orig_db):
            try:
                shutil.copy2(orig_db, tmp_db)
                print("[Config] Copied seed database to /tmp/sahaayaa.db for Vercel serverless runtime.")
            except Exception as copy_err:
                print(f"[Config Warning] Could not copy seed database to /tmp: {copy_err}")
        return f"sqlite:///{tmp_db}"

    return f"sqlite:///{os.path.join(BASE_DIR, 'sahaayaa.db')}"

def resolve_upload_folder():
    is_serverless = bool(os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"))
    if is_serverless:
        tmp_uploads = "/tmp/uploads"
        try:
            os.makedirs(tmp_uploads, exist_ok=True)
        except Exception:
            pass
        return tmp_uploads

    default_uploads = os.path.join(BASE_DIR, "uploads")
    try:
        os.makedirs(default_uploads, exist_ok=True)
        return default_uploads
    except Exception:
        tmp_uploads = "/tmp/uploads"
        try:
            os.makedirs(tmp_uploads, exist_ok=True)
        except Exception:
            pass
        return tmp_uploads

class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "sahaayaa-ai-secure-secret-key-2026")
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "sahaayaa-ai-jwt-secret-token-key-2026")
    SQLALCHEMY_DATABASE_URI = resolve_database_uri()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    UPLOAD_FOLDER = resolve_upload_folder()
    _cors_env = os.environ.get("CORS_ORIGINS")
    CORS_ORIGINS = [o.strip() for o in _cors_env.split(",") if o.strip()] if _cors_env else ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5000", "http://127.0.0.1:5000", "https://homeless-needy-resource-matching-pl.vercel.app", "*"]
    ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "pdf", "webp"}

