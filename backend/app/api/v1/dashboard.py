"""
Dashboard API — User stats, deadlines, compliance score.
"""

from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.models.chat import ChatSession, ChatMessage
from app.models.document import Document
from app.middleware import get_current_user
from app.services.gst_validator import get_gst_due_dates

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


def success_response(data=None, message="Success"):
    return {"success": True, "data": data, "message": message}


@router.get("/stats")
async def get_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get user's dashboard stats."""
    # Total queries
    total_queries = await db.scalar(
        select(func.count(ChatMessage.id)).join(
            ChatSession, ChatMessage.session_id == ChatSession.id
        ).where(
            ChatSession.user_id == current_user.id,
            ChatMessage.role == "user",
        )
    )

    # Total sessions
    total_sessions = await db.scalar(
        select(func.count(ChatSession.id)).where(
            ChatSession.user_id == current_user.id
        )
    )

    # Documents uploaded
    total_docs = await db.scalar(
        select(func.count(Document.id)).where(
            Document.user_id == current_user.id
        )
    )

    # Bookmarked answers
    bookmarks = await db.scalar(
        select(func.count(ChatMessage.id)).join(
            ChatSession, ChatMessage.session_id == ChatSession.id
        ).where(
            ChatSession.user_id == current_user.id,
            ChatMessage.is_bookmarked == 1,
        )
    )

    # Average confidence of responses
    avg_confidence = await db.scalar(
        select(func.avg(ChatMessage.confidence_score)).join(
            ChatSession, ChatMessage.session_id == ChatSession.id
        ).where(
            ChatSession.user_id == current_user.id,
            ChatMessage.confidence_score.isnot(None),
        )
    )

    return success_response({
        "total_queries": total_queries or 0,
        "total_sessions": total_sessions or 0,
        "total_documents": total_docs or 0,
        "bookmarked_answers": bookmarks or 0,
        "avg_confidence": round(float(avg_confidence or 0), 2),
        "member_since": current_user.created_at.isoformat() if current_user.created_at else None,
    })


@router.get("/deadlines")
async def get_deadlines(
    current_user: User = Depends(get_current_user),
):
    """Get upcoming GST filing deadlines."""
    today = datetime.now(timezone.utc).date()
    due_dates = get_gst_due_dates(today.month, today.year)

    # Filter to upcoming dates and sort
    upcoming = []
    for dd in due_dates:
        try:
            due = datetime.strptime(dd["due_date"], "%Y-%m-%d").date()
            days_left = (due - today).days
            if days_left >= -7:  # Show past 7 days too
                upcoming.append({
                    **dd,
                    "days_left": days_left,
                    "status": "overdue" if days_left < 0 else "upcoming" if days_left <= 7 else "future",
                })
        except ValueError:
            continue

    upcoming.sort(key=lambda x: x["days_left"])
    return success_response(upcoming)


@router.get("/compliance-score")
async def get_compliance_score(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Calculate user's estimated compliance score."""
    # Score based on:
    # - Profile completeness (GSTIN, PAN)
    # - Regular queries (shows engagement)
    # - Document uploads

    score = 40  # Base score

    if current_user.gstin:
        score += 20
    if current_user.pan:
        score += 10
    if current_user.phone:
        score += 5

    # Engagement bonus
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    recent_queries = await db.scalar(
        select(func.count(ChatMessage.id)).join(
            ChatSession, ChatMessage.session_id == ChatSession.id
        ).where(
            ChatSession.user_id == current_user.id,
            ChatMessage.role == "user",
            ChatMessage.timestamp >= thirty_days_ago,
        )
    )
    if (recent_queries or 0) >= 10:
        score += 15
    elif (recent_queries or 0) >= 5:
        score += 10
    elif (recent_queries or 0) >= 1:
        score += 5

    # Document bonus
    docs = await db.scalar(
        select(func.count(Document.id)).where(Document.user_id == current_user.id)
    )
    if (docs or 0) >= 1:
        score += 10

    return success_response({
        "score": min(score, 100),
        "max_score": 100,
        "breakdown": {
            "profile_completeness": min(35, 20 + (10 if current_user.pan else 0) + (5 if current_user.phone else 0)),
            "gstin_verified": 20 if current_user.gstin else 0,
            "engagement": min(15, (recent_queries or 0) * 3),
            "documents": min(10, (docs or 0) * 5),
            "base": 40,
        },
        "tips": _get_compliance_tips(current_user, recent_queries or 0, docs or 0),
    })


def _get_compliance_tips(user, queries, docs):
    tips = []
    if not user.gstin:
        tips.append("Add your GSTIN to improve compliance tracking")
    if not user.pan:
        tips.append("Add your PAN for identity verification")
    if queries < 5:
        tips.append("Ask more queries to stay updated on GST rules")
    if docs == 0:
        tips.append("Upload your GST returns for better insights")
    if not tips:
        tips.append("Great job! You're well-compliant. Keep monitoring deadlines.")
    return tips
