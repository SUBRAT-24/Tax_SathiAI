"""
Document models — User uploads and Admin knowledge base.
"""

from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, ForeignKey, Boolean, func
)
from app.database import Base


class Document(Base):
    """User-uploaded documents (GST returns, invoices, notices)."""
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    filename = Column(String(500), nullable=False)
    original_name = Column(String(500), nullable=False)
    s3_url = Column(String(1000), nullable=True)
    file_path = Column(String(1000), nullable=True)  # Local path (dev)
    file_type = Column(String(50), nullable=False)  # pdf, image
    file_size = Column(Integer, nullable=False)  # bytes
    processing_status = Column(String(50), default="pending", nullable=False)  # pending, processing, completed, failed
    chunks_count = Column(Integer, default=0)
    ocr_used = Column(Boolean, default=False)
    error_message = Column(Text, nullable=True)

    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    def __repr__(self):
        return f"<Document(id={self.id}, name='{self.original_name}', status='{self.processing_status}')>"


class KnowledgeBase(Base):
    """Admin-uploaded CBIC documents for RAG knowledge base."""
    __tablename__ = "knowledge_base"

    id = Column(Integer, primary_key=True, autoincrement=True)
    doc_name = Column(String(500), nullable=False)
    source_url = Column(String(1000), nullable=True)
    category = Column(String(100), nullable=True)  # circular, notification, act, rule
    description = Column(Text, nullable=True)
    file_path = Column(String(1000), nullable=True)
    s3_url = Column(String(1000), nullable=True)
    ingested_at = Column(DateTime, nullable=True)
    chunks_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True, nullable=False)
    version = Column(String(50), nullable=True)
    uploaded_by_admin = Column(Boolean, default=True)

    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    def __repr__(self):
        return f"<KnowledgeBase(id={self.id}, name='{self.doc_name}')>"
