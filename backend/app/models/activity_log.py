"""
ActivityLog model — tracks every user action silently.
Used by admin to view per-user timelines and platform activity.
"""

from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, ForeignKey, JSON, func
)
from app.database import Base


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action_type = Column(String(100), nullable=False, index=True)
    # Action types: login, logout, query, upload, download, profile_update,
    # password_change, session_create, bookmark, feedback, tool_use, etc.
    description = Column(Text, nullable=True)
    metadata_json = Column(JSON, nullable=True)  # Extra context
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    device_info = Column(String(255), nullable=True)

    timestamp = Column(DateTime, server_default=func.now(), nullable=False, index=True)

    def __repr__(self):
        return f"<ActivityLog(id={self.id}, user={self.user_id}, action='{self.action_type}')>"
