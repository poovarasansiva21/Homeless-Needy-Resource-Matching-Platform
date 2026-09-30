"""
SAHAAYAA AI - Phase 7 Rate Limiter Service
Sliding-window rate limiter decorator protecting endpoints against spam and abuse.
"""

import time
import functools
from typing import Dict, List
from flask import request, jsonify

# In-memory storage for sliding window timestamps per IP / bucket
_RATE_LIMIT_STORE: Dict[str, List[float]] = {}

def rate_limit(max_requests: int = 15, window_seconds: int = 60, bucket_name: str = "default"):
    """
    Sliding window rate limit decorator.
    :param max_requests: Maximum allowed requests within the time window.
    :param window_seconds: Time window duration in seconds.
    :param bucket_name: Sub-namespace for distinct endpoints.
    """
    def decorator(f):
        @functools.wraps(f)
        def decorated(*args, **kwargs):
            client_ip = request.remote_addr or "127.0.0.1"
            auth_header = request.headers.get("Authorization", "")
            
            # Key combines client IP and optional user identity
            key = f"{bucket_name}:{client_ip}:{auth_header[:20]}"
            now = time.time()
            cutoff = now - window_seconds

            # Fetch or create window timestamps list
            timestamps = _RATE_LIMIT_STORE.get(key, [])
            
            # Prune expired timestamps
            valid_timestamps = [t for t in timestamps if t > cutoff]

            if len(valid_timestamps) >= max_requests:
                retry_after = int(window_seconds - (now - valid_timestamps[0]))
                return jsonify({
                    "error": "Rate limit exceeded. Too many requests submitted.",
                    "rate_limit": {
                        "max_requests": max_requests,
                        "window_seconds": window_seconds,
                        "retry_after_seconds": max(1, retry_after)
                    }
                }), 429

            # Append current timestamp and save
            valid_timestamps.append(now)
            _RATE_LIMIT_STORE[key] = valid_timestamps

            return f(*args, **kwargs)
        return decorated
    return decorator
