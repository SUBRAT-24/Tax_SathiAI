"""
Analytics Service — aggregation queries for admin dashboards.
"""

from datetime import datetime, timedelta, timezone
from sqlalchemy import select, func, text, and_, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.chat import ChatSession, ChatMessage
from app.models.activity_log import ActivityLog
from app.models.feedback import QueryAnalytics, SecurityLog


class AnalyticsService:
    """Provides aggregated analytics data for admin dashboards."""

    async def get_overview(self, db: AsyncSession) -> dict:
        """Get platform overview stats."""
        # Total users
        total_users = await db.scalar(select(func.count(User.id)).where(User.role == "user"))

        # Active users (logged in within 30 days)
        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
        active_users = await db.scalar(
            select(func.count(User.id)).where(
                and_(User.last_login >= thirty_days_ago, User.role == "user")
            )
        )

        # Today's active users (DAU)
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0)
        dau = await db.scalar(
            select(func.count(func.distinct(ActivityLog.user_id))).where(
                ActivityLog.timestamp >= today_start
            )
        )

        # Total queries
        total_queries = await db.scalar(
            select(func.count(ChatMessage.id)).where(ChatMessage.role == "user")
        )

        # Total documents
        from app.models.document import KnowledgeBase
        total_kb_docs = await db.scalar(select(func.count(KnowledgeBase.id)))

        # Average confidence
        avg_confidence = await db.scalar(
            select(func.avg(ChatMessage.confidence_score)).where(
                ChatMessage.confidence_score.isnot(None)
            )
        )

        # Positive feedback ratio
        total_feedback = await db.scalar(
            select(func.count(ChatMessage.id)).where(ChatMessage.feedback.isnot(None))
        )
        positive_feedback = await db.scalar(
            select(func.count(ChatMessage.id)).where(ChatMessage.feedback == "thumbs_up")
        )

        return {
            "total_users": total_users or 0,
            "active_users_30d": active_users or 0,
            "dau": dau or 0,
            "total_queries": total_queries or 0,
            "total_kb_documents": total_kb_docs or 0,
            "avg_confidence": round(float(avg_confidence or 0), 2),
            "feedback_positive_ratio": round(
                (positive_feedback or 0) / max(total_feedback or 1, 1), 2
            ),
            "new_users_today": await self._count_new_users_today(db),
        }

    async def _count_new_users_today(self, db: AsyncSession) -> int:
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0)
        return await db.scalar(
            select(func.count(User.id)).where(User.created_at >= today_start)
        ) or 0

    async def get_query_analytics(self, db: AsyncSession, days: int = 30) -> dict:
        """Get query volume and intent distribution."""
        since = datetime.now(timezone.utc) - timedelta(days=days)

        # Query volume by day
        result = await db.execute(
            select(
                func.date(ChatMessage.timestamp).label("date"),
                func.count(ChatMessage.id).label("count"),
            ).where(
                and_(ChatMessage.role == "user", ChatMessage.timestamp >= since)
            ).group_by(func.date(ChatMessage.timestamp)).order_by("date")
        )
        daily_volume = [{"date": str(row.date), "count": row.count} for row in result.fetchall()]

        # Intent distribution
        result = await db.execute(
            select(
                ChatMessage.intent_tag,
                func.count(ChatMessage.id).label("count"),
            ).where(
                and_(ChatMessage.intent_tag.isnot(None), ChatMessage.timestamp >= since)
            ).group_by(ChatMessage.intent_tag).order_by(func.count(ChatMessage.id).desc())
        )
        intents = [{"intent": row.intent_tag, "count": row.count} for row in result.fetchall()]

        # Most asked questions
        result = await db.execute(
            select(ChatMessage.content, func.count(ChatMessage.id).label("count")).where(
                and_(ChatMessage.role == "user", ChatMessage.timestamp >= since)
            ).group_by(ChatMessage.content).order_by(func.count(ChatMessage.id).desc()).limit(10)
        )
        top_questions = [{"question": row.content[:100], "count": row.count} for row in result.fetchall()]

        return {
            "daily_volume": daily_volume,
            "intent_distribution": intents,
            "top_questions": top_questions,
        }

    async def get_usage_heatmap(self, db: AsyncSession, days: int = 30) -> list[dict]:
        """Get usage heatmap data (hour × day-of-week)."""
        since = datetime.now(timezone.utc) - timedelta(days=days)

        # Get activity counts by hour and day
        result = await db.execute(
            select(
                func.strftime('%w', ActivityLog.timestamp).label("day_of_week"),
                func.strftime('%H', ActivityLog.timestamp).label("hour"),
                func.count(ActivityLog.id).label("count"),
            ).where(ActivityLog.timestamp >= since)
            .group_by("day_of_week", "hour")
        )

        heatmap = []
        for row in result.fetchall():
            heatmap.append({
                "day": int(row.day_of_week),
                "hour": int(row.hour),
                "count": row.count,
            })

        return heatmap

    async def get_top_users(self, db: AsyncSession, limit: int = 10) -> list[dict]:
        """Get most active users."""
        result = await db.execute(
            select(
                ActivityLog.user_id,
                User.name,
                User.email,
                func.count(ActivityLog.id).label("activity_count"),
            ).join(User, ActivityLog.user_id == User.id)
            .group_by(ActivityLog.user_id, User.name, User.email)
            .order_by(func.count(ActivityLog.id).desc())
            .limit(limit)
        )

        return [
            {
                "user_id": row.user_id,
                "name": row.name,
                "email": row.email,
                "activity_count": row.activity_count,
            }
            for row in result.fetchall()
        ]


# Singleton
analytics_service = AnalyticsService()
