import os

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from models import DocumentRecord, DeleteDocResponse
from auth import require_admin, RequireScope
from database import db_cursor
from rag_pipeline import delete_document_chunks
from config import get_settings
from typing import List

settings = get_settings()
router = APIRouter(prefix="/admin", tags=["admin"])


class RoleUpdate(BaseModel):
    role: str


@router.get("/documents", response_model=List[DocumentRecord])
def list_documents(user: dict = Depends(RequireScope("docs:read"))):
    with db_cursor() as cur:
        cur.execute(
            "SELECT id, original_name, chunk_count, uploaded_by, uploaded_at, status FROM documents ORDER BY uploaded_at DESC"
        )
        return [dict(r) for r in cur.fetchall()]


@router.delete("/documents/{doc_id}", response_model=DeleteDocResponse)
def delete_document(doc_id: int, user: dict = Depends(RequireScope("docs:write"))):
    with db_cursor() as cur:
        cur.execute("SELECT id, filename FROM documents WHERE id = ?", (doc_id,))
        row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Document not found")

    delete_document_chunks(doc_id)

    # Clean up the physical file from disk
    file_path = os.path.join(settings.upload_dir, row["filename"])
    if os.path.exists(file_path):
        os.remove(file_path)

    with db_cursor() as cur:
        cur.execute("DELETE FROM documents WHERE id = ?", (doc_id,))

    return DeleteDocResponse(deleted=True, message=f"Deleted doc_id={doc_id} and all its chunks")


@router.get("/users")
def list_users(user: dict = Depends(RequireScope("users:manage"))):
    with db_cursor() as cur:
        cur.execute("SELECT id, username, role, created_at FROM users ORDER BY created_at DESC")
        return [dict(r) for r in cur.fetchall()]


@router.post("/users/{user_id}/role")
def set_user_role(user_id: int, body: RoleUpdate, user: dict = Depends(RequireScope("users:manage"))):
    if body.role not in ("admin", "user"):
        raise HTTPException(status_code=422, detail="role must be 'admin' or 'user'")
    # Block self-demotion
    if user_id == user.get("user_id") and body.role != "admin":
        raise HTTPException(status_code=403, detail="Admins cannot demote themselves")
    with db_cursor() as cur:
        cur.execute("SELECT id FROM users WHERE id = ?", (user_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="User not found")
        cur.execute("UPDATE users SET role = ? WHERE id = ?", (body.role, user_id))
        return {"updated": cur.rowcount > 0}


@router.get("/analytics")
def get_analytics(user: dict = Depends(RequireScope("admin:access"))):
    with db_cursor() as cur:
        # Average Latency
        cur.execute("SELECT AVG(query_latency_ms) as avg_latency FROM telemetry")
        avg_latency_row = cur.fetchone()
        avg_latency = avg_latency_row["avg_latency"] if avg_latency_row and avg_latency_row["avg_latency"] else 0
        
        # Total tokens
        cur.execute("SELECT SUM(total_tokens) as total_tokens FROM telemetry")
        total_tokens_row = cur.fetchone()
        total_tokens = total_tokens_row["total_tokens"] if total_tokens_row and total_tokens_row["total_tokens"] else 0
        
        # Query count
        cur.execute("SELECT COUNT(*) as total_queries FROM telemetry")
        total_queries = cur.fetchone()["total_queries"]
        
    return {
        "avg_latency_ms": round(avg_latency, 2),
        "total_tokens_used": total_tokens,
        "total_queries": total_queries
    }