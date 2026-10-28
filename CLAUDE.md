# CLAUDE.md — POS-siaa

Punto de venta independiente. Backend en `backend-POS/` (Express 5 + sqlite3, sin ORM). Frontend en `frontend-pos/` (Next 16 + React 19 + Tailwind 4 + Zustand). Solo hay datos de **prueba**. El repositorio en GitHub es **público**.

## Reglas del proyecto

- Responder y comentar el código en **español**. Commits pequeños y claros, en español.
- Trabajar en ramas; **nunca** hacer push sin que el dueño lo pida. Nunca reescribir la historia de git ni hacer push forzado.
- Si algo del plan no se puede hacer como está escrito, avisar antes de improvisar.
- Nunca versionar bases de datos (`*.db`), respaldos (`backups/`) ni `.env`.
- Puertos para pruebas locales: backend **5050**, frontend **3050**. Detener al terminar lo que se haya arrancado.
- Las pruebas del backend (`cd backend-POS && npm test`) deben quedar en verde, y `npm run build` del frontend sin errores.

## Seguridad: cómo funciona hoy (después de la Fase 0)

- **Autenticación**: `POST /api/users/login` entrega un JWT (12 h) con `id`, `nickname`, `access_level`, firmado con `JWT_SECRET`. El middleware `requireAuth` (`backend-POS/src/middleware/auth.js`) exige el token en todo `/api`, salvo `POST /api/users/login` y `POST /api/superdev/entrar`. `/health` es pública.
- **Roles** (en el servidor, con `requireLevel(NIVELES.X)` en cada archivo de rutas): Cajero 1, Supervisor 50, Gerente 90, Administrador 99. El SuperDeveloper pasa cualquier nivel.
- **No confiar en el cliente**: el usuario de ventas, entradas, salidas, kardex, productos y cortes sale de `req.user` (token), nunca del cuerpo.
- **Contraseñas**: bcrypt (`backend-POS/src/utils/seguridad.js`). Al arrancar se convierte a hash todo lo que esté en texto plano en `users.password`, `cash_registers.password` y `settings.dynamic_price_auth_key`. Ninguna respuesta devuelve contraseñas.
- **Actualizaciones dinámicas**: siempre con LISTA FIJA de campos (`CAMPOS_EDITABLES`) en `userController.update`, `Customer.update`, `Product.update` y `settings.model.update`. Si se agrega una columna editable, hay que agregarla a la lista.
- **Usuarios**: solo el Administrador cambia `access_level`; nadie cambia el suyo; no se puede borrar ni bajar al último Administrador.
- **SuperDeveloper**: `POST /api/superdev/entrar` con `SUPERDEV_USER` / `SUPERDEV_PASSWORD` de `.env` (comparación en tiempo constante, 5 intentos por IP y bloqueo de 15 min, en memoria). Token con `superdev: true` de 45 min. Sin esas variables queda apagado. `/api/reset/*` exige ese token y solo acepta las tablas de `TABLAS_PERMITIDAS` (`resetController.js`).
- **Clave para liberar precios**: no sale en `GET /api/settings`; se valida con `POST /api/settings/validar-clave-precio` `{ clave } → { valida }`; solo el Administrador la cambia (vacía = no cambia).
- **Frontend**: todas las llamadas al API pasan por `apiFetch` (`frontend-pos/src/lib/apiFetch.js`): toma `NEXT_PUBLIC_API_URL`, agrega `Authorization: Bearer <token>` y cierra la sesión si recibe 401. **No usar `fetch` directo contra el API.** El token vive en `useAuthStore`; la cookie `auth-token` solo la usa `src/middleware.js` para redirigir (lee el JWT sin verificar la firma, solo para decidir a dónde mandar; nunca da permisos).
- **Configuración**: `server.js` exporta la app y solo escucha si se corre directo. `DB_PATH`, `CORS_ORIGIN`, `JWT_SECRET`, `SUPERDEV_*`, `BACKUP_DIR` en `backend-POS/.env` (ver `.env.example`).
- **Pruebas**: `backend-POS/test/*.test.js` con `node --test`; `test/helpers.js` arranca la app sobre una base SQLite temporal sembrada con contraseñas en texto plano.

## Fase 0 — Seguridad (hecha, rama `fase0-seguridad`)

1. Base de datos fuera del repo (`git rm --cached`, `*.db` y `backups/` en `.gitignore`; la historia no se reescribió, el archivo viejo sigue en commits anteriores).
2. Contraseñas con bcrypt y conversión automática al arrancar (también claves de caja, a petición del dueño).
3. JWT en todo `/api`; `apiFetch` en el frontend (69 llamadas en 29 archivos).
4. Permisos por rol en el servidor; usuario tomado del token.
5. SuperDeveloper con credenciales de `.env`; se eliminó la clave por fecha y la cookie `is-superdev`. En el login hay un enlace "Acceso SuperDeveloper".
6. Listas fijas de campos contra inyección SQL; reset con lista fija de tablas.
7. Clave de precios con hash y validación en el servidor.
8. Lista de apartados: se buscaba `type = 'APARTADO'` y se guarda `'apartado'` (ahora `LOWER(type) = 'apartado'` y `pending_balance > 0`). El abono solo se acepta para un apartado del mismo cliente.
9. Fuera de los logs: cookies, cuerpo completo de ventas y detalle de abonos.
10. `server.js` exportable, `DB_PATH`, `CORS_ORIGIN`, pruebas con `node --test` (28 pruebas).
11. `.env.example` de backend y frontend; README.

Arreglos encontrados al revisar en el navegador:
- Catálogo de usuarios: un 403 ya no cierra la sesión (muestra "No tienes permiso").
- Venta de contado por código de barras: leía `p.existencia` pero el API devuelve `stock`, así que con "stock negativo" desactivado todo producto escaneado salía sin existencia (ya pasaba en `main`).

## Pendientes detectados en la Fase 0 (sin hacer)

- **Liberar precios en la venta**: no existe todavía el flujo en el frontend; la ruta `validar-clave-precio` ya está lista para conectarlo. Conviene limitarle intentos (hoy un usuario con sesión podría probar claves).
- **Menú por rol**: el servidor ya niega con 403, pero el menú lateral sigue mostrando todas las opciones a todos.
- `GET /api/cuts/print/current` lo llama el frontend (CorteDeCaja, AccionesCorteZ) pero **no existe** en el backend (ya fallaba antes).
- Los intentos del SuperDeveloper se guardan en memoria: se reinician si se reinicia el servidor.
- El `pos_backup_*.db` sigue en la historia de git (repo público). Si hiciera falta borrarlo de la historia, sería una reescritura que el dueño tendría que autorizar.
- Quedan `console.log` de depuración en otros archivos (kardex, Entry, Out, ResetDatos del frontend).

## Fase 1 — Integridad de ventas y dinero (siguiente)

- El servidor calcula precios y totales con el catálogo (no confiar en precios, subtotales ni impuestos que manda el frontend).
- Transacciones reales e idempotencia en ventas, abonos, entradas y salidas (hoy `sqlite3` comparte una conexión y las operaciones `await` intermedias pueden mezclarse; abonos, entradas y salidas no usan transacción).
- Dinero en centavos enteros.
- Fechas en una sola zona horaria (hoy se mezclan `toISOString()` en UTC y hora local).
- Conectar el flujo de "liberar precio" a `validar-clave-precio`.

## Fase 2 — Mantenimiento

- Migrar a Prisma.
- Quitar dependencias duplicadas (por ejemplo `sonner` y `react-hot-toast`, `react-modal` y Radix Dialog, `react-datepicker` y `react-day-picker`; revisar el resto).
- Limpiar `src/config/porsiacaso.initDatabase.js`, `src/scripts/sanitize_sales.js` y los `CustomerStatement` duplicados (`1CustomerStatement`, `2CustomerStatement`).
