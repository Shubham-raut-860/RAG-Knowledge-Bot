from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=2, max_length=64)
    password: str = Field(..., min_length=4, max_length=128)


class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=2, max_length=64)
    password: str = Field(..., min_length=6, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    session_id: Optional[str] = None


class EditMessageRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)


class SourceDoc(BaseModel):
    filename: str
    content_preview: str


class ChatResponse(BaseModel):
    answer: str
    sources: List[SourceDoc]
    session_id: str


class MessageRecord(BaseModel):
    id: Optional[int] = None
    role: str
    content: str
    sources: Optional[List[SourceDoc]] = None
    created_at: datetime


class ChatHistoryResponse(BaseModel):
    session_id: str
    messages: List[MessageRecord]


class DocumentRecord(BaseModel):
    id: int
    original_name: str
    chunk_count: int
    uploaded_by: Optional[str]
    uploaded_at: datetime
    status: str


class DeleteDocResponse(BaseModel):
    deleted: bool
    message: str


class HealthResponse(BaseModel):
    status: str
    chroma_docs: int