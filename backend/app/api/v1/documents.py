"""
Documents API — upload, list, delete, processing status.
"""

import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.models.document import Document
from app.middleware import get_current_user
from app.middleware.activity_tracker import log_upload
from app.config import settings
from app.core.document_processor import document_processor

router = APIRouter(prefix="/documents", tags=["Documents"])


def success_response(data=None, message="Success"):
    return {"success": True, "data": data, "message": message}


@router.post("/upload")
async def upload_document(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a PDF document."""
    # Validate file type
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are allowed")

    # Validate file size
    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(400, f"File size exceeds {settings.MAX_UPLOAD_SIZE_MB}MB limit")

    # Save file
    filename = f"{uuid.uuid4().hex}_{file.filename}"
    upload_dir = os.path.join(settings.UPLOAD_DIR, str(current_user.id))
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, filename)

    with open(file_path, "wb") as f:
        f.write(content)

    # Create document record
    doc = Document(
        user_id=current_user.id,
        filename=filename,
        original_name=file.filename,
        file_path=file_path,
        file_type="pdf",
        file_size=len(content),
        processing_status="processing",
    )
    db.add(doc)
    await db.flush()

    # Process document (in production, this would be a Celery task)
    try:
        result = await document_processor.process_pdf(
            file_path, file.filename, doc_id=str(doc.id)
        )
        doc.processing_status = "completed" if result["success"] else "failed"
        doc.chunks_count = result.get("chunks_count", 0)
        doc.ocr_used = result.get("ocr_used", False)
        if not result["success"]:
            doc.error_message = result.get("error", "Processing failed")
    except Exception as e:
        doc.processing_status = "failed"
        doc.error_message = str(e)

    await log_upload(db, current_user.id, file.filename, request)

    return success_response({
        "id": doc.id,
        "filename": doc.original_name,
        "status": doc.processing_status,
        "chunks_count": doc.chunks_count,
        "ocr_used": doc.ocr_used,
    }, "Document uploaded and processed")


@router.get("/list")
async def list_documents(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all documents uploaded by the current user."""
    result = await db.execute(
        select(Document).where(
            Document.user_id == current_user.id
        ).order_by(Document.created_at.desc())
    )
    docs = result.scalars().all()

    return success_response([
        {
            "id": d.id,
            "filename": d.original_name,
            "file_size": d.file_size,
            "status": d.processing_status,
            "chunks_count": d.chunks_count,
            "ocr_used": d.ocr_used,
            "created_at": d.created_at.isoformat() if d.created_at else None,
        }
        for d in docs
    ])


@router.get("/status/{doc_id}")
async def get_document_status(
    doc_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get document processing status."""
    result = await db.execute(
        select(Document).where(
            Document.id == doc_id,
            Document.user_id == current_user.id,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(404, "Document not found")

    return success_response({
        "id": doc.id,
        "filename": doc.original_name,
        "status": doc.processing_status,
        "chunks_count": doc.chunks_count,
        "error_message": doc.error_message,
    })


@router.delete("/{doc_id}")
async def delete_document(
    doc_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a document."""
    result = await db.execute(
        select(Document).where(
            Document.id == doc_id,
            Document.user_id == current_user.id,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(404, "Document not found")

    # Delete file from disk
    if doc.file_path and os.path.exists(doc.file_path):
        os.remove(doc.file_path)

    await db.delete(doc)
    return success_response(message="Document deleted")
