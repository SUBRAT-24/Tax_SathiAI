"""
Chat models — ChatSession and ChatMessage.
Supports named sessions, feedback, confidence scores, and source citations.
"""

from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Float, DateTime, ForeignKey, JSON, func
)
from app.database import Base


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), default="New Chat", nullable=False)
    is_active = Column(Integer, default=1, nullable=False)

    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self):
        return f"<ChatSession(id={self.id}, title='{self.title}')>"


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # 'user' or 'assistant'
    content = Column(Text, nullable=False)

    # RAG metadata
    sources = Column(JSON, nullable=True)  # [{doc_name, section, page, relevance_score}]
    confidence_score = Column(Float, nullable=True)  # 0.0 - 1.0
    intent_tag = Column(String(100), nullable=True)  # e.g., "ITC query", "filing deadline"
    tokens_used = Column(Integer, nullable=True)

    # Feedback
    feedback = Column(String(20), nullable=True)  # 'thumbs_up', 'thumbs_down', null
    feedback_comment = Column(Text, nullable=True)

    # Bookmarking
    is_bookmarked = Column(Integer, default=0, nullable=False)

    timestamp = Column(DateTime, server_default=func.now(), nullable=False)

    def __repr__(self):
        return f"<ChatMessage(id={self.id}, role='{self.role}', session={self.session_id})>"
