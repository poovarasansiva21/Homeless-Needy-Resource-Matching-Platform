"""
WSGI entrypoint for Vercel Serverless Function deployment.
Exposes Flask `app` object.
"""
from app import app

if __name__ == "__main__":
    app.run()
