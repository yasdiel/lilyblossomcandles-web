from __future__ import annotations

import base64
import os
import shutil
import tempfile
import uuid
from pathlib import Path

import pytest
from bson import ObjectId
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

from app.main import app  # noqa: E402

PNG_BYTES = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8"
    "/x8AAwMCAO+/p9sAAAAASUVORK5CYII="
)

ADMIN_EMAIL = "owner@example.com"
ADMIN_PASSWORD = "initial-password-123"


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


def test_admin_endpoints_require_login(client: TestClient):
    response = client.get("/api/admin/products")
    assert response.status_code == 401

    response = client.get("/api/admin/me")
    assert response.status_code == 401


def test_login_rejects_wrong_password(client: TestClient):
    response = login(client, "not-the-password")
    assert response.status_code == 401
    assert response.json()["detail"] == "Correo o contraseña incorrectos."


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
        files={"imagen": ("candle.png", PNG_BYTES, "image/png")},
    )
    assert created.status_code == 201, created.text
    product = created.json()
    assert product["nombre"] == "Test Amber Candle"
    assert product["precio"] == 31.5
    assert product["imagen_url"].startswith("/uploads/")
    assert product["activo"] is True
    assert ObjectId.is_valid(product["id"])

    image = client.get(product["imagen_url"])
    assert image.status_code == 200
    assert image.content == PNG_BYTES

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

    deleted = client.delete(f"/api/admin/products/{product['id']}")
    assert deleted.status_code == 200
    assert client.get(f"/api/products/{product['id']}").status_code == 404


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
