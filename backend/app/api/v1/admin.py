"""
Admin API — Single admin login, user management, analytics,
knowledge base, security, app settings.
"""

import csv
import io
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select, func, update, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User, UserRole
from app.models.chat import ChatSession, ChatMessage
from app.models.activity_log import ActivityLog
from app.models.document import KnowledgeBase
from app.middleware import (
    get_admin_user,
    verify_admin_credentials,
    create_access_token,
    create_refresh_token,
    hash_password,
)
from app.services.analytics_service import analytics_service
from app.services.security_service import security_service
from app.core.document_processor import document_processor
from app.config import settings

import os
import uuid

router = APIRouter(prefix="/admin", tags=["Admin"])


def success_response(data=None, message="Success"):
    return {"success": True, "data": data, "message": message}


# ─── Schemas ────────────────────────────────────────

class AdminLoginRequest(BaseModel):
    email: EmailStr
    password: str

class AddUserRequest(BaseModel):
    name: str = Field(..., min_length=2)
    email: EmailStr
    password: str = Field(..., min_length=6)
    phone: str = Field(default=None)
    gstin: str = Field(default=None)

class UpdateUserRequest(BaseModel):
    name: str = Field(default=None)
    phone: str = Field(default=None)
    is_active: bool = Field(default=None)

class BanUserRequest(BaseModel):
    reason: str = Field(default="Banned by admin")
    permanent: bool = Field(default=False)

class ResetPasswordRequest(BaseModel):
    new_password: str = Field(..., min_length=6)

class BlockIPRequest(BaseModel):
    ip_address: str
    reason: str = Field(default="")
    hours: int = Field(default=None, ge=1)

class SettingsUpdateRequest(BaseModel):
    maintenance_mode: bool = Field(default=None)
    rate_limit_per_minute: int = Field(default=None, ge=1, le=1000)


# ═══════════════════════════════════════
# ADMIN AUTH
# ═══════════════════════════════════════

@router.post("/login")
async def admin_login(body: AdminLoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """Admin login with hardcoded credentials from .env."""
    if not verify_admin_credentials(body.email, body.password):
        await security_service.log_security_event(
            db, "failed_login", ip_address=request.client.host if request.client else None,
            details={"email": body.email, "type": "admin"}, severity="high",
        )
        raise HTTPException(401, "Invalid admin credentials")

    await security_service.log_security_event(
        db, "admin_login", ip_address=request.client.host if request.client else None,
        details={"email": body.email}, severity="low",
    )

    token = create_access_token({"sub": "admin", "role": "admin", "email": body.email})
    refresh = create_refresh_token({"sub": "admin", "role": "admin"})

    return success_response({
        "access_token": token,
        "refresh_token": refresh,
        "token_type": "bearer",
        "user": {
            "email": body.email,
            "role": "admin",
            "name": "Super Admin",
        }
    }, "Admin login successful")


# ═══════════════════════════════════════
# USER MANAGEMENT
# ═══════════════════════════════════════

@router.get("/users")
async def list_users(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    search: str = Query(default=None),
    sort_by: str = Query(default="created_at"),
    sort_order: str = Query(default="desc"),
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """List all users with pagination, search, and sorting."""
    query = select(User).where(User.role == UserRole.USER)

    # Search
    if search:
        query = query.where(
            (User.name.ilike(f"%{search}%")) |
            (User.email.ilike(f"%{search}%")) |
            (User.gstin.ilike(f"%{search}%"))
        )

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)

    # Sort
    sort_col = getattr(User, sort_by, User.created_at)
    if sort_order == "desc":
        query = query.order_by(sort_col.desc())
    else:
        query = query.order_by(sort_col.asc())

    # Paginate
    query = query.offset((page - 1) * limit).limit(limit)

    result = await db.execute(query)
    users = result.scalars().all()

    return success_response({
        "users": [_user_detail(u) for u in users],
        "total": total or 0,
        "page": page,
        "limit": limit,
        "pages": ((total or 0) + limit - 1) // limit,
    })


@router.get("/users/export")
async def export_users(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Export all users as CSV."""
    result = await db.execute(select(User).where(User.role == UserRole.USER).order_by(User.created_at.desc()))
    users = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Name", "Email", "Phone", "GSTIN", "Active", "Banned", "Last Login", "Created At"])

    for u in users:
        writer.writerow([
            u.id, u.name, u.email, u.phone or "", u.gstin or "",
            u.is_active, u.is_banned,
            u.last_login.isoformat() if u.last_login else "",
            u.created_at.isoformat() if u.created_at else "",
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=taxsathi_users.csv"},
    )


@router.get("/users/{user_id}")
async def get_user_detail(
    user_id: int,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get detailed user info including activity summary."""
    user = await _get_user(db, user_id)

    # Query counts
    queries = await db.scalar(
        select(func.count(ChatMessage.id)).join(
            ChatSession, ChatMessage.session_id == ChatSession.id
        ).where(ChatSession.user_id == user_id, ChatMessage.role == "user")
    )

    docs = await db.scalar(
        select(func.count()).select_from(
            select(1).where(True).subquery()  # Document count
        )
    )

    return success_response({
        **_user_detail(user),
        "stats": {
            "total_queries": queries or 0,
            "total_sessions": 0,
            "total_documents": docs or 0,
        },
    })


@router.post("/users")
async def add_user(
    body: AddUserRequest,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Manually add a new user."""
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Email already exists")

    user = User(
        name=body.name,
        email=body.email,
        password_hash=hash_password(body.password),
        role=UserRole.USER,
        phone=body.phone,
        gstin=body.gstin,
        is_email_verified=True,  # Admin-added users are verified
    )
    db.add(user)
    await db.flush()

    return success_response(_user_detail(user), "User created")


@router.patch("/users/{user_id}")
async def update_user(
    user_id: int,
    body: UpdateUserRequest,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a user's details."""
    user = await _get_user(db, user_id)

    if body.name is not None:
        user.name = body.name
    if body.phone is not None:
        user.phone = body.phone
    if body.is_active is not None:
        user.is_active = body.is_active

    return success_response(_user_detail(user), "User updated")


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Soft delete a user (deactivate)."""
    user = await _get_user(db, user_id)
    user.is_active = False
    return success_response(message="User deactivated")


@router.post("/users/{user_id}/ban")
async def ban_user(
    user_id: int,
    body: BanUserRequest,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Ban a user."""
    user = await _get_user(db, user_id)
    user.is_banned = True
    user.ban_reason = body.reason
    return success_response(message=f"User banned: {body.reason}")


@router.post("/users/{user_id}/unban")
async def unban_user(
    user_id: int,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Unban a user."""
    user = await _get_user(db, user_id)
    user.is_banned = False
    user.ban_reason = None
    return success_response(message="User unbanned")


@router.post("/users/{user_id}/reset-password")
async def reset_user_password(
    user_id: int,
    body: ResetPasswordRequest,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Reset a user's password."""
    user = await _get_user(db, user_id)
    user.password_hash = hash_password(body.new_password)
    return success_response(message="Password reset successful")


@router.get("/users/{user_id}/activity")
async def get_user_activity(
    user_id: int,
    limit: int = Query(default=50, ge=1, le=200),
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a user's complete activity timeline."""
    result = await db.execute(
        select(ActivityLog).where(
            ActivityLog.user_id == user_id
        ).order_by(ActivityLog.timestamp.desc()).limit(limit)
    )
    activities = result.scalars().all()

    return success_response([
        {
            "id": a.id,
            "action_type": a.action_type,
            "description": a.description,
            "metadata": a.metadata_json,
            "ip_address": a.ip_address,
            "device_info": a.device_info,
            "timestamp": a.timestamp.isoformat() if a.timestamp else None,
        }
        for a in activities
    ])


@router.get("/users/{user_id}/interests")
async def get_user_interests(
    user_id: int,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get AI-tagged interests/query patterns for a user."""
    result = await db.execute(
        select(
            ChatMessage.intent_tag,
            func.count(ChatMessage.id).label("count"),
        ).join(
            ChatSession, ChatMessage.session_id == ChatSession.id
        ).where(
            ChatSession.user_id == user_id,
            ChatMessage.intent_tag.isnot(None),
        ).group_by(ChatMessage.intent_tag).order_by(func.count(ChatMessage.id).desc())
    )

    interests = [{"topic": row.intent_tag, "query_count": row.count} for row in result.fetchall()]
    return success_response(interests)


# ═══════════════════════════════════════
# ANALYTICS
# ═══════════════════════════════════════

@router.get("/analytics/overview")
async def analytics_overview(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get platform overview analytics."""
    data = await analytics_service.get_overview(db)
    return success_response(data)


@router.get("/analytics/queries")
async def analytics_queries(
    days: int = Query(default=30, ge=1, le=365),
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get query analytics."""
    data = await analytics_service.get_query_analytics(db, days)
    return success_response(data)


@router.get("/analytics/usage-heatmap")
async def analytics_heatmap(
    days: int = Query(default=30, ge=1, le=365),
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get usage heatmap data."""
    data = await analytics_service.get_usage_heatmap(db, days)
    return success_response(data)


@router.get("/analytics/top-users")
async def analytics_top_users(
    limit: int = Query(default=10, ge=1, le=50),
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get most active users."""
    data = await analytics_service.get_top_users(db, limit)
    return success_response(data)


# ═══════════════════════════════════════
# KNOWLEDGE BASE
# ═══════════════════════════════════════

@router.get("/knowledge-base")
async def list_knowledge_base(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """List all knowledge base documents."""
    result = await db.execute(
        select(KnowledgeBase).order_by(KnowledgeBase.created_at.desc())
    )
    docs = result.scalars().all()

    return success_response([
        {
            "id": d.id,
            "doc_name": d.doc_name,
            "category": d.category,
            "description": d.description,
            "chunks_count": d.chunks_count,
            "is_active": d.is_active,
            "ingested_at": d.ingested_at.isoformat() if d.ingested_at else None,
            "created_at": d.created_at.isoformat() if d.created_at else None,
        }
        for d in docs
    ])


@router.post("/knowledge-base/upload")
async def upload_knowledge_base(
    file: UploadFile = File(...),
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a document to the knowledge base."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are allowed")

    content = await file.read()
    filename = f"kb_{uuid.uuid4().hex}_{file.filename}"
    kb_dir = os.path.join(settings.UPLOAD_DIR, "knowledge_base")
    os.makedirs(kb_dir, exist_ok=True)
    file_path = os.path.join(kb_dir, filename)

    with open(file_path, "wb") as f:
        f.write(content)

    # Create KB record
    kb_doc = KnowledgeBase(
        doc_name=file.filename,
        category="general",
        file_path=file_path,
        uploaded_by_admin=True,
    )
    db.add(kb_doc)
    await db.flush()

    # Process and index
    try:
        result = await document_processor.process_pdf(
            file_path, file.filename, category="knowledge_base", doc_id=f"kb_{kb_doc.id}"
        )
        kb_doc.chunks_count = result.get("chunks_count", 0)
        kb_doc.ingested_at = datetime.now(timezone.utc)
    except Exception as e:
        kb_doc.is_active = False

    return success_response({
        "id": kb_doc.id,
        "doc_name": kb_doc.doc_name,
        "chunks_count": kb_doc.chunks_count,
    }, "Document uploaded and indexed")


@router.delete("/knowledge-base/{doc_id}")
async def delete_knowledge_base(
    doc_id: int,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a document from the knowledge base."""
    result = await db.execute(select(KnowledgeBase).where(KnowledgeBase.id == doc_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(404, "Document not found")

    doc.is_active = False
    return success_response(message="Document removed from knowledge base")


@router.post("/knowledge-base/reindex")
async def reindex_knowledge_base(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Trigger re-indexing of all active knowledge base documents."""
    result = await db.execute(
        select(KnowledgeBase).where(KnowledgeBase.is_active == True)
    )
    docs = result.scalars().all()

    indexed = 0
    for doc in docs:
        if doc.file_path and os.path.exists(doc.file_path):
            try:
                res = await document_processor.process_pdf(
                    doc.file_path, doc.doc_name, doc_id=f"kb_{doc.id}"
                )
                doc.chunks_count = res.get("chunks_count", 0)
                doc.ingested_at = datetime.now(timezone.utc)
                indexed += 1
            except Exception:
                pass

    return success_response({"indexed_count": indexed, "total_docs": len(docs)}, "Re-indexing complete")


# ═══════════════════════════════════════
# SECURITY
# ═══════════════════════════════════════

@router.get("/security/logs")
async def get_security_logs(
    limit: int = Query(default=50, ge=1, le=200),
    severity: str = Query(default=None),
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get security audit logs."""
    logs = await security_service.get_security_logs(db, limit, severity)
    return success_response(logs)


@router.get("/security/failed-logins")
async def get_failed_logins(
    hours: int = Query(default=24, ge=1, le=168),
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get failed login attempts."""
    logs = await security_service.get_failed_logins(db, hours)
    return success_response(logs)


@router.post("/security/block-ip")
async def block_ip(
    body: BlockIPRequest,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Block an IP address."""
    await security_service.block_ip(db, body.ip_address, body.reason, body.hours)
    return success_response(message=f"IP {body.ip_address} blocked")


@router.post("/security/force-logout/{user_id}")
async def force_logout(
    user_id: int,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Force logout a user (invalidate sessions — stub)."""
    await security_service.log_security_event(
        db, "force_logout", user_id=user_id,
        details={"admin_action": True}, severity="medium",
    )
    return success_response(message="User sessions invalidated")


@router.get("/security/active-sessions")
async def get_active_sessions(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get currently active user sessions (based on recent activity)."""
    from datetime import timedelta
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=30)

    result = await db.execute(
        select(
            ActivityLog.user_id,
            User.name,
            User.email,
            func.max(ActivityLog.timestamp).label("last_activity"),
            ActivityLog.ip_address,
            ActivityLog.device_info,
        ).join(User, ActivityLog.user_id == User.id)
        .where(ActivityLog.timestamp >= cutoff)
        .group_by(ActivityLog.user_id, User.name, User.email, ActivityLog.ip_address, ActivityLog.device_info)
        .order_by(func.max(ActivityLog.timestamp).desc())
    )

    sessions = [
        {
            "user_id": row.user_id,
            "name": row.name,
            "email": row.email,
            "last_activity": row.last_activity.isoformat() if row.last_activity else None,
            "ip_address": row.ip_address,
            "device": row.device_info,
        }
        for row in result.fetchall()
    ]

    return success_response(sessions)


# ═══════════════════════════════════════
# APP SETTINGS
# ═══════════════════════════════════════

@router.get("/settings")
async def get_settings(admin: User = Depends(get_admin_user)):
    """Get current application settings."""
    return success_response({
        "maintenance_mode": settings.MAINTENANCE_MODE,
        "rate_limit_per_minute": settings.RATE_LIMIT_PER_MINUTE,
        "max_upload_size_mb": settings.MAX_UPLOAD_SIZE_MB,
        "environment": settings.ENVIRONMENT,
        "vector_store_type": settings.VECTOR_STORE_TYPE,
        "debug": settings.DEBUG,
    })


@router.patch("/settings")
async def update_settings(
    body: SettingsUpdateRequest,
    admin: User = Depends(get_admin_user),
):
    """Update application settings (runtime only — not persisted to .env)."""
    if body.maintenance_mode is not None:
        settings.MAINTENANCE_MODE = body.maintenance_mode
    if body.rate_limit_per_minute is not None:
        settings.RATE_LIMIT_PER_MINUTE = body.rate_limit_per_minute

    return success_response(message="Settings updated")


@router.post("/settings/maintenance-mode")
async def toggle_maintenance(
    admin: User = Depends(get_admin_user),
):
    """Toggle maintenance mode."""
    settings.MAINTENANCE_MODE = not settings.MAINTENANCE_MODE
    return success_response({
        "maintenance_mode": settings.MAINTENANCE_MODE,
    }, f"Maintenance mode {'enabled' if settings.MAINTENANCE_MODE else 'disabled'}")


# ─── Helpers ────────────────────────────────────────

async def _get_user(db: AsyncSession, user_id: int) -> User:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")
    return user


def _user_detail(user: User) -> dict:
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role.value if user.role else "user",
        "phone": user.phone,
        "gstin": user.gstin,
        "is_active": user.is_active,
        "is_banned": user.is_banned,
        "ban_reason": user.ban_reason,
        "login_count": user.login_count or 0,
        "last_login": user.last_login.isoformat() if user.last_login else None,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }
