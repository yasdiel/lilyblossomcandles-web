# Lily Blossom Candles

Tienda de velas artesanales con catálogo público, sección de productos para eventos y panel privado para la dueña del negocio.

- **Frontend:** React 19 + Vite + Tailwind CSS.
- **Backend:** FastAPI + MongoDB + Pillow (optimización de imágenes).
- **Panel:** disponible en `/admin`.
- **Imágenes:** se optimizan a WebP y se guardan en MongoDB; se sirven desde `/api/images/...`.

Requisitos: Python 3.11 o superior, Node.js 20.19 o superior y MongoDB 6.0 o superior en ejecución.

## Estructura

```text
web de velas/
├── LilyBlossom/          # Frontend React + Vite
│   ├── src/
│   │   ├── admin/        # Login, panel y formularios de productos y eventos
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/          # Cliente de la API y utilidades
│   │   ├── sections/     # Colección, eventos, pedidos personalizados, etc.
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
    ├── uploads/          # Fotos antiguas; se migran a MongoDB al arrancar
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

Vite redirige `/api` y `/uploads` al backend en `http://127.0.0.1:8000`
(`/uploads` solo se usa para fotos antiguas; las nuevas viven en MongoDB).
Puedes cambiar ese destino con `VITE_API_PROXY` en un archivo `.env.local`.
Si el frontend se despliega en otro dominio, configura `VITE_API_URL` con la URL
completa de la API (por ejemplo `https://api.tudominio.com/api`).

### Sesión con frontend y API en dominios distintos

El panel acepta dos formas de autenticación: la cookie HttpOnly y un token
`Authorization: Bearer`. Después del login, el frontend guarda el token en
`sessionStorage` y lo envía en cada petición administrativa. Así la sesión sigue
funcionando aunque el navegador bloquee cookies de terceros (Safari, Firefox o
Chrome con esa opción activada).

- Con dos subdominios de un dominio propio (`app.tudominio.com` y
  `api.tudominio.com`) la cookie HttpOnly funciona y es el mecanismo preferido.
- Con dos subdominios de Render (`*.onrender.com`) el token cubre el caso de los
  navegadores que bloquean cookies de terceros. No hace falta cambiar
  `COOKIE_SAMESITE` para que el panel funcione.
- Si además quieres que la cookie viaje entre dominios, define
  `COOKIE_SECURE=true` y `COOKIE_SAMESITE=none`. `SameSite=None` exige HTTPS.

Las peticiones de escritura del panel validan el encabezado `Origin` para evitar
CSRF. El token se guarda en `sessionStorage`, por lo que se borra al cerrar la
pestaña; para la opción más segura se recomienda usar subdominios de un dominio
propio y mantener la cookie HttpOnly.

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
5. En **Productos para eventos** puedes crear piezas con foto obligatoria, nombre,
   descripción y visibilidad. Aparecen debajo de la colección en la tienda.
6. Las fotos se validan, se orientan, se reducen a un máximo de 1800 px y se
   convierten a WebP antes de guardarse en la colección `images` de MongoDB.
7. Cambia la contraseña inicial desde la sección **Seguridad** al final del panel.

> Al arrancar, el backend migra automáticamente a MongoDB las fotos antiguas que
> encuentre en `UPLOADS_DIR`. Una vez migradas, las fotos nuevas ya no dependen
> del disco del servidor.

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
| `COOKIE_SAMESITE` | `strict` por defecto. `none` con `COOKIE_SECURE=true` permite la cookie entre sitios; el panel también funciona con token si no se configura. |
| `CORS_ORIGINS` | Orígenes permitidos, separados por coma. |
| `UPLOADS_DIR` | Ruta opcional de fotos antiguas que se migran a MongoDB al arrancar. Las fotos nuevas se guardan en la base de datos. |
| `FRONTEND_DIST` | Ruta opcional del build del frontend. |

## API

Pública:

- `GET /api/products` — productos publicados.
- `GET /api/products/{id}` — detalle de un producto publicado. El `id` es un ObjectId de MongoDB en formato de texto.
- `GET /api/events` — productos para eventos publicados.
- `GET /api/images/{id}` — foto optimizada guardada en MongoDB.
- `GET /api/health` — estado del servidor y de MongoDB.

Administración (requiere cookie de sesión o encabezado
`Authorization: Bearer <access_token>`):

- `POST /api/admin/login` — devuelve el usuario y `access_token`.
- `POST /api/admin/logout`
- `GET /api/admin/me`
- `POST /api/admin/change-password` — devuelve un `access_token` nuevo.
- `GET /api/admin/products` — incluye borradores.
- `POST /api/admin/products` — `multipart/form-data`, con `imagen` opcional.
- `PUT /api/admin/products/{id}` — actualiza campos y foto.
- `DELETE /api/admin/products/{id}`
- `GET /api/admin/events` — incluye productos para eventos ocultos.
- `POST /api/admin/events` — `multipart/form-data`; la foto es obligatoria.
- `PUT /api/admin/events/{id}` — actualiza nombre, descripción, visibilidad y foto.
- `DELETE /api/admin/events/{id}`

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
- La sesión usa una cookie `HttpOnly`, `SameSite` configurable y token aleatorio;
  en MongoDB solo se guarda el hash del token. El panel también admite el token
  por `Authorization: Bearer` para navegadores que bloquean cookies de terceros.
- Hay un límite de intentos fallidos de inicio de sesión por IP.
- Las fotos se validan por contenido real, se corrigen según su orientación EXIF,
  se reducen a un máximo de 1800 px, se convierten a WebP y se guardan en MongoDB.
  No se conserva el archivo original.
- Las sesiones expiran automáticamente mediante un índice TTL de MongoDB.
- En producción, usa HTTPS y cambia la contraseña inicial.
