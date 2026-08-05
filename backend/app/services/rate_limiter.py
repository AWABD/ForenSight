import time
import threading
from collections import defaultdict
from fastapi import Request, HTTPException, status

class InMemoryRateLimiter:
    """
    Thread-safe, in-memory sliding window rate limiter.
    Perfect for air-gapped deployments where running a Redis service is overhead.
    """
    def __init__(self):
        self._requests = defaultdict(list)
        self._lock = threading.Lock()

    def check_rate_limit(self, client_ip: str, route_key: str, limit: int, window_seconds: int) -> bool:
        """
        Validates if client IP has exceeded request limit within sliding window.
        Returns:
            bool: True if rate limited, False if allowed.
        """
        now = time.time()
        key = f"{client_ip}:{route_key}"
        
        with self._lock:
            timestamps = self._requests[key]
            # Prune obsolete request entries older than sliding window limit
            pruned = [t for t in timestamps if now - t < window_seconds]
            self._requests[key] = pruned
            
            if len(pruned) >= limit:
                return True
            
            # Record current valid request timestamp
            self._requests[key].append(now)
            return False

# Global single instance of rate limiter
limiter = InMemoryRateLimiter()

class RateLimiterDependency:
    """
    FastAPI dependency wrapper for enforcing route-specific rate limits.
    """
    def __init__(self, limit: int, window_seconds: int = 60, route_name: str = "api"):
        self.limit = limit
        self.window_seconds = window_seconds
        self.route_name = route_name

    def __call__(self, request: Request):
        # Fallback if request ip host object is not resolved
        client_ip = "127.0.0.1"
        if request.client and request.client.host:
            client_ip = request.client.host
            
        is_limited = limiter.check_rate_limit(
            client_ip=client_ip,
            route_key=self.route_name,
            limit=self.limit,
            window_seconds=self.window_seconds
        )
        
        if is_limited:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Maximum {self.limit} requests per {self.window_seconds}s allowed."
            )
