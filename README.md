# POS-siaa

Punto de venta independiente para tienda: ventas de contado y apartados con abonos, catálogo de productos y familias, clientes y estado de cuenta, entradas y salidas de inventario con kardex, cortes de caja X y Z, reportes e impresión de tickets.

| Parte | Carpeta | Tecnología |
|---|---|---|
| Backend (API) | `backend-POS/` | Node.js, Express 5, SQLite (`sqlite3`, sin ORM), JWT, bcrypt |
| Frontend | `frontend-pos/` | Next 16, React 19, Tailwind 4, Zustand |

## Requisitos

- Node.js 20 o superior (probado con Node 24)
- npm

## Instalación

```bash
cd backend-POS
npm install

cd ../frontend-pos
npm install
```

## Configuración

### Backend: `backend-POS/.env`

Copia `backend-POS/.env.example` como `backend-POS/.env` y llena los valores:

| Variable | Para qué sirve |
|---|---|
| `PORT` | Puerto del API (por omisión 5000) |
| `DB_PATH` | Ruta del archivo SQLite. Si se deja vacía se usa `src/pos.db` |
| `JWT_SECRET` | **Obligatoria.** Secreto con que se firman los tokens. Sin ella el servidor no arranca |
| `CORS_ORIGIN` | URL del frontend (por ejemplo `http://localhost:3000`). Varias, separadas por coma |
| `SUPERDEV_USER` / `SUPERDEV_PASSWORD` | Credenciales del SuperDeveloper. Si falta alguna, el SuperDeveloper queda apagado |
| `BACKUP_DIR` | (Opcional) Carpeta de respaldos del reset y de las migraciones. Por omisión `backend-POS/backups/` |
| `TZ_NEGOCIO` | (Opcional) Zona horaria del negocio para fechas de ventas, pagos y cortes. Por omisión `America/Mexico_City` |

Para generar un `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Frontend: `frontend-pos/.env.local`

Copia `frontend-pos/.env.example` como `frontend-pos/.env.local`:

| Variable | Para qué sirve |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL del API **incluyendo `/api`**, por ejemplo `http://localhost:5000/api` |

`NEXT_PUBLIC_API_URL` se fija al compilar: si la cambias, vuelve a correr `npm run build`.

## Arranque

```bash
# Backend (en backend-POS)
npm start          # o: npm run dev  (con nodemon)

# Frontend (en frontend-pos)
npm run dev        # desarrollo
npm run build && npm start   # producción
```

Al arrancar, el backend crea las tablas que falten, aplica las migraciones pendientes y convierte a hash cualquier contraseña que siga en texto plano (usuarios, claves de caja y clave de precios). Cada quien sigue entrando con la misma contraseña.

La primera vez con la versión de la Fase 1, la migración pasa el dinero a centavos y recalcula los saldos de los clientes. Antes hace un respaldo completo de la base en `backups/` (`pos_antes_fase1_*.db`).

### Primer acceso con una base vacía

Con una base nueva no hay usuarios. Entra como **SuperDeveloper** (enlace "Acceso SuperDeveloper" en la pantalla de login, con `SUPERDEV_USER` y `SUPERDEV_PASSWORD`) y da de alta al primer Administrador en *Catálogos → Usuarios*.

## Roles

| Nivel | Rol | Puede |
|---|---|---|
| 1 | Cajero | Ventas, apartados y abonos; ver productos, familias y clientes; alta de clientes; abrir su caja y su corte X |
| 50 | Supervisor | Lo mismo que el Cajero |
| 90 | Gerente | Además: catálogo (productos, familias, cajas), entradas, salidas, kardex, reportes y corte Z |
| 99 | Administrador | Todo, más usuarios y configuración del sistema |

Los permisos se revisan en el servidor. Siempre debe quedar al menos un Administrador.

## Pruebas

```bash
cd backend-POS
npm test
```

Las pruebas usan `node --test` y crean una base SQLite temporal para cada archivo; nunca tocan la base real.

## Bases de datos y respaldos

Los archivos `*.db` y la carpeta `backups/` están ignorados por git. **No subas bases de datos al repositorio**: es público.

La base trabaja en **modo WAL** de SQLite: junto a `pos.db` aparecen `pos.db-wal` y `pos.db-shm`. Mientras el servidor está encendido, las últimas ventas pueden estar todavía en `pos.db-wal`.

- **Con el servidor encendido, respalda con el botón "Respaldar ahora"** (pantalla del SuperDeveloper): descarga una copia completa y consistente, con las últimas ventas. Queda además una copia en `backups/` (se guardan las 10 más recientes). **Guarda el archivo en un lugar privado: contiene todos los datos del negocio.**
- **No copies `pos.db` a mano con el servidor encendido**: la copia podría quedar sin las últimas ventas. A mano, solo con el servidor apagado (Ctrl+C); si ves `pos.db-wal` o `pos.db-shm`, cópialos también.
- La app también respalda sola antes de cada migración y antes de un reset del SuperDeveloper (en `backups/`).
