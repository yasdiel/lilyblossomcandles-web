from __future__ import annotations

import base64
import binascii
import hashlib
import hmac
import secrets
import threading
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import HTTPException, Request, status

from .config import settings

_SCRYPT_N = 2**14
_SCRYPT_R = 8
_SCRYPT_P = 1
_SCRYPT_DKLEN = 32
_SCRYPT_MAXMEM = 64 * 1024 * 1024


# ---------------------------------------------------------------------------
# Contraseñas
# ---------------------------------------------------------------------------


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(
        password.encode("utf-8"),
        salt=salt,
        n=_SCRYPT_N,
        r=_SCRYPT_R,
        p=_SCRYPT_P,
        dklen=_SCRYPT_DKLEN,
        maxmem=_SCRYPT_MAXMEM,
    )
    salt_b64 = base64.b64encode(salt).decode("ascii")
    digest_b64 = base64.b64encode(digest).decode("ascii")
    return f"scrypt${_SCRYPT_N}${_SCRYPT_R}${_SCRYPT_P}${salt_b64}${digest_b64}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algorithm, n, r, p, salt_b64, digest_b64 = stored.split("$")
        if algorithm != "scrypt":
            return False
        salt = base64.b64decode(salt_b64)
        expected = base64.b64decode(digest_b64)
        actual = hashlib.scrypt(
            password.encode("utf-8"),
            salt=salt,
            n=int(n),
            r=int(r),
            p=int(p),
            dklen=len(expected),
            maxmem=_SCRYPT_MAXMEM,
        )
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError, binascii.Error):
        return False


# Se usa cuando el correo no existe para que el tiempo de respuesta sea similar.
DUMMY_HASH = hash_password(secrets.token_urlsafe(20))


# ---------------------------------------------------------------------------
# Sesiones
# ---------------------------------------------------------------------------


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_session(user_id: Any) -> str:
    from .database import get_db

    token = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)
    get_db().sessions.insert_one(
        {
            "token_hash": _token_hash(token),
            "user_id": user_id,
            "expires_at": now + timedelta(hours=settings.session_hours),
            "created_at": now,
        }
    )
    return token


def delete_session(token: str | None) -> None:
    if not token:
        return
    from .database import get_db

    get_db().sessions.delete_one({"token_hash": _token_hash(token)})


def delete_user_sessions(user_id: Any) -> None:
    from .database import get_db

    get_db().sessions.delete_many({"user_id": user_id})


def get_session_user(request: Request) -> dict[str, Any] | None:
    token = request.cookies.get(settings.cookie_name)
    if not token:
        return None

    from .database import get_db

    db = get_db()
    session = db.sessions.find_one({"token_hash": _token_hash(token)})
    if session is None:
        return None

    expires_at = session.get("expires_at")
    now = datetime.now(timezone.utc)
    if not isinstance(expires_at, datetime):
        db.sessions.delete_one({"_id": session["_id"]})
        return None
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at <= now:
        db.sessions.delete_one({"_id": session["_id"]})
        return None

    user = db.users.find_one({"_id": session.get("user_id")}, {"email": 1})
    if user is None:
        db.sessions.delete_one({"_id": session["_id"]})
        return None

    return {"id": user["_id"], "email": user["email"]}


def require_admin(request: Request) -> dict[str, Any]:
    user = get_session_user(request)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tu sesión expiró. Inicia sesión de nuevo.",
            headers={"WWW-Authenticate": "Cookie"},
        )
    return user


def set_session_cookie(response: Any, token: str) -> None:
    response.set_cookie(
        key=settings.cookie_name,
        value=token,
        max_age=settings.session_hours * 3600,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        path="/",
    )


def clear_session_cookie(response: Any) -> None:
    response.delete_cookie(
        key=settings.cookie_name,
        path="/",
        secure=settings.cookie_secure,
        httponly=True,
        samesite=settings.cookie_samesite,
    )


# ---------------------------------------------------------------------------
# Límite de intentos de inicio de sesión
# ---------------------------------------------------------------------------

_ATTEMPT_WINDOW_SECONDS = 10 * 60
_MAX_FAILED_ATTEMPTS = 8
_failed_attempts: dict[str, deque[float]] = defaultdict(deque)
_attempts_lock = threading.Lock()


def login_retry_after(ip: str) -> int:
    """Devuelve los segundos de espera si la IP está bloqueada, o 0."""
    now = time.monotonic()
    with _attempts_lock:
        attempts = _failed_attempts[ip]
        while attempts and now - attempts[0] > _ATTEMPT_WINDOW_SECONDS:
            attempts.popleft()
        if len(attempts) < _MAX_FAILED_ATTEMPTS:
            return 0
        return max(1, int(_ATTEMPT_WINDOW_SECONDS - (now - attempts[0])))


def record_failed_login(ip: str) -> None:
    with _attempts_lock:
        _failed_attempts[ip].append(time.monotonic())


def clear_failed_logins(ip: str) -> None:
    with _attempts_lock:
        _failed_attempts.pop(ip, None)
