from __future__ import annotations

import math
import re
from typing import Annotated, Any

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Request,
    Response,
    UploadFile,
    status,
)
from pymongo import ReturnDocument

from ..database import get_db, to_object_id, utc_now
from ..images import ImageValidationError, delete_image, store_image
from ..schemas import (
    AdminUserOut,
    ChangePasswordIn,
    ChangePasswordOut,
    EventProductOut,
    LoginIn,
    LoginOut,
    MessageOut,
    ProductOut,
)
from ..security import (
    DUMMY_HASH,
    clear_failed_logins,
    clear_session_cookie,
    create_session,
    delete_request_sessions,
    delete_user_sessions,
    hash_password,
    login_retry_after,
    record_failed_login,
    require_admin,
    set_session_cookie,
    verify_password,
)
from ..serializers import event_to_dict, product_to_dict

router = APIRouter(prefix="/api/admin", tags=["administración"])

HEX_COLOR = re.compile(r"^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "desconocido"


def _validate_product_fields(
    nombre: str,
    notas: str,
    peso: str,
    precio: float,
    vaso: str,
    cera: str,
) -> tuple[str, str, str, float, str, str]:
    nombre = nombre.strip()
    notas = notas.strip()
    peso = peso.strip()
    vaso = vaso.strip()
    cera = cera.strip()

    if not nombre:
        raise HTTPException(422, "El nombre del producto es obligatorio.")
    if len(nombre) > 120:
        raise HTTPException(422, "El nombre no puede superar los 120 caracteres.")
    if len(notas) > 500:
        raise HTTPException(422, "Las notas no pueden superar los 500 caracteres.")
    if len(peso) > 80:
        raise HTTPException(422, "El peso no puede superar los 80 caracteres.")
    if not math.isfinite(precio) or precio < 0 or precio > 1_000_000:
        raise HTTPException(422, "El precio debe ser un número válido mayor o igual a 0.")
    if not HEX_COLOR.fullmatch(vaso) or not HEX_COLOR.fullmatch(cera):
        raise HTTPException(422, "Los colores deben estar en formato hexadecimal (#RRGGBB).")

    return nombre, notas, peso, round(precio, 2), vaso, cera


def _validate_event_fields(nombre: str, descripcion: str) -> tuple[str, str]:
    nombre = nombre.strip()
    descripcion = descripcion.strip()

    if not nombre:
        raise HTTPException(422, "El nombre del producto para eventos es obligatorio.")
    if len(nombre) > 120:
        raise HTTPException(422, "El nombre no puede superar los 120 caracteres.")
    if len(descripcion) > 600:
        raise HTTPException(
            422, "La descripción no puede superar los 600 caracteres."
        )

    return nombre, descripcion


@router.post("/login", response_model=LoginOut)
def login(payload: LoginIn, request: Request, response: Response) -> LoginOut:
    ip = _client_ip(request)
    retry_after = login_retry_after(ip)
    if retry_after:
        minutes = max(1, math.ceil(retry_after / 60))
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Demasiados intentos. Espera {minutes} minuto(s) antes de intentar de nuevo.",
            headers={"Retry-After": str(retry_after)},
        )

    email = payload.email.strip().lower()
    user = get_db().users.find_one({"email": email})
    stored_hash = user["password_hash"] if user else None

    password_ok = verify_password(payload.password, stored_hash or DUMMY_HASH)

    if user is None or not password_ok:
        record_failed_login(ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos.",
        )

    clear_failed_logins(ip)
    token = create_session(user["_id"])
    set_session_cookie(response, token)
    return LoginOut(
        user=AdminUserOut(id=str(user["_id"]), email=user["email"]),
        access_token=token,
        message="Sesión iniciada correctamente.",
    )


@router.post("/logout", response_model=MessageOut)
def logout(request: Request, response: Response) -> MessageOut:
    delete_request_sessions(request)
    clear_session_cookie(response)
    return MessageOut(message="Sesión cerrada.")


@router.get("/me", response_model=AdminUserOut)
def me(
    admin: Annotated[dict[str, Any], Depends(require_admin)],
) -> AdminUserOut:
    return AdminUserOut(id=str(admin["id"]), email=admin["email"])


@router.post("/change-password", response_model=ChangePasswordOut)
def change_password(
    payload: ChangePasswordIn,
    response: Response,
    admin: Annotated[dict[str, Any], Depends(require_admin)],
) -> ChangePasswordOut:
    db = get_db()
    user = db.users.find_one({"_id": admin["id"]}, {"password_hash": 1})

    if user is None:
        raise HTTPException(401, "Tu sesión ya no es válida.")

    if not verify_password(payload.current_password, user["password_hash"]):
        raise HTTPException(400, "La contraseña actual no es correcta.")

    if verify_password(payload.new_password, user["password_hash"]):
        raise HTTPException(400, "La nueva contraseña debe ser diferente a la actual.")

    db.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "password_hash": hash_password(payload.new_password),
                "updated_at": utc_now(),
            }
        },
    )

    delete_user_sessions(admin["id"])
    token = create_session(admin["id"])
    set_session_cookie(response, token)
    return ChangePasswordOut(
        message="Contraseña actualizada correctamente.",
        access_token=token,
    )


@router.get("/products", response_model=list[ProductOut])
def admin_list_products(
    _admin: Annotated[dict[str, Any], Depends(require_admin)],
) -> list[dict[str, Any]]:
    documents = get_db().products.find({}).sort("_id", 1)
    return [product_to_dict(document) for document in documents]


@router.post("/products", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
async def create_product(
    _admin: Annotated[dict[str, Any], Depends(require_admin)],
    nombre: Annotated[str, Form()] = "",
    notas: Annotated[str, Form()] = "",
    peso: Annotated[str, Form()] = "",
    precio: Annotated[float, Form()] = 0,
    vaso: Annotated[str, Form()] = "#CBB089",
    cera: Annotated[str, Form()] = "#F4EEE2",
    activo: Annotated[bool, Form()] = True,
    imagen: Annotated[UploadFile | None, File()] = None,
) -> dict[str, Any]:
    nombre, notas, peso, price, vaso, cera = _validate_product_fields(
        nombre, notas, peso, precio, vaso, cera
    )

    image_filename: str | None = None
    if imagen is not None and imagen.filename:
        try:
            image_filename = await store_image(imagen)
        except ImageValidationError as exc:
            raise HTTPException(422, str(exc)) from exc

    now = utc_now()
    document = {
        "nombre": nombre,
        "notas": notas,
        "peso": peso,
        "precio": price,
        "vaso": vaso,
        "cera": cera,
        "imagen": image_filename,
        "activo": activo,
        "created_at": now,
        "updated_at": now,
    }

    try:
        result = get_db().products.insert_one(document)
    except Exception:
        delete_image(image_filename)
        raise

    document["_id"] = result.inserted_id
    return product_to_dict(document)


@router.put("/products/{product_id}", response_model=ProductOut)
async def update_product(
    product_id: str,
    _admin: Annotated[dict[str, Any], Depends(require_admin)],
    nombre: Annotated[str, Form()] = "",
    notas: Annotated[str, Form()] = "",
    peso: Annotated[str, Form()] = "",
    precio: Annotated[float, Form()] = 0,
    vaso: Annotated[str, Form()] = "#CBB089",
    cera: Annotated[str, Form()] = "#F4EEE2",
    activo: Annotated[bool, Form()] = True,
    remove_image: Annotated[bool, Form()] = False,
    imagen: Annotated[UploadFile | None, File()] = None,
) -> dict[str, Any]:
    nombre, notas, peso, price, vaso, cera = _validate_product_fields(
        nombre, notas, peso, precio, vaso, cera
    )

    object_id = to_object_id(product_id)
    db = get_db()
    existing = (
        db.products.find_one({"_id": object_id}) if object_id is not None else None
    )
    if existing is None:
        raise HTTPException(404, "Producto no encontrado.")

    old_image = existing.get("imagen")
    new_image = old_image
    created_image: str | None = None

    if imagen is not None and imagen.filename:
        try:
            created_image = await store_image(imagen)
        except ImageValidationError as exc:
            raise HTTPException(422, str(exc)) from exc
        new_image = created_image
    elif remove_image:
        new_image = None

    try:
        row = db.products.find_one_and_update(
            {"_id": object_id},
            {
                "$set": {
                    "nombre": nombre,
                    "notas": notas,
                    "peso": peso,
                    "precio": price,
                    "vaso": vaso,
                    "cera": cera,
                    "imagen": new_image,
                    "activo": activo,
                    "updated_at": utc_now(),
                }
            },
            return_document=ReturnDocument.AFTER,
        )
    except Exception:
        delete_image(created_image)
        raise

    if row is None:
        delete_image(created_image)
        raise HTTPException(404, "Producto no encontrado.")

    if old_image and old_image != new_image:
        delete_image(old_image)

    return product_to_dict(row)


@router.delete("/products/{product_id}", response_model=MessageOut)
def delete_product(
    product_id: str,
    _admin: Annotated[dict[str, Any], Depends(require_admin)],
) -> MessageOut:
    object_id = to_object_id(product_id)
    product = (
        get_db().products.find_one_and_delete({"_id": object_id})
        if object_id is not None
        else None
    )
    if product is None:
        raise HTTPException(404, "Producto no encontrado.")

    delete_image(product.get("imagen"))
    return MessageOut(message="Producto eliminado.")


@router.get("/events", response_model=list[EventProductOut])
def admin_list_events(
    _admin: Annotated[dict[str, Any], Depends(require_admin)],
) -> list[dict[str, Any]]:
    documents = get_db().events.find({}).sort("_id", 1)
    return [event_to_dict(document) for document in documents]


@router.post(
    "/events", response_model=EventProductOut, status_code=status.HTTP_201_CREATED
)
async def create_event(
    _admin: Annotated[dict[str, Any], Depends(require_admin)],
    nombre: Annotated[str, Form()] = "",
    descripcion: Annotated[str, Form()] = "",
    activo: Annotated[bool, Form()] = True,
    imagen: Annotated[UploadFile | None, File()] = None,
) -> dict[str, Any]:
    nombre, descripcion = _validate_event_fields(nombre, descripcion)

    if imagen is None or not imagen.filename:
        raise HTTPException(422, "La foto del producto para eventos es obligatoria.")

    try:
        image_filename = await store_image(imagen)
    except ImageValidationError as exc:
        raise HTTPException(422, str(exc)) from exc

    now = utc_now()
    document = {
        "nombre": nombre,
        "descripcion": descripcion,
        "imagen": image_filename,
        "activo": activo,
        "created_at": now,
        "updated_at": now,
    }

    try:
        result = get_db().events.insert_one(document)
    except Exception:
        delete_image(image_filename)
        raise

    document["_id"] = result.inserted_id
    return event_to_dict(document)


@router.put("/events/{event_id}", response_model=EventProductOut)
async def update_event(
    event_id: str,
    _admin: Annotated[dict[str, Any], Depends(require_admin)],
    nombre: Annotated[str, Form()] = "",
    descripcion: Annotated[str, Form()] = "",
    activo: Annotated[bool, Form()] = True,
    imagen: Annotated[UploadFile | None, File()] = None,
) -> dict[str, Any]:
    nombre, descripcion = _validate_event_fields(nombre, descripcion)

    object_id = to_object_id(event_id)
    db = get_db()
    existing = (
        db.events.find_one({"_id": object_id}) if object_id is not None else None
    )
    if existing is None:
        raise HTTPException(404, "Producto para eventos no encontrado.")

    old_image = existing.get("imagen")
    new_image = old_image
    created_image: str | None = None

    if imagen is not None and imagen.filename:
        try:
            created_image = await store_image(imagen)
        except ImageValidationError as exc:
            raise HTTPException(422, str(exc)) from exc
        new_image = created_image

    if not new_image:
        raise HTTPException(422, "La foto del producto para eventos es obligatoria.")

    try:
        row = db.events.find_one_and_update(
            {"_id": object_id},
            {
                "$set": {
                    "nombre": nombre,
                    "descripcion": descripcion,
                    "imagen": new_image,
                    "activo": activo,
                    "updated_at": utc_now(),
                }
            },
            return_document=ReturnDocument.AFTER,
        )
    except Exception:
        delete_image(created_image)
        raise

    if row is None:
        delete_image(created_image)
        raise HTTPException(404, "Producto para eventos no encontrado.")

    if old_image and old_image != new_image:
        delete_image(old_image)

    return event_to_dict(row)


@router.delete("/events/{event_id}", response_model=MessageOut)
def delete_event(
    event_id: str,
    _admin: Annotated[dict[str, Any], Depends(require_admin)],
) -> MessageOut:
    object_id = to_object_id(event_id)
    event = (
        get_db().events.find_one_and_delete({"_id": object_id})
        if object_id is not None
        else None
    )
    if event is None:
        raise HTTPException(404, "Producto para eventos no encontrado.")

    delete_image(event.get("imagen"))
    return MessageOut(message="Producto para eventos eliminado.")
