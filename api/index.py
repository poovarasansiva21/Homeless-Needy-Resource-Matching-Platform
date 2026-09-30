import os
import sys

# Add backend directory to Python sys.path so backend imports work seamlessly in Vercel Serverless Function environment
backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app import app
