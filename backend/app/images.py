from __future__ import annotations

import logging
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
from typing import Any, Mapping

from bson import Binary, ObjectId
from fastapi import UploadFile
from PIL import Image, ImageOps, UnidentifiedImageError

from .config import settings
from .database import get_db, to_object_id, utc_now

logger = logging.getLogger("lilyblossom.images")

ALLOWED_FORMATS = {"JPEG", "MPO", "PNG", "WEBP"}
MAX_IMAGE_PIXELS = 50_000_000
MAX_IMAGE_DIMENSION = 1800
WEBP_CONTENT_TYPE = "image/webp"
# Calidad y tamaños de respaldo para mantener las fotos por debajo del límite.
ENCODING_STEPS = ((MAX_IMAGE_DIMENSION, 82), (1400, 78), (1100, 75), (900, 72))


class ImageValidationError(ValueError):
    pass


@dataclass(frozen=True)
class OptimizedImage:
    data: bytes
    content_type: str
    width: int
    height: int
    source_bytes: int


def _check_source_size(data: bytes) -> None:
    if not data:
        raise ImageValidationError("La imagen está vacía.")
    if len(data) > settings.max_upload_bytes:
        raise ImageValidationError(
            f"La imagen supera el límite de {settings.max_upload_mb} MB."
        )


def _optimize_bytes(data: bytes, *, check_source_size: bool = True) -> OptimizedImage:
    if check_source_size:
        _check_source_size(data)
    elif not data:
        raise ImageValidationError("La imagen está vacía.")

    try:
        with Image.open(BytesIO(data)) as probe:
            if probe.format not in ALLOWED_FORMATS:
                raise ImageValidationError(
                    "Formato no permitido. Usa una imagen JPG, PNG o WebP."
                )
            if probe.width < 1 or probe.height < 1:
                raise ImageValidationError("La imagen no tiene dimensiones válidas.")
            if probe.width * probe.height > MAX_IMAGE_PIXELS:
                raise ImageValidationError(
                    "La imagen tiene demasiados píxeles. Usa una foto más pequeña."
                )
            # MPO es un JPEG de cámara con fotogramas extra; usamos el primero.
            if probe.format in {"PNG", "WEBP"} and getattr(probe, "n_frames", 1) > 1:
                raise ImageValidationError("No se permiten imágenes animadas.")
            probe.verify()

        with Image.open(BytesIO(data)) as image:
            if image.format in {"JPEG", "MPO"}:
                image.draft("RGB", (MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION))
            image = ImageOps.exif_transpose(image)
            if image.mode in {"RGBA", "LA", "PA"} or (
                image.mode == "P" and "transparency" in image.info
            ):
                image = image.convert("RGBA")
            else:
                image = image.convert("RGB")

            encoded: bytes | None = None
            output_width = image.width
            output_height = image.height
            for max_side, quality in ENCODING_STEPS:
                working = image.copy()
                working.thumbnail(
                    (max_side, max_side), Image.Resampling.LANCZOS
                )
                output = BytesIO()
                working.save(
                    output,
                    format="WEBP",
                    quality=quality,
                    method=6,
                    optimize=True,
                )
                encoded = output.getvalue()
                output_width = working.width
                output_height = working.height
                if len(encoded) <= settings.max_upload_bytes:
                    break

            if not encoded:
                raise ImageValidationError("No se pudo procesar la imagen.")
            if len(encoded) > settings.max_upload_bytes:
                raise ImageValidationError(
                    "La imagen optimizada sigue siendo demasiado grande. "
                    "Prueba con una foto más pequeña."
                )
    except ImageValidationError:
        raise
    except (
        Image.DecompressionBombError,
        UnidentifiedImageError,
        OSError,
        SyntaxError,
        ValueError,
    ) as exc:
        raise ImageValidationError(
            "La imagen no es válida o está dañada. Usa un archivo JPG, PNG o WebP."
        ) from exc

    return OptimizedImage(
        data=encoded,
        content_type=WEBP_CONTENT_TYPE,
        width=output_width,
        height=output_height,
        source_bytes=len(data),
    )


async def optimize_upload(upload: UploadFile) -> OptimizedImage:
    try:
        data = await upload.read(settings.max_upload_bytes + 1)
    finally:
        await upload.close()
    return _optimize_bytes(data)


def insert_optimized_image(
    optimized: OptimizedImage,
    *,
    source: str = "upload",
    original_filename: str | None = None,
) -> ObjectId:
    image_id = ObjectId()
    get_db().images.insert_one(
        {
            "_id": image_id,
            "data": Binary(optimized.data),
            "content_type": optimized.content_type,
            "width": optimized.width,
            "height": optimized.height,
            "size": len(optimized.data),
            "source_bytes": optimized.source_bytes,
            "source": source,
            "original_filename": original_filename,
            "created_at": utc_now(),
        }
    )
    return image_id


async def store_image(upload: UploadFile) -> ObjectId:
    """Valida, optimiza y guarda una foto en MongoDB. Devuelve su ObjectId."""
    optimized = await optimize_upload(upload)
    return insert_optimized_image(
        optimized,
        source="upload",
        original_filename=Path(upload.filename or "").name or None,
    )


def get_image(image_id: str | ObjectId | None) -> Mapping[str, Any] | None:
    if image_id is None:
        return None
    object_id = (
        image_id if isinstance(image_id, ObjectId) else to_object_id(str(image_id))
    )
    if object_id is None:
        return None
    return get_db().images.find_one({"_id": object_id})


def delete_image(image_id: str | ObjectId | None) -> None:
    """Elimina una foto guardada en MongoDB."""
    if image_id is None:
        return
    object_id = (
        image_id if isinstance(image_id, ObjectId) else to_object_id(str(image_id))
    )
    if object_id is None:
        return
    try:
        get_db().images.delete_one({"_id": object_id})
    except Exception:
        logger.warning("No se pudo borrar la imagen %s de MongoDB.", image_id)


def delete_legacy_image(filename: str | None) -> None:
    """Borra una foto antigua del disco. Solo se usa para archivos heredados."""
    if not filename:
        return

    uploads_dir = settings.uploads_dir.resolve()
    candidate = (uploads_dir / Path(filename).name).resolve()
    if candidate.parent != uploads_dir:
        return
    try:
        candidate.unlink(missing_ok=True)
    except OSError:
        logger.warning("No se pudo borrar la imagen antigua %s", candidate, exc_info=True)


def migrate_legacy_uploads() -> int:
    """Migra a MongoDB las fotos antiguas que todavía estén en disco."""
    uploads_dir = settings.uploads_dir
    if not uploads_dir.is_dir():
        return 0

    db = get_db()
    migrated = 0

    for collection_name in ("products", "events"):
        collection = db[collection_name]
        legacy_filter = {
            "imagen": {"$exists": True, "$nin": [None, ""]},
            "$or": [
                {"imagen_id": {"$exists": False}},
                {"imagen_id": None},
            ],
        }
        cursor = collection.find(legacy_filter, {"imagen": 1})
        for document in cursor:
            original = str(document.get("imagen", "")).strip()
            if not original:
                continue
            filename = Path(original).name
            source_path = uploads_dir / filename
            if not source_path.is_file():
                logger.warning(
                    "No se encontró la foto antigua %s para migrarla.", filename
                )
                continue

            created_image: ObjectId | None = None
            try:
                optimized = _optimize_bytes(
                    source_path.read_bytes(), check_source_size=False
                )
                created_image = insert_optimized_image(
                    optimized,
                    source="migration",
                    original_filename=filename,
                )
                result = collection.update_one(
                    {
                        "_id": document["_id"],
                        "$or": [
                            {"imagen_id": {"$exists": False}},
                            {"imagen_id": None},
                        ],
                    },
                    {
                        "$set": {"imagen_id": created_image},
                        "$unset": {"imagen": ""},
                    },
                )
                if result.modified_count == 0:
                    delete_image(created_image)
                    created_image = None
                    continue
                created_image = None
                migrated += 1
            except Exception:
                if created_image is not None:
                    delete_image(created_image)
                logger.warning(
                    "No se pudo migrar la foto antigua %s a MongoDB.",
                    filename,
                    exc_info=True,
                )

    if migrated:
        logger.info("Se migraron %s fotos antiguas a MongoDB.", migrated)
    return migrated
