"""
User model — supports two roles: 'user' and 'admin'.
Admin is never created via API — credentials come from .env.
"""

import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Enum, Text, func
)
from app.database import Base


class UserRole(str, enum.Enum):
    USER = "user"
    ADMIN = "admin"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.USER, nullable=False)

    # Profile
    gstin = Column(String(255), nullable=True)  # Encrypted
    pan = Column(String(255), nullable=True)  # Encrypted
    phone = Column(String(20), nullable=True)
    avatar_url = Column(String(500), nullable=True)

    # Status
    is_active = Column(Boolean, default=True, nullable=False)
    is_banned = Column(Boolean, default=False, nullable=False)
    ban_reason = Column(Text, nullable=True)
    is_email_verified = Column(Boolean, default=False, nullable=False)

    # Tracking
    last_login = Column(DateTime, nullable=True)
    login_count = Column(Integer, default=0)

    # OAuth
    google_id = Column(String(255), nullable=True, unique=True)

    # Timestamps
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', role='{self.role}')>"
