"""
JWT Authentication Middleware
Handles token verification, role checking, and admin guard.
"""

import asyncio
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
import bcrypt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.user import User, UserRole

security = HTTPBearer(auto_error=False)
_BCRYPT_ROUNDS = 10


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(data: dict) -> str:
    """Create a JWT refresh token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def verify_token(token: str, token_type: str = "access") -> dict:
    """Verify and decode a JWT token."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("type") != token_type:
            raise HTTPException(status_code=401, detail="Invalid token type")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def hash_password(password: str) -> str:
    """Hash a password using bcrypt (cost 10 for responsive auth on constrained CPUs)."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=_BCRYPT_ROUNDS)).decode("utf-8")


async def hash_password_async(password: str) -> str:
    """Hash a password off the asyncio event loop."""
    return await asyncio.to_thread(hash_password, password)


def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its bcrypt hash."""
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))


async def verify_password_async(password: str, hashed: str) -> bool:
    """Verify a password off the asyncio event loop."""
    return await asyncio.to_thread(verify_password, password, hashed)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Dependency: extracts and validates the current user from JWT."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication required")

    payload = verify_token(credentials.credentials)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    # Env-backed Super Admin token ("sub": "admin", "role": "admin")
    if user_id == "admin" and payload.get("role") == "admin":
        return User(
            id=0,
            name="Super Admin",
            email=payload.get("email") or settings.ADMIN_EMAIL,
            password_hash="",
            role=UserRole.ADMIN,
            is_active=True,
            is_banned=False,
        )

    try:
        uid = int(user_id)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    result = await db.execute(select(User).where(User.id == uid))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account deactivated")
    if user.is_banned:
        raise HTTPException(status_code=403, detail=f"Account banned: {user.ban_reason or 'Contact admin'}")

    return user


async def get_admin_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Dependency: ensures the current user is an admin."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


def verify_admin_credentials(email: str, password: str) -> bool:
    """Verify admin credentials against environment variables."""
    if email.strip().lower() != settings.ADMIN_EMAIL.strip().lower():
        return False
    password_hash = settings.ADMIN_PASSWORD_HASH
    if not password_hash:
        return False  # ADMIN_PASSWORD not configured
    return verify_password(password, password_hash)


async def verify_admin_credentials_async(email: str, password: str) -> bool:
    """Verify admin credentials off the asyncio event loop."""
    return await asyncio.to_thread(verify_admin_credentials, email, password)

