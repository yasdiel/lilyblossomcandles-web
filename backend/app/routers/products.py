from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, status

from ..database import get_db, to_object_id
from ..schemas import ProductOut
from ..serializers import product_to_dict

router = APIRouter(prefix="/api/products", tags=["productos"])


@router.get("", response_model=list[ProductOut])
def list_products() -> list[dict[str, Any]]:
    documents = get_db().products.find({"activo": True}).sort("_id", 1)
    return [product_to_dict(document) for document in documents]


@router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: str) -> dict[str, Any]:
    object_id = to_object_id(product_id)
    document = (
        get_db().products.find_one({"_id": object_id, "activo": True})
        if object_id is not None
        else None
    )
    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Producto no encontrado.",
        )
    return product_to_dict(document)
