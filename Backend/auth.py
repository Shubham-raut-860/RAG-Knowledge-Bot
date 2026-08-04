from datetime import datetime, timedelta, timezone
from typing import Optional
import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from config import get_settings

settings = get_settings()
bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt(rounds=12)).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_token(payload: dict, expires_minutes: Optional[int] = None) -> str:
    exp = expires_minutes or settings.jwt_expiry_minutes
    data = payload.copy()
    data["exp"] = datetime.now(timezone.utc) + timedelta(minutes=exp)
    return jwt.encode(data, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def get_current_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> dict:
    if creds is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return decode_token(creds.credentials)


ROLE_SCOPES = {
    "admin": ["docs:read", "docs:write", "users:manage", "chat:write", "admin:access"],
    "user": ["docs:read", "chat:write"]
}

def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

class RequireScope:
    def __init__(self, required_scope: str):
        self.required_scope = required_scope

    def __call__(self, user: dict = Depends(get_current_user)) -> dict:
        role = user.get("role", "user")
        scopes = ROLE_SCOPES.get(role, [])
        if self.required_scope not in scopes:
            raise HTTPException(status_code=403, detail=f"Missing scope: {self.required_scope}")
        return user