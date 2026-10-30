from __future__ import annotations

import os
import shutil
import tempfile
import uuid
from io import BytesIO
from pathlib import Path

import pytest
from bson import ObjectId
from PIL import Image
from pymongo import MongoClient

TEST_ROOT = Path(tempfile.mkdtemp(prefix="lilyblossom-tests-"))
TEST_DB_NAME = f"lilyblossom_test_{uuid.uuid4().hex[:10]}"
os.environ["MONGO_URL"] = "mongodb://127.0.0.1:27017"
os.environ["MONGO_DB"] = TEST_DB_NAME
os.environ["MONGO_TIMEOUT_MS"] = "3000"
os.environ["UPLOADS_DIR"] = str(TEST_ROOT / "uploads")
os.environ["FRONTEND_DIST"] = str(TEST_ROOT / "dist")
os.environ["ADMIN_EMAIL"] = "owner@example.com"
os.environ["ADMIN_PASSWORD"] = "initial-password-123"
os.environ["COOKIE_SECURE"] = "false"

from fastapi.testclient import TestClient  # noqa: E402

from app.config import settings  # noqa: E402
from app.database import get_db, utc_now  # noqa: E402
from app.images import delete_image, migrate_legacy_uploads  # noqa: E402
from app.main import app  # noqa: E402

def small_png_bytes() -> bytes:
    image = Image.new("RGB", (8, 6), (196, 172, 138))
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def large_jpeg_bytes(width: int = 2200, height: int = 1400) -> bytes:
    image = Image.new("RGB", (width, height), (164, 132, 96))
    buffer = BytesIO()
    image.save(buffer, format="JPEG", quality=88)
    return buffer.getvalue()


PNG_BYTES = small_png_bytes()
LARGE_JPEG_BYTES = large_jpeg_bytes()
ADMIN_EMAIL = "owner@example.com"
ADMIN_PASSWORD = "initial-password-123"


def image_id_from_url(url: str) -> ObjectId:
    return ObjectId(url.rsplit("/", 1)[-1])


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client

    mongo_client = MongoClient(
        os.environ["MONGO_URL"], serverSelectionTimeoutMS=3000
    )
    try:
        mongo_client.drop_database(TEST_DB_NAME)
    finally:
        mongo_client.close()
    shutil.rmtree(TEST_ROOT, ignore_errors=True)


def login(client: TestClient, password: str = ADMIN_PASSWORD):
    return client.post(
        "/api/admin/login",
        json={"email": ADMIN_EMAIL, "password": password},
    )


def test_health_and_seeded_catalog(client: TestClient):
    health = client.get("/api/health")
    assert health.status_code == 200
    assert health.json() == {"status": "ok", "database": "mongodb"}

    response = client.get("/api/products")
    assert response.status_code == 200
    products = response.json()
    assert len(products) == 4
    assert {product["nombre"] for product in products} >= {
        "Lavender & Vanilla",
        "Smoked Cedar",
    }
    assert products[0]["imagen_url"] is None
    assert all(isinstance(product["id"], str) for product in products)
    assert all(ObjectId.is_valid(product["id"]) for product in products)

    events = client.get("/api/events")
    assert events.status_code == 200
    assert events.json() == []


def test_admin_endpoints_require_login(client: TestClient):
    response = client.get("/api/admin/products")
    assert response.status_code == 401

    response = client.get("/api/admin/events")
    assert response.status_code == 401

    response = client.get("/api/admin/me")
    assert response.status_code == 401


def test_login_rejects_wrong_password(client: TestClient):
    response = login(client, "not-the-password")
    assert response.status_code == 401
    assert response.json()["detail"] == "Correo o contraseña incorrectos."


def test_cors_allows_authorization_header(client: TestClient):
    response = client.options(
        "/api/admin/login",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization,content-type",
        },
    )
    assert response.status_code == 200
    assert "authorization" in response.headers["access-control-allow-headers"].lower()


def test_bearer_token_works_without_cookies(client: TestClient):
    response = login(client)
    assert response.status_code == 200
    token = response.json()["access_token"]
    assert token

    client.cookies.clear()
    headers = {"Authorization": f"Bearer {token}"}
    assert client.get("/api/admin/me", headers=headers).status_code == 200

    assert client.post("/api/admin/logout", headers=headers).status_code == 200
    assert client.get("/api/admin/me", headers=headers).status_code == 401


def test_full_product_lifecycle_with_image(client: TestClient):
    response = login(client)
    assert response.status_code == 200
    assert response.json()["user"]["email"] == ADMIN_EMAIL
    assert ObjectId.is_valid(response.json()["user"]["id"])

    me = client.get("/api/admin/me")
    assert me.status_code == 200

    created = client.post(
        "/api/admin/products",
        data={
            "nombre": "Test Amber Candle",
            "notas": "Amber, smoke",
            "peso": "200 g · 30 h",
            "precio": "31.50",
            "vaso": "#8D4A27",
            "cera": "#F4EEE2",
            "activo": "true",
        },
        files={"imagen": ("candle.jpg", LARGE_JPEG_BYTES, "image/jpeg")},
    )
    assert created.status_code == 201, created.text
    product = created.json()
    assert product["nombre"] == "Test Amber Candle"
    assert product["precio"] == 31.5
    assert product["imagen_url"].startswith("/api/images/")
    assert product["activo"] is True
    assert ObjectId.is_valid(product["id"])

    image = client.get(product["imagen_url"])
    assert image.status_code == 200
    assert image.headers["content-type"].startswith("image/webp")
    assert image.content.startswith(b"RIFF")
    assert image.content[8:12] == b"WEBP"
    assert image.headers["cache-control"] == "public, max-age=31536000, immutable"
    assert image.headers["etag"] == f'"{product["imagen_url"].rsplit("/", 1)[-1]}"'

    stored_image = get_db().images.find_one(
        {"_id": image_id_from_url(product["imagen_url"])}
    )
    assert stored_image is not None
    assert stored_image["content_type"] == "image/webp"
    assert stored_image["width"] <= 1800
    assert stored_image["height"] <= 1800
    assert stored_image["source_bytes"] == len(LARGE_JPEG_BYTES)
    assert bytes(stored_image["data"]).startswith(b"RIFF")
    assert list(settings.uploads_dir.glob("*")) == []

    public = client.get("/api/products")
    assert any(item["id"] == product["id"] for item in public.json())

    updated = client.put(
        f"/api/admin/products/{product['id']}",
        data={
            "nombre": "Test Amber Candle Updated",
            "notas": "Amber, smoke, vanilla",
            "peso": "200 g · 30 h",
            "precio": "35",
            "vaso": "#8D4A27",
            "cera": "#F4EEE2",
            "activo": "true",
            "remove_image": "true",
        },
    )
    assert updated.status_code == 200, updated.text
    updated_product = updated.json()
    assert updated_product["nombre"] == "Test Amber Candle Updated"
    assert updated_product["precio"] == 35.0
    assert updated_product["imagen_url"] is None

    removed_image = client.get(product["imagen_url"])
    assert removed_image.status_code == 404
    assert (
        get_db().images.find_one(
            {"_id": image_id_from_url(product["imagen_url"])}
        )
        is None
    )

    with_image = client.put(
        f"/api/admin/products/{product['id']}",
        data={
            "nombre": "Test Amber Candle Final",
            "notas": "Amber, smoke, vanilla, cedar",
            "peso": "200 g · 30 h",
            "precio": "35",
            "vaso": "#8D4A27",
            "cera": "#F4EEE2",
            "activo": "true",
        },
        files={"imagen": ("candle-again.png", PNG_BYTES, "image/png")},
    )
    assert with_image.status_code == 200, with_image.text
    final_product = with_image.json()
    assert final_product["imagen_url"].startswith("/api/images/")
    final_image_id = image_id_from_url(final_product["imagen_url"])
    assert get_db().images.find_one({"_id": final_image_id}) is not None

    deleted = client.delete(f"/api/admin/products/{product['id']}")
    assert deleted.status_code == 200
    assert get_db().images.find_one({"_id": final_image_id}) is None
    assert client.get(final_product["imagen_url"]).status_code == 404
    assert client.get(f"/api/products/{product['id']}").status_code == 404


def test_event_product_lifecycle_with_image(client: TestClient):
    assert login(client).status_code == 200

    missing_photo = client.post(
        "/api/admin/events",
        data={
            "nombre": "Wedding Table",
            "descripcion": "Neutral candles for a wedding reception.",
            "activo": "true",
        },
    )
    assert missing_photo.status_code == 422

    created = client.post(
        "/api/admin/events",
        data={
            "nombre": "Wedding Table",
            "descripcion": "Neutral candles for a wedding reception.",
            "activo": "true",
        },
        files={"imagen": ("event.png", PNG_BYTES, "image/png")},
    )
    assert created.status_code == 201, created.text
    event = created.json()
    assert event["nombre"] == "Wedding Table"
    assert event["descripcion"] == "Neutral candles for a wedding reception."
    assert event["imagen_url"].startswith("/api/images/")
    assert event["activo"] is True
    assert ObjectId.is_valid(event["id"])
    event_image_id = image_id_from_url(event["imagen_url"])
    event_image = client.get(event["imagen_url"])
    assert event_image.status_code == 200
    assert event_image.headers["content-type"].startswith("image/webp")
    assert event_image.content.startswith(b"RIFF")
    assert get_db().images.find_one({"_id": event_image_id}) is not None

    public = client.get("/api/events")
    assert any(item["id"] == event["id"] for item in public.json())

    hidden = client.post(
        "/api/admin/events",
        data={
            "nombre": "Private Celebration",
            "descripcion": "",
            "activo": "false",
        },
        files={"imagen": ("event-private.png", PNG_BYTES, "image/png")},
    )
    assert hidden.status_code == 201
    hidden_event = hidden.json()
    hidden_image_id = image_id_from_url(hidden_event["imagen_url"])
    assert all(
        item["id"] != hidden_event["id"] for item in client.get("/api/events").json()
    )

    admin_list = client.get("/api/admin/events")
    assert {item["id"] for item in admin_list.json()} >= {
        event["id"],
        hidden_event["id"],
    }

    updated = client.put(
        f"/api/admin/events/{event['id']}",
        data={
            "nombre": "Wedding Table Updated",
            "descripcion": "A softer palette for the reception.",
            "activo": "true",
        },
        files={"imagen": ("event-updated.png", PNG_BYTES, "image/png")},
    )
    assert updated.status_code == 200, updated.text
    updated_event = updated.json()
    assert updated_event["nombre"] == "Wedding Table Updated"
    assert updated_event["imagen_url"] != event["imagen_url"]
    assert client.get(event["imagen_url"]).status_code == 404
    assert get_db().images.find_one({"_id": event_image_id}) is None
    updated_image_id = image_id_from_url(updated_event["imagen_url"])
    assert get_db().images.find_one({"_id": updated_image_id}) is not None
    assert client.get(updated_event["imagen_url"]).status_code == 200

    assert client.delete(f"/api/admin/events/{event['id']}").status_code == 200
    assert get_db().images.find_one({"_id": updated_image_id}) is None
    assert client.delete(f"/api/admin/events/{hidden_event['id']}").status_code == 200
    assert get_db().images.find_one({"_id": hidden_image_id}) is None
    assert client.get("/api/events").json() == []


def test_legacy_disk_images_migrate_to_mongodb(client: TestClient):
    db = get_db()
    legacy_filename = "legacy-candle.png"
    legacy_path = settings.uploads_dir / legacy_filename
    legacy_path.write_bytes(PNG_BYTES)
    now = utc_now()
    inserted = db.products.insert_one(
        {
            "nombre": "Legacy Candle",
            "notas": "Moved from disk",
            "peso": "",
            "precio": 12.0,
            "vaso": "#CBB089",
            "cera": "#F4EEE2",
            "imagen": legacy_filename,
            "activo": True,
            "created_at": now,
            "updated_at": now,
        }
    )
    legacy_product_id = inserted.inserted_id
    image_id = None

    try:
        migrated = migrate_legacy_uploads()
        assert migrated >= 1

        document = db.products.find_one({"_id": legacy_product_id})
        assert document is not None
        image_id = document.get("imagen_id")
        assert isinstance(image_id, ObjectId)
        assert "imagen" not in document
        stored = db.images.find_one({"_id": image_id})
        assert stored is not None
        assert stored["content_type"] == "image/webp"

        public_product = next(
            item
            for item in client.get("/api/products").json()
            if item["id"] == str(legacy_product_id)
        )
        assert public_product["imagen_url"] == f"/api/images/{image_id}"
        image = client.get(public_product["imagen_url"])
        assert image.status_code == 200
        assert image.headers["content-type"].startswith("image/webp")
        assert image.content.startswith(b"RIFF")

        assert migrate_legacy_uploads() == 0
    finally:
        db.products.delete_one({"_id": legacy_product_id})
        if image_id is not None:
            delete_image(image_id)
        legacy_path.unlink(missing_ok=True)


def test_hidden_products_are_private(client: TestClient):
    assert login(client).status_code == 200

    created = client.post(
        "/api/admin/products",
        data={
            "nombre": "Draft Candle",
            "notas": "",
            "peso": "",
            "precio": "20",
            "vaso": "#CBB089",
            "cera": "#F4EEE2",
            "activo": "false",
        },
    )
    assert created.status_code == 201
    product_id = created.json()["id"]

    public = client.get("/api/products")
    assert all(item["id"] != product_id for item in public.json())
    assert client.get(f"/api/products/{product_id}").status_code == 404

    admin_list = client.get("/api/admin/products")
    assert any(item["id"] == product_id for item in admin_list.json())

    activated = client.put(
        f"/api/admin/products/{product_id}",
        data={
            "nombre": "Draft Candle",
            "notas": "",
            "peso": "",
            "precio": "20",
            "vaso": "#CBB089",
            "cera": "#F4EEE2",
            "activo": "true",
        },
    )
    assert activated.status_code == 200
    assert client.get(f"/api/products/{product_id}").status_code == 200

    client.delete(f"/api/admin/products/{product_id}")


def test_rejects_invalid_ids_images_and_prices(client: TestClient):
    assert login(client).status_code == 200

    assert client.get("/api/products/not-a-valid-id").status_code == 404
    assert client.get("/api/images/not-a-valid-id").status_code == 404
    assert client.delete("/api/admin/products/not-a-valid-id").status_code == 404

    invalid_image = client.post(
        "/api/admin/products",
        data={
            "nombre": "Invalid Image",
            "precio": "10",
            "vaso": "#CBB089",
            "cera": "#F4EEE2",
            "activo": "true",
        },
        files={"imagen": ("evil.svg", b"<svg onload=alert(1)></svg>", "image/svg+xml")},
    )
    assert invalid_image.status_code == 422

    invalid_price = client.post(
        "/api/admin/products",
        data={
            "nombre": "Invalid Price",
            "precio": "-1",
            "vaso": "#CBB089",
            "cera": "#F4EEE2",
            "activo": "true",
        },
    )
    assert invalid_price.status_code == 422


def test_admin_mutations_reject_foreign_origin(client: TestClient):
    assert login(client).status_code == 200

    blocked = client.post(
        "/api/admin/logout",
        headers={"Origin": "https://evil.example"},
    )
    assert blocked.status_code == 403
    assert client.get("/api/admin/me").status_code == 200

    allowed = client.post(
        "/api/admin/logout",
        headers={"Origin": "http://localhost:5173"},
    )
    assert allowed.status_code == 200
    assert client.get("/api/admin/me").status_code == 401


def test_change_password_and_logout(client: TestClient):
    assert login(client).status_code == 200

    wrong_current = client.post(
        "/api/admin/change-password",
        json={
            "current_password": "wrong-current",
            "new_password": "new-password-456",
        },
    )
    assert wrong_current.status_code == 400

    changed = client.post(
        "/api/admin/change-password",
        json={
            "current_password": ADMIN_PASSWORD,
            "new_password": "new-password-456",
        },
    )
    assert changed.status_code == 200
    assert changed.json()["access_token"]

    assert client.post("/api/admin/logout").status_code == 200
    assert client.get("/api/admin/me").status_code == 401
    assert login(client, ADMIN_PASSWORD).status_code == 401
    assert login(client, "new-password-456").status_code == 200

    # Dejamos de nuevo la contraseña inicial para que los tests sean repetibles.
    reset = client.post(
        "/api/admin/change-password",
        json={
            "current_password": "new-password-456",
            "new_password": ADMIN_PASSWORD,
        },
    )
    assert reset.status_code == 200
