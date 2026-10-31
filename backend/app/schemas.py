from __future__ import annotations

from pydantic import BaseModel, Field


class LoginIn(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=200)


class AdminUserOut(BaseModel):
    id: str
    email: str


class LoginOut(BaseModel):
    user: AdminUserOut
    access_token: str
    message: str


class ChangePasswordIn(BaseModel):
    current_password: str = Field(min_length=1, max_length=200)
    new_password: str = Field(min_length=10, max_length=200)


class MessageOut(BaseModel):
    message: str


class ChangePasswordOut(MessageOut):
    access_token: str


class ProductOut(BaseModel):
    id: str
    nombre: str
    notas: str
    peso: str
    precio: float
    vaso: str
    cera: str
    imagen_url: str | None = None
    activo: bool
    created_at: str
    updated_at: str


class EventPriceOut(BaseModel):
    unidades: int
    precio: float


class EventProductOut(BaseModel):
    id: str
    nombre: str
    descripcion: str
    precios: list[EventPriceOut] = Field(default_factory=list)
    imagen_url: str | None = None
    activo: bool
    created_at: str
    updated_at: str
