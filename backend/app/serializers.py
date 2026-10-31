from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Mapping
from urllib.parse import quote


def _iso(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc).isoformat(timespec="seconds")
    return str(value)


def _image_url(document: Mapping[str, Any]) -> str | None:
    image_id = document.get("imagen_id")
    if image_id:
        return f"/api/images/{quote(str(image_id), safe='')}"

    # Compatibilidad con fotos antiguas que todavía viven en /uploads.
    legacy_image = document.get("imagen")
    return f"/uploads/{quote(str(legacy_image))}" if legacy_image else None


def product_to_dict(document: Mapping[str, Any]) -> dict[str, Any]:
    return {
        "id": str(document["_id"]),
        "nombre": document.get("nombre", ""),
        "notas": document.get("notas", ""),
        "peso": document.get("peso", ""),
        "precio": round(float(document.get("precio", 0)), 2),
        "vaso": document.get("vaso", "#CBB089"),
        "cera": document.get("cera", "#F4EEE2"),
        "imagen_url": _image_url(document),
        "activo": bool(document.get("activo", False)),
        "created_at": _iso(document.get("created_at")) or "",
        "updated_at": _iso(document.get("updated_at")) or "",
    }


def event_to_dict(document: Mapping[str, Any]) -> dict[str, Any]:
    return {
        "id": str(document["_id"]),
        "nombre": document.get("nombre", ""),
        "descripcion": document.get("descripcion", ""),
        "precios": document.get("precios", []),
        "imagen_url": _image_url(document),
        "activo": bool(document.get("activo", False)),
        "created_at": _iso(document.get("created_at")) or "",
        "updated_at": _iso(document.get("updated_at")) or "",
    }
