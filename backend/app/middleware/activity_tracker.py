"""
Activity Tracker Middleware — silently logs every user action.
Provides helper functions for logging various action types.
"""

from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Request

from app.models.activity_log import ActivityLog


async def log_activity(
    db: AsyncSession,
    user_id: Optional[int],
    action_type: str,
    description: str = "",
    metadata_json: dict = None,
    request: Optional[Request] = None,
):
    """Log a user activity to the database."""
    ip_address = None
    user_agent = None

    if request:
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("User-Agent", "")[:500]

    activity = ActivityLog(
        user_id=user_id,
        action_type=action_type,
        description=description,
        metadata_json=metadata_json or {},
        ip_address=ip_address,
        user_agent=user_agent,
        device_info=_parse_device_info(user_agent) if user_agent else None,
    )
    db.add(activity)
    # Don't commit here — let the request's session handle it


def _parse_device_info(user_agent: str) -> str:
    """Extract basic device info from User-Agent string."""
    ua = user_agent.lower()
    if "mobile" in ua or "android" in ua or "iphone" in ua:
        return "mobile"
    elif "tablet" in ua or "ipad" in ua:
        return "tablet"
    return "desktop"


# Convenience functions for common action types
async def log_login(db: AsyncSession, user_id: int, request: Request):
    await log_activity(db, user_id, "login", "User logged in", request=request)


async def log_logout(db: AsyncSession, user_id: int, request: Request):
    await log_activity(db, user_id, "logout", "User logged out", request=request)


async def log_query(db: AsyncSession, user_id: int, query: str, request: Request = None):
    await log_activity(
        db, user_id, "query",
        f"Asked: {query[:100]}...",
        metadata_json={"query_preview": query[:200]},
        request=request,
    )


async def log_upload(db: AsyncSession, user_id: int, filename: str, request: Request = None):
    await log_activity(
        db, user_id, "upload",
        f"Uploaded: {filename}",
        metadata_json={"filename": filename},
        request=request,
    )


async def log_tool_use(db: AsyncSession, user_id: int, tool_name: str, request: Request = None):
    await log_activity(
        db, user_id, "tool_use",
        f"Used tool: {tool_name}",
        metadata_json={"tool": tool_name},
        request=request,
    )
