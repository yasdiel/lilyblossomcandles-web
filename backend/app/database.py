from __future__ import annotations

import logging
import secrets
from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from bson.errors import InvalidId
from pymongo import ASCENDING, MongoClient
from pymongo.database import Database
from pymongo.errors import PyMongoError

from .config import settings
from .security import hash_password

logger = logging.getLogger("lilyblossom.database")

PRODUCTS_SEED_MARKER = "products_seed"

SEED_PRODUCTS = [
    {
        "nombre": "Lavender & Vanilla",
        "notas": "Lavender, Tahitian vanilla, tonka bean",
        "peso": "220 g · 40 h",
        "precio": 28.0,
        "vaso": "#8C9A86",
        "cera": "#EFE6D6",
    },
    {
        "nombre": "Smoked Cedar",
        "notas": "Cedar, soft smoke, amber",
        "peso": "220 g · 40 h",
        "precio": 30.0,
        "vaso": "#4A3A32",
        "cera": "#E6D9C3",
    },
    {
        "nombre": "Fig & White Tea",
        "notas": "Green fig, white tea, moss",
        "peso": "180 g · 32 h",
        "precio": 26.0,
        "vaso": "#C9B79C",
        "cera": "#F4EEE2",
    },
    {
        "nombre": "Sea Salt",
        "notas": "Salted breeze, sage, driftwood",
        "peso": "300 g · 55 h",
        "precio": 36.0,
        "vaso": "#B5BFB8",
        "cera": "#F1ECE3",
    },
]

_client: MongoClient | None = None


def get_client() -> MongoClient:
    global _client
    if _client is None:
        _client = MongoClient(
            settings.mongo_url,
            serverSelectionTimeoutMS=settings.mongo_timeout_ms,
            tz_aware=True,
            appname="lilyblossom-api",
            connect=False,
        )
    return _client


def get_db() -> Database:
    return get_client()[settings.mongo_db]


def close_db() -> None:
    global _client
    if _client is not None:
        _client.close()
        _client = None


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def to_object_id(value: str) -> ObjectId | None:
    try:
        return ObjectId(value)
    except (InvalidId, TypeError):
        return None


def create_indexes(db: Database) -> None:
    db.users.create_index("email", unique=True, name="uniq_email")
    db.sessions.create_index("token_hash", unique=True, name="uniq_token")
    db.sessions.create_index("user_id", name="by_user")
    db.sessions.create_index(
        "expires_at", expireAfterSeconds=0, name="ttl_expiry"
    )
    db.products.create_index(
        [("activo", ASCENDING), ("_id", ASCENDING)],
        name="public_catalog",
    )
    db.events.create_index(
        [("activo", ASCENDING), ("_id", ASCENDING)],
        name="public_events",
    )


def init_db() -> None:
    settings.uploads_dir.mkdir(parents=True, exist_ok=True)

    client = get_client()
    try:
        client.admin.command("ping")
    except PyMongoError as exc:
        close_db()
        raise RuntimeError(
            "No se pudo conectar a MongoDB. Comprueba que el servicio esté "
            "encendido y revisa MONGO_URL en backend/.env."
        ) from exc

    db = get_db()
    create_indexes(db)
    seed_products(db)
    ensure_admin(db)
    logger.info("MongoDB listo. Base de datos: '%s'.", settings.mongo_db)


def seed_products(db: Database) -> None:
    marker = db.app_meta.find_one({"_id": PRODUCTS_SEED_MARKER})
    if marker and marker.get("seeded"):
        return

    now = utc_now()
    if db.products.count_documents({}) == 0:
        documents = [
            {
                **product,
                "imagen": None,
                "activo": True,
                "created_at": now,
                "updated_at": now,
            }
            for product in SEED_PRODUCTS
        ]
        db.products.insert_many(documents)
        logger.info("Se cargaron %s productos iniciales.", len(documents))

    db.app_meta.update_one(
        {"_id": PRODUCTS_SEED_MARKER},
        {"$set": {"seeded": True, "seeded_at": now}},
        upsert=True,
    )


def ensure_admin(db: Database) -> None:
    existing = db.users.find_one({"email": settings.admin_email}, {"_id": 1})
    if existing:
        return

    password = settings.admin_password
    generated = not password
    if generated:
        password = secrets.token_urlsafe(14)

    db.users.insert_one(
        {
            "email": settings.admin_email,
            "password_hash": hash_password(password),
            "created_at": utc_now(),
        }
    )

    if generated:
        logger.warning(
            "Se creó la cuenta de administración %s con esta contraseña temporal: %s",
            settings.admin_email,
            password,
        )
        logger.warning(
            "Guárdala y cámbiala desde el panel /admin. También puedes definir "
            "ADMIN_PASSWORD en backend/.env antes del primer arranque."
        )
    else:
        logger.info("Cuenta de administración disponible: %s", settings.admin_email)


def count_documents(collection: str) -> int:
    """Pequeño helper para scripts de diagnóstico."""
    return get_db()[collection].count_documents({})


def get_collection_stats() -> dict[str, Any]:
    db = get_db()
    return {
        "products": db.products.count_documents({}),
        "events": db.events.count_documents({}),
        "images": db.images.count_documents({}),
        "users": db.users.count_documents({}),
        "sessions": db.sessions.count_documents({}),
    }
