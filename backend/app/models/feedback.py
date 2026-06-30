"""
Analytics and Security models.
"""

from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Float, DateTime, ForeignKey, JSON, func
)
from app.database import Base


class QueryAnalytics(Base):
    """Tracks query performance, intent classification, and feedback for analytics."""
    __tablename__ = "query_analytics"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    query_text = Column(Text, nullable=False)
    intent_tag = Column(String(100), nullable=True)
    response_time_ms = Column(Integer, nullable=True)
    confidence_score = Column(Float, nullable=True)
    feedback = Column(String(20), nullable=True)
    sources_count = Column(Integer, default=0)

    created_at = Column(DateTime, server_default=func.now(), nullable=False, index=True)


class SecurityLog(Base):
    """Security events: failed logins, suspicious activity, admin actions."""
    __tablename__ = "security_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    event_type = Column(String(100), nullable=False, index=True)
    # Event types: failed_login, successful_login, password_reset,
    # user_banned, ip_blocked, force_logout, admin_action
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    ip_address = Column(String(45), nullable=True)
    details = Column(JSON, nullable=True)
    severity = Column(String(20), default="low", nullable=False)  # low, medium, high, critical

    timestamp = Column(DateTime, server_default=func.now(), nullable=False, index=True)
