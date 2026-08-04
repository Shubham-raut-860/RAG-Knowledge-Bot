import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from database import init_db
from auth import hash_password
from models import HealthResponse
from routers.auth_router import router as auth_router
from routers.chat_router import router as chat_router
from routers.admin_router import router as admin_router
from routers.embed_router import router as embed_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    _seed_admin()
    logger.info("RAG Support Backend started")
    yield
    logger.info("Shutdown complete")


def _seed_admin() -> None:
    from database import db_cursor
    with db_cursor() as cur:
        cur.execute("SELECT id FROM users WHERE username = ?", (settings.admin_username,))
        if cur.fetchone():
            return
        pw_hash = settings.admin_password_hash
        cur.execute(
            "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
            (settings.admin_username, pw_hash, "admin"),
        )
    logger.info("Admin user seeded: %s", settings.admin_username)


app = FastAPI(
    title="AI Customer Support RAG API",
    version="1.0.0",
    lifespan=lifespan,
)

origins = [o.strip() for o in settings.cors_origins.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(chat_router)
app.include_router(admin_router)
app.include_router(embed_router)


@app.get("/health", response_model=HealthResponse)
def health():
    from rag_pipeline import collection_doc_count
    return {"status": "ok", "chroma_docs": collection_doc_count()}