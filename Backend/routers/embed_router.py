import os
import re
import uuid
import logging
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, Depends
from database import db_cursor
from rag_pipeline import ingest_document
from auth import require_admin, RequireScope
import time
from config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)
router = APIRouter(prefix="/embed", tags=["embed"])

ALLOWED_EXTENSIONS = {".pdf", ".txt", ".md", ".docx", ".png", ".jpg", ".jpeg"}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB


def _ingest_bg(file_path: str, original_name: str, doc_id: int) -> None:
    max_retries = 3
    for attempt in range(max_retries):
        try:
            count = ingest_document(file_path, original_name, doc_id)
            with db_cursor() as cur:
                cur.execute(
                    "UPDATE documents SET chunk_count = ?, status = ? WHERE id = ?",
                    (count, "ready", doc_id),
                )
            return  # Success
        except Exception as e:
            logger.warning("Ingest attempt %d failed for doc_id=%d: %s", attempt + 1, doc_id, str(e))
            if attempt == max_retries - 1:
                logger.error("All ingest attempts failed for doc_id=%d", doc_id)
                with db_cursor() as cur:
                    cur.execute(
                        "UPDATE documents SET status = ?, error_message = ? WHERE id = ?",
                        ("error", f"Failed after {max_retries} attempts. Last error: {str(e)[:400]}", doc_id),
                    )
            time.sleep(2 ** attempt)  # Exponential backoff


@router.post("/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user: dict = Depends(RequireScope("docs:write")),
):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")

    # Sanitize the original filename to prevent stored XSS
    safe_original_name = re.sub(r'[^\w\s.\-()]', '_', file.filename or "unnamed")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File exceeds 20 MB limit")

    os.makedirs(settings.upload_dir, exist_ok=True)
    saved_name = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(settings.upload_dir, saved_name)

    with open(file_path, "wb") as f:
        f.write(content)

    with db_cursor() as cur:
        cur.execute(
            "INSERT INTO documents (filename, original_name, uploaded_by, status) VALUES (?, ?, ?, ?)",
            (saved_name, safe_original_name, user.get("sub"), "processing"),
        )
        doc_id = cur.lastrowid

    background_tasks.add_task(_ingest_bg, file_path, safe_original_name, doc_id)

    return {"doc_id": doc_id, "status": "processing", "message": "Document queued for ingestion"}


@router.get("/status/{doc_id}")
def ingest_status(doc_id: int, user: dict = Depends(RequireScope("docs:read"))):
    with db_cursor() as cur:
        cur.execute("SELECT id, original_name, chunk_count, status FROM documents WHERE id = ?", (doc_id,))
        row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Document not found")
    return dict(row)