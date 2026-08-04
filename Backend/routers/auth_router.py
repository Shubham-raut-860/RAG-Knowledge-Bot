import sqlite3

from fastapi import APIRouter, HTTPException
from models import LoginRequest, RegisterRequest, TokenResponse
from auth import hash_password, verify_password, create_token
from database import db_cursor

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=201)
def register(body: RegisterRequest):
    if not body.username or not body.username.strip():
        raise HTTPException(status_code=400, detail="Username cannot be empty")
    if not body.password or len(body.password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters")
    pw_hash = hash_password(body.password)
    try:
        with db_cursor() as cur:
            cur.execute(
                "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
                (body.username.strip(), pw_hash, "user"),
            )
            user_id = cur.lastrowid
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=409, detail="Username already taken")
    token = create_token({"sub": body.username, "user_id": user_id, "role": "user"})
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest):
    if not body.username or not body.username.strip():
        raise HTTPException(status_code=400, detail="Username cannot be empty")
    with db_cursor() as cur:
        cur.execute("SELECT id, password_hash, role FROM users WHERE username = ?", (body.username.strip(),))
        row = cur.fetchone()
    if not row or not verify_password(body.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token({"sub": body.username, "user_id": row["id"], "role": row["role"]})
    return TokenResponse(access_token=token)