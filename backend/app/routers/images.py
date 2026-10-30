from __future__ import annotations

from fastapi import APIRouter, HTTPException, Response, status

from ..images import get_image

router = APIRouter(prefix="/api/images", tags=["imágenes"])


@router.get("/{image_id}")
def serve_image(image_id: str) -> Response:
    document = get_image(image_id)
    if document is None or document.get("data") is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Imagen no encontrada.",
        )

    payload = bytes(document["data"])
    content_type = document.get("content_type") or "image/webp"
    return Response(
        content=payload,
        media_type=content_type,
        headers={
            "Cache-Control": "public, max-age=31536000, immutable",
            "ETag": f'"{image_id}"',
        },
    )
