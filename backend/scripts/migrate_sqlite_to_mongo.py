from __future__ import annotations

import argparse
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from pymongo import MongoClient  # noqa: E402
from pymongo.errors import PyMongoError  # noqa: E402

from app.config import settings  # noqa: E402
from app.database import PRODUCTS_SEED_MARKER, create_indexes  # noqa: E402


def parse_date(value: Any) -> datetime:
    if isinstance(value, str):
        try:
            parsed = datetime.fromisoformat(value)
        except ValueError:
            parsed = None
        if parsed is not None:
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=timezone.utc)
            return parsed.astimezone(timezone.utc)
    return datetime.now(timezone.utc)


def read_rows(
    connection: sqlite3.Connection, table: str
) -> list[sqlite3.Row]:
    exists = connection.execute(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?",
        (table,),
    ).fetchone()
    if not exists:
        return []
    return connection.execute(f"SELECT * FROM {table}").fetchall()


def product_document(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "nombre": row["nombre"],
        "notas": row["notas"] or "",
        "peso": row["peso"] or "",
        "precio": float(row["precio"] or 0),
        "vaso": row["vaso"] or "#CBB089",
        "cera": row["cera"] or "#F4EEE2",
        "imagen": row["imagen"] or None,
        "activo": bool(row["activo"]),
        "created_at": parse_date(row["created_at"]),
        "updated_at": parse_date(row["updated_at"]),
        "legacy_sqlite_id": row["id"],
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Migra productos y usuarios desde la base SQLite histórica de "
            "Lily Blossom a MongoDB. Las sesiones no se copian."
        )
    )
    parser.add_argument(
        "--sqlite-path",
        default=str(BASE_DIR / "data" / "lilyblossom.db"),
        help="Ruta de la base SQLite de origen.",
    )
    parser.add_argument(
        "--mongo-url",
        default=settings.mongo_url,
        help="Cadena de conexión de MongoDB.",
    )
    parser.add_argument(
        "--mongo-db",
        default=settings.mongo_db,
        help="Nombre de la base de datos en MongoDB.",
    )
    parser.add_argument(
        "--replace-products",
        action="store_true",
        help="Borra los productos existentes en MongoDB antes de importar.",
    )
    return parser


def main() -> int:
    args = build_parser().parse_args()
    sqlite_path = Path(args.sqlite_path).expanduser()
    if not sqlite_path.is_absolute():
        sqlite_path = BASE_DIR / sqlite_path

    if not sqlite_path.is_file():
        print(f"No existe la base SQLite indicada: {sqlite_path}")
        return 1

    sqlite_connection = sqlite3.connect(sqlite_path)
    sqlite_connection.row_factory = sqlite3.Row
    products = read_rows(sqlite_connection, "products")
    users = read_rows(sqlite_connection, "users")
    sqlite_connection.close()

    client = MongoClient(
        args.mongo_url,
        serverSelectionTimeoutMS=settings.mongo_timeout_ms,
        tz_aware=True,
    )
    try:
        client.admin.command("ping")
    except PyMongoError as exc:
        print(f"No se pudo conectar a MongoDB en {args.mongo_url}.")
        print(f"Detalle: {exc}")
        client.close()
        return 1

    db = client[args.mongo_db]
    now = datetime.now(timezone.utc)

    imported_products = 0
    existing_products = db.products.count_documents({})

    if existing_products and not args.replace_products:
        print(
            f"MongoDB ya contiene {existing_products} producto(s); no se "
            "sobrescribieron. Usa --replace-products para reemplazarlos."
        )
    elif products:
        if args.replace_products and existing_products:
            db.products.delete_many({})
            print(f"Se eliminaron {existing_products} producto(s) anteriores.")
        documents = [product_document(row) for row in products]
        db.products.insert_many(documents)
        imported_products = len(documents)
        print(f"Productos importados: {imported_products}")

    if imported_products or db.products.count_documents({}):
        db.app_meta.update_one(
            {"_id": PRODUCTS_SEED_MARKER},
            {
                "$set": {
                    "seeded": True,
                    "seeded_at": now,
                    "source": "sqlite_migration",
                }
            },
            upsert=True,
        )

    imported_users = 0
    for row in users:
        email = (row["email"] or "").strip().lower()
        if not email or not row["password_hash"]:
            continue
        db.users.update_one(
            {"email": email},
            {
                "$set": {
                    "email": email,
                    "password_hash": row["password_hash"],
                    "created_at": parse_date(row["created_at"]),
                    "updated_at": now,
                    "legacy_sqlite_id": row["id"],
                    "migrated_from_sqlite": True,
                }
            },
            upsert=True,
        )
        imported_users += 1

    if imported_users:
        print(
            f"Usuarios importados/actualizados: {imported_users} "
            "(se conserva la contraseña original)."
        )

    create_indexes(db)
    client.close()

    print("\nMigración completada.")
    print(f"  Origen:  {sqlite_path}")
    print(f"  Destino: MongoDB / {args.mongo_db}")
    print("  Sesiones: no se migraron; vuelve a iniciar sesión en /admin.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
