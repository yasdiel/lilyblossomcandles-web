from __future__ import annotations

import logging
import uuid
from pathlib import Path

from fastapi import UploadFile

from .config import settings

logger = logging.getLogger("lilyblossom.images")


class ImageValidationError(ValueError):
    pass


def _detect_image(data: bytes) -> str | None:
    if data.startswith(b"\xff\xd8\xff"):
        return ".jpg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return ".png"
    if len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return ".webp"
    return None


async def store_image(upload: UploadFile) -> str:
    """Valida y guarda una imagen. Devuelve el nombre de archivo generado."""
    data = await upload.read(settings.max_upload_bytes + 1)
    await upload.close()

    if not data:
        raise ImageValidationError("La imagen está vacía.")
    if len(data) > settings.max_upload_bytes:
        raise ImageValidationError(
            f"La imagen supera el límite de {settings.max_upload_mb} MB."
        )

    extension = _detect_image(data)
    if extension is None:
        raise ImageValidationError(
            "Formato no permitido. Usa una imagen JPG, PNG o WebP."
        )

    settings.uploads_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4().hex}{extension}"
    destination = settings.uploads_dir / filename
    temporary = destination.with_suffix(destination.suffix + ".tmp")

    try:
        temporary.write_bytes(data)
        temporary.replace(destination)
    finally:
        temporary.unlink(missing_ok=True)

    return filename


def delete_image(filename: str | None) -> None:
    if not filename:
        return

    uploads_dir = settings.uploads_dir.resolve()
    candidate = (uploads_dir / Path(filename).name).resolve()
    if candidate.parent != uploads_dir:
        return
    try:
        candidate.unlink(missing_ok=True)
    except OSError:
        logger.warning("No se pudo borrar la imagen %s", candidate, exc_info=True)
