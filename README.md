# Lily Blossom Candles

Tienda de velas artesanales con catálogo público y panel privado para la dueña del negocio.

- **Frontend:** React 19 + Vite + Tailwind CSS.
- **Backend:** FastAPI + MongoDB.
- **Panel:** disponible en `/admin`.
- **Imágenes:** se guardan en `backend/uploads/` y se sirven desde `/uploads/...`.

Requisitos: Python 3.11 o superior, Node.js 20.19 o superior y MongoDB 6.0 o superior en ejecución.

## Estructura

```text
web de velas/
├── LilyBlossom/          # Frontend React + Vite
│   ├── src/
│   │   ├── admin/        # Login, panel y formulario de productos
│   │   ├── components/
│   │   ├── data/         # Catálogo de respaldo si la API no responde
│   │   ├── hooks/
│   │   ├── lib/          # Cliente de la API y utilidades
│   │   ├── sections/
│   │   ├── App.jsx       # Decide entre tienda (/), panel (/admin)
│   │   └── Storefront.jsx
│   └── dist/             # Build que sirve FastAPI en producción
└── backend/
    ├── app/
    │   ├── main.py       # Aplicación FastAPI y servido del frontend
    │   ├── routers/      # Catálogo público y endpoints de administración
    │   ├── database.py   # MongoDB: conexión, índices y datos iniciales
    │   ├── security.py   # Hash de contraseñas y sesiones
    │   └── images.py     # Validación y guardado de fotos
    ├── data/             # SQLite histórico (solo para migrar; ya no se usa)
    ├── scripts/          # Migración de SQLite a MongoDB
    ├── uploads/          # Fotos subidas desde el panel
    ├── tests/
    ├── .env              # Credenciales y configuración local
    └── requirements.txt
```

## Puesta en marcha (desarrollo)

### 1. MongoDB y backend

Asegúrate de que MongoDB esté escuchando en `mongodb://127.0.0.1:27017`.
Puedes usar otra instancia cambiando `MONGO_URL` en `backend/.env`.

Desde la carpeta `backend`:

```powershell
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

En el primer arranque la aplicación crea la base de datos `lilyblossom`, sus
colecciones e índices. Si el catálogo está vacío, carga los cuatro productos de
ejemplo, y si no existe ningún usuario, crea la cuenta de administración definida
en `backend/.env`.

- API: <http://localhost:8000/api/health>
- Documentación interactiva: <http://localhost:8000/docs>
- Panel: <http://localhost:8000/admin> (requiere haber compilado el frontend)

### 2. Frontend en modo desarrollo

En otra terminal:

```powershell
cd LilyBlossom
npm install
npm run dev
```

Abre <http://localhost:5173>. El panel está en <http://localhost:5173/admin>.

Vite redirige `/api` y `/uploads` al backend en `http://127.0.0.1:8000`.
Puedes cambiar ese destino con `VITE_API_PROXY` en un archivo `.env.local`.
Si el frontend se despliega en otro dominio, configura `VITE_API_URL` con la URL
completa de la API (por ejemplo `https://api.tudominio.com/api`).

## Migración desde SQLite

La versión anterior guardaba los datos en `backend/data/lilyblossom.db`. Para
conservar los productos y la contraseña actual del administrador:

```powershell
cd backend
.\.venv\Scripts\activate
python scripts\migrate_sqlite_to_mongo.py
```

El script copia productos y usuarios a MongoDB. La contraseña se conserva porque
se migra el hash existente, no la contraseña en texto plano. Las sesiones abiertas
no se copian: hay que volver a iniciar sesión.

- Si MongoDB ya contiene productos, no los sobrescribe; puedes forzarlo con
  `--replace-products`.
- El destino se puede cambiar con `--mongo-url` y `--mongo-db`.
- Conserva el archivo SQLite como respaldo hasta comprobar que todo está correcto.

## Uso del panel

1. Entra a `/admin`.
2. Inicia sesión con `ADMIN_EMAIL` y `ADMIN_PASSWORD` de `backend/.env`. Si
   migraste desde SQLite, usa la contraseña que ya tenías.
3. Desde **Nuevo producto** puedes subir nombre, notas, precio, peso, colores,
   estado de publicación y una foto JPG, PNG o WebP de hasta 5 MB.
4. Los productos marcados como **Visible en la tienda** aparecen en el catálogo
   público inmediatamente. Los no visibles quedan como borradores.
5. Cambia la contraseña inicial desde la sección **Seguridad** al final del panel.

> Las credenciales de `.env` solo se usan al crear la cuenta de administración
> por primera vez. Si la cuenta ya existe, cambia la contraseña desde el panel.

## Producción (un solo servidor)

Compila el frontend y deja que FastAPI lo sirva:

```powershell
cd LilyBlossom
npm run build

cd ..\backend
.\.venv\Scripts\activate
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Abre <http://localhost:8000>. FastAPI sirve la tienda, `/admin`, `/api` y las
imágenes desde el mismo origen. Si usas HTTPS, define `COOKIE_SECURE=true` en
`backend/.env` antes de iniciar el servidor.

Para producción, usa una instancia de MongoDB con autenticación, limita el acceso
al puerto de la base de datos y guarda la cadena de conexión únicamente en
`backend/.env` o en las variables de entorno del servidor.

## Configuración (`backend/.env`)

| Variable | Descripción |
| --- | --- |
| `MONGO_URL` | Cadena de conexión de MongoDB. |
| `MONGO_DB` | Nombre de la base de datos (por defecto `lilyblossom`). |
| `MONGO_TIMEOUT_MS` | Tiempo máximo para conectar con MongoDB, en milisegundos. |
| `ADMIN_EMAIL` | Correo de la cuenta de administración inicial. |
| `ADMIN_PASSWORD` | Contraseña inicial (mínimo 10 caracteres recomendado). |
| `SESSION_HOURS` | Duración de la sesión del panel, en horas. |
| `MAX_UPLOAD_MB` | Tamaño máximo por imagen. |
| `COOKIE_SECURE` | `true` cuando la web se sirve por HTTPS. |
| `CORS_ORIGINS` | Orígenes permitidos, separados por coma. |
| `UPLOADS_DIR` | Ruta opcional de las imágenes. |
| `FRONTEND_DIST` | Ruta opcional del build del frontend. |

## API

Pública:

- `GET /api/products` — productos publicados.
- `GET /api/products/{id}` — detalle de un producto publicado. El `id` es un ObjectId de MongoDB en formato de texto.
- `GET /api/health` — estado del servidor y de MongoDB.

Administración (requiere cookie de sesión):

- `POST /api/admin/login`
- `POST /api/admin/logout`
- `GET /api/admin/me`
- `POST /api/admin/change-password`
- `GET /api/admin/products` — incluye borradores.
- `POST /api/admin/products` — `multipart/form-data`, con `imagen` opcional.
- `PUT /api/admin/products/{id}` — actualiza campos y foto.
- `DELETE /api/admin/products/{id}`

## Tests del backend

MongoDB debe estar en ejecución. Los tests usan una base de datos temporal
independiente y la eliminan al terminar, sin tocar los datos reales.

```powershell
cd backend
.\.venv\Scripts\activate
pip install -r requirements-dev.txt
pytest -q
```

## Notas de seguridad

- Las contraseñas se guardan con `scrypt` y sal aleatoria, nunca en texto plano.
- La sesión usa una cookie `HttpOnly`, `SameSite=Strict` y token aleatorio; en
  MongoDB solo se guarda el hash del token.
- Hay un límite de intentos fallidos de inicio de sesión por IP.
- Las fotos se validan por contenido real y se renombran con UUID.
- Las sesiones expiran automáticamente mediante un índice TTL de MongoDB.
- En producción, usa HTTPS y cambia la contraseña inicial.
