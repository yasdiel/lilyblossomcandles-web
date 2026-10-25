from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def _env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def _env_path(name: str, default: Path) -> Path:
    raw = os.getenv(name)
    path = Path(raw).expanduser() if raw else default
    if not path.is_absolute():
        path = BASE_DIR / path
    return path.resolve()


def _env_choice(name: str, default: str, choices: set[str]) -> str:
    value = os.getenv(name, default).strip().lower()
    return value if value in choices else default


@dataclass(frozen=True)
class Settings:
    mongo_url: str
    mongo_db: str
    mongo_timeout_ms: int
    uploads_dir: Path
    frontend_dist: Path
    admin_email: str
    admin_password: str
    session_hours: int
    max_upload_mb: int
    cors_origins: tuple[str, ...]
    cookie_secure: bool
    cookie_samesite: str = "strict"
    cookie_name: str = "lily_admin_session"

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024


def _cors_origins() -> tuple[str, ...]:
    raw = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    )
    return tuple(origin.strip() for origin in raw.split(",") if origin.strip())


settings = Settings(
    mongo_url=os.getenv("MONGO_URL", "mongodb://127.0.0.1:27017").strip(),
    mongo_db=os.getenv("MONGO_DB", "lilyblossom").strip() or "lilyblossom",
    mongo_timeout_ms=max(500, _env_int("MONGO_TIMEOUT_MS", 3000)),
    uploads_dir=_env_path("UPLOADS_DIR", BASE_DIR / "uploads"),
    frontend_dist=_env_path(
        "FRONTEND_DIST", BASE_DIR.parent / "LilyBlossom" / "dist"
    ),
    admin_email=os.getenv("ADMIN_EMAIL", "admin@lilyblossomcandles.com").strip().lower(),
    admin_password=os.getenv("ADMIN_PASSWORD", ""),
    session_hours=max(1, _env_int("SESSION_HOURS", 12)),
    max_upload_mb=max(1, _env_int("MAX_UPLOAD_MB", 5)),
    cors_origins=_cors_origins(),
    cookie_secure=_env_bool("COOKIE_SECURE", False),
    cookie_samesite=_env_choice(
        "COOKIE_SAMESITE", "strict", {"strict", "lax", "none"}
    ),
)
