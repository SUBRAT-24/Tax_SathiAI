"""
Rate Limiter Middleware — slowapi-based rate limiting.
30 requests/minute per user (configurable via settings).
"""

from typing import Optional
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request, Response
from fastapi.responses import JSONResponse

from app.config import settings


def get_user_identifier(request: Request) -> str:
    """Get rate limit key: authenticated user ID or IP address."""
    # Try to get user from auth header
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        try:
            import jwt as pyjwt
            token = auth.split(" ")[1]
            payload = pyjwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
            return f"user:{payload.get('sub', get_remote_address(request))}"
        except Exception:
            pass
    return get_remote_address(request)


def _get_storage_uri() -> str:
    """Determine rate limiter backend with graceful fallback to memory."""
    redis_url = getattr(settings, "REDIS_URL", None)
    if not redis_url or getattr(settings, "DEBUG", True):
        return "memory://"
    try:
        import redis
        client = redis.from_url(redis_url, socket_connect_timeout=1)
        client.ping()
        return redis_url
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(
            f"[RateLimiter] Redis unavailable at {redis_url}: {e}. Falling back to memory storage."
        )
        return "memory://"


def check_redis_connection() -> Optional[bool]:
    """Test Redis connectivity for readiness probe. Returns None if Redis not used."""
    redis_url = getattr(settings, "REDIS_URL", None)
    if not redis_url:
        return None
    try:
        import redis
        client = redis.from_url(redis_url, socket_connect_timeout=1)
        return bool(client.ping())
    except Exception:
        return False


limiter = Limiter(
    key_func=get_user_identifier,
    default_limits=[f"{settings.RATE_LIMIT_PER_MINUTE}/minute"],
    storage_uri=_get_storage_uri(),
)


async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """Custom response for rate limit exceeded."""
    return JSONResponse(
        status_code=429,
        content={
            "success": False,
            "data": None,
            "message": "Rate limit exceeded. Please try again later.",
            "error": f"Rate limit: {exc.detail}",
        },
    )
