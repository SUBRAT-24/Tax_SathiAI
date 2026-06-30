"""
Rate Limiter Middleware — slowapi-based rate limiting.
30 requests/minute per user (configurable via settings).
"""

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


limiter = Limiter(
    key_func=get_user_identifier,
    default_limits=[f"{settings.RATE_LIMIT_PER_MINUTE}/minute"],
    storage_uri=settings.REDIS_URL if not settings.DEBUG else "memory://",
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
