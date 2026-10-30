from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path
from urllib.parse import urlsplit

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pymongo.errors import PyMongoError

from .config import settings
from .database import close_db, get_db, init_db
from .routers import admin, events, products

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("lilyblossom")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    try:
        init_db()
    except Exception:
        close_db()
        raise
    logger.info("MongoDB conectado. Base de datos: '%s'.", settings.mongo_db)
    logger.info("Imágenes: %s", settings.uploads_dir)
    logger.info("Panel de administración: /admin")
    logger.info("CORS permitidos: %s", ", ".join(settings.cors_origins) or "(ninguno)")
    logger.info(
        "Cookie de sesión: SameSite=%s | Secure=%s",
        settings.cookie_samesite,
        settings.cookie_secure,
    )
    if settings.cookie_samesite == "none" and not settings.cookie_secure:
        logger.warning(
            "COOKIE_SAMESITE=none requiere COOKIE_SECURE=true; "
            "el navegador rechazará la cookie de sesión."
        )
    try:
        yield
    finally:
        close_db()


app = FastAPI(
    title="Lily Blossom Candles API",
    description=(
        "API de la tienda de velas. Incluye catálogo público, productos "
        "para eventos y un panel de administración para gestionar imágenes."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


_SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


def _origin_allowed(request: Request, origin: str) -> bool:
    normalized = origin.strip().rstrip("/").lower()
    allowed_origins = {
        item.strip().rstrip("/").lower() for item in settings.cors_origins
    }
    if normalized in allowed_origins:
        return True

    host = request.headers.get("host", "").strip().lower()
    return bool(host) and urlsplit(normalized).netloc == host


@app.middleware("http")
async def security_middleware(request: Request, call_next):
    if (
        request.method not in _SAFE_METHODS
        and request.url.path.startswith("/api/admin/")
    ):
        origin = request.headers.get("origin")
        if origin and not _origin_allowed(request, origin):
            logger.warning(
                "Origen no permitido en %s %s: %s",
                request.method,
                request.url.path,
                origin,
            )
            return JSONResponse(
                status_code=403,
                content={"detail": "Origen no permitido."},
            )

    response = await call_next(request)

    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

    if request.url.path.startswith("/uploads/"):
        response.headers["Cache-Control"] = "public, max-age=604800, immutable"
    elif request.url.path.startswith("/api/admin") or request.url.path.rstrip("/") == "/admin":
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Robots-Tag"] = "noindex, nofollow"

    return response


@app.exception_handler(PyMongoError)
async def mongo_unavailable_handler(
    request: Request, exc: PyMongoError
) -> JSONResponse:
    logger.exception("Error de MongoDB en %s: %s", request.url.path, exc)
    return JSONResponse(
        status_code=503,
        content={
            "detail": "La base de datos no está disponible. Inténtalo de nuevo."
        },
    )


app.include_router(products.router)
app.include_router(events.router)
app.include_router(admin.router)
app.mount(
    "/uploads",
    StaticFiles(directory=str(settings.uploads_dir), check_dir=False),
    name="uploads",
)


@app.get("/api/health", tags=["sistema"])
def health() -> dict[str, str]:
    try:
        get_db().command("ping")
    except PyMongoError:
        logger.warning("Health check: MongoDB no responde.")
        return JSONResponse(
            status_code=503,
            content={"status": "error", "database": "mongodb"},
        )
    return {"status": "ok", "database": "mongodb"}


def _frontend_index() -> Path:
    return settings.frontend_dist / "index.html"


@app.get("/", include_in_schema=False)
def root():
    index = _frontend_index()
    if index.is_file():
        return FileResponse(index)
    return JSONResponse(
        {
            "name": "Lily Blossom Candles API",
            "docs": "/docs",
            "message": "El frontend aún no está compilado. Ejecuta `npm run build`.",
        }
    )


if (settings.frontend_dist / "assets").is_dir():
    app.mount(
        "/assets",
        StaticFiles(directory=str(settings.frontend_dist / "assets")),
        name="frontend-assets",
    )


@app.get("/{full_path:path}", include_in_schema=False)
def serve_frontend(full_path: str):
    if full_path == "api" or full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Ruta no encontrada.")
    if full_path == "uploads" or full_path.startswith("uploads/"):
        raise HTTPException(status_code=404, detail="Archivo no encontrado.")

    dist = settings.frontend_dist.resolve()
    index = dist / "index.html"
    if not index.is_file():
        raise HTTPException(
            status_code=404,
            detail="Frontend no compilado. Ejecuta `npm run build` en LilyBlossom.",
        )

    candidate = (dist / full_path).resolve()
    try:
        candidate.relative_to(dist)
    except ValueError:
        raise HTTPException(status_code=404, detail="Ruta no encontrada.") from None

    if full_path and candidate.is_file():
        return FileResponse(candidate)

    # Las rutas del SPA (/admin, etc.) siempre reciben index.html.
    return FileResponse(index)
