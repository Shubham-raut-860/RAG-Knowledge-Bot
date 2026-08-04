import uuid
import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from models import ChatRequest, EditMessageRequest, ChatResponse, ChatHistoryResponse, MessageRecord, SourceDoc
from auth import get_current_user
from database import db_cursor
from rag_pipeline import retrieve_context, generate_answer_stream

import time
import tiktoken
from config import get_settings

settings = get_settings()
router = APIRouter(prefix="/chat", tags=["chat"])

def _record_telemetry(session_id: str, latency_ms: float, total_tokens: int):
    with db_cursor() as cur:
        cur.execute(
            "INSERT INTO telemetry (session_id, query_latency_ms, total_tokens) VALUES (?, ?, ?)",
            (session_id, latency_ms, total_tokens)
        )


def _get_or_create_session(session_id: Optional[str], user_id: int) -> str:
    if not session_id:
        session_id = str(uuid.uuid4())
        with db_cursor() as cur:
            cur.execute(
                "INSERT INTO chat_sessions (session_id, user_id) VALUES (?, ?)",
                (session_id, user_id),
            )
        return session_id

    with db_cursor() as cur:
        cur.execute(
            "SELECT id FROM chat_sessions WHERE session_id = ? AND user_id = ?",
            (session_id, user_id),
        )
        row = cur.fetchone()
    if not row:
        # Session doesn't exist or belongs to another user — create a new one for this user
        with db_cursor() as cur:
            cur.execute(
                "INSERT OR IGNORE INTO chat_sessions (session_id, user_id) VALUES (?, ?)",
                (session_id, user_id),
            )
            # If INSERT was ignored, session belongs to someone else
            if cur.rowcount == 0:
                raise HTTPException(status_code=403, detail="Session belongs to another user")
    return session_id


def _load_history(session_id: str) -> list:
    with db_cursor() as cur:
        cur.execute(
            "SELECT role, content FROM chat_messages WHERE session_id = ? ORDER BY id ASC LIMIT 20",
            (session_id,),
        )
        return [{"role": r["role"], "content": r["content"]} for r in cur.fetchall()]


def _save_message(session_id: str, role: str, content: str, sources: Optional[list] = None) -> None:
    sources_json = json.dumps(sources) if sources else None
    with db_cursor() as cur:
        cur.execute(
            "INSERT INTO chat_messages (session_id, role, content, sources) VALUES (?, ?, ?, ?)",
            (session_id, role, content, sources_json),
        )


@router.post("")
def chat(body: ChatRequest, user: dict = Depends(get_current_user)):
    user_id = user.get("user_id", 0)
    session_id = _get_or_create_session(body.session_id, user_id)
    history = _load_history(session_id)

    context, raw_sources = retrieve_context(body.message)
    _save_message(session_id, "user", body.message)

    def event_stream():
        # First event: metadata with session_id and sources
        sources = [{"filename": s["filename"], "content_preview": s["content_preview"]} for s in raw_sources]
        meta_data = {"session_id": session_id, "sources": sources}
        yield f"data: {json.dumps({'meta': meta_data})}\n\n"

        start_time = time.time()
        full_answer = []
        try:
            for chunk in generate_answer_stream(body.message, context, history):
                full_answer.append(chunk)
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

        # Save final accumulated message
        final_answer = "".join(full_answer)
        if final_answer:
            _save_message(session_id, "assistant", final_answer, raw_sources)
            
            latency_ms = (time.time() - start_time) * 1000
            try:
                encoding = tiktoken.encoding_for_model(settings.azure_chat_deployment)
            except KeyError:
                encoding = tiktoken.get_encoding("cl100k_base")
            total_tokens = len(encoding.encode(body.message + context + final_answer))
            _record_telemetry(session_id, latency_ms, total_tokens)
            
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.get("/history/{session_id}", response_model=ChatHistoryResponse)
def get_history(session_id: str, user: dict = Depends(get_current_user)):
    # Verify session belongs to this user
    with db_cursor() as cur:
        cur.execute(
            "SELECT id FROM chat_sessions WHERE session_id = ? AND user_id = ?",
            (session_id, user.get("user_id", 0)),
        )
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Session not found")
    with db_cursor() as cur:
        cur.execute(
            "SELECT id, role, content, sources, created_at FROM chat_messages WHERE session_id = ? ORDER BY id ASC",
            (session_id,),
        )
        rows = cur.fetchall()

    messages = []
    for r in rows:
        sources = None
        if r["sources"]:
            try:
                raw = json.loads(r["sources"])
                sources = [SourceDoc(**s) for s in raw]
            except Exception:
                sources = None
        messages.append(MessageRecord(id=r["id"], role=r["role"], content=r["content"], sources=sources, created_at=r["created_at"]))

    return ChatHistoryResponse(session_id=session_id, messages=messages)


@router.put("/messages/{message_id}")
def edit_message(message_id: int, body: EditMessageRequest, user: dict = Depends(get_current_user)):
    user_id = user.get("user_id", 0)
    
    with db_cursor() as cur:
        cur.execute(
            "SELECT cm.session_id FROM chat_messages cm "
            "JOIN chat_sessions cs ON cm.session_id = cs.session_id "
            "WHERE cm.id = ? AND cs.user_id = ? AND cm.role = 'user'",
            (message_id, user_id)
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Message not found")
        session_id = row["session_id"]
        
        cur.execute("UPDATE chat_messages SET content = ? WHERE id = ?", (body.message, message_id))
        cur.execute("DELETE FROM chat_messages WHERE session_id = ? AND id > ?", (session_id, message_id))
        
    history = _load_history(session_id)
    context, raw_sources = retrieve_context(body.message)

    def event_stream():
        sources = [{"filename": s["filename"], "content_preview": s["content_preview"]} for s in raw_sources]
        meta_data = {"session_id": session_id, "sources": sources}
        yield f"data: {json.dumps({'meta': meta_data})}\n\n"

        start_time = time.time()
        full_answer = []
        try:
            for chunk in generate_answer_stream(body.message, context, history):
                full_answer.append(chunk)
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

        final_answer = "".join(full_answer)
        if final_answer:
            _save_message(session_id, "assistant", final_answer, raw_sources)
            
            latency_ms = (time.time() - start_time) * 1000
            try:
                encoding = tiktoken.encoding_for_model(settings.azure_chat_deployment)
            except KeyError:
                encoding = tiktoken.get_encoding("cl100k_base")
            total_tokens = len(encoding.encode(body.message + context + final_answer))
            _record_telemetry(session_id, latency_ms, total_tokens)
            
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.get("/sessions")
def list_sessions(user: dict = Depends(get_current_user)):
    with db_cursor() as cur:
        cur.execute(
            "SELECT session_id, created_at FROM chat_sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
            (user.get("user_id", 0),),
        )
        return [{"session_id": r["session_id"], "created_at": r["created_at"]} for r in cur.fetchall()]


@router.delete("/sessions/{session_id}")
def delete_session(session_id: str, user: dict = Depends(get_current_user)):
    user_id = user.get("user_id", 0)
    with db_cursor() as cur:
        cur.execute(
            "SELECT id FROM chat_sessions WHERE session_id = ? AND user_id = ?",
            (session_id, user_id),
        )
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Session not found")
    with db_cursor() as cur:
        cur.execute("DELETE FROM chat_messages WHERE session_id = ?", (session_id,))
        cur.execute(
            "DELETE FROM chat_sessions WHERE session_id = ? AND user_id = ?",
            (session_id, user_id),
        )
    return {"deleted": True, "session_id": session_id}