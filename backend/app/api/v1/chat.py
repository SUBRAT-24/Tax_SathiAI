"""
Chat API — RAG chatbot queries, WebSocket streaming, sessions, feedback, suggestions.
"""

import json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Request
from pydantic import BaseModel, Field
from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.models.chat import ChatSession, ChatMessage
from app.middleware import get_current_user, verify_token
from app.middleware.activity_tracker import log_query
from app.core.rag_pipeline import rag_pipeline
from app.core.llm_handler import llm_handler

router = APIRouter(prefix="/chat", tags=["Chat"])


def success_response(data=None, message="Success"):
    return {"success": True, "data": data, "message": message}


# ─── Schemas ────────────────────────────────────────

class QueryRequest(BaseModel):
    query: str = Field(..., min_length=3, max_length=2000)
    session_id: int = Field(default=None)

class FeedbackRequest(BaseModel):
    message_id: int
    feedback: str = Field(..., pattern="^(thumbs_up|thumbs_down)$")
    comment: str = Field(default=None, max_length=500)

class SessionRenameRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)


# ─── Endpoints ──────────────────────────────────────

@router.post("/query")
async def chat_query(
    body: QueryRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send a query to the RAG chatbot (non-streaming)."""
    # Get or create session
    session = await _get_or_create_session(db, current_user.id, body.session_id)

    # Get chat history for context
    history = await _get_session_history(db, session.id, limit=10)

    # Save user message
    user_msg = ChatMessage(
        session_id=session.id,
        role="user",
        content=body.query,
    )
    db.add(user_msg)
    await db.flush()

    # Run RAG pipeline
    result = await rag_pipeline.query(body.query, chat_history=history)

    # Save assistant response
    assistant_msg = ChatMessage(
        session_id=session.id,
        role="assistant",
        content=result["answer"],
        sources=result["sources"],
        confidence_score=result["confidence"],
        intent_tag=result["intent"],
        tokens_used=len(result["answer"].split()),
    )
    db.add(assistant_msg)

    # Update session title if first message
    if len(history) == 0:
        session.title = body.query[:80]

    # Log activity
    await log_query(db, current_user.id, body.query, request)

    # Generate suggestions
    suggestions = await llm_handler.generate_suggestions(body.query, result["answer"])

    return success_response({
        "session_id": session.id,
        "message_id": assistant_msg.id,
        "answer": result["answer"],
        "sources": result["sources"],
        "confidence": result["confidence"],
        "intent": result["intent"],
        "response_time_ms": result["response_time_ms"],
        "suggestions": suggestions,
    })


@router.websocket("/stream")
async def chat_stream(websocket: WebSocket):
    """WebSocket endpoint for streaming RAG responses."""
    await websocket.accept()

    try:
        # Authenticate via first message
        auth_msg = await websocket.receive_text()
        auth_data = json.loads(auth_msg)
        token = auth_data.get("token", "")

        try:
            payload = verify_token(token)
            user_id = int(payload.get("sub", 0))
        except Exception:
            await websocket.send_json({"type": "error", "data": "Authentication failed"})
            await websocket.close()
            return

        await websocket.send_json({"type": "connected", "data": "Authenticated successfully"})

        # Listen for queries
        while True:
            msg = await websocket.receive_text()
            data = json.loads(msg)

            if data.get("type") == "query":
                query = data.get("query", "")
                session_id = data.get("session_id")

                if not query or len(query) < 3:
                    await websocket.send_json({"type": "error", "data": "Query too short"})
                    continue

                # Stream the response
                async for chunk in rag_pipeline.query_stream(query):
                    await websocket.send_json(chunk)

            elif data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"type": "error", "data": str(e)})
        except Exception:
            pass


@router.get("/sessions")
async def list_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all chat sessions for the current user."""
    result = await db.execute(
        select(ChatSession).where(
            ChatSession.user_id == current_user.id,
            ChatSession.is_active == 1,
        ).order_by(ChatSession.updated_at.desc())
    )
    sessions = result.scalars().all()

    return success_response([
        {
            "id": s.id,
            "title": s.title,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "updated_at": s.updated_at.isoformat() if s.updated_at else None,
        }
        for s in sessions
    ])


@router.get("/sessions/{session_id}")
async def get_session_messages(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all messages in a chat session."""
    session = await _verify_session_ownership(db, session_id, current_user.id)

    result = await db.execute(
        select(ChatMessage).where(
            ChatMessage.session_id == session_id
        ).order_by(ChatMessage.timestamp.asc())
    )
    messages = result.scalars().all()

    return success_response({
        "session": {
            "id": session.id,
            "title": session.title,
            "created_at": session.created_at.isoformat() if session.created_at else None,
        },
        "messages": [
            {
                "id": m.id,
                "role": m.role,
                "content": m.content,
                "sources": m.sources,
                "confidence_score": m.confidence_score,
                "intent_tag": m.intent_tag,
                "feedback": m.feedback,
                "is_bookmarked": bool(m.is_bookmarked),
                "timestamp": m.timestamp.isoformat() if m.timestamp else None,
            }
            for m in messages
        ],
    })


@router.put("/sessions/{session_id}")
async def rename_session(
    session_id: int,
    body: SessionRenameRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Rename a chat session."""
    session = await _verify_session_ownership(db, session_id, current_user.id)
    session.title = body.title
    return success_response(message="Session renamed")


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete (soft) a chat session."""
    session = await _verify_session_ownership(db, session_id, current_user.id)
    session.is_active = 0
    return success_response(message="Session deleted")


@router.post("/feedback")
async def submit_feedback(
    body: FeedbackRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit feedback (thumbs up/down) on a message."""
    result = await db.execute(select(ChatMessage).where(ChatMessage.id == body.message_id))
    message = result.scalar_one_or_none()

    if not message:
        raise HTTPException(404, "Message not found")

    message.feedback = body.feedback
    message.feedback_comment = body.comment

    return success_response(message=f"Feedback '{body.feedback}' recorded")


@router.post("/bookmark/{message_id}")
async def toggle_bookmark(
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Toggle bookmark on a message."""
    result = await db.execute(select(ChatMessage).where(ChatMessage.id == message_id))
    message = result.scalar_one_or_none()

    if not message:
        raise HTTPException(404, "Message not found")

    message.is_bookmarked = 0 if message.is_bookmarked else 1
    return success_response({"bookmarked": bool(message.is_bookmarked)})


@router.get("/suggestions")
async def get_suggestions(current_user: User = Depends(get_current_user)):
    """Get suggested/common questions for the home screen."""
    return success_response([
        "How do I register for GST?",
        "What are the due dates for GSTR-3B filing?",
        "How to claim Input Tax Credit (ITC)?",
        "What is the GST rate for IT services?",
        "How to calculate late fee for delayed GST filing?",
        "What documents are required for GST registration?",
        "Explain the Composition Scheme under GST",
        "How does Reverse Charge Mechanism work?",
        "What is the threshold limit for GST registration?",
        "How to file GSTR-1 return?",
    ])


@router.get("/bookmarks")
async def get_bookmarks(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all bookmarked messages."""
    result = await db.execute(
        select(ChatMessage).join(
            ChatSession, ChatMessage.session_id == ChatSession.id
        ).where(
            ChatSession.user_id == current_user.id,
            ChatMessage.is_bookmarked == 1,
        ).order_by(ChatMessage.timestamp.desc())
    )
    messages = result.scalars().all()

    return success_response([
        {
            "id": m.id,
            "content": m.content,
            "sources": m.sources,
            "confidence_score": m.confidence_score,
            "timestamp": m.timestamp.isoformat() if m.timestamp else None,
        }
        for m in messages
    ])


# ─── Helpers ────────────────────────────────────────

async def _get_or_create_session(db: AsyncSession, user_id: int, session_id: int = None) -> ChatSession:
    """Get existing or create new chat session."""
    if session_id:
        result = await db.execute(
            select(ChatSession).where(
                ChatSession.id == session_id,
                ChatSession.user_id == user_id,
            )
        )
        session = result.scalar_one_or_none()
        if session:
            return session

    session = ChatSession(user_id=user_id, title="New Chat")
    db.add(session)
    await db.flush()
    return session


async def _get_session_history(db: AsyncSession, session_id: int, limit: int = 10) -> list[dict]:
    """Get recent messages from a session for context."""
    result = await db.execute(
        select(ChatMessage).where(
            ChatMessage.session_id == session_id
        ).order_by(ChatMessage.timestamp.desc()).limit(limit)
    )
    messages = result.scalars().all()
    return [
        {"role": m.role, "content": m.content}
        for m in reversed(messages)
    ]


async def _verify_session_ownership(db: AsyncSession, session_id: int, user_id: int) -> ChatSession:
    """Verify the user owns the session."""
    result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == session_id,
            ChatSession.user_id == user_id,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Session not found")
    return session
