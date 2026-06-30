"""
Auth API — User registration, login, logout, refresh, password reset.
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User, UserRole
from app.middleware import (
    create_access_token,
    create_refresh_token,
    verify_token,
    hash_password,
    verify_password,
    get_current_user,
)
from app.middleware.activity_tracker import log_login, log_logout, log_activity
from app.services.security_service import security_service

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ─── Request / Response Schemas ─────────────────────

class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=100)
    phone: str = Field(default=None, max_length=20)
    gstin: str = Field(default=None, max_length=15)

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RefreshRequest(BaseModel):
    refresh_token: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=6)

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)


def success_response(data=None, message="Success"):
    return {"success": True, "data": data, "message": message}


# ─── Endpoints ──────────────────────────────────────

@router.post("/register")
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register a new user account."""
    # Check if email exists
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Email already registered")

    user = User(
        name=body.name,
        email=body.email,
        password_hash=hash_password(body.password),
        role=UserRole.USER,
        phone=body.phone,
        gstin=body.gstin,
    )
    db.add(user)
    await db.flush()

    tokens = _create_tokens(user)

    return success_response({
        "user": _user_to_dict(user),
        **tokens,
    }, "Registration successful")


@router.post("/login")
async def login(body: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """Login with email and password."""
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.password_hash):
        # Log failed login
        await security_service.log_security_event(
            db, "failed_login",
            ip_address=request.client.host if request.client else None,
            details={"email": body.email},
            severity="medium",
        )
        raise HTTPException(401, "Invalid email or password")

    if not user.is_active:
        raise HTTPException(403, "Account has been deactivated")

    if user.is_banned:
        raise HTTPException(403, f"Account banned: {user.ban_reason or 'Contact admin'}")

    # Update last login
    user.last_login = datetime.now(timezone.utc)
    user.login_count = (user.login_count or 0) + 1

    await log_login(db, user.id, request)
    tokens = _create_tokens(user)

    return success_response({
        "user": _user_to_dict(user),
        **tokens,
    }, "Login successful")


@router.post("/logout")
async def logout(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Logout the current user."""
    await log_logout(db, current_user.id, request)
    return success_response(message="Logged out successfully")


@router.post("/refresh")
async def refresh_token(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    """Refresh the access token using a refresh token."""
    payload = verify_token(body.refresh_token, token_type="refresh")
    user_id = payload.get("sub")

    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(401, "Invalid refresh token")

    tokens = _create_tokens(user)
    return success_response(tokens, "Token refreshed")


@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user profile."""
    return success_response(_user_to_dict(current_user))


@router.put("/me")
async def update_profile(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update user profile."""
    body = await request.json()

    if "name" in body:
        current_user.name = body["name"]
    if "phone" in body:
        current_user.phone = body["phone"]
    if "gstin" in body:
        current_user.gstin = body["gstin"]
    if "pan" in body:
        current_user.pan = body["pan"]

    await log_activity(db, current_user.id, "profile_update", "Updated profile", request=request)
    return success_response(_user_to_dict(current_user), "Profile updated")


@router.post("/change-password")
async def change_password(
    body: ChangePasswordRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Change password for current user."""
    if not verify_password(body.current_password, current_user.password_hash):
        raise HTTPException(400, "Current password is incorrect")

    current_user.password_hash = hash_password(body.new_password)
    await log_activity(db, current_user.id, "password_change", "Changed password", request=request)
    return success_response(message="Password changed successfully")


@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    """Send password reset email (stub — returns token for now)."""
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user:
        # Don't reveal if email exists
        return success_response(message="If the email exists, a reset link has been sent")

    # In production, send email with token
    reset_token = create_access_token({"sub": str(user.id), "purpose": "reset"})
    return success_response({"reset_token": reset_token}, "Reset token generated")


@router.post("/reset-password")
async def reset_password(body: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    """Reset password using token."""
    payload = verify_token(body.token)
    if payload.get("purpose") != "reset":
        raise HTTPException(400, "Invalid reset token")

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(404, "User not found")

    user.password_hash = hash_password(body.new_password)
    return success_response(message="Password reset successful")


# ─── Helpers ────────────────────────────────────────

def _create_tokens(user: User) -> dict:
    return {
        "access_token": create_access_token({"sub": str(user.id), "role": user.role.value}),
        "refresh_token": create_refresh_token({"sub": str(user.id)}),
        "token_type": "bearer",
    }


def _user_to_dict(user: User) -> dict:
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role.value if user.role else "user",
        "phone": user.phone,
        "gstin": user.gstin,
        "is_active": user.is_active,
        "last_login": user.last_login.isoformat() if user.last_login else None,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }
